
import { parseSmartNumber, getGroupedLabel, formatNumberValue } from '../utils';
import { FieldConfig, Dataset, FilterRule, PivotJoin } from '../types';

// Types spécifiques au moteur
export type AggregationType = 'count' | 'sum' | 'avg' | 'min' | 'max' | 'list';
export type SortBy = 'label' | 'value' | string; // 'value' = Grand Total, string = Specific Column Key
export type SortOrder = 'asc' | 'desc';
export type DateGrouping = 'none' | 'year' | 'quarter' | 'month';

export interface PivotRow {
  type: 'data' | 'subtotal' | 'grandTotal';
  keys: string[];
  level: number;
  metrics: Record<string, number | string>;
  rowTotal: number | string;
  label?: string;
  isCollapsed?: boolean;
}

export interface PivotConfig {
  rows: any[]; // Données brutes (déjà jointes/blended si nécessaire)
  rowFields: string[];
  colFields: string[]; // UPDATED: Array support
  colGrouping: DateGrouping;
  valField: string;
  aggType: AggregationType;
  filters: FilterRule[];
  sortBy: SortBy;
  sortOrder: SortOrder;
  showSubtotals: boolean;
  showVariations?: boolean; // NEW: Enable Time Intelligence
  
  // Context pour le formatage
  currentDataset?: Dataset | null;
  joins?: PivotJoin[]; 
  datasets?: Dataset[];
  valFormatting?: Partial<FieldConfig>;
}

export interface PivotResult {
  colHeaders: string[];
  displayRows: PivotRow[];
  colTotals: Record<string, number | string>;
  grandTotal: number | string;
}

// Structure optimisée pour le calcul interne
interface OptimizedRow {
  rowKeys: string[];
  colKey: string;
  metricVal: number;
  rawVal: any; // Pour le type 'list'
}

// Interface pour le cache des stats de groupe
interface GroupStats {
    metrics: Record<string, number | string>;
    rowTotal: number | string;
    // Données brutes pour usage interne (tri)
    rawRowTotal: number; 
    rawMetrics: Map<string, number>; 
}

/**
 * MOTEUR TCD : Logique pure de calcul optimisée
 */
