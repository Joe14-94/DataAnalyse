import React from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  Treemap,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LabelList
} from 'recharts';
import { ChevronRight, Home } from 'lucide-react';
import { TreemapContent } from '../ui/TreemapContent';
import { SunburstD3 } from '../charts/SunburstD3';
import { formatChartValue } from '../../logic/pivotToChart';

interface ChartPreviewProps {
  selectedChartType: string;
  hasData: boolean;
  chartData: any[];
  metadata: any;
  colors: string[];
  pivotConfig: any;
  sunburstData: any;
  d3HierarchyData: any;
  sunburstTitle: string;
  showSunburstLegend: boolean;
  sunburstColors: string[];
  currentTreemapData: any[];
  treemapDrillPath: string[];
  handleTreemapDrill: (name: string) => void;
  handleTreemapBreadcrumb: (idx: number) => void;
}

export const ChartPreview: React.FC<ChartPreviewProps> = ({
  selectedChartType,
  hasData,
  chartData,
  metadata,
  colors,
  pivotConfig,
  sunburstData,
  d3HierarchyData,
  sunburstTitle,
  showSunburstLegend,
  sunburstColors,
  currentTreemapData,
  treemapDrillPath,
  handleTreemapDrill,
  handleTreemapBreadcrumb
}) => {
  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400">
        Aucune donnée à afficher
      </div>
    );
  }

  const chartMargin = { top: 20, right: 30, left: 20, bottom: 60 };

  const renderChart = () => {
    switch (selectedChartType) {
      case 'bar':
      case 'stacked-bar':
      case 'percent-bar': {
        const isStacked =
          selectedChartType === 'stacked-bar' || selectedChartType === 'percent-bar';
        const isPercent = selectedChartType === 'percent-bar';
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ ...chartMargin, left: 140 }}
              stackOffset={isPercent ? 'expand' : undefined}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis
                type="number"
                stroke="#94a3b8"
                fontSize={11}
                domain={isPercent ? [0, 1] : [0, 'auto']}
                tickFormatter={isPercent ? (val) => `${(val * 100).toFixed(0)}%` : undefined}
              />
              <YAxis
                dataKey="name"
                type="category"
                width={130}
                tick={{ fontSize: 10 }}
                stroke="#94a3b8"
              />
              <Tooltip />
              {metadata.isMultiSeries || isStacked ? (
                metadata.seriesNames.map((series: any, idx: number) => (
                  <Bar
                    key={series}
                    dataKey={series}
                    stackId={isStacked ? 'a' : undefined}
                    fill={colors[idx % colors.length]}
                    radius={!isStacked ? [0, 4, 4, 0] : 0}
                  />
                ))
              ) : (
                <Bar dataKey="value" fill={colors[0]} radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Bar>
              )}
              {(metadata.isMultiSeries || isStacked) && (
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              )}
            </BarChart>
          </ResponsiveContainer>
        );
      }
      case 'column':
      case 'stacked-column':
      case 'percent-column': {
        const isStacked =
          selectedChartType === 'stacked-column' || selectedChartType === 'percent-column';
        const isPercent = selectedChartType === 'percent-column';
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="horizontal"
              margin={chartMargin}
              stackOffset={isPercent ? 'expand' : undefined}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="name"
                stroke="#94a3b8"
                fontSize={10}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                domain={isPercent ? [0, 1] : [0, 'auto']}
                tickFormatter={isPercent ? (val) => `${(val * 100).toFixed(0)}%` : undefined}
              />
              <Tooltip />
              {metadata.isMultiSeries || isStacked ? (
                metadata.seriesNames.map((series: any, idx: number) => (
                  <Bar
                    key={series}
                    dataKey={series}
                    stackId={isStacked ? 'a' : undefined}
                    fill={colors[idx % colors.length]}
                    radius={!isStacked ? [4, 4, 0, 0] : 0}
                  />
                ))
              ) : (
                <Bar dataKey="value" fill={colors[0]} radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Bar>
              )}
              {(metadata.isMultiSeries || isStacked) && (
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              )}
            </BarChart>
          </ResponsiveContainer>
        );
      }
      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={chartMargin}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="name"
                stroke="#94a3b8"
                fontSize={10}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip />
              {metadata.isMultiSeries ? (
                <>
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  {metadata.seriesNames.map((s: any, i: number) => (
                    <Line key={s} type="monotone" dataKey={s} stroke={colors[i]} strokeWidth={2} />
                  ))}
                </>
              ) : (
                <Line type="monotone" dataKey="value" stroke={colors[0]} strokeWidth={2} />
              )}
            </LineChart>
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
                innerRadius={selectedChartType === 'donut' ? '45%' : 0}
                outerRadius="75%"
                paddingAngle={2}
                dataKey="value"
                stroke="#fff"
                strokeWidth={2}
                labelLine={true}
                label={({ name, percent }) => `${name || ''} (${(percent * 100).toFixed(0)}%)`}
              >
                {chartData.map((e, i) => (
                  <Cell key={`cell-${i}`} fill={colors[i % colors.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend
                verticalAlign="bottom"
                align="center"
                wrapperStyle={{ fontSize: '11px', bottom: 0 }}
              />
            </PieChart>
          </ResponsiveContainer>
        );
      case 'treemap':
        return (
          <div className="h-full flex flex-col">
            {treemapDrillPath.length > 0 && (
              <div className="flex items-center gap-1 mb-2 text-xs">
                <button
                  onClick={() => handleTreemapBreadcrumb(0)}
                  className="flex items-center gap-1 px-2 py-1 rounded hover:bg-brand-50 text-brand-600 font-medium transition-colors"
                >
                  <Home className="w-3 h-3" /> Racine
                </button>
                {treemapDrillPath.map((seg, i) => (
                  <React.Fragment key={i}>
                    <ChevronRight className="w-3 h-3 text-slate-400" />
                    <button
                      onClick={() => handleTreemapBreadcrumb(i + 1)}
                      className={`px-2 py-1 rounded ${i === treemapDrillPath.length - 1 ? 'bg-brand-100 text-brand-700 font-semibold' : 'hover:bg-brand-50 text-brand-600'}`}
                    >
                      {seg}
                    </button>
                  </React.Fragment>
                ))}
              </div>
            )}
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <Treemap
                  data={currentTreemapData}
                  dataKey="size"
                  content={<TreemapContent colors={colors} onClick={handleTreemapDrill} />}
                >
                  <Tooltip />
                </Treemap>
              </ResponsiveContainer>
            </div>
          </div>
        );
      case 'sunburst':
        return (
          <div className="relative w-full h-full flex flex-col">
            {showSunburstLegend && pivotConfig.rowFields.length > 0 && (
              <div className="flex justify-center mb-2">
                <div className="flex gap-4">
                  <div className="text-xs font-bold text-slate-700 uppercase">Niveaux:</div>
                  {pivotConfig.rowFields.map((f: any, i: number) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs">
                      <div
                        className="w-3 h-3 rounded-sm border border-slate-300"
                        style={{ backgroundColor: sunburstColors[i % sunburstColors.length] }}
                      />
                      <span className="text-slate-700 font-medium">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex-1" style={{ minHeight: '500px' }}>
              <SunburstD3
                data={d3HierarchyData}
                width={800}
                height={800}
                unit={pivotConfig.valField || ''}
                title={sunburstTitle}
                rowFields={pivotConfig.rowFields}
                colors={sunburstColors}
              />
            </div>
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center h-full text-slate-400">
            Type de graphique non supporté
          </div>
        );
    }
  };

  return <div className="h-full w-full">{renderChart()}</div>;
};
