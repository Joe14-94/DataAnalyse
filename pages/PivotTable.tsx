
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MousePointerClick, Palette } from 'lucide-react';
import { useData } from '../context/DataContext';
import { detectColumnType, formatDateFr, generateId, exportView, exportPivotToHTML, formatDateLabelForDisplay } from '../utils';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import { CalculatedField, PivotStyleRule, ConditionalFormattingRule, FilterRule, FieldConfig, PivotJoin, TemporalComparisonConfig, TemporalComparisonSource, TemporalComparisonResult, DataRow, PivotSourceConfig, AggregationType, SortBy, SortOrder, DateGrouping, PivotMetric, SpecificDashboardItem } from '../types';
import { useVirtualizer } from '@tanstack/react-virtual';
import { SourceManagementModal } from '../components/pivot/SourceManagementModal';
import { DrilldownModal } from '../components/pivot/DrilldownModal';
import { FormattingModal } from '../components/pivot/FormattingModal';
import { QuickChartModal } from '../components/pivot/QuickChartModal';
import { TemporalSourceModal } from '../components/pivot/TemporalSourceModal';
import { ChartModal } from '../components/pivot/ChartModal';
import { CalculatedFieldModal } from '../components/pivot/CalculatedFieldModal';
import { SpecificDashboardModal } from '../components/pivot/SpecificDashboardModal';
import { detectDateColumn, formatCurrency, formatPercentage } from '../utils/temporalComparison';

import { usePivotData } from '../hooks/usePivotData';
import { PivotHeader } from '../components/pivot/PivotHeader';
import { PivotSidePanel } from '../components/pivot/PivotSidePanel';
import { PivotGrid } from '../components/pivot/PivotGrid';
import { PivotFooter } from '../components/pivot/PivotFooter';
import { Button } from '../components/ui/Button';
import { SOURCE_COLORS } from '../utils/constants';

type DropZoneType = 'row' | 'col' | 'val' | 'filter';

