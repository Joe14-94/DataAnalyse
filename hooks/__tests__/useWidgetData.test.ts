import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useWidgetData } from '../useWidgetData';
import * as DataContext from '../../context/DataContext';
import { DashboardWidget } from '../../types';

vi.mock('../../context/DataContext', () => ({
  useBatches: vi.fn(),
  useDatasets: vi.fn(),
  useWidgets: vi.fn()
}));

describe('useWidgetData', () => {
  const mockDatasets = [
    {
      id: 'ds1',
      name: 'Dataset 1',
      fields: ['Region', 'Amount'],
      fieldConfigs: { Amount: { type: 'number', unit: '€' } }
    }
  ];

  const mockBatches = [
    {
      id: 'b1',
      datasetId: 'ds1',
      date: '2024-01-01',
      rows: [
        { id: 'r1', Region: 'North', Amount: '100' },
        { id: 'r2', Region: 'South', Amount: '200' }
      ]
    },
    {
      id: 'b2',
      datasetId: 'ds1',
      date: '2024-02-01',
      rows: [
        { id: 'r3', Region: 'North', Amount: '150' },
        { id: 'r4', Region: 'South', Amount: '250' }
      ]
    }
  ];

  it('calculates KPI correctly (count)', () => {
    vi.mocked(DataContext.useDatasets).mockReturnValue({ datasets: mockDatasets } as any);
    vi.mocked(DataContext.useBatches).mockReturnValue({ batches: mockBatches } as any);
    vi.mocked(DataContext.useWidgets).mockReturnValue({ dashboardFilters: {} } as any);

    const widget: DashboardWidget = {
      id: 'w1',
      title: 'Total Count',
      type: 'kpi',
      size: 'sm',
      config: {
        source: { datasetId: 'ds1', mode: 'latest' },
        metric: 'count'
      }
    };

    const { result } = renderHook(() => useWidgetData(widget, { start: '', end: '' }));

    expect(result.current).toMatchObject({
      current: 2, // Latest batch (b2) has 2 rows
      prev: 2, // Previous batch (b1) has 2 rows
      trend: 0
    });
  });

  it('calculates KPI correctly (sum)', () => {
    vi.mocked(DataContext.useDatasets).mockReturnValue({ datasets: mockDatasets } as any);
    vi.mocked(DataContext.useBatches).mockReturnValue({ batches: mockBatches } as any);
    vi.mocked(DataContext.useWidgets).mockReturnValue({ dashboardFilters: {} } as any);

    const widget: DashboardWidget = {
      id: 'w2',
      title: 'Total Amount',
      type: 'kpi',
      size: 'sm',
      config: {
        source: { datasetId: 'ds1', mode: 'latest' },
        metric: 'sum',
        valueField: 'Amount'
      }
    };

    const { result } = renderHook(() => useWidgetData(widget, { start: '', end: '' }));

    expect(result.current).toMatchObject({
      current: 400, // 150 + 250
      prev: 300, // 100 + 200
      trend: ((400 - 300) / 300) * 100
    });
  });

  it('applies global date filters', () => {
    vi.mocked(DataContext.useDatasets).mockReturnValue({ datasets: mockDatasets } as any);
    vi.mocked(DataContext.useBatches).mockReturnValue({ batches: mockBatches } as any);
    vi.mocked(DataContext.useWidgets).mockReturnValue({ dashboardFilters: {} } as any);

    const widget: DashboardWidget = {
      id: 'w1',
      title: 'Total Count',
      type: 'kpi',
      size: 'sm',
      config: {
        source: { datasetId: 'ds1', mode: 'latest' },
        metric: 'count'
      }
    };

    // Only allow b1
    const { result } = renderHook(() =>
      useWidgetData(widget, { start: '2024-01-01', end: '2024-01-15' })
    );

    expect(result.current).toMatchObject({
      current: 2,
      prev: 0 // No previous batch in this range
    });
  });

  it('returns error when dataset is missing', () => {
    vi.mocked(DataContext.useDatasets).mockReturnValue({ datasets: [] } as any);
    vi.mocked(DataContext.useBatches).mockReturnValue({ batches: mockBatches } as any);
    vi.mocked(DataContext.useWidgets).mockReturnValue({ dashboardFilters: {} } as any);

    const widget: DashboardWidget = {
      id: 'w1',
      title: 'Total Count',
      type: 'kpi',
      size: 'sm',
      config: {
        source: { datasetId: 'ds_ghost', mode: 'latest' },
        metric: 'count'
      }
    };

    const { result } = renderHook(() => useWidgetData(widget, { start: '', end: '' }));

    expect(result.current).toEqual({ error: 'Jeu de données introuvable' });
  });
});
