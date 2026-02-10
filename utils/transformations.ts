import { DataRow, FilterCondition, FilterOperator, JoinType, ETLAggregationType } from '../types';
import { generateId, evaluateFormula } from '../utils';

/**
 * Applique un filtre sur les données
 */
export const applyFilter = (
  data: DataRow[],
  conditions: FilterCondition[],
  combineWith: 'AND' | 'OR'
): DataRow[] => {
  if (conditions.length === 0) return data;

  return data.filter(row => {
    const results = conditions.map(condition => evaluateCondition(row, condition));
    return combineWith === 'AND'
      ? results.every(r => r)
      : results.some(r => r);
  });
};

/**
 * Évalue une condition de filtre
 */
const evaluateCondition = (row: DataRow, condition: FilterCondition): boolean => {
  const fieldValue = row[condition.field];
  const filterValue = condition.value;

  // Conversion en string pour comparaisons textuelles
  let fieldStr = String(fieldValue || '');
  let filterStr = String(filterValue || '');

  if (!condition.caseSensitive) {
    fieldStr = fieldStr.toLowerCase();
    filterStr = filterStr.toLowerCase();
  }

  switch (condition.operator) {
    case 'equals':
      return fieldValue === filterValue;
    case 'not_equals':
      return fieldValue !== filterValue;
    case 'contains':
      return fieldStr.includes(filterStr);
    case 'not_contains':
      return !fieldStr.includes(filterStr);
    case 'starts_with':
      return fieldStr.startsWith(filterStr);
    case 'ends_with':
      return fieldStr.endsWith(filterStr);
    case 'greater_than':
      return Number(fieldValue) > Number(filterValue);
    case 'less_than':
      return Number(fieldValue) < Number(filterValue);
    case 'greater_or_equal':
      return Number(fieldValue) >= Number(filterValue);
    case 'less_or_equal':
      return Number(fieldValue) <= Number(filterValue);
    case 'is_empty':
      return fieldValue === null || fieldValue === undefined || fieldValue === '';
    case 'is_not_empty':
      return fieldValue !== null && fieldValue !== undefined && fieldValue !== '';
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
      for (const rightRow of matches) {
        matchedRightRows.add(rightRow);

        // Don't include matches for 'right' only join if we are only building unmatched right rows later
        // Actually, 'right' join should include matched rows too.

        const merged = { ...leftRow };
        Object.keys(rightRow).forEach(k => {
          if (k === 'id') return; // Preserve left ID
          const newKey = k in leftRow && k !== rightKey ? `${k}${suffix}` : k;
          merged[newKey] = rightRow[k];
        });
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
        const merged: DataRow = { id: generateId() };
        Object.keys(rightRow).forEach(k => {
          merged[k] = rightRow[k];
        });
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
 */
export const applyAggregate = (
  data: DataRow[],
  groupBy: string[],
  aggregations: { field: string; operation: ETLAggregationType; alias?: string }[]
): DataRow[] => {
  if (groupBy.length === 0) {
    // Agrégation globale
    const result: DataRow = { id: generateId() };
    aggregations.forEach(agg => {
      const values = data.map(row => row[agg.field]).filter(v => v !== null && v !== undefined);
      result[agg.alias || `${agg.operation}_${agg.field}`] = calculateAggregation(values, agg.operation);
    });
    return [result];
  }

  // Group by
  const groups = new Map<string, DataRow[]>();

  data.forEach(row => {
    const key = groupBy.map(field => row[field]).join('|||');
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(row);
  });

  const result: DataRow[] = [];
  groups.forEach((rows, key) => {
    const row: DataRow = { id: generateId() };

    // Ajouter les colonnes de groupement
    groupBy.forEach((field, index) => {
      row[field] = key.split('|||')[index];
    });

    // Calculer les agrégations
    aggregations.forEach(agg => {
      const values = rows.map(r => r[agg.field]).filter(v => v !== null && v !== undefined);
      row[agg.alias || `${agg.operation}_${agg.field}`] = calculateAggregation(values, agg.operation);
    });

    result.push(row);
  });

  return result;
};

/**
 * Calcule une valeur agrégée
 */
const calculateAggregation = (values: any[], operation: ETLAggregationType): any => {
  if (values.length === 0) return null;

  const numbers = values.map(v => Number(v)).filter(n => !isNaN(n));

  switch (operation) {
    case 'sum':
      return numbers.reduce((a, b) => a + b, 0);
    case 'avg':
      return numbers.length > 0 ? numbers.reduce((a, b) => a + b, 0) / numbers.length : null;
    case 'count':
      return values.length;
    case 'min':
      return numbers.length > 0 ? Math.min(...numbers) : null;
    case 'max':
      return numbers.length > 0 ? Math.max(...numbers) : null;
    case 'first':
      return values[0];
    case 'last':
      return values[values.length - 1];
    default:
      return null;
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
 */
export const applySelect = (
  data: DataRow[],
  columns: string[],
  exclude: boolean = false
): DataRow[] => {
  return data.map(row => {
    const newRow: DataRow = { ...row };
    if (exclude) {
      // Exclure les colonnes
      columns.forEach(col => delete newRow[col]);
    } else {
      // Garder seulement les colonnes spécifiées
      const filtered: DataRow = { id: newRow.id || generateId() };
      columns.forEach(col => {
        if (col in newRow) {
          filtered[col] = newRow[col];
        }
      });
      return filtered;
    }
    return newRow;
  });
};

/**
 * Renomme des colonnes
 */
export const applyRename = (
  data: DataRow[],
  mappings: { oldName: string; newName: string }[]
): DataRow[] => {
  return data.map(row => {
    const newRow: DataRow = { ...row };
    mappings.forEach(({ oldName, newName }) => {
      if (oldName in newRow) {
        newRow[newName] = newRow[oldName];
        delete newRow[oldName];
      }
    });
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
 */
export const applyDistinct = (data: DataRow[]): DataRow[] => {
  const seen = new Set<string>();
  const result: DataRow[] = [];

  data.forEach(row => {
    const key = JSON.stringify(row);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(row);
    }
  });

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
    } catch (error) {
      return {
        ...row,
        [newColumn]: null
      };
    }
  });
};
