import { DataRow, FilterRule, TemporalComparisonConfig, TemporalComparisonResult, TemporalComparisonSource, AggregationType } from '../types';
import { parseSmartNumber, prepareFilters, applyPreparedFilters, getCachedNumberFormat, parseDateValue } from '../utils';

export { parseDateValue };

/**
 * Filtre les données par période (mois de début à mois de fin)
 */
export const filterDataByPeriod = (
  data: DataRow[],
  dateColumn: string,
  startMonth: number,
  endMonth: number
): DataRow[] => {
  return data.filter(row => {
    const dateValue = row[dateColumn];
    const date = parseDateValue(dateValue);
    if (!date) return false;

    const month = date.getMonth() + 1; // 0-indexed to 1-indexed

    // Filtrage par période
    if (startMonth <= endMonth) {
      // Période normale (ex: janvier à avril)
      return month >= startMonth && month <= endMonth;
    } else {
      // Période qui traverse l'année (ex: novembre à février)
      return month >= startMonth || month <= endMonth;
    }
  });
};

/**
 * Agrège les données par clé de regroupement pour plusieurs métriques
 * BOLT OPTIMIZATION: Added filterFn for single-pass processing and optimized inner loop.
 */
export const aggregateDataByGroup = (
  data: DataRow[],
  groupByFields: string[],
  metrics: { field: string; aggType: AggregationType | string; label?: string }[],
  filterFn?: (row: DataRow) => boolean
): Map<string, { label: string; metrics: Record<string, number>; details: DataRow[] }> => {
  const groups = new Map<string, { label: string; metrics: Record<string, number>; details: DataRow[] }>();

  // BOLT OPTIMIZATION: Hoist metric labels and aggregation logic out of the loop
  const metricConfigs = metrics.map(m => ({
    field: m.field,
    aggType: m.aggType,
    label: m.label || `${m.field} (${m.aggType})`
  }));
  const numMetrics = metricConfigs.length;
  const numFields = groupByFields.length;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];

    // BOLT OPTIMIZATION: Single-pass filtering
    if (filterFn && !filterFn(row)) continue;

    let groupKey = "";
    let groupLabel = "";
    for (let j = 0; j < numFields; j++) {
      const field = groupByFields[j];
      const val = row[field];
      const sVal = val !== undefined && val !== null ? String(val) : '';
      groupKey += (j === 0 ? "" : "|") + sVal;
      groupLabel += (j === 0 ? "" : "\x1F") + (sVal || '(vide)');
    }

    let group = groups.get(groupKey);
    if (!group) {
      const initialMetrics: Record<string, number> = {};
      for (let j = 0; j < numMetrics; j++) {
        initialMetrics[metricConfigs[j].label] = 0;
      }

      group = {
        label: groupLabel,
        metrics: initialMetrics,
        details: []
      };
      groups.set(groupKey, group);
    }

    group.details.push(row);
    const detailsLen = group.details.length;

    // BOLT OPTIMIZATION: Use standard for loop and avoid redundant string conversions
    for (let j = 0; j < numMetrics; j++) {
       const m = metricConfigs[j];
       const mLabel = m.label;
       const rawValue = row[m.field];

       let value = 0;
       if (typeof rawValue === 'number') {
         value = rawValue;
       } else if (rawValue !== undefined && rawValue !== null && rawValue !== '') {
         // parseSmartNumber already handles non-strings by doing String(val) internally if needed
         value = parseSmartNumber(rawValue);
       }

       const aggType = m.aggType;
       if (aggType === 'sum' || aggType === 'avg') {
         group.metrics[mLabel] += value;
       } else if (aggType === 'count') {
         group.metrics[mLabel] += 1;
       } else if (aggType === 'min') {
         group.metrics[mLabel] = detailsLen === 1 ? value : Math.min(group.metrics[mLabel], value);
       } else if (aggType === 'max') {
         group.metrics[mLabel] = detailsLen === 1 ? value : Math.max(group.metrics[mLabel], value);
       }
    }
  }

  // Finalize averages
  if (groups.size > 0) {
    groups.forEach(group => {
       const detailsLen = group.details.length;
       for (let j = 0; j < numMetrics; j++) {
          const m = metricConfigs[j];
          if (m.aggType === 'avg' && detailsLen > 0) {
             group.metrics[m.label] /= detailsLen;
          }
       }
    });
  }

  return groups;
};

/**
 * Calcule les résultats de comparaison temporelle avec support multi-métriques
 */
