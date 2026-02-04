import { describe, it, expect } from 'vitest';
import { parseDateValue, filterDataByPeriod, aggregateDataByGroup, calculateTemporalComparison, formatCurrency, formatPercentage } from '../utils/temporalComparison';
import { DataRow } from '../types';

describe('utils/temporalComparison.ts', () => {
  describe('parseDateValue', () => {
    it('should parse ISO date strings', () => {
      const date = parseDateValue('2025-01-15');
      expect(date).not.toBeNull();
      expect(date?.getFullYear()).toBe(2025);
      expect(date?.getMonth()).toBe(0); // January
      expect(date?.getDate()).toBe(15);
    });

    it('should parse French date strings DD/MM/YYYY', () => {
      const date = parseDateValue('15/01/2025');
      expect(date).not.toBeNull();
      expect(date?.getFullYear()).toBe(2025);
      expect(date?.getMonth()).toBe(0);
      expect(date?.getDate()).toBe(15);
    });

    it('should parse timestamps', () => {
      const ts = new Date(2025, 0, 15).getTime();
      const date = parseDateValue(ts);
      expect(date?.getFullYear()).toBe(2025);
    });

    it('should return null for invalid dates', () => {
      expect(parseDateValue('invalid')).toBeNull();
      expect(parseDateValue('')).toBeNull();
      expect(parseDateValue(null)).toBeNull();
    });

    it('should use the cache for repeated calls', () => {
      const date1 = parseDateValue('15/01/2025');
      const date2 = parseDateValue('15/01/2025');
      expect(date1).toBe(date2); // Should be the exact same object from cache
    });
  });

  describe('filterDataByPeriod', () => {
    const data: DataRow[] = [
      { id: '1', date: '2025-01-15' },
      { id: '2', date: '2025-02-15' },
      { id: '3', date: '2025-03-15' },
      { id: '4', date: '2025-04-15' }
    ];

    it('should filter data within a period', () => {
      const filtered = filterDataByPeriod(data, 'date', 1, 2);
      expect(filtered).toHaveLength(2);
      expect(filtered.map(r => r.id)).toEqual(['1', '2']);
    });

    it('should handle periods crossing years', () => {
      const filtered = filterDataByPeriod(data, 'date', 12, 1);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('1');
    });
  });

  describe('aggregateDataByGroup', () => {
    const data: DataRow[] = [
      { id: '1', region: 'North', sales: 100 },
      { id: '2', region: 'North', sales: 200 },
      { id: '3', region: 'South', sales: 300 }
    ];

    it('should aggregate data by sum', () => {
      const groups = aggregateDataByGroup(data, ['region'], 'sales', 'sum');
      expect(groups.get('North')?.value).toBe(300);
      expect(groups.get('South')?.value).toBe(300);
    });

    it('should aggregate data by count', () => {
      const groups = aggregateDataByGroup(data, ['region'], 'sales', 'count');
      expect(groups.get('North')?.value).toBe(2);
      expect(groups.get('South')?.value).toBe(1);
    });

    it('should handle multiple group by fields', () => {
      const multiData: DataRow[] = [
        { id: '1', region: 'North', city: 'Paris', sales: 100 },
        { id: '2', region: 'North', city: 'Lyon', sales: 200 }
      ];
      const groups = aggregateDataByGroup(multiData, ['region', 'city'], 'sales', 'sum');
      expect(groups.has('North|Paris')).toBe(true);
      expect(groups.get('North|Paris')?.label).toBe('North\x1FParis');
    });
  });

  describe('Formatting functions', () => {
    it('should format currency correctly', () => {
      // Modern Node/Browsers use narrow non-breaking space (\u202f) for French locale
      const result = formatCurrency(1234.56).replace(/\u202f/g, ' ').replace(/\u00a0/g, ' ');
      expect(result).toContain('1 234,56');
    });

    it('should format percentage correctly', () => {
      const result = formatPercentage(12.5).replace(/\u202f/g, ' ').replace(/\u00a0/g, ' ');
      expect(result).toContain('12,5 %');
    });
  });
});
