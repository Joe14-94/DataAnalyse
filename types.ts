
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

// --- PREFERENCES UI (NOUVEAU) ---
export interface UIPrefs {
  fontSize: number; // Taille de police de base en px (ex: 10, 12, 14, 16)
  fontFamily: 'sans' | 'serif' | 'mono' | 'outfit' | 'inter';
  density: 'ultra' | 'compact' | 'comfortable';
  sidebarWidth: number; // Largeur en px
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
  budgetModule?: BudgetModule; // NOUVEAU : Module budgétaire
  forecastModule?: ForecastModule; // NOUVEAU : Module forecast & rolling forecast
  pipelineModule?: PipelineModule; // NOUVEAU : Module pipeline ETL
  uiPrefs?: UIPrefs; // NOUVEAU : Préférences de style globales

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
  category?: string;               // Catégorie (niveau 1 de hiérarchie)
  subCategory?: string;            // Sous-catégorie (niveau 2 de hiérarchie)
  parentId?: string;               // Pour hiérarchies alternatives (ex: sous-centre de coûts)
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

// ============================================================================
// BUDGET MODULE - F3.1
// ============================================================================

// Statuts du workflow budgétaire
export type BudgetStatus = 'draft' | 'submitted' | 'validated' | 'rejected' | 'locked';

// Type de scénario budgétaire
export type BudgetScenario = 'realistic' | 'optimistic' | 'pessimistic' | 'custom';

// Type de formule pour cellule budgétaire
export type BudgetFormulaType = 'fixed' | 'growth' | 'index' | 'formula' | 'spread';

// Ligne budgétaire individuelle
export interface BudgetLine {
  id: string;
  accountCode: string;              // Code compte du plan comptable
  accountLabel?: string;            // Libellé (cache)
  analyticalBreakdown?: {           // Ventilation analytique
    [axisCode: string]: string;     // Ex: { CC: "CC-001", PRJ: "PRJ-2025" }
  };
  periodValues: {                   // Valeurs par période
    [periodId: string]: number;     // Ex: { "2025-01": 10000, "2025-02": 12000 }
  };
  formulas?: {                      // Formules par période
    [periodId: string]: {
      type: BudgetFormulaType;
      value?: number;               // Pour growth: % / Pour index: coefficient
      baseValue?: number;           // Valeur de référence
      expression?: string;          // Pour formules complexes
    };
  };
  comment?: string;                 // Commentaire ligne
  isLocked: boolean;                // Ligne verrouillée
  createdAt: number;
  updatedAt: number;
}

// Version budgétaire
export interface BudgetVersion {
  id: string;
  budgetId: string;                 // ID du budget parent
  versionNumber: number;            // V1, V2, V3...
  name: string;                     // Ex: "V1 - Initial", "V2 - Ajusté Mars"
  scenario: BudgetScenario;         // Scénario
  status: BudgetStatus;             // Statut workflow
  lines: BudgetLine[];              // Lignes budgétaires
  isActive: boolean;                // Version active
  submittedBy?: string;             // Email soumissionnaire
  submittedAt?: number;             // Date soumission
  validatedBy?: string;             // Email validateur
  validatedAt?: number;             // Date validation
  rejectionReason?: string;         // Raison du rejet
  comment?: string;                 // Commentaire version
  createdAt: number;
  updatedAt: number;
}

// Commentaire sur ligne budgétaire
export interface BudgetComment {
  id: string;
  budgetId: string;
  versionId: string;
  lineId?: string;                  // Si commentaire sur ligne spécifique
  author: string;                   // Email auteur
  content: string;                  // Contenu commentaire
  isResolved: boolean;              // Marqué comme résolu
  createdAt: number;
}

// Notification/Relance budgétaire
export interface BudgetNotification {
  id: string;
  budgetId: string;
  type: 'reminder' | 'submission' | 'validation' | 'rejection';
  recipient: string;                // Email destinataire
  subject: string;
  message: string;
  isRead: boolean;
  sentAt: number;
}

// Template budgétaire réutilisable
export interface BudgetTemplate {
  id: string;
  name: string;                     // Ex: "Budget Marketing", "Budget RH"
  description?: string;
  category?: string;                // Ex: "Département", "Projet", "Activité"
  accountCodes: string[];           // Comptes utilisés
  analyticalAxes?: string[];        // Axes analytiques requis
  defaultFormulas?: {               // Formules par défaut
    [accountCode: string]: {
      type: BudgetFormulaType;
      value?: number;
    };
  };
  isActive: boolean;
  createdAt: number;
}

// Budget principal
export interface Budget {
  id: string;
  name: string;                     // Ex: "Budget 2025", "Budget Marketing Q1"
  fiscalYear: number;               // Année fiscale
  fiscalCalendarId?: string;        // Calendrier fiscal utilisé
  chartOfAccountsId: string;        // Plan comptable
  analyticalDimensions?: string[];  // Axes analytiques utilisés
  templateId?: string;              // Template source (si créé depuis template)
  versions: BudgetVersion[];        // Versions du budget
  activeVersionId?: string;         // Version active
  startDate: string;                // Date début (YYYY-MM-DD)
  endDate: string;                  // Date fin (YYYY-MM-DD)
  owner: string;                    // Email propriétaire
  contributors?: string[];          // Emails contributeurs
  validators?: string[];            // Emails validateurs
  dueDate?: string;                 // Date limite de soumission
  isLocked: boolean;                // Budget verrouillé
  createdAt: number;
  updatedAt: number;
}

// Comparaison de versions
export interface BudgetVersionComparison {
  version1: BudgetVersion;
  version2: BudgetVersion;
  differences: {
    lineId: string;
    accountCode: string;
    periodId: string;
    value1: number;
    value2: number;
    variance: number;
    variancePercent: number;
  }[];
}

// Module budgétaire complet
export interface BudgetModule {
  budgets: Budget[];
  templates: BudgetTemplate[];
  comments: BudgetComment[];
  notifications: BudgetNotification[];
}

// ============================================================================
// FORECAST & ROLLING FORECAST MODULE - F3.2
// ============================================================================

// Type de forecast
export type ForecastType = 'monthly' | 'quarterly' | 'yearly';

// Type de méthode de prévision
export type ForecastMethod = 'manual' | 'copy_actual' | 'driver_based' | 'ml_prediction' | 'trend' | 'seasonal';

// Statut du forecast
export type ForecastStatus = 'draft' | 'submitted' | 'validated' | 'locked';

// Inducteur (driver) pour forecast driver-based
export interface ForecastDriver {
  id: string;
  name: string;                      // Ex: "Volume de ventes", "Prix unitaire"
  unit?: string;                     // Ex: "unités", "€/unité"
  historicalValues: {                // Valeurs historiques
    [periodId: string]: number;
  };
  forecastValues: {                  // Valeurs prévisionnelles
    [periodId: string]: number;
  };
}

// Ligne de forecast individuelle
export interface ForecastLine {
  id: string;
  accountCode: string;               // Code compte
  accountLabel?: string;             // Libellé (cache)
  method: ForecastMethod;            // Méthode utilisée

