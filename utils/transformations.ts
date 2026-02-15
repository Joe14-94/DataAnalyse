import { DataRow, FilterCondition, JoinType, ETLAggregationType } from '../types';
import { generateId, evaluateFormula } from '../utils';

/**
 * Applique un filtre sur les données
 * BOLT OPTIMIZATION: Hoisted condition processing and lazy evaluation to avoid O(N*C) overhead.
 */
export const applyFilter = (
  data: DataRow[],
  conditions: FilterCondition[],
  combineWith: 'AND' | 'OR'
): DataRow[] => {
  if (conditions.length === 0) return data;

  // BOLT OPTIMIZATION: Pre-process conditions to avoid redundant string ops and lowercasing inside the loop
  const prepared = conditions.map(c => {
    const filterStr = String(c.value || '');
    return {
      ...c,
      preparedFilterStr: c.caseSensitive ? filterStr : filterStr.toLowerCase(),
      filterNum: Number(c.value)
    };
  });

  return data.filter(row => {
    // BOLT OPTIMIZATION: Use manual loop for early bail-out (lazy evaluation)
    if (combineWith === 'AND') {
      for (let i = 0; i < prepared.length; i++) {
        if (!evaluateConditionOptimized(row, prepared[i])) return false;
      }
      return true;
    } else {
      for (let i = 0; i < prepared.length; i++) {
        if (evaluateConditionOptimized(row, prepared[i])) return true;
      }
      return false;
    }
  });
};

/**
 * Évalue une condition de filtre (version optimisée)
 */
const evaluateConditionOptimized = (row: DataRow, condition: any): boolean => {
  const fieldValue = row[condition.field];

  switch (condition.operator) {
    case 'equals':
      return fieldValue === condition.value;
    case 'not_equals':
      return fieldValue !== condition.value;
    case 'is_empty':
      return fieldValue === null || fieldValue === undefined || fieldValue === '';
    case 'is_not_empty':
      return fieldValue !== null && fieldValue !== undefined && fieldValue !== '';
    case 'greater_than':
      return Number(fieldValue) > condition.filterNum;
    case 'less_than':
      return Number(fieldValue) < condition.filterNum;
    case 'greater_or_equal':
      return Number(fieldValue) >= condition.filterNum;
    case 'less_or_equal':
      return Number(fieldValue) <= condition.filterNum;
  }

  // String-based operators
  let fieldStr = String(fieldValue || '');
  if (!condition.caseSensitive) {
    fieldStr = fieldStr.toLowerCase();
  }

  const filterStr = condition.preparedFilterStr;

  switch (condition.operator) {
    case 'contains':
      return fieldStr.includes(filterStr);
    case 'not_contains':
      return !fieldStr.includes(filterStr);
    case 'starts_with':
      return fieldStr.startsWith(filterStr);
    case 'ends_with':
      return fieldStr.endsWith(filterStr);
    default:
      return true;
  }
};


/**
 * Applique une jointure entre deux datasets
 */
