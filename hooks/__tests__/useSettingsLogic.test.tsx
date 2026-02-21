
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSettingsLogic } from '../useSettingsLogic';
import * as DataContext from '../../context/DataContext';
import * as ReferentialContext from '../../context/ReferentialContext';
import { ConfirmProvider } from '../../context/ConfirmContext';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';

// Mock contexts
vi.mock('../../context/DataContext', () => ({
  useData: vi.fn(),
}));

vi.mock('../../context/SettingsContext', () => ({
  useSettings: vi.fn(),
}));

vi.mock('../../context/ReferentialContext', () => ({
  useReferentials: vi.fn(),
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
  <ConfirmProvider>
    <BrowserRouter>{children}</BrowserRouter>
  </ConfirmProvider>
);

import * as SettingsContext from '../../context/SettingsContext';

describe('useSettingsLogic', () => {
  it('toggles finance tabs correctly', () => {
    vi.mocked(DataContext.useData).mockReturnValue({
      batches: [],
      datasets: [],
      savedAnalyses: [],
      companyLogo: '',
      resetAllData: vi.fn(),
      importBackup: vi.fn(),
      clearAll: vi.fn(),
      getBackupJson: vi.fn(),
      loadDemoData: vi.fn(),
      deleteDataset: vi.fn(),
      updateDatasetName: vi.fn(),
      deleteAnalysis: vi.fn(),
      updateAnalysis: vi.fn(),
      deleteBatch: vi.fn(),
    } as any);

    vi.mocked(SettingsContext.useSettings).mockReturnValue({
      uiPrefs: {},
      updateUIPrefs: vi.fn(),
      resetUIPrefs: vi.fn(),
    } as any);

    vi.mocked(ReferentialContext.useReferentials).mockReturnValue({
      chartsOfAccounts: [],
      analyticalAxes: [],
      fiscalCalendars: [],
      masterData: [],
      addChartOfAccounts: vi.fn(),
      setDefaultChartOfAccounts: vi.fn(),
      deleteChartOfAccounts: vi.fn(),
      updateChartOfAccounts: vi.fn(),
      addAnalyticalAxis: vi.fn(),
      addFiscalCalendar: vi.fn(),
      addMasterDataItem: vi.fn(),
      importPCGTemplate: vi.fn(),
      importIFRSTemplate: vi.fn(),
    } as any);

    const { result } = renderHook(() => useSettingsLogic(), { wrapper });

    expect(result.current.state.activeFinanceTab).toBe('charts');

    act(() => {
        result.current.dispatch({ type: 'SET_ACTIVE_FINANCE_TAB', payload: 'axes' });
    });

    expect(result.current.state.activeFinanceTab).toBe('axes');
  });

  it('handles diagnostic run', () => {
    vi.useFakeTimers();
    vi.mocked(DataContext.useData).mockReturnValue({} as any);
    vi.mocked(SettingsContext.useSettings).mockReturnValue({} as any);
    vi.mocked(ReferentialContext.useReferentials).mockReturnValue({} as any);

    const { result } = renderHook(() => useSettingsLogic(), { wrapper });

    act(() => {
        result.current.handleRunDiagnostics();
    });

    expect(result.current.state.isRunningDiag).toBe(true);

    act(() => {
        vi.advanceTimersByTime(1000);
    });

    expect(result.current.state.isRunningDiag).toBe(false);
    vi.useRealTimers();
  });
});
