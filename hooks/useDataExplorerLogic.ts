import { useMemo, useEffect, useRef, useReducer } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useData } from '../context/DataContext';
import {
    formatDateFr,
    evaluateFormula,
    generateId,
    parseSmartNumber,
    getGroupedLabel
} from '../utils';
import { CalculatedField, ConditionalRule, FieldConfig, DataRow, BlendingConfig } from '../types';

interface VLookupConfig {
    targetDatasetId: string;
    primaryKey: string;
    secondaryKey: string;
    columnsToAdd: string[];
    newColumnName: string;
}

type DataExplorerAction =
    | { type: 'SET_SEARCH_TERM'; payload: string }
    | { type: 'SET_SORT_CONFIG'; payload: { key: string; direction: 'asc' | 'desc' } | null }
    | { type: 'SET_SHOW_FILTERS'; payload: boolean }
    | { type: 'SET_COLUMN_FILTERS'; payload: Record<string, string> }
    | { type: 'UPDATE_COLUMN_FILTER'; payload: { key: string; value: string } }
    | { type: 'SET_SELECTED_COL'; payload: string | null }
    | { type: 'SET_RENAMING_VALUE'; payload: string }
    | { type: 'SET_SELECTED_ROW'; payload: (DataRow & { _importDate: string; _batchId: string }) | null }
    | { type: 'SET_DRAWER_OPEN'; payload: boolean }
    | { type: 'SET_TRACKING_KEY'; payload: string }
    | { type: 'SET_CALC_MODAL_OPEN'; payload: boolean }
    | { type: 'SET_EDITING_CALC_FIELD'; payload: CalculatedField | null }
    | { type: 'SET_FORMAT_DRAWER_OPEN'; payload: boolean }
    | { type: 'SET_SELECTED_FORMAT_COL'; payload: string }
    | { type: 'SET_NEW_RULE'; payload: Partial<ConditionalRule> }
    | { type: 'SET_DELETE_CONFIRM_ROW'; payload: DataRow | null }
    | { type: 'SET_BLENDING_CONFIG'; payload: BlendingConfig | null }
    | { type: 'SET_COLUMN_DRAWER_OPEN'; payload: boolean }
    | { type: 'SET_COLUMN_WIDTHS'; payload: Record<string, number> }
    | { type: 'UPDATE_COLUMN_WIDTH'; payload: { key: string; width: number } }
    | { type: 'SET_RESIZING_COLUMN'; payload: string | null }
    | { type: 'SET_RESIZE_START'; payload: { x: number; width: number } }
    | { type: 'SET_SHOW_BORDERS'; payload: boolean }
    | { type: 'SET_EDIT_MODE'; payload: boolean }
    | { type: 'SET_PENDING_CHANGES'; payload: Record<string, Record<string, DataRow>> }
    | { type: 'UPDATE_PENDING_CHANGE'; payload: { batchId: string; rowId: string; field: string; value: string | number | boolean } }
    | { type: 'SET_VLOOKUP_DRAWER_OPEN'; payload: boolean }
    | { type: 'SET_VLOOKUP_CONFIG'; payload: VLookupConfig }
    | { type: 'RESTORE_STATE'; payload: Partial<DataExplorerState> };

interface DataExplorerState {
    searchTerm: string;
    sortConfig: { key: string; direction: 'asc' | 'desc' } | null;
    showFilters: boolean;
    columnFilters: Record<string, string>;
    selectedCol: string | null;
    renamingValue: string;
    selectedRow: (DataRow & { _importDate: string; _batchId: string }) | null;
    isDrawerOpen: boolean;
    trackingKey: string;
    isCalcModalOpen: boolean;
    editingCalcField: CalculatedField | null;
    isFormatDrawerOpen: boolean;
    selectedFormatCol: string;
    newRule: Partial<ConditionalRule>;
    deleteConfirmRow: DataRow | null;
    blendingConfig: BlendingConfig | null;
    isColumnDrawerOpen: boolean;
    columnWidths: Record<string, number>;
    resizingColumn: string | null;
    resizeStartX: number;
    resizeStartWidth: number;
    showColumnBorders: boolean;
    isEditMode: boolean;
    pendingChanges: Record<string, Record<string, DataRow>>;
    isVlookupDrawerOpen: boolean;
    vlookupConfig: VLookupConfig;
}

