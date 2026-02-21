
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useForecastLogic } from '../useForecastLogic';
import * as ForecastContext from '../../context/ForecastContext';
import * as ReferentialContext from '../../context/ReferentialContext';
import { ConfirmProvider } from '../../context/ConfirmContext';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';

// Mock contexts
vi.mock('../../context/ForecastContext', () => ({
  useForecast: vi.fn(),
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

describe('useForecastLogic', () => {
  it('toggles tabs and selects forecast', () => {
    vi.mocked(ForecastContext.useForecast).mockReturnValue({
      forecasts: [{ id: 'f1', name: 'Forecast 1', versions: [], isRolling: false }],
      reconciliationReports: [],
      addForecast: vi.fn(),
      updateForecast: vi.fn(),
      deleteForecast: vi.fn(),
      addVersion: vi.fn(),
      getRollingSnapshots: vi.fn(() => []),
    } as any);

    vi.mocked(ReferentialContext.useReferentials).mockReturnValue({
      chartsOfAccounts: [],
      fiscalCalendars: [],
    } as any);

    const { result } = renderHook(() => useForecastLogic(), { wrapper });

    expect(result.current.state.activeTab).toBe('list');

    act(() => {
        result.current.handleSelectForecast('f1');
    });

    expect(result.current.state.selectedForecastId).toBe('f1');
    expect(result.current.state.activeTab).toBe('editor');
  });
});
