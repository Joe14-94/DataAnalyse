
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
  Maximize2, Minimize2, Settings, BarChart3, LineChart as LineChartIcon, Check, TrendingUp
} from 'lucide-react';
import { DashboardWidget, WidgetConfig, WidgetSize, WidgetType, ChartType } from '../types';

// --- UTILS DE CALCUL ---

const COLORS = ['#64748b', '#60a5fa', '#34d399', '#f87171', '#a78bfa', '#fbbf24', '#22d3ee', '#f472b6'];

const calculateWidgetData = (widget: DashboardWidget, rows: any[], prevRows?: any[]) => {
  const { metric, dimension, valueField } = widget.config;

  // 1. KPI Logic
  if (widget.type === 'kpi') {
    let currentVal = 0;
    let prevVal = 0;

    // Calc Current
    if (metric === 'count') currentVal = rows.length;
    else if (metric === 'sum' && valueField) {
      currentVal = rows.reduce((sum, r) => sum + parseSmartNumber(r[valueField]), 0);
    } else if (metric === 'distinct' && dimension) {
      currentVal = new Set(rows.map(r => r[dimension])).size;
    }

    // Calc Prev
    if (prevRows && widget.config.showTrend) {
      if (metric === 'count') prevVal = prevRows.length;
      else if (metric === 'sum' && valueField) {
        prevVal = prevRows.reduce((sum, r) => sum + parseSmartNumber(r[valueField]), 0);
      } else if (metric === 'distinct' && dimension) {
        prevVal = new Set(prevRows.map(r => r[dimension])).size;
      }
    }

    return { currentVal, prevVal };
  }

  // 2. Chart Logic
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
      .slice(0, 10); // Top 10 par défaut

    return data;
  }

  return null;
};

// --- COMPOSANT WIDGET ---

interface WidgetProps {
  widget: DashboardWidget;
  data: any;
  isEditing: boolean;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onRemove: () => void;
  onEdit: () => void;
  onResize: (newSize: WidgetSize) => void;
}

