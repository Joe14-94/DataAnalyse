import { DataRow, TemporalComparisonConfig, TemporalComparisonResult, TemporalComparisonSource } from '../types';
import { parseSmartNumber } from '../utils';

/**
 * Parse une date avec support du format français DD/MM/YYYY
 */
const parseDateValue = (dateValue: any): Date | null => {
  if (!dateValue) return null;

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

  if (isNaN(date.getTime())) return null;
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

  // Debug counters
  let totalRows = 0;
  let undefinedValues = 0;
  let nullValues = 0;
  let emptyValues = 0;
  let parsedValues = 0;
  let zeroValues = 0;
  let nonZeroValues = 0;
  const sampleRawValues: any[] = [];

  data.forEach(row => {
    totalRows++;

    // Créer la clé de regroupement
    const groupKey = groupByFields.map(field => row[field] || '').join('|');
    const groupLabel = groupByFields.map(field => row[field] || '(vide)').join(' - ');

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

    // Collect sample raw values for debugging
    if (sampleRawValues.length < 10) {
      sampleRawValues.push(rawValue);
    }

    // Track undefined/null/empty
    if (rawValue === undefined) {
      undefinedValues++;
    } else if (rawValue === null) {
      nullValues++;
    } else if (rawValue === '') {
      emptyValues++;
    }

    if (typeof rawValue === 'number') {
      value = rawValue;
      parsedValues++;
      if (value === 0) zeroValues++;
      else nonZeroValues++;
    } else if (rawValue !== undefined && rawValue !== null && rawValue !== '') {
      const strValue = String(rawValue);
      value = parseSmartNumber(strValue);
      parsedValues++;

      if (value === 0) {
        zeroValues++;
      } else {
        nonZeroValues++;
      }
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
  });

  // Finaliser la moyenne si nécessaire
  if (aggType === 'avg') {
    groups.forEach(group => {
      group.value = group.value / group.details.length;
    });
  }

  // Debug: Log statistics
  console.log(`[Temporal Comparison] Aggregation statistics for field "${valueField}":`, {
    totalRows,
    undefinedValues,
    nullValues,
    emptyValues,
    parsedValues,
    zeroValues,
    nonZeroValues,
    sampleRawValues: sampleRawValues.slice(0, 5),
    aggType
  });

  return groups;
};

/**
 * Calcule les résultats de comparaison temporelle
 */
export const calculateTemporalComparison = (
  sourceDataMap: Map<string, DataRow[]>,
  config: TemporalComparisonConfig,
  dateColumn: string = 'Date écriture'
): TemporalComparisonResult[] => {
  const { sources, referenceSourceId, periodFilter, groupByFields, valueField, aggType } = config;

  // Debug: Log configuration
  console.log('[Temporal Comparison] Starting calculation with config:', {
    sources: sources.map(s => s.label),
    groupByFields,
    valueField,
    aggType,
    periodFilter
  });

  // Filtrer et agréger chaque source
  const aggregatedSources = new Map<string, Map<string, { label: string; value: number; details: DataRow[] }>>();

  sources.forEach(source => {
    const sourceData = sourceDataMap.get(source.id);
    if (!sourceData || sourceData.length === 0) {
      console.warn(`[Temporal Comparison] No data for source: ${source.label}`);
      aggregatedSources.set(source.id, new Map());
      return;
    }

    // Debug: Log sample data from this source
    console.log(`[Temporal Comparison] Source "${source.label}" has ${sourceData.length} rows. Sample row:`, sourceData[0]);

    // Filtrer par période
    const filteredData = filterDataByPeriod(
      sourceData,
      dateColumn,
      periodFilter.startMonth,
      periodFilter.endMonth
    );

    // Agréger
    const aggregated = aggregateDataByGroup(filteredData, groupByFields, valueField, aggType);
    aggregatedSources.set(source.id, aggregated);

    // Debug: Log aggregated results for this source
    console.log(`[Temporal Comparison] Source "${source.label}" aggregated:`, {
      groupCount: aggregated.size,
      sampleGroups: Array.from(aggregated.entries()).slice(0, 3).map(([key, group]) => ({
        key,
        label: group.label,
        value: group.value,
        rowCount: group.details.length
      }))
    });
  });

  // Collecter toutes les clés de regroupement uniques
  const allGroupKeys = new Set<string>();
  aggregatedSources.forEach(sourceAgg => {
    sourceAgg.forEach((_, key) => allGroupKeys.add(key));
  });

  // Créer les résultats
  const results: TemporalComparisonResult[] = [];

  allGroupKeys.forEach(groupKey => {
    const values: { [sourceId: string]: number } = {};
    const deltas: { [sourceId: string]: { value: number; percentage: number } } = {};
    let groupLabel = '';
    let details: DataRow[] | undefined;

    // Récupérer les valeurs pour chaque source
    sources.forEach(source => {
      const sourceAgg = aggregatedSources.get(source.id);
      const group = sourceAgg?.get(groupKey);

      if (group) {
        values[source.id] = group.value;
        if (!groupLabel) groupLabel = group.label;
        if (source.id === referenceSourceId) {
          details = group.details;
        }
      } else {
        values[source.id] = 0;
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

  // Trier par label
  results.sort((a, b) => a.groupLabel.localeCompare(b.groupLabel));

  // Debug: Log final results
  console.log('[Temporal Comparison] Final results:', {
    resultCount: results.length,
    sampleResult: results[0],
    allValues: results.map(r => ({ label: r.groupLabel, values: r.values }))
  });

  return results;
};

/**
 * Formatte un nombre en valeur monétaire
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

/**
 * Formatte un pourcentage
 */
export const formatPercentage = (value: number): string => {
  return new Intl.NumberFormat('fr-FR', {
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
