import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { ImportBatch, AppState, DataRow, Dataset, FieldConfig, DashboardWidget, WidgetConfig, CalculatedField, SavedAnalysis, PivotState, AnalyticsState } from '../types';
import { APP_VERSION, generateSyntheticData, db } from '../utils';

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
  
  isLoading: boolean; // NEW

  // Persistence States
  lastPivotState: PivotState | null;
  lastAnalyticsState: AnalyticsState | null;
  savePivotState: (state: PivotState | null) => void;
  saveAnalyticsState: (state: AnalyticsState | null) => void;

  // Actions Dataset
  switchDataset: (id: string) => void;
  createDataset: (name: string, fields: string[], fieldConfigs?: Record<string, FieldConfig>) => string;
  updateDatasetName: (id: string, name: string) => void;
  deleteDataset: (id: string) => void;
  deleteDatasetField: (datasetId: string, fieldName: string) => void; 
  renameDatasetField: (datasetId: string, oldName: string, newName: string) => void; // NEW
  
  // Actions Calculated Fields
  addCalculatedField: (datasetId: string, field: CalculatedField) => void;
  removeCalculatedField: (datasetId: string, fieldId: string) => void;

  // Actions Data
  addBatch: (datasetId: string, date: string, rows: any[]) => void;
  deleteBatch: (id: string) => void;
  deleteBatchRow: (batchId: string, rowId: string) => void; 
  
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
  importBackup: (jsonData: string) => Promise<boolean>;
  getBackupJson: () => string;
  clearAll: () => void;
  loadDemoData: () => void;
  updateSavedMappings: (newMappings: Record<string, string>) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// OLD KEY for migration
