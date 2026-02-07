import {
  DataRow,
  FilterRule,
  TemporalComparisonConfig,
  TemporalComparisonResult,
  TemporalComparisonSource
} from '../types';
import {
  parseSmartNumber,
  prepareFilters,
  applyPreparedFilters,
  getCachedNumberFormat
} from '../utils';

// BOLT OPTIMIZATION: Global cache for date parsing to avoid redundant parsing in tight loops
const DATE_CACHE = new Map<any, Date | null>();
const MAX_DATE_CACHE_SIZE = 10000;

/**
 * Parse une date avec support du format français DD/MM/YYYY
 */
export const parseDateValue = (dateValue: any): Date | null => {
  if (!dateValue) return null;

  // BOLT OPTIMIZATION: Return cached result if available
  const cached = DATE_CACHE.get(dateValue);
  if (cached !== undefined) return cached;

  let date: Date;

  if (typeof dateValue === 'number') {
    // Timestamp
    date = new Date(dateValue);
  } else if (typeof dateValue === 'string') {
    // Format string (ISO, DD/MM/YYYY, etc.)
    if (dateValue.includes('/')) {
      const parts = dateValue.split('/');
      if (parts.length === 3) {
        const part1 = parseInt(parts[0]);
        const part2 = parseInt(parts[1]);
        const part3 = parseInt(parts[2]);

        // Détecter le format : si part1 > 12, c'est forcément DD/MM/YYYY
        if (part1 > 12) {
          // Format DD/MM/YYYY (jour > 12)
          const day = part1;
          const month = part2;
          const year = part3 < 100 ? 2000 + part3 : part3;
          date = new Date(year, month - 1, day);
        } else if (part2 > 12) {
          // Format MM/DD/YYYY (mois > 12, donc c'est le jour)
          const month = part1;
          const day = part2;
          const year = part3 < 100 ? 2000 + part3 : part3;
          date = new Date(year, month - 1, day);
        } else {
          // Ambigu : on privilégie le format français DD/MM/YYYY
          const day = part1;
          const month = part2;
          const year = part3 < 100 ? 2000 + part3 : part3;
          date = new Date(year, month - 1, day);
        }

        // Vérifier que la date est valide
        if (isNaN(date.getTime())) {
          date = new Date(dateValue);
        }
      } else {
        date = new Date(dateValue);
      }
    } else {
      date = new Date(dateValue);
    }
  } else if (dateValue instanceof Date) {
    date = dateValue;
  } else {
    return null;
  }

  if (isNaN(date.getTime())) {
    if (DATE_CACHE.size < MAX_DATE_CACHE_SIZE) DATE_CACHE.set(dateValue, null);
    return null;
  }

  if (DATE_CACHE.size < MAX_DATE_CACHE_SIZE) DATE_CACHE.set(dateValue, date);
  return date;
};

/**
 * Filtre les données par période (mois de début à mois de fin)
 */
