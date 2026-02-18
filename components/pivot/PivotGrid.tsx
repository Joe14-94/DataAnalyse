
import React from 'react';
import { Loader2, Table2, ArrowUp, ArrowDown, X, ChevronRight, ChevronDown } from 'lucide-react';
import {
   TemporalComparisonResult, Dataset, PivotResult, SortBy, SortOrder,
   PivotStyleRule, ConditionalFormattingRule, TemporalComparisonConfig,
   PivotMetric, FieldConfig, AggregationType
} from '../../types';
import { formatPivotOutput } from '../../logic/pivotEngine';
import { formatPercentage } from '../../utils/temporalComparison';
import { formatDateLabelForDisplay } from '../../utils';
import { getCellStyle } from '../../utils/pivotFormatting';

interface SelectedPivotItem {
   colLabel: string;
   rowPath: string[];
   value?: number | string;
   metricLabel?: string;
}

interface PivotGridProps {
   isCalculating: boolean;
   isTemporalMode: boolean;
   pivotData: PivotResult | null;
   temporalResults: TemporalComparisonResult[];
   temporalConfig: TemporalComparisonConfig | null;
   rowFields: string[];
   colFields: string[];
   columnLabels: Record<string, string>;
   editingColumn: string | null;
   setEditingColumn: (v: string | null) => void;
   setColumnLabels: React.Dispatch<React.SetStateAction<Record<string, string>>>;
   showVariations: boolean;
   showTotalCol: boolean;
   handleDrilldown: (rowKeys: string[], colLabel: string, value: number | string | undefined, metricLabel: string) => void;
   handleTemporalDrilldown: (result: TemporalComparisonResult, sourceId: string, metricLabel: string) => void;
   primaryDataset: Dataset | null;
   datasets: Dataset[];
   aggType: string;
   valField: string;
   metrics: PivotMetric[];
   valFormatting: Partial<FieldConfig>;
   virtualItems: any[];
   rowVirtualizer: any;
   colVirtualizer: any;
   allDataColumns: { key: string; width: number; isDiff?: boolean }[];
   parentRef: React.RefObject<HTMLDivElement>;
   totalColumns: number;
   paddingTop: number;
   paddingBottom: number;
   isSelectionMode?: boolean;
   isFormattingSelectionMode?: boolean;
   isEditMode?: boolean;
   selectedItems?: SelectedPivotItem[];
   sortBy: SortBy;
   setSortBy: (v: SortBy) => void;
   sortOrder: SortOrder;
   setSortOrder: (v: SortOrder) => void;
   columnWidths: Record<string, number>;
   setColumnWidths: React.Dispatch<React.SetStateAction<Record<string, number>>>;
   styleRules: PivotStyleRule[];
   conditionalRules: ConditionalFormattingRule[];
   collapsedRows: Set<string>;
   toggleRowExpansion: (path: string) => void;
   onRemoveField?: (zone: 'row' | 'col' | 'val' | 'filter', field: string) => void;
}

interface PivotGridRowProps {
   row: any;
   virtualRow: any;
   rowFields: string[];
   allDataColumns: { key: string; width: number; isDiff?: boolean }[];
   columnWidths: Record<string, number>;
   rowFieldLeftPositions: number[];
   metricInfoCache: Map<string, any>;
   formatOutput: (val: any, metric?: PivotMetric, isDelta?: boolean) => string;
   getCellFormatting: (rowKeys: string[], col: string, value: any, metricLabel: string, rowType?: 'data' | 'subtotal' | 'grandTotal') => any;
   handleDrilldown: (rowKeys: string[], colLabel: string, value: any, metricLabel: string) => void;
   isSelectionMode: boolean;
   isItemSelected: (rowKeys: string[], colLabel: string) => boolean;
   showTotalCol: boolean;
   effectiveMetrics: PivotMetric[];
   metricLabelMap: Map<string, PivotMetric>;
   primaryDataset: Dataset | null;
   virtualCols: any[];
   collapsedRows: Set<string>;
   toggleRowExpansion: (path: string) => void;
   measureElement?: (el: HTMLElement | null) => void;
}

