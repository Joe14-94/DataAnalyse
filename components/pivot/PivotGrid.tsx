
import React from 'react';
import { Loader2, Table2, ArrowUp, ArrowDown, X } from 'lucide-react';
import { Virtualizer, VirtualItem } from '@tanstack/react-virtual';
import {
   TemporalComparisonResult, Dataset, PivotResult, SortBy, SortOrder,
   PivotStyleRule, ConditionalFormattingRule, TemporalComparisonConfig,
   PivotMetric, FieldConfig, AggregationType
} from '../../types';
import { formatPivotOutput } from '../../logic/pivotEngine';
import { getCellStyle } from '../../utils/pivotFormatting';
import { PivotTableHeader } from './PivotTableHeader';
import { PivotTableRow } from './PivotTableRow';

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
   virtualItems: VirtualItem[];
   rowVirtualizer: Virtualizer<HTMLDivElement, Element>;
   colVirtualizer: Virtualizer<HTMLDivElement, Element>;
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
   onRemoveField?: (zone: 'row' | 'col' | 'val' | 'filter', field: string) => void;
}

export const PivotGrid: React.FC<PivotGridProps> = (props) => {
   const {
      isCalculating, isTemporalMode, pivotData, temporalResults, temporalConfig, rowFields, colFields,
      columnLabels, editingColumn, setEditingColumn, setColumnLabels, showVariations, showTotalCol,
      handleDrilldown, handleTemporalDrilldown, primaryDataset, datasets, aggType, valField, metrics,
      valFormatting, virtualItems, rowVirtualizer, colVirtualizer, allDataColumns, parentRef, totalColumns, paddingTop, paddingBottom,
      isSelectionMode = false, isEditMode = false, selectedItems = [],
      sortBy, setSortBy, sortOrder, setSortOrder,
      columnWidths, setColumnWidths, styleRules = [], conditionalRules = [], onRemoveField
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

   const renderSortIcon = React.useCallback((target: string) => {
      if (sortBy !== target) return null;
      return sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />;
   }, [sortBy, sortOrder]);

   const getCellFormatting = React.useCallback((rowKeys: string[], col: string, value: string | number | undefined, metricLabel: string, rowType: 'data' | 'subtotal' | 'grandTotal' = 'data') => {
      return getCellStyle(rowKeys, col, value, metricLabel, styleRules, conditionalRules, rowType);
   }, [styleRules, conditionalRules]);

   const handleKeyDown = (e: React.KeyboardEvent, handler: () => void) => {
      if (e.key === 'Enter' || e.key === ' ') {
         e.preventDefault();
         handler();
      }
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
                     <PivotTableHeader
                        isTemporalMode={isTemporalMode}
                        rowFields={rowFields}
                        columnLabels={columnLabels}
                        editingColumn={editingColumn}
                        setEditingColumn={setEditingColumn}
                        setColumnLabels={setColumnLabels}
                        rowFieldLeftPositions={rowFieldLeftPositions}
                        columnWidths={columnWidths}
                        getCellFormatting={getCellFormatting}
                        isEditMode={isEditMode}
                        handleHeaderClick={handleHeaderClick}
                        renderSortIcon={renderSortIcon}
                        onRemoveField={onRemoveField}
                        onResizeStart={onResizeStart}
                        handleKeyDown={handleKeyDown}
                        virtualCols={virtualCols}
                        allDataColumns={allDataColumns}
                        metricInfoCache={metricInfoCache}
                        temporalConfig={temporalConfig}
                        metrics={metrics}
                        showTotalCol={showTotalCol}
                        effectiveMetrics={effectiveMetrics}
                     />
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                     {paddingTop > 0 && <tr><td style={{ height: `${paddingTop}px` }} colSpan={totalColumns} /></tr>}
                     {virtualItems.map((vRow) => (
                        <PivotTableRow
                           key={vRow.key}
                           index={vRow.index}
                           isTemporalMode={isTemporalMode}
                           temporalResult={temporalResults[vRow.index]}
                           rowFields={rowFields}
                           columnWidths={columnWidths}
                           rowFieldLeftPositions={rowFieldLeftPositions}
                           getCellFormatting={getCellFormatting}
                           primaryDataset={primaryDataset}
                           handleDrilldown={handleDrilldown}
                           handleTemporalDrilldown={handleTemporalDrilldown}
                           virtualCols={virtualCols}
                           allDataColumns={allDataColumns}
                           metricInfoCache={metricInfoCache}
                           temporalConfig={temporalConfig}
                           effectiveMetrics={effectiveMetrics}
                           metricLabelMap={metricLabelMap}
                           formatOutput={formatOutput}
                           isSelectionMode={isSelectionMode}
                           isItemSelected={isItemSelected}
                           showTotalCol={showTotalCol}
                           handleKeyDown={handleKeyDown}
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
                     <PivotTableHeader
                        isTemporalMode={isTemporalMode}
                        rowFields={rowFields}
                        columnLabels={columnLabels}
                        editingColumn={editingColumn}
                        setEditingColumn={setEditingColumn}
                        setColumnLabels={setColumnLabels}
                        rowFieldLeftPositions={rowFieldLeftPositions}
                        columnWidths={columnWidths}
                        getCellFormatting={getCellFormatting}
                        isEditMode={isEditMode}
                        handleHeaderClick={handleHeaderClick}
                        renderSortIcon={renderSortIcon}
                        onRemoveField={onRemoveField}
                        onResizeStart={onResizeStart}
                        handleKeyDown={handleKeyDown}
                        virtualCols={virtualCols}
                        allDataColumns={allDataColumns}
                        metricInfoCache={metricInfoCache}
                        temporalConfig={temporalConfig}
                        metrics={metrics}
                        showTotalCol={showTotalCol}
                        effectiveMetrics={effectiveMetrics}
                     />
                     </thead>
                     <tbody className="bg-white divide-y divide-slate-200">
                        {paddingTop > 0 && <tr><td style={{ height: `${paddingTop}px` }} colSpan={totalColumns} /></tr>}
                     {virtualItems.map((vRow) => (
                        <PivotTableRow
                           key={vRow.key}
                           index={vRow.index}
                           measureElement={rowVirtualizer.measureElement}
                           isTemporalMode={isTemporalMode}
                           pivotRow={pivotData.displayRows[vRow.index]}
                           rowFields={rowFields}
                           columnWidths={columnWidths}
                           rowFieldLeftPositions={rowFieldLeftPositions}
                           getCellFormatting={getCellFormatting}
                           primaryDataset={primaryDataset}
                           handleDrilldown={handleDrilldown}
                           handleTemporalDrilldown={handleTemporalDrilldown}
                           virtualCols={virtualCols}
                           allDataColumns={allDataColumns}
                           metricInfoCache={metricInfoCache}
                           temporalConfig={temporalConfig}
                           effectiveMetrics={effectiveMetrics}
                           metricLabelMap={metricLabelMap}
                           formatOutput={formatOutput}
                           isSelectionMode={isSelectionMode}
                           isItemSelected={isItemSelected}
                           showTotalCol={showTotalCol}
                           handleKeyDown={handleKeyDown}
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
