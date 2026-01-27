
import React from 'react';
import {
   LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
   Legend, AreaChart, Area, BarChart, Bar, Cell, PieChart, Pie, RadialBarChart, RadialBar,
   Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Treemap, Funnel, FunnelChart, LabelList
} from 'recharts';
import { TrendingUp, Link as LinkIcon } from 'lucide-react';
import { DashboardWidget } from '../../types';
import { useWidgets } from '../../context/DataContext';
import { CHART_COLORS } from '../../utils/constants';
import { getChartColors, generateGradient } from '../../logic/pivotToChart';

export const TreemapContent = (props: any, colors: string[]) => {
   const { x, y, width, height, name, index } = props;
   return (
      <g>
         <rect x={x} y={y} width={width} height={height} fill={colors[index % colors.length]} stroke="#fff" />
         {width > 40 && height > 20 && (
            <text x={x + width / 2} y={y + height / 2} textAnchor="middle" fill="#fff" fontSize="0.8rem" dy={4} style={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
               {name.substring(0, 10)}
            </text>
         )}
      </g>
   );
};

interface WidgetDisplayProps {
   widget: DashboardWidget;
   data: any;
}

export const WidgetDisplay: React.FC<WidgetDisplayProps> = React.memo(({ widget, data }) => {
   const { setDashboardFilter } = useWidgets();
   if (!data) return <div className="flex items-center justify-center h-full text-slate-400 text-sm">Chargement...</div>;
   if (data.error) return <div className="flex items-center justify-center h-full text-red-500 text-sm text-center p-1">{data.error}</div>;

   // NOUVEAU : Gestion des widgets de graphiques TCD (Pivot)
   if (widget.config.pivotChart && widget.type === 'chart') {
      const { colors, data: chartData, unit, seriesName } = data;
      const { pivotChart } = widget.config;
      const chartType = pivotChart.chartType;

      if (!chartData || chartData.length === 0) {
         return <div className="flex items-center justify-center h-full text-slate-400 italic">Aucune donnée</div>;
      }

      const seriesKeys = chartData.length > 0 ? Object.keys(chartData[0]).filter(k => k !== 'name') : [];
      const displaySeriesNames = seriesKeys.length === 1 && seriesName ? { [seriesKeys[0]]: seriesName } : {};

      try {
         if (chartType === 'pie' || chartType === 'donut') {
            const pieDataKey = seriesKeys[0] || 'value';
            const pieName = displaySeriesNames[pieDataKey] || pieDataKey || 'Valeur';
            return (
               <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                     <Pie
                        data={chartData}
                        dataKey={pieDataKey}
                        nameKey="name"
                        name={pieName}
                        cx="50%"
                        cy="50%"
                        innerRadius={chartType === 'donut' ? '50%' : 0}
                        outerRadius="80%"
                        paddingAngle={1}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
                        isAnimationActive={false}
                     >
                        {chartData.map((entry: any, index: number) => (
                           <Cell key={`cell-${index}`} fill={colors[index % colors.length]} stroke="#fff" strokeWidth={2} />
                        ))}
                     </Pie>
                     <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '11px' }} />
                     <Legend wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
               </ResponsiveContainer>
            );
         } else if (chartType === 'line') {
            const isMultiSeries = seriesKeys.length > 1;
            return (
               <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 15, right: 20, left: 10, bottom: 40 }}>
                     <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                     <XAxis dataKey="name" fontSize={10} stroke="#94a3b8" angle={-45} textAnchor="end" height={40} />
                     <YAxis fontSize={10} stroke="#94a3b8" />
                     <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '10px' }} />
                     {isMultiSeries ? (
                        <>
                           <Legend wrapperStyle={{ fontSize: '10px' }} />
                           {seriesKeys.map((key, idx) => (
                              <Line key={key} type="monotone" dataKey={key} name={displaySeriesNames[key] || key} stroke={colors[idx % colors.length]} strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} isAnimationActive={false} />
                           ))}
                        </>
                     ) : (
                        <Line type="monotone" dataKey={seriesKeys[0] || 'value'} name={displaySeriesNames[seriesKeys[0]] || seriesKeys[0]} stroke={colors[0]} strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} isAnimationActive={false} />
                     )}
                  </LineChart>
               </ResponsiveContainer>
            );
         } else if (chartType === 'area' || chartType === 'stacked-area') {
            const isMultiSeries = seriesKeys.length > 1;
            const isStacked = chartType === 'stacked-area';
            return (
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 15, right: 20, left: 10, bottom: 40 }}>
                     <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                     <XAxis dataKey="name" fontSize={10} stroke="#94a3b8" angle={-45} textAnchor="end" height={40} />
                     <YAxis fontSize={10} stroke="#94a3b8" />
                     <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '10px' }} />
                     {(isMultiSeries || isStacked) && <Legend wrapperStyle={{ fontSize: '10px' }} />}
                     {isMultiSeries || isStacked ? (
                        seriesKeys.map((key, idx) => (
                           <Area key={key} type="monotone" dataKey={key} name={displaySeriesNames[key] || key} fill={colors[idx % colors.length]} stroke={colors[idx % colors.length]} fillOpacity={0.6} stackId={isStacked ? 'stack' : undefined} isAnimationActive={false} />
                        ))
                     ) : (
                        <Area type="monotone" dataKey={seriesKeys[0] || 'value'} name={displaySeriesNames[seriesKeys[0]] || seriesKeys[0]} fill={colors[0]} stroke={colors[0]} fillOpacity={0.6} isAnimationActive={false} />
                     )}
                  </AreaChart>
               </ResponsiveContainer>
            );
         } else if (chartType === 'bar' || chartType === 'column' || chartType === 'stacked-bar') {
            const isBar = chartType === 'bar';
            const isMultiSeries = seriesKeys.length > 1;
            const isStacked = chartType === 'stacked-bar';

            return (
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout={isBar ? 'vertical' : 'horizontal'} margin={{ top: 15, right: 20, left: 10, bottom: isBar ? 5 : 40 }}>
                     <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                     <XAxis type={isBar ? 'number' : 'category'} dataKey={isBar ? undefined : 'name'} fontSize={10} stroke="#94a3b8" angle={isBar ? 0 : -45} textAnchor={isBar ? 'middle' : 'end'} height={isBar ? 30 : 40} />
                     <YAxis type={isBar ? 'category' : 'number'} dataKey={isBar ? 'name' : undefined} fontSize={10} stroke="#94a3b8" />
                     <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '10px' }} />
                     {(isMultiSeries || isStacked) && <Legend wrapperStyle={{ fontSize: '10px' }} />}
                     {isMultiSeries || isStacked ? (
                        seriesKeys.map((key, idx) => (
                           <Bar key={key} dataKey={key} name={displaySeriesNames[key] || key} fill={colors[idx % colors.length]} stackId={isStacked ? 'stack' : undefined} radius={isBar ? [0, 4, 4, 0] : [4, 4, 0, 0]} isAnimationActive={false} />
                        ))
                     ) : (
                        <Bar dataKey={seriesKeys[0] || 'value'} name={displaySeriesNames[seriesKeys[0]] || seriesKeys[0]} fill={colors[0]} radius={isBar ? [0, 4, 4, 0] : [4, 4, 0, 0]} isAnimationActive={false}>
                           {chartData.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                           ))}
                        </Bar>
                     )}
                  </BarChart>
               </ResponsiveContainer>
            );
         } else if (chartType === 'treemap') {
            const TreemapContentWrapper = (props: any) => TreemapContent(props, colors);
            return (
               <ResponsiveContainer width="100%" height="100%">
                  <Treemap data={chartData} dataKey="value" stroke="#fff" content={<TreemapContentWrapper />} isAnimationActive={false}>
                     <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '10px' }} />
                  </Treemap>
               </ResponsiveContainer>
            );
         }
      } catch (error) {
         console.error('Erreur rendu graphique TCD:', error);
         return <div className="flex items-center justify-center h-full text-red-500">Erreur de rendu</div>;
      }
   }

   if (widget.type === 'text') {
      const style = widget.config.textStyle || {};
      const align = style.align || 'left';
      const size = style.size === 'large' ? 'text-lg' : style.size === 'xl' ? 'text-2xl' : 'text-sm';
      const color = style.color === 'primary' ? 'text-blue-600' : style.color === 'muted' ? 'text-slate-400' : 'text-slate-800';
      return <div className={`h-full w-full p-1.5 overflow-y-auto custom-scrollbar whitespace-pre-wrap ${size} ${color}`} style={{ textAlign: align }}>{widget.config.textContent || '...'}</div>;
   }

   const { unit } = data;
   const handleChartClick = (e: any) => {
      if (!e || !e.activePayload || !e.activePayload.length) return;
      if (widget.config.dimension && e.activePayload[0].payload.name) setDashboardFilter(widget.config.dimension, e.activePayload[0].payload.name);
   };

   if (widget.type === 'kpi') {
      const { current, trend, progress, target } = data;
      const isPositive = trend >= 0;
      const style = widget.config.kpiStyle || 'simple';
      const showTrend = widget.config.showTrend && !widget.config.secondarySource;

      return (
         <div className="flex flex-col h-full justify-center">
            <div className="flex items-end gap-1.5 mb-1.5">
               <span className="text-2xl font-bold text-slate-800">{current.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
               <span className="text-sm text-slate-500 mb-1 font-medium">{unit}</span>
            </div>
            {style === 'progress' && target ? (
               <div className="w-full space-y-1">
                  <div className="flex justify-between text-sm text-slate-500">
                     <span>Objectif</span>
                     <span>{Math.round(progress)}% / {target.toLocaleString()}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                     <div className={`h-full rounded-full transition-all duration-500 ${progress >= 100 ? 'bg-green-500' : 'bg-blue-600'}`} style={{ width: `${progress}%` }} />
                  </div>
               </div>
            ) : (style === 'trend' || showTrend) && (
               <div className={`flex items-center text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingUp className="w-3 h-3 mr-1 transform rotate-180" />}
                  {Math.abs(trend).toFixed(1)}% vs préc.
               </div>
            )}
            {widget.config.secondarySource && <div className="text-xs text-slate-400 flex items-center gap-1 mt-1"><LinkIcon className="w-3 h-3" /> Données croisées</div>}
         </div>
      );
   }

   if (widget.type === 'list') {
      const { current, max } = data;
      return (
         <div className="h-full overflow-y-auto custom-scrollbar pr-2 space-y-3">
            {current.map((item: any, idx: number) => (
               <div key={idx} className="flex flex-col gap-0.5 cursor-pointer group" onClick={() => widget.config.dimension && setDashboardFilter(widget.config.dimension, item.name)}>
                  <div className="flex justify-between text-xs group-hover:text-blue-600 transition-colors">
                     <span className="font-bold text-slate-800 truncate pr-2">{idx + 1}. {item.name}</span>
                     <span className="text-slate-500 font-mono">{item.value.toLocaleString()} {unit}</span>
                  </div>
                  <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                     <div className="h-full bg-blue-500 rounded-full opacity-80" style={{ width: `${(item.value / max) * 100}%` }} />
                  </div>
               </div>
            ))}
         </div>
      );
   }

   const chartData = data.data || [];
   const { chartType, colorMode, colorPalette, singleColor, gradientStart, gradientEnd } = widget.config;
   const tooltipFormatter = (val: any) => [`${val.toLocaleString()} ${unit || ''}`, 'Valeur'];
   const tooltipStyle = { backgroundColor: '#ffffff', color: '#1e293b', borderRadius: '6px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' };

   // Calculer les couleurs à utiliser
   const colors = React.useMemo(() => {
      const count = Math.max(chartData.length, 1);
      if (colorMode === 'single') {
         return Array(count).fill(singleColor || '#3b82f6');
      } else if (colorMode === 'gradient') {
         return generateGradient(gradientStart || '#3b82f6', gradientEnd || '#ef4444', count);
      } else {
         return getChartColors(count, colorPalette || 'default');
      }
   }, [chartData.length, colorMode, colorPalette, singleColor, gradientStart, gradientEnd]);

   if (chartType === 'radial') {
      return (
         <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart cx="50%" cy="50%" innerRadius="10%" outerRadius="100%" barSize={10} data={chartData}>
               <RadialBar background dataKey="value" cornerRadius={10} onClick={handleChartClick} className="cursor-pointer">
                  {chartData.map((entry: any, index: number) => (
                     <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
               </RadialBar>
               <Legend iconSize={10} layout="vertical" verticalAlign="middle" wrapperStyle={{ fontSize: '10px' }} align="right" />
               <Tooltip formatter={tooltipFormatter} cursor={{ fill: '#f8fafc' }} contentStyle={tooltipStyle} />
            </RadialBarChart>
         </ResponsiveContainer>
      );
   }

   if (chartType === 'pie' || chartType === 'donut') {
      return (
         <ResponsiveContainer width="100%" height="100%">
            <PieChart>
               <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={chartType === 'donut' ? 40 : 0}
                  outerRadius={60}
                  paddingAngle={2}
                  dataKey="value"
                  onClick={handleChartClick}
                  className="cursor-pointer"
               >
                  {chartData.map((entry: any, index: number) => (
                     <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
               </Pie>
               <Tooltip formatter={tooltipFormatter} contentStyle={tooltipStyle} />
            </PieChart>
         </ResponsiveContainer>
      );
   }

   if (chartType === 'line') {
      return (
         <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} onClick={handleChartClick} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
               <XAxis dataKey="name" fontSize={10} stroke="#94a3b8" />
               <YAxis fontSize={10} stroke="#94a3b8" />
               <Tooltip formatter={tooltipFormatter} cursor={{ fill: '#f8fafc' }} contentStyle={tooltipStyle} />
               <Line type="monotone" dataKey="value" stroke={colors[0]} strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
         </ResponsiveContainer>
      );
   }

   if (chartType === 'area' || chartType === 'stacked-area') {
      return (
         <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} onClick={handleChartClick} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
               <XAxis dataKey="name" fontSize={10} stroke="#94a3b8" />
               <YAxis fontSize={10} stroke="#94a3b8" />
               <Tooltip formatter={tooltipFormatter} cursor={{ fill: '#f8fafc' }} contentStyle={tooltipStyle} />
               <Area type="monotone" dataKey="value" stroke={colors[0]} fill={colors[0]} fillOpacity={0.3} strokeWidth={2} />
            </AreaChart>
         </ResponsiveContainer>
      );
   }

   if (chartType === 'radar') {
      return (
         <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={chartData}>
               <PolarGrid stroke="#e2e8f0" />
               <PolarAngleAxis dataKey="name" tick={{ fontSize: 10 }} />
               <PolarRadiusAxis tick={{ fontSize: 10 }} />
               <Tooltip formatter={tooltipFormatter} contentStyle={tooltipStyle} />
               <Radar name="Valeur" dataKey="value" stroke={colors[0]} fill={colors[0]} fillOpacity={0.6} />
            </RadarChart>
         </ResponsiveContainer>
      );
   }

   if (chartType === 'treemap') {
      const TreemapContentWrapper = (props: any) => TreemapContent(props, colors);
      return (
         <ResponsiveContainer width="100%" height="100%">
            <Treemap
               data={chartData}
               dataKey="value"
               stroke="#fff"
               content={<TreemapContentWrapper />}
            />
         </ResponsiveContainer>
      );
   }

   const isVertical = chartType === 'bar';
   return (
      <ResponsiveContainer width="100%" height="100%">
         <BarChart data={chartData} onClick={handleChartClick} layout={isVertical ? 'vertical' : 'horizontal'}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis type={isVertical ? 'number' : 'category'} dataKey={isVertical ? undefined : 'name'} fontSize={10} stroke="#94a3b8" />
            <YAxis type={isVertical ? 'category' : 'number'} dataKey={isVertical ? 'name' : undefined} fontSize={10} stroke="#94a3b8" width={isVertical ? 80 : 30} />
            <Tooltip formatter={tooltipFormatter} cursor={{ fill: '#f8fafc' }} contentStyle={tooltipStyle} />
            <Bar dataKey="value" radius={isVertical ? [0, 4, 4, 0] : [4, 4, 0, 0]} className="cursor-pointer">
               {chartData.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />)}
            </Bar>
         </BarChart>
      </ResponsiveContainer>
   );
});
