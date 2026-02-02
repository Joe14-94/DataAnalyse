
export type WidgetType = 'kpi' | 'chart' | 'list' | 'text' | 'report';
export type ChartType = 'bar' | 'column' | 'line' | 'area' | 'pie' | 'donut' | 'radial' | 'radar' | 'treemap' | 'sunburst' | 'funnel' | 'stacked-bar' | 'stacked-column' | 'stacked-area' | 'percent-bar' | 'percent-column';
export type WidgetSize = 'sm' | 'md' | 'lg' | 'full';
export type WidgetHeight = 'sm' | 'md' | 'lg' | 'xl';
export type KpiStyle = 'simple' | 'trend' | 'progress';

export type ColorMode = 'single' | 'gradient' | 'multi';
export type ColorPalette = 'default' | 'pastel' | 'vibrant';

export interface SecondarySourceConfig {
  datasetId: string;
  joinFieldPrimary: string;
  joinFieldSecondary: string;
}

export interface WidgetSource {
  datasetId: string;
  mode: 'latest' | 'specific' | 'temporal';
  batchId?: string;
}

export interface PivotChartConfig {
  pivotConfig: any; // Using any here to avoid circular dependencies if needed, or proper import
  isTemporalMode?: boolean;
  temporalComparison?: any;
  updateMode?: 'fixed' | 'latest';
  chartType: ChartType;
  hierarchyLevel?: number;
  limit?: number;
  sortBy?: 'name' | 'value' | 'none';
  sortOrder?: 'asc' | 'desc';
  colorMode?: ColorMode;
  colorPalette?: ColorPalette;
  singleColor?: string;
  gradientStart?: string;
  gradientEnd?: string;
}

export interface SpecificDashboardItem {
  id: string;
  label: string;
  value: number | string;
  rowPath: string[];
  colLabel: string;
  metricLabel: string;
  color?: string;
}

export interface WidgetConfig {
  reportItems?: SpecificDashboardItem[]; // For 'report' type
  source?: WidgetSource;
  sources?: WidgetSource[]; // Nouveau : Support multi-sources natif
  secondarySource?: SecondarySourceConfig;
  metric?: 'count' | 'sum' | 'avg' | 'distinct';
  dimension?: string;
  valueField?: string;
  limit?: number;
  chartType?: ChartType;
  kpiStyle?: KpiStyle;
  target?: number;
  showTrend?: boolean;
  pivotChart?: PivotChartConfig;

  // Color Config (pour widgets simples)
  colorMode?: ColorMode; // 'multi' | 'single' | 'gradient'
  colorPalette?: ColorPalette; // 'default' | 'pastel' | 'vibrant'
  singleColor?: string; // Couleur unique (mode 'single')
  gradientStart?: string; // Couleur début (mode 'gradient')
  gradientEnd?: string; // Couleur fin (mode 'gradient')

  textContent?: string;
  textStyle?: {
    align?: 'left' | 'center' | 'right';
    size?: 'normal' | 'large' | 'xl';
    color?: 'default' | 'primary' | 'muted';
  };
  filterField?: string;
  filterValue?: string;
}

export interface WidgetStyle {
  borderColor?: string;
  borderWidth?: '0' | '1' | '2' | '4';
}

export interface DashboardWidget {
  id: string;
  title: string;
  type: WidgetType;
  size: WidgetSize;
  height?: WidgetHeight;
  style?: WidgetStyle;
  config: WidgetConfig;
}
