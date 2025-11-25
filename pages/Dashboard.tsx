

import React, { useState, useMemo, useEffect } from 'react';
import { useWidgets, useBatches, useDatasets } from '../context/DataContext';
import { Button } from '../components/ui/Button';
import { Checkbox } from '../components/ui/Checkbox';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Legend, AreaChart, Area, BarChart, Bar, Cell, PieChart, Pie, RadialBarChart, RadialBar,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Treemap, Funnel, FunnelChart, LabelList
} from 'recharts';
import { formatDateFr, parseSmartNumber } from '../utils';
import { 
  Activity, Layout, PieChart as PieIcon, Edit3, Plus, X, ArrowLeft, ArrowRight, Trash2, 
  Minimize2, Settings, BarChart3, LineChart as LineChartIcon, Check, TrendingUp,
  ListOrdered, Radar as RadarIcon, LayoutGrid, Filter, Link as LinkIcon, FilterX, Type, Eye, PaintBucket
} from 'lucide-react';
import { DashboardWidget, WidgetConfig, WidgetSize, WidgetType, ChartType, Dataset, KpiStyle, WidgetHeight } from '../types';

// --- UTILS ---

const COLORS = ['#64748b', '#60a5fa', '#34d399', '#f87171', '#a78bfa', '#fbbf24', '#22d3ee', '#f472b6'];

const BORDER_COLORS = [
  { label: 'Gris (Défaut)', class: 'border-slate-200', bg: 'bg-slate-200' },
  { label: 'Bleu', class: 'border-blue-200', bg: 'bg-blue-200' },
  { label: 'Rouge', class: 'border-red-200', bg: 'bg-red-200' },
  { label: 'Vert', class: 'border-green-200', bg: 'bg-green-200' },
  { label: 'Orange', class: 'border-amber-200', bg: 'bg-amber-200' },
  { label: 'Violet', class: 'border-indigo-200', bg: 'bg-indigo-200' },
];

const BORDER_WIDTHS = [
  { label: 'Aucune', value: '0' },
  { label: 'Fine', value: '1' },
  { label: 'Moyenne', value: '2' },
  { label: 'Épaisse', value: '4' },
];

// --- DATA PROCESSING ENGINE ---

const useWidgetData = (widget: DashboardWidget) => {
   const { batches } = useBatches();
   const { datasets } = useDatasets();
   const { dashboardFilters } = useWidgets();

   return useMemo(() => {
      // TEXT WIDGET BYPASS
      if (widget.type === 'text') {
         return { text: widget.config.textContent, style: widget.config.textStyle };
      }

      const { source, metric, dimension, valueField, target, secondarySource, limit } = widget.config;
      if (!source) return null;

      // 1. Find Dataset
      const dataset = datasets.find(d => d.id === source.datasetId);
      if (!dataset) return { error: 'Jeu de données introuvable' };

      // 2. Find Batch(es)
      const dsBatches = batches
         .filter(b => b.datasetId === source.datasetId)
         .sort((a, b) => new Date(a.date).getTime() - new Date(a.date).getTime());

      if (dsBatches.length === 0) return { error: 'Aucune donnée' };

      let targetBatch = dsBatches[dsBatches.length - 1]; // Latest by default
      let prevBatch = dsBatches.length > 1 ? dsBatches[dsBatches.length - 2] : null;

      if (source.mode === 'specific' && source.batchId) {
         const specific = dsBatches.find(b => b.id === source.batchId);
         if (specific) targetBatch = specific;
         else return { error: 'Import introuvable' };
      }

      // --- JOINTURE DE DONNEES (DATA BLENDING) ---
      let workingRows = targetBatch.rows;
      let secondaryDataset: Dataset | undefined = undefined;
      
      if (secondarySource && secondarySource.datasetId) {
         secondaryDataset = datasets.find(d => d.id === secondarySource.datasetId);
         const secBatches = batches
            .filter(b => b.datasetId === secondarySource.datasetId)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            
         if (secBatches.length > 0) {
            const secBatch = secBatches[secBatches.length - 1]; // On prend le plus récent pour la jointure
            
            // Création d'une Map pour la performance : CléJointure -> Row
            const lookup = new Map<string, any>();
            secBatch.rows.forEach(r => {
               const key = String(r[secondarySource.joinFieldSecondary]).trim();
               if (key) lookup.set(key, r);
            });

            // Fusion (Left Join)
            workingRows = workingRows.map(row => {
               const key = String(row[secondarySource.joinFieldPrimary]).trim();
               const match = lookup.get(key);
               if (match) {
                  return { ...row, ...match }; // Fusion des propriétés (attention aux collisions de noms)
               }
               return row;
            });
         }
      }

      // --- GLOBAL FILTERING (DRILL DOWN) ---
      if (Object.keys(dashboardFilters).length > 0) {
         workingRows = workingRows.filter(row => {
            return Object.entries(dashboardFilters).every(([field, val]) => {
               // Check if field exists in row (could be from primary or secondary)
               if (row[field] === undefined) return true; // Ignore if field not present
               return String(row[field]) === String(val);
            });
         });
      }

      const parseVal = (row: any, field: string) => {
         // Vérifier si le champ vient du dataset principal ou secondaire
         let unit = dataset.fieldConfigs?.[field]?.unit;
         if (!unit && secondaryDataset) {
            unit = secondaryDataset.fieldConfigs?.[field]?.unit;
         }
         return parseSmartNumber(row[field], unit);
      };

      // Helper to get unit
      const getUnit = (field: string | undefined) => {
          if (!field) return '';
          return dataset.fieldConfigs?.[field]?.unit || secondaryDataset?.fieldConfigs?.[field]?.unit || '';
      };

      const currentUnit = (metric === 'sum' || metric === 'avg') && valueField ? getUnit(valueField) : '';

      // 3. Process Data (Group & Aggregate)
      
      // If LIST widget (Ranking)
      if (widget.type === 'list') {
         const counts: Record<string, number> = {};
         workingRows.forEach(row => {
            const key = String(row[dimension || ''] || 'Non défini');
            if (metric === 'count' || metric === 'distinct') { // List usually works on count or sum
               counts[key] = (counts[key] || 0) + 1;
            } else if (metric === 'sum' && valueField) {
               counts[key] = (counts[key] || 0) + parseVal(row, valueField);
            }
         });
         
         // Convert to array
         let sorted = Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
         
         // Apply Limit
         const effectiveLimit = limit || 10; // Default top 10 for list
         sorted = sorted.slice(0, effectiveLimit);
         
         const maxVal = sorted.length > 0 ? sorted[0].value : 0;
         return { current: sorted, max: maxVal, unit: currentUnit };
      }
      
      // If CHART or KPI with Dimension
      if (dimension) {
         const counts: Record<string, number> = {};
         workingRows.forEach(row => {
            const key = String(row[dimension] || 'Non défini');
            let val = 1;
            if (metric === 'sum' && valueField) {
               val = parseVal(row, valueField);
            }
            counts[key] = (counts[key] || 0) + val;
         });
         
         // For Radial Chart, we format specific way
         if (widget.config.chartType === 'radial') {
             const data = Object.entries(counts).map(([name, value], idx) => ({
                name,
                value,
                fill: COLORS[idx % COLORS.length]
             })).sort((a, b) => b.value - a.value).slice(0, 5); // Limit radial to top 5
             return { data, unit: currentUnit };
         }

         // Format standard {name, value} (+ size for Treemap)
         let data = Object.entries(counts).map(([name, value]) => ({ 
            name, 
            value,
            size: value // For Treemap
         }));
         
         // Funnel needs sorting
         if (widget.config.chartType === 'funnel') {
            data.sort((a, b) => b.value - a.value);
         } else {
            // Default sort for charts is often by value descending for better read
            data.sort((a, b) => b.value - a.value);
         }

         // Apply Limit if configured
         if (limit) {
             data = data.slice(0, limit);
         }

         return { data, unit: currentUnit };
      } 
      
      // If KPI (Single Value)
      else {
         let currentVal = 0;
         let prevVal = 0;

         const calc = (rows: any[]) => {
            if (!rows) return 0;
            if (metric === 'count') return rows.length;
            if (metric === 'sum' && valueField) {
               return rows.reduce((acc: number, r: any) => acc + parseVal(r, valueField), 0);
            }
            if (metric === 'avg' && valueField) {
               const sum = rows.reduce((acc: number, r: any) => acc + parseVal(r, valueField), 0);
               return sum / (rows.length || 1);
            }
            if (metric === 'distinct' && valueField) { // Count distinct
               const s = new Set(rows.map((r: any) => r[valueField]));
               return s.size;
            }
            return 0;
         };

         currentVal = calc(workingRows);
         // PrevVal uniquement si pas de jointure (trop complexe à gérer simplement ici)
         if (!secondarySource && prevBatch) prevVal = calc(prevBatch.rows);
         
         // Progress calculation
         let progress = 0;
         if (target) {
             progress = Math.min(100, (currentVal / target) * 100);
         }

         return { 
            current: currentVal, 
            prev: prevVal,
            trend: (prevBatch && !secondarySource) ? ((currentVal - prevVal) / (prevVal || 1)) * 100 : 0,
            unit: currentUnit,
            progress,
            target
         };
      }

   }, [batches, datasets, widget.config, dashboardFilters, widget.type]);
};

