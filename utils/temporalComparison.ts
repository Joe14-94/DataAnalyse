import { DataRow, FilterRule, TemporalComparisonConfig, TemporalComparisonResult, TemporalComparisonSource } from '../types';
import { parseSmartNumber, prepareFilters, applyPreparedFilters, getCachedNumberFormat } from '../utils';

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
 * Agrège les données par clé de regroupement
 */
export const aggregateDataByGroup = (
  data: DataRow[],
  groupByFields: string[],
  valueField: string,
  aggType: 'sum' | 'count' | 'avg' | 'min' | 'max'
): Map<string, { label: string; value: number; details: DataRow[] }> => {
  const groups = new Map<string, { label: string; value: number; details: DataRow[] }>();

  for (let i = 0; i < data.length; i++) {
    const row = data[i];

    // BOLT OPTIMIZATION: Use manual loop instead of map().join() to avoid temporary array allocations
    let groupKey = "";
    let groupLabel = "";
    for (let j = 0; j < groupByFields.length; j++) {
      const field = groupByFields[j];
      const val = row[field];
      const sVal = val !== undefined && val !== null ? String(val) : '';
      groupKey += (j === 0 ? "" : "|") + sVal;
      groupLabel += (j === 0 ? "" : "\x1F") + (sVal || '(vide)');
    }

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        label: groupLabel,
        value: 0,
        details: []
      });
    }

    const group = groups.get(groupKey)!;
    group.details.push(row);

    // Valeur à agréger - utiliser parseSmartNumber pour gérer les formats français
    const rawValue = row[valueField];
    let value = 0;

    if (typeof rawValue === 'number') {
      value = rawValue;
    } else if (rawValue !== undefined && rawValue !== null && rawValue !== '') {
      value = parseSmartNumber(String(rawValue));
    }

    // Calcul selon le type d'agrégation
    switch (aggType) {
      case 'sum':
        group.value += value;
        break;
      case 'count':
        group.value += 1;
        break;
      case 'avg':
        // Calculé après
        group.value += value;
        break;
      case 'min':
        group.value = group.details.length === 1 ? value : Math.min(group.value, value);
        break;
      case 'max':
        group.value = group.details.length === 1 ? value : Math.max(group.value, value);
        break;
    }
  }

  // Finaliser la moyenne si nécessaire
  if (aggType === 'avg') {
    groups.forEach(group => {
      group.value = group.value / group.details.length;
    });
  }

  return groups;
};

/**
 * Calcule les résultats de comparaison temporelle
 */
