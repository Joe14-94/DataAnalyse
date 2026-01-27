
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useWidgets, useBatches, useDatasets } from '../context/DataContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Heading, Text } from '../components/ui/Typography';
import { Input, Select, Label } from '../components/ui/Form';
import { Badge } from '../components/ui/Badge';
import {
   LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
   Legend, AreaChart, Area, BarChart, Bar, Cell, PieChart, Pie, RadialBarChart, RadialBar,
   Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Treemap, Funnel, FunnelChart, LabelList
} from 'recharts';
import { formatDateFr, parseSmartNumber } from '../utils';
import {
   Activity, Layout, PieChart as PieIcon, Edit3, Plus, X, ArrowLeft, ArrowRight, Trash2,
   Minimize2, Settings, BarChart3, Check, TrendingUp,
   ListOrdered, Radar as RadarIcon, LayoutGrid, Filter, Link as LinkIcon, FilterX, Type, Copy, PaintBucket, Eye, GripHorizontal, Move, CalendarRange, MousePointerClick, MoreVertical, Download, Image as ImageIcon, Maximize2, FileText
} from 'lucide-react';
import { DashboardWidget, WidgetConfig, WidgetSize, WidgetType, ChartType, Dataset, KpiStyle, WidgetHeight } from '../types';
import { calculatePivotData, PivotConfig } from '../logic/pivotEngine';
import { transformPivotToChartData, transformPivotToTreemapData, getChartColors, generateGradient } from '../logic/pivotToChart';
import html2canvas from 'html2canvas';
import { useNavigate } from 'react-router-dom';

// --- UTILS ---
const COLORS = ['#64748b', '#60a5fa', '#34d399', '#f87171', '#a78bfa', '#fbbf24', '#22d3ee', '#f472b6'];

// Calculate responsive styling based on widget height
const getResponsiveChartStyles = (height: WidgetHeight | undefined) => {
   const heightMap: Record<WidgetHeight, { px: number; fontSize: number; marginBottom: number }> = {
      sm: { px: 128, fontSize: 9, marginBottom: 30 },
      md: { px: 256, fontSize: 10, marginBottom: 40 },
      lg: { px: 384, fontSize: 11, marginBottom: 50 },
      xl: { px: 500, fontSize: 12, marginBottom: 60 }
   };
   return heightMap[height || 'md'];
};

const BORDER_COLORS = [
   { label: 'Gris', class: 'border-slate-200', bg: 'bg-slate-200' },
   { label: 'Bleu', class: 'border-blue-200', bg: 'bg-blue-200' },
   { label: 'Rouge', class: 'border-red-200', bg: 'bg-red-200' },
   { label: 'Vert', class: 'border-green-200', bg: 'bg-green-200' },
   { label: 'Orange', class: 'border-amber-200', bg: 'bg-amber-200' },
];

const BORDER_WIDTHS = [
   { label: 'Aucune', value: '0' },
   { label: '1px', value: '1' },
   { label: '2px', value: '2' },
   { label: '4px', value: '4' },
];

