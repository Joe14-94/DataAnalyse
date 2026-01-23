
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

  // Finance Referentials (NOUVEAU)
  financeReferentials?: FinanceReferentials;

  // Persistence
  lastPivotState?: PivotState | null;
  lastAnalyticsState?: AnalyticsState | null;
}

export type ViewMode = 'dashboard' | 'import' | 'history' | 'settings';

// --- RÉFÉRENTIELS FINANCE ---

// Type de compte (nature comptable)
export type AccountNature = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

// Type de compte dans le P&L
export type PLCategory = 'revenue' | 'cogs' | 'opex' | 'depreciation' | 'financial' | 'exceptional' | 'tax';

// Compte du plan comptable
export interface Account {
  id: string;
  code: string;                    // Ex: "6011", "411000"
  label: string;                   // Ex: "Achats matières premières"
  nature: AccountNature;           // asset, liability, revenue, expense...
  level: number;                   // Niveau hiérarchique (1=classe, 2=compte, 3=sous-compte...)
  parentCode?: string;             // Code du compte parent (hiérarchie)
  plCategory?: PLCategory;         // Catégorie P&L (revenue, COGS, OPEX...)
  isActive: boolean;               // Actif ou archivé
  canReceiveEntries: boolean;      // Peut recevoir des écritures (false pour comptes de regroupement)
  createdAt: number;
}

// Plan comptable complet
export interface ChartOfAccounts {
  id: string;
  name: string;                    // Ex: "PCG 2020", "IFRS", "US GAAP"
  standard: string;                // Ex: "PCG", "IFRS", "CUSTOM"
  accounts: Account[];
  createdAt: number;
  isDefault: boolean;              // Plan comptable par défaut
}

// Axe analytique (dimension d'analyse)
export interface AnalyticalAxis {
  id: string;
  code: string;                    // Ex: "CC", "PRJ", "BU"
  name: string;                    // Ex: "Centre de coûts", "Projet", "Business Unit"
  isMandatory: boolean;            // Obligatoire sur les écritures
  allowMultiple: boolean;          // Permet affectation multiple (ex: 50% CC1 + 50% CC2)
  level: number;                   // Ordre d'affichage
  isActive: boolean;
  createdAt: number;
}

// Valeur d'un axe analytique
export interface AxisValue {
  id: string;
  axisId: string;                  // ID de l'axe parent
  code: string;                    // Ex: "CC-001", "PRJ-2025-01"
  label: string;                   // Ex: "Direction Générale", "Projet Alpha"
  parentId?: string;               // Pour hiérarchies (ex: sous-centre de coûts)
  responsibleName?: string;        // Nom du responsable
  responsibleEmail?: string;       // Email du responsable
  isActive: boolean;
  budget?: number;                 // Budget annuel affecté (optionnel)
  createdAt: number;
}

// Période fiscale
export interface FiscalPeriod {
  id: string;
  code: string;                    // Ex: "2025-01", "2025-Q1"
  name: string;                    // Ex: "Janvier 2025", "T1 2025"
  type: 'month' | 'quarter' | 'year' | 'custom';
  fiscalYear: number;              // Ex: 2025
  startDate: string;               // YYYY-MM-DD
  endDate: string;                 // YYYY-MM-DD
  isClosed: boolean;               // Période clôturée (plus de saisie)
  closeDate?: string;              // Date de clôture
  is13thPeriod?: boolean;          // Période 13 pour écritures de clôture
  createdAt: number;
}

// Référentiel maître (client, fournisseur, produit...)
export type MasterDataType = 'customer' | 'supplier' | 'product' | 'employee' | 'entity' | 'other';

export interface MasterDataItem {
  id: string;
  type: MasterDataType;
  code: string;                    // Ex: "CLI-001", "FOUR-042"
  name: string;                    // Ex: "TechCorp SAS"
  category?: string;               // Catégorie libre (ex: "Grand compte", "PME")
  taxId?: string;                  // SIREN/SIRET, VAT number
  address?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  paymentTerms?: number;           // Délai de paiement (jours)
  creditLimit?: number;            // Limite de crédit autorisée
  isActive: boolean;
  customFields?: Record<string, any>;  // Champs custom métier
  createdAt: number;
}

// Calendrier fiscal (ensemble des périodes)
export interface FiscalCalendar {
  id: string;
  name: string;                    // Ex: "Calendrier 2025"
  fiscalYear: number;
  startDate: string;               // Début exercice (ex: "2025-01-01" ou "2024-07-01")
  endDate: string;                 // Fin exercice
  periods: FiscalPeriod[];
  createdAt: number;
}

// Règle de reclassement (mapping de comptes)
export interface AccountReclassification {
  id: string;
  name: string;                    // Ex: "PCG vers Reporting P&L"
  sourceAccountCode: string;       // Compte source
  targetAccountCode?: string;      // Compte cible (si mapping 1-to-1)
  targetPLCategory?: PLCategory;   // Catégorie P&L cible
  targetLabel?: string;            // Libellé cible
  isActive: boolean;
  createdAt: number;
}

// Extension de AppState pour inclure les référentiels
export interface FinanceReferentials {
  chartOfAccounts?: ChartOfAccounts[];      // Plans comptables
  analyticalAxes?: AnalyticalAxis[];        // Axes analytiques
  axisValues?: AxisValue[];                 // Valeurs d'axes
  fiscalCalendars?: FiscalCalendar[];       // Calendriers fiscaux
  masterData?: MasterDataItem[];            // Référentiels maîtres
  reclassifications?: AccountReclassification[];  // Règles de reclassement
}
