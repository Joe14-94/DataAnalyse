
import React, { useState, useEffect, useCallback, useMemo, useRef, useContext } from 'react';
import { ImportBatch, AppState, DataRow, Dataset, FieldConfig, DashboardWidget, CalculatedField, SavedAnalysis, PivotState, AnalyticsState, FinanceReferentials, BudgetModule, ForecastModule, PipelineModule, DataExplorerState } from '../types';
import { APP_VERSION, db, generateId, evaluateFormula, decompressBatch } from '../utils';
import { getDemoData, createBackupJson } from '../logic/dataService';
import { calculatePivotData } from '../logic/pivotEngine';
import { pivotToDatasetRows } from '../utils/pivotToDataset';

import { DatasetContext, useDatasets } from './DatasetContext';
import { BatchContext, useBatches } from './BatchContext';
import { WidgetContext, useWidgets } from './WidgetContext';
import { AnalyticsContext, useAnalytics } from './AnalyticsContext';
import { PersistenceContext, usePersistence } from './PersistenceContext';
import { ReferentialProvider, useReferentials } from './ReferentialContext';
import { BudgetProvider, useBudget } from './BudgetContext';
import { ForecastProvider, useForecast } from './ForecastContext';
import { SettingsProvider, useSettings } from './SettingsContext';
import { PipelineProvider, usePipeline } from './PipelineContext';