export const applyJoin = (
  leftData: DataRow[],
  rightData: DataRow[],
  leftKey: string,
  rightKey: string,
  joinType: JoinType,
  suffix: string = '_right'
): DataRow[] => {
  const result: DataRow[] = [];

  // BOLT OPTIMIZATION: O(N+M) implementation using Map for lookup instead of O(N*M) nested loops
  // Build lookup map for the right side
  const rightMap = new Map<string, DataRow[]>();
  for (const row of rightData) {
    const key = String(row[rightKey] ?? '');
    if (!rightMap.has(key)) rightMap.set(key, []);
    rightMap.get(key)!.push(row);
  }

  // Track matched right rows for 'right' and 'full' joins
  const matchedRightRows = new Set<DataRow>();

  // 1. Process Left side (handles Inner, Left, and first part of Full join)
  for (const leftRow of leftData) {
    const key = String(leftRow[leftKey] ?? '');
    const matches = rightMap.get(key) || [];

    if (matches.length > 0) {
      for (let i = 0; i < matches.length; i++) {
        const rightRow = matches[i];
        matchedRightRows.add(rightRow);

        // BOLT OPTIMIZATION: Construct new object and ensure stable composite ID if multiple matches
        const merged = { ...leftRow };
        if (matches.length > 1) {
          merged.id = `${leftRow.id}_${rightRow.id || i}`;
        }

        for (const k in rightRow) {
          if (k === 'id') continue;
          const newKey = (k in leftRow && k !== rightKey) ? `${k}${suffix}` : k;
          merged[newKey] = rightRow[k];
        }
        result.push(merged);
      }
    } else {
      // No match for this left row
      if (joinType === 'left' || joinType === 'full') {
        result.push({ ...leftRow });
      }
    }
  }

  // 2. Process Right side (handles unmatched rows for 'right' and 'full' join)
  if (joinType === 'right' || joinType === 'full') {
    for (const rightRow of rightData) {
      if (!matchedRightRows.has(rightRow)) {
        // BOLT OPTIMIZATION: Use existing ID for stability
        const merged: DataRow = { id: rightRow.id || generateId() };
        for (const k in rightRow) {
          if (k !== 'id') {
            merged[k] = rightRow[k];
          }
        }
        result.push(merged);
      }
    }
  }

  // Final filtering for 'right' join: The above loop added ALL matched rows (left-centric).
  // For a pure 'right' join, we only want matched rows and unmatched right rows.
  // Wait, if joinType is 'right', the first loop added matched rows. The second loop added unmatched right rows.
  // This matches 'right' join definition.
  // HOWEVER, the first loop included ALL matching left rows for each right row.
  // If we have multiple left rows for one right row, they all appear in 'right' join. This is standard SQL behavior.

  return result;
};

/**
 * Applique une agrégation GROUP BY
 * BOLT OPTIMIZATION: Single-pass aggregation using accumulators to avoid O(N * M) overhead and excessive memory allocation.
 */
export const applyAggregate = (
  data: DataRow[],
  groupBy: string[],
  aggregations: { field: string; operation: ETLAggregationType; alias?: string }[]
): DataRow[] => {
  if (data.length === 0) return [];

  // BOLT OPTIMIZATION: Structure for storing accumulators per group
  const groupMap = new Map<string, { groupValues: any[], stats: any[] }>();

  // Cache groupBy length and aggregations length
  const groupByLen = groupBy.length;
  const aggregationsLen = aggregations.length;
  const aggFields = aggregations.map(a => a.field);

  for (let i = 0; i < data.length; i++) {
    const row = data[i];

    // BOLT OPTIMIZATION: Optimized key generation to avoid array creation
    let key = '';
    if (groupByLen > 0) {
      for (let j = 0; j < groupByLen; j++) {
        if (j > 0) key += '|||';
        key += row[groupBy[j]] ?? '';
      }
    } else {
      key = 'GLOBAL';
    }

    let group = groupMap.get(key);
    if (!group) {
      // BOLT OPTIMIZATION: Only create groupValues once per group
      const groupValues: any[] = [];
      for (let j = 0; j < groupByLen; j++) {
        groupValues.push(row[groupBy[j]]);
      }

      group = {
        groupValues,
        stats: aggregations.map(() => ({
          sum: 0,
          count: 0,
          numCount: 0,
          min: Infinity,
          max: -Infinity,
          first: undefined,
          last: undefined,
          hasValue: false
        }))
      };
      groupMap.set(key, group);
    }

    // BOLT OPTIMIZATION: Single-pass update of all accumulators
    const stats = group.stats;
    for (let j = 0; j < aggregationsLen; j++) {
      const stat = stats[j];
      const val = row[aggFields[j]];

      // To match original behavior, we filter null and undefined
      if (val !== null && val !== undefined) {
        if (!stat.hasValue) {
          stat.first = val;
          stat.hasValue = true;
        }
        stat.last = val;
        stat.count++;

        const num = Number(val);
        if (!isNaN(num)) {
          stat.numCount++;
          stat.sum += num;
          if (num < stat.min) stat.min = num;
          if (num > stat.max) stat.max = num;
        }
      }
    }
  }

  const result: DataRow[] = [];
  groupMap.forEach((group) => {
    const row: DataRow = { id: generateId() };

    // Ajouter les colonnes de groupement
    if (groupBy.length > 0) {
      for (let i = 0; i < groupBy.length; i++) {
        row[groupBy[i]] = group.groupValues[i];
      }
    }

    // Calculer les résultats finaux des agrégations
    for (let i = 0; i < aggregations.length; i++) {
      const agg = aggregations[i];
      const stat = group.stats[i];
      const alias = agg.alias || `${agg.operation}_${agg.field}`;

      let finalVal: any = null;
      if (stat.hasValue || stat.count > 0) {
        switch (agg.operation) {
          case 'sum': finalVal = stat.numCount > 0 ? stat.sum : 0; break;
          case 'avg': finalVal = stat.numCount > 0 ? stat.sum / stat.numCount : null; break;
          case 'count': finalVal = stat.count; break;
          case 'min': finalVal = stat.numCount > 0 ? stat.min : null; break;
          case 'max': finalVal = stat.numCount > 0 ? stat.max : null; break;
          case 'first': finalVal = stat.first; break;
          case 'last': finalVal = stat.last; break;
        }
      }
      row[alias] = finalVal;
    }
    result.push(row);
  });

  return result;
};

