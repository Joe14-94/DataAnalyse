
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
  // NOUVEAU : Formatage numérique
  decimalPlaces?: number; // 0, 1, 2...
  displayScale?: 'none' | 'thousands' | 'millions' | 'billions'; // k, M, Md
  conditionalFormatting?: ConditionalRule[]; 
}

// --- CHAMPS CALCULÉS ---
export interface CalculatedField {
  id: string;
  name: string;
  formula: string; // Ex: "[Prix] * [Quantite]"
  outputType: 'number' | 'text' | 'boolean';
  unit?: string;
}

// --- ANALYSES SAUVEGARDÉES (NOUVEAU) ---
export interface SavedAnalysis {
  id: string;
  name: string;
  type: 'analytics' | 'pivot';
  datasetId: string;
  config: any; // Stocke la configuration spécifique (JSON)
  createdAt: number;
}

// --- DIAGNOSTICS & TESTS ---
export interface DiagnosticResult {
  id: string;
  name: string;
  status: 'success' | 'failure';
  message?: string;
  expected?: any;
  actual?: any;
}

export interface DiagnosticSuite {
  category: string;
  tests: DiagnosticResult[];
}

// --- STYLES TCD (NOUVEAU) ---
export interface PivotStyleRule {
  id: string;
  targetType: 'row' | 'col' | 'cell' | 'total'; // row=label ligne, col=header, cell=valeur, total=grand total
  targetKey?: string; // La clé spécifique (ex: "2025" ou "France") ou "*" pour tout
  style: {
    textColor?: string;
    backgroundColor?: string;
    fontWeight?: 'normal' | 'bold';
    fontStyle?: 'normal' | 'italic';
    textDecoration?: 'none' | 'underline';
  };
}

// --- FILTRES AVANCÉS (NOUVEAU) ---
export interface FilterRule {
  field: string;
  operator: 'in' | 'starts_with' | 'contains' | 'gt' | 'lt' | 'eq';
  value: any; // Array for 'in', string/number for others
}

// --- JOINTURES MULTIPLES (NOUVEAU) ---
export interface PivotJoin {
  id: string;
  datasetId: string;
  joinKeyPrimary: string;
  joinKeySecondary: string;
}

// --- ETATS PERSISTANTS (PERSISTENCE) ---
export interface PivotState {
  datasetId: string;
  config: {
      rowFields: string[];
      colFields: string[]; // Changed from colField (single) to colFields (array)
      valField: string;
      aggType: string;
      filters: FilterRule[];
      // Data Blending (Nouveau support multi-jointures)
      joins?: PivotJoin[];
      // Deprecated fields kept for migration compatibility
      colField?: string; 
      secondaryDatasetId?: string;
      joinKeyPrimary?: string;
      joinKeySecondary?: string;
      [key: string]: any;
  }; 
}

export interface AnalyticsState {
  datasetId: string;
  config: any; // dimension, metric, filters, etc.
}

// --- NOUVEAUX TYPES POUR LE DASHBOARD ---

export type WidgetType = 'kpi' | 'chart' | 'list' | 'text'; // Ajout de 'text'
export type ChartType = 'bar' | 'column' | 'line' | 'area' | 'pie' | 'donut' | 'radial' | 'radar' | 'treemap' | 'funnel';
export type WidgetSize = 'sm' | 'md' | 'lg' | 'full'; // 1 col, 2 cols, 3 cols, 4 cols
export type WidgetHeight = 'sm' | 'md' | 'lg' | 'xl'; // Hauteur : sm=h-32, md=h-64, lg=h-96, xl=h-[500px]
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
  limit?: number; // Top N (5, 10, 20...)
  
  // Visual Config
  chartType?: ChartType;
  kpiStyle?: KpiStyle;
  target?: number; // Objectif (pour les KPI ou Jauges)
  showTrend?: boolean; // Afficher l'évolution vs période précédente
  
  // Text Config (Nouveau pour WidgetType = 'text')
  textContent?: string;
  textStyle?: {
    align?: 'left' | 'center' | 'right';
    size?: 'normal' | 'large' | 'xl';
    color?: 'default' | 'primary' | 'muted';
  };

  // Filters
  filterField?: string; // Filtre optionnel spécifique au widget
  filterValue?: string;
}

// NOUVEAU : Style personnalisé du widget
export interface WidgetStyle {
  borderColor?: string; // Tailwind class: 'border-slate-200', 'border-blue-500', etc.
  borderWidth?: '0' | '1' | '2' | '4'; // '0', '1' (default), '2', '4'. Note: '1' maps to 'border' class.
}

export interface DashboardWidget {
  id: string;
  title: string;
  type: WidgetType;
  size: WidgetSize;
  height?: WidgetHeight;
  style?: WidgetStyle; // NOUVEAU : Style du conteneur
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
  savedAnalyses?: SavedAnalysis[]; // NOUVEAU : Analyses sauvegardées
  version: string;
  savedMappings?: Record<string, string>; // Dictionnaire Global
  currentDatasetId?: string | null; 
  exportDate?: string; 
  companyLogo?: string; // NOUVEAU : Logo de l'entreprise (Base64)
  hasSeenOnboarding?: boolean; // NOUVEAU : État du tour guidé
  
  // Persistence
  lastPivotState?: PivotState | null;
  lastAnalyticsState?: AnalyticsState | null;
}

export type ViewMode = 'dashboard' | 'import' | 'history' | 'settings';