export const calculatePivotData = (config: PivotConfig): PivotResult | null => {
  const { 
    rows, rowFields, colFields, colGrouping, valField, aggType, 
    filters, sortBy, sortOrder, showSubtotals, showVariations
  } = config;

  if (rows.length === 0 || rowFields.length === 0) return null;

  // --- PHASE 0 : PREPARATION CONFIG & META-DONNEES ---
  
  let valUnit: string | undefined = undefined;
  
  if (config.currentDataset?.fieldConfigs?.[valField]?.unit) {
      valUnit = config.currentDataset.fieldConfigs[valField].unit;
  } else if (config.currentDataset?.calculatedFields) {
      const cf = config.currentDataset.calculatedFields.find(c => c.name === valField);
      if (cf?.unit) valUnit = cf.unit;
  } else if (config.datasets) {
      const prefixMatch = valField.match(/^\[(.*?)\] (.*)$/);
      if (prefixMatch) {
          const dsName = prefixMatch[1];
          const originalFieldName = prefixMatch[2];
          const sourceDS = config.datasets.find(d => d.name === dsName);
          if (sourceDS?.fieldConfigs?.[originalFieldName]?.unit) {
              valUnit = sourceDS.fieldConfigs[originalFieldName].unit;
          } else if (sourceDS?.calculatedFields) {
              const cf = sourceDS.calculatedFields.find(c => c.name === originalFieldName);
              if (cf?.unit) valUnit = cf.unit;
          }
      }
  }

  // Optimisation 1.1 : Pré-calcul des valeurs de filtres
  const preparedFilters = filters.map(f => {
      let preparedValue = f.value;
      if (f.operator === 'gt' || f.operator === 'lt') {
          preparedValue = parseSmartNumber(f.value);
      } else if (typeof f.value === 'string' && f.operator !== 'in') {
          preparedValue = f.value.toLowerCase();
      }
      return { ...f, preparedValue };
  });

  // --- PHASE 1 : FILTRAGE & PRE-CALCUL (O(N)) ---
  
  const optimizedRows: OptimizedRow[] = [];
  const colHeadersSet = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    
    // 1.1 Filtrage Rapide
    if (preparedFilters.length > 0) {
      let pass = true;
      for (const f of preparedFilters) {
         const rowVal = row[f.field];
         
         if (Array.isArray(f.value) && (!f.operator || f.operator === 'in')) {
             if (f.value.length > 0 && !f.value.includes(String(rowVal))) {
                 pass = false; break;
             }
             continue;
         }
         
         if (f.operator === 'gt' || f.operator === 'lt') {
             const rowNum = parseSmartNumber(rowVal);
             if (f.operator === 'gt' && rowNum <= (f.preparedValue as number)) { pass = false; break; }
             if (f.operator === 'lt' && rowNum >= (f.preparedValue as number)) { pass = false; break; }
             continue;
         }

         const strRowVal = String(rowVal || '').toLowerCase();
         const strFilterVal = f.preparedValue as string;

         if (f.operator === 'starts_with' && !strRowVal.startsWith(strFilterVal)) { pass = false; break; }
         if (f.operator === 'contains' && !strRowVal.includes(strFilterVal)) { pass = false; break; }
         if (f.operator === 'eq' && strRowVal !== strFilterVal) { pass = false; break; }
      }
      if (!pass) continue;
    }

    // 1.2 Extraction Clés Lignes
    const rowKeys = new Array(rowFields.length);
    for(let j=0; j<rowFields.length; j++) {
        const v = row[rowFields[j]];
        rowKeys[j] = v !== undefined && v !== null ? String(v) : '(Vide)';
    }

    // 1.3 Extraction Clé Colonne (UPDATED FOR MULTI COLS)
    let colKey = 'ALL';
    if (colFields && colFields.length > 0) {
       const keyParts = colFields.map(field => {
           let v = row[field];
           if (v === undefined || v === null) v = '(Vide)';
           else v = String(v);
           // Apply grouping to any field (safe as getGroupedLabel returns val if not date)
           return getGroupedLabel(v, colGrouping);
       });
       colKey = keyParts.join(' - ');
       colHeadersSet.add(colKey);
    }

    // 1.4 Extraction Métrique
    let metricVal = 0;
    if (aggType !== 'count' && aggType !== 'list') {
       metricVal = parseSmartNumber(row[valField], valUnit);
    }

    optimizedRows.push({
       rowKeys,
       colKey,
       metricVal,
       rawVal: row[valField]
    });
  }

  const sortedColHeaders = Array.from(colHeadersSet).sort();

  // --- PHASE 2 : AGREGATION ---

  const initStats = () => ({
      colMetrics: new Map<string, any>(),
      rowTotalMetric: (aggType === 'min' ? Infinity : aggType === 'max' ? -Infinity : (aggType === 'list' ? new Set() : 0)) as any,
      count: 0,
      colCounts: new Map<string, number>()
  });

  const computeGroupStats = (groupRows: OptimizedRow[]): GroupStats => {
      const stats = initStats();

      for (let i = 0; i < groupRows.length; i++) {
          const row = groupRows[i];
          const val = aggType === 'count' ? 1 : row.metricVal;
          const colKey = row.colKey;

          // Mise à jour Total Ligne
          if (aggType === 'sum' || aggType === 'count' || aggType === 'avg') {
              stats.rowTotalMetric += val;
              if (aggType === 'avg') stats.count++;
          } else if (aggType === 'min') {
              if (val < stats.rowTotalMetric) stats.rowTotalMetric = val;
          } else if (aggType === 'max') {
              if (val > stats.rowTotalMetric) stats.rowTotalMetric = val;
          } else if (aggType === 'list') {
              if (row.rawVal) stats.rowTotalMetric.add(String(row.rawVal));
          }

          // Mise à jour Métrique Colonne
          if (colFields && colFields.length > 0) {
              let currentVal = stats.colMetrics.get(colKey);
              
              if (currentVal === undefined) {
                  if (aggType === 'min') currentVal = Infinity;
                  else if (aggType === 'max') currentVal = -Infinity;
                  else if (aggType === 'list') currentVal = new Set();
                  else currentVal = 0;
              }

              if (aggType === 'sum' || aggType === 'count' || aggType === 'avg') {
                  stats.colMetrics.set(colKey, currentVal + val);
                  if (aggType === 'avg') {
                      stats.colCounts.set(colKey, (stats.colCounts.get(colKey) || 0) + 1);
                  }
              } else if (aggType === 'min') {
                  if (val < currentVal) stats.colMetrics.set(colKey, val);
              } else if (aggType === 'max') {
                  if (val > currentVal) stats.colMetrics.set(colKey, val);
              } else if (aggType === 'list') {
                  if (row.rawVal) {
                      currentVal.add(String(row.rawVal));
                  }
              }
          }
      }

      return finalizeStats(stats, sortedColHeaders, aggType);
  };

  const finalizeStats = (stats: any, headers: string[], type: AggregationType): GroupStats => {
      const finalMetrics: Record<string, number | string> = {};
      const rawMetrics = new Map<string, number>(); 
      let finalTotal = stats.rowTotalMetric;
      let rawRowTotal = 0;

      // Finalisation AVG
      if (type === 'avg') {
          if (stats.count > 0) finalTotal = finalTotal / stats.count;
          else finalTotal = 0;
          
          stats.colMetrics.forEach((val: number, key: string) => {
              const count = stats.colCounts.get(key) || 1;
              stats.colMetrics.set(key, val / count);
          });
      }

      // Stockage de la valeur numérique brute pour le tri
      if (typeof finalTotal === 'number') rawRowTotal = finalTotal;
      else if (type === 'list') rawRowTotal = (finalTotal as Set<string>).size;

      // Finalisation LIST
      if (type === 'list') {
          const formatList = (s: Set<string>) => {
              const arr = Array.from(s);
              if (arr.length === 0) return '-';
              if (arr.length > 3) return `${arr.slice(0, 3).join(', ')} (+${arr.length - 3})`;
              return arr.join(', ');
          };
          finalTotal = formatList(finalTotal);
          stats.colMetrics.forEach((val: Set<string>, key: string) => {
              stats.colMetrics.set(key, formatList(val));
          });
      }

      // Nettoyage Infinity
      if (type === 'min' || type === 'max') {
          if (!isFinite(finalTotal)) finalTotal = 0;
          rawRowTotal = Number(finalTotal);
      }

      // Remplissage dense
      headers.forEach(h => {
          let val = stats.colMetrics.get(h);
          
          // Stockage brute pour tri
          if (typeof val === 'number') rawMetrics.set(h, val);
          else if (val instanceof Set) rawMetrics.set(h, val.size);
          else rawMetrics.set(h, 0);

          if (val === undefined) {
              if (type === 'min' || type === 'max') val = undefined;
              else if (type === 'list') val = '-';
              else val = undefined; 
          } else if ((type === 'min' || type === 'max') && !isFinite(val)) {
              val = undefined;
          }
          finalMetrics[h] = val;
      });

      // TIME INTELLIGENCE: CALCUL DES VARIATIONS
      if (showVariations && colFields && colFields.length > 0 && (aggType === 'sum' || aggType === 'count' || aggType === 'avg')) {
          for (let i = 1; i < headers.length; i++) {
              const currHeader = headers[i];
              const prevHeader = headers[i - 1];
              
              const currVal = rawMetrics.get(currHeader) || 0;
              const prevVal = rawMetrics.get(prevHeader) || 0;
              
              const diffKey = `${currHeader}_DIFF`;
              const pctKey = `${currHeader}_PCT`;
              
              const diff = currVal - prevVal;
              let pct = 0;
              if (prevVal !== 0) pct = (diff / Math.abs(prevVal)) * 100;
              
              finalMetrics[diffKey] = diff;
              finalMetrics[pctKey] = pct;
          }
      }

      return { metrics: finalMetrics, rowTotal: finalTotal, rawRowTotal, rawMetrics };
  };

  const displayRows: PivotRow[] = [];

  const processLevel = (levelRows: OptimizedRow[], level: number, parentKeys: string[]) => {
    // 1. Groupement
    const groups = new Map<string, OptimizedRow[]>();
    for (let i = 0; i < levelRows.length; i++) {
        const r = levelRows[i];
        const key = r.rowKeys[level];
        let g = groups.get(key);
        if (!g) {
            g = [];
            groups.set(key, g);
        }
        g.push(r);
    }

    const groupStatsCache = new Map<string, GroupStats>();
    const groupKeys = Array.from(groups.keys());
    
    // Calcul en masse
    for (const key of groupKeys) {
        const rows = groups.get(key)!;
        groupStatsCache.set(key, computeGroupStats(rows));
    }

    // 2. Tri avec Lookup (O(1) access inside sort)
    const sortedKeys = groupKeys.sort((a, b) => {
      if (sortBy === 'label') {
        return sortOrder === 'asc' ? a.localeCompare(b) : b.localeCompare(a);
      } else {
        const statsA = groupStatsCache.get(a)!;
        const statsB = groupStatsCache.get(b)!;
        
        let valA = 0;
        let valB = 0;

        if (sortBy === 'value') { // Grand Total
          valA = statsA.rawRowTotal;
          valB = statsB.rawRowTotal;
        } else { // Specific Column
          valA = statsA.rawMetrics.get(sortBy) ?? 0;
          valB = statsB.rawMetrics.get(sortBy) ?? 0;
        }

        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
    });

    // 3. Construction des lignes
    for (const key of sortedKeys) {
      const subgroupRows = groups.get(key)!;
      const currentKeys = [...parentKeys, key];
      const stats = groupStatsCache.get(key)!; 

      if (level === rowFields.length - 1) {
        // Niveau Feuille
        displayRows.push({
          type: 'data',
          keys: currentKeys,
          level,
          metrics: stats.metrics,
          rowTotal: stats.rowTotal
        });
      } else {
        // Niveau Nœud
        processLevel(subgroupRows, level + 1, currentKeys);

        if (showSubtotals) {
          displayRows.push({
            type: 'subtotal',
            keys: currentKeys,
            level,
            metrics: stats.metrics,
            rowTotal: stats.rowTotal,
            label: `Total ${key}`
          });
        }
      }
    }
  };

  // Lancement récursif
  processLevel(optimizedRows, 0, []);

  // Total Général
  const grandTotalStats = computeGroupStats(optimizedRows);

  // Construction des headers finaux avec variations
  let finalHeaders = [...sortedColHeaders];
  if (showVariations && colFields && colFields.length > 0 && (aggType === 'sum' || aggType === 'count' || aggType === 'avg')) {
      const enrichedHeaders: string[] = [];
      if (sortedColHeaders.length > 0) enrichedHeaders.push(sortedColHeaders[0]);
      
      for (let i = 1; i < sortedColHeaders.length; i++) {
          const h = sortedColHeaders[i];
          enrichedHeaders.push(`${h}_DIFF`); // Ecart
          enrichedHeaders.push(`${h}_PCT`);  // %
          enrichedHeaders.push(h);           // Valeur
      }
      finalHeaders = enrichedHeaders;
  }

  return {
    colHeaders: finalHeaders,
    displayRows,
    colTotals: grandTotalStats.metrics,
    grandTotal: grandTotalStats.rowTotal
  };
};

