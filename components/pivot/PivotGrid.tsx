
import React from 'react';
import { Loader2, Table2, ArrowUp, ArrowDown, X } from 'lucide-react';
import { TemporalComparisonResult, Dataset, PivotSourceConfig, PivotResult, SortBy, SortOrder, PivotStyleRule, ConditionalFormattingRule } from '../../types';
import { formatPivotOutput } from '../../logic/pivotEngine';
import { formatCurrency, formatPercentage } from '../../utils/temporalComparison';
import { formatDateLabelForDisplay } from '../../utils';

interface PivotGridProps {
   isCalculating: boolean;
   isTemporalMode: boolean;
   pivotData: PivotResult | null;
   temporalResults: TemporalComparisonResult[];
   temporalConfig: any;
   rowFields: string[];
   columnLabels: Record<string, string>;
   editingColumn: string | null;
   setEditingColumn: (v: string | null) => void;
   setColumnLabels: (v: any) => void;
   showVariations: boolean;
   showTotalCol: boolean;
   handleDrilldown: (rowKeys: string[], colLabel: string, value: any, metricLabel: string) => void;
   handleTemporalDrilldown: (result: TemporalComparisonResult, sourceId: string) => void;
   primaryDataset: Dataset | null;
   datasets: Dataset[];
   aggType: string;
   valField: string;
   metrics: any[];
   valFormatting: any;
   virtualItems: any[];
   rowVirtualizer: any;
   parentRef: React.RefObject<HTMLDivElement>;
   totalColumns: number;
   paddingTop: number;
   paddingBottom: number;
   isSelectionMode?: boolean;
   isEditMode?: boolean;
   selectedItems?: any[];
   sortBy: SortBy;
   setSortBy: (v: SortBy) => void;
   sortOrder: SortOrder;
   setSortOrder: (v: SortOrder) => void;
   columnWidths: Record<string, number>;
   setColumnWidths: (v: any) => void;
   styleRules: PivotStyleRule[];
   conditionalRules: ConditionalFormattingRule[];
   onRemoveField?: (zone: any, field: string) => void;
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

   const getMetricInfoFromCol = (col: string) => {
      if (col.includes('\x1F')) {
         const parts = col.split('\x1F');
         const colLabel = parts[0].trim();
         let metricLabel = parts[1].trim();
         const isDiff = metricLabel.endsWith('_DIFF');
         const isPct = metricLabel.endsWith('_PCT');

         if (isDiff) metricLabel = metricLabel.replace('_DIFF', '');
         if (isPct) metricLabel = metricLabel.replace('_PCT', '');

         const metric = metrics.find(m => (m.label || `${m.field} (${m.aggType})`) === metricLabel);
         return { colLabel, metricLabel, metric, isDiff, isPct };
      }

      const isDiff = col.endsWith('_DIFF');
      const isPct = col.endsWith('_PCT');
      let baseCol = col;
      if (isDiff) baseCol = col.replace('_DIFF', '');
      if (isPct) baseCol = col.replace('_PCT', '');

      const directMetric = metrics.find(m => (m.label || `${m.field} (${m.aggType})`) === baseCol);
      if (directMetric) return { colLabel: 'ALL', metricLabel: baseCol, metric: directMetric, isDiff, isPct };

      return { colLabel: baseCol, metricLabel: '', metric: metrics[0], isDiff, isPct };
   };

   const formatOutput = (val: string | number, metric?: any) => {
      const field = metric?.field || valField;
      const type = metric?.aggType || aggType;
      return formatPivotOutput(val, field, type, primaryDataset, undefined, datasets, metric?.formatting || valFormatting);
   };

   const isItemSelected = (rowKeys: string[], colLabel: string) => {
      return selectedItems.some(item =>
         item.colLabel === colLabel &&
         item.rowPath.length === rowKeys.length &&
         item.rowPath.every((k: string, i: number) => k === rowKeys[i])
      );
   };

