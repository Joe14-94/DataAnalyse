import { describe, it, expect } from 'vitest';
import { profileColumn, profileDataset, detectOutliers, detectDuplicates } from '../logic/dataProfiling';

describe('Data Profiling Logic', () => {
  describe('profileColumn', () => {
    it('should profile a numeric column correctly', () => {
      const values = [10, 20, 30, null, '40', 50];
      const profile = profileColumn('Price', values);

      expect(profile.name).toBe('Price');
      expect(profile.type).toBe('number');
      expect(profile.completeness).toBe(5/6);
      expect(profile.stats.min).toBe(10);
      expect(profile.stats.max).toBe(50);
      expect(profile.stats.mean).toBe(30);
    });

    it('should profile a text column correctly', () => {
      const values = ['Apple', 'Banana', 'Apple', 'Cherry', ''];
      const profile = profileColumn('Fruit', values);

      expect(profile.type).toBe('text');
      expect(profile.cardinality).toBe(3); // Apple, Banana, Cherry
      expect(profile.distribution).toContainEqual({ value: 'Apple', count: 2 });
    });
  });

  describe('detectOutliers', () => {
    it('should detect outliers in a numeric array', () => {
      const values = [10, 12, 11, 13, 100, 11, 12, 9];
      const outliers = detectOutliers(values);
      expect(outliers).toContain(100);
      expect(outliers.length).toBe(1);
    });
  });

  describe('detectDuplicates', () => {
    it('should count duplicate rows', () => {
      const data = [
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
        { id: 1, name: 'A' }, // duplicate
      ];
      const count = detectDuplicates(data, ['id', 'name']);
      expect(count).toBe(1);
    });
  });

  describe('profileDataset', () => {
    it('should calculate global quality score', () => {
      const data = [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: null },
        { name: 'Charlie', age: 35 },
      ];
      const profile = profileDataset(data);
      expect(profile.rowCount).toBe(3);
      expect(profile.columnCount).toBe(2);
      expect(profile.qualityScore).toBeGreaterThan(50);
    });
  });
});
