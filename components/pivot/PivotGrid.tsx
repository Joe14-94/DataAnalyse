
import React from 'react';
import { Loader2, Table2, ArrowUp, ArrowDown, X } from 'lucide-react';
import { TemporalComparisonResult, Dataset, PivotSourceConfig, PivotResult, SortBy, SortOrder } from '../../types';
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
   selectedItems?: any[];
   sortBy: SortBy;
   setSortBy: (v: SortBy) => void;
   sortOrder: SortOrder;
   setSortOrder: (v: SortOrder) => void;
   columnWidths: Record<string, number>;
   setColumnWidths: (v: any) => void;
   onRemoveField?: (zone: any, field: string) => void;
}

export const PivotGrid: React.FC<PivotGridProps> = (props) => {
   const {
      isCalculating, isTemporalMode, pivotData, temporalResults, temporalConfig, rowFields,
      columnLabels, editingColumn, setEditingColumn, setColumnLabels, showVariations, showTotalCol,
      handleDrilldown, handleTemporalDrilldown, primaryDataset, datasets, aggType, valField, metrics,
      valFormatting, virtualItems, rowVirtualizer, parentRef, totalColumns, paddingTop, paddingBottom,
      isSelectionMode = false, selectedItems = [],
      sortBy, setSortBy, sortOrder, setSortOrder,
      columnWidths, setColumnWidths, onRemoveField
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
      return { colLabel: col, metricLabel: '', metric: metrics[0], isDiff: false, isPct: false };
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
               <table className="min-w-full divide-y divide-slate-200 border-collapse">
                  <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                     <tr>
                        {rowFields.map((field: string, idx: number) => {
                           const displayLabel = columnLabels[`group_${field}`] || field;
                           const isEditing = editingColumn === `group_${field}`;
                           const widthId = `group_${field}`;
                           const width = columnWidths[widthId] || 150;
                           return (
                              <th key={field} className="px-2 py-1.5 text-left text-xs font-bold text-slate-500 uppercase border-b border-r border-slate-200 bg-slate-50 whitespace-nowrap cursor-pointer hover:bg-slate-100 group relative" style={{ width, minWidth: width }} onClick={() => idx === 0 && handleHeaderClick('label')} onDoubleClick={() => setEditingColumn(`group_${field}`)}>
                                 <div className="flex items-center overflow-hidden gap-1">
                                    <span className="truncate flex-1">
                                       {isEditing ? (
                                          <input
                                             type="text"
                                             defaultValue={displayLabel}
                                             autoFocus
                                             className="w-full px-1 py-0.5 text-[10px] border border-blue-300 rounded text-slate-900"
                                             onClick={(e) => e.stopPropagation()}
                                             onBlur={(e) => { setColumnLabels((prev: any) => ({ ...prev, [`group_${field}`]: e.target.value })); setEditingColumn(null); }}
                                             onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
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
                                 <th className={`px-2 py-1.5 text-right text-xs font-bold uppercase border-b border-r border-slate-200 cursor-pointer group relative ${source.id === temporalConfig.referenceSourceId ? 'bg-blue-100 text-blue-700' : 'bg-slate-50 text-slate-500'}`} style={{ width, minWidth: width }} onClick={() => handleHeaderClick(source.id)} onDoubleClick={() => setEditingColumn(source.id)}>
                                    <div className="flex items-center justify-end overflow-hidden gap-1">
                                       <span className="truncate flex-1">
                                          {editingColumn === source.id ? (
                                             <input
                                                type="text"
                                                defaultValue={columnLabels[source.id] || source.label}
                                                autoFocus
                                                className="w-full px-1 py-0.5 text-[10px] border border-blue-300 rounded text-slate-900"
                                                onClick={(e) => e.stopPropagation()}
                                                onBlur={(e) => { setColumnLabels((prev: any) => ({ ...prev, [source.id]: e.target.value })); setEditingColumn(null); }}
                                                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
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
                                    return (
                                       <td key={gIdx} className={`px-2 py-1 text-xs border-r border-slate-100 whitespace-nowrap overflow-hidden truncate ${isSubtotal ? 'font-bold' : ''}`} style={isSubtotal && gIdx === subtotalLevel ? {} : { width, minWidth: width }} colSpan={isSubtotal && gIdx === subtotalLevel ? numFields - subtotalLevel : 1}>
                                          {(!isSubtotal || gIdx <= subtotalLevel) ? (gIdx === subtotalLevel && isSubtotal ? `Total ${label}` : label) : ''}
                                       </td>
                                    );
                                 });
                              })()}
                              {temporalConfig.sources.map((source: any) => {
                                 const value = result.values[source.id] || 0;
                                 const delta = result.deltas[source.id];
                                 const width = columnWidths[source.id] || 120;
                                 return (
                                    <React.Fragment key={source.id}>
                                       <td className={`px-2 py-1 text-[10px] text-right border-r border-slate-100 tabular-nums cursor-pointer hover:bg-blue-100 overflow-hidden truncate ${source.id === temporalConfig.referenceSourceId ? 'bg-blue-50/30' : ''}`} style={{ width, minWidth: width }} onClick={() => !isSubtotal && handleTemporalDrilldown(result, source.id)}>
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
                  </tbody>
               </table>
            </div>
         ) : pivotData ? (
            <div ref={parentRef} className="flex-1 overflow-auto custom-scrollbar flex flex-col w-full relative">
               <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
                  <table className="min-w-full divide-y divide-slate-200 border-collapse absolute top-0 left-0 w-full">
                     <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                        <tr>
                           {rowFields.map((field, idx) => {
                              const widthId = `row_${field}`;
                              const width = columnWidths[widthId] || 150;
                              return (
                                 <th
                                    key={field}
                                    className="px-2 py-1.5 text-left text-xs font-bold text-slate-500 uppercase border-b border-r border-slate-200 bg-slate-50 whitespace-nowrap sticky left-0 z-20 cursor-pointer group relative"
                                    style={{ width, minWidth: width }}
                                    onClick={() => idx === 0 && handleHeaderClick('label')}
                                    onDoubleClick={() => setEditingColumn(`row_${field}`)}
                                 >
                                    <div className="flex items-center overflow-hidden gap-1">
                                       <span className="truncate flex-1">
                                          {editingColumn === `row_${field}` ? (
                                             <input
                                                type="text"
                                                defaultValue={columnLabels[`row_${field}`] || field}
                                                autoFocus
                                                className="w-full px-1 py-0.5 text-[10px] border border-blue-300 rounded text-slate-900"
                                                onClick={(e) => e.stopPropagation()}
                                                onBlur={(e) => { setColumnLabels((prev: any) => ({ ...prev, [`row_${field}`]: e.target.value })); setEditingColumn(null); }}
                                                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
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
                              const { colLabel, metricLabel, isDiff, isPct } = getMetricInfoFromCol(col);
                              let displayLabel = isDiff ? 'Var.' : isPct ? '%' : formatDateLabelForDisplay(colLabel);
                              if (metricLabel && !isDiff && !isPct && colLabel === 'ALL') displayLabel = metricLabel;
                              else if (metricLabel && !isDiff && !isPct) displayLabel = `${displayLabel} - ${metricLabel}`;

                              const width = columnWidths[col] || 120;

                              return (
                                 <th
                                    key={col}
                                    title={col.replace('\x1F', '-')}
                                    className={`px-2 py-1.5 text-right text-xs font-bold uppercase border-b border-r border-slate-200 whitespace-nowrap cursor-pointer hover:bg-slate-100 group relative ${isDiff || isPct ? 'bg-blue-50 text-blue-700' : 'text-slate-500'}`}
                                    style={{ width, minWidth: width }}
                                    onClick={() => handleHeaderClick(col)}
                                    onDoubleClick={() => setEditingColumn(col)}
                                 >
                                    <div className="flex items-center justify-end overflow-hidden gap-1">
                                       <span className="truncate flex-1">
                                          {editingColumn === col ? (
                                             <input
                                                type="text"
                                                defaultValue={columnLabels[col] || displayLabel}
                                                autoFocus
                                                className="w-full px-1 py-0.5 text-[10px] border border-blue-300 rounded text-slate-900"
                                                onClick={(e) => e.stopPropagation()}
                                                onBlur={(e) => { setColumnLabels((prev: any) => ({ ...prev, [col]: e.target.value })); setEditingColumn(null); }}
                                                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
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
                                 onClick={() => handleHeaderClick('value')}
                              >
                                 <div className="flex items-center justify-end">
                                    Total
                                    {renderSortIcon('value')}
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
                                    if (row.type === 'subtotal') {
                                       if (cIdx < row.level) return <td key={cIdx} className="px-2 py-1 text-xs text-slate-500 border-r border-slate-200 bg-slate-50/30 overflow-hidden truncate" style={{ width, minWidth: width }}>{row.keys[cIdx]}</td>;
                                       if (cIdx === row.level) return <td key={cIdx} colSpan={rowFields.length - cIdx} className="px-2 py-1 text-xs text-slate-700 border-r border-slate-200 font-bold italic text-right overflow-hidden truncate">{row.label}</td>;
                                       return null;
                                    }
                                    return <td key={cIdx} className="px-2 py-1 text-xs text-slate-700 border-r border-slate-100 whitespace-nowrap overflow-hidden truncate" style={{ width, minWidth: width }}>{row.keys[cIdx]}</td>;
                                 })}
                                 {pivotData.colHeaders.map((col: string) => {
                                    const width = columnWidths[col] || 120;
                                    const val = row.metrics[col];
                                    const { colLabel, metricLabel, metric, isDiff, isPct } = getMetricInfoFromCol(col);

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
                                          style={{ width, minWidth: width }}
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
