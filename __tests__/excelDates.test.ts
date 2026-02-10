import { describe, it, expect } from 'vitest';
import { formatDateFr, parseDateValue, getGroupedLabel } from '../utils/common';

describe('Date utilities with Excel dates', () => {
  describe('formatDateFr', () => {
    it('should convert 46057 to 4 février 2026', () => {
      const result = formatDateFr(46057);
      expect(result).toContain('février');
      expect(result).toContain('2026');
      expect(result).toMatch(/4 février 2026|04 février 2026/);
    });

    it('should convert "46057" string to 4 février 2026', () => {
      const result = formatDateFr('46057');
      expect(result).toMatch(/4 février 2026|04 février 2026/);
    });

    it('should handle standard ISO dates', () => {
      const result = formatDateFr('2025-01-15');
      expect(result).toMatch(/15 janvier 2025|15 janv. 2025/);
    });
  });

  describe('parseDateValue', () => {
    it('should parse 46057 as 2026-02-04', () => {
      const date = parseDateValue(46057);
      expect(date).not.toBeNull();
      expect(date?.getFullYear()).toBe(2026);
      expect(date?.getMonth()).toBe(1); // February is 1
      expect(date?.getDate()).toBe(4);
    });

    it('should parse French format DD/MM/YYYY', () => {
      const date = parseDateValue('15/01/2025');
      expect(date?.getFullYear()).toBe(2025);
      expect(date?.getMonth()).toBe(0);
      expect(date?.getDate()).toBe(15);
    });
  });

  describe('getGroupedLabel', () => {
    it('should group 46057 by year', () => {
      expect(getGroupedLabel('46057', 'year')).toBe('2026');
    });

    it('should group 46057 by month', () => {
      expect(getGroupedLabel('46057', 'month')).toBe('2026-02');
    });
  });
});
