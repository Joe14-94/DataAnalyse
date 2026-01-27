
import React from 'react';
import { Dataset, PivotResult } from '../../types';
import { formatPivotOutput } from '../../logic/pivotEngine';

interface PivotFooterProps {
   pivotData: PivotResult | null;
   rowFields: string[];
   footerRef: React.RefObject<HTMLDivElement>;
   valField: string;
   aggType: string;
   primaryDataset: Dataset | null;
   datasets: Dataset[];
   valFormatting: any;
   showTotalCol: boolean;
}

export const PivotFooter: React.FC<PivotFooterProps> = ({
   pivotData, rowFields, footerRef, valField, aggType, primaryDataset, datasets, valFormatting, showTotalCol
}) => {
   if (!pivotData) return null;

   const formatOutput = (val: string | number) => formatPivotOutput(val, valField, aggType, primaryDataset, undefined, datasets, valFormatting);

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
                     const isPct = col.endsWith('_PCT');
                     const val = pivotData.colTotals[col];
                     let formatted = formatOutput(val);
                     if (isPct) formatted = val ? `${Number(val).toFixed(1)}%` : '-';
                     return <td key={col} className="px-2 py-2 text-right text-xs text-slate-700 border-r border-slate-200">{formatted}</td>;
                  })}
                  {showTotalCol && <td className="px-2 py-2 text-right text-xs text-black bg-slate-200 border-l border-slate-300">{formatOutput(pivotData.grandTotal)}</td>}
               </tr>
            </tbody>
         </table>
      </div>
   );
};
