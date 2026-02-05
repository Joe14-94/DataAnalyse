
import { useMemo } from 'react';
import { useBatches, useDatasets, useWidgets } from '../context/DataContext';
import { DashboardWidget, Dataset, PivotConfig, FilterRule } from '../types';
import { parseSmartNumber, evaluateFormula } from '../utils';
import { calculatePivotData } from '../logic/pivotEngine';
import { transformPivotToChartData, transformPivotToTreemapData, transformPivotToSunburstData, transformPivotToHierarchicalTreemap, getChartColors, generateGradient } from '../logic/pivotToChart';
import { calculateTemporalComparison, detectDateColumn } from '../utils/temporalComparison';
import { applyPivotFilters, getEffectiveBatches, getChartColorsForWidget } from '../logic/widgetEngine';

export const useWidgetData = (widget: DashboardWidget, globalDateRange: { start: string, end: string }) => {
   const { batches } = useBatches();
   const { datasets: allDatasets } = useDatasets();
   const { dashboardFilters } = useWidgets();

   return useMemo(() => {
      if (widget.type === 'text') return { text: widget.config.textContent, style: widget.config.textStyle };
      if (widget.type === 'report') return { items: widget.config.reportItems || [] };

      // Gérer les widgets de graphiques basés sur une sélection TCD (reportItems)
      if (widget.type === 'chart' && widget.config.reportItems && !widget.config.source) {
         const items = widget.config.reportItems;
         const chartType = widget.config.chartType;
         const isStackedSingleBar = ['stacked-bar', 'stacked-column', 'percent-bar', 'percent-column'].includes(chartType as string);

         let chartData;
         let colorCount = items.length;

         if (isStackedSingleBar) {
            const singleGroup: any = { name: 'Sélection', value: 0 };
            items.forEach(item => {
               const val = typeof item.value === 'number' ? item.value : parseFloat(String(item.value)) || 0;
               const segmentLabel = `${item.rowPath.join(' > ')} | ${item.colLabel}`;
               singleGroup[segmentLabel] = val;
               singleGroup.value += val;
            });
            chartData = [singleGroup];
            colorCount = items.length;
         } else {
            chartData = items.map(item => ({
               name: item.label,
               value: typeof item.value === 'number' ? item.value : parseFloat(String(item.value)) || 0,
               size: typeof item.value === 'number' ? item.value : parseFloat(String(item.value)) || 0,
               fullLabel: `${item.rowPath.join(' > ')} | ${item.colLabel}`
            }));
            colorCount = chartData.length;
         }

         return {
            data: chartData,
            isSelective: true,
            unit: '', // On pourrait essayer de déduire l'unité
            colors: getChartColorsForWidget(widget.config, colorCount)
         };
      }

      // NOUVEAU : Gérer les widgets basés sur des graphiques TCD (Pivot)
      if (widget.config.pivotChart) {
         const { pivotChart } = widget.config;
         const { pivotConfig: pc } = pivotChart;

         if (!pc.rowFields || pc.rowFields.length === 0) return { error: 'Configuration de graphique TCD invalide' };

         const datasetId = widget.config.source?.datasetId;
         const dataset = allDatasets.find(d => d.id === datasetId);

         if (!dataset) return { error: 'Jeu de données introuvable' };

         const dsBatches = getEffectiveBatches(batches, datasetId, globalDateRange);
         if (dsBatches.length === 0) return { error: 'Aucune donnée sur la période' };

         let targetBatch = dsBatches[dsBatches.length - 1];
         if (pivotChart.updateMode === 'fixed' && widget.config.source?.mode === 'specific' && widget.config.source?.batchId) {
            const specific = dsBatches.find(b => b.id === widget.config.source?.batchId);
            if (specific) targetBatch = specific;
         }

         // Enrichissement calculé si nécessaire
         let baseRows = targetBatch.rows;
         console.log('📊 BEFORE CALCULATED FIELDS:', {
            rowCount: baseRows.length,
            hasCalculatedFields: !!dataset?.calculatedFields && dataset.calculatedFields.length > 0,
            calculatedFieldsCount: dataset?.calculatedFields?.length || 0,
            calculatedFieldNames: dataset?.calculatedFields?.map(cf => cf.name) || [],
            sampleRowBefore: baseRows[0]
         });

         if (dataset?.calculatedFields && dataset.calculatedFields.length > 0) {
            baseRows = baseRows.map(r => {
               const enriched = { ...r };
               dataset.calculatedFields?.forEach(cf => {
                  enriched[cf.name] = evaluateFormula(enriched, cf.formula);
               });
               return enriched;
            });

            console.log('📊 AFTER CALCULATED FIELDS:', {
               sampleRowAfter: baseRows[0],
               portefeuilleField: baseRows[0]?.['Portefeuille']
            });
         }

         // Appliquer les filtres du TCD
         console.log('📊 WIDGET FILTERS DEBUG:', {
            hasFilters: !!pc.filters && pc.filters.length > 0,
            filterCount: pc.filters?.length || 0,
            filters: pc.filters,
            baseRowsCount: baseRows.length,
            datasetId: dataset?.id,
            datasetName: dataset?.name
         });

         let workingRows = applyPivotFilters(baseRows, pc.filters, dataset);

         console.log('📊 WIDGET AFTER FILTERS:', {
            workingRowsCount: workingRows.length,
            firstRow: workingRows[0],
            sampleFilteredOut: baseRows.find(r => !workingRows.includes(r))
         });

         let pivotResult: any = null;

         if (pivotChart.isTemporalMode && pivotChart.temporalComparison) {
            const tc = pivotChart.temporalComparison;
            const sourceDataMap = new Map<string, any[]>();

            // Logique de mise à jour automatique pour le mode temporel
            let effectiveSources = tc.sources || [];
            if (pivotChart.updateMode === 'latest') {
               const sortedBatches = [...(batches || [])]
                  .filter(b => b.datasetId === widget.config.source?.datasetId)
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

               effectiveSources = (tc.sources || []).map((s: any, idx: number) => ({
                  ...s,
                  batchId: sortedBatches[idx]?.id || s.batchId,
                  // On garde le label original s'il a été personnalisé, sinon on pourrait mettre la date
               }));
            }

            effectiveSources.forEach((source: any) => {
               const batch = (batches || []).find(b => b.id === source.batchId);
               if (batch) {
                  // Enrichissement calculé si nécessaire
                  let rows = batch.rows;
                  if (dataset?.calculatedFields && dataset.calculatedFields.length > 0) {
                     rows = rows.map(r => {
                        const enriched = { ...r };
                        dataset.calculatedFields?.forEach(cf => {
                           enriched[cf.name] = evaluateFormula(enriched, cf.formula);
                        });
                        return enriched;
                     });
                  }
                  // Appliquer les filtres TCD sur chaque source
                  sourceDataMap.set(source.id, applyPivotFilters(rows, pc.filters, dataset));
               }
            });

            const dateColumn = detectDateColumn(dataset.fields || []) || 'Date écriture';
            const { results } = calculateTemporalComparison(sourceDataMap, {
               ...tc,
               groupByFields: pc.rowFields,
               valueField: pc.valField,
               aggType: pc.aggType === 'list' ? 'sum' : pc.aggType
            }, dateColumn, pc.showSubtotals);

            // Formater pour transformPivotToChartData
            const colHeaders = effectiveSources.map((s: any, idx: number) => {
               if (pivotChart.updateMode === 'latest') {
                  const batch = (batches || []).find(b => b.id === s.batchId);
                  if (batch) {
                     const dateStr = new Date(batch.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
                     return `${s.label.split(' (')[0]} (${dateStr})`;
                  }
               }
               return s.label || `Source ${idx + 1}`;
            });

            const displayRows = (results || []).map((r: any) => {
               const keys = (r.groupLabel || '').split('\x1F');

               // Construire les métriques en s'assurant que toutes les sources sont représentées
               const metrics: Record<string, number> = {};
               effectiveSources.forEach((s: any) => {
                  const label = colHeaders[effectiveSources.indexOf(s)];
                  metrics[label] = (r.values && typeof r.values[s.id] === 'number') ? r.values[s.id] : 0;
               });

               return {
                  type: (r.isSubtotal ? 'subtotal' : 'data') as 'subtotal' | 'data',
                  keys: keys,
                  level: r.isSubtotal ? (r.subtotalLevel ?? 0) : (keys.length - 1),
                  label: (r.groupLabel || '').replace(/\x1F/g, ' > '),
                  metrics,
                  rowTotal: Object.values(r.values || {}).reduce((a: number, b: any) => a + (b || 0), 0)
               };
            });

            pivotResult = { colHeaders, displayRows, colTotals: {}, grandTotal: 0, isTemporal: true };
         } else {
            pivotResult = calculatePivotData({
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
         }

         if (!pivotResult) return { error: 'Erreur lors du calcul du TCD' };

         const fullPivotConfig = { rows: workingRows, ...pc } as PivotConfig;

         // Sunburst: Calculate color count from pivot data before transformation
         if (pivotChart.chartType === 'sunburst') {
            // Calculate expected level 1 count from pivot data directly
            const level1Keys = new Set<string>();
            if (pivotResult.displayRows && Array.isArray(pivotResult.displayRows)) {
               pivotResult.displayRows.forEach((row: any) => {
                  if (row.keys && Array.isArray(row.keys) && row.keys.length > 0) {
                     level1Keys.add(row.keys[0]);
                  }
               });
            }

            // Apply limit if set
            let colorCount = level1Keys.size || 6; // Fallback to 6 if no keys found
            if (pivotChart.limit && pivotChart.limit > 0 && colorCount > pivotChart.limit) {
               colorCount = pivotChart.limit + 1; // +1 for "Autres"
            }

            const sunburstColors = (() => {
               if (pivotChart.colorMode === 'single') return Array(colorCount).fill(pivotChart.singleColor || '#3b82f6');
               if (pivotChart.colorMode === 'gradient') return generateGradient(pivotChart.gradientStart || '#3b82f6', pivotChart.gradientEnd || '#ef4444', colorCount);
               return getChartColors(colorCount, pivotChart.colorPalette || 'default');
            })();

            const sbData = transformPivotToSunburstData(pivotResult, fullPivotConfig, sunburstColors, {
               limit: pivotChart.limit,
               showOthers: (pivotChart.limit || 0) > 0
            });

            return {
               data: [],
               sunburstData: sbData,
               colors: sunburstColors,
               unit: dataset?.fieldConfigs?.[pc.valField]?.unit || '',
               seriesName: pc.valField,
               seriesCount: sbData.rings.length,
               isPivot: true
            };
         }

         // Calculer les couleurs de base pour les types hiérarchiques (treemap)
         const hierarchicalBaseColors = (() => {
            if (pivotChart.colorMode === 'single') return Array(9).fill(pivotChart.singleColor || '#3b82f6');
            if (pivotChart.colorMode === 'gradient') return generateGradient(pivotChart.gradientStart || '#3b82f6', pivotChart.gradientEnd || '#ef4444', 9);
            return getChartColors(9, pivotChart.colorPalette || 'default');
         })();

         // Treemap hierarchique
         if (pivotChart.chartType === 'treemap') {
            const treeData = transformPivotToHierarchicalTreemap(pivotResult, fullPivotConfig, hierarchicalBaseColors, {
               limit: pivotChart.limit,
               showOthers: (pivotChart.limit || 0) > 0
            });
            const flatData = transformPivotToTreemapData(pivotResult, fullPivotConfig, pivotChart.hierarchyLevel);
            return {
               data: flatData,
               hierarchicalData: treeData,
               colors: getChartColorsForWidget(pivotChart, flatData?.length || 10),
               unit: dataset?.fieldConfigs?.[pc.valField]?.unit || '',
               seriesName: pc.valField,
               seriesCount: 1,
               isPivot: true
            };
         }

         let chartData;
         chartData = transformPivotToChartData(pivotResult, fullPivotConfig, {
            chartType: pivotChart.chartType,
            hierarchyLevel: pivotChart.hierarchyLevel,
            limit: pivotChart.limit,
            excludeSubtotals: true,
            sortBy: pivotChart.sortBy || 'value',
            sortOrder: pivotChart.sortOrder || 'desc',
            showOthers: (pivotChart.limit || 0) > 0
         });

         // Détection robuste du nombre de séries (à travers tous les points de données)
         const allKeys = chartData ? Array.from(new Set(chartData.flatMap(d => Object.keys(d).filter(k => k !== 'name' && k !== 'value' && k !== 'size' && k !== 'rowTotal')))) : [];
         const seriesCount = allKeys.length || 1;
         const pointCount = chartData?.length || 0;

         const colorCount = (pivotChart.chartType === 'pie' || pivotChart.chartType === 'donut')
            ? pointCount
            : (seriesCount > 1 ? seriesCount : pointCount);

         const colors = getChartColorsForWidget(pivotChart, colorCount);

         return {
            data: chartData,
            colors,
            unit: dataset?.fieldConfigs?.[pc.valField]?.unit || '',
            seriesName: pc.valField,
            seriesCount,
            isPivot: true
         };
      }

      // Logic pour widgets standards
      const { source, metric, dimension, valueField, target, secondarySource, limit } = widget.config;
      if (!source) return null;

      const dataset = (allDatasets || []).find(d => d.id === source.datasetId);
      if (!dataset) return { error: 'Jeu de données introuvable' };

      const dsBatches = getEffectiveBatches(batches || [], source.datasetId, globalDateRange);
      if (dsBatches.length === 0) return { error: 'Aucune donnée sur la période' };

      let targetBatch = dsBatches[dsBatches.length - 1];
      let prevBatch = dsBatches.length > 1 ? dsBatches[dsBatches.length - 2] : null;

      if (source.mode === 'specific' && source.batchId) {
         const specific = dsBatches.find(b => b.id === source.batchId);
         if (specific) targetBatch = specific;
         else return { error: 'Import introuvable' };
      }

      let workingRows = targetBatch.rows;

      // Enrichissement calculé pour dataset principal
      if (dataset.calculatedFields && dataset.calculatedFields.length > 0) {
         workingRows = workingRows.map(r => {
            const enriched = { ...r };
            dataset.calculatedFields?.forEach(cf => {
               enriched[cf.name] = evaluateFormula(enriched, cf.formula);
            });
            return enriched;
         });
      }

      let secondaryDataset: Dataset | undefined = undefined;

      if (secondarySource && secondarySource.datasetId) {
         secondaryDataset = (allDatasets || []).find(d => d.id === secondarySource.datasetId);
         const secBatches = getEffectiveBatches(batches || [], secondarySource.datasetId, globalDateRange);

         if (secBatches.length > 0) {
            const secBatch = secBatches[secBatches.length - 1];
            const lookup = new Map<string, any>();
            (secBatch.rows || []).forEach(r => { const key = String(r[secondarySource.joinFieldSecondary]).trim(); if (key) lookup.set(key, r); });
            workingRows = (workingRows || []).map(row => { const key = String(row[secondarySource.joinFieldPrimary]).trim(); const match = lookup.get(key); if (match) { return { ...row, ...match }; } return row; });
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
      const standardColors = getChartColorsForWidget(widget.config, colorCount);

      if (widget.type === 'list') {
         const counts: Record<string, number> = {};
         (workingRows || []).forEach(row => {
            const key = String(row[dimension || ''] || 'Non défini');
            if (metric === 'count' || metric === 'distinct') counts[key] = (counts[key] || 0) + 1;
            else if (metric === 'sum' && valueField) counts[key] = (counts[key] || 0) + parseVal(row, valueField);
         });
         let sorted = Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, limit || 10);
         return { current: sorted, max: sorted.length > 0 ? sorted[0].value : 0, unit: currentUnit, colors: standardColors };
      }

      if (dimension) {
         const counts: Record<string, number> = {};
         (workingRows || []).forEach(row => {
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
