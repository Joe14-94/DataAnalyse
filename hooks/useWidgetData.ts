
import { useMemo } from 'react';
import { useBatches, useDatasets, useWidgets } from '../context/DataContext';
import { DashboardWidget, Dataset, PivotConfig, FilterRule } from '../types';
import { parseSmartNumber } from '../utils';
import { calculatePivotData } from '../logic/pivotEngine';
import { transformPivotToChartData, transformPivotToTreemapData, getChartColors, generateGradient } from '../logic/pivotToChart';

export const useWidgetData = (widget: DashboardWidget, globalDateRange: { start: string, end: string }) => {
   const { batches } = useBatches();
   const { datasets: allDatasets } = useDatasets();
   const { dashboardFilters } = useWidgets();

   return useMemo(() => {
      if (widget.type === 'text') return { text: widget.config.textContent, style: widget.config.textStyle };

      // NOUVEAU : Gérer les widgets basés sur des graphiques TCD (Pivot)
      if (widget.config.pivotChart) {
         const { pivotChart } = widget.config;
         const { pivotConfig: pc } = pivotChart;

         if (!pc.rowFields || pc.rowFields.length === 0) return { error: 'Configuration de graphique TCD invalide' };

         const dataset = allDatasets.find(d => d.id === widget.config.source?.datasetId);
         if (!dataset) return { error: 'Jeu de données introuvable' };

         let dsBatches = batches.filter(b => b.datasetId === widget.config.source?.datasetId);

         if (globalDateRange.start) dsBatches = dsBatches.filter(b => b.date >= globalDateRange.start);
         if (globalDateRange.end) dsBatches = dsBatches.filter(b => b.date <= globalDateRange.end);

         dsBatches.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

         if (dsBatches.length === 0) return { error: 'Aucune donnée sur la période' };

         let workingRows = dsBatches[dsBatches.length - 1].rows;

         // Appliquer les filtres du TCD
         if (pc.filters && pc.filters.length > 0) {
            workingRows = workingRows.filter(row => {
               return pc.filters!.every((filter: FilterRule) => {
                  const rowVal = row[filter.field];
                  if (filter.operator === 'in' && Array.isArray(filter.value)) {
                     return filter.value.includes(String(rowVal));
                  } else if (filter.operator === 'contains') {
                     return String(rowVal || '').includes(String(filter.value));
                  } else if (filter.operator === 'gt') {
                     return parseSmartNumber(rowVal, dataset.fieldConfigs?.[filter.field]?.unit) > (filter.value as number);
                  } else if (filter.operator === 'lt') {
                     return parseSmartNumber(rowVal, dataset.fieldConfigs?.[filter.field]?.unit) < (filter.value as number);
                  } else if (filter.operator === 'eq') {
                     return String(rowVal) === String(filter.value);
                  } else if (filter.operator === 'starts_with') {
                     return String(rowVal || '').startsWith(String(filter.value));
                  }
                  return true;
               });
            });
         }

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

         const seriesCount = chartData && chartData.length > 0
            ? Object.keys(chartData[0]).filter(k => k !== 'name').length
            : 1;
         const pointCount = chartData?.length || 0;

         const colorCount = (pivotChart.chartType === 'pie' || pivotChart.chartType === 'donut' || pivotChart.chartType === 'treemap')
            ? pointCount
            : (seriesCount > 1 ? seriesCount : pointCount);

         const effectiveColorMode = pivotChart.colorMode || 'multi';
         const effectiveColorPalette = pivotChart.colorPalette || 'vibrant';
         const effectiveSingleColor = pivotChart.singleColor || '#0066cc';
         const effectiveGradientStart = pivotChart.gradientStart || '#0066cc';
         const effectiveGradientEnd = pivotChart.gradientEnd || '#e63946';

         let colors = [];
         if (effectiveColorMode === 'single') {
            colors = Array(Math.max(colorCount, 1)).fill(effectiveSingleColor);
         } else if (effectiveColorMode === 'gradient') {
            colors = generateGradient(effectiveGradientStart, effectiveGradientEnd, Math.max(colorCount, 1));
         } else {
            colors = getChartColors(Math.max(colorCount, 1), effectiveColorPalette);
         }

         return {
            data: chartData,
            colors,
            unit: dataset.fieldConfigs?.[pc.valField]?.unit || '',
            seriesName: pc.valField,
            seriesCount,
            isPivot: true
         };
      }

      // Logic pour widgets standards
      const { source, metric, dimension, valueField, target, secondarySource, limit } = widget.config;
      if (!source) return null;

      const dataset = allDatasets.find(d => d.id === source.datasetId);
      if (!dataset) return { error: 'Jeu de données introuvable' };

      let dsBatches = batches.filter(b => b.datasetId === source.datasetId);

      if (globalDateRange.start) dsBatches = dsBatches.filter(b => b.date >= globalDateRange.start);
      if (globalDateRange.end) dsBatches = dsBatches.filter(b => b.date <= globalDateRange.end);

      dsBatches.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      if (dsBatches.length === 0) return { error: 'Aucune donnée sur la période' };

      let targetBatch = dsBatches[dsBatches.length - 1];
      let prevBatch = dsBatches.length > 1 ? dsBatches[dsBatches.length - 2] : null;

      if (source.mode === 'specific' && source.batchId) {
         const specific = dsBatches.find(b => b.id === source.batchId);
         if (specific) targetBatch = specific;
         else return { error: 'Import introuvable' };
      }

      let workingRows = targetBatch.rows;
      let secondaryDataset: Dataset | undefined = undefined;

      if (secondarySource && secondarySource.datasetId) {
         secondaryDataset = allDatasets.find(d => d.id === secondarySource.datasetId);
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

      // Calcul des couleurs pour widgets standards
      const colorCount = limit || 10;
      let standardColors = [];
      if (widget.config.colorMode === 'single') {
         standardColors = Array(colorCount).fill(widget.config.singleColor || '#3b82f6');
      } else if (widget.config.colorMode === 'gradient') {
         standardColors = generateGradient(widget.config.gradientStart || '#3b82f6', widget.config.gradientEnd || '#ef4444', colorCount);
      } else {
         standardColors = getChartColors(colorCount, widget.config.colorPalette || 'default');
      }

      if (widget.type === 'list') {
         const counts: Record<string, number> = {};
         workingRows.forEach(row => {
            const key = String(row[dimension || ''] || 'Non défini');
            if (metric === 'count' || metric === 'distinct') counts[key] = (counts[key] || 0) + 1;
            else if (metric === 'sum' && valueField) counts[key] = (counts[key] || 0) + parseVal(row, valueField);
         });
         let sorted = Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, limit || 10);
         return { current: sorted, max: sorted.length > 0 ? sorted[0].value : 0, unit: currentUnit, colors: standardColors };
      }

      if (dimension) {
         const counts: Record<string, number> = {};
         workingRows.forEach(row => {
            const key = String(row[dimension] || 'Non défini');
            let val = 1;
            if (metric === 'sum' && valueField) val = parseVal(row, valueField);
            counts[key] = (counts[key] || 0) + val;
         });

         if (widget.config.chartType === 'radial') {
            const data = Object.entries(counts).map(([name, value], idx) => ({ name, value, fill: standardColors[idx % standardColors.length] })).sort((a, b) => b.value - a.value).slice(0, 5);
            return { data, unit: currentUnit, colors: standardColors };
         }

         let data = Object.entries(counts).map(([name, value]) => ({ name, value, size: value }));
         data.sort((a, b) => b.value - a.value);
         if (limit) data = data.slice(0, limit);
         return { data, unit: currentUnit, colors: standardColors };
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
   }, [batches, allDatasets, widget.config, dashboardFilters, widget.type, globalDateRange]);
};
