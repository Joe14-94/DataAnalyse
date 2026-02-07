import { describe, it, expect } from 'vitest';
import {
  buildHierarchicalTree,
  treeToSunburstRings,
  SunburstRingItem
} from '../logic/pivotToChart';
import { PivotResult, PivotConfig } from '../types';

describe('Sunburst Data Transformation', () => {
  it('should handle rows with different key lengths correctly', () => {
    const mockResult: PivotResult = {
      displayRows: [
        {
          type: 'data',
          keys: ['A', 'A1', 'A11'],
          metrics: {},
          rowTotal: 100,
          level: 2
        },
        {
          type: 'data',
          keys: ['A', 'A1'], // A1 is both a parent (of A11) and a leaf here
          metrics: {},
          rowTotal: 50,
          level: 1
        }
      ],
      colHeaders: [],
      colTotals: {},
      grandTotal: 150
    };

    const mockConfig: PivotConfig = {
      rowFields: ['Cat1', 'Cat2', 'Cat3'],
      colFields: [],
      colGrouping: 'none',
      valField: 'Value',
      aggType: 'sum',
      filters: [],
      sortBy: 'label',
      sortOrder: 'asc',
      showSubtotals: true
    } as any;

    const tree = buildHierarchicalTree(mockResult, mockConfig);
    const nodeA = tree[0];
    const nodeA1 = nodeA.children![0];

    // If A1 was processed AFTER ['A', 'A1', 'A11'], its children were wiped!
    // But buildHierarchicalTree doesn't guarantee order of processing

    // In our implementation, if A1 comes last:
    // 1. ['A', 'A1', 'A11'] is processed. A1 has child A11.
    // 2. ['A', 'A1'] is processed. A1.children is set to undefined!

    expect(nodeA1.children).toBeDefined();
    expect(nodeA1.children?.length).toBeGreaterThan(0);
  });
});
