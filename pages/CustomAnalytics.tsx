
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import { formatDateFr, parseSmartNumber, exportView, calculateLinearRegression } from '../utils';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, Cell,
  PieChart, Pie, AreaChart, Area, Treemap, LineChart, Line, ComposedChart,
  RadialBarChart, RadialBar, FunnelChart, Funnel, LabelList
} from 'recharts';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { 
  BarChart3, PieChart as PieIcon, Activity, Radar as RadarIcon, 
  LayoutGrid, TrendingUp, Settings2, Database,
  Filter, Table as TableIcon, Check, X, CalendarRange, Calculator, ChevronDown,
  LayoutDashboard, Save, FileDown, FileType, Printer
} from 'lucide-react';
import { FieldConfig, ChartType as WidgetChartType, FilterRule, ColorMode, ColorPalette } from '../types';
import { useNavigate, useLocation } from 'react-router-dom';
import { getChartColors, generateGradient, getSingleColors, formatChartValue } from '../logic/pivotToChart';

type ChartType = 'bar' | 'column' | 'stacked-bar' | 'stacked-column' | 'percent-bar' | 'percent-column' | 'pie' | 'donut' | 'area' | 'stacked-area' | 'radar' | 'treemap' | 'kpi' | 'line' | 'sunburst' | 'radial' | 'funnel';
type AnalysisMode = 'snapshot' | 'trend';
type MetricType = 'count' | 'distinct' | 'sum';

// --- Treemap Content ---
const TreemapContent = (props: any) => {
  const { x, y, width, height, name, index, colors } = props;
  const fill = colors ? colors[index % colors.length] : '#64748b';
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill} stroke="#fff" />
      {width > 60 && height > 30 && (
        <text x={x + width / 2} y={y + height / 2} textAnchor="middle" fill="#fff" fontSize={12} dy={4} style={{textShadow: '0 1px 2px rgba(0,0,0,0.2)'}}>
           {name.substring(0, 12)}
        </text>
      )}
    </g>
  );
};

// --- Multi Select Component ---
interface MultiSelectProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}

const MultiSelect: React.FC<MultiSelectProps> = ({ options, selected, onChange, placeholder = 'Sélectionner...' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter(s => s !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const handleSelectAll = () => {
     if (selected.length === options.length) {
        onChange([]);
     } else {
        onChange(options);
     }
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-left text-xs flex items-center justify-between hover:border-brand-300 focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
      >
        <span className="truncate text-slate-700">
          {selected.length === 0 
            ? placeholder 
            : selected.length === options.length 
               ? 'Tout sélectionné' 
               : `${selected.length} sélectionné(s)`
          }
        </span>
        <ChevronDown className="w-3 h-3 text-slate-400 ml-1 shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded shadow-lg max-h-60 overflow-y-auto custom-scrollbar">
          <div className="sticky top-0 bg-slate-50 p-2 border-b border-slate-100 flex justify-between items-center">
             <span className="text-xs font-bold text-slate-500 uppercase">Options</span>
             <button onClick={handleSelectAll} className="text-xs text-brand-600 hover:underline">
                {selected.length === options.length ? 'Tout décocher' : 'Tout cocher'}
             </button>
          </div>
          {options.length === 0 ? (
             <div className="p-2 text-xs text-slate-400 italic text-center">Aucune donnée</div>
          ) : (
             options.map(option => (
                <label key={option} className="flex items-center px-2 py-1.5 hover:bg-slate-50 cursor-pointer">
                   <input
                      type="checkbox"
                      className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 h-3 w-3 mr-2"
                      checked={selected.includes(option)}
                      onChange={() => handleToggle(option)}
                   />
                   <span className="text-xs text-slate-700 truncate" title={option}>{option}</span>
                </label>
             ))
          )}
        </div>
      )}
    </div>
  );
};

