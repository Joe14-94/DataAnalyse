
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ImportBatch, AppState, DataRow, Dataset, FieldConfig, DashboardWidget, WidgetConfig, CalculatedField, SavedAnalysis } from '../types';
import { APP_VERSION, generateSyntheticData } from '../utils';

interface DataContextType {
  datasets: Dataset[];
  currentDataset: Dataset | null;
  currentDatasetId: string | null;
  batches: ImportBatch[]; // Tous les batches pour permettre le cross-dataset
  filteredBatches: ImportBatch[]; // Batches du dataset courant
  savedMappings: Record<string, string>;
  dashboardWidgets: DashboardWidget[];
  dashboardFilters: Record<string, any>; // NEW: Filtres globaux dashboard
  savedAnalyses: SavedAnalysis[]; // NEW: Analyses sauvegardées
  
  // Actions Dataset
  switchDataset: (id: string) => void;
  createDataset: (name: string, fields: string[], fieldConfigs?: Record<string, FieldConfig>) => string;
  updateDatasetName: (id: string, name: string) => void;
  deleteDataset: (id: string) => void;
  
  // Actions Calculated Fields
  addCalculatedField: (datasetId: string, field: CalculatedField) => void;
  removeCalculatedField: (datasetId: string, fieldId: string) => void;

  // Actions Data
  addBatch: (datasetId: string, date: string, rows: any[]) => void;
  deleteBatch: (id: string) => void;
  
  // Actions Fields
  addFieldToDataset: (datasetId: string, fieldName: string, config?: FieldConfig) => void;
  updateDatasetConfigs: (datasetId: string, configs: Record<string, FieldConfig>) => void;

  // Actions Dashboard Widgets (GLOBAL)
  addDashboardWidget: (widget: Omit<DashboardWidget, 'id'>) => void;
  updateDashboardWidget: (id: string, updates: Partial<DashboardWidget>) => void;
  removeDashboardWidget: (id: string) => void;
  moveDashboardWidget: (id: string, direction: 'left' | 'right') => void;
  resetDashboard: () => void;
  
  // Dashboard Filtering (Drill Down)
  setDashboardFilter: (field: string, value: any) => void;
  clearDashboardFilters: () => void;

  // Saved Analyses Actions
  saveAnalysis: (analysis: Omit<SavedAnalysis, 'id' | 'createdAt'>) => void;
  deleteAnalysis: (id: string) => void;

  // System
  importBackup: (jsonData: string) => boolean;
  getBackupJson: () => string;
  clearAll: () => void;
  loadDemoData: () => void;
  updateSavedMappings: (newMappings: Record<string, string>) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const STORAGE_KEY = 'app_data_v4_global';

// Widgets par défaut pour un nouveau dashboard vide
const DEFAULT_WIDGETS: DashboardWidget[] = [];

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [batches, setAllBatches] = useState<ImportBatch[]>([]); 
  const [dashboardWidgets, setDashboardWidgets] = useState<DashboardWidget[]>([]);
  const [savedMappings, setSavedMappings] = useState<Record<string, string>>({});
  
  const [currentDatasetId, setCurrentDatasetId] = useState<string | null>(null);
  const [dashboardFilters, setDashboardFilters] = useState<Record<string, any>>({});
  
  // NEW: State for saved analyses
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([]);