   const handleHeaderClick = (newSortBy: string) => {
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

   const getColWidth = (id: string, isRowField: boolean = false) => {
      return columnWidths[id] || (isRowField ? 150 : 120);
   };

   const getCellStyle = (rowKeys: string[], col: string, value: any, metricLabel: string, isSubtotal: boolean = false) => {
      let finalStyle: React.CSSProperties = {};

      // 1. Manual rules
      styleRules.forEach(rule => {
         let match = false;
         if (rule.targetType === 'metric') {
            if (!rule.targetKey || rule.targetKey === metricLabel) match = true;
         } else if (rule.targetType === 'row') {
            if (rowKeys.includes(rule.targetKey!)) match = true;
         } else if (rule.targetType === 'col') {
            if (col.includes(rule.targetKey!)) match = true;
         }

         if (match) {
            if (rule.style.backgroundColor) finalStyle.backgroundColor = rule.style.backgroundColor;
            if (rule.style.textColor) finalStyle.color = rule.style.textColor;
            if (rule.style.fontWeight) finalStyle.fontWeight = rule.style.fontWeight;
            if (rule.style.fontStyle) finalStyle.fontStyle = rule.style.fontStyle;
         }
      });

      // 2. Conditional rules (usually only for data cells, but why not subtotals too?)
      conditionalRules.forEach(rule => {
         if (rule.metricLabel && rule.metricLabel !== metricLabel) return;

         let match = false;
         const numVal = typeof value === 'number' ? value : parseFloat(String(value));
         const ruleVal = typeof rule.value === 'number' ? rule.value : parseFloat(String(rule.value));

         switch (rule.operator) {
            case 'gt': match = numVal > ruleVal; break;
            case 'lt': match = numVal < ruleVal; break;
            case 'eq': match = numVal === ruleVal; break;
            case 'between': match = numVal >= ruleVal && numVal <= (rule.value2 || 0); break;
            case 'contains': match = String(value).includes(String(rule.value)); break;
         }

         if (match) {
            if (rule.style.backgroundColor) finalStyle.backgroundColor = rule.style.backgroundColor;
            if (rule.style.textColor) finalStyle.color = rule.style.textColor;
            if (rule.style.fontWeight) finalStyle.fontWeight = rule.style.fontWeight;
         }
      });

      return finalStyle;
   };

   const onResizeStart = (e: React.MouseEvent, id: string, defaultWidth: number) => {
      e.stopPropagation();
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = columnWidths[id] || defaultWidth;

      const onMouseMove = (moveEvent: MouseEvent) => {
         const newWidth = Math.max(50, startWidth + (moveEvent.clientX - startX));
         setColumnWidths((prev: any) => ({ ...prev, [id]: newWidth }));
      };

      const onMouseUp = () => {
         document.removeEventListener('mousemove', onMouseMove);
         document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
   };

   const renderFooterRow = () => {
      if (isTemporalMode && temporalConfig && temporalResults.length > 0) {
         const colTotals: Record<string, number> = {};
         temporalConfig.sources.forEach((s: any) => {
            colTotals[s.id] = temporalResults
               .filter(r => !r.isSubtotal)
               .reduce((sum, r) => sum + (r.values[s.id] || 0), 0);
         });

         return (
            <tr>
               {rowFields.map((field: string, idx: number) => {
                  const width = getColWidth(`group_${field}`, true);
                  const left = rowFields.slice(0, idx).reduce((acc, f) => acc + (columnWidths[`group_${f}`] || 150), 0);
                  return (
                     <td
                        key={idx}
                        className="px-2 py-2 text-right text-xs uppercase text-slate-500 border-r border-slate-200 bg-slate-50 sticky left-0 z-50 truncate"
                        style={{
                           left: `${left}px`,
                           width: `${width}px`,
                           minWidth: `${width}px`,
                           maxWidth: `${width}px`
                        }}
                     >
                        {idx === rowFields.length - 1 ? 'Total' : ''}
                     </td>
                  );
               })}
               {temporalConfig.sources.map((source: any) => {
                  const val = colTotals[source.id];
                  const width = getColWidth(source.id);
                  const customStyle = getCellStyle([], source.label, val, source.label, true);
                  return (
                     <React.Fragment key={source.id}>
                        <td
                           className="px-2 py-2 text-right text-xs text-slate-700 border-r border-slate-200 truncate tabular-nums"
                           style={{
                              ...customStyle,
                              width: `${width}px`,
                              minWidth: `${width}px`,
                              maxWidth: `${width}px`
                           }}
                        >
                           {formatCurrency(val)}
                        </td>
                        {showVariations && source.id !== temporalConfig.referenceSourceId && (
                           <td className="px-2 py-2 text-right text-[10px] border-r border-slate-200 bg-purple-50/30 text-purple-700 font-bold" style={{ width: 60, minWidth: 60 }}>
                              {(() => {
                                 const refVal = colTotals[temporalConfig.referenceSourceId] || 0;
                                 const diff = val - refVal;
                                 if (temporalConfig.deltaFormat === 'percentage') {
                                    const pct = refVal !== 0 ? (diff / refVal) * 100 : (val !== 0 ? 100 : 0);
                                    return pct !== 0 ? formatPercentage(pct) : '-';
                                 }
                                 return diff !== 0 ? formatCurrency(diff) : '-';
                              })()}
                           </td>
                        )}
                     </React.Fragment>
                  );
               })}
            </tr>
         );
      }

      if (!pivotData) return null;
      return (
         <tr>
            {rowFields.map((field, idx) => {
               const width = getColWidth(`row_${field}`, true);
               const left = rowFields.slice(0, idx).reduce((acc, f) => acc + (columnWidths[`row_${f}`] || 150), 0);
               return (
                  <td
                     key={idx}
                     className="px-2 py-2 text-right text-xs uppercase text-slate-500 border-r border-slate-200 bg-slate-50 sticky left-0 z-50 truncate"
                     style={{
                        left: `${left}px`,
                        width: `${width}px`,
                        minWidth: `${width}px`,
                        maxWidth: `${width}px`
                     }}
                  >
                     {idx === rowFields.length - 1 ? 'Total' : ''}
                  </td>
               );
            })}
            {pivotData.colHeaders.map((col: string) => {
               const val = pivotData.colTotals[col];
               const { metric, metricLabel, isPct } = getMetricInfoFromCol(col);
               const customStyle = getCellStyle([], col, val, metricLabel, true);
               const width = getColWidth(col);

               let formatted = formatOutput(val, metric);
               if (isPct) formatted = val ? `${Number(val).toFixed(1)}%` : '-';
               return (
                  <td
                     key={col}
                     className="px-2 py-2 text-right text-xs text-slate-700 border-r border-slate-200 truncate"
                     style={{
                        ...customStyle,
                        width: `${width}px`,
                        minWidth: `${width}px`,
                        maxWidth: `${width}px`
                     }}
                  >
                     {formatted}
                  </td>
               );
            })}
            {showTotalCol && (
               <td
                  className="px-2 py-2 text-right bg-slate-200 border-l border-slate-300 truncate"
                  style={{
                     width: `${getColWidth('Grand Total', true)}px`,
                     minWidth: `${getColWidth('Grand Total', true)}px`,
                     maxWidth: `${getColWidth('Grand Total', true)}px`
                  }}
               >
                  {typeof pivotData.grandTotal === 'object' ? (
                     <div className="flex flex-col gap-0.5">
                        {Object.entries(pivotData.grandTotal).map(([label, v], idx) => (
                           <div key={idx} className="text-[9px] whitespace-nowrap">
                              <span className="text-slate-500 font-medium mr-1">{label}:</span>
                              <span className="font-bold text-black">{formatOutput(v, metrics.find(m => (m.label || `${m.field} (${m.aggType})`) === label))}</span>
                           </div>
                        ))}
                     </div>
                  ) : (
                     <span className="text-[10px] font-bold text-black">{formatOutput(pivotData.grandTotal, metrics[0])}</span>
                  )}
               </td>
            )}
         </tr>
      );
   };

   return (
      <div id="pivot-export-container" className="flex-1 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col min-w-0 overflow-hidden relative">
         {isCalculating && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center flex-col gap-3">
               <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
               <span className="text-sm font-bold text-slate-600">Calcul en cours...</span>
            </div>
         )}

         {isTemporalMode && temporalResults.length > 0 && temporalConfig ? (
            <div ref={parentRef} className="flex-1 overflow-auto custom-scrollbar w-full relative">
               <table className="min-w-full divide-y divide-slate-200 border-collapse" style={{ tableLayout: 'fixed' }}>
                  <thead className="bg-slate-50 sticky top-0 z-30 shadow-sm">
                     <tr>
                        {rowFields.map((field: string, idx: number) => {
                           const displayLabel = columnLabels[`group_${field}`] || field;
                           const isEditing = editingColumn === `group_${field}`;
                           const widthId = `group_${field}`;
                           const width = columnWidths[widthId] || 150;
                           const left = rowFields.slice(0, idx).reduce((acc, f) => acc + (columnWidths[`group_${f}`] || 150), 0);
                           const calcField = primaryDataset?.calculatedFields?.find(cf => cf.name === field);
                           return (
                              <th
                                 key={field}
                                 title={calcField ? `Formule: ${calcField.formula}` : undefined}
                                 className={`px-2 py-1.5 text-left text-xs font-bold uppercase border-b border-r border-slate-200 whitespace-nowrap sticky left-0 z-50 cursor-pointer transition-colors group relative ${isEditMode ? 'bg-amber-50/50 text-amber-700 border-dashed border-amber-200 hover:bg-amber-100' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                                 style={{ width, minWidth: width, left: `${left}px` }}
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
                                             className="w-full px-1 py-0.5 text-[10px] border border-blue-300 rounded text-slate-900"
                                             onClick={(e) => e.stopPropagation()}
                                             onChange={(e) => setColumnLabels((prev: any) => ({ ...prev, [`group_${field}`]: e.target.value }))}
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
                                 <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 group-hover:bg-slate-300 transition-colors" onMouseDown={(e) => onResizeStart(e, widthId, 150)} />
                              </th>
                           );
                        })}
                        {temporalConfig.sources.map((source: any) => {
                           const width = columnWidths[source.id] || 120;
                           return (
                              <React.Fragment key={source.id}>
                                 <th
                                    className={`px-2 py-1.5 text-right text-xs font-bold uppercase border-b border-r border-slate-200 cursor-pointer group relative transition-colors ${isEditMode ? 'bg-amber-50/50 text-amber-700 border-dashed border-amber-200 hover:bg-amber-100' : source.id === temporalConfig.referenceSourceId ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                                    style={{ width, minWidth: width }}
                                    onClick={() => {
                                       if (isEditMode) setEditingColumn(source.id);
                                       else handleHeaderClick(source.id);
                                    }}
                                 >
                                    <div className="flex items-center justify-end overflow-hidden gap-1">
                                       <span className="truncate flex-1">
                                          {editingColumn === source.id ? (
                                             <input
                                                type="text"
                                                value={columnLabels[source.id] || source.label}
                                                autoFocus
                                                className="w-full px-1 py-0.5 text-[10px] border border-blue-300 rounded text-slate-900"
                                                onClick={(e) => e.stopPropagation()}
                                                onChange={(e) => setColumnLabels((prev: any) => ({ ...prev, [source.id]: e.target.value }))}
                                                onBlur={() => setEditingColumn(null)}
                                                onKeyDown={(e) => { if (e.key === 'Enter') setEditingColumn(null); }}
                                             />
                                          ) : (columnLabels[source.id] || source.label)}
                                       </span>
                                       {renderSortIcon(source.id)}
                                    </div>
                                    <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 group-hover:bg-slate-300 transition-colors" onMouseDown={(e) => onResizeStart(e, source.id, 120)} />
                                 </th>
                                 {showVariations && source.id !== temporalConfig.referenceSourceId && (
                                    <th className="px-2 py-1.5 text-right text-xs font-bold uppercase border-b border-r border-slate-200 bg-purple-50 text-purple-700">Δ</th>
                                 )}
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
                           <tr key={result.groupKey} className={isSubtotal ? `bg-slate-50 font-bold border-t border-slate-200` : 'hover:bg-blue-50/30'}>
                              {(() => {
                                 const labels = result.groupLabel.split('\x1F');
                                 const numFields = rowFields.length;
                                 return Array.from({ length: numFields }, (_, gIdx) => {
                                    const label = labels[gIdx] || '';
                                    if (isSubtotal && gIdx > subtotalLevel) return null;
                                    const field = rowFields[gIdx];
                                    const width = columnWidths[`group_${field}`] || 150;
                                    const left = rowFields.slice(0, gIdx).reduce((acc, f) => acc + (columnWidths[`group_${f}`] || 150), 0);
                                    const headerStyle = getCellStyle(labels, '', undefined, '', isSubtotal);
                                    return (
                                       <td
                                          key={gIdx}
                                          className={`px-2 py-1 text-xs border-r border-slate-100 whitespace-nowrap overflow-hidden truncate sticky left-0 z-20 bg-white ${isSubtotal ? 'font-bold bg-slate-50' : ''}`}
                                          style={isSubtotal && gIdx === subtotalLevel ? { ...headerStyle, left: `${left}px` } : { ...headerStyle, width, minWidth: width, left: `${left}px` }}
                                          colSpan={isSubtotal && gIdx === subtotalLevel ? numFields - subtotalLevel : 1}
                                       >
                                          {(!isSubtotal || gIdx <= subtotalLevel) ? (gIdx === subtotalLevel && isSubtotal ? `Total ${label}` : label) : ''}
                                       </td>
                                    );
                                 });
                              })()}
                              {temporalConfig.sources.map((source: any) => {
                                 const value = result.values[source.id] || 0;
                                 const delta = result.deltas[source.id];
                                 const width = columnWidths[source.id] || 120;
                                 const rowKeys = result.groupLabel.split('\x1F');
                                 const customStyle = getCellStyle(rowKeys, source.label, value, source.label, isSubtotal);
                                 return (
                                    <React.Fragment key={source.id}>
                                       <td className={`px-2 py-1 text-[10px] text-right border-r border-slate-100 tabular-nums cursor-pointer hover:bg-blue-100 overflow-hidden truncate ${source.id === temporalConfig.referenceSourceId ? 'bg-blue-50/30' : ''}`} style={{ ...customStyle, width, minWidth: width }} onClick={() => !isSubtotal && handleTemporalDrilldown(result, source.id)}>
                                          {formatCurrency(value)}
                                       </td>
                                       {showVariations && source.id !== temporalConfig.referenceSourceId && (
                                          <td className={`px-2 py-1 text-[10px] text-right border-r tabular-nums font-bold overflow-hidden truncate ${delta.value > 0 ? 'text-green-600' : delta.value < 0 ? 'text-red-600' : 'text-slate-400'}`} style={{ width: 60, minWidth: 60 }}>
                                             {temporalConfig.deltaFormat === 'percentage' ? (delta.percentage !== 0 ? formatPercentage(delta.percentage) : '-') : (delta.value !== 0 ? formatCurrency(delta.value) : '-')}
                                          </td>
                                       )}
                                    </React.Fragment>
                                 );
                              })}
                           </tr>
                        );
                     })}
                     <tr>
                        <td colSpan={rowFields.length + temporalConfig.sources.length + (showVariations ? temporalConfig.sources.length - 1 : 0)} style={{ height: '40px' }} />
                     </tr>
                  </tbody>
                  <tfoot className="sticky bottom-0 z-30 font-bold border-t-2 border-slate-300 bg-slate-100 shadow-[0_-2px_4px_rgba(0,0,0,0.05)]">
                     {renderFooterRow()}
                  </tfoot>
               </table>
            </div>
         ) : pivotData ? (
            <div ref={parentRef} className="flex-1 overflow-auto custom-scrollbar flex flex-col w-full relative">
               <div style={{ height: `${rowVirtualizer.getTotalSize() + 40}px`, position: 'relative' }}>
                  <table className="min-w-full divide-y divide-slate-200 border-collapse absolute top-0 left-0 w-full" style={{ tableLayout: 'fixed' }}>
                     <thead className="bg-slate-50 sticky top-0 z-30 shadow-sm">
                        <tr>
                           {rowFields.map((field, idx) => {
                              const widthId = `row_${field}`;
                              const width = columnWidths[widthId] || 150;
                              const left = rowFields.slice(0, idx).reduce((acc, f) => acc + (columnWidths[`row_${f}`] || 150), 0);
                              const calcField = primaryDataset?.calculatedFields?.find(cf => cf.name === field);
                              return (
                                 <th
                                    key={field}
                                    title={calcField ? `Formule: ${calcField.formula}` : undefined}
                                    className={`px-2 py-1.5 text-left text-xs font-bold uppercase border-b border-r border-slate-200 whitespace-nowrap sticky left-0 z-50 cursor-pointer group relative transition-colors ${isEditMode ? 'bg-amber-50 text-amber-700 border-dashed border-amber-200 hover:bg-amber-100' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                                    style={{ width, minWidth: width, left: `${left}px` }}
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
                                                className="w-full px-1 py-0.5 text-[10px] border border-blue-300 rounded text-slate-900"
                                                onClick={(e) => e.stopPropagation()}
                                                onChange={(e) => setColumnLabels((prev: any) => ({ ...prev, [`row_${field}`]: e.target.value }))}
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
                                    <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 group-hover:bg-slate-300 transition-colors" onMouseDown={(e) => onResizeStart(e, widthId, 150)} />
                                 </th>
                              );
                           })}
                           {pivotData.colHeaders.map((col: string) => {
                              const { colLabel, metricLabel, metric, isDiff, isPct } = getMetricInfoFromCol(col);
                              let displayLabel = isDiff ? 'Var.' : isPct ? '%' : formatDateLabelForDisplay(colLabel);
                              if (metricLabel && !isDiff && !isPct && colLabel === 'ALL') displayLabel = metricLabel;
                              else if (metricLabel && !isDiff && !isPct) displayLabel = `${displayLabel} - ${metricLabel}`;

                              const width = columnWidths[col] || 120;
                              const calcField = metric ? primaryDataset?.calculatedFields?.find(cf => cf.name === metric.field) : null;
                              const formulaTitle = calcField ? `\nFormule: ${calcField.formula}` : '';

                              return (
                                 <th
                                    key={col}
                                    title={col.replace('\x1F', '-') + formulaTitle}
                                    className={`px-2 py-1.5 text-right text-xs font-bold uppercase border-b border-r border-slate-200 whitespace-nowrap cursor-pointer group relative transition-colors ${isEditMode ? 'bg-amber-50/50 text-amber-700 border-dashed border-amber-200 hover:bg-amber-100' : isDiff || isPct ? 'bg-blue-50 text-blue-700 hover:bg-blue-100' : 'text-slate-500 hover:bg-slate-100'}`}
                                    style={{ width, minWidth: width }}
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
                                                className="w-full px-1 py-0.5 text-[10px] border border-blue-300 rounded text-slate-900"
                                                onClick={(e) => e.stopPropagation()}
                                                onChange={(e) => setColumnLabels((prev: any) => ({ ...prev, [col]: e.target.value }))}
                                                onBlur={() => setEditingColumn(null)}
                                                onKeyDown={(e) => { if (e.key === 'Enter') setEditingColumn(null); }}
                                             />
                                          ) : (columnLabels[col] || displayLabel)}
                                       </span>
                                       {onRemoveField && !isDiff && !isPct && !editingColumn && (
                                          <button
                                             onClick={(e) => {
                                                e.stopPropagation();
                                                const { metric } = getMetricInfoFromCol(col);
                                                if (metric) onRemoveField('val', metric.field);
                                                else if (colLabel !== 'ALL') onRemoveField('col', colLabel);
                                             }}
                                             className="p-0.5 hover:bg-red-100 text-red-400 hover:text-red-600 rounded transition-all bg-white/50 shadow-sm border border-slate-100"
                                             title="Retirer"
                                          >
                                             <X className="w-3 h-3" />
                                          </button>
                                       )}
                                       {renderSortIcon(col)}
                                    </div>
                                    <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 group-hover:bg-slate-300 transition-colors" onMouseDown={(e) => onResizeStart(e, col, 120)} />
                                 </th>
                              );
                           })}
                           {showTotalCol && (
                              <th
                                 className="px-2 py-1.5 text-right text-xs font-black text-slate-700 uppercase border-b bg-slate-100 whitespace-nowrap cursor-pointer group"
                                 style={{
                                    width: columnWidths['Grand Total'] || 150,
                                    minWidth: columnWidths['Grand Total'] || 150
                                 }}
                                 onClick={() => handleHeaderClick('value')}
                              >
                                 <div className="flex items-center justify-end relative">
                                    Total
                                    {renderSortIcon('value')}
                                    <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 group-hover:bg-slate-300 transition-colors" onMouseDown={(e) => onResizeStart(e, 'Grand Total', 150)} />
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
                              <tr key={virtualRow.key} data-index={virtualRow.index} ref={rowVirtualizer.measureElement} className={`${row.type === 'subtotal' ? 'bg-slate-50 font-bold' : 'hover:bg-blue-50/30'}`}>
                                 {rowFields.map((field, cIdx) => {
                                    const width = columnWidths[`row_${field}`] || 150;
                                    const left = rowFields.slice(0, cIdx).reduce((acc, f) => acc + (columnWidths[`row_${f}`] || 150), 0);
                                    const headerStyle = getCellStyle(row.keys, '', undefined, '', row.type === 'subtotal');

                                    if (row.type === 'subtotal') {
                                       if (cIdx < row.level) {
                                          return (
                                             <td
                                                key={cIdx}
                                          className="px-2 py-1 text-xs text-slate-500 border-r border-slate-200 bg-slate-50/30 overflow-hidden truncate sticky left-0 z-20"
                                                style={{ width, minWidth: width, left: `${left}px`, ...headerStyle }}
                                             >
                                                {row.keys[cIdx]}
                                             </td>
                                          );
                                       }
                                       if (cIdx === row.level) {
                                          return (
                                             <td
                                                key={cIdx}
                                                colSpan={rowFields.length - cIdx}
                                          className="px-2 py-1 text-xs text-slate-700 border-r border-slate-200 font-bold italic text-right overflow-hidden truncate sticky left-0 z-20"
                                                style={{ left: `${left}px`, ...headerStyle }}
                                             >
                                                {row.label}
                                             </td>
                                          );
                                       }
                                       return null;
                                    }
                                    return (
                                       <td
                                          key={cIdx}
                                          className="px-2 py-1 text-xs text-slate-700 border-r border-slate-100 whitespace-nowrap overflow-hidden truncate sticky left-0 z-20 bg-white"
                                          style={{ width, minWidth: width, left: `${left}px`, ...headerStyle }}
                                       >
                                          {row.keys[cIdx]}
                                       </td>
                                    );
                                 })}
                                 {pivotData.colHeaders.map((col: string) => {
                                    const width = columnWidths[col] || 120;
                                    const val = row.metrics[col];
                                    const { colLabel, metricLabel, metric, isDiff, isPct } = getMetricInfoFromCol(col);

                                    const customStyle = getCellStyle(row.keys, col, val, metricLabel, row.type === 'subtotal');

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
                                    const isSelected = isSelectionMode && isItemSelected(row.keys, col);
                                    return (
                                       <td
                                          key={col}
                                          className={`px-2 py-1 text-[10px] text-right border-r border-slate-100 tabular-nums cursor-pointer transition-all overflow-hidden truncate ${cellClass} ${isDiff || isPct ? 'bg-blue-50/20' : ''} ${isSelectionMode ? (isSelected ? 'bg-blue-100 ring-1 ring-blue-400' : 'hover:bg-blue-50 hover:ring-1 hover:ring-blue-300') : 'hover:bg-blue-100'}`}
                                       style={{ width, minWidth: width, ...customStyle }}
                                          onClick={() => handleDrilldown(row.keys, col, val, metricLabel)}
                                       >
                                          {formatted}
                                       </td>
                                    );
                                 })}
                                 {showTotalCol && (
                                    <td
                                       className={`px-2 py-1 text-right border-l border-slate-200 cursor-pointer transition-all ${isSelectionMode ? (isItemSelected(row.keys, 'Total') ? 'bg-blue-100 ring-1 ring-blue-400' : 'bg-slate-50 hover:bg-blue-50 hover:ring-1 hover:ring-blue-300') : 'bg-slate-50 hover:bg-blue-100'}`}
                                       onClick={() => {
                                          const value = typeof row.rowTotal === 'object' ? Object.values(row.rowTotal)[0] : row.rowTotal;
                                          handleDrilldown(row.keys, 'Total', value, '');
                                       }}
                                    >
                                       {typeof row.rowTotal === 'object' ? (
                                          <div className="flex flex-col gap-0.5">
                                             {Object.entries(row.rowTotal).map(([label, v], idx) => (
                                                <div key={idx} className="text-[9px] whitespace-nowrap">
                                                   <span className="text-slate-400 font-medium mr-1">{label}:</span>
                                                   <span className="font-bold text-slate-800">{formatOutput(v, metrics.find(m => (m.label || `${m.field} (${m.aggType})`) === label))}</span>
                                                </div>
                                             ))}
                                          </div>
                                       ) : (
                                          <span className="text-[10px] font-bold text-slate-800">{formatOutput(row.rowTotal, metrics[0])}</span>
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
               <table className="min-w-full divide-y divide-slate-200 border-collapse sticky bottom-0 z-30 font-bold border-t-2 border-slate-300 bg-slate-100 shadow-[0_-2px_4px_rgba(0,0,0,0.05)]" style={{ tableLayout: 'fixed' }}>
                  <tfoot>
                     {renderFooterRow()}
                  </tfoot>
               </table>
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
