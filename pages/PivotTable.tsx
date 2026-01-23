
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import { parseSmartNumber, detectColumnType, formatDateFr, evaluateFormula, generateId, exportView } from '../utils';
import {
    Database, Filter, Calculator, X, Layout,
    Table2, ArrowUpDown, Layers,
    ArrowUp, ArrowDown, Save, Check,
    PieChart, Loader2, ChevronLeft, ChevronRight, FileDown, FileType, Printer,
    GripVertical, MousePointer2, TrendingUp, Link as LinkIcon, Plus, Trash2, Split,
    ChevronDown, ChevronRight as ChevronRightIcon, Plug, AlertCircle, MousePointerClick
} from 'lucide-react';
import { Checkbox } from '../components/ui/Checkbox';
import { useNavigate } from 'react-router-dom';
import { PivotStyleRule, FilterRule, FieldConfig, PivotJoin } from '../types';
import { calculatePivotData, formatPivotOutput, AggregationType, SortBy, SortOrder, DateGrouping, PivotResult } from '../logic/pivotEngine';
import { useVirtualizer } from '@tanstack/react-virtual';
import { SourceManagementModal } from '../components/pivot/SourceManagementModal';
import { DrilldownModal } from '../components/pivot/DrilldownModal';

// --- DRAG & DROP TYPES ---
type DropZoneType = 'row' | 'col' | 'val' | 'filter';

// New Interface for Source Management
interface PivotSourceConfig {
    id: string;
    datasetId: string;
    isPrimary: boolean;
    joinConfig?: { // Only for secondary sources
        primaryKey: string;
        secondaryKey: string;
    };
    color: string; // UI Color helper
}

const SOURCE_COLORS = ['blue', 'indigo', 'purple', 'pink', 'teal', 'orange'];

// Static Tailwind classes for source colors (fixes dynamic class generation issue)
const SOURCE_COLOR_CLASSES: Record<string, { border: string, text: string, bg: string, hover: string }> = {
    blue: {
        border: 'border-blue-500',
        text: 'text-blue-700',
        bg: 'bg-blue-50',
        hover: 'hover:border-blue-400'
    },
    indigo: {
        border: 'border-indigo-500',
        text: 'text-indigo-700',
        bg: 'bg-indigo-50',
        hover: 'hover:border-indigo-400'
    },
    purple: {
        border: 'border-purple-500',
        text: 'text-purple-700',
        bg: 'bg-purple-50',
        hover: 'hover:border-purple-400'
    },
    pink: {
        border: 'border-pink-500',
        text: 'text-pink-700',
        bg: 'bg-pink-50',
        hover: 'hover:border-pink-400'
    },
    teal: {
        border: 'border-teal-500',
        text: 'text-teal-700',
        bg: 'bg-teal-50',
        hover: 'hover:border-teal-400'
    },
    orange: {
        border: 'border-orange-500',
        text: 'text-orange-700',
        bg: 'bg-orange-50',
        hover: 'hover:border-orange-400'
    }
};

