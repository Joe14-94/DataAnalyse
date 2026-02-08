import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import {
  parseSmartNumber,
  calculateLinearRegression,
  getSafeLogo,
  formatDateFr,
  exportView
} from '../utils';
import { FilterRule, ColorMode, ColorPalette } from '../types';
import { getChartColors as getPivotChartColors, generateGradient } from '../logic/pivotToChart';
import * as XLSX from 'xlsx';

export type ChartType =
  | 'bar'
  | 'column'
  | 'stacked-bar'
  | 'stacked-column'
  | 'percent-bar'
  | 'percent-column'
  | 'pie'
  | 'donut'
  | 'area'
  | 'stacked-area'
  | 'radar'
  | 'treemap'
  | 'kpi'
  | 'line'
  | 'sunburst'
  | 'radial'
  | 'funnel';
export type AnalysisMode = 'snapshot' | 'trend';
export type MetricType = 'count' | 'distinct' | 'sum';

export interface AnalysisRow {
  name: string;
  value: number;
  value2: number;
  size: number;
  cumulative?: number;
  [key: string]: string | number | undefined;
}

export interface SnapshotData {
  data: AnalysisRow[];
  series: string[];
}

export interface TrendData {
  data: any[]; // Trends can have dynamic keys for series
  series: string[];
}

