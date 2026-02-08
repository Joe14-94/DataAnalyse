import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { detectColumnType, generateId, exportView, exportPivotToHTML } from '../utils';
import * as XLSX from 'xlsx';
import {
  CalculatedField,
  PivotStyleRule,
  ConditionalFormattingRule,
  FilterRule,
  FieldConfig,
  TemporalComparisonConfig,
  TemporalComparisonResult,
  PivotSourceConfig,
  AggregationType,
  SortBy,
  SortOrder,
  DateGrouping,
  PivotMetric,
  SpecificDashboardItem,
  PivotResult,
  PivotRow,
  DataRow,
  PivotConfig
} from '../types';
import { usePivotData } from './usePivotData';
import { formatPivotOutput } from '../logic/pivotEngine';
import { pivotResultToRows, temporalResultToRows } from '../utils/pivotToDataset';
import { useHistory } from './useHistory';

type DropZoneType = 'row' | 'col' | 'val' | 'filter';

const DEFAULT_CONFIG: PivotConfig = {
  sources: [],
  selectedBatchId: '',
  rowFields: [],
  colFields: [],
  colGrouping: 'none',
  valField: '',
  aggType: 'count',
  metrics: [],
  valFormatting: {},
  filters: [],
  showSubtotals: true,
  showTotalCol: true,
  showVariations: false,
  sortBy: 'label',
  sortOrder: 'asc',
  searchTerm: '',
  columnLabels: {},
  columnWidths: {},
  styleRules: [],
  conditionalRules: [],
  isTemporalMode: false,
  temporalComparison: undefined
};