const initialState: DataExplorerState = {
    searchTerm: '',
    sortConfig: null,
    showFilters: false,
    columnFilters: {},
    selectedCol: null,
    renamingValue: '',
    selectedRow: null,
    isDrawerOpen: false,
    trackingKey: '',
    isCalcModalOpen: false,
    editingCalcField: null,
    isFormatDrawerOpen: false,
    selectedFormatCol: '',
    newRule: { operator: 'lt', value: 0, style: { color: 'text-red-600', fontWeight: 'font-bold' } },
    deleteConfirmRow: null,
    blendingConfig: null,
    isColumnDrawerOpen: false,
    columnWidths: {},
    resizingColumn: null,
    resizeStartX: 0,
    resizeStartWidth: 0,
    showColumnBorders: true,
    isEditMode: false,
    pendingChanges: {},
    isVlookupDrawerOpen: false,
    vlookupConfig: {
        targetDatasetId: '',
        primaryKey: '',
        secondaryKey: '',
        columnsToAdd: [],
        newColumnName: ''
    }
};

function dataExplorerReducer(state: DataExplorerState, action: DataExplorerAction): DataExplorerState {
    switch (action.type) {
        case 'SET_SEARCH_TERM': return { ...state, searchTerm: action.payload };
        case 'SET_SORT_CONFIG': return { ...state, sortConfig: action.payload };
        case 'SET_SHOW_FILTERS': return { ...state, showFilters: action.payload };
        case 'SET_COLUMN_FILTERS': return { ...state, columnFilters: action.payload };
        case 'UPDATE_COLUMN_FILTER': return { ...state, columnFilters: { ...state.columnFilters, [action.payload.key]: action.payload.value } };
        case 'SET_SELECTED_COL': return { ...state, selectedCol: action.payload };
        case 'SET_RENAMING_VALUE': return { ...state, renamingValue: action.payload };
        case 'SET_SELECTED_ROW': return { ...state, selectedRow: action.payload };
        case 'SET_DRAWER_OPEN': return { ...state, isDrawerOpen: action.payload };
        case 'SET_TRACKING_KEY': return { ...state, trackingKey: action.payload };
        case 'SET_CALC_MODAL_OPEN': return { ...state, isCalcModalOpen: action.payload };
        case 'SET_EDITING_CALC_FIELD': return { ...state, editingCalcField: action.payload };
        case 'SET_FORMAT_DRAWER_OPEN': return { ...state, isFormatDrawerOpen: action.payload };
        case 'SET_SELECTED_FORMAT_COL': return { ...state, selectedFormatCol: action.payload };
        case 'SET_NEW_RULE': return { ...state, newRule: action.payload };
        case 'SET_DELETE_CONFIRM_ROW': return { ...state, deleteConfirmRow: action.payload };
        case 'SET_BLENDING_CONFIG': return { ...state, blendingConfig: action.payload };
        case 'SET_COLUMN_DRAWER_OPEN': return { ...state, isColumnDrawerOpen: action.payload };
        case 'SET_COLUMN_WIDTHS': return { ...state, columnWidths: action.payload };
        case 'UPDATE_COLUMN_WIDTH': return { ...state, columnWidths: { ...state.columnWidths, [action.payload.key]: action.payload.width } };
        case 'SET_RESIZING_COLUMN': return { ...state, resizingColumn: action.payload };
        case 'SET_RESIZE_START': return { ...state, resizeStartX: action.payload.x, resizeStartWidth: action.payload.width };
        case 'SET_SHOW_BORDERS': return { ...state, showColumnBorders: action.payload };
        case 'SET_EDIT_MODE': return { ...state, isEditMode: action.payload };
        case 'SET_PENDING_CHANGES': return { ...state, pendingChanges: action.payload };
        case 'UPDATE_PENDING_CHANGE': {
            const { batchId, rowId, field, value } = action.payload;
            const batchChanges = state.pendingChanges[batchId] || {};
            const rowChanges = (batchChanges[rowId] || {}) as DataRow;
            return {
                ...state,
                pendingChanges: {
                    ...state.pendingChanges,
                    [batchId]: {
                        ...batchChanges,
                        [rowId]: {
                            ...rowChanges,
                            [field]: value
                        }
                    }
                }
            };
        }
        case 'SET_VLOOKUP_DRAWER_OPEN': return { ...state, isVlookupDrawerOpen: action.payload };
        case 'SET_VLOOKUP_CONFIG': return { ...state, vlookupConfig: action.payload };
        case 'RESTORE_STATE': return { ...state, ...action.payload };
        default: return state;
    }
}

