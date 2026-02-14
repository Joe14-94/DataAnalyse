import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useData } from '../context/DataContext';
import {
    detectColumnType, generateId, formatDateLabelForDisplay
} from '../utils';
import {
    CalculatedField, PivotStyleRule, ConditionalFormattingRule, FilterRule, FieldConfig,
    TemporalComparisonConfig, TemporalComparisonResult, PivotSourceConfig,
    AggregationType, SortBy, SortOrder, DateGrouping, PivotMetric, SpecificDashboardItem,
    DataRow, TemporalComparisonSource
} from '../types';
import { usePivotData } from './usePivotData';
import { usePivotExport } from './usePivotExport';
import { usePivotDrilldown } from './usePivotDrilldown';
import { pivotResultToRows, temporalResultToRows } from '../utils/pivotToDataset';

export type DropZoneType = 'row' | 'col' | 'val' | 'filter' | 'list';

export const usePivotLogic = () => {
    const {
        batches, currentDataset, currentDatasetId, switchDataset, datasets, savedAnalyses, saveAnalysis,
        lastPivotState, savePivotState, isLoading, companyLogo, addCalculatedField,
        removeCalculatedField, updateCalculatedField, addDashboardWidget, createDerivedDataset
    } = useData();
    const navigate = useNavigate();

    // --- STATE ---
    const [isInitialized, setIsInitialized] = useState(false);
    const [sources, setSources] = useState<PivotSourceConfig[]>([]);
    const [selectedBatchId, setSelectedBatchId] = useState<string>('');
    const [rowFields, setRowFields] = useState<string[]>([]);
    const [colFields, setColFields] = useState<string[]>([]);
    const [valField, setValField] = useState<string>('');
    const [colGrouping, setColGrouping] = useState<DateGrouping>('none');
    const [aggType, setAggType] = useState<AggregationType>('count');
    const [metrics, setMetrics] = useState<PivotMetric[]>([]);
    const [valFormatting, setValFormatting] = useState<Partial<FieldConfig>>({});
    const [filters, setFilters] = useState<FilterRule[]>([]);
    const [showSubtotals, setShowSubtotals] = useState(true);
    const [showTotalCol, setShowTotalCol] = useState(true);
    const [showVariations, setShowVariations] = useState(false);
    const [sortBy, setSortBy] = useState<SortBy>('label');
    const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
    const [searchTerm, setSearchTerm] = useState('');

    // UI STATE
    const [isSaving, setIsSaving] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [analysisName, setAnalysisName] = useState('');
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [showLoadMenu, setShowLoadMenu] = useState(false);
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
    const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
    const [isCalcModalOpen, setIsCalcModalOpen] = useState(false);
    const [isSpecificDashboardModalOpen, setIsSpecificDashboardModalOpen] = useState(false);
    const [isFormattingModalOpen, setIsFormattingModalOpen] = useState(false);
    const [isQuickChartModalOpen, setIsQuickChartModalOpen] = useState(false);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [isSaveAsDatasetModalOpen, setIsSaveAsDatasetModalOpen] = useState(false);
    const [formattingSelectionRule, setFormattingSelectionRule] = useState<{id: string, type: 'style' | 'conditional'} | null>(null);
    const [specificDashboardItems, setSpecificDashboardItems] = useState<SpecificDashboardItem[]>([]);
    const [editingCalcField, setEditingCalcField] = useState<CalculatedField | null>(null);
    const [columnLabels, setColumnLabels] = useState<Record<string, string>>({});
    const [editingColumn, setEditingColumn] = useState<string | null>(null);
    const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
    const [styleRules, setStyleRules] = useState<PivotStyleRule[]>([]);
    const [conditionalRules, setConditionalRules] = useState<ConditionalFormattingRule[]>([]);
    const [collapsedRows, setCollapsedRows] = useState<Set<string>>(new Set());

    // PANEL COLLAPSE STATE
    const [isDataSourcesPanelCollapsed, setIsDataSourcesPanelCollapsed] = useState(false);
    const [isTemporalConfigPanelCollapsed, setIsTemporalConfigPanelCollapsed] = useState(false);
    const [isFieldsPanelCollapsed, setIsFieldsPanelCollapsed] = useState(false);

    // DRILLDOWN STATE
    const [drilldownData, setDrilldownData] = useState<{ rows: DataRow[], title: string, fields: string[] } | null>(null);
    const [isChartModalOpen, setIsChartModalOpen] = useState(false);

    // D&D STATE
    const [draggedField, setDraggedField] = useState<string | null>(null);

    // TEMPORAL COMPARISON STATE
    const [isTemporalMode, setIsTemporalMode] = useState(false);
    const [temporalConfig, setTemporalConfig] = useState<TemporalComparisonConfig | null>(null);
    const [isTemporalSourceModalOpen, setIsTemporalSourceModalOpen] = useState(false);

    // VIRTUALIZATION
    const parentRef = useRef<HTMLDivElement>(null);
    const footerRef = useRef<HTMLDivElement>(null);

    // --- HOOKS ---
    const {
       blendedRows, pivotData, temporalResults, temporalColTotals, temporalDeltaTotals, isCalculating, primaryDataset, datasetBatches
    } = usePivotData({
       sources, selectedBatchId, rowFields, colFields, colGrouping, valField, aggType, metrics, filters, sortBy, sortOrder, showSubtotals, showVariations, isTemporalMode, temporalConfig, searchTerm
    });

    const { handleExport, handleExportSpreadsheet } = usePivotExport({
        primaryDataset, datasets, pivotData, temporalResults, temporalColTotals,
        rowFields, metrics, valField, aggType, valFormatting,
        showTotalCol, showVariations, isTemporalMode, temporalConfig, companyLogo
    });

    const { handleDrilldown } = usePivotDrilldown({
        rowFields, colFields, selectedBatchId, isSelectionMode
    });

    // --- COLUMN VIRTUALIZATION PREP ---
    const allDataColumns = useMemo(() => {
        if (isTemporalMode) {
            const ms = metrics.length > 0 ? metrics : (valField ? [{ field: valField, aggType: aggType as PivotMetric['aggType'] }] : []);
            const cols: { key: string; width: number; isDiff?: boolean }[] = [];

            ms.forEach(m => {
                const mLabel = m.label || `${m.field} (${m.aggType})`;
                (temporalConfig?.sources || []).forEach(source => {
                    // BOLT FIX: Use \x1F separator to avoid confusion with underscores in source.id or mLabel
                    const colKey = `${source.id}\x1F${mLabel}`;
                    cols.push({ key: colKey, width: columnWidths[colKey] || 120 });

                    if (showVariations && source.id !== temporalConfig?.referenceSourceId) {
                        cols.push({ key: `${colKey}_DELTA`, width: 60, isDiff: true });
                    }
                });
            });
            return cols;
        } else if (pivotData) {
            return (pivotData.colHeaders || []).map(h => ({
                key: h,
                width: columnWidths[h] || 120
            }));
        }
        return [];
    }, [isTemporalMode, pivotData, metrics, valField, aggType, temporalConfig, showVariations, columnWidths]);

    // BOLT OPTIMIZATION: Filter rows based on collapse state
    const filteredPivotRows = useMemo(() => {
        if (!pivotData?.displayRows) return [];
        if (collapsedRows.size === 0) return pivotData.displayRows;

        return pivotData.displayRows.filter(row => {
            // A row is hidden if any of its parent paths are collapsed
            // Standard mode: row.keys contains the path
            for (let i = 0; i < row.keys.length - (row.type === 'subtotal' ? 1 : 0); i++) {
                const parentPath = row.keys.slice(0, i + 1).join('\x1F');
                if (collapsedRows.has(parentPath)) return false;
            }
            return true;
        });
    }, [pivotData, collapsedRows]);

    const filteredTemporalResults = useMemo(() => {
        if (!temporalResults) return [];
        if (collapsedRows.size === 0) return temporalResults;

        return temporalResults.filter(result => {
            const keys = result.groupLabel.split('\x1F');
            // Temporal mode: result.groupLabel contains the path
            // For subtotals, level is subtotalLevel
            const maxLevelToCheck = result.isSubtotal ? (result.subtotalLevel ?? 0) : keys.length - 1;

            for (let i = 0; i < maxLevelToCheck; i++) {
                const parentPath = keys.slice(0, i + 1).join('\x1F');
                if (collapsedRows.has(parentPath)) return false;
            }
            return true;
        });
    }, [temporalResults, collapsedRows]);

    const rowVirtualizer = useVirtualizer({
        count: isTemporalMode ? filteredTemporalResults.length : filteredPivotRows.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 32,
        overscan: 10,
    });

    const colVirtualizer = useVirtualizer({
        horizontal: true,
        count: allDataColumns.length,
        getScrollElement: () => parentRef.current,
        estimateSize: (index) => allDataColumns[index].width,
        overscan: 5,
    });

    // BOLT FIX: Ensure virtualizer re-measures when column widths change
    useEffect(() => {
        colVirtualizer.measure();
    }, [allDataColumns, colVirtualizer]);

    // --- INITIALISATION ---
    useEffect(() => {
        if (isInitialized) return;
        if (lastPivotState && currentDataset && lastPivotState.datasetId === currentDataset.id) {
            const c = lastPivotState.config;
            setSources(c.sources || []);
            setRowFields(c.rowFields || []);
            setColFields(c.colFields || []);
            setColGrouping(c.colGrouping || 'none');
            setValField(c.valField || '');
            setAggType((c.aggType as AggregationType) || 'count');
            setMetrics(c.metrics || []);
            setValFormatting(c.valFormatting || {});
            setFilters(c.filters || []);
            setShowSubtotals(c.showSubtotals !== undefined ? c.showSubtotals : true);
            setShowTotalCol(c.showTotalCol !== undefined ? c.showTotalCol : true);
            setShowVariations(c.showVariations || false);
            setSortBy(c.sortBy || 'label');
            setSortOrder(c.sortOrder || 'asc');
            if (c.selectedBatchId) setSelectedBatchId(c.selectedBatchId);
            if (c.searchTerm) setSearchTerm(c.searchTerm);
            setIsTemporalMode(c.isTemporalMode || false);
            setTemporalConfig(c.temporalComparison || null);
            if (c.columnLabels) setColumnLabels(c.columnLabels);
            if (c.columnWidths) setColumnWidths(c.columnWidths);
            setStyleRules(c.styleRules || []);
            setConditionalRules(c.conditionalRules || []);
        } else {
            setSources([]);
        }
        setIsInitialized(true);
    }, [currentDataset, lastPivotState, isInitialized]);

    useEffect(() => {
        if (!isInitialized || !primaryDataset) return;

        const currentTemporalComparison = temporalConfig ? {
            ...temporalConfig,
            groupByFields: rowFields,
            valueField: valField,
            aggType: aggType === 'list' ? 'sum' : aggType as 'sum' | 'count' | 'avg' | 'min' | 'max'
        } : undefined;

        savePivotState({
            datasetId: primaryDataset.id,
            config: {
                sources, rowFields, colFields, colGrouping, valField, aggType, metrics, valFormatting,
                filters, showSubtotals, showTotalCol, showVariations, sortBy, sortOrder,
                selectedBatchId, isTemporalMode,
                temporalComparison: currentTemporalComparison,
                columnWidths,
                columnLabels,
                styleRules,
                conditionalRules,
                searchTerm
            }
        });
    }, [sources, rowFields, colFields, colGrouping, valField, aggType, metrics, valFormatting, filters, showSubtotals, showTotalCol, showVariations, sortBy, sortOrder, selectedBatchId, primaryDataset, isInitialized, isTemporalMode, temporalConfig, columnWidths, columnLabels, styleRules, conditionalRules, searchTerm, savePivotState]);

    useEffect(() => {
        if (isLoading || !isInitialized) return;
        if (datasetBatches.length > 0 && !datasetBatches.find(b => b.id === selectedBatchId)) {
            setSelectedBatchId(datasetBatches[0].id);
        }
    }, [datasetBatches, selectedBatchId, isLoading, isInitialized]);

    // --- HELPERS ---
    const allAvailableFields = useMemo(() => {
        if (!primaryDataset) return [];
        return [...(primaryDataset?.fields || []), ...(primaryDataset?.calculatedFields || []).map(cf => cf.name)];
    }, [primaryDataset]);

    const usedFields = useMemo(() => {
        const used = new Set<string>();
        (rowFields || []).forEach(f => used.add(f));
        (colFields || []).forEach(f => used.add(f));
        if (valField) used.add(valField);
        (metrics || []).forEach(m => used.add(m.field));
        (filters || []).forEach(f => used.add(f.field));
        return used;
    }, [rowFields, colFields, valField, metrics, filters]);

    const groupedFields = useMemo(() => {
        return (sources || []).map(src => {
            const ds = (datasets || []).find(d => d.id === src.datasetId);
            if (!ds) return null;
            const prefix = src.isPrimary ? '' : `[${ds.name}] `;
            const fields = [...(ds.fields || []), ...(ds.calculatedFields || []).map(cf => cf.name)].map(f => `${prefix}${f}`);
            return { id: src.id, name: ds.name, isPrimary: src.isPrimary, fields, color: src.color };
        }).filter((x): x is NonNullable<typeof x> => x !== null);
    }, [sources, datasets]);

    // Sync scroll
    useEffect(() => {
        const parent = parentRef.current;
        const footer = footerRef.current;
        if (!parent || !footer) return;
        const handleScroll = () => {
            if (footer && parent) {
                footer.scrollLeft = parent.scrollLeft;
            }
        };
        parent.addEventListener('scroll', handleScroll);
        return () => parent.removeEventListener('scroll', handleScroll);
    }, [pivotData, temporalResults, isTemporalMode]);

    // --- HANDLERS ---
    const handleValFieldChange = (newField: string) => {
        setValField(newField);
        setValFormatting({});
        if (blendedRows.length > 0) {
            let type = primaryDataset?.fieldConfigs?.[newField]?.type;
            if (!type) {
                type = detectColumnType(blendedRows.slice(0, 50).map(r => String(r[newField] || '')));
            }
            const newAgg = (type === 'number' ? 'sum' : (type === 'date' ? 'max' : 'count')) as AggregationType;
            setAggType(newAgg);

            if (metrics.length === 0) {
                setMetrics([{ field: newField, aggType: newAgg }]);
            }
        }
    };

    const isColFieldDate = useMemo(() => {
        if (colFields.length === 0 || blendedRows.length === 0) return false;
        return colFields.some(field => detectColumnType(blendedRows.slice(0, 50).map(r => String(r[field] || ''))) === 'date');
    }, [colFields, blendedRows]);

    const handleDragStart = (e: React.DragEvent, field: string, source: string) => {
        setDraggedField(field);
        e.dataTransfer.setData('application/json', JSON.stringify({ field, source }));
    };

    const handleDrop = (e: React.DragEvent, targetZone: DropZoneType) => {
        e.preventDefault();
        const data = JSON.parse(e.dataTransfer.getData('application/json'));
        const { field, source } = data;
        if (source === 'row') setRowFields(prev => prev.filter(f => f !== field));
        if (source === 'col') setColFields(prev => prev.filter(f => f !== field));
        if (source === 'val') {
            setMetrics(prev => prev.filter(m => m.field !== field));
            if (valField === field) setValField('');
        }
        if (source === 'filter') setFilters(prev => prev.filter(f => f.field !== field));

        if (targetZone === 'row' && !rowFields.includes(field)) setRowFields(prev => [...prev, field]);
        else if (targetZone === 'col' && !colFields.includes(field)) setColFields(prev => [...prev, field]);
        else if (targetZone === 'val') {
            if (metrics.length < 15) {
                let type = primaryDataset?.fieldConfigs?.[field]?.type;
                if (!type) {
                    type = blendedRows.length > 0 ? detectColumnType(blendedRows.slice(0, 50).map(r => String(r[field] || ''))) : 'text';
                }
                const agg = (type === 'number' ? 'sum' : (type === 'date' ? 'max' : 'count')) as AggregationType;
                setMetrics(prev => [...prev, { field, aggType: agg }]);
                if (!valField) {
                    setValField(field);
                    setAggType(agg);
                }
            } else {
                alert("Limite de 15 métriques atteinte");
            }
        }
        else if (targetZone === 'filter' && !filters.some(f => f.field === field)) setFilters(prev => [...prev, { field, operator: 'in', value: [] }]);
        setDraggedField(null);
    };

    const removeField = (zone: DropZoneType, field: string, index?: number) => {
        if (zone === 'row') setRowFields(prev => prev.filter(f => f !== field));
        if (zone === 'col') setColFields(prev => prev.filter(f => f !== field));
        if (zone === 'val') {
            if (index !== undefined) {
                setMetrics(prev => prev.filter((_, i) => i !== index));
            } else {
                setMetrics(prev => prev.filter(m => m.field !== field));
            }
            if (valField === field) setValField('');
        }
        if (zone === 'filter') setFilters(prev => prev.filter(f => f.field !== field));
    };

    const handleExportWrapper = (format: 'pdf' | 'html', mode: 'adaptive' | 'A4' = 'adaptive') => {
        setShowExportMenu(false);
        handleExport(format, mode);
    };

    const handleExportSpreadsheetWrapper = (format: 'xlsx' | 'csv') => {
        setShowExportMenu(false);
        handleExportSpreadsheet(format);
    };

    const handleCellClick = (rowKeys: string[], colLabel: string, value: string | number | undefined, metricLabel: string) => {
        if (formattingSelectionRule) {
            const targetKey = colLabel === '' ? (rowKeys[rowKeys.length - 1] || '') : (rowKeys.length === 0 ? colLabel : `${rowKeys.join('\x1F')}|${colLabel}`);

            if (formattingSelectionRule.type === 'style') {
                setStyleRules(prev => prev.map(r => r.id === formattingSelectionRule.id ? {
                    ...r,
                    targetKey,
                    targetType: colLabel === '' ? 'row' : (rowKeys.length === 0 ? 'col' : 'cell')
                } : r));
            }
            setFormattingSelectionRule(null);
            setIsFormattingModalOpen(true);
            return;
        }

        if (!isSelectionMode) {
            handleDrilldown(rowKeys, colLabel);
            return;
        }

        const id = generateId();
        const rowLabel = rowKeys.length > 0 ? rowKeys[rowKeys.length - 1] : 'Total';
        const label = `${rowLabel} - ${colLabel}`;

        const newItem: SpecificDashboardItem = {
            id,
            label,
            value: value ?? 0,
            rowPath: rowKeys,
            colLabel,
            metricLabel
        };

        setSpecificDashboardItems(prev => [...prev, newItem]);
    };

    const handleTemporalDrilldown = (result: TemporalComparisonResult, sourceId: string, metricLabel: string) => {
        const source = temporalConfig?.sources.find(s => s.id === sourceId);
        const value = result.values[sourceId]?.[metricLabel] || 0;
        const sourceLabel = source?.label || sourceId;
        const activeMetricsCount = metrics.length > 0 ? metrics.length : (valField ? 1 : 0);
        const displayColLabel = activeMetricsCount > 1 ? `${sourceLabel} - ${metricLabel}` : sourceLabel;

        if (formattingSelectionRule) {
            const rowKeys = result.groupLabel.split('\x1F');
            const targetKey = `${rowKeys.join('\x1F')}|${sourceId}_${metricLabel}`;

            if (formattingSelectionRule.type === 'style') {
                setStyleRules(prev => prev.map(r => r.id === formattingSelectionRule.id ? {
                    ...r,
                    targetKey,
                    targetType: 'cell'
                } : r));
            }
            setFormattingSelectionRule(null);
            setIsFormattingModalOpen(true);
            return;
        }

        if (isSelectionMode) {
            const rowKeys = result.groupLabel.split('\x1F');
            handleCellClick(rowKeys, displayColLabel, value, metricLabel);
            return;
        }

        const prefilledFilters: Record<string, string> = {};
        const rowKeys = result.groupLabel.split('\x1F');

        rowFields.forEach((field, i) => {
            const val = rowKeys[i];
            if (val === '(Vide)') {
                prefilledFilters[field] = '__EMPTY__';
            } else {
                prefilledFilters[field] = `=${val}`;
            }
        });

        if (source) {
            prefilledFilters['_batchId'] = `=${source.batchId}`;
        } else {
            prefilledFilters['_batchId'] = `=${sourceId}`;
        }

        navigate('/data', { state: { prefilledFilters } });
    };

    const handleLoadAnalysis = (id: string) => {
        const a = savedAnalyses.find(x => x.id === id);
        if (a) {
            const c = a.config;
            if (a.datasetId && a.datasetId !== currentDatasetId) {
                switchDataset(a.datasetId);
            }
            setSources(c.sources || []);
            setRowFields(c.rowFields || []);
            setColFields(c.colFields || []);
            setColGrouping(c.colGrouping || 'none');
            setValField(c.valField || '');
            setAggType((c.aggType as AggregationType) || 'count');
            setMetrics(c.metrics || (c.valField ? [{ field: c.valField, aggType: c.aggType }] : []));
            setValFormatting(c.valFormatting || {});
            setFilters(c.filters || []);
            setShowSubtotals(c.showSubtotals !== undefined ? c.showSubtotals : true);
            setShowTotalCol(c.showTotalCol !== undefined ? c.showTotalCol : true);
            setShowVariations(c.showVariations || false);
            setSortBy(c.sortBy || 'label');
            setSortOrder(c.sortOrder || 'asc');
            if (c.selectedBatchId) setSelectedBatchId(c.selectedBatchId);
            setIsTemporalMode(!!c.isTemporalMode);
            setTemporalConfig(c.temporalComparison || null);
            setColumnLabels(c.columnLabels || {});
            setColumnWidths(c.columnWidths || {});
            setStyleRules(c.styleRules || []);
            setConditionalRules(c.conditionalRules || []);
        }
        setShowLoadMenu(false);
    };

    const handleSaveCalculatedField = (field: Partial<CalculatedField>) => {
        if (!primaryDataset) return;

        if (editingCalcField) {
            const oldName = editingCalcField.name;
            const newName = field.name || oldName;

            updateCalculatedField(primaryDataset.id, editingCalcField.id, field);

            if (newName !== oldName) {
                setMetrics(prev => prev.map(m => m.field === oldName ? { ...m, field: newName } : m));
                if (valField === oldName) setValField(newName);
                setRowFields(prev => prev.map(f => f === oldName ? newName : f));
                setColFields(prev => prev.map(f => f === oldName ? newName : f));
                setFilters(prev => prev.map(f => f.field === oldName ? { ...f, field: newName } : f));

                if (columnLabels[oldName]) {
                    const newLabels = { ...columnLabels };
                    newLabels[newName] = newLabels[oldName];
                    delete newLabels[oldName];
                    setColumnLabels(newLabels);
                }
            }
        } else {
            const id = generateId();
            const outputType = field.outputType || 'number';
            addCalculatedField(primaryDataset.id, {
                ...field,
                id,
                name: field.name!,
                formula: field.formula!,
                outputType,
                unit: field.unit
            } as CalculatedField);
            if (outputType === 'number') {
                setMetrics(prev => [...prev, { field: field.name!, aggType: 'sum' }]);
            } else {
                setRowFields(prev => [...prev, field.name!]);
            }
        }
        setEditingCalcField(null);
    };

    const handleRemoveCalculatedField = (id: string) => {
        if (!primaryDataset) return;
        const field = primaryDataset.calculatedFields?.find(f => f.id === id);
        if (field) {
            setMetrics(prev => prev.filter(m => m.field !== field.name));
            if (valField === field.name) setValField('');
            if (rowFields.includes(field.name)) setRowFields(prev => prev.filter(f => f !== field.name));
            if (colFields.includes(field.name)) setColFields(prev => prev.filter(f => f !== field.name));
            setFilters(prev => prev.filter(f => f.field !== field.name));
        }
        removeCalculatedField(primaryDataset.id, id);
    };

    const handleSaveSpecificDashboard = (title: string, items: SpecificDashboardItem[]) => {
        addDashboardWidget({
            title,
            type: 'report',
            size: 'lg',
            height: 'lg',
            config: {
                reportItems: items
            }
        });
        setIsSpecificDashboardModalOpen(false);
        setSpecificDashboardItems([]);
        alert("Rapport ajouté à votre tableau de bord !");
        navigate('/dashboard');
    };

    const handleSaveAnalysis = () => {
        if (analysisName.trim() && primaryDataset) {
            const currentTemporalComparison = temporalConfig ? {
                ...temporalConfig,
                groupByFields: rowFields,
                valueField: valField,
                aggType: aggType === 'list' ? 'sum' : aggType as 'sum' | 'count' | 'avg' | 'min' | 'max'
            } : undefined;

            saveAnalysis({
               name: analysisName, type: 'pivot', datasetId: primaryDataset.id,
               config: {
                   sources, rowFields, colFields, colGrouping, valField, aggType, metrics, valFormatting,
                   filters, showSubtotals, showTotalCol, showVariations, sortBy, sortOrder,
                   selectedBatchId, isTemporalMode,
                   temporalComparison: currentTemporalComparison,
                   columnLabels,
                   columnWidths
               }
            });
            setIsSaving(false); setAnalysisName('');
        }
    };

    const handleReset = () => {
        setSources([]);
        setSelectedBatchId('');
        setRowFields([]);
        setColFields([]);
        setValField('');
        setColGrouping('none');
        setAggType('count');
        setMetrics([]);
        setValFormatting({});
        setFilters([]);
        setShowSubtotals(true);
        setShowTotalCol(true);
        setShowVariations(false);
        setSortBy('label');
        setSortOrder('asc');
        setSearchTerm('');
        setIsTemporalMode(false);
        setTemporalConfig(null);
        setColumnLabels({});
        setColumnWidths({});
        setStyleRules([]);
        setConditionalRules([]);
        setAnalysisName('');
        setIsEditMode(false);
        setSpecificDashboardItems([]);
        setCollapsedRows(new Set());
    };

    const toggleRowExpansion = (path: string) => {
        setCollapsedRows(prev => {
            const next = new Set(prev);
            if (next.has(path)) next.delete(path);
            else next.add(path);
            return next;
        });
    };

    const setAllExpansion = (expand: boolean) => {
        if (expand) {
            setCollapsedRows(new Set());
        } else {
            // Collapse all Level 0 groups
            const allLevel0 = new Set<string>();
            const rows = isTemporalMode ? temporalResults : (pivotData?.displayRows || []);
            rows.forEach((row: any) => {
                const keys = isTemporalMode ? row.groupLabel.split('\x1F') : row.keys;
                if (keys.length > 0) {
                    allLevel0.add(keys[0]);
                }
            });
            setCollapsedRows(allLevel0);
        }
    };

    const handleSaveAsDataset = (name: string) => {
        if (!primaryDataset) return;

        let fields: string[] = [];
        let rows: DataRow[] = [];

        if (isTemporalMode && temporalConfig) {
            fields = [...(rowFields || []), ...(temporalConfig.sources || []).map((s: TemporalComparisonSource) => s.label)];
            rows = temporalResultToRows(temporalResults, rowFields, temporalConfig);

            const config = {
                sources,
                rowFields,
                valField,
                aggType,
                metrics,
                filters,
                sortBy,
                sortOrder,
                temporalComparison: {
                    ...temporalConfig,
                    groupByFields: rowFields,
                    valueField: valField,
                    aggType: aggType as 'sum' | 'count' | 'avg' | 'min' | 'max'
                }
            };

            createDerivedDataset(name, true, config, fields, rows);
        } else if (pivotData) {
            fields = [...rowFields, ...pivotData.colHeaders];
            rows = pivotResultToRows(pivotData, rowFields);

            const config = {
                sources, rowFields, colFields, colGrouping, valField, aggType, metrics, filters,
                sortBy, sortOrder, showVariations
            };
            createDerivedDataset(name, false, config, fields, rows);
        }

        alert(`Le Dataset "${name}" a été créé avec succès.`);
        navigate('/data');
    };

    const chartPivotData = useMemo(() => {
        if (isTemporalMode && temporalConfig) {
            const activeMetrics = metrics.length > 0 ? metrics : (valField ? [{ field: valField, aggType }] : []);
            const colHeaders: string[] = [];

            temporalConfig.sources.forEach((s: TemporalComparisonSource) => {
                activeMetrics.forEach(m => {
                    const mLabel = m.label || `${m.field} (${m.aggType})`;
                    colHeaders.push(activeMetrics.length > 1 ? `${s.label} - ${mLabel}` : s.label);
                });
            });

            const displayRows = (temporalResults || []).map(r => {
                const keys = r.groupLabel.split('\x1F');
                const rowMetrics: Record<string, number> = {};
                let rowTotal = 0;

                temporalConfig.sources.forEach((s: TemporalComparisonSource) => {
                    activeMetrics.forEach(m => {
                        const mLabel = m.label || `${m.field} (${m.aggType})`;
                        const val = r.values[s.id]?.[mLabel] || 0;
                        const key = activeMetrics.length > 1 ? `${s.label} - ${mLabel}` : s.label;
                        rowMetrics[key] = val;
                        rowTotal += val;
                    });
                });

                return {
                    type: (r.isSubtotal ? 'subtotal' : 'data') as 'subtotal' | 'data',
                    keys: keys,
                    level: r.isSubtotal ? (r.subtotalLevel ?? 0) : (keys.length - 1),
                    label: r.groupLabel.replace(/[\u001f]/g, ' > '),
                    metrics: rowMetrics,
                    rowTotal: rowTotal
                };
            });
            return { colHeaders, displayRows, colTotals: {}, grandTotal: 0, isTemporal: true };
        }
        return pivotData;
    }, [isTemporalMode, temporalResults, temporalConfig, pivotData, metrics, valField, aggType]);

    return {
        // Data & Hooks
        batches, currentDataset, datasets, savedAnalyses, primaryDataset, datasetBatches,
        blendedRows, pivotData, temporalResults, temporalColTotals, temporalDeltaTotals, isCalculating, chartPivotData,
        filteredPivotRows, filteredTemporalResults,
        rowVirtualizer, colVirtualizer, allDataColumns,
        // UI State
        isInitialized, sources, setSources, selectedBatchId, setSelectedBatchId,
        rowFields, setRowFields, colFields, setColFields, valField, setValField,
        colGrouping, setColGrouping, aggType, setAggType, metrics, setMetrics,
        valFormatting, setValFormatting, filters, setFilters,
        showSubtotals, setShowSubtotals, showTotalCol, setShowTotalCol, showVariations, setShowVariations,
        sortBy, setSortBy, sortOrder, setSortOrder, searchTerm, setSearchTerm,
        isSaving, setIsSaving, isEditMode, setIsEditMode, analysisName, setAnalysisName,
        showExportMenu, setShowExportMenu, showLoadMenu, setShowLoadMenu,
        expandedSections, setExpandedSections,
        isSourceModalOpen, setIsSourceModalOpen, isCalcModalOpen, setIsCalcModalOpen,
        isSpecificDashboardModalOpen, setIsSpecificDashboardModalOpen,
        isFormattingModalOpen, setIsFormattingModalOpen, isQuickChartModalOpen, setIsQuickChartModalOpen,
        isSelectionMode, setIsSelectionMode, isSaveAsDatasetModalOpen, setIsSaveAsDatasetModalOpen,
        formattingSelectionRule, setFormattingSelectionRule,
        specificDashboardItems, setSpecificDashboardItems,
        editingCalcField, setEditingCalcField, columnLabels, setColumnLabels,
        editingColumn, setEditingColumn, columnWidths, setColumnWidths,
        styleRules, setStyleRules, conditionalRules, setConditionalRules,
        collapsedRows, toggleRowExpansion, setAllExpansion,
        isDataSourcesPanelCollapsed, setIsDataSourcesPanelCollapsed,
        isTemporalConfigPanelCollapsed, setIsTemporalConfigPanelCollapsed,
        isFieldsPanelCollapsed, setIsFieldsPanelCollapsed,
        drilldownData, setDrilldownData, isChartModalOpen, setIsChartModalOpen,
        draggedField, setDraggedField, isTemporalMode, setIsTemporalMode,
        temporalConfig, setTemporalConfig, isTemporalSourceModalOpen, setIsTemporalSourceModalOpen,
        // Refs
        parentRef, footerRef,
        // Helpers
        allAvailableFields, usedFields, groupedFields, isColFieldDate,
        // Handlers
        handleValFieldChange, handleDragStart, handleDrop, removeField,
        handleExport: handleExportWrapper, handleExportSpreadsheet: handleExportSpreadsheetWrapper, handleDrilldown, handleCellClick,
        handleTemporalDrilldown, handleLoadAnalysis, handleSaveCalculatedField,
        handleRemoveCalculatedField, handleSaveSpecificDashboard, handleSaveAnalysis,
        handleSaveAsDataset, handleReset, companyLogo
    };
};
