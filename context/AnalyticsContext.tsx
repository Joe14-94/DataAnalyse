import React, { createContext, useContext } from 'react';
import { SavedAnalysis, PivotState, AnalyticsState, DataExplorerState } from '../types';

interface AnalyticsContextType {
  savedAnalyses: SavedAnalysis[];
  lastPivotState: PivotState | null;
  lastAnalyticsState: AnalyticsState | null;
  lastDataExplorerState: DataExplorerState | null;
  saveAnalysis: (analysis: Omit<SavedAnalysis, 'id' | 'createdAt'>) => void;
  updateAnalysis: (id: string, updates: Partial<SavedAnalysis>) => void;
  deleteAnalysis: (id: string) => void;
  savePivotState: (state: PivotState | null) => void;
  saveAnalyticsState: (state: AnalyticsState | null) => void;
  saveDataExplorerState: (state: DataExplorerState | null) => void;
}

export const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

export const useAnalytics = () => {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
};