export const CustomAnalytics: React.FC = () => {
  const { batches, currentDataset, addDashboardWidget, savedAnalyses, saveAnalysis, companyLogo, datasets, currentDatasetId, switchDataset } = useData();
  const fields = currentDataset ? currentDataset.fields : [];
  const navigate = useNavigate();
  const location = useLocation();

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
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [limit, setLimit] = useState<number>(10);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc' | 'alpha'>('desc');
  const [isCumulative, setIsCumulative] = useState<boolean>(false);
  const [showTable, setShowTable] = useState<boolean>(false);
  const [showForecast, setShowForecast] = useState<boolean>(false); // NEW
  const [filters, setFilters] = useState<FilterRule[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [analysisName, setAnalysisName] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [chartTitle, setChartTitle] = useState('');
  const [customUnit, setCustomUnit] = useState('');

  // Color options
  const [colorMode, setColorMode] = useState<ColorMode>('multi');
  const [colorPalette, setColorPalette] = useState<ColorPalette>('default');
  const [singleColor, setSingleColor] = useState<string>('#60a5fa');
  const [gradientStart, setGradientStart] = useState<string>('#60a5fa');
  const [gradientEnd, setGradientEnd] = useState<string>('#f87171');

  useEffect(() => {
    // Check if we have incoming state from Pivot (ChartModal)
    if (location.state?.fromPivotChart) {
       const { pivotConfig, chartType: incomingChartType } = location.state.fromPivotChart;

       if (pivotConfig.rowFields && pivotConfig.rowFields.length > 0) {
          setDimension(pivotConfig.rowFields[0]);
       }
       if (pivotConfig.valField) {
          setValueField(pivotConfig.valField);
          setMetric(pivotConfig.aggType === 'sum' ? 'sum' : 'count');
       }
       if (incomingChartType) {
          setChartType(incomingChartType === 'column' ? 'column' :
                       incomingChartType === 'bar' ? 'bar' :
                       incomingChartType === 'pie' ? 'pie' :
                       incomingChartType === 'area' ? 'area' :
                       incomingChartType === 'radar' ? 'radar' :
                       incomingChartType === 'treemap' ? 'treemap' : 'bar');
       }
       if (pivotConfig.filters) {
          setFilters(pivotConfig.filters);
       }

       // Clear state to avoid re-applying on refresh
       window.history.replaceState({}, document.title);
    }

    if (!selectedBatchId && batches.length > 0) {
      setSelectedBatchId(batches[batches.length - 1].id);
    }
    
    if (batches.length > 0) {
       const sortedDates = batches.map(b => b.date).sort();
       if (!startDate) setStartDate(sortedDates[0]);
       if (!endDate) setEndDate(sortedDates[sortedDates.length - 1]);
    }

    if (fields.length > 0 && (!dimension || !fields.includes(dimension))) {
      setDimension(fields[0]);
    }
  }, [batches, fields, selectedBatchId, dimension, startDate, endDate, location.state]);

  useEffect(() => {
     if (mode === 'trend') {
        setChartType('line');
     } else {
        setChartType('bar');
     }
  }, [mode]);

  useEffect(() => {
      if(successMessage) {
          const timer = setTimeout(() => setSuccessMessage(null), 3000);
          return () => clearTimeout(timer);
      }
  }, [successMessage]);

  const currentBatch = useMemo(() => 
    batches.find(b => b.id === selectedBatchId) || batches[batches.length - 1], 
  [batches, selectedBatchId]);

  const getDistinctValuesForField = (field: string) => {
    const targetBatch = mode === 'snapshot' ? currentBatch : batches[batches.length - 1];
    if (!targetBatch) return [];
    const set = new Set<string>();
    targetBatch.rows.forEach(r => {
       const val = r[field] !== undefined ? String(r[field]) : '';
       if (val) set.add(val);
    });
    return Array.from(set).sort();
  };

  const numericFields = useMemo(() => {
     if (!currentDataset) return [];
     const configuredNumeric = Object.entries(currentDataset.fieldConfigs || ({} as Record<string, FieldConfig>))
        .filter(([_, config]) => (config as FieldConfig).type === 'number')
        .map(([name, _]) => name);
     
     if (configuredNumeric.length > 0) {
        return configuredNumeric.filter(f => fields.includes(f));
     }

     if (!currentBatch || currentBatch.rows.length === 0) return [];
     const sample = currentBatch.rows.slice(0, 20);
     return fields.filter(f => {
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

  const getValue = (row: any, fieldName: string): number => {
     const raw = row[fieldName];
     const unit = currentDataset?.fieldConfigs?.[fieldName]?.unit;
     return parseSmartNumber(raw, unit);
  };

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

  const handleExportToDashboard = () => {
      if (!currentDataset) return;

      let widgetType: 'chart' | 'kpi' = 'chart';
      let widgetChartType: WidgetChartType | undefined = undefined;

      if (chartType === 'kpi') {
         widgetType = 'kpi';
      } else {
         if (['bar', 'column', 'line', 'area', 'pie', 'donut', 'radial', 'radar', 'treemap', 'funnel'].includes(chartType)) {
             widgetChartType = chartType as WidgetChartType;
         } else {
             widgetChartType = 'bar';
         }
      }

      const title = `${metric === 'sum' ? 'Somme' : (metric === 'distinct' ? 'Distinct' : 'Compte')} par ${dimension}`;

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
            metric: metric === 'distinct' ? 'distinct' : (metric === 'sum' ? 'sum' : 'count'),
            dimension: dimension,
            valueField: metric === 'sum' ? valueField : undefined,
            chartType: widgetChartType,
            showTrend: mode === 'snapshot',
            limit: limit
         }
      });
      
      setSuccessMessage("Le graphique a été ajouté au tableau de bord.");
   };

   const handleSaveAnalysis = () => {
      if (!analysisName.trim() || !currentDataset) return;
      saveAnalysis({
         name: analysisName,
         type: 'analytics',
         datasetId: currentDataset.id,
         config: {
            mode, selectedBatchId, startDate, endDate,
            dimension, metric, valueField,
            metric2, valueField2,
            segment, chartType, limit,
            sortOrder, isCumulative, filters, showForecast,
            colorMode, colorPalette, singleColor, gradientStart, gradientEnd,
            chartTitle, customUnit
         }
      });
      setAnalysisName('');
      setIsSaving(false);
      setSuccessMessage("Vue d'analyse sauvegardée avec succès.");
   };

   const handleLoadAnalysis = (id: string) => {
      const analysis = savedAnalyses.find(a => a.id === id);
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

   const handleExport = async (format: 'pdf' | 'html' | 'png' | 'xlsx', pdfMode: 'A4' | 'adaptive' = 'adaptive') => {
      setShowExportMenu(false);
      const title = chartTitle || `${mode === 'snapshot' ? 'Analyse' : 'Évolution'} ${dimension}`;

      if (format === 'pdf') {
         exportView(format, 'analytics-export-container', title, companyLogo, pdfMode);
      } else if (format === 'html') {
         handleExportInteractiveHTML();
      } else if (format === 'png') {
         const element = document.getElementById('analytics-export-container');
         if (element) {
            const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff' });
            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = `analyse_${new Date().toISOString().split('T')[0]}.png`;
            link.click();
         }
      } else if (format === 'xlsx') {
         const data = mode === 'snapshot' ? snapshotData : trendData.data;
         const worksheet = XLSX.utils.json_to_sheet(data);
         const workbook = XLSX.utils.book_new();
         XLSX.utils.book_append_sheet(workbook, worksheet, 'Données');
         XLSX.writeFile(workbook, `analyse_${new Date().toISOString().split('T')[0]}.xlsx`);
      }
   };

   const handleExportInteractiveHTML = () => {
      const title = chartTitle || `${mode === 'snapshot' ? 'Analyse' : 'Évolution'} ${dimension}`;
      const data = mode === 'snapshot' ? snapshotData : trendData;
      const unit = customUnit || (metric === 'sum' && valueField ? currentDataset?.fieldConfigs?.[valueField]?.unit : '');

      let plotlyData: any[] = [];
      let layout: any = {
         title: title,
         font: { family: 'Inter, system-ui, sans-serif', size: 12 },
         showlegend: true,
         template: 'plotly_white',
         margin: { t: 80, b: 80, l: 80, r: 80 }
      };

      if (mode === 'snapshot') {
         const labels = snapshotData.data.map(d => d.name);
         if (segment && snapshotData.series.length > 0) {
            snapshotData.series.forEach((s, idx) => {
               plotlyData.push({
                  x: labels,
                  y: snapshotData.data.map(d => d[s] || 0),
                  name: s,
                  type: chartType.includes('bar') ? 'bar' : (chartType.includes('area') ? 'scatter' : 'bar'),
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
               y: snapshotData.data.map(d => d.value),
               name: metric === 'sum' ? valueField : 'Valeur 1',
               type: chartType.includes('bar') ? 'bar' : (chartType.includes('area') ? 'scatter' : (chartType.includes('pie') || chartType.includes('donut') ? 'pie' : 'bar')),
               marker: { color: chartColors },
               hole: chartType === 'donut' ? 0.4 : undefined,
               orientation: chartType.includes('bar') && !chartType.includes('column') ? 'h' : 'v'
            });
            if (metric2 !== 'none') {
               plotlyData.push({
                  x: labels,
                  y: snapshotData.data.map(d => d.value2),
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
         const dates = trendData.data.map(d => d.displayDate);
         trendData.series.forEach((s, idx) => {
            plotlyData.push({
               x: dates,
               y: trendData.data.map(d => d[s] || 0),
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
               y: trendData.data.map(d => d.total2 || 0),
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
    .header { border-bottom: 1px solid #e2e8f0; margin-bottom: 20px; padding-bottom: 10px; }
    h1 { font-size: 1.5rem; color: #1e293b; margin: 0; }
    .metadata { font-size: 0.875rem; color: #64748b; margin-top: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${title}</h1>
      <div class="metadata">Exporté le ${new Date().toLocaleDateString()} | Unité: ${unit || 'Standard'}</div>
    </div>
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
      link.download = (`${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.html`);
      document.body.appendChild(link);
      link.click();
      setTimeout(() => document.body.removeChild(link), 100);
   };

   const availableAnalyses = savedAnalyses.filter(a => a.type === 'analytics' && a.datasetId === currentDataset?.id);

  const snapshotData = useMemo(() => {
    if (mode !== 'snapshot' || !currentBatch || !dimension) return { data: [], series: [] };

    const filteredRows = currentBatch.rows.filter((row: any) => {
       if (filters.length === 0) return true;
       return filters.every(f => {
          const rowVal = row[f.field];
          const strRowVal = String(rowVal || '').toLowerCase();
          const strFilterVal = String(f.value || '').toLowerCase();

          if (f.operator === 'in') {
              if (Array.isArray(f.value)) return f.value.length === 0 || f.value.includes(String(rowVal));
              return true;
          }
          if (f.operator === 'starts_with') {
              const values = strFilterVal.split(',').map(v => v.trim()).filter(v => v !== '');
              return values.length === 0 || values.some(v => strRowVal.startsWith(v));
          }
          if (f.operator === 'contains') {
              const values = strFilterVal.split(',').map(v => v.trim()).filter(v => v !== '');
              return values.length === 0 || values.some(v => strRowVal.includes(v));
          }
          if (f.operator === 'eq') return strRowVal === strFilterVal;
          if (f.operator === 'gt') return parseSmartNumber(rowVal) > parseSmartNumber(f.value);
          if (f.operator === 'lt') return parseSmartNumber(rowVal) < parseSmartNumber(f.value);
          return true;
       });
    });

    const agg: Record<string, any> = {};
    filteredRows.forEach((row: any) => {
      const dimVal = String(row[dimension] || 'Non défini');
      if (!agg[dimVal]) agg[dimVal] = {
        name: dimVal,
        count: 0, distinctSet: new Set(), sum: 0,
        count2: 0, distinctSet2: new Set(), sum2: 0
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

    let result = Object.values(agg).map((item: any) => {
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
       result = result.map(item => {
          runningTotal += item.value;
          return { ...item, cumulative: parseFloat(runningTotal.toFixed(2)) };
       });
    }

    const series = segment ? Array.from(new Set(filteredRows.map(r => String(r[segment] !== undefined ? r[segment] : 'N/A')))).sort() : [];

    return { data: result, series };
  }, [mode, currentBatch, dimension, metric, valueField, metric2, valueField2, segment, limit, filters, sortOrder, isCumulative, currentDataset]);

  const trendData = useMemo(() => {
    if (mode !== 'trend' || !dimension) return { data: [], series: [] };

    const targetBatches = batches
       .filter(b => b.datasetId === currentDataset?.id)
       .filter(b => b.date >= startDate && b.date <= endDate)
       .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (targetBatches.length === 0) return { data: [], series: [] };

    const globalCounts: Record<string, number> = {};
    
    targetBatches.forEach(batch => {
       const batchRows = batch.rows.filter((row: any) => {
          if (filters.length === 0) return true;
          return filters.every(f => {
             const rowVal = row[f.field];
             const strRowVal = String(rowVal || '').toLowerCase();
             const strFilterVal = String(f.value || '').toLowerCase();

             if (f.operator === 'in') {
                 if (Array.isArray(f.value)) return f.value.length === 0 || f.value.includes(String(rowVal));
                 return true;
             }
             if (f.operator === 'starts_with') {
                 const values = strFilterVal.split(',').map(v => v.trim()).filter(v => v !== '');
                 return values.length === 0 || values.some(v => strRowVal.startsWith(v));
             }
             if (f.operator === 'contains') {
                 const values = strFilterVal.split(',').map(v => v.trim()).filter(v => v !== '');
                 return values.length === 0 || values.some(v => strRowVal.includes(v));
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
       .map(e => e[0]);

    const timeData = targetBatches.map(batch => {
       const batchRows = batch.rows.filter((row: any) => {
          if (filters.length === 0) return true;
          return filters.every(f => {
             const rowVal = row[f.field];
             const strRowVal = String(rowVal || '').toLowerCase();
             const strFilterVal = String(f.value || '').toLowerCase();

             if (f.operator === 'in') {
                 if (Array.isArray(f.value)) return f.value.length === 0 || f.value.includes(String(rowVal));
                 return true;
             }
             if (f.operator === 'starts_with') {
                 const values = strFilterVal.split(',').map(v => v.trim()).filter(v => v !== '');
                 return values.length === 0 || values.some(v => strRowVal.startsWith(v));
             }
             if (f.operator === 'contains') {
                 const values = strFilterVal.split(',').map(v => v.trim()).filter(v => v !== '');
                 return values.length === 0 || values.some(v => strRowVal.includes(v));
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

       topSeries.forEach(s => {
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

    // FORECASTING
    if (showForecast && timeData.length >= 2) {
       const totals = timeData.map(d => d.total);
       const { slope, intercept } = calculateLinearRegression(totals);
       timeData.forEach((d, i) => {
          d.forecast = parseFloat((intercept + slope * i).toFixed(2));
       });
       // Add prediction point
       const nextIndex = timeData.length;
       const nextTotal = intercept + slope * nextIndex;
       const nextDate = new Date(targetBatches[targetBatches.length-1].date);
       nextDate.setMonth(nextDate.getMonth() + 1); // rough approx
       timeData.push({
          date: 'prediction',
          displayDate: '(Proj.)',
          total: null,
          forecast: parseFloat(nextTotal.toFixed(2))
       });
    }

    return { data: timeData, series: topSeries };
  }, [mode, batches, startDate, endDate, dimension, limit, filters, currentDataset, metric, valueField, metric2, valueField2, showForecast]);

  // Dynamic colors
  const chartColors = useMemo(() => {
    const dataCount = mode === 'snapshot' ? (segment ? snapshotData.series.length : snapshotData.data.length) : trendData.series.length;
    const count = Math.max(dataCount, 1);

    if (colorMode === 'single') {
      return Array(count).fill(singleColor);
    } else if (colorMode === 'gradient') {
      return generateGradient(gradientStart, gradientEnd, count);
    } else {
      return getChartColors(count, colorPalette);
    }
  }, [colorMode, colorPalette, singleColor, gradientStart, gradientEnd, snapshotData, trendData, mode]);

  const insightText = useMemo(() => {
    const unitLabel = (metric === 'sum' && valueField && currentDataset?.fieldConfigs?.[valueField]?.unit) 
       ? ` ${currentDataset.fieldConfigs[valueField].unit}`
       : '';

    if (mode === 'snapshot') {
       if (!snapshotData.data || snapshotData.data.length === 0) return "Aucune donnée.";
       const top = snapshotData.data[0];
       let text = `En date du ${formatDateFr(currentBatch?.date || '')}, "${top.name}" domine avec ${top.value.toLocaleString()}${unitLabel}.`;

       if (metric2 !== 'none' && top.value2 !== undefined) {
          const unitLabel2 = customUnit ? ` ${customUnit}` : (metric2 === 'sum' && valueField2 && currentDataset?.fieldConfigs?.[valueField2]?.unit)
             ? ` ${currentDataset.fieldConfigs[valueField2].unit}`
             : '';
          text += ` La métrique secondaire affiche ${top.value2.toLocaleString()}${unitLabel2}.`;
       }
       return text;
    } else {
       if (trendData.data.length === 0) return "Aucune donnée sur la période.";
       const validPoints = trendData.data.filter((d: any) => d.date !== 'prediction');
       if (validPoints.length === 0) return "Données insuffisantes.";
       const first = validPoints[0];
       const last = validPoints[validPoints.length - 1];
       const growth = parseFloat((last.total - first.total).toFixed(2));
       let text = `Sur la période, le volume a évolué de ${growth > 0 ? '+' : ''}${growth.toLocaleString()}${unitLabel}.`;

       if (metric2 !== 'none') {
          const growth2 = parseFloat(((last.total2 || 0) - (first.total2 || 0)).toFixed(2));
          const unitLabel2 = customUnit ? ` ${customUnit}` : (metric2 === 'sum' && valueField2 && currentDataset?.fieldConfigs?.[valueField2]?.unit)
             ? ` ${currentDataset.fieldConfigs[valueField2].unit}`
             : '';
          text += ` La métrique secondaire a varié de ${growth2 > 0 ? '+' : ''}${growth2.toLocaleString()}${unitLabel2}.`;
       }
       return text;
    }
  }, [mode, snapshotData, trendData, currentBatch, metric, valueField, metric2, valueField2, currentDataset]);

  const tooltipStyle = {
    backgroundColor: '#ffffff',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
    color: '#334155',
    fontSize: '12px',
    padding: '8px'
  };

  const renderVisuals = () => {
    const data = mode === 'snapshot' ? snapshotData.data : trendData.data;
    if (!data || data.length === 0) return <div className="flex items-center justify-center h-full text-slate-400 italic">Aucune donnée disponible</div>;

    if (showTable) {
       // Table rendering remains same...
       if (mode === 'snapshot') {
          return (
             <div className="h-full overflow-auto w-full custom-scrollbar">
                <table className="min-w-full divide-y divide-slate-200">
                   <thead className="bg-slate-50 sticky top-0">
                      <tr>
                         <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase">{dimension}</th>
                         <th className="px-4 py-2 text-right text-xs font-bold text-slate-500 uppercase">Valeur</th>
                         {metric2 !== 'none' && <th className="px-4 py-2 text-right text-xs font-bold text-indigo-500 uppercase">Valeur 2</th>}
                         {isCumulative && <th className="px-4 py-2 text-right text-xs font-bold text-slate-500 uppercase">Cumul</th>}
                         {snapshotData.series.map(s => (
                            <th key={s} className="px-4 py-2 text-right text-[10px] font-bold text-slate-400 uppercase">{s}</th>
                         ))}
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100 bg-white">
                      {snapshotData.data.map((row: any, idx: number) => (
                         <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-4 py-2 text-sm text-slate-700 font-medium">{row.name}</td>
                            <td className="px-4 py-2 text-sm text-slate-900 text-right font-bold">{row.value.toLocaleString()}</td>
                            {metric2 !== 'none' && <td className="px-4 py-2 text-sm text-indigo-600 text-right font-bold">{row.value2?.toLocaleString()}</td>}
                            {isCumulative && <td className="px-4 py-2 text-sm text-slate-500 text-right">{row.cumulative.toLocaleString()}</td>}
                            {snapshotData.series.map(s => (
                               <td key={s} className="px-4 py-2 text-xs text-slate-500 text-right">{row[s]?.toLocaleString()}</td>
                            ))}
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          )
       } else {
          return (
            <div className="h-full overflow-auto w-full custom-scrollbar">
               <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50 sticky top-0">
                     <tr>
                        <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase">Date</th>
                        <th className="px-4 py-2 text-right text-xs font-bold text-slate-500 uppercase">Total</th>
                         {metric2 !== 'none' && <th className="px-4 py-2 text-right text-xs font-bold text-indigo-500 uppercase">Total 2</th>}
                        {showForecast && <th className="px-4 py-2 text-right text-xs font-bold text-indigo-500 uppercase">Prévision</th>}
                        {trendData.series.map(s => (
                           <th key={s} className="px-4 py-2 text-right text-xs font-bold text-slate-500 uppercase">{s}</th>
                        ))}
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                     {trendData.data.map((row: any, idx: number) => (
                        <tr key={idx} className={`hover:bg-slate-50 ${row.date === 'prediction' ? 'bg-indigo-50/50 italic' : ''}`}>
                           <td className="px-4 py-2 text-sm text-slate-700 font-medium">{row.displayDate}</td>
                           <td className="px-4 py-2 text-sm text-slate-900 text-right font-bold">{row.total !== null ? row.total.toLocaleString() : '-'}</td>
                            {metric2 !== 'none' && <td className="px-4 py-2 text-sm text-indigo-600 text-right font-bold">{row.total2?.toLocaleString()}</td>}
                           {showForecast && <td className="px-4 py-2 text-sm text-indigo-600 text-right font-bold">{row.forecast?.toLocaleString()}</td>}
                           {trendData.series.map(s => (
                              <td key={s} className="px-4 py-2 text-xs text-slate-500 text-right">{row[s]?.toLocaleString()}</td>
                           ))}
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
          );
       }
    }

    if (mode === 'trend') {
       const isStacked = chartType === 'stacked-area' || chartType === 'stacked-column' || chartType === 'percent-column';
       const isPercent = chartType === 'percent-column';
       const isBar = chartType === 'column' || chartType === 'stacked-column' || chartType === 'percent-column';

       return (
         <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={trendData.data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }} stackOffset={isPercent ? 'expand' : undefined}>
               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
               <XAxis dataKey="displayDate" stroke="#94a3b8" fontSize={12} />
               <YAxis yAxisId="left" stroke="#94a3b8" fontSize={12} tickFormatter={isPercent ? (val) => `${(val * 100).toFixed(0)}%` : undefined} />
               {metric2 !== 'none' && !isStacked && <YAxis yAxisId="right" orientation="right" stroke="#6366f1" fontSize={12} />}
               <Tooltip contentStyle={tooltipStyle} formatter={(val: any) => isPercent ? `${(val * 100).toFixed(1)}%` : formatChartValue(val, { valFormatting: { unit: customUnit } } as any)} />
               <Legend verticalAlign="top" iconType="circle" wrapperStyle={{fontSize: '12px', color: '#64748b'}} />

               {trendData.series.map((s, idx) => {
                  if (isBar) {
                     return <Bar key={s} yAxisId="left" dataKey={s} name={s} stackId={isStacked ? 'a' : undefined} fill={chartColors[idx % chartColors.length]} radius={!isStacked ? [4, 4, 0, 0] : 0} />;
                  } else if (chartType === 'area' || chartType === 'stacked-area') {
                     return <Area key={s} yAxisId="left" type="monotone" dataKey={s} name={s} stackId={isStacked ? 'a' : undefined} stroke={chartColors[idx % chartColors.length]} fill={chartColors[idx % chartColors.length]} fillOpacity={0.4} />;
                  } else {
                     return <Line yAxisId="left" key={s} type="monotone" dataKey={s} stroke={chartColors[idx % chartColors.length]} strokeWidth={2} dot={true} />;
                  }
               })}

               {metric2 !== 'none' && !isStacked && (
                  <Line yAxisId="right" type="monotone" dataKey="total2" name={metric2 === 'sum' ? `Total ${valueField2}` : 'Total (2)'} stroke="#6366f1" strokeWidth={3} strokeDasharray="3 3" dot={false} />
               )}
               {showForecast && !isPercent && (
                  <Line yAxisId="left" type="monotone" dataKey="forecast" name="Tendance (Reg. Lin.)" stroke="#6366f1" strokeDasharray="5 5" strokeWidth={2} dot={false} />
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
            <ComposedChart data={snapshotData.data} margin={{ top: 20, right: 10, left: 0, bottom: 0 }} stackOffset={isPercent ? 'expand' : undefined}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} fontSize={11} height={60} stroke="#94a3b8" />
              <YAxis yAxisId="left" stroke="#94a3b8" fontSize={12} tickFormatter={isPercent ? (val) => `${(val * 100).toFixed(0)}%` : undefined} />
              {metric2 !== 'none' && !isStacked && <YAxis yAxisId="right" orientation="right" stroke="#6366f1" fontSize={12} />}
              <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={tooltipStyle} formatter={(val: any) => isPercent ? `${(val * 100).toFixed(1)}%` : formatChartValue(val, { valFormatting: { unit: customUnit } } as any)} />

              {segment ? (
                  snapshotData.series.map((s, idx) => (
                      <Bar key={s} yAxisId="left" dataKey={s} name={s} stackId={isStacked ? 'a' : undefined} fill={chartColors[idx % chartColors.length]} radius={!isStacked ? [4, 4, 0, 0] : 0} />
                  ))
              ) : (
                  <Bar yAxisId="left" dataKey="value" name={metric === 'sum' ? `Somme (${valueField})` : (metric === 'distinct' ? 'Distinct' : 'Nombre')} radius={[4, 4, 0, 0]}>
                    {snapshotData.data.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Bar>
              )}

              {metric2 !== 'none' && !isStacked && (
                 <Line yAxisId="right" type="monotone" dataKey="value2" name={metric2 === 'sum' ? `Somme (${valueField2})` : (metric2 === 'distinct' ? 'Distinct (2)' : 'Nombre (2)')} stroke="#6366f1" strokeWidth={3} dot={{ r: 4, fill: '#6366f1' }} />
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
            <BarChart data={snapshotData.data} layout="vertical" margin={{ top: 20, right: 30, left: 10, bottom: 5 }} stackOffset={isPercent ? 'expand' : undefined}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" stroke="#94a3b8" fontSize={12} tickFormatter={isPercent ? (val) => `${(val * 100).toFixed(0)}%` : undefined} />
              <YAxis dataKey="name" type="category" width={140} tick={{fontSize: 11}} stroke="#94a3b8" />
              <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={tooltipStyle} formatter={(val: any) => isPercent ? `${(val * 100).toFixed(1)}%` : formatChartValue(val, { valFormatting: { unit: customUnit } } as any)} />

              {segment ? (
                  snapshotData.series.map((s, idx) => (
                      <Bar key={s} dataKey={s} name={s} stackId={isStacked ? 'a' : undefined} fill={chartColors[idx % chartColors.length]} radius={!isStacked ? [0, 4, 4, 0] : 0} />
                  ))
              ) : (
                  <Bar dataKey="value" name={metric === 'sum' ? 'Somme' : 'Volume'} radius={[0, 4, 4, 0]}>
                    {snapshotData.data.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Bar>
              )}
              {(metric2 !== 'none' || segment) && <Legend verticalAlign="top" />}
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
                innerRadius={chartType === 'donut' ? 60 : 0}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                stroke="#fff"
                strokeWidth={2}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
              >
                {snapshotData.data.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(val: any) => formatChartValue(val, { valFormatting: { unit: customUnit } } as any)} />
              <Legend verticalAlign="bottom" height={36} wrapperStyle={{fontSize: '12px', color: '#64748b'}} />
            </PieChart>
          </ResponsiveContainer>
        );
      case 'area':
      case 'stacked-area': {
        const isStacked = chartType === 'stacked-area';
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={snapshotData.data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{fontSize: 11}} stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip contentStyle={tooltipStyle} formatter={(val: any) => formatChartValue(val, { valFormatting: { unit: customUnit } } as any)} />
              {segment ? (
                  snapshotData.series.map((s, idx) => (
                      <Area key={s} type="monotone" dataKey={s} name={s} stackId={isStacked ? 'a' : undefined} stroke={chartColors[idx % chartColors.length]} fill={chartColors[idx % chartColors.length]} fillOpacity={0.4} />
                  ))
              ) : (
                  <Area type="monotone" dataKey={isCumulative ? "cumulative" : "value"} stroke="#60a5fa" fill="#60a5fa" fillOpacity={0.2} />
              )}
              {segment && <Legend verticalAlign="top" />}
            </AreaChart>
          </ResponsiveContainer>
        );
      }
      case 'radar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={snapshotData.data}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="name" tick={{fontSize: 11, fill: '#64748b'}} />
              <PolarRadiusAxis stroke="#cbd5e1" />
              {segment ? (
                  snapshotData.series.map((s, idx) => (
                      <Radar key={s} name={s} dataKey={s} stroke={chartColors[idx % chartColors.length]} fill={chartColors[idx % chartColors.length]} fillOpacity={0.4} />
                  ))
              ) : (
                  <Radar name={metric === 'sum' ? 'Somme' : 'Volume'} dataKey="value" stroke="#60a5fa" fill="#60a5fa" fillOpacity={0.3} />
              )}
              <Tooltip contentStyle={tooltipStyle} formatter={(val: any) => formatChartValue(val, { valFormatting: { unit: customUnit } } as any)} />
              {segment && <Legend verticalAlign="top" />}
            </RadarChart>
          </ResponsiveContainer>
        );
      case 'treemap':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <Treemap
              data={snapshotData.data}
              dataKey="size"
              aspectRatio={4 / 3}
              stroke="#fff"
              fill="#8884d8"
              content={<TreemapContent colors={chartColors} />}
            >
              <Tooltip contentStyle={tooltipStyle} formatter={(val: any) => formatChartValue(val, { valFormatting: { unit: customUnit } } as any)} />
            </Treemap>
          </ResponsiveContainer>
        );
      case 'sunburst':
        return (
          <ResponsiveContainer width="100%" height="100%">
             <PieChart>
                <Pie
                   data={snapshotData.data}
                   dataKey="value"
                   cx="50%"
                   cy="50%"
                   innerRadius={0}
                   outerRadius={60}
                   fill="#8884d8"
                >
                   {snapshotData.data.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                   ))}
                </Pie>
                {segment && (
                   <Pie
                      data={snapshotData.data.flatMap((d: any) => snapshotData.series.map(s => ({ name: `${d.name} - ${s}`, value: d[s] || 0, parentColor: chartColors[snapshotData.data.indexOf(d) % chartColors.length] })))}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                   >
                      {snapshotData.data.flatMap((d: any, idx: number) => snapshotData.series.map((s, sIdx) => (
                         <Cell key={`cell-outer-${idx}-${sIdx}`} fill={chartColors[sIdx % chartColors.length]} />
                      )))}
                   </Pie>
                )}
                <Tooltip contentStyle={tooltipStyle} />
             </PieChart>
          </ResponsiveContainer>
        );
      case 'radial':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart cx="50%" cy="50%" innerRadius="10%" outerRadius="80%" barSize={10} data={snapshotData.data}>
              <RadialBar
                label={{ position: 'insideStart', fill: '#64748b', fontSize: 10 }}
                background
                dataKey="value"
              >
                {snapshotData.data.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                ))}
              </RadialBar>
              <Tooltip contentStyle={tooltipStyle} formatter={(val: any) => formatChartValue(val, { valFormatting: { unit: customUnit } } as any)} />
              <Legend iconSize={10} layout="vertical" verticalAlign="middle" wrapperStyle={{right: 0, top: 0, bottom: 0, width: 140}} />
            </RadialBarChart>
          </ResponsiveContainer>
        );
      case 'funnel':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <FunnelChart>
              <Tooltip contentStyle={tooltipStyle} formatter={(val: any) => formatChartValue(val, { valFormatting: { unit: customUnit } } as any)} />
              <Funnel
                dataKey="value"
                data={snapshotData.data}
                isAnimationActive
              >
                <LabelList position="right" fill="#64748b" stroke="none" dataKey="name" fontSize={11} />
                {snapshotData.data.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                ))}
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        );
      case 'kpi':
        return (
           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto h-full p-2">
              {snapshotData.data.map((item: any, idx: number) => (
                <div key={idx} className="bg-slate-50 rounded-lg p-4 border border-slate-100 flex flex-col items-center justify-center text-center">
                   <div className="text-xs text-slate-500 uppercase font-bold truncate w-full mb-2" title={item.name}>{item.name}</div>
                   <div className="text-2xl font-bold text-slate-700">{item.value.toLocaleString()}</div>
                   {isCumulative && <div className="text-xs text-slate-400 mt-1">Cumul: {item.cumulative.toLocaleString()}</div>}
                </div>
              ))}
           </div>
        );
      default:
        return null;
    }
  };

  if (!currentDataset) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center bg-slate-50 rounded-lg border border-dashed border-slate-300">
        <Database className="w-12 h-12 text-slate-300 mb-4" />
        <p className="text-slate-600 font-medium">Aucun tableau sélectionné</p>
        <div className="mt-4">
            <select
                className="appearance-none bg-white border border-slate-300 text-slate-700 text-sm rounded-md py-2 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
                value=""
                onChange={(e) => {
                    if (e.target.value === '__NEW__') navigate('/import');
                    else switchDataset(e.target.value);
                }}
            >
                <option value="" disabled>Choisir une typologie</option>
                {datasets.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                ))}
                <option disabled>──────────</option>
                <option value="__NEW__">+ Nouvelle typologie...</option>
            </select>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] gap-4 relative">
      
      {/* HEADER & MODE SELECTOR */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center bg-white p-4 rounded-lg border border-slate-200 shadow-sm shrink-0 gap-4">
        <div className="flex items-center gap-2">
           <Settings2 className="w-6 h-6 text-slate-500" />
           <div>
              <h2 className="text-xl font-bold text-slate-800">Studio d'Analyse</h2>
              {/* DATASET SELECTOR */}
              <div className="mt-1">
                  <select
                        className="appearance-none bg-white border-0 text-slate-500 text-xs font-medium py-0 pr-6 pl-0 focus:outline-none cursor-pointer hover:text-slate-700"
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
           </div>
        </div>

        {/* Center Toggle */}
        <div className="flex p-1 bg-slate-100 rounded-lg self-center">
           <button
              onClick={() => setMode('snapshot')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${mode === 'snapshot' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
           >
              Analyse Instantanée
           </button>
           <button
              onClick={() => setMode('trend')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${mode === 'trend' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
           >
              Évolution Temporelle
           </button>
        </div>
        
        {/* Right Controls */}
        <div className="flex items-center gap-2 w-full xl:w-auto">
             
             {/* Load Saved Views */}
             <div className="relative">
                <select
                    className="bg-slate-50 border border-slate-300 text-slate-700 text-sm rounded-md focus:ring-brand-500 focus:border-brand-500 block p-2 pr-8 min-w-[130px]"
                    onChange={(e) => { if (e.target.value) handleLoadAnalysis(e.target.value); e.target.value = ""; }}
                    defaultValue=""
                >
                    <option value="" disabled>Vues sauvegardées...</option>
                    {availableAnalyses.length === 0 && <option disabled>Aucune vue.</option>}
                    {availableAnalyses.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
             </div>

             {/* Save View Button */}
             {!isSaving ? (
                 <button onClick={() => setIsSaving(true)} className="p-2 text-slate-500 hover:text-brand-600 border border-slate-300 rounded-md bg-white hover:bg-slate-50" title="Enregistrer cette vue">
                    <Save className="w-5 h-5" />
                 </button>
             ) : (
                 <div className="flex items-center gap-1 animate-in fade-in bg-white border border-brand-300 rounded-md p-0.5">
                    <input type="text" className="p-1.5 text-xs border-none focus:ring-0 w-32 bg-transparent text-slate-900" placeholder="Nom..." value={analysisName} onChange={e => setAnalysisName(e.target.value)} autoFocus />
                    <button onClick={handleSaveAnalysis} className="p-1 bg-brand-600 text-white rounded hover:bg-brand-700"><Check className="w-3 h-3" /></button>
                    <button onClick={() => setIsSaving(false)} className="p-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-300"><X className="w-3 h-3" /></button>
                 </div>
             )}

             <div className="h-6 w-px bg-slate-300 mx-1"></div>

             {/* EXPORT BUTTON */}
             <div className="relative">
                <button
                   onClick={() => setShowExportMenu(!showExportMenu)}
                   className="p-2 text-slate-500 hover:text-brand-600 border border-slate-300 rounded-md bg-white hover:bg-slate-50 flex items-center gap-1"
                   title="Exporter"
                >
                   <FileDown className="w-5 h-5" />
                </button>
                {showExportMenu && (
                   <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1">
                      <div className="px-3 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Format PDF</div>
                      <button 
                         onClick={() => handleExport('pdf', 'A4')}
                         className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                         title="Redimensionne le contenu pour tenir sur une page A4"
                      >
                         <FileType className="w-4 h-4 text-red-500" /> PDF (A4 ajusté)
                      </button>
                      <button 
                         onClick={() => handleExport('pdf', 'adaptive')}
                         className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                         title="Adapte la hauteur de la page au contenu (tout sur une page)"
                      >
                         <Printer className="w-4 h-4 text-red-500" /> PDF (Hauteur adaptative)
                      </button>
                      <div className="border-t border-slate-100 my-1"></div>
                      <div className="px-3 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Format Web & Image</div>
                      <button 
                         onClick={() => handleExport('html')}
                         className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                      >
                         <FileType className="w-4 h-4 text-orange-500" /> Export HTML
                      </button>
                      <button
                         onClick={() => handleExport('png')}
                         className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                      >
                         <FileType className="w-4 h-4 text-blue-500" /> Image PNG
                      </button>
                      <div className="border-t border-slate-100 my-1"></div>
                      <div className="px-3 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Format Données</div>
                      <button
                         onClick={() => handleExport('xlsx')}
                         className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                      >
                         <FileType className="w-4 h-4 text-green-600" /> Excel (XLSX)
                      </button>
                   </div>
                )}
             </div>

             <button
                onClick={handleExportToDashboard}
                className="p-2 text-slate-500 hover:text-brand-600 border border-slate-300 rounded-md bg-white hover:bg-slate-50"
                title="Ajouter au tableau de bord"
            >
                <LayoutDashboard className="w-5 h-5" />
            </button>

           {mode === 'snapshot' ? (
              <div className="flex items-center gap-2 w-full xl:w-auto ml-2">
                 <select 
                    className="flex-1 sm:flex-none bg-slate-50 border border-slate-300 text-slate-700 text-sm rounded-md focus:ring-brand-500 focus:border-brand-500 block p-2 min-w-[200px]"
                    value={selectedBatchId}
                    onChange={(e) => setSelectedBatchId(e.target.value)}
                  >
                    {batches.map(b => <option key={b.id} value={b.id}>{formatDateFr(b.date)} ({b.rows.length} lignes)</option>)}
                 </select>
              </div>
           ) : (
              <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto p-1 ml-2">
                 <CalendarRange className="w-4 h-4 text-slate-500" />
                 <input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)}
                    className="text-sm border border-slate-300 rounded p-1.5 bg-slate-50 text-slate-700"
                 />
                 <span className="text-slate-400 text-sm">à</span>
                 <input 
                    type="date" 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)}
                    className="text-sm border border-slate-300 rounded p-1.5 bg-slate-50 text-slate-700"
                 />
              </div>
           )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
        
        {/* SIDEBAR CONTROLS */}
        <div className="lg:w-72 flex-shrink-0 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col overflow-hidden">
           <div className="p-4 border-b border-slate-100 bg-slate-50 font-semibold text-slate-700 flex items-center justify-between">
              <span>Configuration</span>
              <button 
                onClick={() => setFilters([])} 
                className="text-xs text-brand-600 hover:underline disabled:text-slate-400"
                disabled={filters.length === 0}
              >
                Reset Filtres
              </button>
           </div>
           
           <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar bg-white">
              
              {/* SECTION 1: DONNEES & METRIQUES */}
              <div className="space-y-4">
                 <div className="flex items-center gap-2 mb-2">
                    <Database className="w-4 h-4 text-brand-600" />
                    <span className="text-sm font-black text-slate-800 uppercase tracking-tighter">1. Données & Métriques</span>
                 </div>

                 <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">
                       {mode === 'snapshot' ? 'Axe Analyse (X)' : 'Champ de données à suivre'}
                    </label>
                    <select
                       className="w-full p-2 bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded focus:ring-2 focus:ring-brand-500 shadow-sm"
                       value={dimension}
                       onChange={(e) => setDimension(e.target.value)}
                    >
                       {fields.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                 </div>

                 <div className="space-y-3">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                        <label className="block text-[10px] font-black text-slate-600 uppercase">Métrique Principale (Y1)</label>
                        <div className="grid grid-cols-3 gap-1">
                           <button
                              onClick={() => setMetric('count')}
                              className={`py-1.5 text-[10px] font-bold rounded border transition-all ${metric === 'count' ? 'bg-brand-600 border-brand-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-500 hover:border-brand-300'}`}
                           >
                              Compte
                           </button>
                           <button
                              onClick={() => setMetric('distinct')}
                              className={`py-1.5 text-[10px] font-bold rounded border transition-all ${metric === 'distinct' ? 'bg-brand-600 border-brand-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-500 hover:border-brand-300'}`}
                           >
                              Distinct
                           </button>
                           <button
                              onClick={() => setMetric('sum')}
                              className={`py-1.5 text-[10px] font-bold rounded border transition-all ${metric === 'sum' ? 'bg-brand-600 border-brand-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-500 hover:border-brand-300'}`}
                           >
                              Somme
                           </button>
                        </div>

                        {metric === 'sum' && (
                           <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                              <label className="block text-[9px] font-black text-slate-500 mb-1 uppercase">Champ de données à afficher (Y1) :</label>
                              {numericFields.length > 0 ? (
                                 <select
                                    className="w-full p-1.5 bg-white border border-slate-300 text-slate-800 text-xs rounded focus:ring-brand-500 shadow-sm"
                                    value={valueField}
                                    onChange={(e) => setValueField(e.target.value)}
                                 >
                                    {numericFields.map(f => {
                                       const unit = currentDataset?.fieldConfigs?.[f]?.unit;
                                       return <option key={f} value={f}>{f} {unit ? `(${unit})` : ''}</option>
                                    })}
                                 </select>
                              ) : (
                                 <p className="text-[10px] text-red-500 italic">Aucun champ numérique.</p>
                              )}
                           </div>
                        )}
                    </div>

                    <div className="p-3 bg-brand-50/30 rounded-lg border border-brand-100 space-y-3">
                        <div className="flex justify-between items-center">
                           <label className="block text-[10px] font-black text-brand-700 uppercase">Métrique Secondaire (Y2)</label>
                           {metric2 !== 'none' && (
                              <button onClick={() => setMetric2('none')} className="text-[9px] font-bold text-brand-600 hover:underline uppercase">Masquer</button>
                           )}
                        </div>
                        <div className="grid grid-cols-4 gap-1">
                           {[
                              { id: 'none', label: 'Off' },
                              { id: 'count', label: 'Cpt' },
                              { id: 'distinct', label: 'Dist' },
                              { id: 'sum', label: 'Σ' }
                           ].map(m => (
                              <button
                                 key={m.id}
                                 onClick={() => setMetric2(m.id as any)}
                                 className={`py-1 text-[10px] font-black rounded border transition-all ${metric2 === m.id ? 'bg-brand-600 border-brand-600 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-brand-300'}`}
                              >
                                 {m.label}
                              </button>
                           ))}
                        </div>

                        {metric2 === 'sum' && (
                           <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                              <label className="block text-[9px] font-black text-brand-600 mb-1 uppercase">Champ de données à afficher (Y2) :</label>
                              {numericFields.length > 0 ? (
                                 <select
                                    className="w-full p-1.5 bg-white border border-brand-200 text-slate-800 text-xs rounded focus:ring-brand-500 shadow-sm"
                                    value={valueField2}
                                    onChange={(e) => setValueField2(e.target.value)}
                                 >
                                    {numericFields.map(f => {
                                       const unit = currentDataset?.fieldConfigs?.[f]?.unit;
                                       return <option key={f} value={f}>{f} {unit ? `(${unit})` : ''}</option>
                                    })}
                                 </select>
                              ) : (
                                 <p className="text-[10px] text-red-500 italic">Aucun champ numérique.</p>
                              )}
                           </div>
                        )}
                    </div>
                 </div>
              </div>

              {/* SECTION 2: FILTRES */}
              <div className="space-y-4">
                 <div className="flex items-center gap-2 mb-2">
                    <Filter className="w-4 h-4 text-brand-600" />
                    <span className="text-sm font-black text-slate-800 uppercase tracking-tighter">2. Filtrage avancé ({filters.length})</span>
                 </div>
                 
                 <div className="space-y-3 mb-3">
                    {filters.map((filter, idx) => (
                       <div key={idx} className="bg-slate-50 p-2 rounded border border-slate-200 text-xs space-y-2 relative group">
                          <button onClick={() => removeFilter(idx)} className="absolute top-1 right-1 text-slate-400 hover:text-red-500">
                             <X className="w-3 h-3" />
                          </button>
                          
                          {/* Field Selector */}
                          <select 
                             className="w-full bg-white border border-slate-200 rounded px-1 py-1"
                             value={filter.field}
                             onChange={(e) => updateFilter(idx, { field: e.target.value })}
                          >
                             {fields.map(f => <option key={f} value={f}>{f}</option>)}
                          </select>

                          {/* Operator Selector */}
                          <select 
                             className="w-full bg-white border border-slate-200 rounded px-1 py-1 font-medium text-indigo-700"
                             value={filter.operator || 'in'}
                             onChange={(e) => updateFilter(idx, { operator: e.target.value as any })}
                          >
                             <option value="in">Est égal à / Dans</option>
                             <option value="starts_with">Commence par</option>
                             <option value="contains">Contient</option>
                             <option value="gt">Supérieur à (&gt;)</option>
                             <option value="lt">Inférieur à (&lt;)</option>
                             <option value="eq">Égal à (=)</option>
                          </select>
                          
                          {/* Value Input (Dynamic based on operator) */}
                          {(!filter.operator || filter.operator === 'in') ? (
                              <MultiSelect 
                                 options={getDistinctValuesForField(filter.field)}
                                 selected={Array.isArray(filter.value) ? filter.value : []}
                                 onChange={(newValues) => updateFilter(idx, { value: newValues })}
                                 placeholder="Sélectionner valeurs..."
                              />
                          ) : (
                              <input 
                                type={['gt', 'lt'].includes(filter.operator) ? "number" : "text"}
                                className="w-full bg-white border border-slate-200 rounded px-2 py-1"
                                placeholder="Valeur..."
                                value={filter.value}
                                onChange={(e) => updateFilter(idx, { value: e.target.value })}
                              />
                          )}
                       </div>
                    ))}
                 </div>
                 <button onClick={addFilter} className="text-xs text-brand-600 flex items-center hover:text-brand-800 font-medium border border-dashed border-brand-300 rounded w-full justify-center py-1.5 hover:bg-brand-50">
                    <Filter className="w-3 h-3 mr-1" /> Ajouter un filtre
                 </button>
              </div>

              {/* SECTION 3: ANALYSE & GROUPEMENT */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                 <div className="flex items-center gap-2 mb-2">
                    <TableIcon className="w-4 h-4 text-brand-600" />
                    <span className="text-sm font-black text-slate-800 uppercase tracking-tighter">3. Analyse & Groupement</span>
                 </div>

                 {/* Sort & Limit */}
                 <div className="space-y-3">
                    <div className="flex flex-col gap-2">
                       <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Limiter au Top N :</label>
                          <input
                             type="number"
                             className="w-16 text-xs border border-slate-200 rounded p-1 bg-slate-50 text-right font-bold"
                             value={limit}
                             onChange={(e) => setLimit(Number(e.target.value))}
                          />
                       </div>

                       {mode === 'snapshot' && (
                          <div className="flex items-center justify-between">
                             <label className="text-[10px] font-bold text-slate-500 uppercase">Tri :</label>
                             <select
                                className="text-xs border border-slate-200 rounded p-1 bg-slate-50 font-medium"
                                value={sortOrder}
                                onChange={(e) => setSortOrder(e.target.value as any)}
                             >
                                <option value="desc">Valeur ↓</option>
                                <option value="asc">Valeur ↑</option>
                                <option value="alpha">Alphabétique</option>
                             </select>
                          </div>
                       )}
                    </div>
                 </div>

                 {/* Toggles */}
                 <div className="space-y-2">
                    {mode === 'snapshot' && (
                       <label className="flex items-center gap-2 cursor-pointer">
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${isCumulative ? 'bg-brand-500 border-brand-500 text-white' : 'border-slate-300 bg-white'}`}>
                             {isCumulative && <Check className="w-3 h-3" />}
                          </div>
                          <input type="checkbox" className="hidden" checked={isCumulative} onChange={() => setIsCumulative(!isCumulative)} />
                          <span className="text-xs text-slate-700">Mode Cumulatif</span>
                       </label>
                    )}

                    <label className="flex items-center gap-2 cursor-pointer">
                       <div className={`w-4 h-4 rounded border flex items-center justify-center ${showTable ? 'bg-brand-500 border-brand-500 text-white' : 'border-slate-300 bg-white'}`}>
                          {showTable && <Check className="w-3 h-3" />}
                       </div>
                       <input type="checkbox" className="hidden" checked={showTable} onChange={() => setShowTable(!showTable)} />
                       <span className="text-xs text-slate-700">Afficher Tableau</span>
                    </label>

                    {mode === 'trend' && (
                       <label className="flex items-center gap-2 cursor-pointer animate-in fade-in">
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${showForecast ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-300 bg-white'}`}>
                             {showForecast && <Check className="w-3 h-3" />}
                          </div>
                          <input type="checkbox" className="hidden" checked={showForecast} onChange={() => setShowForecast(!showForecast)} />
                          <span className="text-xs text-indigo-700 font-bold">Projection (Tendance)</span>
                       </label>
                    )}
                 </div>

                 {/* Segment (Snapshot only) */}
                 {mode === 'snapshot' && (
                    <div className="space-y-1">
                       <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                          Sous-Groupement (Séries)
                       </label>
                       <select 
                          className="w-full p-2 bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded focus:ring-brand-500"
                          value={segment}
                          onChange={(e) => setSegment(e.target.value)}
                       >
                          <option value="">-- Aucun --</option>
                          {fields.filter(f => f !== dimension).map(f => <option key={f} value={f}>{f}</option>)}
                       </select>
                    </div>
                 )}
              </div>

              {/* SECTION 4: VISUALISATION & STYLE */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                 <div className="flex items-center gap-2 mb-2">
                    <LayoutGrid className="w-4 h-4 text-brand-600" />
                    <span className="text-sm font-black text-slate-800 uppercase tracking-tighter">4. Style & Rendu</span>
                 </div>

                 <div className="space-y-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2 mb-2">
                       <Settings2 className="w-4 h-4 text-brand-600" />
                       <span className="text-sm font-black text-slate-800 uppercase tracking-tighter">5. Titre & Unité</span>
                    </div>
                    <div className="space-y-3">
                       <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Titre du graphique</label>
                          <input
                             type="text"
                             className="w-full p-2 bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded focus:ring-2 focus:ring-brand-500 shadow-sm"
                             placeholder="Auto..."
                             value={chartTitle}
                             onChange={(e) => setChartTitle(e.target.value)}
                          />
                       </div>
                       <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Unité des valeurs</label>
                          <input
                             type="text"
                             className="w-full p-2 bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded focus:ring-2 focus:ring-brand-500 shadow-sm"
                             placeholder="Ex: €, k€, %..."
                             value={customUnit}
                             onChange={(e) => setCustomUnit(e.target.value)}
                          />
                       </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-4 gap-1">
                    {mode === 'snapshot' ? (
                       <>
                          {[
                             { id: 'column', icon: BarChart3, label: 'Histo' },
                             { id: 'bar', icon: BarChart3, label: 'Barres', rotate: 90 },
                             { id: 'stacked-column', icon: BarChart3, label: 'Histo Emp' },
                             { id: 'stacked-bar', icon: BarChart3, label: 'Barres Emp', rotate: 90 },
                             { id: 'percent-column', icon: BarChart3, label: 'Histo 100%' },
                             { id: 'percent-bar', icon: BarChart3, label: 'Barres 100%', rotate: 90 },
                             { id: 'pie', icon: PieIcon, label: 'Camem.' },
                             { id: 'donut', icon: PieIcon, label: 'Donut' },
                             { id: 'line', icon: Activity, label: 'Ligne' },
                             { id: 'area', icon: TrendingUp, label: 'Aire' },
                             { id: 'stacked-area', icon: TrendingUp, label: 'Aire Emp' },
                             { id: 'radar', icon: RadarIcon, label: 'Radar' },
                             { id: 'treemap', icon: LayoutGrid, label: 'Carte' },
                             { id: 'sunburst', icon: PieIcon, label: 'Sunburst' },
                             { id: 'kpi', icon: Activity, label: 'KPI' },
                          ].map((type) => {
                             const Icon = type.icon;
                             return (
                                <button
                                   key={type.id}
                                   onClick={() => setChartType(type.id as ChartType)}
                                   className={`flex flex-col items-center justify-center p-1.5 rounded border transition-all ${chartType === type.id ? 'bg-brand-600 border-brand-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-400 hover:border-brand-300'}`}
                                   title={type.label}
                                >
                                   <Icon className={`w-4 h-4 ${type.rotate ? 'transform rotate-90' : ''}`} />
                                   <span className="text-[8px] font-bold uppercase mt-1 truncate w-full text-center">{type.label}</span>
                                </button>
                             )
                          })}
                       </>
                    ) : (
                       <>
                           {[
                              { id: 'line', icon: Activity, label: 'Lignes' },
                              { id: 'area', icon: TrendingUp, label: 'Aires' },
                              { id: 'stacked-area', icon: TrendingUp, label: 'Aires Emp.' },
                              { id: 'column', icon: BarChart3, label: 'Histo' },
                              { id: 'stacked-column', icon: BarChart3, label: 'Histo Emp.' },
                              { id: 'percent-column', icon: BarChart3, label: 'Histo 100%' },
                           ].map((type) => {
                              const Icon = type.icon;
                              return (
                                 <button
                                    key={type.id}
                                    onClick={() => setChartType(type.id as ChartType)}
                                    className={`flex flex-col items-center justify-center p-1.5 rounded border transition-all ${chartType === type.id ? 'bg-brand-600 border-brand-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-400 hover:border-brand-300'}`}
                                    title={type.label}
                                 >
                                    <Icon className="w-4 h-4" />
                                    <span className="text-[8px] font-bold uppercase mt-1 truncate w-full text-center">{type.label}</span>
                                 </button>
                              )
                           })}
                       </>
                    )}
                 </div>

                 {/* COLORS */}
                 <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-3">
                    <label className="text-[10px] font-black text-slate-600 uppercase block">Schéma de Couleurs</label>

                    <div className="grid grid-cols-3 gap-1">
                        {['multi', 'single', 'gradient'].map(m => (
                           <button
                              key={m}
                              onClick={() => setColorMode(m as ColorMode)}
                              className={`py-1 text-[9px] font-bold rounded border uppercase ${colorMode === m ? 'bg-white border-slate-400 text-slate-900 shadow-sm' : 'bg-transparent border-slate-200 text-slate-400'}`}
                           >
                              {m === 'multi' ? 'Multi' : m === 'single' ? 'Unique' : 'Dégradé'}
                           </button>
                        ))}
                    </div>

                    {colorMode === 'multi' && (
                       <select
                          value={colorPalette}
                          onChange={(e) => setColorPalette(e.target.value as ColorPalette)}
                          className="w-full text-xs border border-slate-200 rounded p-1.5 bg-white animate-in fade-in"
                       >
                          <option value="default">Palette Défaut</option>
                          <option value="pastel">Palette Pastel</option>
                          <option value="vibrant">Palette Vibrante</option>
                       </select>
                    )}

                    {colorMode === 'single' && (
                       <div className="flex items-center gap-2 animate-in fade-in">
                          <input
                             type="color"
                             value={singleColor}
                             onChange={(e) => setSingleColor(e.target.value)}
                             className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                          />
                          <span className="text-xs text-slate-600 font-mono font-bold uppercase">{singleColor}</span>
                       </div>
                    )}

                    {colorMode === 'gradient' && (
                       <div className="grid grid-cols-2 gap-2 animate-in fade-in">
                          <div className="flex items-center gap-2 bg-white p-1 rounded border border-slate-200">
                             <input
                                type="color"
                                value={gradientStart}
                                onChange={(e) => setGradientStart(e.target.value)}
                                className="w-6 h-6 rounded cursor-pointer border-0 p-0"
                             />
                             <span className="text-[9px] font-bold text-slate-500 uppercase">{gradientStart}</span>
                          </div>
                          <div className="flex items-center gap-2 bg-white p-1 rounded border border-slate-200">
                             <input
                                type="color"
                                value={gradientEnd}
                                onChange={(e) => setGradientEnd(e.target.value)}
                                className="w-6 h-6 rounded cursor-pointer border-0 p-0"
                             />
                             <span className="text-[9px] font-bold text-slate-500 uppercase">{gradientEnd}</span>
                          </div>
                       </div>
                    )}
                 </div>
              </div>
           </div>
        </div>

        {/* MAIN AREA */}
        <div className="flex-1 flex flex-col gap-4 min-w-0 min-h-0">
           
           {/* Insight Panel */}
           <div className="bg-white border border-slate-200 rounded-lg p-3 flex items-start gap-3 shrink-0 shadow-sm">
              <div className="bg-slate-100 p-1.5 rounded-full text-slate-500 mt-0.5">
                 <Activity className="w-4 h-4" />
              </div>
              <div>
                 <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Insight</h4>
                 <p className="text-sm text-slate-600 leading-relaxed">
                    {insightText}
                 </p>
              </div>
           </div>

           {/* Chart Container */}
           <div id="analytics-export-container" className="flex-1 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col relative overflow-hidden min-h-[300px]">
              <div className="p-4 border-b border-slate-100 text-center bg-white z-10 flex justify-between items-center">
                 <h3 className="text-base font-bold text-slate-700 flex items-center gap-2">
                    {showTable ? <TableIcon className="w-4 h-4" /> : (mode === 'trend' ? <Activity className="w-4 h-4" /> : <BarChart3 className="w-4 h-4" />)}
                    {chartTitle ? (
                       <span>{chartTitle}</span>
                    ) : (
                       mode === 'snapshot' ? (
                           <span>Analyse : {dimension} <span className="text-slate-400">|</span> {metric === 'sum' ? `Somme de ${valueField}` : 'Nombre'} {metric2 !== 'none' && <span className="text-brand-600">& {metric2 === 'sum' ? `Somme de ${valueField2}` : 'Nombre (2)'}</span>}</span>
                       ) : (
                           <span>Évolution : {dimension} <span className="text-slate-400">|</span> {metric === 'sum' ? `Somme de ${valueField}` : 'Nombre'} {metric2 !== 'none' && <span className="text-brand-600">& {metric2 === 'sum' ? `Somme de ${valueField2}` : 'Nombre (2)'}</span>}</span>
                       )
                    )}
                 </h3>
                 {(segment && mode === 'snapshot') ? (
                    <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500">par {segment}</span>
                 ) : customUnit ? (
                    <span className="text-xs bg-brand-50 text-brand-600 px-2 py-1 rounded font-bold uppercase">{customUnit}</span>
                 ) : null}
              </div>
              
              <div className="flex-1 w-full min-h-0 p-4 relative">
                 {renderVisuals()}
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};
