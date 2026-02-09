
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBudgetLogic } from '../useBudgetLogic';
import * as BudgetContext from '../../context/BudgetContext';
import * as ReferentialContext from '../../context/ReferentialContext';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';

// Mock contexts
vi.mock('../../context/BudgetContext', () => ({
  useBudget: vi.fn(),
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
  <BrowserRouter>{children}</BrowserRouter>
);

describe('useBudgetLogic', () => {
  const mockBudgets = [
    {
        id: 'b1',
        name: 'Budget 2024',
        fiscalYear: 2024,
        versions: [
            { id: 'v1', name: 'Draft', status: 'draft', lines: [], isActive: true }
        ],
        activeVersionId: 'v1',
        chartOfAccountsId: 'coa1'
    }
  ];

  const mockCharts = [{ id: 'coa1', name: 'PCG', accounts: [] }];

  it('initializes and selects a budget', () => {
    vi.mocked(BudgetContext.useBudget).mockReturnValue({
      budgets: mockBudgets,
      addBudget: vi.fn(),
      updateBudget: vi.fn(),
      deleteBudget: vi.fn(),
      addVersion: vi.fn(),
      addLine: vi.fn(),
      updateLineValue: vi.fn(),
    } as any);

    vi.mocked(ReferentialContext.useReferentials).mockReturnValue({
      chartsOfAccounts: mockCharts,
      fiscalCalendars: [],
    } as any);

    const { result } = renderHook(() => useBudgetLogic(), { wrapper });

    expect(result.current.state.activeTab).toBe('list');

    act(() => {
        result.current.handlers.handleSelectBudget('b1');
    });

    expect(result.current.state.selectedBudgetId).toBe('b1');
    expect(result.current.state.activeTab).toBe('editor');
    expect(result.current.selectedBudget?.name).toBe('Budget 2024');
  });

  it('toggles modals', () => {
    vi.mocked(BudgetContext.useBudget).mockReturnValue({ budgets: mockBudgets } as any);
    vi.mocked(ReferentialContext.useReferentials).mockReturnValue({ chartsOfAccounts: mockCharts } as any);

    const { result } = renderHook(() => useBudgetLogic(), { wrapper });

    act(() => {
        result.current.dispatch({ type: 'TOGGLE_MODAL', payload: { modal: 'showNewBudgetModal', value: true } });
    });

    expect(result.current.state.showNewBudgetModal).toBe(true);
  });
});
