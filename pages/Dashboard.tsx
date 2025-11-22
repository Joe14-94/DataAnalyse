

import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { Button } from '../components/ui/Button';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Legend, AreaChart, Area, BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';
import { formatDateFr, parseSmartNumber } from '../utils';
import { 
  Activity, Layout, PieChart as PieIcon, Edit3, Plus, X, ArrowLeft, ArrowRight, Trash2, 
  Maximize2, Minimize2, Settings, BarChart3, LineChart as LineChartIcon, Check, TrendingUp,
  Database, Calendar, MousePointerClick
} from 'lucide-react';
import { DashboardWidget, WidgetConfig, WidgetSize, WidgetType, ChartType, Dataset } from '../types';

// --- UTILS ---

const COLORS = ['#64748b', '#60a5fa', '#34d399', '#f87171', '#a78bfa', '#fbbf24', '#22d3ee', '#f472b6'];

// --- DATA PROCESSING ENGINE ---

const useWidgetData = (widget: DashboardWidget) => {
   const { batches, datasets } = useData();

   return useMemo(() => {
      const { source, metric, dimension, valueField } = widget.config;
      if (!source) return null;

      // 1. Find Dataset
      const dataset = datasets.find(d => d.id === source.datasetId);
      if (!dataset) return { error: 'Jeu de données introuvable' };

      // 2. Find Batch(es)
      const dsBatches = batches
         .filter(b => b.datasetId === source.datasetId)
         .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      if (dsBatches.length === 0) return { error: 'Aucune donnée' };

      let targetBatch = dsBatches[dsBatches.length - 1]; // Latest by default
      let prevBatch = dsBatches.length > 1 ? dsBatches[dsBatches.length - 2] : null;

      if (source.mode === 'specific' && source.batchId) {
         const specific = dsBatches.find(b => b.id === source.batchId);
         if (specific) {
            targetBatch = specific;
            // Prev batch is the one strictly before specific
            const idx = dsBatches.findIndex(b => b.id === source.batchId);
            prevBatch = idx > 0 ? dsBatches[idx - 1] : null;
         }
      }

      const rows = targetBatch.rows;
      const prevRows = prevBatch ? prevBatch.rows : [];

      // 3. Calculate Logic
      
      // KPI
      if (widget.type === 'kpi') {
         let currentVal = 0;
         let prevVal = 0;

         const calc = (r: any[]) => {
            if (metric === 'count') return r.length;
            if (metric === 'sum' && valueField) return r.reduce((sum, item) => sum + parseSmartNumber(item[valueField]), 0);
            if (metric === 'distinct' && dimension) return new Set(r.map(item => item[dimension])).size;
            return 0;
         };

         currentVal = calc(rows);
         if (widget.config.showTrend && prevRows) {
            prevVal = calc(prevRows);
         }

         return { currentVal, prevVal, date: targetBatch.date, datasetName: dataset.name };
      }

      // CHART
      if (widget.type === 'chart' && dimension) {
         const agg: Record<string, number> = {};
         rows.forEach(row => {
            const key = String(row[dimension] || 'Non défini');
            let val = 1;
            if (metric === 'sum' && valueField) {
               val = parseSmartNumber(row[valueField]);
            }
            agg[key] = (agg[key] || 0) + val;
         });

         const data = Object.entries(agg)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);

         return { data, date: targetBatch.date, datasetName: dataset.name };
      }

      return null;
   }, [widget, batches, datasets]);
};

// --- COMPOSANT WIDGET ---

interface WidgetProps {
  widget: DashboardWidget;
  isEditing: boolean;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onRemove: () => void;
  onEdit: () => void;
  onResize: (newSize: WidgetSize) => void;
}

