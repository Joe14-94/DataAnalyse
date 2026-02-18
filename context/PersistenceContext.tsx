
import { createContext, useContext } from 'react';
import { AppState } from '../types';

export interface PersistenceContextType {
  isLoading: boolean;
  savedMappings: Record<string, string>;
  companyLogo: string | undefined;
  updateCompanyLogo: (logo: string | undefined) => void;
  importBackup: (jsonData: string, keys?: (keyof AppState)[]) => Promise<boolean>;
  getBackupJson: (keys?: (keyof AppState)[]) => string;
  clearAll: () => Promise<void>;
  loadDemoData: () => void;
  updateSavedMappings: (newMappings: Record<string, string>) => void;
  hasSeenOnboarding: boolean;
  completeOnboarding: () => void;
}

export const PersistenceContext = createContext<PersistenceContextType | undefined>(undefined);

export const usePersistence = () => {
  const context = useContext(PersistenceContext);
  if (!context) throw new Error("usePersistence must be used within a PersistenceProvider");
  return context;
};
