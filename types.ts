
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

export interface Dataset {
  id: string;
  name: string;
  fields: string[]; // Le schéma de ce dataset (liste des noms)
  fieldConfigs?: Record<string, FieldConfig>; // Configuration avancée (optionnelle pour compatibilité)
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
}

export type ViewMode = 'dashboard' | 'import' | 'history' | 'settings';
