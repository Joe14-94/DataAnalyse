
import { parseSmartNumber, getGroupedLabel, formatNumberValue } from '../utils';
import { FieldConfig, Dataset, FilterRule, PivotJoin, PivotConfig, PivotResult, PivotRow, AggregationType, SortBy, SortOrder, DateGrouping } from '../types';

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

  if (rows.length === 0 || rowFields.length === 0 || activeMetrics.length === 0) return null;

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
    if (preparedFilters.length > 0) {
      let pass = true;
      for (const f of preparedFilters) {
         const rowVal = row[f.field];
         
         if (f.isArrayIn && f.preparedValue instanceof Set) {
             if (f.preparedValue.size > 0 && !f.preparedValue.has(String(rowVal))) {
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
        // Gérer null, undefined ET chaînes vides
        rowKeys[j] = v !== undefined && v !== null && String(v).trim() !== '' ? String(v) : '(Vide)';
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
    } else {
       colHeadersSet.add('ALL');
    }

    // 1.4 Extraction Métriques
    const metricVals = metricConfigs.map(mc => {
        if (mc.aggType === 'count' || mc.aggType === 'list') return 0;
        return parseSmartNumber(row[mc.field], mc.valUnit);
    });

    const rawVals = metricConfigs.map(mc => row[mc.field]);

    optimizedRows.push({
       rowKeys,
       colKey,
       metricVals,
       rawVals
    });
  }

  const sortedColHeaders = Array.from(colHeadersSet).sort();

  // --- PHASE 2 : AGREGATION ---

  const initStats = () => ({
      // Map<colKey, any[]> où any[] contient les valeurs cumulées pour chaque métrique
      colMetrics: new Map<string, any[]>(),
      // any[] contient les totaux de ligne pour chaque métrique
      rowTotalMetrics: metricConfigs.map(mc => (mc.aggType === 'min' ? Infinity : mc.aggType === 'max' ? -Infinity : (mc.aggType === 'list' ? new Set() : 0))) as any[],
      count: 0,
      colCounts: new Map<string, number>()
  });

  const computeGroupStats = (groupRows: OptimizedRow[]): GroupStats => {
      const stats = initStats();

      for (let i = 0; i < groupRows.length; i++) {
          const row = groupRows[i];
          const colKey = row.colKey;

          if (metricConfigs.some(mc => mc.aggType === 'avg')) {
              stats.count++;
          }

          metricConfigs.forEach((mc, mIdx) => {
              const val = mc.aggType === 'count' ? 1 : row.metricVals[mIdx];
              
              // 2.1 Mise à jour Totaux Ligne
              if (mc.aggType === 'sum' || mc.aggType === 'count' || mc.aggType === 'avg') {
                  stats.rowTotalMetrics[mIdx] += val;
              } else if (mc.aggType === 'min') {
                  if (val < stats.rowTotalMetrics[mIdx]) stats.rowTotalMetrics[mIdx] = val;
              } else if (mc.aggType === 'max') {
                  if (val > stats.rowTotalMetrics[mIdx]) stats.rowTotalMetrics[mIdx] = val;
              } else if (mc.aggType === 'list') {
                  if (row.rawVals[mIdx]) stats.rowTotalMetrics[mIdx].add(String(row.rawVals[mIdx]));
              }

              // 2.2 Mise à jour Métriques Colonne
              let colMetricVals = stats.colMetrics.get(colKey);
              if (!colMetricVals) {
                  colMetricVals = metricConfigs.map(m => (m.aggType === 'min' ? Infinity : m.aggType === 'max' ? -Infinity : (m.aggType === 'list' ? new Set() : 0)));
                  stats.colMetrics.set(colKey, colMetricVals);
              }

              if (mc.aggType === 'sum' || mc.aggType === 'count' || mc.aggType === 'avg') {
                  colMetricVals[mIdx] += val;
              } else if (mc.aggType === 'min') {
                  if (val < colMetricVals[mIdx]) colMetricVals[mIdx] = val;
              } else if (mc.aggType === 'max') {
                  if (val > colMetricVals[mIdx]) colMetricVals[mIdx] = val;
              } else if (mc.aggType === 'list') {
                  if (row.rawVals[mIdx]) {
                      colMetricVals[mIdx].add(String(row.rawVals[mIdx]));
                  }
              }
          });

          stats.colCounts.set(colKey, (stats.colCounts.get(colKey) || 0) + 1);
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

      metricConfigs.forEach((mc, mIdx) => {
          let valTotal = stats.rowTotalMetrics[mIdx];

          if (mc.aggType === 'avg') {
             valTotal = stats.count > 0 ? valTotal / stats.count : 0;
          } else if (mc.aggType === 'list') {
             valTotal = formatList(valTotal);
          } else if ((mc.aggType === 'min' || mc.aggType === 'max') && !isFinite(valTotal)) {
             valTotal = 0;
          }

          const metricLabel = mc.label || `${mc.field} (${mc.aggType})`;
          finalTotalMetrics[metricLabel] = valTotal;

          // Use first metric for row-level sorting if needed
          if (mIdx === 0) {
              if (typeof valTotal === 'number') rawRowTotal = valTotal;
              else if (mc.aggType === 'list') rawRowTotal = (stats.rowTotalMetrics[mIdx] as Set<string>).size;
              else rawRowTotal = 0;
          }

          // Column details
          headers.forEach(h => {
              const colMetricVals = stats.colMetrics.get(h);
              let val = colMetricVals ? colMetricVals[mIdx] : undefined;
              const count = stats.colCounts.get(h) || 1;

              if (val !== undefined) {
                  if (mc.aggType === 'avg') val = val / count;
                  else if (mc.aggType === 'list') val = formatList(val);
                  else if ((mc.aggType === 'min' || mc.aggType === 'max') && !isFinite(val)) val = undefined;
              } else {
                  if (mc.aggType === 'list') val = '-';
              }

              const fullKey = colFields.length > 0
                ? (metricConfigs.length > 1 ? `${h} \x1F ${metricLabel}` : h)
                : metricLabel;
              finalMetrics[fullKey] = val;

              if (mIdx === 0) {
                  if (typeof val === 'number') rawMetrics.set(h, val);
                  else if (val instanceof Set) rawMetrics.set(h, val.size);
                  else rawMetrics.set(h, 0);
              }
          });
      });

      // TIME INTELLIGENCE (only for the first metric for now to keep it simple, or apply to all?)
      // Apply to all metrics if variations are enabled
      if (showVariations && colFields && colFields.length > 0) {
          metricConfigs.forEach((mc) => {
             if (!['sum', 'count', 'avg'].includes(mc.aggType)) return;
             const metricLabel = mc.label || `${mc.field} (${mc.aggType})`;

             for (let i = 1; i < headers.length; i++) {
                const h = headers[i];
                const prevH = headers[i-1];

                const currKey = metricConfigs.length > 1 ? `${h} \x1F ${metricLabel}` : h;
                const prevKey = metricConfigs.length > 1 ? `${prevH} \x1F ${metricLabel}` : prevH;

                const currVal = Number(finalMetrics[currKey] || 0);
                const prevVal = Number(finalMetrics[prevKey] || 0);

                const diff = currVal - prevVal;
                let pct = 0;
                if (prevVal !== 0) pct = (diff / Math.abs(prevVal)) * 100;

                if (metricConfigs.length > 1) {
                    finalMetrics[`${h} \x1F ${metricLabel}_DIFF`] = diff;
                    finalMetrics[`${h} \x1F ${metricLabel}_PCT`] = pct;
                } else {
                    finalMetrics[`${h}_DIFF`] = diff;
                    finalMetrics[`${h}_PCT`] = pct;
                }
             }
          });
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
  processLevel(optimizedRows, 0, []);

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
      finalHeaders = metricLabels;
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
