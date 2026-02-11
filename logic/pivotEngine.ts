
import { parseSmartNumber, getGroupedLabel, formatNumberValue, prepareFilters, applyPreparedFilters } from '../utils';
import { FieldConfig, Dataset, FilterRule, PivotJoin, PivotConfig, PivotResult, PivotRow, AggregationType, SortBy, SortOrder, DateGrouping } from '../types';

import { PivotMetric } from '../types/pivot';

// Structure optimisée pour le calcul interne
interface OptimizedRow {
  rowKeys: string[];
  colKey: string;
  metricVals: number[];
  rawVals: any[];
}

// Interface pour les stats internes pendant l'agrégation
interface InternalStats {
    colMetrics: Map<string, (number | Set<string>)[]>;
    rowTotalMetrics: (number | Set<string>)[];
    count: number;
    colCounts: Map<string, number>;
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
  let activeMetrics: PivotMetric[] = config.metrics && config.metrics.length > 0
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

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    
    // 1.1 Filtrage Rapide
    if (!applyPreparedFilters(row, preparedFilters)) continue;

    // 1.2 Extraction Clés Lignes
    const rowKeys = new Array(rowFields.length);
    for(let j=0; j<rowFields.length; j++) {
        const v = row[rowFields[j]];
        // Gérer null, undefined ET chaînes vides
        rowKeys[j] = v !== undefined && v !== null && String(v).trim() !== '' ? String(v) : '(Vide)';
    }

    // 1.3 Extraction Clé Colonne (UPDATED FOR MULTI COLS)
    // BOLT OPTIMIZATION: Reduce array/string allocations by using explicit loop and string building
    let colKey = 'ALL';
    if (colFields && colFields.length > 0) {
       if (colFields.length === 1 && colGrouping === 'none') {
           const v = row[colFields[0]];
           colKey = v !== undefined && v !== null ? String(v) : '(Vide)';
       } else {
           let keyParts = "";
           for (let j = 0; j < colFields.length; j++) {
               let v = row[colFields[j]];
               let label = v !== undefined && v !== null ? String(v) : '(Vide)';
               if (colGrouping !== 'none') label = getGroupedLabel(label, colGrouping);
               keyParts += (j === 0 ? "" : "\x1F") + label;
           }
           colKey = keyParts;
       }
       colHeadersSet.add(colKey);
    } else {
       colHeadersSet.add('ALL');
    }

