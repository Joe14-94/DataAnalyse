
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

export interface CalculatedField {
  id: string;
  name: string;
  formula: string;
  outputType: 'number' | 'text' | 'boolean';
  unit?: string;
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
}

export interface ImportBatch {
  id: string;
  datasetId: string;
  date: string;
  createdAt: number;
  rows: DataRow[];
}