  // Valeurs prévisionnelles par période
  forecastValues: {
    [periodId: string]: number;      // Ex: { "2025-01": 10000, "2025-02": 12000 }
  };

  // Valeurs réelles (pour comparaison)
  actualValues?: {
    [periodId: string]: number;
  };

  // Pour forecast driver-based
  drivers?: {
    driverId: string;
    formula: string;                 // Ex: "[volume] * [price]"
  }[];

  // Pour forecast ML
  mlPrediction?: {
    confidence: number;              // 0-100%
    lowerBound: {                    // Intervalle de confiance inférieur
      [periodId: string]: number;
    };
    upperBound: {                    // Intervalle de confiance supérieur
      [periodId: string]: number;
    };
    seasonalityDetected?: boolean;
    trend?: 'increasing' | 'decreasing' | 'stable';
  };

  comment?: string;                  // Commentaire
  isLocked: boolean;                 // Ligne verrouillée
  createdAt: number;
  updatedAt: number;
}

// Version de forecast
export interface ForecastVersion {
  id: string;
  forecastId: string;                // ID du forecast parent
  versionNumber: number;             // V1, V2, V3...
  name: string;                      // Ex: "V1 - Janvier 2025"
  referenceDate: string;             // Date de référence (YYYY-MM-DD)
  status: ForecastStatus;
  lines: ForecastLine[];
  isActive: boolean;                 // Version active
  submittedBy?: string;
  submittedAt?: number;
  validatedBy?: string;
  validatedAt?: number;
  comment?: string;
  createdAt: number;
  updatedAt: number;
}

// Rolling Forecast - historique des snapshots
export interface RollingForecastSnapshot {
  id: string;
  forecastId: string;
  snapshotDate: string;              // Date du snapshot (YYYY-MM-DD)
  periodStart: string;               // Début de la fenêtre (YYYY-MM-DD)
  periodEnd: string;                 // Fin de la fenêtre (YYYY-MM-DD)
  data: ForecastLine[];              // Données du snapshot
  createdAt: number;
}

// Analyse de variance Forecast vs Réalisé
export interface ForecastVarianceAnalysis {
  accountCode: string;
  accountLabel?: string;
  period: string;                    // YYYY-MM
  forecastValue: number;
  actualValue: number;
  variance: number;                  // actual - forecast
  variancePercent: number;           // (variance / forecast) * 100
  reason?: string;                   // Raison de l'écart
}

// Forecast principal
export interface Forecast {
  id: string;
  name: string;                      // Ex: "Forecast 2025", "Rolling Forecast Q1"
  type: ForecastType;                // monthly, quarterly, yearly
  fiscalYear: number;
  chartOfAccountsId: string;         // Plan comptable
  fiscalCalendarId?: string;         // Calendrier fiscal