// Explicitly export hooks to avoid re-export issues
export { useDatasets, useBatches, useWidgets, useAnalytics, usePersistence, useReferentials, useBudget, useForecast, useSettings, usePipeline };

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
  const [lastDataExplorerState, setLastDataExplorerState] = useState<DataExplorerState | null>(null);
  const [companyLogo, setCompanyLogo] = useState<string | undefined>(undefined); // NEW
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean>(false); // NEW
  const [financeReferentials, setFinanceReferentials] = useState<FinanceReferentials>({}); // NEW
  const [budgetModule, setBudgetModule] = useState<BudgetModule>({ budgets: [], templates: [], comments: [], notifications: [] }); // NEW - Budget Module
  const [forecastModule, setForecastModule] = useState<ForecastModule>({ forecasts: [], reconciliationReports: [] }); // NEW - Forecast Module
  const [pipelineModule, setPipelineModule] = useState<PipelineModule>({ pipelines: [], executionResults: {} }); // NEW - Pipeline Module
  const [uiPrefs, setUiPrefs] = useState<any>(undefined); // NEW

  const [isLoading, setIsLoading] = useState(true);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- COMPUTED ---
  const currentDataset = useMemo(() => datasets.find(d => d.id === currentDatasetId) || null, [datasets, currentDatasetId]);

  // BOLT OPTIMIZATION: Memoize filtered batches and fix sort bug (was a.date - a.date)
  const filteredBatches = useMemo(() => {
    if (!currentDatasetId) return [];
    return batches
      .filter(b => b.datasetId === currentDatasetId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [batches, currentDatasetId]);

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
          setLastDataExplorerState(dbData.lastDataExplorerState || null);
          setCompanyLogo(dbData.companyLogo); // NEW
          setHasSeenOnboarding(!!dbData.hasSeenOnboarding); // NEW
          setFinanceReferentials(dbData.financeReferentials || {}); // NEW
          setBudgetModule(dbData.budgetModule || { budgets: [], templates: [], comments: [], notifications: [] }); // NEW - Budget Module
          setForecastModule(dbData.forecastModule || { forecasts: [], reconciliationReports: [] }); // NEW - Forecast Module
          setPipelineModule(dbData.pipelineModule || { pipelines: [], executionResults: {} }); // NEW - Pipeline Module
          if (dbData.uiPrefs) setUiPrefs(dbData.uiPrefs); // NEW

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
            setLastDataExplorerState(parsed.lastDataExplorerState || null);
            setCompanyLogo(parsed.companyLogo); // NEW
            setHasSeenOnboarding(!!parsed.hasSeenOnboarding); // NEW
            setFinanceReferentials(parsed.financeReferentials || {}); // NEW
            setBudgetModule(parsed.budgetModule || { budgets: [], templates: [], comments: [], notifications: [] }); // NEW - Budget Module
            if (parsed.uiPrefs) setUiPrefs(parsed.uiPrefs); // NEW
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
        lastDataExplorerState,
        companyLogo,
        hasSeenOnboarding,
        financeReferentials,
        budgetModule,
        forecastModule,
        pipelineModule,
        uiPrefs
      };

      db.save(state).catch(e => console.error("Failed to save to DB", e));
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [datasets, batches, savedMappings, currentDatasetId, dashboardWidgets, savedAnalyses, lastPivotState, lastAnalyticsState, companyLogo, hasSeenOnboarding, financeReferentials, budgetModule, forecastModule, pipelineModule, uiPrefs, isLoading]);

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

  const createDerivedDataset = useCallback((name: string, fields: string[], rows: any[], sourcePivotConfig: any) => {
    const newId = generateId();
    const newDataset: Dataset = {
      id: newId,
      name,
      fields,
      sourcePivotConfig,
      createdAt: Date.now()
    };
    setDatasets(prev => [...prev, newDataset]);

    const newBatch: ImportBatch = {
      id: generateId(),
      datasetId: newId,
      date: new Date().toISOString().split('T')[0],
      createdAt: Date.now(),
      rows
    };
    setAllBatches(prev => [...prev, newBatch]);

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

  const reorderDatasetFields = useCallback((datasetId: string, fields: string[]) => {
    setDatasets(prev => prev.map(d => {
      if (d.id !== datasetId) return d;
      return { ...d, fields };
    }));
  }, []);

  const updateCalculatedField = useCallback((datasetId: string, fieldId: string, updates: Partial<CalculatedField>) => {
    setDatasets(prev => prev.map(d => {
      if (d.id !== datasetId) return d;
      return {
        ...d,
        calculatedFields: (d.calculatedFields || []).map(f => f.id === fieldId ? { ...f, ...updates } : f)
      };
    }));

    // Recalculate all calculated fields on existing data
    setAllBatches(prev => prev.map(b => {
      if (b.datasetId !== datasetId) return b;
      const dataset = datasets.find(d => d.id === datasetId);
      if (!dataset) return b;

      // Get updated calculated fields
      const allCalcFields = (dataset.calculatedFields || []).map(f =>
        f.id === fieldId ? { ...f, ...updates } : f
      );

      return {
        ...b,
        rows: b.rows.map(row => {
          const enrichedRow = { ...row };
          allCalcFields.forEach(cf => {
            enrichedRow[cf.name] = evaluateFormula(enrichedRow, cf.formula, cf.outputType);
          });
          return enrichedRow;
        })
      };
    }));
  }, [datasets]);

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

    // Recalculate all calculated fields on existing data
    setAllBatches(prev => prev.map(b => {
      if (b.datasetId !== datasetId) return b;
      const dataset = datasets.find(d => d.id === datasetId);
      if (!dataset) return b;

      const allCalcFields = [...(dataset.calculatedFields || []), field];

      return {
        ...b,
        rows: b.rows.map(row => {
          const enrichedRow = { ...row };
          allCalcFields.forEach(cf => {
            enrichedRow[cf.name] = evaluateFormula(enrichedRow, cf.formula, cf.outputType);
          });
          return enrichedRow;
        })
      };
    }));
  }, [datasets]);

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
    // Apply automatic enrichments and calculated fields if configured for this dataset
    const dataset = datasets.find(d => d.id === datasetId);
    let processedRows = rows;

    if (dataset) {
      // 1. Apply Enrichment Configs
      if (dataset.enrichmentConfigs && dataset.enrichmentConfigs.length > 0) {
        dataset.enrichmentConfigs.forEach(config => {
          // Get target dataset's latest batch
          const targetBatches = batches.filter(b => b.datasetId === config.targetDatasetId).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          if (targetBatches.length > 0) {
            const targetBatch = targetBatches[targetBatches.length - 1];
            const lookupMap = new Map<string, any>();
            targetBatch.rows.forEach(row => {
              const key = String(row[config.secondaryKey]).trim();
              if (key) lookupMap.set(key, row);
            });

            processedRows = processedRows.map(row => {
              const key = String(row[config.primaryKey]).trim();
              const matchedRow = lookupMap.get(key);
              const val = matchedRow
                ? (config.columnsToAdd.length === 1 ? matchedRow[config.columnsToAdd[0]] : config.columnsToAdd.map(col => matchedRow[col]).join(' | '))
                : null;
              return { ...row, [config.newColumnName]: val };
            });
          }
        });
      }

      // 2. Apply Calculated Fields (Store them for better performance)
      if (dataset.calculatedFields && dataset.calculatedFields.length > 0) {
        processedRows = processedRows.map(row => {
          const enrichedRow = { ...row };
          dataset.calculatedFields?.forEach(cf => {
             enrichedRow[cf.name] = evaluateFormula(enrichedRow, cf.formula, cf.outputType);
          });
          return enrichedRow;
        });
      }
    }

    const newBatch: ImportBatch = {
      id: generateId(),
      datasetId,
      date,
      createdAt: Date.now(),
      rows: processedRows
    };

    // --- SYNC DERIVED DATASETS ---
    const derivedDatasets = datasets.filter(d => d.sourcePivotConfig?.datasetId === datasetId);
    const additionalBatches: ImportBatch[] = [];

    if (derivedDatasets.length > 0) {
        // We need all rows from the source dataset including the new batch
        const sourceBatches = batches.filter(b => b.datasetId === datasetId);
        const allSourceRows = [...sourceBatches.flatMap(b => b.rows), ...processedRows];

        derivedDatasets.forEach(derivedDs => {
            const config = { ...derivedDs.sourcePivotConfig, rows: allSourceRows };
            const pivotResult = calculatePivotData(config);
            if (pivotResult) {
                const flatRows = pivotToDatasetRows(
                    pivotResult,
                    config.rowFields,
                    config.colFields || [],
                    config.metrics || (config.valField ? [{ field: config.valField, aggType: config.aggType }] : [])
                );

                additionalBatches.push({
                    id: generateId(),
                    datasetId: derivedDs.id,
                    date,
                    createdAt: Date.now(),
                    rows: flatRows
                });
            }
        });
    }

    setAllBatches(prev => [...prev, newBatch, ...additionalBatches]);
  }, [datasets, batches]);

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

  const updateRows = useCallback((updatesByBatch: Record<string, Record<string, any>>) => {
    setAllBatches(prev => prev.map(b => {
      const batchUpdates = updatesByBatch[b.id];
      if (!batchUpdates) return b;
      return {
        ...b,
        rows: b.rows.map(r => {
          const rowUpdate = batchUpdates[String(r.id)];
          return rowUpdate ? { ...r, ...rowUpdate } : r;
        })
      };
    }));
  }, []);

  const enrichBatchesWithLookup = useCallback((datasetId: string, targetDatasetId: string, primaryKey: string, secondaryKey: string, columnsToAdd: string[], newColumnName: string) => {
    // Get target dataset's latest batch
    const targetBatches = batches.filter(b => b.datasetId === targetDatasetId).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (targetBatches.length === 0) return false;

    const targetBatch = targetBatches[targetBatches.length - 1];

    // Save configuration to dataset for future imports
    setDatasets(prev => prev.map(d => {
       if (d.id !== datasetId) return d;
       const newConfig = { id: generateId(), targetDatasetId, primaryKey, secondaryKey, columnsToAdd, newColumnName };
       return {
          ...d,
          enrichmentConfigs: [...(d.enrichmentConfigs || []), newConfig]
       };
    }));

    // Create lookup map
    const lookupMap = new Map<string, any>();
    targetBatch.rows.forEach(row => {
      const key = String(row[secondaryKey]).trim();
      if (key) {
        lookupMap.set(key, row);
      }
    });

    // Update all batches of the specified dataset
    setAllBatches(prev => prev.map(b => {
      if (b.datasetId !== datasetId) return b;

      const enrichedRows = b.rows.map(row => {
        const key = String(row[primaryKey]).trim();
        const matchedRow = lookupMap.get(key);

        if (matchedRow && columnsToAdd.length === 1) {
          // Single column: store value directly
          return {
            ...row,
            [newColumnName]: matchedRow[columnsToAdd[0]]
          };
        } else if (matchedRow) {
          // Multiple columns: concatenate with separator
          const values = columnsToAdd.map(col => matchedRow[col]);
          return {
            ...row,
            [newColumnName]: values.join(' | ')
          };
        }

        return {
          ...row,
          [newColumnName]: null
        };
      });

      return {
        ...b,
        rows: enrichedRows
      };
    }));

    return true;
  }, [batches]);

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

  const updateAnalysis = useCallback((id: string, updates: Partial<SavedAnalysis>) => {
    setSavedAnalyses(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
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

  const saveDataExplorerState = useCallback((state: DataExplorerState | null) => {
    setLastDataExplorerState(state);
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
    const { datasets, batches, widgets, currentDatasetId } = getDemoData();
    setDatasets(datasets);
    setAllBatches(batches);
    setCurrentDatasetId(currentDatasetId);
    setDashboardWidgets(widgets);
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

  const updateFinanceReferentials = useCallback((referentials: FinanceReferentials) => {
    setFinanceReferentials(referentials);
  }, []);

  const updateBudgetModule = useCallback((module: BudgetModule) => {
    setBudgetModule(module);
  }, []);

  const updateForecastModule = useCallback((module: ForecastModule) => {
    setForecastModule(module);
  }, []);

  const updatePipelineModule = useCallback((module: PipelineModule) => {
    setPipelineModule(module);
  }, []);

  const getBackupJson = useCallback((keys?: (keyof AppState)[]) => {
    const fullState: AppState = {
      datasets, batches, dashboardWidgets, savedAnalyses,
      version: APP_VERSION, savedMappings, currentDatasetId,
      lastPivotState, lastAnalyticsState, lastDataExplorerState, companyLogo,
      hasSeenOnboarding, financeReferentials, budgetModule, forecastModule, pipelineModule, uiPrefs
    };

    if (!keys) return createBackupJson(fullState);

    const partialState: any = { version: APP_VERSION };
    keys.forEach(k => {
      partialState[k] = (fullState as any)[k];
    });

    return createBackupJson(partialState);
  }, [datasets, batches, savedMappings, currentDatasetId, dashboardWidgets, savedAnalyses, lastPivotState, lastAnalyticsState, companyLogo, hasSeenOnboarding, financeReferentials, budgetModule, forecastModule, pipelineModule, uiPrefs]);

  const importBackup = useCallback(async (jsonData: string, keys?: (keyof AppState)[]) => {
    try {
      const parsed = JSON.parse(jsonData);

      const shouldImport = (key: keyof AppState) => !keys || keys.includes(key);

      if (shouldImport('datasets') && parsed.datasets) setDatasets(parsed.datasets);
      if (shouldImport('batches') && parsed.batches) {
        setAllBatches(parsed.batches.map((b: any) => decompressBatch(b)));
      }
      if (shouldImport('savedMappings') && parsed.savedMappings) setSavedMappings(parsed.savedMappings);
      if (shouldImport('dashboardWidgets') && parsed.dashboardWidgets) setDashboardWidgets(parsed.dashboardWidgets);
      if (shouldImport('savedAnalyses') && parsed.savedAnalyses) setSavedAnalyses(parsed.savedAnalyses);
      if (shouldImport('lastPivotState') && parsed.lastPivotState) setLastPivotState(parsed.lastPivotState);
      if (shouldImport('lastAnalyticsState') && parsed.lastAnalyticsState) setLastAnalyticsState(parsed.lastAnalyticsState);
      if (shouldImport('lastDataExplorerState') && parsed.lastDataExplorerState) setLastDataExplorerState(parsed.lastDataExplorerState);
      if (shouldImport('companyLogo') && parsed.companyLogo) setCompanyLogo(parsed.companyLogo);
      if (shouldImport('hasSeenOnboarding') && parsed.hasSeenOnboarding !== undefined) setHasSeenOnboarding(!!parsed.hasSeenOnboarding);
      if (shouldImport('financeReferentials') && parsed.financeReferentials) setFinanceReferentials(parsed.financeReferentials);
      if (shouldImport('budgetModule') && parsed.budgetModule) setBudgetModule(parsed.budgetModule);
      if (shouldImport('forecastModule') && parsed.forecastModule) setForecastModule(parsed.forecastModule);
      if (shouldImport('pipelineModule') && parsed.pipelineModule) setPipelineModule(parsed.pipelineModule);
      if (shouldImport('uiPrefs') && parsed.uiPrefs) setUiPrefs(parsed.uiPrefs);

      if (shouldImport('currentDatasetId')) {
        if (parsed.currentDatasetId && (parsed.datasets || datasets).find((d: Dataset) => d.id === parsed.currentDatasetId)) {
          setCurrentDatasetId(parsed.currentDatasetId);
        } else if (parsed.datasets && parsed.datasets.length > 0) {
          setCurrentDatasetId(parsed.datasets[0].id);
        }
      }

      // To persist accurately, we should really load the current state, merge with parsed, then save.
      // But db.save(parsed) might overwrite everything if parsed is partial.
      // Let's fix that.
      const currentState = await db.load();
      const mergedState = { ...currentState, ...parsed };
      await db.save(mergedState);

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
      <SettingsProvider initialPrefs={uiPrefs} onPrefsChange={setUiPrefs}>
        <ReferentialProvider referentials={financeReferentials} onUpdate={updateFinanceReferentials}>
          <BudgetProvider budgetModule={budgetModule} onUpdate={updateBudgetModule}>
            <ForecastProvider forecastModule={forecastModule} onUpdate={updateForecastModule}>
              <PipelineProvider pipelineModule={pipelineModule} onUpdate={updatePipelineModule}>
                <DatasetContext.Provider value={{ datasets, currentDataset, currentDatasetId, switchDataset, createDataset, createDerivedDataset, updateDatasetName, deleteDataset, addFieldToDataset, deleteDatasetField, renameDatasetField, updateDatasetConfigs, addCalculatedField, removeCalculatedField, updateCalculatedField, reorderDatasetFields }}>
                <BatchContext.Provider value={{ batches, filteredBatches, addBatch, deleteBatch, deleteBatchRow, updateRows, enrichBatchesWithLookup }}>
                  <WidgetContext.Provider value={{ dashboardWidgets, dashboardFilters, addDashboardWidget, duplicateDashboardWidget, updateDashboardWidget, removeDashboardWidget, moveDashboardWidget, reorderDashboardWidgets, resetDashboard, setDashboardFilter, clearDashboardFilters }}>
                    <AnalyticsContext.Provider value={{ savedAnalyses, lastPivotState, lastAnalyticsState, lastDataExplorerState, saveAnalysis, updateAnalysis, deleteAnalysis, savePivotState, saveAnalyticsState, saveDataExplorerState }}>
                      {children}
                    </AnalyticsContext.Provider>
                  </WidgetContext.Provider>
                </BatchContext.Provider>
                </DatasetContext.Provider>
              </PipelineProvider>
            </ForecastProvider>
          </BudgetProvider>
        </ReferentialProvider>
      </SettingsProvider>
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
