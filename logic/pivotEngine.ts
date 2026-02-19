
import { getGroupedLabel, formatNumberValue, prepareFilters, applyPreparedFilters, getValueForAggregation } from '../utils';
import { FieldConfig, Dataset, PivotConfig, PivotResult, PivotRow } from '../types';

import { PivotMetric } from '../types/pivot';

// Structure optimisée pour le calcul interne
interface OptimizedRow {
  rowKeys: string[];
  colKey: string;
  metricVals: number[];
  rawVals: any[];
}

// Interface pour le cache des stats de groupe
interface GroupStats {
    metrics: Record<string, number | string>;
    rowTotal: number | string | Record<string, number | string>;
    // Données brutes pour usage interne (tri)
    rawRowTotal: number; 
    rawMetrics: Map<string, number>; 
}

/**
 * MOTEUR TCD : Logique pure de calcul optimisée
 */
export const calculatePivotData = (config: PivotConfig): PivotResult | null => {
  const { 
    rows, rowFields, colFields, colGrouping,
    filters, sortBy, sortOrder, showSubtotals, showVariations
  } = config;

  // Backward compatibility for metrics
  const activeMetrics: PivotMetric[] = config.metrics && config.metrics.length > 0
    ? config.metrics
    : (config.valField ? [{ field: config.valField, aggType: config.aggType }] : []);

  if (rows.length === 0 || (rowFields.length === 0 && (!colFields || colFields.length === 0))) return null;

  // --- PHASE 0 : PREPARATION CONFIG & META-DONNEES ---
  
  const metricConfigs = activeMetrics.map(m => {
      let valUnit: string | undefined = undefined;
      const valField = m.field;

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
      return { ...m, valUnit };
  });

  // BOLT OPTIMIZATION: Pre-calculate metric metadata once
  const hasAvgMetric = metricConfigs.some(m => m.aggType === 'avg');
  const numMetrics = metricConfigs.length;

  // Optimisation 1.1 : Pré-calcul des valeurs de filtres
  // BOLT MEASUREMENT: Using Set for 'in' filters reduces complexity from O(N*M) to O(N+M)
  // For 10k rows and 100 filter items, this saves ~1M operations per pivot calculation.
  const preparedFilters = prepareFilters(filters);

  // --- PHASE 1 : FILTRAGE & PRE-CALCUL (O(N)) ---
  
  const optimizedRows: OptimizedRow[] = [];
  const colHeadersSet = new Set<string>();

  // BOLT OPTIMIZATION: Local cache for string conversions to avoid repetitive .trim() and String() calls
  const localStringCache = new Map<any, string>();
  const getString = (v: any) => {
    if (v === undefined || v === null) return '(Vide)';
    let res = localStringCache.get(v);
    if (res === undefined) {
      res = String(v).trim();
      if (res === '') res = '(Vide)';
      if (localStringCache.size < 5000) localStringCache.set(v, res);
    }
    return res;
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    
    // 1.1 Filtrage Rapide
    if (!applyPreparedFilters(row, preparedFilters)) continue;

    // 1.2 Extraction Clés Lignes
    const rowKeys = new Array(rowFields.length);
    for(let j=0; j<rowFields.length; j++) {
        rowKeys[j] = getString(row[rowFields[j]]);
    }

    // 1.3 Extraction Clé Colonne
    let colKey = 'ALL';
    if (colFields && colFields.length > 0) {
       if (colFields.length === 1 && colGrouping === 'none') {
           colKey = getString(row[colFields[0]]);
       } else {
           let keyParts = "";
           for (let j = 0; j < colFields.length; j++) {
               let label = getString(row[colFields[j]]);
               if (colGrouping !== 'none') label = getGroupedLabel(label, colGrouping);
               keyParts += (j === 0 ? "" : "\x1F") + label;
           }
           colKey = keyParts;
       }
    }
    colHeadersSet.add(colKey);

    // 1.4 Extraction Métriques
    const metricVals = new Array(numMetrics);
    const rawVals = new Array(numMetrics);
    for (let j = 0; j < numMetrics; j++) {
        const mc = metricConfigs[j];
        const raw = row[mc.field];
        rawVals[j] = raw;
        // BOLT FIX: Use getValueForAggregation to handle dates and numbers correctly
        metricVals[j] = (mc.aggType === 'count' || mc.aggType === 'list') ? 0 : getValueForAggregation(raw, config.currentDataset?.fieldConfigs?.[mc.field]);
    }

    optimizedRows.push({
       rowKeys,
       colKey,
       metricVals,
       rawVals
    });
  }

  const sortedColHeaders = Array.from(colHeadersSet).sort();

  // --- PHASE 2 : AGREGATION ---

  // Pre-calculate baseline stats to avoid .map() in initStats
  const COMPLEX_AGGS = ['median', 'stddev', 'variance', 'percentile25', 'percentile75', 'countDistinct', 'first', 'last'];

  const baseAggValues = metricConfigs.map(mc => {
      const type = mc.aggType;
      if (type === 'min') return Infinity;
      if (type === 'max') return -Infinity;
      if (type === 'list' || type === 'countDistinct') return 'SET';
      if (COMPLEX_AGGS.includes(type)) return 'ARRAY';
      return 0;
  });

  const initStats = () => {
      const rowTotalMetrics = new Array(numMetrics);
      for (let j = 0; j < numMetrics; j++) {
          const base = baseAggValues[j];
          rowTotalMetrics[j] = base === 'SET' ? new Set() : base === 'ARRAY' ? [] : base;
      }

      return {
          colMetrics: new Map<string, any[]>(),
          rowTotalMetrics,
          count: 0,
          colCounts: new Map<string, number>()
      };
  };

  const computeGroupStats = (groupRows: OptimizedRow[]): GroupStats => {
      const stats = initStats();
      const colMetrics = stats.colMetrics;
      const colCounts = stats.colCounts;
      const rowTotalMetrics = stats.rowTotalMetrics;

      for (let i = 0; i < groupRows.length; i++) {
          const row = groupRows[i];
          const colKey = row.colKey;

          if (hasAvgMetric) {
              stats.count++;
          }

          let colMetricVals = colMetrics.get(colKey);
          if (!colMetricVals) {
              colMetricVals = new Array(numMetrics);
              for (let j = 0; j < numMetrics; j++) {
                  const base = baseAggValues[j];
                  colMetricVals[j] = base === 'SET' ? new Set() : base === 'ARRAY' ? [] : base;
              }
              colMetrics.set(colKey, colMetricVals);
          }

          for (let mIdx = 0; mIdx < numMetrics; mIdx++) {
              const mc = metricConfigs[mIdx];
              const val = mc.aggType === 'count' ? 1 : row.metricVals[mIdx];
              const raw = row.rawVals[mIdx];
              const aggType = mc.aggType;
              
              // 2.1 Mise à jour Totaux Ligne
              if (aggType === 'sum' || aggType === 'count' || aggType === 'avg') {
                  rowTotalMetrics[mIdx] += val;
                  colMetricVals[mIdx] += val;
              } else if (aggType === 'min') {
                  if (val < rowTotalMetrics[mIdx]) rowTotalMetrics[mIdx] = val;
                  if (val < colMetricVals[mIdx]) colMetricVals[mIdx] = val;
              } else if (aggType === 'max') {
                  if (val > rowTotalMetrics[mIdx]) rowTotalMetrics[mIdx] = val;
                  if (val > colMetricVals[mIdx]) colMetricVals[mIdx] = val;
              } else if (aggType === 'list' || aggType === 'countDistinct') {
                  if (raw !== undefined && raw !== null) {
                      const strVal = String(raw);
                      (rowTotalMetrics[mIdx] as Set<string>).add(strVal);
                      (colMetricVals[mIdx] as Set<string>).add(strVal);
                  }
              } else if (COMPLEX_AGGS.includes(aggType)) {
                  rowTotalMetrics[mIdx].push(val);
                  colMetricVals[mIdx].push(val);
              }
          }

          colCounts.set(colKey, (colCounts.get(colKey) || 0) + 1);
      }

      return finalizeStats(stats, sortedColHeaders);
  };

  const finalizeStats = (stats: any, headers: string[]): GroupStats => {
      const finalMetrics: Record<string, number | string> = {};
      const rawMetrics = new Map<string, number>(); 
      const finalTotalMetrics: Record<string, number | string> = {};
      let rawRowTotal = 0;

      const formatList = (s: Set<string>) => {
          const arr = Array.from(s);
          if (arr.length === 0) return '-';
          if (arr.length > 3) return `${arr.slice(0, 3).join(', ')} (+${arr.length - 3})`;
          return arr.join(', ');
      };

      const calculateComplexVal = (vals: number[], type: string) => {
          if (!vals || vals.length === 0) return undefined;
          if (type === 'first') return vals[0];
          if (type === 'last') return vals[vals.length - 1];

          const sorted = [...vals].sort((a, b) => a - b);
          if (type === 'median') {
              const mid = Math.floor(sorted.length / 2);
              return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
          }
          if (type === 'percentile25') return sorted[Math.floor(sorted.length * 0.25)];
          if (type === 'percentile75') return sorted[Math.floor(sorted.length * 0.75)];

          if (type === 'stddev' || type === 'variance') {
              const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
              const variance = vals.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / vals.length;
              return type === 'variance' ? variance : Math.sqrt(variance);
          }
          return undefined;
      };

      metricConfigs.forEach((mc, mIdx) => {
          let valTotal = stats.rowTotalMetrics[mIdx];
          const type = mc.aggType;

          if (type === 'avg') {
             valTotal = stats.count > 0 ? valTotal / stats.count : undefined;
          } else if (type === 'list') {
             valTotal = formatList(valTotal);
          } else if (type === 'countDistinct') {
             valTotal = (valTotal as Set<string>).size;
          } else if (COMPLEX_AGGS.includes(type)) {
             valTotal = calculateComplexVal(valTotal as number[], type);
          } else if ((type === 'min' || type === 'max') && !isFinite(valTotal)) {
             valTotal = undefined;
          }

          const metricLabel = mc.label || `${mc.field} (${mc.aggType})`;
          finalTotalMetrics[metricLabel] = valTotal;

          // Use first metric for row-level sorting if needed
          let rawTotalVal = 0;
          if (typeof valTotal === 'number') rawTotalVal = valTotal;
          else if (type === 'list' && stats.rowTotalMetrics[mIdx] instanceof Set) rawTotalVal = (stats.rowTotalMetrics[mIdx] as Set<string>).size;

          rawMetrics.set(`TOTAL\x1F${metricLabel}`, rawTotalVal);

          if (mIdx === 0) {
              rawRowTotal = rawTotalVal;
              rawMetrics.set('value', rawTotalVal);
          }

          stats.colMetrics.forEach((colMetricVals: any[], h: string) => {
              let val = colMetricVals[mIdx];
              const count = stats.colCounts.get(h) || 1;
              let rawColVal = 0;

              if (val !== undefined) {
                  if (type === 'avg') {
                      val = val / count;
                      rawColVal = val;
                  } else if (type === 'list') {
                      rawColVal = (val as Set<string>).size;
                      val = formatList(val);
                  } else if (type === 'countDistinct') {
                      val = (val as Set<string>).size;
                      rawColVal = val;
                  } else if (COMPLEX_AGGS.includes(type)) {
                      val = calculateComplexVal(val as number[], type);
                      rawColVal = typeof val === 'number' ? val : 0;
                  } else if ((type === 'min' || type === 'max') && !isFinite(val)) {
                      val = undefined;
                      rawColVal = 0;
                  } else if (typeof val === 'number') {
                      rawColVal = val;
                  }
              } else {
                  if (type === 'list') val = '-';
                  rawColVal = 0;
              }

              const fullKey = colFields.length > 0
                ? (metricConfigs.length > 1 ? `${h}\x1F${metricLabel}` : h)
                : metricLabel;
              finalMetrics[fullKey] = val;
              rawMetrics.set(fullKey, rawColVal);

              if (mIdx === 0) {
                  rawMetrics.set(h, rawColVal);
              }
          });
      });

      // TIME INTELLIGENCE / COMPARISONS
      if (showVariations) {
          if (colFields && colFields.length > 0) {
              // Comparison between columns (for each metric)
              metricConfigs.forEach((mc) => {
                 if (!['sum', 'count', 'avg'].includes(mc.aggType)) return;
                 const metricLabel = mc.label || `${mc.field} (${mc.aggType})`;

                 for (let i = 1; i < headers.length; i++) {
                    const h = headers[i];
                    const prevH = headers[i-1];

                    const currKey = metricConfigs.length > 1 ? `${h}\x1F${metricLabel}` : h;
                    const prevKey = metricConfigs.length > 1 ? `${prevH}\x1F${metricLabel}` : prevH;

                    const currVal = Number(finalMetrics[currKey] || 0);
                    const prevVal = Number(finalMetrics[prevKey] || 0);

                    const diff = currVal - prevVal;
                    let pct = 0;
                    if (prevVal !== 0) pct = (diff / Math.abs(prevVal)) * 100;

                    if (metricConfigs.length > 1) {
                        finalMetrics[`${h}\x1F${metricLabel}_DIFF`] = diff;
                        finalMetrics[`${h}\x1F${metricLabel}_PCT`] = pct;
                    } else {
                        finalMetrics[`${h}_DIFF`] = diff;
                        finalMetrics[`${h}_PCT`] = pct;
                    }
                 }
              });
          } else if (metricConfigs.length > 1) {
              // Comparison between metrics (when no columns)
              for (let i = 1; i < metricConfigs.length; i++) {
                 const mLabel = metricConfigs[i].label || `${metricConfigs[i].field} (${metricConfigs[i].aggType})`;
                 const prevMLabel = metricConfigs[i-1].label || `${metricConfigs[i-1].field} (${metricConfigs[i-1].aggType})`;

                 const currVal = Number(finalMetrics[mLabel] || 0);
                 const prevVal = Number(finalMetrics[prevMLabel] || 0);

                 const diff = currVal - prevVal;
                 let pct = 0;
                 if (prevVal !== 0) pct = (diff / Math.abs(prevVal)) * 100;

                 finalMetrics[`${mLabel}_DIFF`] = diff;
                 finalMetrics[`${mLabel}_PCT`] = pct;
              }
          }
      }

      return {
          metrics: finalMetrics,
          rowTotal: metricConfigs.length === 1 ? Object.values(finalTotalMetrics)[0] : finalTotalMetrics,
          rawRowTotal,
          rawMetrics
      };
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
        if (showSubtotals) {
          displayRows.push({
            type: 'subtotal',
            keys: currentKeys,
            level,
            metrics: stats.metrics,
            rowTotal: stats.rowTotal,
            label: key // En mode header, on affiche juste la clé
          });
        }

        processLevel(subgroupRows, level + 1, currentKeys);
      }
    }
  };

  // Lancement récursif
  if (rowFields.length > 0) {
    processLevel(optimizedRows, 0, []);
  } else {
    // Si pas de lignes, on ajoute une seule ligne de total
    const grandTotalStatsForRows = computeGroupStats(optimizedRows);
    displayRows.push({
      type: 'data',
      keys: [],
      level: 0,
      metrics: grandTotalStatsForRows.metrics,
      rowTotal: grandTotalStatsForRows.rowTotal
    });
  }

  // Total Général
  const grandTotalStats = computeGroupStats(optimizedRows);

  // Construction des headers finaux
  const finalHeaders: string[] = [];
  const metricLabels = metricConfigs.map(mc => mc.label || `${mc.field} (${mc.aggType})`);

  if (colFields && colFields.length > 0) {
      sortedColHeaders.forEach((h, hIdx) => {
          metricLabels.forEach(ml => {
              if (showVariations && hIdx > 0) {
                  if (metricConfigs.length > 1) {
                      finalHeaders.push(`${h}\x1F${ml}_DIFF`);
                      finalHeaders.push(`${h}\x1F${ml}_PCT`);
                  } else {
                      finalHeaders.push(`${h}_DIFF`);
                      finalHeaders.push(`${h}_PCT`);
                  }
              }

              if (metricConfigs.length > 1) {
                  finalHeaders.push(`${h}\x1F${ml}`);
              } else {
                  finalHeaders.push(h);
              }
          });
      });
  } else {
      metricLabels.forEach((ml, mIdx) => {
          if (showVariations && mIdx > 0) {
              finalHeaders.push(`${ml}_DIFF`);
              finalHeaders.push(`${ml}_PCT`);
          }
          finalHeaders.push(ml);
      });
  }

  return {
    colHeaders: finalHeaders,
    displayRows,
    colTotals: grandTotalStats.metrics,
    grandTotal: grandTotalStats.rowTotal
  };
};