  // Pour rolling forecast
  isRolling: boolean;                // Si c'est un rolling forecast
  rollingHorizonMonths?: number;     // Ex: 12 mois (toujours 12 mois devant)
  autoUpdateEnabled?: boolean;       // Actualisation automatique
  lastUpdateDate?: string;           // Dernière actualisation

  // Drivers pour forecast driver-based
  drivers: ForecastDriver[];

  // Versions
  versions: ForecastVersion[];
  activeVersionId?: string;

  // Snapshots pour rolling forecast
  rollingSnapshots?: RollingForecastSnapshot[];

  // Configuration ML
  mlConfig?: {
    enabled: boolean;
    method: 'arima' | 'trend' | 'seasonal' | 'hybrid';
    lookbackMonths: number;          // Historique à considérer
    confidenceLevel: number;         // Ex: 95
  };

  owner: string;
  validators?: string[];
  isLocked: boolean;
  createdAt: number;
  updatedAt: number;
}

// Rapport de réconciliation Forecast vs Réalisé
export interface ForecastReconciliationReport {
  id: string;
  forecastId: string;
  forecastVersionId: string;
  periodStart: string;               // YYYY-MM-DD
  periodEnd: string;                 // YYYY-MM-DD
  variances: ForecastVarianceAnalysis[];

  // Métriques globales
  totalForecast: number;
  totalActual: number;
  totalVariance: number;
  totalVariancePercent: number;

  // Précision du modèle
  mape?: number;                     // Mean Absolute Percentage Error
  rmse?: number;                     // Root Mean Square Error

  recommendations?: string[];        // Recommandations d'amélioration
  createdAt: number;
}

// Module forecast complet
export interface ForecastModule {
  forecasts: Forecast[];
  reconciliationReports: ForecastReconciliationReport[];
}

// ============================================================================
// ETL PIPELINE MODULE - F6.1
// ============================================================================

// Types de transformations disponibles
export type TransformationType =
  | 'source'           // Nœud source (dataset)
  | 'filter'           // Filtre WHERE
  | 'join'             // Jointure
  | 'aggregate'        // Agrégation GROUP BY
  | 'union'            // Union de datasets
  | 'pivot'            // Pivot
  | 'unpivot'          // Unpivot
  | 'split'            // Split colonnes
  | 'merge'            // Merge colonnes
  | 'calculate'        // Colonne calculée
  | 'sort'             // Tri
  | 'distinct'         // Dédoublonnage
  | 'rename'           // Renommer colonnes
  | 'select';          // Sélectionner colonnes

// Type de jointure
export type JoinType = 'inner' | 'left' | 'right' | 'full';

// Type d'agrégation
export type AggregationType = 'sum' | 'avg' | 'count' | 'min' | 'max' | 'first' | 'last';

// Opérateur de filtre
export type FilterOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'less_than'
  | 'greater_or_equal'
  | 'less_or_equal'
  | 'is_empty'
  | 'is_not_empty';

// Configuration de filtre
export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value?: any;
  caseSensitive?: boolean;
}

