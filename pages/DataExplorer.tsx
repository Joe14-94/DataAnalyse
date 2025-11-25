

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import { formatDateFr, evaluateFormula, generateId, parseSmartNumber, formatNumberValue } from '../utils';
import { Button } from '../components/ui/Button';
import { CalculatedField, ConditionalRule, FieldConfig } from '../types';
import { 
  Search, Download, Database, ChevronLeft, ChevronRight, Table2, 
  Filter, ArrowUpDown, ArrowUp, ArrowDown, XCircle, X, 
  History, GitCommit, ArrowRight, Calculator, Plus, Trash2, FunctionSquare, Palette,
  FilterX, Hash, Percent, MousePointerClick, Variable, Sigma, Play, AlertCircle, CheckCircle2, Columns
} from 'lucide-react';
import { useLocation } from 'react-router-dom';

export const DataExplorer: React.FC = () => {
  const { currentDataset, batches, addCalculatedField, removeCalculatedField, updateDatasetConfigs, deleteBatch, deleteDatasetField, deleteBatchRow, renameDatasetField } = useData();
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
  const [renamingValue, setRenamingValue] = useState<string>('');

  // HISTORY & RECONCILIATION STATE
  const [selectedRow, setSelectedRow] = useState<any | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [trackingKey, setTrackingKey] = useState<string>('');

  // CALCULATED FIELDS UI STATE (DRAWER)
  const [isCalcDrawerOpen, setIsCalcDrawerOpen] = useState(false);
  const [calcTab, setCalcTab] = useState<'fields' | 'functions'>('fields');
  const [previewResult, setPreviewResult] = useState<{ value: any, error?: string } | null>(null);
  const [newField, setNewField] = useState<Partial<CalculatedField>>({
     name: '',
     formula: '',
     outputType: 'number',
     unit: ''
  });
  const formulaInputRef = useRef<HTMLTextAreaElement>(null);

  // CONDITIONAL FORMATTING MODAL
  const [isFormatModalOpen, setIsFormatModalOpen] = useState(false);
  const [selectedFormatCol, setSelectedFormatCol] = useState<string>('');
  const [newRule, setNewRule] = useState<Partial<ConditionalRule>>({ operator: 'lt', value: 0, style: { color: 'text-red-600', fontWeight: 'font-bold' } });

  // DELETE CONFIRMATION STATE
  const [deleteConfirmRow, setDeleteConfirmRow] = useState<any | null>(null);

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

  useEffect(() => {
     if (selectedCol) {
        setRenamingValue(selectedCol);
     }
  }, [selectedCol]);

  // --- Handlers ---
  
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleHeaderClick = (field: string) => {
     // Si le mode édition de formule est actif, on insère la colonne
     if (isCalcDrawerOpen) {
        insertIntoFormula(`[${field}]`);
        return;
     }
     
     // Sinon comportement normal (Sélection + Tri)
     setSelectedCol(selectedCol === field ? null : field);
     handleSort(field);
  };

  const insertIntoFormula = (textToInsert: string) => {
      if (!formulaInputRef.current) return;
      
      const input = formulaInputRef.current;
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const text = input.value;
      
      const newText = text.substring(0, start) + textToInsert + text.substring(end);
      setNewField({ ...newField, formula: newText });
      
      // Restore focus and cursor
      setTimeout(() => {
         input.focus();
         input.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
      }, 0);
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
    setPreviewResult(null);
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

  // --- COLUMN & ROW ACTIONS ---

  const handleRenameColumn = () => {
     if (!currentDataset || !selectedCol || !renamingValue.trim() || selectedCol === renamingValue) return;
     renameDatasetField(currentDataset.id, selectedCol, renamingValue);
     setSelectedCol(renamingValue); // Update selection to new name
  };

  const handleDeleteColumn = () => {
     if (!currentDataset || !selectedCol) return;
     
     // Check if it's a calculated field
     const isCalculated = currentDataset.calculatedFields?.find(f => f.name === selectedCol);
     
     if (isCalculated) {
        if (window.confirm(`Supprimer le champ calculé "${selectedCol}" ?`)) {
           removeCalculatedField(currentDataset.id, isCalculated.id);
           setSelectedCol(null);
        }
     } else {
        if (window.confirm(`ATTENTION : Supprimer la colonne "${selectedCol}" effacera définitivement cette donnée de tous les imports liés à cette typologie. Continuer ?`)) {
           deleteDatasetField(currentDataset.id, selectedCol);
           setSelectedCol(null);
        }
     }
  };

  const handleDeleteRow = (row: any, e: React.MouseEvent) => {
     e.preventDefault();
     e.stopPropagation();
     setDeleteConfirmRow(row);
  };

  const confirmDeleteRow = () => {
      if (deleteConfirmRow && deleteConfirmRow._batchId && deleteConfirmRow.id) {
          deleteBatchRow(deleteConfirmRow._batchId, deleteConfirmRow.id);
          setDeleteConfirmRow(null);
      }
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
            let targetVal = filterValue as string;
            let isExact = false;

            // Support Exact Match Syntax (starts with =)
            if (targetVal.startsWith('=')) {
               isExact = true;
               targetVal = targetVal.substring(1);
            }

            const lowerFilter = targetVal.toLowerCase();
            
            data = data.filter(row => {
               const val = row[key];
               
               // Special handling for BatchId (Exact match required for drilldown reliability)
               if (key === '_batchId') {
                  // Clean potentially passed '=' from batch id filter if manually entered, though unlikely
                  return String(val) === String(targetVal);
               }

               // Gestion spéciale pour la date d'import (Support formats multiples)
               if (key === '_importDate') {
                  const dateStr = val as string; // ISO YYYY-MM-DD "2025-11-23"
                  
                  // Si le mode exact est demandé, on compare strictement
                  if (isExact) {
                     return dateStr === targetVal || formatDateFr(dateStr) === targetVal;
                  }

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

               const valStr = String(val ?? '').toLowerCase();
               return isExact ? valStr === lowerFilter : valStr.includes(lowerFilter);
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

  // LIVE PREVIEW EFFECT
  useEffect(() => {
     if (!isCalcDrawerOpen || !newField.formula) {
        setPreviewResult(null);
        return;
     }

     const timer = setTimeout(() => {
         // Prendre la première ligne visible ou la première ligne brute
         const sampleRow = processedRows.length > 0 ? processedRows[0] : (allRows.length > 0 ? allRows[0] : null);
         
         if (sampleRow) {
             const res = evaluateFormula(sampleRow, newField.formula!);
             if (res === null && newField.formula!.trim() !== '') {
                 setPreviewResult({ value: null, error: "Erreur de syntaxe ou champ introuvable" });
             } else {
                 setPreviewResult({ value: res });
             }
         } else {
             setPreviewResult({ value: null, error: "Aucune donnée pour tester" });
         }
     }, 500); // Debounce

     return () => clearTimeout(timer);
  }, [newField.formula, processedRows, allRows, isCalcDrawerOpen]);


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
        <p className="text-slate-600 font-medium">Aucun tableau sélectionné</p>
        <p className="text-slate-500 text-sm max-w-md mt-2">
          Veuillez sélectionner une typologie de tableau dans le menu latéral pour visualiser les données.
        </p>
      </div>
    );
  }

  const calculatedFields = currentDataset.calculatedFields || [];

  // Determine if there is a hidden batch filter active (Drill down context)
  // We remove the potential '=' prefix for the logic, but keep it in UI
  const activeBatchFilter = columnFilters['_batchId'] ? columnFilters['_batchId'].replace(/^=/, '') : null;
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

           <Button 
              variant={isCalcDrawerOpen ? "primary" : "secondary"} 
              onClick={() => setIsCalcDrawerOpen(!isCalcDrawerOpen)} 
              className="whitespace-nowrap"
           >
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

      {/* Formatting & Actions Toolbar (Appears when any column is selected) */}
      <div className={`transition-all duration-300 overflow-hidden ${selectedCol ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0'}`}>
         <div className="bg-white border border-teal-200 rounded-lg p-3 shadow-sm bg-gradient-to-r from-white to-teal-50 flex flex-wrap items-center gap-4">
             
             {/* RENOMMAGE */}
             <div className="flex items-center gap-2 border-r border-teal-200 pr-4 mr-2">
                <Columns className="w-4 h-4 text-teal-700" /> 
                <div className="relative group">
                   <input 
                      type="text" 
                      className="text-xs font-bold text-teal-800 bg-transparent border-b border-teal-300 focus:outline-none focus:border-teal-600 w-32"
                      value={renamingValue}
                      onChange={e => setRenamingValue(e.target.value)}
                      placeholder={selectedCol || ''}
                   />
                   {renamingValue !== selectedCol && (
                      <button 
                         onClick={handleRenameColumn}
                         className="absolute -right-16 top-0 text-[10px] bg-teal-600 text-white px-2 py-0.5 rounded hover:bg-teal-700 shadow-sm"
                      >
                         Renommer
                      </button>
                   )}
                </div>
             </div>
             
             {isSelectedNumeric ? (
               <>
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
               </>
             ) : (
                <span className="text-xs text-slate-400 italic">Options de formatage non disponibles pour ce type.</span>
             )}
             
             <div className="ml-auto flex items-center gap-2 border-l border-slate-200 pl-3">
                <Button 
                   onClick={handleDeleteColumn} 
                   size="sm" 
                   className="bg-white hover:bg-red-50 text-red-600 border border-red-200 shadow-none text-xs"
                >
                   <Trash2 className="w-3 h-3 mr-1" />
                   Supprimer
                </Button>
                <Button 
                   onClick={() => setSelectedCol(null)} 
                   size="sm" 
                   className="bg-teal-600 text-white hover:bg-teal-700 shadow-sm text-xs"
                >
                   Terminer
                </Button>
             </div>
         </div>
      </div>

      {/* Table Container - Relative pour permettre le positionnement du Drawer */}
      <div className="flex-1 flex min-h-0 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden relative">
         
         {/* Table Wrapper with Overflow */}
         <div className="flex-1 overflow-auto custom-scrollbar relative w-full flex flex-col">
            <table className="min-w-full divide-y divide-slate-200 border-collapse text-left">
               <thead className="bg-slate-50 sticky top-0 z-20 shadow-sm">
                  {/* Header Row */}
                  <tr>
                     {/* Colonne Date Import (Métadonnée) */}
                     <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-bold text-slate-500 tracking-wider whitespace-nowrap bg-slate-50 border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors select-none group"
                        onClick={() => handleHeaderClick('_importDate')}
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
                                 ${isCalcDrawerOpen ? 'hover:bg-indigo-100 hover:text-indigo-800' : (isSelected ? 'bg-teal-50 text-teal-900 border-teal-300' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100')}
                              `}
                              onClick={() => handleHeaderClick(field)}
                           >
                              <div className="flex items-center gap-2">
                                 {isCalcDrawerOpen && <MousePointerClick className="w-3 h-3 text-indigo-500" />}
                                 {isNumeric && <Hash className="w-3 h-3 text-slate-400" />}
                                 <span>{field}</span>
                                 {!isCalcDrawerOpen && (sortConfig?.key === field ? (
                                    sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />
                                 ) : (
                                    <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                 ))}
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
                           onClick={() => handleHeaderClick(cf.name)}
                        >
                           <div className="flex items-center gap-2">
                              <Calculator className="w-3 h-3" />
                              <span>{cf.name}</span>
                              {!isCalcDrawerOpen && (sortConfig?.key === cf.name ? (
                                 sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />
                              ) : (
                                 <ArrowUpDown className="w-3 h-3 text-indigo-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                              ))}
                           </div>
                        </th>
                     ))}
                     
                     {/* Colonne Actions */}
                     <th scope="col" className="px-3 py-3 w-10 border-b border-slate-200 bg-slate-50"></th>
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
                        <th className="border-b border-slate-200 bg-slate-50"></th>
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

                           {/* Actions Column */}
                           <td className="px-3 py-3 text-right">
                              <button 
                                 type="button"
                                 onClick={(e) => handleDeleteRow(row, e)}
                                 className="text-slate-300 hover:text-red-600 p-1 hover:bg-red-50 rounded transition-colors"
                                 title="Supprimer cette ligne"
                              >
                                 <Trash2 className="w-4 h-4" />
                              </button>
                           </td>
                        </tr>
                     ))
                  ) : (
                     <tr>
                        <td colSpan={currentDataset.fields.length + 2 + calculatedFields.length} className="px-6 py-16 text-center">
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

            {/* Footer / Pagination */}
            <div className="bg-white border-t border-slate-200 px-4 py-2 flex items-center justify-between flex-shrink-0 z-10 h-14 mt-auto">
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
         
         {/* CALCULATED FIELDS DRAWER (REDESIGNED) */}
         {isCalcDrawerOpen && (
             <div className="w-[500px] bg-white border-l border-slate-200 shadow-xl flex flex-col z-30 animate-in slide-in-from-right duration-300">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                       <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                           <FunctionSquare className="w-4 h-4 text-indigo-600" />
                           Éditeur de Formule
                       </h3>
                       <p className="text-[10px] text-slate-500 mt-1">Créez une nouvelle colonne calculée</p>
                    </div>
                    <button onClick={() => setIsCalcDrawerOpen(false)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4">
                    
                    {/* 1. Name Input */}
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Nom de la colonne</label>
                        <input 
                            type="text" 
                            className="block w-full rounded-md border-slate-300 text-sm p-2 bg-white focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Ex: Total TTC"
                            value={newField.name}
                            onChange={e => setNewField({...newField, name: e.target.value})}
                        />
                    </div>

                    {/* 2. Formula Editor */}
                    <div className="flex-1 flex flex-col min-h-[300px]">
                        <label className="block text-xs font-bold text-slate-600 mb-1 flex justify-between">
                           <span>Formule</span>
                           <span className="text-[10px] text-slate-400">Syntaxe Excel simplifiée</span>
                        </label>
                        <textarea 
                           ref={formulaInputRef}
                           className="block w-full h-32 rounded-t-md border-slate-300 text-sm