
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import { formatDateFr, evaluateFormula, generateId, parseSmartNumber, formatNumberValue, getGroupedLabel } from '../utils';
import { Button } from '../components/ui/Button';
import { CalculatedField, ConditionalRule, FieldConfig } from '../types';
import {
   Search, Download, Database, Table2,
   Filter, ArrowUpDown, ArrowUp, ArrowDown, XCircle, X,
   History, GitCommit, ArrowRight, Calculator, Plus, Trash2, FunctionSquare, Palette,
   FilterX, Hash, MousePointerClick, Columns, AlertTriangle, Link as LinkIcon, BarChart2, Info
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export const DataExplorer: React.FC = () => {
   const { currentDataset, batches, datasets, currentDatasetId, switchDataset, addCalculatedField, removeCalculatedField, updateCalculatedField, updateDatasetConfigs, deleteBatch, deleteDatasetField, deleteBatchRow, updateRows, renameDatasetField, addFieldToDataset, enrichBatchesWithLookup, reorderDatasetFields, lastDataExplorerState, saveDataExplorerState } = useData();
   const location = useLocation();
   const navigate = useNavigate();

   // --- State ---
   const [searchTerm, setSearchTerm] = useState('');

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
   const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
   const [previewResult, setPreviewResult] = useState<{ value: any, error?: string } | null>(null);
   const [newField, setNewField] = useState<Partial<CalculatedField>>({
      name: '',
      formula: '',
      outputType: 'number',
      unit: ''
   });
   const formulaInputRef = useRef<HTMLTextAreaElement>(null);

   // CONDITIONAL FORMATTING DRAWER
   const [isFormatDrawerOpen, setIsFormatDrawerOpen] = useState(false);
   const [selectedFormatCol, setSelectedFormatCol] = useState<string>('');
   const [newRule, setNewRule] = useState<Partial<ConditionalRule>>({ operator: 'lt', value: 0, style: { color: 'text-red-600', fontWeight: 'font-bold' } });

   // DELETE CONFIRMATION STATE
   const [deleteConfirmRow, setDeleteConfirmRow] = useState<any | null>(null);

   // DATA BLENDING STATE
   const [blendingConfig, setBlendingConfig] = useState<any>(null);

   // COLUMN REORDERING STATE
   const [isColumnDrawerOpen, setIsColumnDrawerOpen] = useState(false);

   // VIRTUALIZATION REFS
   const tableContainerRef = useRef<HTMLDivElement>(null);

   // COLUMN RESIZING STATE
   const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
   const [resizingColumn, setResizingColumn] = useState<string | null>(null);
   const [resizeStartX, setResizeStartX] = useState<number>(0);
   const [resizeStartWidth, setResizeStartWidth] = useState<number>(0);

   // COLUMN BORDERS STATE
   const [showColumnBorders, setShowColumnBorders] = useState<boolean>(true);

   // EDIT MODE STATE
   const [isEditMode, setIsEditMode] = useState(false);
   const [pendingChanges, setPendingChanges] = useState<Record<string, Record<string, any>>>({});

   // VLOOKUP / ENRICHMENT STATE
   const [isVlookupDrawerOpen, setIsVlookupDrawerOpen] = useState(false);
   const [vlookupConfig, setVlookupConfig] = useState<{
      targetDatasetId: string;
      primaryKey: string;
      secondaryKey: string;
      columnsToAdd: string[];
      newColumnName: string;
   }>({
      targetDatasetId: '',
      primaryKey: '',
      secondaryKey: '',
      columnsToAdd: [],
      newColumnName: ''
   });

   // --- EFFECT: Handle Drilldown from Navigation ---
   useEffect(() => {
      if (location.state) {
         if (location.state.prefilledFilters) {
            setColumnFilters(location.state.prefilledFilters);
            setSearchTerm('');
            setSortConfig(null);
            setShowFilters(true);
         }
         if (location.state.blendingConfig) {
            setBlendingConfig(location.state.blendingConfig);
         } else {
            setBlendingConfig(null);
         }
      }
   }, [location.state]);

   // Initialize tracking key
   useEffect(() => {
      if (currentDataset && currentDataset.fields.length > 0 && !trackingKey) {
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

   // --- Initialization (Restore State) ---
   useEffect(() => {
      if (lastDataExplorerState && currentDataset && lastDataExplorerState.datasetId === currentDataset.id) {
         setSearchTerm(lastDataExplorerState.searchTerm || '');
         setSortConfig(lastDataExplorerState.sortConfig || null);
         setShowFilters(lastDataExplorerState.showFilters || false);
         setColumnFilters(lastDataExplorerState.columnFilters || {});
         setColumnWidths(lastDataExplorerState.columnWidths || {});
         setShowColumnBorders(lastDataExplorerState.showColumnBorders !== undefined ? lastDataExplorerState.showColumnBorders : true);
         if (lastDataExplorerState.trackingKey) setTrackingKey(lastDataExplorerState.trackingKey);
         if (lastDataExplorerState.blendingConfig) setBlendingConfig(lastDataExplorerState.blendingConfig);
      }
   }, [currentDataset]);

   // --- Save State ---
   useEffect(() => {
      if (!currentDataset) return;
      saveDataExplorerState({
         datasetId: currentDataset.id,
         searchTerm,
         sortConfig,
         columnFilters,
         showFilters,
         columnWidths,
         showColumnBorders,
         trackingKey,
         blendingConfig
      });
   }, [currentDataset, searchTerm, sortConfig, columnFilters, showFilters, columnWidths, showColumnBorders, trackingKey, blendingConfig]);

   // --- Handlers ---

   const handleSort = (key: string) => {
      let direction: 'asc' | 'desc' = 'asc';
      if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
         direction = 'desc';
      }
      setSortConfig({ key, direction });
   };

   const handleHeaderClick = (field: string) => {
      if (isCalcDrawerOpen) {
         insertIntoFormula(`[${field}]`);
         return;
      }
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
      setTimeout(() => {
         input.focus();
         input.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
      }, 0);
   };

   const handleColumnFilterChange = (key: string, value: string) => {
      setColumnFilters(prev => ({ ...prev, [key]: value }));
   };

   const clearFilters = () => {
      setColumnFilters({});
      setSearchTerm('');
      setSortConfig(null);
   };

   // COLUMN RESIZING HANDLERS
   const handleResizeStart = (e: React.MouseEvent, columnKey: string, currentWidth: number) => {
      e.preventDefault();
      e.stopPropagation();
      setResizingColumn(columnKey);
      setResizeStartX(e.clientX);
      setResizeStartWidth(currentWidth);
   };

   useEffect(() => {
      if (!resizingColumn) return;

      const handleMouseMove = (e: MouseEvent) => {
         const diff = e.clientX - resizeStartX;
         const newWidth = Math.max(80, resizeStartWidth + diff);
         setColumnWidths(prev => ({ ...prev, [resizingColumn]: newWidth }));
      };

      const handleMouseUp = () => {
         setResizingColumn(null);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
         document.removeEventListener('mousemove', handleMouseMove);
         document.removeEventListener('mouseup', handleMouseUp);
      };
   }, [resizingColumn, resizeStartX, resizeStartWidth]);

   const handleRowClick = (row: any) => {
      if (isEditMode) return;
      setSelectedRow(row);
      setIsDrawerOpen(true);
   };

   const handleCellEdit = (batchId: string, rowId: string, field: string, value: any) => {
      setPendingChanges(prev => {
         const batchChanges = prev[batchId] || {};
         const rowChanges = batchChanges[rowId] || {};
         return {
            ...prev,
            [batchId]: {
               ...batchChanges,
               [rowId]: {
                  ...rowChanges,
                  [field]: value
               }
            }
         };
      });
   };

   const handleSaveEdits = () => {
      if (Object.keys(pendingChanges).length === 0) {
         setIsEditMode(false);
         return;
      }
      updateRows(pendingChanges);
      setIsEditMode(false);
      setPendingChanges({});
   };

   const handleCancelEdits = () => {
      setIsEditMode(false);
      setPendingChanges({});
   };

   const handleAddCalculatedField = () => {
      if (!currentDataset || !newField.name || !newField.formula) return;

      if (editingFieldId) {
         const oldField = currentDataset.calculatedFields?.find(f => f.id === editingFieldId);
         const oldName = oldField?.name;
         const newName = newField.name;

         updateCalculatedField(currentDataset.id, editingFieldId, {
            name: newField.name,
            formula: newField.formula,
            outputType: newField.outputType as any,
            unit: newField.unit
         });

         // Update local state references if name changed
         if (oldName && newName && oldName !== newName) {
            if (sortConfig?.key === oldName) setSortConfig({ ...sortConfig, key: newName });
            if (columnFilters[oldName]) {
               const newFilters = { ...columnFilters };
               newFilters[newName] = newFilters[oldName];
               delete newFilters[oldName];
               setColumnFilters(newFilters);
            }
            if (selectedCol === oldName) setSelectedCol(newName);
         }
      } else {
         const field: CalculatedField = {
            id: generateId(),
            name: newField.name,
            formula: newField.formula,
            outputType: newField.outputType as any,
            unit: newField.unit
         };
         addCalculatedField(currentDataset.id, field);
      }
      setNewField({ name: '', formula: '', outputType: 'number', unit: '' });
      setEditingFieldId(null);
      setPreviewResult(null);
   };

   const handleEditCalculatedField = (field: CalculatedField) => {
      setEditingFieldId(field.id);
      setNewField({
         name: field.name,
         formula: field.formula,
         outputType: field.outputType,
         unit: field.unit
      });
      setIsCalcDrawerOpen(true);
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
         [selectedFormatCol]: { ...currentConfig, conditionalFormatting: [...currentRules, rule] }
      });
   };

   const handleRemoveConditionalRule = (colName: string, ruleId: string) => {
      if (!currentDataset) return;
      const currentConfig = currentDataset.fieldConfigs?.[colName];
      if (!currentConfig) return;
      updateDatasetConfigs(currentDataset.id, {
         [colName]: { ...currentConfig, conditionalFormatting: (currentConfig.conditionalFormatting || []).filter(r => r.id !== ruleId) }
      });
   };

   const handleFormatChange = (key: keyof FieldConfig, value: any) => {
      if (!currentDataset || !selectedCol) return;
      const currentConfig = currentDataset.fieldConfigs?.[selectedCol] || { type: 'number' };
      updateDatasetConfigs(currentDataset.id, {
         [selectedCol]: { ...currentConfig, [key]: value }
      });
   };

   const handleRenameColumn = () => {
      if (!currentDataset || !selectedCol || !renamingValue.trim() || selectedCol === renamingValue) return;

      const calcField = currentDataset.calculatedFields?.find(f => f.name === selectedCol);
      if (calcField) {
         updateCalculatedField(currentDataset.id, calcField.id, { name: renamingValue });

         // Update local state references
         if (sortConfig?.key === selectedCol) setSortConfig({ ...sortConfig, key: renamingValue });
         if (columnFilters[selectedCol]) {
            const newFilters = { ...columnFilters };
            newFilters[renamingValue] = newFilters[selectedCol];
            delete newFilters[selectedCol];
            setColumnFilters(newFilters);
         }
      } else {
         renameDatasetField(currentDataset.id, selectedCol, renamingValue);
      }
      setSelectedCol(renamingValue);
   };

   const handleDeleteColumn = () => {
      if (!currentDataset || !selectedCol) return;
      const isCalculated = currentDataset.calculatedFields?.find(f => f.name === selectedCol);
      if (isCalculated) {
         if (window.confirm(`Supprimer le champ calculé "${selectedCol}" ?`)) {
            removeCalculatedField(currentDataset.id, isCalculated.id);
            setSelectedCol(null);
         }
      } else {
         if (window.confirm(`ATTENTION : Supprimer la colonne "${selectedCol}" effacera définitivement cette donnée. Continuer ?`)) {
            deleteDatasetField(currentDataset.id, selectedCol);
            setSelectedCol(null);
         }
      }
   };

   const handleApplyVlookup = () => {
      if (!currentDataset || !vlookupConfig.targetDatasetId || !vlookupConfig.primaryKey || !vlookupConfig.secondaryKey || vlookupConfig.columnsToAdd.length === 0 || !vlookupConfig.newColumnName.trim()) {
         alert("Veuillez remplir tous les champs requis");
         return;
      }

      // Enrich batches using the context function
      const success = enrichBatchesWithLookup(
         currentDataset.id,
         vlookupConfig.targetDatasetId,
         vlookupConfig.primaryKey,
         vlookupConfig.secondaryKey,
         vlookupConfig.columnsToAdd,
         vlookupConfig.newColumnName
      );

      if (!success) {
         alert("Le dataset cible n'a pas de données");
         return;
      }

      // Add new field to dataset
      addFieldToDataset(currentDataset.id, vlookupConfig.newColumnName, { type: 'text' });

      // Reset config and close drawer
      setVlookupConfig({
         targetDatasetId: '',
         primaryKey: '',
         secondaryKey: '',
         columnsToAdd: [],
         newColumnName: ''
      });
      setIsVlookupDrawerOpen(false);

      alert(`Colonne "${vlookupConfig.newColumnName}" ajoutée avec succès !`);
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

   const allRows = useMemo(() => {
      if (!currentDataset) return [];
      const calcFields = currentDataset.calculatedFields || [];

      let rows = batches
         .filter(b => b.datasetId === currentDataset.id)
         .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
         .flatMap(batch => batch.rows.map(r => {
            const extendedRow: any = { ...r, _importDate: batch.date, _batchId: batch.id };
            calcFields.forEach(cf => {
               const val = evaluateFormula(r, cf.formula);
               extendedRow[cf.name] = val;
            });
            return extendedRow;
         }));

      if (blendingConfig && blendingConfig.secondaryDatasetId && blendingConfig.joinKeyPrimary && blendingConfig.joinKeySecondary) {
         const secDS = datasets.find(d => d.id === blendingConfig.secondaryDatasetId);
         if (secDS) {
            const secBatches = batches.filter(b => b.datasetId === blendingConfig.secondaryDatasetId).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            if (secBatches.length > 0) {
               const secBatch = secBatches[secBatches.length - 1];
               const lookup = new Map<string, any>();
               secBatch.rows.forEach(r => {
                  const k = String(r[blendingConfig.joinKeySecondary]).trim();
                  if (k) lookup.set(k, r);
               });
               rows = rows.map(row => {
                  const k = String(row[blendingConfig.joinKeyPrimary]).trim();
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
      }

      // BOLT OPTIMIZATION: Pre-calculate search index for O(N) global search
      return rows.map(row => {
         let searchStr = "";
         for (const k in row) {
            if (k.startsWith('_') && k !== '_importDate') continue;
            const v = row[k];
            if (v !== null && v !== undefined && v !== '') {
               searchStr += String(v) + " ";
            }
         }
         return { ...row, _searchIndex: searchStr.toLowerCase() };
      });
   }, [currentDataset, batches, blendingConfig, datasets]);

   const displayFields = useMemo(() => {
      if (!currentDataset) return [];
      const primFields = [...currentDataset.fields];
      if (blendingConfig && blendingConfig.secondaryDatasetId) {
         const secDS = datasets.find(d => d.id === blendingConfig.secondaryDatasetId);
         if (secDS) {
            const secFields = secDS.fields.map(f => `[${secDS.name}] ${f}`);
            const secCalcFields = (secDS.calculatedFields || []).map(f => `[${secDS.name}] ${f.name}`);
            return [...primFields, ...secFields, ...secCalcFields];
         }
      }
      return primFields;
   }, [currentDataset, blendingConfig, datasets]);

   const processedRows = useMemo(() => {
      let data = allRows;

      if (searchTerm.trim()) {
         const lowerTerm = searchTerm.toLowerCase();
         // BOLT OPTIMIZATION: Use pre-calculated search index (O(N) instead of O(N*M))
         data = data.filter(row => row._searchIndex.includes(lowerTerm));
      }

      Object.entries(columnFilters).forEach(([key, filterValue]) => {
         if (filterValue !== undefined && filterValue !== null) {
            if (filterValue === '__EMPTY__') {
               data = data.filter(row => {
                  const val = row[key];
                  return val === undefined || val === null || val === '';
               });
            } else {
               let targetVal = filterValue as string;
               let isExact = false;
               if (targetVal.startsWith('=')) { isExact = true; targetVal = targetVal.substring(1); }
               const lowerFilter = targetVal.toLowerCase();

               data = data.filter(row => {
                  const val = row[key];
                  if (key === '_batchId') return String(val) === String(targetVal);

                  const valStr = String(val ?? '').toLowerCase();
                  const config = currentDataset?.fieldConfigs?.[key];

                  if (isExact) {
                     if (valStr === lowerFilter) return true;
                     // Support for Date groupings from TCD Drilldown
                     if (config?.type === 'date' || key.toLowerCase().includes('date')) {
                        if (getGroupedLabel(valStr, 'month').toLowerCase() === lowerFilter) return true;
                        if (getGroupedLabel(valStr, 'year').toLowerCase() === lowerFilter) return true;
                        if (getGroupedLabel(valStr, 'quarter').toLowerCase() === lowerFilter) return true;
                     }
                  }

                  if (key === '_importDate') {
                     const dateStr = val as string;
                     if (isExact) return dateStr === targetVal || formatDateFr(dateStr) === targetVal;
                     if (formatDateFr(dateStr).toLowerCase().includes(lowerFilter)) return true;
                     if (dateStr.includes(lowerFilter)) return true;
                     return false;
                  }

                  return isExact ? valStr === lowerFilter : valStr.includes(lowerFilter);
               });
            }
         }
      });

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

   // --- DISTRIBUTION CHART DATA ---
   const distributionData = useMemo(() => {
      if (!selectedCol || processedRows.length === 0) return [];

      const counts: Record<string, number> = {};
      processedRows.forEach(row => {
         let val = row[selectedCol];
         if (val === undefined || val === null || val === '') val = '(Vide)';
         else val = String(val);
         counts[val] = (counts[val] || 0) + 1;
      });

      // Top 10 frequent values
      return Object.entries(counts)
         .map(([name, value]) => ({ name, value }))
         .sort((a, b) => b.value - a.value)
         .slice(0, 15);
   }, [selectedCol, processedRows]);

   // --- VIRTUALIZATION ---
   const rowVirtualizer = useVirtualizer({
      count: processedRows.length,
      getScrollElement: () => tableContainerRef.current,
      estimateSize: () => 40, // Height of a row
      overscan: 10,
   });

   // LIVE PREVIEW EFFECT
   useEffect(() => {
      if (!isCalcDrawerOpen || !newField.formula) {
         setPreviewResult(null);
         return;
      }
      const timer = setTimeout(() => {
         const sampleRow = processedRows.length > 0 ? processedRows[0] : (allRows.length > 0 ? allRows[0] : null);
         if (sampleRow) {
            const res = evaluateFormula(sampleRow, newField.formula!);
            if (res === null && newField.formula!.trim() !== '') setPreviewResult({ value: null, error: "Erreur de syntaxe ou champ introuvable" });
            else setPreviewResult({ value: res });
         } else setPreviewResult({ value: null, error: "Aucune donnée pour tester" });
      }, 500);
      return () => clearTimeout(timer);
   }, [newField.formula, processedRows, allRows, isCalcDrawerOpen]);

   const historyData = useMemo(() => {
      if (!selectedRow || !trackingKey) return [];
      const trackValue = selectedRow[trackingKey];
      if (trackValue === undefined || trackValue === '') return [selectedRow];
      const relevantBatches = batches.filter(b => b.datasetId === currentDataset?.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const history: any[] = [];
      relevantBatches.forEach(batch => {
         const match = batch.rows.find(r => String(r[trackingKey]) === String(trackValue));
         if (match) history.push({ ...match, _importDate: batch.date, _batchId: batch.id });
      });
      return history;
   }, [selectedRow, trackingKey, batches, currentDataset]);

   const getCellStyle = (fieldName: string, value: any) => {
      // BOLT OPTIMIZATION: Cache numeric value to avoid repeated parsing
      let cachedNum: number | null = null;
      const getNumericValue = () => {
         if (cachedNum !== null) return cachedNum;
         cachedNum = parseSmartNumber(value);
         return cachedNum;
      };

      // 1. Check Conditional Formatting
      if (!currentDataset?.fieldConfigs) return '';
      const rules = currentDataset.fieldConfigs[fieldName]?.conditionalFormatting;
      if (!rules || rules.length === 0) return '';
      for (const rule of rules) {
         const targetValue = Number(rule.value);
         let match = false;
         if (rule.operator === 'gt' || rule.operator === 'lt') {
            const numValue = getNumericValue();
            if (rule.operator === 'gt') match = numValue > targetValue;
            if (rule.operator === 'lt') match = numValue < targetValue;
         }
         if (rule.operator === 'eq') match = String(value) == String(rule.value);
         if (rule.operator === 'contains') match = String(value).toLowerCase().includes(String(rule.value).toLowerCase());
         if (rule.operator === 'empty') match = !value || value === '';
         if (match) return `${rule.style.color || ''} ${rule.style.backgroundColor || ''} ${rule.style.fontWeight || ''}`;
      }
      return '';
   };

   const handleExportFullCSV = () => {
      if (!currentDataset || processedRows.length === 0) return;
      const headers = ['Date import', 'Id', ...displayFields, ...calculatedFields.map(f => f.name)];
      const csvContent = [
         headers.join(';'),
         ...processedRows.map(row => {
            const cols = [
               row._importDate, row.id,
               ...displayFields.map(f => {
                  let val = row[f];
                  let stringVal = val !== undefined ? String(val) : '';
                  if (stringVal.includes(';') || stringVal.includes('\n') || stringVal.includes('"')) stringVal = `"${stringVal.replace(/"/g, '""')}"`;
                  return stringVal;
               }),
               ...calculatedFields.map(f => {
                  let val = row[f.name];
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
            <div className="mt-4">
               <select
                  className="appearance-none bg-white border border-slate-300 text-slate-700 text-sm rounded-md py-2 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
                  value=""
                  onChange={(e) => {
                     if (e.target.value === '__NEW__') navigate('/import');
                     else switchDataset(e.target.value);
                  }}
               >
                  <option value="" disabled>Choisir une typologie</option>
                  {datasets.map(d => (
                     <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                  <option disabled>──────────</option>
                  <option value="__NEW__">+ Nouvelle typologie...</option>
               </select>
            </div>
         </div>
      );
   }

   const calculatedFields = currentDataset.calculatedFields || [];
   const activeBatchFilter = columnFilters['_batchId'] ? columnFilters['_batchId'].replace(/^=/, '') : null;
   const activeBatchDate = activeBatchFilter ? batches.find(b => b.id === activeBatchFilter)?.date : null;
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

         {/* DELETE CONFIRMATION MODAL */}
         {deleteConfirmRow && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
               <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                  <div className="flex items-center gap-3 mb-4">
                     <div className="p-3 bg-red-100 rounded-full text-red-600">
                        <AlertTriangle className="w-6 h-6" />
                     </div>
                     <h3 className="text-lg font-bold text-slate-800">Confirmer la suppression</h3>
                  </div>
                  <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                     Vous êtes sur le point de supprimer cette ligne définitivement de l'import du
                     <strong> {formatDateFr(deleteConfirmRow._importDate)}</strong>.
                     <br /><br />
                     Cette action est irréversible.
                  </p>
                  <div className="flex justify-end gap-3">
                     <Button variant="outline" onClick={() => setDeleteConfirmRow(null)}>Annuler</Button>
                     <Button variant="danger" onClick={confirmDeleteRow}>Supprimer la ligne</Button>
                  </div>
               </div>
            </div>
         )}

         {/* Header */}
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 flex-shrink-0">
            <div className="flex flex-col gap-2">
               <div className="flex items-center gap-4">
                  <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                     <Table2 className="w-6 h-6 text-brand-600" />
                     Données
                  </h2>
                  {/* DATASET SELECTOR IN HEADER */}
                  <div className="flex items-center gap-2">
                     <select
                        className="appearance-none bg-white border border-slate-300 text-slate-800 font-bold text-sm rounded-md py-1.5 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
                        value={currentDatasetId || ''}
                        onChange={(e) => {
                           if (e.target.value === '__NEW__') navigate('/import');
                           else switchDataset(e.target.value);
                        }}
                     >
                        {datasets.length === 0 && <option value="">Aucun tableau</option>}
                        {datasets.map(d => (
                           <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                        <option disabled>──────────</option>
                        <option value="__NEW__">+ Nouvelle typologie...</option>
                     </select>

                     {currentDataset && (
                        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-md border border-slate-200">
                           <History className="w-3.5 h-3.5 text-slate-500 ml-1" />
                           <select
                              className="bg-transparent border-none text-xs font-bold text-slate-600 focus:ring-0 py-0.5 pl-1 pr-6 cursor-pointer"
                              value={activeBatchFilter || 'all'}
                              onChange={(e) => {
                                 const val = e.target.value;
                                 if (val === 'all') {
                                    const newFilters = { ...columnFilters };
                                    delete newFilters['_batchId'];
                                    setColumnFilters(newFilters);
                                 } else {
                                    handleColumnFilterChange('_batchId', `=${val}`);
                                 }
                              }}
                           >
                              <option value="all">Toutes les versions</option>
                              {batches
                                 .filter(b => b.datasetId === currentDataset.id)
                                 .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                 .map(b => (
                                    <option key={b.id} value={b.id}>
                                       Import du {formatDateFr(b.date)}
                                    </option>
                                 ))
                              }
                           </select>
                        </div>
                     )}
                  </div>
               </div>

               <div className="text-sm text-slate-500 flex flex-col sm:flex-row sm:items-center gap-2">
                  <span>{processedRows.length} ligne(s) (Total : {allRows.length})</span>
                  {activeBatchDate && (
                     <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 animate-in fade-in">
                        <Filter className="w-3 h-3" /> Source restreinte : Import du {formatDateFr(activeBatchDate)}
                     </span>
                  )}
                  {blendingConfig && (
                     <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 animate-in fade-in">
                        <LinkIcon className="w-3 h-3" /> Mode Drill-down : Données croisées
                     </span>
                  )}
               </div>
            </div>

            <div className="flex flex-wrap gap-3 w-full md:w-auto">
               <div className="relative flex-1 md:w-64">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                     <Search className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                     type="text"
                     className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md bg-white placeholder-slate-400 focus:ring-1 focus:ring-brand-500 focus:border-brand-500 sm:text-sm transition-all"
                     placeholder="Recherche globale..."
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                  />
               </div>

               <Button variant={isFormatDrawerOpen ? "primary" : "secondary"} onClick={() => setIsFormatDrawerOpen(!isFormatDrawerOpen)} className="whitespace-nowrap"><Palette className="w-4 h-4 md:mr-2" /><span className="hidden md:inline">Conditionnel</span></Button>
               <Button variant={isCalcDrawerOpen ? "primary" : "secondary"} onClick={() => setIsCalcDrawerOpen(!isCalcDrawerOpen)} className="whitespace-nowrap"><FunctionSquare className="w-4 h-4 md:mr-2" /><span className="hidden md:inline">Calculs</span></Button>
               <Button variant={isVlookupDrawerOpen ? "primary" : "secondary"} onClick={() => setIsVlookupDrawerOpen(!isVlookupDrawerOpen)} className="whitespace-nowrap"><LinkIcon className="w-4 h-4 md:mr-2" /><span className="hidden md:inline">RECHERCHEV</span></Button>
               <Button variant={isEditMode ? "primary" : "outline"} onClick={() => setIsEditMode(!isEditMode)} className={`whitespace-nowrap ${isEditMode ? 'bg-brand-600 text-white' : ''}`}><GitCommit className="w-4 h-4 md:mr-2" /><span className="hidden md:inline">Mode Édition</span></Button>
               <Button variant={showFilters ? "primary" : "outline"} onClick={() => setShowFilters(!showFilters)} className="whitespace-nowrap"><Filter className="w-4 h-4 md:mr-2" /><span className="hidden md:inline">Filtres</span></Button>
               <Button variant={isColumnDrawerOpen ? "primary" : "secondary"} onClick={() => setIsColumnDrawerOpen(!isColumnDrawerOpen)} className="whitespace-nowrap"><Columns className="w-4 h-4 md:mr-2" /><span className="hidden md:inline">Colonnes</span></Button>
               <Button variant={showColumnBorders ? "primary" : "outline"} onClick={() => setShowColumnBorders(!showColumnBorders)} className="whitespace-nowrap"><Columns className="w-4 h-4 md:mr-2" /><span className="hidden md:inline">Bordures</span></Button>

               {(Object.keys(columnFilters).length > 0 || searchTerm) && (
                  <Button variant="danger" onClick={clearFilters} className="whitespace-nowrap px-3" title="Effacer tous les filtres"><FilterX className="w-4 h-4" /></Button>
               )}

               {activeBatchFilter && (
                  <Button variant="danger" onClick={() => { if (window.confirm("Êtes-vous sûr de vouloir supprimer définitivement cet import ? Cette action est irréversible.")) { deleteBatch(activeBatchFilter); clearFilters(); } }} className="whitespace-nowrap bg-red-100 text-red-700 border-red-200 hover:bg-red-200"><Trash2 className="w-4 h-4 md:mr-2" /><span className="hidden md:inline">Supprimer l'import</span></Button>
               )}

               <Button variant="outline" onClick={handleExportFullCSV} disabled={processedRows.length === 0}><Download className="w-4 h-4 md:mr-2" /><span className="hidden md:inline">Export</span></Button>
            </div>
         </div>

         {/* EDIT MODE TOOLBAR */}
         {isEditMode && (
            <div className="bg-brand-50 border border-brand-200 rounded-lg p-3 shadow-sm flex items-center justify-between animate-in slide-in-from-top duration-300">
               <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand-100 rounded-full text-brand-600">
                     <GitCommit className="w-5 h-5" />
                  </div>
                  <div>
                     <p className="text-sm font-bold text-brand-900">Mode Édition Activé</p>
                     <p className="text-xs text-brand-700">Modifiez les cellules directement dans le tableau. Les changements ne sont pas encore enregistrés.</p>
                  </div>
               </div>
               <div className="flex gap-3">
                  <Button variant="outline" onClick={handleCancelEdits}>Annuler</Button>
                  <Button variant="primary" onClick={handleSaveEdits} className="bg-brand-600 hover:bg-brand-700 shadow-md">
                     Enregistrer les modifications ({Object.values(pendingChanges).reduce((acc, curr) => acc + Object.keys(curr).length, 0)} lignes)
                  </Button>
               </div>
            </div>
         )}

         {/* Formatting & Actions Toolbar */}
         <div className={`transition-all duration-300 overflow-hidden ${selectedCol ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="bg-white border border-teal-200 rounded-lg p-3 shadow-sm bg-gradient-to-r from-white to-teal-50 flex flex-wrap items-start gap-4">

               {/* LEFT: Renaming and Actions */}
               <div className="flex-1 flex flex-col gap-2">
                  <div className="flex items-center gap-2 border-b border-teal-100 pb-2 mb-2">
                     <Columns className="w-4 h-4 text-teal-700" />
                     <div className="relative group">
                        <input type="text" className="text-sm font-bold text-teal-800 bg-transparent border-b border-teal-300 focus:outline-none focus:border-teal-600 w-48" value={renamingValue} onChange={e => setRenamingValue(e.target.value)} placeholder={selectedCol || ''} />
                        {renamingValue !== selectedCol && (
                           <button onClick={handleRenameColumn} className="absolute -right-16 top-0 text-xs bg-teal-600 text-white px-2 py-0.5 rounded hover:bg-teal-700 shadow-sm">Renommer</button>
                        )}
                     </div>
                  </div>

                  <div className="flex flex-wrap gap-3 items-center">
                     <div className="flex items-center gap-2 pr-3 border-r border-teal-100">
                        <span className="text-xs text-slate-600 font-medium whitespace-nowrap">Type :</span>
                        <select
                           className="text-xs border border-slate-200 rounded py-1 px-2 bg-white focus:ring-1 focus:ring-teal-500"
                           value={selectedConfig?.type || 'text'}
                           onChange={(e) => handleFormatChange('type', e.target.value)}
                        >
                           <option value="text">Texte</option>
                           <option value="number">Nombre</option>
                           <option value="date">Date</option>
                           <option value="boolean">Oui/Non</option>
                        </select>
                     </div>

                     {isSelectedNumeric ? (
                        <>
                           <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-600 font-medium">Décimales :</span>
                              <div className="flex bg-white rounded border border-slate-200">
                                 <button onClick={() => handleFormatChange('decimalPlaces', Math.max(0, (selectedConfig?.decimalPlaces ?? 2) - 1))} className="px-2 py-1 text-xs hover:bg-slate-50 text-slate-600 border-r border-slate-100">-</button>
                                 <span className="px-2 py-1 text-xs font-mono w-6 text-center">{selectedConfig?.decimalPlaces ?? 2}</span>
                                 <button onClick={() => handleFormatChange('decimalPlaces', Math.min(5, (selectedConfig?.decimalPlaces ?? 2) + 1))} className="px-2 py-1 text-xs hover:bg-slate-50 text-slate-600 border-l border-slate-100">+</button>
                              </div>
                           </div>
                           <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-600 font-medium">Échelle :</span>
                              <select className="text-xs border border-slate-200 rounded py-1 pl-2 pr-6 bg-white focus:ring-1 focus:ring-teal-500" value={selectedConfig?.displayScale || 'none'} onChange={(e) => handleFormatChange('displayScale', e.target.value)}>
                                 <option value="none">Aucune</option>
                                 <option value="thousands">Milliers (k)</option>
                                 <option value="millions">Millions (M)</option>
                                 <option value="billions">Milliards (Md)</option>
                              </select>
                           </div>
                           <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-600 font-medium">Unité :</span>
                              <input type="text" className="text-xs border border-slate-200 rounded w-16 px-2 py-1 bg-white focus:ring-1 focus:ring-teal-500" placeholder="Ex: €" value={selectedConfig?.unit || ''} onChange={(e) => handleFormatChange('unit', e.target.value)} />
                           </div>
                        </>
                     ) : (
                        <span className="text-xs text-slate-400 italic">Options de formatage non disponibles pour ce type.</span>
                     )}

                     <div className="ml-auto flex items-center gap-2 border-l border-slate-200 pl-3">
                        {currentDataset.calculatedFields?.some(f => f.name === selectedCol) && (
                           <Button
                              size="sm"
                              className="bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-200 shadow-sm text-xs font-semibold"
                              onClick={() => {
                                 const field = currentDataset.calculatedFields?.find(f => f.name === selectedCol);
                                 if (field) handleEditCalculatedField(field);
                              }}
                           >
                              <Calculator className="w-3 h-3 mr-1" /> Modifier Formule
                           </Button>
                        )}
                        <Button onClick={handleDeleteColumn} size="sm" className="bg-red-600 hover:bg-red-700 text-white border border-red-700 shadow-sm text-xs font-semibold"><Trash2 className="w-3 h-3 mr-1" /> Supprimer</Button>
                        <Button onClick={() => setSelectedCol(null)} size="sm" className="bg-teal-600 text-white hover:bg-teal-700 shadow-sm text-xs">Terminer</Button>
                     </div>
                  </div>
               </div>

               {/* RIGHT: Distribution Chart */}
               <div className="w-64 h-32 bg-white rounded border border-slate-100 p-2 flex flex-col">
                  <div className="flex items-center gap-1 text-xs font-bold text-slate-400 uppercase mb-1">
                     <BarChart2 className="w-3 h-3" /> Distribution (Top 15)
                  </div>
                  <div className="flex-1 min-h-0">
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={distributionData}>
                           <Tooltip
                              cursor={{ fill: '#f1f5f9' }}
                              contentStyle={{ fontSize: '10px', padding: '4px', borderRadius: '4px' }}
                              formatter={(value: number) => [value, 'Occurrences']}
                           />
                           <Bar dataKey="value" fill="#0d9488" radius={[2, 2, 0, 0]} />
                        </BarChart>
                     </ResponsiveContainer>
                  </div>
               </div>

            </div>
         </div>

         {/* Table Container - Relative pour permettre le positionnement du Drawer */}
         <div className="flex-1 flex min-h-0 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden relative">

            {/* Table Wrapper with Virtualization */}
            <div ref={tableContainerRef} className="flex-1 overflow-auto custom-scrollbar relative w-full flex flex-col">

               {/* STICKY HEADER TABLE */}
               <table className="w-full divide-y divide-slate-200 border-collapse text-left" style={{ height: rowVirtualizer.getTotalSize(), tableLayout: 'fixed', minWidth: '100%' }}>
                  <thead className="bg-slate-50 sticky top-0 z-20 shadow-sm">
                     <tr>
                        <th scope="col" className={`px-6 py-3 text-left text-xs font-bold text-slate-500 tracking-wider whitespace-nowrap bg-slate-50 border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors select-none group relative ${showColumnBorders ? 'border-r border-slate-200' : ''}`} onClick={() => handleHeaderClick('_importDate')} style={{ width: columnWidths['_importDate'] || 140, minWidth: 140, maxWidth: columnWidths['_importDate'] || 140 }}>
                           <div className="flex items-center gap-2 justify-between">
                              <div className="flex items-center gap-2">
                                 <span>Date d'import</span>
                                 {sortConfig?.key === '_importDate' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-brand-600" /> : <ArrowDown className="w-3 h-3 text-brand-600" />) : <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />}
                              </div>
                              <div
                                 className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-brand-400 active:bg-brand-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                 onMouseDown={(e) => handleResizeStart(e, '_importDate', columnWidths['_importDate'] || 140)}
                              />
                           </div>
                        </th>
                        <th scope="col" className={`px-6 py-3 text-left text-xs font-bold text-slate-500 tracking-wider whitespace-nowrap bg-slate-50 border-b border-slate-200 relative group ${showColumnBorders ? 'border-r border-slate-200' : ''}`} style={{ width: columnWidths['id'] || 120, minWidth: 120, maxWidth: columnWidths['id'] || 120 }}>
                           <div className="flex items-center gap-2 justify-between">
                              <span>Id</span>
                              <div
                                 className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-brand-400 active:bg-brand-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                 onMouseDown={(e) => handleResizeStart(e, 'id', columnWidths['id'] || 120)}
                              />
                           </div>
                        </th>
                        {displayFields.map(field => {
                           const isSelected = selectedCol === field;
                           const isBlended = field.startsWith('[');
                           const fieldConfig = currentDataset.fieldConfigs?.[field];
                           const isNumeric = fieldConfig?.type === 'number';
                           const defaultWidth = isNumeric ? 120 : 180;
                           const colWidth = columnWidths[field] || defaultWidth;
                           return (
                              <th key={field} scope="col" className={`px-6 py-3 text-left text-xs font-bold tracking-wider whitespace-nowrap border-b cursor-pointer transition-colors select-none group relative ${isCalcDrawerOpen ? 'hover:bg-indigo-100 hover:text-indigo-800' : (isSelected ? 'bg-teal-50 text-teal-900 border-teal-300' : (isBlended ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'))} ${showColumnBorders ? 'border-r' : ''}`} onClick={() => handleHeaderClick(field)} style={{ width: colWidth, minWidth: 80, maxWidth: colWidth }}>
                                 <div className="flex items-center gap-2 justify-between">
                                    <div className="flex items-center gap-2">
                                       {isCalcDrawerOpen && <MousePointerClick className="w-3 h-3 text-indigo-500" />}
                                       {isNumeric && <Hash className="w-3 h-3 text-slate-400" />}
                                       <span>{field}</span>
                                       {!isCalcDrawerOpen && (sortConfig?.key === field ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-brand-600" /> : <ArrowDown className="w-3 h-3 text-brand-600" />) : <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />)}
                                    </div>
                                    <div
                                       className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-brand-400 active:bg-brand-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                       onMouseDown={(e) => handleResizeStart(e, field, colWidth)}
                                       onClick={(e) => e.stopPropagation()}
                                    />
                                 </div>
                              </th>
                           );
                        })}
                        {calculatedFields.map(cf => {
                           const colWidth = columnWidths[cf.name] || 150;
                           return (
                              <th key={cf.id} scope="col" title={`Formule: ${cf.formula}`} className={`px-6 py-3 text-left text-xs font-bold text-indigo-600 tracking-wider whitespace-nowrap bg-indigo-50 border-b border-indigo-200 cursor-pointer hover:bg-indigo-100 transition-colors select-none group relative ${showColumnBorders ? 'border-r' : ''}`} onClick={() => handleHeaderClick(cf.name)} style={{ width: colWidth, minWidth: 80, maxWidth: colWidth }}>
                                 <div className="flex items-center gap-2 justify-between">
                                    <div className="flex items-center gap-2">
                                       <Calculator className="w-3 h-3" />
                                       <span>{cf.name}</span>
                                       {!isCalcDrawerOpen && (sortConfig?.key === cf.name ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />) : <ArrowUpDown className="w-3 h-3 text-indigo-300 opacity-0 group-hover:opacity-100 transition-opacity" />)}
                                    </div>
                                    <div
                                       className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-400 active:bg-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                       onMouseDown={(e) => handleResizeStart(e, cf.name, colWidth)}
                                       onClick={(e) => e.stopPropagation()}
                                    />
                                 </div>
                              </th>
                           );
                        })}
                        <th scope="col" className="px-3 py-3 border-b border-slate-200 bg-slate-50" style={{ width: 60, minWidth: 60, maxWidth: 60 }}></th>
                     </tr>
                     {showFilters && (
                        <tr className="bg-slate-50">
                           <th className={`px-2 py-2 border-b border-slate-200 ${showColumnBorders ? 'border-r' : ''}`} style={{ width: columnWidths['_importDate'] || 140, minWidth: 140, maxWidth: columnWidths['_importDate'] || 140 }}>
                              <input type="text" className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white focus:ring-1 focus:ring-brand-500 font-normal" placeholder="Filtre date..." value={columnFilters['_importDate'] || ''} onChange={(e) => handleColumnFilterChange('_importDate', e.target.value)} />
                           </th>
                           <th className={`px-2 py-2 border-b border-slate-200 ${showColumnBorders ? 'border-r' : ''}`} style={{ width: columnWidths['id'] || 120, minWidth: 120, maxWidth: columnWidths['id'] || 120 }}>
                              <input type="text" className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white focus:ring-1 focus:ring-brand-500 font-normal" placeholder="Filtre Id..." value={columnFilters['id'] || ''} onChange={(e) => handleColumnFilterChange('id', e.target.value)} />
                           </th>
                           {displayFields.map(field => {
                              const fieldConfig = currentDataset.fieldConfigs?.[field];
                              const isNumeric = fieldConfig?.type === 'number';
                              const defaultWidth = isNumeric ? 120 : 180;
                              const colWidth = columnWidths[field] || defaultWidth;
                              return (
                                 <th key={`filter-${field}`} className={`px-2 py-2 border-b border-slate-200 ${showColumnBorders ? 'border-r' : ''}`} style={{ width: colWidth, minWidth: 80, maxWidth: colWidth }}>
                                    <input type="text" className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white focus:ring-1 focus:ring-brand-500 font-normal" placeholder={columnFilters[field] === '__EMPTY__' ? "(Vide)" : `Filtre ${field}...`} value={columnFilters[field] === '__EMPTY__' ? '' : (columnFilters[field] || '')} onChange={(e) => handleColumnFilterChange(field, e.target.value)} />
                                 </th>
                              );
                           })}
                           {calculatedFields.map(cf => {
                              const colWidth = columnWidths[cf.name] || 150;
                              return (
                                 <th key={`filter-${cf.id}`} className={`px-2 py-2 border-b border-indigo-200 bg-indigo-50 ${showColumnBorders ? 'border-r' : ''}`} style={{ width: colWidth, minWidth: 80, maxWidth: colWidth }}>
                                    <input type="text" className="w-full px-2 py-1 text-xs border border-indigo-200 rounded bg-white focus:ring-1 focus:ring-indigo-500 font-normal" placeholder={`Filtre...`} value={columnFilters[cf.name] || ''} onChange={(e) => handleColumnFilterChange(cf.name, e.target.value)} />
                                 </th>
                              );
                           })}
                           <th className="border-b border-slate-200 bg-slate-50" style={{ width: 60, minWidth: 60, maxWidth: 60 }}></th>
                        </tr>
                     )}
                  </thead>

                  {/* VIRTUAL BODY */}
                  <tbody className="bg-white divide-y divide-slate-200">
                     {rowVirtualizer.getTotalSize() > 0 && (
                        <tr>
                           <td
                              style={{ height: `${rowVirtualizer.getVirtualItems()[0]?.start || 0}px` }}
                              colSpan={displayFields.length + 3 + calculatedFields.length}
                           />
                        </tr>
                     )}
                     {rowVirtualizer.getVirtualItems().map((virtualRow: any) => {
                        const row = processedRows[virtualRow.index];
                        return (
                           <tr
                              key={virtualRow.key}
                              className="hover:bg-brand-50 transition-colors cursor-pointer group"
                              onClick={() => handleRowClick(row)}
                           >
                              <td className={`px-6 py-2 whitespace-nowrap text-sm text-slate-500 font-mono group-hover:text-brand-600 ${showColumnBorders ? 'border-r border-slate-200' : ''}`} style={{ width: columnWidths['_importDate'] || 140, minWidth: 140, maxWidth: columnWidths['_importDate'] || 140 }}>
                                 {formatDateFr(row._importDate)}
                              </td>
                              <td className={`px-6 py-2 whitespace-nowrap text-sm text-slate-600 font-mono ${showColumnBorders ? 'border-r border-slate-200' : ''}`} style={{ width: columnWidths['id'] || 120, minWidth: 120, maxWidth: columnWidths['id'] || 120 }}>
                                 {row.id}
                              </td>
                              {displayFields.map(field => {
                                 const val = pendingChanges[row._batchId]?.[row.id]?.[field] ?? row[field];
                                 let displayVal: React.ReactNode = val;
                                 const cellStyle = getCellStyle(field, val);
                                 const config = currentDataset.fieldConfigs?.[field];
                                 const isBlended = field.startsWith('[');
                                 const isNumeric = config?.type === 'number';
                                 const defaultWidth = isNumeric ? 120 : 180;
                                 const colWidth = columnWidths[field] || defaultWidth;

                                 if (!isEditMode || isBlended) {
                                    if (config?.type === 'number' && val !== undefined && val !== '') displayVal = formatNumberValue(val, config);
                                    else if (typeof val === 'boolean') displayVal = val ? <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Oui</span> : <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500">Non</span>;
                                    else if (!val && val !== 0) displayVal = <span className="text-slate-300">-</span>;
                                 }

                                 return (
                                    <td key={field} className={`px-3 py-1 whitespace-nowrap text-sm text-slate-700 truncate ${cellStyle} ${config?.type === 'number' ? 'text-right font-mono' : ''} ${isBlended ? 'text-purple-700 bg-purple-50/20' : ''} ${showColumnBorders ? 'border-r border-slate-200' : ''}`} title={String(val)} style={{ width: colWidth, minWidth: 80, maxWidth: colWidth }}>
                                       {isEditMode && !isBlended ? (
                                          <input
                                             type="text"
                                             className="w-full px-2 py-1 text-sm border border-brand-300 rounded focus:ring-1 focus:ring-brand-500 bg-white"
                                             value={val ?? ''}
                                             onChange={(e) => handleCellEdit(row._batchId, row.id, field, e.target.value)}
                                             onClick={(e) => e.stopPropagation()}
                                          />
                                       ) : (
                                          displayVal
                                       )}
                                    </td>
                                 );
                              })}
                              {calculatedFields.map(cf => {
                                 const val = row[cf.name];
                                 const cellStyle = getCellStyle(cf.name, val);
                                 const colWidth = columnWidths[cf.name] || 150;
                                 const config = currentDataset.fieldConfigs?.[cf.name] || { type: 'number', unit: cf.unit };
                                 return (
                                    <td key={cf.id} className={`px-3 py-1 whitespace-nowrap text-sm text-indigo-700 font-medium truncate bg-indigo-50/30 text-right font-mono ${cellStyle} ${showColumnBorders ? 'border-r border-slate-200' : ''}`} style={{ width: colWidth, minWidth: 80, maxWidth: colWidth }}>
                                       {val !== undefined && val !== null ? <span>{formatNumberValue(val, config)}</span> : <span className="text-indigo-200">-</span>}
                                    </td>
                                 );
                              })}
                              <td className="px-3 py-2 text-right" style={{ width: 60, minWidth: 60, maxWidth: 60 }}>
                                 <button type="button" onClick={(e) => handleDeleteRow(row, e)} className="text-slate-300 hover:text-red-600 p-1 hover:bg-red-50 rounded transition-colors" title="Supprimer cette ligne"><Trash2 className="w-4 h-4" /></button>
                              </td>
                           </tr>
                        );
                     })}
                     {rowVirtualizer.getTotalSize() > 0 && (
                        <tr>
                           <td
                              style={{ height: `${rowVirtualizer.getTotalSize() - (rowVirtualizer.getVirtualItems()[rowVirtualizer.getVirtualItems().length - 1]?.end || 0)}px` }}
                              colSpan={displayFields.length + 3 + calculatedFields.length}
                           />
                        </tr>
                     )}
                  </tbody>
               </table>
            </div>

            {/* CALCULATED FIELDS DRAWER */}
            {isCalcDrawerOpen && (
               <div className="w-[500px] bg-white border-l border-slate-200 shadow-xl flex flex-col z-30 animate-in slide-in-from-right duration-300">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                     <div>
                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2"><FunctionSquare className="w-4 h-4 text-indigo-600" /> Éditeur de Formule</h3>
                        <p className="text-xs text-slate-500 mt-1">Créez une nouvelle colonne calculée</p>
                     </div>
                     <button onClick={() => setIsCalcDrawerOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="p-4 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4">
                     <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Nom de la colonne</label>
                        <input type="text" className="block w-full rounded-md border-slate-300 text-sm p-1.5 bg-white focus:ring-indigo-500 focus:border-indigo-500" placeholder="Ex: Total TTC" value={newField.name} onChange={e => setNewField({ ...newField, name: e.target.value })} />
                     </div>
                     <div className="flex-1 flex flex-col min-h-[300px]">
                        <label className="block text-xs font-bold text-slate-600 mb-1 flex justify-between"><span>Formule</span><span className="text-xs text-slate-400">Syntaxe Excel simplifiée</span></label>
                        <textarea ref={formulaInputRef} className="block w-full h-32 rounded-t-md border-slate-300 text-sm p-2 bg-slate-50 font-mono text-slate-700 focus:ring-indigo-500 focus:border-indigo-500" placeholder="Ex: [Prix Unitaire] * [Quantité] * 1.2" value={newField.formula} onChange={e => setNewField({ ...newField, formula: e.target.value })} />
                        <div className="border border-t-0 border-slate-300 rounded-b-md bg-white flex flex-col h-64">
                           <div className="flex border-b border-slate-200">
                              <button onClick={() => setCalcTab('fields')} className={`flex-1 py-2 text-xs font-medium text-center transition-colors ${calcTab === 'fields' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-500' : 'text-slate-500 hover:bg-slate-50'}`}>Champs ({currentDataset.fields.length})</button>
                              <button onClick={() => setCalcTab('functions')} className={`flex-1 py-2 text-xs font-medium text-center transition-colors ${calcTab === 'functions' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-500' : 'text-slate-500 hover:bg-slate-50'}`}>Fonctions</button>
                           </div>
                           <div className="flex-1 overflow-y-auto p-2 custom-scrollbar bg-slate-50/50">
                              {calcTab === 'fields' ? (
                                 <div className="grid grid-cols-2 gap-2">
                                    {currentDataset.fields.map(f => (
                                       <button key={f} onClick={() => insertIntoFormula(`[${f}]`)} className="text-left px-2 py-1.5 bg-white border border-slate-200 rounded text-xs text-slate-700 hover:border-indigo-300 hover:text-indigo-700 truncate transition-colors" title={`Insérer [${f}]`}>{f}</button>
                                    ))}
                                 </div>
                              ) : (
                                 <div className="space-y-1">
                                    {[
                                       { name: 'SI', syntax: 'SI(condition, vrai, faux)', desc: 'Condition logique' },
                                       { name: 'SOMME', syntax: 'SOMME(v1, v2...)', desc: 'Additionne les valeurs' },
                                       { name: 'MOYENNE', syntax: 'MOYENNE(v1, v2...)', desc: 'Moyenne des valeurs' },
                                       { name: 'ARRONDI', syntax: 'ARRONDI(nombre, décimales)', desc: 'Arrondit un nombre' },
                                       { name: 'MIN', syntax: 'MIN(v1, v2...)', desc: 'Valeur minimale' },
                                       { name: 'MAX', syntax: 'MAX(v1, v2...)', desc: 'Valeur maximale' },
                                       { name: 'ABS', syntax: 'ABS(nombre)', desc: 'Valeur absolue' },
                                    ].map(fn => (
                                       <button key={fn.name} onClick={() => insertIntoFormula(`${fn.name}(`)} className="w-full text-left px-2 py-1.5 bg-white border border-slate-200 rounded hover:border-indigo-300 group">
                                          <div className="flex justify-between items-center"><span className="text-xs font-bold text-indigo-700 font-mono">{fn.name}</span><span className="text-xs text-slate-400 font-mono">{fn.syntax}</span></div>
                                          <div className="text-xs text-slate-500 mt-0.5">{fn.desc}</div>
                                       </button>
                                    ))}
                                 </div>
                              )}
                           </div>
                        </div>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="block text-xs font-bold text-slate-600 mb-1">Type de résultat</label>
                           <select className="block w-full rounded-md border-slate-300 text-sm p-1 bg-white focus:ring-indigo-500 focus:border-indigo-500" value={newField.outputType} onChange={e => setNewField({ ...newField, outputType: e.target.value as any })}>
                              <option value="number">Nombre</option>
                              <option value="text">Texte</option>
                              <option value="boolean">Vrai/Faux</option>
                           </select>
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-slate-600 mb-1">Unité (opt)</label>
                           <input type="text" className="block w-full rounded-md border-slate-300 text-sm p-1.5 bg-white focus:ring-indigo-500 focus:border-indigo-500" placeholder="Ex: €" value={newField.unit} onChange={e => setNewField({ ...newField, unit: e.target.value })} />
                        </div>
                     </div>
                     <div className={`p-3 rounded border ${previewResult?.error ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'} transition-colors`}>
                        <div className="text-xs font-bold uppercase mb-1 flex justify-between"><span className={previewResult?.error ? 'text-red-700' : 'text-green-700'}>{previewResult?.error ? 'Erreur' : 'Aperçu (1ère ligne)'}</span></div>
                        <div className={`text-sm font-mono ${previewResult?.error ? 'text-red-800' : 'text-green-900 font-bold'}`}>{previewResult ? (previewResult.error || String(previewResult.value)) : '...'}</div>
                     </div>

                     {/* Existing Fields Section */}
                     <div className="mt-4 pt-4 border-t border-slate-100">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Champs existants ({calculatedFields.length})</label>
                        <div className="space-y-2">
                           {calculatedFields.length === 0 ? (
                              <p className="text-xs text-slate-400 italic">Aucun champ calculé</p>
                           ) : (
                              calculatedFields.map(cf => (
                                 <div key={cf.id} className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-200 hover:border-indigo-300 transition-colors group">
                                    <div className="min-w-0 flex-1">
                                       <div className="text-xs font-bold text-slate-700 truncate">{cf.name}</div>
                                       <div className="text-[10px] text-slate-400 font-mono truncate">{cf.formula}</div>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                       <button onClick={() => handleEditCalculatedField(cf)} className="p-1 hover:bg-indigo-100 text-indigo-600 rounded" title="Modifier"><Calculator className="w-3.5 h-3.5" /></button>
                                       <button onClick={() => removeCalculatedField(currentDataset.id, cf.id)} className="p-1 hover:bg-red-100 text-red-600 rounded" title="Supprimer"><Trash2 className="w-3.5 h-3.5" /></button>
                                    </div>
                                 </div>
                              ))
                           )}
                        </div>
                     </div>
                  </div>
                  <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
                     <Button variant="outline" onClick={() => { setIsCalcDrawerOpen(false); setEditingFieldId(null); setNewField({ name: '', formula: '', outputType: 'number', unit: '' }); }}>Annuler</Button>
                     <Button onClick={handleAddCalculatedField} disabled={!newField.name || !newField.formula || !!previewResult?.error}>
                        {editingFieldId ? 'Mettre à jour' : 'Créer le champ'}
                     </Button>
                  </div>
               </div>
            )}

            {/* CONDITIONAL FORMATTING DRAWER */}
            {isFormatDrawerOpen && (
               <>
                  <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity" onClick={() => setIsFormatDrawerOpen(false)} />
                  <div className="fixed inset-y-0 right-0 w-full md:w-[500px] bg-white shadow-2xl flex flex-col z-50 animate-in slide-in-from-right duration-300 border-l border-slate-200">
                     <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-purple-50/50">
                        <div><h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Palette className="w-5 h-5 text-purple-600" /> Formatage Conditionnel</h3><p className="text-sm text-slate-500">Appliquez des styles selon des règles</p></div>
                        <button onClick={() => setIsFormatDrawerOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-white rounded-full transition-colors"><X className="w-5 h-5" /></button>
                     </div>
                     <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-8">
                        <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Appliquer sur la colonne</label>
                           <select className="w-full p-2.5 border border-slate-300 rounded-md bg-white focus:ring-purple-500 focus:border-purple-500 text-sm" value={selectedFormatCol} onChange={e => setSelectedFormatCol(e.target.value)}>
                              {currentDataset.fields.map(f => <option key={f} value={f}>{f}</option>)}
                           </select>
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Règles existantes</label>
                           <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar bg-slate-50 p-2 rounded border border-slate-200 min-h-[60px]">
                              {(currentDataset.fieldConfigs?.[selectedFormatCol]?.conditionalFormatting || []).length === 0 ? <div className="text-xs text-slate-400 italic text-center py-4">Aucune règle définie pour cette colonne.</div> : (currentDataset.fieldConfigs?.[selectedFormatCol]?.conditionalFormatting || []).map(rule => (
                                 <div key={rule.id} className="flex items-center justify-between bg-white p-2 rounded border border-slate-200 shadow-sm text-xs">
                                    <div className="flex items-center gap-2 flex-wrap"><span className="font-mono bg-slate-100 px-1 rounded text-slate-600">{rule.operator === 'gt' ? '>' : rule.operator === 'lt' ? '<' : rule.operator === 'contains' ? 'contient' : '='} {rule.value}</span><ArrowRight className="w-3 h-3 text-slate-400" /><span className={`px-2 py-0.5 rounded ${rule.style.color} ${rule.style.backgroundColor} ${rule.style.fontWeight}`}>Exemple</span></div>
                                    <button onClick={() => handleRemoveConditionalRule(selectedFormatCol, rule.id)} className="text-slate-400 hover:text-red-500 p-1"><Trash2 className="w-4 h-4" /></button>
                                 </div>
                              ))}
                           </div>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 space-y-4">
                           <div className="text-sm font-bold text-purple-800 flex items-center gap-2"><Plus className="w-4 h-4" /> Nouvelle règle</div>
                           <div className="flex gap-2">
                              <select className="w-1/3 p-2 text-xs border-purple-200 rounded focus:ring-purple-500" value={newRule.operator} onChange={e => setNewRule({ ...newRule, operator: e.target.value as any })}>
                                 <option value="gt">Supérieur à (&gt;)</option>
                                 <option value="lt">Inférieur à (&lt;)</option>
                                 <option value="eq">Égal à (=)</option>
                                 <option value="contains">Contient</option>
                                 <option value="empty">Est vide</option>
                              </select>
                              {newRule.operator !== 'empty' && <input type={newRule.operator === 'contains' ? 'text' : 'number'} className="flex-1 p-2 text-xs border-purple-200 rounded focus:ring-purple-500" placeholder="Valeur..." value={newRule.value} onChange={e => setNewRule({ ...newRule, value: e.target.value })} />}
                           </div>
                           <div className="space-y-2">
                              <span className="text-xs text-purple-800 font-bold">Style à appliquer :</span>
                              <div className="grid grid-cols-2 gap-2">
                                 <select className="p-2 text-xs border-purple-200 rounded focus:ring-purple-500" value={newRule.style?.color} onChange={e => setNewRule({ ...newRule, style: { ...newRule.style, color: e.target.value } })}>
                                    <option value="text-slate-900">Texte Noir</option>
                                    <option value="text-red-600">Texte Rouge</option>
                                    <option value="text-green-600">Texte Vert</option>
                                    <option value="text-brand-600">Texte Bleu</option>
                                    <option value="text-orange-600">Texte Orange</option>
                                 </select>
                                 <select className="p-2 text-xs border-purple-200 rounded focus:ring-purple-500" value={newRule.style?.backgroundColor} onChange={e => setNewRule({ ...newRule, style: { ...newRule.style, backgroundColor: e.target.value } })}>
                                    <option value="">Fond (Aucun)</option>
                                    <option value="bg-red-100">Fond Rouge</option>
                                    <option value="bg-green-100">Fond Vert</option>
                                    <option value="bg-brand-100">Fond Bleu</option>
                                    <option value="bg-yellow-100">Fond Jaune</option>
                                 </select>
                              </div>
                              <button onClick={() => setNewRule({ ...newRule, style: { ...newRule.style, fontWeight: newRule.style?.fontWeight === 'font-bold' ? 'font-normal' : 'font-bold' } })} className={`w-full py-2 border rounded text-xs font-bold transition-colors ${newRule.style?.fontWeight === 'font-bold' ? 'bg-purple-200 border-purple-300 text-purple-800' : 'bg-white border-purple-200 text-slate-500'}`}>{newRule.style?.fontWeight === 'font-bold' ? 'Gras (Activé)' : 'Gras (Désactivé)'}</button>
                           </div>
                           <button onClick={handleAddConditionalRule} className="w-full py-2 bg-purple-600 text-white text-sm font-bold rounded shadow-sm hover:bg-purple-700 transition-colors">Ajouter cette règle</button>
                        </div>
                     </div>
                  </div>
               </>
            )}

            {/* VLOOKUP / ENRICHMENT DRAWER */}
            {isVlookupDrawerOpen && (
               <>
                  <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity" onClick={() => setIsVlookupDrawerOpen(false)} />
                  <div className="fixed inset-y-0 right-0 w-full md:w-[500px] bg-white shadow-2xl flex flex-col z-50 animate-in slide-in-from-right duration-300 border-l border-slate-200">
                     <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-teal-50/50">
                        <div>
                           <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                              <LinkIcon className="w-5 h-5 text-teal-600" /> RECHERCHEV (VLOOKUP)
                           </h3>
                           <p className="text-sm text-slate-500">Enrichir avec des données d'une autre source</p>
                        </div>
                        <button onClick={() => setIsVlookupDrawerOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-white rounded-full transition-colors">
                           <X className="w-5 h-5" />
                        </button>
                     </div>

                     <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-6">
                        {/* Target Dataset */}
                        <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                              1. Dataset source (où chercher les données)
                           </label>
                           <select
                              className="w-full p-2.5 border border-slate-300 rounded-md bg-white focus:ring-teal-500 focus:border-teal-500 text-sm"
                              value={vlookupConfig.targetDatasetId}
                              onChange={(e) => setVlookupConfig({ ...vlookupConfig, targetDatasetId: e.target.value, secondaryKey: '', columnsToAdd: [] })}
                           >
                              <option value="">-- Sélectionner un dataset --</option>
                              {datasets.filter(d => d.id !== currentDataset?.id).map(ds => (
                                 <option key={ds.id} value={ds.id}>{ds.name}</option>
                              ))}
                           </select>
                        </div>

                        {/* Join Keys */}
                        {vlookupConfig.targetDatasetId && (
                           <>
                              <div>
                                 <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                                    2. Clé de jointure dans {currentDataset?.name}
                                 </label>
                                 <select
                                    className="w-full p-2.5 border border-slate-300 rounded-md bg-white focus:ring-teal-500 focus:border-teal-500 text-sm"
                                    value={vlookupConfig.primaryKey}
                                    onChange={(e) => setVlookupConfig({ ...vlookupConfig, primaryKey: e.target.value })}
                                 >
                                    <option value="">-- Sélectionner un champ --</option>
                                    {currentDataset?.fields.map(f => (
                                       <option key={f} value={f}>{f}</option>
                                    ))}
                                 </select>
                              </div>

                              <div>
                                 <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                                    3. Clé de jointure dans {datasets.find(d => d.id === vlookupConfig.targetDatasetId)?.name}
                                 </label>
                                 <select
                                    className="w-full p-2.5 border border-slate-300 rounded-md bg-white focus:ring-teal-500 focus:border-teal-500 text-sm"
                                    value={vlookupConfig.secondaryKey}
                                    onChange={(e) => setVlookupConfig({ ...vlookupConfig, secondaryKey: e.target.value })}
                                 >
                                    <option value="">-- Sélectionner un champ --</option>
                                    {datasets.find(d => d.id === vlookupConfig.targetDatasetId)?.fields.map(f => (
                                       <option key={f} value={f}>{f}</option>
                                    ))}
                                 </select>
                              </div>
                           </>
                        )}

                        {/* Columns to add */}
                        {vlookupConfig.secondaryKey && (
                           <>
                              <div>
                                 <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                                    4. Colonnes à récupérer
                                 </label>
                                 <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar bg-slate-50 p-3 rounded border border-slate-200">
                                    {datasets.find(d => d.id === vlookupConfig.targetDatasetId)?.fields.map(f => (
                                       <label key={f} className="flex items-center gap-2 cursor-pointer hover:bg-white p-2 rounded transition-colors">
                                          <input
                                             type="checkbox"
                                             checked={vlookupConfig.columnsToAdd.includes(f)}
                                             onChange={(e) => {
                                                if (e.target.checked) {
                                                   setVlookupConfig({ ...vlookupConfig, columnsToAdd: [...vlookupConfig.columnsToAdd, f] });
                                                } else {
                                                   setVlookupConfig({ ...vlookupConfig, columnsToAdd: vlookupConfig.columnsToAdd.filter(c => c !== f) });
                                                }
                                             }}
                                             className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                          />
                                          <span className="text-sm text-slate-700">{f}</span>
                                       </label>
                                    ))}
                                 </div>
                                 {vlookupConfig.columnsToAdd.length > 0 && (
                                    <div className="mt-2 text-xs text-teal-600 font-medium">
                                       {vlookupConfig.columnsToAdd.length} colonne(s) sélectionnée(s)
                                    </div>
                                 )}
                              </div>

                              <div>
                                 <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                                    5. Nom de la nouvelle colonne
                                 </label>
                                 <input
                                    type="text"
                                    className="w-full p-2.5 border border-slate-300 rounded-md bg-white focus:ring-teal-500 focus:border-teal-500 text-sm"
                                    placeholder="Ex: Informations Client"
                                    value={vlookupConfig.newColumnName}
                                    onChange={(e) => setVlookupConfig({ ...vlookupConfig, newColumnName: e.target.value })}
                                 />
                                 <p className="mt-2 text-xs text-slate-500">
                                    {vlookupConfig.columnsToAdd.length > 1
                                       ? "Les valeurs des colonnes seront concaténées avec ' | '"
                                       : "La valeur de la colonne sera copiée directement"}
                                 </p>
                              </div>
                           </>
                        )}

                        {/* Info box */}
                        <div className="bg-brand-50 border border-brand-200 rounded-lg p-4">
                           <div className="flex gap-3">
                              <AlertTriangle className="w-5 h-5 text-brand-600 flex-shrink-0 mt-0.5" />
                              <div className="text-xs text-brand-800 space-y-1">
                                 <p className="font-bold">Comment ça fonctionne ?</p>
                                 <p>Cette fonction va chercher les valeurs dans le dataset source en utilisant les clés de jointure, et ajouter une nouvelle colonne à vos données actuelles.</p>
                                 <p className="font-semibold mt-2">⚠️ Cette opération modifie définitivement votre dataset.</p>
                              </div>
                           </div>
                        </div>
                     </div>

                     <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setIsVlookupDrawerOpen(false)}>Annuler</Button>
                        <Button
                           onClick={handleApplyVlookup}
                           disabled={!vlookupConfig.targetDatasetId || !vlookupConfig.primaryKey || !vlookupConfig.secondaryKey || vlookupConfig.columnsToAdd.length === 0 || !vlookupConfig.newColumnName.trim()}
                           className="bg-teal-600 hover:bg-teal-700"
                        >
                           Enrichir les données
                        </Button>
                     </div>
                  </div>
               </>
            )}
         </div>

         {/* DETAILS DRAWER */}
         {isDrawerOpen && selectedRow && (
            <div className="fixed inset-y-0 right-0 w-full md:w-[600px] bg-white shadow-2xl transform transition-transform duration-300 z-40 flex flex-col border-l border-slate-200">
               <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-start">
                  <div><div className="flex items-center gap-2 mb-1"><History className="w-5 h-5 text-brand-600" /><h3 className="text-lg font-bold text-slate-800">Fiche Détail & Historique</h3></div><p className="text-xs text-slate-500">Suivi de l'entité via la clé : <strong className="text-slate-700">{trackingKey}</strong></p></div>
                  <button onClick={() => setIsDrawerOpen(false)} className="text-slate-400 hover:text-slate-600 bg-white rounded-full p-1 shadow-sm border border-slate-200"><X className="w-5 h-5" /></button>
               </div>
               <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-3"><span className="text-xs font-bold text-slate-500 uppercase">Clé de réconciliation :</span><select className="text-xs bg-white border-slate-300 rounded py-1 px-2 focus:ring-brand-500 focus:border-brand-500" value={trackingKey} onChange={(e) => setTrackingKey(e.target.value)}>{currentDataset.fields.map(f => <option key={f} value={f}>{f}</option>)}</select></div>
               <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-50/50 space-y-8">
                  <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                     <div className="bg-brand-50 px-4 py-2 border-b border-brand-100 flex justify-between items-center"><span className="text-xs font-bold text-brand-700 uppercase tracking-wider">État Actuel</span><span className="text-xs bg-white px-2 py-0.5 rounded-full border border-brand-200 text-brand-600 font-mono">{formatDateFr(selectedRow._importDate)}</span></div>
                     <div className="p-4 grid grid-cols-2 gap-4">
                        {Object.entries(selectedRow).filter(([k]) => !k.startsWith('_') && k !== 'id').map(([key, val]) => (
                           <div key={key} className="space-y-1"><dt className="text-xs font-medium text-slate-400 uppercase">{key}</dt><dd className="text-sm font-medium text-slate-800 break-words bg-slate-50 p-2 rounded border border-slate-100">{val !== undefined && val !== null && val !== '' ? String(val) : <span className="text-slate-300 italic">Vide</span>}</dd></div>
                        ))}
                     </div>
                  </div>
                  <div className="relative">
                     <div className="absolute top-0 bottom-0 left-4 w-px bg-slate-200"></div>
                     <h4 className="text-sm font-bold text-slate-700 mb-4 ml-10 flex items-center gap-2"><GitCommit className="w-4 h-4" /> Chronologie des modifications</h4>
                     <div className="space-y-6">
                        {historyData.map((histRow, idx) => {
                           const prevRow = historyData[idx + 1];
                           const changes = prevRow ? currentDataset.fields.filter(f => String(histRow[f]) !== String(prevRow[f])) : [];
                           const isCreation = !prevRow;
                           return (
                              <div key={histRow._batchId} className="relative pl-10 group">
                                 <div className={`absolute left-[13px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm z-10 ${isCreation ? 'bg-green-500' : (changes.length > 0 ? 'bg-amber-500' : 'bg-slate-300')}`}></div>
                                 <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm transition-shadow hover:shadow-md">
                                    <div className="flex justify-between items-start mb-3">
                                       <div><div className="text-xs font-bold text-slate-500">{formatDateFr(histRow._importDate)}</div><div className="text-xs text-slate-400 font-mono mt-0.5">Batch: {histRow._batchId}</div></div>
                                       {isCreation ? <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full uppercase">Création</span> : changes.length > 0 ? <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full uppercase">{changes.length} Modif(s)</span> : <span className="px-2 py-1 bg-slate-100 text-slate-500 text-xs font-bold rounded-full uppercase">Inchangé</span>}
                                    </div>
                                    {changes.length > 0 && prevRow && (
                                       <div className="space-y-2 bg-amber-50/50 p-3 rounded border border-amber-100/50">
                                          {changes.map(field => (
                                             <div key={field} className="text-xs grid grid-cols-[1fr,auto,1fr] gap-2 items-center">
                                                <div className="text-right text-slate-500 line-through decoration-red-400 decoration-2">{String(prevRow[field] || 'Vide')}</div>
                                                <div className="text-center text-slate-300"><ArrowRight className="w-3 h-3 inline" /></div>
                                                <div className="font-bold text-slate-800">{String(histRow[field] || 'Vide')}</div>
                                                <div className="col-span-3 text-xs text-slate-400 uppercase tracking-wider text-center mt-0.5">{field}</div>
                                             </div>
                                          ))}
                                       </div>
                                    )}
                                 </div>
                              </div>
                           );
                        })}
                     </div>
                  </div>
               </div>
            </div>
         )}

         {/* COLUMN REORDERING DRAWER */}
         {isColumnDrawerOpen && currentDataset && (
            <>
               <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity" onClick={() => setIsColumnDrawerOpen(false)} />
               <div className="fixed inset-y-0 right-0 w-full md:w-[400px] bg-white shadow-2xl flex flex-col z-50 animate-in slide-in-from-right duration-300 border-l border-slate-200">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                     <div>
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                           <Columns className="w-5 h-5 text-brand-600" /> Gestion des colonnes
                        </h3>
                        <p className="text-sm text-slate-500">Réorganisez l'ordre d'affichage</p>
                     </div>
                     <button onClick={() => setIsColumnDrawerOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-white rounded-full transition-colors">
                        <X className="w-5 h-5" />
                     </button>
                  </div>

                  <div className="p-4 bg-amber-50 border-b border-amber-100 flex gap-3">
                     <Info className="w-5 h-5 text-amber-600 shrink-0" />
                     <p className="text-xs text-amber-800 font-medium">
                        Utilisez les flèches pour changer l'ordre. Cet ordre sera conservé dans toutes les vues utilisant ce dataset.
                     </p>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-1">
                     {currentDataset.fields.map((field, idx) => (
                        <div
                           key={field}
                           className="flex items-center gap-3 p-2 bg-white border border-slate-200 rounded-lg hover:border-brand-300 transition-all group"
                        >
                           <div className="flex flex-col gap-1">
                              <button
                                 disabled={idx === 0}
                                 onClick={() => {
                                    const newFields = [...currentDataset.fields];
                                    [newFields[idx], newFields[idx-1]] = [newFields[idx-1], newFields[idx]];
                                    reorderDatasetFields(currentDataset.id, newFields);
                                 }}
                                 className="text-slate-400 hover:text-brand-600 disabled:opacity-20"
                              >
                                 <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                 disabled={idx === currentDataset.fields.length - 1}
                                 onClick={() => {
                                    const newFields = [...currentDataset.fields];
                                    [newFields[idx], newFields[idx+1]] = [newFields[idx+1], newFields[idx]];
                                    reorderDatasetFields(currentDataset.id, newFields);
                                 }}
                                 className="text-slate-400 hover:text-brand-600 disabled:opacity-20"
                              >
                                 <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                           </div>
                           <span className="text-sm font-medium text-slate-700 truncate flex-1">{field}</span>
                           <div className="text-[10px] font-bold text-slate-300 uppercase px-1.5 py-0.5 border border-slate-100 rounded">
                              Pos. {idx + 1}
                           </div>
                        </div>
                     ))}
                  </div>

                  <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
                     <Button onClick={() => setIsColumnDrawerOpen(false)} className="w-full">
                        Fermer
                     </Button>
                  </div>
               </div>
            </>
         )}
      </div>
   );
};