export function useDataExplorerLogic() {
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
    const [state, dispatch] = useReducer(dataExplorerReducer, initialState);

    const tableContainerRef = useRef<HTMLDivElement>(null);
    const isInitializedRef = useRef<string | null>(null);

    // --- Initialization (Restore State or Drilldown) ---
    // BOLT FIX: Consolidated initialization to prevent flickering between drilldown and saved state
    useEffect(() => {
        if (!currentDataset) return;

        // Only run if we haven't initialized for this dataset ID yet
        if (isInitializedRef.current === currentDataset.id) return;

        const hasDrilldown = location.state && (location.state.prefilledFilters || location.state.blendingConfig);
        const hasSavedState = lastDataExplorerState && lastDataExplorerState.datasetId === currentDataset.id;

        const newState: Partial<DataExplorerState> = {};

        // 1. Handle Drilldown (Prioritary for filters/blending)
        if (hasDrilldown) {
            if (location.state.prefilledFilters) {
                newState.columnFilters = location.state.prefilledFilters;
                newState.searchTerm = '';
                newState.sortConfig = null;
                newState.showFilters = true;
            }
            if (location.state.blendingConfig) {
                newState.blendingConfig = location.state.blendingConfig;
            } else {
                newState.blendingConfig = null;
            }
        }

        // 2. Restore Saved State (for widths, borders, and filters if no drilldown)
        if (hasSavedState) {
            if (!hasDrilldown) {
                newState.searchTerm = lastDataExplorerState.searchTerm || '';
                newState.sortConfig = lastDataExplorerState.sortConfig || null;
                newState.showFilters = lastDataExplorerState.showFilters || false;
                newState.columnFilters = lastDataExplorerState.columnFilters || {};
                newState.blendingConfig = lastDataExplorerState.blendingConfig || null;
            }
            newState.columnWidths = lastDataExplorerState.columnWidths || {};
            newState.showColumnBorders = lastDataExplorerState.showColumnBorders !== undefined ? lastDataExplorerState.showColumnBorders : true;
            newState.trackingKey = lastDataExplorerState.trackingKey || '';
        }

        // 3. Defaults if still missing
        if (!newState.trackingKey && (currentDataset?.fields?.length || 0) > 0) {
            const candidates = ['email', 'id', 'reference', 'ref', 'code', 'matricule', 'nom'];
            const found = currentDataset.fields.find(f => candidates.includes(f.toLowerCase()));
            newState.trackingKey = found || currentDataset.fields[0];
        }

        dispatch({ type: 'RESTORE_STATE', payload: newState });
        isInitializedRef.current = currentDataset.id;
    }, [currentDataset, location.state, lastDataExplorerState]);

    useEffect(() => {
        if (currentDataset && !state.selectedFormatCol && currentDataset?.fields?.length > 0) {
            dispatch({ type: 'SET_SELECTED_FORMAT_COL', payload: currentDataset.fields[0] });
        }
    }, [currentDataset, state.selectedFormatCol]);

    useEffect(() => {
        if (state.selectedCol) {
            dispatch({ type: 'SET_RENAMING_VALUE', payload: state.selectedCol });
        }
    }, [state.selectedCol]);

    // --- Save State ---
    useEffect(() => {
        // Only save if we have already initialized for the current dataset
        if (!currentDataset || isInitializedRef.current !== currentDataset.id) return;

        saveDataExplorerState({
            datasetId: currentDataset.id,
            searchTerm: state.searchTerm,
            sortConfig: state.sortConfig,
            columnFilters: state.columnFilters,
            showFilters: state.showFilters,
            columnWidths: state.columnWidths,
            showColumnBorders: state.showColumnBorders,
            trackingKey: state.trackingKey,
            blendingConfig: state.blendingConfig
        });
    }, [currentDataset, state.searchTerm, state.sortConfig, state.columnFilters, state.showFilters, state.columnWidths, state.showColumnBorders, state.trackingKey, state.blendingConfig, saveDataExplorerState]);

    // --- Handlers ---
    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (state.sortConfig && state.sortConfig.key === key && state.sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        dispatch({ type: 'SET_SORT_CONFIG', payload: { key, direction } });
    };

    const handleHeaderClick = (field: string) => {
        dispatch({ type: 'SET_SELECTED_COL', payload: state.selectedCol === field ? null : field });
        handleSort(field);
    };

    const handleColumnFilterChange = (key: string, value: string) => {
        dispatch({ type: 'UPDATE_COLUMN_FILTER', payload: { key, value } });
    };

    const clearFilters = () => {
        dispatch({ type: 'SET_COLUMN_FILTERS', payload: {} });
        dispatch({ type: 'SET_SEARCH_TERM', payload: '' });
        dispatch({ type: 'SET_SORT_CONFIG', payload: null });
    };

    const handleResizeStart = (e: React.MouseEvent, columnKey: string, currentWidth: number) => {
        e.preventDefault();
        e.stopPropagation();
        dispatch({ type: 'SET_RESIZING_COLUMN', payload: columnKey });
        dispatch({ type: 'SET_RESIZE_START', payload: { x: e.clientX, width: currentWidth } });
    };

    useEffect(() => {
        if (!state.resizingColumn) return;

        const handleMouseMove = (e: MouseEvent) => {
            const diff = e.clientX - state.resizeStartX;
            const newWidth = Math.max(80, state.resizeStartWidth + diff);
            dispatch({ type: 'UPDATE_COLUMN_WIDTH', payload: { key: state.resizingColumn!, width: newWidth } });
        };

        const handleMouseUp = () => {
            dispatch({ type: 'SET_RESIZING_COLUMN', payload: null });
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [state.resizingColumn, state.resizeStartX, state.resizeStartWidth]);

    const handleRowClick = (row: DataRow & { _importDate: string; _batchId: string }) => {
        if (state.isEditMode) return;
        dispatch({ type: 'SET_SELECTED_ROW', payload: row });
        dispatch({ type: 'SET_DRAWER_OPEN', payload: true });
    };

    const handleCellEdit = (batchId: string, rowId: string, field: string, value: string | number | boolean) => {
        dispatch({ type: 'UPDATE_PENDING_CHANGE', payload: { batchId, rowId, field, value } });
    };

    const handleSaveEdits = () => {
        if (Object.keys(state.pendingChanges).length === 0) {
            dispatch({ type: 'SET_EDIT_MODE', payload: false });
            return;
        }
        updateRows(state.pendingChanges);
        dispatch({ type: 'SET_EDIT_MODE', payload: false });
        dispatch({ type: 'SET_PENDING_CHANGES', payload: {} });
    };

    const handleCancelEdits = () => {
        dispatch({ type: 'SET_EDIT_MODE', payload: false });
        dispatch({ type: 'SET_PENDING_CHANGES', payload: {} });
    };

    const handleSaveCalculatedField = (field: Partial<CalculatedField>) => {
        if (!currentDataset) return;

        if (state.editingCalcField) {
            const oldName = state.editingCalcField.name;
            const newName = field.name || oldName;

            updateCalculatedField(currentDataset.id, state.editingCalcField.id, field);

            if (newName !== oldName) {
                if (state.sortConfig?.key === oldName) dispatch({ type: 'SET_SORT_CONFIG', payload: { ...state.sortConfig, key: newName } });
                if (state.columnFilters[oldName]) {
                    const newFilters = { ...state.columnFilters };
                    newFilters[newName] = newFilters[oldName];
                    delete newFilters[oldName];
                    dispatch({ type: 'SET_COLUMN_FILTERS', payload: newFilters });
                }
                if (state.selectedCol === oldName) dispatch({ type: 'SET_SELECTED_COL', payload: newName });
            }
        } else {
            const id = generateId();
            addCalculatedField(currentDataset.id, {
                ...field,
                id,
                name: field.name!,
                formula: field.formula!,
                outputType: field.outputType || 'number',
                unit: field.unit
            } as CalculatedField);
        }
        dispatch({ type: 'SET_EDITING_CALC_FIELD', payload: null });
    };

    const handleEditCalculatedField = (field: CalculatedField) => {
        dispatch({ type: 'SET_EDITING_CALC_FIELD', payload: field });
        dispatch({ type: 'SET_CALC_MODAL_OPEN', payload: true });
    };

    const handleAddConditionalRule = () => {
        if (!currentDataset || !state.selectedFormatCol) return;
        const rule: ConditionalRule = {
            id: generateId(),
            operator: (state.newRule.operator || 'eq') as 'gt' | 'lt' | 'eq' | 'contains' | 'empty',
            value: state.newRule.value || '',
            style: (state.newRule.style || {}) as ConditionalRule['style']
        };
        const currentConfig = currentDataset.fieldConfigs?.[state.selectedFormatCol] || { type: 'text' };
        const currentRules = currentConfig.conditionalFormatting || [];
        updateDatasetConfigs(currentDataset.id, {
            [state.selectedFormatCol]: { ...currentConfig, conditionalFormatting: [...currentRules, rule] }
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

    const handleFormatChange = (key: keyof FieldConfig, value: string | number | boolean | ConditionalRule[]) => {
        if (!currentDataset || !state.selectedCol) return;
        const currentConfig = currentDataset.fieldConfigs?.[state.selectedCol] || { type: 'number' };
        updateDatasetConfigs(currentDataset.id, {
            [state.selectedCol]: { ...currentConfig, [key]: value }
        });
    };

    const handleRenameColumn = () => {
        if (!currentDataset || !state.selectedCol || !state.renamingValue.trim() || state.selectedCol === state.renamingValue) return;

        const calcField = currentDataset.calculatedFields?.find(f => f.name === state.selectedCol);
        if (calcField) {
            updateCalculatedField(currentDataset.id, calcField.id, { name: state.renamingValue });

            if (state.sortConfig?.key === state.selectedCol) dispatch({ type: 'SET_SORT_CONFIG', payload: { ...state.sortConfig, key: state.renamingValue } });
            if (state.columnFilters[state.selectedCol]) {
                const newFilters = { ...state.columnFilters };
                newFilters[state.renamingValue] = newFilters[state.selectedCol];
                delete newFilters[state.selectedCol];
                dispatch({ type: 'SET_COLUMN_FILTERS', payload: newFilters });
            }
        } else {
            renameDatasetField(currentDataset.id, state.selectedCol, state.renamingValue);
        }
        dispatch({ type: 'SET_SELECTED_COL', payload: state.renamingValue });
    };

    const handleDeleteColumn = () => {
        if (!currentDataset || !state.selectedCol) return;
        const isCalculated = currentDataset.calculatedFields?.find(f => f.name === state.selectedCol);
        if (isCalculated) {
            if (window.confirm(`Supprimer le champ calculé "${state.selectedCol}" ?`)) {
                removeCalculatedField(currentDataset.id, isCalculated.id);
                dispatch({ type: 'SET_SELECTED_COL', payload: null });
            }
        } else {
            if (window.confirm(`ATTENTION : Supprimer la colonne "${state.selectedCol}" effacera définitivement cette donnée. Continuer ?`)) {
                deleteDatasetField(currentDataset.id, state.selectedCol);
                dispatch({ type: 'SET_SELECTED_COL', payload: null });
            }
        }
    };

    const handleApplyVlookup = () => {
        const { vlookupConfig } = state;
        if (!currentDataset || !vlookupConfig.targetDatasetId || !vlookupConfig.primaryKey || !vlookupConfig.secondaryKey || vlookupConfig.columnsToAdd.length === 0 || !vlookupConfig.newColumnName.trim()) {
            alert("Veuillez remplir tous les champs requis");
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

        dispatch({ type: 'SET_VLOOKUP_CONFIG', payload: initialState.vlookupConfig });
        dispatch({ type: 'SET_VLOOKUP_DRAWER_OPEN', payload: false });

        alert(`Colonne "${vlookupConfig.newColumnName}" ajoutée avec succès !`);
    };

    const handleDeleteRow = (row: DataRow, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dispatch({ type: 'SET_DELETE_CONFIRM_ROW', payload: row });
    };

    const confirmDeleteRow = () => {
        if (state.deleteConfirmRow && state.deleteConfirmRow._batchId && state.deleteConfirmRow.id) {
            deleteBatchRow(state.deleteConfirmRow._batchId, state.deleteConfirmRow.id);
            dispatch({ type: 'SET_DELETE_CONFIRM_ROW', payload: null });
        }
    };

    // --- Data Processing ---
    // BOLT OPTIMIZATION: Cache for row-level processing to avoid O(N) re-calculation of formulas
    // We use WeakMap with the original row reference to ensure perfect cache invalidation and no memory leaks.
    const rowProcessCacheRef = useRef<WeakMap<object, any>>(new WeakMap());
    const lastFormulasKeyRef = useRef<string>('');

    // BOLT OPTIMIZATION: Separate filtered batches to prevent rawExtendedRows from changing when unrelated datasets change
    const currentDatasetBatches = useMemo(() => {
        if (!currentDatasetId) return [];
        return batches.filter(b => b.datasetId === currentDatasetId)
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [batches, currentDatasetId]);

    // 1. Initial extended rows (Metadata only)
    const rawExtendedRows = useMemo(() => {
        if (!currentDataset) return [];

        const result: (DataRow & { _importDate: string; _batchId: string; _raw: DataRow })[] = [];
        for (const batch of currentDatasetBatches) {
            const batchRows = batch.rows || [];
            const batchDate = batch.date;
            const batchId = batch.id;
            for (let i = 0; i < batchRows.length; i++) {
                // We keep a reference to the original row for the cache
                result.push({ ...batchRows[i], _importDate: batchDate, _batchId: batchId, _raw: batchRows[i] });
            }
        }
        return result;
    }, [currentDataset?.id, currentDatasetBatches]);

    // 2. Full processed rows (Calculated Fields & Blending)
    const allRows = useMemo(() => {
        if (!currentDataset || rawExtendedRows.length === 0) return [];
        const calcFields = currentDataset?.calculatedFields || [];
        const { blendingConfig } = state;

        // Invalidate cache if formulas or blending config changed
        const formulasKey = JSON.stringify(calcFields) + JSON.stringify(blendingConfig);
        if (lastFormulasKeyRef.current !== formulasKey) {
            rowProcessCacheRef.current = new WeakMap();
            lastFormulasKeyRef.current = formulasKey;
        }

        // Prepare Blending Lookups (O(M) where M is rows in secondary dataset)
        const blendingLookups = new Map<string, { lookup: Map<string, DataRow>, dsName: string }>();
        if (blendingConfig?.secondaryDatasetId && blendingConfig.joinKeyPrimary && blendingConfig.joinKeySecondary) {
            const secDS = datasets.find(d => d.id === blendingConfig.secondaryDatasetId);
            if (secDS) {
                const secBatches = batches.filter(b => b.datasetId === blendingConfig.secondaryDatasetId)
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                if (secBatches.length > 0) {
                    const secBatch = secBatches[secBatches.length - 1];
                    const lookup = new Map<string, DataRow>();
                    secBatch.rows.forEach(r => {
                        const k = String(r[blendingConfig.joinKeySecondary!] || '').trim();
                        if (k) lookup.set(k, r);
                    });
                    blendingLookups.set(blendingConfig.secondaryDatasetId, { lookup, dsName: secDS.name });
                }
            }
        }

        const activeLookup = blendingConfig?.secondaryDatasetId ? blendingLookups.get(blendingConfig.secondaryDatasetId) : null;
        const hasExtraWork = calcFields.length > 0 || activeLookup;

        if (!hasExtraWork) return rawExtendedRows;

        // Apply transformations using cache
        return rawExtendedRows.map(r => {
            const cached = rowProcessCacheRef.current.get(r._raw);
            if (cached) return cached;

            const extendedRow = { ...r };

            // Calculated Fields
            for (let j = 0; j < calcFields.length; j++) {
                const cf = calcFields[j];
                extendedRow[cf.name] = evaluateFormula(r, cf.formula, cf.outputType);
            }

            // Blending (O(1) lookup)
            if (activeLookup && blendingConfig) {
                const k = String(extendedRow[blendingConfig.joinKeyPrimary!] || '').trim();
                const match = activeLookup.lookup.get(k);
                if (match) {
                    const dsPrefix = `[${activeLookup.dsName}] `;
                    for (const key in match) {
                        if (key !== 'id') (extendedRow as any)[dsPrefix + key] = match[key];
                    }
                }
            }

            rowProcessCacheRef.current.set(r._raw, extendedRow);
            return extendedRow;
        });
    }, [rawExtendedRows, currentDataset?.calculatedFields, state.blendingConfig, datasets]);

    const displayFields = useMemo(() => {
        if (!currentDataset) return [];
        const primFields = [...(currentDataset.fields || [])];
        const { blendingConfig } = state;
        if (blendingConfig && blendingConfig.secondaryDatasetId) {
            const secDS = (datasets || []).find(d => d.id === blendingConfig.secondaryDatasetId);
            if (secDS) {
                const secFields = (secDS.fields || []).map(f => `[${secDS.name}] ${f}`);
                const secCalcFields = (secDS.calculatedFields || []).map(f => `[${secDS.name}] ${f.name}`);
                return [...primFields, ...secFields, ...secCalcFields];
            }
        }
        return primFields;
    }, [currentDataset, state.blendingConfig, datasets]);

    const processedRows = useMemo(() => {
        if (!currentDataset) return [];
        let data = allRows;

        const activeFilters = Object.entries(state.columnFilters)
            .filter(([, v]) => v !== undefined && v !== null && v !== '')
            .map(([key, value]) => {
                let targetVal = String(value);
                let isExact = false;
                if (targetVal.startsWith('=')) {
                    isExact = true;
                    targetVal = targetVal.substring(1);
                }

                // Pre-split filter values for exact match
                const filterValues = isExact ? (
                    (targetVal.includes(',') || targetVal.includes(';'))
                    ? targetVal.split(/[;,]+/).map(v => v.trim().toLowerCase()).filter(v => v !== '')
                    : [targetVal.toLowerCase()]
                ) : [];

                return {
                    key,
                    targetVal,
                    lowerFilter: targetVal.toLowerCase(),
                    isExact,
                    filterValues,
                    isEmpty: value === '__EMPTY__'
                };
            });

        const lowerSearchTerm = state.searchTerm.trim().toLowerCase();

        if (lowerSearchTerm || activeFilters.length > 0) {
            // BOLT OPTIMIZATION: Limit search to visible columns and metadata
            const searchableKeys = (lowerSearchTerm && data.length > 0)
                ? ['id', '_importDate', ...displayFields]
                : [];

            data = data.filter(row => {
                // BOLT OPTIMIZATION: On-the-fly search instead of pre-calculating giant strings
                if (lowerSearchTerm) {
                    let match = false;
                    for (let i = 0; i < searchableKeys.length; i++) {
                        const val = row[searchableKeys[i]];
                        if (val !== undefined && val !== null && String(val).toLowerCase().includes(lowerSearchTerm)) {
                            match = true;
                            break;
                        }
                    }
                    if (!match) return false;
                }

                for (let i = 0; i < activeFilters.length; i++) {
                    const f = activeFilters[i];
                    const val = row[f.key];

                    if (f.isEmpty) {
                        if (val !== undefined && val !== null && val !== '') return false;
                        continue;
                    }

                    if (f.key === '_batchId') {
                        if (String(val) !== f.targetVal) return false;
                        continue;
                    }

                    const valStr = String(val ?? '').toLowerCase();
                    const config = currentDataset?.fieldConfigs?.[f.key];

                    if (f.isExact) {
                        let matched = f.filterValues.some(fv => valStr === fv);

                        if (!matched && (config?.type === 'date' || f.key.toLowerCase().includes('date'))) {
                            const month = getGroupedLabel(valStr, 'month').toLowerCase();
                            const year = getGroupedLabel(valStr, 'year').toLowerCase();
                            const quarter = getGroupedLabel(valStr, 'quarter').toLowerCase();
                            if (f.filterValues.some(fv => month === fv || year === fv || quarter === fv)) matched = true;
                        }

                        if (!matched && f.key === '_importDate') {
                            const dateStr = val as string;
                            const formattedDate = formatDateFr(dateStr).toLowerCase();
                            if (f.filterValues.some(fv => dateStr === fv || formattedDate === fv)) matched = true;
                        }

                        if (!matched) return false;
                        continue;
                    }

                    if (f.key === '_importDate') {
                        const dateStr = val as string;
                        if (!formatDateFr(dateStr).toLowerCase().includes(f.lowerFilter) && !dateStr.includes(f.lowerFilter)) return false;
                        continue;
                    }

                    if (!valStr.includes(f.lowerFilter)) return false;
                }
                return true;
            });
        }

        if (state.sortConfig) {
            data.sort((a, b) => {
                const valA = a[state.sortConfig!.key];
                const valB = b[state.sortConfig!.key];
                if (valA == null) return 1;
                if (valB == null) return -1;
                if (valA < valB) return state.sortConfig!.direction === 'asc' ? -1 : 1;
                if (valA > valB) return state.sortConfig!.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return data;
    }, [allRows, state.searchTerm, state.columnFilters, state.sortConfig, currentDataset]);

    const distributionData = useMemo(() => {
        if (!currentDataset || !state.selectedCol || processedRows.length === 0) return [];

        const counts: Record<string, number> = {};
        processedRows.forEach(row => {
            let val = row[state.selectedCol!];
            if (val === undefined || val === null || val === '') val = '(Vide)';
            else val = String(val);
            counts[val] = (counts[val] || 0) + 1;
        });

        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 15);
    }, [state.selectedCol, processedRows, currentDataset]);

    const allColumns = useMemo(() => {
        const cols: { key: string; width: number }[] = [
            { key: '_importDate', width: state.columnWidths['_importDate'] || 140 },
            { key: 'id', width: state.columnWidths['id'] || 120 }
        ];

        displayFields.forEach(f => {
            const config = currentDataset?.fieldConfigs?.[f];
            const defaultWidth = config?.type === 'number' ? 120 : 180;
            cols.push({ key: f, width: state.columnWidths[f] || defaultWidth });
        });

        (currentDataset?.calculatedFields || []).forEach(cf => {
            cols.push({ key: cf.name, width: state.columnWidths[cf.name] || 150 });
        });

        cols.push({ key: '_actions', width: 60 });
        return cols;
    }, [displayFields, currentDataset, state.columnWidths]);

    const rowVirtualizer = useVirtualizer({
        count: processedRows.length,
        getScrollElement: () => tableContainerRef.current,
        estimateSize: () => 40,
        overscan: 10,
    });

    const colVirtualizer = useVirtualizer({
        horizontal: true,
        count: allColumns.length,
        getScrollElement: () => tableContainerRef.current,
        estimateSize: (index) => allColumns[index].width,
        overscan: 5,
    });

    // BOLT FIX: Ensure virtualizer re-measures when column widths change
    useEffect(() => {
        colVirtualizer.measure();
    }, [allColumns, colVirtualizer]);

    const historyData = useMemo(() => {
        if (!currentDataset || !state.selectedRow || !state.trackingKey) return [];
        const trackValue = state.selectedRow[state.trackingKey];
        if (trackValue === undefined || trackValue === '') return [state.selectedRow];
        const relevantBatches = batches.filter(b => b.datasetId === currentDataset?.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const history: DataRow[] = [];
        relevantBatches.forEach(batch => {
            const match = batch.rows.find(r => String(r[state.trackingKey]) === String(trackValue));
            if (match) history.push({ ...match, _importDate: batch.date, _batchId: batch.id });
        });
        return history;
    }, [state.selectedRow, state.trackingKey, batches, currentDataset]);

    const getCellStyle = (fieldName: string, value: string | number | boolean) => {
        if (!currentDataset?.fieldConfigs) return '';
        const rules = currentDataset.fieldConfigs[fieldName]?.conditionalFormatting;
        if (!rules || rules.length === 0) return '';

        for (const rule of rules) {
            const targetValue = Number(rule.value);
            let match = false;
            if (rule.operator === 'gt' || rule.operator === 'lt') {
                const numValue = parseSmartNumber(value);
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
        const headers = ['Date import', 'Id', ...displayFields, ...(currentDataset.calculatedFields || []).map(f => f.name)];
        const csvContent = [
            headers.join(';'),
            ...processedRows.map(row => {
                const cols = [
                    row._importDate, row.id,
                    ...displayFields.map(f => {
                        const val = row[f];
                        let stringVal = val !== undefined ? String(val) : '';
                        if (stringVal.includes(';') || stringVal.includes('\n') || stringVal.includes('"')) stringVal = `"${stringVal.replace(/"/g, '""')}"`;
                        return stringVal;
                    }),
                    ...(currentDataset.calculatedFields || []).map(f => {
                        const val = row[f.name];
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

    return {
        // Data & Meta
        currentDataset,
        datasets,
        batches,
        currentDatasetId,
        allRows,
        processedRows,
        displayFields,
        allColumns,
        distributionData,
        historyData,
        rowVirtualizer,
        colVirtualizer,
        tableContainerRef,

        // State
        state,
        dispatch,

        // Handlers
        switchDataset,
        handleSort,
        handleHeaderClick,
        handleColumnFilterChange,
        clearFilters,
        handleResizeStart,
        handleRowClick,
        handleCellEdit,
        handleSaveEdits,
        handleCancelEdits,
        handleSaveCalculatedField,
        handleEditCalculatedField,
        handleAddConditionalRule,
        handleRemoveConditionalRule,
        handleFormatChange,
        handleRenameColumn,
        handleDeleteColumn,
        handleApplyVlookup,
        handleDeleteRow,
        confirmDeleteRow,
        handleExportFullCSV,

        // Context actions needed by components
        deleteBatch,
        reorderDatasetFields,
        navigate,
        getCellStyle
    };
}
