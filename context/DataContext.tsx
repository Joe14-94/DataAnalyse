
import React, { useState, useEffect, useCallback, useRef, useContext } from 'react';
import { ImportBatch, AppState, DataRow, Dataset, FieldConfig, DashboardWidget, CalculatedField, SavedAnalysis, PivotState, AnalyticsState } from '../types';
import { APP_VERSION, generateSyntheticData, db, generateId } from '../utils';

import { DatasetContext, useDatasets } from './DatasetContext';
import { BatchContext, useBatches } from './BatchContext';
import { WidgetContext, useWidgets } from './WidgetContext';
import { AnalyticsContext, useAnalytics } from './AnalyticsContext';
import { PersistenceContext, usePersistence } from './PersistenceContext';

// Explicitly export hooks to avoid re-export issues
export { useDatasets, useBatches, useWidgets, useAnalytics, usePersistence };

// OLD KEY for migration (keep for fallback)
const LEGACY_STORAGE_KEY = 'app_data_v4_global';

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // --- GLOBAL STATE ---
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [batches, setAllBatches] = useState<ImportBatch[]>([]);
  const [dashboardWidgets, setDashboardWidgets] = useState<DashboardWidget[]>([]);
  const [savedMappings, setSavedMappings] = useState<Record<string, string>>({});
  const [currentDatasetId, setCurrentDatasetId] = useState<string | null>(null);
  const [dashboardFilters, setDashboardFilters] = useState<Record<string, any>>({});
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([]);
  const [lastPivotState, setLastPivotState] = useState<PivotState | null>(null);
  const [lastAnalyticsState, setLastAnalyticsState] = useState<AnalyticsState | null>(null);
  const [companyLogo, setCompanyLogo] = useState<string | undefined>(undefined); // NEW
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean>(false); // NEW
  
  const [isLoading, setIsLoading] = useState(true);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- COMPUTED ---
  const currentDataset = datasets.find(d => d.id === currentDatasetId) || null;
  const filteredBatches = batches
    .filter(b => b.datasetId === currentDatasetId)
    .sort((a, b) => new Date(a.date).getTime() - new Date(a.date).getTime());

  // --- LOAD & MIGRATION ---
  useEffect(() => {
    const init = async () => {
      try {
        const dbData = await db.load();
        
        if (dbData) {
          setDatasets(dbData.datasets || []);
          setAllBatches(dbData.batches || []);
          setSavedMappings(dbData.savedMappings || {});
          setDashboardWidgets(dbData.dashboardWidgets || []);
          setSavedAnalyses(dbData.savedAnalyses || []);
          setLastPivotState(dbData.lastPivotState || null);
          setLastAnalyticsState(dbData.lastAnalyticsState || null);
          setCompanyLogo(dbData.companyLogo); // NEW
          setHasSeenOnboarding(!!dbData.hasSeenOnboarding); // NEW

          if (dbData.currentDatasetId) {
            setCurrentDatasetId(dbData.currentDatasetId);
          } else if (dbData.datasets && dbData.datasets.length > 0) {
            setCurrentDatasetId(dbData.datasets[0].id);
          }
        } else {
          const stored = localStorage.getItem(LEGACY_STORAGE_KEY);
          if (stored) {
            const parsed = JSON.parse(stored);
            setDatasets(parsed.datasets || []);
            setAllBatches(parsed.batches || []);
            setSavedMappings(parsed.savedMappings || {});
            setDashboardWidgets(parsed.dashboardWidgets || []);
            setSavedAnalyses(parsed.savedAnalyses || []);
            setLastPivotState(parsed.lastPivotState || null);
            setLastAnalyticsState(parsed.lastAnalyticsState || null);
            setCompanyLogo(parsed.companyLogo); // NEW
            setHasSeenOnboarding(!!parsed.hasSeenOnboarding); // NEW
            setCurrentDatasetId(parsed.currentDatasetId || (parsed.datasets?.[0]?.id) || null);
            
            await db.save(parsed);
            localStorage.removeItem(LEGACY_STORAGE_KEY);
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

  // --- AUTO-SAVE ---
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
        lastAnalyticsState,
        companyLogo,
        hasSeenOnboarding
      };
      
      db.save(state).catch(e => console.error("Failed to save to DB", e));
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [datasets, batches, savedMappings, currentDatasetId, dashboardWidgets, savedAnalyses, lastPivotState, lastAnalyticsState, companyLogo, hasSeenOnboarding, isLoading]);

  // --- DATASET ACTIONS ---
  const switchDataset = useCallback((id: string) => {
    setCurrentDatasetId(id);
    setDashboardFilters({}); 
  }, []);

  const createDataset = useCallback((name: string, fields: string[], fieldConfigs?: Record<string, FieldConfig>) => {
    const newId = generateId();
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

    setDatasets(prev => prev.map(d => {
        if (d.id !== datasetId) return d;
        const newFields = d.fields.map(f => f === oldName ? newName : f);
        const newConfigs = { ...d.fieldConfigs };
        if (newConfigs[oldName]) {
            newConfigs[newName] = newConfigs[oldName];
            delete newConfigs[oldName];
        }
        return { ...d, fields: newFields, fieldConfigs: newConfigs };
    }));

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

  // --- BATCH ACTIONS ---
  const addBatch = useCallback((datasetId: string, date: string, rows: any[]) => {
    const newBatch: ImportBatch = {
      id: generateId(),
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
           rows: b.rows.filter(r => String(r.id) !== String(rowId))
        };
     }));
  }, []);

  // --- WIDGET ACTIONS ---
  const addDashboardWidget = useCallback((widget: Omit<DashboardWidget, 'id'>) => {
    const newWidget = { ...widget, id: generateId() };
    setDashboardWidgets(prev => [...prev, newWidget]);
  }, []);

  const duplicateDashboardWidget = useCallback((widgetId: string) => {
    setDashboardWidgets(prev => {
      const widgetIndex = prev.findIndex(w => w.id === widgetId);
      if (widgetIndex === -1) return prev;
      
      const original = prev[widgetIndex];
      const newWidget = {
        ...original,
        id: generateId(),
        title: `${original.title} (Copie)`
      };
      
      // Insert right after original
      const newWidgets = [...prev];
      newWidgets.splice(widgetIndex + 1, 0, newWidget);
      return newWidgets;
    });
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

  const reorderDashboardWidgets = useCallback((startIndex: number, endIndex: number) => {
    setDashboardWidgets(prev => {
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return result;
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

  // --- ANALYTICS ACTIONS ---
  const saveAnalysis = useCallback((analysis: Omit<SavedAnalysis, 'id' | 'createdAt'>) => {
    const newAnalysis: SavedAnalysis = {
      ...analysis,
      id: generateId(),
      createdAt: Date.now()
    };
    setSavedAnalyses(prev => [...prev, newAnalysis]);
  }, []);

  const deleteAnalysis = useCallback((id: string) => {
    setSavedAnalyses(prev => prev.filter(a => a.id !== id));
  }, []);

  const savePivotState = useCallback((state: PivotState | null) => {
    setLastPivotState(state);
  }, []);

  const saveAnalyticsState = useCallback((state: AnalyticsState | null) => {
    setLastAnalyticsState(state);
  }, []);

  // --- PERSISTENCE ACTIONS ---
  const clearAll = useCallback(async () => {
    setDatasets([]);
    setAllBatches([]);
    setSavedMappings({});
    setDashboardWidgets([]);
    setDashboardFilters({});
    setSavedAnalyses([]);
    setCompanyLogo(undefined); // NEW
    setCurrentDatasetId(null);
    setLastPivotState(null);
    setLastAnalyticsState(null);
    setHasSeenOnboarding(false);
    await db.clear();
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  }, []);

  const loadDemoData = useCallback(() => {
    const id1 = 'demo-rh';
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
    setDashboardWidgets([
       { id: 'w1', title: 'Effectif Total', type: 'kpi', size: 'sm', config: { source: { datasetId: id1, mode: 'latest' }, metric: 'count', showTrend: true } },
       { id: 'w2', title: 'Budget Global', type: 'kpi', size: 'sm', config: { source: { datasetId: id1, mode: 'latest' }, metric: 'sum', valueField: 'Budget', showTrend: true } },
       { id: 'w3', title: 'Évolution Effectifs', type: 'chart', size: 'full', config: { source: { datasetId: id1, mode: 'latest' }, metric: 'count', dimension: 'DateModif', chartType: 'line' } }
    ]);
  }, []);

  const updateSavedMappings = useCallback((newMappings: Record<string, string>) => {
    setSavedMappings(prev => ({ ...prev, ...newMappings }));
  }, []);

  const updateCompanyLogo = useCallback((logo: string | undefined) => {
      setCompanyLogo(logo);
  }, []);

  const completeOnboarding = useCallback(() => {
      setHasSeenOnboarding(true);
  }, []);

  const getBackupJson = useCallback(() => {
    const state: AppState = { 
      datasets, batches, dashboardWidgets, savedAnalyses,
      version: APP_VERSION, savedMappings, currentDatasetId,
      lastPivotState, lastAnalyticsState, companyLogo,
      hasSeenOnboarding,
      exportDate: new Date().toISOString()
    };
    return JSON.stringify(state, null, 2);
  }, [datasets, batches, savedMappings, currentDatasetId, dashboardWidgets, savedAnalyses, lastPivotState, lastAnalyticsState, companyLogo, hasSeenOnboarding]);

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
      setCompanyLogo(parsed.companyLogo); // NEW
      setHasSeenOnboarding(!!parsed.hasSeenOnboarding); // NEW
      
      if (parsed.currentDatasetId && parsed.datasets.find((d: Dataset) => d.id === parsed.currentDatasetId)) {
        setCurrentDatasetId(parsed.currentDatasetId);
      } else if (parsed.datasets.length > 0) {
        setCurrentDatasetId(parsed.datasets[0].id);
      } else {
        setCurrentDatasetId(null);
      }
      await db.save(parsed);
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
    <PersistenceContext.Provider value={{ isLoading, savedMappings, companyLogo, updateCompanyLogo, importBackup, getBackupJson, clearAll, loadDemoData, updateSavedMappings, hasSeenOnboarding, completeOnboarding }}>
      <DatasetContext.Provider value={{ datasets, currentDataset, currentDatasetId, switchDataset, createDataset, updateDatasetName, deleteDataset, addFieldToDataset, deleteDatasetField, renameDatasetField, updateDatasetConfigs, addCalculatedField, removeCalculatedField }}>
        <BatchContext.Provider value={{ batches, filteredBatches, addBatch, deleteBatch, deleteBatchRow }}>
          <WidgetContext.Provider value={{ dashboardWidgets, dashboardFilters, addDashboardWidget, duplicateDashboardWidget, updateDashboardWidget, removeDashboardWidget, moveDashboardWidget, reorderDashboardWidgets, resetDashboard, setDashboardFilter, clearDashboardFilters }}>
            <AnalyticsContext.Provider value={{ savedAnalyses, lastPivotState, lastAnalyticsState, saveAnalysis, deleteAnalysis, savePivotState, saveAnalyticsState }}>
              {children}
            </AnalyticsContext.Provider>
          </WidgetContext.Provider>
        </BatchContext.Provider>
      </DatasetContext.Provider>
    </PersistenceContext.Provider>
  );
};

export const useData = () => {
  const ds = useContext(DatasetContext);
  const bt = useContext(BatchContext);
  const wg = useContext(WidgetContext);
  const an = useContext(AnalyticsContext);
  const ps = useContext(PersistenceContext);

  if (!ds || !bt || !wg || !an || !ps) {
    throw new Error("useData must be used within DataProvider");
  }

  return { ...ds, ...bt, ...wg, ...an, ...ps };
};