export const filterDataByPeriod = (
  data: DataRow[],
  dateColumn: string,
  startMonth: number,
  endMonth: number
): DataRow[] => {
  return data.filter((row) => {
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
 */
export const aggregateDataByGroup = (
  data: DataRow[],
  groupByFields: string[],
  metrics: { field: string; aggType: string; label?: string }[]
): Map<string, { label: string; metrics: Record<string, number>; details: DataRow[] }> => {
  const groups = new Map<
    string,
    { label: string; metrics: Record<string, number>; details: DataRow[] }
  >();

  for (let i = 0; i < data.length; i++) {
    const row = data[i];

    let groupKey = '';
    let groupLabel = '';
    for (let j = 0; j < groupByFields.length; j++) {
      const field = groupByFields[j];
      const val = row[field];
      const sVal = val !== undefined && val !== null ? String(val) : '';
      groupKey += (j === 0 ? '' : '|') + sVal;
      groupLabel += (j === 0 ? '' : '\x1F') + (sVal || '(vide)');
    }

    if (!groups.has(groupKey)) {
      const initialMetrics: Record<string, number> = {};
      metrics.forEach((m) => {
        const mLabel = m.label || `${m.field} (${m.aggType})`;
        initialMetrics[mLabel] = 0;
      });

      groups.set(groupKey, {
        label: groupLabel,
        metrics: initialMetrics,
        details: []
      });
    }

    const group = groups.get(groupKey)!;
    group.details.push(row);

    metrics.forEach((m) => {
      const mLabel = m.label || `${m.field} (${m.aggType})`;
      const rawValue = row[m.field];
      let value = 0;

      if (typeof rawValue === 'number') {
        value = rawValue;
      } else if (rawValue !== undefined && rawValue !== null && rawValue !== '') {
        value = parseSmartNumber(String(rawValue));
      }

      switch (m.aggType) {
        case 'sum':
          group.metrics[mLabel] += value;
          break;
        case 'count':
          group.metrics[mLabel] += 1;
          break;
        case 'min':
          group.metrics[mLabel] =
            group.details.length === 1 ? value : Math.min(group.metrics[mLabel], value);
          break;
        case 'max':
          group.metrics[mLabel] =
            group.details.length === 1 ? value : Math.max(group.metrics[mLabel], value);
          break;
        case 'avg':
          group.metrics[mLabel] += value;
          break;
      }
    });
  }

  // Finalize averages
  groups.forEach((group) => {
    metrics.forEach((m) => {
      if (m.aggType === 'avg') {
        const mLabel = m.label || `${m.field} (${m.aggType})`;
        group.metrics[mLabel] = group.metrics[mLabel] / group.details.length;
      }
    });
  });

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
): {
  results: TemporalComparisonResult[];
  colTotals: { [sourceId: string]: { [metricLabel: string]: number } };
} => {
  const {
    sources,
    referenceSourceId,
    periodFilter,
    groupByFields,
    valueField,
    aggType,
    metrics: configMetrics
  } = config;

  // Use configMetrics if available, otherwise fallback to single metric (backward compatibility)
  const metrics =
    configMetrics && configMetrics.length > 0
      ? configMetrics
      : [{ field: valueField, aggType: aggType || 'sum' }];

  // Préparer les filtres une seule fois
  const preparedFilters = prepareFilters(filters);

  // Filtrer et agréger chaque source
  const aggregatedSources = new Map<
    string,
    Map<string, { label: string; metrics: Record<string, number>; details: DataRow[] }>
  >();

  sources.forEach((source) => {
    const sourceData = sourceDataMap.get(source.id);
    if (!sourceData || sourceData.length === 0) {
      aggregatedSources.set(source.id, new Map());
      return;
    }

    const filteredData = filterDataByPeriod(
      sourceData,
      dateColumn,
      periodFilter.startMonth,
      periodFilter.endMonth
    ).filter((row) => applyPreparedFilters(row, preparedFilters));

    const aggregated = aggregateDataByGroup(filteredData, groupByFields, metrics);
    aggregatedSources.set(source.id, aggregated);
  });

  const allGroupKeys = new Set<string>();
  aggregatedSources.forEach((sourceAgg) => {
    sourceAgg.forEach((_, key) => allGroupKeys.add(key));
  });

  const results: TemporalComparisonResult[] = [];
  const colTotals: { [sourceId: string]: { [metricLabel: string]: number } } = {};

  sources.forEach((s) => {
    colTotals[s.id] = {};
    metrics.forEach((m) => {
      const mLabel = m.label || `${m.field} (${m.aggType})`;
      colTotals[s.id][mLabel] = 0;
    });
  });

  allGroupKeys.forEach((groupKey) => {
    const values: { [sourceId: string]: { [metricLabel: string]: number } } = {};
    const deltas: {
      [sourceId: string]: { [metricLabel: string]: { value: number; percentage: number } };
    } = {};
    let groupLabel = '';
    const details: { [sourceId: string]: DataRow[] } = {};

    sources.forEach((source) => {
      const sourceAgg = aggregatedSources.get(source.id);
      const group = sourceAgg?.get(groupKey);

      values[source.id] = {};
      deltas[source.id] = {};
      details[source.id] = group?.details || [];

      metrics.forEach((m) => {
        const mLabel = m.label || `${m.field} (${m.aggType})`;
        const val = group ? group.metrics[mLabel] || 0 : 0;
        values[source.id][mLabel] = val;

        if (group && !groupLabel) groupLabel = group.label;

        // Sum for column totals
        if (m.aggType === 'sum' || m.aggType === 'count' || m.aggType === 'avg') {
          colTotals[source.id][mLabel] += val;
        } else if (m.aggType === 'min') {
          colTotals[source.id][mLabel] =
            colTotals[source.id][mLabel] === 0 && results.length === 0
              ? val
              : Math.min(colTotals[source.id][mLabel], val);
        } else if (m.aggType === 'max') {
          colTotals[source.id][mLabel] =
            colTotals[source.id][mLabel] === 0 && results.length === 0
              ? val
              : Math.max(colTotals[source.id][mLabel], val);
        }
      });
    });

    // Calculer les deltas
    sources.forEach((source) => {
      metrics.forEach((m) => {
        const mLabel = m.label || `${m.field} (${m.aggType})`;
        const referenceValue = values[referenceSourceId][mLabel] || 0;

        if (source.id === referenceSourceId) {
          deltas[source.id][mLabel] = { value: 0, percentage: 0 };
        } else {
          const sourceValue = values[source.id][mLabel] || 0;
          const deltaValue = sourceValue - referenceValue;
          const deltaPercentage =
            referenceValue !== 0
              ? (deltaValue / referenceValue) * 100
              : sourceValue !== 0
                ? 100
                : 0;

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
  sources.forEach((source) => {
    metrics.forEach((m) => {
      if (m.aggType === 'avg' && results.length > 0) {
        const mLabel = m.label || `${m.field} (${m.aggType})`;
        colTotals[source.id][mLabel] = colTotals[source.id][mLabel] / results.length;
      }
    });
  });

  // Trier les résultats
  const sortBy = (config as any).sortBy || 'label';
  const sortOrder = (config as any).sortOrder || 'asc';

  results.sort((a, b) => {
    if (sortBy === 'label') {
      return sortOrder === 'asc'
        ? a.groupLabel.localeCompare(b.groupLabel)
        : b.groupLabel.localeCompare(a.groupLabel);
    } else {
      // Logic for sorting by value (needs to handle specific metric if possible, defaulting to first metric)
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

    results.forEach((result) => {
      const groupValues = result.groupLabel.split('\x1F');

      for (let level = 0; level < groupByFields.length - 1; level++) {
        const subtotalKey = groupValues.slice(0, level + 1).join('\x1F');
        if (!subtotalMap.has(subtotalKey)) subtotalMap.set(subtotalKey, new Map());

        const subtotalData = subtotalMap.get(subtotalKey)!;

        sources.forEach((source) => {
          if (!subtotalData.has(source.id)) subtotalData.set(source.id, {});
          const sourceSubtotals = subtotalData.get(source.id)!;

          metrics.forEach((m) => {
            const mLabel = m.label || `${m.field} (${m.aggType})`;
            if (!sourceSubtotals[mLabel]) sourceSubtotals[mLabel] = [];
            sourceSubtotals[mLabel].push(result.values[source.id][mLabel] || 0);
          });
        });
      }
    });

    const processed = new Set<string>();

    results.forEach((result) => {
      const groupValues = result.groupLabel.split('\x1F');

      for (let level = 0; level < groupByFields.length - 1; level++) {
        const subtotalKey = groupValues.slice(0, level + 1).join('\x1F');

        if (!processed.has(subtotalKey)) {
          processed.add(subtotalKey);

          const subtotalData = subtotalMap.get(subtotalKey)!;
          const subtotalValues: { [sourceId: string]: { [mLabel: string]: number } } = {};
          const subtotalDeltas: {
            [sourceId: string]: { [mLabel: string]: { value: number; percentage: number } };
          } = {};

          sources.forEach((source) => {
            subtotalValues[source.id] = {};
            subtotalDeltas[source.id] = {};
            const sourceSubtotals = subtotalData.get(source.id)!;

            metrics.forEach((m) => {
              const mLabel = m.label || `${m.field} (${m.aggType})`;
              const vals = sourceSubtotals[mLabel] || [];
              subtotalValues[source.id][mLabel] = vals.reduce((sum, val) => sum + val, 0);
            });
          });

          // Deltas for subtotal
          sources.forEach((source) => {
            metrics.forEach((m) => {
              const mLabel = m.label || `${m.field} (${m.aggType})`;
              const referenceValue = subtotalValues[referenceSourceId][mLabel] || 0;

              if (source.id === referenceSourceId) {
                subtotalDeltas[source.id][mLabel] = { value: 0, percentage: 0 };
              } else {
                const sourceValue = subtotalValues[source.id][mLabel] || 0;
                const deltaValue = sourceValue - referenceValue;
                const deltaPercentage =
                  referenceValue !== 0
                    ? (deltaValue / referenceValue) * 100
                    : sourceValue !== 0
                      ? 100
                      : 0;
                subtotalDeltas[source.id][mLabel] = {
                  value: deltaValue,
                  percentage: deltaPercentage
                };
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
  const lowerHeaders = headers.map((h) => h.toLowerCase());

  const datePatterns = [
    'date écriture',
    'date',
    'date_ecriture',
    'datecriture',
    'date ecrit',
    'ecriture',
    'date transaction',
    'transaction date'
  ];

  for (const pattern of datePatterns) {
    const index = lowerHeaders.findIndex((h) => h.includes(pattern));
    if (index !== -1) {
      return headers[index];
    }
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