const StandardPivotRow = React.memo<PivotGridRowProps>(({
   row, virtualRow, rowFields, allDataColumns, columnWidths, rowFieldLeftPositions,
   metricInfoCache, formatOutput, getCellFormatting, handleDrilldown,
   isSelectionMode, isItemSelected, showTotalCol, effectiveMetrics, metricLabelMap, primaryDataset, virtualCols,
   collapsedRows, toggleRowExpansion, measureElement
}) => {
   const isSubtotal = row.type === 'subtotal';
   const currentPath = row.keys.join('\x1F');
   const isCollapsed = collapsedRows.has(currentPath);

   return (
      <tr key={virtualRow.key} data-index={virtualRow.index} ref={measureElement} className={`${isSubtotal ? 'bg-slate-50 font-bold' : 'hover:bg-brand-50/30'}`}>
         {(rowFields || []).map((field, cIdx) => {
            const width = columnWidths[`row_${field}`] || 150;
            const left = rowFieldLeftPositions[cIdx];
            const headerStyle = getCellFormatting(row.keys, '', undefined, '', row.type);

            if (isSubtotal) {
               if (cIdx < row.level) return <td key={cIdx} className="px-2 py-1 text-xs text-slate-500 border-r border-slate-200 bg-slate-50 overflow-hidden truncate sticky left-0 z-20" style={{ width, minWidth: width, maxWidth: width, left: `${left}px`, ...headerStyle }}>{primaryDataset?.fieldConfigs?.[rowFields[cIdx]]?.type === 'date' ? formatDateLabelForDisplay(row.keys[cIdx]) : row.keys[cIdx]}</td>;
               if (cIdx === row.level) {
                  const displayLabel = primaryDataset?.fieldConfigs?.[rowFields[row.level]]?.type === 'date' ? formatDateLabelForDisplay(row.label) : row.label;
                  return (
                     <td key={cIdx} colSpan={rowFields.length - cIdx} className="px-2 py-1 text-xs text-slate-700 border-r border-slate-200 font-bold italic sticky left-0 z-20 bg-slate-50 cursor-pointer hover:bg-slate-100 outline-none focus:ring-2 focus:ring-brand-500"
                        style={{ left: `${left}px`, ...headerStyle }}
                        role="button"
                        tabIndex={0}
                        title={isCollapsed ? "Déployer" : "Regrouper"}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleRowExpansion(currentPath); } }}
                        onClick={(e) => { e.stopPropagation(); toggleRowExpansion(currentPath); }}>
                        <div className="flex items-center gap-1">
                           <span className="text-brand-600">
                              {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                           </span>
                           <span className="truncate">{displayLabel}</span>
                        </div>
                     </td>
                  );
               }
               return null;
            }

            return (
               <td key={cIdx} className="px-2 py-1 text-xs text-slate-700 border-r border-slate-200 whitespace-nowrap overflow-hidden truncate sticky left-0 z-20 bg-white cursor-pointer hover:bg-brand-50 transition-colors"
                  style={{ width, minWidth: width, maxWidth: width, left: `${left}px`, ...headerStyle }}
                  onClick={() => handleDrilldown(row.keys.slice(0, cIdx + 1), '', undefined, '')}>
                  {primaryDataset?.fieldConfigs?.[rowFields[cIdx]]?.type === 'date' ? formatDateLabelForDisplay(row.keys[cIdx]) : row.keys[cIdx]}
               </td>
            );
         })}
         {virtualCols[0]?.start > 0 && <td />}
         {virtualCols.map((vCol: any) => {
            const colKey = allDataColumns[vCol.index].key;
            const val = row.metrics[colKey];
            const { colLabel, metricLabel, metric, isDiff, isPct } = metricInfoCache.get(colKey) || {};
            const customStyle = getCellFormatting(row.keys, colKey, val, metricLabel || '', row.type);
            let formatted = formatOutput(val, metric, isDiff);
            let cellClass = "text-slate-600";
            if (isDiff) {
               if (Number(val) > 0) {
                  if (!formatted.startsWith('+')) formatted = `+${formatted}`;
                  cellClass = "text-green-600 font-bold";
               }
               else if (Number(val) < 0) { cellClass = "text-red-600 font-bold"; }
               else cellClass = "text-slate-400";
            } else if (isPct) {
               if (val === 0 || val === undefined) formatted = '-';
               else { formatted = `${Number(val).toFixed(1)}%`; if (Number(val) > 0) cellClass = "text-green-600 font-bold"; else if (Number(val) < 0) cellClass = "text-red-600 font-bold"; }
            }
            const isSelected = isSelectionMode && isItemSelected(row.keys, colLabel || colKey);
            return (
               <td key={colKey}
                  tabIndex={0}
                  role="button"
                  aria-label={`Détails pour ${colLabel || colKey}`}
                  className={`px-2 py-1 text-xs text-right border-r border-slate-200 tabular-nums cursor-pointer transition-all overflow-hidden truncate outline-none focus:ring-2 focus:ring-brand-500 focus:z-10 ${cellClass} ${isDiff || isPct ? 'bg-brand-50/20' : ''} ${isSelectionMode ? (isSelected ? 'bg-brand-100 ring-1 ring-brand-400' : 'hover:bg-brand-50 hover:ring-1 hover:ring-brand-300') : 'hover:bg-brand-100'}`}
                  style={{ width: vCol.size, minWidth: vCol.size, maxWidth: vCol.size, ...customStyle }}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleDrilldown(row.keys, colLabel || colKey, val as string | number | undefined, metricLabel || ''); } }}
                  onClick={() => handleDrilldown(row.keys, colLabel || colKey, val as string | number | undefined, metricLabel || '')}>
                  {formatted}
               </td>
            );
         })}
         {showTotalCol && effectiveMetrics.length > 0 && (
            <td
               tabIndex={0}
               role="button"
               aria-label="Détails du total ligne"
               className={`px-2 py-1 text-right border-l border-slate-200 cursor-pointer transition-all outline-none focus:ring-2 focus:ring-brand-500 focus:z-10 ${isSelectionMode ? (isItemSelected(row.keys, 'Total') ? 'bg-blue-100 ring-1 ring-blue-400' : 'bg-slate-50 hover:bg-blue-50 hover:ring-1 hover:ring-blue-300') : 'bg-slate-50 hover:bg-blue-100'}`}
               style={{ width: columnWidths['Grand Total'] || 150, minWidth: 150, maxWidth: 150, ...getCellFormatting(row.keys, 'Total', typeof row.rowTotal === 'object' ? Object.values(row.rowTotal)[0] : row.rowTotal, '', row.type) }}
               onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const value = typeof row.rowTotal === 'object' ? Object.values(row.rowTotal)[0] : row.rowTotal; handleDrilldown(row.keys, 'Total', value, ''); } }}
               onClick={() => { const value = typeof row.rowTotal === 'object' ? Object.values(row.rowTotal)[0] : row.rowTotal; handleDrilldown(row.keys, 'Total', value, ''); }}>
               {typeof row.rowTotal === 'object' ? <div className="flex flex-col gap-0.5">{Object.entries(row.rowTotal).map(([label, v], idx) => { const metric = metricLabelMap.get(label); const metricStyle = getCellFormatting(row.keys, 'Total', v, label, row.type); return <div key={idx} className="text-xs whitespace-nowrap" style={metricStyle}><span className="text-slate-400 font-medium mr-1">{label}:</span><span className="font-bold text-slate-800">{formatOutput(v, metric)}</span></div>; })}</div> : <span className="text-xs font-bold text-slate-800">{formatOutput(row.rowTotal, effectiveMetrics[0])}</span>}
            </td>
         )}
      </tr>
   );
});

