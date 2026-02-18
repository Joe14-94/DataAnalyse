
import { describe, it, expect } from 'vitest';
import { buildHierarchicalTree, treeToSunburstRings, SunburstRingItem } from '../logic/pivotToChart';
import { PivotResult, PivotConfig } from '../types';

describe('Sunburst Data Transformation', () => {
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
        keys: ['A', 'A1', 'A12'],
        metrics: {},
        rowTotal: 50,
        level: 2
      },
      {
        type: 'data',
        keys: ['B', 'B1', 'B11'],
        metrics: {},
        rowTotal: 200,
        level: 2
      }
    ],
    colHeaders: [],
    colTotals: {},
    grandTotal: 350
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

  it('should build a hierarchical tree correctly', () => {
    const tree = buildHierarchicalTree(mockResult, mockConfig);
    expect(tree.length).toBe(2); // A and B

    const nodeA = tree.find(n => n.name === 'A');
    expect(nodeA).toBeDefined();
    expect(nodeA?.children?.length).toBe(1); // A1

    const nodeA1 = nodeA?.children?.[0];
    expect(nodeA1?.name).toBe('A1');
    expect(nodeA1?.children?.length).toBe(2); // A11 and A12

    const nodeA11 = nodeA1?.children?.find(n => n.name === 'A11');
    expect(nodeA11?.value).toBe(100);
  });

  it('should generate sunburst rings with correct values', () => {
    const tree = buildHierarchicalTree(mockResult, mockConfig);
    const rings = treeToSunburstRings(tree, ['#ff0000', '#00ff00']);

    expect(rings.length).toBe(3);

    // Ring 0 (A, B)
    expect(rings[0].length).toBe(2);
    expect(rings[0].find(r => r.name === 'A')?.value).toBe(150);
    expect(rings[0].find(r => r.name === 'B')?.value).toBe(200);

    // Ring 1 (A1, B1)
    expect(rings[1].length).toBe(2);
    expect(rings[1].find(r => r.name === 'A1')?.value).toBe(150);
    expect(rings[1].find(r => r.name === 'B1')?.value).toBe(200);

    // Ring 2 (A11, A12, B11)
    expect(rings[2].length).toBe(3);
    expect(rings[2].find(r => r.name === 'A11')?.value).toBe(100);
    expect(rings[2].find(r => r.name === 'A12')?.value).toBe(50);
    expect(rings[2].find(r => r.name === 'B11')?.value).toBe(200);
  });
});