export const usePivotLogic = () => {
  const {
    batches,
    currentDataset,
    currentDatasetId,
    switchDataset,
    datasets,
    savedAnalyses,
    saveAnalysis,
    lastPivotState,
    savePivotState,
    isLoading,
    companyLogo,
    addCalculatedField,
    removeCalculatedField,
    updateCalculatedField,
    addDashboardWidget,
    createDerivedDataset
  } = useData();
  const navigate = useNavigate();

  // --- CONFIGURATION WITH HISTORY ---
  const {
    state: config,
    set: setConfig,
    undo,
    redo,
    clear: clearHistory,
    canUndo,
    canRedo
  } = useHistory<PivotConfig>(DEFAULT_CONFIG);

  // Helper to update specific fields in config
  const updateConfig = useCallback(
    (updates: Partial<PivotConfig>) => {
      setConfig({ ...config, ...updates });
    },
    [config, setConfig]
  );

  // Destructure config for easier use in the component
  const {
    sources,
    selectedBatchId,
    rowFields,
    colFields,
    colGrouping,
    valField,
    aggType,
    metrics,
    valFormatting,
    filters,
    showSubtotals,
    showTotalCol,
    showVariations,
    sortBy,
    sortOrder,
    searchTerm,
    columnLabels,
    columnWidths,
    styleRules,
    conditionalRules,
    isTemporalMode,
    temporalComparison: temporalConfig
  } = config;

  // --- OTHER STATES ---
  const [isInitialized, setIsInitialized] = useState(false);
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
  const [formattingSelectionRule, setFormattingSelectionRule] = useState<{
    id: string;
    type: 'style' | 'conditional';
  } | null>(null);
  const [specificDashboardItems, setSpecificDashboardItems] = useState<SpecificDashboardItem[]>([]);
  const [editingCalcField, setEditingCalcField] = useState<CalculatedField | null>(null);
  const [editingColumn, setEditingColumn] = useState<string | null>(null);

  const [isDataSourcesPanelCollapsed, setIsDataSourcesPanelCollapsed] = useState(false);
  const [isTemporalConfigPanelCollapsed, setIsTemporalConfigPanelCollapsed] = useState(false);
  const [isFieldsPanelCollapsed, setIsFieldsPanelCollapsed] = useState(false);

  const [drilldownData, setDrilldownData] = useState<{
    rows: DataRow[];
    title: string;
    fields: string[];
  } | null>(null);
  const [isChartModalOpen, setIsChartModalOpen] = useState(false);
  const [draggedField, setDraggedField] = useState<string | null>(null);
  const [isTemporalSourceModalOpen, setIsTemporalSourceModalOpen] = useState(false);

  const parentRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);

  // --- DATA FETCHING/CALCULATION HOOK ---
  const {
    blendedRows,
    pivotData,
    temporalResults,
    temporalColTotals,
    isCalculating,
    primaryDataset,
    datasetBatches
  } = usePivotData({
    sources: sources || [],
    selectedBatchId: selectedBatchId || '',
    rowFields: rowFields || [],
    colFields: colFields || [],
    colGrouping: colGrouping || 'none',
    valField: valField || '',
    aggType: aggType || 'count',
    metrics: metrics || [],
    filters: filters || [],
    sortBy: sortBy || 'label',
    sortOrder: sortOrder || 'asc',
    showSubtotals: showSubtotals !== undefined ? showSubtotals : true,
    showVariations: showVariations || false,
    isTemporalMode: !!isTemporalMode,
    temporalConfig: temporalConfig || null,
    searchTerm: searchTerm || ''
  });

  // --- INITIALISATION ---
  useEffect(() => {
    if (isInitialized) return;
    if (lastPivotState && currentDataset && lastPivotState.datasetId === currentDataset.id) {
      const c = lastPivotState.config;
      clearHistory({
        sources: c.sources || [],
        rowFields: c.rowFields || [],
        colFields: c.colFields || [],
        colGrouping: c.colGrouping || 'none',
        valField: c.valField || '',
        aggType: (c.aggType as AggregationType) || 'count',
        metrics: c.metrics || [],
        valFormatting: c.valFormatting || {},
        filters: c.filters || [],
        showSubtotals: c.showSubtotals !== undefined ? c.showSubtotals : true,
        showTotalCol: c.showTotalCol !== undefined ? c.showTotalCol : true,
        showVariations: c.showVariations || false,
        sortBy: c.sortBy || 'label',
        sortOrder: c.sortOrder || 'asc',
        selectedBatchId: c.selectedBatchId || '',
        searchTerm: c.searchTerm || '',
        isTemporalMode: !!c.isTemporalMode,
        temporalComparison: c.temporalComparison || undefined,
        columnLabels: c.columnLabels || {},
        columnWidths: c.columnWidths || {},
        styleRules: c.styleRules || [],
        conditionalRules: c.conditionalRules || []
      });
    } else {
      clearHistory({ ...DEFAULT_CONFIG, sources: [] });
    }
    setIsInitialized(true);
  }, [currentDataset, lastPivotState, isInitialized, clearHistory]);

  useEffect(() => {
    if (!isInitialized || !primaryDataset) return;

    savePivotState({
      datasetId: primaryDataset.id,
      config: {
        ...config,
        temporalComparison: temporalConfig
          ? {
              ...temporalConfig,
              groupByFields: rowFields || [],
              valueField: valField || '',
              aggType: aggType === 'list' ? 'sum' : (aggType as any)
            }
          : undefined
      }
    });
  }, [config, primaryDataset, isInitialized, savePivotState, temporalConfig, rowFields, valField, aggType]);

  useEffect(() => {
    if (isLoading || !isInitialized) return;
    if (datasetBatches.length > 0 && !datasetBatches.find((b) => b.id === selectedBatchId)) {
      updateConfig({ selectedBatchId: datasetBatches[0].id });
    }
  }, [datasetBatches, selectedBatchId, isLoading, isInitialized, updateConfig]);

  // --- HELPERS ---
  const allAvailableFields = useMemo(() => {
    if (!primaryDataset) return [];
    return [
      ...(primaryDataset?.fields || []),
      ...(primaryDataset?.calculatedFields || []).map((cf) => cf.name)
    ];
  }, [primaryDataset]);

  const usedFields = useMemo(() => {
    const used = new Set<string>();
    (rowFields || []).forEach((f) => used.add(f));
    (colFields || []).forEach((f) => used.add(f));
    if (valField) used.add(valField);
    (metrics || []).forEach((m) => used.add(m.field));
    (filters || []).forEach((f) => used.add(f.field));
    return used;
  }, [rowFields, colFields, valField, metrics, filters]);

  const groupedFields = useMemo(() => {
    return (sources || [])
      .map((src) => {
        const ds = (datasets || []).find((d) => d.id === src.datasetId);
        if (!ds) return null;
        const prefix = src.isPrimary ? '' : `[${ds.name}] `;
        const fields = [
          ...(ds.fields || []),
          ...(ds.calculatedFields || []).map((cf) => cf.name)
        ].map((f) => `${prefix}${f}`);
        return { id: src.id, name: ds.name, isPrimary: src.isPrimary, fields, color: src.color };
      })
      .filter(Boolean);
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
    const updates: Partial<PivotConfig> = {
      valField: newField,
      valFormatting: {}
    };

    if (blendedRows.length > 0) {
      const type = detectColumnType(blendedRows.slice(0, 50).map((r) => String(r[newField] || '')));
      const newAgg = (type === 'number' ? 'sum' : 'count') as AggregationType;
      updates.aggType = newAgg;

      if (!metrics || metrics.length === 0) {
        updates.metrics = [{ field: newField, aggType: newAgg }];
      }
    }

    updateConfig(updates);
  };

  const isColFieldDate = useMemo(() => {
    if (!colFields || colFields.length === 0 || blendedRows.length === 0) return false;
    return colFields.some(
      (field) =>
        detectColumnType(blendedRows.slice(0, 50).map((r) => String(r[field] || ''))) === 'date'
    );
  }, [colFields, blendedRows]);

  const handleDragStart = (e: React.DragEvent, field: string, source: string) => {
    setDraggedField(field);
    e.dataTransfer.setData('application/json', JSON.stringify({ field, source }));
  };

  const handleDrop = (e: React.DragEvent, targetZone: DropZoneType) => {
    e.preventDefault();
    const data = JSON.parse(e.dataTransfer.getData('application/json'));
    const { field, source } = data;

    const newConfig = { ...config };
    newConfig.rowFields = newConfig.rowFields || [];
    newConfig.colFields = newConfig.colFields || [];
    newConfig.metrics = newConfig.metrics || [];
    newConfig.filters = newConfig.filters || [];

    if (source === 'row') newConfig.rowFields = newConfig.rowFields.filter((f) => f !== field);
    if (source === 'col') newConfig.colFields = newConfig.colFields.filter((f) => f !== field);
    if (source === 'val') {
      newConfig.metrics = newConfig.metrics.filter((m) => m.field !== field);
      if (newConfig.valField === field) newConfig.valField = '';
    }
    if (source === 'filter') newConfig.filters = newConfig.filters.filter((f) => f.field !== field);

    if (targetZone === 'row' && !newConfig.rowFields.includes(field))
      newConfig.rowFields = [...newConfig.rowFields, field];
    else if (targetZone === 'col' && !newConfig.colFields.includes(field))
      newConfig.colFields = [...newConfig.colFields, field];
    else if (targetZone === 'val') {
      if (newConfig.metrics.length < 15) {
        const type =
          blendedRows.length > 0
            ? detectColumnType(blendedRows.slice(0, 50).map((r) => String(r[field] || '')))
            : 'text';
        const agg = (type === 'number' ? 'sum' : 'count') as AggregationType;
        newConfig.metrics = [...newConfig.metrics, { field, aggType: agg }];
        if (!newConfig.valField) {
          newConfig.valField = field;
          newConfig.aggType = agg;
        }
      } else {
        alert('Limite de 15 métriques atteinte');
      }
    } else if (targetZone === 'filter' && !newConfig.filters.some((f) => f.field === field))
      newConfig.filters = [...newConfig.filters, { field, operator: 'in', value: [] }];

    setConfig(newConfig);
    setDraggedField(null);
  };

  const removeField = (zone: DropZoneType, field: string, index?: number) => {
    const newConfig = { ...config };
    if (zone === 'row')
      newConfig.rowFields = (newConfig.rowFields || []).filter((f) => f !== field);
    if (zone === 'col')
      newConfig.colFields = (newConfig.colFields || []).filter((f) => f !== field);
    if (zone === 'val') {
      if (index !== undefined) {
        newConfig.metrics = (newConfig.metrics || []).filter((_, i) => i !== index);
      } else {
        newConfig.metrics = (newConfig.metrics || []).filter((m) => m.field !== field);
      }
      if (newConfig.valField === field) newConfig.valField = '';
    }
    if (zone === 'filter')
      newConfig.filters = (newConfig.filters || []).filter((f) => f.field !== field);
    setConfig(newConfig);
  };

  const handleExport = (format: 'pdf' | 'html', mode: 'A4' | 'adaptive' = 'adaptive') => {
    setShowExportMenu(false);

    if (format === 'html') {
      const title = `TCD - ${primaryDataset?.name || 'Analyse'}`;
      const formatOutput = (val: string | number, metric?: PivotMetric) => {
        const field = metric?.field || valField || '';
        const type = metric?.aggType || aggType || 'count';
        return formatPivotOutput(
          val,
          field,
          type,
          primaryDataset,
          undefined,
          datasets,
          metric?.formatting || valFormatting
        );
      };

      if (isTemporalMode && temporalResults?.length > 0) {
        exportPivotToHTML(temporalResults, rowFields || [], !!showTotalCol, title, companyLogo, {
          isTemporalMode: true,
          temporalConfig: temporalConfig || null,
          temporalColTotals,
          metrics:
            metrics && metrics.length > 0
              ? metrics
              : valField
                ? [{ field: valField, aggType: aggType || 'count' }]
                : [],
          showVariations: !!showVariations,
          formatOutput
        });
      } else if (pivotData) {
        exportPivotToHTML(pivotData, rowFields || [], !!showTotalCol, title, companyLogo, {
          formatOutput,
          metrics:
            metrics && metrics.length > 0
              ? metrics
              : valField
                ? [{ field: valField, aggType: aggType || 'count' }]
                : []
        });
      } else {
        alert('Aucune donnée à exporter');
      }
    } else {
      exportView(
        format,
        'pivot-export-container',
        `TCD - ${primaryDataset?.name || 'Analyse'}`,
        companyLogo,
        mode
      );
    }
  };

  const handleExportSpreadsheet = (format: 'xlsx' | 'csv') => {
    setShowExportMenu(false);

    if (!primaryDataset) {
      alert('Veuillez sélectionner un dataset');
      return;
    }

    if (!isTemporalMode && !pivotData) {
      alert('Aucune donnée à exporter');
      return;
    }

    if (isTemporalMode && (!temporalResults || temporalResults.length === 0)) {
      alert('Aucune donnée à exporter');
      return;
    }

    const exportData: (string | number)[][] = [];
    const activeMetrics =
      metrics && metrics.length > 0
        ? metrics
        : valField
          ? [{ field: valField, aggType: aggType || 'count' }]
          : [];

    if (isTemporalMode && temporalConfig) {
      const headers: string[] = [...(rowFields || [])];

      temporalConfig.sources.forEach((s: any) => {
        activeMetrics.forEach((m) => {
          const mLabel = m.label || `${m.field} (${m.aggType})`;
          headers.push(activeMetrics.length > 1 ? `${s.label} - ${mLabel}` : s.label);
        });
        if (showVariations && s.id !== temporalConfig.referenceSourceId) {
          activeMetrics.forEach((m) => {
            const mLabel = m.label || `${m.field} (${m.aggType})`;
            headers.push(
              activeMetrics.length > 1 ? `Var. ${s.label} - ${mLabel}` : `Var. ${s.label}`
            );
          });
        }
      });
      exportData.push(headers);

      temporalResults.forEach((result) => {
        const rowData: (string | number)[] = [];
        const keys = result.groupLabel.split('\x1F');
        const isSubtotal = result.isSubtotal;
        const subLevel = result.subtotalLevel || 0;

        (rowFields || []).forEach((_, idx) => {
          if (isSubtotal) {
            if (idx === subLevel) rowData.push(`Total ${keys[idx]}`);
            else if (idx < subLevel) rowData.push(keys[idx]);
            else rowData.push('');
          } else {
            rowData.push(keys[idx] || '');
          }
        });

        temporalConfig.sources.forEach((s: any) => {
          activeMetrics.forEach((m) => {
            const mLabel = m.label || `${m.field} (${m.aggType})`;
            rowData.push(Number(result.values[s.id]?.[mLabel]) || 0);
          });
          if (showVariations && s.id !== temporalConfig.referenceSourceId) {
            activeMetrics.forEach((m) => {
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
        const totalsRow: (string | number)[] = ['TOTAL'];
        for (let i = 1; i < (rowFields || []).length; i++) totalsRow.push('');

        temporalConfig.sources.forEach((s: any) => {
          activeMetrics.forEach((m) => {
            const mLabel = m.label || `${m.field} (${m.aggType})`;
            totalsRow.push(Number(temporalColTotals[s.id]?.[mLabel]) || 0);
          });
          if (showVariations && s.id !== temporalConfig.referenceSourceId) {
            activeMetrics.forEach(() => totalsRow.push(''));
          }
        });
        exportData.push(totalsRow);
      }
    } else if (pivotData) {
      const headers: string[] = [...(rowFields || [])];
      pivotData.colHeaders.forEach((header) => headers.push(header));
      if (showTotalCol) headers.push('Total');
      exportData.push(headers);

      pivotData.displayRows.forEach((row) => {
        const rowData: (string | number)[] = [];
        (rowFields || []).forEach((field, index) => {
          if (index < row.keys.length) {
            const indent =
              row.type === 'subtotal' && index === row.keys.length - 1
                ? '  '.repeat(row.level || 0)
                : '';
            rowData.push(indent + row.keys[index]);
          } else {
            rowData.push('');
          }
        });

        pivotData.colHeaders.forEach((colHeader) => {
          rowData.push(Number(row.metrics[colHeader]) || 0);
        });

        if (showTotalCol) {
          if (typeof row.rowTotal === 'object') {
            // If it's multi-metric totals, we might need special handling
            rowData.push(0);
          } else {
            rowData.push(Number(row.rowTotal) || 0);
          }
        }
        exportData.push(rowData);
      });

      if (pivotData.colTotals) {
        const totalsRow: (string | number)[] = ['Total'];
        for (let i = 1; i < (rowFields || []).length; i++) totalsRow.push('');
        pivotData.colHeaders.forEach((colHeader) =>
          totalsRow.push(Number(pivotData.colTotals[colHeader]) || 0)
        );
        if (showTotalCol && pivotData.grandTotal !== undefined) {
          if (typeof pivotData.grandTotal === 'object') {
            totalsRow.push(0);
          } else {
            totalsRow.push(Number(pivotData.grandTotal) || 0);
          }
        }
        exportData.push(totalsRow);
      }
    }

    if (format === 'csv') {
      const csvContent = exportData
        .map((row) =>
          row
            .map((cell) => {
              const str = String(cell);
              if (str.includes(';') || str.includes('\n') || str.includes('"')) {
                return `"${str.replace(/"/g, '""')}"`;
              }
              return str;
            })
            .join(';')
        )
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `TCD_${primaryDataset.name}_${new Date().toISOString().split('T')[0]}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const ws = XLSX.utils.aoa_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'TCD');
      XLSX.writeFile(
        wb,
        `TCD_${primaryDataset.name}_${new Date().toISOString().split('T')[0]}.xlsx`
      );
    }
  };

  const handleDrilldown = (rowKeys: string[], colLabel: string) => {
    if (isSelectionMode) return;

    const prefilledFilters: Record<string, string> = {};

    (rowFields || []).forEach((field, i) => {
      const val = rowKeys[i];
      if (val === '(Vide)') {
        prefilledFilters[field] = '__EMPTY__';
      } else {
        prefilledFilters[field] = `=${val}`;
      }
    });

    if (colFields && colFields.length > 0 && colLabel !== 'Total' && colLabel !== 'ALL') {
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

  const handleCellClick = (
    rowKeys: string[],
    colLabel: string,
    value: number | string | undefined,
    metricLabel: string
  ) => {
    if (formattingSelectionRule) {
      const targetKey =
        colLabel === ''
          ? rowKeys[rowKeys.length - 1] || ''
          : rowKeys.length === 0
            ? colLabel
            : `${rowKeys.join('\x1F')}|${colLabel}`;

      if (formattingSelectionRule.type === 'style') {
        updateConfig({
          styleRules: (styleRules || []).map((r) =>
            r.id === formattingSelectionRule.id
              ? {
                  ...r,
                  targetKey,
                  targetType: colLabel === '' ? 'row' : rowKeys.length === 0 ? 'col' : 'cell'
                }
              : r
          )
        });
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
    const label = `${rowKeys[rowKeys.length - 1]} - ${colLabel}`;

    const newItem: SpecificDashboardItem = {
      id,
      label,
      value: value || 0,
      rowPath: rowKeys,
      colLabel,
      metricLabel
    };

    setSpecificDashboardItems((prev) => [...prev, newItem]);
  };

  const handleTemporalDrilldown = (
    result: TemporalComparisonResult,
    sourceId: string,
    metricLabel: string
  ) => {
    const source = temporalConfig?.sources.find((s) => s.id === sourceId);
    const value = result.values[sourceId]?.[metricLabel] || 0;
    const label = source?.label || sourceId;

    if (formattingSelectionRule) {
      const rowKeys = result.groupLabel.split('\x1F');
      const targetKey = `${rowKeys.join('\x1F')}|${sourceId}_${metricLabel}`;

      if (formattingSelectionRule.type === 'style') {
        updateConfig({
          styleRules: (styleRules || []).map((r) =>
            r.id === formattingSelectionRule.id
              ? {
                  ...r,
                  targetKey,
                  targetType: 'cell'
                }
              : r
          )
        });
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

      setSpecificDashboardItems((prev) => [...prev, newItem]);
      return;
    }

    const prefilledFilters: Record<string, string> = {};
    const rowKeys = result.groupLabel.split('\x1F');

    (rowFields || []).forEach((field, i) => {
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
    const a = savedAnalyses.find((x) => x.id === id);
    if (a) {
      const c = a.config;
      if (a.datasetId && a.datasetId !== currentDatasetId) {
        switchDataset(a.datasetId);
      }

      clearHistory({
        sources: c.sources || [],
        rowFields: c.rowFields || [],
        colFields: c.colFields || [],
        colGrouping: c.colGrouping || 'none',
        valField: c.valField || '',
        aggType: (c.aggType as AggregationType) || 'count',
        metrics: c.metrics || (c.valField ? [{ field: c.valField, aggType: c.aggType }] : []),
        valFormatting: c.valFormatting || {},
        filters: c.filters || [],
        showSubtotals: c.showSubtotals !== undefined ? c.showSubtotals : true,
        showTotalCol: c.showTotalCol !== undefined ? c.showTotalCol : true,
        showVariations: c.showVariations || false,
        sortBy: c.sortBy || 'label',
        sortOrder: c.sortOrder || 'asc',
        selectedBatchId: c.selectedBatchId || '',
        searchTerm: c.searchTerm || '',
        isTemporalMode: !!c.isTemporalMode,
        temporalComparison: c.temporalComparison || undefined,
        columnLabels: c.columnLabels || {},
        columnWidths: c.columnWidths || {},
        styleRules: c.styleRules || [],
        conditionalRules: c.conditionalRules || []
      });
    }
    setShowLoadMenu(false);
  };

  const handleSaveCalculatedField = (field: Partial<CalculatedField>) => {
    if (!primaryDataset) return;

    const newConfig = { ...config };
    newConfig.metrics = newConfig.metrics || [];
    newConfig.rowFields = newConfig.rowFields || [];
    newConfig.colFields = newConfig.colFields || [];
    newConfig.filters = newConfig.filters || [];
    newConfig.columnLabels = newConfig.columnLabels || {};

    if (editingCalcField) {
      const oldName = editingCalcField.name;
      const newName = field.name || oldName;

      updateCalculatedField(primaryDataset.id, editingCalcField.id, field);

      if (newName !== oldName) {
        newConfig.metrics = newConfig.metrics.map((m) =>
          m.field === oldName ? { ...m, field: newName } : m
        );
        if (newConfig.valField === oldName) newConfig.valField = newName;
        newConfig.rowFields = newConfig.rowFields.map((f) => (f === oldName ? newName : f));
        newConfig.colFields = newConfig.colFields.map((f) => (f === oldName ? newName : f));
        newConfig.filters = newConfig.filters.map((f) =>
          f.field === oldName ? { ...f, field: newName } : f
        );

        if (newConfig.columnLabels[oldName]) {
          const newLabels = { ...newConfig.columnLabels };
          newLabels[newName] = newLabels[oldName];
          delete newLabels[oldName];
          newConfig.columnLabels = newLabels;
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
        newConfig.metrics = [...newConfig.metrics, { field: field.name!, aggType: 'sum' }];
      } else {
        newConfig.rowFields = [...newConfig.rowFields, field.name!];
      }
    }
    setConfig(newConfig);
    setEditingCalcField(null);
  };

  const handleRemoveCalculatedField = (id: string) => {
    if (!primaryDataset) return;
    const field = primaryDataset.calculatedFields?.find((f) => f.id === id);
    if (field) {
      const newConfig = { ...config };
      newConfig.metrics = (newConfig.metrics || []).filter((m) => m.field !== field.name);
      if (newConfig.valField === field.name) newConfig.valField = '';
      if (newConfig.rowFields?.includes(field.name))
        newConfig.rowFields = newConfig.rowFields.filter((f) => f !== field.name);
      if (newConfig.colFields?.includes(field.name))
        newConfig.colFields = newConfig.colFields.filter((f) => f !== field.name);
      newConfig.filters = (newConfig.filters || []).filter((f) => f.field !== field.name);
      setConfig(newConfig);
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
    alert('Rapport ajouté à votre tableau de bord !');
    navigate('/dashboard');
  };

  const handleSaveAnalysis = () => {
    if (analysisName.trim() && primaryDataset) {
      saveAnalysis({
        name: analysisName,
        type: 'pivot',
        datasetId: primaryDataset.id,
        config: {
          ...config,
          temporalComparison: temporalConfig
            ? {
                ...temporalConfig,
                groupByFields: rowFields || [],
                valueField: valField || '',
                aggType: aggType === 'list' ? 'sum' : (aggType as any)
              }
            : undefined
        }
      });
      setIsSaving(false);
      setAnalysisName('');
    }
  };

  const handleSaveAsDataset = (name: string) => {
    if (!primaryDataset) return;

    let fields: string[] = [];
    let rows: Record<string, string | number | boolean>[] = [];

    if (isTemporalMode && temporalConfig) {
      fields = [...(rowFields || []), ...(temporalConfig.sources || []).map((s: any) => s.label)];
      rows = temporalResultToRows(temporalResults, rowFields || [], temporalConfig);

      const configForDataset = {
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
          groupByFields: rowFields || [],
          valueField: valField || '',
          aggType: aggType as any
        }
      };

      createDerivedDataset(name, true, configForDataset, fields, rows);
    } else if (pivotData) {
      fields = [...(rowFields || []), ...pivotData.colHeaders];
      rows = pivotResultToRows(pivotData, rowFields || []);

      const configForDataset = {
        sources,
        rowFields,
        colFields,
        colGrouping,
        valField,
        aggType,
        metrics,
        filters,
        sortBy,
        sortOrder,
        showVariations
      };
      createDerivedDataset(name, false, configForDataset, fields, rows);
    }

    alert(`Le Dataset "${name}" a été créé avec succès.`);
    navigate('/data');
  };

  const chartPivotData = useMemo(() => {
    if (isTemporalMode && temporalConfig) {
      const activeMetrics =
        metrics && metrics.length > 0
          ? metrics
          : valField
            ? [{ field: valField, aggType: aggType || 'count' }]
            : [];
      const colHeaders: string[] = [];

      temporalConfig.sources.forEach((s: any) => {
        activeMetrics.forEach((m) => {
          const mLabel = m.label || `${m.field} (${m.aggType})`;
          colHeaders.push(activeMetrics.length > 1 ? `${s.label} - ${mLabel}` : s.label);
        });
      });

      const displayRows: PivotRow[] = (temporalResults || []).map((r) => {
        const keys = r.groupLabel.split('\x1F');
        const rowMetrics: Record<string, number | string> = {};
        let rowTotal = 0;

        temporalConfig.sources.forEach((s: any) => {
          activeMetrics.forEach((m) => {
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
          level: r.isSubtotal ? (r.subtotalLevel ?? 0) : keys.length - 1,
          label: r.groupLabel.replace(/\x1F/g, ' > '),
          metrics: rowMetrics,
          rowTotal: rowTotal
        };
      });
      return { colHeaders, displayRows, colTotals: {}, grandTotal: 0, isTemporal: true };
    }
    return pivotData;
  }, [isTemporalMode, temporalResults, temporalConfig, pivotData, metrics, valField, aggType]);

  return {
    // History
    undo,
    redo,
    canUndo,
    canRedo,
    // Configuration
    config,
    updateConfig,
    // Data & Hooks
    batches,
    currentDataset,
    datasets,
    savedAnalyses,
    primaryDataset,
    datasetBatches,
    blendedRows,
    pivotData,
    temporalResults,
    temporalColTotals,
    isCalculating,
    chartPivotData,
    // UI State (Still separate)
    isInitialized,
    isSaving,
    setIsSaving,
    isEditMode,
    setIsEditMode,
    analysisName,
    setAnalysisName,
    showExportMenu,
    setShowExportMenu,
    showLoadMenu,
    setShowLoadMenu,
    expandedSections,
    setExpandedSections,
    isSourceModalOpen,
    setIsSourceModalOpen,
    isCalcModalOpen,
    setIsCalcModalOpen,
    isSpecificDashboardModalOpen,
    setIsSpecificDashboardModalOpen,
    isFormattingModalOpen,
    setIsFormattingModalOpen,
    isQuickChartModalOpen,
    setIsQuickChartModalOpen,
    isSelectionMode,
    setIsSelectionMode,
    isSaveAsDatasetModalOpen,
    setIsSaveAsDatasetModalOpen,
    formattingSelectionRule,
    setFormattingSelectionRule,
    specificDashboardItems,
    setSpecificDashboardItems,
    editingCalcField,
    setEditingCalcField,
    editingColumn,
    setEditingColumn,

    // Destructured config for backward compatibility with components
    sources,
    setSources: (v: any) => updateConfig({ sources: typeof v === 'function' ? v(sources || []) : v }),
    selectedBatchId,
    setSelectedBatchId: (v: any) =>
      updateConfig({ selectedBatchId: typeof v === 'function' ? v(selectedBatchId || '') : v }),
    rowFields,
    setRowFields: (v: any) => updateConfig({ rowFields: typeof v === 'function' ? v(rowFields || []) : v }),
    colFields,
    setColFields: (v: any) => updateConfig({ colFields: typeof v === 'function' ? v(colFields || []) : v }),
    valField,
    setValField: (v: any) => updateConfig({ valField: typeof v === 'function' ? v(valField || '') : v }),
    colGrouping,
    setColGrouping: (v: any) =>
      updateConfig({ colGrouping: typeof v === 'function' ? v(colGrouping || 'none') : v }),
    aggType,
    setAggType: (v: any) => updateConfig({ aggType: typeof v === 'function' ? v(aggType || 'count') : v }),
    metrics,
    setMetrics: (v: any) => updateConfig({ metrics: typeof v === 'function' ? v(metrics || []) : v }),
    valFormatting,
    setValFormatting: (v: any) =>
      updateConfig({ valFormatting: typeof v === 'function' ? v(valFormatting || {}) : v }),
    filters,
    setFilters: (v: any) => updateConfig({ filters: typeof v === 'function' ? v(filters || []) : v }),
    showSubtotals,
    setShowSubtotals: (v: any) =>
      updateConfig({ showSubtotals: typeof v === 'function' ? v(showSubtotals !== undefined ? showSubtotals : true) : v }),
    showTotalCol,
    setShowTotalCol: (v: any) =>
      updateConfig({ showTotalCol: typeof v === 'function' ? v(showTotalCol !== undefined ? showTotalCol : true) : v }),
    showVariations,
    setShowVariations: (v: any) =>
      updateConfig({ showVariations: typeof v === 'function' ? v(!!showVariations) : v }),
    sortBy,
    setSortBy: (v: any) => updateConfig({ sortBy: typeof v === 'function' ? v(sortBy || 'label') : v }),
    sortOrder,
    setSortOrder: (v: any) => updateConfig({ sortOrder: typeof v === 'function' ? v(sortOrder || 'asc') : v }),
    searchTerm,
    setSearchTerm: (v: any) => updateConfig({ searchTerm: typeof v === 'function' ? v(searchTerm || '') : v }),
    columnLabels,
    setColumnLabels: (v: any) =>
      updateConfig({ columnLabels: typeof v === 'function' ? v(columnLabels || {}) : v }),
    columnWidths,
    setColumnWidths: (v: any) =>
      updateConfig({ columnWidths: typeof v === 'function' ? v(columnWidths || {}) : v }),
    styleRules,
    setStyleRules: (v: any) => updateConfig({ styleRules: typeof v === 'function' ? v(styleRules || []) : v }),
    conditionalRules,
    setConditionalRules: (v: any) =>
      updateConfig({ conditionalRules: typeof v === 'function' ? v(conditionalRules || []) : v }),
    isTemporalMode,
    setIsTemporalMode: (v: any) =>
      updateConfig({ isTemporalMode: typeof v === 'function' ? v(!!isTemporalMode) : v }),
    temporalConfig,
    setTemporalConfig: (v: any) =>
      updateConfig({ temporalComparison: typeof v === 'function' ? v(temporalConfig) : v }),
    isDataSourcesPanelCollapsed,
    setIsDataSourcesPanelCollapsed,
    isTemporalConfigPanelCollapsed,
    setIsTemporalConfigPanelCollapsed,
    isFieldsPanelCollapsed,
    setIsFieldsPanelCollapsed,
    drilldownData,
    setDrilldownData,
    isChartModalOpen,
    setIsChartModalOpen,
    draggedField,
    setDraggedField,
    isTemporalSourceModalOpen,
    setIsTemporalSourceModalOpen,
    // Refs
    parentRef,
    footerRef,
    // Helpers
    allAvailableFields,
    usedFields,
    groupedFields,
    isColFieldDate,
    // Handlers
    handleValFieldChange,
    handleDragStart,
    handleDrop,
    removeField,
    handleExport,
    handleExportSpreadsheet,
    handleDrilldown,
    handleCellClick,
    handleTemporalDrilldown,
    handleLoadAnalysis,
    handleSaveCalculatedField,
    handleRemoveCalculatedField,
    handleSaveSpecificDashboard,
    handleSaveAnalysis,
    handleSaveAsDataset,
    companyLogo
  };
};
