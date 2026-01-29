import React, { useMemo, useState } from 'react';
import {
  X, PieChart as PieIcon, BarChart3, LineChart as LineIcon,
  LayoutPanelLeft, Maximize2, Download, Palette,
  BarChart, BarChartHorizontal, Layers, Percent,
  MoreHorizontal, Type
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend,
  BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart as ReLineChart, Line, Treemap
} from 'recharts';
import { SpecificDashboardItem } from '../types/dashboard';

interface QuickChartModalProps {
  items: SpecificDashboardItem[];
  isOpen: boolean;
  onClose: () => void;
}

const COLORS = [
  '#2563eb', '#7c3aed', '#db2777', '#dc2626', '#ea580c',
  '#d97706', '#16a34a', '#0891b2', '#4f46e5', '#9333ea'
];

type ChartMainType = 'pie' | 'bar' | 'line' | 'treemap';
type ColorMode = 'single' | 'multi' | 'gradient';

const generateGradient = (start: string, end: string, steps: number) => {
  if (steps <= 1) return [start];

  const parseColor = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b];
  };

  const formatColor = (rgb: number[]) => {
    return '#' + rgb.map(x => {
      const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  };

  const c1 = parseColor(start);
  const c2 = parseColor(end);

  const colors = [];
  for (let i = 0; i < steps; i++) {
    const ratio = i / (steps - 1);
    const c = c1.map((val, j) => val + ratio * (c2[j] - val));
    colors.push(formatColor(c));
  }
  return colors;
};

export const QuickChartModal: React.FC<QuickChartModalProps> = ({ items, isOpen, onClose }) => {
  const [chartType, setChartType] = useState<ChartMainType>('bar');
  const [isStacked, setIsStacked] = useState(false);
  const [isPercent, setIsPercent] = useState(false);
  const [isHorizontal, setIsHorizontal] = useState(false);
  const [colorMode, setColorMode] = useState<ColorMode>('multi');
  const [startColor, setStartColor] = useState('#2563eb');
  const [endColor, setEndColor] = useState('#db2777');

  const { data, series, colors } = useMemo(() => {
    const groups: Record<string, any> = {};
    const seriesLabels = new Set<string>();

    items.forEach(item => {
      const rowKey = item.rowPath.join(' > ') || 'Total';
      if (!groups[rowKey]) {
        groups[rowKey] = {
          name: rowKey,
          total: 0
        };
      }
      const val = typeof item.value === 'number' ? item.value : parseFloat(String(item.value)) || 0;
      const colKey = item.colLabel || item.metricLabel || 'Valeur';

      groups[rowKey][colKey] = val;
      groups[rowKey].total += val;
      seriesLabels.add(colKey);
    });

    let chartData = Object.values(groups);
    const seriesArray = Array.from(seriesLabels);

    // Normalize for 100% stacked
    if (isPercent && isStacked) {
      chartData = chartData.map(group => {
        const newGroup = { ...group };
        seriesArray.forEach(s => {
          if (group.total > 0) {
            newGroup[s] = (group[s] / group.total) * 100;
          } else {
            newGroup[s] = 0;
          }
        });
        return newGroup;
      });
    }

    // Pie data is a bit different
    const pieData = items.map(item => ({
      name: `${item.rowPath.join(' > ')}${item.rowPath.length > 0 && item.colLabel ? ' | ' : ''}${item.colLabel || ''}`,
      value: Math.abs(typeof item.value === 'number' ? item.value : parseFloat(String(item.value)) || 0)
    }));

    // Treemap data
    const treemapData = [{
      name: 'root',
      children: pieData
    }];

    // Colors
    let resultColors: string[] = [];
    const count = chartType === 'pie' || chartType === 'treemap' ? pieData.length : seriesArray.length;

    if (colorMode === 'single') {
      resultColors = Array(count).fill(startColor);
    } else if (colorMode === 'gradient') {
      resultColors = generateGradient(startColor, endColor, count);
    } else {
      resultColors = Array.from({ length: count }, (_, i) => COLORS[i % COLORS.length]);
    }

    return {
      data: chartData,
      series: seriesArray,
      pieData,
      treemapData,
      colors: resultColors
    };
  }, [items, isPercent, isStacked, colorMode, startColor, endColor, chartType]);

  if (!isOpen) return null;

  const renderChart = () => {
    switch (chartType) {
      case 'pie':
        return (
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={true}
              label={({ name, percent }) => `${name.length > 15 ? name.substring(0, 15) + '...' : name} (${(percent * 100).toFixed(0)}%)`}
              outerRadius="70%"
              innerRadius="40%"
              fill="#8884d8"
              dataKey="value"
              paddingAngle={2}
            >
              {pieData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <RechartsTooltip />
            <Legend verticalAlign="bottom" height={36}/>
          </PieChart>
        );

      case 'bar':
        return (
          <ReBarChart
            data={data}
            layout={isHorizontal ? 'vertical' : 'horizontal'}
            margin={{ top: 20, right: 30, left: 40, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={isHorizontal} horizontal={!isHorizontal} />
            {isHorizontal ? (
              <>
                <XAxis type="number" hide={isPercent} domain={isPercent ? [0, 100] : [0, 'auto']} />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
              </>
            ) : (
              <>
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 12 }} />
                <YAxis hide={isPercent} domain={isPercent ? [0, 100] : [0, 'auto']} />
              </>
            )}
            <RechartsTooltip formatter={(val: number) => isPercent ? `${val.toFixed(1)}%` : val.toLocaleString()} />
            <Legend verticalAlign="top" align="right" />
            {series.map((s, index) => (
              <Bar
                key={s}
                dataKey={s}
                fill={colors[index % colors.length]}
                stackId={isStacked ? 'a' : undefined}
                radius={isStacked ? 0 : [4, 4, 0, 0]}
              />
            ))}
          </ReBarChart>
        );

      case 'line':
        return (
          <ReLineChart data={data} margin={{ top: 20, right: 30, left: 40, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 12 }} />
            <YAxis />
            <RechartsTooltip />
            <Legend verticalAlign="top" align="right" />
            {series.map((s, index) => (
              <Line
                key={s}
                type="monotone"
                dataKey={s}
                stroke={colors[index % colors.length]}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </ReLineChart>
        );

      case 'treemap':
        return (
          <Treemap
            data={pieData}
            dataKey="value"
            aspectRatio={4 / 3}
            stroke="#fff"
            fill="#8884d8"
          >
            <RechartsTooltip />
          </Treemap>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg text-white">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Analyse Visuelle Rapide</h2>
              <p className="text-sm text-gray-500">{items.length} cellules sélectionnées</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-6 p-4 border-b border-gray-100 bg-white">
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => { setChartType('bar'); setIsHorizontal(false); setIsStacked(false); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${chartType === 'bar' && !isHorizontal && !isStacked ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
              title="Histogramme Vertical"
            >
              <BarChart className="w-4 h-4" />
              <span className="hidden sm:inline">Vertical</span>
            </button>
            <button
              onClick={() => { setChartType('bar'); setIsHorizontal(true); setIsStacked(false); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${chartType === 'bar' && isHorizontal && !isStacked ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
              title="Histogramme Horizontal"
            >
              <BarChartHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Horizontal</span>
            </button>
            <button
              onClick={() => { setChartType('bar'); setIsStacked(true); setIsPercent(false); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${chartType === 'bar' && isStacked && !isPercent ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
              title="Histogramme Empilé"
            >
              <Layers className="w-4 h-4" />
              <span className="hidden sm:inline">Empilé</span>
            </button>
            <button
              onClick={() => { setChartType('bar'); setIsStacked(true); setIsPercent(true); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${chartType === 'bar' && isPercent ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
              title="Histogramme Empilé 100%"
            >
              <Percent className="w-4 h-4" />
              <span className="hidden sm:inline">100%</span>
            </button>
          </div>

          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setChartType('pie')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${chartType === 'pie' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              <PieIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Secteurs</span>
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${chartType === 'line' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              <LineIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Lignes</span>
            </button>
            <button
              onClick={() => setChartType('treemap')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${chartType === 'treemap' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              <LayoutPanelLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Treemap</span>
            </button>
          </div>

          <div className="h-8 w-px bg-gray-200" />

          <div className="flex items-center gap-3">
            <Palette className="w-4 h-4 text-gray-400" />
            <select
              value={colorMode}
              onChange={(e) => setColorMode(e.target.value as ColorMode)}
              className="text-sm border-gray-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-gray-50 px-2 py-1 outline-none transition-all"
            >
              <option value="multi">Multicolore</option>
              <option value="gradient">Dégradé</option>
              <option value="single">Couleur Unique</option>
            </select>

            {colorMode !== 'multi' && (
              <input
                type="color"
                value={startColor}
                onChange={(e) => setStartColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border-none p-0"
              />
            )}
            {colorMode === 'gradient' && (
              <input
                type="color"
                value={endColor}
                onChange={(e) => setEndColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border-none p-0"
              />
            )}
          </div>
        </div>

        {/* Chart Content */}
        <div className="flex-1 min-h-[400px] p-8 bg-white relative">
          <ResponsiveContainer width="100%" height="100%">
            {renderChart() || <div />}
          </ResponsiveContainer>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
          <div className="text-xs text-gray-400 flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Maximize2 className="w-3 h-3" /> Double-cliquez pour isoler
            </span>
            <span className="flex items-center gap-1">
              <Download className="w-3 h-3" /> Cliquez droit pour enregistrer
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-900 text-white rounded-xl font-medium hover:bg-black transition-all shadow-lg shadow-gray-200"
          >
            Fermer l'aperçu
          </button>
        </div>
      </div>
    </div>
  );
};