    // 1.4 Extraction Métriques
    // BOLT OPTIMIZATION: Combine metric extraction into single pass and avoid .map()
    const metricVals = new Array(numMetrics);
    const rawVals = new Array(numMetrics);
    for (let j = 0; j < numMetrics; j++) {
        const mc = metricConfigs[j];
        rawVals[j] = row[mc.field];
        metricVals[j] = (mc.aggType === 'count' || mc.aggType === 'list') ? 0 : parseSmartNumber(rawVals[j], mc.valUnit);
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

  const initStats = (): InternalStats => ({
      // Map<colKey, any[]> où any[] contient les valeurs cumulées pour chaque métrique
      colMetrics: new Map<string, (number | Set<string>)[]>(),
      // any[] contient les totaux de ligne pour chaque métrique
      rowTotalMetrics: metricConfigs.map(mc => (mc.aggType === 'min' ? Infinity : mc.aggType === 'max' ? -Infinity : (mc.aggType === 'list' ? new Set<string>() : 0))),
      count: 0,
      colCounts: new Map<string, number>()
  });

  const computeGroupStats = (groupRows: OptimizedRow[]): GroupStats => {
      const stats = initStats();

      for (let i = 0; i < groupRows.length; i++) {
          const row = groupRows[i];
          const colKey = row.colKey;

          // BOLT OPTIMIZATION: Avoid repetitive .some() call inside loop
          if (hasAvgMetric) {
              stats.count++;
          }

          // BOLT OPTIMIZATION: Get colMetricVals once per row instead of once per metric
          let colMetricVals = stats.colMetrics.get(colKey);
          if (!colMetricVals) {
              colMetricVals = new Array(numMetrics);
              for (let j = 0; j < numMetrics; j++) {
                  const m = metricConfigs[j];
                  colMetricVals[j] = (m.aggType === 'min' ? Infinity : m.aggType === 'max' ? -Infinity : (m.aggType === 'list' ? new Set() : 0));
              }
              stats.colMetrics.set(colKey, colMetricVals);
          }

          // BOLT OPTIMIZATION: Use standard for loop for metrics aggregation to avoid closure overhead
          for (let mIdx = 0; mIdx < numMetrics; mIdx++) {
              const mc = metricConfigs[mIdx];
              const val = mc.aggType === 'count' ? 1 : row.metricVals[mIdx];
              const aggType = mc.aggType;
              
              // 2.1 Mise à jour Totaux Ligne
              if (aggType === 'sum' || aggType === 'count' || aggType === 'avg') {
                  (stats.rowTotalMetrics[mIdx] as number) += val;
                  (colMetricVals[mIdx] as number) += val;
              } else if (aggType === 'min') {
                  if (val < (stats.rowTotalMetrics[mIdx] as number)) stats.rowTotalMetrics[mIdx] = val;
                  if (val < (colMetricVals[mIdx] as number)) colMetricVals[mIdx] = val;
              } else if (aggType === 'max') {
                  if (val > (stats.rowTotalMetrics[mIdx] as number)) stats.rowTotalMetrics[mIdx] = val;
                  if (val > (colMetricVals[mIdx] as number)) colMetricVals[mIdx] = val;
              } else if (aggType === 'list') {
                  if (row.rawVals[mIdx]) {
                      const strVal = String(row.rawVals[mIdx]);
                      (stats.rowTotalMetrics[mIdx] as Set<string>).add(strVal);
                      (colMetricVals[mIdx] as Set<string>).add(strVal);
                  }
              }
          }

          stats.colCounts.set(colKey, (stats.colCounts.get(colKey) || 0) + 1);
      }

      return finalizeStats(stats, sortedColHeaders);
  };

  const finalizeStats = (stats: InternalStats, headers: string[]): GroupStats => {
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

      metricConfigs.forEach((mc, mIdx) => {
          let valTotal: number | string | Set<string> = stats.rowTotalMetrics[mIdx];

          if (mc.aggType === 'avg') {
             valTotal = stats.count > 0 ? valTotal / stats.count : undefined;
          } else if (mc.aggType === 'list') {
             valTotal = formatList(valTotal);
          } else if ((mc.aggType === 'min' || mc.aggType === 'max') && !isFinite(valTotal)) {
             valTotal = undefined;
          }

          const metricLabel = mc.label || `${mc.field} (${mc.aggType})`;
          finalTotalMetrics[metricLabel] = valTotal as string | number;

          // Use first metric for row-level sorting if needed
          let rawTotalVal = 0;
          if (typeof valTotal === 'number') rawTotalVal = valTotal;
          else if (mc.aggType === 'list' && stats.rowTotalMetrics[mIdx] instanceof Set) rawTotalVal = (stats.rowTotalMetrics[mIdx] as Set<string>).size;

          rawMetrics.set(`TOTAL\x1F${metricLabel}`, rawTotalVal);

          if (mIdx === 0) {
              rawRowTotal = rawTotalVal;
              // Compatibilité pour 'value' qui trie par le grand total de la première métrique
              rawMetrics.set('value', rawTotalVal);
          }

          // BOLT OPTIMIZATION: Only iterate over columns that actually have data for this group
          // This changes complexity from O(Groups * TotalColumns) to O(Rows)
          stats.colMetrics.forEach((colMetricVals: (number | Set<string>)[], h: string) => {
              let val: number | string | Set<string> | undefined = colMetricVals[mIdx];
              const count = stats.colCounts.get(h) || 1;
              let rawColVal = 0;

              if (val !== undefined) {
                  if (mc.aggType === 'avg') {
                      val = (val as number) / count;
                      rawColVal = val;
                  } else if (mc.aggType === 'list') {
                      rawColVal = (val as Set<string>).size;
                      val = formatList(val as Set<string>);
                  } else if ((mc.aggType === 'min' || mc.aggType === 'max') && !isFinite(val as number)) {
                      val = undefined;
                      rawColVal = 0;
                  } else if (typeof val === 'number') {
                      rawColVal = val;
                  }
              } else {
                  if (mc.aggType === 'list') val = '-';
                  rawColVal = 0;
              }

              const fullKey = colFields.length > 0
                ? (metricConfigs.length > 1 ? `${h}\x1F${metricLabel}` : h)
                : metricLabel;
              if (val !== undefined) finalMetrics[fullKey] = val as string | number;
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
  let finalHeaders: string[] = [];
  const metricLabels = metricConfigs.map(mc => mc.label || `${mc.field} (${mc.aggType})`);

  if (colFields && colFields.length > 0) {
      sortedColHeaders.forEach((h, hIdx) => {
          metricLabels.forEach(ml => {
              if (showVariations && hIdx > 0) {
                  if (metricConfigs.length > 1) {
                      finalHeaders.push(`${h} \x1F ${ml}_DIFF`);
                      finalHeaders.push(`${h} \x1F ${ml}_PCT`);
                  } else {
                      finalHeaders.push(`${h}_DIFF`);
                      finalHeaders.push(`${h}_PCT`);
                  }
              }

              if (metricConfigs.length > 1) {
                  finalHeaders.push(`${h} \x1F ${ml}`);
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