// --- COMPONENTS ---
const TreemapContent = (props: any) => {
   const { x, y, width, height, name, index } = props;
   return (
      <g>
         <rect x={x} y={y} width={width} height={height} fill={COLORS[index % COLORS.length]} stroke="#fff" />
         {width > 40 && height > 20 && (
            <text x={x + width / 2} y={y + height / 2} textAnchor="middle" fill="#fff" fontSize="0.8rem" dy={4} style={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
               {name.substring(0, 10)}
            </text>
         )}
      </g>
   );
};

const useWidgetData = (widget: DashboardWidget, globalDateRange: { start: string, end: string }) => {
   const { batches } = useBatches();
   const { datasets } = useDatasets();
   const { dashboardFilters } = useWidgets();

   return useMemo(() => {
      if (widget.type === 'text') return { text: widget.config.textContent, style: widget.config.textStyle };

      // NOUVEAU : Gérer les widgets basés sur des graphiques TCD
      if (widget.config.pivotChart) {
         const { pivotChart } = widget.config;
         const { pivotConfig: pc } = pivotChart;

         // 1. Récupérer les données du dataset source
         if (!pc.rowFields || pc.rowFields.length === 0) return { error: 'Configuration de graphique TCD invalide' };

         const dataset = datasets.find(d => d.id === widget.config.source?.datasetId);
         if (!dataset) return { error: 'Jeu de données introuvable' };

         // 2. Filtrer les batches du dataset
         let dsBatches = batches.filter(b => b.datasetId === widget.config.source?.datasetId);

         if (globalDateRange.start) {
            dsBatches = dsBatches.filter(b => b.date >= globalDateRange.start);
         }
         if (globalDateRange.end) {
            dsBatches = dsBatches.filter(b => b.date <= globalDateRange.end);
         }

         dsBatches.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

         if (dsBatches.length === 0) return { error: 'Aucune donnée sur la période' };

         // 3. Sélectionner le batch le plus récent
         let workingRows = dsBatches[dsBatches.length - 1].rows;

         // 4. Appliquer les filtres du TCD
         if (pc.filters && pc.filters.length > 0) {
            workingRows = workingRows.filter(row => {
               return pc.filters!.every(filter => {
                  if (filter.operator === 'in' && Array.isArray(filter.value)) {
                     return filter.value.includes(row[filter.field]);
                  } else if (filter.operator === 'contains') {
                     return String(row[filter.field] || '').includes(String(filter.value));
                  } else if (filter.operator === 'gt') {
                     return parseSmartNumber(row[filter.field], dataset.fieldConfigs?.[filter.field]?.unit) > filter.value;
                  } else if (filter.operator === 'lt') {
                     return parseSmartNumber(row[filter.field], dataset.fieldConfigs?.[filter.field]?.unit) < filter.value;
                  } else if (filter.operator === 'eq') {
                     return String(row[filter.field]) === String(filter.value);
                  } else if (filter.operator === 'starts_with') {
                     return String(row[filter.field] || '').startsWith(String(filter.value));
                  }
                  return true;
               });
            });
         }

         // 5. Calculer le TCD
         const pivotResult = calculatePivotData({
            rows: workingRows,
            rowFields: pc.rowFields,
            colFields: pc.colFields,
            colGrouping: pc.colGrouping,
            valField: pc.valField,
            aggType: pc.aggType,
            filters: [],
            sortBy: pc.sortBy,
            sortOrder: pc.sortOrder,
            showSubtotals: pc.showSubtotals,
            currentDataset: dataset
         });

         if (!pivotResult) return { error: 'Erreur lors du calcul du TCD' };

         // 6. Transformer en données de graphique
         let chartData;
         const fullPivotConfig = { rows: workingRows, ...pc } as PivotConfig;
         if (pivotChart.chartType === 'treemap') {
            chartData = transformPivotToTreemapData(pivotResult, fullPivotConfig, pivotChart.hierarchyLevel);
         } else {
            chartData = transformPivotToChartData(pivotResult, fullPivotConfig, {
               chartType: pivotChart.chartType,
               hierarchyLevel: pivotChart.hierarchyLevel,
               limit: pivotChart.limit,
               excludeSubtotals: true,
               sortBy: pivotChart.sortBy || 'value',
               sortOrder: pivotChart.sortOrder || 'desc',
               showOthers: (pivotChart.limit || 0) > 0
            });
         }

         // 7. Déterminer le nombre de séries et le nombre de points
         const seriesCount = chartData && chartData.length > 0
            ? Object.keys(chartData[0]).filter(k => k !== 'name').length
            : 1;
         const pointCount = chartData?.length || 0;

         // 8. Calculer les couleurs
         // Stratégie:
         // - Pour pie, donut, treemap: toujours une couleur par point de données
         // - Pour les autres graphiques:
         //   - Si multi-séries (seriesCount > 1): une couleur par série
         //   - Si mono-série (seriesCount = 1): une couleur par point de données (pour les dégradés/palettes)
         const isMultiSeriesChart = seriesCount > 1;
         const colorCount = (pivotChart.chartType === 'pie' || pivotChart.chartType === 'donut' || pivotChart.chartType === 'treemap')
            ? pointCount
            : (isMultiSeriesChart ? seriesCount : pointCount);

         // Initialiser les valeurs par défaut si elles ne sont pas définies
         const effectiveColorMode = pivotChart.colorMode || 'multi';
         const effectiveColorPalette = pivotChart.colorPalette || 'vibrant';
         const effectiveSingleColor = pivotChart.singleColor || '#0066cc';
         const effectiveGradientStart = pivotChart.gradientStart || '#0066cc';
         const effectiveGradientEnd = pivotChart.gradientEnd || '#e63946';

         console.log('🎨 Calcul des couleurs pour widget TCD:', {
            colorMode: pivotChart.colorMode,
            effectiveColorMode,
            colorPalette: pivotChart.colorPalette,
            effectiveColorPalette,
            colorCount
         });

         let colors = [];
         if (effectiveColorMode === 'single') {
            colors = Array(Math.max(colorCount, 1)).fill(effectiveSingleColor);
         } else if (effectiveColorMode === 'gradient') {
            colors = generateGradient(
               effectiveGradientStart,
               effectiveGradientEnd,
               Math.max(colorCount, 1)
            );
         } else {
            colors = getChartColors(Math.max(colorCount, 1), effectiveColorPalette);
         }

         return {
            data: chartData,
            colors,
            unit: dataset.fieldConfigs?.[pc.valField]?.unit || '',
            seriesName: pc.valField,
            seriesCount
         };
      }

      const { source, metric, dimension, valueField, target, secondarySource, limit } = widget.config;
      if (!source) return null;

      const dataset = datasets.find(d => d.id === source.datasetId);
      if (!dataset) return { error: 'Jeu de données introuvable' };

      // 1. Filtrer les batches du dataset principal
      let dsBatches = batches
         .filter(b => b.datasetId === source.datasetId);

      // --- APPLIQUER LE FILTRE GLOBAL DE DATE ---
      if (globalDateRange.start) {
         dsBatches = dsBatches.filter(b => b.date >= globalDateRange.start);
      }
      if (globalDateRange.end) {
         dsBatches = dsBatches.filter(b => b.date <= globalDateRange.end);
      }

      // Trier après filtrage
      dsBatches.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      if (dsBatches.length === 0) return { error: 'Aucune donnée sur la période' };

      // Sélectionner le batch cible (le plus récent de la sélection)
      let targetBatch = dsBatches[dsBatches.length - 1];

      // Batch précédent pour la tendance (soit le précédent dans la liste filtrée, soit null)
      let prevBatch = dsBatches.length > 1 ? dsBatches[dsBatches.length - 2] : null;

      if (source.mode === 'specific' && source.batchId) {
         const specific = dsBatches.find(b => b.id === source.batchId);
         if (specific) targetBatch = specific;
         else return { error: 'Import introuvable' };
      }

      let workingRows = targetBatch.rows;
      let secondaryDataset: Dataset | undefined = undefined;

      // Gestion Source Secondaire (Join)
      if (secondarySource && secondarySource.datasetId) {
         secondaryDataset = datasets.find(d => d.id === secondarySource.datasetId);
         let secBatches = batches.filter(b => b.datasetId === secondarySource.datasetId);

         if (globalDateRange.start) secBatches = secBatches.filter(b => b.date >= globalDateRange.start);
         if (globalDateRange.end) secBatches = secBatches.filter(b => b.date <= globalDateRange.end);

         secBatches.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

         if (secBatches.length > 0) {
            const secBatch = secBatches[secBatches.length - 1];
            const lookup = new Map<string, any>();
            secBatch.rows.forEach(r => { const key = String(r[secondarySource.joinFieldSecondary]).trim(); if (key) lookup.set(key, r); });
            workingRows = workingRows.map(row => { const key = String(row[secondarySource.joinFieldPrimary]).trim(); const match = lookup.get(key); if (match) { return { ...row, ...match }; } return row; });
         }
      }

      // Filtres Drill-down (Dashboard Filters)
      if (Object.keys(dashboardFilters).length > 0) {
         workingRows = workingRows.filter(row => {
            return Object.entries(dashboardFilters).every(([field, val]) => {
               if (row[field] === undefined) return true;
               return String(row[field]) === String(val);
            });
         });
      }

      const parseVal = (row: any, field: string) => {
         let unit = dataset.fieldConfigs?.[field]?.unit;
         if (!unit && secondaryDataset) unit = secondaryDataset.fieldConfigs?.[field]?.unit;
         return parseSmartNumber(row[field], unit);
      };

      const getUnit = (field: string | undefined) => {
         if (!field) return '';
         return dataset.fieldConfigs?.[field]?.unit || secondaryDataset?.fieldConfigs?.[field]?.unit || '';
      };

      const currentUnit = (metric === 'sum' || metric === 'avg') && valueField ? getUnit(valueField) : '';

      if (widget.type === 'list') {
         const counts: Record<string, number> = {};
         workingRows.forEach(row => {
            const key = String(row[dimension || ''] || 'Non défini');
            if (metric === 'count' || metric === 'distinct') counts[key] = (counts[key] || 0) + 1;
            else if (metric === 'sum' && valueField) counts[key] = (counts[key] || 0) + parseVal(row, valueField);
         });
         let sorted = Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, limit || 10);

         // Calculer les couleurs basées sur la configuration du widget
         const colorCount = sorted.length;
         let colors = [];
         if (widget.config.colorMode === 'single') {
            colors = Array(Math.max(colorCount, 1)).fill(widget.config.singleColor || '#0066cc');
         } else if (widget.config.colorMode === 'gradient') {
            colors = generateGradient(
               widget.config.gradientStart || '#0066cc',
               widget.config.gradientEnd || '#e63946',
               Math.max(colorCount, 1)
            );
         } else {
            colors = getChartColors(Math.max(colorCount, 1), widget.config.colorPalette || 'default');
         }

         return { current: sorted, max: sorted.length > 0 ? sorted[0].value : 0, unit: currentUnit, colors };
      }

      if (dimension) {
         const counts: Record<string, number> = {};
         workingRows.forEach(row => {
            const key = String(row[dimension] || 'Non défini');
            let val = 1;
            if (metric === 'sum' && valueField) val = parseVal(row, valueField);
            counts[key] = (counts[key] || 0) + val;
         });

         // Calculer les couleurs basées sur la configuration du widget
         const colorCount = Object.keys(counts).length;
         let colors = [];
         if (widget.config.colorMode === 'single') {
            colors = Array(Math.max(colorCount, 1)).fill(widget.config.singleColor || '#0066cc');
         } else if (widget.config.colorMode === 'gradient') {
            colors = generateGradient(
               widget.config.gradientStart || '#0066cc',
               widget.config.gradientEnd || '#e63946',
               Math.max(colorCount, 1)
            );
         } else {
            colors = getChartColors(Math.max(colorCount, 1), widget.config.colorPalette || 'default');
         }

         if (widget.config.chartType === 'radial') {
            const data = Object.entries(counts).map(([name, value], idx) => ({ name, value, fill: colors[idx % colors.length] })).sort((a, b) => b.value - a.value).slice(0, 5);
            return { data, unit: currentUnit, colors };
         }

         let data = Object.entries(counts).map(([name, value]) => ({ name, value, size: value }));
         data.sort((a, b) => b.value - a.value);
         if (limit) data = data.slice(0, limit);
         return { data, unit: currentUnit, colors };
      }

      else {
         let currentVal = 0;
         let prevVal = 0;
         const calc = (rows: any[]) => {
            if (!rows) return 0;
            if (metric === 'count') return rows.length;
            if (metric === 'sum' && valueField) return rows.reduce((acc: number, r: any) => acc + parseVal(r, valueField), 0);
            if (metric === 'avg' && valueField) return rows.reduce((acc: number, r: any) => acc + parseVal(r, valueField), 0) / (rows.length || 1);
            if (metric === 'distinct' && valueField) return new Set(rows.map((r: any) => r[valueField])).size;
            return 0;
         };
         currentVal = calc(workingRows);
         if (!secondarySource && prevBatch) prevVal = calc(prevBatch.rows);
         let progress = 0;
         if (target) progress = Math.min(100, (currentVal / target) * 100);
         return { current: currentVal, prev: prevVal, trend: (prevBatch && !secondarySource) ? ((currentVal - prevVal) / (prevVal || 1)) * 100 : 0, unit: currentUnit, progress, target };
      }
   }, [batches, datasets, widget.config, dashboardFilters, widget.type, globalDateRange]);
};

