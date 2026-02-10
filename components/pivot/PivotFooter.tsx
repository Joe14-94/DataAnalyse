
import React from 'react';
import { Dataset, PivotResult, PivotStyleRule, ConditionalFormattingRule, PivotMetric, AggregationType } from '../../types';
import { formatPivotOutput } from '../../logic/pivotEngine';
import { getCellStyle } from '../../utils/pivotFormatting';
import { formatCurrency, formatPercentage } from '../../utils/temporalComparison';

interface PivotFooterProps {
   pivotData: PivotResult | null;
   temporalColTotals?: { [sourceId: string]: { [metricLabel: string]: number } };
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
   isSelectionMode?: boolean;
   selectedItems?: any[];
   handleDrilldown?: (rowKeys: string[], colLabel: string, value: any, metricLabel: string) => void;
   handleTemporalDrilldown?: (result: any, sourceId: string, metricLabel: string) => void;
}

export const PivotFooter: React.FC<PivotFooterProps> = ({
   pivotData, temporalColTotals, temporalConfig, rowFields, columnWidths, footerRef, valField, aggType, metrics, primaryDataset, datasets, valFormatting, showTotalCol, showVariations = false, styleRules = [], conditionalRules = [],
   isSelectionMode = false, selectedItems = [], handleDrilldown, handleTemporalDrilldown
}) => {
   const getColWidth = (id: string, isRowField: boolean = false) => {
      return columnWidths[id] || (isRowField ? 150 : 120);
   };

   const effectiveMetrics = React.useMemo<PivotMetric[]>(() => {
      if (metrics && metrics.length > 0) return metrics;
      if (valField) return [{ field: valField, aggType: aggType as AggregationType }];
      return [];
   }, [metrics, valField, aggType]);

   // BOLT OPTIMIZATION: Memoized metric info lookup to avoid repetitive string parsing and metadata lookups
   const metricInfoCache = React.useMemo(() => {
      const cache = new Map<string, any>();
      const headers = pivotData?.colHeaders || [];

      headers.forEach(col => {
         if (col.includes('\x1F')) {
            const parts = col.split('\x1F');
            let metricLabel = parts[1].trim();
            const isDiff = metricLabel.endsWith('_DIFF');
            const isPct = metricLabel.endsWith('_PCT');

            if (isDiff) metricLabel = metricLabel.replace('_DIFF', '');
            if (isPct) metricLabel = metricLabel.replace('_PCT', '');

            const metric = effectiveMetrics.find(m => (m.label || `${m.field} (${m.aggType})`) === metricLabel);
            cache.set(col, { metric, isDiff, isPct });
            return;
         }

         const isDiff = col.endsWith('_DIFF');
         const isPct = col.endsWith('_PCT');
         let baseCol = col;
         if (isDiff) baseCol = col.replace('_DIFF', '');
         if (isPct) baseCol = col.replace('_PCT', '');

         const directMetric = effectiveMetrics.find(m => (m.label || `${m.field} (${m.aggType})`) === baseCol);
         if (directMetric) {
            cache.set(col, { metric: directMetric, isDiff, isPct });
         } else {
            cache.set(col, { metric: effectiveMetrics[0], isDiff, isPct });
         }
      });
      return cache;
   }, [pivotData?.colHeaders, effectiveMetrics]);

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
      const map = new Map<string, any>();
      (effectiveMetrics || []).forEach(m => {
         const label = m.label || `${m.field} (${m.aggType})`;
         map.set(label, m);
      });
      return map;
   }, [effectiveMetrics]);

   const getCellFormatting = (col: string, value: any, metricLabel: string) => {
      return getCellStyle([], col, value, metricLabel, styleRules, conditionalRules, 'grandTotal');
   };

   const formatOutput = (val: string | number, metric?: any, isDelta: boolean = false) => {
      const field = metric?.field || valField;
      const type = metric?.aggType || aggType;
      return formatPivotOutput(val, field, type, primaryDataset, undefined, datasets, metric?.formatting || valFormatting, isDelta);
   };

   const isItemSelected = (rowKeys: string[], colLabel: string) => {
      if (!selectedItems || selectedItems.length === 0) return false;
      return selectedItems.some(item =>
         item.colLabel === colLabel &&
         item.rowPath.length === rowKeys.length &&
         item.rowPath.every((k: string, i: number) => k === rowKeys[i])
      );
   };

   if (!pivotData && !temporalColTotals) return null;

   if (temporalColTotals && temporalConfig) {
      return (
         <div ref={footerRef} className="border-t-2 border-slate-300 bg-slate-100 shadow-inner overflow-x-hidden flex-shrink-0">
            <table className="min-w-max divide-y divide-slate-200 border-collapse" style={{ tableLayout: 'fixed' }}>
               <tbody className="font-bold">
                  <tr>
                     {(rowFields || []).map((field, idx) => (
                        <td
                           key={idx}
                           className="px-2 py-2 text-right text-xs uppercase text-slate-500 border-r border-slate-200 bg-slate-50 sticky left-0 z-10 truncate"
                           style={{
                              left: `${groupFieldLeftPositions[idx]}px`,
                              width: `${columnWidths[`group_${field}`] || 150}px`,
                              minWidth: `${columnWidths[`group_${field}`] || 150}px`,
                              maxWidth: `${columnWidths[`group_${field}`] || 150}px`
                           }}
                        >
                           {idx === rowFields.length - 1 ? 'Total' : ''}
                        </td>
                     ))}
                     {(effectiveMetrics).map((metric) => {
                        const mLabel = metric.label || `${metric.field} (${metric.aggType})`;
                        return (
                           <React.Fragment key={mLabel}>
                              {(temporalConfig?.sources || []).map((source: any) => {
                                 const val = temporalColTotals[source.id]?.[mLabel] || 0;
                                 const colKey = `${source.id}_${mLabel}`;
                                 const customStyle = getCellStyle([], colKey, val, mLabel, styleRules, conditionalRules, 'grandTotal');

                                 const referenceTotal = temporalColTotals[temporalConfig.referenceSourceId]?.[mLabel] || 0;
                                 const deltaValue = val - referenceTotal;
                                 const deltaPercentage = referenceTotal !== 0 ? (deltaValue / referenceTotal) * 100 : (val !== 0 ? 100 : 0);

                                 const displayLabel = effectiveMetrics.length > 1 ? `${source.label} - ${mLabel}` : source.label;
                                 const isSelected = isSelectionMode && isItemSelected([], displayLabel);

                                 return (
                                    <React.Fragment key={source.id}>
                                       <td
                                          className={`px-2 py-2 text-right text-xs text-slate-700 border-r border-slate-200 truncate cursor-pointer transition-all ${isSelectionMode ? (isSelected ? 'bg-brand-100 ring-1 ring-brand-400' : 'hover:bg-brand-50 hover:ring-1 hover:ring-brand-300') : 'hover:bg-blue-100'}`}
                                          style={{
                                             ...customStyle,
                                             width: `${columnWidths[colKey] || 120}px`,
                                             minWidth: `${columnWidths[colKey] || 120}px`,
                                             maxWidth: `${columnWidths[colKey] || 120}px`
                                          }}
                                          onClick={() => {
                                             if (isSelectionMode && handleDrilldown) {
                                                handleDrilldown([], displayLabel, val, mLabel);
                                             } else if (handleTemporalDrilldown) {
                                                handleTemporalDrilldown({ values: temporalColTotals, groupLabel: 'Total', groupKey: 'total', deltas: {} }, source.id, mLabel);
                                             }
                                          }}
                                       >
                                          {formatOutput(val, metric)}
                                       </td>
                                       {showVariations && source.id !== temporalConfig.referenceSourceId && (
                                          <td
                                             className={`px-2 py-2 text-right text-xs font-bold border-r border-slate-200 truncate ${deltaValue > 0 ? 'text-green-600' : deltaValue < 0 ? 'text-red-600' : 'text-slate-400'}`}
                                             style={{ width: 60, minWidth: 60, maxWidth: 60 }}
                                          >
                                             {temporalConfig.deltaFormat === 'percentage'
                                                ? (deltaPercentage !== 0 ? formatPercentage(deltaPercentage) : '-')
                                                : (deltaValue !== 0 ? formatOutput(deltaValue, metric, true) : '-')}
                                          </td>
                                       )}
                                    </React.Fragment>
                                 );
                              })}
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
         <table className="min-w-max divide-y divide-slate-200 border-collapse" style={{ tableLayout: 'fixed' }}>
            <tbody className="font-bold">
               <tr>
                  {(rowFields || []).map((field, idx) => (
                     <td
                        key={idx}
                        className="px-2 py-2 text-right text-xs uppercase text-slate-500 border-r border-slate-200 bg-slate-50 sticky left-0 z-10 truncate"
                        style={{
                           left: `${rowFieldLeftPositions[idx]}px`,
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
                     const { metric, isDiff, isPct } = metricInfoCache.get(col) || {};
                     const metricLabel = metric?.label || (metric?.field ? `${metric.field} (${metric.aggType})` : '');
                     const customStyle = getCellFormatting(col, val, metricLabel);

                     let formatted = formatOutput(val, metric, isDiff);
                     if (isPct) formatted = val ? `${Number(val).toFixed(1)}%` : '-';
                     const isSelected = isSelectionMode && isItemSelected([], col);

                     return (
                        <td
                           key={col}
                           className={`px-2 py-2 text-right text-xs text-slate-700 border-r border-slate-200 truncate cursor-pointer transition-all ${isSelectionMode ? (isSelected ? 'bg-brand-100 ring-1 ring-brand-400' : 'hover:bg-brand-50 hover:ring-1 hover:ring-brand-300') : 'hover:bg-blue-100'}`}
                           style={{
                              ...customStyle,
                              width: `${getColWidth(col)}px`,
                              minWidth: `${getColWidth(col)}px`,
                              maxWidth: `${getColWidth(col)}px`
                           }}
                           onClick={() => handleDrilldown && handleDrilldown([], col, val, metricLabel)}
                        >
                           {formatted}
                        </td>
                     );
                  })}
                  {showTotalCol && pivotData && effectiveMetrics.length > 0 && (
                     <td
                        className={`px-2 py-2 text-right bg-slate-200 border-l border-slate-300 truncate cursor-pointer transition-all ${isSelectionMode ? (isItemSelected([], 'Total') ? 'bg-blue-100 ring-1 ring-blue-400' : 'bg-slate-50 hover:bg-blue-50 hover:ring-1 hover:ring-blue-300') : 'bg-slate-50 hover:bg-blue-100'}`}
                        style={{
                           ...getCellFormatting('Total', typeof pivotData.grandTotal === 'object' ? Object.values(pivotData.grandTotal)[0] : pivotData.grandTotal, ''),
                           width: `${getColWidth('Grand Total', true)}px`,
                           minWidth: `${getColWidth('Grand Total', true)}px`,
                           maxWidth: `${getColWidth('Grand Total', true)}px`
                        }}
                        onClick={() => {
                           const value = typeof pivotData.grandTotal === 'object' ? Object.values(pivotData.grandTotal)[0] : pivotData.grandTotal;
                           handleDrilldown && handleDrilldown([], 'Total', value, '');
                        }}
                     >
                        {typeof pivotData.grandTotal === 'object' ? (
                           <div className="flex flex-col gap-0.5">
                              {Object.entries(pivotData.grandTotal).map(([label, v], idx) => {
                                 const metric = metricLabelMap.get(label);
                                 const metricStyle = getCellStyle([], 'Total', v, label, styleRules, conditionalRules, 'grandTotal');
                                 return (
                                    <div key={idx} className="text-xs whitespace-nowrap" style={metricStyle}>
                                       <span className="text-slate-500 font-medium mr-1">{label}:</span>
                                       <span className="font-bold text-black">{formatOutput(v, metric)}</span>
                                    </div>
                                 );
                              })}
                           </div>
                        ) : (
                           <span className="text-xs text-black">{formatOutput(pivotData.grandTotal, effectiveMetrics[0])}</span>
                        )}
                     </td>
                  )}
               </tr>
            </tbody>
         </table>
      </div>
   );
};
