import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  Cell,
  PieChart,
  Pie,
  AreaChart,
  Area,
  Treemap,
  LineChart,
  Line,
  ComposedChart,
  FunnelChart,
  Funnel,
  LabelList
} from 'recharts';
import { ChartType, MetricType, SnapshotData, TrendData } from '../../hooks/useAnalysisStudioLogic';
import { formatChartValue } from '../../logic/pivotToChart';
import { PivotConfig } from '../../types';

interface AnalysisChartDisplayProps {
  chartType: ChartType;
  snapshotData: SnapshotData;
  trendData: TrendData;
  mode: 'snapshot' | 'trend';
  chartColors: string[];
  customUnit: string;
  segment: string;
  dimension: string;
  metric: MetricType;
  metric2: MetricType | 'none';
  valueField: string;
  valueField2: string;
  showForecast: boolean;
  chartTitle?: string;
  isCalculating?: boolean;
  colorMode?: any;
  colorPalette?: any;
  singleColor?: string;
  gradientStart?: string;
  gradientEnd?: string;
}

const tooltipStyle = {
  backgroundColor: 'rgba(255, 255, 255, 0.95)',
  borderRadius: '12px',
  border: '1px solid #e2e8f0',
  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  padding: '12px'
};

interface TreemapContentProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  index?: number;
  colors?: string[];
}

const TreemapContent = (props: TreemapContentProps) => {
  const { x = 0, y = 0, width = 0, height = 0, name, index = 0, colors } = props;
  const fill = colors ? colors[index % colors.length] : '#64748b';
  const displayName = name || 'N/A';

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill} stroke="#fff" />
      {width > 60 && height > 30 && (
        <text
          x={x + width / 2}
          y={y + height / 2}
          textAnchor="middle"
          fill="#fff"
          fontSize={12}
          dy={4}
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}
        >
          {displayName.substring(0, 12)}
        </text>
      )}
    </g>
  );
};