const WidgetDisplay: React.FC<{ widget: DashboardWidget, data: any }> = ({ widget, data }) => {
   const { setDashboardFilter } = useWidgets();
   if (!data) return <div className="flex items-center justify-center h-full text-txt-muted text-app-base">Chargement...</div>;
   if (data.error) return <div className="flex items-center justify-center h-full text-danger-text text-app-base text-center p-1">{data.error}</div>;

   if (widget.type === 'text') {
      const style = widget.config.textStyle || {};
      const alignment = style.align || 'left';
      const align = style.align || 'left';
      const size = style.size === 'large' ? 'text-lg' : style.size === 'xl' ? 'text-2xl' : 'text-app-base';
      const color = style.color === 'primary' ? 'text-brand-600' : style.color === 'muted' ? 'text-txt-muted' : 'text-txt-main';
      return <div className={`h-full w-full p-1.5 overflow-y-auto custom-scrollbar whitespace-pre-wrap ${size} ${color}`} style={{ textAlign: align }}>{widget.config.textContent || '...'}</div>;
   }

   // NOUVEAU : Gestion des widgets de graphiques TCD
   if (widget.config.pivotChart && widget.type === 'chart') {
      const { colors, data: chartData, unit, seriesName } = data;
      const { pivotChart } = widget.config;
      const chartType = pivotChart.chartType;

      if (!chartData || chartData.length === 0) {
         return <div className="flex items-center justify-center h-full text-txt-muted">Aucune donnée</div>;
      }

      // Récupérer les clés de données multiples (pour séries)
      const seriesKeys = chartData.length > 0 ? Object.keys(chartData[0]).filter(k => k !== 'name') : [];
      // Utiliser le nom de la série s'il y en a qu'une, sinon garder les clés
      const displaySeriesNames = seriesKeys.length === 1 && seriesName ? { [seriesKeys[0]]: seriesName } : {};
      const responsiveStyles = getResponsiveChartStyles(widget.height);

      try {
         // Charger la composante Recharts appropriée
         if (chartType === 'pie' || chartType === 'donut') {
            const pieDataKey = seriesKeys[0] || 'value';
            const pieName = displaySeriesNames[pieDataKey] || pieDataKey || 'Valeur';
            return (
               <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                     <Pie
                        data={chartData}
                        dataKey={pieDataKey}
                        nameKey="name"
                        name={pieName}
                        cx="50%"
                        cy="50%"
                        innerRadius={chartType === 'donut' ? '50%' : 0}
                        outerRadius="80%"
                        paddingAngle={1}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
                        isAnimationActive={false}
                     >
                        {chartData.map((entry: any, index: number) => (
                           <Cell
                              key={`cell-${index}`}
                              fill={colors[index % colors.length]}
                              stroke="#fff"
                              strokeWidth={2}
                           />
                        ))}
                     </Pie>
                     <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '11px' }} />
                     <Legend wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
               </ResponsiveContainer>
            );
         } else if (chartType === 'line') {
            const isMultiSeries = seriesKeys.length > 1;
            const dotRadius = Math.max(2, responsiveStyles.fontSize / 5);
            return (
               <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 15, right: 20, left: 10, bottom: responsiveStyles.marginBottom }}>
                     <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                     <XAxis
                        dataKey="name"
                        fontSize={responsiveStyles.fontSize}
                        stroke="#94a3b8"
                        angle={-45}
                        textAnchor="end"
                        height={Math.max(40, responsiveStyles.marginBottom - 10)}
                     />
                     <YAxis fontSize={responsiveStyles.fontSize} stroke="#94a3b8" />
                     <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: `${responsiveStyles.fontSize}px` }} />
                     {isMultiSeries ? (
                        <>
                           <Legend wrapperStyle={{ fontSize: `${responsiveStyles.fontSize}px` }} />
                           {seriesKeys.map((key, idx) => (
                              <Line
                                 key={key}
                                 type="monotone"
                                 dataKey={key}
                                 name={displaySeriesNames[key] || key}
                                 stroke={colors[idx % colors.length]}
                                 strokeWidth={Math.max(1, responsiveStyles.fontSize / 10)}
                                 dot={{ r: dotRadius }}
                                 activeDot={{ r: dotRadius + 2 }}
                                 isAnimationActive={false}
                              />
                           ))}
                        </>
                     ) : (
                        <Line
                           type="monotone"
                           dataKey={seriesKeys[0] || 'value'}
                           name={displaySeriesNames[seriesKeys[0]] || seriesKeys[0]}
                           stroke={colors[0]}
                           strokeWidth={Math.max(1, responsiveStyles.fontSize / 10)}
                           dot={{ r: dotRadius }}
                           activeDot={{ r: dotRadius + 2 }}
                           isAnimationActive={false}
                        />
                     )}
                  </LineChart>
               </ResponsiveContainer>
            );
         } else if (chartType === 'area' || chartType === 'stacked-area') {
            const isMultiSeries = seriesKeys.length > 1;
            const isStacked = chartType === 'stacked-area';
            return (
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 15, right: 20, left: 10, bottom: responsiveStyles.marginBottom }}>
                     <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                     <XAxis
                        dataKey="name"
                        fontSize={responsiveStyles.fontSize}
                        stroke="#94a3b8"
                        angle={-45}
                        textAnchor="end"
                        height={Math.max(40, responsiveStyles.marginBottom - 10)}
                     />
                     <YAxis fontSize={responsiveStyles.fontSize} stroke="#94a3b8" />
                     <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: `${responsiveStyles.fontSize}px` }} />
                     {(isMultiSeries || isStacked) && <Legend wrapperStyle={{ fontSize: `${responsiveStyles.fontSize}px` }} />}
                     {isMultiSeries || isStacked ? (
                        seriesKeys.map((key, idx) => (
                           <Area
                              key={key}
                              type="monotone"
                              dataKey={key}
                              name={displaySeriesNames[key] || key}
                              fill={colors[idx % colors.length]}
                              stroke={colors[idx % colors.length]}
                              fillOpacity={0.6}
                              stackId={isStacked ? 'stack' : undefined}
                              isAnimationActive={false}
                           />
                        ))
                     ) : (
                        <Area
                           type="monotone"
                           dataKey={seriesKeys[0] || 'value'}
                           name={displaySeriesNames[seriesKeys[0]] || seriesKeys[0]}
                           fill={colors[0]}
                           stroke={colors[0]}
                           fillOpacity={0.6}
                           isAnimationActive={false}
                        />
                     )}
                  </AreaChart>
               </ResponsiveContainer>
            );
         } else if (chartType === 'bar' || chartType === 'column' || chartType === 'stacked-bar') {
            const isBar = chartType === 'bar';
            const isMultiSeries = seriesKeys.length > 1;
            const isStacked = chartType === 'stacked-bar';

            return (
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout={isBar ? 'vertical' : 'horizontal'} margin={{ top: 15, right: 20, left: 10, bottom: isBar ? 5 : responsiveStyles.marginBottom }}>
                     <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                     <XAxis
                        type={isBar ? 'number' : 'category'}
                        dataKey={isBar ? undefined : 'name'}
                        fontSize={responsiveStyles.fontSize}
                        stroke="#94a3b8"
                        angle={isBar ? 0 : -45}
                        textAnchor={isBar ? 'middle' : 'end'}
                        height={isBar ? 30 : Math.max(40, responsiveStyles.marginBottom - 10)}
                     />
                     <YAxis
                        type={isBar ? 'category' : 'number'}
                        dataKey={isBar ? 'name' : undefined}
                        fontSize={responsiveStyles.fontSize}
                        stroke="#94a3b8"
                     />
                     <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: `${responsiveStyles.fontSize}px` }} />
                     {(isMultiSeries || isStacked) && <Legend wrapperStyle={{ fontSize: `${responsiveStyles.fontSize}px` }} />}
                     {isMultiSeries || isStacked ? (
                        seriesKeys.map((key, idx) => (
                           <Bar
                              key={key}
                              dataKey={key}
                              name={displaySeriesNames[key] || key}
                              fill={colors[idx % colors.length]}
                              stackId={isStacked ? 'stack' : undefined}
                              radius={isBar ? [0, 4, 4, 0] : [4, 4, 0, 0]}
                              isAnimationActive={false}
                           />
                        ))
                     ) : (
                        <Bar
                           dataKey={seriesKeys[0] || 'value'}
                           name={displaySeriesNames[seriesKeys[0]] || seriesKeys[0]}
                           fill={colors[0]}
                           radius={isBar ? [0, 4, 4, 0] : [4, 4, 0, 0]}
                           isAnimationActive={false}
                        >
                           {chartData.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                           ))}
                        </Bar>
                     )}
                  </BarChart>
               </ResponsiveContainer>
            );
         } else if (chartType === 'radar') {
            const radarDataKey = seriesKeys[0] || 'value';
            const radarName = displaySeriesNames[radarDataKey] || radarDataKey || 'Valeur';
            return (
               <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={chartData} margin={{ top: 10, right: 30, left: 30, bottom: 10 }}>
                     <PolarGrid stroke="#f1f5f9" />
                     <PolarAngleAxis dataKey="name" fontSize={responsiveStyles.fontSize} stroke="#94a3b8" />
                     <PolarRadiusAxis fontSize={responsiveStyles.fontSize} stroke="#94a3b8" />
                     <Radar
                        name={radarName}
                        dataKey={radarDataKey}
                        stroke={colors[0]}
                        fill={colors[0]}
                        fillOpacity={0.5}
                        strokeWidth={Math.max(1, responsiveStyles.fontSize / 10)}
                        isAnimationActive={false}
                     />
                     <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: `${responsiveStyles.fontSize}px` }} />
                     <Legend wrapperStyle={{ fontSize: `${responsiveStyles.fontSize}px` }} />
                  </RadarChart>
               </ResponsiveContainer>
            );
         } else if (chartType === 'treemap') {
            return (
               <ResponsiveContainer width="100%" height="100%">
                  <Treemap
                     data={chartData}
                     dataKey="value"
                     aspectRatio={4 / 3}
                     stroke="#fff"
                     fill={colors[0]}
                     isAnimationActive={false}
                  >
                     {chartData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                     ))}
                     <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: `${responsiveStyles.fontSize}px` }} />
                  </Treemap>
               </ResponsiveContainer>
            );
         }

         // Défaut : Bar Chart (Column)
         const isMultiSeriesDefault = seriesKeys.length > 1;
         return (
            <ResponsiveContainer width="100%" height="100%">
               <BarChart data={chartData} margin={{ top: 15, right: 20, left: 10, bottom: responsiveStyles.marginBottom }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                     dataKey="name"
                     fontSize={responsiveStyles.fontSize}
                     stroke="#94a3b8"
                     angle={-45}
                     textAnchor="end"
                     height={Math.max(40, responsiveStyles.marginBottom - 10)}
                  />
                  <YAxis fontSize={responsiveStyles.fontSize} stroke="#94a3b8" />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: `${responsiveStyles.fontSize}px` }} />
                  {isMultiSeriesDefault && <Legend wrapperStyle={{ fontSize: `${responsiveStyles.fontSize}px` }} />}
                  {isMultiSeriesDefault ? (
                     seriesKeys.map((key, idx) => (
                        <Bar
                           key={key}
                           dataKey={key}
                           name={displaySeriesNames[key] || key}
                           fill={colors[idx % colors.length]}
                           radius={[4, 4, 0, 0]}
                           isAnimationActive={false}
                        />
                     ))
                  ) : (
                     <Bar
                        dataKey={seriesKeys[0] || 'value'}
                        name={displaySeriesNames[seriesKeys[0]] || seriesKeys[0]}
                        fill={colors[0]}
                        radius={[4, 4, 0, 0]}
                        isAnimationActive={false}
                     >
                        {chartData.map((entry: any, index: number) => (
                           <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                        ))}
                     </Bar>
                  )}
               </BarChart>
            </ResponsiveContainer>
         );
      } catch (error) {
         console.error('Erreur rendu graphique TCD:', error);
         return <div className="flex items-center justify-center h-full text-danger-text">Erreur de rendu</div>;
      }
   }

   const { unit } = data;
   const handleChartClick = (e: any) => {
      if (!e || !e.activePayload || !e.activePayload.length) return;
      if (widget.config.dimension && e.activePayload[0].payload.name) setDashboardFilter(widget.config.dimension, e.activePayload[0].payload.name);
   };

   if (widget.type === 'kpi') {
      const { current, trend, progress, target } = data;
      const isPositive = trend >= 0;
      const style = widget.config.kpiStyle || 'simple';
      const showTrend = widget.config.showTrend && !widget.config.secondarySource;

      return (
         <div className="flex flex-col h-full justify-center">
            <div className="flex items-end gap-1.5 mb-1.5">
               <span className="text-2xl font-bold text-txt-main">{current.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
               <span className="text-app-base text-txt-muted mb-1 font-medium">{unit}</span>
            </div>
            {style === 'progress' && target ? (
               <div className="w-full space-y-1">
                  <div className="flex justify-between text-app-base text-txt-muted">
                     <span>Objectif</span>
                     <span>{Math.round(progress)}% / {target.toLocaleString()}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                     <div className={`h-full rounded-full transition-all duration-500 ${progress >= 100 ? 'bg-success-text' : 'bg-brand-600'}`} style={{ width: `${progress}%` }} />
                  </div>
               </div>
            ) : (style === 'trend' || showTrend) && (
               <div className={`flex items-center text-app-base font-medium ${isPositive ? 'text-success-text' : 'text-danger-text'}`}>
                  {isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingUp className="w-3 h-3 mr-1 transform rotate-180" />}
                  {Math.abs(trend).toFixed(1)}% vs préc.
               </div>
            )}
            {widget.config.secondarySource && <div className="text-xs text-txt-muted flex items-center gap-1 mt-1"><LinkIcon className="w-3 h-3" /> Données croisées</div>}
         </div>
      );
   }

   if (widget.type === 'list') {
      const { current, max } = data;
      const chartColors = data.colors || COLORS;
      const barColor = chartColors[0];
      return (
         <div className="h-full overflow-y-auto custom-scrollbar pr-2 space-y-3">
            {current.map((item: any, idx: number) => (
               <div key={idx} className="flex flex-col gap-0.5 cursor-pointer group" onClick={() => widget.config.dimension && setDashboardFilter(widget.config.dimension, item.name)}>
                  <div className="flex justify-between text-xs group-hover:text-brand-600 transition-colors">
                     <span className="font-bold text-txt-main truncate pr-2">{idx + 1}. {item.name}</span>
                     <span className="text-txt-secondary font-mono">{item.value.toLocaleString()} {unit}</span>
                  </div>
                  <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                     <div className="h-full rounded-full opacity-80" style={{ backgroundColor: barColor, width: `${(item.value / max) * 100}%` }} />
                  </div>
               </div>
            ))}
         </div>
      );
   }

   const chartData = data.data || [];
   const { chartType } = widget.config;
   const tooltipFormatter = (val: any) => [`${val.toLocaleString()} ${unit || ''}`, 'Valeur'];
   const tooltipStyle = { backgroundColor: '#ffffff', color: '#1e293b', borderRadius: '6px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' };
   const responsiveStyles = getResponsiveChartStyles(widget.height);

   if (chartType === 'radial') {
      const chartColors = data.colors || COLORS;
      return (
         <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart cx="50%" cy="50%" innerRadius="10%" outerRadius="100%" barSize={Math.max(5, responsiveStyles.fontSize - 1)} data={chartData}>
               <RadialBar background dataKey="value" cornerRadius={10} onClick={handleChartClick} className="cursor-pointer">
                  {chartData.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />)}
               </RadialBar>
               <Legend iconSize={responsiveStyles.fontSize - 1} layout="vertical" verticalAlign="middle" wrapperStyle={{ fontSize: `${responsiveStyles.fontSize}px` }} align="right" />
               <Tooltip formatter={tooltipFormatter} cursor={{ fill: '#f8fafc' }} contentStyle={tooltipStyle} />
            </RadialBarChart>
         </ResponsiveContainer>
      );
   }

   const chartColors = data.colors || COLORS;
   return (
      <ResponsiveContainer width="100%" height="100%">
         <BarChart data={chartData} onClick={handleChartClick} margin={{ top: 15, right: 20, left: 10, bottom: responsiveStyles.marginBottom }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="name" fontSize={responsiveStyles.fontSize} stroke="#94a3b8" angle={-45} textAnchor="end" height={Math.max(40, responsiveStyles.marginBottom - 10)} />
            <YAxis fontSize={responsiveStyles.fontSize} stroke="#94a3b8" />
            <Tooltip formatter={tooltipFormatter} cursor={{ fill: '#f8fafc' }} contentStyle={tooltipStyle} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} className="cursor-pointer">
               {chartData.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />)}
            </Bar>
         </BarChart>
      </ResponsiveContainer>
   );
};

