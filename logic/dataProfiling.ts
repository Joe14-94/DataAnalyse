import { parseSmartNumber } from '../utils/numberUtils';
import { getRowValue } from '../utils/dataUtils';

export interface ColumnProfile {
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'mixed';
  completeness: number; // 0-1
  cardinality: number; // count of unique values
  uniqueRatio: number; // 0-1
  stats: {
    min?: number | string;
    max?: number | string;
    mean?: number;
    median?: number;
    stdDev?: number;
    minLength?: number;
    maxLength?: number;
    avgLength?: number;
  };
  outliers?: number[];
  distribution?: { value: string | number; count: number }[];
}

export interface DatasetProfile {
  rowCount: number;
  columnCount: number;
  qualityScore: number; // 0-100
  columns: ColumnProfile[];
  duplicatesCount: number;
}

/**
 * Profiles a single column of data
 */
export const profileColumn = (name: string, values: unknown[]): ColumnProfile => {
  const total = values.length;
  if (total === 0) {
    return { name, type: 'text', completeness: 0, cardinality: 0, uniqueRatio: 0, stats: {} };
  }

  const nonNullValues = values.filter(v => v !== null && v !== undefined && String(v).trim() !== '' && String(v) !== '-' && String(v) !== '(Vide)');
  const completeness = nonNullValues.length / total;

  // Type Detection
  const types = nonNullValues.map(v => {
    const s = String(v).trim();
    if (['oui', 'non', 'vrai', 'faux', 'true', 'false', 'yes', 'no'].includes(s.toLowerCase())) return 'boolean';
    if (!isNaN(Date.parse(s)) && (s.includes('/') || s.includes('-'))) return 'date';
    if (!isNaN(parseFloat(s.replace(',', '.')))) return 'number';
    return 'text';
  });

  const typeCounts = types.reduce((acc, t) => {
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  let detectedType: ColumnProfile['type'] = 'text';
  const dominantType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];
  if (dominantType && dominantType[1] / nonNullValues.length > 0.8) {
    detectedType = dominantType[0] as ColumnProfile['type'];
  } else if (Object.keys(typeCounts).length > 1) {
    detectedType = 'mixed';
  }

  // Cardinality
  const uniqueValues = new Set(nonNullValues);
  const cardinality = uniqueValues.size;
  const uniqueRatio = cardinality / nonNullValues.length;

  // Stats
  const stats: ColumnProfile['stats'] = {};

  if (detectedType === 'number') {
    const nums = nonNullValues.map(v => parseSmartNumber(v)).filter(n => !isNaN(n));
    if (nums.length > 0) {
      nums.sort((a, b) => a - b);
      stats.min = nums[0];
      stats.max = nums[nums.length - 1];
      stats.mean = nums.reduce((a, b) => a + b, 0) / nums.length;
      stats.median = nums[Math.floor(nums.length / 2)];

      const mean = stats.mean;
      stats.stdDev = Math.sqrt(nums.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / nums.length);
    }
  } else if (detectedType === 'text') {
    const lengths = nonNullValues.map(v => String(v).length);
    stats.minLength = Math.min(...lengths);
    stats.maxLength = Math.max(...lengths);
    stats.avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  }

  // Distribution (Top 10)
  const distMap = nonNullValues.reduce((acc, v) => {
    acc[v] = (acc[v] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const distribution = Object.entries(distMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([value, count]) => ({ value, count }));

  return {
    name,
    type: detectedType,
    completeness,
    cardinality,
    uniqueRatio,
    stats,
    distribution
  };
};

/**
 * Profiles a whole dataset
 */
export const profileDataset = (data: Record<string, any>[]): DatasetProfile => {
  if (data.length === 0) {
    return { rowCount: 0, columnCount: 0, qualityScore: 0, columns: [], duplicatesCount: 0 };
  }

  const keys = Object.keys(data[0]).filter(k => !k.startsWith('_'));
  const columns = keys.map(k => profileColumn(k, data.map(r => r[k])));

  // Global Quality Score (weighted avg of completeness and type consistency)
  const avgCompleteness = columns.reduce((a, b) => a + b.completeness, 0) / columns.length;
  const typeInconsistencyPenalty = columns.filter(c => c.type === 'mixed').length * 5;
  const qualityScore = Math.max(0, Math.min(100, (avgCompleteness * 100) - typeInconsistencyPenalty));

  // Duplicates detection
  const duplicatesCount = detectDuplicates(data, keys);

  return {
    rowCount: data.length,
    columnCount: keys.length,
    qualityScore,
    columns,
    duplicatesCount
  };
};

/**
 * Detects outliers in a numeric array using Interquartile Range (IQR)
 */
export const detectOutliers = (values: number[]): number[] => {
  if (values.length < 4) return [];

  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;

  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  return values.filter(v => v < lowerBound || v > upperBound);
};

/**
 * Detects duplicate rows in a dataset
 */
export const detectDuplicates = (data: Record<string, any>[], keys: string[]): number => {
  const seen = new Set();
  let duplicates = 0;

  for (const row of data) {
    const key = keys.map(k => String(getRowValue(row, k))).join('\x1F');
    if (seen.has(key)) {
      duplicates++;
    } else {
      seen.add(key);
    }
  }

  return duplicates;
};
