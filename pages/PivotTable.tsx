
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import { parseSmartNumber, detectColumnType, formatDateFr, evaluateFormula, generateId, exportView } from '../utils';
import { 
  Database, Filter, Calculator, X, Layout,
  Table2, ArrowUpDown, Layers,
  ArrowUp, ArrowDown, Save, Check,
  PieChart, Loader2, ChevronLeft, ChevronRight, FileDown, FileType, Printer,
  GripVertical, MousePointer2, TrendingUp
} from 'lucide-react';
import { Checkbox } from '../components/ui/Checkbox';
import { useNavigate } from 'react-router-dom';
import { PivotStyleRule, FilterRule, FieldConfig, PivotJoin } from '../types';
import { calculatePivotData, formatPivotOutput, AggregationType, SortBy, SortOrder, DateGrouping, PivotResult } from '../logic/pivotEngine';
import { useVirtualizer } from '@tanstack/react-virtual';

// --- DRAG & DROP TYPES ---
type DropZoneType = 'row' | 'col' | 'val' | 'filter';

export const PivotTable: React.FC = () => {
  const { 
    batches, currentDataset, datasets, savedAnalyses, saveAnalysis, 
    lastPivotState, savePivotState, isLoading, companyLogo
  } = useData();
  const fields = currentDataset ? currentDataset.fields : [];
  const navigate = useNavigate();

  // --- STATE ---
  const [isInitialized, setIsInitialized] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [joins, setJoins] = useState<PivotJoin[]>([]);
  const [rowFields, setRowFields] = useState<string[]>([]);
  const [colField, setColField] = useState<string>('');
  const [valField, setValField] = useState<string>('');
  const [colGrouping, setColGrouping] = useState<DateGrouping>('none'); 
  const [aggType, setAggType] = useState<AggregationType>('count');
  const [valFormatting, setValFormatting] = useState<Partial<FieldConfig>>({});
  const [filters, setFilters] = useState<FilterRule[]>([]);
  const [showSubtotals, setShowSubtotals] = useState(true);
  const [showTotalCol, setShowTotalCol] = useState(true);
  const [showVariations, setShowVariations] = useState(false); // NEW
  const [sortBy, setSortBy] = useState<SortBy>('label');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  
  // UI STATE
  const [isSaving, setIsSaving] = useState(false);
  const [analysisName, setAnalysisName] = useState('');
  const [styleRules, setStyleRules] = useState<PivotStyleRule[]>([]);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // D&D STATE
  const [draggedField, setDraggedField] = useState<string | null>(null);
  const [dragSource, setDragSource] = useState<'list' | DropZoneType | null>(null);

  // ASYNC CALCULATION STATE
  const [pivotData, setPivotData] = useState<PivotResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // VIRTUALIZATION
  const parentRef = useRef<HTMLDivElement>(null);

  // --- DERIVED STATE ---
  const datasetBatches = useMemo(() => {
    if (!currentDataset) return [];
    return batches
      .filter(b => b.datasetId === currentDataset.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [batches, currentDataset]);

  // --- INITIALISATION & PERSISTENCE ---
  useEffect(() => {
     if (lastPivotState && currentDataset && lastPivotState.datasetId === currentDataset.id) {
         const c = lastPivotState.config;
         setRowFields(c.rowFields || []);
         setColField(c.colField || '');
         setColGrouping(c.colGrouping || 'none');
         setValField(c.valField || '');
         setAggType((c.aggType as AggregationType) || 'count');
         setValFormatting(c.valFormatting || {});
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
         setShowVariations(c.showVariations !== undefined ? c.showVariations : false);
         setSortBy(c.sortBy || 'label');
         setSortOrder(c.sortOrder || 'asc');
         if (c.joins) setJoins(c.joins);
         else if (c.secondaryDatasetId) {
             setJoins([{
                 id: generateId(),
                 datasetId: c.secondaryDatasetId,
                 joinKeyPrimary: c.joinKeyPrimary,
                 joinKeySecondary: c.joinKeySecondary
             }]);
         } else setJoins([]);
         setStyleRules(c.styleRules || []);
         if (c.selectedBatchId) setSelectedBatchId(c.selectedBatchId);
     } else {
         setRowFields([]);
         setColField('');
         setValField('');
         setFilters([]);
     }
     setIsInitialized(true);
  }, [currentDataset?.id]);

  useEffect(() => {
     if (!isInitialized) return;
     if (currentDataset) {
        savePivotState({
            datasetId: currentDataset.id,
            config: {
                rowFields, colField, colGrouping, valField, aggType, valFormatting, filters, showSubtotals, showTotalCol, showVariations,
                sortBy, sortOrder, joins, styleRules, selectedBatchId 
            }
        });
     }
  }, [rowFields, colField, colGrouping, valField, aggType, valFormatting, filters, showSubtotals, showTotalCol, showVariations, sortBy, sortOrder, joins, styleRules, selectedBatchId, currentDataset, isInitialized]);

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
      let baseFields = fields;
      if (currentDataset && currentDataset.calculatedFields) {
          baseFields = [...fields, ...currentDataset.calculatedFields.map(cf => cf.name)];
      }
      if (joins.length === 0) return baseFields;
      const allJoinedFields: string[] = [];
      joins.forEach(join => {
          const ds = datasets.find(d => d.id === join.datasetId);
          if (ds) {
              const secNativeFields = ds.fields.map(f => `[${ds.name}] ${f}`);
              const secCalcFields = (ds.calculatedFields || []).map(f => `[${ds.name}] ${f.name}`);
              allJoinedFields.push(...secNativeFields, ...secCalcFields);
          }
      });
      return [...baseFields, ...allJoinedFields];
  }, [fields, joins, datasets, currentDataset]);

  // --- BLENDING LOGIC ---
  const blendedRows = useMemo(() => {
     if (!currentBatch) return [];
     const calcFields = currentDataset?.calculatedFields || [];
     let rows = currentBatch.rows;
     if (calcFields.length > 0) {
         rows = rows.map(r => {
             const enriched = { ...r };
             calcFields.forEach(cf => {
                 enriched[cf.name] = evaluateFormula(enriched, cf.formula);
             });
             return enriched;
         });
     }
     if (joins.length > 0) {
         joins.forEach(join => {
             const secDS = datasets.find(d => d.id === join.datasetId);
             if (secDS) {
                 const secBatches = batches
                    .filter(b => b.datasetId === join.datasetId)
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                 if (secBatches.length > 0) {
                     const secBatch = secBatches[0];
                     let secRows = secBatch.rows;
                     if (secDS.calculatedFields && secDS.calculatedFields.length > 0) {
                         secRows = secRows.map(r => {
                             const enriched = { ...r };
                             secDS.calculatedFields?.forEach(cf => {
                                 enriched[cf.name] = evaluateFormula(enriched, cf.formula);
                             });
                             return enriched;
                         });
                     }
                     const lookup = new Map<string, any>();
                     secRows.forEach(r => {
                        const k = String(r[join.joinKeySecondary]).trim();
                        if (k) lookup.set(k, r);
                     });
                     rows = rows.map(row => {
                        const k = String(row[join.joinKeyPrimary]).trim();
                        const match = lookup.get(k);
                        if (match) {
                           const prefixedMatch: any = {};
                           Object.keys(match).forEach(key => {
                               if (key !== 'id') prefixedMatch[`[${secDS.name}] ${key}`] = match[key];
                           });
                           return { ...row, ...prefixedMatch };
                        }
                        return row;
                     });
                 }
             }
         });
     }
     return rows;
  }, [currentBatch, joins, currentDataset, datasets, batches]);

  // --- ASYNC CALCULATION ---
  useEffect(() => {
      setIsCalculating(true);
      const timer = setTimeout(() => {
          const result = calculatePivotData({
            rows: blendedRows,
            rowFields, colField, colGrouping, valField, aggType, filters, 
            sortBy, sortOrder, showSubtotals, showVariations, currentDataset, joins, datasets
         });
         setPivotData(result);
         setIsCalculating(false);
      }, 10); 
      return () => clearTimeout(timer);
  }, [blendedRows, rowFields, colField, colGrouping, valField, aggType, filters, sortBy, sortOrder, showSubtotals, showVariations, currentDataset, datasets, joins]);

  // --- HANDLERS ---
  const handleValFieldChange = (newField: string) => {
     setValField(newField);
     setValFormatting({});
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

  // --- DRAG AND DROP LOGIC ---
  const handleDragStart = (e: React.DragEvent, field: string, source: 'list' | DropZoneType) => {
      setDraggedField(field);
      setDragSource(source);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', field);
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetZone: DropZoneType) => {
      e.preventDefault();
      if (!draggedField) return;
      if (dragSource === 'row') setRowFields(prev => prev.filter(f => f !== draggedField));
      if (dragSource === 'col' && colField === draggedField) setColField('');
      if (dragSource === 'val' && valField === draggedField) setValField('');
      if (dragSource === 'filter') setFilters(prev => prev.filter(f => f.field !== draggedField));
      if (targetZone === 'row') {
          if (!rowFields.includes(draggedField) && rowFields.length < 5) setRowFields(prev => [...prev, draggedField]);
      } else if (targetZone === 'col') {
          setColField(draggedField);
      } else if (targetZone === 'val') {
          handleValFieldChange(draggedField);
      } else if (targetZone === 'filter') {
          if (!filters.some(f => f.field === draggedField)) setFilters(prev => [...prev, { field: draggedField, operator: 'in', value: [] }]);
      }
      setDraggedField(null);
      setDragSource(null);
  };

  const removeField = (zone: DropZoneType, field: string) => {
      if (zone === 'row') setRowFields(prev => prev.filter(f => f !== field));
      if (zone === 'col') setColField('');
      if (zone === 'val') setValField('');
      if (zone === 'filter') setFilters(prev => prev.filter(f => f.field !== field));
  };

  // --- EXPORT & MISC ---
  const handleExport = (format: 'pdf' | 'html', pdfMode: 'A4' | 'adaptive' = 'adaptive') => {
      setShowExportMenu(false);
      const title = `TCD - ${currentDataset?.name}`;
      exportView(format, 'pivot-export-container', title, companyLogo, pdfMode);
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

  const handleSaveAnalysis = () => {
      if (!analysisName.trim() || !currentDataset) return;
      saveAnalysis({
          name: analysisName, type: 'pivot', datasetId: currentDataset.id,
          config: { rowFields, colField, colGrouping, valField, aggType, valFormatting, filters, showSubtotals, showTotalCol, showVariations, sortBy, sortOrder, joins, styleRules, selectedBatchId }
      });
      setAnalysisName('');
      setIsSaving(false);
  };

  // VIRTUALIZATION
  const rowVirtualizer = useVirtualizer({
    count: pivotData ? pivotData.displayRows.length : 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 20
  });

  // FORMAT OUTPUT
  const formatOutput = (val: string | number) => formatPivotOutput(val, valField, aggType, currentDataset, undefined, datasets, valFormatting);

  if (!currentDataset) {
    return (
       <div className="h-full flex flex-col items-center justify-center text-center bg-slate-50 rounded-lg border border-dashed border-slate-300 m-4">
          <Database className="w-12 h-12 text-slate-300 mb-4" />
          <p className="text-slate-600 font-medium">Aucun tableau sélectionné</p>
       </div>
    );
  }

  // COMPONENT: Draggable Field Chip
  const FieldChip: React.FC<{ field: string, zone: DropZoneType | 'list', onDelete?: () => void }> = ({ field, zone, onDelete }) => (
      <div 
          draggable 
          onDragStart={(e) => handleDragStart(e, field, zone)}
          className="group flex items-center justify-between gap-2 px-2 py-1.5 bg-white border border-slate-200 rounded shadow-sm hover:border-blue-400 hover:shadow-md cursor-grab active:cursor-grabbing text-xs font-medium text-slate-700 select-none animate-in fade-in zoom-in-95 duration-200"
      >
          <div className="flex items-center gap-1.5 overflow-hidden">
              <GripVertical className="w-3 h-3 text-slate-300 flex-shrink-0" />
              <span className="truncate" title={field}>{field}</span>
          </div>
          {onDelete && (
              <button 
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  className="p-0.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded transition-colors"
              >
                  <X className="w-3 h-3" />
              </button>
          )}
      </div>
  );

  return (
    <div className="h-full flex flex-col p-4 gap-4 relative">
       
       {/* HEADER */}
       <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
             <Layout className="w-5 h-5 text-blue-600" />
             <div>
                <h2 className="text-base font-bold text-slate-800">Tableau Croisé Dynamique</h2>
                <p className="text-[10px] text-slate-500">Glissez les champs pour analyser</p>
             </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
             {/* ACTIONS RAPIDES */}
             <button onClick={handleToChart} className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors">
                <PieChart className="w-3 h-3" /> Graphique
             </button>

             <div className="relative">
                <button
                   onClick={() => setShowExportMenu(!showExportMenu)}
                   className="px-3 py-1.5 text-xs text-slate-600 hover:text-blue-600 border border-slate-300 rounded bg-white hover:bg-slate-50 flex items-center gap-1"
                >
                   <FileDown className="w-3 h-3" /> Export
                </button>
                {showExportMenu && (
                   <div className="absolute right-0 mt-1 w-40 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1">
                      <button onClick={() => handleExport('pdf', 'adaptive')} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2">
                         <Printer className="w-3 h-3" /> PDF
                      </button>
                      <button onClick={() => handleExport('html')} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2">
                         <FileType className="w-3 h-3" /> HTML
                      </button>
                   </div>
                )}
             </div>

             <div className="h-5 w-px bg-slate-200 mx-1"></div>

             {/* SAUVEGARDE */}
             {!isSaving ? (
                 <button onClick={() => setIsSaving(true)} className="p-1.5 text-slate-500 hover:text-blue-600 border border-slate-300 rounded bg-white" title="Sauvegarder"><Save className="w-4 h-4" /></button>
             ) : (
                 <div className="flex items-center gap-1 animate-in fade-in">
                    <input type="text" className="p-1 text-xs border border-blue-300 rounded w-24" placeholder="Nom..." value={analysisName} onChange={e => setAnalysisName(e.target.value)} autoFocus />
                    <button onClick={handleSaveAnalysis} className="p-1 bg-blue-600 text-white rounded"><Check className="w-3 h-3" /></button>
                    <button onClick={() => setIsSaving(false)} className="p-1 bg-slate-200 text-slate-600 rounded"><X className="w-3 h-3" /></button>
                 </div>
             )}
          </div>
       </div>

       <div className="flex flex-col xl:flex-row gap-4 flex-1 min-h-0">
          
          {/* LEFT PANEL : FIELDS LIST & CONFIG ZONES */}
          <div className="xl:w-80 flex-shrink-0 flex flex-col gap-4 min-w-0">
             
             {/* 1. DATA SOURCE & FIELDS */}
             <div className="bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col flex-1 min-h-[300px] overflow-hidden">
                <div className="p-3 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-700 flex justify-between items-center">
                   <span className="flex items-center gap-1"><Database className="w-3 h-3" /> Champs disponibles</span>
                   <select className="text-[10px] border-none bg-transparent focus:ring-0 p-0 text-slate-500 font-normal cursor-pointer" value={selectedBatchId} onChange={(e) => setSelectedBatchId(e.target.value)}>
                        {datasetBatches.map(b => <option key={b.id} value={b.id}>{formatDateFr(b.date)}</option>)}
                   </select>
                </div>
                <div className="p-2 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/30">
                   <div className="space-y-1.5">
                      {combinedFields.map(f => (
                         <FieldChip key={f} field={f} zone="list" />
                      ))}
                   </div>
                </div>
             </div>

             {/* 2. DROP ZONES (Compact Layout) */}
             <div className="flex flex-col gap-3">
                {/* ZONES ROW 1: FILTERS & COLUMNS */}
                <div className="grid grid-cols-2 gap-3">
                    {/* FILTRES */}
                    <div 
                        onDragOver={handleDragOver} 
                        onDrop={(e) => handleDrop(e, 'filter')}
                        className={`bg-white rounded-lg border-2 border-dashed p-2 min-h-[100px] flex flex-col transition-colors ${draggedField ? 'border-blue-300 bg-blue-50/30' : 'border-slate-200'}`}
                    >
                        <div className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-1"><Filter className="w-3 h-3" /> Filtres</div>
                        <div className="space-y-1.5 flex-1">
                            {filters.map((f, idx) => (
                                <div key={idx} className="relative group">
                                    <FieldChip field={f.field} zone="filter" onDelete={() => removeField('filter', f.field)} />
                                    {/* Mini Config Filter */}
                                    <div className="mt-1 pl-1">
                                        <select 
                                            className="w-full text-[9px] border border-slate-200 rounded p-0.5 bg-slate-50"
                                            value={f.operator || 'in'}
                                            onChange={(e) => {
                                                const n = [...filters];
                                                n[idx] = { ...n[idx], operator: e.target.value as any };
                                                setFilters(n);
                                            }}
                                        >
                                            <option value="in">Est égal à</option>
                                            <option value="contains">Contient</option>
                                            <option value="gt">&gt;</option>
                                            <option value="lt">&lt;</option>
                                        </select>
                                        {/* Simplified Value Input */}
                                        <input 
                                            type="text" 
                                            className="w-full text-[9px] border border-slate-200 rounded p-0.5 mt-0.5"
                                            placeholder="Valeur..."
                                            value={Array.isArray(f.value) ? f.value.join(',') : f.value}
                                            onChange={(e) => {
                                                const n = [...filters];
                                                n[idx] = { ...n[idx], value: f.operator === 'in' ? e.target.value.split(',') : e.target.value };
                                                setFilters(n);
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* COLONNES */}
                    <div 
                        onDragOver={handleDragOver} 
                        onDrop={(e) => handleDrop(e, 'col')}
                        className={`bg-white rounded-lg border-2 border-dashed p-2 min-h-[100px] flex flex-col transition-colors ${draggedField ? 'border-blue-300 bg-blue-50/30' : 'border-slate-200'}`}
                    >
                        <div className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-1"><Table2 className="w-3 h-3" /> Colonnes</div>
                        <div className="space-y-1.5 flex-1">
                            {colField ? (
                                <div>
                                    <FieldChip field={colField} zone="col" onDelete={() => setColField('')} />
                                    {isColFieldDate && (
                                        <select 
                                            className="w-full mt-1 text-[9px] border-slate-200 rounded bg-slate-50"
                                            value={colGrouping}
                                            onChange={(e) => setColGrouping(e.target.value as any)}
                                        >
                                            <option value="none">Date exacte</option>
                                            <option value="year">Année</option>
                                            <option value="quarter">Trimestre</option>
                                            <option value="month">Mois</option>
                                        </select>
                                    )}
                                </div>
                            ) : <span className="text-[9px] text-slate-300 italic">Déposez une colonne ici</span>}
                        </div>
                    </div>
                </div>

                {/* ZONES ROW 2: ROWS & VALUES */}
                <div className="grid grid-cols-2 gap-3">
                    {/* LIGNES */}
                    <div 
                        onDragOver={handleDragOver} 
                        onDrop={(e) => handleDrop(e, 'row')}
                        className={`bg-white rounded-lg border-2 border-dashed p-2 min-h-[150px] flex flex-col transition-colors ${draggedField ? 'border-blue-300 bg-blue-50/30' : 'border-slate-200'}`}
                    >
                        <div className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-1"><Layers className="w-3 h-3" /> Lignes</div>
                        <div className="space-y-1.5 flex-1">
                            {rowFields.map((f, idx) => (
                                <FieldChip key={f} field={f} zone="row" onDelete={() => removeField('row', f)} />
                            ))}
                            {rowFields.length === 0 && <span className="text-[9px] text-slate-300 italic">Déposez des lignes ici</span>}
                        </div>
                    </div>

                    {/* VALEURS */}
                    <div 
                        onDragOver={handleDragOver} 
                        onDrop={(e) => handleDrop(e, 'val')}
                        className={`bg-white rounded-lg border-2 border-dashed p-2 min-h-[150px] flex flex-col transition-colors ${draggedField ? 'border-blue-300 bg-blue-50/30' : 'border-slate-200'}`}
                    >
                        <div className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-1"><Calculator className="w-3 h-3" /> Valeurs</div>
                        <div className="space-y-1.5 flex-1">
                            {valField ? (
                                <div>
                                    <FieldChip field={valField} zone="val" onDelete={() => setValField('')} />
                                    <div className="mt-2 grid grid-cols-2 gap-1">
                                        {['count', 'sum', 'avg', 'min', 'max'].map(t => (
                                            <button 
                                                key={t}
                                                onClick={() => setAggType(t as AggregationType)}
                                                className={`px-1 py-1 text-[9px] uppercase rounded border ${aggType === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-500 border-slate-200'}`}
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                    {/* Format Override */}
                                    {aggType !== 'count' && (
                                        <div className="mt-2 pt-2 border-t border-slate-100">
                                            <input 
                                                type="number" 
                                                placeholder="Décimales"
                                                className="w-full text-[9px] border-slate-200 rounded p-1 mb-1"
                                                value={valFormatting.decimalPlaces ?? ''}
                                                onChange={e => setValFormatting({...valFormatting, decimalPlaces: e.target.value ? Number(e.target.value) : undefined})}
                                            />
                                            <input 
                                                type="text" 
                                                placeholder="Unité (€)"
                                                className="w-full text-[9px] border-slate-200 rounded p-1"
                                                value={valFormatting.unit ?? ''}
                                                onChange={e => setValFormatting({...valFormatting, unit: e.target.value})}
                                            />
                                        </div>
                                    )}
                                </div>
                            ) : <span className="text-[9px] text-slate-300 italic">Déposez une valeur ici</span>}
                        </div>
                    </div>
                </div>
             </div>

             {/* DISPLAY OPTIONS */}
             <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <div className="flex flex-col gap-2">
                    <Checkbox checked={showSubtotals} onChange={() => setShowSubtotals(!showSubtotals)} label="Sous-totaux" />
                    <Checkbox checked={showTotalCol} onChange={() => setShowTotalCol(!showTotalCol)} label="Total général" />
                    {colField && aggType !== 'list' && (aggType !== 'min' && aggType !== 'max') && (
                        <div className="mt-2 pt-2 border-t border-slate-100 animate-in fade-in">
                            <Checkbox checked={showVariations} onChange={() => setShowVariations(!showVariations)} label="Afficher variations (%)" className="text-blue-700 font-bold" />
                        </div>
                    )}
                </div>
             </div>

          </div>

          {/* RIGHT PANEL : PIVOT GRID */}
          <div id="pivot-export-container" className="flex-1 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col min-w-0 overflow-hidden relative">
             {isCalculating && (
                 <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center flex-col gap-3">
                     <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                     <span className="text-sm font-bold text-slate-600">Calcul en cours...</span>
                 </div>
             )}
             
             {pivotData ? (
               <div ref={parentRef} className="flex-1 overflow-auto custom-scrollbar flex flex-col w-full">
                   <div style={{ height: rowVirtualizer.getTotalSize(), width: '100%', position: 'relative' }}>
                   <table className="min-w-full divide-y divide-slate-200 border-collapse absolute top-0 left-0">
                      <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                         <tr>
                            {/* Headers Lignes */}
                            {rowFields.map((field, idx) => (
                               <th key={field} className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase border-b border-r border-slate-200 bg-slate-50 whitespace-nowrap sticky left-0 z-20" style={{ minWidth: '150px' }}>
                                  {field}
                               </th>
                            ))}
                            
                            {/* Headers Colonnes Dynamiques */}
                            {pivotData.colHeaders.map(col => {
                                const isDiff = col.endsWith('_DIFF');
                                const isPct = col.endsWith('_PCT');
                                const label = isDiff ? 'Var.' : isPct ? '%' : col;
                                
                                return (
                                   <th key={col} className={`px-4 py-3 text-right text-xs font-bold uppercase border-b border-r border-slate-200 whitespace-nowrap ${isDiff || isPct ? 'bg-blue-50 text-blue-700' : 'text-slate-500'}`}>
                                      {label}
                                   </th>
                                );
                            })}

                            {showTotalCol && (
                               <th className="px-4 py-3 text-right text-xs font-black text-slate-700 uppercase border-b bg-slate-100 whitespace-nowrap">
                                  Total
                               </th>
                            )}
                         </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                         {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                            const row = pivotData.displayRows[virtualRow.index];
                            return (
                            <tr 
                                key={virtualRow.key} 
                                style={{
                                    height: `${virtualRow.size}px`,
                                    transform: `translateY(${virtualRow.start}px)`
                                }}
                                className={`${row.type === 'subtotal' ? 'bg-slate-50 font-bold' : 'hover:bg-blue-50/30'}`}
                            >
                               {rowFields.map((field, cIdx) => {
                                  if (row.type === 'subtotal') {
                                      if (cIdx < row.level) return <td key={cIdx} className="px-4 py-2 text-sm text-slate-500 border-r border-slate-200 bg-slate-50/30">{row.keys[cIdx]}</td>;
                                      if (cIdx === row.level) return <td key={cIdx} colSpan={rowFields.length - cIdx} className="px-4 py-2 text-sm text-slate-700 border-r border-slate-200 font-bold italic text-right">{row.label}</td>;
                                      return null;
                                  }
                                  return <td key={cIdx} className="px-4 py-2 text-sm text-slate-700 border-r border-slate-200 whitespace-nowrap">{row.keys[cIdx]}</td>;
                               })}
                               {pivotData.colHeaders.map(col => {
                                  const val = row.metrics[col];
                                  const isDiff = col.endsWith('_DIFF');
                                  const isPct = col.endsWith('_PCT');
                                  let formatted = formatOutput(val);
                                  let cellClass = "text-slate-600";

                                  if (isDiff) {
                                      if (Number(val) > 0) { formatted = `+${formatted}`; cellClass = "text-green-600 font-bold"; }
                                      else if (Number(val) < 0) { cellClass = "text-red-600 font-bold"; }
                                      else cellClass = "text-slate-400";
                                  }
                                  else if (isPct) {
                                      if (val === 0 || val === undefined) formatted = '-';
                                      else {
                                          formatted = `${Number(val).toFixed(1)}%`;
                                          if (Number(val) > 0) cellClass = "text-green-600 font-bold";
                                          else if (Number(val) < 0) cellClass = "text-red-600 font-bold";
                                      }
                                  }

                                  return (
                                      <td key={col} className={`px-4 py-2 text-sm text-right border-r border-slate-100 tabular-nums ${cellClass} ${isDiff || isPct ? 'bg-blue-50/20' : ''}`}>
                                         {formatted}
                                      </td>
                                  );
                               })}
                               {showTotalCol && (
                                  <td className="px-4 py-2 text-sm text-right font-bold text-slate-800 bg-slate-50 border-l border-slate-200">
                                     {formatOutput(row.rowTotal)}
                                  </td>
                               )}
                            </tr>
                            );
                         })}
                      </tbody>
                   </table>
                   </div>
               </div>
             ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-slate-50/50">
                   <div className="p-4 bg-white rounded-full shadow-sm mb-4">
                        <MousePointer2 className="w-8 h-8 text-blue-200 animate-bounce" />
                   </div>
                   <p className="text-sm font-medium">Commencez par glisser des champs.</p>
                   <p className="text-xs text-slate-400 mt-2">Zone de gauche &rarr; Lignes / Colonnes / Valeurs</p>
                </div>
             )}
             
             {/* FOOTER TOTALS (FIXED OUTSIDE SCROLL) */}
             {pivotData && (
                 <div className="border-t-2 border-slate-300 bg-slate-100 shadow-inner overflow-hidden flex-shrink-0">
                     <table className="min-w-full divide-y divide-slate-200">
                         <tbody className="font-bold">
                             <tr>
                                <td className="px-4 py-3 text-right text-sm uppercase text-slate-600" style={{ width: '200px' }}>Total Général</td>
                                {pivotData.colHeaders.map(col => {
                                     const isPct = col.endsWith('_PCT');
                                     const val = pivotData.colTotals[col];
                                     let formatted = formatOutput(val);
                                     if (isPct) formatted = val ? `${Number(val).toFixed(1)}%` : '-';
                                     
                                     return (
                                         <td key={col} className="px-4 py-3 text-right text-sm text-slate-900 border-r border-slate-200">
                                            {formatted}
                                         </td>
                                     );
                                })}
                                {showTotalCol && (
                                   <td className="px-4 py-3 text-right text-sm text-black bg-slate-200 border-l border-slate-300">
                                      {formatOutput(pivotData.grandTotal)}
                                   </td>
                                )}
                             </tr>
                         </tbody>
                     </table>
                 </div>
             )}
          </div>

       </div>
    </div>
  );
};