/**
 * Calcule une valeur agrégée
 * BOLT OPTIMIZATION: Optimized to single-pass and avoid intermediate array creation.
 */
const calculateAggregation = (values: any[], operation: ETLAggregationType): any => {
  const len = values.length;
  if (len === 0) return null;

  if (operation === 'count') return len;
  if (operation === 'first') return values[0];
  if (operation === 'last') return values[len - 1];

  let sum = 0;
  let count = 0;
  let min = Infinity;
  let max = -Infinity;
  let hasNum = false;

  for (let i = 0; i < len; i++) {
    const val = values[i];
    if (val === null || val === undefined || val === '') continue;

    const num = Number(val);
    if (!isNaN(num)) {
      hasNum = true;
      sum += num;
      count++;
      if (num < min) min = num;
      if (num > max) max = num;
    }
  }

  switch (operation) {
    case 'sum': return hasNum ? sum : 0;
    case 'avg': return count > 0 ? sum / count : null;
    case 'min': return count > 0 ? min : null;
    case 'max': return count > 0 ? max : null;
    default: return null;
  }
};

/**
 * Union de deux datasets
 */
export const applyUnion = (data1: DataRow[], data2: DataRow[]): DataRow[] => {
  return [...data1, ...data2];
};

/**
 * Sélectionne ou exclut des colonnes
 * BOLT OPTIMIZATION: Avoided slow 'delete' operator and optimized column selection loop.
 */
export const applySelect = (
  data: DataRow[],
  columns: string[],
  exclude: boolean = false
): DataRow[] => {
  if (columns.length === 0 && !exclude) return data.map(row => ({ id: row.id || generateId() }));

  const colSet = new Set(columns);

  return data.map(row => {
    if (exclude) {
      // BOLT OPTIMIZATION: Construct new object instead of using 'delete'
      const filtered: DataRow = { id: row.id || generateId() };
      for (const key in row) {
        if (key !== 'id' && !colSet.has(key)) {
          filtered[key] = row[key];
        }
      }
      return filtered;
    } else {
      // Garder seulement les colonnes spécifiées
      const filtered: DataRow = { id: row.id || generateId() };
      for (let i = 0; i < columns.length; i++) {
        const col = columns[i];
        if (col in row) {
          filtered[col] = row[col];
        }
      }
      return filtered;
    }
  });
};

/**
 * Renomme des colonnes
 * BOLT OPTIMIZATION: Hoisted mappings to a Map and avoided slow 'delete' operator by constructing new objects.
 */
export const applyRename = (
  data: DataRow[],
  mappings: { oldName: string; newName: string }[]
): DataRow[] => {
  if (mappings.length === 0) return data;

  const renameMap = new Map<string, string>();
  for (let i = 0; i < mappings.length; i++) {
    renameMap.set(mappings[i].oldName, mappings[i].newName);
  }

  return data.map(row => {
    const newRow: DataRow = { id: row.id };
    for (const key in row) {
      if (key === 'id') continue;
      const targetKey = renameMap.get(key) || key;
      newRow[targetKey] = row[key];
    }
    return newRow;
  });
};

/**
 * Tri des données
 */
export const applySort = (
  data: DataRow[],
  fields: { field: string; direction: 'asc' | 'desc' }[]
): DataRow[] => {
  const sorted = [...data];
  sorted.sort((a, b) => {
    for (const { field, direction } of fields) {
      const aVal = a[field];
      const bVal = b[field];

      let comparison = 0;
      if (aVal < bVal) comparison = -1;
      else if (aVal > bVal) comparison = 1;

      if (comparison !== 0) {
        return direction === 'asc' ? comparison : -comparison;
      }
    }
    return 0;
  });
  return sorted;
};

