import React from 'react';
import { SnapshotData, TrendData } from '../../hooks/useAnalysisStudioLogic';

interface AnalysisTableDisplayProps {
  mode: 'snapshot' | 'trend';
  snapshotData: SnapshotData;
  trendData: TrendData;
  dimension: string;
  metric2: string;
  isCumulative: boolean;
  showForecast: boolean;
}

export const AnalysisTableDisplay: React.FC<AnalysisTableDisplayProps> = ({
  mode,
  snapshotData,
  trendData,
  dimension,
  metric2,
  isCumulative,
  showForecast
}) => {
  if (mode === 'snapshot') {
    return (
      <div className="h-full overflow-auto w-full custom-scrollbar">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50 sticky top-0">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase">
                {dimension}
              </th>
              <th className="px-4 py-2 text-right text-xs font-bold text-slate-500 uppercase">
                Valeur
              </th>
              {metric2 !== 'none' && (
                <th className="px-4 py-2 text-right text-xs font-bold text-indigo-500 uppercase">
                  Valeur 2
                </th>
              )}
              {isCumulative && (
                <th className="px-4 py-2 text-right text-xs font-bold text-slate-500 uppercase">
                  Cumul
                </th>
              )}
              {snapshotData.series.map((s: string) => (
                <th
                  key={s}
                  className="px-4 py-2 text-right text-xs font-bold text-slate-400 uppercase"
                >
                  {s}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {snapshotData.data.map((row: any, idx: number) => (
              <tr key={idx} className="hover:bg-slate-50">
                <td className="px-4 py-2 text-sm text-slate-700 font-medium">{row.name}</td>
                <td className="px-4 py-2 text-sm text-slate-900 text-right font-bold">
                  {row.value.toLocaleString()}
                </td>
                {metric2 !== 'none' && (
                  <td className="px-4 py-2 text-sm text-indigo-600 text-right font-bold">
                    {row.value2?.toLocaleString()}
                  </td>
                )}
                {isCumulative && (
                  <td className="px-4 py-2 text-sm text-slate-500 text-right">
                    {row.cumulative.toLocaleString()}
                  </td>
                )}
                {snapshotData.series.map((s: string) => (
                  <td key={s} className="px-4 py-2 text-xs text-slate-500 text-right">
                    {row[s]?.toLocaleString()}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  } else {
    return (
      <div className="h-full overflow-auto w-full custom-scrollbar">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50 sticky top-0">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase">
                Date
              </th>
              <th className="px-4 py-2 text-right text-xs font-bold text-slate-500 uppercase">
                Total
              </th>
              {metric2 !== 'none' && (
                <th className="px-4 py-2 text-right text-xs font-bold text-indigo-500 uppercase">
                  Total 2
                </th>
              )}
              {showForecast && (
                <th className="px-4 py-2 text-right text-xs font-bold text-indigo-500 uppercase">
                  Prévision
                </th>
              )}
              {trendData.series.map((s: string) => (
                <th
                  key={s}
                  className="px-4 py-2 text-right text-xs font-bold text-slate-500 uppercase"
                >
                  {s}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {trendData.data.map((row: any, idx: number) => (
              <tr
                key={idx}
                className={`hover:bg-slate-50 ${row.date === 'prediction' ? 'bg-indigo-50/50 italic' : ''}`}
              >
                <td className="px-4 py-2 text-sm text-slate-700 font-medium">{row.displayDate}</td>
                <td className="px-4 py-2 text-sm text-slate-900 text-right font-bold">
                  {row.total !== null ? row.total.toLocaleString() : '-'}
                </td>
                {metric2 !== 'none' && (
                  <td className="px-4 py-2 text-sm text-indigo-600 text-right font-bold">
                    {row.total2?.toLocaleString()}
                  </td>
                )}
                {showForecast && (
                  <td className="px-4 py-2 text-sm text-indigo-600 text-right font-bold">
                    {row.forecast?.toLocaleString()}
                  </td>
                )}
                {trendData.series.map((s: string) => (
                  <td key={s} className="px-4 py-2 text-xs text-slate-500 text-right">
                    {row[s]?.toLocaleString()}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
};
