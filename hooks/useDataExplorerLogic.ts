import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useData } from '../context/DataContext';
import { useHistory } from './useHistory';
import {
  formatDateFr,
  evaluateFormula,
  generateId,
  parseSmartNumber,
  formatNumberValue,
  getGroupedLabel
} from '../utils';
import { CalculatedField, ConditionalRule, FieldConfig, DataRow } from '../types';

export interface ExplorerRow extends DataRow {
  _importDate: string;
  _batchId: string;
  _searchIndex: string;
}

interface ExplorerConfig {
  searchTerm: string;
  sortConfig: { key: string; direction: 'asc' | 'desc' } | null;
  showFilters: boolean;
  columnFilters: Record<string, string>;
  showColumnBorders: boolean;
  trackingKey: string;
}

const DEFAULT_CONFIG: ExplorerConfig = {
  searchTerm: '',
  sortConfig: null,
  showFilters: false,
  columnFilters: {},
  showColumnBorders: true,
  trackingKey: ''
};

export const useDataExplorerLogic = () => {
  const {
    currentDataset,
    batches,
    datasets,
    currentDatasetId,
    switchDataset,
    addCalculatedField,
    removeCalculatedField,
    updateCalculatedField,
    updateDatasetConfigs,
    deleteBatch,
    deleteDatasetField,
    deleteBatchRow,
    updateRows,
    renameDatasetField,
    addFieldToDataset,
    enrichBatchesWithLookup,
    reorderDatasetFields,
    lastDataExplorerState,
    saveDataExplorerState
  } = useData();

  const location = useLocation();
  const navigate = useNavigate();

  // --- CONFIGURATION WITH HISTORY ---
  const {
    state: config,
    set: setConfig,
    undo,
    redo,
    canUndo,
    canRedo,
    clear: clearHistory
  } = useHistory<ExplorerConfig>(DEFAULT_CONFIG);

  const updateConfig = useCallback(
    (updates: Partial<ExplorerConfig>) => {
      setConfig({ ...config, ...updates });
    },
    [config, setConfig]
  );

  const {
    searchTerm,
    sortConfig,
    showFilters,
    columnFilters,
    showColumnBorders,
    trackingKey
  } = config;

  // --- UI State ---
  const [selectedCol, setSelectedCol] = useState<string | null>(null);
  const [renamingValue, setRenamingValue] = useState<string>('');
  const [selectedRow, setSelectedRow] = useState<ExplorerRow | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCalcModalOpen, setIsCalcModalOpen] = useState(false);
  const [editingCalcField, setEditingCalcField] = useState<CalculatedField | null>(null);
  const [isFormatDrawerOpen, setIsFormatDrawerOpen] = useState(false);
  const [selectedFormatCol, setSelectedFormatCol] = useState<string>('');
  const [newRule, setNewRule] = useState<Partial<ConditionalRule>>({
    operator: 'lt',
    value: 0,
    style: { color: 'text-red-600', fontWeight: 'font-bold' }
  });
  const [deleteConfirmRow, setDeleteConfirmRow] = useState<ExplorerRow | null>(null);
  const [blendingConfig, setBlendingConfig] = useState<any>(null);
  const [isColumnDrawerOpen, setIsColumnDrawerOpen] = useState(false);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [resizeStartX, setResizeStartX] = useState<number>(0);
  const [resizeStartWidth, setResizeStartWidth] = useState<number>(0);

  const [isEditMode, setIsEditMode] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<
    Record<string, Record<string, Record<string, string | number | boolean>>>
  >({});
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

  // --- Effects ---
  useEffect(() => {
    if (location.state) {
      if (location.state.prefilledFilters) {
        updateConfig({
          columnFilters: location.state.prefilledFilters,
          searchTerm: '',
          sortConfig: null,
          showFilters: true
        });
      }
      if (location.state.blendingConfig) setBlendingConfig(location.state.blendingConfig);
      else setBlendingConfig(null);
    }
  }, [location.state, updateConfig]);

  useEffect(() => {
    if (currentDataset && (currentDataset?.fields?.length || 0) > 0 && !trackingKey) {
      const candidates = ['email', 'id', 'reference', 'ref', 'code', 'matricule', 'nom'];
      const found = currentDataset.fields.find((f) => candidates.includes(f.toLowerCase()));
      updateConfig({ trackingKey: found || currentDataset.fields[0] });
    }
  }, [currentDataset, trackingKey, updateConfig]);

  useEffect(() => {
    if (currentDataset && !selectedFormatCol && currentDataset?.fields?.length > 0) {
      setSelectedFormatCol(currentDataset.fields[0]);
    }
  }, [currentDataset, selectedFormatCol]);

  useEffect(() => {
    if (selectedCol) setRenamingValue(selectedCol);
  }, [selectedCol]);

  useEffect(() => {
    if (
      lastDataExplorerState &&
      currentDataset &&
      lastDataExplorerState.datasetId === currentDataset.id
    ) {
      clearHistory({
        searchTerm: lastDataExplorerState.searchTerm || '',
        sortConfig: lastDataExplorerState.sortConfig || null,
        showFilters: lastDataExplorerState.showFilters || false,
        columnFilters: lastDataExplorerState.columnFilters || {},
        showColumnBorders:
          lastDataExplorerState.showColumnBorders !== undefined
            ? lastDataExplorerState.showColumnBorders
            : true,
        trackingKey: lastDataExplorerState.trackingKey || ''
      });
      setColumnWidths(lastDataExplorerState.columnWidths || {});
      if (lastDataExplorerState.blendingConfig)
        setBlendingConfig(lastDataExplorerState.blendingConfig);
    }
  }, [currentDataset, clearHistory, lastDataExplorerState]);

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
  }, [
    currentDataset,
    searchTerm,
    sortConfig,
    columnFilters,
    showFilters,
    columnWidths,
    showColumnBorders,
    trackingKey,
    blendingConfig,
    saveDataExplorerState
  ]);

  useEffect(() => {
    if (!resizingColumn) return;
    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - resizeStartX;
      const newWidth = Math.max(80, resizeStartWidth + diff);
      setColumnWidths((prev) => ({ ...prev, [resizingColumn]: newWidth }));
    };
    const handleMouseUp = () => setResizingColumn(null);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingColumn, resizeStartX, resizeStartWidth]);

  // --- Handlers ---
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    updateConfig({ sortConfig: { key, direction } });
  };

  const handleHeaderClick = (field: string) => {
    setSelectedCol(selectedCol === field ? null : field);
    handleSort(field);
  };

  const handleColumnFilterChange = (key: string, value: string) => {
    updateConfig({ columnFilters: { ...columnFilters, [key]: value } });
  };

  const clearFilters = () => {
    updateConfig({
      columnFilters: {},
      searchTerm: '',
      sortConfig: null
    });
  };

  const handleResizeStart = (e: React.MouseEvent, columnKey: string, currentWidth: number) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingColumn(columnKey);
    setResizeStartX(e.clientX);
    setResizeStartWidth(currentWidth);
  };

  const handleRowClick = (row: ExplorerRow) => {
    if (isEditMode) return;
    setSelectedRow(row);
    setIsDrawerOpen(true);
  };

  const handleCellEdit = (
    batchId: string,
    rowId: string,
    field: string,
    value: string | number | boolean
  ) => {
    setPendingChanges((prev) => {
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

  const handleCancelEdits = () => {
    setIsEditMode(false);
    setPendingChanges({});
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

  const handleSaveCalculatedField = (field: Partial<CalculatedField>) => {
    if (!currentDataset) return;
    if (editingCalcField) {
      const oldName = editingCalcField.name;
      const newName = field.name || oldName;
      updateCalculatedField(currentDataset.id, editingCalcField.id, field);
      if (newName !== oldName) {
        if (sortConfig?.key === oldName) updateConfig({ sortConfig: { ...sortConfig, key: newName } });
        if (columnFilters[oldName]) {
          const newFilters = { ...columnFilters };
          newFilters[newName] = newFilters[oldName];
          delete newFilters[oldName];
          updateConfig({ columnFilters: newFilters });
        }
        if (selectedCol === oldName) setSelectedCol(newName);
      }
    } else {
      addCalculatedField(currentDataset.id, {
        ...field,
        id: generateId(),
        outputType: field.outputType || 'number'
      } as CalculatedField);
    }
    setEditingCalcField(null);
  };

  const handleEditCalculatedField = (field: CalculatedField) => {
    setEditingCalcField(field);
    setIsCalcModalOpen(true);
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
    updateDatasetConfigs(currentDataset.id, {
      [selectedFormatCol]: {
        ...currentConfig,
        conditionalFormatting: [...(currentConfig.conditionalFormatting || []), rule]
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
        conditionalFormatting: (currentConfig.conditionalFormatting || []).filter(
          (r) => r.id !== ruleId
        )
      }
    });
  };

  const handleFormatChange = (key: keyof FieldConfig, value: any) => {
    if (!currentDataset || !selectedCol) return;
    const currentConfig = currentDataset.fieldConfigs?.[selectedCol] || { type: 'number' };
    updateDatasetConfigs(currentDataset.id, { [selectedCol]: { ...currentConfig, [key]: value } });
  };

  const handleRenameColumn = () => {
    if (!currentDataset || !selectedCol || !renamingValue.trim() || selectedCol === renamingValue)
      return;
    const calcField = currentDataset.calculatedFields?.find((f) => f.name === selectedCol);
    if (calcField) {
      updateCalculatedField(currentDataset.id, calcField.id, { name: renamingValue });
      if (sortConfig?.key === selectedCol) updateConfig({ sortConfig: { ...sortConfig, key: renamingValue } });
      if (columnFilters[selectedCol]) {
        const newFilters = { ...columnFilters };
        newFilters[renamingValue] = newFilters[selectedCol];
        delete newFilters[selectedCol];
        updateConfig({ columnFilters: newFilters });
      }
    } else {
      renameDatasetField(currentDataset.id, selectedCol, renamingValue);
    }
    setSelectedCol(renamingValue);
  };

  const handleDeleteColumn = () => {
    if (!currentDataset || !selectedCol) return;
    const isCalculated = currentDataset.calculatedFields?.find((f) => f.name === selectedCol);
    if (isCalculated) {
      if (window.confirm(`Supprimer le champ calculé "${selectedCol}" ?`)) {
        removeCalculatedField(currentDataset.id, isCalculated.id);
        setSelectedCol(null);
      }
    } else {
      if (
        window.confirm(
          `ATTENTION : Supprimer la colonne "${selectedCol}" effacera définitivement cette donnée. Continuer ?`
        )
      ) {
        deleteDatasetField(currentDataset.id, selectedCol);
        setSelectedCol(null);
      }
    }
  };

  const handleApplyVlookup = () => {
    if (
      !currentDataset ||
      !vlookupConfig.targetDatasetId ||
      !vlookupConfig.primaryKey ||
      !vlookupConfig.secondaryKey ||
      vlookupConfig.columnsToAdd.length === 0 ||
      !vlookupConfig.newColumnName.trim()
    ) {
      alert('Veuillez remplir tous les champs requis');
      return;
    }
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
    addFieldToDataset(currentDataset.id, vlookupConfig.newColumnName, { type: 'text' });
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

  // --- Data Processing ---
  const allRows = useMemo<ExplorerRow[]>(() => {
    if (!currentDataset) return [];
    const calcFields = currentDataset?.calculatedFields || [];
    let rows = (batches || [])
      .filter((b) => b.datasetId === currentDataset.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .flatMap((batch) =>
        (batch.rows || []).map((r) => {
          const extendedRow: any = { ...r, _importDate: batch.date, _batchId: batch.id };
          calcFields.forEach((cf) => {
            extendedRow[cf.name] = evaluateFormula(extendedRow, cf.formula, cf.outputType);
          });
          return extendedRow as ExplorerRow;
        })
      );

    if (
      blendingConfig &&
      blendingConfig.secondaryDatasetId &&
      blendingConfig.joinKeyPrimary &&
      blendingConfig.joinKeySecondary
    ) {
      const secDS = datasets.find((d) => d.id === blendingConfig.secondaryDatasetId);
      if (secDS) {
        const secBatches = batches
          .filter((b) => b.datasetId === blendingConfig.secondaryDatasetId)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        if (secBatches.length > 0) {
          const secBatch = secBatches[secBatches.length - 1];
          const lookup = new Map<string, any>();
          secBatch.rows.forEach((r) => {
            const k = String(r[blendingConfig.joinKeySecondary]).trim();
            if (k) lookup.set(k, r);
          });
          rows = (rows || []).map((row) => {
            const k = String(row[blendingConfig.joinKeyPrimary]).trim();
            const match = lookup.get(k);
            if (match) {
              const prefixedMatch: any = {};
              Object.keys(match || {}).forEach((key) => {
                if (key !== 'id') prefixedMatch[`[${secDS.name}] ${key}`] = match[key];
              });
              return { ...row, ...prefixedMatch };
            }
            return row;
          });
        }
      }
    }

    const searchableKeys =
      rows.length > 0
        ? Object.keys(rows[0]).filter((k) => !k.startsWith('_') || k === '_importDate')
        : [];
    return rows.map((row) => {
      const vals: string[] = [];
      searchableKeys.forEach((k) => {
        if (row[k] != null) vals.push(String(row[k]));
      });
      return { ...row, _searchIndex: vals.join(' ').toLowerCase() };
    });
  }, [currentDataset, batches, blendingConfig, datasets]);

  const displayFields = useMemo(() => {
    if (!currentDataset) return [];
    const primFields = [...(currentDataset.fields || [])];
    if (blendingConfig && blendingConfig.secondaryDatasetId) {
      const secDS = datasets.find((d) => d.id === blendingConfig.secondaryDatasetId);
      if (secDS) {
        const secFields = (secDS.fields || []).map((f) => `[${secDS.name}] ${f}`);
        const secCalcFields = (secDS.calculatedFields || []).map(
          (f) => `[${secDS.name}] ${f.name}`
        );
        return [...primFields, ...secFields, ...secCalcFields];
      }
    }
    return primFields;
  }, [currentDataset, blendingConfig, datasets]);

  const processedRows = useMemo<ExplorerRow[]>(() => {
    if (!currentDataset) return [];
    let data = [...allRows];
    const activeFilters = Object.entries(columnFilters)
      .filter(([_, v]) => v != null && v !== '')
      .map(([key, value]) => {
        let targetVal = String(value);
        let isExact = targetVal.startsWith('=');
        if (isExact) targetVal = targetVal.substring(1);
        return {
          key,
          targetVal,
          lowerFilter: targetVal.toLowerCase(),
          isExact,
          isEmpty: value === '__EMPTY__'
        };
      });
    const lowerSearchTerm = searchTerm.trim().toLowerCase();

    if (lowerSearchTerm || activeFilters.length > 0) {
      data = data.filter((row) => {
        if (lowerSearchTerm && !row._searchIndex.includes(lowerSearchTerm)) return false;
        for (let f of activeFilters) {
          const val = row[f.key];
          if (f.isEmpty) {
            if (val != null && val !== '') return false;
            continue;
          }
          if (f.key === '_batchId') {
            if (String(val) !== f.targetVal) return false;
            continue;
          }
          const valStr = String(val ?? '').toLowerCase();
          if (f.isExact) {
            let matched = valStr === f.lowerFilter;
            if (!matched && f.key.toLowerCase().includes('date')) {
              if (getGroupedLabel(valStr, 'month').toLowerCase() === f.lowerFilter) matched = true;
              else if (getGroupedLabel(valStr, 'year').toLowerCase() === f.lowerFilter)
                matched = true;
              else if (getGroupedLabel(valStr, 'quarter').toLowerCase() === f.lowerFilter)
                matched = true;
            }
            if (
              !matched &&
              f.key === '_importDate' &&
              (val === f.targetVal || formatDateFr(val as string) === f.targetVal)
            )
              matched = true;
            if (!matched) return false;
            continue;
          }
          if (f.key === '_importDate') {
            if (
              !formatDateFr(val as string)
                .toLowerCase()
                .includes(f.lowerFilter) &&
              !String(val).includes(f.lowerFilter)
            )
              return false;
            continue;
          }
          if (!valStr.includes(f.lowerFilter)) return false;
        }
        return true;
      });
    }
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
  }, [allRows, searchTerm, columnFilters, sortConfig, currentDataset]);

  const distributionData = useMemo(() => {
    if (!currentDataset || !selectedCol || processedRows.length === 0) return [];
    const counts: Record<string, number> = {};
    processedRows.forEach((row) => {
      let val =
        row[selectedCol] == null || row[selectedCol] === '' ? '(Vide)' : String(row[selectedCol]);
      counts[val] = (counts[val] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 15);
  }, [selectedCol, processedRows, currentDataset]);

  const rowVirtualizer = useVirtualizer({
    count: processedRows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 40,
    overscan: 10
  });

  const historyData = useMemo<ExplorerRow[]>(() => {
    if (!currentDataset || !selectedRow || !trackingKey) return [];
    const trackValue = selectedRow[trackingKey];
    if (trackValue == null || trackValue === '') return [selectedRow];
    const relevantBatches = batches
      .filter((b) => b.datasetId === currentDataset?.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const history: ExplorerRow[] = [];
    relevantBatches.forEach((batch) => {
      const match = batch.rows.find((r) => String(r[trackingKey]) === String(trackValue));
      if (match)
        history.push({ ...match, _importDate: batch.date, _batchId: batch.id } as ExplorerRow);
    });
    return history;
  }, [selectedRow, trackingKey, batches, currentDataset]);

  const getCellStyle = useCallback(
    (fieldName: string, value: any) => {
      if (!currentDataset?.fieldConfigs) return '';
      const rules = currentDataset.fieldConfigs[fieldName]?.conditionalFormatting;
      if (!rules || rules.length === 0) return '';
      const numValue = parseSmartNumber(value);
      for (const rule of rules) {
        const targetValue = Number(rule.value);
        let match = false;
        if (rule.operator === 'gt') match = numValue > targetValue;
        else if (rule.operator === 'lt') match = numValue < targetValue;
        else if (rule.operator === 'eq') match = String(value) === String(rule.value);
        else if (rule.operator === 'contains')
          match = String(value).toLowerCase().includes(String(rule.value).toLowerCase());
        else if (rule.operator === 'empty') match = value == null || value === '';
        if (match)
          return `${rule.style.color || ''} ${rule.style.backgroundColor || ''} ${rule.style.fontWeight || ''}`;
      }
      return '';
    },
    [currentDataset]
  );

  const handleExportFullCSV = () => {
    if (!currentDataset || processedRows.length === 0) return;
    const headers = [
      'Date import',
      'Id',
      ...displayFields,
      ...(currentDataset.calculatedFields || []).map((f) => f.name)
    ];
    const csvContent = [
      headers.join(';'),
      ...processedRows.map((row) => {
        return [
          row._importDate,
          row.id,
          ...displayFields.map((f) => {
            let val = row[f];
            let stringVal = val != null ? String(val) : '';
            if (stringVal.includes(';') || stringVal.includes('\n') || stringVal.includes('"'))
              stringVal = `"${stringVal.replace(/"/g, '""')}"`;
            return stringVal;
          }),
          ...(currentDataset.calculatedFields || []).map((f) =>
            row[f.name] != null ? String(row[f.name]) : ''
          )
        ].join(';');
      })
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `Export_${currentDataset.name}_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return {
    undo,
    redo,
    canUndo,
    canRedo,
    currentDataset,
    batches,
    datasets,
    currentDatasetId,
    switchDataset,
    searchTerm,
    setSearchTerm: (v: any) =>
      setConfig((prev) => ({
        ...prev,
        searchTerm: typeof v === 'function' ? v(prev.searchTerm) : v
      })),
    sortConfig,
    handleSort,
    showFilters,
    setShowFilters: (v: any) =>
      setConfig((prev) => ({
        ...prev,
        showFilters: typeof v === 'function' ? v(prev.showFilters) : v
      })),
    columnFilters,
    handleColumnFilterChange,
    handleHeaderClick,
    clearFilters,
    selectedCol,
    setSelectedCol,
    renamingValue,
    setRenamingValue,
    handleRenameColumn,
    handleDeleteColumn,
    selectedRow,
    setSelectedRow,
    isDrawerOpen,
    setIsDrawerOpen,
    trackingKey,
    setTrackingKey: (v: any) =>
      setConfig((prev) => ({
        ...prev,
        trackingKey: typeof v === 'function' ? v(prev.trackingKey) : v
      })),
    isCalcModalOpen,
    setIsCalcModalOpen,
    editingCalcField,
    setEditingCalcField,
    isFormatDrawerOpen,
    setIsFormatDrawerOpen,
    selectedFormatCol,
    setSelectedFormatCol,
    newRule,
    setNewRule,
    handleAddConditionalRule,
    handleRemoveConditionalRule,
    deleteConfirmRow,
    setDeleteConfirmRow,
    blendingConfig,
    isColumnDrawerOpen,
    setIsColumnDrawerOpen,
    tableContainerRef,
    columnWidths,
    handleResizeStart,
    showColumnBorders,
    setShowColumnBorders: (v: any) =>
      setConfig((prev) => ({
        ...prev,
        showColumnBorders: typeof v === 'function' ? v(prev.showColumnBorders) : v
      })),
    isEditMode,
    setIsEditMode,
    pendingChanges,
    handleCellEdit,
    handleSaveEdits,
    handleCancelEdits,
    isVlookupDrawerOpen,
    setIsVlookupDrawerOpen,
    vlookupConfig,
    setVlookupConfig,
    handleApplyVlookup,
    processedRows,
    allRows,
    displayFields,
    activeBatchFilter: columnFilters._batchId || null,
    rowVirtualizer,
    distributionData,
    historyData,
    getCellStyle,
    handleExportFullCSV,
    handleRowClick,
    handleSaveCalculatedField,
    handleEditCalculatedField,
    handleFormatChange,
    confirmDeleteRow: () => {
      if (deleteConfirmRow) {
        deleteBatchRow(deleteConfirmRow._batchId, deleteConfirmRow.id);
        setDeleteConfirmRow(null);
      }
    },
    reorderDatasetFields: (id: string, f: string[]) => reorderDatasetFields(id, f),
    deleteBatch: (id: string) => deleteBatch(id),
    navigate
  };
};
