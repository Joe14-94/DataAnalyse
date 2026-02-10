
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePivotData } from '../usePivotData';
import * as DataContext from '../../context/DataContext';

vi.mock('../../context/DataContext', () => ({
  useBatches: vi.fn(),
  useDatasets: vi.fn(),
}));

describe('usePivotData', () => {
  const mockDatasets = [
    { id: 'ds1', name: 'Dataset 1', fields: ['Region', 'Product', 'Sales'], fieldConfigs: { Sales: { type: 'number' } } }
  ];

  const mockBatches = [
    {
      id: 'b1',
      datasetId: 'ds1',
      date: '2024-01-01',
      rows: [
        { id: 'r1', Region: 'North', Product: 'Apple', Sales: '100' },
        { id: 'r2', Region: 'South', Product: 'Banana', Sales: '200' },
        { id: 'r3', Region: 'North', Product: 'Orange', Sales: '150' }
      ]
    }
  ];

  const defaultProps: any = {
    sources: [{ id: 's1', datasetId: 'ds1', isPrimary: true, color: 'blue' }],
    selectedBatchId: 'b1',
    rowFields: ['Region'],
    colFields: [],
    colGrouping: 'none',
    valField: 'Sales',
    aggType: 'sum',
    metrics: [{ field: 'Sales', aggType: 'sum' }],
    filters: [],
    sortBy: 'label',
    sortOrder: 'asc',
    showSubtotals: false,
    showVariations: false,
    isTemporalMode: false,
    temporalConfig: null,
    searchTerm: ''
  };

  it('filters data correctly using searchTerm', async () => {
    vi.mocked(DataContext.useDatasets).mockReturnValue({ datasets: mockDatasets } as any);
    vi.mocked(DataContext.useBatches).mockReturnValue({ batches: mockBatches } as any);

    const { result, rerender } = renderHook(
      (props) => usePivotData(props),
      { initialProps: defaultProps }
    );

    // Wait for initial calculation (standard useEffect has 150ms delay)
    await waitFor(() => expect(result.current.pivotData).not.toBeNull(), { timeout: 2000 });
    expect(result.current.pivotData?.displayRows.length).toBe(2); // North and South

    // Apply search term
    rerender({ ...defaultProps, searchTerm: 'North' });

    // The hook has a 150ms debounce for calculation
    await waitFor(() => {
        const rows = result.current.pivotData?.displayRows;
        return rows && rows.length === 1 && rows[0].keys.includes('North');
    }, { timeout: 2000 });

    expect(result.current.pivotData?.displayRows[0].metrics['Sales (sum)']).toBe(250); // 100 + 150
  });

  it('handles case-insensitive search', async () => {
    vi.mocked(DataContext.useDatasets).mockReturnValue({ datasets: mockDatasets } as any);
    vi.mocked(DataContext.useBatches).mockReturnValue({ batches: mockBatches } as any);

    const { result } = renderHook(
      () => usePivotData({ ...defaultProps, searchTerm: 'north' })
    );

    await waitFor(() => {
        const rows = result.current.pivotData?.displayRows;
        return rows && rows.length === 1 && rows[0].keys.includes('North');
    }, { timeout: 2000 });
  });

  it('handles search across multiple columns (searchIndex)', async () => {
    vi.mocked(DataContext.useDatasets).mockReturnValue({ datasets: mockDatasets } as any);
    vi.mocked(DataContext.useBatches).mockReturnValue({ batches: mockBatches } as any);

    const { result } = renderHook(
      () => usePivotData({ ...defaultProps, searchTerm: 'Apple' })
    );

    // Use expect inside waitFor for better stability
    await waitFor(() => {
        expect(result.current.pivotData).not.toBeNull();
        expect(result.current.pivotData?.displayRows.length).toBe(1);
        expect(result.current.pivotData?.displayRows[0].keys).toContain('North');
    }, { timeout: 3000 });

    const metrics = result.current.pivotData!.displayRows[0].metrics;
    const metricValues = Object.values(metrics);
    expect(metricValues).toContain(100);
  });
});
