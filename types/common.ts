
export interface DataRow {
  id: string;
  [key: string]: any;
}

export interface RawImportData {
  headers: string[];
  rows: string[][];
  totalRows: number;
}

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

export interface FilterRule {
  field: string;
  operator: 'in' | 'starts_with' | 'contains' | 'gt' | 'lt' | 'eq';
  value: any;
}
