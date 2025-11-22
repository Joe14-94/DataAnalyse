
export interface DataRow {
  id: string;
  [key: string]: any; // Permet des champs dynamiques
}

export interface RawImportData {
  headers: string[];
  rows: string[][];
  totalRows: number;
}

// --- FORMATAGE CONDITIONNEL ---
export interface ConditionalRule {
  id: string;
  operator: 'gt' | 'lt' | 'eq' | 'contains' | 'empty';
  value: string | number;
  style: {
    color?: string; // Text color class (ex: text-red-600)
    backgroundColor?: string; // Bg color class (ex: bg-red-100)
    fontWeight?: string; // font-bold
  };
}

export interface FieldConfig {
  type: 'text' | 'number' | 'boolean' | 'date';
  unit?: string; // Ex: "k€", "kg", "%"
  conditionalFormatting?: ConditionalRule[]; // NOUVEAU
}

// --- CHAMPS CALCULÉS ---
export interface CalculatedField {
  id: string;
  name: string;
  formula: string; // Ex: "[Prix] * [Quantite]"
  outputType: 'number' | 'text' | 'boolean';
  unit?: string;
}

// --- NOUVEAUX TYPES POUR LE DASHBOARD ---

export type WidgetType = 'kpi' | 'chart' | 'list';
export type ChartType = 'bar' | 'line' | 'area' | 'pie' | 'donut' | 'radial' | 'radar' | 'treemap' | 'funnel';
export type WidgetSize = 'sm' | 'md' | 'lg' | 'full'; // 1 col, 2 cols, 3 cols, 4 cols
export type KpiStyle = 'simple' | 'trend' | 'progress';

export interface SecondarySourceConfig {
  datasetId: string;
  joinFieldPrimary: string; // Champ dans la source principale (ex: "Equipe")
  joinFieldSecondary: string; // Champ dans la source secondaire (ex: "NomEquipe")
}

export interface WidgetSource {
  datasetId: string;
  mode: 'latest' | 'specific';
  batchId?: string; // Requis si mode === 'specific'
}

export interface WidgetConfig {
  // Source Config
  source?: WidgetSource; 
  secondarySource?: SecondarySourceConfig; // NOUVEAU : Pour le croisement de données
  
  // Data Config
  metric: 'count' | 'sum' | 'avg' | 'distinct';
  dimension?: string; // Champ utilisé pour l'axe X ou le groupement
  valueField?: string; // Champ utilisé pour le calcul (si sum/avg)
  
  // Visual Config
  chartType?: ChartType;
  kpiStyle?: KpiStyle;
  target?: number; // Objectif (pour les KPI ou Jauges)
  showTrend?: boolean; // Afficher l'évolution vs période précédente
  
  // Filters
  filterField?: string; // Filtre optionnel spécifique au widget
  filterValue?: string;
}

export interface DashboardWidget {
  id: string;
  title: string;
  type: WidgetType;
  size: WidgetSize;
  config: WidgetConfig;
}

export interface Dataset {
  id: string;
  name: string;
  fields: string[]; // Le schéma de ce dataset (liste des noms)
  fieldConfigs?: Record<string, FieldConfig>; // Configuration avancée
  calculatedFields?: CalculatedField[]; // NOUVEAU : Champs calculés
  createdAt: number;
}

export interface ImportBatch {
  id: string;
  datasetId: string; // Lien vers le dataset parent
  date: string; // ISO Date string YYYY-MM-DD
  createdAt: number; // Timestamp for sorting
  rows: DataRow[];
}

export interface AppState {
  datasets: Dataset[]; // Liste des jeux de données
  batches: ImportBatch[];
  dashboardWidgets: DashboardWidget[]; // Widgets globaux du tableau de bord
  version: string;
  savedMappings?: Record<string, string>; // Dictionnaire Global
  currentDatasetId?: string | null; 
  exportDate?: string; 
}

export type ViewMode = 'dashboard' | 'import' | 'history' | 'settings';
