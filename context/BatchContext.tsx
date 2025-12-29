import React, { createContext, useContext } from 'react';
import { ImportBatch } from '../types';

interface BatchContextType {
  batches: ImportBatch[];
  filteredBatches: ImportBatch[]; // Batches du dataset courant
  addBatch: (datasetId: string, date: string, rows: any[]) => void;
  deleteBatch: (id: string) => void;
  deleteBatchRow: (batchId: string, rowId: string) => void;
}

export const BatchContext = createContext<BatchContextType | undefined>(undefined);

export const useBatches = () => {
  const context = useContext(BatchContext);
  if (!context) {
    throw new Error("useBatches must be used within a BatchProvider");
  }
  return context;
};