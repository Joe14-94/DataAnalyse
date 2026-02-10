import React from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, Cell,
    PieChart, Pie, AreaChart, Area, Treemap, LineChart, Line, ComposedChart,
    RadialBarChart, RadialBar, FunnelChart, Funnel, LabelList
} from 'recharts';
import { Table as TableIcon, Activity, BarChart3 } from 'lucide-react';
import { AnalysisMode, ChartType } from '../../hooks/useAnalysisStudioLogic';
import { TreemapContent } from './AnalysisStudioComponents';
import { formatChartValue } from '../../logic/pivotToChart';
import { PivotConfig } from '../../types';

interface SnapshotAggregationItem {
    name: string;
    value: number;
    value2: number;
    size: number;
    cumulative?: number;
    [key: string]: number | string | undefined;
}

interface TrendTimePoint {
    date: string;
    displayDate: string;
    total: number | null;
    total2: number;
    forecast?: number;
    [key: string]: number | string | null | undefined;
}

interface AnalysisStudioMainProps {
    mode: AnalysisMode;
    dimension: string;
    metric: string;
    valueField: string;
    metric2: string;
    valueField2: string;
    segment: string;
    chartType: ChartType;
    isCumulative: boolean;
    showTable: boolean;
    showForecast: boolean;
    snapshotData: {
        data: SnapshotAggregationItem[];
        series: string[];
    };
    trendData: {
        data: TrendTimePoint[];
        series: string[];
    };
    chartColors: string[];
    customUnit: string;
    chartTitle: string;
    insightText: string;
}

