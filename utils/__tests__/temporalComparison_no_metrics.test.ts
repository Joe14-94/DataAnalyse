import { describe, it, expect } from 'vitest';
import { calculateTemporalComparison } from '../temporalComparison';
import { DataRow, TemporalComparisonConfig } from '../../types';

describe('Calcul Comparaison Temporelle - No Metrics', () => {
  const sourceDataMap = new Map<string, DataRow[]>();
  sourceDataMap.set('s1', [
    { 'Date écriture': '2024-01-15', 'Region': 'Nord', 'Ventes': 100 },
  ]);
  sourceDataMap.set('s2', [
    { 'Date écriture': '2024-01-20', 'Region': 'Nord', 'Ventes': 200 },
  ]);

  const config: TemporalComparisonConfig = {
    sources: [
      { id: 's1', datasetId: 'd1', batchId: 'b1', label: '2023', importDate: 1 },
      { id: 's2', datasetId: 'd1', batchId: 'b2', label: '2024', importDate: 2 },
    ],
    referenceSourceId: 's1',
    periodFilter: { startMonth: 1, endMonth: 12 },
    groupByFields: ['Region'],
    valueField: '',
    aggType: 'sum',
    metrics: [], // Empty
    deltaFormat: 'value'
  };

  it('devrait fonctionner sans métriques', () => {
    const { results, colTotals } = calculateTemporalComparison(sourceDataMap, config);

    expect(results).toHaveLength(1);
    expect(results[0].groupLabel).toBe('Nord');
    expect(results[0].values['s1']).toEqual({});
    expect(results[0].values['s2']).toEqual({});
    expect(colTotals['s1']).toEqual({});
    expect(colTotals['s2']).toEqual({});
  });
});
