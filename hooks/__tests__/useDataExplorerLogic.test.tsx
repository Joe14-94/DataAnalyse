
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDataExplorerLogic } from '../useDataExplorerLogic';
import * as DataContext from '../../context/DataContext';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';

// Mock context
vi.mock('../../context/DataContext', () => ({
  useData: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual as any,
        useLocation: vi.fn(() => ({ state: null })),
        useNavigate: vi.fn(),
    };
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('useDataExplorerLogic', () => {
  const mockDatasets = [
    { id: 'ds1', name: 'Sales', fields: ['City', 'Amount'], fieldConfigs: {} }
  ];

  const mockBatches = [
    {
      id: 'b1',
      datasetId: 'ds1',
      date: '2024-01-01',
      rows: [
        { id: 'r1', City: 'Paris', Amount: 100 },
        { id: 'r2', City: 'Lyon', Amount: 200 },
      ]
    }
  ];

  it('initializes and performs global search', () => {
    vi.mocked(DataContext.useData).mockReturnValue({
      batches: mockBatches,
      currentDataset: mockDatasets[0],
      currentDatasetId: 'ds1',
      datasets: mockDatasets,
      switchDataset: vi.fn(),
      updateBatchRows: vi.fn(),
      deleteBatch: vi.fn(),
      saveFieldConfigs: vi.fn(),
      saveCalculatedFields: vi.fn(),
      saveEnrichmentConfigs: vi.fn(),
      saveDataExplorerState: vi.fn(),
      lastDataExplorerState: null,
      updateRows: vi.fn(),
      deleteDatasetField: vi.fn(),
      deleteBatchRow: vi.fn(),
      renameDatasetField: vi.fn(),
      addFieldToDataset: vi.fn(),
      enrichBatchesWithLookup: vi.fn(),
      reorderDatasetFields: vi.fn(),
    } as any);

    const { result } = renderHook(() => useDataExplorerLogic(), { wrapper });

    expect(result.current.processedRows).toHaveLength(2);

    act(() => {
        result.current.dispatch({ type: 'SET_SEARCH_TERM', payload: 'Lyon' });
    });

    expect(result.current.processedRows).toHaveLength(1);
    expect(result.current.processedRows[0].City).toBe('Lyon');
  });

  it('applies column filters', () => {
    vi.mocked(DataContext.useData).mockReturnValue({
      batches: mockBatches,
      currentDataset: mockDatasets[0],
      currentDatasetId: 'ds1',
      datasets: mockDatasets,
      switchDataset: vi.fn(),
      updateBatchRows: vi.fn(),
      deleteBatch: vi.fn(),
      saveFieldConfigs: vi.fn(),
      saveCalculatedFields: vi.fn(),
      saveEnrichmentConfigs: vi.fn(),
      saveDataExplorerState: vi.fn(),
      lastDataExplorerState: null,
      updateRows: vi.fn(),
      deleteDatasetField: vi.fn(),
      deleteBatchRow: vi.fn(),
      renameDatasetField: vi.fn(),
      addFieldToDataset: vi.fn(),
      enrichBatchesWithLookup: vi.fn(),
      reorderDatasetFields: vi.fn(),
    } as any);

    const { result } = renderHook(() => useDataExplorerLogic(), { wrapper });

    act(() => {
        result.current.handleColumnFilterChange('City', 'Paris');
    });

    expect(result.current.processedRows).toHaveLength(1);
    expect(result.current.processedRows[0].City).toBe('Paris');
  });
});
