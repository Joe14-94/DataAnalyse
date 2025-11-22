
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useData } from '../context/DataContext';
import { parseSmartNumber, formatDateFr } from '../utils';
import { 
  Database, Filter, ArrowDownWideNarrow, Calculator, X, Layout,
  Table2, ArrowUpDown, SlidersHorizontal, Plus, Trash2, Layers,
  ArrowUp, ArrowDown, GripVertical
} from 'lucide-react';
import { MultiSelect } from '../components/ui/MultiSelect';
import { Checkbox } from '../components/ui/Checkbox';

type AggregationType = 'count' | 'sum' | 'avg' | 'min' | 'max' | 'list';
type SortBy = 'label' | 'value';
type SortOrder = 'asc' | 'desc';

interface PivotRow {
  type: 'data' | 'subtotal' | 'grandTotal';
  keys: string[]; // Les valeurs des dimensions pour cette ligne (ex: ['France', 'Paris'])
  level: number; // Profondeur (0 = 1er niveau)
  metrics: Record<string, number | string>; // ColHeader -> Value
  rowTotal: number | string;
  label?: string; // Pour les sous-totaux
}

export const PivotTable: React.FC = () => {
  const { batches, currentDataset } = useData();
  const fields = currentDataset ? currentDataset.fields : [];

  // --- STATE ---
  
  // Configuration de source
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  
  // Configuration TCD
  const [rowFields, setRowFields] = useState<string[]>([]); // Multi-niveaux
  const [colField, setColField] = useState<string>('');
  const [valField, setValField] = useState<string>('');
  const [aggType, setAggType] = useState<AggregationType>('count');
  
  // Filtres (Multi-valeurs)
  const [filters, setFilters] = useState<{field: string, values: string[]}[]>([]);
  
  // Options d'affichage
  const [showSubtotals, setShowSubtotals] = useState(true);
  const [showTotalCol, setShowTotalCol] = useState(true);

  // Options de tri
  const [sortBy, setSortBy] = useState<SortBy>('label');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Largeur des colonnes (key -> width px)
  const [colWidths, setColWidths] = useState<Record<string, number>>({});
  // Ref pour le redimensionnement
  const resizingRef = useRef<{ colId: string, startX: number, startWidth: number } | null>(null);

  // --- INITIALISATION ---

  useEffect(() => {
    // Sélectionner le dernier batch par défaut
    if (!selectedBatchId && batches.length > 0) {
      setSelectedBatchId(batches[batches.length - 1].id);
    }
    // Sélectionner des champs par défaut si disponibles
    if (fields.length > 0) {
      if (rowFields.length === 0) setRowFields([fields[0]]);
      if (!valField) setValField(fields[0]);
    }
  }, [batches, fields, selectedBatchId]);

  // --- HELPERS ---

  const currentBatch = useMemo(() => 
    batches.find(b => b.id === selectedBatchId) || batches[batches.length - 1], 
  [batches, selectedBatchId]);

  const getDistinctValuesForField = (field: string) => {
    if (!currentBatch) return [];
    const set = new Set<string>();
    currentBatch.rows.forEach(r => {
       const val = r[field] !== undefined ? String(r[field]) : '';
       if (val) set.add(val);
    });
    return Array.from(set).sort();
  };

  const getNumericValue = (row: any, fieldName: string): number => {
     const raw = row[fieldName];
     const unit = currentDataset?.fieldConfigs?.[fieldName]?.unit;
     return parseSmartNumber(raw, unit);
  };

  // --- HANDLERS CONFIG ---

  const addRowLevel = () => {
    if (rowFields.length < 3 && fields.length > rowFields.length) {
      // Trouver un champ non utilisé
      const nextField = fields.find(f => !rowFields.includes(f));
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

  // --- FILTERS HANDLERS (MULTI) ---

  const addFilter = () => {
    if (fields.length > 0) {
       setFilters([...filters, { field: fields[0], values: [] }]);
    }
  };

  const updateFilterField = (index: number, newField: string) => {
     const newFilters = [...filters];
     newFilters[index] = { field: newField, values: [] };
     setFilters(newFilters);
  };

  const updateFilterValues = (index: number, newValues: string[]) => {
     const newFilters = [...filters];
     newFilters[index].values = newValues;
     setFilters(newFilters);
  };

  const removeFilter = (index: number) => {
     setFilters(filters.filter((_, i) => i !== index));
  };

  // --- RESIZE HANDLERS ---

  const startResize = (e: React.MouseEvent, colId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const currentWidth = colWidths[colId] || 120; // Default min width
    resizingRef.current = { colId, startX: e.clientX, startWidth: currentWidth };
    
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
    document.body.style.cursor = 'col-resize';
  };

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!resizingRef.current) return;
    
    const { colId, startX, startWidth } = resizingRef.current;
    const diff = e.clientX - startX;
    const newWidth = Math.max(50, startWidth + diff); // Min 50px

    setColWidths(prev => ({
      ...prev,
      [colId]: newWidth
    }));
  }, []);

  const handleResizeEnd = useCallback(() => {
    resizingRef.current = null;
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
    document.body.style.cursor = '';
  }, [handleResizeMove]);

  // --- SORT HANDLER ---

  const handleHeaderSort = (type: SortBy) => {
     if (sortBy === type) {
        // Toggle Order
        setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
     } else {
        // Change Type and Default to Asc (Label) or Desc (Value)
        setSortBy(type);
        setSortOrder(type === 'value' ? 'desc' : 'asc');
     }
  };

  // --- PIVOT ENGINE (RECURSIVE) ---

  const pivotData = useMemo(() => {
    if (!currentBatch || rowFields.length === 0) return null;

    // 1. Filter Data (Multi-values support)
    const filteredRows = currentBatch.rows.filter(row => {
      if (filters.length === 0) return true;
      return filters.every(f => {
         if (f.values.length === 0) return true; // No selection = All
         return f.values.includes(String(row[f.field]));
      });
    });

    // 2. Extract Distinct Column Headers (if colField set)
    const colHeaders = new Set<string>();
    if (colField) {
      filteredRows.forEach(row => {
        const val = row[colField] !== undefined ? String(row[colField]) : '(Vide)';
        colHeaders.add(val);
      });
    }
    const sortedColHeaders = Array.from(colHeaders).sort();

    // 3. Aggregation Function
    const aggregate = (items: any[]): string | number => {
      if (items.length === 0) return 0;

      if (aggType === 'count') return items.length;

      if (aggType === 'list') {
        const uniqueVals = Array.from(new Set(items.map(i => String(i[valField] || '')))).filter(Boolean);
        if (uniqueVals.length === 0) return '-';
        if (uniqueVals.length > 3) return `${uniqueVals.slice(0, 3).join(', ')} (+${uniqueVals.length - 3})`;
        return uniqueVals.join(', ');
      }

      // Numeric Aggregations
      const values = items.map(i => getNumericValue(i, valField));
      
      if (aggType === 'sum') {
        return values.reduce((a, b) => a + b, 0);
      }
      
      if (aggType === 'avg') {
        const sum = values.reduce((a, b) => a + b, 0);
        return sum / values.length;
      }

      if (aggType === 'min') return Math.min(...values);
      if (aggType === 'max') return Math.max(...values);

      return 0;
    };

    // 4. Recursive Grouping & Flattening
    const displayRows: PivotRow[] = [];

    // Helper to calculate metrics for a set of rows
    const calculateMetrics = (rows: any[]) => {
      const metrics: Record<string, number | string> = {};
      // Per Column
      sortedColHeaders.forEach(cHead => {
        const colItems = rows.filter(r => String(r[colField] || '(Vide)') === cHead);
        metrics[cHead] = aggregate(colItems);
      });
      // Row Total
      const rowTotal = aggregate(rows);
      return { metrics, rowTotal };
    };

    const processLevel = (rows: any[], level: number, parentKeys: string[]) => {
      const currentField = rowFields[level];
      
      // Group rows by current field
      const groups: Record<string, any[]> = {};
      rows.forEach(row => {
        const key = row[currentField] !== undefined ? String(row[currentField]) : '(Vide)';
        if (!groups[key]) groups[key] = [];
        groups[key].push(row);
      });

      // Sort Keys
      const keys = Object.keys(groups).sort((a, b) => {
        if (sortBy === 'label') {
          return sortOrder === 'asc' ? a.localeCompare(b) : b.localeCompare(a);
        } else {
          // Sort by Row Total value
          const valA = aggregate(groups[a]); // Simplified: sort by total metric of the group
          const valB = aggregate(groups[b]);
          if (typeof valA === 'number' && typeof valB === 'number') {
            return sortOrder === 'asc' ? valA - valB : valB - valA;
          }
          return 0;
        }
      });

      // Process each group
      keys.forEach(key => {
        const groupRows = groups[key];
        const currentKeys = [...parentKeys, key];

        // If we are at the deepest level
        if (level === rowFields.length - 1) {
          const { metrics, rowTotal } = calculateMetrics(groupRows);
          displayRows.push({
            type: 'data',
            keys: currentKeys,
            level,
            metrics,
            rowTotal
          });
        } else {
          // We are at an intermediate level
          // 1. Process Children first
          processLevel(groupRows, level + 1, currentKeys);

          // 2. Add Subtotal row if enabled
          if (showSubtotals) {
            const { metrics, rowTotal } = calculateMetrics(groupRows);
            displayRows.push({
              type: 'subtotal',
              keys: currentKeys,
              level,
              metrics,
              rowTotal,
              label: `Total ${key}`
            });
          }
        }
      });
    };

    // Start Recursion
    processLevel(filteredRows, 0, []);

    // Grand Total
    const grandTotalCalc = calculateMetrics(filteredRows);
    const colTotals = grandTotalCalc.metrics;
    const grandTotal = grandTotalCalc.rowTotal;

    // Helper Format
    const formatOutput = (val: number | string) => {
      if (typeof val === 'string') return val;
      if (val % 1 !== 0) return val.toFixed(2);
      return val.toLocaleString();
    };

    return {
      colHeaders: sortedColHeaders,
      displayRows,
      colTotals,
      grandTotal,
      formatOutput
    };

  }, [currentBatch, rowFields, colField, valField, aggType, filters, sortBy, sortOrder, showSubtotals]);


  // --- RENDER ---

  if (!currentDataset) {
    return (
       <div className="h-full flex flex-col items-center justify-center text-center bg-slate-50 rounded-lg border border-dashed border-slate-300 m-4">
          <Database className="w-12 h-12 text-slate-300 mb-4" />
          <p className="text-slate-600 font-medium">Aucun tableau sélectionné</p>
          <p className="text-slate-500 text-sm max-w-md mt-2">
             Veuillez sélectionner une typologie dans le menu latéral.
          </p>
       </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-4 md:p-8 gap-4">
       
       {/* --- HEADER BAR --- */}
       <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2">
             <Layout className="w-6 h-6 text-blue-600" />
             <div>
                <h2 className="text-lg font-bold text-slate-800">Tableau croisé dynamique (TCD)</h2>
                <p className="text-xs text-slate-500">Analyse multi-dimensionnelle</p>
             </div>
          </div>
          
          <div className="flex items-center gap-2 bg-slate-50 p-1 rounded border border-slate-200">
             <span className="text-xs font-bold text-slate-500 px-2">Données du :</span>
             <select 
                className="bg-white border-slate-300 text-slate-700 text-sm rounded shadow-sm p-1.5 focus:ring-blue-500 focus:border-blue-500"
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
              >
                {batches.map(b => (
                   <option key={b.id} value={b.id}>
                      {formatDateFr(b.date)} ({b.rows.length} lignes)
                   </option>
                ))}
             </select>
          </div>
       </div>

       <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
          
          {/* --- SIDEBAR CONFIG --- */}
          <div className="lg:w-80 flex-shrink-0 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col overflow-y-auto custom-scrollbar">
             <div className="p-3 bg-slate-50 border-b border-slate-200 font-bold text-slate-700 flex items-center gap-2">
                <ArrowDownWideNarrow className="w-4 h-4" />
                Configuration TCD
             </div>
             
             <div className="p-4 space-y-6">
                
                {/* 1. Lignes (Multi-niveaux) */}
                <div className="space-y-2">
                   <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                         <Layers className="w-3 h-3" /> Lignes ({rowFields.length}/3)
                      </label>
                      {rowFields.length < 3 && (
                         <button onClick={addRowLevel} className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100 hover:bg-blue-100 flex items-center">
                            <Plus className="w-3 h-3 mr-1" /> Ajouter
                         </button>
                      )}
                   </div>

                   <div className="space-y-2">
                      {rowFields.map((field, idx) => (
                        <div key={idx} className="flex gap-1 relative group">
                           <div className="flex items-center justify-center w-5 bg-slate-100 text-slate-400 text-[10px] font-bold rounded-l border border-r-0 border-slate-300">
                              {idx + 1}
                           </div>
                           <select 
                              className="flex-1 p-2 bg-white border border-slate-300 rounded-r text-sm focus:ring-blue-500 focus:border-blue-500"
                              value={field}
                              onChange={(e) => updateRowField(idx, e.target.value)}
                           >
                              {fields.map(f => (
                                 // Empêcher de sélectionner un champ déjà utilisé ailleurs (sauf par soi-même)
                                 <option key={f} value={f} disabled={rowFields.includes(f) && f !== field}>
                                    {f}
                                 </option>
                              ))}
                           </select>
                           {idx > 0 && (
                              <button onClick={() => removeRowLevel(idx)} className="absolute right-1 top-1.5 text-slate-400 hover:text-red-500 bg-white rounded-full">
                                 <Trash2 className="w-4 h-4" />
                              </button>
                           )}
                        </div>
                      ))}
                   </div>
                </div>

                {/* 2. Colonnes */}
                <div className="space-y-1">
                   <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                      <Table2 className="w-3 h-3" /> Colonnes (optionnel)
                   </label>
                   <select 
                      className="w-full p-2 bg-white border border-slate-300 rounded text-sm focus:ring-blue-500 focus:border-blue-500"
                      value={colField}
                      onChange={(e) => setColField(e.target.value)}
                   >
                      <option value="">(Aucune colonne)</option>
                      {fields.filter(f => !rowFields.includes(f)).map(f => <option key={f} value={f}>{f}</option>)}
                   </select>
                </div>

                {/* 3. Valeurs */}
                <div className="p-3 bg-blue-50 rounded border border-blue-100 space-y-3">
                   <label className="text-xs font-bold text-blue-700 flex items-center gap-1">
                      <Calculator className="w-3 h-3" /> Valeurs (calculer)
                   </label>
                   
                   <select 
                      className="w-full p-2 bg-white border border-blue-200 rounded text-sm text-blue-900 focus:ring-blue-500"
                      value={valField}
                      onChange={(e) => setValField(e.target.value)}
                   >
                      {fields.map(f => <option key={f} value={f}>{f}</option>)}
                   </select>

                   <div className="grid grid-cols-3 gap-1">
                      {[
                         { id: 'count', label: 'Compte' },
                         { id: 'sum', label: 'Somme' },
                         { id: 'avg', label: 'Moy.' },
                         { id: 'min', label: 'Min' },
                         { id: 'max', label: 'Max' },
                         { id: 'list', label: 'Liste' },
                      ].map(type => (
                         <button 
                            key={type.id}
                            onClick={() => setAggType(type.id as AggregationType)}
                            className={`text-[10px] py-1 px-1 rounded border font-medium transition-all ${aggType === type.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-blue-50'}`}
                         >
                            {type.label}
                         </button>
                      ))}
                   </div>
                   
                   {aggType === 'sum' && (
                      <p className="text-[10px] text-blue-600 italic">
                         * "Somme" ignore automatiquement les unités monétaires.
                      </p>
                   )}
                </div>

                {/* 4. Filtres */}
                <div className="pt-4 border-t border-slate-100">
                   <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                         <Filter className="w-3 h-3" /> Filtres
                      </label>
                      <button onClick={addFilter} className="text-[10px] bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded font-medium text-slate-700">
                         + Ajouter
                      </button>
                   </div>
                   
                   <div className="space-y-2">
                      {filters.map((filter, idx) => (
                         <div key={idx} className="bg-slate-50 p-2 rounded border border-slate-200 text-xs space-y-1 relative">
                            <button onClick={() => removeFilter(idx)} className="absolute top-1 right-1 text-slate-400 hover:text-red-500">
                               <X className="w-3 h-3" />
                            </button>
                            
                            <select 
                               className="w-full bg-white border border-slate-200 rounded px-1 py-1 mb-1"
                               value={filter.field}
                               onChange={(e) => updateFilterField(idx, e.target.value)}
                            >
                               {fields.map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                            
                            <MultiSelect 
                               options={getDistinctValuesForField(filter.field)}
                               selected={filter.values}
                               onChange={(newValues) => updateFilterValues(idx, newValues)}
                               placeholder="Sélectionner valeurs..."
                            />
                         </div>
                      ))}
                      {filters.length === 0 && <p className="text-xs text-slate-400 italic">Aucun filtre actif.</p>}
                   </div>
                </div>

                {/* 5. Options et Tri */}
                <div className="pt-4 border-t border-slate-100 space-y-3">
                   <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                      <SlidersHorizontal className="w-3 h-3" /> Options
                   </label>

                   {/* Tri (Informationnel car maintenant interactif) */}
                   <div className="space-y-1">
                      <span className="text-[10px] font-medium text-slate-400">Tri actif :</span>
                      <div className="flex gap-1 items-center text-xs text-slate-700 bg-slate-100 px-2 py-1 rounded">
                        {sortBy === 'label' ? 'Étiquette' : 'Valeur (total)'}
                        {sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />}
                      </div>
                      <p className="text-[10px] text-slate-400 italic mt-1">
                        Cliquez sur les en-têtes du tableau pour changer le tri.
                      </p>
                   </div>
                </div>

             </div>
          </div>

          {/* --- MAIN TABLE --- */}
          <div className="flex-1 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col overflow-hidden">
             {pivotData ? (
                <div className="flex-1 overflow-auto custom-scrollbar p-1 relative">
                   <table className="min-w-full border-collapse text-sm text-slate-700" style={{ tableLayout: 'fixed' }}>
                      <thead className="bg-slate-100 sticky top-0 z-10 shadow-sm">
                         <tr>
                            {/* Dynamic Row Headers */}
                            {rowFields.map((field, i) => {
                              const colId = `row-${i}`;
                              const width = colWidths[colId] || 140;
                              
                              return (
                                <th 
                                  key={i} 
                                  className="border border-slate-300 bg-slate-200 text-left relative group select-none"
                                  style={{ width: `${width}px` }}
                                >
                                  <div 
                                    className="flex items-center justify-between p-2 cursor-pointer hover:bg-slate-300/50 h-full"
                                    onClick={() => handleHeaderSort('label')}
                                    title="Cliquez pour trier par étiquette"
                                  >
                                    <span className="font-bold text-slate-800 text-xs truncate">{field}</span>
                                    {sortBy === 'label' && (
                                      sortOrder === 'asc' ? <ArrowDown className="w-3 h-3 text-blue-600 shrink-0" /> : <ArrowUp className="w-3 h-3 text-blue-600 shrink-0" />
                                    )}
                                  </div>

                                  {/* Resizer */}
                                  <div 
                                    className="absolute top-0 right-0 h-full w-1 cursor-col-resize hover:bg-blue-400 z-20"
                                    onMouseDown={(e) => startResize(e, colId)}
                                  />
                                </th>
                              );
                            })}
                            
                            {/* Column Headers */}
                            {colField && pivotData.colHeaders.map((cHead, i) => {
                               const colId = `col-${i}`;
                               const width = colWidths[colId] || 100;

                               return (
                                 <th 
                                  key={cHead} 
                                  className="border border-slate-300 font-semibold text-center bg-slate-50 relative select-none"
                                  style={{ width: `${width}px` }}
                                 >
                                    <div className="p-2 flex flex-col h-full justify-center">
                                      <span className="text-[10px] text-slate-400 font-normal truncate">{colField}</span>
                                      <span className="truncate">{cHead}</span>
                                    </div>
                                    {/* Resizer */}
                                    <div 
                                      className="absolute top-0 right-0 h-full w-1 cursor-col-resize hover:bg-blue-400 z-20"
                                      onMouseDown={(e) => startResize(e, colId)}
                                    />
                                 </th>
                               );
                            })}

                            {/* Grand Total Header Col */}
                            <th 
                              className="border border-slate-300 font-bold text-center bg-slate-200 text-slate-800 relative group select-none"
                              style={{ width: `${colWidths['total'] || 100}px` }}
                            >
                               <div 
                                  className="flex items-center justify-center gap-2 p-2 cursor-pointer hover:bg-slate-300/50 h-full"
                                  onClick={() => handleHeaderSort('value')}
                                  title="Cliquez pour trier par valeur totale"
                               >
                                  <span>Total</span>
                                  {sortBy === 'value' && (
                                    sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600 shrink-0" /> : <ArrowDown className="w-3 h-3 text-blue-600 shrink-0" />
                                  )}
                               </div>
                               
                               {/* Resizer */}
                               <div 
                                  className="absolute top-0 right-0 h-full w-1 cursor-col-resize hover:bg-blue-400 z-20"
                                  onMouseDown={(e) => startResize(e, 'total')}
                               />
                            </th>
                         </tr>
                      </thead>
                      <tbody>
                         {pivotData.displayRows.map((row, rowIndex) => {
                            const isSubtotal = row.type === 'subtotal';
                            
                            // Background logic
                            let bgClass = "bg-white";
                            if (isSubtotal) {
                               if (row.level === 0) bgClass = "bg-slate-200"; // Top level total
                               else if (row.level === 1) bgClass = "bg-slate-100";
                            }

                            return (
                               <tr key={rowIndex} className={`${bgClass} hover:bg-blue-50 transition-colors`}>
                                  
                                  {/* Row Labels (Hierarchical) */}
                                  {rowFields.map((_, colIndex) => {
                                     // Logic to handle layout of hierarchical columns
                                     if (row.type === 'data') {
                                        // Data rows show all keys
                                        return (
                                           <td key={colIndex} className="border border-slate-300 p-2 text-xs font-medium text-slate-700 truncate">
                                              {row.keys[colIndex] || ''}
                                           </td>
                                        );
                                     } else {
                                        // Subtotal rows
                                        if (colIndex === row.level) {
                                           // The label cell
                                           return (
                                              <td key={colIndex} className="border border-slate-300 p-2 font-bold text-slate-800 italic text-right truncate">
                                                 {row.label}
                                              </td>
                                           );
                                        } else if (colIndex < row.level) {
                                           // Parent keys repeated for context (or could be empty)
                                           return (
                                              <td key={colIndex} className="border border-slate-300 p-2 text-xs text-slate-400 truncate">
                                                 {row.keys[colIndex]}
                                              </td>
                                           );
                                        } else {
                                           // Empty cells to the right of subtotal label
                                           return <td key={colIndex} className="border border-slate-300 bg-slate-50/50"></td>;
                                        }
                                     }
                                  })}

                                  {/* Values Matrix */}
                                  {colField && pivotData.colHeaders.map(cHead => {
                                     const val = row.metrics[cHead];
                                     return (
                                        <td key={cHead} className={`border border-slate-300 p-2 text-right tabular-nums truncate ${isSubtotal ? 'font-bold' : ''}`}>
                                           {val !== undefined && val !== 0 ? pivotData.formatOutput(val) : <span className="text-slate-300">-</span>}
                                        </td>
                                     );
                                  })}

                                  {/* Row Total */}
                                  <td className={`border border-slate-300 p-2 text-right tabular-nums font-bold truncate ${isSubtotal ? 'text-slate-900' : 'text-slate-700'}`}>
                                     {pivotData.formatOutput(row.rowTotal)}
                                  </td>
                               </tr>
                            );
                         })}

                         {/* Grand Total Row */}
                         {showTotalCol && (
                            <tr className="bg-slate-800 text-white font-bold border-t-2 border-slate-900">
                               <td colSpan={rowFields.length} className="border border-slate-700 p-2 text-right tracking-wider text-xs truncate">
                                  Total général
                               </td>
                               
                               {colField && pivotData.colHeaders.map(cHead => (
                                  <td key={`total-${cHead}`} className="border border-slate-700 p-2 text-right tabular-nums truncate">
                                     {pivotData.formatOutput(pivotData.colTotals[cHead])}
                                  </td>
                               ))}

                               <td className="border border-slate-700 p-2 text-right tabular-nums bg-slate-900 text-yellow-400 truncate">
                                  {pivotData.formatOutput(pivotData.grandTotal)}
                               </td>
                            </tr>
                         )}
                      </tbody>
                   </table>
                </div>
             ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                   <Table2 className="w-10 h-10 mb-2 opacity-20" />
                   <p>Configurez au moins une ligne pour générer le tableau.</p>
                </div>
             )}
             
             <div className="p-2 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row gap-4 text-xs text-slate-600">
                {rowFields.length > 1 && (
                   <Checkbox 
                      checked={showSubtotals} 
                      onChange={() => setShowSubtotals(!showSubtotals)} 
                      label="Afficher les sous-totaux intermédiaires" 
                   />
                )}
                <Checkbox 
                   checked={showTotalCol} 
                   onChange={() => setShowTotalCol(!showTotalCol)} 
                   label="Afficher total général" 
                />
             </div>
          </div>

       </div>
    </div>
  );
};
