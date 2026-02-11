import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useData } from '../context/DataContext';
import {
    detectColumnType, generateId, exportView, exportPivotToHTML, formatDateLabelForDisplay
} from '../utils';
import * as XLSX from 'xlsx';
import {
    CalculatedField, PivotStyleRule, ConditionalFormattingRule, FilterRule, FieldConfig,
    TemporalComparisonConfig, TemporalComparisonResult, PivotSourceConfig,
    AggregationType, SortBy, SortOrder, DateGrouping, PivotMetric, SpecificDashboardItem,
    DataRow, TemporalComparisonSource
} from '../types';
import { usePivotData } from './usePivotData';
import { formatPivotOutput } from '../logic/pivotEngine';
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
       blendedRows, pivotData, temporalResults, temporalColTotals, isCalculating, primaryDataset, datasetBatches
    } = usePivotData({
       sources, selectedBatchId, rowFields, colFields, colGrouping, valField, aggType, metrics, filters, sortBy, sortOrder, showSubtotals, showVariations, isTemporalMode, temporalConfig, searchTerm
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

    const rowVirtualizer = useVirtualizer({
        count: isTemporalMode ? temporalResults.length : (pivotData?.displayRows.length || 0),
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

    const handleExport = (format: 'pdf' | 'html', mode: 'adaptive' | 'A4' = 'adaptive') => {
        setShowExportMenu(false);

        if (format === 'html') {
            const title = `TCD - ${primaryDataset?.name || 'Analyse'}`;
            const formatOutput = (val: string | number, metric?: PivotMetric) => {
                const field = metric?.field || valField;
                const type = metric?.aggType || aggType;
                return formatPivotOutput(val, field, type, primaryDataset, undefined, datasets, metric?.formatting || valFormatting);
            };

            if (isTemporalMode && (temporalResults?.length > 0)) {
                exportPivotToHTML(temporalResults, rowFields, showTotalCol, title, companyLogo, {
                    isTemporalMode: true,
                    temporalConfig,
                    temporalColTotals,
                    metrics: metrics.length > 0 ? metrics : (valField ? [{ field: valField, aggType }] : []),
                    showVariations,
                    formatOutput,
                    fieldConfigs: primaryDataset?.fieldConfigs
                });
            } else if (pivotData) {
                exportPivotToHTML(pivotData, rowFields, showTotalCol, title, companyLogo, {
                    formatOutput,
                    metrics: metrics.length > 0 ? metrics : (valField ? [{ field: valField, aggType }] : []),
                    fieldConfigs: primaryDataset?.fieldConfigs
                });
            } else {
                alert("Aucune donnée à exporter");
            }
        } else {
            exportView(format, 'pivot-export-container', `TCD - ${primaryDataset?.name || 'Analyse'}`, companyLogo, mode);
        }
    };

    const handleExportSpreadsheet = (format: 'xlsx' | 'csv') => {
        setShowExportMenu(false);

        if (!primaryDataset) {
            alert("Veuillez sélectionner un dataset");
            return;
        }

        if (!isTemporalMode && !pivotData) {
            alert("Aucune donnée à exporter");
            return;
        }

        if (isTemporalMode && (!temporalResults || temporalResults.length === 0)) {
            alert("Aucune donnée à exporter");
            return;
        }

        const exportData: (string | number | boolean | Record<string, any>)[][] = [];
        const activeMetrics = metrics.length > 0 ? metrics : (valField ? [{ field: valField, aggType }] : []);

        if (isTemporalMode && temporalConfig) {
            const headers: string[] = [...rowFields];

            temporalConfig.sources.forEach((s: TemporalComparisonSource) => {
                activeMetrics.forEach(m => {
                    const mLabel = m.label || `${m.field} (${m.aggType})`;
                    headers.push(activeMetrics.length > 1 ? `${s.label} - ${mLabel}` : s.label);
                });
                if (showVariations && s.id !== temporalConfig.referenceSourceId) {
                    activeMetrics.forEach(m => {
                        const mLabel = m.label || `${m.field} (${m.aggType})`;
                        headers.push(activeMetrics.length > 1 ? `Var. ${s.label} - ${mLabel}` : `Var. ${s.label}`);
                    });
                }
            });
            exportData.push(headers);

            temporalResults.forEach(result => {
                const rowData: (string | number | boolean | Record<string, any>)[] = [];
                const keys = result.groupLabel.split('\x1F');
                const isSubtotal = result.isSubtotal;
                const subLevel = result.subtotalLevel || 0;

                rowFields.forEach((field, idx) => {
                    const rawValue = keys[idx] || '';
                    const label = primaryDataset?.fieldConfigs?.[field]?.type === 'date' ? formatDateLabelForDisplay(rawValue) : rawValue;
                    if (isSubtotal) {
                        if (idx === subLevel) rowData.push(`Total ${label}`);
                        else if (idx < subLevel) rowData.push(label);
                        else rowData.push('');
                    } else {
                        rowData.push(label);
                    }
                });

                temporalConfig.sources.forEach((s: TemporalComparisonSource) => {
                    activeMetrics.forEach(m => {
                        const mLabel = m.label || `${m.field} (${m.aggType})`;
                        rowData.push(result.values[s.id]?.[mLabel] ?? '');
                    });
                    if (showVariations && s.id !== temporalConfig.referenceSourceId) {
                        activeMetrics.forEach(m => {
                            const mLabel = m.label || `${m.field} (${m.aggType})`;
                            const delta = result.deltas[s.id]?.[mLabel];
                            if (temporalConfig.deltaFormat === 'percentage') {
                                rowData.push(delta ? `${delta.percentage.toFixed(1)}%` : '');
                            } else {
                                rowData.push(delta?.value ?? '');
                            }
                        });
                    }
                });
                exportData.push(rowData);
            });

            if (temporalColTotals) {
                const totalsRow: (string | number | boolean | Record<string, any>)[] = ['TOTAL'];
                for (let i = 1; i < rowFields.length; i++) totalsRow.push('');

                temporalConfig.sources.forEach((s: TemporalComparisonSource) => {
                    activeMetrics.forEach(m => {
                        const mLabel = m.label || `${m.field} (${m.aggType})`;
                        totalsRow.push(temporalColTotals[s.id]?.[mLabel] ?? '');
                    });
                    if (showVariations && s.id !== temporalConfig.referenceSourceId) {
                        activeMetrics.forEach(() => totalsRow.push(''));
                    }
                });
                exportData.push(totalsRow);
            }
        } else if (pivotData) {
            const headers: string[] = [...rowFields];
            pivotData.colHeaders.forEach(header => headers.push(header));
            if (showTotalCol) headers.push('Total');
            exportData.push(headers);

            pivotData.displayRows.forEach(row => {
                const rowData: (string | number | boolean | Record<string, any>)[] = [];
                rowFields.forEach((field, index) => {
                    if (index < row.keys.length) {
                        const indent = row.type === 'subtotal' && index === row.keys.length - 1
                            ? '  '.repeat(row.level || 0)
                            : '';
                        const rawValue = row.keys[index] || '';
                        const label = primaryDataset?.fieldConfigs?.[field]?.type === 'date' ? formatDateLabelForDisplay(rawValue) : rawValue;
                        rowData.push(indent + label);
                    } else {
                        rowData.push('');
                    }
                });

                pivotData.colHeaders.forEach(colHeader => {
                    rowData.push(row.metrics[colHeader] ?? '');
                });

                if (showTotalCol) {
                    rowData.push(row.rowTotal ?? '');
                }
                exportData.push(rowData);
            });

            if (pivotData.colTotals) {
                const totalsRow: (string | number | boolean | Record<string, any>)[] = ['Total'];
                for (let i = 1; i < rowFields.length; i++) totalsRow.push('');
                pivotData.colHeaders.forEach(colHeader => totalsRow.push(pivotData.colTotals[colHeader] ?? ''));
                if (showTotalCol && pivotData.grandTotal !== undefined) totalsRow.push(pivotData.grandTotal);
                exportData.push(totalsRow);
            }
        }

        if (format === 'csv') {
            const csvContent = exportData.map(row =>
                row.map(cell => {
                    const str = String(cell);
                    if (str.includes(';') || str.includes('\n') || str.includes('"')) {
                        return `"${str.replace(/"/g, '""')}"`;
                    }
                    return str;
                }).join(';')
            ).join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `TCD_${primaryDataset.name}_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            const ws = XLSX.utils.aoa_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'TCD');
            XLSX.writeFile(wb, `TCD_${primaryDataset.name}_${new Date().toISOString().split('T')[0]}.xlsx`);
        }
    };

    const handleDrilldown = (rowKeys: string[], colLabel: string) => {
        if (isSelectionMode) return;

        const prefilledFilters: Record<string, string> = {};

        rowFields.forEach((field, i) => {
            const val = rowKeys[i];
            if (val === '(Vide)') {
                prefilledFilters[field] = '__EMPTY__';
            } else {
                prefilledFilters[field] = `=${val}`;
            }
        });

        if (colFields.length > 0 && colLabel !== 'Total' && colLabel !== 'ALL') {
            const colValues = colLabel.split('\x1F');
            colFields.forEach((field, i) => {
                const val = colValues[i];
                if (val === undefined) return;
                if (val === '(Vide)') {
                    prefilledFilters[field] = '__EMPTY__';
                } else {
                    prefilledFilters[field] = `=${val}`;
                }
            });
        }

        if (selectedBatchId) {
            prefilledFilters['_batchId'] = selectedBatchId;
        }

        navigate('/data', { state: { prefilledFilters } });
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
        blendedRows, pivotData, temporalResults, temporalColTotals, isCalculating, chartPivotData,
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
        handleExport, handleExportSpreadsheet, handleDrilldown, handleCellClick,
        handleTemporalDrilldown, handleLoadAnalysis, handleSaveCalculatedField,
        handleRemoveCalculatedField, handleSaveSpecificDashboard, handleSaveAnalysis,
        handleSaveAsDataset, handleReset, companyLogo
    };
};