export const PivotTable: React.FC = () => {
    const {
        batches, currentDataset, datasets, savedAnalyses, saveAnalysis,
        lastPivotState, savePivotState, isLoading, companyLogo
    } = useData();
    const navigate = useNavigate();

    // --- STATE ---
    const [isInitialized, setIsInitialized] = useState(false);

    // DATA SOURCES STATE (New unified approach)
    const [sources, setSources] = useState<PivotSourceConfig[]>([]);


    // SELECTION STATE (For the primary source, allows changing batch)
    const [selectedBatchId, setSelectedBatchId] = useState<string>('');

    // PIVOT CONFIG STATE
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
    const [styleRules, setStyleRules] = useState<PivotStyleRule[]>([]);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
    const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);

    // DRILLDOWN STATE
    const [drilldownData, setDrilldownData] = useState<{ rows: any[], title: string, fields: string[] } | null>(null);

    // D&D STATE
    const [draggedField, setDraggedField] = useState<string | null>(null);
    // Removed dragSource state dependency for drop logic to fix async issues

    // ASYNC CALCULATION STATE
    const [pivotData, setPivotData] = useState<PivotResult | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);

    // VIRTUALIZATION
    const parentRef = useRef<HTMLDivElement>(null);

    // --- DERIVED STATE ---

    // Get the primary dataset from our local sources list, NOT global context
    const primarySourceConfig = sources.find(s => s.isPrimary);
    const primaryDataset = primarySourceConfig ? datasets.find(d => d.id === primarySourceConfig.datasetId) : null;

    const datasetBatches = useMemo(() => {
        if (!primaryDataset) return [];
        return batches
            .filter(b => b.datasetId === primaryDataset.id)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [batches, primaryDataset]);

    // Determine which fields are already in use
    const usedFields = useMemo(() => {
        const used = new Set<string>();
        rowFields.forEach(f => used.add(f));
        colFields.forEach(f => used.add(f));
        if (valField) used.add(valField);
        filters.forEach(f => used.add(f.field));
        return used;
    }, [rowFields, colFields, valField, filters]);

    // --- INITIALISATION & PERSISTENCE ---

    // Save State (only after initialization)
    useEffect(() => {
        // Don't save state until we've initialized
        if (!isInitialized) return;

        // Only save if we have a primary source
        if (primaryDataset) {
            savePivotState({
                datasetId: primaryDataset.id,
                config: {
                    sources, // Save the full source stack
                    rowFields, colFields, colGrouping, valField, aggType, valFormatting, filters, showSubtotals, showTotalCol, showVariations,
                    sortBy, sortOrder, styleRules, selectedBatchId
                }
            });
        }
    }, [sources, rowFields, colFields, colGrouping, valField, aggType, valFormatting, filters, showSubtotals, showTotalCol, showVariations, sortBy, sortOrder, styleRules, selectedBatchId, primaryDataset, isInitialized]);

    // Load State
    useEffect(() => {
        // Only load if we haven't initialized yet
        if (isInitialized) return;

        if (lastPivotState && currentDataset && lastPivotState.datasetId === currentDataset.id) {
            const c = lastPivotState.config;

            // Restore Sources
            if (c.sources) {
                setSources(c.sources);
            } else {
                // Migration from old state structure
                const migratedSources: PivotSourceConfig[] = [];
                // Add primary
                migratedSources.push({ id: 'main', datasetId: currentDataset.id, isPrimary: true, color: SOURCE_COLORS[0] });
                // Add joins
                if (c.joins) {
                    c.joins.forEach((j: PivotJoin, idx: number) => {
                        migratedSources.push({
                            id: j.id,
                            datasetId: j.datasetId,
                            isPrimary: false,
                            joinConfig: { primaryKey: j.joinKeyPrimary, secondaryKey: j.joinKeySecondary },
                            color: SOURCE_COLORS[(idx + 1) % SOURCE_COLORS.length]
                        });
                    });
                }
                setSources(migratedSources);
            }

            setRowFields(c.rowFields || []);
            setColFields(c.colFields || (c.colField ? [c.colField] : []));
            setColGrouping(c.colGrouping || 'none');
            setValField(c.valField || '');
            setAggType((c.aggType as AggregationType) || 'count');
            setValFormatting(c.valFormatting || {});
            if (c.filters) {
                const loadedFilters = c.filters.map((f: any) => {
                    if (f.values) return { field: f.field, operator: 'in', value: f.values };
                    return f;
                });
                setFilters(loadedFilters);
            } else {
                setFilters([]);
            }
            setShowSubtotals(c.showSubtotals !== undefined ? c.showSubtotals : true);
            setShowTotalCol(c.showTotalCol !== undefined ? c.showTotalCol : true);
            setShowVariations(c.showVariations !== undefined ? c.showVariations : false);
            setSortBy(c.sortBy || 'label');
            setSortOrder(c.sortOrder || 'asc');
            setStyleRules(c.styleRules || []);
            if (c.selectedBatchId) setSelectedBatchId(c.selectedBatchId);
        } else {
            // Default Empty State
            setSources([]);
            setRowFields([]);
            setColFields([]);
            setValField('');
            setFilters([]);
        }
        setIsInitialized(true);
    }, [currentDataset?.id, lastPivotState]);

    // Auto-select batch
    useEffect(() => {
        if (isLoading || !isInitialized) return;
        if (datasetBatches.length === 0) {
            if (selectedBatchId) setSelectedBatchId('');
            return;
        }
        const exists = datasetBatches.find(b => b.id === selectedBatchId);
        if (!exists) setSelectedBatchId(datasetBatches[0].id);
    }, [datasetBatches, selectedBatchId, isLoading, isInitialized]);

    // --- HELPERS ---
    const currentBatch = useMemo(() =>
        datasetBatches.find(b => b.id === selectedBatchId) || datasetBatches[0],
        [datasetBatches, selectedBatchId]);

    // Group fields by dataset for the UI
    const groupedFields = useMemo(() => {
        const groups: any[] = [];

        // Iterate through our configured sources
        sources.forEach(src => {
            const ds = datasets.find(d => d.id === src.datasetId);
            if (!ds) return;

            let fields = [];
            if (src.isPrimary) {
                fields = [...ds.fields];
                if (ds.calculatedFields) {
                    fields.push(...ds.calculatedFields.map(cf => cf.name));
                }
            } else {
                // Prefix fields for secondary sources
                const nativeFields = ds.fields.map(f => `[${ds.name}] ${f}`);
                const calcFields = (ds.calculatedFields || []).map(f => `[${ds.name}] ${f.name}`);
                fields = [...nativeFields, ...calcFields];
            }

            groups.push({
                id: src.id,
                name: ds.name,
                isPrimary: src.isPrimary,
                fields: fields,
                color: src.color,
                sourceConfig: src
            });
        });

        return groups;
    }, [sources, datasets]);

    // Auto-expand sections when sources change
    useEffect(() => {
        const newExpanded = { ...expandedSections };
        let hasChanges = false;
        sources.forEach(s => {
            if (newExpanded[s.id] === undefined) {
                newExpanded[s.id] = true;
                hasChanges = true;
            }
        });
        // Only update state if there are actual changes
        if (hasChanges) {
            setExpandedSections(newExpanded);
        }
    }, [sources.length]);

    // --- BLENDING LOGIC ---
    const blendedRows = useMemo(() => {
        if (!currentBatch || !primaryDataset) return [];

        // 1. Prepare Primary Rows
        const calcFields = primaryDataset.calculatedFields || [];
        let rows = currentBatch.rows;
        if (calcFields.length > 0) {
            rows = rows.map(r => {
                const enriched = { ...r };
                calcFields.forEach(cf => {
                    enriched[cf.name] = evaluateFormula(enriched, cf.formula);
                });
                return enriched;
            });
        }

        // 2. Blend Secondary Sources
        const secondarySources = sources.filter(s => !s.isPrimary);

        if (secondarySources.length > 0) {
            secondarySources.forEach(src => {
                const secDS = datasets.find(d => d.id === src.datasetId);
                const join = src.joinConfig;

                if (secDS && join) {
                    const secBatches = batches
                        .filter(b => b.datasetId === src.datasetId)
                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                    if (secBatches.length > 0) {
                        const secBatch = secBatches[0];
                        let secRows = secBatch.rows;

                        // Enrich secondary rows
                        if (secDS.calculatedFields && secDS.calculatedFields.length > 0) {
                            secRows = secRows.map(r => {
                                const enriched = { ...r };
                                secDS.calculatedFields?.forEach(cf => {
                                    enriched[cf.name] = evaluateFormula(enriched, cf.formula);
                                });
                                return enriched;
                            });
                        }

                        // Build Lookup Map
                        const lookup = new Map<string, any>();
                        secRows.forEach(r => {
                            const k = String(r[join.secondaryKey]).trim();
                            if (k) lookup.set(k, r);
                        });

                        // Merge
                        rows = rows.map(row => {
                            const k = String(row[join.primaryKey]).trim();
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
            });
        }
        return rows;
    }, [currentBatch, sources, primaryDataset, datasets, batches]);

    // --- ASYNC CALCULATION ---
    useEffect(() => {
        setIsCalculating(true);
        const timer = setTimeout(() => {
            const result = calculatePivotData({
                rows: blendedRows,
                rowFields, colFields, colGrouping, valField, aggType, filters,
                sortBy, sortOrder, showSubtotals, showVariations,
                currentDataset: primaryDataset, // Pass context
                datasets // Pass all datasets for lookup
            });
            setPivotData(result);
            setIsCalculating(false);
        }, 10);
        return () => clearTimeout(timer);
    }, [blendedRows, rowFields, colFields, colGrouping, valField, aggType, filters, sortBy, sortOrder, showSubtotals, showVariations, primaryDataset, datasets]);

    // --- HANDLERS ---
    const handleValFieldChange = (newField: string) => {
        setValField(newField);
        setValFormatting({});
        if (blendedRows.length > 0) {
            const sample = blendedRows.slice(0, 50).map(r => r[newField] !== undefined ? String(r[newField]) : '');
            const type = detectColumnType(sample);
            setAggType(type === 'number' ? 'sum' : 'count');
        }
    };

    const isColFieldDate = useMemo(() => {
        if (colFields.length === 0 || blendedRows.length === 0) return false;
        return colFields.some(field => {
            const sample = blendedRows.slice(0, 50).map(r => r[field] !== undefined ? String(r[field]) : '');
            return detectColumnType(sample) === 'date';
        });
    }, [colFields, blendedRows]);

    useEffect(() => {
        if (!isColFieldDate) setColGrouping('none');
    }, [colFields, isColFieldDate]);

    // --- DRAG AND DROP LOGIC (FIXED) ---
    const handleDragStart = (e: React.DragEvent, field: string, source: 'list' | DropZoneType) => {
        setDraggedField(field);
        e.dataTransfer.effectAllowed = 'move';
        // IMPORTANT: Serialize all data into transfer to avoid stale state in drop handler
        const dragData = JSON.stringify({ field, source });
        e.dataTransfer.setData('application/json', dragData);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, targetZone: DropZoneType) => {
        e.preventDefault();

        const dataStr = e.dataTransfer.getData('application/json');
        if (!dataStr) return;

        let field: string, source: string;
        try {
            const parsed = JSON.parse(dataStr);
            field = parsed.field;
            source = parsed.source;
        } catch (e) {
            return;
        }

        if (!field) return;

        // Logic to remove from old zone
        if (source === 'row') setRowFields(prev => prev.filter(f => f !== field));
        if (source === 'col') setColFields(prev => prev.filter(f => f !== field));
        if (source === 'val' && valField === field) setValField('');
        if (source === 'filter') setFilters(prev => prev.filter(f => f.field !== field));

        // Logic to add to new zone
        if (targetZone === 'row') {
            if (!rowFields.includes(field) && rowFields.length < 5) setRowFields(prev => [...prev, field]);
        } else if (targetZone === 'col') {
            if (!colFields.includes(field) && colFields.length < 3) setColFields(prev => [...prev, field]);
        } else if (targetZone === 'val') {
            handleValFieldChange(field);
        } else if (targetZone === 'filter') {
            if (!filters.some(f => f.field === field)) setFilters(prev => [...prev, { field: field, operator: 'in', value: [] }]);
        }

        setDraggedField(null);
    };

    const removeField = (zone: DropZoneType, field: string) => {
        if (zone === 'row') setRowFields(prev => prev.filter(f => f !== field));
        if (zone === 'col') setColFields(prev => prev.filter(f => f !== field));
        if (zone === 'val') setValField('');
        if (zone === 'filter') setFilters(prev => prev.filter(f => f.field !== field));
    };

    // --- EXPORT & MISC ---
    const handleExport = (format: 'pdf' | 'html', pdfMode: 'A4' | 'adaptive' = 'adaptive') => {
        setShowExportMenu(false);
        const title = `TCD - ${primaryDataset?.name || 'Analyse'}`;
        exportView(format, 'pivot-export-container', title, companyLogo, pdfMode);
    };

    const handleToChart = () => {
        if (!primaryDataset) return;
        if (rowFields.length === 0) {
            alert("Veuillez configurer au moins une ligne pour générer un graphique.");
            return;
        }
        const pivotConfig = { rowFields, valField, aggType, filters, selectedBatchId };
        navigate('/analytics', { state: { fromPivot: pivotConfig } });
    };

    const handleSaveAnalysis = () => {
        if (!analysisName.trim() || !primaryDataset) return;
        saveAnalysis({
            name: analysisName, type: 'pivot', datasetId: primaryDataset.id,
            config: {
                sources, // Save full stack
                rowFields, colFields, colGrouping, valField, aggType, valFormatting, filters, showSubtotals, showTotalCol, showVariations, sortBy, sortOrder, styleRules, selectedBatchId
            }
        });
        setAnalysisName('');
        setIsSaving(false);
    };

    // --- SOURCE MANAGEMENT ---

    const startAddSource = () => {
        setIsSourceModalOpen(true);
    };

    const handleSourcesChange = (newSources: PivotSourceConfig[]) => {
        setSources(newSources);
    };



    const removeSource = (sourceId: string) => {
        const sourceToRemove = sources.find(s => s.id === sourceId);
        if (!sourceToRemove) return;

        if (sourceToRemove.isPrimary) {
            if (window.confirm("Supprimer la source principale réinitialisera tout le tableau. Continuer ?")) {
                setSources([]);
                setRowFields([]);
                setColFields([]);
                setValField('');
                setFilters([]);
            }
        } else {
            setSources(prev => prev.filter(s => s.id !== sourceId));
            // Cleanup fields used from this source
            const ds = datasets.find(d => d.id === sourceToRemove.datasetId);
            if (ds) {
                const prefix = `[${ds.name}] `;
                setRowFields(prev => prev.filter(f => !f.startsWith(prefix)));
                setColFields(prev => prev.filter(f => !f.startsWith(prefix)));
                if (valField.startsWith(prefix)) setValField('');
                setFilters(prev => prev.filter(f => !f.field.startsWith(prefix)));
            }
        }
    };



    const toggleSection = (id: string) => {
        setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // DRILLDOWN HANDLER
    const handleDrilldown = (rowKeys: string[], colLabel: string) => {
        if (!blendedRows || blendedRows.length === 0) return;

        // Filter rows that match the rowKeys and colLabel
        const detailRows = blendedRows.filter(row => {
            // Check if row matches all row dimension values
            const matchesRow = rowFields.every((field, idx) => {
                const rowValue = String(row[field] || '').trim();
                const keyValue = rowKeys[idx] === '(Vide)' ? '' : rowKeys[idx];
                return rowValue === keyValue || (rowValue === '' && keyValue === '(Vide)');
            });

            if (!matchesRow) return false;

            // If there's a column field, check if it matches
            if (colFields.length > 0 && colLabel && colLabel !== 'Total') {
                // Handle column grouping (dates)
                const colValue = String(row[colFields[0]] || '');
                if (colGrouping === 'year') {
                    return colValue.startsWith(colLabel);
                } else if (colGrouping === 'month') {
                    return colValue.startsWith(colLabel);
                } else if (colGrouping === 'quarter') {
                    const year = colValue.substring(0, 4);
                    const month = parseInt(colValue.substring(5, 7));
                    const quarter = Math.ceil(month / 3);
                    return colLabel === `${year} T${quarter}`;
                } else {
                    return colValue === colLabel;
                }
            }

            return true;
        });

        if (detailRows.length === 0) {
            alert('Aucune donnée de détail disponible pour cette sélection.');
            return;
        }

        // Get all fields from primary dataset + joined datasets
        const allFields = primaryDataset ? [...primaryDataset.fields] : [];
        sources.filter(s => !s.isPrimary).forEach(src => {
            const ds = datasets.find(d => d.id === src.datasetId);
            if (ds) {
                ds.fields.forEach(f => {
                    const prefixedField = `[${ds.name}] ${f}`;
                    if (!allFields.includes(prefixedField)) {
                        allFields.push(prefixedField);
                    }
                });
            }
        });

        // Create title
        const rowKeyString = rowKeys.join(' > ');
        const title = colLabel && colLabel !== 'Total'
            ? `${rowKeyString} × ${colLabel}`
            : rowKeyString;

        setDrilldownData({
            rows: detailRows,
            title: `Détails: ${title}`,
            fields: allFields
        });
    };

    // VIRTUALIZATION SETUP
    const rowVirtualizer = useVirtualizer({
        count: pivotData ? pivotData.displayRows.length : 0,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 35, // Updated estimate
        overscan: 20
    });

    // FORMAT OUTPUT
    const formatOutput = (val: string | number) => formatPivotOutput(val, valField, aggType, primaryDataset, undefined, datasets, valFormatting);

    // COMPONENT: Draggable Field Chip
    const FieldChip: React.FC<{ field: string, zone: DropZoneType | 'list', onDelete?: () => void, disabled?: boolean, color?: string }> = ({ field, zone, onDelete, disabled, color = 'blue' }) => {
        const isJoined = field.startsWith('[');
        const displayLabel = field.includes('] ') ? field.split('] ')[1] : field;
        const colorClasses = SOURCE_COLOR_CLASSES[color] || SOURCE_COLOR_CLASSES.blue;

        let baseStyle = `bg-white border-slate-200 text-slate-700 ${colorClasses.hover}`;
        if (isJoined) baseStyle = `${colorClasses.bg} ${colorClasses.border} ${colorClasses.text}`;

        if (disabled && zone === 'list') {
            baseStyle = 'bg-slate-100 text-slate-400 border-slate-200 opacity-60 cursor-not-allowed';
        }

        return (
            <div
                draggable={!disabled}
                onDragStart={(e) => {
                    if (disabled) {
                        e.preventDefault();
                        return;
                    }
                    handleDragStart(e, field, zone);
                }}
                onMouseDown={(e) => {
                    // Pre-initialize drag state to prevent double-click issue
                    if (!disabled && e.button === 0) {
                        e.currentTarget.setAttribute('draggable', 'true');
                    }
                }}
                className={`group flex items-center justify-between gap-2 px-2 py-1.5 border rounded shadow-sm hover:shadow-md active:cursor-grabbing text-xs font-medium select-none
                ${baseStyle} ${!disabled ? 'cursor-grab' : ''}
            `}
            >
                <div className="flex items-center gap-1.5 overflow-hidden">
                    <GripVertical className={`w-3 h-3 flex-shrink-0 ${disabled ? 'text-slate-300' : 'text-slate-400'}`} />
                    <span className="truncate" title={field}>{displayLabel}</span>
                </div>
                {onDelete && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        className="p-0.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded transition-colors"
                    >
                        <X className="w-3 h-3" />
                    </button>
                )}
            </div>
        );
    };

    const virtualItems = rowVirtualizer.getVirtualItems();
    const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
    const paddingBottom = virtualItems.length > 0 ? rowVirtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end : 0;
    const totalColumns = rowFields.length + (pivotData?.colHeaders.length || 0) + (showTotalCol ? 1 : 0);

    return (
        <>
            <div className="h-full flex flex-col p-4 gap-4 relative">

                {/* HEADER */}
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-2">
                        <Layout className="w-5 h-5 text-blue-600" />
                        <div>
                            <h2 className="text-base font-bold text-slate-800">Tableau Croisé Dynamique</h2>
                            <p className="text-[10px] text-slate-500">Glissez les champs pour analyser</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* ACTIONS RAPIDES */}
                        <button onClick={handleToChart} disabled={!primaryDataset} className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors disabled:opacity-50">
                            <PieChart className="w-3 h-3" /> Graphique
                        </button>

                        <div className="relative">
                            <button
                                onClick={() => setShowExportMenu(!showExportMenu)}
                                disabled={!primaryDataset}
                                className="px-3 py-1.5 text-xs text-slate-600 hover:text-blue-600 border border-slate-300 rounded bg-white hover:bg-slate-50 flex items-center gap-1 disabled:opacity-50"
                            >
                                <FileDown className="w-3 h-3" /> Export
                            </button>
                            {showExportMenu && (
                                <div className="absolute right-0 mt-1 w-40 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1">
                                    <button onClick={() => handleExport('pdf', 'adaptive')} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2">
                                        <Printer className="w-3 h-3" /> PDF
                                    </button>
                                    <button onClick={() => handleExport('html')} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2">
                                        <FileType className="w-3 h-3" /> HTML
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="h-5 w-px bg-slate-200 mx-1"></div>

                        {/* SAUVEGARDE */}
                        {!isSaving ? (
                            <button onClick={() => setIsSaving(true)} disabled={!primaryDataset} className="p-1.5 text-slate-500 hover:text-blue-600 border border-slate-300 rounded bg-white disabled:opacity-50" title="Sauvegarder"><Save className="w-4 h-4" /></button>
                        ) : (
                            <div className="flex items-center gap-1 animate-in fade-in">
                                <input type="text" className="p-1 text-xs border border-blue-300 rounded w-24" placeholder="Nom..." value={analysisName} onChange={e => setAnalysisName(e.target.value)} autoFocus />
                                <button onClick={handleSaveAnalysis} className="p-1 bg-blue-600 text-white rounded"><Check className="w-3 h-3" /></button>
                                <button onClick={() => setIsSaving(false)} className="p-1 bg-slate-200 text-slate-600 rounded"><X className="w-3 h-3" /></button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col xl:flex-row gap-4 flex-1 min-h-0">

                    {/* LEFT PANEL : SOURCES & FIELDS */}
                    <div className="xl:w-80 flex-shrink-0 flex flex-col gap-4 min-w-0">

                        {/* 1. DATA SOURCES STACK */}
                        <div className="bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                            <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200">
                                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                    <Database className="w-4 h-4 text-blue-600" />
                                    Sources de données
                                </h3>
                            </div>

                            <div className="p-3 space-y-3">

                                {/* LISTE DES SOURCES */}
                                {sources.length === 0 ? (
                                    <div className="text-center p-6 border-2 border-dashed border-blue-300 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50">
                                        <div className="mb-3">
                                            <Database className="w-10 h-10 mx-auto text-blue-400 mb-2" />
                                            <p className="text-sm font-semibold text-slate-700 mb-1">Commencez votre analyse</p>
                                            <p className="text-xs text-slate-500">Sélectionnez une source de données</p>
                                        </div>
                                        <button
                                            onClick={startAddSource}
                                            className="w-full py-2.5 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                                        >
                                            <Plus className="w-4 h-4" /> Définir source principale
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {sources.map((src) => {
                                            const ds = datasets.find(d => d.id === src.datasetId);
                                            if (!ds) return null;

                                            const srcColorClasses = SOURCE_COLOR_CLASSES[src.color] || SOURCE_COLOR_CLASSES.blue;
                                            return (
                                                <div key={src.id} className={`relative pl-3 border-l-4 ${srcColorClasses.border} ${srcColorClasses.bg} rounded-r-lg p-3 group`}>
                                                    <div className="flex justify-between items-center mb-2">
                                                        <div className={`text-sm font-bold ${srcColorClasses.text} flex items-center gap-1.5 overflow-hidden`}>
                                                            {src.isPrimary ? <Database className="w-4 h-4 flex-shrink-0" /> : <LinkIcon className="w-4 h-4 flex-shrink-0" />}
                                                            <span className="truncate" title={ds.name}>{ds.name}</span>
                                                            {src.isPrimary && <span className="text-[10px] opacity-70 ml-1">(principale)</span>}
                                                        </div>
                                                        <button
                                                            onClick={() => removeSource(src.id)}
                                                            className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>

                                                    {src.isPrimary ? (
                                                        <select
                                                            className="mt-1 w-full text-xs border border-slate-300 rounded px-2 py-1.5 bg-white text-slate-700 font-medium focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                                                            value={selectedBatchId}
                                                            onChange={(e) => setSelectedBatchId(e.target.value)}
                                                        >
                                                            {datasetBatches.map(b => <option key={b.id} value={b.id}>{formatDateFr(b.date)} ({b.rows.length} lignes)</option>)}
                                                        </select>
                                                    ) : (
                                                        <div className="text-xs text-slate-600 mt-1 bg-white/50 rounded px-2 py-1">
                                                            <div className="font-semibold text-[10px] text-slate-500 uppercase mb-0.5">Jointure sur :</div>
                                                            <div className="font-mono text-[11px]">
                                                                <span className="font-bold">{src.joinConfig?.primaryKey}</span>
                                                                <span className="mx-1">=</span>
                                                                <span className="font-bold">[{ds.name}].{src.joinConfig?.secondaryKey}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}

                                        <button
                                            onClick={startAddSource}
                                            className="w-full py-2.5 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-all text-xs font-bold flex items-center justify-center gap-2 shadow-sm hover:shadow"
                                        >
                                            <Plus className="w-4 h-4" /> Gérer les sources
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 2. FIELDS ACCORDION */}
                        <div className="flex-1 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col min-h-[200px] overflow-hidden">
                            <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200">
                                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-2">
                                    <Table2 className="w-4 h-4 text-green-600" />
                                    Champs disponibles
                                </h3>
                                <input type="text" placeholder="Rechercher un champ..." className="w-full text-xs border border-slate-300 rounded px-2 py-1.5 bg-white focus:ring-2 focus:ring-green-400 focus:border-green-400" disabled={sources.length === 0} />
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                                {sources.length === 0 && (
                                    <div className="text-center py-8 text-slate-300 text-xs italic">
                                        Ajoutez une source pour voir les champs disponibles.
                                    </div>
                                )}
                                {groupedFields.map(group => {
                                    const groupColorClasses = SOURCE_COLOR_CLASSES[group.color] || SOURCE_COLOR_CLASSES.blue;
                                    return (
                                        <div key={group.id} className="mb-2">
                                            <button
                                                onClick={() => toggleSection(group.id)}
                                                className={`w-full flex items-center gap-1 text-xs font-bold px-2 py-1.5 rounded transition-colors ${groupColorClasses.text} ${groupColorClasses.bg}`}
                                            >
                                                {expandedSections[group.id] ? <ChevronDown className="w-3 h-3" /> : <ChevronRightIcon className="w-3 h-3" />}
                                                {group.name}
                                            </button>

                                            {expandedSections[group.id] && (
                                                <div className="mt-1 pl-2 space-y-1 animate-in slide-in-from-top-1 duration-200">
                                                    {group.fields.map((f: string) => (
                                                        <FieldChip
                                                            key={f}
                                                            field={f}
                                                            zone="list"
                                                            disabled={usedFields.has(f)}
                                                            color={group.color}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 3. DROP ZONES (Compact Layout) */}
                        <div className={`flex flex-col gap-3 transition-opacity ${sources.length === 0 ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                            {/* ZONES ROW 1: FILTERS & COLUMNS */}
                            <div className="grid grid-cols-2 gap-3">
                                {/* FILTRES */}
                                <div
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, 'filter')}
                                    className={`bg-white rounded-lg border-2 border-dashed p-2 min-h-[100px] flex flex-col transition-colors ${draggedField ? 'border-blue-300 bg-blue-50/30' : 'border-slate-200'}`}
                                >
                                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-1"><Filter className="w-3 h-3" /> Filtres</div>
                                    <div className="space-y-1.5 flex-1">
                                        {filters.map((f, idx) => (
                                            <div key={idx} className="relative group">
                                                <FieldChip field={f.field} zone="filter" onDelete={() => removeField('filter', f.field)} />
                                                {/* Mini Config Filter */}
                                                <div className="mt-1 pl-1">
                                                    <select
                                                        className="w-full text-[9px] border border-slate-200 rounded p-0.5 bg-slate-50"
                                                        value={f.operator || 'in'}
                                                        onChange={(e) => {
                                                            const n = [...filters];
                                                            n[idx] = { ...n[idx], operator: e.target.value as any };
                                                            setFilters(n);
                                                        }}
                                                    >
                                                        <option value="in">Est égal à</option>
                                                        <option value="contains">Contient</option>
                                                        <option value="gt">&gt;</option>
                                                        <option value="lt">&lt;</option>
                                                    </select>
                                                    {/* Simplified Value Input */}
                                                    <input
                                                        type="text"
                                                        className="w-full text-[9px] border border-slate-200 rounded p-0.5 mt-0.5"
                                                        placeholder="Valeur..."
                                                        value={Array.isArray(f.value) ? f.value.join(',') : f.value}
                                                        onChange={(e) => {
                                                            const n = [...filters];
                                                            n[idx] = { ...n[idx], value: f.operator === 'in' ? e.target.value.split(',') : e.target.value };
                                                            setFilters(n);
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* COLONNES */}
                                <div
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, 'col')}
                                    className={`bg-white rounded-lg border-2 border-dashed p-2 min-h-[100px] flex flex-col transition-colors ${draggedField ? 'border-blue-300 bg-blue-50/30' : 'border-slate-200'}`}
                                >
                                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-1"><Table2 className="w-3 h-3" /> Colonnes</div>
                                    <div className="space-y-1.5 flex-1">
                                        {colFields.map((f, idx) => (
                                            <FieldChip key={f} field={f} zone="col" onDelete={() => removeField('col', f)} />
                                        ))}
                                        {colFields.length === 0 ? <span className="text-[9px] text-slate-300 italic">Déposez des colonnes ici</span> : (
                                            isColFieldDate && (
                                                <select
                                                    className="w-full mt-1 text-[9px] border-slate-200 rounded bg-slate-50"
                                                    value={colGrouping}
                                                    onChange={(e) => setColGrouping(e.target.value as any)}
                                                >
                                                    <option value="none">Date exacte</option>
                                                    <option value="year">Année</option>
                                                    <option value="quarter">Trimestre</option>
                                                    <option value="month">Mois</option>
                                                </select>
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* ZONES ROW 2: ROWS & VALUES */}
                            <div className="grid grid-cols-2 gap-3">
                                {/* LIGNES */}
                                <div
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, 'row')}
                                    className={`bg-white rounded-lg border-2 border-dashed p-2 min-h-[150px] flex flex-col transition-colors ${draggedField ? 'border-blue-300 bg-blue-50/30' : 'border-slate-200'}`}
                                >
                                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-1"><Layers className="w-3 h-3" /> Lignes</div>
                                    <div className="space-y-1.5 flex-1">
                                        {rowFields.map((f, idx) => (
                                            <FieldChip key={f} field={f} zone="row" onDelete={() => removeField('row', f)} />
                                        ))}
                                        {rowFields.length === 0 && <span className="text-[9px] text-slate-300 italic">Déposez des lignes ici</span>}
                                    </div>
                                </div>

                                {/* VALEURS */}
                                <div
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, 'val')}
                                    className={`bg-white rounded-lg border-2 border-dashed p-2 min-h-[150px] flex flex-col transition-colors ${draggedField ? 'border-blue-300 bg-blue-50/30' : 'border-slate-200'}`}
                                >
                                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-1"><Calculator className="w-3 h-3" /> Valeurs</div>
                                    <div className="space-y-1.5 flex-1">
                                        {valField ? (
                                            <div>
                                                <FieldChip field={valField} zone="val" onDelete={() => setValField('')} />
                                                <div className="mt-2 grid grid-cols-2 gap-1">
                                                    {['count', 'sum', 'avg', 'min', 'max'].map(t => (
                                                        <button
                                                            key={t}
                                                            onClick={() => setAggType(t as AggregationType)}
                                                            className={`px-1 py-1 text-[9px] uppercase rounded border ${aggType === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-500 border-slate-200'}`}
                                                        >
                                                            {t}
                                                        </button>
                                                    ))}
                                                </div>
                                                {/* Format Override */}
                                                {aggType !== 'count' && (
                                                    <div className="mt-2 pt-2 border-t border-slate-100">
                                                        <input
                                                            type="number"
                                                            placeholder="Décimales"
                                                            className="w-full text-[9px] border-slate-200 rounded p-1 mb-1"
                                                            value={valFormatting.decimalPlaces ?? ''}
                                                            onChange={e => setValFormatting({ ...valFormatting, decimalPlaces: e.target.value ? Number(e.target.value) : undefined })}
                                                        />
                                                        <input
                                                            type="text"
                                                            placeholder="Unité (€)"
                                                            className="w-full text-[9px] border-slate-200 rounded p-1"
                                                            value={valFormatting.unit ?? ''}
                                                            onChange={e => setValFormatting({ ...valFormatting, unit: e.target.value })}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        ) : <span className="text-[9px] text-slate-300 italic">Déposez une valeur ici</span>}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* DISPLAY OPTIONS */}
                        <div className="p-3 bg-slate-50 rounded border border-slate-200">
                            <div className="flex flex-col gap-2">
                                <Checkbox checked={showSubtotals} onChange={() => setShowSubtotals(!showSubtotals)} label="Sous-totaux" />
                                <Checkbox checked={showTotalCol} onChange={() => setShowTotalCol(!showTotalCol)} label="Total général" />
                                {colFields.length > 0 && aggType !== 'list' && (aggType !== 'min' && aggType !== 'max') && (
                                    <div className="mt-2 pt-2 border-t border-slate-100 animate-in fade-in">
                                        <Checkbox checked={showVariations} onChange={() => setShowVariations(!showVariations)} label="Afficher variations (%)" className="text-blue-700 font-bold" />
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>

                    {/* RIGHT PANEL : PIVOT GRID */}
                    <div id="pivot-export-container" className="flex-1 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col min-w-0 overflow-hidden relative">
                        {isCalculating && (
                            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center flex-col gap-3">
                                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                                <span className="text-sm font-bold text-slate-600">Calcul en cours...</span>
                            </div>
                        )}

                        {pivotData ? (
                            <div ref={parentRef} className="flex-1 overflow-auto custom-scrollbar flex flex-col w-full relative">
                                <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
                                    <table className="min-w-full divide-y divide-slate-200 border-collapse absolute top-0 left-0 w-full">
                                        <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                                            <tr>
                                                {/* Headers Lignes */}
                                                {rowFields.map((field, idx) => (
                                                    <th key={field} className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase border-b border-r border-slate-200 bg-slate-50 whitespace-nowrap sticky left-0 z-20" style={{ minWidth: '150px' }}>
                                                        {field}
                                                    </th>
                                                ))}

                                                {/* Headers Colonnes Dynamiques */}
                                                {pivotData.colHeaders.map(col => {
                                                    const isDiff = col.endsWith('_DIFF');
                                                    const isPct = col.endsWith('_PCT');
                                                    const label = isDiff ? 'Var.' : isPct ? '%' : col;

                                                    return (
                                                        <th key={col} className={`px-4 py-3 text-right text-xs font-bold uppercase border-b border-r border-slate-200 whitespace-nowrap ${isDiff || isPct ? 'bg-blue-50 text-blue-700' : 'text-slate-500'}`}>
                                                            {label}
                                                        </th>
                                                    );
                                                })}

                                                {showTotalCol && (
                                                    <th className="px-4 py-3 text-right text-xs font-black text-slate-700 uppercase border-b bg-slate-100 whitespace-nowrap">
                                                        Total
                                                    </th>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-slate-200">
                                            {paddingTop > 0 && <tr><td style={{ height: `${paddingTop}px` }} colSpan={totalColumns} /></tr>}
                                            {virtualItems.map((virtualRow: any) => {
                                                const row = pivotData.displayRows[virtualRow.index];
                                                return (
                                                    <tr
                                                        key={virtualRow.key}
                                                        data-index={virtualRow.index}
                                                        ref={rowVirtualizer.measureElement}
                                                        className={`${row.type === 'subtotal' ? 'bg-slate-50 font-bold' : 'hover:bg-blue-50/30'}`}
                                                    >
                                                        {rowFields.map((field, cIdx) => {
                                                            if (row.type === 'subtotal') {
                                                                if (cIdx < row.level) return <td key={cIdx} className="px-4 py-2 text-sm text-slate-500 border-r border-slate-200 bg-slate-50/30">{row.keys[cIdx]}</td>;
                                                                if (cIdx === row.level) return <td key={cIdx} colSpan={rowFields.length - cIdx} className="px-4 py-2 text-sm text-slate-700 border-r border-slate-200 font-bold italic text-right">{row.label}</td>;
                                                                return null;
                                                            }
                                                            return <td key={cIdx} className="px-4 py-2 text-sm text-slate-700 border-r border-slate-200 whitespace-nowrap">{row.keys[cIdx]}</td>;
                                                        })}
                                                        {pivotData.colHeaders.map(col => {
                                                            const val = row.metrics[col];
                                                            const isDiff = col.endsWith('_DIFF');
                                                            const isPct = col.endsWith('_PCT');
                                                            let formatted = formatOutput(val);
                                                            let cellClass = "text-slate-600";

                                                            if (isDiff) {
                                                                if (Number(val) > 0) { formatted = `+${formatted}`; cellClass = "text-green-600 font-bold"; }
                                                                else if (Number(val) < 0) { cellClass = "text-red-600 font-bold"; }
                                                                else cellClass = "text-slate-400";
                                                            }
                                                            else if (isPct) {
                                                                if (val === 0 || val === undefined) formatted = '-';
                                                                else {
                                                                    formatted = `${Number(val).toFixed(1)}%`;
                                                                    if (Number(val) > 0) cellClass = "text-green-600 font-bold";
                                                                    else if (Number(val) < 0) cellClass = "text-red-600 font-bold";
                                                                }
                                                            }

                                                            return (
                                                                <td
                                                                    key={col}
                                                                    className={`px-4 py-2 text-sm text-right border-r border-slate-100 tabular-nums cursor-pointer hover:bg-blue-100 transition-colors ${cellClass} ${isDiff || isPct ? 'bg-blue-50/20' : ''}`}
                                                                    onClick={() => handleDrilldown(row.keys, col)}
                                                                    title="Cliquez pour voir les détails"
                                                                >
                                                                    {formatted}
                                                                </td>
                                                            );
                                                        })}
                                                        {showTotalCol && (
                                                            <td
                                                                className="px-4 py-2 text-sm text-right font-bold text-slate-800 bg-slate-50 border-l border-slate-200 cursor-pointer hover:bg-blue-100 transition-colors"
                                                                onClick={() => handleDrilldown(row.keys, 'Total')}
                                                                title="Cliquez pour voir les détails"
                                                            >
                                                                {formatOutput(row.rowTotal)}
                                                            </td>
                                                        )}
                                                    </tr>
                                                );
                                            })}
                                            {paddingBottom > 0 && <tr><td style={{ height: `${paddingBottom}px` }} colSpan={totalColumns} /></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8">
                                {sources.length === 0 ? (
                                    <div className="max-w-md text-center">
                                        <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-lg mb-6 border border-blue-100">
                                            <Database className="w-16 h-16 mx-auto text-blue-400 mb-4" />
                                            <h3 className="text-lg font-bold text-slate-800 mb-2">Créez votre premier TCD</h3>
                                            <p className="text-sm text-slate-600 mb-4">
                                                Un Tableau Croisé Dynamique vous permet de croiser et analyser vos données de manière interactive.
                                            </p>
                                            <button
                                                onClick={startAddSource}
                                                className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-all shadow-md hover:shadow-xl flex items-center justify-center gap-2 mx-auto"
                                            >
                                                <Plus className="w-5 h-5" /> Commencer
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-3 gap-4 text-xs">
                                            <div className="text-center p-3 bg-white rounded-lg border border-slate-200">
                                                <div className="font-bold text-blue-600 mb-1">1. Source</div>
                                                <div className="text-slate-500">Choisissez vos données</div>
                                            </div>
                                            <div className="text-center p-3 bg-white rounded-lg border border-slate-200">
                                                <div className="font-bold text-indigo-600 mb-1">2. Champs</div>
                                                <div className="text-slate-500">Glissez pour organiser</div>
                                            </div>
                                            <div className="text-center p-3 bg-white rounded-lg border border-slate-200">
                                                <div className="font-bold text-purple-600 mb-1">3. Analyse</div>
                                                <div className="text-slate-500">Visualisez les résultats</div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center">
                                        <div className="p-4 bg-white rounded-full shadow-sm mb-4 inline-block">
                                            <MousePointerClick className="w-8 h-8 text-blue-400 animate-bounce" />
                                        </div>
                                        <p className="text-sm font-medium text-slate-600">Commencez par glisser des champs</p>
                                        <p className="text-xs text-slate-400 mt-2">Faites glisser les champs depuis la liste vers les zones ci-contre</p>
                                    </div>
                                )}
                                {sources.length > 0 && <p className="text-xs text-slate-400 mt-2">Zone de gauche &rarr; Lignes / Colonnes / Valeurs</p>}
                            </div>
                        )}

                        {/* FOOTER TOTALS (FIXED OUTSIDE SCROLL) */}
                        {pivotData && (
                            <div className="border-t-2 border-slate-300 bg-slate-100 shadow-inner overflow-hidden flex-shrink-0">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <tbody className="font-bold">
                                        <tr>
                                            <td className="px-4 py-3 text-right text-sm uppercase text-slate-600" style={{ width: '200px' }}>Total Général</td>
                                            {pivotData.colHeaders.map(col => {
                                                const isPct = col.endsWith('_PCT');
                                                const val = pivotData.colTotals[col];
                                                let formatted = formatOutput(val);
                                                if (isPct) formatted = val ? `${Number(val).toFixed(1)}%` : '-';

                                                return (
                                                    <td key={col} className="px-4 py-3 text-right text-sm text-slate-900 border-r border-slate-200">
                                                        {formatted}
                                                    </td>
                                                );
                                            })}
                                            {showTotalCol && (
                                                <td className="px-4 py-3 text-right text-sm text-black bg-slate-200 border-l border-slate-300">
                                                    {formatOutput(pivotData.grandTotal)}
                                                </td>
                                            )}
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                </div>
            </div>

            {/* Modal de gestion des sources */}
            <SourceManagementModal
                isOpen={isSourceModalOpen}
                onClose={() => setIsSourceModalOpen(false)}
                sources={sources}
                datasets={datasets}
                batches={batches}
                primaryDataset={primaryDataset}
                onSourcesChange={handleSourcesChange}
            />

            {/* Modal de drilldown */}
            <DrilldownModal
                isOpen={drilldownData !== null}
                onClose={() => setDrilldownData(null)}
                title={drilldownData?.title || ''}
                rows={drilldownData?.rows || []}
                fields={drilldownData?.fields || []}
            />
        </>
    );
};
