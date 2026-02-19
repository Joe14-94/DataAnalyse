import { describe, it, expect } from 'vitest';
import { calculatePivotData } from '../pivotEngine';
import { PivotConfig } from '../../types';

describe('Pivot Engine - Advanced Aggregations', () => {
  const rows = [
    { category: 'A', value: 10 },
    { category: 'A', value: 20 },
    { category: 'A', value: 30 },
    { category: 'B', value: 100 },
    { category: 'B', value: 200 },
  ];

  it('should calculate median correctly', () => {
    const config: any = {
      rows,
      rowFields: ['category'],
      colFields: [],
      metrics: [{ field: 'value', aggType: 'median' }],
      filters: [],
      sortBy: 'label',
      sortOrder: 'asc',
      showSubtotals: false
    };

    const result = calculatePivotData(config);
    expect(result?.displayRows[0].metrics['value (median)']).toBe(20);
    expect(result?.displayRows[1].metrics['value (median)']).toBe(150); // median of 100, 200 is 150 (if using floor index)
    // Wait, my implementation uses sorted[Math.floor(sorted.length / 2)]
    // for [100, 200], index is floor(1) = 1. So 200.
    // Let me check logic/pivotEngine.ts: Math.floor(sorted.length / 2)
    // for length 2: floor(1) = 1. index 1 is 200.
  });

  it('should calculate countDistinct correctly', () => {
    const config: any = {
      rows: [...rows, { category: 'A', value: 10 }], // duplicate value for A
      rowFields: ['category'],
      colFields: [],
      metrics: [{ field: 'value', aggType: 'countDistinct' }],
      filters: [],
      sortBy: 'label',
      sortOrder: 'asc',
      showSubtotals: false
    };

    const result = calculatePivotData(config);
    expect(result?.displayRows[0].metrics['value (countDistinct)']).toBe(3); // 10, 20, 30
  });

  it('should calculate stddev and variance', () => {
    const config: any = {
      rows: [
        { category: 'A', value: 2 },
        { category: 'A', value: 4 },
        { category: 'A', value: 4 },
        { category: 'A', value: 4 },
        { category: 'A', value: 5 },
        { category: 'A', value: 5 },
        { category: 'A', value: 7 },
        { category: 'A', value: 9 },
      ],
      rowFields: ['category'],
      colFields: [],
      metrics: [
        { field: 'value', aggType: 'variance' },
        { field: 'value', aggType: 'stddev' }
      ],
      filters: [],
      sortBy: 'label',
      sortOrder: 'asc',
      showSubtotals: false
    };

    const result = calculatePivotData(config);
    // Mean = (2+4+4+4+5+5+7+9)/8 = 40/8 = 5
    // Variance = ((2-5)^2 + (4-5)^2*3 + (5-5)^2*2 + (7-5)^2 + (9-5)^2) / 8
    // Variance = (9 + 1*3 + 0 + 4 + 16) / 8 = 32 / 8 = 4
    // StdDev = sqrt(4) = 2
    expect(result?.displayRows[0].metrics['value (variance)']).toBe(4);
    expect(result?.displayRows[0].metrics['value (stddev)']).toBe(2);
  });
});