interface TemporalPivotRowProps extends PivotGridRowProps {
   handleTemporalDrilldown: (result: any, sourceId: string, metricLabel: string) => void;
   temporalConfig: TemporalComparisonConfig | null;
}

const TemporalPivotRow = React.memo<TemporalPivotRowProps>(({
   row: result, virtualRow, rowFields, allDataColumns, columnWidths, rowFieldLeftPositions,
   metricInfoCache, formatOutput, getCellFormatting, handleDrilldown, handleTemporalDrilldown,
   isSelectionMode, isItemSelected, effectiveMetrics, metricLabelMap, primaryDataset, virtualCols, temporalConfig,
   collapsedRows, toggleRowExpansion, measureElement
}) => {
   const isSubtotal = result.isSubtotal || false;
   const subtotalLevel = result.subtotalLevel || 0;
   const labels = React.useMemo(() => result.groupLabel.split('\x1F'), [result.groupLabel]);
   const currentPath = result.groupLabel;
   const isCollapsed = collapsedRows.has(currentPath);

   return (
      <tr key={virtualRow.key} ref={measureElement} data-index={virtualRow.index} className={isSubtotal ? `bg-slate-50 font-bold border-t border-slate-200` : 'hover:bg-brand-50/30'}>
         {Array.from({ length: rowFields.length }, (_, gIdx) => {
            if (isSubtotal && gIdx > subtotalLevel) return null;
            const field = rowFields[gIdx];
            const width = columnWidths[`group_${field}`] || 150;
            const left = rowFieldLeftPositions[gIdx];
            const rowStyle = getCellFormatting(labels, '', undefined, '', isSubtotal ? 'subtotal' : 'data');

            if (isSubtotal && gIdx === subtotalLevel) {
               const displayLabel = primaryDataset?.fieldConfigs?.[rowFields[gIdx]]?.type === 'date' ? formatDateLabelForDisplay(labels[gIdx]) : labels[gIdx];
               return (
                  <td key={gIdx} className="px-2 py-1 text-xs border-r border-slate-200 whitespace-nowrap sticky left-0 z-20 bg-slate-50 cursor-pointer hover:bg-slate-100 font-bold outline-none focus:ring-2 focus:ring-brand-500"
                     style={{ ...rowStyle, left: `${left}px` }}
                     colSpan={rowFields.length - subtotalLevel}
                     role="button"
                     tabIndex={0}
                     title={isCollapsed ? "Déployer" : "Regrouper"}
                     onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleRowExpansion(currentPath); } }}
                     onClick={(e) => { e.stopPropagation(); toggleRowExpansion(currentPath); }}>
                     <div className="flex items-center gap-1">
                        <span className="text-brand-600">
                           {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </span>
                        <span className="truncate">{displayLabel}</span>
                     </div>
                  </td>
               );
            }

            return (
               <td key={gIdx} className={`px-2 py-1 text-xs border-r border-slate-200 whitespace-nowrap overflow-hidden truncate sticky left-0 z-20 bg-white cursor-pointer hover:bg-brand-50 transition-colors ${isSubtotal ? 'font-bold bg-slate-50' : ''}`}
                  style={{ ...rowStyle, width, minWidth: width, maxWidth: width, left: `${left}px` }}
                  onClick={() => handleDrilldown(labels.slice(0, gIdx + 1), '', undefined, '')}>
                  {(!isSubtotal || gIdx <= subtotalLevel) ? (primaryDataset?.fieldConfigs?.[rowFields[gIdx]]?.type === 'date' ? formatDateLabelForDisplay(labels[gIdx]) : labels[gIdx]) : ''}
               </td>
            );
         })}
         {virtualCols[0]?.start > 0 && <td />}
         {virtualCols.map((vCol: any) => {
            const col = allDataColumns[vCol.index];
            const colKey = col.key;
            if (col.isDiff) {
               const { colLabel: sourceId = '', metricLabel: mLabel = '' } = metricInfoCache.get(colKey) || {};
               const delta = result.deltas[sourceId]?.[mLabel] || { value: 0, percentage: 0 };
               return (
                  <td key={colKey} className={`px-2 py-1 text-xs text-right border-r tabular-nums font-bold overflow-hidden truncate ${delta.value > 0 ? 'text-green-600' : delta.value < 0 ? 'text-red-600' : 'text-slate-400'}`} style={{ width: vCol.size, minWidth: vCol.size, maxWidth: vCol.size }}>
                     {temporalConfig?.deltaFormat === 'percentage' ? (delta.percentage !== 0 ? formatPercentage(delta.percentage) : '-') : (delta.value !== 0 ? formatOutput(delta.value, metricLabelMap.get(mLabel), true) : '-')}
                  </td>
               );
            }
            const { colLabel: sourceId = '', metricLabel = '', metric } = metricInfoCache.get(colKey) || {};
            const value = result.values[sourceId]?.[metricLabel] || 0;
            const customStyle = getCellFormatting(labels, colKey, value, metricLabel, isSubtotal ? 'subtotal' : 'data');
            const source = temporalConfig?.sources.find(s => s.id === sourceId);
            const displayColLabel = effectiveMetrics.length > 1 ? `${source?.label || sourceId} - ${metricLabel}` : (source?.label || sourceId);
            const isSelected = isSelectionMode && isItemSelected(labels, displayColLabel);

            return (
               <td key={colKey}
                  tabIndex={0}
                  role="button"
                  aria-label={`Détails pour ${displayColLabel}`}
                  className={`px-2 py-1 text-xs text-right border-r border-slate-200 tabular-nums cursor-pointer overflow-hidden truncate outline-none focus:ring-2 focus:ring-brand-500 focus:z-10 ${sourceId === temporalConfig?.referenceSourceId ? 'bg-blue-50/30' : ''} ${isSelectionMode ? (isSelected ? 'bg-brand-100 ring-1 ring-brand-400' : 'hover:bg-brand-50 hover:ring-1 hover:ring-brand-300') : 'hover:bg-blue-100'}`}
                  style={{ width: vCol.size, minWidth: vCol.size, maxWidth: vCol.size, ...customStyle }}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (isSelectionMode) handleDrilldown(labels, displayColLabel, value, metricLabel || ''); else if (!isSubtotal) handleTemporalDrilldown(result, sourceId || '', metricLabel || ''); } }}
                  onClick={() => { if (isSelectionMode) handleDrilldown(labels, displayColLabel, value, metricLabel || ''); else if (!isSubtotal) handleTemporalDrilldown(result, sourceId || '', metricLabel || ''); }}>
                  {formatOutput(value, metric || effectiveMetrics[0])}
               </td>
            );
         })}
      </tr>
   );
});