// --- NEW WIDGET ITEM COMPONENT FOR SAFE HOOK CALLING ---
interface WidgetItemProps {
   widget: DashboardWidget;
   index: number;
   isEditMode: boolean;
   globalDateRange: { start: string; end: string };
   openMenuWidgetId: string | null;
   setOpenMenuWidgetId: (id: string | null) => void;
   setFullscreenWidgetId: (id: string | null) => void;
   handleExportImage: (id: string, title: string) => void;
   handleExportCSV: (data: any, title: string) => void;
   handleDragStart: (e: React.DragEvent, index: number) => void;
   handleDragOver: (e: React.DragEvent) => void;
   handleDrop: (e: React.DragEvent, targetIndex: number) => void;
   updateDashboardWidget: (id: string, updates: Partial<DashboardWidget>) => void;
   duplicateDashboardWidget: (id: string) => void;
   openEditWidget: (w: DashboardWidget) => void;
   removeDashboardWidget: (id: string) => void;
}

const WidgetItem: React.FC<WidgetItemProps> = ({
   widget, index, isEditMode, globalDateRange,
   openMenuWidgetId, setOpenMenuWidgetId, setFullscreenWidgetId,
   handleExportImage, handleExportCSV,
   handleDragStart, handleDragOver, handleDrop,
   updateDashboardWidget, duplicateDashboardWidget, openEditWidget, removeDashboardWidget
}) => {
   const widgetData = useWidgetData(widget, globalDateRange);

   const colSpan = widget.size === 'full' ? 'md:col-span-2 lg:col-span-4' : widget.size === 'lg' ? 'md:col-span-2 lg:col-span-3' : widget.size === 'md' ? 'md:col-span-2' : 'col-span-1';
   const heightClass = widget.height === 'sm' ? 'h-32' : widget.height === 'lg' ? 'h-96' : widget.height === 'xl' ? 'h-[500px]' : 'h-64';
   const isText = widget.type === 'text';
   const bgColor = isText && widget.config.textStyle?.color === 'primary' ? 'bg-brand-50 border-brand-200' : 'bg-surface';
   const borderClass = widget.style?.borderColor || 'border-border-default';
   const widthClass = widget.style?.borderWidth === '0' ? 'border-0' : widget.style?.borderWidth === '2' ? 'border-2' : widget.style?.borderWidth === '4' ? 'border-4' : 'border';

   return (
      <div
         key={widget.id}
         className={`${colSpan}`}
         draggable={isEditMode}
         onDragStart={(e) => handleDragStart(e, index)}
         onDragOver={handleDragOver}
         onDrop={(e) => handleDrop(e, index)}
      >
         <div id={`widget-container-${widget.id}`} className={`${bgColor} rounded-lg ${widthClass} ${borderClass} ${isEditMode ? 'ring-2 ring-brand-100 border-brand-300 cursor-move' : ''} shadow-card p-4 flex flex-col ${heightClass} relative group transition-all`}>

            {!isEditMode && (
               <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="relative">
                     <button onClick={() => setOpenMenuWidgetId(openMenuWidgetId === widget.id ? null : widget.id)} className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600">
                        <MoreVertical className="w-4 h-4" />
                     </button>
                     {openMenuWidgetId === widget.id && (
                        <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20 animate-in fade-in zoom-in-95 duration-100">
                           <button onClick={() => setFullscreenWidgetId(widget.id)} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2 text-slate-700">
                              <Maximize2 className="w-3 h-3" /> Agrandir
                           </button>
                           <div className="border-t border-slate-100 my-1"></div>
                           <button onClick={() => handleExportImage(widget.id, widget.title)} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2 text-slate-700">
                              <ImageIcon className="w-3 h-3" /> Image (.png)
                           </button>
                           <button onClick={() => handleExportCSV(widgetData, widget.title)} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2 text-slate-700">
                              <FileText className="w-3 h-3" /> Données (.csv)
                           </button>
                        </div>
                     )}
                  </div>
               </div>
            )}

            {isEditMode && (
               <div className="absolute top-2 left-1/2 transform -translate-x-1/2 p-1 bg-slate-100/80 rounded-full text-slate-400 opacity-50 group-hover:opacity-100">
                  <GripHorizontal className="w-4 h-4" />
               </div>
            )}

            {isEditMode && (
               <div className="absolute top-2 right-2 flex gap-1 bg-surface/90 p-1 rounded shadow-sm z-10 border border-border-default opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex gap-0.5 mr-2">
                     <button onClick={() => updateDashboardWidget(widget.id, { size: widget.size === 'full' ? 'sm' : widget.size === 'lg' ? 'full' : widget.size === 'md' ? 'lg' : 'md' })} className="p-1 hover:bg-slate-100 rounded text-slate-500" title="Changer largeur"><Move className="w-3 h-3" /></button>
                  </div>
                  <div className="w-px bg-border-default mx-0.5"></div>
                  <button onClick={() => duplicateDashboardWidget(widget.id)} className="p-1 hover:bg-brand-50 rounded text-brand-600"><Copy className="w-3 h-3" /></button>
                  <button onClick={() => openEditWidget(widget)} className="p-1 hover:bg-brand-50 rounded text-brand-600"><Settings className="w-3 h-3" /></button>
                  <button onClick={() => removeDashboardWidget(widget.id)} className="p-1 hover:bg-danger-bg rounded text-danger-text"><Trash2 className="w-3 h-3" /></button>
               </div>
            )}
            <h3 className="text-app-base font-bold text-txt-secondary mb-1.5 uppercase tracking-wider truncate" title={widget.title}>{widget.title}</h3>
            <div className="flex-1 min-h-0 pointer-events-none md:pointer-events-auto">
               <WidgetDisplay widget={widget} data={widgetData} />
            </div>
         </div>
      </div>
   );
};

