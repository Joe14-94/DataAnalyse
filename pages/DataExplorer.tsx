
import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { formatDateFr, evaluateFormula, generateId, parseSmartNumber, formatNumberValue } from '../utils';
import { Button } from '../components/ui/Button';
import { CalculatedField, ConditionalRule, FieldConfig } from '../types';
import { 
  Search, Download, Database, ChevronLeft, ChevronRight, Table2, 
  Filter, ArrowUpDown, ArrowUp, ArrowDown, XCircle, X, 
  History, GitCommit, ArrowRight, Calculator, Plus, Trash2, FunctionSquare, Palette,
  FilterX, Hash, Percent
} from 'lucide-react';
import { useLocation } from 'react-router-dom';

export const DataExplorer: React.FC = () => {
  const { currentDataset, batches, addCalculatedField, removeCalculatedField, updateDatasetConfigs, deleteBatch } = useData();
  const location = useLocation(); // Hook Router
  
  // --- State ---
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  
  // Sorting
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  
  // Column Filters
  const [showFilters, setShowFilters] = useState(false);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});

  // Column Selection for Tools
  const [selectedCol, setSelectedCol] = useState<string | null>(null);

  // HISTORY & RECONCILIATION STATE
  const [selectedRow, setSelectedRow] = useState<any | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [trackingKey, setTrackingKey] = useState<string>('');

  // CALCULATED FIELDS MODAL
  const [isCalcModalOpen, setIsCalcModalOpen] = useState(false);
  const [newField, setNewField] = useState<Partial<CalculatedField>>({
     name: '',
     formula: '',
     outputType: 'number',
     unit: ''
  });

  // CONDITIONAL FORMATTING MODAL
  const [isFormatModalOpen, setIsFormatModalOpen] = useState(false);
  const [selectedFormatCol, setSelectedFormatCol] = useState<string>('');
  const [newRule, setNewRule] = useState<Partial<ConditionalRule>>({ operator: 'lt', value: 0, style: { color: 'text-red-600', fontWeight: 'font-bold' } });

  // --- EFFECT: Handle Drilldown from Navigation ---
  useEffect(() => {
     if (location.state && location.state.prefilledFilters) {
        setColumnFilters(location.state.prefilledFilters);
        // We want to focus on drill-down data, so we clear global search and sorting to avoid confusion
        setSearchTerm('');
        setSortConfig(null);
        setShowFilters(true);
        // On navigation, we typically want to see the filtered result from page 1
        setCurrentPage(1);
     }
  }, [location.state]);

  // Initialize tracking key (Smart default)
  useEffect(() => {
     if (currentDataset && currentDataset.fields.length > 0 && !trackingKey) {
        // Try to find a likely identifier
        const candidates = ['email', 'id', 'reference', 'ref', 'code', 'matricule', 'nom'];
        const found = currentDataset.fields.find(f => candidates.includes(f.toLowerCase()));
        setTrackingKey(found || currentDataset.fields[0]);
     }
  }, [currentDataset]);

  useEffect(() => {
     if (currentDataset && !selectedFormatCol) {
        setSelectedFormatCol(currentDataset.fields[0]);
     }
  }, [currentDataset]);

  // --- Handlers ---
  
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleColumnFilterChange = (key: string, value: string) => {
    setColumnFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setColumnFilters({});
    setSearchTerm('');
    setSortConfig(null);
    setCurrentPage(1);
  };

  const handleRowClick = (row: any) => {
     setSelectedRow(row);
     setIsDrawerOpen(true);
  };

  const handleAddCalculatedField = () => {
    if (!currentDataset || !newField.name || !newField.formula) return;
    
    const field: CalculatedField = {
      id: generateId(),
      name: newField.name,
      formula: newField.formula,
      outputType: newField.outputType as any,
      unit: newField.unit
    };
    
    addCalculatedField(currentDataset.id, field);
    setNewField({ name: '', formula: '', outputType: 'number', unit: '' });
  };

  const handleAddConditionalRule = () => {
     if (!currentDataset || !selectedFormatCol) return;
     
     const rule: ConditionalRule = {
        id: generateId(),
        operator: newRule.operator as any,
        value: newRule.value as any,
        style: newRule.style as any
     };

     const currentConfig = currentDataset.fieldConfigs?.[selectedFormatCol] || { type: 'text' };
     const currentRules = currentConfig.conditionalFormatting || [];

     updateDatasetConfigs(currentDataset.id, {
        [selectedFormatCol]: {
           ...currentConfig,
           conditionalFormatting: [...currentRules, rule]
        }
     });
  };

  const handleRemoveConditionalRule = (colName: string, ruleId: string) => {
     if (!currentDataset) return;
     const currentConfig = currentDataset.fieldConfigs?.[colName];
     if (!currentConfig) return;
     
     updateDatasetConfigs(currentDataset.id, {
        [colName]: {
           ...currentConfig,
           conditionalFormatting: (currentConfig.conditionalFormatting || []).filter(r => r.id !== ruleId)
        }
     });
  };

  // --- NUMBER FORMATTING HANDLERS ---
  const handleFormatChange = (key: keyof FieldConfig, value: any) => {
      if (!currentDataset || !selectedCol) return;
      
      const currentConfig = currentDataset.fieldConfigs?.[selectedCol] || { type: 'number' };
      updateDatasetConfigs(currentDataset.id, {
          [selectedCol]: { ...currentConfig, [key]: value }
      });
  };

  // --- Data Processing ---

  // 1. Flatten Data AND Calculate Fields
  const allRows = useMemo(() => {
    if (!currentDataset) return [];
    const calcFields = currentDataset.calculatedFields || [];

    return batches
      .filter(b => b.datasetId === currentDataset.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .flatMap(batch => batch.rows.map(r => {
         const extendedRow: any = {
            ...r,
            _importDate: batch.date,
            _batchId: batch.id
         };
         
         // Evaluation des champs calculés
         calcFields.forEach(cf => {
            const val = evaluateFormula(r, cf.formula);
            extendedRow[cf.name] = val;
         });

         return extendedRow;
      }));
  }, [currentDataset, batches]);

  // 2. Process: Filter (Global & Column) + Sort
  const processedRows = useMemo(() => {
    let data = [...allRows];

    // A. Global Search
    if (searchTerm.trim()) {
      const lowerTerm = searchTerm.toLowerCase();
      data = data.filter(row => 
        Object.values(row).some((val: any) => 
          String(val).toLowerCase().includes(lowerTerm)
        )
      );
    }

    // B. Column Filters
    Object.entries(columnFilters).forEach(([key, filterValue]) => {
      if (filterValue !== undefined && filterValue !== null) { 
        
        // Special token for Empty Values (from TCD Drilldown)
        if (filterValue === '__EMPTY__') {
           data = data.filter(row => {
               const val = row[key];
               return val === undefined || val === null || val === '';
           });
        } else {
            const lowerFilter = (filterValue as string).toLowerCase();
            data = data.filter(row => {
            const val = row[key];
            
            // Special handling for BatchId (Exact match required for drilldown reliability)
            if (key === '_batchId') {
                return String(val) === String(filterValue);
            }

            // Gestion spéciale pour la date d'import (Support formats multiples)
            if (key === '_importDate') {
                const dateStr = val as string; // ISO YYYY-MM-DD "2025-11-23"
                
                // 1. Format d'affichage (Français long) : "23 novembre 2025"
                if (formatDateFr(dateStr).toLowerCase().includes(lowerFilter)) return true;

                // 2. Formats numériques : DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD
                try {
                    const parts = dateStr.split('-');
                    if (parts.length === 3) {
                    const [y, m, d] = parts;
                    // Constructions des formats français
                    const frNumeric = `${d}/${m}/${y}`; // 23/11/2025
                    const frNumericShort = `${d}/${m}`; // 23/11
                    const frNumericDash = `${d}-${m}-${y}`; // 23-11-2025
                    
                    if (frNumeric.includes(lowerFilter)) return true;
                    if (frNumericShort.includes(lowerFilter)) return true;
                    if (frNumericDash.includes(lowerFilter)) return true;
                    if (dateStr.includes(lowerFilter)) return true; // ISO match
                    }
                } catch (e) {
                    return false;
                }
                return false;
            }

            return String(val ?? '').toLowerCase().includes(lowerFilter);
            });
        }
      }
    });

    // C. Sort
    if (sortConfig) {
      data.sort((a, b) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];

        if (valA == null) return 1;
        if (valB == null) return -1;

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return data;
  }, [allRows, searchTerm, columnFilters, sortConfig]);

  // 3. Pagination
  const totalPages = Math.ceil(processedRows.length / rowsPerPage);
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return processedRows.slice(start, start + rowsPerPage);
  }, [processedRows, currentPage, rowsPerPage]);

  // 4. HISTORY RECONCILIATION LOGIC
  const historyData = useMemo(() => {
     if (!selectedRow || !trackingKey) return [];
     
     const trackValue = selectedRow[trackingKey];
     if (trackValue === undefined || trackValue === '') return [selectedRow];

     // Find all rows in all batches (of current dataset) that match the key
     const relevantBatches = batches
        .filter(b => b.datasetId === currentDataset?.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Recent first

     const history: any[] = [];
     relevantBatches.forEach(batch => {
        // We look for exact string match
        const match = batch.rows.find(r => String(r[trackingKey]) === String(trackValue));
        if (match) {
           history.push({
              ...match,
              _importDate: batch.date,
              _batchId: batch.id
           });
        }
     });
     return history;
  }, [selectedRow, trackingKey, batches, currentDataset]);

  // 5. HELPER: Get Cell Style based on conditional formatting
  const getCellStyle = (fieldName: string, value: any) => {
     if (!currentDataset?.fieldConfigs) return '';
     const rules = currentDataset.fieldConfigs[fieldName]?.conditionalFormatting;
     if (!rules || rules.length === 0) return '';

     for (const rule of rules) {
        const numValue = parseSmartNumber(value);
        const targetValue = Number(rule.value);
        
        let match = false;
        if (rule.operator === 'gt') match = numValue > targetValue;
        if (rule.operator === 'lt') match = numValue < targetValue;
        if (rule.operator === 'eq') match = String(value) == String(rule.value);
        if (rule.operator === 'contains') match = String(value).toLowerCase().includes(String(rule.value).toLowerCase());
        if (rule.operator === 'empty') match = !value || value === '';

        if (match) {
           return `${rule.style.color || ''} ${rule.style.backgroundColor || ''} ${rule.style.fontWeight || ''}`;
        }
     }
     return '';
  };

  // --- Export ---
  const handleExportFullCSV = () => {
    if (!currentDataset || processedRows.length === 0) return;
    
    // Inclure les champs calculés
    const calcFieldNames = (currentDataset.calculatedFields || []).map(f => f.name);
    const headers = ['Date import', 'Id', ...currentDataset.fields, ...calcFieldNames];
    
    const csvContent = [
      headers.join(';'),
      ...processedRows.map(row => {
        const cols = [
           row._importDate,
           row.id,
           ...currentDataset.fields.map(f => {
              let val = row[f];
              let stringVal = val !== undefined ? String(val) : '';
              if (stringVal.includes(';') || stringVal.includes('\n') || stringVal.includes('"')) {
                stringVal = `"${stringVal.replace(/"/g, '""')}"`;
              }
              return stringVal;
           }),
           ...calcFieldNames.map(f => {
              let val = row[f];
              return val !== undefined ? String(val) : '';
           })
        ];
        return cols.join(';');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Export_${currentDataset.name}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!currentDataset) {
     return (
      <div className="h-full flex flex-col items-center justify-center text-center bg-slate-50 rounded-lg border border-dashed border-slate-300 m-4">
        <Database className="w-12 h-12 text-slate-300 mb-4" />
        <p className="text-slate-600 font-medium">Aucune typologie sélectionnée</p>
        <p className="text-slate-500 text-sm max-w-md mt-2">
          Veuillez sélectionner une typologie de tableau dans le menu latéral pour visualiser les données.
        </p>
      </div>
    );
  }

  const calculatedFields = currentDataset.calculatedFields || [];

  // Determine if there is a hidden batch filter active (Drill down context)
  const activeBatchFilter = columnFilters['_batchId'];
  const activeBatchDate = activeBatchFilter ? batches.find(b => b.id === activeBatchFilter)?.date : null;

  // Selected Column Config
  const selectedConfig = selectedCol ? currentDataset.fieldConfigs?.[selectedCol] : null;
  const isSelectedNumeric = selectedConfig?.type === 'number';

  return (
    <div className="h-full flex flex-col p-4 md:p-8 gap-4 relative">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f8fafc;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 6px;
          border: 3px solid #f8fafc;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 flex-shrink-0">
        <div>
           <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Table2 className="w-6 h-6 text-slate-500" />
              Données : {currentDataset.name}
           </h2>
           <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
             <span>{processedRows.length} ligne(s) affichée(s) (Total : {allRows.length})</span>
             {activeBatchDate && (
                 <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 animate-in fade-in">
                     <Filter className="w-3 h-3" /> Source restreinte : Import du {formatDateFr(activeBatchDate)}
                 </span>
             )}
           </p>
        </div>

        <div className="flex flex-wrap gap-3 w-full md:w-auto">
           {/* Search Input */}
           <div className="relative flex-1 md:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                 <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                 type="text"
                 className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md bg-white placeholder-slate-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
                 placeholder="Recherche globale..."
                 value={searchTerm}
                 onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
           </div>
           
           <Button variant="secondary" onClick={() => setIsFormatModalOpen(true)} className="whitespace-nowrap">
               <Palette className="w-4 h-4 md:mr-2" />
               <span className="hidden md:inline">Conditionnel</span>
           </Button>

           <Button variant="secondary" onClick={() => setIsCalcModalOpen(true)} className="whitespace-nowrap">
               <FunctionSquare className="w-4 h-4 md:mr-2" />
               <span className="hidden md:inline">Calculs</span>
           </Button>

           <Button 
              variant={showFilters ? "primary" : "outline"} 
              onClick={() => setShowFilters(!showFilters)}
              className="whitespace-nowrap"
           >
              <Filter className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Filtres</span>
           </Button>
           
           {(Object.keys(columnFilters).length > 0 || searchTerm) && (
               <Button variant="danger" onClick={clearFilters} className="whitespace-nowrap px-3" title="Effacer tous les filtres">
                   <FilterX className="w-4 h-4" />
               </Button>
           )}

           {/* DELETE IMPORT BUTTON (Only when drill-down/filtered on specific batch) */}
           {activeBatchFilter && (
               <Button 
                  variant="danger" 
                  onClick={() => {
                     if(window.confirm("Êtes-vous sûr de vouloir supprimer définitivement cet import ? Cette action est irréversible.")) {
                        deleteBatch(activeBatchFilter);
                        clearFilters();
                     }
                  }} 
                  className="whitespace-nowrap bg-red-100 text-red-700 border-red-200 hover:bg-red-200"
               >
                  <Trash2 className="w-4 h-4 md:mr-2" />
                  <span className="hidden md:inline">Supprimer l'import</span>
               </Button>
           )}

           <Button variant="outline" onClick={handleExportFullCSV} disabled={processedRows.length === 0}>
              <Download className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Export</span>
           </Button>
        </div>
      </div>

      {/* Formatting Toolbar (Appears when a numeric column is selected) */}
      <div className={`transition-all duration-300 overflow-hidden ${selectedCol && isSelectedNumeric ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0'}`}>
         <div className="bg-white border border-teal-200 rounded-lg p-3 shadow-sm bg-gradient-to-r from-white to-teal-50 flex flex-wrap items-center gap-4">
             <div className="flex items-center gap-2 text-teal-800 text-xs font-bold uppercase tracking-wider border-r border-teal-200 pr-4">
                <Hash className="w-4 h-4" /> 
                Formatage : {selectedCol}
             </div>
             
             {/* Decimal Places */}
             <div className="flex items-center gap-2">
                 <span className="text-xs text-slate-600 font-medium">Décimales :</span>
                 <div className="flex bg-white rounded border border-slate-200">
                    <button 
                        onClick={() => handleFormatChange('decimalPlaces', Math.max(0, (selectedConfig?.decimalPlaces ?? 2) - 1))}
                        className="px-2 py-1 text-xs hover:bg-slate-50 text-slate-600 border-r border-slate-100"
                    >-</button>
                    <span className="px-2 py-1 text-xs font-mono w-6 text-center">{selectedConfig?.decimalPlaces ?? 2}</span>
                    <button 
                        onClick={() => handleFormatChange('decimalPlaces', Math.min(5, (selectedConfig?.decimalPlaces ?? 2) + 1))}
                        className="px-2 py-1 text-xs hover:bg-slate-50 text-slate-600 border-l border-slate-100"
                    >+</button>
                 </div>
             </div>

             {/* Scale */}
             <div className="flex items-center gap-2">
                 <span className="text-xs text-slate-600 font-medium">Échelle :</span>
                 <select 
                    className="text-xs border border-slate-200 rounded py-1 pl-2 pr-6 bg-white focus:ring-1 focus:ring-teal-500"
                    value={selectedConfig?.displayScale || 'none'}
                    onChange={(e) => handleFormatChange('displayScale', e.target.value)}
                 >
                    <option value="none">Aucune</option>
                    <option value="thousands">Milliers (k)</option>
                    <option value="millions">Millions (M)</option>
                    <option value="billions">Milliards (Md)</option>
                 </select>
             </div>

             {/* Unit */}
             <div className="flex items-center gap-2">
                 <span className="text-xs text-slate-600 font-medium">Unité :</span>
                 <input 
                    type="text" 
                    className="text-xs border border-slate-200 rounded w-16 px-2 py-1 bg-white focus:ring-1 focus:ring-teal-500"
                    placeholder="Ex: €"
                    value={selectedConfig?.unit || ''}
                    onChange={(e) => handleFormatChange('unit', e.target.value)}
                 />
             </div>
             
             <div className="ml-auto text-[10px] text-teal-600 italic">
                S'applique partout (TCD, Graphiques...)
             </div>
         </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 flex flex-col min-h-0 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden relative">
         
         {/* Table Wrapper with Overflow */}
         <div className="flex-1 overflow-auto custom-scrollbar relative w-full">
            <table className="min-w-full divide-y divide-slate-200 border-collapse text-left">
               <thead className="bg-slate-50 sticky top-0 z-20 shadow-sm">
                  {/* Header Row */}
                  <tr>
                     {/* Colonne Date Import (Métadonnée) */}
                     <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-bold text-slate-500 tracking-wider whitespace-nowrap bg-slate-50 border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors select-none group"
                        onClick={() => handleSort('_importDate')}
                     >
                        <div className="flex items-center gap-2">
                           <span>Date d'import</span>
                           {sortConfig?.key === '_importDate' ? (
                              sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />
                           ) : (
                              <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                           )}
                        </div>
                     </th>

                     {/* Colonnes Standard */}
                     {currentDataset.fields.map(field => {
                        const isSelected = selectedCol === field;
                        const fieldConfig = currentDataset.fieldConfigs?.[field];
                        const isNumeric = fieldConfig?.type === 'number';

                        return (
                           <th 
                              key={field} 
                              scope="col" 
                              className={`px-6 py-3 text-left text-xs font-bold tracking-wider whitespace-nowrap border-b cursor-pointer transition-colors select-none group
                                 ${isSelected ? 'bg-teal-50 text-teal-900 border-teal-300' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}
                              `}
                              onClick={() => {
                                 setSelectedCol(isSelected ? null : field);
                                 handleSort(field);
                              }}
                           >
                              <div className="flex items-center gap-2">
                                 {isNumeric && <Hash className="w-3 h-3 text-slate-400" />}
                                 <span>{field}</span>
                                 {sortConfig?.key === field ? (
                                    sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />
                                 ) : (
                                    <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                 )}
                              </div>
                           </th>
                        );
                     })}

                     {/* Colonnes Calculées */}
                     {calculatedFields.map(cf => (
                        <th 
                           key={cf.id} 
                           scope="col" 
                           className="px-6 py-3 text-left text-xs font-bold text-indigo-600 tracking-wider whitespace-nowrap bg-indigo-50 border-b border-indigo-200 cursor-pointer hover:bg-indigo-100 transition-colors select-none group"
                           onClick={() => handleSort(cf.name)}
                        >
                           <div className="flex items-center gap-2">
                              <Calculator className="w-3 h-3" />
                              <span>{cf.name}</span>
                              {sortConfig?.key === cf.name ? (
                                 sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />
                              ) : (
                                 <ArrowUpDown className="w-3 h-3 text-indigo-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                              )}
                           </div>
                        </th>
                     ))}
                  </tr>

                  {/* Filter Row (Conditional) */}
                  {showFilters && (
                     <tr className="bg-slate-50">
                        <th className="px-2 py-2 border-b border-slate-200">
                           <input 
                              type="text" 
                              className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-normal"
                              placeholder="Filtre date (ex: 23/11)..."
                              value={columnFilters['_importDate'] || ''}
                              onChange={(e) => handleColumnFilterChange('_importDate', e.target.value)}
                           />
                        </th>
                        {currentDataset.fields.map(field => (
                           <th key={`filter-${field}`} className="px-2 py-2 border-b border-slate-200">
                              <input 
                                 type="text" 
                                 className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-normal"
                                 placeholder={columnFilters[field] === '__EMPTY__' ? "(Vide)" : `Filtre ${field}...`}
                                 value={columnFilters[field] === '__EMPTY__' ? '' : (columnFilters[field] || '')}
                                 onChange={(e) => handleColumnFilterChange(field, e.target.value)}
                              />
                           </th>
                        ))}
                        {/* Filtres pour colonnes calculées */}
                        {calculatedFields.map(cf => (
                           <th key={`filter-${cf.id}`} className="px-2 py-2 border-b border-indigo-200 bg-indigo-50">
                              <input 
                                 type="text" 
                                 className="w-full px-2 py-1 text-xs border border-indigo-200 rounded bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-normal"
                                 placeholder={`Filtre...`}
                                 value={columnFilters[cf.name] || ''}
                                 onChange={(e) => handleColumnFilterChange(cf.name, e.target.value)}
                              />
                           </th>
                        ))}
                     </tr>
                  )}
               </thead>
               
               <tbody className="bg-white divide-y divide-slate-200">
                  {paginatedRows.length > 0 ? (
                     paginatedRows.map((row, idx) => (
                        <tr 
                           key={`${row._batchId}-${row.id}-${idx}`} 
                           className="hover:bg-blue-50 transition-colors cursor-pointer group"
                           onClick={() => handleRowClick(row)}
                           title="Cliquez pour voir l'historique"
                        >
                           <td className="px-6 py-3 whitespace-nowrap text-xs text-slate-500 font-mono group-hover:text-blue-600">
                              {formatDateFr(row._importDate)}
                           </td>
                           
                           {/* Standard Fields */}
                           {currentDataset.fields.map(field => {
                              const val = row[field];
                              let displayVal: React.ReactNode = val;
                              const cellStyle = getCellStyle(field, val);
                              const config = currentDataset.fieldConfigs?.[field];

                              if (config?.type === 'number' && val !== undefined && val !== '') {
                                 // Utiliser le nouveau formateur
                                 displayVal = formatNumberValue(val, config);
                              } else if (typeof val === 'boolean') {
                                 displayVal = val ? (
                                   <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Oui</span>
                                 ) : (
                                   <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500">Non</span>
                                 );
                              } else if (!val && val !== 0) {
                                 displayVal = <span className="text-slate-300">-</span>;
                              }

                              return (
                                 <td key={field} className={`px-6 py-3 whitespace-nowrap text-sm text-slate-700 max-w-xs truncate ${cellStyle} ${config?.type === 'number' ? 'text-right font-mono' : ''}`} title={String(val)}>
                                    {displayVal}
                                 </td>
                              );
                           })}

                           {/* Calculated Fields */}
                           {calculatedFields.map(cf => {
                              const val = row[cf.name];
                              return (
                                 <td key={cf.id} className="px-6 py-3 whitespace-nowrap text-sm text-indigo-700 font-medium max-w-xs truncate bg-indigo-50/30 text-right font-mono">
                                    {val !== undefined && val !== null ? (
                                        <span>{formatNumberValue(val, { type: 'number', unit: cf.unit })}</span>
                                    ) : <span className="text-indigo-200">-</span>}
                                 </td>
                              );
                           })}
                        </tr>
                     ))
                  ) : (
                     <tr>
                        <td colSpan={currentDataset.fields.length + 1 + calculatedFields.length} className="px-6 py-16 text-center">
                           <div className="flex flex-col items-center justify-center text-slate-400">
                              {Object.keys(columnFilters).length > 0 || searchTerm ? (
                                 <>
                                    <XCircle className="w-10 h-10 mb-2 opacity-50" />
                                    <span className="text-sm font-medium">Aucun résultat pour ces filtres.</span>
                                    <Button variant="secondary" size="sm" className="mt-3" onClick={clearFilters}>
                                       Effacer les filtres
                                    </Button>
                                 </>
                              ) : (
                                 <span className="text-sm italic">Aucune donnée enregistrée.</span>
                              )}
                           </div>
                        </td>
                     </tr>
                  )}
               </tbody>
            </table>
         </div>

         {/* Footer / Pagination */}
         <div className="bg-white border-t border-slate-200 px-4 py-2 flex items-center justify-between flex-shrink-0 z-10 h-14">
            <div className="text-xs text-slate-500">
               {processedRows.length > 0 
                 ? `${(currentPage - 1) * rowsPerPage + 1} - ${Math.min(currentPage * rowsPerPage, processedRows.length)} sur ${processedRows.length}`
                 : '0 résultat'
               }
            </div>
            
            <div className="flex items-center gap-4">
               <select 
                  className="text-xs border-slate-300 rounded bg-white text-slate-600 focus:ring-blue-500 focus:border-blue-500"
                  value={rowsPerPage}
                  onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
               >
                  <option value={25}>25 lignes</option>
                  <option value={50}>50 lignes</option>
                  <option value={100}>100 lignes</option>
                  <option value={500}>500 lignes</option>
               </select>

               <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                     onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                     disabled={currentPage === 1}
                     className="relative inline-flex items-center px-2 py-1.5 rounded-l-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                     <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="relative inline-flex items-center px-4 py-1.5 border border-slate-300 bg-white text-xs font-medium text-slate-700">
                     Page {currentPage} / {Math.max(1, totalPages)}
                  </span>
                  <button
                     onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                     disabled={currentPage === totalPages || totalPages === 0}
                     className="relative inline-flex items-center px-2 py-1.5 rounded-r-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                     <ChevronRight className="h-4 w-4" />
                  </button>
               </nav>
            </div>
         </div>
      </div>

      {/* HISTORY SIDE PANEL (DRAWER) */}
      {isDrawerOpen && selectedRow && (
         <div className="absolute inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <div 
               className="absolute inset-0 bg-slate-900/20 backdrop-blur-[1px]"
               onClick={() => setIsDrawerOpen(false)}
            />
            
            {/* Drawer */}
            <div className="relative w-full max-w-xl bg-white shadow-2xl h-full flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300">
               
               {/* Drawer Header */}
               <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-start justify-between">
                  <div>
                     <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <History className="w-5 h-5 text-blue-600" />
                        Historique d'évolution
                     </h3>
                     <p className="text-xs text-slate-500 mt-1">
                        Suivi des modifications de l'entité à travers les imports.
                     </p>
                  </div>
                  <button 
                     onClick={() => setIsDrawerOpen(false)}
                     className="p-1.5 hover:bg-white rounded-full text-slate-400 hover:text-slate-700 transition-colors"
                  >
                     <X className="w-5 h-5" />
                  </button>
               </div>

               {/* Configuration Key Selector */}
               <div className="p-3 bg-blue-50 border-b border-blue-100">
                  <label className="block text-xs font-bold text-blue-800 mb-1">
                     Clé d'identification (liaison)
                  </label>
                  <select 
                     className="block w-full text-sm border-blue-200 rounded p-1.5 bg-white text-slate-700 focus:ring-blue-500 focus:border-blue-500"
                     value={trackingKey}
                     onChange={(e) => setTrackingKey(e.target.value)}
                  >
                     {currentDataset.fields.map(f => (
                        <option key={f} value={f}>{f}</option>
                     ))}
                  </select>
                  <div className="mt-2 text-xs text-blue-600 flex items-center">
                     <span className="font-bold mr-1">Valeur actuelle :</span> 
                     <span className="truncate max-w-[200px] inline-block align-bottom bg-white px-1 rounded border border-blue-100">
                        {selectedRow[trackingKey]}
                     </span>
                  </div>
               </div>

               {/* Timeline Content */}
               <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
                  {historyData.length === 0 ? (
                     <div className="text-center py-10 text-slate-400">
                        <GitCommit className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p>Aucun historique trouvé pour cette clé.</p>
                     </div>
                  ) : (
                     historyData.map((version, index) => {
                        const previousVersion = historyData[index + 1];
                        const isLatest = index === 0;

                        return (
                           <div key={version._batchId} className="relative pl-6 border-l-2 border-slate-200 last:border-0">
                              {/* Dot */}
                              <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 bg-white ${isLatest ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-300'}`} />
                              
                              {/* Date Badge */}
                              <div className="mb-2 flex items-center gap-2">
                                 <span className="text-sm font-bold text-slate-700">
                                    {formatDateFr(version._importDate)}
                                 </span>
                                 {isLatest && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 rounded font-bold">ACTUEL</span>}
                              </div>

                              {/* Content Card */}
                              <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-3 text-sm space-y-2">
                                 {currentDataset.fields.map(field => {
                                    // Si ce n'est pas la clé de tracking (qui par définition ne change pas ici)
                                    if (field === trackingKey) return null;

                                    const val = version[field];
                                    const prevVal = previousVersion ? previousVersion[field] : undefined;
                                    
                                    // Détection changement
                                    const hasChanged = previousVersion && String(val) !== String(prevVal);

                                    // Valeur display
                                    let displayVal = val;
                                    const config = currentDataset.fieldConfigs?.[field];

                                    if (config?.type === 'number' && val !== undefined && val !== '') {
                                        displayVal = formatNumberValue(val, config);
                                    } else if (typeof val === 'boolean') {
                                        displayVal = val ? 'Oui' : 'Non';
                                    } else if (val === undefined || val === '') {
                                        displayVal = '-';
                                    }

                                    // Prev Display Val
                                    let prevDisplayVal = prevVal;
                                    if (config?.type === 'number' && prevVal !== undefined && prevVal !== '') {
                                        prevDisplayVal = formatNumberValue(prevVal, config);
                                    }

                                    return (
                                       <div key={field} className={`flex flex-col pb-2 border-b border-dashed border-slate-100 last:border-0 last:pb-0 ${hasChanged ? 'bg-amber-50 -mx-3 px-3 py-2 rounded border-transparent' : ''}`}>
                                          <div className="flex justify-between items-start">
                                             <span className="text-xs font-bold text-slate-500 w-1/3 truncate" title={field}>
                                                {field}
                                             </span>
                                             <span className={`w-2/3 text-right font-medium ${hasChanged ? 'text-amber-900' : 'text-slate-700'}`}>
                                                {displayVal}
                                             </span>
                                          </div>
                                          
                                          {hasChanged && (
                                             <div className="mt-1 text-xs flex justify-end items-center gap-1 text-amber-600/80">
                                                <span className="line-through decoration-amber-400 decoration-2 opacity-70">{prevDisplayVal}</span>
                                                <ArrowRight className="w-3 h-3" />
                                                <span>{displayVal}</span>
                                             </div>
                                          )}
                                       </div>
                                    );
                                 })}
                              </div>
                           </div>
                        );
                     })
                  )}
               </div>

            </div>
         </div>
      )}

      {/* CALCULATED FIELDS MODAL */}
      {isCalcModalOpen && (
         <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg flex flex-col max-h-[90%]">
               <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-lg">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                     <FunctionSquare className="w-5 h-5 text-indigo-600" />
                     Champs calculés
                  </h3>
                  <button onClick={() => setIsCalcModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                     <X className="w-5 h-5" />
                  </button>
               </div>

               <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-6">
                  
                  {/* List existing */}
                  {calculatedFields.length > 0 ? (
                     <div className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-500 uppercase">Champs actifs</h4>
                        {calculatedFields.map(field => (
                           <div key={field.id} className="flex justify-between items-center bg-indigo-50 border border-indigo-100 rounded p-3">
                              <div>
                                 <div className="font-bold text-indigo-900 text-sm">{field.name}</div>
                                 <div className="text-xs text-indigo-700 font-mono mt-1">{field.formula}</div>
                              </div>
                              <button 
                                 onClick={() => removeCalculatedField(currentDataset.id, field.id)} 
                                 className="text-slate-400 hover:text-red-500 p-1"
                              >
                                 <Trash2 className="w-4 h-4" />
                              </button>
                           </div>
                        ))}
                     </div>
                  ) : (
                     <div className="text-center py-6 text-slate-400 italic border-2 border-dashed border-slate-100 rounded">
                        Aucun champ calculé défini.
                     </div>
                  )}

                  {/* Create new */}
                  <div className="border-t border-slate-100 pt-6 space-y-4">
                     <h4 className="text-sm font-bold text-slate-800">Nouveau champ</h4>
                     
                     <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Nom de la colonne</label>
                        <input 
                           type="text" 
                           className="block w-full rounded-md border-slate-300 text-sm p-2 bg-white focus:ring-indigo-500 focus:border-indigo-500"
                           placeholder="Ex: Marge Nette"
                           value={newField.name}
                           onChange={e => setNewField({...newField, name: e.target.value})}
                        />
                     </div>

                     <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Formule</label>
                        <div className="relative">
                           <input 
                              type="text" 
                              className="block w-full rounded-md border-slate-300 text-sm p-2 bg-white focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                              placeholder="Ex: [Prix] * [Quantité] * 1.2"
                              value={newField.formula}
                              onChange={e => setNewField({...newField, formula: e.target.value})}
                           />
                           <div className="mt-1 text-[10px] text-slate-400">
                              Utilisez les noms de colonnes entre crochets : <code>[Colonne]</code>
                           </div>
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="block text-xs font-medium text-slate-600 mb-1">Type de sortie</label>
                           <select 
                              className="block w-full rounded-md border-slate-300 text-sm p-2 bg-white"
                              value={newField.outputType}
                              onChange={e => setNewField({...newField, outputType: e.target.value as any})}
                           >
                              <option value="number">Nombre</option>
                              <option value="text">Texte</option>
                              <option value="boolean">Oui/Non</option>
                           </select>
                        </div>
                        <div>
                           <label className="block text-xs font-medium text-slate-600 mb-1">Unité (optionnel)</label>
                           <input 
                              type="text" 
                              className="block w-full rounded-md border-slate-300 text-sm p-2 bg-white"
                              placeholder="Ex: €"
                              value={newField.unit}
                              onChange={e => setNewField({...newField, unit: e.target.value})}
                           />
                        </div>
                     </div>

                     <div className="pt-2">
                        <Button onClick={handleAddCalculatedField} disabled={!newField.name || !newField.formula} className="w-full bg-indigo-600 hover:bg-indigo-700">
                           <Plus className="w-4 h-4 mr-2" /> Ajouter le champ
                        </Button>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      )}

      {/* CONDITIONAL FORMATTING MODAL */}
      {isFormatModalOpen && (
         <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg flex flex-col max-h-[90%]">
               <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-lg">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                     <Palette className="w-5 h-5 text-pink-600" />
                     Formatage Conditionnel
                  </h3>
                  <button onClick={() => setIsFormatModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                     <X className="w-5 h-5" />
                  </button>
               </div>

               <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-6">
                  
                  {/* 1. Select Column */}
                  <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Colonne à formater</label>
                      <select 
                         className="block w-full rounded-md border-slate-300 text-sm p-2 bg-white focus:ring-pink-500 focus:border-pink-500"
                         value={selectedFormatCol}
                         onChange={e => setSelectedFormatCol(e.target.value)}
                      >
                         {currentDataset.fields.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                  </div>

                  {/* 2. Existing Rules for Selected Column */}
                  <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-500 uppercase">Règles actives</h4>
                      {(() => {
                          const rules = currentDataset.fieldConfigs?.[selectedFormatCol]?.conditionalFormatting || [];
                          if (rules.length === 0) return <div className="text-xs text-slate-400 italic">Aucune règle.</div>;
                          return rules.map(rule => (
                              <div key={rule.id} className="flex justify-between items-center bg-pink-50 border border-pink-100 rounded p-2 text-sm">
                                 <div className="flex items-center gap-2">
                                    <span className="font-bold text-pink-800">
                                       {rule.operator === 'gt' ? '>' : rule.operator === 'lt' ? '<' : rule.operator === 'eq' ? '=' : 'contient'} 
                                       &nbsp;{rule.value}
                                    </span>
                                    <span className="text-slate-400">→</span>
                                    <div className={`px-2 rounded text-xs ${rule.style.backgroundColor || ''} ${rule.style.color || ''} ${rule.style.fontWeight || ''}`}>
                                       Aperçu
                                    </div>
                                 </div>
                                 <button onClick={() => handleRemoveConditionalRule(selectedFormatCol, rule.id)} className="text-slate-400 hover:text-red-500">
                                    <Trash2 className="w-4 h-4" />
                                 </button>
                              </div>
                          ));
                      })()}
                  </div>

                  {/* 3. Add New Rule */}
                  <div className="border-t border-slate-100 pt-4 space-y-4 bg-slate-50 p-4 rounded-lg">
                     <h4 className="text-sm font-bold text-slate-800">Nouvelle règle</h4>
                     
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="block text-xs font-medium text-slate-600 mb-1">Opérateur</label>
                           <select 
                              className="block w-full rounded-md border-slate-300 text-sm p-2 bg-white"
                              value={newRule.operator}
                              onChange={e => setNewRule({...newRule, operator: e.target.value as any})}
                           >
                              <option value="gt">Supérieur à (&gt;)</option>
                              <option value="lt">Inférieur à (&lt;)</option>
                              <option value="eq">Égal à (=)</option>
                              <option value="contains">Contient</option>
                              <option value="empty">Est vide</option>
                           </select>
                        </div>
                        <div>
                           <label className="block text-xs font-medium text-slate-600 mb-1">Valeur cible</label>
                           <input 
                              type="text" 
                              className="block w-full rounded-md border-slate-300 text-sm p-2 bg-white"
                              value={newRule.value}
                              onChange={e => setNewRule({...newRule, value: e.target.value})}
                              disabled={newRule.operator === 'empty'}
                           />
                        </div>
                     </div>

                     <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Style appliqué</label>
                        <div className="flex flex-wrap gap-2">
                           {[
                              { label: 'Rouge', bg: 'bg-red-100', text: 'text-red-700' },
                              { label: 'Vert', bg: 'bg-green-100', text: 'text-green-700' },
                              { label: 'Bleu', bg: 'bg-blue-100', text: 'text-blue-700' },
                              { label: 'Jaune', bg: 'bg-yellow-100', text: 'text-yellow-800' },
                              { label: 'Gras', bg: '', text: '', weight: 'font-bold' },
                           ].map((style, i) => (
                              <button
                                 key={i}
                                 onClick={() => setNewRule({
                                    ...newRule, 
                                    style: { 
                                       backgroundColor: style.bg || newRule.style?.backgroundColor, 
                                       color: style.text || newRule.style?.color,
                                       fontWeight: style.weight || newRule.style?.fontWeight 
                                    }
                                 })}
                                 className={`px-3 py-1.5 rounded text-xs border ${style.bg} ${style.text} border-slate-200 hover:opacity-80`}
                              >
                                 {style.label}
                              </button>
                           ))}
                           <button 
                              onClick={() => setNewRule({...newRule, style: {}})}
                              className="px-3 py-1.5 rounded text-xs border border-slate-200 bg-white text-slate-500"
                           >
                              Reset
                           </button>
                        </div>
                        
                        {/* Preview */}
                        <div className={`mt-2 p-2 text-center border border-dashed border-slate-300 rounded text-sm transition-all ${newRule.style?.backgroundColor} ${newRule.style?.color} ${newRule.style?.fontWeight}`}>
                           Aperçu du style
                        </div>
                     </div>

                     <Button onClick={handleAddConditionalRule} className="w-full bg-pink-600 hover:bg-pink-700">
                        <Plus className="w-4 h-4 mr-2" /> Ajouter la règle
                     </Button>
                  </div>
               </div>
            </div>
         </div>
      )}

    </div>
  );
};
