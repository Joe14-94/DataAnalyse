import React, { createContext, useContext } from 'react';
import { DashboardWidget } from '../types';

interface WidgetContextType {
  dashboardWidgets: DashboardWidget[];
  dashboardFilters: Record<string, any>;
  addDashboardWidget: (widget: Omit<DashboardWidget, 'id'>) => void;
  duplicateDashboardWidget: (id: string) => void;
  updateDashboardWidget: (id: string, updates: Partial<DashboardWidget>) => void;
  removeDashboardWidget: (id: string) => void;
  moveDashboardWidget: (id: string, direction: 'left' | 'right') => void;
  resetDashboard: () => void;
  setDashboardFilter: (field: string, value: any) => void;
  clearDashboardFilters: () => void;
}

export const WidgetContext = createContext<WidgetContextType | undefined>(undefined);

export const useWidgets = () => {
  const context = useContext(WidgetContext);
  if (!context) {
    throw new Error("useWidgets must be used within a WidgetProvider");
  }
  return context;
};