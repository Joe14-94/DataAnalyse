
import React from 'react';
import { Loader2, Table2, ArrowUp, ArrowDown, X } from 'lucide-react';
import { TemporalComparisonResult, Dataset, PivotSourceConfig, PivotResult, SortBy, SortOrder, PivotStyleRule, ConditionalFormattingRule, DEFAULT_METRIC } from '../../types';
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
   virtualItems: any[]; // From @tanstack/react-virtual
   rowVirtualizer: any;  // From @tanstack/react-virtual
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
      isCalculating, isTemporalMode, pivotData, temporalResults, temporalConfig, rowFields,
      columnLabels, editingColumn, setEditingColumn, setColumnLabels, showVariations, showTotalCol,
      handleDrilldown, handleTemporalDrilldown, primaryDataset, datasets, aggType, valField, metrics,
      valFormatting, virtualItems, rowVirtualizer, parentRef, totalColumns, paddingTop, paddingBottom,
      isSelectionMode = false, isEditMode = false, selectedItems = [],
      sortBy, setSortBy, sortOrder, setSortOrder,
      columnWidths, setColumnWidths, styleRules = [], conditionalRules = [], onRemoveField
   } = props;

   // BOLT OPTIMIZATION: Memoized metric info lookup to avoid expensive string parsing and array searches in render loop
   const metricInfoCache = React.useMemo(() => {
      const cache = new Map<string, any>();
      const activeMetrics = metrics.length > 0 ? metrics : (valField ? [{ field: valField, aggType }] : [DEFAULT_METRIC]);
      const headers = [
         ...(pivotData?.colHeaders || []),
         ...(temporalResults.length > 0 ? (temporalConfig?.sources || []).flatMap((s: any) => {
            return activeMetrics.flatMap((m: any) => {
               const mLabel = m.label || `${m.field} (${m.aggType})`;
               return [`${s.id}_${mLabel}`];
            });
         }) : [])
      ];

      headers.forEach(col => {
         if (col.includes('\x1F')) {
            const parts = col.split('\x1F');
            const colLabel = parts[0].trim();
            let metricLabel = parts[1].trim();
            const isDiff = metricLabel.endsWith('_DIFF');
            const isPct = metricLabel.endsWith('_PCT');

            if (isDiff) metricLabel = metricLabel.replace('_DIFF', '');
            if (isPct) metricLabel = metricLabel.replace('_PCT', '');

            const metric = activeMetrics.find(m => (m.label || `${m.field} (${m.aggType})`) === metricLabel);
            cache.set(col, { colLabel, metricLabel, metric, isDiff, isPct });
            return;
         }

         const isDiff = col.endsWith('_DIFF');
         const isPct = col.endsWith('_PCT');
         let baseCol = col;
         if (isDiff) baseCol = col.replace('_DIFF', '');
         if (isPct) baseCol = col.replace('_PCT', '');

         const directMetric = activeMetrics.find(m => (m.label || `${m.field} (${m.aggType})`) === baseCol);
         if (directMetric) {
            cache.set(col, { colLabel: 'ALL', metricLabel: baseCol, metric: directMetric, isDiff, isPct });
         } else {
            cache.set(col, { colLabel: baseCol, metricLabel: '', metric: activeMetrics[0], isDiff, isPct });
         }
      });
      return cache;
   }, [pivotData?.colHeaders, temporalResults, temporalConfig, metrics, valField, aggType]);

   // BOLT OPTIMIZATION: Pre-calculate sticky positions for row fields to avoid repeated slice().reduce()
   const rowFieldLeftPositions = React.useMemo(() => {
      const positions: number[] = [];
      let currentLeft = 0;
      (rowFields || []).forEach(f => {
         positions.push(currentLeft);
         currentLeft += columnWidths[`row_${f}`] || 150;
      });
      return positions;
   }, [rowFields, columnWidths]);

   const groupFieldLeftPositions = React.useMemo(() => {
      const positions: number[] = [];
      let currentLeft = 0;
      (rowFields || []).forEach(f => {
         positions.push(currentLeft);
         currentLeft += columnWidths[`group_${f}`] || 150;
      });
      return positions;
   }, [rowFields, columnWidths]);

   // BOLT OPTIMIZATION: Memoized metric label map for fast lookup
   const metricLabelMap = React.useMemo(() => {
      const map = new Map<string, PivotMetric>();
      (metrics || []).forEach(m => {
         const label = m.label || `${m.field} (${m.aggType})`;
         map.set(label, m);
      });
      return map;
   }, [metrics]);

   const formatOutput = (val: string | number | undefined | null, metric?: PivotMetric) => {
      if (val === undefined || val === null) return '';
      const field = metric?.field || valField;
      const type = metric?.aggType || aggType;
      return formatPivotOutput(val, field, type, primaryDataset, undefined, datasets, metric?.formatting || valFormatting);
   };

   // BOLT OPTIMIZATION: Memoized selection check
   const isItemSelected = React.useCallback((rowKeys: string[], colLabel: string) => {
      if (!selectedItems || selectedItems.length === 0) return false;
      return selectedItems.some(item =>
         item.colLabel === colLabel &&
         item.rowPath.length === rowKeys.length &&
         item.rowPath.every((k: string, i: number) => k === rowKeys[i])
      );
   }, [selectedItems]);

   const handleHeaderClick = (newSortBy: string) => {
      // If we are in selection mode, use header click as selection
      if (isSelectionMode || props.isFormattingSelectionMode) {
         handleDrilldown([], newSortBy, undefined, '');
         return;
      }

      if (sortBy === newSortBy) {
         setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
      } else {
         setSortBy(newSortBy);
         setSortOrder(newSortBy === 'label' ? 'asc' : 'desc');
      }
   };

   const renderSortIcon = (target: string) => {
      if (sortBy !== target) return null;
      return sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />;
   };

   const getCellFormatting = (rowKeys: string[], col: string, value: string | number | undefined, metricLabel: string, rowType: 'data' | 'subtotal' | 'grandTotal' = 'data') => {
      return getCellStyle(rowKeys, col, value, metricLabel, styleRules, conditionalRules, rowType);
   };

   const onResizeStart = (e: React.MouseEvent, id: string, defaultWidth: number) => {
      e.stopPropagation();
      e.preventDefault();
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

         {isTemporalMode && temporalResults.length > 0 && temporalConfig ? (
            <div ref={parentRef} className="flex-1 overflow-auto custom-scrollbar w-full relative">
               <table className="min-w-max divide-y divide-slate-200 border-collapse" style={{ tableLayout: 'fixed' }}>
                  <thead className="sticky top-0 z-30 shadow-sm">
                     <tr className="bg-slate-50">
                        {(rowFields || []).map((field: string, idx: number) => {
                           const displayLabel = columnLabels[`group_${field}`] || field;
                           const isEditing = editingColumn === `group_${field}`;
                           const widthId = `group_${field}`;
                           const width = columnWidths[widthId] || 150;
                           const left = groupFieldLeftPositions[idx];
                           const calcField = primaryDataset?.calculatedFields?.find(cf => cf.name === field);
                           const headerStyle = getCellFormatting([field], '', undefined, '', 'data');

                           return (
                              <th
                                 key={field}
                                 title={calcField ? `Formule: ${calcField.formula}` : undefined}
                                 className={`px-2 py-1.5 text-left text-xs font-bold uppercase border-b border-r border-slate-200 whitespace-nowrap sticky left-0 z-40 cursor-pointer transition-colors group relative ${isEditMode ? 'bg-amber-50/50 text-amber-700 border-dashed border-amber-200 hover:bg-amber-100' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                                 style={{ width, minWidth: width, maxWidth: width, left: `${left}px`, ...headerStyle }}
                                 onClick={() => {
                                    if (isEditMode) setEditingColumn(`group_${field}`);
                                    else if (idx === 0) handleHeaderClick('label');
                                 }}
                              >
                                 <div className="flex items-center overflow-hidden gap-1">
                                    <span className="truncate flex-1">
                                       {isEditing ? (
                                          <input
                                             type="text"
                                             value={columnLabels[`group_${field}`] || field}
                                             autoFocus
                                             className="w-full px-1 py-0.5 text-xs border border-brand-300 rounded text-slate-900"
                                             onClick={(e) => e.stopPropagation()}
                                             onChange={(e) => setColumnLabels((prev) => ({ ...prev, [`group_${field}`]: e.target.value }))}
                                             onBlur={() => setEditingColumn(null)}
                                             onKeyDown={(e) => { if (e.key === 'Enter') setEditingColumn(null); }}
                                          />
                                       ) : displayLabel}
                                    </span>
                                    {onRemoveField && !isEditing && (
                                       <button onClick={(e) => { e.stopPropagation(); onRemoveField('row', field); }} className="p-0.5 hover:bg-red-100 text-red-400 hover:text-red-600 rounded transition-all bg-white/50 shadow-sm border border-slate-100" title="Retirer">
                                          <X className="w-3 h-3" />
                                       </button>
                                    )}
                                    {idx === 0 && renderSortIcon('label')}
                                 </div>
                                 <div className="absolute -right-1 top-0 bottom-0 w-3 cursor-col-resize hover:bg-brand-400/40 z-30 transition-colors" onMouseDown={(e) => onResizeStart(e, widthId, 150)} />
                              </th>
                           );
                        })}
                        {(metrics.length > 0 ? metrics : (valField ? [{ field: valField, aggType }] : [DEFAULT_METRIC])).map((metric, mIdx) => {
                           const mLabel = metric.label || `${metric.field} (${metric.aggType})`;
                           return (
                              <React.Fragment key={`m-${mIdx}`}>
                                 {(temporalConfig?.sources || []).map((source) => {
                                    const colKey = `${source.id}_${mLabel}`;
                                    const width = columnWidths[colKey] || 120;
                                    const headerStyle = getCellFormatting([], colKey, undefined, mLabel, 'data');
                                    const displayLabel = metrics.length > 1 ? `${source.label} - ${mLabel}` : source.label;

                                    return (
                                       <React.Fragment key={source.id}>
                                          <th
                                             className={`px-2 py-1.5 text-right text-xs font-bold uppercase border-b border-r border-slate-200 cursor-pointer group relative transition-colors ${isEditMode ? 'bg-amber-50/50 text-amber-700 border-dashed border-amber-200 hover:bg-amber-100' : source.id === temporalConfig.referenceSourceId ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                                             style={{ width, minWidth: width, maxWidth: width, ...headerStyle }}
                                             onClick={() => {
                                                if (isEditMode) setEditingColumn(colKey);
                                                else handleHeaderClick(source.id); // Sort by source (uses first metric internally)
                                             }}
                                          >
                                             <div className="flex items-center justify-end overflow-hidden gap-1">
                                                <span className="truncate flex-1">
                                                   {editingColumn === colKey ? (
                                                      <input
                                                         type="text"
                                                         value={columnLabels[colKey] || displayLabel}
                                                         autoFocus
                                                         className="w-full px-1 py-0.5 text-xs border border-brand-300 rounded text-slate-900"
                                                         onClick={(e) => e.stopPropagation()}
                                                         onChange={(e) => setColumnLabels((prev) => ({ ...prev, [colKey]: e.target.value }))}
                                                         onBlur={() => setEditingColumn(null)}
                                                         onKeyDown={(e) => { if (e.key === 'Enter') setEditingColumn(null); }}
                                                      />
                                                   ) : (columnLabels[colKey] || displayLabel)}
                                                </span>
                                                {mIdx === 0 && renderSortIcon(source.id)}
                                             </div>
                                             <div className="absolute -right-1 top-0 bottom-0 w-3 cursor-col-resize hover:bg-brand-400/40 z-30 transition-colors" onMouseDown={(e) => onResizeStart(e, colKey, 120)} />
                                          </th>
                                          {showVariations && source.id !== temporalConfig.referenceSourceId && (
                                             <th className="px-2 py-1.5 text-right text-xs font-bold uppercase border-b border-r border-slate-200 bg-purple-50 text-purple-700" style={{ width: 60, minWidth: 60, maxWidth: 60 }}>Δ</th>
                                          )}
                                       </React.Fragment>
                                    );
                                 })}
                              </React.Fragment>
                           );
                        })}
                     </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                     {temporalResults.map((result) => {
                        const isSubtotal = result.isSubtotal || false;
                        const subtotalLevel = result.subtotalLevel || 0;
                        return (
                           <tr key={result.groupKey} className={isSubtotal ? `bg-slate-50 font-bold border-t border-slate-200` : 'hover:bg-brand-50/30'}>
                              {(() => {
                                 const labels = result.groupLabel.split('\x1F');
                                 const numFields = rowFields.length;
                                 return Array.from({ length: numFields }, (_, gIdx) => {
                                    const label = labels[gIdx] || '';
                                    if (isSubtotal && gIdx > subtotalLevel) return null;
                                    const field = rowFields[gIdx];
                                    const width = columnWidths[`group_${field}`] || 150;
                                    const left = groupFieldLeftPositions[gIdx];
                                    const rowStyle = getCellFormatting(result.groupLabel.split('\x1F'), '', undefined, '', isSubtotal ? 'subtotal' : 'data');

                                    return (
                                       <td
                                          key={gIdx}
                                          className={`px-2 py-1 text-xs border-r border-slate-200 whitespace-nowrap overflow-hidden truncate sticky left-0 z-20 bg-white cursor-pointer hover:bg-brand-50 transition-colors ${isSubtotal ? 'font-bold bg-slate-50' : ''}`}
                                          style={isSubtotal && gIdx === subtotalLevel ? { ...rowStyle, left: `${left}px` } : { ...rowStyle, width, minWidth: width, maxWidth: width, left: `${left}px` }}
                                          colSpan={isSubtotal && gIdx === subtotalLevel ? numFields - subtotalLevel : 1}
                                          onClick={() => handleDrilldown(result.groupLabel.split('\x1F').slice(0, gIdx + 1), '', undefined, '')}
                                       >
                                          {(!isSubtotal || gIdx <= subtotalLevel) ?
                                             (gIdx === subtotalLevel && isSubtotal
                                                ? `Total ${primaryDataset?.fieldConfigs?.[rowFields[gIdx]]?.type === 'date' ? formatDateLabelForDisplay(label) : label}`
                                                : (primaryDataset?.fieldConfigs?.[rowFields[gIdx]]?.type === 'date' ? formatDateLabelForDisplay(label) : label))
                                             : ''}
                                       </td>
                                    );
                                 });
                              })()}
                              {(metrics || [{ field: valField, aggType }]).map((metric, mIdx) => {
                                 const mLabel = metric.label || `${metric.field} (${metric.aggType})`;
                                 return (
                                    <React.Fragment key={`m-data-${mIdx}`}>
                                       {(temporalConfig?.sources || []).map((source) => {
                                          const value = result.values[source.id]?.[mLabel] || 0;
                                          const delta = result.deltas[source.id]?.[mLabel] || { value: 0, percentage: 0 };
                                          const colKey = `${source.id}_${mLabel}`;
                                          const width = columnWidths[colKey] || 120;
                                          const customStyle = getCellFormatting(result.groupLabel.split('\x1F'), colKey, value, mLabel, isSubtotal ? 'subtotal' : 'data');

                                          const displayLabel = metrics.length > 1 ? `${source.label} - ${mLabel}` : source.label;
                                          const isSelected = isSelectionMode && isItemSelected(result.groupLabel.split('\x1F'), displayLabel);

                                          return (
                                             <React.Fragment key={source.id}>
                                                <td
                                                   className={`px-2 py-1 text-xs text-right border-r border-slate-200 tabular-nums cursor-pointer overflow-hidden truncate ${source.id === temporalConfig.referenceSourceId ? 'bg-blue-50/30' : ''} ${isSelectionMode ? (isSelected ? 'bg-brand-100 ring-1 ring-brand-400' : 'hover:bg-brand-50 hover:ring-1 hover:ring-brand-300') : 'hover:bg-blue-100'}`}
                                                   style={{ width, minWidth: width, maxWidth: width, ...customStyle }}
                                                   onClick={() => {
                                                      if (isSelectionMode) {
                                                         handleDrilldown(result.groupLabel.split('\x1F'), displayLabel, value, mLabel);
                                                      } else if (!isSubtotal) {
                                                         handleTemporalDrilldown(result, source.id, mLabel);
                                                      }
                                                   }}
                                                >
                                                   {formatOutput(value, metric)}
                                                </td>
                                                {showVariations && source.id !== temporalConfig.referenceSourceId && (
                                                   <td className={`px-2 py-1 text-xs text-right border-r tabular-nums font-bold overflow-hidden truncate ${delta.value > 0 ? 'text-green-600' : delta.value < 0 ? 'text-red-600' : 'text-slate-400'}`} style={{ width: 60, minWidth: 60, maxWidth: 60 }}>
                                                      {temporalConfig.deltaFormat === 'percentage' ? (delta.percentage !== 0 ? formatPercentage(delta.percentage) : '-') : (delta.value !== 0 ? formatOutput(delta.value, metric) : '-')}
                                                   </td>
                                                )}
                                             </React.Fragment>
                                          );
                                       })}
                                    </React.Fragment>
                                 );
                              })}
                           </tr>
                        );
                     })}
                  </tbody>
               </table>
            </div>
         ) : pivotData ? (
            <div ref={parentRef} className="flex-1 overflow-auto custom-scrollbar flex flex-col w-full relative">
               <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
                  <table className="min-w-max divide-y divide-slate-200 border-collapse absolute top-0 left-0" style={{ tableLayout: 'fixed' }}>
                     <thead className="sticky top-0 z-30 shadow-sm">
                        <tr className="bg-slate-50">
                           {rowFields.map((field, idx) => {
                              const widthId = `row_${field}`;
                              const width = columnWidths[widthId] || 150;
                              const left = rowFieldLeftPositions[idx];
                              const calcField = primaryDataset?.calculatedFields?.find(cf => cf.name === field);
                              const headerStyle = getCellFormatting([field], '', undefined, '', 'data');
                              return (
                                 <th
                                    key={field}
                                    title={calcField ? `Formule: ${calcField.formula}` : undefined}
                                    className={`px-2 py-1.5 text-left text-xs font-bold uppercase border-b border-r border-slate-200 whitespace-nowrap sticky left-0 z-40 cursor-pointer group relative transition-colors ${isEditMode ? 'bg-amber-50 text-amber-700 border-dashed border-amber-200 hover:bg-amber-100' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                                    style={{ width, minWidth: width, maxWidth: width, left: `${left}px`, ...headerStyle }}
                                    onClick={() => {
                                       if (isEditMode) setEditingColumn(`row_${field}`);
                                       else if (idx === 0) handleHeaderClick('label');
                                    }}
                                 >
                                    <div className="flex items-center overflow-hidden gap-1">
                                       <span className="truncate flex-1">
                                          {editingColumn === `row_${field}` ? (
                                             <input
                                                type="text"
                                                value={columnLabels[`row_${field}`] || field}
                                                autoFocus
                                                className="w-full px-1 py-0.5 text-xs border border-brand-300 rounded text-slate-900"
                                                onClick={(e) => e.stopPropagation()}
                                                onChange={(e) => setColumnLabels((prev) => ({ ...prev, [`row_${field}`]: e.target.value }))}
                                                onBlur={() => setEditingColumn(null)}
                                                onKeyDown={(e) => { if (e.key === 'Enter') setEditingColumn(null); }}
                                             />
                                          ) : (columnLabels[`row_${field}`] || field)}
                                       </span>
                                       {onRemoveField && !editingColumn?.startsWith('row_') && (
                                          <button onClick={(e) => { e.stopPropagation(); onRemoveField('row', field); }} className="p-0.5 hover:bg-red-100 text-red-400 hover:text-red-600 rounded transition-all bg-white/50 shadow-sm border border-slate-100" title="Retirer">
                                             <X className="w-3 h-3" />
                                          </button>
                                       )}
                                       {idx === 0 && renderSortIcon('label')}
                                    </div>
                                    <div className="absolute -right-1 top-0 bottom-0 w-3 cursor-col-resize hover:bg-brand-400/40 z-30 transition-colors" onMouseDown={(e) => onResizeStart(e, widthId, 150)} />
                                 </th>
                              );
                           })}
                           {(pivotData?.colHeaders || []).map((col: string) => {
                              const { colLabel, metricLabel, metric, isDiff, isPct } = metricInfoCache.get(col) || {};
                              let displayLabel = isDiff ? 'Var.' : isPct ? '%' : formatDateLabelForDisplay(colLabel || col);
                              if (metricLabel && !isDiff && !isPct && colLabel === 'ALL') displayLabel = metricLabel;
                              else if (metricLabel && !isDiff && !isPct) displayLabel = `${displayLabel} - ${metricLabel}`;

                              const width = columnWidths[col] || 120;
                              const calcField = metric ? primaryDataset?.calculatedFields?.find(cf => cf.name === metric.field) : null;
                              const formulaTitle = calcField ? `\nFormule: ${calcField.formula}` : '';

                              const headerStyle = getCellFormatting([], col, undefined, metricLabel || '', 'data');

                              return (
                                 <th
                                    key={col}
                                    title={col.replace('\x1F', '-') + formulaTitle}
                                    className={`px-2 py-1.5 text-right text-xs font-bold uppercase border-b border-r border-slate-200 whitespace-nowrap cursor-pointer group relative transition-colors ${isEditMode ? 'bg-amber-50/50 text-amber-700 border-dashed border-amber-200 hover:bg-amber-100' : isDiff || isPct ? 'bg-blue-50 text-blue-700 hover:bg-blue-100' : 'text-slate-500 hover:bg-slate-100'}`}
                                    style={{ width, minWidth: width, maxWidth: width, ...headerStyle }}
                                    onClick={() => {
                                       if (isEditMode) setEditingColumn(col);
                                       else handleHeaderClick(col);
                                    }}
                                 >
                                    <div className="flex items-center justify-end overflow-hidden gap-1">
                                       <span className="truncate flex-1">
                                          {editingColumn === col ? (
                                             <input
                                                type="text"
                                                value={columnLabels[col] || displayLabel}
                                                autoFocus
                                                className="w-full px-1 py-0.5 text-xs border border-brand-300 rounded text-slate-900"
                                                onClick={(e) => e.stopPropagation()}
                                                onChange={(e) => setColumnLabels((prev) => ({ ...prev, [col]: e.target.value }))}
                                                onBlur={() => setEditingColumn(null)}
                                                onKeyDown={(e) => { if (e.key === 'Enter') setEditingColumn(null); }}
                                             />
                                          ) : (columnLabels[col] || displayLabel)}
                                       </span>
                                       {onRemoveField && !isDiff && !isPct && !editingColumn && (
                                          <button
                                             onClick={(e) => {
                                                e.stopPropagation();
                                                const info = metricInfoCache.get(col);
                                                if (info?.metric) onRemoveField('val', info.metric.field);
                                                else if (colLabel && colLabel !== 'ALL') onRemoveField('col', colLabel);
                                             }}
                                             className="p-0.5 hover:bg-red-100 text-red-400 hover:text-red-600 rounded transition-all bg-white/50 shadow-sm border border-slate-100"
                                             title="Retirer"
                                          >
                                             <X className="w-3 h-3" />
                                          </button>
                                       )}
                                       {renderSortIcon(col)}
                                    </div>
                                    <div className="absolute -right-1 top-0 bottom-0 w-3 cursor-col-resize hover:bg-brand-400/40 z-30 transition-colors" onMouseDown={(e) => onResizeStart(e, col, 120)} />
                                 </th>
                              );
                           })}
                           {showTotalCol && (
                              <th
                                 className="px-2 py-1.5 text-right text-xs font-black text-slate-700 uppercase border-b bg-slate-100 whitespace-nowrap cursor-pointer group"
                                 style={{
                                    width: columnWidths['Grand Total'] || 150,
                                    minWidth: columnWidths['Grand Total'] || 150,
                                    maxWidth: columnWidths['Grand Total'] || 150
                                 }}
                                 onClick={() => handleHeaderClick('value')}
                              >
                                 <div className="flex items-center justify-end relative">
                                    Total
                                    {renderSortIcon('value')}
                                    <div className="absolute -right-2 top-0 bottom-0 w-4 cursor-col-resize hover:bg-brand-400/40 z-30 transition-colors" onMouseDown={(e) => onResizeStart(e, 'Grand Total', 150)} />
                                 </div>
                              </th>
                           )}
                        </tr>
                     </thead>
                     <tbody className="bg-white divide-y divide-slate-200">
                        {paddingTop > 0 && <tr><td style={{ height: `${paddingTop}px` }} colSpan={totalColumns} /></tr>}
                        {virtualItems.map((virtualRow: any) => {
                           const row = pivotData.displayRows[virtualRow.index];
                           return (
                              <tr key={virtualRow.key} data-index={virtualRow.index} ref={rowVirtualizer.measureElement} className={`${row.type === 'subtotal' ? 'bg-slate-50 font-bold' : 'hover:bg-brand-50/30'}`}>
                                 {(rowFields || []).map((field, cIdx) => {
                                    const width = columnWidths[`row_${field}`] || 150;
                                    const left = rowFieldLeftPositions[cIdx];
                                    const headerStyle = getCellFormatting(row.keys, '', undefined, '', row.type);

                                    if (row.type === 'subtotal') {
                                       if (cIdx < row.level) {
                                          return (
                                             <td
                                                key={cIdx}
                                                className="px-2 py-1 text-xs text-slate-500 border-r border-slate-200 bg-slate-50 overflow-hidden truncate sticky left-0 z-20"
                                          style={{ width, minWidth: width, maxWidth: width, left: `${left}px`, ...headerStyle }}
                                             >
                                                {primaryDataset?.fieldConfigs?.[rowFields[cIdx]]?.type === 'date'
                                                   ? formatDateLabelForDisplay(row.keys[cIdx])
                                                   : row.keys[cIdx]}
                                             </td>
                                          );
                                       }
                                       if (cIdx === row.level) {
                                          return (
                                             <td
                                                key={cIdx}
                                                colSpan={rowFields.length - cIdx}
                                                className="px-2 py-1 text-xs text-slate-700 border-r border-slate-200 font-bold italic text-right overflow-hidden truncate sticky left-0 z-20 bg-slate-50"
                                                style={{ left: `${left}px`, ...headerStyle }}
                                             >
                                                {row.label?.startsWith('Total ') && primaryDataset?.fieldConfigs?.[rowFields[row.level]]?.type === 'date'
                                                   ? `Total ${formatDateLabelForDisplay(row.label.substring(6))}`
                                                   : row.label}
                                             </td>
                                          );
                                       }
                                       return null;
                                    }
                                    return (
                                       <td
                                          key={cIdx}
                                          className="px-2 py-1 text-xs text-slate-700 border-r border-slate-200 whitespace-nowrap overflow-hidden truncate sticky left-0 z-20 bg-white cursor-pointer hover:bg-brand-50 transition-colors"
                                          style={{ width, minWidth: width, maxWidth: width, left: `${left}px`, ...headerStyle }}
                                          onClick={() => handleDrilldown(row.keys.slice(0, cIdx + 1), '', undefined, '')}
                                       >
                                          {primaryDataset?.fieldConfigs?.[rowFields[cIdx]]?.type === 'date'
                                             ? formatDateLabelForDisplay(row.keys[cIdx])
                                             : row.keys[cIdx]}
                                       </td>
                                    );
                                 })}
                                 {(pivotData?.colHeaders || []).map((col: string) => {
                                    const width = columnWidths[col] || 120;
                                    const val = row.metrics[col];
                                    const { colLabel, metricLabel, metric, isDiff, isPct } = metricInfoCache.get(col) || {};

                                    const customStyle = getCellFormatting(row.keys, col, val, metricLabel || '', row.type);

                                    let formatted = formatOutput(val, metric);
                                    let cellClass = "text-slate-600";
                                    if (isDiff) {
                                       if (Number(val) > 0) { formatted = `+${formatted}`; cellClass = "text-green-600 font-bold"; }
                                       else if (Number(val) < 0) { cellClass = "text-red-600 font-bold"; }
                                       else cellClass = "text-slate-400";
                                    } else if (isPct) {
                                       if (val === 0 || val === undefined) formatted = '-';
                                       else { formatted = `${Number(val).toFixed(1)}%`; if (Number(val) > 0) cellClass = "text-green-600 font-bold"; else if (Number(val) < 0) cellClass = "text-red-600 font-bold"; }
                                    }
                                    const isSelected = isSelectionMode && isItemSelected(row.keys, colLabel || col);
                                    return (
                                       <td
                                          key={col}
                                          className={`px-2 py-1 text-xs text-right border-r border-slate-200 tabular-nums cursor-pointer transition-all overflow-hidden truncate ${cellClass} ${isDiff || isPct ? 'bg-brand-50/20' : ''} ${isSelectionMode ? (isSelected ? 'bg-brand-100 ring-1 ring-brand-400' : 'hover:bg-brand-50 hover:ring-1 hover:ring-brand-300') : 'hover:bg-brand-100'}`}
                                       style={{ width, minWidth: width, maxWidth: width, ...customStyle }}
                                          onClick={() => handleDrilldown(row.keys, colLabel || col, val as string | number | undefined, metricLabel || '')}
                                       >
                                          {formatted}
                                       </td>
                                    );
                                 })}
                                 {showTotalCol && (
                                    <td
                                       className={`px-2 py-1 text-right border-l border-slate-200 cursor-pointer transition-all ${isSelectionMode ? (isItemSelected(row.keys, 'Total') ? 'bg-blue-100 ring-1 ring-blue-400' : 'bg-slate-50 hover:bg-blue-50 hover:ring-1 hover:ring-blue-300') : 'bg-slate-50 hover:bg-blue-100'}`}
                                       style={{
                                          width: columnWidths['Grand Total'] || 150,
                                          minWidth: columnWidths['Grand Total'] || 150,
                                          maxWidth: columnWidths['Grand Total'] || 150,
                                          ...getCellFormatting(row.keys, 'Total', typeof row.rowTotal === 'object' ? Object.values(row.rowTotal)[0] : row.rowTotal, '', row.type)
                                       }}
                                       onClick={() => {
                                          const value = typeof row.rowTotal === 'object' ? Object.values(row.rowTotal)[0] : row.rowTotal;
                                          handleDrilldown(row.keys, 'Total', value, '');
                                       }}
                                    >
                                       {typeof row.rowTotal === 'object' ? (
                                          <div className="flex flex-col gap-0.5">
                                             {Object.entries(row.rowTotal).map(([label, v], idx) => {
                                                const metric = metricLabelMap.get(label);
                                                const metricStyle = getCellFormatting(row.keys, 'Total', v, label, row.type);
                                                return (
                                                   <div key={idx} className="text-xs whitespace-nowrap" style={metricStyle}>
                                                      <span className="text-slate-400 font-medium mr-1">{label}:</span>
                                                      <span className="font-bold text-slate-800">{formatOutput(v, metric)}</span>
                                                   </div>
                                                );
                                             })}
                                          </div>
                                       ) : (
                                          <span className="text-xs font-bold text-slate-800">{formatOutput(row.rowTotal, metrics.length > 0 ? metrics[0] : (valField ? { field: valField, aggType } : DEFAULT_METRIC))}</span>
                                       )}
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
               <Table2 className="w-12 h-12 mb-4 opacity-20" />
               <p className="text-sm font-medium">Glissez des champs pour commencer l'analyse</p>
            </div>
         )}
      </div>
   );
};
