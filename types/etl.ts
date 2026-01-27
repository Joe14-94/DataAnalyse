
import { DataRow } from './common';

export type TransformationType =
  | 'source'
  | 'filter'
  | 'join'
  | 'aggregate'
  | 'union'
  | 'pivot'
  | 'unpivot'
  | 'split'
  | 'merge'
  | 'calculate'
  | 'sort'
  | 'distinct'
  | 'rename'
  | 'select';

export type JoinType = 'inner' | 'left' | 'right' | 'full';
export type AggregationType = 'sum' | 'avg' | 'count' | 'min' | 'max' | 'first' | 'last';

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

export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value?: any;
  caseSensitive?: boolean;
}

export interface JoinConfig {
  type: JoinType;
  leftKey: string;
  rightKey: string;
  rightNodeId: string;
  suffix?: string;
}

export interface AggregateConfig {
  groupBy: string[];
  aggregations: {
    field: string;
    operation: AggregationType;
    alias?: string;
  }[];
}

export interface ETLPivotConfig {
  index: string;
  columns: string;
  values: string;
  aggFunc: AggregationType;
}

export interface UnpivotConfig {
  idVars: string[];
  valueVars: string[];
  varName: string;
  valueName: string;
}

export interface SplitConfig {
  column: string;
  separator: string;
  newColumns: string[];
  limit?: number;
}

export interface MergeConfig {
  columns: string[];
  newColumn: string;
  separator: string;
}

export interface CalculateConfig {
  newColumn: string;
  formula: string;
  type: 'number' | 'text' | 'boolean';
}

export interface SortConfig {
  fields: {
    field: string;
    direction: 'asc' | 'desc';
  }[];
}

export interface SelectConfig {
  columns: string[];
  exclude?: boolean;
}

export interface RenameConfig {
  mappings: {
    oldName: string;
    newName: string;
  }[];
}

export type TransformationConfig =
  | { type: 'source'; datasetId: string }
  | { type: 'filter'; conditions: FilterCondition[]; combineWith: 'AND' | 'OR' }
  | { type: 'join'; config: JoinConfig }
  | { type: 'aggregate'; config: AggregateConfig }
  | { type: 'union'; rightNodeId: string }
  | { type: 'pivot'; config: ETLPivotConfig }
  | { type: 'unpivot'; config: UnpivotConfig }
  | { type: 'split'; config: SplitConfig }
  | { type: 'merge'; config: MergeConfig }
  | { type: 'calculate'; config: CalculateConfig }
  | { type: 'sort'; config: SortConfig }
  | { type: 'distinct' }
  | { type: 'select'; config: SelectConfig }
  | { type: 'rename'; config: RenameConfig };

export interface NodePosition {
  x: number;
  y: number;
}

export interface PipelineNode {
  id: string;
  type: TransformationType;
  label: string;
  position: NodePosition;
  config: TransformationConfig;
  isValid: boolean;
  error?: string;
}

export interface PipelineConnection {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  fromPort?: string;
  toPort?: string;
}

export interface NodeExecutionResult {
  nodeId: string;
  data: DataRow[];
  rowCount: number;
  columnCount: number;
  columns: string[];
  executionTime: number;
  error?: string;
}

export interface Pipeline {
  id: string;
  name: string;
  description?: string;
  nodes: PipelineNode[];
  connections: PipelineConnection[];
  outputNodeId?: string;
  createdAt: number;
  updatedAt: number;
  lastExecuted?: number;
}

export interface PipelineModule {
  pipelines: Pipeline[];
  executionResults: {
    [pipelineId: string]: {
      [nodeId: string]: NodeExecutionResult;
    };
  };
}
