
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAnalysisStudioLogic } from '../useAnalysisStudioLogic';
import * as DataContext from '../../context/DataContext';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';

// Mock context and router
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

describe('useAnalysisStudioLogic', () => {
  const mockDatasets = [
    { id: 'ds1', name: 'Sales', fields: ['Category', 'Value'], fieldConfigs: { Value: { type: 'number' } } }
  ];

  const mockBatches = [
    {
      id: 'b1',
      datasetId: 'ds1',
      date: '2024-01-01',
      rows: [
        { id: 'r1', Category: 'A', Value: 100 },
        { id: 'r2', Category: 'B', Value: 200 },
        { id: 'r3', Category: 'A', Value: 50 },
      ]
    }
  ];

  it('initializes with default state', () => {
    vi.mocked(DataContext.useData).mockReturnValue({
      batches: mockBatches,
      currentDataset: mockDatasets[0],
      currentDatasetId: 'ds1',
      datasets: mockDatasets,
      addDashboardWidget: vi.fn(),
      savedAnalyses: [],
      saveAnalysis: vi.fn(),
      switchDataset: vi.fn(),
      companyLogo: '',
    } as any);

    const { result } = renderHook(() => useAnalysisStudioLogic(), { wrapper });

    expect(result.current.state.mode).toBe('snapshot');
    expect(result.current.state.dimension).toBe('Category');
    expect(result.current.state.metric).toBe('count');
  });

  it('calculates snapshot data correctly', () => {
    vi.mocked(DataContext.useData).mockReturnValue({
      batches: mockBatches,
      currentDataset: mockDatasets[0],
      currentDatasetId: 'ds1',
      datasets: mockDatasets,
      addDashboardWidget: vi.fn(),
      savedAnalyses: [],
      saveAnalysis: vi.fn(),
      switchDataset: vi.fn(),
      companyLogo: '',
    } as any);

    const { result } = renderHook(() => useAnalysisStudioLogic(), { wrapper });

    // Initial state: metric=count, dimension=Category
    expect(result.current.snapshotData.data).toHaveLength(2);
    const categoryA = result.current.snapshotData.data.find(d => d.name === 'A');
    expect(categoryA?.value).toBe(2); // Two rows for A
  });

  it('updates data when metric changes to sum', () => {
    vi.mocked(DataContext.useData).mockReturnValue({
      batches: mockBatches,
      currentDataset: mockDatasets[0],
      currentDatasetId: 'ds1',
      datasets: mockDatasets,
      addDashboardWidget: vi.fn(),
      savedAnalyses: [],
      saveAnalysis: vi.fn(),
      switchDataset: vi.fn(),
      companyLogo: '',
    } as any);

    const { result } = renderHook(() => useAnalysisStudioLogic(), { wrapper });

    act(() => {
      result.current.dispatch({ type: 'SET_METRIC', payload: { target: 1, metric: 'sum' } });
      result.current.dispatch({ type: 'SET_VALUE_FIELD', payload: { target: 1, field: 'Value' } });
    });

    const categoryA = result.current.snapshotData.data.find(d => d.name === 'A');
    expect(categoryA?.value).toBe(150); // 100 + 50
  });

  it('applies filters correctly', () => {
    vi.mocked(DataContext.useData).mockReturnValue({
      batches: mockBatches,
      currentDataset: mockDatasets[0],
      currentDatasetId: 'ds1',
      datasets: mockDatasets,
      addDashboardWidget: vi.fn(),
      savedAnalyses: [],
      saveAnalysis: vi.fn(),
      switchDataset: vi.fn(),
      companyLogo: '',
    } as any);

    const { result } = renderHook(() => useAnalysisStudioLogic(), { wrapper });

    act(() => {
      result.current.dispatch({
        type: 'SET_FILTERS',
        payload: [{ field: 'Category', operator: 'eq', value: 'B' }]
      });
    });

    expect(result.current.snapshotData.data).toHaveLength(1);
    expect(result.current.snapshotData.data[0].name).toBe('B');
  });
});
