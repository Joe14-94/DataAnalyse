
import { Dataset, ImportBatch } from './dataset';
import { DashboardWidget } from './dashboard';
import { PivotState } from './pivot';
import { FinanceReferentials, BudgetModule, ForecastModule } from './finance';
import { PipelineModule } from './etl';

export interface SavedAnalysis {
  id: string;
  name: string;
  type: 'analytics' | 'pivot';
  datasetId: string;
  config: any;
  createdAt: number;
}

export interface UIPrefs {
  fontSize: number;
  fontFamily: 'sans' | 'serif' | 'mono' | 'outfit' | 'inter';
  density: 'ultra' | 'compact' | 'comfortable';
  sidebarWidth: number;
  theme: 'light' | 'dark';
  style: 'classic' | 'material' | 'glass';
  colorPalette: 'blue' | 'indigo' | 'emerald' | 'rose' | 'amber' | 'slate' | 'teal' | 'violet' | 'orange';
}

export interface DataExplorerState {
  datasetId: string;
  searchTerm: string;
  sortConfig: { key: string; direction: 'asc' | 'desc' } | null;
  columnFilters: Record<string, string>;
  showFilters: boolean;
  columnWidths: Record<string, number>;
  showColumnBorders: boolean;
  trackingKey: string;
  blendingConfig: any | null;
}

export interface AppState {
  datasets: Dataset[];
  batches: ImportBatch[];
  dashboardWidgets: DashboardWidget[];
  savedAnalyses?: SavedAnalysis[];
  version: string;
  savedMappings?: Record<string, string>;
  currentDatasetId?: string | null;
  exportDate?: string;
  companyLogo?: string;
  hasSeenOnboarding?: boolean;
  financeReferentials?: FinanceReferentials;
  budgetModule?: BudgetModule;
  forecastModule?: ForecastModule;
  pipelineModule?: PipelineModule;
  uiPrefs?: UIPrefs;
  lastPivotState?: PivotState | null;
  lastAnalyticsState?: any | null;
  lastDataExplorerState?: DataExplorerState | null;
}

export type ViewMode = 'dashboard' | 'import' | 'history' | 'settings';
