
import { DataRow, FilterRule } from './common';
import { Dataset, FieldConfig } from './dataset';

export type AggregationType = 'count' | 'sum' | 'avg' | 'min' | 'max' | 'list';
export type SortBy = 'label' | 'value' | string;
export type SortOrder = 'asc' | 'desc';
export type DateGrouping = 'none' | 'year' | 'quarter' | 'month';

export interface PivotRow {
  type: 'data' | 'subtotal' | 'grandTotal';
  keys: string[];
  level: number;
  metrics: Record<string, number | string>;
  rowTotal: number | string | Record<string, number | string>;
  label?: string;
  isCollapsed?: boolean;
}

export interface PivotMetric {
  field: string;
  aggType: AggregationType;
  label?: string;
  formatting?: Partial<FieldConfig>;
}

export interface PivotConfig {
  rows: any[];
  rowFields: string[];
  colFields: string[];
  colGrouping: DateGrouping;
  valField: string; // Keep for backward compatibility
  aggType: AggregationType; // Keep for backward compatibility
  metrics?: PivotMetric[];
  filters: FilterRule[];
  sortBy: SortBy;
  sortOrder: SortOrder;
  showSubtotals: boolean;
  showVariations?: boolean;

  currentDataset?: Dataset | null;
  joins?: PivotJoin[];
  datasets?: Dataset[];
  valFormatting?: Partial<FieldConfig>;
  styleRules?: PivotStyleRule[];
  conditionalRules?: ConditionalFormattingRule[];
}

export interface PivotResult {
  colHeaders: string[];
  displayRows: PivotRow[];
  colTotals: Record<string, number | string>;
  grandTotal: number | string | Record<string, number | string>;
}

export interface PivotJoin {
  id: string;
  datasetId: string;
  joinKeyPrimary: string;
  joinKeySecondary: string;
}

export interface PivotSourceConfig {
    id: string;
    datasetId: string;
    isPrimary: boolean;
    joinConfig?: {
        primaryKey: string;
        secondaryKey: string;
    };
    color: string;
}

export interface PivotStyleRule {
  id: string;
  targetType: 'row' | 'col' | 'metric' | 'cell';
  targetKey?: string; // row name, col name or metric label
  targetRowPath?: string[]; // For 'cell' targetType
  targetColLabel?: string; // For 'cell' targetType
  style: {
    textColor?: string;
    backgroundColor?: string;
    fontWeight?: 'normal' | 'bold';
    fontStyle?: 'normal' | 'italic';
  };
}

export interface ConditionalFormattingRule {
  id: string;
  metricLabel?: string; // If undefined, applies to all metrics
  scope?: 'data' | 'totals' | 'all'; // Scope of application
  targetRowPath?: string[]; // Selection-based: specific row path
  targetColLabel?: string; // Selection-based: specific col
  operator: 'gt' | 'lt' | 'eq' | 'between' | 'contains';
  value: number | string;
  value2?: number; // For between
  style: {
    textColor?: string;
    backgroundColor?: string;
    fontWeight?: 'normal' | 'bold';
  };
}

export interface TemporalComparisonSource {
  id: string;
  datasetId: string;
  batchId: string;
  label: string;
  importDate: number;
  year?: number;
}

export interface TemporalComparisonConfig {
  sources: TemporalComparisonSource[];
  referenceSourceId: string;
  periodFilter: {
    startMonth: number;
    endMonth: number;
  };
  deltaFormat: 'value' | 'percentage';
  groupByFields: string[];
  valueField: string;
  aggType: 'sum' | 'count' | 'avg' | 'min' | 'max';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface TemporalComparisonResult {
  groupKey: string;
  groupLabel: string;
  values: { [sourceId: string]: number };
  deltas: { [sourceId: string]: { value: number; percentage: number } };
  details?: { [sourceId: string]: DataRow[] };
  isSubtotal?: boolean;
  subtotalLevel?: number;
}

export interface PivotState {
  datasetId: string;
  config: {
    rowFields: string[];
    colFields: string[];
    valField: string;
    aggType: string;
    metrics?: PivotMetric[];
    filters: FilterRule[];
    joins?: PivotJoin[];
    sources?: PivotSourceConfig[];
    temporalComparison?: TemporalComparisonConfig;
    columnLabels?: Record<string, string>;
    styleRules?: PivotStyleRule[];
    conditionalRules?: ConditionalFormattingRule[];
    [key: string]: any;
  };
}

export interface AnalyticsState {
  datasetId: string;
  config: any; // dimension, metric, filters, etc.
}
