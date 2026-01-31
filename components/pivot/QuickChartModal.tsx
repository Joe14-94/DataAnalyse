
import React, { useMemo, useState, useRef } from 'react';
import { X, PieChart as PieIcon, BarChart3, LineChart, LayoutGrid, Info, Download, FileSpreadsheet, FileText, Image as ImageIcon, Plus, ChevronDown, TrendingUp, ExternalLink } from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart as ReLineChart, Line,
  Treemap
} from 'recharts';
import { SpecificDashboardItem, ColorMode, ColorPalette, ChartType as FullChartType } from '../../types';
import { Button } from '../ui/Button';
import { useData } from '../../context/DataContext';
import { exportView } from '../../utils';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
import {
  getChartColors,
  generateGradient,
  getChartTypeConfig
} from '../../logic/pivotToChart';

interface QuickChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: SpecificDashboardItem[];
}

type ChartType = 'pie' | 'bar' | 'line' | 'treemap' | 'column' | 'donut';

export const QuickChartModal: React.FC<QuickChartModalProps> = ({ isOpen, onClose, items }) => {
  const { addDashboardWidget, companyLogo } = useData();
  const navigate = useNavigate();
  const chartRef = useRef<HTMLDivElement>(null);

  const [chartType, setChartType] = useState<ChartType>('bar');
  const [widgetTitle, setWidgetTitle] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);

  // New States for "Same Functionality"
  const [colorMode, setColorMode] = useState<ColorMode>('multi');
  const [colorPalette, setColorPalette] = useState<ColorPalette>('default');
  const [singleColor, setSingleColor] = useState<string>('#4f46e5');
  const [gradientStart, setGradientStart] = useState<string>('#4f46e5');
  const [gradientEnd, setGradientEnd] = useState<string>('#f43f5e');
  const [sortBy, setSortBy] = useState<'name' | 'value' | 'none'>('value');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [limit, setLimit] = useState<number>(0);

  const chartData = useMemo(() => {
    let data = items.map(item => ({
      name: item.label,
      value: typeof item.value === 'number' ? item.value : parseFloat(String(item.value)) || 0,
      fullLabel: `${item.rowPath.join(' > ')} | ${item.colLabel}`
    }));

    // Sorting
    if (sortBy === 'name') {
      data.sort((a, b) => {
        const comp = a.name.localeCompare(b.name);
        return sortOrder === 'asc' ? comp : -comp;
      });
    } else if (sortBy === 'value') {
      data.sort((a, b) => {
        return sortOrder === 'asc' ? a.value - b.value : b.value - a.value;
      });
    }

    // Limit
    if (limit > 0) {
      data = data.slice(0, limit);
    }

    return data;
  }, [items, sortBy, sortOrder, limit]);

  const colors = useMemo(() => {
    const count = chartData.length;
    if (colorMode === 'single') {
      return Array(count).fill(singleColor);
    } else if (colorMode === 'gradient') {
      return generateGradient(gradientStart, gradientEnd, count);
    } else {
      return getChartColors(count, colorPalette);
    }
  }, [chartData.length, colorMode, colorPalette, singleColor, gradientStart, gradientEnd]);

  const handleExportXLSX = () => {
    const data = chartData.map(item => ({
      'Label': item.name,
      'Valeur': item.value
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Données Sélection');
    XLSX.writeFile(wb, `Export_Selection_${new Date().toISOString().split('T')[0]}.xlsx`);
    setShowExportMenu(false);
  };

  const handleExportPNG = async () => {
    if (!chartRef.current) return;
    try {
      const canvas = await html2canvas(chartRef.current, { scale: 2, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `graphique_selection_${new Date().toISOString().split('T')[0]}.png`;
      link.click();
      setShowExportMenu(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddToDashboard = () => {
    addDashboardWidget({
      title: widgetTitle || `Graphique de sélection (${items.length} cellules)`,
      type: 'chart',
      size: 'lg',
      height: 'md',
      config: {
        chartType: chartType as any,
        reportItems: items,
        // Save additional config for persistence if needed
        pivotChart: {
           chartType: chartType as any,
           colorMode,
           colorPalette,
           singleColor,
           gradientStart,
           gradientEnd,
           sortBy,
           sortOrder,
           limit: limit > 0 ? limit : undefined
        } as any
      }
    });
    alert("Graphique ajouté au tableau de bord !");
    onClose();
    navigate('/dashboard');
  };

  if (!isOpen) return null;

  const chartTypes: { id: ChartType; label: string; icon: any }[] = [
    { id: 'column', label: 'Colonnes', icon: BarChart3 },
    { id: 'bar', label: 'Barres', icon: BarChart3 },
    { id: 'line', label: 'Lignes', icon: LineChart },
    { id: 'pie', label: 'Secteurs', icon: PieIcon },
    { id: 'donut', label: 'Donut', icon: PieIcon },
    { id: 'treemap', label: 'Treemap', icon: LayoutGrid },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4" onClick={onClose}>
      <div id="quick-chart-modal-container" className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-brand-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-600 text-white rounded-xl shadow-lg shadow-brand-200">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Visualisation de la sélection</h3>
              <p className="text-xs text-slate-500 font-medium">{items.length} cellule(s) analysée(s)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Unified Controls Toolbar (Matching ChartModal) */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-4 flex-wrap bg-white">
          {/* Chart Type */}
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Type:</label>
            <select
              value={chartType}
              onChange={e => setChartType(e.target.value as ChartType)}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50 focus:ring-2 focus:ring-brand-500 outline-none font-semibold"
            >
              {chartTypes.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Limit */}
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Top:</label>
            <select
              value={limit}
              onChange={e => setLimit(Number(e.target.value))}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50 focus:ring-2 focus:ring-brand-500 outline-none font-semibold"
            >
              <option value={0}>Tous</option>
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
          </div>

          {/* Sorting */}
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tri:</label>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50 focus:ring-2 focus:ring-brand-500 outline-none font-semibold"
            >
              <option value="value">Valeur</option>
              <option value="name">Nom</option>
              <option value="none">Aucun</option>
            </select>
            {sortBy !== 'none' && (
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-1.5 bg-slate-100 rounded hover:bg-slate-200 text-[10px] font-bold text-slate-600 transition-colors"
              >
                {sortOrder === 'asc' ? 'ASC' : 'DESC'}
              </button>
            )}
          </div>

          {/* Colors */}
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Couleurs:</label>
            <select
              value={colorMode}
              onChange={e => setColorMode(e.target.value as any)}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50 focus:ring-2 focus:ring-brand-500 outline-none font-semibold"
            >
              <option value="multi">Palette</option>
              <option value="single">Unique</option>
              <option value="gradient">Dégradé</option>
            </select>

            {colorMode === 'multi' && (
              <select
                value={colorPalette}
                onChange={e => setColorPalette(e.target.value as any)}
                className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50 focus:ring-2 focus:ring-brand-500 outline-none"
              >
                <option value="default">Défaut</option>
                <option value="pastel">Pastel</option>
                <option value="vibrant">Vibrant</option>
              </select>
            )}

            {colorMode === 'single' && (
              <input type="color" value={singleColor} onChange={e => setSingleColor(e.target.value)} className="w-6 h-6 rounded cursor-pointer border-none p-0" />
            )}

            {colorMode === 'gradient' && (
              <div className="flex gap-1">
                <input type="color" value={gradientStart} onChange={e => setGradientStart(e.target.value)} className="w-6 h-6 rounded cursor-pointer border-none p-0" />
                <input type="color" value={gradientEnd} onChange={e => setGradientEnd(e.target.value)} className="w-6 h-6 rounded cursor-pointer border-none p-0" />
              </div>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2 text-[10px] font-bold text-brand-600 bg-brand-50 px-3 py-1.5 rounded-full border border-brand-100">
            <TrendingUp className="w-3.5 h-3.5" />
            ANALYSE DE SÉLECTION
          </div>
        </div>

        {/* Chart Area */}
        <div id="quick-chart-render-area" className="flex-1 p-8 min-h-0 bg-white" ref={chartRef}>
          {chartData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <BarChart3 className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg font-medium">Aucune donnée à afficher</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'pie' || chartType === 'donut' ? (
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={chartType === 'donut' ? '45%' : 0}
                    labelLine={true}
                    label={({ name, percent }) => `${name.length > 20 ? name.substring(0, 20) + '...' : name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius="75%"
                    dataKey="value"
                    stroke="#fff"
                    strokeWidth={2}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [value.toLocaleString(), 'Valeur']}
                  />
                  <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '11px', bottom: 0 }} />
                </PieChart>
              ) : chartType === 'bar' ? (
                <BarChart data={chartData} layout="vertical" margin={{ top: 20, right: 30, left: 140, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                  <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              ) : chartType === 'column' ? (
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} angle={-45} textAnchor="end" interval={0} height={80} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              ) : chartType === 'line' ? (
                <ReLineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} angle={-45} textAnchor="end" height={80} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                  <Line type="monotone" dataKey="value" stroke={colors[0]} strokeWidth={3} dot={{ r: 6, fill: colors[0], strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
                </ReLineChart>
              ) : (
                <Treemap
                  data={chartData}
                  dataKey="value"
                  stroke="#fff"
                  fill="#8884d8"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                </Treemap>
              )}
            </ResponsiveContainer>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="bg-white border-slate-200"
              >
                <Download className="w-4 h-4 mr-2 text-slate-500" /> Exporter <ChevronDown className="w-3 h-3 ml-1" />
              </Button>

              {showExportMenu && (
                <div className="absolute bottom-full left-0 mb-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-[120] min-w-[160px] overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                  <button onClick={handleExportPNG} className="w-full text-left px-4 py-2.5 text-xs hover:bg-slate-50 flex items-center gap-2 text-slate-700">
                    <ImageIcon className="w-4 h-4 text-blue-500" /> PNG Image
                  </button>
                  <button onClick={handleExportXLSX} className="w-full text-left px-4 py-2.5 text-xs hover:bg-slate-50 flex items-center gap-2 text-slate-700 border-t border-slate-50">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Excel (.xlsx)
                  </button>
                  <button onClick={() => { exportView('pdf', 'quick-chart-render-area', 'Export Graphique', companyLogo, 'A4'); setShowExportMenu(false); }} className="w-full text-left px-4 py-2.5 text-xs hover:bg-slate-50 flex items-center gap-2 text-slate-700 border-t border-slate-50">
                    <FileText className="w-4 h-4 text-red-500" /> PDF Document
                  </button>
                  <button onClick={() => { exportView('html', 'quick-chart-render-area', 'Export Graphique', companyLogo); setShowExportMenu(false); }} className="w-full text-left px-4 py-2.5 text-xs hover:bg-slate-50 flex items-center gap-2 text-slate-700 border-t border-slate-50">
                    <FileText className="w-4 h-4 text-orange-500" /> HTML Interactive
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 mr-2 border-r border-slate-200 pr-4">
               <input
                  type="text"
                  placeholder="Titre du graphique..."
                  className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none w-48 bg-white font-medium"
                  value={widgetTitle}
                  onChange={(e) => setWidgetTitle(e.target.value)}
               />
            </div>
            <Button
               onClick={handleAddToDashboard}
               className="bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 px-6"
            >
               <Plus className="w-4 h-4 mr-2" /> Créer widget Dashboard
            </Button>
            <Button onClick={onClose} variant="secondary" className="px-6 font-bold rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 border-none">
               Fermer
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