const WidgetItem: React.FC<WidgetProps> = ({ widget, isEditing, onMoveLeft, onMoveRight, onRemove, onEdit, onResize }) => {
  const widgetData = useWidgetData(widget);
  const isLoading = !widgetData;
  const error = widgetData?.error;

  const getSizeClass = (size: WidgetSize) => {
    switch(size) {
      case 'sm': return 'col-span-1';
      case 'md': return 'col-span-1 md:col-span-2';
      case 'lg': return 'col-span-1 md:col-span-2 lg:col-span-3';
      case 'full': return 'col-span-1 md:col-span-2 lg:col-span-4';
      default: return 'col-span-1';
    }
  };

  const tooltipStyle = {
    backgroundColor: '#ffffff',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    color: '#334155',
    padding: '8px',
    fontSize: '12px'
  };

  const nextSize = (): WidgetSize => {
    if (widget.size === 'sm') return 'md';
    if (widget.size === 'md') return 'full';
    return 'sm';
  };

  return (
    <div className={`bg-white rounded-lg border shadow-sm overflow-hidden flex flex-col transition-all duration-200 ${getSizeClass(widget.size)} ${isEditing ? 'border-blue-300 ring-2 ring-blue-50 relative group' : 'border-slate-200'}`}>
      
      {/* EDIT OVERLAY HEADER */}
      {isEditing && (
        <div className="bg-blue-50 p-1.5 flex justify-between items-center border-b border-blue-100">
          <div className="flex items-center gap-1">
            <button onClick={onMoveLeft} className="p-1 hover:bg-white rounded text-slate-500 hover:text-blue-600"><ArrowLeft className="w-3 h-3" /></button>
            <button onClick={onMoveRight} className="p-1 hover:bg-white rounded text-slate-500 hover:text-blue-600"><ArrowRight className="w-3 h-3" /></button>
          </div>
          <div className="flex items-center gap-1">
             <button onClick={() => onResize(nextSize())} className="p-1 hover:bg-white rounded text-slate-500 hover:text-blue-600 flex items-center gap-1 text-[10px] font-bold uppercase">
                <Maximize2 className="w-3 h-3" /> {widget.size}
             </button>
             <div className="h-3 w-px bg-slate-300 mx-1"></div>
             <button onClick={onEdit} className="p-1 hover:bg-white rounded text-slate-500 hover:text-blue-600"><Settings className="w-3 h-3" /></button>
             <button onClick={onRemove} className="p-1 hover:bg-red-100 rounded text-slate-500 hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
          </div>
        </div>
      )}

      {/* CONTENT */}
      <div className="p-4 flex-1 flex flex-col min-h-[140px]">
         <div className="flex justify-between items-start mb-2">
            <h3 className="text-sm font-bold text-slate-700 truncate pr-2" title={widget.title}>{widget.title}</h3>
            {widgetData && !error && (
               <span className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 whitespace-nowrap max-w-[100px] truncate">
                  {widgetData.datasetName}
               </span>
            )}
         </div>
         
         <div className="flex-1 flex items-center justify-center w-full min-h-0 relative">
            {error && (
               <div className="text-center text-slate-400 text-xs p-4 flex flex-col items-center">
                  <Database className="w-6 h-6 mb-2 opacity-50" />
                  {error}
               </div>
            )}

            {!error && widget.type === 'kpi' && widgetData && (
               <div className="flex items-center justify-between w-full">
                  <div>
                     <div className="text-3xl font-bold text-slate-800">{widgetData.currentVal.toLocaleString()}</div>
                     {widget.config.showTrend && (
                        <div className={`text-xs font-medium mt-1 ${widgetData.currentVal >= widgetData.prevVal ? 'text-emerald-600' : 'text-rose-600'}`}>
                           {widgetData.currentVal >= widgetData.prevVal ? '+' : ''}{(widgetData.currentVal - widgetData.prevVal).toLocaleString()} vs préc.
                        </div>
                     )}
                  </div>
                  <div className={`p-3 rounded-full ${widgetData.currentVal >= widgetData.prevVal ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                     <Activity className="w-6 h-6" />
                  </div>
               </div>
            )}

            {!error && widget.type === 'chart' && widgetData && widgetData.data && (
               <div className="w-full h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                     {widget.config.chartType === 'pie' || widget.config.chartType === 'donut' ? (
                        <PieChart>
                           <Pie
                              data={widgetData.data}
                              cx="50%"
                              cy="50%"
                              innerRadius={widget.config.chartType === 'donut' ? 50 : 0}
                              outerRadius={70}
                              paddingAngle={2}
                              dataKey="value"
                              stroke="#fff"
                              strokeWidth={2}
                           >
                              {widgetData.data.map((entry: any, index: number) => (
                                 <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                           </Pie>
                           <Tooltip contentStyle={tooltipStyle} />
                           <Legend verticalAlign="middle" align="right" layout="vertical" wrapperStyle={{fontSize: '10px'}} />
                        </PieChart>
                     ) : widget.config.chartType === 'line' ? (
                        <LineChart data={widgetData.data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                           <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                           <YAxis stroke="#94a3b8" fontSize={10} />
                           <Tooltip contentStyle={tooltipStyle} />
                           <Line type="monotone" dataKey="value" stroke="#60a5fa" strokeWidth={2} dot={false} />
                        </LineChart>
                     ) : (
                        <BarChart data={widgetData.data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                           <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                           <YAxis stroke="#94a3b8" fontSize={10} />
                           <Tooltip contentStyle={tooltipStyle} cursor={{fill: '#f8fafc'}} />
                           <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                              {widgetData.data.map((entry: any, index: number) => (
                                 <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                           </Bar>
                        </BarChart>
                     )}
                  </ResponsiveContainer>
               </div>
            )}
         </div>
      </div>
    </div>
  );
};

// --- WIDGET LIBRARY MODAL ---

interface WidgetLibraryProps {
   isOpen: boolean;
   onClose: () => void;
   onSelect: (template: Partial<DashboardWidget>) => void;
}

const WidgetLibrary: React.FC<WidgetLibraryProps> = ({ isOpen, onClose, onSelect }) => {
   if (!isOpen) return null;

   const templates = [
      {
         title: 'Chiffre Clé (KPI)',
         desc: 'Affiche une valeur unique (somme, compte) avec une tendance optionnelle.',
         icon: Activity,
         template: { type: 'kpi', size: 'sm', config: { metric: 'count', showTrend: true } } as Partial<DashboardWidget>
      },
      {
         title: 'Graphique en Barres',
         desc: 'Idéal pour comparer des catégories ou des volumes.',
         icon: BarChart3,
         template: { type: 'chart', size: 'md', config: { metric: 'count', chartType: 'bar' } } as Partial<DashboardWidget>
      },
      {
         title: 'Répartition (Donut)',
         desc: 'Visualisez la proportion de chaque catégorie dans un ensemble.',
         icon: PieIcon,
         template: { type: 'chart', size: 'md', config: { metric: 'count', chartType: 'donut' } } as Partial<DashboardWidget>
      },
      {
         title: 'Évolution (Ligne)',
         desc: 'Suivez une tendance temporelle ou continue.',
         icon: TrendingUp,
         template: { type: 'chart', size: 'full', config: { metric: 'count', chartType: 'line' } } as Partial<DashboardWidget>
      }
   ];

   return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
         <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
               <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Layout className="w-5 h-5 text-blue-600" /> Bibliothèque de widgets
               </h3>
               <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/50">
               {templates.map((t, idx) => (
                  <button 
                     key={idx}
                     onClick={() => onSelect(t.template)}
                     className="flex items-start gap-4 p-4 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-blue-400 hover:ring-2 hover:ring-blue-50 transition-all text-left group"
                  >
                     <div className="p-3 rounded-full bg-slate-50 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                        <t.icon className="w-6 h-6" />
                     </div>
                     <div>
                        <h4 className="font-bold text-slate-800 group-hover:text-blue-700">{t.title}</h4>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{t.desc}</p>
                     </div>
                  </button>
               ))}
            </div>
         </div>
      </div>
   );
};

// --- MODALE CONFIGURATION ---

interface WidgetConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (widget: Partial<DashboardWidget>) => void;
  initialWidget?: DashboardWidget | null;
}

const WidgetConfigModal: React.FC<WidgetConfigModalProps> = ({ isOpen, onClose, onSave, initialWidget }) => {
   const { datasets, batches } = useData();
   
   const [title, setTitle] = useState('');
   const [type, setType] = useState<WidgetType>('kpi');
   const [size, setSize] = useState<WidgetSize>('sm');
   const [config, setConfig] = useState<WidgetConfig>({ metric: 'count' });

   // Source state
   const [datasetId, setDatasetId] = useState<string>('');
   const [batchMode, setBatchMode] = useState<'latest' | 'specific'>('latest');
   const [selectedBatchId, setSelectedBatchId] = useState<string>('');

   // Derived fields based on selected dataset
   const selectedDataset = useMemo(() => datasets.find(d => d.id === datasetId), [datasets, datasetId]);
   const availableFields = useMemo(() => selectedDataset ? selectedDataset.fields : [], [selectedDataset]);
   const availableBatches = useMemo(() => batches.filter(b => b.datasetId === datasetId).sort((a,b) => b.createdAt - a.createdAt), [batches, datasetId]);

   const numericFields = useMemo(() => {
       if (!availableFields.length) return [];
       // Simple logic: check config or basic check. Here we rely on fieldConfigs or generic
       return availableFields.filter(f => {
           const conf = selectedDataset?.fieldConfigs?.[f];
           return conf?.type === 'number' || f.toLowerCase().includes('montant') || f.toLowerCase().includes('budget');
       });
   }, [availableFields, selectedDataset]);

   useEffect(() => {
      if (isOpen) {
         if (initialWidget) {
            setTitle(initialWidget.title);
            setType(initialWidget.type);
            setSize(initialWidget.size);
            setConfig(initialWidget.config);
            
            if (initialWidget.config.source) {
               setDatasetId(initialWidget.config.source.datasetId);
               setBatchMode(initialWidget.config.source.mode);
               if (initialWidget.config.source.batchId) setSelectedBatchId(initialWidget.config.source.batchId);
            }
         } else {
             // Default: Pick first dataset
             if (datasets.length > 0) setDatasetId(datasets[0].id);
             setTitle('Nouvel indicateur');
         }
      }
   }, [isOpen, initialWidget, datasets]);

   if (!isOpen) return null;

   const handleSave = () => {
      if (!datasetId) {
         alert("Veuillez sélectionner un jeu de données.");
         return;
      }

      const newConfig: WidgetConfig = {
         ...config,
         source: {
            datasetId,
            mode: batchMode,
            batchId: batchMode === 'specific' ? selectedBatchId : undefined
         }
      };

      onSave({ title, type, size, config: newConfig });
      onClose();
   };

   return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
         <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
               <h3 className="font-bold text-slate-800">{initialWidget ? 'Configurer le widget' : 'Ajouter un widget'}</h3>
               <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6 bg-white custom-scrollbar">
               
               {/* 1. SOURCE DE DONNEES */}
               <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 space-y-3">
                  <h4 className="text-xs font-bold text-blue-700 uppercase flex items-center gap-2">
                     <Database className="w-3 h-3" /> Source de données
                  </h4>
                  
                  <div>
                     <label className="block text-xs font-semibold text-slate-600 mb-1">Jeu de données (Typologie)</label>
                     <select 
                        className="w-full p-2 border border-blue-200 rounded text-sm bg-white focus:ring-blue-500"
                        value={datasetId}
                        onChange={(e) => { setDatasetId(e.target.value); setConfig({...config, dimension: '', valueField: ''}); }}
                     >
                        {datasets.length === 0 && <option value="">Aucun jeu de données disponible</option>}
                        {datasets.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                     </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                     <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Période</label>
                        <select 
                           className="w-full p-2 border border-blue-200 rounded text-sm bg-white"
                           value={batchMode}
                           onChange={(e) => setBatchMode(e.target.value as any)}
                        >
                           <option value="latest">Dernier import (Dynamique)</option>
                           <option value="specific">Date figée</option>
                        </select>
                     </div>
                     {batchMode === 'specific' && (
                        <div className="animate-in fade-in">
                           <label className="block text-xs font-semibold text-slate-600 mb-1">Date spécifique</label>
                           <select 
                              className="w-full p-2 border border-blue-200 rounded text-sm bg-white"
                              value={selectedBatchId}
                              onChange={(e) => setSelectedBatchId(e.target.value)}
                           >
                              <option value="">Choisir...</option>
                              {availableBatches.map(b => (
                                 <option key={b.id} value={b.id}>{formatDateFr(b.date)}</option>
                              ))}
                           </select>
                        </div>
                     )}
                  </div>
               </div>

               {/* 2. INFO GENERALES */}
               <div className="space-y-3">
                  <label className="block text-sm font-bold text-slate-700">Titre</label>
                  <input 
                     type="text" 
                     className="w-full p-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                     value={title}
                     onChange={e => setTitle(e.target.value)}
                     placeholder="Ex: Chiffre d'affaires"
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Taille</label>
                        <select 
                           className="w-full p-2 border border-slate-300 rounded-md text-sm"
                           value={size}
                           onChange={e => setSize(e.target.value as WidgetSize)}
                        >
                           <option value="sm">Petit (1/4)</option>
                           <option value="md">Moyen (1/2)</option>
                           <option value="lg">Grand (3/4)</option>
                           <option value="full">Large (4/4)</option>
                        </select>
                     </div>
                     <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Type Visualisation</label>
                         <div className="flex rounded-md shadow-sm">
                           <button onClick={() => setType('kpi')} className={`flex-1 px-2 py-2 text-xs font-medium rounded-l-md border ${type === 'kpi' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-300'}`}>KPI</button>
                           <button onClick={() => setType('chart')} className={`flex-1 px-2 py-2 text-xs font-medium rounded-r-md border-t border-b border-r ${type === 'chart' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-300'}`}>Graph</button>
                        </div>
                     </div>
                  </div>
               </div>

               {/* 3. CONFIG DATA */}
               <div className="space-y-3 pt-2 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                     <Layout className="w-3 h-3" /> Paramètres du calcul
                  </h4>

                  <div className="space-y-2">
                     <label className="block text-xs font-semibold text-slate-600">Métrique</label>
                     <select 
                        className="w-full p-2 border border-slate-300 rounded-md text-sm bg-white"
                        value={config.metric}
                        onChange={e => setConfig({...config, metric: e.target.value as any})}
                     >
                        <option value="count">Compte (Nombre de lignes)</option>
                        <option value="sum">Somme (Total d'un champ)</option>
                        <option value="distinct">Distinct (Valeurs uniques)</option>
                     </select>
                  </div>

                  {config.metric === 'sum' && (
                     <div className="space-y-2 animate-in fade-in">
                        <label className="block text-xs font-semibold text-slate-600">Champ Valeur (Somme)</label>
                        <select 
                           className="w-full p-2 border border-slate-300 rounded-md text-sm bg-white"
                           value={config.valueField || ''}
                           onChange={e => setConfig({...config, valueField: e.target.value})}
                        >
                           <option value="">-- Choisir --</option>
                           {availableFields.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                     </div>
                  )}

                  {(type === 'chart' || config.metric === 'distinct') && (
                     <div className="space-y-2 animate-in fade-in">
                        <label className="block text-xs font-semibold text-slate-600">Axe / Groupement</label>
                        <select 
                           className="w-full p-2 border border-slate-300 rounded-md text-sm bg-white"
                           value={config.dimension || ''}
                           onChange={e => setConfig({...config, dimension: e.target.value})}
                        >
                           <option value="">-- Choisir --</option>
                           {availableFields.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                     </div>
                  )}

                  {/* CHART OPTIONS */}
                  {type === 'chart' && (
                     <div className="space-y-2 pt-2">
                        <label className="block text-xs font-semibold text-slate-600">Type de graphique</label>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                           {[
                              { id: 'bar', icon: BarChart3, label: 'Barres' },
                              { id: 'line', icon: LineChartIcon, label: 'Ligne' },
                              { id: 'pie', icon: PieIcon, label: 'Donut' },
                              { id: 'area', icon: TrendingUp, label: 'Aire' },
                           ].map(c => (
                              <button 
                                 key={c.id}
                                 onClick={() => setConfig({...config, chartType: c.id as ChartType})}
                                 className={`flex flex-col items-center justify-center p-2 min-w-[60px] rounded border ${config.chartType === c.id ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                              >
                                 <c.icon className="w-4 h-4 mb-1" />
                                 <span className="text-[9px]">{c.label}</span>
                              </button>
                           ))}
                        </div>
                     </div>
                  )}

                  {type === 'kpi' && (
                      <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-slate-50">
                        <input 
                           type="checkbox" 
                           checked={config.showTrend || false}
                           onChange={e => setConfig({...config, showTrend: e.target.checked})}
                           className="rounded text-blue-600 border-slate-300"
                        />
                        <span className="text-xs text-slate-700">Afficher évolution vs import précédent</span>
                     </label>
                  )}
               </div>

            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
               <Button variant="outline" onClick={onClose}>Annuler</Button>
               <Button onClick={handleSave}>Enregistrer</Button>
            </div>
         </div>
      </div>
   );
};

// --- MAIN COMPONENT ---

export const Dashboard: React.FC = () => {
  const { dashboardWidgets, addDashboardWidget, updateDashboardWidget, removeDashboardWidget, moveDashboardWidget, resetDashboard } = useData();
  const [isEditing, setIsEditing] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [editingWidgetId, setEditingWidgetId] = useState<string | null>(null);
  const [templateToAdd, setTemplateToAdd] = useState<Partial<DashboardWidget> | null>(null);

  const handleAddFromLibrary = (template: Partial<DashboardWidget>) => {
     setTemplateToAdd(template);
     setIsLibraryOpen(false);
     setEditingWidgetId(null); // Mode création
     setIsConfigOpen(true);
  };

  const handleSaveWidget = (widgetData: Partial<DashboardWidget>) => {
     if (editingWidgetId) {
        updateDashboardWidget(editingWidgetId, widgetData);
     } else {
        // Merge template config if exists to keep defaults
        const finalConfig = templateToAdd ? { ...templateToAdd.config, ...widgetData.config } : widgetData.config;
        const finalWidget = { ...widgetData, config: finalConfig };
        
        addDashboardWidget(finalWidget as any);
     }
     setTemplateToAdd(null);
     setEditingWidgetId(null);
  };

  const openEditModal = (w: DashboardWidget) => {
     setEditingWidgetId(w.id);
     setIsConfigOpen(true);
  };

  return (
    <div className="h-full overflow-y-auto p-4 md:p-8 custom-scrollbar bg-slate-50/50">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
         <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
               <Layout className="w-6 h-6 text-blue-600" />
               Tableau de Bord Global
            </h2>
            <p className="text-slate-500 text-sm mt-1">
               Vue consolidée de vos indicateurs clés multi-sources.
            </p>
         </div>

         <div className="flex gap-2">
            {isEditing ? (
               <>
                  <Button onClick={() => setIsEditing(false)} variant="primary" className="bg-slate-800 hover:bg-slate-900">
                     <Check className="w-4 h-4 mr-2" /> Terminer
                  </Button>
               </>
            ) : (
               <Button onClick={() => setIsEditing(true)} variant="outline" className="bg-white">
                  <Edit3 className="w-4 h-4 mr-2" /> Personnaliser
               </Button>
            )}
         </div>
      </div>

      {/* WIDGET GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pb-20">
         {dashboardWidgets.map((widget) => (
            <WidgetItem 
               key={widget.id}
               widget={widget}
               isEditing={isEditing}
               onMoveLeft={() => moveDashboardWidget(widget.id, 'left')}
               onMoveRight={() => moveDashboardWidget(widget.id, 'right')}
               onRemove={() => {
                  if (window.confirm('Supprimer ce widget ?')) removeDashboardWidget(widget.id);
               }}
               onEdit={() => openEditModal(widget)}
               onResize={(newSize) => updateDashboardWidget(widget.id, { size: newSize })}
            />
         ))}

         {/* ADD BUTTON (Only in Edit Mode) */}
         {isEditing && (
            <button 
               onClick={() => setIsLibraryOpen(true)}
               className="col-span-1 min-h-[140px] border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-all cursor-pointer group"
            >
               <div className="p-3 rounded-full bg-slate-100 group-hover:bg-white mb-2">
                  <Plus className="w-6 h-6" />
               </div>
               <span className="text-sm font-medium">Ajouter un widget</span>
            </button>
         )}

         {/* Empty State */}
         {!isEditing && dashboardWidgets.length === 0 && (
            <div className="col-span-full py-16 text-center bg-white rounded-lg border border-dashed border-slate-300">
               <MousePointerClick className="w-12 h-12 text-slate-300 mx-auto mb-3" />
               <p className="text-slate-600 font-medium">Votre tableau de bord est vide</p>
               <p className="text-slate-500 text-sm mb-4 max-w-md mx-auto">
                  Vous pouvez construire votre vue idéale en mélangeant des données issues de différents tableaux.
               </p>
               <Button onClick={() => setIsEditing(true)}>
                  <Edit3 className="w-4 h-4 mr-2" /> Commencer la configuration
               </Button>
            </div>
         )}
      </div>

      {/* Edit Mode Actions Footer */}
      {isEditing && (
         <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-4 z-40 animate-in slide-in-from-bottom-4">
            <span className="text-sm font-bold">Mode Édition</span>
            <div className="h-4 w-px bg-slate-600"></div>
            <button onClick={() => setIsLibraryOpen(true)} className="flex items-center gap-2 hover:text-blue-300 text-xs font-medium">
               <Plus className="w-4 h-4" /> Ajouter
            </button>
            <button onClick={() => { if(window.confirm('Tout effacer ?')) resetDashboard() }} className="flex items-center gap-2 hover:text-red-300 text-xs font-medium">
               <Minimize2 className="w-4 h-4" /> Vider
            </button>
            <div className="h-4 w-px bg-slate-600"></div>
            <button onClick={() => setIsEditing(false)} className="bg-white text-slate-900 px-3 py-1 rounded-full text-xs font-bold hover:bg-blue-50">
               OK
            </button>
         </div>
      )}

      {/* Modals */}
      <WidgetLibrary 
         isOpen={isLibraryOpen}
         onClose={() => setIsLibraryOpen(false)}
         onSelect={handleAddFromLibrary}
      />

      <WidgetConfigModal 
         isOpen={isConfigOpen}
         onClose={() => { setIsConfigOpen(false); setEditingWidgetId(null); setTemplateToAdd(null); }}
         onSave={handleSaveWidget}
         initialWidget={editingWidgetId ? dashboardWidgets.find(w => w.id === editingWidgetId) : (templateToAdd ? { ...templateToAdd, title: '', id: '' } as any : null)}
      />

    </div>
  );
};