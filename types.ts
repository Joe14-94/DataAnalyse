

export interface DataRow {
  id: string;
  [key: string]: any; // Permet des champs dynamiques
}

export interface RawImportData {
  headers: string[];
  rows: string[][];
  totalRows: number;
}

export interface FieldConfig {
  type: 'text' | 'number' | 'boolean';
  unit?: string; // Ex: "k€", "kg", "%"
}

// --- NOUVEAUX TYPES POUR LE DASHBOARD ---

export type WidgetType = 'kpi' | 'chart';
export type ChartType = 'bar' | 'line' | 'area' | 'pie' | 'donut';
export type WidgetSize = 'sm' | 'md' | 'lg' | 'full'; // 1 col, 2 cols, 3 cols, 4 cols

export interface WidgetConfig {
  metric: 'count' | 'sum' | 'avg' | 'distinct';
  dimension?: string; // Champ utilisé pour l'axe X ou le groupement
  valueField?: string; // Champ utilisé pour le calcul (si sum/avg)
  chartType?: ChartType;
  target?: number; // Objectif (pour les KPI)
  showTrend?: boolean; // Afficher l'évolution vs période précédente
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
  fieldConfigs?: Record<string, FieldConfig>; // Configuration avancée (optionnelle pour compatibilité)
  widgets?: DashboardWidget[]; // Configuration du dashboard liée au dataset
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
  version: string;
  savedMappings?: Record<string, string>; // Dictionnaire Global [Nom Colonne CSV] -> [Nom Champ Système]
  fields?: string[]; // Deprecated
  currentDatasetId?: string | null; // ID du dataset actif lors de la sauvegarde
  exportDate?: string; // Date de l'export pour traçabilité
}

export type ViewMode = 'dashboard' | 'import' | 'history' | 'settings';
