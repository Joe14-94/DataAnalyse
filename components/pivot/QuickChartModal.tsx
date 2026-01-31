
import React, { useMemo, useState, useRef } from 'react';
import { X, PieChart as PieIcon, BarChart3, LineChart, LayoutGrid, Info, Download, FileSpreadsheet, FileText, Image as ImageIcon, Plus, ChevronDown, MonitorPlay } from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart as ReLineChart, Line,
  Treemap, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { SpecificDashboardItem } from '../../types';
import { Button } from '../ui/Button';
import { useData } from '../../context/DataContext';
import { exportView } from '../../utils';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import { getChartColors, generateGradient, getChartTypeConfig } from '../../logic/pivotToChart';
import { TreemapContent } from '../ui/TreemapContent';

interface QuickChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: SpecificDashboardItem[];
}

type QuickChartType = 'pie' | 'donut' | 'bar' | 'column' | 'line' | 'area' | 'treemap' | 'radar';
type ColorMode = 'multi' | 'single' | 'gradient';
type ColorPalette = 'default' | 'vibrant' | 'pastel';

export const QuickChartModal: React.FC<QuickChartModalProps> = ({ isOpen, onClose, items }) => {
  const { addDashboardWidget, companyLogo } = useData();
  const navigate = useNavigate();
  const chartRef = useRef<HTMLDivElement>(null);

  const [chartType, setChartType] = useState<QuickChartType>('bar');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [widgetTitle, setWidgetTitle] = useState('');

  // Nouveaux états pour les modes de coloration
  const [colorMode, setColorMode] = useState<ColorMode>('multi');
  const [colorPalette, setColorPalette] = useState<ColorPalette>('default');
  const [singleColor, setSingleColor] = useState<string>('#4f46e5');
  const [gradientStart, setGradientStart] = useState<string>('#4f46e5');
  const [gradientEnd, setGradientEnd] = useState<string>('#10b981');

  const chartData = useMemo(() => {
    return items.map(item => ({
      name: item.label,
      value: typeof item.value === 'number' ? item.value : parseFloat(String(item.value)) || 0,
      size: typeof item.value === 'number' ? item.value : parseFloat(String(item.value)) || 0,
      fullLabel: `${item.rowPath.join(' > ')} | ${item.colLabel}`
    }));
  }, [items]);

  const colors = useMemo(() => {
    const count = Math.max(chartData.length, 1);
    if (colorMode === 'single') return Array(count).fill(singleColor);
    if (colorMode === 'gradient') return generateGradient(gradientStart, gradientEnd, count);
    return getChartColors(count, colorPalette);
  }, [chartData.length, colorMode, colorPalette, singleColor, gradientStart, gradientEnd]);

  const handleExportXLSX = () => {
    const data = items.map(item => ({
      'Chemin': item.rowPath.join(' > '),
      'Colonne': item.colLabel,
      'Métrique': item.metricLabel,
      'Valeur': item.value
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Données Sélection');
    XLSX.writeFile(wb, `Export_Selection_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleAddToDashboard = () => {
    addDashboardWidget({
      title: widgetTitle || `Sélection : ${items.length} cellules`,
      type: 'chart',
      size: 'lg',
      height: 'md',
      config: {
        chartType: chartType as any,
        colorMode,
        colorPalette,
        singleColor,
        gradientStart,
        gradientEnd,
        reportItems: items
      }
    });
    alert("Graphique ajouté au tableau de bord !");
    onClose();
    navigate('/dashboard');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4" onClick={onClose}>
      <div id="quick-chart-modal-container" className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-600 text-white rounded-lg shadow-lg shadow-brand-200">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Analyse de la sélection</h3>
              <p className="text-xs text-slate-500 font-medium">{items.length} point(s) de données</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Advanced Toolbar */}
        <div className="px-4 py-3 border-b border-slate-200 bg-white flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-black text-slate-400 uppercase">Type:</label>
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value as QuickChartType)}
              className="text-xs border border-slate-300 rounded-lg px-2 py-1 bg-white font-bold"
            >
              <option value="column">Barres verticales</option>
              <option value="bar">Barres horizontales</option>
              <option value="pie">Secteurs</option>
              <option value="donut">Anneau</option>
              <option value="line">Lignes</option>
              <option value="area">Aires</option>
              <option value="radar">Radar</option>
              <option value="treemap">Treemap</option>
            </select>
          </div>

          <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
            <label className="text-[10px] font-black text-slate-400 uppercase">Couleurs:</label>
            <select
              value={colorMode}
              onChange={(e) => setColorMode(e.target.value as ColorMode)}
              className="text-xs border border-slate-300 rounded-lg px-2 py-1 bg-white font-bold"
            >
              <option value="multi">Palette</option>
              <option value="single">Unique</option>
              <option value="gradient">Dégradé</option>
            </select>
          </div>

          {colorMode === 'multi' && (
             <select
               value={colorPalette}
               onChange={(e) => setColorPalette(e.target.value as ColorPalette)}
               className="text-xs border border-slate-300 rounded-lg px-2 py-1 bg-white font-bold"
             >
               <option value="default">Défaut</option>
               <option value="vibrant">Vibrant</option>
               <option value="pastel">Pastel</option>
             </select>
          )}

          {colorMode === 'single' && (
             <input type="color" value={singleColor} onChange={(e) => setSingleColor(e.target.value)} className="w-6 h-6 rounded cursor-pointer" />
          )}

          {colorMode === 'gradient' && (
             <div className="flex items-center gap-1">
                <input type="color" value={gradientStart} onChange={(e) => setGradientStart(e.target.value)} className="w-5 h-5 rounded cursor-pointer" />
                <input type="color" value={gradientEnd} onChange={(e) => setGradientEnd(e.target.value)} className="w-5 h-5 rounded cursor-pointer" />
             </div>
          )}

          <div className="ml-auto flex items-center gap-2">
             <label className="text-[10px] font-black text-slate-400 uppercase">Titre :</label>
             <input
                type="text"
                placeholder="Nom du rapport..."
                className="text-xs border border-slate-300 rounded-lg px-3 py-1 bg-slate-50 focus:bg-white w-48"
                value={widgetTitle}
                onChange={e => setWidgetTitle(e.target.value)}
             />
          </div>
        </div>

        {/* Chart Area */}
        <div ref={chartRef} id="quick-chart-render-area" className="flex-1 p-8 min-h-0 bg-white">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <BarChart3 className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg font-medium">Aucune donnée à afficher</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {(() => {
                const margin = { top: 20, right: 30, left: 20, bottom: 60 };

                if (chartType === 'pie' || chartType === 'donut') {
                   return (
                      <PieChart>
                        <Pie
                           data={chartData}
                           cx="50%"
                           cy="50%"
                           innerRadius={chartType === 'donut' ? '45%' : 0}
                           outerRadius="75%"
                           paddingAngle={2}
                           dataKey="value"
                           stroke="#fff"
                           strokeWidth={2}
                           labelLine={true}
                           label={({ name, percent }) => `${name.length > 15 ? name.substring(0, 15) + '...' : name} (${(percent * 100).toFixed(0)}%)`}
                        >
                           {chartData.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                           ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                        <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '11px', bottom: 0 }} />
                      </PieChart>
                   );
                }

                if (chartType === 'column') {
                   return (
                      <BarChart data={chartData} margin={margin}>
                         <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                         <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} angle={-45} textAnchor="end" height={80} interval={0} />
                         <YAxis stroke="#94a3b8" fontSize={10} />
                         <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                         <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                            {chartData.map((entry: any, index: number) => (
                               <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                            ))}
                         </Bar>
                      </BarChart>
                   );
                }

                if (chartType === 'bar') {
                   return (
                      <BarChart data={chartData} layout="vertical" margin={{ ...margin, left: 100 }}>
                         <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                         <XAxis type="number" stroke="#94a3b8" fontSize={10} />
                         <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 9 }} stroke="#94a3b8" />
                         <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                         <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                            {chartData.map((entry: any, index: number) => (
                               <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                            ))}
                         </Bar>
                      </BarChart>
                   );
                }

                if (chartType === 'line') {
                   return (
                      <ReLineChart data={chartData} margin={margin}>
                         <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                         <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} angle={-45} textAnchor="end" height={80} interval={0} />
                         <YAxis stroke="#94a3b8" fontSize={10} />
                         <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                         <Line type="monotone" dataKey="value" stroke={colors[0]} strokeWidth={3} dot={{ r: 4, fill: colors[0], stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                      </ReLineChart>
                   );
                }

                if (chartType === 'area') {
                   return (
                      <AreaChart data={chartData} margin={margin}>
                         <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                         <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} angle={-45} textAnchor="end" height={80} interval={0} />
                         <YAxis stroke="#94a3b8" fontSize={10} />
                         <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                         <Area type="monotone" dataKey="value" stroke={colors[0]} fill={colors[0]} fillOpacity={0.4} strokeWidth={2} />
                      </AreaChart>
                   );
                }

                if (chartType === 'radar') {
                   return (
                      <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="80%">
                         <PolarGrid stroke="#e2e8f0" />
                         <PolarAngleAxis dataKey="name" tick={{ fontSize: 9 }} />
                         <PolarRadiusAxis tick={{ fontSize: 9 }} />
                         <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                         <Radar name="Valeur" dataKey="value" stroke={colors[0]} fill={colors[0]} fillOpacity={0.6} />
                      </RadarChart>
                   );
                }

                if (chartType === 'treemap') {
                   return (
                      <Treemap
                         data={chartData}
                         dataKey="value"
                         aspectRatio={4 / 3}
                         stroke="#fff"
                         content={<TreemapContent colors={colors} />}
                      >
                         <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                      </Treemap>
                   );
                }

                return null;
              })()}
            </ResponsiveContainer>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
          <div className="flex items-center gap-2">
            {/* Export Dropdown */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="text-slate-600 border-slate-300 hover:bg-white"
              >
                <Download className="w-4 h-4 mr-2" /> Exporter <ChevronDown className="w-3 h-3 ml-1" />
              </Button>

              {showExportMenu && (
                <div className="absolute bottom-full left-0 mb-2 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1 w-40 overflow-hidden">
                   <button onClick={() => { exportView('pdf', 'quick-chart-render-area', 'Export Graphique', companyLogo, 'A4'); setShowExportMenu(false); }} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2 font-medium">
                      <FileText className="w-3.5 h-3.5 text-red-500" /> PDF (A4)
                   </button>
                   <button onClick={() => { handleExportXLSX(); setShowExportMenu(false); }} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2 font-medium">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Excel (XLSX)
                   </button>
                   <button onClick={() => { exportView('png', 'quick-chart-render-area', 'Export Graphique', companyLogo); setShowExportMenu(false); }} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2 font-medium">
                      <ImageIcon className="w-3.5 h-3.5 text-blue-500" /> Image (PNG)
                   </button>
                   <button onClick={() => { exportView('html', 'quick-chart-render-area', 'Export Graphique', companyLogo); setShowExportMenu(false); }} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2 font-medium">
                      <FileText className="w-3.5 h-3.5 text-orange-500" /> Page HTML
                   </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
               onClick={handleAddToDashboard}
               className="bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 px-6"
            >
               <MonitorPlay className="w-4 h-4 mr-2" /> Ajouter au Dashboard
            </Button>
            <Button onClick={onClose} variant="secondary" className="px-8 font-bold rounded-xl">
               Fermer
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
