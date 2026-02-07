import { describe, it, expect } from 'vitest';
import { pivotResultToRows, temporalResultToRows } from '../utils/pivotToDataset';
import { PivotResult, TemporalComparisonResult, TemporalComparisonConfig } from '../types';

describe('pivotToDataset utils', () => {
  describe('pivotResultToRows', () => {
    it('should convert standard pivot results to data rows', () => {
      const mockResult: PivotResult = {
        colHeaders: ['Col A', 'Col B'],
        displayRows: [
          {
            type: 'data',
            keys: ['Row 1'],
            level: 0,
            metrics: { 'Col A': 10, 'Col B': 20 },
            rowTotal: 30
          },
          {
            type: 'subtotal',
            keys: ['Row 1'],
            level: 0,
            metrics: { 'Col A': 10, 'Col B': 20 },
            rowTotal: 30
          }
        ],
        colTotals: {},
        grandTotal: 30
      };

      const rows = pivotResultToRows(mockResult, ['Region']);
      expect(rows).toHaveLength(1);
      expect(rows[0].Region).toBe('Row 1');
      expect(rows[0]['Col A']).toBe(10);
      expect(rows[0]['Col B']).toBe(20);
      expect(rows[0].id).toBeDefined();
    });
  });

  describe('temporalResultToRows', () => {
    it('should convert temporal results to data rows', () => {
      const mockResults: TemporalComparisonResult[] = [
        {
          groupKey: 'G1',
          groupLabel: 'Group 1',
          values: { S1: 100, S2: 150 },
          deltas: { S2: { value: 50, percentage: 50 } },
          isSubtotal: false
        },
        {
          groupKey: 'Subtotal',
          groupLabel: 'Group 1',
          values: { S1: 100, S2: 150 },
          deltas: {},
          isSubtotal: true
        }
      ];

      const mockConfig: TemporalComparisonConfig = {
        sources: [
          { id: 'S1', label: 'Source 1', datasetId: 'D1', batchId: 'B1', importDate: 0 },
          { id: 'S2', label: 'Source 2', datasetId: 'D1', batchId: 'B2', importDate: 0 }
        ],
        referenceSourceId: 'S1',
        periodFilter: { startMonth: 1, endMonth: 12 },
        deltaFormat: 'value',
        groupByFields: ['Category'],
        valueField: 'Amount',
        aggType: 'sum'
      };

      const rows = temporalResultToRows(mockResults, ['Category'], mockConfig);
      expect(rows).toHaveLength(1);
      expect(rows[0].Category).toBe('Group 1');
      expect(rows[0]['Source 1']).toBe(100);
      expect(rows[0]['Source 2']).toBe(150);
      expect(rows[0].id).toBeDefined();
    });
  });
});
