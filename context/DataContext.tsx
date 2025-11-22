
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ImportBatch, AppState, DataRow, Dataset, FieldConfig } from '../types';
import { APP_VERSION, generateSyntheticData } from '../utils';

interface DataContextType {
  datasets: Dataset[];
  currentDataset: Dataset | null;
  currentDatasetId: string | null;
  batches: ImportBatch[]; // Batches filtrés pour le dataset courant
  savedMappings: Record<string, string>;
  
  // Actions
  switchDataset: (id: string) => void;
  createDataset: (name: string, fields: string[], fieldConfigs?: Record<string, FieldConfig>) => string;
  updateDatasetName: (id: string, name: string) => void;
  deleteDataset: (id: string) => void;
  
  addBatch: (datasetId: string, date: string, rows: any[]) => void;
  deleteBatch: (id: string) => void;
  
  // Field management
  addFieldToDataset: (datasetId: string, fieldName: string, config?: FieldConfig) => void;
  updateDatasetConfigs: (datasetId: string, configs: Record<string, FieldConfig>) => void;

  // System
  importBackup: (jsonData: string) => boolean;
  getBackupJson: () => string;
  clearAll: () => void;
  loadDemoData: () => void;
  updateSavedMappings: (newMappings: Record<string, string>) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const STORAGE_KEY = 'app_data_v3_multi';

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [batches, setAllBatches] = useState<ImportBatch[]>([]); // Tous les batches
  const [savedMappings, setSavedMappings] = useState<Record<string, string>>({});
  
  const [currentDatasetId, setCurrentDatasetId] = useState<string | null>(null);

  // --- MIGRATION & LOAD ---
  useEffect(() => {
    try {
      // Tenter de charger la V3
      const storedV3 = localStorage.getItem(STORAGE_KEY);
      
      if (storedV3) {
        const parsed = JSON.parse(storedV3);
        setDatasets(parsed.datasets || []);
        setAllBatches(parsed.batches || []);
        setSavedMappings(parsed.savedMappings || {});
        
        // Sélectionner le dataset sauvegardé ou le premier par défaut
        if (parsed.currentDatasetId && parsed.datasets?.find((d: Dataset) => d.id === parsed.currentDatasetId)) {
          setCurrentDatasetId(parsed.currentDatasetId);
        } else if (parsed.datasets && parsed.datasets.length > 0) {
          setCurrentDatasetId(parsed.datasets[0].id);
        }
      } else {
        // Migration logique V2 -> V3 (conservée au cas où)
        const storedV2 = localStorage.getItem('app_data_v2_dynamic');
        if (storedV2) {
          console.log("Migration V2 -> V3 en cours...");
          const parsedV2 = JSON.parse(storedV2);
          const defaultDatasetId = 'default-migrated';
          const defaultDataset: Dataset = {
            id: defaultDatasetId,
            name: 'Mon Tableau (Migré)',
            fields: parsedV2.fields || [],
            createdAt: Date.now()
          };
          const migratedBatches = (parsedV2.batches || []).map((b: any) => ({
            ...b,
            datasetId: defaultDatasetId
          }));

          setDatasets([defaultDataset]);
          setAllBatches(migratedBatches);
          setSavedMappings(parsedV2.savedMappings || {});
          setCurrentDatasetId(defaultDatasetId);
        }
      }
    } catch (e) {
      console.error("Failed to load data", e);
    }
  }, []);

