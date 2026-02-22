import { DataRow } from '../types/common';
import { FieldConfig } from '../types/dataset';

export interface FieldProfile {
  field: string;
  type: 'number' | 'text' | 'date' | 'boolean' | 'mixed';
  totalCount: number;
  nullCount: number;
  completude: number; // 0-100
  uniqueCount: number;
  cardinalityRatio: number; // uniqueCount / totalCount
  // Numeric stats
  min?: number;
  max?: number;
  avg?: number;
  median?: number;
  stddev?: number;
  distribution?: Array<{ bin: string; count: number }>;
  outliers?: number[];
  // Text stats
  topValues?: Array<{ value: string; count: number; percent: number }>;
  avgLength?: number;
}

export interface DatasetProfile {
  totalRows: number;
  totalFields: number;
  duplicateRowCount: number;
  duplicateRowPercent: number;
  overallCompletude: number; // average completude across all fields
  fields: FieldProfile[];
}

const NULL_VALUES = new Set(['', 'null', 'undefined']);

function isNullValue(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string' && NULL_VALUES.has(v.trim().toLowerCase())) return true;
  return false;
}

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}(T[\d:.Z+-]*)?$/;

export function detectFieldType(values: unknown[], fieldConfig?: FieldConfig): FieldProfile['type'] {
  if (fieldConfig?.type === 'number') return 'number';
  if (fieldConfig?.type === 'date') return 'date';

  const nonNull = values.filter(v => !isNullValue(v)).slice(0, 100);
  if (nonNull.length === 0) return 'text';

  const numericCount = nonNull.filter(v => {
    const n = Number(v);
    return !isNaN(n) && String(v).trim() !== '';
  }).length;

  if (numericCount / nonNull.length > 0.8) return 'number';

  const dateCount = nonNull.filter(v => {
    return typeof v === 'string' && ISO_DATE_REGEX.test(v.trim());
  }).length;

  if (dateCount / nonNull.length > 0.8) return 'date';

  return 'text';
}

export function profileField(field: string, rows: DataRow[], fieldConfig?: FieldConfig): FieldProfile {
  const total = rows.length;
  const values: unknown[] = rows.map(r => r[field]);

  const nullCount = values.filter(isNullValue).length;
  const completude = total === 0 ? 100 : ((total - nullCount) / total) * 100;

  const nonNullValues = values.filter(v => !isNullValue(v));
  const uniqueSet = new Set(nonNullValues.map(v => String(v)));
  const uniqueCount = uniqueSet.size;
  const cardinalityRatio = total === 0 ? 0 : uniqueCount / total;

  const type = detectFieldType(values, fieldConfig);

  const profile: FieldProfile = {
    field,
    type,
    totalCount: total,
    nullCount,
    completude,
    uniqueCount,
    cardinalityRatio,
  };

  if (type === 'number') {
    const nums: number[] = nonNullValues
      .map(v => Number(v))
      .filter(n => !isNaN(n));

    if (nums.length > 0) {
      const sorted = [...nums].sort((a, b) => a - b);
      const min = sorted[0];
      const max = sorted[sorted.length - 1];
      const avg = nums.reduce((s, n) => s + n, 0) / nums.length;

      // Median
      const mid = Math.floor(sorted.length / 2);
      const median = sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];

      // Population stddev
      const variance = nums.reduce((s, n) => s + (n - avg) ** 2, 0) / nums.length;
      const stddev = Math.sqrt(variance);

      // Distribution: 8 equal-width bins
      const distribution: Array<{ bin: string; count: number }> = [];
      if (min === max) {
        distribution.push({ bin: String(min), count: nums.length });
      } else {
        const binWidth = (max - min) / 8;
        for (let i = 0; i < 8; i++) {
          const binMin = min + i * binWidth;
          const binMax = min + (i + 1) * binWidth;
          const label = `${Math.round(binMin)}-${Math.round(binMax)}`;
          const count = nums.filter(n => {
            if (i === 7) return n >= binMin && n <= binMax;
            return n >= binMin && n < binMax;
          }).length;
          distribution.push({ bin: label, count });
        }
      }

      // Outliers: beyond mean ± 3*stddev, up to 5 examples
      const lowerBound = avg - 3 * stddev;
      const upperBound = avg + 3 * stddev;
      const outliers = nums.filter(n => n < lowerBound || n > upperBound).slice(0, 5);

      profile.min = min;
      profile.max = max;
      profile.avg = avg;
      profile.median = median;
      profile.stddev = stddev;
      profile.distribution = distribution;
      profile.outliers = outliers;
    }
  } else if (type === 'text' || type === 'date' || type === 'mixed') {
    // Top values: top 8 most frequent non-null values
    const freq = new Map<string, number>();
    for (const v of nonNullValues) {
      const key = String(v);
      freq.set(key, (freq.get(key) ?? 0) + 1);
    }
    const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    const topValues = sorted.map(([value, count]) => ({
      value,
      count,
      percent: nonNullValues.length === 0 ? 0 : (count / nonNullValues.length) * 100,
    }));

    // avgLength of non-null string values
    const strValues = nonNullValues.filter(v => typeof v === 'string') as string[];
    const avgLength = strValues.length === 0
      ? 0
      : strValues.reduce((s, v) => s + v.length, 0) / strValues.length;

    profile.topValues = topValues;
    profile.avgLength = avgLength;
  }

  return profile;
}

export function countDuplicateRows(rows: DataRow[], keyFields?: string[]): number {
  const counts = new Map<string, number>();

  for (const row of rows) {
    let key: string;
    if (keyFields && keyFields.length > 0) {
      const obj: Record<string, unknown> = {};
      for (const f of keyFields) obj[f] = row[f];
      key = JSON.stringify(obj);
    } else {
      // Exclude the `id` field
      const { id: _id, ...rest } = row;
      key = JSON.stringify(rest);
    }
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  let duplicates = 0;
  for (const count of counts.values()) {
    if (count >= 2) duplicates += count - 1;
  }
  return duplicates;
}

export function profileDataset(
  rows: DataRow[],
  fields: string[],
  fieldConfigs?: Record<string, FieldConfig>
): DatasetProfile {
  const fieldProfiles = fields.map(f =>
    profileField(f, rows, fieldConfigs?.[f])
  );

  const duplicateRowCount = countDuplicateRows(rows);
  const duplicateRowPercent = rows.length === 0 ? 0 : (duplicateRowCount / rows.length) * 100;

  const overallCompletude = fieldProfiles.length === 0
    ? 100
    : fieldProfiles.reduce((s, fp) => s + fp.completude, 0) / fieldProfiles.length;

  return {
    totalRows: rows.length,
    totalFields: fields.length,
    duplicateRowCount,
    duplicateRowPercent,
    overallCompletude,
    fields: fieldProfiles,
  };
}