export const PivotTable: React.FC = () => {
    const {
        batches, currentDataset, currentDatasetId, switchDataset, datasets, savedAnalyses, saveAnalysis,
        lastPivotState, savePivotState, isLoading, companyLogo, addCalculatedField,
        removeCalculatedField, updateCalculatedField, addDashboardWidget
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
    const [drilldownData, setDrilldownData] = useState<{ rows: any[], title: string, fields: string[] } | null>(null);
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
            // Si aucun TCD n'a été créé ou travaillé, on laisse les sources vides
            setSources([]);
        }
        setIsInitialized(true);
    }, [currentDataset, lastPivotState]);

    useEffect(() => {
        if (!isInitialized || !primaryDataset) return;

        const currentTemporalComparison = temporalConfig ? {
            ...temporalConfig,
            groupByFields: rowFields,
            valueField: valField,
            aggType: aggType === 'list' ? 'sum' : aggType as any
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
            } as any
        });
    }, [sources, rowFields, colFields, colGrouping, valField, aggType, metrics, valFormatting, filters, showSubtotals, showTotalCol, showVariations, sortBy, sortOrder, selectedBatchId, primaryDataset, isInitialized, isTemporalMode, temporalConfig, columnWidths, columnLabels, styleRules, conditionalRules, searchTerm]);

    useEffect(() => {
        if (isLoading || !isInitialized) return;
        if (datasetBatches.length > 0 && !datasetBatches.find(b => b.id === selectedBatchId)) {
            setSelectedBatchId(datasetBatches[0].id);
        }
    }, [datasetBatches, selectedBatchId, isLoading, isInitialized]);

    // --- HELPERS ---
    const allAvailableFields = useMemo(() => {
        if (!primaryDataset) return [];
        return [...(primaryDataset.fields || []), ...(primaryDataset.calculatedFields || []).map(cf => cf.name)];
    }, [primaryDataset]);

    const usedFields = useMemo(() => {
        const used = new Set<string>();
        rowFields.forEach(f => used.add(f));
        colFields.forEach(f => used.add(f));
        if (valField) used.add(valField);
        metrics.forEach(m => used.add(m.field));
        filters.forEach(f => used.add(f.field));
        return used;
    }, [rowFields, colFields, valField, metrics, filters]);

    const groupedFields = useMemo(() => {
        return sources.map(src => {
            const ds = datasets.find(d => d.id === src.datasetId);
            if (!ds) return null;
            const prefix = src.isPrimary ? '' : `[${ds.name}] `;
            const fields = [...ds.fields, ...(ds.calculatedFields || []).map(cf => cf.name)].map(f => `${prefix}${f}`);
            return { id: src.id, name: ds.name, isPrimary: src.isPrimary, fields, color: src.color };
        }).filter(Boolean);
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

    const rowVirtualizer = useVirtualizer({
        count: pivotData ? pivotData.displayRows.length : 0,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 35,
        overscan: 20
    });

    // --- HANDLERS ---
    const handleValFieldChange = (newField: string) => {
        setValField(newField);
        setValFormatting({});
        if (blendedRows.length > 0) {
            const type = detectColumnType(blendedRows.slice(0, 50).map(r => String(r[newField] || '')));
            const newAgg = (type === 'number' ? 'sum' : 'count') as AggregationType;
            setAggType(newAgg);

            // Auto-update metrics if it was empty or matches valField
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
                const type = blendedRows.length > 0 ? detectColumnType(blendedRows.slice(0, 50).map(r => String(r[field] || ''))) : 'text';
                const agg = (type === 'number' ? 'sum' : 'count') as AggregationType;
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

    const handleExport = (format: 'pdf' | 'html', mode: any = 'adaptive') => {
        setShowExportMenu(false);

        if (format === 'html' && pivotData) {
            // Use data-based export for HTML to include all rows (not just virtualized ones)
            exportPivotToHTML(pivotData, rowFields, showTotalCol, `TCD - ${primaryDataset?.name || 'Analyse'}`, companyLogo);
        } else {
            // Use DOM-based export for PDF
            exportView(format, 'pivot-export-container', `TCD - ${primaryDataset?.name || 'Analyse'}`, companyLogo, mode);
        }
    };

    const handleExportSpreadsheet = (format: 'xlsx' | 'csv') => {
        setShowExportMenu(false);

        if (!pivotData || !primaryDataset) {
            alert("Aucune donnée à exporter");
            return;
        }

        // Build export data structure
        const exportData: any[][] = [];

        // Header row - separate column for each row field
        const headers: string[] = [];

        // Add a column for each row field
        rowFields.forEach(field => {
            headers.push(field);
        });

        // Add column headers (metrics)
        pivotData.colHeaders.forEach(header => {
            headers.push(header);
        });

        // Add "Total" column if row totals are shown
        if (showTotalCol) {
            headers.push('Total');
        }

        exportData.push(headers);

        // Data rows
        pivotData.displayRows.forEach(row => {
            const rowData: any[] = [];

            // Add each key in its own column
            // row.keys contains the hierarchy: ["France", "Paris", "Ordinateur"]
            rowFields.forEach((field, index) => {
                if (index < row.keys.length) {
                    // Add indentation for subtotals
                    const indent = row.type === 'subtotal' && index === row.keys.length - 1
                        ? '  '.repeat(row.level || 0)
                        : '';
                    rowData.push(indent + row.keys[index]);
                } else {
                    // Empty cell for higher level subtotals
                    rowData.push('');
                }
            });

            // Metric values for each column
            pivotData.colHeaders.forEach(colHeader => {
                const value = row.metrics[colHeader];
                rowData.push(value !== undefined && value !== null ? value : '');
            });

            // Row total
            if (showTotalCol) {
                const total = row.rowTotal;
                rowData.push(total !== undefined && total !== null ? total : '');
            }

            exportData.push(rowData);
        });

        // Column totals row
        if (pivotData.colTotals) {
            const totalsRow: any[] = [];

            // "Total" label in first column, empty for others
            totalsRow.push('Total');
            for (let i = 1; i < rowFields.length; i++) {
                totalsRow.push('');
            }

            // Column totals
            pivotData.colHeaders.forEach(colHeader => {
                const total = pivotData.colTotals[colHeader];
                totalsRow.push(total !== undefined && total !== null ? total : '');
            });

            // Grand total
            if (showTotalCol && pivotData.grandTotal !== undefined) {
                totalsRow.push(pivotData.grandTotal);
            }

            exportData.push(totalsRow);
        }

        // Export based on format
        if (format === 'csv') {
            // CSV Export
            const csvContent = exportData.map(row =>
                row.map(cell => {
                    const str = String(cell);
                    // Escape cells containing semicolon, newline, or quote
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
            // XLSX Export
            const ws = XLSX.utils.aoa_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'TCD');
            XLSX.writeFile(wb, `TCD_${primaryDataset.name}_${new Date().toISOString().split('T')[0]}.xlsx`);
        }
    };

    const handleDrilldown = (rowKeys: string[], colLabel: string) => {
        if (isSelectionMode) return;

        const prefilledFilters: Record<string, string> = {};

        // Filter by Row Fields
        rowFields.forEach((field, i) => {
            const val = rowKeys[i];
            if (val === '(Vide)') {
                prefilledFilters[field] = '__EMPTY__';
            } else {
                prefilledFilters[field] = `=${val}`;
            }
        });

        // Filter by Column Fields
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

        // Filter by specific batch if selected
        if (selectedBatchId) {
            prefilledFilters['_batchId'] = selectedBatchId;
        }

        navigate('/data', { state: { prefilledFilters } });
    };

    const handleCellClick = (rowKeys: string[], colLabel: string, value: any, metricLabel: string) => {
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
        const label = `${rowKeys[rowKeys.length-1]} - ${colLabel}`;

        const newItem: SpecificDashboardItem = {
            id,
            label,
            value,
            rowPath: rowKeys,
            colLabel,
            metricLabel
        };

        setSpecificDashboardItems(prev => [...prev, newItem]);
    };

    const handleTemporalDrilldown = (result: TemporalComparisonResult, sourceId: string) => {
        const source = temporalConfig?.sources.find(s => s.id === sourceId);
        const value = result.values[sourceId] || 0;
        const label = source?.label || sourceId;

        if (formattingSelectionRule) {
            const rowKeys = result.groupLabel.split('\x1F');
            const targetKey = `${rowKeys.join('\x1F')}|${label}`;

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
            const id = generateId();
            const rowKeys = result.groupLabel.split('\x1F');
            const displayLabel = `${rowKeys[rowKeys.length - 1]} - ${label}`;

            const newItem: SpecificDashboardItem = {
                id,
                label: displayLabel,
                value,
                rowPath: rowKeys,
                colLabel: label,
                metricLabel: label
            };

            setSpecificDashboardItems(prev => [...prev, newItem]);
            return;
        }

        const prefilledFilters: Record<string, string> = {};
        const rowKeys = result.groupLabel.split('\x1F');

        // Filter by Row Fields
        rowFields.forEach((field, i) => {
            const val = rowKeys[i];
            if (val === '(Vide)') {
                prefilledFilters[field] = '__EMPTY__';
            } else {
                prefilledFilters[field] = `=${val}`;
            }
        });

        // Target the specific batch
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

            // Update all references in TCD if name changed
            if (newName !== oldName) {
                setMetrics(prev => prev.map(m => m.field === oldName ? { ...m, field: newName } : m));
                if (valField === oldName) setValField(newName);
                setRowFields(prev => prev.map(f => f === oldName ? newName : f));
                setColFields(prev => prev.map(f => f === oldName ? newName : f));
                setFilters(prev => prev.map(f => f.field === oldName ? { ...f, field: newName } : f));

                // Update column labels if any
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
            // Auto add based on output type
            if (outputType === 'number') {
                // Numbers go to metrics (values)
                setMetrics(prev => [...prev, { field: field.name!, aggType: 'sum' }]);
            } else {
                // Text and boolean go to rows (dimensions)
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
                aggType: aggType === 'list' ? 'sum' : aggType as any
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

    const chartPivotData = useMemo(() => {
        if (isTemporalMode && temporalConfig) {
            const colHeaders = temporalConfig.sources.map((s: any) => s.label);
            const displayRows = temporalResults.map(r => {
                const keys = r.groupLabel.split('\x1F');
                return {
                    type: (r.isSubtotal ? 'subtotal' : 'data') as 'subtotal' | 'data',
                    keys: keys,
                    level: r.isSubtotal ? (r.subtotalLevel ?? 0) : (keys.length - 1),
                    label: r.groupLabel.replace(/\x1F/g, ' > '),
                    metrics: temporalConfig.sources.reduce((acc: any, s: any) => ({ ...acc, [s.label]: r.values[s.id] || 0 }), {}),
                    rowTotal: Object.values(r.values).reduce((a: number, b: any) => a + (b || 0), 0)
                };
            });
            return { colHeaders, displayRows, colTotals: {}, grandTotal: 0, isTemporal: true };
        }
        return pivotData;
    }, [isTemporalMode, temporalResults, temporalConfig, pivotData]);

    return (
        <div className="h-full flex flex-col p-2 gap-2 relative bg-slate-50">
            <PivotHeader
               isTemporalMode={isTemporalMode} setIsTemporalMode={setIsTemporalMode} handleToChart={() => setIsChartModalOpen(true)}
               setIsSelectionMode={setIsSelectionMode}
               primaryDataset={primaryDataset} datasets={datasets} showExportMenu={showExportMenu} setShowExportMenu={setShowExportMenu}
               handleExport={handleExport} handleExportSpreadsheet={handleExportSpreadsheet} showLoadMenu={showLoadMenu} setShowLoadMenu={setShowLoadMenu}
               savedAnalyses={savedAnalyses} handleLoadAnalysis={handleLoadAnalysis} isSaving={isSaving} setIsSaving={setIsSaving}
               isEditMode={isEditMode} setIsEditMode={setIsEditMode}
               analysisName={analysisName} setAnalysisName={setAnalysisName} handleSaveAnalysis={handleSaveAnalysis}
               openCalcModal={() => { setEditingCalcField(null); setIsCalcModalOpen(true); }}
               openFormattingModal={() => setIsFormattingModalOpen(true)}
               openSpecificDashboardModal={() => setIsSpecificDashboardModalOpen(true)}
               selectedItemsCount={specificDashboardItems.length}
               searchTerm={searchTerm}
               setSearchTerm={setSearchTerm}
            />

            <div className="flex flex-col xl:flex-row gap-2 flex-1 min-h-0">
                <PivotSidePanel
                   {...{ sources, datasets, datasetBatches, selectedBatchId, setSelectedBatchId, startAddSource: () => setIsSourceModalOpen(true), removeSource: (id) => setSources(s => s.filter(x => x.id !== id)),
                   isDataSourcesPanelCollapsed, setIsDataSourcesPanelCollapsed, isTemporalMode, isTemporalConfigPanelCollapsed, setIsTemporalConfigPanelCollapsed, setIsTemporalSourceModalOpen, temporalConfig, setTemporalConfig,
                   rowFields, setRowFields, colFields, setColFields, valField, handleValFieldChange, setValField, aggType, setAggType, metrics, setMetrics, valFormatting, setValFormatting, filters, setFilters,
                   isFieldsPanelCollapsed, setIsFieldsPanelCollapsed, groupedFields, expandedSections, toggleSection: (id) => setExpandedSections(p => ({ ...p, [id]: !p[id] })), usedFields,
                   allAvailableFields, primaryDataset, colGrouping, setColGrouping, isColFieldDate, showSubtotals, setShowSubtotals, showTotalCol, setShowTotalCol, showVariations, setShowVariations,
                   handleDragStart, handleDragOver: (e) => e.preventDefault(), handleDrop, removeField, draggedField,
                   openCalcModal: () => { setEditingCalcField(null); setIsCalcModalOpen(true); },
                   removeCalculatedField: handleRemoveCalculatedField,
                   openEditCalcModal: (field: any) => { setEditingCalcField(field); setIsCalcModalOpen(true); },
                   openFormattingModal: () => setIsFormattingModalOpen(true) }}
                />

                <div className="flex-1 flex flex-col min-w-0 bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm relative">
                    {isSelectionMode && (
                        <div className="absolute top-0 left-0 right-0 z-50 bg-brand-600 text-white p-2 flex justify-between items-center shadow-md animate-in slide-in-from-top">
                            <div className="flex items-center gap-2 px-2">
                                <MousePointerClick className="w-4 h-4 animate-pulse" />
                                <span className="text-xs font-bold uppercase tracking-wider">Mode sélection : Cliquez sur une cellule pour l'ajouter</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="bg-white/20 text-white px-2 py-0.5 rounded text-[10px] font-black border border-white/30">{specificDashboardItems.length} CELLULES</span>
                                <Button size="sm" className="bg-indigo-500 text-white font-black hover:bg-indigo-400 py-1 shadow-sm border-none" onClick={() => setIsQuickChartModalOpen(true)} disabled={specificDashboardItems.length === 0}>Visualiser</Button>
                                <Button size="sm" className="bg-white text-slate-900 font-black hover:bg-brand-50 py-1 shadow-sm border-none" onClick={() => { setIsSelectionMode(false); setIsSpecificDashboardModalOpen(true); }}>Créer Rapport</Button>
                                <Button size="sm" variant="outline" className="text-white border-white/30 hover:bg-white/10 py-1" onClick={() => { setIsSelectionMode(false); setSpecificDashboardItems([]); }}>Annuler</Button>
                                <Button size="sm" variant="outline" className="text-white border-white/30 hover:bg-white/10 py-1" onClick={() => setSpecificDashboardItems([])} disabled={specificDashboardItems.length === 0}>Vider</Button>
                            </div>
                        </div>
                    )}
                    {formattingSelectionRule && (
                        <div className="absolute top-0 left-0 right-0 z-50 bg-indigo-600 text-white p-2 flex justify-between items-center shadow-md animate-in slide-in-from-top">
                            <div className="flex items-center gap-2 px-2">
                                <Palette className="w-4 h-4 animate-pulse" />
                                <span className="text-xs font-bold uppercase tracking-wider">Mise en forme : Cliquez sur une ligne, colonne ou cellule pour l'affecter à la règle</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button size="sm" variant="outline" className="text-white border-white/30 hover:bg-white/10 py-1" onClick={() => { setFormattingSelectionRule(null); setIsFormattingModalOpen(true); }}>Annuler</Button>
                            </div>
                        </div>
                    )}
                    <PivotGrid
                       {...{ isCalculating, isTemporalMode, pivotData, temporalResults, temporalConfig, rowFields, colFields, columnLabels, editingColumn, setEditingColumn, setColumnLabels, showVariations, showTotalCol,
                       handleDrilldown: handleCellClick, handleTemporalDrilldown, primaryDataset, datasets, aggType, valField, metrics, valFormatting, virtualItems: rowVirtualizer.getVirtualItems(), rowVirtualizer, parentRef,
                       isSelectionMode, isFormattingSelectionMode: !!formattingSelectionRule, selectedItems: specificDashboardItems, isEditMode,
                       sortBy, setSortBy, sortOrder, setSortOrder,
                       columnWidths, setColumnWidths,
                       styleRules, conditionalRules,
                       onRemoveField: removeField,
                       totalColumns: rowFields.length + (pivotData?.colHeaders.length || 0) + (showTotalCol ? 1 : 0),
                       paddingTop: rowVirtualizer.getVirtualItems().length > 0 ? rowVirtualizer.getVirtualItems()[0].start : 0,
                       paddingBottom: rowVirtualizer.getVirtualItems().length > 0 ? rowVirtualizer.getTotalSize() - rowVirtualizer.getVirtualItems()[rowVirtualizer.getVirtualItems().length - 1].end : 0 }}
                    />
                    <PivotFooter
                       {...{ pivotData, temporalColTotals, temporalConfig, rowFields, columnWidths, footerRef, valField, aggType, metrics, primaryDataset, datasets, valFormatting, showTotalCol, showVariations, styleRules, conditionalRules }}
                    />
                </div>
            </div>

            <SourceManagementModal isOpen={isSourceModalOpen} onClose={() => setIsSourceModalOpen(false)} sources={sources} datasets={datasets} batches={batches} primaryDataset={primaryDataset} onSourcesChange={setSources} />
            <DrilldownModal isOpen={drilldownData !== null} onClose={() => setDrilldownData(null)} title={drilldownData?.title || ''} rows={drilldownData?.rows || []} fields={drilldownData?.fields || []} />
            {isChartModalOpen && chartPivotData && (
                <ChartModal
                   isOpen={isChartModalOpen}
                   onClose={() => setIsChartModalOpen(false)}
                   pivotData={chartPivotData as any}
                   pivotConfig={{
                      rows: blendedRows,
                      rowFields: isTemporalMode ? (temporalConfig?.groupByFields || []) : rowFields,
                      colFields: isTemporalMode ? [] : colFields,
                      colGrouping, valField, aggType, filters, sortBy, sortOrder, showSubtotals, showVariations,
                      currentDataset: primaryDataset, datasets, valFormatting
                   }}
                   isTemporalMode={isTemporalMode}
                   temporalComparison={temporalConfig}
                   selectedBatchId={selectedBatchId}
                />
            )}
            <TemporalSourceModal isOpen={isTemporalSourceModalOpen} onClose={() => setIsTemporalSourceModalOpen(false)} primaryDataset={primaryDataset || null} batches={batches} currentSources={temporalConfig?.sources || []} onSourcesChange={(s, r, extra) => setTemporalConfig({ ...temporalConfig, ...extra, sources: s, referenceSourceId: r, deltaFormat: temporalConfig?.deltaFormat || 'value', groupByFields: rowFields, valueField: valField, aggType: aggType as any })} />
            <CalculatedFieldModal
                isOpen={isCalcModalOpen}
                onClose={() => { setIsCalcModalOpen(false); setEditingCalcField(null); }}
                fields={allAvailableFields}
                onSave={handleSaveCalculatedField}
                initialField={editingCalcField}
                sampleRow={blendedRows.length > 0 ? blendedRows[0] : null}
            />

            <FormattingModal
                isOpen={isFormattingModalOpen}
                onClose={() => setIsFormattingModalOpen(false)}
                styleRules={styleRules}
                setStyleRules={setStyleRules}
                conditionalRules={conditionalRules}
                setConditionalRules={setConditionalRules}
                metrics={metrics}
                rowFields={rowFields}
                colFields={colFields}
                additionalLabels={isTemporalMode ? temporalConfig?.sources.map(s => s.label) : []}
                onStartSelection={(ruleId, type) => {
                    setFormattingSelectionRule({ id: ruleId, type });
                    setIsFormattingModalOpen(false);
                }}
            />

            <SpecificDashboardModal
                isOpen={isSpecificDashboardModalOpen}
                onClose={() => setIsSpecificDashboardModalOpen(false)}
                items={specificDashboardItems}
                setItems={setSpecificDashboardItems}
                onStartSelection={() => { setIsSpecificDashboardModalOpen(false); setIsSelectionMode(true); }}
                onSave={handleSaveSpecificDashboard}
            />

            <QuickChartModal
                isOpen={isQuickChartModalOpen}
                onClose={() => setIsQuickChartModalOpen(false)}
                items={specificDashboardItems}
            />
        </div>
    );
};