export const calculateTemporalComparison = (
  sourceDataMap: Map<string, DataRow[]>,
  config: TemporalComparisonConfig,
  dateColumn: string = 'Date écriture',
  showSubtotals: boolean = false,
  filters: FilterRule[] = []
): { results: TemporalComparisonResult[], colTotals: { [sourceId: string]: number } } => {
  const { sources, referenceSourceId, periodFilter, groupByFields, valueField, aggType } = config;

  // Préparer les filtres une seule fois
  const preparedFilters = prepareFilters(filters);

  // Filtrer et agréger chaque source
  const aggregatedSources = new Map<string, Map<string, { label: string; value: number; details: DataRow[] }>>();

  sources.forEach(source => {
    const sourceData = sourceDataMap.get(source.id);
    if (!sourceData || sourceData.length === 0) {
      aggregatedSources.set(source.id, new Map());
      return;
    }

    // Filtrer par période et par filtres personnalisés
    const filteredData = filterDataByPeriod(
      sourceData,
      dateColumn,
      periodFilter.startMonth,
      periodFilter.endMonth
    ).filter(row => applyPreparedFilters(row, preparedFilters));

    // Agréger
    const aggregated = aggregateDataByGroup(filteredData, groupByFields, valueField, aggType);
    aggregatedSources.set(source.id, aggregated);
  });

  // Collecter toutes les clés de regroupement uniques
  const allGroupKeys = new Set<string>();
  aggregatedSources.forEach(sourceAgg => {
    sourceAgg.forEach((_, key) => allGroupKeys.add(key));
  });

  // Créer les résultats
  const results: TemporalComparisonResult[] = [];
  const colTotals: { [sourceId: string]: number } = {};
  sources.forEach(s => { colTotals[s.id] = 0; });

  allGroupKeys.forEach(groupKey => {
    const values: { [sourceId: string]: number } = {};
    const deltas: { [sourceId: string]: { value: number; percentage: number } } = {};
    let groupLabel = '';
    const details: { [sourceId: string]: DataRow[] } = {};

    // Récupérer les valeurs pour chaque source
    sources.forEach(source => {
      const sourceAgg = aggregatedSources.get(source.id);
      const group = sourceAgg?.get(groupKey);

      if (group) {
        values[source.id] = group.value;
        if (!groupLabel) groupLabel = group.label;
        details[source.id] = group.details;

        // Sum for column totals
        if (aggType === 'sum' || aggType === 'count') {
           colTotals[source.id] += group.value;
        } else if (aggType === 'avg') {
           colTotals[source.id] += group.value;
        } else if (aggType === 'min') {
           colTotals[source.id] = (colTotals[source.id] === 0 && results.length === 0) ? group.value : Math.min(colTotals[source.id], group.value);
        } else if (aggType === 'max') {
           colTotals[source.id] = (colTotals[source.id] === 0 && results.length === 0) ? group.value : Math.max(colTotals[source.id], group.value);
        }
      } else {
        values[source.id] = 0;
        details[source.id] = [];
      }
    });

    // Calculer les deltas par rapport à la référence
    const referenceValue = values[referenceSourceId] || 0;

    sources.forEach(source => {
      if (source.id === referenceSourceId) {
        deltas[source.id] = { value: 0, percentage: 0 };
      } else {
        const sourceValue = values[source.id] || 0;
        const deltaValue = sourceValue - referenceValue;
        const deltaPercentage = referenceValue !== 0
          ? (deltaValue / referenceValue) * 100
          : (sourceValue !== 0 ? 100 : 0);

        deltas[source.id] = {
          value: deltaValue,
          percentage: deltaPercentage
        };
      }
    });

    results.push({
      groupKey,
      groupLabel,
      values,
      deltas,
      details
    });
  });

  // Average calculation for totals if needed
  if (aggType === 'avg' && results.length > 0) {
    sources.forEach(source => {
      colTotals[source.id] = colTotals[source.id] / results.length;
    });
  }

  // Trier les résultats
  const sortBy = (config as any).sortBy || 'label';
  const sortOrder = (config as any).sortOrder || 'asc';

  results.sort((a, b) => {
    if (sortBy === 'label') {
      return sortOrder === 'asc' ? a.groupLabel.localeCompare(b.groupLabel) : b.groupLabel.localeCompare(a.groupLabel);
    } else {
      const valA = a.values[sortBy] || 0;
      const valB = b.values[sortBy] || 0;
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    }
  });

  // Générer les sous-totaux si on a plusieurs champs de regroupement ET que showSubtotals est activé
  if (showSubtotals && groupByFields.length > 1) {
    const resultsWithSubtotals: TemporalComparisonResult[] = [];
    const subtotalMap = new Map<string, Map<string, number[]>>();

    // Calculer les sous-totaux pour chaque niveau de groupement
    results.forEach(result => {
      const groupValues = result.groupLabel.split('\x1F');

      // Pour chaque niveau de hiérarchie (sauf le dernier qui est le détail)
      for (let level = 0; level < groupByFields.length - 1; level++) {
        const subtotalKey = groupValues.slice(0, level + 1).join('\x1F');

        if (!subtotalMap.has(subtotalKey)) {
          subtotalMap.set(subtotalKey, new Map());
        }

        const subtotalData = subtotalMap.get(subtotalKey)!;

        // Accumuler les valeurs pour chaque source
        sources.forEach(source => {
          if (!subtotalData.has(source.id)) {
            subtotalData.set(source.id, []);
          }
          subtotalData.get(source.id)!.push(result.values[source.id] || 0);
        });
      }
    });

    // Insérer les résultats avec sous-totaux
    const processed = new Set<string>();

    results.forEach(result => {
      const groupValues = result.groupLabel.split('\x1F');

      // Insérer les sous-totaux des niveaux supérieurs si pas déjà fait
      for (let level = 0; level < groupByFields.length - 1; level++) {
        const subtotalKey = groupValues.slice(0, level + 1).join('\x1F');

        if (!processed.has(subtotalKey)) {
          processed.add(subtotalKey);

          const subtotalData = subtotalMap.get(subtotalKey)!;
          const subtotalValues: { [sourceId: string]: number } = {};
          const subtotalDeltas: { [sourceId: string]: { value: number; percentage: number } } = {};

          // Calculer la somme pour chaque source
          sources.forEach(source => {
            const values = subtotalData.get(source.id) || [];
            subtotalValues[source.id] = values.reduce((sum, val) => sum + val, 0);
          });

          // Calculer les deltas
          const referenceValue = subtotalValues[referenceSourceId] || 0;
          sources.forEach(source => {
            if (source.id === referenceSourceId) {
              subtotalDeltas[source.id] = { value: 0, percentage: 0 };
            } else {
              const sourceValue = subtotalValues[source.id] || 0;
              const deltaValue = sourceValue - referenceValue;
              const deltaPercentage = referenceValue !== 0
                ? (deltaValue / referenceValue) * 100
                : (sourceValue !== 0 ? 100 : 0);

              subtotalDeltas[source.id] = {
                value: deltaValue,
                percentage: deltaPercentage
              };
            }
          });

          // Ajouter le sous-total
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

      // Ajouter la ligne de détail
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
    const index = lowerHeaders.findIndex(h => h.includes(pattern));
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
