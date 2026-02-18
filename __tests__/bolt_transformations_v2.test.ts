
import { describe, it, expect } from 'vitest';
import { applyPivot, applySplit, applyMerge } from '../utils/transformations';
import { DataRow, ETLAggregationType } from '../types';

describe('Baseline tests for ETL transformations', () => {
  const data: DataRow[] = [
    { id: '1', category: 'A', status: 'Active', value: 10 },
    { id: '2', category: 'A', status: 'Inactive', value: 20 },
    { id: '3', category: 'B', status: 'Active', value: 30 },
    { id: '4', category: 'B', status: 'Active', value: 40 },
    { id: '5', category: 'A', status: 'Active', value: 5 },
    { id: '6', category: 'B', status: 'Inactive', value: null },
  ];

  describe('applyPivot', () => {
    it('should pivot data with sum aggregation', () => {
      const result = applyPivot(data, 'category', 'status', 'value', 'sum');

      expect(result).toHaveLength(2);

      const rowA = result.find(r => r.category === 'A');
      expect(rowA?.Active).toBe(15);
      expect(rowA?.Inactive).toBe(20);

      const rowB = result.find(r => r.category === 'B');
      expect(rowB?.Active).toBe(70);
      expect(rowB?.Inactive).toBe(0); // sum of null/no-numbers is 0
    });

    it('should return null for missing groups even in sum aggregation', () => {
      const dataWithMissing = [
        { id: '1', category: 'A', status: 'X', value: 10 },
        { id: '2', category: 'B', status: 'Y', value: 20 },
      ];
      // Here 'A' only has 'X', and 'B' only has 'Y'.
      // So (A, Y) and (B, X) are missing groups.
      const result = applyPivot(dataWithMissing, 'category', 'status', 'value', 'sum');

      const rowA = result.find(r => r.category === 'A');
      expect(rowA?.X).toBe(10);
      expect(rowA?.Y).toBeNull(); // Missing group should be null

      const rowB = result.find(r => r.category === 'B');
      expect(rowB?.Y).toBe(20);
      expect(rowB?.X).toBeNull(); // Missing group should be null
    });

    it('should not skip leading nulls for first aggregation', () => {
        const dataWithNulls = [
            { id: '1', group: 'G', val: null },
            { id: '2', group: 'G', val: 'Actual First' },
            { id: '3', group: 'G', val: 'Last' },
        ];
        const result = applyPivot(dataWithNulls, 'group', 'group', 'val', 'first');
        // Wait, pivot uses the same column as the group in this case?
        // Let's use a different column for pivot.
        const result2 = applyPivot(dataWithNulls, 'id', 'group', 'val', 'first');
        expect(result2.find(r => r.id === '1')?.G).toBeNull();

        const result3 = applyPivot(dataWithNulls, 'group', 'id', 'val', 'first');
        // This is more like what we want to test: one row (group G), multiple columns (1, 2, 3)
        const rowG = result3.find(r => r.group === 'G');
        expect(rowG?.[1]).toBeNull();
        expect(rowG?.[2]).toBe('Actual First');
    });

    it('should match calculateAggregation for first/last across multiple rows in same group', () => {
        const dataMulti = [
            { cat: 'A', col: 'X', val: null },
            { cat: 'A', col: 'X', val: 1 },
            { cat: 'A', col: 'X', val: 2 },
        ];
        const result = applyPivot(dataMulti, 'cat', 'col', 'val', 'first');
        expect(result[0].X).toBeNull();

        const resultLast = applyPivot(dataMulti, 'cat', 'col', 'val', 'last');
        expect(resultLast[0].X).toBe(2);
    });

    it('should pivot data with avg aggregation', () => {
      const result = applyPivot(data, 'category', 'status', 'value', 'avg');

      const rowA = result.find(r => r.category === 'A');
      expect(rowA?.Active).toBe(7.5);
      expect(rowA?.Inactive).toBe(20);

      const rowB = result.find(r => r.category === 'B');
      expect(rowB?.Active).toBe(35);
      expect(rowB?.Inactive).toBeNull();
    });

    it('should pivot data with count aggregation', () => {
      const result = applyPivot(data, 'category', 'status', 'value', 'count');

      const rowA = result.find(r => r.category === 'A');
      expect(rowA?.Active).toBe(2);
      expect(rowA?.Inactive).toBe(1);

      const rowB = result.find(r => r.category === 'B');
      expect(rowB?.Active).toBe(2);
      expect(rowB?.Inactive).toBe(1);
    });
  });

  describe('applySplit', () => {
    it('should split a column into multiple columns', () => {
      const splitData: DataRow[] = [
        { id: '1', fullName: 'John Doe' },
        { id: '2', fullName: 'Jane Smith' },
      ];
      const result = applySplit(splitData, 'fullName', ' ', ['firstName', 'lastName']);

      expect(result[0].firstName).toBe('John');
      expect(result[0].lastName).toBe('Doe');
      expect(result[1].firstName).toBe('Jane');
      expect(result[1].lastName).toBe('Smith');
    });
  });

  describe('applyMerge', () => {
    it('should merge multiple columns into one', () => {
      const mergeData: DataRow[] = [
        { id: '1', firstName: 'John', lastName: 'Doe' },
        { id: '2', firstName: 'Jane', lastName: 'Smith' },
      ];
      const result = applyMerge(mergeData, ['firstName', 'lastName'], 'fullName', ' ');

      expect(result[0].fullName).toBe('John Doe');
      expect(result[1].fullName).toBe('Jane Smith');
    });
  });
});