/**
 * Dédoublonnage
 * BOLT OPTIMIZATION: Avoided slow JSON.stringify on 100k+ rows.
 * Uses a composite key of all values (excluding id) for much better performance.
 */
export const applyDistinct = (data: DataRow[]): DataRow[] => {
  if (data.length === 0) return [];
  const seen = new Set<string>();
  const result: DataRow[] = [];

  // Identify fields to use for distinct check (all except id)
  const fields = Object.keys(data[0]).filter(k => k !== 'id');
  const fieldsLen = fields.length;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];

    // Create a composite key by joining values
    // Using a special separator to avoid collisions
    let compositeKey = '';
    for (let j = 0; j < fieldsLen; j++) {
      compositeKey += String(row[fields[j]] ?? '') + '\x1F';
    }

    if (!seen.has(compositeKey)) {
      seen.add(compositeKey);
      result.push(row);
    }
  }

  return result;
};

/**
 * Split d'une colonne
 */
export const applySplit = (
  data: DataRow[],
  column: string,
  separator: string,
  newColumns: string[],
  limit?: number
): DataRow[] => {
  return data.map(row => {
    const value = String(row[column] || '');
    const parts = limit ? value.split(separator, limit) : value.split(separator);

    const newRow: DataRow = { ...row };
    newColumns.forEach((colName, index) => {
      newRow[colName] = parts[index] || '';
    });

    return newRow;
  });
};

/**
 * Merge de colonnes
 */
export const applyMerge = (
  data: DataRow[],
  columns: string[],
  newColumn: string,
  separator: string
): DataRow[] => {
  return data.map(row => {
    const values = columns.map(col => row[col] || '');
    return {
      ...row,
      [newColumn]: values.join(separator)
    };
  });
};

/**
 * Colonne calculée (formule sécurisée via FormulaParser)
 */
export const applyCalculate = (
  data: DataRow[],
  newColumn: string,
  formula: string
): DataRow[] => {
  return data.map(row => {
    try {
      // Évaluer l'expression de manière sécurisée avec le FormulaParser
      const result = evaluateFormula(row, formula);

      return {
        ...row,
        [newColumn]: result
      };
    } catch {
      return {
        ...row,
        [newColumn]: null
      };
    }
  });
};

/**
 * Applique un Pivot sur les données
 */
export const applyPivot = (
  data: DataRow[],
  index: string,
  columns: string,
  values: string,
  aggFunc: ETLAggregationType
): DataRow[] => {
  if (!index || !columns || !values) return data;

  const pivotMap = new Map<string, Map<string, any[]>>();
  const allColumns = new Set<string>();

  data.forEach(row => {
    const idxVal = String(row[index] ?? '(Vide)');
    const colVal = String(row[columns] ?? '(Vide)');
    const val = row[values];

    allColumns.add(colVal);

    if (!pivotMap.has(idxVal)) pivotMap.set(idxVal, new Map());
    const rowMap = pivotMap.get(idxVal)!;
    if (!rowMap.has(colVal)) rowMap.set(colVal, []);
    rowMap.get(colVal)!.push(val);
  });

  const result: DataRow[] = [];
  pivotMap.forEach((rowMap, idxVal) => {
    const newRow: DataRow = { id: generateId(), [index]: idxVal };
    allColumns.forEach(col => {
      const vals = rowMap.get(col) || [];
      newRow[col] = calculateAggregation(vals, aggFunc);
    });
    result.push(newRow);
  });

  return result;
};

/**
 * Applique un Unpivot sur les données
 */
export const applyUnpivot = (
  data: DataRow[],
  idVars: string[],
  valueVars: string[],
  varName: string = 'variable',
  valueName: string = 'value'
): DataRow[] => {
  const result: DataRow[] = [];

  data.forEach(row => {
    valueVars.forEach(vVar => {
      if (vVar in row) {
        const newRow: DataRow = { id: generateId() };
        idVars.forEach(idVar => {
          newRow[idVar] = row[idVar];
        });
        newRow[varName] = vVar;
        newRow[valueName] = row[vVar];
        result.push(newRow);
      }
    });
  });

  return result;
};
