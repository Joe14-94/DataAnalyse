
export type AccountNature = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
export type PLCategory = 'revenue' | 'cogs' | 'opex' | 'depreciation' | 'financial' | 'exceptional' | 'tax';

export interface Account {
  id: string;
  code: string;
  label: string;
  nature: AccountNature;
  level: number;
  parentCode?: string;
  plCategory?: PLCategory;
  isActive: boolean;
  canReceiveEntries: boolean;
  createdAt: number;
}

export interface ChartOfAccounts {
  id: string;
  name: string;
  standard: string;
  accounts: Account[];
  createdAt: number;
  isDefault: boolean;
}

export interface AnalyticalAxis {
  id: string;
  code: string;
  name: string;
  isMandatory: boolean;
  allowMultiple: boolean;
  level: number;
  isActive: boolean;
  createdAt: number;
}

export interface AxisValue {
  id: string;
  axisId: string;
  code: string;
  label: string;
  category?: string;
  subCategory?: string;
  parentId?: string;
  responsibleName?: string;
  responsibleEmail?: string;
  isActive: boolean;
  budget?: number;
  createdAt: number;
}

export interface FiscalPeriod {
  id: string;
  code: string;
  name: string;
  type: 'month' | 'quarter' | 'year' | 'custom';
  fiscalYear: number;
  startDate: string;
  endDate: string;
  isClosed: boolean;
  closeDate?: string;
  is13thPeriod?: boolean;
  createdAt: number;
}

export type MasterDataType = 'customer' | 'supplier' | 'product' | 'employee' | 'entity' | 'other';

export interface MasterDataItem {
  id: string;
  type: MasterDataType;
  code: string;
  name: string;
  category?: string;
  taxId?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  paymentTerms?: number;
  creditLimit?: number;
  isActive: boolean;
  customFields?: Record<string, any>;
  createdAt: number;
}

export interface FiscalCalendar {
  id: string;
  name: string;
  fiscalYear: number;
  startDate: string;
  endDate: string;
  periods: FiscalPeriod[];
  createdAt: number;
}

export interface AccountReclassification {
  id: string;
  name: string;
  sourceAccountCode: string;
  targetAccountCode?: string;
  targetPLCategory?: PLCategory;
  targetLabel?: string;
  isActive: boolean;
  createdAt: number;
}

export interface FinanceReferentials {
  chartOfAccounts?: ChartOfAccounts[];
  analyticalAxes?: AnalyticalAxis[];
  axisValues?: AxisValue[];
  fiscalCalendars?: FiscalCalendar[];
  masterData?: MasterDataItem[];
  reclassifications?: AccountReclassification[];
}

export type BudgetStatus = 'draft' | 'submitted' | 'validated' | 'rejected' | 'locked';
export type BudgetScenario = 'realistic' | 'optimistic' | 'pessimistic' | 'custom';
export type BudgetFormulaType = 'fixed' | 'growth' | 'index' | 'formula' | 'spread';