export const calculateTemporalComparison = (
  sourceDataMap: Map<string, DataRow[]>,
  config: TemporalComparisonConfig,
  dateColumn: string = 'Date écriture',
  showSubtotals: boolean = false,
  filters: FilterRule[] = []
): { results: TemporalComparisonResult[], colTotals: { [sourceId: string]: { [metricLabel: string]: number } } } => {
  const { sources, referenceSourceId, periodFilter, groupByFields, valueField, aggType, metrics: configMetrics } = config;

  // Use configMetrics if available, otherwise fallback to single metric (backward compatibility)
  const metrics = (configMetrics && configMetrics.length > 0)
     ? configMetrics
     : (valueField ? [{ field: valueField, aggType: aggType || 'sum' }] : []);

  // Préparer les filtres une seule fois
  const preparedFilters = prepareFilters(filters);

  console.log('🔍 [calculateTemporalComparison] START', {
    dateColumn,
    startMonth: periodFilter.startMonth,
    endMonth: periodFilter.endMonth,
    numSources: sources.length
  });

  // Filtrer et agréger chaque source
  const aggregatedSources = new Map<string, Map<string, { label: string; metrics: Record<string, number>; details: DataRow[] }>>();

  sources.forEach(source => {
    const sourceData = sourceDataMap.get(source.id);
    if (!sourceData || sourceData.length === 0) {
      aggregatedSources.set(source.id, new Map());
      return;
    }

    // BOLT OPTIMIZATION: Combine period filter and prepared filters into a single-pass predicate
    const startMonth = periodFilter.startMonth;
    const endMonth = periodFilter.endMonth;

    let totalProcessed = 0;
    let includedCount = 0;
    let exclusionReasons = { noDate: 0, outOfPeriod: 0, filtered: 0 };

    const combinedFilter = (row: DataRow) => {
      totalProcessed++;
      // 1. Period Filter
      const dateValue = row[dateColumn];
      const date = parseDateValue(dateValue);

      if (!date) {
        exclusionReasons.noDate++;
        return false;
      }

      const month = date.getMonth() + 1;
      const inPeriod = startMonth <= endMonth
        ? (month >= startMonth && month <= endMonth)
        : (month >= startMonth || month <= endMonth);

      if (!inPeriod) {
        exclusionReasons.outOfPeriod++;
        return false;
      }

      // 2. Prepared Filters
      const passesFilters = applyPreparedFilters(row, preparedFilters);
      if (!passesFilters) {
        exclusionReasons.filtered++;
        return false;
      }

      includedCount++;
      if (includedCount <= 5) {
        console.log(`✅ [Source: ${source.label}] Included row sample:`, {
          project: row[groupByFields[0]],
          filterDate: row[dateColumn],
          metricValues: metrics.map(m => ({ field: m.field, val: row[m.field] }))
        });
      }
      return true;
    };

    // BOLT OPTIMIZATION: Use single-pass aggregation with integrated filtering
    const aggregated = aggregateDataByGroup(sourceData, groupByFields, metrics, combinedFilter);
    aggregatedSources.set(source.id, aggregated);

    console.log(`📊 [Source: ${source.label}] Filter stats:`, {
      total: totalProcessed,
      included: includedCount,
      excluded: totalProcessed - includedCount,
      reasons: exclusionReasons
    });

    if (totalProcessed > 0 && includedCount === 0) {
      console.warn(`⚠️ [Source: ${source.label}] NO ROWS PASSED THE FILTERS.`, {
        total: totalProcessed,
        dateColumn,
        sampleValue: sourceData[0]?.[dateColumn],
        reasons: exclusionReasons
      });
    }
  });

  const allGroupKeys = new Set<string>();
  aggregatedSources.forEach(sourceAgg => {
    sourceAgg.forEach((_, key) => allGroupKeys.add(key));
  });

  const results: TemporalComparisonResult[] = [];
  const colTotals: { [sourceId: string]: { [metricLabel: string]: number } } = {};

  sources.forEach(s => {
     colTotals[s.id] = {};
     metrics.forEach(m => {
        const mLabel = m.label || `${m.field} (${m.aggType})`;
        colTotals[s.id][mLabel] = 0;
     });
  });

  allGroupKeys.forEach(groupKey => {
    const values: { [sourceId: string]: { [metricLabel: string]: number } } = {};
    const deltas: { [sourceId: string]: { [metricLabel: string]: { value: number; percentage: number } } } = {};
    let groupLabel = '';
    const details: { [sourceId: string]: DataRow[] } = {};

    sources.forEach(source => {
      const sourceAgg = aggregatedSources.get(source.id);
      const group = sourceAgg?.get(groupKey);

      values[source.id] = {};
      deltas[source.id] = {};
      details[source.id] = group?.details || [];

      if (group && !groupLabel) groupLabel = group.label;

      metrics.forEach(m => {
        const mLabel = m.label || `${m.field} (${m.aggType})`;
        const val = group ? (group.metrics[mLabel] || 0) : 0;
        values[source.id][mLabel] = val;

        // Sum for column totals
        if (m.aggType === 'sum' || m.aggType === 'count' || m.aggType === 'avg') {
           colTotals[source.id][mLabel] += val;
        } else if (m.aggType === 'min') {
           colTotals[source.id][mLabel] = (colTotals[source.id][mLabel] === 0 && results.length === 0) ? val : Math.min(colTotals[source.id][mLabel], val);
        } else if (m.aggType === 'max') {
           colTotals[source.id][mLabel] = (colTotals[source.id][mLabel] === 0 && results.length === 0) ? val : Math.max(colTotals[source.id][mLabel], val);
        }
      });
    });

    // Calculer les deltas
    sources.forEach(source => {
      metrics.forEach(m => {
        const mLabel = m.label || `${m.field} (${m.aggType})`;
        const referenceValue = values[referenceSourceId][mLabel] || 0;

        if (source.id === referenceSourceId) {
          deltas[source.id][mLabel] = { value: 0, percentage: 0 };
        } else {
          const sourceValue = values[source.id][mLabel] || 0;
          const deltaValue = sourceValue - referenceValue;
          const deltaPercentage = referenceValue !== 0
            ? (deltaValue / referenceValue) * 100
            : (sourceValue !== 0 ? 100 : 0);

          deltas[source.id][mLabel] = {
            value: deltaValue,
            percentage: deltaPercentage
          };
        }
      });
    });

    results.push({ groupKey, groupLabel, values, deltas, details });
  });

  // Finalize averages for totals
  sources.forEach(source => {
     metrics.forEach(m => {
        if (m.aggType === 'avg' && results.length > 0) {
           const mLabel = m.label || `${m.field} (${m.aggType})`;
           colTotals[source.id][mLabel] = colTotals[source.id][mLabel] / results.length;
        }
     });
  });

  // Trier les résultats
  const sortBy = config.sortBy || 'label';
  const sortOrder = config.sortOrder || 'asc';

  results.sort((a, b) => {
    if (sortBy === 'label') {
      return sortOrder === 'asc' ? a.groupLabel.localeCompare(b.groupLabel) : b.groupLabel.localeCompare(a.groupLabel);
    } else {
      // Logic for sorting by value (needs to handle specific metric if possible, defaulting to first metric)
      if (metrics.length === 0) return 0;
      const firstMetricLabel = metrics[0].label || `${metrics[0].field} (${metrics[0].aggType})`;
      const valA = a.values[sortBy]?.[firstMetricLabel] || 0;
      const valB = b.values[sortBy]?.[firstMetricLabel] || 0;
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    }
  });

  // Générer les sous-totaux
  if (showSubtotals && groupByFields.length > 1) {
    const resultsWithSubtotals: TemporalComparisonResult[] = [];
    const subtotalMap = new Map<string, Map<string, Record<string, number[]>>>();

    results.forEach(result => {
      const groupValues = result.groupLabel.split('\x1F');

      for (let level = 0; level < groupByFields.length - 1; level++) {
        const subtotalKey = groupValues.slice(0, level + 1).join('\x1F');
        if (!subtotalMap.has(subtotalKey)) subtotalMap.set(subtotalKey, new Map());

        const subtotalData = subtotalMap.get(subtotalKey)!;

        sources.forEach(source => {
          if (!subtotalData.has(source.id)) subtotalData.set(source.id, {});
          const sourceSubtotals = subtotalData.get(source.id)!;

          metrics.forEach(m => {
             const mLabel = m.label || `${m.field} (${m.aggType})`;
             if (!sourceSubtotals[mLabel]) sourceSubtotals[mLabel] = [];
             sourceSubtotals[mLabel].push(result.values[source.id][mLabel] || 0);
          });
        });
      }
    });

    const processed = new Set<string>();

    results.forEach(result => {
      const groupValues = result.groupLabel.split('\x1F');

      for (let level = 0; level < groupByFields.length - 1; level++) {
        const subtotalKey = groupValues.slice(0, level + 1).join('\x1F');

        if (!processed.has(subtotalKey)) {
          processed.add(subtotalKey);

          const subtotalData = subtotalMap.get(subtotalKey)!;
          const subtotalValues: { [sourceId: string]: { [mLabel: string]: number } } = {};
          const subtotalDeltas: { [sourceId: string]: { [mLabel: string]: { value: number; percentage: number } } } = {};

          sources.forEach(source => {
            subtotalValues[source.id] = {};
            subtotalDeltas[source.id] = {};
            const sourceSubtotals = subtotalData.get(source.id)!;

            metrics.forEach(m => {
               const mLabel = m.label || `${m.field} (${m.aggType})`;
               const vals = sourceSubtotals[mLabel] || [];
               subtotalValues[source.id][mLabel] = vals.reduce((sum, val) => sum + val, 0);
            });
          });

          // Deltas for subtotal
          sources.forEach(source => {
            metrics.forEach(m => {
               const mLabel = m.label || `${m.field} (${m.aggType})`;
               const referenceValue = subtotalValues[referenceSourceId][mLabel] || 0;

               if (source.id === referenceSourceId) {
                 subtotalDeltas[source.id][mLabel] = { value: 0, percentage: 0 };
               } else {
                 const sourceValue = subtotalValues[source.id][mLabel] || 0;
                 const deltaValue = sourceValue - referenceValue;
                 const deltaPercentage = referenceValue !== 0 ? (deltaValue / referenceValue) * 100 : (sourceValue !== 0 ? 100 : 0);
                 subtotalDeltas[source.id][mLabel] = { value: deltaValue, percentage: deltaPercentage };
               }
            });
          });

          resultsWithSubtotals.push({
            groupKey: `subtotal_${subtotalKey}`,
            groupLabel: subtotalKey,
            values: subtotalValues,
            deltas: subtotalDeltas,
            isSubtotal: true,
            subtotalLevel: level
          });
        }
      }
      resultsWithSubtotals.push(result);
    });

    return { results: resultsWithSubtotals, colTotals };
  }

  return { results, colTotals };
};