/**
 * Helper de formatage d'affichage
 */
export const formatPivotOutput = (val: number | string, valField: string, aggType: string, dataset?: Dataset | null, secondaryDatasetId?: string, allDatasets?: Dataset[], overrideConfig?: Partial<FieldConfig>) => {
    if (val === undefined || val === null) return '-';
    if (typeof val === 'string') return val;
    
    // Utiliser config standard si numérique
    if (aggType !== 'count' && valField) {
        if (overrideConfig && (overrideConfig.decimalPlaces !== undefined || overrideConfig.displayScale !== undefined || overrideConfig.unit)) {
            return formatNumberValue(val, overrideConfig as FieldConfig);
        }

        let config = dataset?.fieldConfigs?.[valField];
        
        if (!config && dataset?.calculatedFields) {
            const cf = dataset.calculatedFields.find(c => c.name === valField);
            if (cf?.unit) {
                config = { type: 'number', unit: cf.unit };
            }
        }

        if (!config && allDatasets) {
           const prefixMatch = valField.match(/^\[(.*?)\] (.*)$/);
           if (prefixMatch) {
               const dsName = prefixMatch[1];
               const originalFieldName = prefixMatch[2];
               const sourceDS = allDatasets.find(d => d.name === dsName);
               config = sourceDS?.fieldConfigs?.[originalFieldName];
               
               if (!config && sourceDS?.calculatedFields) {
                   const cf = sourceDS.calculatedFields.find(c => c.name === originalFieldName);
                   if (cf?.unit) {
                       config = { type: 'number', unit: cf.unit };
                   }
               }
           }
        }
        
        if (config) return formatNumberValue(val, config);
    }
    
    // Fallback
    if (val % 1 !== 0) return val.toFixed(2);
    return val.toLocaleString();
};