const LivePreview: React.FC<{ widget: DashboardWidget, globalDateRange: any }> = ({ widget, globalDateRange }) => {
   const data = useWidgetData(widget, globalDateRange);
   const isText = widget.type === 'text';
   const bgColor = isText && widget.config.textStyle?.color === 'primary' ? 'bg-brand-50 border-brand-200' : 'bg-surface';
   const borderClass = widget.style?.borderColor || 'border-border-default';
   const widthVal = widget.style?.borderWidth || '1';
   const widthClass = widthVal === '0' ? 'border-0' : widthVal === '2' ? 'border-2' : widthVal === '4' ? 'border-4' : 'border';

   return (
      <div className={`w-full h-full rounded-lg ${borderClass} ${widthClass} shadow-sm p-4 flex flex-col ${bgColor} relative`}>
         <h3 className="text-xs font-bold text-txt-secondary mb-2 uppercase tracking-wider truncate">{widget.title || 'Titre du widget'}</h3>
         <div className="flex-1 min-h-0 relative"><WidgetDisplay widget={widget} data={data} /></div>
      </div>
   );
};

export const Dashboard: React.FC = () => {
   const { dashboardWidgets, addDashboardWidget, removeDashboardWidget, duplicateDashboardWidget, updateDashboardWidget, reorderDashboardWidgets, dashboardFilters, clearDashboardFilters, setDashboardFilter } = useWidgets();
   const { datasets, currentDatasetId, switchDataset } = useDatasets();
   const [isEditMode, setIsEditMode] = useState(false);
   const [editingWidgetId, setEditingWidgetId] = useState<string | null>(null);
   const [showWidgetDrawer, setShowWidgetDrawer] = useState(false);
   const [tempWidget, setTempWidget] = useState<Partial<DashboardWidget>>({ type: 'kpi', size: 'sm', height: 'md', style: { borderColor: 'border-slate-200', borderWidth: '1' }, config: { metric: 'count' } });
   const navigate = useNavigate();

   // D&D State
   const [draggedWidgetIndex, setDraggedWidgetIndex] = useState<number | null>(null);

   // GLOBAL DATE FILTERS
   const [globalDateRange, setGlobalDateRange] = useState<{ start: string, end: string }>({ start: '', end: '' });

   // WIDGET MENUS STATE
   const [openMenuWidgetId, setOpenMenuWidgetId] = useState<string | null>(null);
   const [fullscreenWidgetId, setFullscreenWidgetId] = useState<string | null>(null);

   const handleSaveWidget = () => {
      if (!tempWidget.title) return;
      if (tempWidget.type !== 'text' && !tempWidget.config?.source?.datasetId) return;
      if (editingWidgetId) updateDashboardWidget(editingWidgetId, tempWidget);
      else addDashboardWidget(tempWidget as any);
      setShowWidgetDrawer(false);
      setEditingWidgetId(null);
      setTempWidget({ type: 'kpi', size: 'sm', height: 'md', style: { borderColor: 'border-slate-200', borderWidth: '1' }, config: { metric: 'count' } });
   };

   const openNewWidget = () => {
      setEditingWidgetId(null);
      setTempWidget({ title: '', type: 'kpi', size: 'sm', height: 'md', style: { borderColor: 'border-slate-200', borderWidth: '1' }, config: { metric: 'count', source: datasets.length > 0 ? { datasetId: datasets[0].id, mode: 'latest' } : undefined } });
      setShowWidgetDrawer(true);
   };

   const openEditWidget = (w: DashboardWidget) => {
      setEditingWidgetId(w.id);
      // Initialiser les valeurs de couleur par défaut pour les widgets pivotChart s'ils n'existent pas
      let updatedWidget = { ...w, style: w.style || { borderColor: 'border-slate-200', borderWidth: '1' } };
      if (updatedWidget.config?.pivotChart) {
         updatedWidget.config.pivotChart = {
            ...updatedWidget.config.pivotChart,
            colorMode: updatedWidget.config.pivotChart.colorMode || 'multi',
            colorPalette: updatedWidget.config.pivotChart.colorPalette || 'vibrant',
            singleColor: updatedWidget.config.pivotChart.singleColor || '#0066cc',
            gradientStart: updatedWidget.config.pivotChart.gradientStart || '#0066cc',
            gradientEnd: updatedWidget.config.pivotChart.gradientEnd || '#e63946'
         };
      }
      setTempWidget(updatedWidget);
      setShowWidgetDrawer(true);
   };

   // EXPORT HANDLERS
   const handleExportImage = async (widgetId: string, title: string) => {
      setOpenMenuWidgetId(null);
      const element = document.getElementById(`widget-container-${widgetId}`);
      if (!element) return;
      try {
         const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff', logging: false });
         const url = canvas.toDataURL('image/png');
         const link = document.createElement('a');
         link.download = `widget_${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;
         link.href = url;
         link.click();
      } catch (e) {
         console.error("Export image failed", e);
      }
   };

   const handleExportCSV = (data: any, title: string) => {
      setOpenMenuWidgetId(null);
      if (!data) return;
      let csvContent = "";

      if (data.current && Array.isArray(data.current)) {
         // List Type
         csvContent = "Label;Valeur\n" + data.current.map((i: any) => `${i.name};${i.value}`).join("\n");
      } else if (data.data && Array.isArray(data.data)) {
         // Chart Type
         csvContent = "Label;Valeur\n" + data.data.map((i: any) => `${i.name};${i.value}`).join("\n");
      } else if (data.current !== undefined) {
         // KPI Type
         csvContent = `Indicateur;Valeur;Variation\n${title};${data.current};${data.trend || 0}%`;
      }

      if (csvContent) {
         const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
         const url = URL.createObjectURL(blob);
         const link = document.createElement('a');
         link.href = url;
         link.download = `widget_data_${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.csv`;
         document.body.appendChild(link);
         link.click();
         setTimeout(() => document.body.removeChild(link), 100);
      }
   };

   const handlePresentationMode = () => {
      const elem = document.documentElement;
      if (!document.fullscreenElement) {
         elem.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable fullscreen mode: ${err.message} (${err.name})`);
         });
      } else {
         document.exitFullscreen();
      }
   };

   // Drag Handlers
   const handleDragStart = (e: React.DragEvent, index: number) => {
      setDraggedWidgetIndex(index);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(index));
   };

   const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
   };

   const handleDrop = (e: React.DragEvent, targetIndex: number) => {
      e.preventDefault();
      if (draggedWidgetIndex === null) return;
      reorderDashboardWidgets(draggedWidgetIndex, targetIndex);
      setDraggedWidgetIndex(null);
   };

   const availableFields = useMemo(() => {
      if (!tempWidget.config?.source?.datasetId) return [];
      return datasets.find(d => d.id === tempWidget.config?.source?.datasetId)?.fields || [];
   }, [tempWidget.config?.source?.datasetId, datasets]);

   const secondaryFields = useMemo(() => {
      if (!tempWidget.config?.secondarySource?.datasetId) return [];
      return datasets.find(d => d.id === tempWidget.config?.secondarySource?.datasetId)?.fields || [];
   }, [tempWidget.config?.secondarySource?.datasetId, datasets]);

   const allFields = useMemo(() => [...availableFields, ...secondaryFields], [availableFields, secondaryFields]);

   return (
      <div className="h-full overflow-y-auto p-4 md:p-8 custom-scrollbar relative bg-canvas">
         {fullscreenWidgetId && (
            <div className="fixed inset-0 z-50 bg-white p-8 flex flex-col animate-in zoom-in-95 duration-200">
               <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-slate-800">
                     {dashboardWidgets.find(w => w.id === fullscreenWidgetId)?.title}
                  </h2>
                  <button onClick={() => setFullscreenWidgetId(null)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors">
                     <X className="w-6 h-6 text-slate-600" />
                  </button>
               </div>
               <div className="flex-1 bg-slate-50 rounded-xl border border-slate-200 p-6 shadow-inner">
                  {(() => {
                     const w = dashboardWidgets.find(w => w.id === fullscreenWidgetId);
                     if (w) return <WidgetDisplay widget={w} data={useWidgetData(w, globalDateRange)} />
                     return null;
                  })()}
               </div>
            </div>
         )}

         <div className="max-w-7xl mx-auto space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
               <div>
                  <Heading level={2} className="flex items-center gap-2">
                     <Layout className="w-6 h-6 text-txt-muted" /> Tableau de bord
                  </Heading>
                  <Text variant="muted">Vue d'ensemble de vos données</Text>
               </div>

               {/* GLOBAL DATASET SELECTOR IN HEADER */}
               <div className="relative">
                  <select
                     id="tour-dataset-selector"
                     className="w-full md:w-56 appearance-none bg-white border border-slate-300 text-slate-700 text-app-base rounded-md py-1.5 pl-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
                     value={currentDatasetId || ''}
                     onChange={(e) => {
                        if (e.target.value === '__NEW__') navigate('/import');
                        else switchDataset(e.target.value);
                     }}
                  >
                     {datasets.length === 0 && <option value="">Aucun tableau</option>}
                     {datasets.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                     ))}
                     <option disabled>──────────</option>
                     <option value="__NEW__">+ Nouvelle typologie...</option>
                  </select>
               </div>

               <div className="flex gap-2">
                  <Button variant="ghost" onClick={handlePresentationMode} icon={<Maximize2 className="w-4 h-4" />}>Plein Écran</Button>
                  {isEditMode ? (
                     <>
                        <Button variant="secondary" onClick={openNewWidget} icon={<Plus className="w-4 h-4" />}>Ajouter</Button>
                        <Button onClick={() => setIsEditMode(false)} icon={<Check className="w-4 h-4" />}>Terminer</Button>
                     </>
                  ) : (
                     <Button variant="outline" onClick={() => setIsEditMode(true)} icon={<Edit3 className="w-4 h-4" />}>Personnaliser</Button>
                  )}
               </div>
            </div>

            {/* GLOBAL CONTROLS & FILTERS */}
            <div className="flex flex-col lg:flex-row gap-4 bg-white p-3 rounded-lg border border-slate-200 shadow-sm items-start lg:items-center">

               {/* DATE RANGE PICKER (GLOBAL) */}
               <div className="flex items-center gap-2 border-r border-slate-100 pr-4 mr-2">
                  <div className="bg-blue-50 p-2 rounded text-blue-600">
                     <CalendarRange className="w-4 h-4" />
                  </div>
                  <div className="flex items-center gap-2">
                     <div className="flex flex-col">
                        <label className="text-sm font-bold text-slate-400 uppercase">Début</label>
                        <input
                           type="date"
                           className="text-app-base border border-slate-200 rounded p-1 text-slate-700 bg-white focus:ring-blue-500 focus:border-blue-500"
                           value={globalDateRange.start}
                           onChange={(e) => setGlobalDateRange({ ...globalDateRange, start: e.target.value })}
                        />
                     </div>
                     <span className="text-slate-300 mt-3">-</span>
                     <div className="flex flex-col">
                        <label className="text-sm font-bold text-slate-400 uppercase">Fin</label>
                        <input
                           type="date"
                           className="text-app-base border border-slate-200 rounded p-1 text-slate-700 bg-white focus:ring-blue-500 focus:border-blue-500"
                           value={globalDateRange.end}
                           onChange={(e) => setGlobalDateRange({ ...globalDateRange, end: e.target.value })}
                        />
                     </div>
                     {(globalDateRange.start || globalDateRange.end) && (
                        <button
                           onClick={() => setGlobalDateRange({ start: '', end: '' })}
                           className="mt-3 p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-red-500 transition-colors"
                           title="Effacer la période"
                        >
                           <X className="w-4 h-4" />
                        </button>
                     )}
                  </div>
               </div>

               {/* DRILL DOWN FILTERS */}
               {Object.keys(dashboardFilters).length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2 flex-1">
                     <div className="text-xs font-bold text-brand-700 flex items-center mr-2">
                        <Filter className="w-3 h-3 mr-1" /> Filtres actifs :
                     </div>
                     {Object.entries(dashboardFilters).map(([field, value]) => (
                        <Badge key={field} variant="brand" className="bg-blue-50 border-blue-200 shadow-sm pl-2 pr-1 py-1 flex items-center gap-1">
                           <span className="text-blue-400">{field}:</span>
                           <span className="font-bold text-blue-900">{String(value)}</span>
                           <button onClick={() => setDashboardFilter(field, null)} className="ml-1 hover:bg-blue-100 rounded-full p-0.5"><X className="w-3 h-3" /></button>
                        </Badge>
                     ))}
                     <button onClick={clearDashboardFilters} className="ml-auto text-xs text-slate-400 hover:text-red-600 font-medium flex items-center px-2 py-1 hover:bg-red-50 rounded transition-colors">
                        <FilterX className="w-3 h-3 mr-1" /> Tout effacer
                     </button>
                  </div>
               ) : (
                  <div className="text-xs text-slate-400 italic flex items-center gap-1.5">
                     <MousePointerClick className="w-3 h-3" /> Cliquez sur un graphique pour filtrer le tableau de bord
                  </div>
               )}
            </div>

            {/* Grid */}
            {dashboardWidgets.length === 0 ? (
               <div className="text-center py-20 border-2 border-dashed border-border-default rounded-xl bg-surface">
                  <Activity className="w-12 h-12 text-txt-muted mx-auto mb-3" />
                  <Text className="mb-4">Votre tableau de bord est vide.</Text>
                  <Button onClick={() => { setIsEditMode(true); openNewWidget(); }}>Créer mon premier widget</Button>
               </div>
            ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {dashboardWidgets.map((widget, index) => (
                     <WidgetItem
                        key={widget.id}
                        widget={widget}
                        index={index}
                        isEditMode={isEditMode}
                        globalDateRange={globalDateRange}
                        openMenuWidgetId={openMenuWidgetId}
                        setOpenMenuWidgetId={setOpenMenuWidgetId}
                        setFullscreenWidgetId={setFullscreenWidgetId}
                        handleExportImage={handleExportImage}
                        handleExportCSV={handleExportCSV}
                        handleDragStart={handleDragStart}
                        handleDragOver={handleDragOver}
                        handleDrop={handleDrop}
                        updateDashboardWidget={updateDashboardWidget}
                        duplicateDashboardWidget={duplicateDashboardWidget}
                        openEditWidget={openEditWidget}
                        removeDashboardWidget={removeDashboardWidget}
                     />
                  ))}
               </div>
            )}
         </div>

         {/* DRAWER CONFIGURATION */}
         {showWidgetDrawer && (
            <div className="fixed inset-0 z-50 flex bg-canvas animate-in fade-in duration-200">
               <div className="flex-1 bg-slate-100 flex flex-col overflow-hidden relative border-r border-border-default">
                  <div className="absolute top-4 left-4 bg-surface/80 backdrop-blur rounded-full px-3 py-1.5 text-xs font-bold text-txt-secondary shadow-sm border border-border-default flex items-center gap-2 z-10">
                     <Eye className="w-3 h-3 text-brand-600" /> Aperçu temps réel
                  </div>
                  <div className="flex-1 overflow-auto flex items-center justify-center p-8">
                     <div className={`w-full transition-all duration-300 ${tempWidget.size === 'full' ? 'max-w-full' : 'max-w-[500px]'}`} style={{ height: tempWidget.height === 'xl' ? '500px' : '256px' }}>
                        <LivePreview widget={tempWidget as DashboardWidget} globalDateRange={globalDateRange} />
                     </div>
                  </div>
               </div>

               <div className="w-[500px] bg-surface shadow-2xl flex flex-col border-l border-border-default animate-in slide-in-from-right duration-300">
                  <div className="p-6 border-b border-border-default flex justify-between items-center bg-slate-50/50">
                     <div>
                        <Heading level={3}>{editingWidgetId ? 'Modifier le widget' : 'Nouveau widget'}</Heading>
                        <Text size="xs" variant="muted">Configuration de l'affichage</Text>
                     </div>
                     <button onClick={() => setShowWidgetDrawer(false)} className="text-txt-muted hover:text-txt-main"><X className="w-6 h-6" /></button>
                  </div>

                  <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-8">
                     <div>
                        <Label>Type de visualisation</Label>
                        <div className="grid grid-cols-4 gap-3">
                           {[{ id: 'kpi', label: 'Indicateur', icon: Activity }, { id: 'chart', label: 'Graphique', icon: BarChart3 }, { id: 'list', label: 'Classement', icon: ListOrdered }, { id: 'text', label: 'Texte', icon: Type }].map(t => {
                              const Icon = t.icon;
                              const isSelected = tempWidget.type === t.id;
                              return (
                                 <button key={t.id} onClick={() => setTempWidget({ ...tempWidget, type: t.id as WidgetType })} className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${isSelected ? 'bg-brand-50 text-brand-700 border-brand-600' : 'bg-surface text-txt-secondary border-border-default hover:bg-slate-50'}`}>
                                    <Icon className="w-6 h-6" /><span className="font-bold text-xs">{t.label}</span>
                                 </button>
                              )
                           })}
                        </div>
                     </div>

                     <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div className={tempWidget.type === 'text' ? 'col-span-2' : ''}>
                              <Label>Titre</Label>
                              <Input value={tempWidget.title || ''} onChange={e => setTempWidget({ ...tempWidget, title: e.target.value })} placeholder="Ex: Budget vs Charge" />
                           </div>
                           {tempWidget.type !== 'text' && (
                              <>
                                 <div>
                                    <Label>Largeur</Label>
                                    <Select value={tempWidget.size || 'sm'} onChange={e => setTempWidget({ ...tempWidget, size: e.target.value as WidgetSize })}>
                                       <option value="sm">Petit (1/4)</option>
                                       <option value="md">Moyen (2/4)</option>
                                       <option value="lg">Grand (3/4)</option>
                                       <option value="full">Large (4/4)</option>
                                    </Select>
                                 </div>
                                 <div>
                                    <Label>Hauteur</Label>
                                    <Select value={tempWidget.height || 'md'} onChange={e => setTempWidget({ ...tempWidget, height: e.target.value as WidgetHeight })}>
                                       <option value="sm">Petite</option>
                                       <option value="md">Moyenne</option>
                                       <option value="lg">Grande</option>
                                       <option value="xl">Très grande</option>
                                    </Select>
                                 </div>
                              </>
                           )}
                        </div>
                        {tempWidget.type !== 'text' && (
                           <div>
                              <Label>Source de données</Label>
                              <Select value={tempWidget.config?.source?.datasetId || ''} onChange={e => setTempWidget({ ...tempWidget, config: { ...tempWidget.config!, source: { datasetId: e.target.value, mode: 'latest' } } })}>
                                 {datasets.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                              </Select>
                           </div>
                        )}
                     </div>

                     {/* APPEARANCE SECTION */}
                     <div className="bg-slate-50 p-4 rounded-lg border border-border-default space-y-3">
                        <div className="flex items-center gap-2 text-sm font-bold text-txt-main">
                           <PaintBucket className="w-4 h-4 text-brand-600" /> Apparence du conteneur
                        </div>
                        <div className="space-y-3">
                           <div>
                              <Label>Couleur de bordure</Label>
                              <div className="flex flex-wrap gap-2">
                                 {BORDER_COLORS.map(c => (
                                    <button key={c.class} onClick={() => setTempWidget({ ...tempWidget, style: { ...tempWidget.style, borderColor: c.class } })} className={`w-8 h-8 rounded-full border-2 ${c.bg} transition-transform hover:scale-110 ${(tempWidget.style?.borderColor || 'border-slate-200') === c.class ? 'ring-2 ring-offset-2 ring-brand-500 scale-110' : 'border-transparent'}`} title={c.label} />
                                 ))}
                              </div>
                           </div>
                        </div>
                     </div>

                     {/* WIDGET SPECIFIC CONFIGS (METRIC, CHART TYPE, ETC) - Simplified for brevity but functional */}
                     {tempWidget.type !== 'text' && (
                        <div className="space-y-6">
                           <div className="grid grid-cols-2 gap-4">
                              <div>
                                 <Label>Métrique</Label>
                                 <Select value={tempWidget.config?.metric} onChange={e => setTempWidget({ ...tempWidget, config: { ...tempWidget.config!, metric: e.target.value as any } })}>
                                    <option value="count">Compte</option>
                                    <option value="sum">Somme</option>
                                    <option value="avg">Moyenne</option>
                                    <option value="distinct">Compte distinct</option>
                                 </Select>
                              </div>
                              {['sum', 'avg', 'distinct'].includes(tempWidget.config?.metric || '') && (
                                 <div>
                                    <Label>Champ valeur</Label>
                                    <Select value={tempWidget.config?.valueField || ''} onChange={e => setTempWidget({ ...tempWidget, config: { ...tempWidget.config!, valueField: e.target.value } })}>
                                       <option value="">-- Choisir --</option>
                                       {allFields.map(f => <option key={f} value={f}>{f}</option>)}
                                    </Select>
                                 </div>
                              )}
                           </div>

                           {(tempWidget.type === 'chart' || tempWidget.type === 'list') && (
                              <div className="grid grid-cols-2 gap-4">
                                 <div>
                                    <Label>Axe de regroupement</Label>
                                    <Select value={tempWidget.config?.dimension || ''} onChange={e => setTempWidget({ ...tempWidget, config: { ...tempWidget.config!, dimension: e.target.value } })}>
                                       <option value="">-- Choisir --</option>
                                       {allFields.map(f => <option key={f} value={f}>{f}</option>)}
                                    </Select>
                                 </div>
                                 <div>
                                    <Label>Limite (Top N)</Label>
                                    <Input type="number" value={tempWidget.config?.limit || 10} onChange={e => setTempWidget({ ...tempWidget, config: { ...tempWidget.config!, limit: parseInt(e.target.value) } })} />
                                 </div>
                              </div>
                           )}
                        </div>
                     )}

                     {/* COLOR CONFIGURATION SECTION */}
                     {(tempWidget.type === 'chart' || tempWidget.type === 'list') && (
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 space-y-4">
                           <div className="flex items-center gap-2 text-sm font-bold text-txt-main">
                              <PaintBucket className="w-4 h-4 text-brand-600" /> Configuration des couleurs
                           </div>
                           <div className="space-y-3">
                              {/* Mode Couleur */}
                              <div>
                                 <Label>Mode couleur</Label>
                                 <Select
                                    value={tempWidget.config?.pivotChart ? tempWidget.config.pivotChart.colorMode : (tempWidget.config?.colorMode || 'multi')}
                                    onChange={e => {
                                       if (tempWidget.config?.pivotChart) {
                                          setTempWidget({ ...tempWidget, config: { ...tempWidget.config!, pivotChart: { ...tempWidget.config.pivotChart, colorMode: e.target.value as any } } });
                                       } else {
                                          setTempWidget({ ...tempWidget, config: { ...tempWidget.config!, colorMode: e.target.value as any } });
                                       }
                                    }}>
                                    <option value="multi">Plusieurs couleurs</option>
                                    <option value="single">Couleur unique</option>
                                    <option value="gradient">Dégradé</option>
                                 </Select>
                              </div>

                              {/* Palette Selection (pour mode 'multi') */}
                              {((tempWidget.config?.pivotChart && tempWidget.config.pivotChart.colorMode === 'multi') || (!tempWidget.config?.pivotChart && (tempWidget.config?.colorMode === 'multi' || !tempWidget.config?.colorMode))) && (
                                 <div>
                                    <Label>Palette</Label>
                                    <Select
                                       value={tempWidget.config?.pivotChart ? (tempWidget.config.pivotChart.colorPalette || 'default') : (tempWidget.config?.colorPalette || 'default')}
                                       onChange={e => {
                                          if (tempWidget.config?.pivotChart) {
                                             setTempWidget({ ...tempWidget, config: { ...tempWidget.config!, pivotChart: { ...tempWidget.config.pivotChart, colorPalette: e.target.value as any } } });
                                          } else {
                                             setTempWidget({ ...tempWidget, config: { ...tempWidget.config!, colorPalette: e.target.value as any } });
                                          }
                                       }}>
                                       <option value="default">Défaut</option>
                                       <option value="pastel">Pastel</option>
                                       <option value="vibrant">Vibrant</option>
                                    </Select>
                                 </div>
                              )}

                              {/* Single Color (pour mode 'single') */}
                              {((tempWidget.config?.pivotChart && tempWidget.config.pivotChart.colorMode === 'single') || (!tempWidget.config?.pivotChart && tempWidget.config?.colorMode === 'single')) && (
                                 <div className="flex items-center gap-3">
                                    <div>
                                       <Label>Couleur</Label>
                                       <input
                                          type="color"
                                          value={tempWidget.config?.pivotChart ? (tempWidget.config.pivotChart.singleColor || '#0066cc') : (tempWidget.config?.singleColor || '#0066cc')}
                                          onChange={e => {
                                             if (tempWidget.config?.pivotChart) {
                                                setTempWidget({ ...tempWidget, config: { ...tempWidget.config!, pivotChart: { ...tempWidget.config.pivotChart, singleColor: e.target.value } } });
                                             } else {
                                                setTempWidget({ ...tempWidget, config: { ...tempWidget.config!, singleColor: e.target.value } });
                                             }
                                          }}
                                          className="w-12 h-10 rounded border border-slate-300 cursor-pointer"
                                       />
                                    </div>
                                    <div>
                                       <Label>Valeur</Label>
                                       <Input
                                          type="text"
                                          value={tempWidget.config?.pivotChart ? (tempWidget.config.pivotChart.singleColor || '#0066cc') : (tempWidget.config?.singleColor || '#0066cc')}
                                          onChange={e => {
                                             if (tempWidget.config?.pivotChart) {
                                                setTempWidget({ ...tempWidget, config: { ...tempWidget.config!, pivotChart: { ...tempWidget.config.pivotChart, singleColor: e.target.value } } });
                                             } else {
                                                setTempWidget({ ...tempWidget, config: { ...tempWidget.config!, singleColor: e.target.value } });
                                             }
                                          }}
                                          placeholder="#0066cc"
                                          className="text-xs w-20"
                                       />
                                    </div>
                                 </div>
                              )}

                              {/* Gradient Colors (pour mode 'gradient') */}
                              {((tempWidget.config?.pivotChart && tempWidget.config.pivotChart.colorMode === 'gradient') || (!tempWidget.config?.pivotChart && tempWidget.config?.colorMode === 'gradient')) && (
                                 <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                       <div>
                                          <Label>Couleur début</Label>
                                          <input
                                             type="color"
                                             value={tempWidget.config?.pivotChart ? (tempWidget.config.pivotChart.gradientStart || '#0066cc') : (tempWidget.config?.gradientStart || '#0066cc')}
                                             onChange={e => {
                                                if (tempWidget.config?.pivotChart) {
                                                   setTempWidget({ ...tempWidget, config: { ...tempWidget.config!, pivotChart: { ...tempWidget.config.pivotChart, gradientStart: e.target.value } } });
                                                } else {
                                                   setTempWidget({ ...tempWidget, config: { ...tempWidget.config!, gradientStart: e.target.value } });
                                                }
                                             }}
                                             className="w-12 h-10 rounded border border-slate-300 cursor-pointer"
                                          />
                                       </div>
                                       <div>
                                          <Label>Valeur</Label>
                                          <Input
                                             type="text"
                                             value={tempWidget.config?.pivotChart ? (tempWidget.config.pivotChart.gradientStart || '#0066cc') : (tempWidget.config?.gradientStart || '#0066cc')}
                                             onChange={e => {
                                                if (tempWidget.config?.pivotChart) {
                                                   setTempWidget({ ...tempWidget, config: { ...tempWidget.config!, pivotChart: { ...tempWidget.config.pivotChart, gradientStart: e.target.value } } });
                                                } else {
                                                   setTempWidget({ ...tempWidget, config: { ...tempWidget.config!, gradientStart: e.target.value } });
                                                }
                                             }}
                                             placeholder="#0066cc"
                                             className="text-xs w-20"
                                          />
                                       </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                       <div>
                                          <Label>Couleur fin</Label>
                                          <input
                                             type="color"
                                             value={tempWidget.config?.pivotChart ? (tempWidget.config.pivotChart.gradientEnd || '#e63946') : (tempWidget.config?.gradientEnd || '#e63946')}
                                             onChange={e => {
                                                if (tempWidget.config?.pivotChart) {
                                                   setTempWidget({ ...tempWidget, config: { ...tempWidget.config!, pivotChart: { ...tempWidget.config.pivotChart, gradientEnd: e.target.value } } });
                                                } else {
                                                   setTempWidget({ ...tempWidget, config: { ...tempWidget.config!, gradientEnd: e.target.value } });
                                                }
                                             }}
                                             className="w-12 h-10 rounded border border-slate-300 cursor-pointer"
                                          />
                                       </div>
                                       <div>
                                          <Label>Valeur</Label>
                                          <Input
                                             type="text"
                                             value={tempWidget.config?.pivotChart ? (tempWidget.config.pivotChart.gradientEnd || '#e63946') : (tempWidget.config?.gradientEnd || '#e63946')}
                                             onChange={e => {
                                                if (tempWidget.config?.pivotChart) {
                                                   setTempWidget({ ...tempWidget, config: { ...tempWidget.config!, pivotChart: { ...tempWidget.config.pivotChart, gradientEnd: e.target.value } } });
                                                } else {
                                                   setTempWidget({ ...tempWidget, config: { ...tempWidget.config!, gradientEnd: e.target.value } });
                                                }
                                             }}
                                             placeholder="#e63946"
                                             className="text-xs w-20"
                                          />
                                       </div>
                                    </div>
                                 </div>
                              )}
                           </div>
                        </div>
                     )}
                  </div>

                  <div className="p-6 border-t border-border-default bg-slate-50 flex justify-end gap-3">
                     <Button variant="outline" onClick={() => setShowWidgetDrawer(false)}>Annuler</Button>
                     <Button onClick={handleSaveWidget} disabled={!tempWidget.title}>Enregistrer</Button>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};
