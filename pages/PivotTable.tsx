
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import { detectColumnType, formatDateFr, generateId, exportView, formatDateLabelForDisplay } from '../utils';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import { PivotStyleRule, FilterRule, FieldConfig, PivotJoin, TemporalComparisonConfig, TemporalComparisonSource, TemporalComparisonResult, DataRow, PivotSourceConfig, AggregationType, SortBy, SortOrder, DateGrouping } from '../types';
import { useVirtualizer } from '@tanstack/react-virtual';
import { SourceManagementModal } from '../components/pivot/SourceManagementModal';
import { DrilldownModal } from '../components/pivot/DrilldownModal';
import { TemporalSourceModal } from '../components/pivot/TemporalSourceModal';
import { ChartModal } from '../components/pivot/ChartModal';
import { detectDateColumn, formatCurrency, formatPercentage } from '../utils/temporalComparison';

import { usePivotData } from '../hooks/usePivotData';
import { PivotHeader } from '../components/pivot/PivotHeader';
import { PivotSidePanel } from '../components/pivot/PivotSidePanel';
import { PivotGrid } from '../components/pivot/PivotGrid';
import { PivotFooter } from '../components/pivot/PivotFooter';
import { SOURCE_COLORS } from '../utils/constants';

type DropZoneType = 'row' | 'col' | 'val' | 'filter';