export const useAnalysisStudioLogic = () => {
  const {
    currentDataset,
    batches,
    datasets,
    currentDatasetId,
    switchDataset,
    addDashboardWidget,
    saveAnalysis,
    savedAnalyses,
    companyLogo
  } = useData();

  const navigate = useNavigate();

  // --- Configuration State ---
  const [mode, setMode] = useState<AnalysisMode>('snapshot');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [dimension, setDimension] = useState<string>('');
  const [metric, setMetric] = useState<MetricType>('count');
  const [valueField, setValueField] = useState<string>('');
  const [metric2, setMetric2] = useState<MetricType | 'none'>('none');
  const [valueField2, setValueField2] = useState<string>('');
  const [segment, setSegment] = useState<string>('');
  const [chartType, setChartType] = useState<ChartType>('column');
  const [limit, setLimit] = useState<number>(10);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc' | 'alpha' | 'none'>('desc');
  const [isCumulative, setIsCumulative] = useState(false);
  const [filters, setFilters] = useState<FilterRule[]>([]);
  const [showForecast, setShowForecast] = useState(false);
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

  // Style State
  const [colorMode, setColorMode] = useState<ColorMode>('multi');
  const [colorPalette, setColorPalette] = useState<ColorPalette>('default');
  const [singleColor, setSingleColor] = useState('#60a5fa');
  const [gradientStart, setGradientStart] = useState('#60a5fa');
  const [gradientEnd, setGradientEnd] = useState('#f87171');

  const [chartTitle, setChartTitle] = useState('');
  const [customUnit, setCustomUnit] = useState('');

  // UI State
  const [isSaving, setIsSaving] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [analysisName, setAnalysisName] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // --- Derived Data ---
  const fields = useMemo(() => (currentDataset ? currentDataset.fields : []), [currentDataset]);

  useEffect(() => {
    if (!selectedBatchId && batches.length > 0) {
      setSelectedBatchId(batches[batches.length - 1].id);
    }

    if (batches.length > 0) {
      const sortedDates = batches.map((b) => b.date).sort();
      if (!startDate) setStartDate(sortedDates[0]);
      if (!endDate) setEndDate(sortedDates[sortedDates.length - 1]);
    }

    if (fields.length > 0 && (!dimension || !fields.includes(dimension))) {
      setDimension(fields[0]);
    }
  }, [batches, fields, selectedBatchId, dimension, startDate, endDate]);

  const currentBatch = useMemo(
    () => batches.find((b) => b.id === selectedBatchId) || batches[batches.length - 1],
    [batches, selectedBatchId]
  );

  const numericFields = useMemo(() => {
    if (!currentDataset) return [];
    const configuredNumeric = Object.entries(currentDataset.fieldConfigs || {})
      .filter(([_, config]) => config.type === 'number')
      .map(([name, _]) => name);

    if (configuredNumeric.length > 0) {
      return configuredNumeric.filter((f) => fields.includes(f));
    }

    if (!currentBatch || currentBatch.rows.length === 0) return [];
    const sample = currentBatch.rows.slice(0, 20);
    return fields.filter((f) => {
      return sample.some((r: any) => {
        const val = r[f];
        if (val === undefined || val === '' || val === null) return false;
        return parseSmartNumber(val) !== 0 || val === '0' || val === 0;
      });
    });
  }, [currentBatch, fields, currentDataset]);

  useEffect(() => {
    if (metric === 'sum' && !valueField && numericFields.length > 0) {
      setValueField(numericFields[0]);
    }
  }, [metric, numericFields, valueField]);

  useEffect(() => {
    if (metric2 === 'sum' && !valueField2 && numericFields.length > 0) {
      setValueField2(numericFields[0]);
    }
  }, [metric2, numericFields, valueField2]);

  const getValue = useCallback(
    (row: any, fieldName: string): number => {
      const raw = row[fieldName];
      const unit = currentDataset?.fieldConfigs?.[fieldName]?.unit;
      return parseSmartNumber(raw, unit);
    },
    [currentDataset]
  );

  // Actions
  const addFilter = () => {
    if (fields.length > 0) {
      setFilters([...filters, { field: fields[0], operator: 'in', value: [] }]);
    }
  };

  const updateFilter = (index: number, updates: Partial<FilterRule>) => {
    const newFilters = [...filters];
    newFilters[index] = { ...newFilters[index], ...updates };
    if (updates.operator && updates.operator !== 'in' && Array.isArray(newFilters[index].value)) {
      newFilters[index].value = '';
    }
    if (updates.operator === 'in' && !Array.isArray(newFilters[index].value)) {
      newFilters[index].value = [];
    }
    setFilters(newFilters);
  };

  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const getDistinctValuesForField = (field: string) => {
    const targetBatch = mode === 'snapshot' ? currentBatch : batches[batches.length - 1];
    if (!targetBatch) return [];
    const set = new Set<string>();
    targetBatch.rows.forEach((r) => {
      const val = r[field] !== undefined ? String(r[field]) : '';
      if (val) set.add(val);
    });
    return Array.from(set).sort();
  };

  const handleExportToDashboard = () => {
    if (!currentDataset) return;

    let widgetType: 'chart' | 'kpi' = 'chart';
    let widgetChartType: any = undefined;

    if (chartType === 'kpi') {
      widgetType = 'kpi';
    } else {
      if (
        [
          'bar',
          'column',
          'line',
          'area',
          'pie',
          'donut',
          'radial',
          'radar',
          'treemap',
          'funnel'
        ].includes(chartType)
      ) {
        widgetChartType = chartType;
      } else {
        widgetChartType = 'bar';
      }
    }

    const title = `${metric === 'sum' ? 'Somme' : metric === 'distinct' ? 'Distinct' : 'Compte'} par ${dimension}`;

    addDashboardWidget({
      title: title,
      type: widgetType,
      size: 'md',
      height: 'md',
      config: {
        source: {
          datasetId: currentDataset.id,
          mode: 'latest'
        },
        metric: metric === 'distinct' ? 'distinct' : metric === 'sum' ? 'sum' : 'count',
        dimension: dimension,
        valueField: metric === 'sum' ? valueField : undefined,
        chartType: widgetChartType,
        showTrend: mode === 'snapshot',
        limit: limit
      }
    });

    setSuccessMessage('Le graphique a été ajouté au tableau de bord.');
  };

  const handleSaveAnalysis = () => {
    if (!analysisName.trim() || !currentDataset) return;
    saveAnalysis({
      name: analysisName,
      type: 'analytics',
      datasetId: currentDataset.id,
      config: {
        mode,
        selectedBatchId,
        startDate,
        endDate,
        dimension,
        metric,
        valueField,
        metric2,
        valueField2,
        segment,
        chartType,
        limit,
        sortOrder,
        isCumulative,
        filters,
        showForecast,
        colorMode,
        colorPalette,
        singleColor,
        gradientStart,
        gradientEnd,
        chartTitle,
        customUnit
      }
    });
    setAnalysisName('');
    setIsSaving(false);
    setSuccessMessage("Vue d'analyse sauvegardée avec succès.");
  };

  const handleLoadAnalysis = (id: string) => {
    const analysis = savedAnalyses.find((a) => a.id === id);
    if (!analysis || !analysis.config) return;
    const c = analysis.config;

    if (analysis.datasetId && analysis.datasetId !== currentDatasetId) {
      switchDataset(analysis.datasetId);
    }

    if (c.mode) setMode(c.mode);
    if (c.selectedBatchId) setSelectedBatchId(c.selectedBatchId);
    if (c.dimension) setDimension(c.dimension);
    if (c.metric) setMetric(c.metric);
    if (c.valueField) setValueField(c.valueField);
    if (c.segment) setSegment(c.segment);
    if (c.chartType) setChartType(c.chartType);
    if (c.limit) setLimit(c.limit);
    if (c.sortOrder) setSortOrder(c.sortOrder);
    if (c.isCumulative !== undefined) setIsCumulative(c.isCumulative);
    if (c.showForecast !== undefined) setShowForecast(c.showForecast);
    if (c.metric2) setMetric2(c.metric2);
    if (c.valueField2) setValueField2(c.valueField2);
    if (c.colorMode) setColorMode(c.colorMode);
    if (c.colorPalette) setColorPalette(c.colorPalette);
    if (c.singleColor) setSingleColor(c.singleColor);
    if (c.gradientStart) setGradientStart(c.gradientStart);
    if (c.gradientEnd) setGradientEnd(c.gradientEnd);
    if (c.chartTitle) setChartTitle(c.chartTitle);
    if (c.customUnit) setCustomUnit(c.customUnit);
    if (c.filters) {
      const loadedFilters = c.filters.map((f: any) => {
        if (f.values) return { field: f.field, operator: 'in', value: f.values };
        return f;
      });
      setFilters(loadedFilters);
    }
    if (c.startDate) setStartDate(c.startDate);
    if (c.endDate) setEndDate(c.endDate);
  };

  const snapshotData = useMemo<SnapshotData>(() => {
    if (mode !== 'snapshot' || !currentBatch || !dimension) return { data: [], series: [] };

    const filteredRows = currentBatch.rows.filter((row) => {
      if (filters.length === 0) return true;
      return filters.every((f) => {
        const rowVal = row[f.field];
        const strRowVal = String(rowVal || '').toLowerCase();
        const strFilterVal = String(f.value || '').toLowerCase();

        if (f.operator === 'in') {
          if (Array.isArray(f.value))
            return f.value.length === 0 || f.value.includes(String(rowVal));
          return true;
        }
        if (f.operator === 'starts_with') {
          const values = strFilterVal
            .split(',')
            .map((v) => v.trim())
            .filter((v) => v !== '');
          return values.length === 0 || values.some((v) => strRowVal.startsWith(v));
        }
        if (f.operator === 'contains') {
          const values = strFilterVal
            .split(',')
            .map((v) => v.trim())
            .filter((v) => v !== '');
          return values.length === 0 || values.some((v) => strRowVal.includes(v));
        }
        if (f.operator === 'eq') return strRowVal === strFilterVal;
        if (f.operator === 'gt') return parseSmartNumber(rowVal) > parseSmartNumber(f.value);
        if (f.operator === 'lt') return parseSmartNumber(rowVal) < parseSmartNumber(f.value);
        return true;
      });
    });

    const agg: Record<
      string,
      {
        name: string;
        count: number;
        distinctSet: Set<string>;
        sum: number;
        count2: number;
        distinctSet2: Set<string>;
        sum2: number;
        [key: string]: any;
      }
    > = {};

    filteredRows.forEach((row) => {
      const dimVal = String(row[dimension] || 'Non défini');
      if (!agg[dimVal])
        agg[dimVal] = {
          name: dimVal,
          count: 0,
          distinctSet: new Set(),
          sum: 0,
          count2: 0,
          distinctSet2: new Set(),
          sum2: 0
        };

      agg[dimVal].count++;
      if (metric === 'distinct') agg[dimVal].distinctSet.add(row.id);
      if (metric === 'sum' && valueField) agg[dimVal].sum += getValue(row, valueField);

      if (metric2 !== 'none') {
        agg[dimVal].count2++;
        if (metric2 === 'distinct') agg[dimVal].distinctSet2.add(row.id);
        if (metric2 === 'sum' && valueField2) agg[dimVal].sum2 += getValue(row, valueField2);
      }

      if (segment) {
        const segVal = String(row[segment] !== undefined ? row[segment] : 'N/A');
        if (!agg[dimVal][segVal]) agg[dimVal][segVal] = 0;
        if (metric === 'sum' && valueField) agg[dimVal][segVal] += getValue(row, valueField);
        else agg[dimVal][segVal]++;
      }
    });

    let result: AnalysisRow[] = Object.values(agg).map((item) => {
      const { distinctSet, distinctSet2, ...rest } = item;
      let finalVal = 0;
      if (metric === 'distinct') finalVal = distinctSet.size;
      else if (metric === 'sum') finalVal = parseFloat(item.sum.toFixed(2));
      else finalVal = item.count;

      let finalVal2 = 0;
      if (metric2 === 'distinct') finalVal2 = distinctSet2.size;
      else if (metric2 === 'sum') finalVal2 = parseFloat(item.sum2.toFixed(2));
      else if (metric2 === 'count') finalVal2 = item.count2;

      return { ...rest, value: finalVal, value2: finalVal2, size: finalVal };
    });

    if (sortOrder === 'alpha') result.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortOrder === 'asc') result.sort((a, b) => a.value - b.value);
    else result.sort((a, b) => b.value - a.value);

    if (limit > 0) result = result.slice(0, limit);

    if (isCumulative) {
      let runningTotal = 0;
      result = result.map((item) => {
        runningTotal += item.value;
        return { ...item, cumulative: parseFloat(runningTotal.toFixed(2)) };
      });
    }

    const series = segment
      ? Array.from(
          new Set(filteredRows.map((r) => String(r[segment] !== undefined ? r[segment] : 'N/A')))
        ).sort()
      : [];

    return { data: result, series };
  }, [
    mode,
    currentBatch,
    dimension,
    metric,
    valueField,
    metric2,
    valueField2,
    segment,
    limit,
    filters,
    sortOrder,
    isCumulative,
    getValue
  ]);

  const trendData = useMemo(() => {
    if (mode !== 'trend' || !dimension) return { data: [], series: [] };

    const targetBatches = batches
      .filter((b) => b.datasetId === currentDataset?.id)
      .filter((b) => b.date >= startDate && b.date <= endDate)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (targetBatches.length === 0) return { data: [], series: [] };

    const globalCounts: Record<string, number> = {};

    targetBatches.forEach((batch) => {
      const batchRows = batch.rows.filter((row: any) => {
        if (filters.length === 0) return true;
        return filters.every((f) => {
          const rowVal = row[f.field];
          const strRowVal = String(rowVal || '').toLowerCase();
          const strFilterVal = String(f.value || '').toLowerCase();

          if (f.operator === 'in') {
            if (Array.isArray(f.value))
              return f.value.length === 0 || f.value.includes(String(rowVal));
            return true;
          }
          if (f.operator === 'starts_with') {
            const values = strFilterVal
              .split(',')
              .map((v) => v.trim())
              .filter((v) => v !== '');
            return values.length === 0 || values.some((v) => strRowVal.startsWith(v));
          }
          if (f.operator === 'contains') {
            const values = strFilterVal
              .split(',')
              .map((v) => v.trim())
              .filter((v) => v !== '');
            return values.length === 0 || values.some((v) => strRowVal.includes(v));
          }
          if (f.operator === 'eq') return strRowVal === strFilterVal;
          if (f.operator === 'gt') return parseSmartNumber(rowVal) > parseSmartNumber(f.value);
          if (f.operator === 'lt') return parseSmartNumber(rowVal) < parseSmartNumber(f.value);
          return true;
        });
      });

      batchRows.forEach((row: any) => {
        const val = String(row[dimension] || 'Non défini');
        let increment = 1;
        if (metric === 'sum' && valueField) increment = getValue(row, valueField);
        globalCounts[val] = (globalCounts[val] || 0) + increment;
      });
    });

    const topSeries = Object.entries(globalCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map((e) => e[0]);

    const timeData = targetBatches.map((batch) => {
      const batchRows = batch.rows.filter((row: any) => {
        if (filters.length === 0) return true;
        return filters.every((f) => {
          const rowVal = row[f.field];
          const strRowVal = String(rowVal || '').toLowerCase();
          const strFilterVal = String(f.value || '').toLowerCase();

          if (f.operator === 'in') {
            if (Array.isArray(f.value))
              return f.value.length === 0 || f.value.includes(String(rowVal));
            return true;
          }
          if (f.operator === 'starts_with') {
            const values = strFilterVal
              .split(',')
              .map((v) => v.trim())
              .filter((v) => v !== '');
            return values.length === 0 || values.some((v) => strRowVal.startsWith(v));
          }
          if (f.operator === 'contains') {
            const values = strFilterVal
              .split(',')
              .map((v) => v.trim())
              .filter((v) => v !== '');
            return values.length === 0 || values.some((v) => strRowVal.includes(v));
          }
          if (f.operator === 'eq') return strRowVal === strFilterVal;
          if (f.operator === 'gt') return parseSmartNumber(rowVal) > parseSmartNumber(f.value);
          if (f.operator === 'lt') return parseSmartNumber(rowVal) < parseSmartNumber(f.value);
          return true;
        });
      });

      const point: any = {
        date: batch.date,
        displayDate: formatDateFr(batch.date),
        total: 0,
        total2: 0
      };

      topSeries.forEach((s) => {
        point[s] = 0;
        if (metric2 !== 'none') point[s + '_m2'] = 0;
      });

      batchRows.forEach((row: any) => {
        const val = String(row[dimension] || 'Non défini');
        if (topSeries.includes(val)) {
          let qty = 1;
          if (metric === 'sum' && valueField) qty = getValue(row, valueField);
          point[val] = parseFloat(((point[val] || 0) + qty).toFixed(2));

          if (metric2 !== 'none') {
            let qty2 = 1;
            if (metric2 === 'sum' && valueField2) qty2 = getValue(row, valueField2);
            point[val + '_m2'] = parseFloat(((point[val + '_m2'] || 0) + qty2).toFixed(2));
          }
        }
        if (metric === 'sum' && valueField) point.total += getValue(row, valueField);
        else point.total++;

        if (metric2 !== 'none') {
          if (metric2 === 'sum' && valueField2) point.total2 += getValue(row, valueField2);
          else point.total2++;
        }
      });

      point.total = parseFloat(point.total.toFixed(2));
      if (metric2 !== 'none') point.total2 = parseFloat(point.total2.toFixed(2));
      return point;
    });

    if (showForecast && timeData.length >= 2) {
      const totals = timeData.map((d) => d.total);
      const { slope, intercept } = calculateLinearRegression(totals);
      timeData.forEach((d, i) => {
        d.forecast = parseFloat((intercept + slope * i).toFixed(2));
      });
      const nextIndex = timeData.length;
      const nextTotal = intercept + slope * nextIndex;
      timeData.push({
        date: 'prediction',
        displayDate: '(Proj.)',
        total: null,
        forecast: parseFloat(nextTotal.toFixed(2))
      });
    }

    return { data: timeData, series: topSeries };
  }, [
    mode,
    batches,
    startDate,
    endDate,
    dimension,
    limit,
    filters,
    currentDataset,
    metric,
    valueField,
    metric2,
    valueField2,
    showForecast,
    getValue
  ]);

  const chartColors = useMemo(() => {
    const dataCount =
      mode === 'snapshot'
        ? segment
          ? snapshotData.series.length
          : snapshotData.data.length
        : trendData.series.length;
    const count = Math.max(dataCount, 1);

    if (colorMode === 'single') {
      return Array(count).fill(singleColor);
    } else if (colorMode === 'gradient') {
      return generateGradient(gradientStart, gradientEnd, count);
    } else {
      return getPivotChartColors(count, colorPalette);
    }
  }, [
    colorMode,
    colorPalette,
    singleColor,
    gradientStart,
    gradientEnd,
    snapshotData,
    trendData,
    mode
  ]);

  const insightText = useMemo(() => {
    const unitLabel =
      metric === 'sum' && valueField && currentDataset?.fieldConfigs?.[valueField]?.unit
        ? ` ${currentDataset.fieldConfigs[valueField].unit}`
        : '';

    if (mode === 'snapshot') {
      if (!snapshotData.data || snapshotData.data.length === 0) return 'Aucune donnée.';
      const top = snapshotData.data[0];
      let text = `En date du ${formatDateFr(currentBatch?.date || '')}, "${top.name}" domine avec ${top.value.toLocaleString()}${unitLabel}.`;

      if (metric2 !== 'none' && top.value2 !== undefined) {
        const unitLabel2 = customUnit
          ? ` ${customUnit}`
          : metric2 === 'sum' && valueField2 && currentDataset?.fieldConfigs?.[valueField2]?.unit
            ? ` ${currentDataset.fieldConfigs[valueField2].unit}`
            : '';
        text += ` La métrique secondaire affiche ${top.value2.toLocaleString()}${unitLabel2}.`;
      }
      return text;
    } else {
      if (trendData.data.length === 0) return 'Aucune donnée sur la période.';
      const validPoints = trendData.data.filter((d: any) => d.date !== 'prediction');
      if (validPoints.length === 0) return 'Données insuffisantes.';
      const first = validPoints[0];
      const last = validPoints[validPoints.length - 1];
      const growth = parseFloat((last.total - first.total).toFixed(2));
      let text = `Sur la période, le volume a évolué de ${growth > 0 ? '+' : ''}${growth.toLocaleString()}${unitLabel}.`;

      if (metric2 !== 'none') {
        const growth2 = parseFloat(((last.total2 || 0) - (first.total2 || 0)).toFixed(2));
        const unitLabel2 = customUnit
          ? ` ${customUnit}`
          : metric2 === 'sum' && valueField2 && currentDataset?.fieldConfigs?.[valueField2]?.unit
            ? ` ${currentDataset.fieldConfigs[valueField2].unit}`
            : '';
        text += ` La métrique secondaire a varié de ${growth2 > 0 ? '+' : ''}${growth2.toLocaleString()}${unitLabel2}.`;
      }
      return text;
    }
  }, [
    mode,
    snapshotData,
    trendData,
    currentBatch,
    metric,
    valueField,
    metric2,
    valueField2,
    currentDataset,
    customUnit
  ]);

  const handleExportInteractiveHTML = () => {
    const title = chartTitle || `${mode === 'snapshot' ? 'Analyse' : 'Évolution'} ${dimension}`;
    const data = mode === 'snapshot' ? snapshotData : trendData;
    const unit =
      customUnit ||
      (metric === 'sum' && valueField ? currentDataset?.fieldConfigs?.[valueField]?.unit : '');

    let plotlyData: any[] = [];
    let layout: any = {
      title: title,
      font: { family: 'Inter, system-ui, sans-serif', size: 12 },
      showlegend: true,
      template: 'plotly_white',
      margin: { t: 80, b: 80, l: 80, r: 80 }
    };

    if (mode === 'snapshot') {
      const labels = snapshotData.data.map((d) => d.name);
      if (segment && snapshotData.series.length > 0) {
        snapshotData.series.forEach((s, idx) => {
          plotlyData.push({
            x: labels,
            y: snapshotData.data.map((d) => d[s] || 0),
            name: s,
            type: chartType.includes('bar')
              ? 'bar'
              : chartType.includes('area')
                ? 'scatter'
                : 'bar',
            fill: chartType.includes('area') ? 'tonexty' : undefined,
            orientation: chartType.includes('bar') && !chartType.includes('column') ? 'h' : 'v',
            marker: { color: chartColors[idx % chartColors.length] }
          });
        });
        if (chartType.includes('stacked') || chartType.includes('percent')) {
          layout.barmode = 'stack';
          if (chartType.includes('percent')) layout.barnorm = 'percent';
        }
      } else {
        plotlyData.push({
          x: labels,
          y: snapshotData.data.map((d) => d.value),
          name: metric === 'sum' ? valueField : 'Valeur 1',
          type: chartType.includes('bar')
            ? 'bar'
            : chartType.includes('area')
              ? 'scatter'
              : chartType.includes('pie') || chartType.includes('donut')
                ? 'pie'
                : 'bar',
          marker: { color: chartColors },
          hole: chartType === 'donut' ? 0.4 : undefined,
          orientation: chartType.includes('bar') && !chartType.includes('column') ? 'h' : 'v'
        });
        if (metric2 !== 'none') {
          plotlyData.push({
            x: labels,
            y: snapshotData.data.map((d) => d.value2),
            name: metric2 === 'sum' ? valueField2 : 'Valeur 2',
            type: 'scatter',
            mode: 'lines+markers',
            yaxis: 'y2',
            line: { color: '#6366f1', width: 3 }
          });
          layout.yaxis2 = { title: 'Secondaire', overlaying: 'y', side: 'right' };
        }
      }
    } else {
      const dates = trendData.data.map((d) => d.displayDate);
      trendData.series.forEach((s, idx) => {
        plotlyData.push({
          x: dates,
          y: trendData.data.map((d) => d[s] || 0),
          name: s,
          type: chartType.includes('column') ? 'bar' : 'scatter',
          mode: 'lines+markers',
          fill: chartType.includes('area') ? 'tonexty' : undefined,
          marker: { color: chartColors[idx % chartColors.length] }
        });
      });
      if (metric2 !== 'none') {
        plotlyData.push({
          x: dates,
          y: trendData.data.map((d) => d.total2 || 0),
          name: metric2 === 'sum' ? `Total ${valueField2}` : 'Total 2',
          type: 'scatter',
          mode: 'lines+markers',
          yaxis: 'y2',
          line: { color: '#6366f1', width: 3, dash: 'dash' }
        });
        layout.yaxis2 = { title: 'Secondaire', overlaying: 'y', side: 'right' };
      }
      if (chartType.includes('stacked') || chartType.includes('percent')) {
        layout.barmode = 'stack';
      }
    }

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${title}</title>
<script src="https://cdn.plot.ly/plotly-2.27.0.min.js"></script>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 20px; background: #f8fafc; }
  .container { max-width: 1200px; margin: 0 auto; background: white; padding: 2rem; border-radius: 0.5rem; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
  .header { border-bottom: 1px solid #e2e8f0; margin-bottom: 20px; padding-bottom: 15px; display: flex; align-items: center; gap: 20px; }
  .logo { height: 40px; width: auto; object-fit: contain; }
  h1 { font-size: 1.5rem; color: #1e293b; margin: 0; flex: 1; }
  .metadata { font-size: 0.875rem; color: #64748b; margin-top: 5px; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    ${getSafeLogo(companyLogo) ? `<img src="${getSafeLogo(companyLogo)}" class="logo" alt="Logo" />` : ''}
    <h1>${title}</h1>
  </div>
  <div class="metadata">Exporté le ${new Date().toLocaleDateString()} | Unité: ${unit || 'Standard'}</div>
  <div id="chart" style="width:100%;height:600px;"></div>
</div>
<script>
  const data = ${JSON.stringify(plotlyData)};
  const layout = ${JSON.stringify(layout)};
  Plotly.newPlot('chart', data, layout, {responsive: true});
</script>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => document.body.removeChild(link), 100);
  };

  const handleExport = async (
    format: 'pdf' | 'html' | 'png' | 'xlsx',
    pdfMode: 'A4' | 'adaptive' = 'adaptive'
  ) => {
    setShowExportMenu(false);
    const title = chartTitle || `${mode === 'snapshot' ? 'Analyse' : 'Évolution'} ${dimension}`;

    if (format === 'pdf') {
      exportView(format, 'analytics-export-container', title, companyLogo, pdfMode);
    } else if (format === 'html') {
      handleExportInteractiveHTML();
    } else if (format === 'png') {
      const element = document.getElementById('analytics-export-container');
      if (element) {
        const html2canvas = (await import('html2canvas')).default;
        const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff' });
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = `analyse_${new Date().toISOString().split('T')[0]}.png`;
        link.click();
      }
    } else if (format === 'xlsx') {
      const data = mode === 'snapshot' ? snapshotData.data : trendData.data;
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Données');
      XLSX.writeFile(workbook, `analyse_${new Date().toISOString().split('T')[0]}.xlsx`);
    }
  };

  return {
    // State
    mode,
    setMode,
    selectedBatchId,
    setSelectedBatchId,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    dimension,
    setDimension,
    metric,
    setMetric,
    valueField,
    setValueField,
    metric2,
    setMetric2,
    valueField2,
    setValueField2,
    segment,
    setSegment,
    chartType,
    setChartType,
    limit,
    setLimit,
    sortOrder,
    setSortOrder,
    isCumulative,
    setIsCumulative,
    filters,
    setFilters,
    showForecast,
    setShowForecast,
    viewMode,
    setViewMode,
    colorMode,
    setColorMode,
    colorPalette,
    setColorPalette,
    singleColor,
    setSingleColor,
    gradientStart,
    setGradientStart,
    gradientEnd,
    setGradientEnd,
    chartTitle,
    setChartTitle,
    customUnit,
    setCustomUnit,
    isSaving,
    setIsSaving,
    analysisName,
    setAnalysisName,
    successMessage,
    setSuccessMessage,
    showExportMenu,
    setShowExportMenu,

    // Derived
    batches,
    currentDataset,
    datasets,
    fields,
    numericFields,
    currentBatch,
    snapshotData,
    trendData,
    chartColors,
    savedAnalyses,
    companyLogo,
    insightText,
    currentDatasetId,
    isCalculating,
    navigate,
    availableAnalyses: savedAnalyses.filter(
      (a) => a.type === 'analytics' && a.datasetId === currentDataset?.id
    ),

    // Actions
    addDashboardWidget,
    saveAnalysis,
    switchDataset,
    addFilter,
    updateFilter,
    removeFilter,
    getDistinctValuesForField,
    handleExportToDashboard,
    handleSaveAnalysis,
    handleLoadAnalysis,
    handleExport
  };
};
