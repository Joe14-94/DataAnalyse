
import React, { useMemo, useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { Card } from '../components/ui/Card';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Legend, AreaChart, Area, BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';
import { formatDateFr } from '../utils';
import { Users, TrendingUp, Activity, Layout, PieChart as PieIcon, Filter } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { batches, currentDataset } = useData();

  // --- Configuration State ---
  const [primaryField, setPrimaryField] = useState<string>('');
  const [secondaryField, setSecondaryField] = useState<string>('');

  // Get fields from current dataset
  const fields = useMemo(() => currentDataset ? currentDataset.fields : [], [currentDataset]);

  // Reset or Init configuration when dataset changes
  useEffect(() => {
    if (fields.length > 0) {
      // Try to keep selection if valid, otherwise default
      if (!primaryField || !fields.includes(primaryField)) {
        setPrimaryField(fields[0]);
      }
      
      if (fields.length > 1) {
        if (!secondaryField || !fields.includes(secondaryField)) {
          setSecondaryField(fields[1]);
        }
      } else {
        setSecondaryField('');
      }
    } else {
      setPrimaryField('');
      setSecondaryField('');
    }
  }, [fields, currentDataset?.id]); // Trigger on dataset switch

  // --- Colors (Soft Professional Palette) ---
  // Slate, Soft Blue, Sage, Muted Coral, Dusty Purple, Sand
  const COLORS = ['#64748b', '#60a5fa', '#34d399', '#f87171', '#a78bfa', '#fbbf24', '#94a3b8'];
  
  // --- Data Preparation ---

  const latestBatch = useMemo(() => batches.length > 0 ? batches[batches.length - 1] : null, [batches]);
  const previousBatch = useMemo(() => batches.length > 1 ? batches[batches.length - 2] : null, [batches]);

  // 1. General Evolution (Rows count)
  const evolutionData = useMemo(() => {
    return batches.map(batch => ({
      date: batch.date,
      displayDate: formatDateFr(batch.date),
      count: batch.rows.length
    }));
  }, [batches]);

  // 2. Primary Field Stats (Top Values)
  const primaryFieldStats = useMemo(() => {
    if (!latestBatch || !primaryField) return [];
    
    const counts: Record<string, number> = {};
    latestBatch.rows.forEach(r => {
      const val = String(r[primaryField] || 'Non spécifié');
      counts[val] = (counts[val] || 0) + 1;
    });
    
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [latestBatch, primaryField]);

  const topPrimary = useMemo(() => primaryFieldStats.slice(0, 5), [primaryFieldStats]);

  // 3. Primary Evolution (Over time)
  const primaryEvolutionData = useMemo(() => {
    if (batches.length === 0 || topPrimary.length === 0 || !primaryField) return [];
    const topNames = topPrimary.map(o => o.name);

    return batches.map(batch => {
      const counts: Record<string, number> = {};
      topNames.forEach(name => counts[name] = 0);

      batch.rows.forEach(r => {
        const val = String(r[primaryField] || 'Non spécifié');
        if (topNames.includes(val)) {
          counts[val] = (counts[val] || 0) + 1;
        }
      });

      return {
        date: batch.date,
        displayDate: formatDateFr(batch.date),
        ...counts
      };
    });
  }, [batches, topPrimary, primaryField]);

  // 4. Secondary Distribution
  const secondaryFieldStats = useMemo(() => {
    if (!latestBatch || !secondaryField) return [];
    
    const counts: Record<string, number> = {};
    latestBatch.rows.forEach(r => {
      let val = r[secondaryField];
      if (val === true) val = "Oui";
      if (val === false) val = "Non";
      const strVal = String(val !== undefined ? val : 'Non spécifié');
      counts[strVal] = (counts[strVal] || 0) + 1;
    });
    
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [latestBatch, secondaryField]);


  // --- Styles ---
  const tooltipStyle = {
    backgroundColor: '#ffffff',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
    color: '#334155',
    padding: '8px 12px',
    fontSize: '12px'
  };

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

  if (batches.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-4">
        <div className="bg-white p-4 rounded-full mb-4 shadow-sm border border-slate-100">
          <Activity className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-medium text-slate-900">Tableau vide : {currentDataset.name}</h3>
        <p className="text-slate-500 max-w-sm mt-2">
          Ce jeu de données a été créé mais ne contient pas encore d'import.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 md:p-8 custom-scrollbar">
      <div className="space-y-8 pb-12"> {/* Removed max-w-7xl */}
        
        {/* Control Bar */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-wrap gap-6 items-center justify-between">
          <div className="flex items-center gap-2 text-slate-700 font-semibold">
            <Layout className="w-5 h-5 text-slate-500" />
            <span>Vue : {currentDataset.name}</span>
          </div>
          
          <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-500">Axe principal</label>
                <select 
                  value={primaryField} 
                  onChange={(e) => setPrimaryField(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-1.5 min-w-[150px]"
                >
                  {fields.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-500">Axe secondaire</label>
                <select 
                  value={secondaryField} 
                  onChange={(e) => setSecondaryField(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-1.5 min-w-[150px]"
                >
                  {fields.length < 2 && <option value="">Aucun autre champ</option>}
                  {fields.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
          </div>
        </div>

        {/* SECTION 1: KPIs - Softer Look */}
        <section>
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-slate-500" />
            Indicateurs clés
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* KPI 1 */}
            <Card className="border-t-4 border-t-blue-400 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Volumétrie totale</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <p className="text-2xl font-bold text-slate-700">{latestBatch ? latestBatch.rows.length : 0}</p>
                    {previousBatch && (
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${latestBatch!.rows.length >= previousBatch.rows.length ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {latestBatch!.rows.length >= previousBatch.rows.length ? '+' : ''}
                        {latestBatch!.rows.length - previousBatch.rows.length}
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-2 bg-blue-50 rounded-full">
                  <Users className="w-5 h-5 text-blue-500" />
                </div>
              </div>
            </Card>

            {/* KPI 2 */}
            <Card className="border-t-4 border-t-indigo-400 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 truncate max-w-[150px]" title={primaryField || 'Champ Principal'}>
                    Variété ({primaryField || '?'})
                  </p>
                  <p className="text-2xl font-bold text-slate-700 mt-1">
                    {primaryFieldStats.length}
                  </p>
                </div>
                <div className="p-2 bg-indigo-50 rounded-full">
                  <Filter className="w-5 h-5 text-indigo-500" />
                </div>
              </div>
            </Card>

            {/* KPI 3 */}
            <Card className="border-t-4 border-t-emerald-400 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 truncate max-w-[150px]" title={secondaryField || 'Champ Secondaire'}>
                    Dominante ({secondaryField || '?'})
                  </p>
                  <p className="text-lg font-bold text-slate-700 truncate max-w-[150px] mt-1">
                    {secondaryFieldStats.length > 0 ? secondaryFieldStats[0].name : '-'}
                  </p>
                </div>
                <div className="p-2 bg-emerald-50 rounded-full">
                  <PieIcon className="w-5 h-5 text-emerald-500" />
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* SECTION 2: Evolution & Distribution */}
        <section>
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-slate-500" />
            Analyse globale
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            <Card title="Évolution du volume global">
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={evolutionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#60a5fa" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="displayDate" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area type="monotone" dataKey="count" stroke="#60a5fa" fillOpacity={1} fill="url(#colorCount)" strokeWidth={2} name="Effectif total" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card title={`Répartition : ${secondaryField || 'Non défini'}`}>
              <div className="h-72 w-full">
                {secondaryField ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={secondaryFieldStats.slice(0, 8)} 
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="#fff"
                        strokeWidth={2}
                      >
                        {secondaryFieldStats.slice(0, 8).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{fontSize: '12px', color: '#64748b'}} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-400 italic">
                      Sélectionnez un axe secondaire ci-dessus
                  </div>
                )}
              </div>
            </Card>
          </div>
        </section>

        {/* SECTION 3: Primary Field Detail */}
        {primaryField && (
          <section>
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Filter className="w-5 h-5 text-slate-500" />
              Analyse par {primaryField} (Top 5)
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              <Card title="Évolution comparée" className="lg:col-span-2">
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={primaryEvolutionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="displayDate" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#64748b' }} />
                      {topPrimary.map((item, index) => (
                        <Line key={item.name} type="monotone" dataKey={item.name} stroke={COLORS[index % COLORS.length]} strokeWidth={2} dot={false} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card title="Volume actuel" className="lg:col-span-1">
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topPrimary} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 11, fill: '#64748b'}} />
                        <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={tooltipStyle} />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                          {topPrimary.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
