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
  LabelList,
  FunnelChart,
  Funnel
} from 'recharts';
import { TreemapContent } from '../../ui/TreemapContent';
import { SunburstD3 } from '../../charts/SunburstD3';
import {
  ChartType,
  formatChartValue,
  sunburstDataToD3Hierarchy
} from '../../../logic/pivotToChart';
import { PivotConfig, PivotResult } from '../../../types';

interface ChartDisplayAreaProps {
  selectedChartType: ChartType;
  chartData: any[];
  sunburstData: any;
  currentTreemapData: any[];
  colors: string[];
  pivotConfig: PivotConfig;
  metadata: any;
  treemapDrillPath: string[];
  setTreemapDrillPath: (path: string[]) => void;
  tooltipStyle: any;
}

export const ChartDisplayArea: React.FC<ChartDisplayAreaProps> = ({
  selectedChartType,
  chartData,
  sunburstData,
  currentTreemapData,
  colors,
  pivotConfig,
  metadata,
  treemapDrillPath,
  setTreemapDrillPath,
  tooltipStyle
}) => {
  const chartMargin = { top: 20, right: 30, left: 20, bottom: 60 };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={tooltipStyle}>
          <p className="font-bold text-slate-800 mb-2 border-b border-slate-100 pb-1 text-xs">
            {label || payload[0].payload.name}
          </p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <p key={index} className="text-xs flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 font-medium text-slate-600">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  {entry.name}:
                </span>
                <span className="font-bold text-slate-900">
                  {formatChartValue(entry.value, pivotConfig)}
                </span>
              </p>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const renderChartContent = () => {
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
              <Tooltip content={<CustomTooltip />} />
              {metadata.isMultiSeries || isStacked ? (
                metadata.seriesNames.map((series: string, idx: number) => (
                  <Bar
                    key={series}
                    dataKey={series}
                    stackId={isStacked ? 'a' : undefined}
                    fill={colors[idx % colors.length]}
                    radius={!isStacked ? [0, 4, 4, 0] : 0}
                  >
                    {isStacked && (
                      <LabelList
                        dataKey={series}
                        position="center"
                        formatter={(val: any) =>
                          val !== 0 ? formatChartValue(val, pivotConfig) : ''
                        }
                        style={{
                          fill: '#fff',
                          fontSize: '10px',
                          fontWeight: 'bold',
                          pointerEvents: 'none'
                        }}
                      />
                    )}
                  </Bar>
                ))
              ) : (
                <Bar dataKey="value" fill={colors[0]} radius={[0, 4, 4, 0]}>
                  {chartData.map((_entry: any, index: number) => (
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
              <Tooltip content={<CustomTooltip />} />
              {metadata.isMultiSeries || isStacked ? (
                metadata.seriesNames.map((series: string, idx: number) => (
                  <Bar
                    key={series}
                    dataKey={series}
                    stackId={isStacked ? 'a' : undefined}
                    fill={colors[idx % colors.length]}
                    radius={!isStacked ? [4, 4, 0, 0] : 0}
                  >
                    {isStacked && (
                      <LabelList
                        dataKey={series}
                        position="center"
                        formatter={(val: any) =>
                          val !== 0 ? formatChartValue(val, pivotConfig) : ''
                        }
                        style={{
                          fill: '#fff',
                          fontSize: '10px',
                          fontWeight: 'bold',
                          pointerEvents: 'none'
                        }}
                      />
                    )}
                  </Bar>
                ))
              ) : (
                <Bar dataKey="value" fill={colors[0]} radius={[4, 4, 0, 0]}>
                  {chartData.map((_entry: any, index: number) => (
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
              <Tooltip content={<CustomTooltip />} />
              {metadata.isMultiSeries ? (
                <>
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  {metadata.seriesNames.map((series: string, idx: number) => (
                    <Line
                      key={series}
                      type="monotone"
                      dataKey={series}
                      stroke={colors[idx % colors.length]}
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

      case 'pie':
      case 'donut':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={selectedChartType === 'donut' ? '60%' : 0}
                outerRadius="80%"
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                labelLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
              >
                {chartData.map((_entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px' }} />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'sunburst':
        return (
          <SunburstD3
            data={sunburstDataToD3Hierarchy(sunburstData)}
            width={600}
            height={600}
            colors={colors}
            unit={pivotConfig.valFormatting?.unit || ''}
            rowFields={pivotConfig.rowFields}
          />
        );

      case 'treemap':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <Treemap
              data={currentTreemapData}
              dataKey="size"
              aspectRatio={4 / 3}
              stroke="#fff"
              content={<TreemapContent colors={colors} />}
            >
              <Tooltip content={<CustomTooltip />} />
            </Treemap>
          </ResponsiveContainer>
        );

      default:
        return (
          <div className="flex items-center justify-center h-full text-slate-400">
            Type de graphique non supporté
          </div>
        );
    }
  };

  return (
    <div className="flex-1 min-h-0 bg-white p-6 rounded-xl border border-slate-100 shadow-inner">
      {renderChartContent()}
    </div>
  );
};