  // --- PERSISTENCE ---
  useEffect(() => {
    if (datasets.length > 0 || batches.length > 0) {
      const state: AppState = {
        datasets,
        batches, 
        version: APP_VERSION,
        savedMappings,
        currentDatasetId
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [datasets, batches, savedMappings, currentDatasetId]);

  // --- COMPUTED ---
  const currentDataset = datasets.find(d => d.id === currentDatasetId) || null;
  const filteredBatches = batches
    .filter(b => b.datasetId === currentDatasetId)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // --- ACTIONS ---

  const switchDataset = useCallback((id: string) => {
    setCurrentDatasetId(id);
  }, []);

  const createDataset = useCallback((name: string, fields: string[], fieldConfigs?: Record<string, FieldConfig>) => {
    const newId = Math.random().toString(36).substr(2, 9);
    const newDataset: Dataset = {
      id: newId,
      name,
      fields,
      fieldConfigs: fieldConfigs || {},
      createdAt: Date.now()
    };
    setDatasets(prev => [...prev, newDataset]);
    setCurrentDatasetId(newId); // Auto select
    return newId;
  }, []);

  const updateDatasetName = useCallback((id: string, name: string) => {
    setDatasets(prev => prev.map(d => d.id === id ? { ...d, name } : d));
  }, []);

  const deleteDataset = useCallback((id: string) => {
    setDatasets(prev => prev.filter(d => d.id !== id));
    setAllBatches(prev => prev.filter(b => b.datasetId !== id));
    if (currentDatasetId === id) {
      setCurrentDatasetId(null);
    }
  }, [currentDatasetId]);

  const addFieldToDataset = useCallback((datasetId: string, fieldName: string, config?: FieldConfig) => {
    setDatasets(prev => prev.map(d => {
      if (d.id !== datasetId) return d;
      // Ajout du champ s'il n'existe pas
      const fields = d.fields.includes(fieldName) ? d.fields : [...d.fields, fieldName];
      // Ajout de la config si fournie
      const configs = config ? { ...d.fieldConfigs, [fieldName]: config } : d.fieldConfigs;
      
      return { ...d, fields, fieldConfigs: configs };
    }));
  }, []);

  const updateDatasetConfigs = useCallback((datasetId: string, configs: Record<string, FieldConfig>) => {
    setDatasets(prev => prev.map(d => {
      if (d.id !== datasetId) return d;
      return { 
        ...d, 
        fieldConfigs: { ...d.fieldConfigs, ...configs } 
      };
    }));
  }, []);

  const addBatch = useCallback((datasetId: string, date: string, rows: any[]) => {
    const newBatch: ImportBatch = {
      id: Math.random().toString(36).substr(2, 9),
      datasetId,
      date,
      createdAt: Date.now(),
      rows
    };
    setAllBatches(prev => [...prev, newBatch]);
  }, []);

  const deleteBatch = useCallback((id: string) => {
    setAllBatches(prev => prev.filter(b => b.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setDatasets([]);
    setAllBatches([]);
    setSavedMappings({});
    setCurrentDatasetId(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const loadDemoData = useCallback(() => {
    const id1 = 'demo-rh';
    const id2 = 'demo-sales';

    const ds1: Dataset = { 
      id: id1, 
      name: 'Effectifs RH', 
      fields: ['Nom', 'Email', 'Organisation', 'DateModif', 'Commentaire', 'Budget', 'Quantité'], 
      fieldConfigs: {
        'Budget': { type: 'number', unit: 'k€' },
        'Quantité': { type: 'number', unit: '' }
      },
      createdAt: Date.now() 
    };
    
    const demoBatches = generateSyntheticData(id1);

    setDatasets([ds1]); // On charge juste le RH complexe pour la démo
    setAllBatches(demoBatches);
    setCurrentDatasetId(id1);
  }, []);

  const updateSavedMappings = useCallback((newMappings: Record<string, string>) => {
    setSavedMappings(prev => ({ ...prev, ...newMappings }));
  }, []);

  const getBackupJson = useCallback(() => {
    const state: AppState = { 
      datasets, 
      batches, 
      version: APP_VERSION, 
      savedMappings,
      currentDatasetId,
      exportDate: new Date().toISOString()
    };
    return JSON.stringify(state, null, 2);
  }, [datasets, batches, savedMappings, currentDatasetId]);

  const importBackup = useCallback((jsonData: string) => {
    try {
      const parsed = JSON.parse(jsonData);
      if (!parsed.datasets || !Array.isArray(parsed.datasets)) {
        throw new Error("Format invalide v3");
      }
      
      // Restauration des données
      setDatasets(parsed.datasets);
      setAllBatches(parsed.batches || []);
      setSavedMappings(parsed.savedMappings || {});
      
      // Restauration du contexte (tableau actif)
      if (parsed.currentDatasetId && parsed.datasets.find((d: Dataset) => d.id === parsed.currentDatasetId)) {
        setCurrentDatasetId(parsed.currentDatasetId);
      } else if (parsed.datasets.length > 0) {
        setCurrentDatasetId(parsed.datasets[0].id);
      } else {
        setCurrentDatasetId(null);
      }
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }, []);

  return (
    <DataContext.Provider value={{ 
      datasets,
      currentDataset,
      currentDatasetId,
      batches: filteredBatches, 
      savedMappings,
      switchDataset,
      createDataset,
      updateDatasetName,
      deleteDataset,
      addFieldToDataset,
      updateDatasetConfigs,
      addBatch, 
      deleteBatch, 
      importBackup, 
      getBackupJson, 
      clearAll, 
      loadDemoData,
      updateSavedMappings,
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
};