export const AnalysisStudioMain: React.FC<AnalysisStudioMainProps> = ({
    mode, dimension, metric, valueField, metric2, valueField2, segment, chartType,
    isCumulative, showTable, showForecast, snapshotData, trendData, chartColors,
    customUnit, chartTitle, insightText
}) => {
    const commonPivotConfig = { valFormatting: { unit: customUnit } } as unknown as PivotConfig;

    const tooltipStyle = {
        backgroundColor: '#ffffff',
        borderRadius: '6px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
        color: '#334155',
        fontSize: '12px',
        padding: '8px'
    };

    const renderVisuals = () => {
        const data = mode === 'snapshot' ? snapshotData.data : trendData.data;
        if (!data || data.length === 0) return <div className="flex items-center justify-center h-full text-slate-400 italic">Aucune donnée disponible</div>;

        if (showTable) {
            if (mode === 'snapshot') {
                return (
                    <div className="h-full overflow-auto w-full custom-scrollbar">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50 sticky top-0">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase">{dimension}</th>
                                    <th className="px-4 py-2 text-right text-xs font-bold text-slate-500 uppercase">Valeur</th>
                                    {metric2 !== 'none' && <th className="px-4 py-2 text-right text-xs font-bold text-indigo-500 uppercase">Valeur 2</th>}
                                    {isCumulative && <th className="px-4 py-2 text-right text-xs font-bold text-slate-500 uppercase">Cumul</th>}
                                    {snapshotData.series.map((s: string) => <th key={s} className="px-4 py-2 text-right text-xs font-bold text-slate-400 uppercase">{s}</th>)}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {snapshotData.data.map((row, idx: number) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                        <td className="px-4 py-2 text-sm text-slate-700 font-medium">{row.name}</td>
                                        <td className="px-4 py-2 text-sm text-slate-900 text-right font-bold">{row.value.toLocaleString()}</td>
                                        {metric2 !== 'none' && <td className="px-4 py-2 text-sm text-indigo-600 text-right font-bold">{row.value2?.toLocaleString()}</td>}
                                        {isCumulative && <td className="px-4 py-2 text-sm text-slate-500 text-right">{row.cumulative?.toLocaleString()}</td>}
                                        {snapshotData.series.map((s: string) => <td key={s} className="px-4 py-2 text-xs text-slate-500 text-right">{row[s]?.toLocaleString()}</td>)}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            } else {
                return (
                    <div className="h-full overflow-auto w-full custom-scrollbar">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50 sticky top-0">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase">Date</th>
                                    <th className="px-4 py-2 text-right text-xs font-bold text-slate-500 uppercase">Total</th>
                                    {metric2 !== 'none' && <th className="px-4 py-2 text-right text-xs font-bold text-indigo-500 uppercase">Total 2</th>}
                                    {showForecast && <th className="px-4 py-2 text-right text-xs font-bold text-indigo-500 uppercase">Prévision</th>}
                                    {trendData.series.map((s: string) => <th key={s} className="px-4 py-2 text-right text-xs font-bold text-slate-500 uppercase">{s}</th>)}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {trendData.data.map((row, idx: number) => (
                                    <tr key={idx} className={`hover:bg-slate-50 ${row.date === 'prediction' ? 'bg-indigo-50/50 italic' : ''}`}>
                                        <td className="px-4 py-2 text-sm text-slate-700 font-medium">{row.displayDate}</td>
                                        <td className="px-4 py-2 text-sm text-slate-900 text-right font-bold">{row.total !== null ? row.total.toLocaleString() : '-'}</td>
                                        {metric2 !== 'none' && <td className="px-4 py-2 text-sm text-indigo-600 text-right font-bold">{row.total2?.toLocaleString()}</td>}
                                        {showForecast && <td className="px-4 py-2 text-sm text-indigo-600 text-right font-bold">{row.forecast?.toLocaleString()}</td>}
                                        {trendData.series.map((s: string) => <td key={s} className="px-4 py-2 text-xs text-slate-500 text-right">{row[s]?.toLocaleString()}</td>)}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
            }
        }

        if (mode === 'trend') {
            const isStacked = chartType === 'stacked-area' || chartType === 'stacked-column' || chartType === 'percent-column';
            const isPercent = chartType === 'percent-column';
            const isBar = chartType === 'column' || chartType === 'stacked-column' || chartType === 'percent-column';

            return (
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={trendData.data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }} stackOffset={isPercent ? 'expand' : undefined}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="displayDate" stroke="#94a3b8" fontSize={12} />
                        <YAxis yAxisId="left" stroke="#94a3b8" fontSize={12} tickFormatter={isPercent ? (val) => `${(val * 100).toFixed(0)}%` : undefined} />
                        {metric2 !== 'none' && !isStacked && <YAxis yAxisId="right" orientation="right" stroke="#6366f1" fontSize={12} />}
                        <Tooltip contentStyle={tooltipStyle} formatter={(val: any) => isPercent ? `${(Number(val) * 100).toFixed(1)}%` : formatChartValue(Number(val), commonPivotConfig)} />
                        <Legend verticalAlign="top" iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#64748b' }} />

                        {trendData.series.map((s: string, idx: number) => {
                            if (isBar) {
                                return <Bar key={s} yAxisId="left" dataKey={s} name={s} stackId={isStacked ? 'a' : undefined} fill={chartColors[idx % chartColors.length]} radius={!isStacked ? [4, 4, 0, 0] : 0} />;
                            } else if (chartType === 'area' || chartType === 'stacked-area') {
                                return <Area key={s} yAxisId="left" type="monotone" dataKey={s} name={s} stackId={isStacked ? 'a' : undefined} stroke={chartColors[idx % chartColors.length]} fill={chartColors[idx % chartColors.length]} fillOpacity={0.4} />;
                            } else {
                                return <Line yAxisId="left" key={s} type="monotone" dataKey={s} stroke={chartColors[idx % chartColors.length]} strokeWidth={2} dot={true} />;
                            }
                        })}

                        {metric2 !== 'none' && !isStacked && (
                            <Line yAxisId="right" type="monotone" dataKey="total2" name={metric2 === 'sum' ? `Total ${valueField2}` : 'Total (2)'} stroke="#6366f1" strokeWidth={3} strokeDasharray="3 3" dot={false} />
                        )}
                        {showForecast && !isPercent && (
                            <Line yAxisId="left" type="monotone" dataKey="forecast" name="Tendance (Reg. Lin.)" stroke="#6366f1" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                        )}
                    </ComposedChart>
                </ResponsiveContainer>
            );
        }

        switch (chartType) {
            case 'column':
            case 'stacked-column':
            case 'percent-column': {
                const isStacked = chartType === 'stacked-column' || chartType === 'percent-column';
                const isPercent = chartType === 'percent-column';
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={snapshotData.data} margin={{ top: 20, right: 10, left: 0, bottom: 0 }} stackOffset={isPercent ? 'expand' : undefined}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} fontSize={11} height={60} stroke="#94a3b8" />
                            <YAxis yAxisId="left" stroke="#94a3b8" fontSize={12} tickFormatter={isPercent ? (val) => `${(val * 100).toFixed(0)}%` : undefined} />
                            {metric2 !== 'none' && !isStacked && <YAxis yAxisId="right" orientation="right" stroke="#6366f1" fontSize={12} />}
                            <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={tooltipStyle} formatter={(val: any) => isPercent ? `${(Number(val) * 100).toFixed(1)}%` : formatChartValue(Number(val), commonPivotConfig)} />

                            {segment ? (
                                snapshotData.series.map((s: string, idx: number) => (
                                    <Bar key={s} yAxisId="left" dataKey={s} name={s} stackId={isStacked ? 'a' : undefined} fill={chartColors[idx % chartColors.length]} radius={!isStacked ? [4, 4, 0, 0] : 0} />
                                ))
                            ) : (
                                <Bar yAxisId="left" dataKey="value" name={metric === 'sum' ? `Somme (${valueField})` : (metric === 'distinct' ? 'Distinct' : 'Nombre')} radius={[4, 4, 0, 0]}>
                                    {snapshotData.data.map((_, index: number) => (
                                        <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                                    ))}
                                </Bar>
                            )}

                            {metric2 !== 'none' && !isStacked && (
                                <Line yAxisId="right" type="monotone" dataKey="value2" name={metric2 === 'sum' ? `Somme (${valueField2})` : (metric2 === 'distinct' ? 'Distinct (2)' : 'Nombre (2)')} stroke="#6366f1" strokeWidth={3} dot={{ r: 4, fill: '#6366f1' }} />
                            )}
                            {(metric2 !== 'none' || segment) && <Legend verticalAlign="top" />}
                        </ComposedChart>
                    </ResponsiveContainer>
                );
            }
            case 'bar':
            case 'stacked-bar':
            case 'percent-bar': {
                const isStacked = chartType === 'stacked-bar' || chartType === 'percent-bar';
                const isPercent = chartType === 'percent-bar';
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={snapshotData.data} layout="vertical" margin={{ top: 20, right: 30, left: 10, bottom: 5 }} stackOffset={isPercent ? 'expand' : undefined}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                            <XAxis type="number" stroke="#94a3b8" fontSize={12} tickFormatter={isPercent ? (val) => `${(val * 100).toFixed(0)}%` : undefined} />
                            <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                            <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={tooltipStyle} formatter={(val: any) => isPercent ? `${(Number(val) * 100).toFixed(1)}%` : formatChartValue(Number(val), commonPivotConfig)} />

                            {segment ? (
                                snapshotData.series.map((s: string, idx: number) => (
                                    <Bar key={s} dataKey={s} name={s} stackId={isStacked ? 'a' : undefined} fill={chartColors[idx % chartColors.length]} radius={!isStacked ? [0, 4, 4, 0] : 0} />
                                ))
                            ) : (
                                <Bar dataKey="value" name={metric === 'sum' ? 'Somme' : 'Volume'} radius={[0, 4, 4, 0]}>
                                    {snapshotData.data.map((_, index: number) => (
                                        <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                                    ))}
                                </Bar>
                            )}
                            {(metric2 !== 'none' || segment) && <Legend verticalAlign="top" />}
                        </BarChart>
                    </ResponsiveContainer>
                );
            }
            case 'pie':
            case 'donut':
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={snapshotData.data}
                                cx="50%"
                                cy="50%"
                                innerRadius={chartType === 'donut' ? 60 : 0}
                                outerRadius={100}
                                paddingAngle={2}
                                dataKey="value"
                                stroke="#fff"
                                strokeWidth={2}
                                label={({ name, percent }: { name: string; percent: number }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                            >
                                {snapshotData.data.map((_, index: number) => (
                                    <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={tooltipStyle} formatter={(val: number | string) => formatChartValue(Number(val), commonPivotConfig)} />
                            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px', color: '#64748b' }} />
                        </PieChart>
                    </ResponsiveContainer>
                );
            case 'area':
            case 'stacked-area': {
                const isStacked = chartType === 'stacked-area';
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={snapshotData.data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                            <YAxis stroke="#94a3b8" fontSize={12} />
                            <Tooltip contentStyle={tooltipStyle} formatter={(val: number | string) => formatChartValue(Number(val), commonPivotConfig)} />
                            {segment ? (
                                snapshotData.series.map((s: string, idx: number) => (
                                    <Area key={s} type="monotone" dataKey={s} name={s} stackId={isStacked ? 'a' : undefined} stroke={chartColors[idx % chartColors.length]} fill={chartColors[idx % chartColors.length]} fillOpacity={0.4} />
                                ))
                            ) : (
                                <Area type="monotone" dataKey={isCumulative ? "cumulative" : "value"} stroke="#60a5fa" fill="#60a5fa" fillOpacity={0.2} />
                            )}
                            {segment && <Legend verticalAlign="top" />}
                        </AreaChart>
                    </ResponsiveContainer>
                );
            }
            case 'radar':
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={snapshotData.data}>
                            <PolarGrid stroke="#e2e8f0" />
                            <PolarAngleAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                            <PolarRadiusAxis stroke="#cbd5e1" />
                            {segment ? (
                                snapshotData.series.map((s: string, idx: number) => (
                                    <Radar key={s} name={s} dataKey={s} stroke={chartColors[idx % chartColors.length]} fill={chartColors[idx % chartColors.length]} fillOpacity={0.4} />
                                ))
                            ) : (
                                <Radar name={metric === 'sum' ? 'Somme' : 'Volume'} dataKey="value" stroke="#60a5fa" fill="#60a5fa" fillOpacity={0.3} />
                            )}
                            <Tooltip contentStyle={tooltipStyle} formatter={(val: number | string) => formatChartValue(Number(val), commonPivotConfig)} />
                            {segment && <Legend verticalAlign="top" />}
                        </RadarChart>
                    </ResponsiveContainer>
                );
            case 'treemap':
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <Treemap
                            data={snapshotData.data}
                            dataKey="size"
                            aspectRatio={4 / 3}
                            stroke="#fff"
                            fill="#8884d8"
                            content={<TreemapContent colors={chartColors} />}
                        >
                            <Tooltip contentStyle={tooltipStyle} formatter={(val: number | string) => formatChartValue(Number(val), commonPivotConfig)} />
                        </Treemap>
                    </ResponsiveContainer>
                );
            case 'sunburst':
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={snapshotData.data}
                                dataKey="value"
                                cx="50%"
                                cy="50%"
                                innerRadius={0}
                                outerRadius={60}
                                fill="#8884d8"
                            >
                                {snapshotData.data.map((_, index: number) => (
                                    <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                                ))}
                            </Pie>
                            {segment && (
                                <Pie
                                    data={snapshotData.data.flatMap((d) => snapshotData.series.map((s: string) => ({ name: `${d.name} - ${s}`, value: Number(d[s]) || 0, parentColor: chartColors[snapshotData.data.indexOf(d) % chartColors.length] })))}
                                    dataKey="value"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={100}
                                >
                                    {snapshotData.data.flatMap((_, idx: number) => snapshotData.series.map((s: string, sIdx: number) => (
                                        <Cell key={`cell-outer-${idx}-${sIdx}`} fill={chartColors[sIdx % chartColors.length]} />
                                    )))}
                                </Pie>
                            )}
                            <Tooltip contentStyle={tooltipStyle} />
                        </PieChart>
                    </ResponsiveContainer>
                );
            case 'radial':
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <RadialBarChart cx="50%" cy="50%" innerRadius="10%" outerRadius="80%" barSize={10} data={snapshotData.data}>
                            <RadialBar
                                label={{ position: 'insideStart', fill: '#64748b', fontSize: 10 }}
                                background
                                dataKey="value"
                            >
                                {snapshotData.data.map((_, index: number) => (
                                    <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                                ))}
                            </RadialBar>
                            <Tooltip contentStyle={tooltipStyle} formatter={(val: number | string) => formatChartValue(Number(val), commonPivotConfig)} />
                            <Legend iconSize={10} layout="vertical" verticalAlign="middle" wrapperStyle={{ right: 0, top: 0, bottom: 0, width: 140 }} />
                        </RadialBarChart>
                    </ResponsiveContainer>
                );
            case 'funnel':
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <FunnelChart>
                            <Tooltip contentStyle={tooltipStyle} formatter={(val: number | string) => formatChartValue(Number(val), commonPivotConfig)} />
                            <Funnel
                                dataKey="value"
                                data={snapshotData.data}
                                isAnimationActive
                            >
                                <LabelList position="right" fill="#64748b" stroke="none" dataKey="name" fontSize={11} />
                                {snapshotData.data.map((_, index: number) => (
                                    <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                                ))}
                            </Funnel>
                        </FunnelChart>
                    </ResponsiveContainer>
                );
            case 'kpi':
                return (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto h-full p-2">
                        {snapshotData.data.map((item, idx: number) => (
                            <div key={idx} className="bg-slate-50 rounded-lg p-4 border border-slate-100 flex flex-col items-center justify-center text-center">
                                <div className="text-xs text-slate-500 uppercase font-bold truncate w-full mb-2" title={item.name}>{item.name}</div>
                                <div className="text-2xl font-bold text-slate-700">{item.value.toLocaleString()}</div>
                                {isCumulative && item.cumulative !== undefined && <div className="text-xs text-slate-400 mt-1">Cumul: {item.cumulative.toLocaleString()}</div>}
                            </div>
                        ))}
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="flex-1 flex flex-col gap-4 min-w-0 min-h-0">
            <div className="bg-white border border-slate-200 rounded-lg p-3 flex items-start gap-3 shrink-0 shadow-sm">
                <div className="bg-slate-100 p-1.5 rounded-full text-slate-500 mt-0.5">
                    <Activity className="w-4 h-4" />
                </div>
                <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Insight</h4>
                    <p className="text-sm text-slate-600 leading-relaxed">{insightText}</p>
                </div>
            </div>

            <div id="analytics-export-container" className="flex-1 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col relative overflow-hidden min-h-[300px]">
                <div className="p-4 border-b border-slate-100 text-center bg-white z-10 flex justify-between items-center">
                    <h3 className="text-base font-bold text-slate-700 flex items-center gap-2">
                        {showTable ? <TableIcon className="w-4 h-4" /> : (mode === 'trend' ? <Activity className="w-4 h-4" /> : <BarChart3 className="w-4 h-4" />)}
                        {chartTitle ? (
                            <span>{chartTitle}</span>
                        ) : (
                            mode === 'snapshot' ? (
                                <span>Analyse : {dimension} <span className="text-slate-400">|</span> {metric === 'sum' ? `Somme de ${valueField}` : 'Nombre'} {metric2 !== 'none' && <span className="text-brand-600">& {metric2 === 'sum' ? `Somme de ${valueField2}` : 'Nombre (2)'}</span>}</span>
                            ) : (
                                <span>Évolution : {dimension} <span className="text-slate-400">|</span> {metric === 'sum' ? `Somme de ${valueField}` : 'Nombre'} {metric2 !== 'none' && <span className="text-brand-600">& {metric2 === 'sum' ? `Somme de ${valueField2}` : 'Nombre (2)'}</span>}</span>
                            )
                        )}
                    </h3>
                    {(segment && mode === 'snapshot') ? (
                        <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500">par {segment}</span>
                    ) : customUnit ? (
                        <span className="text-xs bg-brand-50 text-brand-600 px-2 py-1 rounded font-bold uppercase">{customUnit}</span>
                    ) : null}
                </div>

                <div className="flex-1 w-full min-h-0 p-4 relative">
                    {renderVisuals()}
                </div>
            </div>
        </div>
    );
};
