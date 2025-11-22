

import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
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
  ListOrdered, Radar as RadarIcon, LayoutGrid, Filter, Link as LinkIcon
} from 'lucide-react';
import { DashboardWidget, WidgetConfig, WidgetSize, WidgetType, ChartType, Dataset, KpiStyle } from '../types';

// --- UTILS ---

const COLORS = ['#64748b', '#60a5fa', '#34d399', '#f87171', '#a78bfa', '#fbbf24', '#22d3ee', '#f472b6'];

// --- DATA PROCESSING ENGINE ---

const useWidgetData = (widget: DashboardWidget) => {
   const { batches, datasets } = useData();

   return useMemo(() => {
      const { source, metric, dimension, valueField, target, secondarySource } = widget.config;
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
         const sorted = Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10); // Top 10
         
         const maxVal = sorted.length > 0 ? sorted[0].value : 0;
         return { current: sorted, max: maxVal, unit: currentUnit };
      }
      
      // If CHART or KPI with Dimension
      if (dimension) {
         const counts: Record<string, number> = {};
         workingRows.forEach(row => {
            const key = String(row[dimension] || 'Non défini');
            let val = 1;
            if (metric === 'sum' && valueField) val = parseVal(row, valueField);
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
         const data = Object.entries(counts).map(([name, value]) => ({ 
            name, 
            value,
            size: value // For Treemap
         }));
         
         // Funnel needs sorting
         if (widget.config.chartType === 'funnel') {
            data.sort((a, b) => b.value - a.value);
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

   }, [batches, datasets, widget.config]);
};

// --- SUB COMPONENTS ---

const WidgetDisplay: React.FC<{ widget: DashboardWidget, data: any }> = ({ widget, data }) => {
   if (!data) return <div className="flex items-center justify-center h-full text-slate-400 text-xs">Chargement...</div>;
   if (data.error) return <div className="flex items-center justify-center h-full text-red-400 text-xs">{data.error}</div>;

   const { unit } = data;

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
               <div key={idx} className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs">
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
   const axisFormatter = (val: any) => `${val.toLocaleString()} ${unit || ''}`;

   if (chartType === 'radial') {
      return (
         <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart cx="50%" cy="50%" innerRadius="10%" outerRadius="100%" barSize={10} data={chartData}>
               <RadialBar
                  background
                  dataKey="value"
                  cornerRadius={10}
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
                  contentStyle={{borderRadius: '6px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}}
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
               />
               <Tooltip 
                 formatter={tooltipFormatter}
                 contentStyle={{borderRadius: '6px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}} 
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
                 contentStyle={{borderRadius: '6px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}} 
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
                 contentStyle={{borderRadius: '6px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}} 
               />
               <Funnel
                  dataKey="value"
                  data={chartData}
                  isAnimationActive
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
               >
                  {chartData.map((entry: any, index: number) => (
                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
               </Pie>
               <Tooltip formatter={tooltipFormatter} />
               <Legend wrapperStyle={{ fontSize: '10px' }} />
            </PieChart>
         </ResponsiveContainer>
      );
   }

   if (chartType === 'line') {
      return (
         <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
               <XAxis dataKey="name" fontSize={10} stroke="#94a3b8" />
               <YAxis fontSize={10} stroke="#94a3b8" />
               <Tooltip formatter={tooltipFormatter} />
               <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot={{r: 2}} />
            </LineChart>
         </ResponsiveContainer>
      );
   }

   return (
      <ResponsiveContainer width="100%" height="100%">
         <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" fontSize={10} stroke="#94a3b8" />
            <YAxis fontSize={10} stroke="#94a3b8" />
            <Tooltip formatter={tooltipFormatter} cursor={{fill: '#f8fafc'}} />
            <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
         </BarChart>
      </ResponsiveContainer>
   );
};

// --- MAIN COMPONENT ---

export const Dashboard: React.FC = () => {
  const { 
     dashboardWidgets, addDashboardWidget, removeDashboardWidget, 
     updateDashboardWidget, moveDashboardWidget, datasets 
  } = useData();
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingWidgetId, setEditingWidgetId] = useState<string | null>(null);

  // Modal New/Edit Widget
  const [showModal, setShowModal] = useState(false);
  const [tempWidget, setTempWidget] = useState<Partial<DashboardWidget>>({
     type: 'kpi',
     size: 'sm',
     config: { metric: 'count' }
  });

  const handleSaveWidget = () => {
     if (!tempWidget.title || !tempWidget.config?.source?.datasetId) return;

     if (editingWidgetId) {
        updateDashboardWidget(editingWidgetId, tempWidget);
     } else {
        addDashboardWidget(tempWidget as any);
     }
     setShowModal(false);
     setEditingWidgetId(null);
     setTempWidget({ type: 'kpi', size: 'sm', config: { metric: 'count' } });
  };

  const openNewWidget = () => {
     setEditingWidgetId(null);
     setTempWidget({
        title: '',
        type: 'kpi',
        size: 'sm',
        config: {
           metric: 'count',
           source: datasets.length > 0 ? { datasetId: datasets[0].id, mode: 'latest' } : undefined
        }
     });
     setShowModal(true);
  };

  const openEditWidget = (w: DashboardWidget) => {
     setEditingWidgetId(w.id);
     setTempWidget({ ...w });
     setShowModal(true);
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

  return (
    <div className="h-full overflow-y-auto p-4 md:p-8 custom-scrollbar">
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
         
         {/* Header */}
         <div className="flex justify-between items-center">
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
                     return (
                        <div className={`bg-white rounded-lg border ${isEditMode ? 'border-blue-300 ring-2 ring-blue-50' : 'border-slate-200'} shadow-sm p-4 flex flex-col h-64 relative group transition-all`}>
                           {isEditMode && (
                              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 p-1 rounded shadow-sm z-10">
                                 <button onClick={() => moveDashboardWidget(widget.id, 'left')} className="p-1 hover:bg-slate-100 rounded text-slate-500"><ArrowLeft className="w-3 h-3" /></button>
                                 <button onClick={() => moveDashboardWidget(widget.id, 'right')} className="p-1 hover:bg-slate-100 rounded text-slate-500"><ArrowRight className="w-3 h-3" /></button>
                                 <button onClick={() => openEditWidget(widget)} className="p-1 hover:bg-blue-50 rounded text-blue-600"><Settings className="w-3 h-3" /></button>
                                 <button onClick={() => removeDashboardWidget(widget.id)} className="p-1 hover:bg-red-50 rounded text-red-600"><Trash2 className="w-3 h-3" /></button>
                              </div>
                           )}
                           <h3 className="text-sm font-bold text-slate-600 mb-4 uppercase tracking-wider truncate" title={widget.title}>
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

      {/* MODAL */}
      {showModal && (
         <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
               <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="text-xl font-bold text-slate-800">
                     {editingWidgetId ? 'Modifier le widget' : 'Nouveau widget'}
                  </h3>
                  <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                     <X className="w-6 h-6" />
                  </button>
               </div>
               
               <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                  
                  {/* 1. General Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Titre du widget</label>
                        <input 
                           type="text" 
                           className="block w-full rounded-md border border-slate-300 bg-white text-slate-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
                           value={tempWidget.title || ''}
                           onChange={e => setTempWidget({...tempWidget, title: e.target.value})}
                           placeholder="Ex: Budget vs Charge"
                        />
                     </div>
                     
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Taille</label>
                        <select 
                           className="block w-full rounded-md border border-slate-300 bg-white text-slate-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
                           value={tempWidget.size}
                           onChange={e => setTempWidget({...tempWidget, size: e.target.value as WidgetSize})}
                        >
                           <option value="sm">Petit (1/4)</option>
                           <option value="md">Moyen (2/4)</option>
                           <option value="lg">Grand (3/4)</option>
                           <option value="full">Large (4/4)</option>
                        </select>
                     </div>

                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Source de données</label>
                        <select 
                           className="block w-full rounded-md border border-slate-300 bg-white text-slate-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
                           value={tempWidget.config?.source?.datasetId || ''}
                           onChange={e => setTempWidget({
                              ...tempWidget, 
                              config: { ...tempWidget.config!, source: { datasetId: e.target.value, mode: 'latest' } }
                           })}
                        >
                           {datasets.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                     </div>
                  </div>

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
                                          {/* Need fields from selected secondary dataset */}
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

                  {/* 2. Visual Type Selector */}
                  <div>
                     <label className="block text-sm font-medium text-slate-700 mb-2">Type de visualisation</label>
                     <div className="grid grid-cols-3 gap-3">
                        {[
                           { id: 'kpi', label: 'Indicateur (KPI)', icon: Activity },
                           { id: 'chart', label: 'Graphique', icon: BarChart3 },
                           { id: 'list', label: 'Classement', icon: ListOrdered },
                        ].map(t => {
                           const Icon = t.icon;
                           const isSelected = tempWidget.type === t.id;
                           return (
                              <button 
                                 key={t.id}
                                 onClick={() => setTempWidget({...tempWidget, type: t.id as WidgetType})}
                                 className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-all
                                    ${isSelected ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                              >
                                 <Icon className="w-4 h-4" />
                                 <span className="font-medium text-sm">{t.label}</span>
                              </button>
                           )
                        })}
                     </div>
                  </div>

                  {/* 3. Specific Config based on Type */}
                  <div className="border-t border-slate-100 pt-4 space-y-4">
                     
                     {/* Metric Config */}
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="block text-sm font-medium text-slate-700 mb-1">Métrique</label>
                           <select 
                              className="block w-full rounded-md border border-slate-300 bg-white text-slate-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
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
                              <label className="block text-sm font-medium text-slate-700 mb-1">Champ valeur</label>
                              <select 
                                 className="block w-full rounded-md border border-slate-300 bg-white text-slate-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
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
                        <div>
                           <label className="block text-sm font-medium text-slate-700 mb-1">Axe de regroupement (Dimension)</label>
                           <select 
                              className="block w-full rounded-md border border-slate-300 bg-white text-slate-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
                              value={tempWidget.config?.dimension || ''}
                              onChange={e => setTempWidget({ ...tempWidget, config: { ...tempWidget.config!, dimension: e.target.value }})}
                           >
                              <option value="">-- Choisir --</option>
                              {allFields.map(f => <option key={f} value={f}>{f}</option>)}
                           </select>
                        </div>
                     )}

                     {/* KPI Specifics */}
                     {tempWidget.type === 'kpi' && (
                        <div className="space-y-4">
                           <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Style du KPI</label>
                              <div className="flex gap-2">
                                 {['simple', 'trend', 'progress'].map(s => (
                                    <button
                                       key={s}
                                       onClick={() => setTempWidget({ ...tempWidget, config: { ...tempWidget.config!, kpiStyle: s as KpiStyle } })}
                                       className={`px-3 py-1.5 rounded text-xs font-medium border ${tempWidget.config?.kpiStyle === s ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-white border-slate-200 text-slate-600'}`}
                                    >
                                       {s === 'simple' ? 'Simple' : s === 'trend' ? 'Avec tendance' : 'Progression'}
                                    </button>
                                 ))}
                              </div>
                           </div>
                           
                           {tempWidget.config?.kpiStyle === 'progress' && (
                              <div>
                                 <label className="block text-sm font-medium text-slate-700 mb-1">Objectif cible (Target)</label>
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
                           <label className="block text-sm font-medium text-slate-700 mb-1">Type de graphique</label>
                           <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                              <button
                                 onClick={() => setTempWidget({ ...tempWidget, config: { ...tempWidget.config!, chartType: 'bar' }})}
                                 className={`flex items-center gap-2 p-2 text-sm border rounded text-left ${tempWidget.config?.chartType === 'bar' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:bg-slate-50'}`}
                              >
                                 <BarChart3 className="w-4 h-4" /> Barres
                              </button>
                              <button
                                 onClick={() => setTempWidget({ ...tempWidget, config: { ...tempWidget.config!, chartType: 'line' }})}
                                 className={`flex items-center gap-2 p-2 text-sm border rounded text-left ${tempWidget.config?.chartType === 'line' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:bg-slate-50'}`}
                              >
                                 <LineChartIcon className="w-4 h-4" /> Courbes
                              </button>
                              <button
                                 onClick={() => setTempWidget({ ...tempWidget, config: { ...tempWidget.config!, chartType: 'pie' }})}
                                 className={`flex items-center gap-2 p-2 text-sm border rounded text-left ${tempWidget.config?.chartType === 'pie' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:bg-slate-50'}`}
                              >
                                 <PieIcon className="w-4 h-4" /> Camembert
                              </button>
                              <button
                                 onClick={() => setTempWidget({ ...tempWidget, config: { ...tempWidget.config!, chartType: 'donut' }})}
                                 className={`flex items-center gap-2 p-2 text-sm border rounded text-left ${tempWidget.config?.chartType === 'donut' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:bg-slate-50'}`}
                              >
                                 <PieIcon className="w-4 h-4" /> Donut
                              </button>
                              <button
                                 onClick={() => setTempWidget({ ...tempWidget, config: { ...tempWidget.config!, chartType: 'radial' }})}
                                 className={`flex items-center gap-2 p-2 text-sm border rounded text-left ${tempWidget.config?.chartType === 'radial' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:bg-slate-50'}`}
                              >
                                 <Activity className="w-4 h-4" /> Jauge
                              </button>
                              <button
                                 onClick={() => setTempWidget({ ...tempWidget, config: { ...tempWidget.config!, chartType: 'radar' }})}
                                 className={`flex items-center gap-2 p-2 text-sm border rounded text-left ${tempWidget.config?.chartType === 'radar' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:bg-slate-50'}`}
                              >
                                 <RadarIcon className="w-4 h-4" /> Radar
                              </button>
                              <button
                                 onClick={() => setTempWidget({ ...tempWidget, config: { ...tempWidget.config!, chartType: 'treemap' }})}
                                 className={`flex items-center gap-2 p-2 text-sm border rounded text-left ${tempWidget.config?.chartType === 'treemap' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:bg-slate-50'}`}
                              >
                                 <LayoutGrid className="w-4 h-4" /> Treemap
                              </button>
                              <button
                                 onClick={() => setTempWidget({ ...tempWidget, config: { ...tempWidget.config!, chartType: 'funnel' }})}
                                 className={`flex items-center gap-2 p-2 text-sm border rounded text-left ${tempWidget.config?.chartType === 'funnel' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:bg-slate-50'}`}
                              >
                                 <Filter className="w-4 h-4" /> Entonnoir
                              </button>
                           </div>
                        </div>
                     )}
                  </div>

               </div>
               
               <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-xl flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setShowModal(false)}>Annuler</Button>
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