export const AnalysisChartDisplay: React.FC<AnalysisChartDisplayProps> = ({
  chartType,
  snapshotData,
  trendData,
  mode,
  chartColors,
  customUnit,
  segment,
  dimension,
  metric,
  metric2,
  valueField,
  valueField2,
  showForecast,
  chartTitle
}) => {
  const dummyConfig: PivotConfig = {
    rowFields: [],
    colFields: [],
    colGrouping: 'none',
    valField: '',
    aggType: 'count',
    filters: [],
    sortBy: 'label',
    sortOrder: 'asc',
    showSubtotals: true,
    valFormatting: { unit: customUnit }
  };

  const commonTooltipFormatter = (val: number | string) => {
    return formatChartValue(val, dummyConfig);
  };

  if (mode === 'trend') {
    const isStacked =
      chartType === 'stacked-area' ||
      chartType === 'stacked-column' ||
      chartType === 'percent-column';
    const isPercent = chartType === 'percent-column';
    const isBar =
      chartType === 'column' || chartType === 'stacked-column' || chartType === 'percent-column';

    return (
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={trendData.data}
          margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
          stackOffset={isPercent ? 'expand' : undefined}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="displayDate" stroke="#94a3b8" fontSize={12} />
          <YAxis
            yAxisId="left"
            stroke="#94a3b8"
            fontSize={12}
            tickFormatter={isPercent ? (val) => `${(val * 100).toFixed(0)}%` : undefined}
          />
          {metric2 !== 'none' && !isStacked && (
            <YAxis yAxisId="right" orientation="right" stroke="#6366f1" fontSize={12} />
          )}
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(val: any) =>
              isPercent ? `${(val * 100).toFixed(1)}%` : commonTooltipFormatter(val)
            }
          />
          <Legend
            verticalAlign="top"
            iconType="circle"
            wrapperStyle={{ fontSize: '12px', color: '#64748b' }}
          />

          {trendData.series.map((s: string, idx: number) => {
            if (isBar) {
              return (
                <Bar
                  key={s}
                  yAxisId="left"
                  dataKey={s}
                  name={s}
                  stackId={isStacked ? 'a' : undefined}
                  fill={chartColors[idx % chartColors.length]}
                  radius={!isStacked ? [4, 4, 0, 0] : 0}
                />
              );
            } else if (chartType === 'area' || chartType === 'stacked-area') {
              return (
                <Area
                  key={s}
                  yAxisId="left"
                  type="monotone"
                  dataKey={s}
                  name={s}
                  stackId={isStacked ? 'a' : undefined}
                  stroke={chartColors[idx % chartColors.length]}
                  fill={chartColors[idx % chartColors.length]}
                  fillOpacity={0.4}
                />
              );
            } else {
              return (
                <Line
                  yAxisId="left"
                  key={s}
                  type="monotone"
                  dataKey={s}
                  stroke={chartColors[idx % chartColors.length]}
                  strokeWidth={2}
                  dot={true}
                />
              );
            }
          })}

          {metric2 !== 'none' && !isStacked && (
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="total2"
              name={metric2 === 'sum' ? `Total ${valueField2}` : 'Total (2)'}
              stroke="#6366f1"
              strokeWidth={3}
              strokeDasharray="3 3"
              dot={false}
            />
          )}
          {showForecast && !isPercent && (
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="forecast"
              name="Tendance (Reg. Lin.)"
              stroke="#6366f1"
              strokeDasharray="5 5"
              strokeWidth={2}
              dot={false}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    );
  }

  switch (chartType) {
    case 'column':
    case 'stacked-column':
    case 'percent-column': {
      const isStacked = chartType === 'stacked-column' || chartType === 'percent-column';
      const isPercent = chartType === 'percent-column';
      return (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={snapshotData.data}
            margin={{ top: 20, right: 10, left: 0, bottom: 0 }}
            stackOffset={isPercent ? 'expand' : undefined}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              interval={0}
              fontSize={11}
              height={60}
              stroke="#94a3b8"
            />
            <YAxis
              yAxisId="left"
              stroke="#94a3b8"
              fontSize={12}
              tickFormatter={isPercent ? (val) => `${(val * 100).toFixed(0)}%` : undefined}
            />
            {metric2 !== 'none' && !isStacked && (
              <YAxis yAxisId="right" orientation="right" stroke="#6366f1" fontSize={12} />
            )}
            <Tooltip
              cursor={{ fill: '#f8fafc' }}
              contentStyle={tooltipStyle}
              formatter={(val: any) =>
                isPercent ? `${(val * 100).toFixed(1)}%` : commonTooltipFormatter(val)
              }
            />

            {segment ? (
              snapshotData.series.map((s: string, idx: number) => (
                <Bar
                  key={s}
                  yAxisId="left"
                  dataKey={s}
                  name={s}
                  stackId={isStacked ? 'a' : undefined}
                  fill={chartColors[idx % chartColors.length]}
                  radius={!isStacked ? [4, 4, 0, 0] : 0}
                />
              ))
            ) : (
              <Bar
                yAxisId="left"
                dataKey="value"
                name={
                  metric === 'sum'
                    ? `Somme (${valueField})`
                    : metric === 'distinct'
                      ? 'Distinct'
                      : 'Nombre'
                }
                radius={[4, 4, 0, 0]}
              >
                {snapshotData.data.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                ))}
              </Bar>
            )}

            {metric2 !== 'none' && !isStacked && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="value2"
                name={
                  metric2 === 'sum'
                    ? `Somme (${valueField2})`
                    : metric2 === 'distinct'
                      ? 'Distinct (2)'
                      : 'Nombre (2)'
                }
                stroke="#6366f1"
                strokeWidth={3}
                dot={{ r: 4, fill: '#6366f1' }}
              />
            )}
            {(metric2 !== 'none' || segment) && <Legend verticalAlign="top" />}
          </ComposedChart>
        </ResponsiveContainer>
      );
    }
    case 'bar':
    case 'stacked-bar':
    case 'percent-bar': {
      const isStacked = chartType === 'stacked-bar' || chartType === 'percent-bar';
      const isPercent = chartType === 'percent-bar';
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={snapshotData.data}
            layout="vertical"
            margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
            stackOffset={isPercent ? 'expand' : undefined}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
            <XAxis
              type="number"
              stroke="#94a3b8"
              fontSize={12}
              tickFormatter={isPercent ? (val) => `${(val * 100).toFixed(0)}%` : undefined}
            />
            <YAxis dataKey="name" type="category" width={100} fontSize={11} stroke="#94a3b8" />
            <Tooltip
              cursor={{ fill: '#f8fafc' }}
              contentStyle={tooltipStyle}
              formatter={(val: any) =>
                isPercent ? `${(val * 100).toFixed(1)}%` : commonTooltipFormatter(val)
              }
            />
            {segment ? (
              snapshotData.series.map((s: string, idx: number) => (
                <Bar
                  key={s}
                  dataKey={s}
                  name={s}
                  stackId={isStacked ? 'a' : undefined}
                  fill={chartColors[idx % chartColors.length]}
                />
              ))
            ) : (
              <Bar
                dataKey="value"
                name={
                  metric === 'sum'
                    ? `Somme (${valueField})`
                    : metric === 'distinct'
                      ? 'Distinct'
                      : 'Nombre'
                }
              >
                {snapshotData.data.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                ))}
              </Bar>
            )}
            {segment && <Legend verticalAlign="top" />}
          </BarChart>
        </ResponsiveContainer>
      );
    }
    case 'pie':
    case 'donut':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={snapshotData.data}
              cx="50%"
              cy="50%"
              innerRadius={chartType === 'donut' ? '60%' : 0}
              outerRadius="80%"
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
            >
              {snapshotData.data.map((_entry, index) => (
                <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(val: any) => commonTooltipFormatter(val)}
            />
            <Legend verticalAlign="bottom" height={36} />
          </PieChart>
        </ResponsiveContainer>
      );
    case 'area':
    case 'stacked-area':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={snapshotData.data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" fontSize={11} stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" fontSize={12} />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(val: any) => commonTooltipFormatter(val)}
            />
            {segment ? (
              snapshotData.series.map((s: string, idx: number) => (
                <Area
                  key={s}
                  type="monotone"
                  dataKey={s}
                  name={s}
                  stackId={chartType === 'stacked-area' ? '1' : undefined}
                  stroke={chartColors[idx % chartColors.length]}
                  fill={chartColors[idx % chartColors.length]}
                  fillOpacity={0.6}
                />
              ))
            ) : (
              <Area
                type="monotone"
                dataKey="value"
                stroke={chartColors[0]}
                fill={chartColors[0]}
                fillOpacity={0.6}
              />
            )}
            {segment && <Legend verticalAlign="top" />}
          </AreaChart>
        </ResponsiveContainer>
      );
    case 'line':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={snapshotData.data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" fontSize={11} stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" fontSize={12} />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(val: any) => commonTooltipFormatter(val)}
            />
            {segment ? (
              snapshotData.series.map((s: string, idx: number) => (
                <Line
                  key={s}
                  type="monotone"
                  dataKey={s}
                  name={s}
                  stroke={chartColors[idx % chartColors.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              ))
            ) : (
              <Line
                type="monotone"
                dataKey="value"
                stroke={chartColors[0]}
                strokeWidth={3}
                dot={{ r: 5 }}
                activeDot={{ r: 8 }}
              />
            )}
            {segment && <Legend verticalAlign="top" />}
          </LineChart>
        </ResponsiveContainer>
      );
    case 'radar':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={snapshotData.data}>
            <PolarGrid stroke="#e2e8f0" />
            <PolarAngleAxis dataKey="name" fontSize={11} />
            <PolarRadiusAxis fontSize={10} stroke="#94a3b8" />
            {segment ? (
              snapshotData.series.map((s: string, idx: number) => (
                <Radar
                  key={s}
                  name={s}
                  dataKey={s}
                  stroke={chartColors[idx % chartColors.length]}
                  fill={chartColors[idx % chartColors.length]}
                  fillOpacity={0.5}
                />
              ))
            ) : (
              <Radar
                name="Valeur"
                dataKey="value"
                stroke={chartColors[0]}
                fill={chartColors[0]}
                fillOpacity={0.6}
              />
            )}
            <Tooltip contentStyle={tooltipStyle} />
            {segment && <Legend />}
          </RadarChart>
        </ResponsiveContainer>
      );
    case 'treemap':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={snapshotData.data}
            dataKey="value"
            aspectRatio={4 / 3}
            stroke="#fff"
            content={<TreemapContent colors={chartColors} />}
          >
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(val: any) => commonTooltipFormatter(val)}
            />
          </Treemap>
        </ResponsiveContainer>
      );
    case 'funnel':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <FunnelChart>
            <Tooltip contentStyle={tooltipStyle} />
            <Funnel dataKey="value" data={snapshotData.data} isAnimationActive>
              <LabelList
                position="right"
                fill="#64748b"
                stroke="none"
                dataKey="name"
                fontSize={11}
              />
              {snapshotData.data.map((_entry, index) => (
                <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
              ))}
            </Funnel>
          </FunnelChart>
        </ResponsiveContainer>
      );
    case 'kpi':
      const total = snapshotData.data.reduce((sum: number, d) => sum + d.value, 0);
      return (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <div className="text-sm font-black text-slate-400 uppercase tracking-widest mb-2">
            {chartTitle || 'Total'}
          </div>
          <div className="text-6xl font-black text-brand-600 tracking-tighter mb-2">
            {commonTooltipFormatter(total)}
          </div>
          <div className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full uppercase">
            Basé sur {snapshotData.data.length} catégories
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
