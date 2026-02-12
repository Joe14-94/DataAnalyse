
import { describe, it, expect } from 'vitest';
import { applyFilter, applyAggregate } from '../utils/transformations';
import { DataRow, FilterCondition, ETLAggregationType } from '../types';

describe('Bolt Optimizations - applyFilter', () => {
  const data: DataRow[] = [
    { id: '1', name: 'Alice', age: 30, city: 'Paris' },
    { id: '2', name: 'Bob', age: 25, city: 'Lyon' },
    { id: '3', name: 'Charlie', age: 35, city: 'Paris' },
    { id: '4', name: 'David', age: 40, city: 'Marseille' },
  ];

  it('should filter with AND correctly', () => {
    const conditions: FilterCondition[] = [
      { field: 'city', operator: 'equals', value: 'Paris' },
      { field: 'age', operator: 'greater_than', value: 32 }
    ];
    const result = applyFilter(data, conditions, 'AND');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Charlie');
  });

  it('should filter with OR correctly', () => {
    const conditions: FilterCondition[] = [
      { field: 'city', operator: 'equals', value: 'Lyon' },
      { field: 'name', operator: 'starts_with', value: 'D' }
    ];
    const result = applyFilter(data, conditions, 'OR');
    expect(result).toHaveLength(2);
    expect(result.map(r => r.name)).toContain('Bob');
    expect(result.map(r => r.name)).toContain('David');
  });

  it('should handle case-insensitive search', () => {
    const conditions: FilterCondition[] = [
      { field: 'city', operator: 'contains', value: 'ari', caseSensitive: false }
    ];
    const result = applyFilter(data, conditions, 'AND');
    expect(result).toHaveLength(2);
    expect(result.map(r => r.name)).toContain('Alice');
    expect(result.map(r => r.name)).toContain('Charlie');
  });

  it('should handle is_empty / is_not_empty', () => {
    const dataWithEmpty = [
        ...data,
        { id: '5', name: 'Eve', age: null, city: '' }
    ];
    const conditions: FilterCondition[] = [
        { field: 'age', operator: 'is_empty', value: '' }
    ];
    const result = applyFilter(dataWithEmpty, conditions, 'AND');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Eve');

    const conditions2: FilterCondition[] = [
        { field: 'city', operator: 'is_empty', value: '' }
    ];
    const result2 = applyFilter(dataWithEmpty, conditions2, 'AND');
    expect(result2).toHaveLength(1);
    expect(result2[0].name).toBe('Eve');
  });
});

describe('Bolt Optimizations - applyAggregate', () => {
  const data: DataRow[] = [
    { id: '1', cat: 'A', val: 10 },
    { id: '2', cat: 'A', val: 20 },
    { id: '3', cat: 'B', val: 30 },
    { id: '4', cat: 'B', val: 40 },
    { id: '5', cat: 'A', val: 5 },
  ];

  it('should aggregate with group by', () => {
    const aggregations = [
      { field: 'val', operation: 'sum' as ETLAggregationType, alias: 'total' },
      { field: 'val', operation: 'avg' as ETLAggregationType, alias: 'average' },
      { field: 'id', operation: 'count' as ETLAggregationType, alias: 'count' },
      { field: 'val', operation: 'min' as ETLAggregationType, alias: 'min' },
      { field: 'val', operation: 'max' as ETLAggregationType, alias: 'max' }
    ];
    const result = applyAggregate(data, ['cat'], aggregations);

    expect(result).toHaveLength(2);

    const groupA = result.find(r => r.cat === 'A');
    expect(groupA?.total).toBe(35);
    expect(groupA?.average).toBe(35/3);
    expect(groupA?.count).toBe(3);
    expect(groupA?.min).toBe(5);
    expect(groupA?.max).toBe(20);

    const groupB = result.find(r => r.cat === 'B');
    expect(groupB?.total).toBe(70);
    expect(groupB?.average).toBe(35);
    expect(groupB?.count).toBe(2);
    expect(groupB?.min).toBe(30);
    expect(groupB?.max).toBe(40);
  });

  it('should handle global aggregation', () => {
    const aggregations = [
      { field: 'val', operation: 'sum' as ETLAggregationType, alias: 'total' }
    ];
    const result = applyAggregate(data, [], aggregations);
    expect(result).toHaveLength(1);
    expect(result[0].total).toBe(105);
  });

  it('should handle null values in aggregation', () => {
    const dataWithNulls: DataRow[] = [
        { id: '1', cat: 'A', val: 10 },
        { id: '2', cat: 'A', val: null },
        { id: '3', cat: 'A', val: undefined },
    ];
    const aggregations = [
        { field: 'val', operation: 'sum' as ETLAggregationType, alias: 'total' },
        { field: 'val', operation: 'count' as ETLAggregationType, alias: 'count' }
    ];
    const result = applyAggregate(dataWithNulls, ['cat'], aggregations);
    expect(result[0].total).toBe(10);
    expect(result[0].count).toBe(1); // Should only count the non-null value
  });
});