export interface BudgetLine {
  id: string;
  accountCode: string;
  accountLabel?: string;
  analyticalBreakdown?: {
    [axisCode: string]: string;
  };
  periodValues: {
    [periodId: string]: number;
  };
  formulas?: {
    [periodId: string]: {
      type: BudgetFormulaType;
      value?: number;
      baseValue?: number;
      expression?: string;
    };
  };
  comment?: string;
  isLocked: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface BudgetVersion {
  id: string;
  budgetId: string;
  versionNumber: number;
  name: string;
  scenario: BudgetScenario;
  status: BudgetStatus;
  lines: BudgetLine[];
  isActive: boolean;
  submittedBy?: string;
  submittedAt?: number;
  validatedBy?: string;
  validatedAt?: number;
  rejectionReason?: string;
  comment?: string;
  createdAt: number;
  updatedAt: number;
}

export interface BudgetComment {
  id: string;
  budgetId: string;
  versionId: string;
  lineId?: string;
  author: string;
  content: string;
  isResolved: boolean;
  createdAt: number;
}

export interface BudgetNotification {
  id: string;
  budgetId: string;
  type: 'reminder' | 'submission' | 'validation' | 'rejection';
  recipient: string;
  subject: string;
  message: string;
  isRead: boolean;
  sentAt: number;
}

export interface BudgetTemplate {
  id: string;
  name: string;
  description?: string;
  category?: string;
  accountCodes: string[];
  analyticalAxes?: string[];
  defaultFormulas?: {
    [accountCode: string]: {
      type: BudgetFormulaType;
      value?: number;
    };
  };
  isActive: boolean;
  createdAt: number;
}

export interface Budget {
  id: string;
  name: string;
  fiscalYear: number;
  fiscalCalendarId?: string;
  chartOfAccountsId: string;
  analyticalDimensions?: string[];
  templateId?: string;
  versions: BudgetVersion[];
  activeVersionId?: string;
  startDate: string;
  endDate: string;
  owner: string;
  contributors?: string[];
  validators?: string[];
  dueDate?: string;
  isLocked: boolean;
  createdAt: number;
  updatedAt: number;
}

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

export interface BudgetModule {
  budgets: Budget[];
  templates: BudgetTemplate[];
  comments: BudgetComment[];
  notifications: BudgetNotification[];
}

export type ForecastType = 'monthly' | 'quarterly' | 'yearly';
export type ForecastMethod = 'manual' | 'copy_actual' | 'driver_based' | 'ml_prediction' | 'trend' | 'seasonal';
export type ForecastStatus = 'draft' | 'submitted' | 'validated' | 'locked';

export interface ForecastDriver {
  id: string;
  name: string;
  unit?: string;
  historicalValues: {
    [periodId: string]: number;
  };
  forecastValues: {
    [periodId: string]: number;
  };
}

export interface ForecastLine {
  id: string;
  accountCode: string;
  accountLabel?: string;
  method: ForecastMethod;
  forecastValues: {
    [periodId: string]: number;
  };
  actualValues?: {
    [periodId: string]: number;
  };
  drivers?: {
    driverId: string;
    formula: string;
  }[];
  mlPrediction?: {
    confidence: number;
    lowerBound: {
      [periodId: string]: number;
    };
    upperBound: {
      [periodId: string]: number;
    };
    seasonalityDetected?: boolean;
    trend?: 'increasing' | 'decreasing' | 'stable';
  };
  comment?: string;
  isLocked: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ForecastVersion {
  id: string;
  forecastId: string;
  versionNumber: number;
  name: string;
  referenceDate: string;
  status: ForecastStatus;
  lines: ForecastLine[];
  isActive: boolean;
  submittedBy?: string;
  submittedAt?: number;
  validatedBy?: string;
  validatedAt?: number;
  comment?: string;
  createdAt: number;
  updatedAt: number;
}

export interface RollingForecastSnapshot {
  id: string;
  forecastId: string;
  snapshotDate: string;
  periodStart: string;
  periodEnd: string;
  data: ForecastLine[];
  createdAt: number;
}

export interface Forecast {
  id: string;
  name: string;
  type: ForecastType;
  fiscalYear: number;
  chartOfAccountsId: string;
  fiscalCalendarId?: string;
  isRolling: boolean;
  rollingHorizonMonths?: number;
  autoUpdateEnabled?: boolean;
  lastUpdateDate?: string;
  drivers: ForecastDriver[];
  versions: ForecastVersion[];
  activeVersionId?: string;
  rollingSnapshots?: RollingForecastSnapshot[];
  mlConfig?: {
    enabled: boolean;
    method: 'arima' | 'trend' | 'seasonal' | 'hybrid';
    lookbackMonths: number;
    confidenceLevel: number;
  };
  owner: string;
  validators?: string[];
  isLocked: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ForecastVarianceAnalysis {
  accountCode: string;
  accountLabel?: string;
  period: string;
  forecastValue: number;
  actualValue: number;
  variance: number;
  variancePercent: number;
  reason?: string;
}

export interface ForecastReconciliationReport {
  id: string;
  forecastId: string;
  forecastVersionId: string;
  periodStart: string;
  periodEnd: string;
  variances: ForecastVarianceAnalysis[];
  totalForecast: number;
  totalActual: number;
  totalVariance: number;
  totalVariancePercent: number;
  mape?: number;
  rmse?: number;
  recommendations?: string[];
  createdAt: number;
}

export interface ForecastModule {
  forecasts: Forecast[];
  reconciliationReports: ForecastReconciliationReport[];
}
