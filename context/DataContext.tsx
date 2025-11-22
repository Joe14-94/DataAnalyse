

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ImportBatch, AppState, DataRow, Dataset, FieldConfig, DashboardWidget, WidgetConfig } from '../types';
import { APP_VERSION, generateSyntheticData } from '../utils';

interface DataContextType {
  datasets: Dataset[];
  currentDataset: Dataset | null;
  currentDatasetId: string | null;
  batches: ImportBatch[]; // Batches filtrés pour le dataset courant
  savedMappings: Record<string, string>;
  
  // Actions Dataset
  switchDataset: (id: string) => void;
  createDataset: (name: string, fields: string[], fieldConfigs?: Record<string, FieldConfig>) => string;
  updateDatasetName: (id: string, name: string) => void;
  deleteDataset: (id: string) => void;
  
  // Actions Data
  addBatch: (datasetId: string, date: string, rows: any[]) => void;
  deleteBatch: (id: string) => void;
  
  // Actions Fields
  addFieldToDataset: (datasetId: string, fieldName: string, config?: FieldConfig) => void;
  updateDatasetConfigs: (datasetId: string, configs: Record<string, FieldConfig>) => void;

  // Actions Dashboard Widgets
  addWidget: (widget: Omit<DashboardWidget, 'id'>) => void;
  updateWidget: (id: string, updates: Partial<DashboardWidget>) => void;
  removeWidget: (id: string) => void;
  moveWidget: (id: string, direction: 'left' | 'right') => void;
  resetDashboard: () => void;

  // System
  importBackup: (jsonData: string) => boolean;
  getBackupJson: () => string;
  clearAll: () => void;
  loadDemoData: () => void;
  updateSavedMappings: (newMappings: Record<string, string>) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const STORAGE_KEY = 'app_data_v3_multi';

// Widgets par défaut lors de la création d'un dataset
const DEFAULT_WIDGETS: DashboardWidget[] = [
  {
    id: 'default-1',
    title: 'Volume total',
    type: 'kpi',
    size: 'sm',
    config: { metric: 'count', showTrend: true }
  }
];

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [batches, setAllBatches] = useState<ImportBatch[]>([]); // Tous les batches
  const [savedMappings, setSavedMappings] = useState<Record<string, string>>({});
  
  const [currentDatasetId, setCurrentDatasetId] = useState<string | null>(null);

