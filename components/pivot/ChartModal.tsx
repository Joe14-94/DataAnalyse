import React, { useState, useMemo } from 'react';
import { X, BarChart3, TrendingUp, Download, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Cell, Treemap, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { PivotResult, PivotConfig } from '../../logic/pivotEngine';
import {
  ChartType,
  ChartDataPoint,
  transformPivotToChartData,
  transformPivotToTreemapData,
  generateChartMetadata,
  getChartColors,
  formatChartValue,
  getChartTypeConfig
} from '../../logic/pivotToChart';

// Custom Treemap Content Component
const TreemapContent = (props: any) => {
  const { x, y, width, height, name, index } = props;
  const colors = getChartColors(9);

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={colors[index % colors.length]}
        stroke="#fff"
        strokeWidth={2}
      />
      {width > 60 && height > 30 && (
        <text
          x={x + width / 2}
          y={y + height / 2}
          textAnchor="middle"
          fill="#fff"
          fontSize={11}
          fontWeight="bold"
          dy={4}
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
        >
          {name.length > 15 ? name.substring(0, 12) + '...' : name}
        </text>
      )}
    </g>
  );
};

interface ChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  pivotData: PivotResult;
  pivotConfig: PivotConfig;
}

export const ChartModal: React.FC<ChartModalProps> = ({
  isOpen,
  onClose,
  pivotData,
  pivotConfig
}) => {
  const navigate = useNavigate();

  // Générer les métadonnées du graphique
  const metadata = useMemo(() => generateChartMetadata(pivotConfig, pivotData), [pivotConfig, pivotData]);

  // State pour les options
  const [selectedChartType, setSelectedChartType] = useState<ChartType>(metadata.suggestedType);
  const [limit, setLimit] = useState<number>(0); // 0 = pas de limite
  const [sortBy, setSortBy] = useState<'name' | 'value' | 'none'>('value');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Transformer les données
  const chartData = useMemo(() => {
    if (selectedChartType === 'treemap') {
      return transformPivotToTreemapData(pivotData, pivotConfig);
    }

    return transformPivotToChartData(pivotData, pivotConfig, {
      chartType: selectedChartType,
      limit,
      excludeSubtotals: true,
      sortBy,
      sortOrder,
      showOthers: limit > 0
    });
  }, [pivotData, pivotConfig, selectedChartType, limit, sortBy, sortOrder]);

  const colors = getChartColors(metadata.seriesNames.length);

  if (!isOpen) return null;

  // Styles pour le tooltip
  const tooltipStyle = {
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  };

  // Custom tooltip formatter
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div style={tooltipStyle}>
        <p className="font-semibold text-slate-800 mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }} className="text-xs">
            {entry.name}: <span className="font-bold">{formatChartValue(entry.value, pivotConfig)}</span>
          </p>
        ))}
      </div>
    );
  };

  // Rendu du graphique selon le type
  const renderChart = () => {
    const chartMargin = { top: 20, right: 30, left: 20, bottom: 60 };

    switch (selectedChartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ ...chartMargin, left: 120 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" stroke="#94a3b8" fontSize={11} />
              <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <Tooltip content={<CustomTooltip />} />
              {metadata.isMultiSeries ? (
                metadata.seriesNames.map((series, idx) => (
                  <Bar key={series} dataKey={series} fill={colors[idx]} radius={[0, 4, 4, 0]} />
                ))
              ) : (
                <Bar dataKey="value" fill={colors[0]} radius={[0, 4, 4, 0]}>
                  {chartData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Bar>
              )}
              {metadata.isMultiSeries && <Legend wrapperStyle={{ fontSize: '11px' }} />}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'column':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={chartMargin}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} angle={-45} textAnchor="end" height={80} />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip content={<CustomTooltip />} />
              {metadata.isMultiSeries ? (
                metadata.seriesNames.map((series, idx) => (
                  <Bar key={series} dataKey={series} fill={colors[idx]} radius={[4, 4, 0, 0]} />
                ))
              ) : (
                <Bar dataKey="value" fill={colors[0]} radius={[4, 4, 0, 0]}>
                  {chartData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Bar>
              )}
              {metadata.isMultiSeries && <Legend wrapperStyle={{ fontSize: '11px' }} />}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'stacked-bar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={chartMargin}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} angle={-45} textAnchor="end" height={80} />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              {metadata.seriesNames.map((series, idx) => (
                <Bar key={series} dataKey={series} stackId="a" fill={colors[idx]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={chartMargin}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} angle={-45} textAnchor="end" height={80} />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip content={<CustomTooltip />} />
              {metadata.isMultiSeries ? (
                <>
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  {metadata.seriesNames.map((series, idx) => (
                    <Line
                      key={series}
                      type="monotone"
                      dataKey={series}
                      stroke={colors[idx]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                </>
              ) : (
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={colors[0]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'area':
      case 'stacked-area':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={chartMargin}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} angle={-45} textAnchor="end" height={80} />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip content={<CustomTooltip />} />
              {metadata.isMultiSeries ? (
                <>
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  {metadata.seriesNames.map((series, idx) => (
                    <Area
                      key={series}
                      type="monotone"
                      dataKey={series}
                      stackId={selectedChartType === 'stacked-area' ? 'a' : undefined}
                      stroke={colors[idx]}
                      fill={colors[idx]}
                      fillOpacity={0.6}
                    />
                  ))}
                </>
              ) : (
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={colors[0]}
                  fill={colors[0]}
                  fillOpacity={0.6}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'pie':
      case 'donut':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={selectedChartType === 'donut' ? 60 : 0}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                stroke="#fff"
                strokeWidth={2}
                label={(entry) => `${entry.name}: ${formatChartValue(entry.value, pivotConfig)}`}
              >
                {chartData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'radar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={chartData}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="name" tick={{ fontSize: 10 }} />
              <PolarRadiusAxis tick={{ fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              {metadata.isMultiSeries ? (
                <>
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  {metadata.seriesNames.map((series, idx) => (
                    <Radar
                      key={series}
                      name={series}
                      dataKey={series}
                      stroke={colors[idx]}
                      fill={colors[idx]}
                      fillOpacity={0.6}
                    />
                  ))}
                </>
              ) : (
                <Radar
                  dataKey="value"
                  stroke={colors[0]}
                  fill={colors[0]}
                  fillOpacity={0.6}
                />
              )}
            </RadarChart>
          </ResponsiveContainer>
        );

      case 'treemap':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <Treemap
              data={chartData}
              dataKey="size"
              aspectRatio={4 / 3}
              stroke="#fff"
              fill="#60a5fa"
              content={<TreemapContent />}
            >
              <Tooltip content={<CustomTooltip />} />
            </Treemap>
          </ResponsiveContainer>
        );

      default:
        return <div className="flex items-center justify-center h-full text-slate-400">Type de graphique non supporté</div>;
    }
  };

  const handleOpenInAnalytics = () => {
    navigate('/analytics', {
      state: {
        fromPivotChart: {
          pivotData,
          pivotConfig,
          chartType: selectedChartType,
          chartData
        }
      }
    });
  };

  const handleExportImage = () => {
    // TODO: Implémenter l'export en image (nécessite html2canvas ou domtoimage)
    alert('Fonctionnalité d\'export en image à venir');
  };

  const chartTypeOptions: ChartType[] = [
    'column', 'bar', 'line', 'area', 'pie', 'donut',
    'stacked-bar', 'stacked-area', 'radar', 'treemap'
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl max-w-7xl w-full max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BarChart3 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800">Visualisation graphique</h2>
              <p className="text-xs text-slate-500">
                {metadata.totalDataPoints} point{metadata.totalDataPoints > 1 ? 's' : ''} de données
                {metadata.isMultiSeries && ` • ${metadata.seriesNames.length} séries`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenInAnalytics}
              className="px-3 py-1.5 text-sm bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all flex items-center gap-2 shadow-sm"
            >
              <ExternalLink className="w-4 h-4" />
              Ouvrir dans Analytics
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center gap-4">
          {/* Type de graphique */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600">Type:</label>
            <select
              value={selectedChartType}
              onChange={(e) => setSelectedChartType(e.target.value as ChartType)}
              className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              {chartTypeOptions.map((type) => {
                const config = getChartTypeConfig(type);
                return (
                  <option key={type} value={type}>
                    {config.label}
                    {type === metadata.suggestedType && ' ★'}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Top N */}
          {selectedChartType !== 'treemap' && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600">Limiter à:</label>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value={0}>Tout afficher</option>
                <option value={5}>Top 5</option>
                <option value={10}>Top 10</option>
                <option value={15}>Top 15</option>
                <option value={20}>Top 20</option>
              </select>
            </div>
          )}

          {/* Tri */}
          {selectedChartType !== 'treemap' && selectedChartType !== 'pie' && selectedChartType !== 'donut' && (
            <>
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-600">Trier par:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'name' | 'value' | 'none')}
                  className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="value">Valeur</option>
                  <option value="name">Nom</option>
                  <option value="none">Aucun</option>
                </select>
              </div>

              {sortBy !== 'none' && (
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-600">Ordre:</label>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                    className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="desc">Décroissant</option>
                    <option value="asc">Croissant</option>
                  </select>
                </div>
              )}
            </>
          )}

          {/* Badge suggestion */}
          {selectedChartType === metadata.suggestedType && (
            <div className="ml-auto flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-semibold">
              <TrendingUp className="w-3 h-3" />
              Recommandé
            </div>
          )}
        </div>

        {/* Chart */}
        <div className="flex-1 p-6 overflow-hidden">
          <div className="h-full w-full">
            {renderChart()}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-600">
            <span className="font-semibold">{getChartTypeConfig(selectedChartType).bestFor}</span>
          </div>
          <div className="flex items-center gap-2">
            {/* <button
              onClick={handleExportImage}
              className="px-3 py-1.5 text-xs bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors flex items-center gap-1"
            >
              <Download className="w-3 h-3" />
              Export PNG
            </button> */}
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
