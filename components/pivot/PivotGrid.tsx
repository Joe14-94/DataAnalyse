
import React from 'react';
import { Loader2, Table2 } from 'lucide-react';
import { TemporalComparisonResult, Dataset, PivotSourceConfig } from '../../types';
import { formatPivotOutput, PivotResult } from '../../logic/pivotEngine';
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
   handleDrilldown: (rowKeys: string[], colLabel: string) => void;
   handleTemporalDrilldown: (result: TemporalComparisonResult) => void;
   primaryDataset: Dataset | null;
   datasets: Dataset[];
   aggType: string;
   valField: string;
   valFormatting: any;
   virtualItems: any[];
   rowVirtualizer: any;
   parentRef: React.RefObject<HTMLDivElement>;
   totalColumns: number;
   paddingTop: number;
   paddingBottom: number;
}

export const PivotGrid: React.FC<PivotGridProps> = (props) => {
   const {
      isCalculating, isTemporalMode, pivotData, temporalResults, temporalConfig, rowFields,
      columnLabels, editingColumn, setEditingColumn, setColumnLabels, showVariations, showTotalCol,
      handleDrilldown, handleTemporalDrilldown, primaryDataset, datasets, aggType, valField,
      valFormatting, virtualItems, rowVirtualizer, parentRef, totalColumns, paddingTop, paddingBottom
   } = props;

   const formatOutput = (val: string | number) => formatPivotOutput(val, valField, aggType, primaryDataset, undefined, datasets, valFormatting);

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
                        {temporalConfig.groupByFields.map((field: string) => {
                           const displayLabel = columnLabels[`group_${field}`] || field;
                           const isEditing = editingColumn === `group_${field}`;
                           return (
                              <th key={field} className="px-2 py-1.5 text-left text-xs font-bold text-slate-500 uppercase border-b border-r border-slate-200 bg-slate-50 whitespace-nowrap cursor-pointer hover:bg-slate-100" onDoubleClick={() => setEditingColumn(`group_${field}`)}>
                                 {isEditing ? (
                                    <input type="text" defaultValue={displayLabel} autoFocus className="w-full px-1 py-0.5 text-[10px] border border-blue-300 rounded" onBlur={(e) => { setColumnLabels((prev: any) => ({ ...prev, [`group_${field}`]: e.target.value })); setEditingColumn(null); }} />
                                 ) : displayLabel}
                              </th>
                           );
                        })}
                        {temporalConfig.sources.map((source: any) => (
                           <React.Fragment key={source.id}>
                              <th className={`px-2 py-1.5 text-right text-xs font-bold uppercase border-b border-r border-slate-200 cursor-pointer ${source.id === temporalConfig.referenceSourceId ? 'bg-blue-100 text-blue-700' : 'bg-slate-50 text-slate-500'}`} onDoubleClick={() => setEditingColumn(source.id)}>
                                 {editingColumn === source.id ? (
                                    <input type="text" defaultValue={columnLabels[source.id] || source.label} autoFocus className="w-full px-1 py-0.5 text-[10px] border border-blue-300 rounded" onBlur={(e) => { setColumnLabels((prev: any) => ({ ...prev, [source.id]: e.target.value })); setEditingColumn(null); }} />
                                 ) : (columnLabels[source.id] || source.label)}
                              </th>
                              {showVariations && source.id !== temporalConfig.referenceSourceId && (
                                 <th className="px-2 py-1.5 text-right text-xs font-bold uppercase border-b border-r border-slate-200 bg-purple-50 text-purple-700">Δ</th>
                              )}
                           </React.Fragment>
                        ))}
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
                                 const numFields = temporalConfig.groupByFields.length;
                                 return Array.from({ length: numFields }, (_, gIdx) => {
                                    const label = labels[gIdx] || '';
                                    if (isSubtotal && gIdx > subtotalLevel) return null;
                                    return (
                                       <td key={gIdx} className={`px-2 py-1 text-xs border-r border-slate-100 whitespace-nowrap ${isSubtotal ? 'font-bold' : ''}`} colSpan={isSubtotal && gIdx === subtotalLevel ? numFields - subtotalLevel : 1}>
                                          {(!isSubtotal || gIdx <= subtotalLevel) ? (gIdx === subtotalLevel && isSubtotal ? `Total ${label}` : label) : ''}
                                       </td>
                                    );
                                 });
                              })()}
                              {temporalConfig.sources.map((source: any) => {
                                 const value = result.values[source.id] || 0;
                                 const delta = result.deltas[source.id];
                                 return (
                                    <React.Fragment key={source.id}>
                                       <td className={`px-2 py-1 text-[10px] text-right border-r border-slate-100 tabular-nums cursor-pointer hover:bg-blue-100 ${source.id === temporalConfig.referenceSourceId ? 'bg-blue-50/30' : ''}`} onClick={() => !isSubtotal && handleTemporalDrilldown(result)}>
                                          {formatCurrency(value)}
                                       </td>
                                       {showVariations && source.id !== temporalConfig.referenceSourceId && (
                                          <td className={`px-2 py-1 text-[10px] text-right border-r tabular-nums font-bold ${delta.value > 0 ? 'text-green-600' : delta.value < 0 ? 'text-red-600' : 'text-slate-400'}`}>
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
                           {rowFields.map((field) => (
                              <th key={field} className="px-2 py-1.5 text-left text-xs font-bold text-slate-500 uppercase border-b border-r border-slate-200 bg-slate-50 whitespace-nowrap sticky left-0 z-20" style={{ minWidth: '100px' }} onDoubleClick={() => setEditingColumn(`row_${field}`)}>
                                 {editingColumn === `row_${field}` ? (
                                    <input type="text" defaultValue={columnLabels[`row_${field}`] || field} autoFocus className="w-full px-1 py-0.5 text-[10px] border border-blue-300 rounded" onBlur={(e) => { setColumnLabels((prev: any) => ({ ...prev, [`row_${field}`]: e.target.value })); setEditingColumn(null); }} />
                                 ) : (columnLabels[`row_${field}`] || field)}
                              </th>
                           ))}
                           {pivotData.colHeaders.map(col => {
                              const isDiff = col.endsWith('_DIFF');
                              const isPct = col.endsWith('_PCT');
                              let label = isDiff ? 'Var.' : isPct ? '%' : formatDateLabelForDisplay(col);
                              return (
                                 <th key={col} className={`px-2 py-1.5 text-right text-xs font-bold uppercase border-b border-r border-slate-200 whitespace-nowrap cursor-pointer hover:bg-slate-100 ${isDiff || isPct ? 'bg-blue-50 text-blue-700' : 'text-slate-500'}`} onDoubleClick={() => setEditingColumn(col)}>
                                    {editingColumn === col ? (
                                       <input type="text" defaultValue={columnLabels[col] || label} autoFocus className="w-full px-1 py-0.5 text-[10px] border border-blue-300 rounded" onBlur={(e) => { setColumnLabels((prev: any) => ({ ...prev, [col]: e.target.value })); setEditingColumn(null); }} />
                                    ) : (columnLabels[col] || label)}
                                 </th>
                              );
                           })}
                           {showTotalCol && <th className="px-2 py-1.5 text-right text-xs font-black text-slate-700 uppercase border-b bg-slate-100 whitespace-nowrap">Total</th>}
                        </tr>
                     </thead>
                     <tbody className="bg-white divide-y divide-slate-200">
                        {paddingTop > 0 && <tr><td style={{ height: `${paddingTop}px` }} colSpan={totalColumns} /></tr>}
                        {virtualItems.map((virtualRow: any) => {
                           const row = pivotData.displayRows[virtualRow.index];
                           return (
                              <tr key={virtualRow.key} data-index={virtualRow.index} ref={rowVirtualizer.measureElement} className={`${row.type === 'subtotal' ? 'bg-slate-50 font-bold' : 'hover:bg-blue-50/30'}`}>
                                 {rowFields.map((field, cIdx) => {
                                    if (row.type === 'subtotal') {
                                       if (cIdx < row.level) return <td key={cIdx} className="px-2 py-1 text-xs text-slate-500 border-r border-slate-200 bg-slate-50/30">{row.keys[cIdx]}</td>;
                                       if (cIdx === row.level) return <td key={cIdx} colSpan={rowFields.length - cIdx} className="px-2 py-1 text-xs text-slate-700 border-r border-slate-200 font-bold italic text-right">{row.label}</td>;
                                       return null;
                                    }
                                    return <td key={cIdx} className="px-2 py-1 text-xs text-slate-700 border-r border-slate-100 whitespace-nowrap">{row.keys[cIdx]}</td>;
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
                                    } else if (isPct) {
                                       if (val === 0 || val === undefined) formatted = '-';
                                       else { formatted = `${Number(val).toFixed(1)}%`; if (Number(val) > 0) cellClass = "text-green-600 font-bold"; else if (Number(val) < 0) cellClass = "text-red-600 font-bold"; }
                                    }
                                    return (
                                       <td key={col} className={`px-2 py-1 text-[10px] text-right border-r border-slate-100 tabular-nums cursor-pointer hover:bg-blue-100 transition-colors ${cellClass} ${isDiff || isPct ? 'bg-blue-50/20' : ''}`} onClick={() => handleDrilldown(row.keys, col)}>
                                          {formatted}
                                       </td>
                                    );
                                 })}
                                 {showTotalCol && (
                                    <td className="px-2 py-1 text-[10px] text-right font-bold text-slate-800 bg-slate-50 border-l border-slate-200 cursor-pointer hover:bg-blue-100 transition-colors" onClick={() => handleDrilldown(row.keys, 'Total')}>
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
               <Table2 className="w-12 h-12 mb-4 opacity-20" />
               <p className="text-sm font-medium">Glissez des champs pour commencer l'analyse</p>
            </div>
         )}
      </div>
   );
};
