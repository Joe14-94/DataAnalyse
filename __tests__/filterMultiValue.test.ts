import { describe, it, expect } from 'vitest';
import { prepareFilters, applyPreparedFilters } from '../utils/common';

describe('Filtering Logic - Multi-value support', () => {
  const row = { Region: 'Paris', Product: 'Bread' };

  it('should support comma-separated values in "in" operator', () => {
    const filters = [{ field: 'Region', operator: 'in', value: 'Paris, Lyon, Marseille' }];
    const prepared = prepareFilters(filters);

    expect(applyPreparedFilters(row, prepared)).toBe(true);
    expect(applyPreparedFilters({ Region: 'Lyon' }, prepared)).toBe(true);
    expect(applyPreparedFilters({ Region: 'London' }, prepared)).toBe(false);
  });

  it('should support semicolon-separated values', () => {
    const filters = [{ field: 'Region', operator: 'in', value: 'Lyon; Paris' }];
    const prepared = prepareFilters(filters);

    expect(applyPreparedFilters(row, prepared)).toBe(true);
    expect(applyPreparedFilters({ Region: 'Lyon' }, prepared)).toBe(true);
    expect(applyPreparedFilters({ Region: 'Marseille' }, prepared)).toBe(false);
  });

  it('should support space-separated values when no comma/semicolon is present', () => {
    const filters = [{ field: 'Region', operator: 'in', value: 'Paris Lyon' }];
    const prepared = prepareFilters(filters);

    expect(applyPreparedFilters(row, prepared)).toBe(true);
    expect(applyPreparedFilters({ Region: 'Lyon' }, prepared)).toBe(true);
    expect(applyPreparedFilters({ Region: 'London' }, prepared)).toBe(false);
  });

  it('should respect spaces within values when commas are present', () => {
    const filters = [{ field: 'Region', operator: 'in', value: 'Paris, New York' }];
    const prepared = prepareFilters(filters);

    expect(applyPreparedFilters({ Region: 'Paris' }, prepared)).toBe(true);
    expect(applyPreparedFilters({ Region: 'New York' }, prepared)).toBe(true);
    expect(applyPreparedFilters({ Region: 'New' }, prepared)).toBe(false);
  });

  it('should handle whitespace and empty values gracefully', () => {
    const filters = [{ field: 'Region', operator: 'in', value: ' Paris , , Lyon ' }];
    const prepared = prepareFilters(filters);

    expect(applyPreparedFilters({ Region: 'Paris' }, prepared)).toBe(true);
    expect(applyPreparedFilters({ Region: 'Lyon' }, prepared)).toBe(true);
    expect(prepared[0].preparedValue.size).toBe(2);
  });
});
