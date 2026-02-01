
import React from 'react';
import { Dataset, PivotResult, PivotStyleRule, ConditionalFormattingRule } from '../../types';
import { formatPivotOutput } from '../../logic/pivotEngine';
import { getCellStyle } from '../../utils/pivotFormatting';
import { formatCurrency, formatPercentage } from '../../utils/temporalComparison';

interface PivotFooterProps {
   pivotData: PivotResult | null;
   temporalColTotals?: { [sourceId: string]: number };
   temporalConfig?: any;
   rowFields: string[];
   columnWidths: Record<string, number>;
   footerRef: React.RefObject<HTMLDivElement>;
   valField: string;
   aggType: string;
   metrics: any[];
   primaryDataset: Dataset | null;
   datasets: Dataset[];
   valFormatting: any;
   showTotalCol: boolean;
   showVariations?: boolean;
   styleRules?: PivotStyleRule[];
   conditionalRules?: ConditionalFormattingRule[];
}

export const PivotFooter: React.FC<PivotFooterProps> = ({
   pivotData, temporalColTotals, temporalConfig, rowFields, columnWidths, footerRef, valField, aggType, metrics, primaryDataset, datasets, valFormatting, showTotalCol, showVariations = false, styleRules = [], conditionalRules = []
}) => {
   if (!pivotData && !temporalColTotals) return null;

   const getColWidth = (id: string, isRowField: boolean = false) => {
      return columnWidths[id] || (isRowField ? 150 : 120);
   };

   const getMetricInfoFromCol = (col: string) => {
      if (col.includes('\x1F')) {
         const parts = col.split('\x1F');
         let metricLabel = parts[1].trim();
         const isDiff = metricLabel.endsWith('_DIFF');
         const isPct = metricLabel.endsWith('_PCT');

         if (isDiff) metricLabel = metricLabel.replace('_DIFF', '');
         if (isPct) metricLabel = metricLabel.replace('_PCT', '');

         const metric = metrics.find(m => (m.label || `${m.field} (${m.aggType})`) === metricLabel);
         return { metric, isDiff, isPct };
      }

      const isDiff = col.endsWith('_DIFF');
      const isPct = col.endsWith('_PCT');
      let baseCol = col;
      if (isDiff) baseCol = col.replace('_DIFF', '');
      if (isPct) baseCol = col.replace('_PCT', '');

      const directMetric = metrics.find(m => (m.label || `${m.field} (${m.aggType})`) === baseCol);
      if (directMetric) return { metric: directMetric, isDiff, isPct };

      return { metric: metrics[0], isDiff, isPct };
   };

   const getCellFormatting = (col: string, value: any, metricLabel: string) => {
      return getCellStyle([], col, value, metricLabel, styleRules, conditionalRules, 'grandTotal');
   };

   const formatOutput = (val: string | number, metric?: any) => {
      const field = metric?.field || valField;
      const type = metric?.aggType || aggType;
      return formatPivotOutput(val, field, type, primaryDataset, undefined, datasets, metric?.formatting || valFormatting);
   };

   if (temporalColTotals && temporalConfig) {
      return (
         <div ref={footerRef} className="border-t-2 border-slate-300 bg-slate-100 shadow-inner overflow-x-hidden flex-shrink-0">
            <table className="min-w-full divide-y divide-slate-200 border-collapse" style={{ tableLayout: 'fixed' }}>
               <tbody className="font-bold">
                  <tr>
                     {rowFields.map((field, idx) => (
                        <td
                           key={idx}
                           className="px-2 py-2 text-right text-xs uppercase text-slate-500 border-r border-slate-200 bg-slate-50 sticky left-0 z-10 truncate"
                           style={{
                              left: `${rowFields.slice(0, idx).reduce((acc, f) => acc + (columnWidths[`group_${f}`] || 150), 0)}px`,
                              width: `${columnWidths[`group_${field}`] || 150}px`,
                              minWidth: `${columnWidths[`group_${field}`] || 150}px`,
                              maxWidth: `${columnWidths[`group_${field}`] || 150}px`
                           }}
                        >
                           {idx === rowFields.length - 1 ? 'Total' : ''}
                        </td>
                     ))}
                     {temporalConfig.sources.map((source: any) => {
                        const val = temporalColTotals[source.id] || 0;
                        const customStyle = getCellStyle([], source.id, val, source.label, styleRules, conditionalRules, 'grandTotal');

                        const referenceTotal = temporalColTotals[temporalConfig.referenceSourceId] || 0;
                        const deltaValue = val - referenceTotal;
                        const deltaPercentage = referenceTotal !== 0 ? (deltaValue / referenceTotal) * 100 : (val !== 0 ? 100 : 0);

                        return (
                           <React.Fragment key={source.id}>
                              <td
                                 className="px-2 py-2 text-right text-xs text-slate-700 border-r border-slate-200 truncate"
                                 style={{
                                    ...customStyle,
                                    width: `${columnWidths[source.id] || 120}px`,
                                    minWidth: `${columnWidths[source.id] || 120}px`,
                                    maxWidth: `${columnWidths[source.id] || 120}px`
                                 }}
                              >
                                 {formatCurrency(val)}
                              </td>
                              {showVariations && source.id !== temporalConfig.referenceSourceId && (
                                 <td
                                    className={`px-2 py-2 text-right text-[10px] font-bold border-r border-slate-200 truncate ${deltaValue > 0 ? 'text-green-600' : deltaValue < 0 ? 'text-red-600' : 'text-slate-400'}`}
                                    style={{ width: 60, minWidth: 60, maxWidth: 60 }}
                                 >
                                    {temporalConfig.deltaFormat === 'percentage'
                                       ? (deltaPercentage !== 0 ? formatPercentage(deltaPercentage) : '-')
                                       : (deltaValue !== 0 ? formatCurrency(deltaValue) : '-')}
                                 </td>
                              )}
                           </React.Fragment>
                        );
                     })}
                  </tr>
               </tbody>
            </table>
         </div>
      );
   }

   return (
      <div ref={footerRef} className="border-t-2 border-slate-300 bg-slate-100 shadow-inner overflow-x-hidden flex-shrink-0">
         <table className="min-w-full divide-y divide-slate-200 border-collapse" style={{ tableLayout: 'fixed' }}>
            <tbody className="font-bold">
               <tr>
                  {rowFields.map((field, idx) => (
                     <td
                        key={idx}
                        className="px-2 py-2 text-right text-xs uppercase text-slate-500 border-r border-slate-200 bg-slate-50 sticky left-0 z-10 truncate"
                        style={{
                           left: `${rowFields.slice(0, idx).reduce((acc, f) => acc + (columnWidths[`row_${f}`] || 150), 0)}px`,
                           width: `${getColWidth(`row_${field}`, true)}px`,
                           minWidth: `${getColWidth(`row_${field}`, true)}px`,
                           maxWidth: `${getColWidth(`row_${field}`, true)}px`
                        }}
                     >
                        {idx === rowFields.length - 1 ? 'Total' : ''}
                     </td>
                  ))}
                  {pivotData?.colHeaders.map((col: string) => {
                     const val = pivotData?.colTotals[col];
                     const { metric, isPct } = getMetricInfoFromCol(col);
                     const metricLabel = metric?.label || (metric?.field ? `${metric.field} (${metric.aggType})` : '');
                     const customStyle = getCellFormatting(col, val, metricLabel);

                     let formatted = formatOutput(val, metric);
                     if (isPct) formatted = val ? `${Number(val).toFixed(1)}%` : '-';
                     return (
                        <td
                           key={col}
                           className="px-2 py-2 text-right text-xs text-slate-700 border-r border-slate-200 truncate"
                           style={{
                              ...customStyle,
                              width: `${getColWidth(col)}px`,
                              minWidth: `${getColWidth(col)}px`,
                              maxWidth: `${getColWidth(col)}px`
                           }}
                        >
                           {formatted}
                        </td>
                     );
                  })}
                  {showTotalCol && pivotData && (
                     <td
                        className="px-2 py-2 text-right bg-slate-200 border-l border-slate-300 truncate"
                        style={{
                           ...getCellFormatting('Total', typeof pivotData.grandTotal === 'object' ? Object.values(pivotData.grandTotal)[0] : pivotData.grandTotal, ''),
                           width: `${getColWidth('Grand Total', true)}px`,
                           minWidth: `${getColWidth('Grand Total', true)}px`,
                           maxWidth: `${getColWidth('Grand Total', true)}px`
                        }}
                     >
                        {typeof pivotData.grandTotal === 'object' ? (
                           <div className="flex flex-col gap-0.5">
                              {Object.entries(pivotData.grandTotal).map(([label, v], idx) => {
                                 const metric = metrics.find(m => (m.label || `${m.field} (${m.aggType})`) === label);
                                 const metricStyle = getCellStyle([], 'Total', v, label, styleRules, conditionalRules, 'grandTotal');
                                 return (
                                    <div key={idx} className="text-[9px] whitespace-nowrap" style={metricStyle}>
                                       <span className="text-slate-500 font-medium mr-1">{label}:</span>
                                       <span className="font-bold text-black">{formatOutput(v, metric)}</span>
                                    </div>
                                 );
                              })}
                           </div>
                        ) : (
                           <span className="text-xs text-black">{formatOutput(pivotData.grandTotal, metrics[0])}</span>
                        )}
                     </td>
                  )}
               </tr>
            </tbody>
         </table>
      </div>
   );
};