// Configuration de jointure
export interface JoinConfig {
  type: JoinType;
  leftKey: string;
  rightKey: string;
  rightNodeId: string;  // ID du nœud à joindre
  suffix?: string;      // Suffixe pour les colonnes dupliquées
}

// Configuration d'agrégation
export interface AggregateConfig {
  groupBy: string[];
  aggregations: {
    field: string;
    operation: AggregationType;
    alias?: string;
  }[];
}

// Configuration de pivot
export interface PivotConfig {
  index: string;        // Colonne qui devient les lignes
  columns: string;      // Colonne qui devient les colonnes
  values: string;       // Colonne qui devient les valeurs
  aggFunc: AggregationType;
}

// Configuration d'unpivot
export interface UnpivotConfig {
  idVars: string[];     // Colonnes à garder fixes
  valueVars: string[];  // Colonnes à unpivot
  varName: string;      // Nom de la colonne variable
  valueName: string;    // Nom de la colonne valeur
}

// Configuration de split
export interface SplitConfig {
  column: string;
  separator: string;
  newColumns: string[];
  limit?: number;       // Nombre max de splits
}

// Configuration de merge
export interface MergeConfig {
  columns: string[];
  newColumn: string;
  separator: string;
}

// Configuration de calcul
export interface CalculateConfig {
  newColumn: string;
  formula: string;      // Ex: "[Prix] * [Quantité]"
  type: 'number' | 'text' | 'boolean';
}

// Configuration de tri
export interface SortConfig {
  fields: {
    field: string;
    direction: 'asc' | 'desc';
  }[];
}

// Configuration de sélection de colonnes
export interface SelectConfig {
  columns: string[];    // Colonnes à garder
  exclude?: boolean;    // Si true, exclure ces colonnes au lieu de les inclure
}

// Configuration de renommage
export interface RenameConfig {
  mappings: {
    oldName: string;
    newName: string;
  }[];
}

// Union de toutes les configurations
export type TransformationConfig =
  | { type: 'source'; datasetId: string }
  | { type: 'filter'; conditions: FilterCondition[]; combineWith: 'AND' | 'OR' }
  | { type: 'join'; config: JoinConfig }
  | { type: 'aggregate'; config: AggregateConfig }
  | { type: 'union'; rightNodeId: string }
  | { type: 'pivot'; config: PivotConfig }
  | { type: 'unpivot'; config: UnpivotConfig }
  | { type: 'split'; config: SplitConfig }
  | { type: 'merge'; config: MergeConfig }
  | { type: 'calculate'; config: CalculateConfig }
  | { type: 'sort'; config: SortConfig }
  | { type: 'distinct' }
  | { type: 'select'; config: SelectConfig }
  | { type: 'rename'; config: RenameConfig };

// Position d'un nœud dans le canvas
export interface NodePosition {
  x: number;
  y: number;
}

// Nœud de transformation dans le pipeline
export interface PipelineNode {
  id: string;
  type: TransformationType;
  label: string;
  position: NodePosition;
  config: TransformationConfig;
  isValid: boolean;             // Si la configuration est valide
  error?: string;               // Message d'erreur si invalide
}

// Connexion entre deux nœuds
export interface PipelineConnection {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  fromPort?: string;            // Pour les nœuds avec plusieurs sorties
  toPort?: string;              // Pour les nœuds avec plusieurs entrées
}

// Résultat d'exécution d'un nœud
export interface NodeExecutionResult {
  nodeId: string;
  data: DataRow[];
  rowCount: number;
  columnCount: number;
  columns: string[];
  executionTime: number;        // en ms
  error?: string;
}

// Pipeline complet
export interface Pipeline {
  id: string;
  name: string;
  description?: string;
  nodes: PipelineNode[];
  connections: PipelineConnection[];
  outputNodeId?: string;        // Nœud de sortie principal
  createdAt: number;
  updatedAt: number;
  lastExecuted?: number;
}

// Module pipeline
export interface PipelineModule {
  pipelines: Pipeline[];
  executionResults: {
    [pipelineId: string]: {
      [nodeId: string]: NodeExecutionResult;
    };
  };
}