/**
 * Formatte un nombre en valeur monétaire
 */
export const formatCurrency = (value: number): string => {
  // BOLT OPTIMIZATION: Reuse Intl.NumberFormat instances via global cache
  return getCachedNumberFormat({
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

/**
 * Formatte un pourcentage
 */
export const formatPercentage = (value: number): string => {
  // BOLT OPTIMIZATION: Reuse Intl.NumberFormat instances via global cache
  return getCachedNumberFormat({
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(value / 100);
};

/**
 * Détecte la colonne de date dans un dataset
 */
export const detectDateColumn = (headers: string[]): string | undefined => {
  const lowerHeaders = headers.map(h => h.toLowerCase());

  // Priorité absolue aux champs métier clés (exact match ou début de chaîne)
  const businessPatterns = [
    'date de lancement',
    'date lancement',
    'lancement',
    'démarrage',
    'demarrage',
    'date de début',
    'date debut',
    'date de fin',
    'date fin',
    'échéance',
    'echeance',
    'date de présentation',
    'date presentation',
    'date de signature',
    'date signature'
  ];

  for (const pattern of businessPatterns) {
    const index = lowerHeaders.findIndex(h => h === pattern || h.startsWith(pattern));
    if (index !== -1) return headers[index];
  }

  // Second passage : recherche par inclusion pour les champs métier
  for (const pattern of businessPatterns) {
    const index = lowerHeaders.findIndex(h => h.includes(pattern));
    if (index !== -1) return headers[index];
  }

  // Troisième passage : termes génériques
  const genericPatterns = [
    'date transaction',
    'transaction date',
    'date de création',
    'date creation',
    'date',
    'date écriture',
    'date_ecriture',
    'datecriture',
    'date ecrit',
    'ecriture'
  ];

  for (const pattern of genericPatterns) {
    const index = lowerHeaders.findIndex(h => h.includes(pattern));
    if (index !== -1) return headers[index];
  }

  return undefined;
};

/**
 * Extrait l'année d'une date
 */
export const extractYearFromDate = (dateValue: any): number | undefined => {
  const date = parseDateValue(dateValue);
  if (!date) return undefined;
  return date.getFullYear();
};
