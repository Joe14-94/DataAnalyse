import { describe, it, expect } from 'vitest';
import { calculateTemporalComparison } from '../utils/temporalComparison';
import { DataRow, TemporalComparisonConfig } from '../types';

describe('Temporal Comparison Comprehensive Fix', () => {
  it('should include ALL rows regardless of date when period is 1 to 12', () => {
    const sourceDataMap = new Map<string, DataRow[]>();

    const rows: DataRow[] = [
      { Category: 'Jan', Date: '2026-01-01' },
      { Category: 'Jun', Date: '2026-06-15' },
      { Category: 'Dec', Date: '2026-12-31' },
      { Category: 'Null', Date: null },
      { Category: 'Invalid', Date: 'not-a-date' },
    ];

    sourceDataMap.set('s1', rows);
    sourceDataMap.set('s2', rows);

    const config: TemporalComparisonConfig = {
      sources: [
        { id: 's1', label: 'S1', batchId: 'b1' },
        { id: 's2', label: 'S2', batchId: 'b2' }
      ],
      referenceSourceId: 's1',
      periodFilter: { startMonth: 1, endMonth: 12 },
      groupByFields: ['Category'],
      metrics: [{ field: 'Category', aggType: 'count', label: 'Count' }]
    };

    const { results } = calculateTemporalComparison(sourceDataMap, config, 'Date');
    const categories = results.map(r => r.groupLabel);

    expect(categories).toContain('Jan');
    expect(categories).toContain('Jun');
    expect(categories).toContain('Dec');
    expect(categories).toContain('Null');
    expect(categories).toContain('Invalid');
    expect(results).toHaveLength(5);
  });

  it('should calculate Sum of Deltas for the footer correctly (independent of Totals)', () => {
    const sourceDataMap = new Map<string, DataRow[]>();

    // Scenario where Sum(Deltas) != Delta(MaxTotals)
    // s1: [P1: Jan 1, P2: Jan 20] -> Max = Jan 20 (46042)
    // s2: [P1: Jan 10, P2: Jan 5] -> Max = Jan 10 (46032)
    const s1: DataRow[] = [
      { Project: 'P1', Date: '01/01/2026' }, // 46023
      { Project: 'P2', Date: '20/01/2026' }, // 46042
    ];
    const s2: DataRow[] = [
      { Project: 'P1', Date: '10/01/2026' }, // 46032 (+9 days)
      { Project: 'P2', Date: '05/01/2026' }, // 46027 (-15 days)
    ];

    sourceDataMap.set('s1', s1);
    sourceDataMap.set('s2', s2);

    const config: TemporalComparisonConfig = {
      sources: [
        { id: 's1', label: 'S1', batchId: 'b1' },
        { id: 's2', label: 'S2', batchId: 'b2' }
      ],
      referenceSourceId: 's1',
      periodFilter: { startMonth: 1, endMonth: 12 },
      groupByFields: ['Project'],
      metrics: [{ field: 'Date', aggType: 'max', label: 'MyDate' }]
    };

    const { deltaTotals, colTotals } = calculateTemporalComparison(sourceDataMap, config, 'Date');

    // Individual Deltas:
    // P1: 46032 - 46023 = +9
    // P2: 46027 - 46042 = -15
    // Sum of Deltas = 9 - 15 = -6

    // Column Max Totals:
    // s1 Max: 46042
    // s2 Max: 46032
    // Delta of Totals = 46032 - 46042 = -10

    expect(deltaTotals['s2']['MyDate']).toBe(-6);
    expect(colTotals['s1']['MyDate']).toBe(46042);
    expect(colTotals['s2']['MyDate']).toBe(46032);

    // Verify they are different
    expect(deltaTotals['s2']['MyDate']).not.toBe(colTotals['s2']['MyDate'] - colTotals['s1']['MyDate']);
  });
});