const LEGACY_STORAGE_KEY = 'app_data_v4_global';

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [batches, setAllBatches] = useState<ImportBatch[]>([]); 
  const [dashboardWidgets, setDashboardWidgets] = useState<DashboardWidget[]>([]);
  const [savedMappings, setSavedMappings] = useState<Record<string, string>>({});
  
  const [currentDatasetId, setCurrentDatasetId] = useState<string | null>(null);
  const [dashboardFilters, setDashboardFilters] = useState<Record<string, any>>({});
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([]);

  // Persistence States
  const [lastPivotState, setLastPivotState] = useState<PivotState | null>(null);
  const [lastAnalyticsState, setLastAnalyticsState] = useState<AnalyticsState | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- MIGRATION & LOAD ---
  useEffect(() => {
    const init = async () => {
      try {
        // 1. Check IndexedDB first
        const dbData = await db.load();
        
        if (dbData) {
          // Load from DB
          setDatasets(dbData.datasets || []);
          setAllBatches(dbData.batches || []);
          setSavedMappings(dbData.savedMappings || {});
          setDashboardWidgets(dbData.dashboardWidgets || []);
          setSavedAnalyses(dbData.savedAnalyses || []);
          setLastPivotState(dbData.lastPivotState || null);
          setLastAnalyticsState(dbData.lastAnalyticsState || null);

          if (dbData.currentDatasetId) {
            setCurrentDatasetId(dbData.currentDatasetId);
          } else if (dbData.datasets && dbData.datasets.length > 0) {
            setCurrentDatasetId(dbData.datasets[0].id);
          }
        } else {
          // 2. Fallback: Migration from LocalStorage
          const stored = localStorage.getItem(LEGACY_STORAGE_KEY);
          if (stored) {
            console.log("Migrating from LocalStorage to IndexedDB...");
            const parsed = JSON.parse(stored);
            setDatasets(parsed.datasets || []);
            setAllBatches(parsed.batches || []);
            setSavedMappings(parsed.savedMappings || {});
            setDashboardWidgets(parsed.dashboardWidgets || []);
            setSavedAnalyses(parsed.savedAnalyses || []);
            setLastPivotState(parsed.lastPivotState || null);
            setLastAnalyticsState(parsed.lastAnalyticsState || null);
            setCurrentDatasetId(parsed.currentDatasetId || (parsed.datasets?.[0]?.id) || null);
            
            // Save immediately to DB
            await db.save(parsed);
            
            // Clear LocalStorage to free up space
            localStorage.removeItem(LEGACY_STORAGE_KEY);
            localStorage.removeItem('app_data_v3_multi');
          }
        }
      } catch (e) {
        console.error("Failed to load data", e);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  // --- PERSISTENCE (DEBOUNCED) ---
  useEffect(() => {
    if (isLoading) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      const state: AppState = {
        datasets,
        batches, 
        dashboardWidgets,
        savedAnalyses,
        version: APP_VERSION,
        savedMappings,
        currentDatasetId,
        lastPivotState,
        lastAnalyticsState
      };
      
      db.save(state).catch(e => console.error("Failed to save to DB", e));
    }, 1000); // 1s debounce to avoid disk trashing

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [datasets, batches, savedMappings, currentDatasetId, dashboardWidgets, savedAnalyses, lastPivotState, lastAnalyticsState, isLoading]);

  // --- COMPUTED ---
  const currentDataset = datasets.find(d => d.id === currentDatasetId) || null;
  const filteredBatches = batches
    .filter(b => b.datasetId === currentDatasetId)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // --- ACTIONS DATASET ---

  const switchDataset = useCallback((id: string) => {
    setCurrentDatasetId(id);
    setDashboardFilters({}); 
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
    setDashboardWidgets(prev => prev.filter(w => w.config.source?.datasetId !== id));
    setSavedAnalyses(prev => prev.filter(a => a.datasetId !== id));
    
    if (lastPivotState?.datasetId === id) setLastPivotState(null);
    if (lastAnalyticsState?.datasetId === id) setLastAnalyticsState(null);

    if (currentDatasetId === id) {
      setCurrentDatasetId(null);
    }
  }, [currentDatasetId, lastPivotState, lastAnalyticsState]);

  const addFieldToDataset = useCallback((datasetId: string, fieldName: string, config?: FieldConfig) => {
    setDatasets(prev => prev.map(d => {
      if (d.id !== datasetId) return d;
      const fields = d.fields.includes(fieldName) ? d.fields : [...d.fields, fieldName];
      const configs = config ? { ...d.fieldConfigs, [fieldName]: config } : d.fieldConfigs;
      return { ...d, fields, fieldConfigs: configs };
    }));
  }, []);

  const deleteDatasetField = useCallback((datasetId: string, fieldName: string) => {
    // 1. Mise à jour de la définition du dataset
    setDatasets(prev => prev.map(d => {
      if (d.id !== datasetId) return d;
      const newConfigs = { ...d.fieldConfigs };
      delete newConfigs[fieldName];
      return {
        ...d,
        fields: d.fields.filter(f => f !== fieldName),
        fieldConfigs: newConfigs
      };
    }));

    // 2. Nettoyage des données dans les lots
    setAllBatches(prev => prev.map(b => {
       if (b.datasetId !== datasetId) return b;
       return {
          ...b,
          rows: b.rows.map(r => {
             const { [fieldName]: deleted, ...rest } = r;
             return rest as DataRow;
          })
       };
    }));
  }, []);

  const renameDatasetField = useCallback((datasetId: string, oldName: string, newName: string) => {
    if (oldName === newName || !newName.trim()) return;

    // 1. Mettre à jour la définition du dataset (fields et configs)
    setDatasets(prev => prev.map(d => {
        if (d.id !== datasetId) return d;
        
        // Update fields list
        const newFields = d.fields.map(f => f === oldName ? newName : f);
        
        // Update configs key
        const newConfigs = { ...d.fieldConfigs };
        if (newConfigs[oldName]) {
            newConfigs[newName] = newConfigs[oldName];
            delete newConfigs[oldName];
        }

        return { ...d, fields: newFields, fieldConfigs: newConfigs };
    }));

    // 2. Mettre à jour toutes les données dans les lots
    setAllBatches(prev => prev.map(b => {
        if (b.datasetId !== datasetId) return b;
        
        const newRows = b.rows.map(r => {
            const val = r[oldName];
            const newRow = { ...r, [newName]: val };
            delete newRow[oldName];
            return newRow as DataRow;
        });

        return { ...b, rows: newRows };
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

  const deleteBatchRow = useCallback((batchId: string, rowId: string) => {
     setAllBatches(prev => prev.map(b => {
        if (b.id !== batchId) return b;
        return {
           ...b,
           // String comparison just in case
           rows: b.rows.filter(r => String(r.id) !== String(rowId))
        };
     }));
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
     setDashboardFilters(prev => ({ ...prev, [field]: value }));
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
  
  // --- PERSISTENCE ACTIONS ---

  const savePivotState = useCallback((state: PivotState | null) => {
    setLastPivotState(state);
  }, []);

  const saveAnalyticsState = useCallback((state: AnalyticsState | null) => {
    setLastAnalyticsState(state);
  }, []);

  // --- SYSTEM ---

  const clearAll = useCallback(async () => {
    setDatasets([]);
    setAllBatches([]);
    setSavedMappings({});
    setDashboardWidgets([]);
    setDashboardFilters({});
    setSavedAnalyses([]);
    setCurrentDatasetId(null);
    setLastPivotState(null);
    setLastAnalyticsState(null);
    await db.clear(); // Clear DB
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  }, []);

  const loadDemoData = useCallback(() => {
    const id1 = 'demo-rh';
    // Suppression du second dataset "Référentiel Entreprises" jugé inutile
    
    const ds1: Dataset = { 
      id: id1, 
      name: 'Effectifs RH', 
      fields: ['Nom', 'Email', 'Organisation', 'DateModif', 'Commentaire', 'Budget', 'Quantité'], 
      fieldConfigs: { 'Budget': { type: 'number', unit: 'k€' } },
      createdAt: Date.now() 
    };

    const batches1 = generateSyntheticData(id1);
    
    setDatasets([ds1]);
    setAllBatches([...batches1]);
    setCurrentDatasetId(id1);
    
    // Default Widgets (Demo)
    setDashboardWidgets([
       { id: 'w1', title: 'Effectif Total', type: 'kpi', size: 'sm', config: { source: { datasetId: id1, mode: 'latest' }, metric: 'count', showTrend: true } },
       { id: 'w2', title: 'Budget Global', type: 'kpi', size: 'sm', config: { source: { datasetId: id1, mode: 'latest' }, metric: 'sum', valueField: 'Budget', showTrend: true } },
       { id: 'w3', title: 'Évolution Effectifs', type: 'chart', size: 'full', config: { source: { datasetId: id1, mode: 'latest' }, metric: 'count', dimension: 'DateModif', chartType: 'line' } }
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
      lastPivotState,
      lastAnalyticsState,
      exportDate: new Date().toISOString()
    };
    return JSON.stringify(state, null, 2);
  }, [datasets, batches, savedMappings, currentDatasetId, dashboardWidgets, savedAnalyses, lastPivotState, lastAnalyticsState]);

  const importBackup = useCallback(async (jsonData: string) => {
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
      setLastPivotState(parsed.lastPivotState || null);
      setLastAnalyticsState(parsed.lastAnalyticsState || null);
      
      if (parsed.currentDatasetId && parsed.datasets.find((d: Dataset) => d.id === parsed.currentDatasetId)) {
        setCurrentDatasetId(parsed.currentDatasetId);
      } else if (parsed.datasets.length > 0) {
        setCurrentDatasetId(parsed.datasets[0].id);
      } else {
        setCurrentDatasetId(null);
      }
      
      await db.save(parsed); // Save to DB immediately
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }, []);

  if (isLoading) {
      return <div className="h-screen w-screen flex items-center justify-center bg-slate-50 text-slate-500 font-medium">Chargement des données...</div>;
  }

  return (
    <DataContext.Provider value={{ 
      datasets,
      currentDataset,
      currentDatasetId,
      batches: batches,
      filteredBatches,
      savedMappings,
      dashboardWidgets,
      dashboardFilters,
      savedAnalyses,
      lastPivotState,
      lastAnalyticsState,
      isLoading,
      savePivotState,
      saveAnalyticsState,
      switchDataset,
      createDataset,
      updateDatasetName,
      deleteDataset,
      deleteDatasetField,
      renameDatasetField,
      addFieldToDataset,
      updateDatasetConfigs,
      addCalculatedField,
      removeCalculatedField,
      addBatch, 
      deleteBatch, 
      deleteBatchRow,
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

export const useDatasets = () => {
  const context = useData();
  return {
    datasets: context.datasets,
    currentDataset: context.currentDataset,
    currentDatasetId: context.currentDatasetId,
    switchDataset: context.switchDataset,
    createDataset: context.createDataset,
    updateDatasetName: context.updateDatasetName,
    deleteDataset: context.deleteDataset,
    deleteDatasetField: context.deleteDatasetField,
    renameDatasetField: context.renameDatasetField,
    addFieldToDataset: context.addFieldToDataset,
    updateDatasetConfigs: context.updateDatasetConfigs,
    addCalculatedField: context.addCalculatedField,
    removeCalculatedField: context.removeCalculatedField
  };
};

export const useBatches = () => {
  const context = useData();
  return {
    batches: context.batches,
    filteredBatches: context.filteredBatches,
    addBatch: context.addBatch,
    deleteBatch: context.deleteBatch,
    deleteBatchRow: context.deleteBatchRow
  };
};

export const useWidgets = () => {
  const context = useData();
  return {
    dashboardWidgets: context.dashboardWidgets,
    dashboardFilters: context.dashboardFilters,
    addDashboardWidget: context.addDashboardWidget,
    updateDashboardWidget: context.updateDashboardWidget,
    removeDashboardWidget: context.removeDashboardWidget,
    moveDashboardWidget: context.moveDashboardWidget,
    resetDashboard: context.resetDashboard,
    setDashboardFilter: context.setDashboardFilter,
    clearDashboardFilters: context.clearDashboardFilters
  };
};
