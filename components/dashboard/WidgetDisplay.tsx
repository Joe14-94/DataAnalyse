
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

export const TreemapContent = (props: any) => {
   const { x, y, width, height, name, index } = props;
   return (
      <g>
         <rect x={x} y={y} width={width} height={height} fill={CHART_COLORS[index % CHART_COLORS.length]} stroke="#fff" />
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
   const { chartType } = widget.config;
   const tooltipFormatter = (val: any) => [`${val.toLocaleString()} ${unit || ''}`, 'Valeur'];
   const tooltipStyle = { backgroundColor: '#ffffff', color: '#1e293b', borderRadius: '6px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' };

   if (chartType === 'radial') {
      return (
         <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart cx="50%" cy="50%" innerRadius="10%" outerRadius="100%" barSize={10} data={chartData}>
               <RadialBar background dataKey="value" cornerRadius={10} onClick={handleChartClick} className="cursor-pointer" />
               <Legend iconSize={10} layout="vertical" verticalAlign="middle" wrapperStyle={{ fontSize: '10px' }} align="right" />
               <Tooltip formatter={tooltipFormatter} cursor={{ fill: '#f8fafc' }} contentStyle={tooltipStyle} />
            </RadialBarChart>
         </ResponsiveContainer>
      );
   }

   return (
      <ResponsiveContainer width="100%" height="100%">
         <BarChart data={chartData} onClick={handleChartClick}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="name" fontSize={10} stroke="#94a3b8" />
            <YAxis fontSize={10} stroke="#94a3b8" />
            <Tooltip formatter={tooltipFormatter} cursor={{ fill: '#f8fafc' }} contentStyle={tooltipStyle} />
            <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} className="cursor-pointer">
               {chartData.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
            </Bar>
         </BarChart>
      </ResponsiveContainer>
   );
});
