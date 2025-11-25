import React, { createContext, useContext } from 'react';

interface PersistenceContextType {
  isLoading: boolean;
  savedMappings: Record<string, string>;
  importBackup: (jsonData: string) => Promise<boolean>;
  getBackupJson: () => string;
  clearAll: () => void;
  loadDemoData: () => void;
  updateSavedMappings: (newMappings: Record<string, string>) => void;
}

export const PersistenceContext = createContext<PersistenceContextType | undefined>(undefined);

export const usePersistence = () => {
  const context = useContext(PersistenceContext);
  if (!context) {
    throw new Error("usePersistence must be used within a PersistenceProvider");
  }
  return context;
};