export const PivotGrid: React.FC<PivotGridProps> = (props) => {
   const {
      isCalculating, isTemporalMode, pivotData, temporalResults, temporalConfig, rowFields,
      columnLabels, editingColumn, setEditingColumn, setColumnLabels, showTotalCol,
      handleDrilldown, handleTemporalDrilldown, primaryDataset, datasets, aggType, valField, metrics,
      valFormatting, virtualItems, rowVirtualizer, colVirtualizer, allDataColumns, parentRef, totalColumns, paddingTop, paddingBottom,
      isSelectionMode = false, isEditMode = false, selectedItems = [],
      sortBy, setSortBy, sortOrder, setSortOrder,
      columnWidths, setColumnWidths, styleRules = [], conditionalRules = [],
      collapsedRows, toggleRowExpansion, onRemoveField
   } = props;

   const virtualCols = colVirtualizer.getVirtualItems();

   const effectiveMetrics = React.useMemo<PivotMetric[]>(() => {
      if (metrics && metrics.length > 0) return metrics;
      if (valField) return [{ field: valField, aggType: aggType as AggregationType }];
      return [];
   }, [metrics, valField, aggType]);

   // BOLT OPTIMIZATION: Memoized metric info lookup
   const metricInfoCache = React.useMemo(() => {
      interface MetricInfo {
         colLabel: string;
         metricLabel: string;
         metric: PivotMetric | undefined;
         isDiff: boolean;
         isPct: boolean;
      }
      const cache = new Map<string, MetricInfo>();
      const headers = allDataColumns.map(c => c.key);

      headers.forEach(col => {
         if (col.includes('\x1F')) {
            const parts = col.split('\x1F');
            const colLabel = parts[0].trim();
            let metricLabel = parts[1].trim();
            const isDiff = metricLabel.endsWith('_DIFF') || metricLabel.endsWith('_DELTA');
            const isPct = metricLabel.endsWith('_PCT');

            if (isDiff) metricLabel = metricLabel.replace('_DIFF', '').replace('_DELTA', '');
            if (isPct) metricLabel = metricLabel.replace('_PCT', '');

            const metric = effectiveMetrics.find(m => (m.label || `${m.field} (${m.aggType})`) === metricLabel);
            cache.set(col, { colLabel, metricLabel, metric, isDiff, isPct });
            return;
         }

         const isDiff = col.endsWith('_DIFF') || col.endsWith('_DELTA');
         const isPct = col.endsWith('_PCT');
         let baseCol = col;
         if (isDiff) baseCol = col.replace('_DIFF', '').replace('_DELTA', '');
         if (isPct) baseCol = col.replace('_PCT', '');

         const directMetric = effectiveMetrics.find(m => (m.label || `${m.field} (${m.aggType})`) === baseCol);
         if (directMetric) {
            cache.set(col, { colLabel: 'ALL', metricLabel: baseCol, metric: directMetric, isDiff, isPct });
         } else {
            cache.set(col, { colLabel: baseCol, metricLabel: '', metric: effectiveMetrics[0], isDiff, isPct });
         }
      });
      return cache;
   }, [allDataColumns, effectiveMetrics]);

   const rowFieldLeftPositions = React.useMemo(() => {
      const positions: number[] = [];
      let currentLeft = 0;
      (rowFields || []).forEach(f => {
         positions.push(currentLeft);
         currentLeft += columnWidths[isTemporalMode ? `group_${f}` : `row_${f}`] || 150;
      });
      return positions;
   }, [rowFields, columnWidths, isTemporalMode]);

   const metricLabelMap = React.useMemo(() => {
      const map = new Map<string, PivotMetric>();
      (effectiveMetrics || []).forEach(m => {
         const label = m.label || `${m.field} (${m.aggType})`;
         map.set(label, m);
      });
      return map;
   }, [effectiveMetrics]);

   const formatOutput = (val: string | number | undefined | null, metric?: PivotMetric, isDelta: boolean = false) => {
      if (val === undefined || val === null) return '';
      const field = metric?.field || valField;
      const type = metric?.aggType || aggType;
      return formatPivotOutput(val, field, type, primaryDataset, undefined, datasets, metric?.formatting || valFormatting, isDelta);
   };

   const isItemSelected = React.useCallback((rowKeys: string[], colLabel: string) => {
      if (!selectedItems || selectedItems.length === 0) return false;
      return selectedItems.some(item =>
         item.colLabel === colLabel &&
         item.rowPath.length === rowKeys.length &&
         item.rowPath.every((k: string, i: number) => k === rowKeys[i])
      );
   }, [selectedItems]);

   const handleHeaderClick = (newSortBy: string) => {
      if (isSelectionMode || props.isFormattingSelectionMode) {
         handleDrilldown([], newSortBy, undefined, '');
         return;
      }
      if (sortBy === newSortBy) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
      else { setSortBy(newSortBy); setSortOrder(newSortBy === 'label' ? 'asc' : 'desc'); }
   };

   const renderSortIcon = (target: string) => {
      if (sortBy !== target) return null;
      return sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />;
   };

   const getCellFormatting = (rowKeys: string[], col: string, value: string | number | undefined, metricLabel: string, rowType: 'data' | 'subtotal' | 'grandTotal' = 'data') => {
      return getCellStyle(rowKeys, col, value, metricLabel, styleRules, conditionalRules, rowType);
   };

   const onResizeStart = (e: React.MouseEvent, id: string, defaultWidth: number) => {
      e.stopPropagation(); e.preventDefault();
      const startX = e.clientX;
      const startWidth = columnWidths[id] || defaultWidth;
      const onMouseMove = (moveEvent: MouseEvent) => {
         const newWidth = Math.max(50, startWidth + (moveEvent.clientX - startX));
         setColumnWidths((prev) => ({ ...prev, [id]: newWidth }));
      };
      const onMouseUp = () => {
         document.removeEventListener('mousemove', onMouseMove);
         document.removeEventListener('mouseup', onMouseUp);
      };
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
   };

   return (
      <div id="pivot-export-container" className="flex-1 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col min-w-0 overflow-hidden relative">
         {isCalculating && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center flex-col gap-3">
               <Loader2 className="w-10 h-10 text-brand-600 animate-spin" />
               <span className="text-sm font-bold text-slate-600">Calcul en cours...</span>
            </div>
         )}

         {isTemporalMode ? (
            <div ref={parentRef} className="flex-1 overflow-auto custom-scrollbar w-full relative">
               <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: `${rowFieldLeftPositions[rowFields.length-1] + (columnWidths[`group_${rowFields[rowFields.length-1]}`] || 150) + colVirtualizer.getTotalSize()}px`, position: 'relative' }}>
               <table className="min-w-max divide-y divide-slate-200 border-collapse absolute top-0 left-0" style={{ tableLayout: 'fixed' }}>
                  <thead className="sticky top-0 z-30 shadow-sm">
                     <tr className="bg-slate-50">
                        {(rowFields || []).map((field, idx) => {
                           const displayLabel = columnLabels[`group_${field}`] || field;
                           const isEditing = editingColumn === `group_${field}`;
                           const widthId = `group_${field}`;
                           const width = columnWidths[widthId] || 150;
                           const left = rowFieldLeftPositions[idx];
                           const headerStyle = getCellFormatting([field], '', undefined, '', 'data');
                           return (
                              <th key={field} className={`px-2 py-1.5 text-left text-xs font-bold uppercase border-b border-r border-slate-200 whitespace-nowrap sticky left-0 z-40 cursor-pointer transition-colors group relative ${isEditMode ? 'bg-amber-50/50 text-amber-700 border-dashed border-amber-200 hover:bg-amber-100' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                                 style={{ width, minWidth: width, maxWidth: width, left: `${left}px`, ...headerStyle }}
                                 onClick={() => { if (isEditMode) setEditingColumn(`group_${field}`); else if (idx === 0) handleHeaderClick('label'); }}>
                                 <div className="flex items-center overflow-hidden gap-1">
                                    <span className="truncate flex-1">{isEditing ? <input type="text" value={columnLabels[`group_${field}`] || field} autoFocus className="w-full px-1 py-0.5 text-xs border border-brand-300 rounded text-slate-900" onClick={(e) => e.stopPropagation()} onChange={(e) => setColumnLabels((prev) => ({ ...prev, [`group_${field}`]: e.target.value }))} onBlur={() => setEditingColumn(null)} onKeyDown={(e) => { if (e.key === 'Enter') setEditingColumn(null); }} /> : displayLabel}</span>
                                       {onRemoveField && !isEditing && <button onClick={(e) => { e.stopPropagation(); onRemoveField('row', field); }} className="p-0.5 hover:bg-red-100 text-red-400 hover:text-red-600 rounded transition-all bg-white/50 shadow-sm border border-slate-100" title="Retirer" aria-label="Retirer ce champ"><X className="w-3 h-3" /></button>}
                                    {idx === 0 && renderSortIcon('label')}
                                 </div>
                                 <div className="absolute -right-1.5 top-0 bottom-0 w-3 cursor-col-resize hover:bg-brand-400/40 z-30 transition-colors" onMouseDown={(e) => onResizeStart(e, widthId, 150)} />
                              </th>
                           );
                        })}
                        {virtualCols[0]?.start > 0 && <th style={{ width: virtualCols[0].start }} />}
                        {virtualCols.map((vCol: any) => {
                           const col = allDataColumns[vCol.index];
                           const colKey = col.key;
                           if (col.isDiff) return <th key={colKey} className="px-2 py-1.5 text-right text-xs font-bold uppercase border-b border-r border-slate-200 bg-purple-50 text-purple-700" style={{ width: vCol.size, minWidth: vCol.size, maxWidth: vCol.size }}>Δ</th>;

                           const { colLabel: sourceId = '', metricLabel = '', metric } = metricInfoCache.get(colKey) || {};
                           const source = temporalConfig?.sources.find(s => s.id === sourceId);
                           const displayLabel = metrics.length > 1 ? `${source?.label || sourceId} - ${metricLabel}` : (source?.label || sourceId);
                           const headerStyle = getCellFormatting([], colKey, undefined, metricLabel || '', 'data');

                           return (
                              <th key={colKey} className={`px-2 py-1.5 text-right text-xs font-bold uppercase border-b border-r border-slate-200 cursor-pointer group relative transition-colors ${isEditMode ? 'bg-amber-50/50 text-amber-700 border-dashed border-amber-200 hover:bg-amber-100' : sourceId === temporalConfig?.referenceSourceId ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                                 style={{ width: vCol.size, minWidth: vCol.size, maxWidth: vCol.size, ...headerStyle }}
                                 onClick={() => { if (isEditMode) setEditingColumn(colKey); else handleHeaderClick(sourceId); }}>
                                 <div className="flex items-center justify-end overflow-hidden gap-1">
                                    <span className="truncate flex-1">{editingColumn === colKey ? <input type="text" value={columnLabels[colKey] || displayLabel} autoFocus className="w-full px-1 py-0.5 text-xs border border-brand-300 rounded text-slate-900" onClick={(e) => e.stopPropagation()} onChange={(e) => setColumnLabels((prev) => ({ ...prev, [colKey]: e.target.value }))} onBlur={() => setEditingColumn(null)} onKeyDown={(e) => { if (e.key === 'Enter') setEditingColumn(null); }} /> : (columnLabels[colKey] || displayLabel)}</span>
                                    {metric && renderSortIcon(sourceId)}
                                 </div>
                                 <div className="absolute -right-1.5 top-0 bottom-0 w-3 cursor-col-resize hover:bg-brand-400/40 z-30 transition-colors" onMouseDown={(e) => onResizeStart(e, colKey, 120)} />
                              </th>
                           );
                        })}
                     </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                     {paddingTop > 0 && <tr><td style={{ height: `${paddingTop}px` }} colSpan={totalColumns} /></tr>}
                     {virtualItems.map((vRow) => (
                        <TemporalPivotRow
                           key={vRow.key}
                           row={temporalResults[vRow.index]}
                           virtualRow={vRow}
                           rowFields={rowFields}
                           allDataColumns={allDataColumns}
                           columnWidths={columnWidths}
                           rowFieldLeftPositions={rowFieldLeftPositions}
                           metricInfoCache={metricInfoCache}
                           formatOutput={formatOutput}
                           getCellFormatting={getCellFormatting}
                           handleDrilldown={handleDrilldown}
                           handleTemporalDrilldown={handleTemporalDrilldown}
                           isSelectionMode={isSelectionMode}
                           isItemSelected={isItemSelected}
                           showTotalCol={showTotalCol}
                           effectiveMetrics={effectiveMetrics}
                           metricLabelMap={metricLabelMap}
                           primaryDataset={primaryDataset}
                           virtualCols={virtualCols}
                           temporalConfig={temporalConfig}
                           collapsedRows={collapsedRows}
                           toggleRowExpansion={toggleRowExpansion}
                           measureElement={rowVirtualizer.measureElement}
                        />
                     ))}
                     {paddingBottom > 0 && <tr><td style={{ height: `${paddingBottom}px` }} colSpan={totalColumns} /></tr>}
                  </tbody>
               </table>
               </div>
            </div>
         ) : pivotData ? (
            <div ref={parentRef} className="flex-1 overflow-auto custom-scrollbar flex flex-col w-full relative">
               <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: `${rowFieldLeftPositions[rowFields.length-1] + (columnWidths[`row_${rowFields[rowFields.length-1]}`] || 150) + colVirtualizer.getTotalSize() + (showTotalCol ? (columnWidths['Grand Total'] || 150) : 0)}px`, position: 'relative' }}>
                  <table className="min-w-max divide-y divide-slate-200 border-collapse absolute top-0 left-0" style={{ tableLayout: 'fixed' }}>
                     <thead className="sticky top-0 z-30 shadow-sm">
                        <tr className="bg-slate-50">
                           {rowFields.map((field, idx) => {
                              const widthId = `row_${field}`;
                              const width = columnWidths[widthId] || 150;
                              const left = rowFieldLeftPositions[idx];
                              const headerStyle = getCellFormatting([field], '', undefined, '', 'data');
                              return (
                                 <th key={field} className={`px-2 py-1.5 text-left text-xs font-bold uppercase border-b border-r border-slate-200 whitespace-nowrap sticky left-0 z-40 cursor-pointer group relative transition-colors ${isEditMode ? 'bg-amber-50 text-amber-700 border-dashed border-amber-200 hover:bg-amber-100' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                                    style={{ width, minWidth: width, maxWidth: width, left: `${left}px`, ...headerStyle }}
                                    onClick={() => { if (isEditMode) setEditingColumn(`row_${field}`); else if (idx === 0) handleHeaderClick('label'); }}>
                                    <div className="flex items-center overflow-hidden gap-1">
                                       <span className="truncate flex-1">{editingColumn === `row_${field}` ? <input type="text" value={columnLabels[`row_${field}`] || field} autoFocus className="w-full px-1 py-0.5 text-xs border border-brand-300 rounded text-slate-900" onClick={(e) => e.stopPropagation()} onChange={(e) => setColumnLabels((prev) => ({ ...prev, [`row_${field}`]: e.target.value }))} onBlur={() => setEditingColumn(null)} onKeyDown={(e) => { if (e.key === 'Enter') setEditingColumn(null); }} /> : (columnLabels[`row_${field}`] || field)}</span>
                                       {onRemoveField && !editingColumn?.startsWith('row_') && <button onClick={(e) => { e.stopPropagation(); onRemoveField('row', field); }} className="p-0.5 hover:bg-red-100 text-red-400 hover:text-red-600 rounded transition-all bg-white/50 shadow-sm border border-slate-100" title="Retirer" aria-label="Retirer ce champ"><X className="w-3 h-3" /></button>}
                                       {idx === 0 && renderSortIcon('label')}
                                    </div>
                                    <div className="absolute -right-1.5 top-0 bottom-0 w-3 cursor-col-resize hover:bg-brand-400/40 z-30 transition-colors" onMouseDown={(e) => onResizeStart(e, widthId, 150)} />
                                 </th>
                              );
                           })}
                           {virtualCols[0]?.start > 0 && <th style={{ width: virtualCols[0].start }} />}
                           {virtualCols.map((vCol: any) => {
                              const col = allDataColumns[vCol.index];
                              const colKey = col.key;
                              const { colLabel, metricLabel, isDiff, isPct } = metricInfoCache.get(colKey) || {};
                              let displayLabel = isDiff ? 'Var.' : isPct ? '%' : formatDateLabelForDisplay(colLabel || colKey);
                              if (metricLabel && !isDiff && !isPct && colLabel === 'ALL') displayLabel = metricLabel;
                              else if (metricLabel && !isDiff && !isPct) displayLabel = `${displayLabel} - ${metricLabel}`;
                              const headerStyle = getCellFormatting([], colKey, undefined, metricLabel || '', 'data');
                              return (
                                 <th key={colKey} className={`px-2 py-1.5 text-right text-xs font-bold uppercase border-b border-r border-slate-200 whitespace-nowrap cursor-pointer group relative transition-colors ${isEditMode ? 'bg-amber-50/50 text-amber-700 border-dashed border-amber-200 hover:bg-amber-100' : isDiff || isPct ? 'bg-blue-50 text-blue-700 hover:bg-blue-100' : 'text-slate-500 hover:bg-slate-100'}`}
                                    style={{ width: vCol.size, minWidth: vCol.size, maxWidth: vCol.size, ...headerStyle }}
                                    onClick={() => { if (isEditMode) setEditingColumn(colKey); else handleHeaderClick(colKey); }}>
                                    <div className="flex items-center justify-end overflow-hidden gap-1">
                                       <span className="truncate flex-1">{editingColumn === colKey ? <input type="text" value={columnLabels[colKey] || displayLabel} autoFocus className="w-full px-1 py-0.5 text-xs border border-brand-300 rounded text-slate-900" onClick={(e) => e.stopPropagation()} onChange={(e) => setColumnLabels((prev) => ({ ...prev, [colKey]: e.target.value }))} onBlur={() => setEditingColumn(null)} onKeyDown={(e) => { if (e.key === 'Enter') setEditingColumn(null); }} /> : (columnLabels[colKey] || displayLabel)}</span>
                                       {onRemoveField && !isDiff && !isPct && !editingColumn && <button onClick={(e) => { e.stopPropagation(); const info = metricInfoCache.get(colKey); if (info?.metric) onRemoveField('val', info.metric.field); else if (colLabel && colLabel !== 'ALL') onRemoveField('col', colLabel!); }} className="p-0.5 hover:bg-red-100 text-red-400 hover:text-red-600 rounded transition-all bg-white/50 shadow-sm border border-slate-100" title="Retirer" aria-label="Retirer ce champ"><X className="w-3 h-3" /></button>}
                                       {renderSortIcon(colKey)}
                                    </div>
                                    <div className="absolute -right-1.5 top-0 bottom-0 w-3 cursor-col-resize hover:bg-brand-400/40 z-30 transition-colors" onMouseDown={(e) => onResizeStart(e, colKey, 120)} />
                                 </th>
                              );
                           })}
                           {showTotalCol && effectiveMetrics.length > 0 && (
                              <th className="px-2 py-1.5 text-right text-xs font-black text-slate-700 uppercase border-b bg-slate-100 whitespace-nowrap cursor-pointer group" style={{ width: columnWidths['Grand Total'] || 150, minWidth: 150, maxWidth: 150 }} onClick={() => handleHeaderClick('value')}>
                                 <div className="flex items-center justify-end relative">Total {renderSortIcon('value')}<div className="absolute -right-2 top-0 bottom-0 w-4 cursor-col-resize hover:bg-brand-400/40 z-30 transition-colors" onMouseDown={(e) => onResizeStart(e, 'Grand Total', 150)} /></div>
                              </th>
                           )}
                        </tr>
                     </thead>
                     <tbody className="bg-white divide-y divide-slate-200">
                        {paddingTop > 0 && <tr><td style={{ height: `${paddingTop}px` }} colSpan={totalColumns} /></tr>}
                        {virtualItems.map((vRow) => (
                           <StandardPivotRow
                              key={vRow.key}
                              row={pivotData.displayRows[vRow.index]}
                              virtualRow={vRow}
                              rowFields={rowFields}
                              allDataColumns={allDataColumns}
                              columnWidths={columnWidths}
                              rowFieldLeftPositions={rowFieldLeftPositions}
                              metricInfoCache={metricInfoCache}
                              formatOutput={formatOutput}
                              getCellFormatting={getCellFormatting}
                              handleDrilldown={handleDrilldown}
                              isSelectionMode={isSelectionMode}
                              isItemSelected={isItemSelected}
                              showTotalCol={showTotalCol}
                              effectiveMetrics={effectiveMetrics}
                              metricLabelMap={metricLabelMap}
                              primaryDataset={primaryDataset}
                              virtualCols={virtualCols}
                              collapsedRows={collapsedRows}
                              toggleRowExpansion={toggleRowExpansion}
                              measureElement={rowVirtualizer.measureElement}
                           />
                        ))}
                        {paddingBottom > 0 && <tr><td style={{ height: `${paddingBottom}px` }} colSpan={totalColumns} /></tr>}
                     </tbody>
                  </table>
               </div>
            </div>
         ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8">
               <Table2 className="w-12 h-12 mb-4 opacity-20" />
               <p className="text-sm font-medium">Glissez des champs pour commencer l'analyse</p>
            </div>
         )}
      </div>
   );
};