const WidgetItem: React.FC<WidgetProps> = ({ widget, data, isEditing, onMoveLeft, onMoveRight, onRemove, onEdit, onResize }) => {
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
            <button onClick={onMoveLeft} className="p-1 hover:bg-white rounded text-slate-500 hover:text-blue-600" title="Déplacer vers la gauche/haut"><ArrowLeft className="w-3 h-3" /></button>
            <button onClick={onMoveRight} className="p-1 hover:bg-white rounded text-slate-500 hover:text-blue-600" title="Déplacer vers la droite/bas"><ArrowRight className="w-3 h-3" /></button>
          </div>
          <div className="flex items-center gap-1">
             <button onClick={() => onResize(nextSize())} className="p-1 hover:bg-white rounded text-slate-500 hover:text-blue-600 flex items-center gap-1 text-[10px] font-bold uppercase" title="Redimensionner">
                <Maximize2 className="w-3 h-3" /> {widget.size}
             </button>
             <div className="h-3 w-px bg-slate-300 mx-1"></div>
             <button onClick={onEdit} className="p-1 hover:bg-white rounded text-slate-500 hover:text-blue-600" title="Configurer"><Settings className="w-3 h-3" /></button>
             <button onClick={onRemove} className="p-1 hover:bg-red-100 rounded text-slate-500 hover:text-red-600" title="Supprimer"><Trash2 className="w-3 h-3" /></button>
          </div>
        </div>
      )}

      {/* CONTENT */}
      <div className="p-4 flex-1 flex flex-col min-h-[140px]">
         <h3 className="text-sm font-bold text-slate-700 mb-3 truncate" title={widget.title}>{widget.title}</h3>
         
         <div className="flex-1 flex items-center justify-center w-full min-h-0">
            {widget.type === 'kpi' && data && (
               <div className="flex items-center justify-between w-full">
                  <div>
                     <div className="text-3xl font-bold text-slate-800">{data.currentVal.toLocaleString()}</div>
                     {widget.config.showTrend && (
                        <div className={`text-xs font-medium mt-1 ${data.currentVal >= data.prevVal ? 'text-emerald-600' : 'text-rose-600'}`}>
                           {data.currentVal >= data.prevVal ? '+' : ''}{(data.currentVal - data.prevVal).toLocaleString()} vs préc.
                        </div>
                     )}
                  </div>
                  <div className={`p-3 rounded-full ${data.currentVal >= data.prevVal ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                     <Activity className="w-6 h-6" />
                  </div>
               </div>
            )}

            {widget.type === 'chart' && data && Array.isArray(data) && (
               <div className="w-full h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                     {widget.config.chartType === 'pie' || widget.config.chartType === 'donut' ? (
                        <PieChart>
                           <Pie
                              data={data}
                              cx="50%"
                              cy="50%"
                              innerRadius={widget.config.chartType === 'donut' ? 50 : 0}
                              outerRadius={70}
                              paddingAngle={2}
                              dataKey="value"
                              stroke="#fff"
                              strokeWidth={2}
                           >
                              {data.map((entry: any, index: number) => (
                                 <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                           </Pie>
                           <Tooltip contentStyle={tooltipStyle} />
                           <Legend verticalAlign="middle" align="right" layout="vertical" wrapperStyle={{fontSize: '10px'}} />
                        </PieChart>
                     ) : widget.config.chartType === 'line' ? (
                        <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                           <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                           <YAxis stroke="#94a3b8" fontSize={10} />
                           <Tooltip contentStyle={tooltipStyle} />
                           <Line type="monotone" dataKey="value" stroke="#60a5fa" strokeWidth={2} dot={false} />
                        </LineChart>
                     ) : (
                        <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                           <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                           <YAxis stroke="#94a3b8" fontSize={10} />
                           <Tooltip contentStyle={tooltipStyle} cursor={{fill: '#f8fafc'}} />
                           <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                              {data.map((entry: any, index: number) => (
                                 <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                           </Bar>
                        </BarChart>
                     )}
                  </ResponsiveContainer>
               </div>
            )}

            {(!data || (Array.isArray(data) && data.length === 0)) && (
               <div className="text-slate-300 text-xs italic">Aucune donnée</div>
            )}
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
  fields: string[];
  numericFields: string[];
}

const WidgetConfigModal: React.FC<WidgetConfigModalProps> = ({ isOpen, onClose, onSave, initialWidget, fields, numericFields }) => {
   const [title, setTitle] = useState('');
   const [type, setType] = useState<WidgetType>('kpi');
   const [size, setSize] = useState<WidgetSize>('sm');
   const [config, setConfig] = useState<WidgetConfig>({ metric: 'count' });

   useEffect(() => {
      if (isOpen) {
         if (initialWidget) {
            setTitle(initialWidget.title);
            setType(initialWidget.type);
            setSize(initialWidget.size);
            setConfig(initialWidget.config);
         } else {
            // Defaults
            setTitle('Nouvel indicateur');
            setType('kpi');
            setSize('sm');
            setConfig({ metric: 'count', showTrend: true });
         }
      }
   }, [isOpen, initialWidget]);

   if (!isOpen) return null;

   const handleSave = () => {
      onSave({ title, type, size, config });
      onClose();
   };

   return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
         <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
               <h3 className="font-bold text-slate-800">{initialWidget ? 'Configurer le widget' : 'Ajouter un widget'}</h3>
               <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-5 bg-white">
               
               {/* 1. GENERAL */}
               <div className="space-y-3">
                  <label className="block text-sm font-bold text-slate-700">Titre</label>
                  <input 
                     type="text" 
                     className="w-full p-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-800"
                     value={title}
                     onChange={e => setTitle(e.target.value)}
                     placeholder="Ex: Chiffre d'affaires"
                  />
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <label className="block text-sm font-bold text-slate-700">Type</label>
                     <div className="flex rounded-md shadow-sm">
                        <button onClick={() => { setType('kpi'); setSize('sm'); }} className={`flex-1 px-3 py-2 text-xs font-medium rounded-l-md border ${type === 'kpi' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>
                           Chiffre clé
                        </button>
                        <button onClick={() => { setType('chart'); setSize('md'); }} className={`flex-1 px-3 py-2 text-xs font-medium rounded-r-md border-t border-b border-r ${type === 'chart' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>
                           Graphique
                        </button>
                     </div>
                  </div>

                  <div className="space-y-2">
                     <label className="block text-sm font-bold text-slate-700">Taille</label>
                     <select 
                        className="w-full p-2 border border-slate-300 rounded-md text-sm bg-white text-slate-800"
                        value={size}
                        onChange={e => setSize(e.target.value as WidgetSize)}
                     >
                        <option value="sm">Petit (1 col)</option>
                        <option value="md">Moyen (2 col)</option>
                        <option value="lg">Grand (3 col)</option>
                        <option value="full">Pleine largeur</option>
                     </select>
                  </div>
               </div>

               {/* 2. DONNEES */}
               <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                     <Layout className="w-3 h-3" /> Configuration des données
                  </h4>
                  
                  <div className="space-y-2">
                     <label className="block text-xs font-semibold text-slate-600">Métrique (Calcul)</label>
                     <select 
                        className="w-full p-2 border border-slate-300 rounded-md text-sm bg-white text-slate-800"
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
                        <label className="block text-xs font-semibold text-slate-600">Champ Valeur</label>
                        <select 
                           className="w-full p-2 border border-slate-300 rounded-md text-sm bg-white text-slate-800"
                           value={config.valueField || ''}
                           onChange={e => setConfig({...config, valueField: e.target.value})}
                        >
                           <option value="">-- Choisir un champ --</option>
                           {numericFields.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                     </div>
                  )}

                  {(type === 'chart' || config.metric === 'distinct') && (
                     <div className="space-y-2 animate-in fade-in">
                        <label className="block text-xs font-semibold text-slate-600">Axe / Groupement</label>
                        <select 
                           className="w-full p-2 border border-slate-300 rounded-md text-sm bg-white text-slate-800"
                           value={config.dimension || ''}
                           onChange={e => setConfig({...config, dimension: e.target.value})}
                        >
                           <option value="">-- Choisir un champ --</option>
                           {fields.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                     </div>
                  )}
               </div>

               {/* 3. VISUALISATION */}
               {type === 'chart' && (
                  <div className="space-y-2">
                     <label className="block text-sm font-bold text-slate-700">Type de graphique</label>
                     <div className="flex gap-2 overflow-x-auto pb-2">
                        {[
                           { id: 'bar', icon: BarChart3, label: 'Barres' },
                           { id: 'line', icon: LineChartIcon, label: 'Ligne' },
                           { id: 'pie', icon: PieIcon, label: 'Camembert' },
                           { id: 'donut', icon: PieIcon, label: 'Donut' },
                           { id: 'area', icon: TrendingUp, label: 'Aire' },
                        ].map(c => (
                           <button 
                              key={c.id}
                              onClick={() => setConfig({...config, chartType: c.id as ChartType})}
                              className={`flex flex-col items-center justify-center p-2 min-w-[60px] rounded border ${config.chartType === c.id ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                           >
                              <c.icon className="w-5 h-5 mb-1" />
                              <span className="text-[10px]">{c.label}</span>
                           </button>
                        ))}
                     </div>
                  </div>
               )}
               
               {type === 'kpi' && (
                  <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-2 rounded border border-slate-200 hover:bg-white hover:border-slate-300 transition-colors">
                     <input 
                        type="checkbox" 
                        checked={config.showTrend || false}
                        onChange={e => setConfig({...config, showTrend: e.target.checked})}
                        className="rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                     />
                     <span className="text-sm text-slate-700">Afficher la tendance (vs import précédent)</span>
                  </label>
               )}

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
  const { batches, currentDataset, addWidget, updateWidget, removeWidget, moveWidget, resetDashboard } = useData();
  const [isEditing, setIsEditing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWidgetId, setEditingWidgetId] = useState<string | null>(null);

  // Data preparation
  const latestBatch = useMemo(() => batches.length > 0 ? batches[batches.length - 1] : null, [batches]);
  const prevBatch = useMemo(() => batches.length > 1 ? batches[batches.length - 2] : null, [batches]);
  const rows = latestBatch ? latestBatch.rows : [];
  const prevRows = prevBatch ? prevBatch.rows : [];

  // Fields logic
  const fields = useMemo(() => currentDataset ? currentDataset.fields : [], [currentDataset]);
  const numericFields = useMemo(() => {
     if (!rows.length) return [];
     return fields.filter(f => rows.slice(0, 10).some(r => {
        const val = r[f];
        return val !== undefined && val !== '' && (parseSmartNumber(val) !== 0 || val === '0');
     }));
  }, [fields, rows]);

  const widgets = currentDataset?.widgets || [];

  if (!currentDataset) {
     return (
      <div className="h-full flex flex-col items-center justify-center text-center p-4">
        <div className="bg-slate-100 p-4 rounded-full mb-4">
          <Layout className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-medium text-slate-900">Aucun tableau sélectionné</h3>
        <p className="text-slate-500 max-w-sm mt-2">
          Sélectionnez un tableau existant dans le menu ou créez-en un nouveau via l'import.
        </p>
      </div>
     );
  }

  const handleSaveWidget = (widgetData: Partial<DashboardWidget>) => {
     if (editingWidgetId) {
        updateWidget(editingWidgetId, widgetData);
     } else {
        addWidget(widgetData as any);
     }
     setEditingWidgetId(null);
  };

  const openAddModal = () => {
     setEditingWidgetId(null);
     setIsModalOpen(true);
  };

  const openEditModal = (w: DashboardWidget) => {
     setEditingWidgetId(w.id);
     setIsModalOpen(true);
  };

  return (
    <div className="h-full overflow-y-auto p-4 md:p-8 custom-scrollbar bg-slate-50/50">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
         <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
               <Layout className="w-6 h-6 text-blue-600" />
               Tableau de Bord
            </h2>
            <p className="text-slate-500 text-sm mt-1">
               Vue d'ensemble : {currentDataset.name} 
               {latestBatch && <span className="ml-2 text-xs bg-white px-2 py-0.5 rounded border border-slate-200">Données du {formatDateFr(latestBatch.date)}</span>}
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
         {widgets.map((widget) => (
            <WidgetItem 
               key={widget.id}
               widget={widget}
               data={calculateWidgetData(widget, rows, prevRows)}
               isEditing={isEditing}
               onMoveLeft={() => moveWidget(widget.id, 'left')}
               onMoveRight={() => moveWidget(widget.id, 'right')}
               onRemove={() => {
                  if (window.confirm('Supprimer ce widget ?')) removeWidget(widget.id);
               }}
               onEdit={() => openEditModal(widget)}
               onResize={(newSize) => updateWidget(widget.id, { size: newSize })}
            />
         ))}

         {/* ADD BUTTON (Only in Edit Mode) */}
         {isEditing && (
            <button 
               onClick={openAddModal}
               className="col-span-1 min-h-[140px] border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-all cursor-pointer group"
            >
               <div className="p-3 rounded-full bg-slate-100 group-hover:bg-white mb-2">
                  <Plus className="w-6 h-6" />
               </div>
               <span className="text-sm font-medium">Ajouter un widget</span>
            </button>
         )}

         {/* Empty State */}
         {!isEditing && widgets.length === 0 && (
            <div className="col-span-full py-12 text-center bg-white rounded-lg border border-dashed border-slate-300">
               <Layout className="w-12 h-12 text-slate-300 mx-auto mb-3" />
               <p className="text-slate-600 font-medium">Tableau de bord vide</p>
               <p className="text-slate-500 text-sm mb-4">Configurez vos indicateurs pour suivre votre activité.</p>
               <Button onClick={() => setIsEditing(true)}>
                  <Edit3 className="w-4 h-4 mr-2" /> Configurer maintenant
               </Button>
            </div>
         )}
      </div>

      {/* Edit Mode Actions Footer */}
      {isEditing && (
         <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-4 z-40 animate-in slide-in-from-bottom-4">
            <span className="text-sm font-bold">Mode Édition</span>
            <div className="h-4 w-px bg-slate-600"></div>
            <button onClick={openAddModal} className="flex items-center gap-2 hover:text-blue-300 text-xs font-medium">
               <Plus className="w-4 h-4" /> Ajouter
            </button>
            <button onClick={() => { if(window.confirm('Réinitialiser la mise en page par défaut ?')) resetDashboard() }} className="flex items-center gap-2 hover:text-red-300 text-xs font-medium">
               <Minimize2 className="w-4 h-4" /> Réinitialiser
            </button>
            <div className="h-4 w-px bg-slate-600"></div>
            <button onClick={() => setIsEditing(false)} className="bg-white text-slate-900 px-3 py-1 rounded-full text-xs font-bold hover:bg-blue-50">
               OK
            </button>
         </div>
      )}

      {/* Configuration Modal */}
      <WidgetConfigModal 
         isOpen={isModalOpen}
         onClose={() => { setIsModalOpen(false); setEditingWidgetId(null); }}
         onSave={handleSaveWidget}
         initialWidget={editingWidgetId ? widgets.find(w => w.id === editingWidgetId) : null}
         fields={fields}
         numericFields={numericFields}
      />

    </div>
  );
};
