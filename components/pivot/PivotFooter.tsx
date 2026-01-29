
import React from 'react';
import { Dataset, PivotResult, PivotStyleRule, ConditionalFormattingRule } from '../../types';
import { formatPivotOutput } from '../../logic/pivotEngine';

interface PivotFooterProps {
   pivotData: PivotResult | null;
   rowFields: string[];
   footerRef: React.RefObject<HTMLDivElement>;
   valField: string;
   aggType: string;
   metrics: any[];
   primaryDataset: Dataset | null;
   datasets: Dataset[];
   valFormatting: any;
   showTotalCol: boolean;
   styleRules?: PivotStyleRule[];
   conditionalRules?: ConditionalFormattingRule[];
}

export const PivotFooter: React.FC<PivotFooterProps> = ({
   pivotData, rowFields, footerRef, valField, aggType, metrics, primaryDataset, datasets, valFormatting, showTotalCol, styleRules = [], conditionalRules = []
}) => {
   if (!pivotData) return null;

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

   const getCellStyle = (col: string, value: any, metricLabel: string) => {
      let finalStyle: React.CSSProperties = {};

      // 1. Manual rules
      styleRules.forEach(rule => {
         let match = false;
         if (rule.targetType === 'metric') {
            if (!rule.targetKey || rule.targetKey === metricLabel) match = true;
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

      // 2. Conditional rules
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

   const formatOutput = (val: string | number, metric?: any) => {
      const field = metric?.field || valField;
      const type = metric?.aggType || aggType;
      return formatPivotOutput(val, field, type, primaryDataset, undefined, datasets, metric?.formatting || valFormatting);
   };

   return (
      <div ref={footerRef} className="border-t-2 border-slate-300 bg-slate-100 shadow-inner overflow-x-hidden flex-shrink-0">
         <table className="min-w-full divide-y divide-slate-200 border-collapse w-full">
            <tbody className="font-bold">
               <tr>
                  {rowFields.map((_, idx) => (
                     <td key={idx} className="px-2 py-2 text-right text-xs uppercase text-slate-500 border-r border-slate-200 bg-slate-50 sticky left-0 z-10" style={{ minWidth: '100px' }}>
                        {idx === rowFields.length - 1 ? 'Total' : ''}
                     </td>
                  ))}
                  {pivotData.colHeaders.map((col: string) => {
                     const val = pivotData.colTotals[col];
                     const { metric, isPct } = getMetricInfoFromCol(col);
                     const metricLabel = metric?.label || (metric?.field ? `${metric.field} (${metric.aggType})` : '');
                     const customStyle = getCellStyle(col, val, metricLabel);

                     let formatted = formatOutput(val, metric);
                     if (isPct) formatted = val ? `${Number(val).toFixed(1)}%` : '-';
                     return <td key={col} className="px-2 py-2 text-right text-xs text-slate-700 border-r border-slate-200" style={customStyle}>{formatted}</td>;
                  })}
                  {showTotalCol && (
                     <td className="px-2 py-2 text-right bg-slate-200 border-l border-slate-300">
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