export const PivotTable: React.FC = () => {
    const {
        batches, currentDataset, datasets, savedAnalyses, saveAnalysis,
        lastPivotState, savePivotState, isLoading, companyLogo
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
    const [valFormatting, setValFormatting] = useState<Partial<FieldConfig>>({});
    const [filters, setFilters] = useState<FilterRule[]>([]);
    const [showSubtotals, setShowSubtotals] = useState(true);
    const [showTotalCol, setShowTotalCol] = useState(true);
    const [showVariations, setShowVariations] = useState(false);
    const [sortBy, setSortBy] = useState<SortBy>('label');
    const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

    // UI STATE
    const [isSaving, setIsSaving] = useState(false);
    const [analysisName, setAnalysisName] = useState('');
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [showLoadMenu, setShowLoadMenu] = useState(false);
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
    const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
    const [columnLabels, setColumnLabels] = useState<Record<string, string>>({});
    const [editingColumn, setEditingColumn] = useState<string | null>(null);

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
       blendedRows, pivotData, temporalResults, isCalculating, primaryDataset, datasetBatches
    } = usePivotData({
       sources, selectedBatchId, rowFields, colFields, colGrouping, valField, aggType, filters, sortBy, sortOrder, showSubtotals, showVariations, isTemporalMode, temporalConfig
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
            setValFormatting(c.valFormatting || {});
            setFilters(c.filters || []);
            setShowSubtotals(c.showSubtotals !== undefined ? c.showSubtotals : true);
            setShowTotalCol(c.showTotalCol !== undefined ? c.showTotalCol : true);
            setShowVariations(c.showVariations || false);
            setSortBy(c.sortBy || 'label');
            setSortOrder(c.sortOrder || 'asc');
            if (c.selectedBatchId) setSelectedBatchId(c.selectedBatchId);
            setIsTemporalMode(c.isTemporalMode || false);
            setTemporalConfig(c.temporalComparison || null);
        } else {
            // Si aucun TCD n'a été créé ou travaillé, on laisse les sources vides
            setSources([]);
        }
        setIsInitialized(true);
    }, [currentDataset, lastPivotState]);

    useEffect(() => {
        if (!isInitialized || !primaryDataset) return;
        savePivotState({
            datasetId: primaryDataset.id,
            config: { sources, rowFields, colFields, colGrouping, valField, aggType, valFormatting, filters, showSubtotals, showTotalCol, showVariations, sortBy, sortOrder, selectedBatchId, isTemporalMode, temporalComparison: temporalConfig || undefined }
        });
    }, [sources, rowFields, colFields, colGrouping, valField, aggType, valFormatting, filters, showSubtotals, showTotalCol, showVariations, sortBy, sortOrder, selectedBatchId, primaryDataset, isInitialized, isTemporalMode, temporalConfig]);

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
        filters.forEach(f => used.add(f.field));
        return used;
    }, [rowFields, colFields, valField, filters]);

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
        const handleScroll = () => { footer.scrollLeft = parent.scrollLeft; };
        parent.addEventListener('scroll', handleScroll);
        return () => parent.removeEventListener('scroll', handleScroll);
    }, [pivotData]);

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
            setAggType((type === 'number' ? 'sum' : 'count') as AggregationType);
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
        if (source === 'val' && valField === field) setValField('');
        if (source === 'filter') setFilters(prev => prev.filter(f => f.field !== field));

        if (targetZone === 'row' && !rowFields.includes(field)) setRowFields(prev => [...prev, field]);
        else if (targetZone === 'col' && !colFields.includes(field)) setColFields(prev => [...prev, field]);
        else if (targetZone === 'val') handleValFieldChange(field);
        else if (targetZone === 'filter' && !filters.some(f => f.field === field)) setFilters(prev => [...prev, { field, operator: 'in', value: [] }]);
        setDraggedField(null);
    };

    const removeField = (zone: DropZoneType, field: string) => {
        if (zone === 'row') setRowFields(prev => prev.filter(f => f !== field));
        if (zone === 'col') setColFields(prev => prev.filter(f => f !== field));
        if (zone === 'val') setValField('');
        if (zone === 'filter') setFilters(prev => prev.filter(f => f.field !== field));
    };

    const handleExport = (format: 'pdf' | 'html', mode: any = 'adaptive') => {
        setShowExportMenu(false);
        exportView(format, 'pivot-export-container', `TCD - ${primaryDataset?.name || 'Analyse'}`, companyLogo, mode);
    };

    const handleExportSpreadsheet = (format: 'xlsx' | 'csv') => {
        setShowExportMenu(false);
        // Simplified export logic here - reuse existing logic if possible or move to util
        alert("Export spreadsheet triggered");
    };

    const handleDrilldown = (rowKeys: string[], colLabel: string) => {
        const detailRows = blendedRows.filter(row => rowFields.every((f, i) => String(row[f] || '') === (rowKeys[i] === '(Vide)' ? '' : rowKeys[i])));
        if (detailRows.length > 0) setDrilldownData({ rows: detailRows, title: `Détails: ${rowKeys.join(' > ')}`, fields: primaryDataset?.fields || [] });
    };

    const handleTemporalDrilldown = (result: TemporalComparisonResult) => {
        if (result.details) setDrilldownData({ rows: result.details, title: `Détails: ${result.groupLabel}`, fields: primaryDataset?.fields || [] });
    };

    const handleLoadAnalysis = (id: string) => {
        const a = savedAnalyses.find(x => x.id === id);
        if (a) {
            const c = a.config;
            setSources(c.sources || sources);
            setRowFields(c.rowFields); setColFields(c.colFields); setValField(c.valField); setAggType(c.aggType);
            setFilters(c.filters); setIsTemporalMode(!!c.isTemporalMode); setTemporalConfig(c.temporalComparison);
        }
        setShowLoadMenu(false);
    };

    const handleSaveAnalysis = () => {
        if (analysisName.trim() && primaryDataset) {
            saveAnalysis({
               name: analysisName, type: 'pivot', datasetId: primaryDataset.id,
               config: { sources, rowFields, colFields, colGrouping, valField, aggType, valFormatting, filters, showSubtotals, showTotalCol, showVariations, sortBy, sortOrder, selectedBatchId, isTemporalMode, temporalComparison: temporalConfig || undefined }
            });
            setIsSaving(false); setAnalysisName('');
        }
    };

    const chartPivotData = useMemo(() => {
        if (isTemporalMode && temporalConfig) {
            const colHeaders = temporalConfig.sources.map((s: any) => s.label);
            const displayRows = temporalResults.filter(r => !r.isSubtotal).map(r => ({
                type: 'data', keys: [r.groupKey], level: 0, label: r.groupLabel,
                metrics: temporalConfig.sources.reduce((acc: any, s: any) => ({ ...acc, [s.label]: r.values[s.id] || 0 }), {}),
                rowTotal: Object.values(r.values).reduce((a: number, b: any) => a + (b || 0), 0)
            }));
            return { colHeaders, displayRows, colTotals: {}, grandTotal: 0 };
        }
        return pivotData;
    }, [isTemporalMode, temporalResults, temporalConfig, pivotData]);

    return (
        <div className="h-full flex flex-col p-2 gap-2 relative bg-slate-50">
            <PivotHeader
               isTemporalMode={isTemporalMode} setIsTemporalMode={setIsTemporalMode} handleToChart={() => setIsChartModalOpen(true)}
               primaryDataset={primaryDataset} showExportMenu={showExportMenu} setShowExportMenu={setShowExportMenu}
               handleExport={handleExport} handleExportSpreadsheet={handleExportSpreadsheet} showLoadMenu={showLoadMenu} setShowLoadMenu={setShowLoadMenu}
               savedAnalyses={savedAnalyses} handleLoadAnalysis={handleLoadAnalysis} isSaving={isSaving} setIsSaving={setIsSaving}
               analysisName={analysisName} setAnalysisName={setAnalysisName} handleSaveAnalysis={handleSaveAnalysis}
            />

            <div className="flex flex-col xl:flex-row gap-2 flex-1 min-h-0">
                <PivotSidePanel
                   {...{ sources, datasets, datasetBatches, selectedBatchId, setSelectedBatchId, startAddSource: () => setIsSourceModalOpen(true), removeSource: (id) => setSources(s => s.filter(x => x.id !== id)),
                   isDataSourcesPanelCollapsed, setIsDataSourcesPanelCollapsed, isTemporalMode, isTemporalConfigPanelCollapsed, setIsTemporalConfigPanelCollapsed, setIsTemporalSourceModalOpen, temporalConfig, setTemporalConfig,
                   rowFields, setRowFields, colFields, setColFields, valField, handleValFieldChange, setValField, aggType, setAggType, valFormatting, setValFormatting, filters, setFilters,
                   isFieldsPanelCollapsed, setIsFieldsPanelCollapsed, groupedFields, expandedSections, toggleSection: (id) => setExpandedSections(p => ({ ...p, [id]: !p[id] })), usedFields,
                   allAvailableFields, primaryDataset, colGrouping, setColGrouping, isColFieldDate, showSubtotals, setShowSubtotals, showTotalCol, setShowTotalCol, showVariations, setShowVariations,
                   handleDragStart, handleDragOver: (e) => e.preventDefault(), handleDrop, removeField, draggedField }}
                />

                <div className="flex-1 flex flex-col min-w-0 bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                    <PivotGrid
                       {...{ isCalculating, isTemporalMode, pivotData, temporalResults, temporalConfig, rowFields, columnLabels, editingColumn, setEditingColumn, setColumnLabels, showVariations, showTotalCol,
                       handleDrilldown, handleTemporalDrilldown, primaryDataset, datasets, aggType, valField, valFormatting, virtualItems: rowVirtualizer.getVirtualItems(), rowVirtualizer, parentRef,
                       totalColumns: rowFields.length + (pivotData?.colHeaders.length || 0) + (showTotalCol ? 1 : 0),
                       paddingTop: rowVirtualizer.getVirtualItems().length > 0 ? rowVirtualizer.getVirtualItems()[0].start : 0,
                       paddingBottom: rowVirtualizer.getVirtualItems().length > 0 ? rowVirtualizer.getTotalSize() - rowVirtualizer.getVirtualItems()[rowVirtualizer.getVirtualItems().length - 1].end : 0 }}
                    />
                    <PivotFooter
                       {...{ pivotData, rowFields, footerRef, valField, aggType, primaryDataset, datasets, valFormatting, showTotalCol }}
                    />
                </div>
            </div>

            <SourceManagementModal isOpen={isSourceModalOpen} onClose={() => setIsSourceModalOpen(false)} sources={sources} datasets={datasets} batches={batches} primaryDataset={primaryDataset} onSourcesChange={setSources} />
            <DrilldownModal isOpen={drilldownData !== null} onClose={() => setDrilldownData(null)} title={drilldownData?.title || ''} rows={drilldownData?.rows || []} fields={drilldownData?.fields || []} />
            {isChartModalOpen && chartPivotData && (
                <ChartModal isOpen={isChartModalOpen} onClose={() => setIsChartModalOpen(false)} pivotData={chartPivotData as any} pivotConfig={{ rows: blendedRows, rowFields: isTemporalMode ? (temporalConfig?.groupByFields || []) : rowFields, colFields: isTemporalMode ? [] : colFields, colGrouping, valField, aggType, filters, sortBy, sortOrder, showSubtotals, showVariations, currentDataset: primaryDataset, datasets, valFormatting }} />
            )}
            <TemporalSourceModal isOpen={isTemporalSourceModalOpen} onClose={() => setIsTemporalSourceModalOpen(false)} primaryDataset={primaryDataset || null} batches={batches} currentSources={temporalConfig?.sources || []} onSourcesChange={(s, r) => setTemporalConfig({ ...temporalConfig, sources: s, referenceSourceId: r, periodFilter: temporalConfig?.periodFilter || { startMonth: 1, endMonth: 12 }, deltaFormat: temporalConfig?.deltaFormat || 'value', groupByFields: rowFields, valueField: valField, aggType: aggType as any })} />
        </div>
    );
};