  // --- MIGRATION & LOAD ---
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      
      if (stored) {
        const parsed = JSON.parse(stored);
        setDatasets(parsed.datasets || []);
        setAllBatches(parsed.batches || []);
        setSavedMappings(parsed.savedMappings || {});
        setDashboardWidgets(parsed.dashboardWidgets || []);
        setSavedAnalyses(parsed.savedAnalyses || []); // Load saved analyses
        
        if (parsed.currentDatasetId) {
          setCurrentDatasetId(parsed.currentDatasetId);
        } else if (parsed.datasets && parsed.datasets.length > 0) {
          setCurrentDatasetId(parsed.datasets[0].id);
        }
      } else {
         // Tentative de migration depuis V3 (si existe)
         const storedV3 = localStorage.getItem('app_data_v3_multi');
         if (storedV3) {
            const parsedV3 = JSON.parse(storedV3);
            setDatasets(parsedV3.datasets || []);
            setAllBatches(parsedV3.batches || []);
            setSavedMappings(parsedV3.savedMappings || {});
            // On ne migre pas les widgets V3 car la structure a changé (global vs local)
            setCurrentDatasetId(parsedV3.currentDatasetId || null);
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
        dashboardWidgets,
        savedAnalyses,
        version: APP_VERSION,
        savedMappings,
        currentDatasetId
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [datasets, batches, savedMappings, currentDatasetId, dashboardWidgets, savedAnalyses]);

  // --- COMPUTED ---
  const currentDataset = datasets.find(d => d.id === currentDatasetId) || null;
  const filteredBatches = batches
    .filter(b => b.datasetId === currentDatasetId)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // --- ACTIONS DATASET ---

  const switchDataset = useCallback((id: string) => {
    setCurrentDatasetId(id);
    setDashboardFilters({}); // Clear filters on switch
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
    setCurrentDatasetId(newId); 
    return newId;
  }, []);

  const updateDatasetName = useCallback((id: string, name: string) => {
    setDatasets(prev => prev.map(d => d.id === id ? { ...d, name } : d));
  }, []);

  const deleteDataset = useCallback((id: string) => {
    setDatasets(prev => prev.filter(d => d.id !== id));
    setAllBatches(prev => prev.filter(b => b.datasetId !== id));
    // Remove widgets linked to this dataset
    setDashboardWidgets(prev => prev.filter(w => w.config.source?.datasetId !== id));
    // Remove saved analyses linked to this dataset
    setSavedAnalyses(prev => prev.filter(a => a.datasetId !== id));

    if (currentDatasetId === id) {
      setCurrentDatasetId(null);
    }
  }, [currentDatasetId]);

  const addFieldToDataset = useCallback((datasetId: string, fieldName: string, config?: FieldConfig) => {
    setDatasets(prev => prev.map(d => {
      if (d.id !== datasetId) return d;
      const fields = d.fields.includes(fieldName) ? d.fields : [...d.fields, fieldName];
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

  // --- ACTIONS CALCULATED FIELDS ---

  const addCalculatedField = useCallback((datasetId: string, field: CalculatedField) => {
    setDatasets(prev => prev.map(d => {
      if (d.id !== datasetId) return d;
      return {
        ...d,
        calculatedFields: [...(d.calculatedFields || []), field]
      };
    }));
  }, []);

  const removeCalculatedField = useCallback((datasetId: string, fieldId: string) => {
    setDatasets(prev => prev.map(d => {
      if (d.id !== datasetId) return d;
      return {
        ...d,
        calculatedFields: (d.calculatedFields || []).filter(f => f.id !== fieldId)
      };
    }));
  }, []);

  // --- ACTIONS DATA ---

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

  // --- ACTIONS DASHBOARD WIDGETS (GLOBAL) ---

  const addDashboardWidget = useCallback((widget: Omit<DashboardWidget, 'id'>) => {
    const newWidget = { ...widget, id: Math.random().toString(36).substr(2, 9) };
    setDashboardWidgets(prev => [...prev, newWidget]);
  }, []);

  const updateDashboardWidget = useCallback((widgetId: string, updates: Partial<DashboardWidget>) => {
    setDashboardWidgets(prev => prev.map(w => w.id === widgetId ? { ...w, ...updates } : w));
  }, []);

  const removeDashboardWidget = useCallback((widgetId: string) => {
    setDashboardWidgets(prev => prev.filter(w => w.id !== widgetId));
  }, []);

  const moveDashboardWidget = useCallback((widgetId: string, direction: 'left' | 'right') => {
    setDashboardWidgets(prev => {
      const widgets = [...prev];
      const idx = widgets.findIndex(w => w.id === widgetId);
      if (idx === -1) return prev;
      
      const swapIdx = direction === 'left' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= widgets.length) return prev;
      
      [widgets[idx], widgets[swapIdx]] = [widgets[swapIdx], widgets[idx]];
      return widgets;
    });
  }, []);

  const resetDashboard = useCallback(() => {
    setDashboardWidgets([]);
  }, []);

  const setDashboardFilter = useCallback((field: string, value: any) => {
     setDashboardFilters(prev => ({
        ...prev,
        [field]: value
     }));
  }, []);

  const clearDashboardFilters = useCallback(() => {
     setDashboardFilters({});
  }, []);

  // --- SAVED ANALYSES ACTIONS ---

  const saveAnalysis = useCallback((analysis: Omit<SavedAnalysis, 'id' | 'createdAt'>) => {
    const newAnalysis: SavedAnalysis = {
      ...analysis,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: Date.now()
    };
    setSavedAnalyses(prev => [...prev, newAnalysis]);
  }, []);

  const deleteAnalysis = useCallback((id: string) => {
    setSavedAnalyses(prev => prev.filter(a => a.id !== id));
  }, []);

  // --- SYSTEM ---

  const clearAll = useCallback(() => {
    setDatasets([]);
    setAllBatches([]);
    setSavedMappings({});
    setDashboardWidgets([]);
    setDashboardFilters({});
    setSavedAnalyses([]);
    setCurrentDatasetId(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('app_data_v3_multi'); // Cleanup old ver
  }, []);

  const loadDemoData = useCallback(() => {
    const id1 = 'demo-rh';
    const id2 = 'demo-sales';
    
    // Create 2 datasets
    const ds1: Dataset = { 
      id: id1, 
      name: 'Effectifs RH', 
      fields: ['Nom', 'Email', 'Organisation', 'DateModif', 'Commentaire', 'Budget', 'Quantité'], 
      fieldConfigs: { 'Budget': { type: 'number', unit: 'k€' } },
      createdAt: Date.now() 
    };

    // Generate Data
    const batches1 = generateSyntheticData(id1);
    
    setDatasets([ds1]);
    setAllBatches([...batches1]);
    setCurrentDatasetId(id1);

    // Default Widgets
    setDashboardWidgets([
       { 
          id: 'w1', title: 'Effectif Total', type: 'kpi', size: 'sm', 
          config: { source: { datasetId: id1, mode: 'latest' }, metric: 'count', showTrend: true } 
       },
       { 
          id: 'w2', title: 'Budget Global', type: 'kpi', size: 'sm', 
          config: { source: { datasetId: id1, mode: 'latest' }, metric: 'sum', valueField: 'Budget', showTrend: true } 
       },
       { 
          id: 'w3', title: 'Évolution Effectifs', type: 'chart', size: 'full', 
          config: { source: { datasetId: id1, mode: 'latest' }, metric: 'count', dimension: 'DateModif', chartType: 'line' } 
       }
    ]);

  }, []);

  const updateSavedMappings = useCallback((newMappings: Record<string, string>) => {
    setSavedMappings(prev => ({ ...prev, ...newMappings }));
  }, []);

  const getBackupJson = useCallback(() => {
    const state: AppState = { 
      datasets, 
      batches, 
      dashboardWidgets,
      savedAnalyses,
      version: APP_VERSION, 
      savedMappings,
      currentDatasetId,
      exportDate: new Date().toISOString()
    };
    return JSON.stringify(state, null, 2);
  }, [datasets, batches, savedMappings, currentDatasetId, dashboardWidgets, savedAnalyses]);

  const importBackup = useCallback((jsonData: string) => {
    try {
      const parsed = JSON.parse(jsonData);
      if (!parsed.datasets || !Array.isArray(parsed.datasets)) {
        throw new Error("Format invalide");
      }
      
      setDatasets(parsed.datasets);
      setAllBatches(parsed.batches || []);
      setSavedMappings(parsed.savedMappings || {});
      setDashboardWidgets(parsed.dashboardWidgets || []);
      setSavedAnalyses(parsed.savedAnalyses || []);
      
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
      batches: batches, // WARNING: Exposes all batches
      filteredBatches, // Batches for current dataset
      savedMappings,
      dashboardWidgets,
      dashboardFilters,
      savedAnalyses,
      switchDataset,
      createDataset,
      updateDatasetName,
      deleteDataset,
      addFieldToDataset,
      updateDatasetConfigs,
      addCalculatedField,
      removeCalculatedField,
      addBatch, 
      deleteBatch, 
      addDashboardWidget,
      updateDashboardWidget,
      removeDashboardWidget,
      moveDashboardWidget,
      resetDashboard,
      setDashboardFilter,
      clearDashboardFilters,
      saveAnalysis,
      deleteAnalysis,
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