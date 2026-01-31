import React, { createContext, useContext, useCallback } from 'react';
import { Dataset, FieldConfig, CalculatedField } from '../types';
import { generateId } from '../utils';

interface DatasetContextType {
  datasets: Dataset[];
  currentDataset: Dataset | null;
  currentDatasetId: string | null;
  switchDataset: (id: string) => void;
  createDataset: (name: string, fields: string[], fieldConfigs?: Record<string, FieldConfig>) => string;
  updateDatasetName: (id: string, name: string) => void;
  deleteDataset: (id: string) => void;
  addFieldToDataset: (datasetId: string, fieldName: string, config?: FieldConfig) => void;
  deleteDatasetField: (datasetId: string, fieldName: string) => void;
  renameDatasetField: (datasetId: string, oldName: string, newName: string) => void;
  updateDatasetConfigs: (datasetId: string, configs: Record<string, FieldConfig>) => void;
  addCalculatedField: (datasetId: string, field: CalculatedField) => void;
  removeCalculatedField: (datasetId: string, fieldId: string) => void;
  updateCalculatedField: (datasetId: string, fieldId: string, updates: Partial<CalculatedField>) => void;
  reorderDatasetFields: (datasetId: string, newFields: string[]) => void;
}

export const DatasetContext = createContext<DatasetContextType | undefined>(undefined);

export const DatasetProvider: React.FC<{
  children: React.ReactNode;
  value: DatasetContextType;
}> = ({ children, value }) => {
  return (
    <DatasetContext.Provider value={value}>
      {children}
    </DatasetContext.Provider>
  );
};

export const useDatasets = () => {
  const context = useContext(DatasetContext);
  if (!context) {
    throw new Error("useDatasets must be used within a DatasetProvider");
  }
  return context;
};