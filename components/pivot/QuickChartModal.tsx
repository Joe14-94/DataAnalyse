
import React, { useMemo, useState } from 'react';
import { X, PieChart as PieIcon, BarChart3, LineChart, LayoutGrid, Info } from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart as ReLineChart, Line,
  Treemap
} from 'recharts';
import { SpecificDashboardItem } from '../../types';
import { Button } from '../ui/Button';
import { SOURCE_COLORS } from '../../utils/constants';

interface QuickChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: SpecificDashboardItem[];
}

type ChartType = 'pie' | 'bar' | 'line' | 'treemap';

export const QuickChartModal: React.FC<QuickChartModalProps> = ({ isOpen, onClose, items }) => {
  const [chartType, setChartType] = useState<ChartType>('pie');

  const chartData = useMemo(() => {
    return items.map(item => ({
      name: item.label,
      value: typeof item.value === 'number' ? item.value : parseFloat(String(item.value)) || 0,
      fullLabel: `${item.rowPath.join(' > ')} | ${item.colLabel}`
    }));
  }, [items]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-600 text-white rounded-xl shadow-lg shadow-brand-200">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 text-shadow-sm">Visualisation rapide de la sélection</h3>
              <p className="text-sm text-slate-500 font-medium">Analyse graphique de {items.length} cellule(s) sélectionnée(s)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-lg">
            {[
              { id: 'pie', label: 'Secteurs', icon: PieIcon },
              { id: 'bar', label: 'Barres', icon: BarChart3 },
              { id: 'line', label: 'Lignes', icon: LineChart },
              { id: 'treemap', label: 'Treemap', icon: LayoutGrid },
            ].map(type => (
              <button
                key={type.id}
                onClick={() => setChartType(type.id as ChartType)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold transition-all ${chartType === type.id ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <type.icon className="w-4 h-4" />
                {type.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
            <Info className="w-3.5 h-3.5 text-blue-500" />
            Le graphique s'adapte automatiquement à votre sélection
          </div>
        </div>

        {/* Chart Area */}
        <div className="flex-1 p-8 min-h-0 bg-gradient-to-b from-white to-slate-50/30">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <BarChart3 className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg font-medium">Aucune donnée à afficher</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'pie' ? (
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }) => `${name.length > 20 ? name.substring(0, 20) + '...' : name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius="80%"
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={SOURCE_COLORS[index % SOURCE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [value.toLocaleString(), 'Valeur']}
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              ) : chartType === 'bar' ? (
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    interval={0}
                    height={80}
                    tick={{ fontSize: 10, fill: '#64748b', fontWeight: 500 }}
                  />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={SOURCE_COLORS[index % SOURCE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              ) : chartType === 'line' ? (
                <ReLineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tick={{ fontSize: 10, fill: '#64748b' }}
                  />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                  <Line type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={3} dot={{ r: 6, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
                </ReLineChart>
              ) : (
                <Treemap
                  data={chartData}
                  dataKey="value"
                  stroke="#fff"
                  fill="#8884d8"
                >
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                </Treemap>
              )}
            </ResponsiveContainer>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 flex justify-end bg-slate-50/30">
          <Button onClick={onClose} className="px-8 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95">
            Fermer l'aperçu
          </Button>
        </div>
      </div>
    </div>
  );
};
