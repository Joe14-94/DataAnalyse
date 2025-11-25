

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useData } from '../context/DataContext';
import { parseSmartNumber, detectColumnType, formatNumberValue, formatDateFr } from '../utils';
import { 
  Database, Filter, ArrowDownWideNarrow, Calculator, X, Layout,
  Table2, ArrowUpDown, SlidersHorizontal, Plus, Trash2, Layers,
  ArrowUp, ArrowDown, Link as LinkIcon, Save, Check,
  AlertTriangle, CalendarClock, Palette, PaintBucket, Type, Bold, Italic, Underline,
  PieChart
} from 'lucide-react';
import { MultiSelect } from '../components/ui/MultiSelect';
import { Checkbox } from '../components/ui/Checkbox';
import { useNavigate } from 'react-router-dom';
import { PivotStyleRule, FilterRule } from '../types';
import { calculatePivotData, formatPivotOutput, AggregationType, SortBy, SortOrder, DateGrouping } from '../logic/pivotEngine';

export const PivotTable: React.FC = () => {
  const { 
    batches, currentDataset, datasets, savedAnalyses, saveAnalysis, 
    lastPivotState, savePivotState, deleteBatch, isLoading 
  } = useData();
  const fields = currentDataset ? currentDataset.fields : [];
  const navigate = useNavigate();

  // --- STATE ---
  
  // Flag d'initialisation pour éviter d'écraser la sauvegarde au montage
  const [isInitialized, setIsInitialized] = useState(false);

  // Configuration de source
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  
  // DATA BLENDING STATE
  const [secondaryDatasetId, setSecondaryDatasetId] = useState<string>('');
  const [joinKeyPrimary, setJoinKeyPrimary] = useState<string>('');
  const [joinKeySecondary, setJoinKeySecondary] = useState<string>('');

  // Configuration TCD
  const [rowFields, setRowFields] = useState<string[]>([]); // Multi-niveaux
  const [colField, setColField] = useState<string>('');
  const [colGrouping, setColGrouping] = useState<DateGrouping>('none'); 
  const [valField, setValField] = useState<string>('');
  const [aggType, setAggType] = useState<AggregationType>('count');
  
  // Filtres (Structure avancée)
  const [filters, setFilters] = useState<FilterRule[]>([]);
  
  // Options d'affichage
  const [showSubtotals, setShowSubtotals] = useState(true);
  const [showTotalCol, setShowTotalCol] = useState(true);

  // Options de tri
  const [sortBy, setSortBy] = useState<SortBy>('label');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Largeur des colonnes (key -> width px)
  const [colWidths, setColWidths] = useState<Record<string, number>>({});
  const resizingRef = useRef<{ colId: string, startX: number, startWidth: number } | null>(null);

  // SAVE UI STATE
  const [isSaving, setIsSaving] = useState(false);
  const [analysisName, setAnalysisName] = useState('');

  // STYLING STATE
  const [isStyleMode, setIsStyleMode] = useState(false);
  const [styleRules, setStyleRules] = useState<PivotStyleRule[]>([]);
  const [activeStyleTarget, setActiveStyleTarget] = useState<{type: 'row'|'col'|'cell'|'total', key?: string} | null>(null);

  // --- DERIVED STATE ---
  
  // Filter batches to only show those belonging to the current dataset
  const datasetBatches = useMemo(() => {
    if (!currentDataset) return [];
    return batches
      .filter(b => b.datasetId === currentDataset.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [batches, currentDataset]);

  // --- INITIALISATION & PERSISTENCE ---

  // Chargement de l'état (LOAD)
  useEffect(() => {
     if (lastPivotState && currentDataset && lastPivotState.datasetId === currentDataset.id) {
         const c = lastPivotState.config;
         setRowFields(c.rowFields || []);
         setColField(c.colField || '');
         setColGrouping(c.colGrouping || 'none');
         setValField(c.valField || '');
         setAggType(c.aggType || 'count');
         
         // Backward compat for filters
         if (c.filters) {
             const loadedFilters = c.filters.map((f: any) => {
                 if (f.values) return { field: f.field, operator: 'in', value: f.values };
                 return f;
             });
             setFilters(loadedFilters);
         } else {
             setFilters([]);
         }

         setShowSubtotals(c.showSubtotals !== undefined ? c.showSubtotals : true);
         setShowTotalCol(c.showTotalCol !== undefined ? c.showTotalCol : true);
         setSortBy(c.sortBy || 'label');
         setSortOrder(c.sortOrder || 'asc');
         setSecondaryDatasetId(c.secondaryDatasetId || '');
         setJoinKeyPrimary(c.joinKeyPrimary || '');
         setJoinKeySecondary(c.joinKeySecondary || '');
         setStyleRules(c.styleRules || []);
         if (c.selectedBatchId) setSelectedBatchId(c.selectedBatchId);
     } else {
         // Default config si pas d'état sauvegardé
         setRowFields(fields.length > 0 ? [fields[0]] : []);
         setColField('');
         setColGrouping('none');
         setValField(fields.length > 0 ? fields[0] : '');
         setAggType('count');
         setFilters([]);
         setSecondaryDatasetId('');
         setJoinKeyPrimary('');
         setJoinKeySecondary('');
         setStyleRules([]);
         setSortBy('label');
         setSortOrder('asc');
     }
     setIsInitialized(true);
  }, [currentDataset?.id]);

  // Sauvegarde de l'état (SAVE)
  useEffect(() => {
     if (!isInitialized) return;

     if (currentDataset) {
        savePivotState({
            datasetId: currentDataset.id,
            config: {
                rowFields, colField, colGrouping, valField, aggType, filters, showSubtotals, showTotalCol, 
                sortBy, sortOrder, secondaryDatasetId, joinKeyPrimary, joinKeySecondary, styleRules, selectedBatchId 
            }
        });
     }
  }, [rowFields, colField, colGrouping, valField, aggType, filters, showSubtotals, showTotalCol, sortBy, sortOrder, secondaryDatasetId, joinKeyPrimary, joinKeySecondary, styleRules, selectedBatchId, currentDataset, isInitialized]);

  // Validation sélection Batch
  useEffect(() => {
    if (isLoading || !isInitialized) return; 
    
    if (datasetBatches.length === 0) {
       if (selectedBatchId) setSelectedBatchId('');
       return;
    }
    const exists = datasetBatches.find(b => b.id === selectedBatchId);
    if (!exists) setSelectedBatchId(datasetBatches[0].id);
  }, [datasetBatches, selectedBatchId, isLoading, isInitialized]);

  // --- HELPERS ---

  const currentBatch = useMemo(() => 
    datasetBatches.find(b => b.id === selectedBatchId) || datasetBatches[0], 
  [datasetBatches, selectedBatchId]);

  const combinedFields = useMemo(() => {
      if (!secondaryDatasetId) return fields;
      const secDS = datasets.find(d => d.id === secondaryDatasetId);
      return secDS ? [...fields, ...secDS.fields] : fields;
  }, [fields, secondaryDatasetId, datasets]);

  // --- BLENDING LOGIC ---

  const blendedRows = useMemo(() => {
     if (!currentBatch) return [];
     let rows = currentBatch.rows;

     if (secondaryDatasetId && joinKeyPrimary && joinKeySecondary) {
         const secBatches = batches
            .filter(b => b.datasetId === secondaryDatasetId)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
         
         if (secBatches.length > 0) {
            const secBatch = secBatches[secBatches.length - 1];
            const lookup = new Map<string, any>();
            secBatch.rows.forEach(r => {
               const k = String(r[joinKeySecondary]).trim();
               if (k) lookup.set(k, r);
            });

            rows = rows.map(row => {
               const k = String(row[joinKeyPrimary]).trim();
               const match = lookup.get(k);
               if (match) {
                  return { ...row, ...match };
               }
               return row;
            });
         }
     }
     return rows;
  }, [currentBatch, secondaryDatasetId, joinKeyPrimary, joinKeySecondary, batches]);

  // --- HANDLERS ---
  
  const handleValFieldChange = (newField: string) => {
     setValField(newField);
     if (blendedRows.length > 0) {
        const sample = blendedRows.slice(0, 50).map(r => r[newField] !== undefined ? String(r[newField]) : '');
        const type = detectColumnType(sample);
        setAggType(type === 'number' ? 'sum' : 'count');
     }
  };

  const isColFieldDate = useMemo(() => {
      if (!colField || blendedRows.length === 0) return false;
      const sample = blendedRows.slice(0, 50).map(r => r[colField] !== undefined ? String(r[colField]) : '');
      return detectColumnType(sample) === 'date';
  }, [colField, blendedRows]);

  useEffect(() => {
      if (!isColFieldDate) setColGrouping('none');
  }, [colField, isColFieldDate]);

  const getDistinctValuesForField = (field: string) => {
    if (blendedRows.length === 0) return [];
    const set = new Set<string>();
    blendedRows.forEach(r => {
       const val = r[field] !== undefined ? String(r[field]) : '';
       if (val) set.add(val);
    });
    return Array.from(set).sort();
  };

  const isAggRisky = useMemo(() => {
     if (['sum', 'avg'].includes(aggType) && blendedRows.length > 0 && valField) {
        const sample = blendedRows.slice(0, 20).map(r => r[valField] !== undefined ? String(r[valField]) : '');
        const type = detectColumnType(sample);
        return type !== 'number';
     }
     return false;
  }, [aggType, blendedRows, valField]);

  const addRowLevel = () => {
    if (rowFields.length < 3 && combinedFields.length > rowFields.length) {
      const nextField = combinedFields.find(f => !rowFields.includes(f));
      if (nextField) setRowFields([...rowFields, nextField]);
    }
  };

  const removeRowLevel = (index: number) => {
    const newFields = [...rowFields];
    newFields.splice(index, 1);
    setRowFields(newFields);
  };

  const updateRowField = (index: number, newValue: string) => {
    const newFields = [...rowFields];
    newFields[index] = newValue;
    setRowFields(newFields);
  };

  // Filter Management
  const addFilter = () => combinedFields.length > 0 && setFilters([...filters, { field: combinedFields[0], operator: 'in', value: [] }]);
  const updateFilter = (index: number, updates: Partial<FilterRule>) => { 
      const n = [...filters]; 
      n[index] = { ...n[index], ...updates };
      if (updates.operator && updates.operator !== 'in' && Array.isArray(n[index].value)) { n[index].value = ''; }
      if (updates.operator === 'in' && !Array.isArray(n[index].value)) { n[index].value = []; }
      setFilters(n);
  };
  const removeFilter = (index: number) => setFilters(filters.filter((_, i) => i !== index));

  const handleSaveAnalysis = () => {
     if (!analysisName.trim() || !currentDataset) return;
     saveAnalysis({
        name: analysisName,
        type: 'pivot',
        datasetId: currentDataset.id,
        config: {
           rowFields, colField, colGrouping, valField, aggType, filters, showSubtotals, showTotalCol, 
           sortBy, sortOrder, secondaryDatasetId, joinKeyPrimary, joinKeySecondary, styleRules, selectedBatchId 
        }
     });
     setAnalysisName('');
     setIsSaving(false);
  };

  const handleLoadAnalysis = (id: string) => {
     const analysis = savedAnalyses.find(a => a.id === id);
     if (!analysis || !analysis.config) return;
     const c = analysis.config;
     setRowFields(c.rowFields || []);
     setColField(c.colField || '');
     setColGrouping(c.colGrouping || 'none');
     setValField(c.valField || '');
     setAggType(c.aggType || 'count');
     
     if (c.filters) {
         const loadedFilters = c.filters.map((f: any) => {
             if (f.values) return { field: f.field, operator: 'in', value: f.values }; // Old
             return f; // New
         });
         setFilters(loadedFilters);
     } else setFilters([]);

     setShowSubtotals(c.showSubtotals !== undefined ? c.showSubtotals : true);
     setShowTotalCol(c.showTotalCol !== undefined ? c.showTotalCol : true);
     setSortBy(c.sortBy || 'label');
     setSortOrder(c.sortOrder || 'asc');
     setSecondaryDatasetId(c.secondaryDatasetId || '');
     setJoinKeyPrimary(c.joinKeyPrimary || '');
     setJoinKeySecondary(c.joinKeySecondary || '');
     setStyleRules(c.styleRules || []);
     if (c.selectedBatchId) setSelectedBatchId(c.selectedBatchId);
  };

  const handleDeleteBatch = () => {
    if (!currentBatch) return;
    if (window.confirm(`Supprimer l'import du ${formatDateFr(currentBatch.date)} ?`)) {
       deleteBatch(currentBatch.id);
    }
  };

  const handleToChart = () => {
      if (!currentDataset) return;
      if (rowFields.length === 0) {
          alert("Veuillez configurer au moins une ligne pour générer un graphique.");
          return;
      }
      const pivotConfig = { rowFields, valField, aggType, filters, selectedBatchId };
      navigate('/analytics', { state: { fromPivot: pivotConfig } });
  };

  const availableAnalyses = savedAnalyses.filter(a => a.type === 'pivot' && a.datasetId === currentDataset?.id);

  // Resize Handlers
  const startResize = (e: React.MouseEvent, colId: string) => {
    e.preventDefault(); e.stopPropagation();
    resizingRef.current = { colId, startX: e.clientX, startWidth: colWidths[colId] || 120 };
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
    document.body.style.cursor = 'col-resize';
  };
  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!resizingRef.current) return;
    const { colId, startX, startWidth } = resizingRef.current;
    setColWidths(prev => ({ ...prev, [colId]: Math.max(50, startWidth + (e.clientX - startX)) }));
  }, []);
  const handleResizeEnd = useCallback(() => {
    resizingRef.current = null;
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
    document.body.style.cursor = '';
  }, [handleResizeMove]);

  // SORT HANDLER
  const handleHeaderSort = (key: string) => {
     if (sortBy === key) {
        setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
     } else { 
        setSortBy(key); 
        setSortOrder(key === 'label' ? 'asc' : 'desc'); 
     }
  };

  const handleCellClick = (rowKeys: string[], colKey?: string) => {
     if (isStyleMode) {
        const isGrandTotalRow = rowKeys.length === 0 && !colKey;
        let targetType: 'row' | 'col' | 'cell' | 'total' = 'cell';
        let targetKey = '';
        if (!colKey && rowKeys.length > 0) { targetType = 'row'; targetKey = rowKeys[rowKeys.length - 1]; } 
        else if (colKey && rowKeys.length === 0) { targetType = 'col'; targetKey = colKey; } 
        else if (!colKey && rowKeys.length === 0) { targetType = 'total'; }
        setActiveStyleTarget({ type: targetType, key: targetKey });
        return;
     }

     // Drill-down Logic
     const drillFilters: Record<string, string> = {};
     rowFields.forEach((field, index) => {
        if (index < rowKeys.length) {
           let val = rowKeys[index];
           if (val === '(Vide)') val = '__EMPTY__';
           else val = `=${val}`; 
           drillFilters[field] = val;
        }
     });
     if (colField && colKey) {
        let val = colKey;
        if (val === '(Vide)') val = '__EMPTY__';
        else val = `=${val}`;
        drillFilters[colField] = val;
     }
     filters.forEach(f => { 
        if (f.operator === 'in' && Array.isArray(f.value) && f.value.length === 1) {
           drillFilters[f.field] = `=${f.value[0]}`; 
        }
        if (f.operator === 'eq' && f.value) {
            drillFilters[f.field] = `=${f.value}`;
        }
     });
     
     const targetBatchId = currentBatch?.id;
     if (targetBatchId) {
        drillFilters['_batchId'] = targetBatchId;
     }

     navigate('/data', { state: { prefilledFilters: drillFilters } });
  };

  const applyStyle = (updates: Partial<PivotStyleRule['style']>) => {
      if (!activeStyleTarget) return;
      const newRules = [...styleRules];
      const existingIdx = newRules.findIndex(r => r.targetType === activeStyleTarget.type && r.targetKey === activeStyleTarget.key);
      if (existingIdx >= 0) newRules[existingIdx].style = { ...newRules[existingIdx].style, ...updates };
      else newRules.push({ id: Math.random().toString(36).substr(2, 9), targetType: activeStyleTarget.type, targetKey: activeStyleTarget.key, style: updates });
      setStyleRules(newRules);
  };

  const getStyleForTarget = (type: string, key?: string) => styleRules.find(r => r.targetType === type && r.targetKey === key)?.style || {};
  const getCSSFromStyle = (style: any) => ({ color: style.textColor, backgroundColor: style.backgroundColor, fontWeight: style.fontWeight, fontStyle: style.fontStyle, textDecoration: style.textDecoration });

  // --- PIVOT ENGINE USE ---
  const pivotData = useMemo(() => {
     return calculatePivotData({
        rows: blendedRows,
        rowFields,
        colField,
        colGrouping,
        valField,
        aggType,
        filters,
        sortBy,
        sortOrder,
        showSubtotals,
        currentDataset,
        secondaryDatasetId,
        datasets
     });
  }, [blendedRows, rowFields, colField, colGrouping, valField, aggType, filters, sortBy, sortOrder, showSubtotals, currentDataset, datasets, secondaryDatasetId]);

  if (!currentDataset) {
    return (
       <div className="h-full flex flex-col items-center justify-center text-center bg-slate-50 rounded-lg border border-dashed border-slate-300 m-4">
          <Database className="w-12 h-12 text-slate-300 mb-4" />
          <p className="text-slate-600 font-medium">Aucun tableau sélectionné</p>
          <p className="text-slate-500 text-sm max-w-md mt-2">Veuillez sélectionner une typologie dans le menu latéral.</p>
       </div>
    );
  }

  const isDrillDownEnabled = aggType !== 'list';
  const formatOutput = (val: string | number) => formatPivotOutput(val, valField, aggType, currentDataset, secondaryDatasetId, datasets);

  return (
    <div className="h-full flex flex-col p-4 md:p-8 gap-4 relative">
       {/* HEADER BAR */}
       <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2">
             <Layout className="w-6 h-6 text-blue-600" />
             <div>
                <h2 className="text-lg font-bold text-slate-800">Tableau croisé dynamique (TCD)</h2>
                <p className="text-xs text-slate-500">Analyse multi-dimensionnelle</p>
             </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
             <button onClick={handleToChart} className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-colors">
                <PieChart className="w-4 h-4" /> Créer graphique
             </button>

             <button onClick={() => { setIsStyleMode(!isStyleMode); setActiveStyleTarget(null); }} className={`flex items-center gap-2 px-3 py-2 rounded text-xs font-bold transition-all border ${isStyleMode ? 'bg-pink-100 text-pink-700 border-pink-300' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>
                <Palette className="w-4 h-4" /> {isStyleMode ? 'Mode Design' : 'Personnaliser'}
             </button>

             <div className="h-6 w-px bg-slate-300 mx-1 hidden xl:block"></div>

             <div className="relative">
                <select className="bg-white border border-slate-300 text-slate-700 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2 pr-8 min-w-[150px]" onChange={(e) => { if (e.target.value) handleLoadAnalysis(e.target.value); e.target.value = ""; }} defaultValue="">
                    <option value="" disabled>Vues enregistrées...</option>
                    {availableAnalyses.length === 0 && <option disabled>Aucune vue.</option>}
                    {availableAnalyses.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
             </div>
             
             {!isSaving ? (
                 <button onClick={() => setIsSaving(true)} className="p-2 text-slate-500 hover:text-blue-600 border border-slate-300 rounded-md bg-white hover:bg-slate-50" title="Enregistrer cette vue"><Save className="w-4 h-4" /></button>
             ) : (
                 <div className="flex items-center gap-1 animate-in fade-in">
                    <input type="text" className="p-1.5 text-xs border border-blue-300 rounded focus:ring-1 focus:ring-blue-500 w-32 bg-white text-slate-900" placeholder="Nom de la vue..." value={analysisName} onChange={e => setAnalysisName(e.target.value)} autoFocus />
                    <button onClick={handleSaveAnalysis} className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700"><Check className="w-3 h-3" /></button>
                    <button onClick={() => setIsSaving(false)} className="p-1.5 bg-slate-200 text-slate-600 rounded hover:bg-slate-300"><X className="w-3 h-3" /></button>
                 </div>
             )}

             <div className="h-6 w-px bg-slate-300 mx-1 hidden xl:block"></div>

             <div className="flex items-center gap-2 bg-white p-1 rounded border border-slate-200">
               <span className="text-xs font-bold text-slate-500 px-2 hidden sm:inline">Source :</span>
               <select className="bg-white border-slate-300 text-slate-700 text-sm rounded shadow-sm p-1.5 focus:ring-blue-500 focus:border-blue-500 max-w-[200px]" value={selectedBatchId} onChange={(e) => setSelectedBatchId(e.target.value)}>
                  {datasetBatches.map(b => <option key={b.id} value={b.id}>{formatDateFr(b.date)} ({b.rows.length} lignes)</option>)}
               </select>
               {selectedBatchId && <button onClick={handleDeleteBatch} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 className="w-4 h-4" /></button>}
            </div>
          </div>
       </div>

       {/* STYLE POPUP */}
       {isStyleMode && activeStyleTarget && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50 bg-white shadow-xl border border-slate-200 rounded-lg p-3 flex gap-2 animate-in slide-in-from-top-4">
              <div className="text-xs font-bold text-slate-500 border-r border-slate-200 pr-3 mr-1 flex items-center">
                  Cible : <span className="text-pink-600 ml-1">{activeStyleTarget.key || 'Total'}</span>
              </div>
              <div className="relative group">
                  <button className="p-1.5 hover:bg-slate-100 rounded text-slate-700"><Type className="w-4 h-4" /></button>
                  <div className="absolute top-full left-0 pt-4 -mt-2 hidden group-hover:block z-50">
                      <div className="bg-white border border-slate-200 p-2 shadow-lg rounded grid grid-cols-4 gap-1 w-32">
                          {['#000000', '#ef4444', '#22c55e', '#3b82f6', '#eab308', '#64748b', '#a855f7', '#ffffff'].map(c => (
                              <button key={c} onClick={() => applyStyle({ textColor: c })} style={{backgroundColor: c}} className="w-6 h-6 rounded border border-slate-200 hover:scale-110 transition-transform" />
                          ))}
                      </div>
                  </div>
              </div>
              <div className="relative group">
                  <button className="p-1.5 hover:bg-slate-100 rounded text-slate-700"><PaintBucket className="w-4 h-4" /></button>
                  <div className="absolute top-full left-0 pt-4 -mt-2 hidden group-hover:block z-50">
                      <div className="bg-white border border-slate-200 p-2 shadow-lg rounded grid grid-cols-4 gap-1 w-32">
                           {['transparent', '#fee2e2', '#dcfce7', '#dbeafe', '#fef9c3', '#f1f5f9', '#f3e8ff', '#1e293b'].map(c => (
                              <button key={c} onClick={() => applyStyle({ backgroundColor: c })} style={{backgroundColor: c}} className="w-6 h-6 rounded border border-slate-200 hover:scale-110 transition-transform" />
                          ))}
                      </div>
                  </div>
              </div>
              <div className="w-px bg-slate-200 mx-1"></div>
              <button onClick={() => applyStyle({ fontWeight: 'bold' })} className="p-1.5 hover:bg-slate-100 rounded text-slate-700"><Bold className="w-4 h-4" /></button>
              <button onClick={() => applyStyle({ fontStyle: 'italic' })} className="p-1.5 hover:bg-slate-100 rounded text-slate-700"><Italic className="w-4 h-4" /></button>
              <button onClick={() => applyStyle({ textDecoration: 'underline' })} className="p-1.5 hover:bg-slate-100 rounded text-slate-700"><Underline className="w-4 h-4" /></button>
              <div className="w-px bg-slate-200 mx-1"></div>
              <button onClick={() => setActiveStyleTarget(null)} className="text-xs text-slate-400 hover:text-slate-600 px-2">Fermer</button>
          </div>
       )}

       <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
          
          {/* SIDEBAR CONFIG */}
          <div className="lg:w-80 flex-shrink-0 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col overflow-y-auto custom-scrollbar">
             <div className="p-3 bg-slate-50 border-b border-slate-200 font-bold text-slate-700 flex items-center gap-2">
                <ArrowDownWideNarrow className="w-4 h-4" /> Configuration TCD
             </div>
             
             <div className="p-4 space-y-6">
                
                {/* 0. DATA BLENDING */}
                <div className="bg-indigo-50 border border-indigo-100 p-3 rounded">
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-indigo-800 flex items-center gap-1"><LinkIcon className="w-3 h-3" /> Lier une autre source</label>
                        {secondaryDatasetId && <button onClick={() => setSecondaryDatasetId('')} className="text-[10px] text-red-600 hover:underline">Retirer</button>}
                    </div>
                    <select className="w-full p-1.5 bg-white border border-indigo-200 rounded text-xs mb-2" value={secondaryDatasetId} onChange={(e) => setSecondaryDatasetId(e.target.value)}>
                        <option value="">(Aucune jointure)</option>
                        {datasets.filter(d => d.id !== currentDataset.id).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>

                    {secondaryDatasetId && (
                        <div className="space-y-2 animate-in fade-in">
                            <div>
                                <span className="text-[10px] text-indigo-600 block mb-1">Clé dans {currentDataset.name}</span>
                                <select className="w-full p-1 bg-white border border-indigo-200 rounded text-xs" value={joinKeyPrimary} onChange={(e) => setJoinKeyPrimary(e.target.value)}>
                                    <option value="">-- Choisir --</option>
                                    {fields.map(f => <option key={f} value={f}>{f}</option>)}
                                </select>
                            </div>
                            <div>
                                <span className="text-[10px] text-indigo-600 block mb-1">Correspond à...</span>
                                <select className="w-full p-1 bg-white border border-indigo-200 rounded text-xs" value={joinKeySecondary} onChange={(e) => setJoinKeySecondary(e.target.value)}>
                                    <option value="">-- Choisir --</option>
                                    {datasets.find(d => d.id === secondaryDatasetId)?.fields.map(f => <option key={f} value={f}>{f}</option>)}
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                {/* 1. Lignes */}
                <div className="space-y-2">
                   <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-500 flex items-center gap-1"><Layers className="w-3 h-3" /> Lignes ({rowFields.length}/3)</label>
                      {rowFields.length < 3 && (
                         <button onClick={addRowLevel} className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100 hover:bg-blue-100 flex items-center"><Plus className="w-3 h-3 mr-1" /> Ajouter</button>
                      )}
                   </div>
                   <div className="space-y-2">
                      {rowFields.map((field, idx) => (
                        <div key={idx} className="flex gap-1 relative group">
                           <div className="flex items-center justify-center w-5 bg-slate-100 text-slate-400 text-[10px] font-bold rounded-l border border-r-0 border-slate-300">{idx + 1}</div>
                           <select className="flex-1 p-2 bg-white border border-slate-300 rounded-r text-sm focus:ring-blue-500 focus:border-blue-500" value={field} onChange={(e) => updateRowField(idx, e.target.value)}>
                              {combinedFields.map(f => <option key={f} value={f} disabled={rowFields.includes(f) && f !== field}>{f}</option>)}
                           </select>
                           {idx > 0 && <button onClick={() => removeRowLevel(idx)} className="absolute right-1 top-1.5 text-slate-400 hover:text-red-500 bg-white rounded-full"><Trash2 className="w-4 h-4" /></button>}
                        </div>
                      ))}
                   </div>
                </div>

                {/* 2. Colonnes */}
                <div className="space-y-1">
                   <label className="text-xs font-bold text-slate-500 flex items-center gap-1"><Table2 className="w-3 h-3" /> Colonnes (optionnel)</label>
                   <select className="w-full p-2 bg-white border border-slate-300 rounded text-sm focus:ring-blue-500 focus:border-blue-500" value={colField} onChange={(e) => setColField(e.target.value)}>
                      <option value="">(Aucune colonne)</option>
                      {combinedFields.filter(f => !rowFields.includes(f)).map(f => <option key={f} value={f}>{f}</option>)}
                   </select>

                   {isColFieldDate && (
                      <div className="mt-2 p-2 bg-amber-50 rounded border border-amber-200 animate-in fade-in">
                          <label className="text-[10px] font-bold text-amber-800 flex items-center gap-1"><CalendarClock className="w-3 h-3" /> Regroupement Date</label>
                          <select className="w-full p-1.5 bg-white border border-amber-300 rounded text-xs text-amber-900" value={colGrouping} onChange={(e) => setColGrouping(e.target.value as DateGrouping)}>
                              <option value="none">Aucun (Date exacte)</option>
                              <option value="year">Année</option>
                              <option value="quarter">Trimestre</option>
                              <option value="month">Mois</option>
                          </select>
                      </div>
                   )}
                </div>

                {/* 3. Valeurs */}
                <div className="p-3 bg-blue-50 rounded border border-blue-100 space-y-3">
                   <label className="text-xs font-bold text-blue-700 flex items-center gap-1"><Calculator className="w-3 h-3" /> Valeurs</label>
                   
                   <select className="w-full p-2 bg-white border border-blue-200 rounded text-sm focus:ring-blue-500 focus:border-blue-500" value={valField} onChange={(e) => handleValFieldChange(e.target.value)}>
                      {combinedFields.map(f => <option key={f} value={f}>{f}</option>)}
                   </select>

                   <div className="grid grid-cols-3 gap-2">
                       {['count', 'sum', 'avg', 'min', 'max', 'list'].map(t => (
                          <button 
                             key={t}
                             onClick={() => setAggType(t as AggregationType)}
                             className={`px-1 py-1.5 text-[10px] font-bold uppercase rounded border transition-all ${aggType === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                          >
                             {t}
                          </button>
                       ))}
                   </div>
                   
                   {isAggRisky && (
                      <div className="flex items-start gap-2 text-[10px] text-amber-700 bg-amber-50 p-2 rounded border border-amber-100">
                         <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                         <span>Attention : Vous tentez une opération mathématique sur un champ qui semble contenir du texte.</span>
                      </div>
                   )}
                </div>

                {/* 4. Filtres Avancés */}
                <div>
                   <label className="text-xs font-bold text-slate-500 flex items-center gap-1 mb-2"><Filter className="w-3 h-3" /> Filtres ({filters.length})</label>
                   <div className="space-y-3 mb-3">
                      {filters.map((f, idx) => (
                         <div key={idx} className="bg-slate-50 p-2 rounded border border-slate-200 relative group space-y-2">
                            <button onClick={() => removeFilter(idx)} className="absolute top-1 right-1 text-slate-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                            
                            <select className="w-full p-1 bg-white border border-slate-200 rounded text-xs mb-1" value={f.field} onChange={(e) => updateFilter(idx, { field: e.target.value })}>
                               {combinedFields.map(field => <option key={field} value={field}>{field}</option>)}
                            </select>

                            <select className="w-full p-1 bg-white border border-slate-200 rounded text-xs font-bold text-indigo-600" value={f.operator || 'in'} onChange={(e) => updateFilter(idx, { operator: e.target.value as any })}>
                                <option value="in">Est égal à / Dans</option>
                                <option value="starts_with">Commence par</option>
                                <option value="contains">Contient</option>
                                <option value="gt">Supérieur à (&gt;)</option>
                                <option value="lt">Inférieur à (&lt;)</option>
                                <option value="eq">Égal à (=)</option>
                            </select>

                            {(!f.operator || f.operator === 'in') ? (
                                <MultiSelect 
                                    options={getDistinctValuesForField(f.field)} 
                                    selected={Array.isArray(f.value) ? f.value : []} 
                                    onChange={(v) => updateFilter(idx, { value: v })} 
                                />
                            ) : (
                                <input 
                                    type={['gt', 'lt'].includes(f.operator) ? "number" : "text"}
                                    className="w-full p-1 bg-white border border-slate-200 rounded text-xs"
                                    value={f.value}
                                    onChange={(e) => updateFilter(idx, { value: e.target.value })}
                                    placeholder="Valeur..."
                                />
                            )}
                         </div>
                      ))}
                      <button onClick={addFilter} className="w-full py-1.5 border border-dashed border-slate-300 text-slate-500 text-xs rounded hover:bg-slate-50 hover:text-blue-600">+ Ajouter un filtre</button>
                   </div>
                </div>

                {/* Options d'affichage */}
                <div className="pt-4 border-t border-slate-100 space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Affichage</label>
                    <Checkbox checked={showSubtotals} onChange={() => setShowSubtotals(!showSubtotals)} label="Afficher sous-totaux" />
                    <Checkbox checked={showTotalCol} onChange={() => setShowTotalCol(!showTotalCol)} label="Afficher total général" />
                </div>
             </div>
          </div>

          {/* MAIN TABLE AREA */}
          <div className="flex-1 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col min-w-0 overflow-hidden relative">
             <div className="flex-1 overflow-auto custom-scrollbar">
                {pivotData ? (
                   <table className="min-w-full divide-y divide-slate-200 border-collapse">
                      <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                         <tr>
                            {/* Headers Lignes */}
                            {rowFields.map((field, idx) => (
                               <th 
                                  key={field} 
                                  className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-r border-slate-200 bg-slate-50 whitespace-nowrap sticky left-0 z-20 cursor-pointer hover:bg-slate-100 group"
                                  style={{ minWidth: '150px' }}
                                  onClick={() => handleHeaderSort('label')}
                               >
                                  <div className="flex items-center gap-1">
                                     {field}
                                     {sortBy === 'label' ? (
                                        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />
                                     ) : <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-50" />}
                                  </div>
                               </th>
                            ))}
                            
                            {/* Headers Colonnes Dynamiques */}
                            {pivotData.colHeaders.map(col => (
                               <th 
                                  key={col} 
                                  className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-r border-slate-200 whitespace-nowrap relative group hover:bg-blue-50 cursor-pointer"
                                  style={{ minWidth: colWidths[col] || 120 }}
                                  onClick={() => handleCellClick([], col)}
                               >
                                  <div className="flex items-center justify-end gap-1" onClick={(e) => { e.stopPropagation(); handleHeaderSort(col); }}>
                                     {col}
                                     {sortBy === col && (
                                        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />
                                     )}
                                  </div>
                                  {/* Resizer */}
                                  <div 
                                     className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 z-30"
                                     onMouseDown={(e) => startResize(e, col)}
                                  />
                               </th>
                            ))}

                            {/* Header Total Général */}
                            {showTotalCol && (
                               <th 
                                  className="px-4 py-3 text-right text-xs font-black text-slate-700 uppercase tracking-wider border-b bg-slate-100 whitespace-nowrap cursor-pointer hover:bg-slate-200"
                                  onClick={() => handleHeaderSort('value')}
                               >
                                  <div className="flex items-center justify-end gap-1">
                                     Total
                                     {sortBy === 'value' ? (
                                        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />
                                     ) : null}
                                  </div>
                               </th>
                            )}
                         </tr>
                      </thead>
                      
                      <tbody className="bg-white divide-y divide-slate-200">
                         {pivotData.displayRows.map((row, rIdx) => {
                            const isSubtotal = row.type === 'subtotal';
                            const labelStyle = getStyleForTarget('row', row.keys[row.keys.length - 1]);

                            return (
                               <tr key={rIdx} className={`${isSubtotal ? 'bg-slate-50 font-bold' : 'hover:bg-blue-50/30'} transition-colors`}>
                                  {/* Cellules Clés Lignes */}
                                  {rowFields.map((field, cIdx) => {
                                     if (cIdx < row.level) return <td key={cIdx} className="border-r border-slate-100 bg-slate-50/50"></td>;
                                     if (cIdx === row.level) {
                                        return (
                                           <td 
                                              key={cIdx} 
                                              colSpan={isSubtotal ? rowFields.length - cIdx : 1}
                                              className={`px-4 py-2 text-sm text-slate-700 border-r border-slate-200 font-medium whitespace-nowrap ${isSubtotal ? 'text-right italic text-slate-500' : ''}`}
                                              style={!isSubtotal ? getCSSFromStyle(labelStyle) : {}}
                                           >
                                              {isSubtotal ? row.label : row.keys[cIdx]}
                                           </td>
                                        );
                                     }
                                     return null;
                                  })}

                                  {/* Cellules Valeurs */}
                                  {pivotData.colHeaders.map(col => {
                                      const val = row.metrics[col];
                                      const cellStyle = getStyleForTarget('cell'); 
                                      return (
                                          <td 
                                             key={col} 
                                             className={`px-4 py-2 text-sm text-right border-r border-slate-100 tabular-nums cursor-pointer hover:bg-blue-100/50 ${isDrillDownEnabled ? 'text-blue-900' : 'text-slate-600'}`}
                                             onClick={() => handleCellClick(row.keys, col)}
                                             style={getCSSFromStyle(cellStyle)}
                                          >
                                             {val !== undefined ? formatOutput(val) : '-'}
                                          </td>
                                      )
                                  })}

                                  {/* Cellule Total Ligne */}
                                  {showTotalCol && (
                                     <td 
                                        className={`px-4 py-2 text-sm text-right font-bold text-slate-800 bg-slate-50 border-l border-slate-200 cursor-pointer hover:bg-slate-200`}
                                        onClick={() => handleCellClick(row.keys)} // Drill down sur toute la ligne
                                     >
                                        {formatOutput(row.rowTotal)}
                                     </td>
                                  )}
                               </tr>
                            );
                         })}

                         {/* Ligne Total Général */}
                         <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold shadow-inner">
                            <td colSpan={rowFields.length} className="px-4 py-3 text-right text-sm uppercase text-slate-600">Total Général</td>
                            {pivotData.colHeaders.map(col => {
                               const style = getStyleForTarget('col', col);
                               return (
                                 <td 
                                    key={col} 
                                    className="px-4 py-3 text-right text-sm text-slate-900 border-r border-slate-200 cursor-pointer hover:bg-slate-300"
                                    onClick={() => handleCellClick([], col)}
                                    style={getCSSFromStyle(style)}
                                 >
                                    {formatOutput(pivotData.colTotals[col])}
                                 </td>
                               )
                            })}
                            {showTotalCol && (
                               <td 
                                 className="px-4 py-3 text-right text-sm text-black bg-slate-200 border-l border-slate-300 cursor-pointer hover:bg-slate-300"
                                 onClick={() => handleCellClick([])}
                               >
                                  {formatOutput(pivotData.grandTotal)}
                               </td>
                            )}
                         </tr>
                      </tbody>
                   </table>
                ) : (
                   <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                      <Layout className="w-12 h-12 mb-3 opacity-20" />
                      <p>Commencez par ajouter une dimension en ligne.</p>
                   </div>
                )}
             </div>
          </div>

       </div>
    </div>
  );
};