  // --- MIGRATION & LOAD ---
  useEffect(() => {
    try {
      const storedV3 = localStorage.getItem(STORAGE_KEY);
      
      if (storedV3) {
        const parsed = JSON.parse(storedV3);
        setDatasets(parsed.datasets || []);
        setAllBatches(parsed.batches || []);
        setSavedMappings(parsed.savedMappings || {});
        
        if (parsed.currentDatasetId && parsed.datasets?.find((d: Dataset) => d.id === parsed.currentDatasetId)) {
          setCurrentDatasetId(parsed.currentDatasetId);
        } else if (parsed.datasets && parsed.datasets.length > 0) {
          setCurrentDatasetId(parsed.datasets[0].id);
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

  // --- ACTIONS DATASET ---

  const switchDataset = useCallback((id: string) => {
    setCurrentDatasetId(id);
  }, []);

  const createDataset = useCallback((name: string, fields: string[], fieldConfigs?: Record<string, FieldConfig>) => {
    const newId = Math.random().toString(36).substr(2, 9);
    
    // Création de widgets par défaut basés sur les champs disponibles
    const initialWidgets: DashboardWidget[] = [...DEFAULT_WIDGETS];
    
    // Si on a des champs, on ajoute un graphe par défaut
    if (fields.length > 0) {
      initialWidgets.push({
        id: `default-chart-${Date.now()}`,
        title: `Répartition par ${fields[0]}`,
        type: 'chart',
        size: 'md',
        config: { metric: 'count', dimension: fields[0], chartType: 'bar' }
      });
    }

    const newDataset: Dataset = {
      id: newId,
      name,
      fields,
      fieldConfigs: fieldConfigs || {},
      widgets: initialWidgets,
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

  // --- ACTIONS WIDGETS ---

  const addWidget = useCallback((widget: Omit<DashboardWidget, 'id'>) => {
    if (!currentDatasetId) return;
    const newWidget = { ...widget, id: Math.random().toString(36).substr(2, 9) };
    setDatasets(prev => prev.map(d => {
      if (d.id !== currentDatasetId) return d;
      return { ...d, widgets: [...(d.widgets || []), newWidget] };
    }));
  }, [currentDatasetId]);

  const updateWidget = useCallback((widgetId: string, updates: Partial<DashboardWidget>) => {
    if (!currentDatasetId) return;
    setDatasets(prev => prev.map(d => {
      if (d.id !== currentDatasetId) return d;
      return { 
        ...d, 
        widgets: (d.widgets || []).map(w => w.id === widgetId ? { ...w, ...updates } : w) 
      };
    }));
  }, [currentDatasetId]);

  const removeWidget = useCallback((widgetId: string) => {
    if (!currentDatasetId) return;
    setDatasets(prev => prev.map(d => {
      if (d.id !== currentDatasetId) return d;
      return { ...d, widgets: (d.widgets || []).filter(w => w.id !== widgetId) };
    }));
  }, [currentDatasetId]);

  const moveWidget = useCallback((widgetId: string, direction: 'left' | 'right') => {
    if (!currentDatasetId) return;
    setDatasets(prev => prev.map(d => {
      if (d.id !== currentDatasetId) return d;
      const widgets = [...(d.widgets || [])];
      const idx = widgets.findIndex(w => w.id === widgetId);
      if (idx === -1) return d;
      
      const swapIdx = direction === 'left' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= widgets.length) return d;
      
      // Swap
      [widgets[idx], widgets[swapIdx]] = [widgets[swapIdx], widgets[idx]];
      return { ...d, widgets };
    }));
  }, [currentDatasetId]);

  const resetDashboard = useCallback(() => {
    if (!currentDatasetId) return;
    setDatasets(prev => prev.map(d => {
      if (d.id !== currentDatasetId) return d;
      return { ...d, widgets: [...DEFAULT_WIDGETS] };
    }));
  }, [currentDatasetId]);

  // --- SYSTEM ---

  const clearAll = useCallback(() => {
    setDatasets([]);
    setAllBatches([]);
    setSavedMappings({});
    setCurrentDatasetId(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const loadDemoData = useCallback(() => {
    const id1 = 'demo-rh';
    
    // Widgets démo RH
    const demoWidgets: DashboardWidget[] = [
      { id: 'w1', title: 'Effectif Total', type: 'kpi', size: 'sm', config: { metric: 'count', showTrend: true } },
      { id: 'w2', title: 'Budget Total', type: 'kpi', size: 'sm', config: { metric: 'sum', valueField: 'Budget', showTrend: true } },
      { id: 'w3', title: 'Organisations', type: 'kpi', size: 'sm', config: { metric: 'distinct', dimension: 'Organisation' } },
      { id: 'w4', title: 'Répartition par Organisation', type: 'chart', size: 'md', config: { metric: 'count', dimension: 'Organisation', chartType: 'pie' } },
      { id: 'w5', title: 'Budget par Organisation', type: 'chart', size: 'md', config: { metric: 'sum', dimension: 'Organisation', valueField: 'Budget', chartType: 'bar' } },
      { id: 'w6', title: 'Évolution des Effectifs', type: 'chart', size: 'full', config: { metric: 'count', dimension: 'DateModif', chartType: 'line' } }
    ];

    const ds1: Dataset = { 
      id: id1, 
      name: 'Effectifs RH', 
      fields: ['Nom', 'Email', 'Organisation', 'DateModif', 'Commentaire', 'Budget', 'Quantité'], 
      fieldConfigs: {
        'Budget': { type: 'number', unit: 'k€' },
        'Quantité': { type: 'number', unit: '' }
      },
      widgets: demoWidgets,
      createdAt: Date.now() 
    };
    
    const demoBatches = generateSyntheticData(id1);

    setDatasets([ds1]);
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
      
      setDatasets(parsed.datasets);
      setAllBatches(parsed.batches || []);
      setSavedMappings(parsed.savedMappings || {});
      
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
      addWidget,
      updateWidget,
      removeWidget,
      moveWidget,
      resetDashboard,
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