import { formatDateDelta } from '../utils/common';

/**
 * Helper de formatage d'affichage
 */
export const formatPivotOutput = (
    val: number | string,
    valField: string,
    aggType: string,
    dataset?: Dataset | null,
    secondaryDatasetId?: string,
    allDatasets?: Dataset[],
    overrideConfig?: Partial<FieldConfig>,
    isDelta: boolean = false
) => {
    if (val === undefined || val === null) return '-';
    if (typeof val === 'string') return val;
    
    // Utiliser config standard si numérique
    if (aggType !== 'count' && valField) {
        if (overrideConfig && (overrideConfig.decimalPlaces !== undefined || overrideConfig.displayScale !== undefined || overrideConfig.unit || overrideConfig.type === 'date')) {
            // Pour un delta de date, on utilise formatDateDelta au lieu du formatage standard
            if (isDelta && overrideConfig.type === 'date' && typeof val === 'number') {
                return formatDateDelta(val);
            }
            return formatNumberValue(val, overrideConfig as FieldConfig);
        }

        let config = dataset?.fieldConfigs?.[valField];
        
        if (!config && dataset?.calculatedFields) {
            const cf = dataset.calculatedFields.find(c => c.name === valField);
            if (cf) {
                config = {
                    type: (cf.outputType as any) === 'date' ? 'date' : 'number',
                    unit: cf.unit
                };
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
                   if (cf) {
                       config = {
                           type: (cf.outputType as any) === 'date' ? 'date' : 'number',
                           unit: cf.unit
                       };
                   }
               }
           }
        }
        
        if (config) {
            // Pour un delta de date, on utilise formatDateDelta
            if (isDelta && config.type === 'date' && typeof val === 'number') {
                return formatDateDelta(val);
            }
            return formatNumberValue(val, config);
        }
    }
    
    // Fallback
    if (val % 1 !== 0) return val.toFixed(2);
    return val.toLocaleString();
};
