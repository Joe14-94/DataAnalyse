
import { DataRow } from './common';

export interface ConditionalRule {
  id: string;
  operator: 'gt' | 'lt' | 'eq' | 'contains' | 'empty';
  value: string | number;
  style: {
    color?: string;
    backgroundColor?: string;
    fontWeight?: string;
  };
}

export interface FieldConfig {
  type: 'text' | 'number' | 'boolean' | 'date';
  unit?: string;
  decimalPlaces?: number;
  displayScale?: 'none' | 'thousands' | 'millions' | 'billions';
  conditionalFormatting?: ConditionalRule[];
}

export type CalculatedFieldActionType =
  | 'source' | 'trim' | 'upper' | 'lower' | 'proper'
  | 'replace' | 'regex' | 'concat'
  | 'left' | 'right' | 'substring'
  | 'add' | 'subtract' | 'multiply' | 'divide';

export interface CalculatedFieldAction {
  id: string;
  type: CalculatedFieldActionType;
  params: Record<string, any>;
}

export interface CalculatedField {
  id: string;
  name: string;
  formula: string;
  outputType: 'number' | 'text' | 'boolean';
  unit?: string;
  mode?: 'formula' | 'actions';
  actions?: CalculatedFieldAction[];
}

export interface EnrichmentConfig {
  id: string;
  targetDatasetId: string;
  primaryKey: string;
  secondaryKey: string;
  columnsToAdd: string[];
  newColumnName: string;
}

export interface Dataset {
  id: string;
  name: string;
  fields: string[];
  fieldConfigs?: Record<string, FieldConfig>;
  calculatedFields?: CalculatedField[];
  enrichmentConfigs?: EnrichmentConfig[];
  createdAt: number;
  sourcePivotConfig?: {
      isTemporal?: boolean;
      config: any; // Equivalent to PivotState['config'] or TemporalComparisonConfig
  };
}

export interface ImportBatch {
  id: string;
  datasetId: string;
  date: string;
  createdAt: number;
  rows: DataRow[];
}