// --- SUB COMPONENTS ---

const WidgetDisplay: React.FC<{ widget: DashboardWidget, data: any }> = ({ widget, data }) => {
   const { setDashboardFilter } = useWidgets();
   
   if (!data) return <div className="flex items-center justify-center h-full text-slate-400 text-xs">Chargement...</div>;
   if (data.error) return <div className="flex items-center justify-center h-full text-red-400 text-xs">{data.error}</div>;

   // --- TEXT WIDGET DISPLAY ---
   if (widget.type === 'text') {
      const style = widget.config.textStyle || {};
      const alignment = style.align || 'left';
      const size = style.size === 'large' ? 'text-lg' : style.size === 'xl' ? 'text-2xl' : 'text-sm';
      const color = style.color === 'primary' ? 'text-blue-600' : style.color === 'muted' ? 'text-slate-400' : 'text-slate-700';
      
      return (
         <div className={`h-full w-full p-2 overflow-y-auto custom-scrollbar whitespace-pre-wrap ${size} ${color}`} style={{ textAlign: alignment }}>
            {widget.config.textContent || '...'}
         </div>
      );
   }

   const { unit } = data;

   // --- INTERACTION HANDLER (Drill Down) ---
   const handleChartClick = (e: any) => {
      if (!e || !e.activePayload || !e.activePayload.length) return;
      const clickedData = e.activePayload[0].payload;
      
      // Dimension is needed for filtering
      const dimension = widget.config.dimension;
      if (dimension && clickedData.name) {
         setDashboardFilter(dimension, clickedData.name);
      }
   };

   // --- KPI VIEW ---
   if (widget.type === 'kpi') {
      const { current, trend, progress, target } = data;
      const isPositive = trend >= 0;
      const style = widget.config.kpiStyle || 'simple';
      // Si jointure active, on désactive la tendance car potentiellement incohérente
      const showTrend = widget.config.showTrend && !widget.config.secondarySource;

      return (
         <div className="flex flex-col h-full justify-center">
            <div className="flex items-end gap-2 mb-2">
               <span className="text-3xl font-bold text-slate-800">
                  {current.toLocaleString(undefined, { maximumFractionDigits: 1 })}
               </span>
               <span className="text-sm text-slate-500 mb-1 font-medium">{unit}</span>
            </div>
            
            {style === 'progress' && target ? (
               <div className="w-full space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-500">
                     <span>Progression</span>
                     <span>{Math.round(progress)}% / {target.toLocaleString()}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                     <div 
                        className={`h-full rounded-full transition-all duration-500 ${progress >= 100 ? 'bg-green-500' : 'bg-blue-600'}`} 
                        style={{ width: `${progress}%` }}
                     />
                  </div>
               </div>
            ) : (style === 'trend' || showTrend) && (
               <div className={`flex items-center text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingUp className="w-3 h-3 mr-1 transform rotate-180" />}
                  {Math.abs(trend).toFixed(1)}% vs préc.
               </div>
            )}
            {widget.config.secondarySource && (
               <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
                  <LinkIcon className="w-3 h-3" /> Données croisées
               </div>
            )}
         </div>
      );
   }

   // --- LIST VIEW ---
   if (widget.type === 'list') {
      const { current, max } = data;
      return (
         <div className="h-full overflow-y-auto custom-scrollbar pr-2 space-y-3">
            {current.map((item: any, idx: number) => (
               <div 
                  key={idx} 
                  className="flex flex-col gap-1 cursor-pointer group" 
                  onClick={() => widget.config.dimension && setDashboardFilter(widget.config.dimension, item.name)}
               >
                  <div className="flex justify-between text-xs group-hover:text-blue-600 transition-colors">
                     <span className="font-bold text-slate-700 truncate pr-2">
                        {idx + 1}. {item.name}
                     </span>
                     <span className="text-slate-600 font-mono">
                        {item.value.toLocaleString()} {unit}
                     </span>
                  </div>
                  {/* Visual Bar */}
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                     <div 
                        className="h-full bg-blue-500 rounded-full opacity-80" 
                        style={{ width: `${(item.value / max) * 100}%` }} 
                     />
                  </div>
               </div>
            ))}
         </div>
      );
   }

   // --- CHART VIEW ---
   const chartData = data.data || [];
   const { chartType } = widget.config;
   
   const tooltipFormatter = (val: any) => [`${val.toLocaleString()} ${unit || ''}`, 'Valeur'];
   
   // Default explicit white tooltip style to override any potential dark defaults
   const tooltipStyle = { backgroundColor: '#ffffff', color: '#1e293b', borderRadius: '6px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' };

   if (chartType === 'radial') {
      return (
         <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart cx="50%" cy="50%" innerRadius="10%" outerRadius="100%" barSize={10} data={chartData}>
               <RadialBar
                  background
                  dataKey="value"
                  cornerRadius={10}
                  onClick={handleChartClick}
                  className="cursor-pointer"
               />
               <Legend 
                  iconSize={10} 
                  layout="vertical" 
                  verticalAlign="middle" 
                  wrapperStyle={{ fontSize: '10px' }} 
                  align="right"
               />
               <Tooltip 
                  formatter={tooltipFormatter}
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={tooltipStyle}
               />
            </RadialBarChart>
         </ResponsiveContainer>
      );
   }

   if (chartType === 'radar') {
      return (
         <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
               <PolarGrid stroke="#e2e8f0" />
               <PolarAngleAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
               <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={{ fontSize: 10 }} />
               <Radar
                  name="Valeur"
                  dataKey="value"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.4}
                  onClick={handleChartClick}
                  className="cursor-pointer"
               />
               <Tooltip 
                 formatter={tooltipFormatter}
                 contentStyle={tooltipStyle} 
               />
            </RadarChart>
         </ResponsiveContainer>
      );
   }

   if (chartType === 'treemap') {
      return (
         <ResponsiveContainer width="100%" height="100%">
            <Treemap
               data={chartData}
               dataKey="size"
               aspectRatio={4 / 3}
               stroke="#fff"
               fill="#3b82f6"
               onClick={(node: any) => widget.config.dimension && setDashboardFilter(widget.config.dimension, node.name)}
               className="cursor-pointer"
               content={(props: any) => {
                  const { x, y, width, height, name, index } = props;
                  return (
                    <g>
                      <rect x={x} y={y} width={width} height={height} fill={COLORS[index % COLORS.length]} stroke="#fff" />
                      {width > 40 && height > 20 && (
                        <text x={x + width / 2} y={y + height / 2} textAnchor="middle" fill="#fff" fontSize={10} dy={4} style={{textShadow: '0 1px 2px rgba(0,0,0,0.2)'}}>
                           {name.substring(0, 10)}
                        </text>
                      )}
                    </g>
                  );
              }}
            >
               <Tooltip 
                 formatter={tooltipFormatter}
                 contentStyle={tooltipStyle} 
               />
            </Treemap>
         </ResponsiveContainer>
      );
   }

   if (chartType === 'funnel') {
      return (
         <ResponsiveContainer width="100%" height="100%">
            <FunnelChart>
               <Tooltip 
                 formatter={tooltipFormatter}
                 contentStyle={tooltipStyle} 
               />
               <Funnel
                  dataKey="value"
                  data={chartData}
                  isAnimationActive
                  onClick={handleChartClick}
                  className="cursor-pointer"
               >
                  <LabelList position="right" fill="#475569" stroke="none" dataKey="name" fontSize={10} />
                  {chartData.map((entry: any, index: number) => (
                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
               </Funnel>
            </FunnelChart>
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
                  innerRadius={chartType === 'donut' ? 60 : 0}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  onClick={handleChartClick}
                  className="cursor-pointer"
               >
                  {chartData.map((entry: any, index: number) => (
                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
               </Pie>
               <Tooltip formatter={tooltipFormatter} contentStyle={tooltipStyle} />
               <Legend wrapperStyle={{ fontSize: '10px' }} />
            </PieChart>
         </ResponsiveContainer>
      );
   }

   if (chartType === 'line') {
      return (
         <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} onClick={handleChartClick}>
               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
               <XAxis dataKey="name" fontSize={10} stroke="#94a3b8" />
               <YAxis fontSize={10} stroke="#94a3b8" />
               <Tooltip formatter={tooltipFormatter} contentStyle={tooltipStyle} />
               <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot={{r: 2}} activeDot={{ r: 6, onClick: handleChartClick }} />
            </LineChart>
         </ResponsiveContainer>
      );
   }

   if (chartType === 'area') {
      return (
         <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} onClick={handleChartClick}>
               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
               <XAxis dataKey="name" fontSize={10} stroke="#94a3b8" />
               <YAxis fontSize={10} stroke="#94a3b8" />
               <Tooltip formatter={tooltipFormatter} contentStyle={tooltipStyle} />
               <Area type="monotone" dataKey="value" stroke="#60a5fa" fill="#60a5fa" fillOpacity={0.2} activeDot={{ r: 6, onClick: handleChartClick }} />
            </AreaChart>
         </ResponsiveContainer>
      );
   }

   if (chartType === 'bar') { // Bar = Horizontal in this app context (CustomAnalytics legacy)
      return (
         <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" onClick={handleChartClick} margin={{ top: 5, right: 20, left: 5, bottom: 5 }}>
               <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
               <XAxis type="number" fontSize={10} stroke="#94a3b8" />
               <YAxis dataKey="name" type="category" fontSize={10} stroke="#94a3b8" width={80} />
               <Tooltip formatter={tooltipFormatter} cursor={{fill: '#f8fafc'}} contentStyle={tooltipStyle} />
               <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} className="cursor-pointer">
                  {chartData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
               </Bar>
            </BarChart>
         </ResponsiveContainer>
      );
   }

   // Default to Column (Vertical Bars)
   return (
      <ResponsiveContainer width="100%" height="100%">
         <BarChart data={chartData} onClick={handleChartClick}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" fontSize={10} stroke="#94a3b8" />
            <YAxis fontSize={10} stroke="#94a3b8" />
            <Tooltip formatter={tooltipFormatter} cursor={{fill: '#f8fafc'}} contentStyle={tooltipStyle} />
            <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} className="cursor-pointer">
               {chartData.map((entry: any, index: number) => (
                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
               ))}
            </Bar>
         </BarChart>
      </ResponsiveContainer>
   );
};

// --- LIVE PREVIEW COMPONENT ---
const LivePreview: React.FC<{ widget: DashboardWidget }> = ({ widget }) => {
   const data = useWidgetData(widget);
   const isText = widget.type === 'text';
   const bgColor = isText && widget.config.textStyle?.color === 'primary' ? 'bg-blue-50 border-blue-200' : 'bg-white';
   
   // Style dynamique du conteneur
   const borderClass = widget.style?.borderColor || 'border-slate-200';
   // Tailwind 'border' class is 1px. If width is '1', we use 'border'.
   const widthVal = widget.style?.borderWidth || '1';
   const widthClass = widthVal === '0' ? 'border-0' : widthVal === '2' ? 'border-2' : widthVal === '4' ? 'border-4' : 'border';
   
   return (
      <div className={`w-full h-full rounded-lg ${borderClass} ${widthClass} shadow-sm p-4 flex flex-col ${bgColor} relative`}>
         {/* Fake Title */}
         <h3 className="text-sm font-bold text-slate-600 mb-2 uppercase tracking-wider truncate">
            {widget.title || 'Titre du widget'}
         </h3>
         <div className="flex-1 min-h-0 relative">
            <WidgetDisplay widget={widget} data={data} />
         </div>
      </div>
   );
};

// --- MAIN COMPONENT ---

export const Dashboard: React.FC = () => {
  const { 
     dashboardWidgets, addDashboardWidget, removeDashboardWidget, 
     updateDashboardWidget, moveDashboardWidget, dashboardFilters, clearDashboardFilters, setDashboardFilter
  } = useWidgets();
  const { datasets } = useDatasets();
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingWidgetId, setEditingWidgetId] = useState<string | null>(null);

  // Drawer (ex-Modal) State
  const [showWidgetDrawer, setShowWidgetDrawer] = useState(false);
  const [tempWidget, setTempWidget] = useState<Partial<DashboardWidget>>({
     type: 'kpi',
     size: 'sm',
     height: 'md',
     style: { borderColor: 'border-slate-200', borderWidth: '1' },
     config: { metric: 'count' }
  });

  const handleSaveWidget = () => {
     if (!tempWidget.title) return;

     // Validation pour widget non-text
     if (tempWidget.type !== 'text' && !tempWidget.config?.source?.datasetId) return;

     if (editingWidgetId) {
        updateDashboardWidget(editingWidgetId, tempWidget);
     } else {
        addDashboardWidget(tempWidget as any);
     }
     setShowWidgetDrawer(false);
     setEditingWidgetId(null);
     setTempWidget({ type: 'kpi', size: 'sm', height: 'md', style: { borderColor: 'border-slate-200', borderWidth: '1' }, config: { metric: 'count' } });
  };

  const openNewWidget = () => {
     setEditingWidgetId(null);
     setTempWidget({
        title: '',
        type: 'kpi',
        size: 'sm',
        height: 'md',
        style: { borderColor: 'border-slate-200', borderWidth: '1' },
        config: {
           metric: 'count',
           source: datasets.length > 0 ? { datasetId: datasets[0].id, mode: 'latest' } : undefined
        }
     });
     setShowWidgetDrawer(true);
  };

  const openEditWidget = (w: DashboardWidget) => {
     setEditingWidgetId(w.id);
     setTempWidget({ ...w, style: w.style || { borderColor: 'border-slate-200', borderWidth: '1' } });
     setShowWidgetDrawer(true);
  };

  const availableFields = useMemo(() => {
     if (!tempWidget.config?.source?.datasetId) return [];
     const ds = datasets.find(d => d.id === tempWidget.config?.source?.datasetId);
     return ds ? ds.fields : [];
  }, [tempWidget.config?.source?.datasetId, datasets]);

  // Fields from secondary source
  const secondaryFields = useMemo(() => {
     if (!tempWidget.config?.secondarySource?.datasetId) return [];
     const ds = datasets.find(d => d.id === tempWidget.config?.secondarySource?.datasetId);
     return ds ? ds.fields : [];
  }, [tempWidget.config?.secondarySource?.datasetId, datasets]);

  // Combine fields if join is active
  const allFields = useMemo(() => {
      if (secondaryFields.length > 0) {
          return [...availableFields, ...secondaryFields]; // Simplified: duplicates possible
      }
      return availableFields;
  }, [availableFields, secondaryFields]);

  // Helper to get Height Class
  const getHeightClass = (h?: WidgetHeight) => {
      switch (h) {
          case 'sm': return 'h-32';
          case 'md': return 'h-64';
          case 'lg': return 'h-96';
          case 'xl': return 'h-[500px]';
          default: return 'h-64';
      }
  };

  // Preview container dynamic width class
  const getPreviewContainerWidth = (size?: WidgetSize) => {
      switch(size) {
          case 'sm': return 'max-w-[300px]';
          case 'md': return 'max-w-[600px]';
          case 'lg': return 'max-w-[900px]';
          case 'full': return 'max-w-full';
          default: return 'max-w-[400px]';
      }
  };

  // Preview container dynamic height style
  const getPreviewContainerHeight = (h?: WidgetHeight) => {
      switch (h) {
          case 'sm': return '128px';
          case 'md': return '256px';
          case 'lg': return '384px';
          case 'xl': return '500px';
          default: return '256px';
      }
  };

  return (
    <div className="h-full overflow-y-auto p-4 md:p-8 custom-scrollbar relative">
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
         
         {/* Header */}
         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
               <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <Layout className="w-6 h-6 text-slate-500" />
                  Tableau de bord
               </h2>
               <p className="text-sm text-slate-500">Vue d'ensemble de vos données</p>
            </div>
            <div className="flex gap-2">
               {isEditMode ? (
                  <>
                     <Button variant="secondary" onClick={openNewWidget}>
                        <Plus className="w-4 h-4 mr-2" /> Ajouter un widget
                     </Button>
                     <Button 
                        onClick={() => setIsEditMode(false)} 
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Check className="w-4 h-4 mr-2" /> Terminer
                     </Button>
                  </>
               ) : (
                  <Button variant="outline" onClick={() => setIsEditMode(true)}>
                     <Edit3 className="w-4 h-4 mr-2" /> Personnaliser
                  </Button>
               )}
            </div>
         </div>

         {/* ACTIVE FILTERS BAR (DRILL DOWN) */}
         {Object.keys(dashboardFilters).length > 0 && (
            <div className="flex flex-wrap items-center gap-2 bg-blue-50 border border-blue-200 p-3 rounded-lg animate-in slide-in-from-top-2">
               <div className="text-xs font-bold text-blue-800 flex items-center mr-2">
                  <Filter className="w-3 h-3 mr-1" /> Filtres actifs :
               </div>
               {Object.entries(dashboardFilters).map(([field, value]) => (
                  <div key={field} className="flex items-center bg-white border border-blue-200 rounded-full px-3 py-1 shadow-sm">
                     <span className="text-xs text-slate-500 mr-1">{field}:</span>
                     <span className="text-xs font-bold text-slate-800">{String(value)}</span>
                     <button 
                        onClick={() => {
                           clearDashboardFilters(); 
                        }}
                        className="ml-2 text-slate-400 hover:text-red-500"
                     >
                     </button>
                  </div>
               ))}
               <button 
                  onClick={clearDashboardFilters} 
                  className="ml-auto text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center"
               >
                  <FilterX className="w-3 h-3 mr-1" /> Tout effacer
               </button>
            </div>
         )}

         {/* Grid */}
         {dashboardWidgets.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-slate-300 rounded-xl">
               <Activity className="w-12 h-12 text-slate-300 mx-auto mb-3" />
               <p className="text-slate-500 font-medium">Votre tableau de bord est vide.</p>
               <Button className="mt-4" onClick={() => { setIsEditMode(true); openNewWidget(); }}>
                  Créer mon premier widget
               </Button>
            </div>
         ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
               {dashboardWidgets.map((widget) => {
                  // Compute col span
                  const colSpan = widget.size === 'full' ? 'md:col-span-2 lg:col-span-4' 
                     : widget.size === 'lg' ? 'md:col-span-2 lg:col-span-3'
                     : widget.size === 'md' ? 'md:col-span-2'
                     : 'col-span-1';
                  
                  // Data hook wrapper component to respect hooks rules
                  const WidgetWrapper = () => {
                     const data = useWidgetData(widget);
                     const isText = widget.type === 'text';
                     const bgColor = isText && widget.config.textStyle?.color === 'primary' ? 'bg-blue-50 border-blue-200' : 'bg-white';
                     const heightClass = getHeightClass(widget.height);
                     
                     // Dynamic Styles
                     const borderClass = widget.style?.borderColor || 'border-slate-200';
                     // Fix: width '1' means 'border' class
                     const widthVal = widget.style?.borderWidth || '1';
                     const widthClass = widthVal === '0' ? 'border-0' : widthVal === '2' ? 'border-2' : widthVal === '4' ? 'border-4' : 'border';

                     return (
                        <div className={`${bgColor} rounded-lg ${widthClass} ${borderClass} ${isEditMode ? 'ring-2 ring-blue-50 border-blue-300' : ''} shadow-sm p-4 flex flex-col ${heightClass} relative group transition-all`}>
                           {isEditMode && (
                              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 p-1 rounded shadow-sm z-10">
                                 <button onClick={() => moveDashboardWidget(widget.id, 'left')} className="p-1 hover:bg-slate-100 rounded text-slate-500"><ArrowLeft className="w-3 h-3" /></button>
                                 <button onClick={() => moveDashboardWidget(widget.id, 'right')} className="p-1 hover:bg-slate-100 rounded text-slate-500"><ArrowRight className="w-3 h-3" /></button>
                                 <button onClick={() => openEditWidget(widget)} className="p-1 hover:bg-blue-50 rounded text-blue-600"><Settings className="w-3 h-3" /></button>
                                 <button onClick={() => removeDashboardWidget(widget.id)} className="p-1 hover:bg-red-50 rounded text-red-600"><Trash2 className="w-3 h-3" /></button>
                              </div>
                           )}
                           
                           {/* Title hidden for text widget if it's just for spacing, but shown if present */}
                           <h3 className="text-sm font-bold text-slate-600 mb-2 uppercase tracking-wider truncate" title={widget.title}>
                              {widget.title}
                           </h3>
                           
                           <div className="flex-1 min-h-0">
                              <WidgetDisplay widget={widget} data={data} />
                           </div>
                        </div>
                     );
                  };

                  return (
                     <div key={widget.id} className={colSpan}>
                        <WidgetWrapper />
                     </div>
                  );
               })}
            </div>
         )}
      </div>

      {/* FULL SCREEN EDITOR (SPLIT VIEW) */}
      {showWidgetDrawer && (
         <div className="fixed inset-0 z-50 flex bg-slate-50">
            
            {/* LEFT SIDE: LIVE PREVIEW */}
            <div className="flex-1 bg-slate-100 flex flex-col overflow-hidden relative border-r border-slate-200">
               <div className="absolute top-4 left-4 bg-white/80 backdrop-blur rounded-full px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm border border-slate-200 flex items-center gap-2 z-10">
                  <Eye className="w-3 h-3 text-blue-600" /> Aperçu temps réel
               </div>
               
               <div className="flex-1 overflow-auto flex items-center justify-center p-8">
                  <div 
                     className={`w-full transition-all duration-300 ${getPreviewContainerWidth(tempWidget.size)}`}
                     style={{ height: getPreviewContainerHeight(tempWidget.height) }}
                  >
                     {/* Use LivePreview component to properly use hooks */}
                     <LivePreview widget={tempWidget as DashboardWidget} />
                  </div>
               </div>
            </div>

            {/* RIGHT SIDE: CONFIGURATION DRAWER */}
            <div className="w-[500px] bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
               <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <div>
                     <h3 className="text-xl font-bold text-slate-800">
                        {editingWidgetId ? 'Modifier le widget' : 'Nouveau widget'}
                     </h3>
                     <p className="text-sm text-slate-500">Configuration de l'affichage</p>
                  </div>
                  <button onClick={() => setShowWidgetDrawer(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-white rounded-full transition-colors">
                     <X className="w-6 h-6" />
                  </button>
               </div>
               
               <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-8">
                  
                  {/* 0. Type Selector (Top Level) */}
                  <div>
                     <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">Type de visualisation</label>
                     <div className="grid grid-cols-4 gap-3">
                        {[
                           { id: 'kpi', label: 'Indicateur', icon: Activity },
                           { id: 'chart', label: 'Graphique', icon: BarChart3 },
                           { id: 'list', label: 'Classement', icon: ListOrdered },
                           { id: 'text', label: 'Texte', icon: Type },
                        ].map(t => {
                           const Icon = t.icon;
                           const isSelected = tempWidget.type === t.id;
                           return (
                              <button 
                                 key={t.id}
                                 onClick={() => setTempWidget({...tempWidget, type: t.id as WidgetType})}
                                 className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all
                                    ${isSelected ? 'bg-blue-50 text-blue-700 border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-200 hover:bg-slate-50'}`}
                              >
                                 <Icon className="w-6 h-6" />
                                 <span className="font-bold text-xs">{t.label}</span>
                              </button>
                           )
                        })}
                     </div>
                  </div>

                  <div className="border-t border-slate-100"></div>

                  {/* 1. General Info & Source (Common) */}
                  <div className="space-y-4">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className={tempWidget.type === 'text' ? 'col-span-2' : ''}>
                           <label className="block text-sm font-bold text-slate-700 mb-1">Titre</label>
                           <input 
                              type="text" 
                              className="block w-full rounded-md border border-slate-300 bg-white text-slate-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 text-sm"
                              value={tempWidget.title || ''}
                              onChange={e => setTempWidget({...tempWidget, title: e.target.value})}
                              placeholder="Ex: Budget vs Charge"
                           />
                        </div>
                        
                        {tempWidget.type !== 'text' && (
                           <div className="grid grid-cols-2 gap-2">
                              <div>
                                 <label className="block text-sm font-bold text-slate-700 mb-1">Largeur</label>
                                 <select 
                                    className="block w-full rounded-md border border-slate-300 bg-white text-slate-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 text-sm"
                                    value={tempWidget.size || 'sm'}
                                    onChange={e => setTempWidget({...tempWidget, size: e.target.value as WidgetSize})}
                                 >
                                    <option value="sm">Petit (1/4)</option>
                                    <option value="md">Moyen (2/4)</option>
                                    <option value="lg">Grand (3/4)</option>
                                    <option value="full">Large (4/4)</option>
                                 </select>
                              </div>
                              <div>
                                 <label className="block text-sm font-bold text-slate-700 mb-1">Hauteur</label>
                                 <select 
                                    className="block w-full rounded-md border border-slate-300 bg-white text-slate-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 text-sm"
                                    value={tempWidget.height || 'md'}
                                    onChange={e => setTempWidget({...tempWidget, height: e.target.value as WidgetHeight})}
                                 >
                                    <option value="sm">Petite (128px)</option>
                                    <option value="md">Moyenne (256px)</option>
                                    <option value="lg">Grande (384px)</option>
                                    <option value="xl">Très grande (500px)</option>
                                 </select>
                              </div>
                           </div>
                        )}
                     </div>

                     {/* Hide Source selector for Text Widgets */}
                     {tempWidget.type !== 'text' && (
                         <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Source de données</label>
                            <select 
                               className="block w-full rounded-md border border-slate-300 bg-white text-slate-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 text-sm"
                               value={tempWidget.config?.source?.datasetId || ''}
                               onChange={e => setTempWidget({
                                  ...tempWidget, 
                                  config: { ...tempWidget.config!, source: { datasetId: e.target.value, mode: 'latest' } }
                               })}
                            >
                               {datasets.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                         </div>
                     )}
                  </div>

                  {/* --- APPEARANCE SECTION (BORDER) --- */}
                  <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-3">
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                          <PaintBucket className="w-4 h-4 text-purple-600" />
                          Apparence du conteneur
                      </div>
                      <div className="space-y-3">
                          {/* Colors */}
                          <div>
                              <label className="block text-xs font-medium text-slate-500 mb-2">Couleur de bordure</label>
                              <div className="flex flex-wrap gap-2">
                                  {BORDER_COLORS.map(c => {
                                      const isActive = (tempWidget.style?.borderColor || 'border-slate-200') === c.class;
                                      return (
                                          <button 
                                              key={c.class} 
                                              onClick={() => setTempWidget({ ...tempWidget, style: { ...tempWidget.style, borderColor: c.class } })}
                                              className={`w-8 h-8 rounded-full border-2 ${c.bg} transition-transform hover:scale-110 ${isActive ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : 'border-transparent'}`}
                                              title={c.label}
                                          />
                                      )
                                  })}
                              </div>
                          </div>
                          {/* Width */}
                          <div>
                              <label className="block text-xs font-medium text-slate-500 mb-2">Épaisseur de bordure</label>
                              <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                                  {BORDER_WIDTHS.map(w => {
                                      const isActive = (tempWidget.style?.borderWidth || '1') === w.value;
                                      return (
                                          <button
                                              key={w.value}
                                              onClick={() => setTempWidget({ ...tempWidget, style: { ...tempWidget.style, borderWidth: w.value as any } })}
                                              className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${isActive ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                          >
                                              {w.label}
                                          </button>
                                      )
                                  })}
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* --- CONDITIONAL CONFIG: TEXT WIDGET --- */}
                  {tempWidget.type === 'text' && (
                     <div className="space-y-4 animate-in fade-in bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <div>
                           <label className="block text-sm font-bold text-slate-700 mb-1">Contenu du texte</label>
                           <textarea 
                              className="block w-full rounded-md border border-slate-300 bg-white text-slate-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 min-h-[150px]"
                              placeholder="Saisissez votre texte ici..."
                              value={tempWidget.config?.textContent || ''}
                              onChange={e => setTempWidget({ ...tempWidget, config: { ...tempWidget.config!, textContent: e.target.value }})}
                           />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                           <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">Alignement</label>
                              <select 
                                 className="block w-full rounded-md border border-slate-300 bg-white text-slate-900 shadow-sm p-2 text-sm"
                                 value={tempWidget.config?.textStyle?.align || 'left'}
                                 onChange={e => setTempWidget({ ...tempWidget, config: { ...tempWidget.config!, textStyle: { ...tempWidget.config?.textStyle, align: e.target.value as any } }})}
                              >
                                 <option value="left">Gauche</option>
                                 <option value="center">Centré</option>
                                 <option value="right">Droite</option>
                              </select>
                           </div>
                           <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">Taille</label>
                              <select 
                                 className="block w-full rounded-md border border-slate-300 bg-white text-slate-900 shadow-sm p-2 text-sm"
                                 value={tempWidget.config?.textStyle?.size || 'normal'}
                                 onChange={e => setTempWidget({ ...tempWidget, config: { ...tempWidget.config!, textStyle: { ...tempWidget.config?.textStyle, size: e.target.value as any } }})}
                              >
                                 <option value="normal">Normal</option>
                                 <option value="large">Grand</option>
                                 <option value="xl">Très grand</option>
                              </select>
                           </div>
                           <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">Couleur</label>
                              <select 
                                 className="block w-full rounded-md border border-slate-300 bg-white text-slate-900 shadow-sm p-2 text-sm"
                                 value={tempWidget.config?.textStyle?.color || 'default'}
                                 onChange={e => setTempWidget({ ...tempWidget, config: { ...tempWidget.config!, textStyle: { ...tempWidget.config?.textStyle, color: e.target.value as any } }})}
                              >
                                 <option value="default">Défaut (Gris foncé)</option>
                                 <option value="primary">Primaire (Bleu)</option>
                                 <option value="muted">Discret (Gris clair)</option>
                              </select>
                           </div>
                        </div>
                     </div>
                  )}

                  {/* --- CONDITIONAL CONFIG: DATA WIDGETS --- */}
                  {tempWidget.type !== 'text' && (
                     <>
                        {/* DATA BLENDING (Optional) */}
                        <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-lg space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                                    <LinkIcon className="w-4 h-4" /> Données liées (Jointure)
                                </h4>
                                {tempWidget.config?.secondarySource && (
                                    <button 
                                        onClick={() => setTempWidget({ ...tempWidget, config: { ...tempWidget.config!, secondarySource: undefined } })}
                                        className="text-xs text-red-600 hover:underline"
                                    >
                                        Retirer
                                    </button>
                                )}
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-indigo-800 mb-1">Tableau à lier</label>
                                    <select 
                                        className="block w-full rounded-md border-indigo-200 bg-white text-slate-900 text-xs p-2"
                                        value={tempWidget.config?.secondarySource?.datasetId || ''}
                                        onChange={e => {
                                            const val = e.target.value;
                                            setTempWidget({
                                                ...tempWidget, 
                                                config: { 
                                                    ...tempWidget.config!, 
                                                    secondarySource: val ? { 
                                                        datasetId: val, 
                                                        joinFieldPrimary: '', 
                                                        joinFieldSecondary: '' 
                                                    } : undefined
                                                }
                                            });
                                        }}
                                    >
                                        <option value="">-- Aucun --</option>
                                        {datasets.filter(d => d.id !== tempWidget.config?.source?.datasetId).map(d => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>
                                
                                {tempWidget.config?.secondarySource && (
                                    <>
                                        <div>
                                            <label className="block text-xs font-medium text-indigo-800 mb-1">Clé source princ.</label>
                                            <select 
                                                className="block w-full rounded-md border-indigo-200 bg-white text-slate-900 text-xs p-2"
                                                value={tempWidget.config?.secondarySource?.joinFieldPrimary || ''}
                                                onChange={e => setTempWidget({
                                                    ...tempWidget, 
                                                    config: { 
                                                        ...tempWidget.config!, 
                                                        secondarySource: { ...tempWidget.config!.secondarySource!, joinFieldPrimary: e.target.value } 
                                                    }
                                                })}
                                            >
                                                <option value="">-- Choisir --</option>
                                                {availableFields.map(f => <option key={f} value={f}>{f}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-indigo-800 mb-1">Clé source lièe</label>
                                            <select 
                                                className="block w-full rounded-md border-indigo-200 bg-white text-slate-900 text-xs p-2"
                                                value={tempWidget.config?.secondarySource?.joinFieldSecondary || ''}
                                                onChange={e => setTempWidget({
                                                    ...tempWidget, 
                                                    config: { 
                                                        ...tempWidget.config!, 
                                                        secondarySource: { ...tempWidget.config!.secondarySource!, joinFieldSecondary: e.target.value } 
                                                    }
                                                })}
                                            >
                                                <option value="">-- Choisir --</option>
                                                {(() => {
                                                    const secDs = datasets.find(d => d.id === tempWidget.config?.secondarySource?.datasetId);
                                                    return secDs?.fields.map(f => <option key={f} value={f}>{f}</option>);
                                                })()}
                                            </select>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* 3. Specific Config based on Type */}
                        <div className="space-y-6">
                           
                           {/* Metric Config */}
                           <div className="grid grid-cols-2 gap-4">
                              <div>
                                 <label className="block text-sm font-bold text-slate-700 mb-1">Métrique</label>
                                 <select 
                                    className="block w-full rounded-md border border-slate-300 bg-white text-slate-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 text-sm"
                                    value={tempWidget.config?.metric}
                                    onChange={e => setTempWidget({ ...tempWidget, config: { ...tempWidget.config!, metric: e.target.value as any }})}
                                 >
                                    <option value="count">Compte (Nombre de lignes)</option>
                                    <option value="sum">Somme</option>
                                    <option value="avg">Moyenne</option>
                                    <option value="distinct">Compte distinct</option>
                                 </select>
                              </div>
                              {['sum', 'avg', 'distinct'].includes(tempWidget.config?.metric || '') && (
                                 <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Champ valeur</label>
                                    <select 
                                       className="block w-full rounded-md border border-slate-300 bg-white text-slate-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 text-sm"
                                       value={tempWidget.config?.valueField || ''}
                                       onChange={e => setTempWidget({ ...tempWidget, config: { ...tempWidget.config!, valueField: e.target.value }})}
                                    >
                                       <option value="">-- Choisir --</option>
                                       {allFields.map(f => <option key={f} value={f}>{f}</option>)}
                                    </select>
                                 </div>
                              )}
                           </div>

                           {/* Dimension Config (for Chart & List) */}
                           {(tempWidget.type === 'chart' || tempWidget.type === 'list') && (
                              <div className="grid grid-cols-2 gap-4">
                                 <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Axe de regroupement</label>
                                    <select 
                                       className="block w-full rounded-md border border-slate-300 bg-white text-slate-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 text-sm"
                                       value={tempWidget.config?.dimension || ''}
                                       onChange={e => setTempWidget({ ...tempWidget, config: { ...tempWidget.config!, dimension: e.target.value }})}
                                    >
                                       <option value="">-- Choisir --</option>
                                       {allFields.map(f => <option key={f} value={f}>{f}</option>)}
                                    </select>
                                 </div>
                                 <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Limite (Top N)</label>
                                    <input 
                                       type="number"
                                       className="block w-full rounded-md border border-slate-300 bg-white text-slate-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 text-sm"
                                       value={tempWidget.config?.limit || 10}
                                       onChange={e => setTempWidget({ ...tempWidget, config: { ...tempWidget.config!, limit: parseInt(e.target.value) }})}
                                       placeholder="10"
                                    />
                                 </div>
                              </div>
                           )}

                           {/* KPI Specifics */}
                           {tempWidget.type === 'kpi' && (
                              <div className="space-y-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                                 <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Style du KPI</label>
                                    <div className="flex gap-2">
                                       {['simple', 'trend', 'progress'].map(s => (
                                          <button
                                             key={s}
                                             onClick={() => setTempWidget({ ...tempWidget, config: { ...tempWidget.config!, kpiStyle: s as KpiStyle } })}
                                             className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${tempWidget.config?.kpiStyle === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'}`}
                                          >
                                             {s === 'simple' ? 'Simple' : s === 'trend' ? 'Avec tendance' : 'Progression'}
                                          </button>
                                       ))}
                                    </div>
                                 </div>
                                 
                                 {tempWidget.config?.kpiStyle === 'progress' && (
                                    <div>
                                       <label className="block text-sm font-bold text-slate-700 mb-1">Objectif cible (Target)</label>
                                       <input 
                                          type="number" 
                                          className="block w-full rounded-md border border-slate-300 bg-white text-slate-900 shadow-sm p-2"
                                          placeholder="Ex: 10000"
                                          value={tempWidget.config?.target || ''}
                                          onChange={e => setTempWidget({ ...tempWidget, config: { ...tempWidget.config!, target: parseFloat(e.target.value) } })}
                                       />
                                    </div>
                                 )}

                                 <Checkbox 
                                    checked={!!tempWidget.config?.showTrend}
                                    onChange={() => setTempWidget({ ...tempWidget, config: { ...tempWidget.config!, showTrend: !tempWidget.config?.showTrend } })}
                                    label="Afficher l'évolution par rapport au précédent import"
                                 />
                              </div>
                           )}

                           {/* Chart Specifics */}
                           {tempWidget.type === 'chart' && (
                              <div>
                                 <label className="block text-sm font-bold text-slate-700 mb-2">Type de graphique</label>
                                 <div className="grid grid-cols-2 gap-2 p-1">
                                    <button
                                       onClick={() => setTempWidget({ ...tempWidget, config: { ...tempWidget.config!, chartType: 'bar' }})}
                                       className={`flex items-center gap-2 p-2 text-sm border rounded-lg text-left transition-all ${tempWidget.config?.chartType === 'bar' ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                                    >
                                       <BarChart3 className="w-4 h-4 transform rotate-90" /> Barres
                                    </button>
                                    <button
                                       onClick={() => setTempWidget({ ...tempWidget, config: { ...tempWidget.config!, chartType: 'column' }})}
                                       className={`flex items-center gap-2 p-2 text-sm border rounded-lg text-left transition-all ${tempWidget.config?.chartType === 'column' ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                                    >
                                       <BarChart3 className="w-4 h-4" /> Colonnes
                                    </button>
                                    <button
                                       onClick={() => setTempWidget({ ...tempWidget, config: { ...tempWidget.config!, chartType: 'line' }})}
                                       className={`flex items-center gap-2 p-2 text-sm border rounded-lg text-left transition-all ${tempWidget.config?.chartType === 'line' ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                                    >
                                       <LineChartIcon className="w-4 h-4" /> Courbes
                                    </button>
                                    <button
                                       onClick={() => setTempWidget({ ...tempWidget, config: { ...tempWidget.config!, chartType: 'area' }})}
                                       className={`flex items-center gap-2 p-2 text-sm border rounded-lg text-left transition-all ${tempWidget.config?.chartType === 'area' ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                                    >
                                       <TrendingUp className="w-4 h-4" /> Aires
                                    </button>
                                    <button
                                       onClick={() => setTempWidget({ ...tempWidget, config: { ...tempWidget.config!, chartType: 'pie' }})}
                                       className={`flex items-center gap-2 p-2 text-sm border rounded-lg text-left transition-all ${tempWidget.config?.chartType === 'pie' ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                                    >
                                       <PieIcon className="w-4 h-4" /> Camembert
                                    </button>
                                    <button
                                       onClick={() => setTempWidget({ ...tempWidget, config: { ...tempWidget.config!, chartType: 'donut' }})}
                                       className={`flex items-center gap-2 p-2 text-sm border rounded-lg text-left transition-all ${tempWidget.config?.chartType === 'donut' ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                                    >
                                       <PieIcon className="w-4 h-4" /> Donut
                                    </button>
                                    <button
                                       onClick={() => setTempWidget({ ...tempWidget, config: { ...tempWidget.config!, chartType: 'radial' }})}
                                       className={`flex items-center gap-2 p-2 text-sm border rounded-lg text-left transition-all ${tempWidget.config?.chartType === 'radial' ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                                    >
                                       <Activity className="w-4 h-4" /> Jauge
                                    </button>
                                    <button
                                       onClick={() => setTempWidget({ ...tempWidget, config: { ...tempWidget.config!, chartType: 'radar' }})}
                                       className={`flex items-center gap-2 p-2 text-sm border rounded-lg text-left transition-all ${tempWidget.config?.chartType === 'radar' ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                                    >
                                       <RadarIcon className="w-4 h-4" /> Radar
                                    </button>
                                    <button
                                       onClick={() => setTempWidget({ ...tempWidget, config: { ...tempWidget.config!, chartType: 'treemap' }})}
                                       className={`flex items-center gap-2 p-2 text-sm border rounded-lg text-left transition-all ${tempWidget.config?.chartType === 'treemap' ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                                    >
                                       <LayoutGrid className="w-4 h-4" /> Treemap
                                    </button>
                                    <button
                                       onClick={() => setTempWidget({ ...tempWidget, config: { ...tempWidget.config!, chartType: 'funnel' }})}
                                       className={`flex items-center gap-2 p-2 text-sm border rounded-lg text-left transition-all ${tempWidget.config?.chartType === 'funnel' ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                                    >
                                       <Filter className="w-4 h-4" /> Entonnoir
                                    </button>
                                 </div>
                              </div>
                           )}
                        </div>
                     </>
                  )}

               </div>
               
               <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setShowWidgetDrawer(false)}>Annuler</Button>
                  <Button onClick={handleSaveWidget} disabled={!tempWidget.title}>
                     Enregistrer le widget
                  </Button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};