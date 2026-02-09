import React from 'react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Cell, Treemap, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  LabelList
} from 'recharts';
import { Home, ChevronRight } from 'lucide-react';
import { TreemapContent } from '../../ui/TreemapContent';
import { SunburstD3 } from '../../charts/SunburstD3';
import { formatChartValue } from '../../../logic/pivotToChart';

interface ChartModalDisplayProps {
    selectedChartType: any;
    chartData: any[];
    metadata: any;
    colors: string[];
    pivotConfig: any;
    sunburstData: any;
    d3HierarchyData: any;
    sunburstColors: string[];
    sunburstTitle: string;
    showSunburstLegend: boolean;
    currentTreemapData: any[];
    treemapDrillPath: string[];
    onTreemapDrill: (name: string) => void;
    onTreemapBreadcrumb: (index: number) => void;
}

export const ChartModalDisplay: React.FC<ChartModalDisplayProps> = ({
    selectedChartType, chartData, metadata, colors, pivotConfig,
    sunburstData, d3HierarchyData, sunburstColors, sunburstTitle, showSunburstLegend,
    currentTreemapData, treemapDrillPath, onTreemapDrill, onTreemapBreadcrumb
}) => {
    const tooltipStyle = {
        backgroundColor: 'rgba(255, 255, 255, 0.96)',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '8px 12px',
        fontSize: '12px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload || !payload.length) return null;
        const title = label || payload[0].payload.name || '';
        return (
            <div style={tooltipStyle}>
                {title && <p className="font-semibold text-slate-800 mb-1">{title}</p>}
                {payload.map((entry: any, index: number) => (
                    <p key={index} style={{ color: entry.color }} className="text-xs">
                        {entry.name === 'value' || entry.name === 'size' ? 'Valeur' : entry.name}: <span className="font-bold">{formatChartValue(entry.value, pivotConfig)}</span>
                    </p>
                ))}
            </div>
        );
    };

    const TreemapTooltip = ({ active, payload }: any) => {
        if (!active || !payload || !payload.length) return null;
        const data = payload[0].payload;
        const path = data.path || (treemapDrillPath.length > 0 ? [...treemapDrillPath, data.name] : [data.name]);
        const value = data.value || data.size || 0;
        return (
            <div style={tooltipStyle}>
                <p className="font-semibold text-slate-800 mb-1 text-xs">{path.join(' > ')}</p>
                <p className="text-xs text-slate-700">Valeur: <span className="font-bold">{formatChartValue(value, pivotConfig)}</span></p>
                {data.children && <p className="text-xs text-brand-600 mt-1">Cliquer pour explorer</p>}
            </div>
        );
    };

    const renderChart = () => {
        const chartMargin = { top: 20, right: 30, left: 20, bottom: 60 };
        switch (selectedChartType) {
            case 'bar':
            case 'stacked-bar':
            case 'percent-bar': {
                const isStacked = selectedChartType === 'stacked-bar' || selectedChartType === 'percent-bar';
                const isPercent = selectedChartType === 'percent-bar';
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} layout="vertical" margin={{ ...chartMargin, left: 140 }} stackOffset={isPercent ? 'expand' : undefined}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                            <XAxis type="number" stroke="#94a3b8" fontSize={11} domain={isPercent ? [0, 1] : [0, 'auto']} tickFormatter={isPercent ? (val) => `${(val * 100).toFixed(0)}%` : undefined} />
                            <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 10 }} stroke="#94a3b8" />
                            <Tooltip content={<CustomTooltip />} />
                            {metadata.isMultiSeries || isStacked ? (
                                metadata.seriesNames.map((series: string, idx: number) => (
                                    <Bar key={series} dataKey={series} stackId={isStacked ? 'a' : undefined} fill={colors[idx % colors.length]} radius={!isStacked ? [0, 4, 4, 0] : 0}>
                                        {isStacked && <LabelList dataKey={series} position="center" formatter={(val: any) => val !== 0 ? formatChartValue(val, pivotConfig) : ''} style={{ fill: '#fff', fontSize: '10px', fontWeight: 'bold', pointerEvents: 'none' }} />}
                                    </Bar>
                                ))
                            ) : (
                                <Bar dataKey="value" fill={colors[0]} radius={[0, 4, 4, 0]}>
                                    {chartData.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                                    ))}
                                </Bar>
                            )}
                            {(metadata.isMultiSeries || isStacked) && <Legend wrapperStyle={{ fontSize: '11px' }} />}
                        </BarChart>
                    </ResponsiveContainer>
                );
            }
            case 'column':
            case 'stacked-column':
            case 'percent-column': {
                const isStacked = selectedChartType === 'stacked-column' || selectedChartType === 'percent-column';
                const isPercent = selectedChartType === 'percent-column';
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} layout="horizontal" margin={chartMargin} stackOffset={isPercent ? 'expand' : undefined}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} angle={-45} textAnchor="end" height={80} />
                            <YAxis stroke="#94a3b8" fontSize={11} domain={isPercent ? [0, 1] : [0, 'auto']} tickFormatter={isPercent ? (val) => `${(val * 100).toFixed(0)}%` : undefined} />
                            <Tooltip content={<CustomTooltip />} />
                            {metadata.isMultiSeries || isStacked ? (
                                metadata.seriesNames.map((series: string, idx: number) => (
                                    <Bar key={series} dataKey={series} stackId={isStacked ? 'a' : undefined} fill={colors[idx % colors.length]} radius={!isStacked ? [4, 4, 0, 0] : 0}>
                                        {isStacked && <LabelList dataKey={series} position="center" formatter={(val: any) => val !== 0 ? formatChartValue(val, pivotConfig) : ''} style={{ fill: '#fff', fontSize: '10px', fontWeight: 'bold', pointerEvents: 'none' }} />}
                                    </Bar>
                                ))
                            ) : (
                                <Bar dataKey="value" fill={colors[0]} radius={[4, 4, 0, 0]}>
                                    {chartData.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                                    ))}
                                </Bar>
                            )}
                            {(metadata.isMultiSeries || isStacked) && <Legend wrapperStyle={{ fontSize: '11px' }} />}
                        </BarChart>
                    </ResponsiveContainer>
                );
            }
            case 'line':
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={chartMargin}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} angle={-45} textAnchor="end" height={80} />
                            <YAxis stroke="#94a3b8" fontSize={11} />
                            <Tooltip content={<CustomTooltip />} />
                            {metadata.isMultiSeries ? (
                                <>
                                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                                    {metadata.seriesNames.map((series: string, idx: number) => (
                                        <Line key={series} type="monotone" dataKey={series} stroke={colors[idx]} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                                    ))}
                                </>
                            ) : (
                                <Line type="monotone" dataKey="value" stroke={colors[0]} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                            )}
                        </LineChart>
                    </ResponsiveContainer>
                );
            case 'area':
            case 'stacked-area':
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={chartMargin}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} angle={-45} textAnchor="end" height={80} />
                            <YAxis stroke="#94a3b8" fontSize={11} />
                            <Tooltip content={<CustomTooltip />} />
                            {metadata.isMultiSeries ? (
                                <>
                                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                                    {metadata.seriesNames.map((series: string, idx: number) => (
                                        <Area key={series} type="monotone" dataKey={series} stackId={selectedChartType === 'stacked-area' ? 'a' : undefined} stroke={colors[idx]} fill={colors[idx]} fillOpacity={0.6} />
                                    ))}
                                </>
                            ) : (
                                <Area type="monotone" dataKey="value" stroke={colors[0]} fill={colors[0]} fillOpacity={0.6} />
                            )}
                        </AreaChart>
                    </ResponsiveContainer>
                );
            case 'pie':
            case 'donut':
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData} cx="50%" cy="50%" innerRadius={selectedChartType === 'donut' ? '45%' : 0} outerRadius="75%" paddingAngle={2} dataKey="value" stroke="#fff" strokeWidth={2} labelLine={true}
                                label={({ name, percent }) => {
                                    const n = name || '';
                                    return `${n.length > 15 ? n.substring(0, 15) + '...' : n} (${(percent * 100).toFixed(0)}%)`;
                                }}
                            >
                                {chartData.map((entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '11px', bottom: 0 }} />
                        </PieChart>
                    </ResponsiveContainer>
                );
            case 'radar':
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={chartData}>
                            <PolarGrid stroke="#e2e8f0" />
                            <PolarAngleAxis dataKey="name" tick={{ fontSize: 10 }} />
                            <PolarRadiusAxis tick={{ fontSize: 10 }} />
                            <Tooltip content={<CustomTooltip />} />
                            {metadata.isMultiSeries ? (
                                <>
                                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                                    {metadata.seriesNames.map((series: string, idx: number) => (
                                        <Radar key={series} name={series} dataKey={series} stroke={colors[idx]} fill={colors[idx]} fillOpacity={0.6} />
                                    ))}
                                </>
                            ) : (
                                <Radar dataKey="value" stroke={colors[0]} fill={colors[0]} fillOpacity={0.6} />
                            )}
                        </RadarChart>
                    </ResponsiveContainer>
                );
            case 'sunburst':
                if (!sunburstData || !sunburstData.tree || sunburstData.tree.length === 0 || !d3HierarchyData) {
                    return <div className="flex items-center justify-center h-full text-slate-400">Aucune donnée hierarchique</div>;
                }
                return (
                    <div className="relative w-full h-full flex flex-col">
                        {showSunburstLegend && pivotConfig.rowFields.length > 0 && (
                            <div className="flex justify-center mb-2">
                                <div className="flex gap-4">
                                    <div className="text-xs font-bold text-slate-700 uppercase tracking-wide">Niveaux:</div>
                                    {pivotConfig.rowFields.map((field: string, idx: number) => (
                                        <div key={idx} className="flex items-center gap-1.5 text-xs">
                                            <div className="w-3 h-3 rounded-sm border border-slate-300" style={{ backgroundColor: sunburstColors[idx % sunburstColors.length] }} />
                                            <span className="text-slate-700 font-medium">{field}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="flex-1" style={{ minHeight: '500px' }}>
                            <SunburstD3 data={d3HierarchyData} width={800} height={800} unit={pivotConfig.valField || ''} title={sunburstTitle} rowFields={pivotConfig.rowFields} colors={sunburstColors} />
                        </div>
                    </div>
                );
            case 'treemap': {
                if (!currentTreemapData || currentTreemapData.length === 0) return <div className="flex items-center justify-center h-full text-slate-400">Aucune donnée</div>;
                const isHierarchical = currentTreemapData.some((d: any) => d.children && d.children.length > 0);
                return (
                    <div className="h-full flex flex-col">
                        {treemapDrillPath.length > 0 && (
                            <div className="flex items-center gap-1 mb-2 px-1 text-xs">
                                <button onClick={() => onTreemapBreadcrumb(0)} className="flex items-center gap-1 px-2 py-1 rounded hover:bg-brand-50 text-brand-600 font-medium transition-colors"><Home className="w-3 h-3" /> Racine</button>
                                {treemapDrillPath.map((segment, idx) => (
                                    <React.Fragment key={idx}>
                                        <ChevronRight className="w-3 h-3 text-slate-400" />
                                        <button onClick={() => onTreemapBreadcrumb(idx + 1)} className={`px-2 py-1 rounded transition-colors ${idx === treemapDrillPath.length - 1 ? 'bg-brand-100 text-brand-700 font-semibold' : 'hover:bg-brand-50 text-brand-600'}`}>{segment}</button>
                                    </React.Fragment>
                                ))}
                            </div>
                        )}
                        <div className="flex-1">
                            <ResponsiveContainer width="100%" height="100%">
                                <Treemap data={currentTreemapData} dataKey="size" aspectRatio={4 / 3} stroke="#fff" fill="#60a5fa" content={<TreemapContent colors={colors} onClick={isHierarchical ? onTreemapDrill : undefined} />}>
                                    <Tooltip content={isHierarchical ? <TreemapTooltip /> : <CustomTooltip />} />
                                </Treemap>
                            </ResponsiveContainer>
                        </div>
                    </div>
                );
            }
            default:
                return <div className="flex items-center justify-center h-full text-slate-400">Type de graphique non supporté</div>;
        }
    };

    const hasData = selectedChartType === 'sunburst'
        ? (sunburstData && sunburstData.rings.length > 0 && sunburstData.totalValue > 0)
        : selectedChartType === 'treemap'
            ? (currentTreemapData && currentTreemapData.length > 0)
            : (chartData && chartData.length > 0);

    if (!hasData) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <div className="text-slate-400 text-center">
                    <p className="text-lg font-semibold mb-2">Aucune donnée à afficher</p>
                    <p className="text-sm">Les données du pivot sont vides ou invalides.</p>
                </div>
            </div>
        );
    }

    return renderChart();
};
