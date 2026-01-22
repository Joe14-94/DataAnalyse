
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import { formatDateFr, parseSmartNumber, exportView, calculateLinearRegression } from '../utils';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, Cell,
  PieChart, Pie, AreaChart, Area, Treemap, LineChart, Line, ComposedChart
} from 'recharts';
import { 
  BarChart3, PieChart as PieIcon, Activity, Radar as RadarIcon, 
  LayoutGrid, TrendingUp, Settings2, Database,
  Filter, Table as TableIcon, Check, X, CalendarRange, Calculator, ChevronDown,
  LayoutDashboard, Save, FileDown, FileType, Printer
} from 'lucide-react';
import { FieldConfig, ChartType as WidgetChartType, FilterRule } from '../types';

type ChartType = 'bar' | 'column' | 'pie' | 'area' | 'radar' | 'treemap' | 'kpi' | 'line';
type AnalysisMode = 'snapshot' | 'trend';
type MetricType = 'count' | 'distinct' | 'sum';

// --- Treemap Content ---
const COLORS = ['#64748b', '#60a5fa', '#34d399', '#f87171', '#a78bfa', '#fbbf24', '#22d3ee', '#f472b6', '#a3e635'];

const TreemapContent = (props: any) => {
  const { x, y, width, height, name, index } = props;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={COLORS[index % COLORS.length]} stroke="#fff" />
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
        className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-left text-xs flex items-center justify-between hover:border-blue-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
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
             <span className="text-[10px] font-bold text-slate-500 uppercase">Options</span>
             <button onClick={handleSelectAll} className="text-[10px] text-blue-600 hover:underline">
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
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3 w-3 mr-2"
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
  const { batches, currentDataset, addDashboardWidget, savedAnalyses, saveAnalysis, companyLogo } = useData();
  const fields = currentDataset ? currentDataset.fields : [];

  const [mode, setMode] = useState<AnalysisMode>('snapshot');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [dimension, setDimension] = useState<string>(''); 
  const [metric, setMetric] = useState<MetricType>('count');
  const [valueField, setValueField] = useState<string>(''); 
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

  useEffect(() => {
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
  }, [batches, fields, selectedBatchId, dimension, startDate, endDate]);

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
            dimension, metric, valueField, segment, chartType, limit,
            sortOrder, isCumulative, filters, showForecast
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
      
      if (c.mode) setMode(c.mode);
      if (c.dimension) setDimension(c.dimension);
      if (c.metric) setMetric(c.metric);
      if (c.valueField) setValueField(c.valueField);
      if (c.segment) setSegment(c.segment);
      if (c.chartType) setChartType(c.chartType);
      if (c.limit) setLimit(c.limit);
      if (c.sortOrder) setSortOrder(c.sortOrder);
      if (c.isCumulative !== undefined) setIsCumulative(c.isCumulative);
      if (c.showForecast !== undefined) setShowForecast(c.showForecast);
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

   const handleExport = (format: 'pdf' | 'html', pdfMode: 'A4' | 'adaptive' = 'adaptive') => {
      setShowExportMenu(false);
      const title = `Analyse ${dimension} - ${metric === 'sum' ? 'Somme' : 'Compte'}`;
      exportView(format, 'analytics-export-container', title, companyLogo, pdfMode);
   };

   const availableAnalyses = savedAnalyses.filter(a => a.type === 'analytics' && a.datasetId === currentDataset?.id);

  const snapshotData = useMemo(() => {
    if (mode !== 'snapshot' || !currentBatch || !dimension) return [];

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
          if (f.operator === 'starts_with') return strRowVal.startsWith(strFilterVal);
          if (f.operator === 'contains') return strRowVal.includes(strFilterVal);
          if (f.operator === 'eq') return strRowVal === strFilterVal;
          if (f.operator === 'gt') return parseSmartNumber(rowVal) > parseSmartNumber(f.value);
          if (f.operator === 'lt') return parseSmartNumber(rowVal) < parseSmartNumber(f.value);
          return true;
       });
    });

    const agg: Record<string, any> = {};
    filteredRows.forEach((row: any) => {
      const dimVal = String(row[dimension] || 'Non défini');
      if (!agg[dimVal]) agg[dimVal] = { name: dimVal, count: 0, distinctSet: new Set(), sum: 0 };

      agg[dimVal].count++;
      if (metric === 'distinct') agg[dimVal].distinctSet.add(row.id);
      if (metric === 'sum' && valueField) agg[dimVal].sum += getValue(row, valueField);

      if (segment) {
        const segVal = String(row[segment] !== undefined ? row[segment] : 'N/A');
        if (!agg[dimVal][segVal]) agg[dimVal][segVal] = 0;
        if (metric === 'sum' && valueField) agg[dimVal][segVal] += getValue(row, valueField);
        else agg[dimVal][segVal]++;
      }
    });

    let result = Object.values(agg).map((item: any) => {
      const { distinctSet, ...rest } = item;
      let finalVal = 0;
      if (metric === 'distinct') finalVal = distinctSet.size;
      else if (metric === 'sum') finalVal = parseFloat(item.sum.toFixed(2));
      else finalVal = item.count;
      return { ...rest, value: finalVal, size: finalVal };
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

    return result;
  }, [mode, currentBatch, dimension, metric, valueField, segment, limit, filters, sortOrder, isCumulative, currentDataset]);

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
             if (f.operator === 'starts_with') return strRowVal.startsWith(strFilterVal);
             if (f.operator === 'contains') return strRowVal.includes(strFilterVal);
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
             if (f.operator === 'starts_with') return strRowVal.startsWith(strFilterVal);
             if (f.operator === 'contains') return strRowVal.includes(strFilterVal);
             if (f.operator === 'eq') return strRowVal === strFilterVal;
             if (f.operator === 'gt') return parseSmartNumber(rowVal) > parseSmartNumber(f.value);
             if (f.operator === 'lt') return parseSmartNumber(rowVal) < parseSmartNumber(f.value);
             return true;
          });
       });

       const point: any = {
          date: batch.date,
          displayDate: formatDateFr(batch.date),
          total: 0
       };

       topSeries.forEach(s => point[s] = 0);

       batchRows.forEach((row: any) => {
          const val = String(row[dimension] || 'Non défini');
          if (topSeries.includes(val)) {
             let qty = 1;
             if (metric === 'sum' && valueField) qty = getValue(row, valueField);
             point[val] = parseFloat(((point[val] || 0) + qty).toFixed(2));
          }
          if (metric === 'sum' && valueField) point.total += getValue(row, valueField);
          else point.total++;
       });
       
       point.total = parseFloat(point.total.toFixed(2));
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
  }, [mode, batches, startDate, endDate, dimension, limit, filters, currentDataset, metric, valueField, showForecast]);

  const insightText = useMemo(() => {
    const metricLabel = metric === 'sum' ? 'Total' : 'Occurrences';
    const unitLabel = (metric === 'sum' && valueField && currentDataset?.fieldConfigs?.[valueField]?.unit) 
       ? ` (${currentDataset.fieldConfigs[valueField].unit})` 
       : '';

    if (mode === 'snapshot') {
       if (snapshotData.length === 0) return "Aucune donnée.";
       const top = snapshotData[0];
       return `En date du ${formatDateFr(currentBatch?.date || '')}, "${top.name}" domine avec ${top.value.toLocaleString()}${unitLabel}.`;
    } else {
       if (trendData.data.length === 0) return "Aucune donnée sur la période.";
       const validPoints = trendData.data.filter((d: any) => d.date !== 'prediction');
       if (validPoints.length === 0) return "Données insuffisantes.";
       const first = validPoints[0];
       const last = validPoints[validPoints.length - 1];
       const growth = parseFloat((last.total - first.total).toFixed(2));
       return `Sur la période, le volume a évolué de ${growth > 0 ? '+' : ''}${growth.toLocaleString()}${unitLabel}.`;
    }
  }, [mode, snapshotData, trendData, currentBatch, metric, valueField, currentDataset]);

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
    const data = mode === 'snapshot' ? snapshotData : trendData.data;
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
                         {isCumulative && <th className="px-4 py-2 text-right text-xs font-bold text-slate-500 uppercase">Cumul</th>}
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100 bg-white">
                      {snapshotData.map((row: any, idx: number) => (
                         <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-4 py-2 text-sm text-slate-700 font-medium">{row.name}</td>
                            <td className="px-4 py-2 text-sm text-slate-900 text-right font-bold">{row.value.toLocaleString()}</td>
                            {isCumulative && <td className="px-4 py-2 text-sm text-slate-500 text-right">{row.cumulative.toLocaleString()}</td>}
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
       // Use ComposedChart for Forecast line
       return (
         <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={trendData.data} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
               <XAxis dataKey="displayDate" stroke="#94a3b8" fontSize={12} />
               <YAxis stroke="#94a3b8" fontSize={12} />
               <Tooltip contentStyle={tooltipStyle} />
               <Legend verticalAlign="top" iconType="circle" wrapperStyle={{fontSize: '12px', color: '#64748b'}} />
               {trendData.series.map((s, idx) => (
                  <Line key={s} type="monotone" dataKey={s} stroke={COLORS[idx % COLORS.length]} strokeWidth={2} dot={true} />
               ))}
               {showForecast && (
                  <Line type="monotone" dataKey="forecast" name="Tendance (Reg. Lin.)" stroke="#6366f1" strokeDasharray="5 5" strokeWidth={2} dot={false} />
               )}
            </ComposedChart>
         </ResponsiveContainer>
       );
    }

    switch (chartType) {
      case 'column':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={snapshotData} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} fontSize={11} height={60} stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={tooltipStyle} />
              <Bar dataKey="value" name={metric === 'sum' ? 'Somme' : 'Volume'} radius={[4, 4, 0, 0]}>
                {snapshotData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={snapshotData} layout="vertical" margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" stroke="#94a3b8" fontSize={12} />
              <YAxis dataKey="name" type="category" width={140} tick={{fontSize: 11}} stroke="#94a3b8" />
              <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={tooltipStyle} />
              <Bar dataKey="value" name={metric === 'sum' ? 'Somme' : 'Volume'} radius={[0, 4, 4, 0]}>
                {snapshotData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={snapshotData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                stroke="#fff"
                strokeWidth={2}
              >
                {snapshotData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend verticalAlign="bottom" height={36} wrapperStyle={{fontSize: '12px', color: '#64748b'}} />
            </PieChart>
          </ResponsiveContainer>
        );
      case 'area':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={snapshotData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{fontSize: 11}} stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey={isCumulative ? "cumulative" : "value"} stroke="#60a5fa" fill="#60a5fa" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        );
      case 'radar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={snapshotData}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="name" tick={{fontSize: 11, fill: '#64748b'}} />
              <PolarRadiusAxis stroke="#cbd5e1" />
              <Radar name={metric === 'sum' ? 'Somme' : 'Volume'} dataKey="value" stroke="#60a5fa" fill="#60a5fa" fillOpacity={0.3} />
              <Tooltip contentStyle={tooltipStyle} />
            </RadarChart>
          </ResponsiveContainer>
        );
      case 'treemap':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <Treemap
              data={snapshotData}
              dataKey="size"
              aspectRatio={4 / 3}
              stroke="#fff"
              fill="#8884d8"
              content={<TreemapContent />}
            >
              <Tooltip contentStyle={tooltipStyle} />
            </Treemap>
          </ResponsiveContainer>
        );
      case 'kpi':
        return (
           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto h-full p-2">
              {snapshotData.map((item: any, idx: number) => (
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
        <p className="text-slate-500 text-sm max-w-md mt-2">
          Veuillez sélectionner un tableau dans le menu principal.
        </p>
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
              <p className="text-xs text-slate-500">Typologie : {currentDataset.name}</p>
           </div>
        </div>

        {/* Center Toggle */}
        <div className="flex p-1 bg-slate-100 rounded-lg self-center">
           <button
              onClick={() => setMode('snapshot')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${mode === 'snapshot' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
           >
              Analyse Instantanée
           </button>
           <button
              onClick={() => setMode('trend')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${mode === 'trend' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
           >
              Évolution Temporelle
           </button>
        </div>
        
        {/* Right Controls */}
        <div className="flex items-center gap-2 w-full xl:w-auto">
             
             {/* Load Saved Views */}
             <div className="relative">
                <select
                    className="bg-slate-50 border border-slate-300 text-slate-700 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2 pr-8 min-w-[130px]"
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
                 <button onClick={() => setIsSaving(true)} className="p-2 text-slate-500 hover:text-blue-600 border border-slate-300 rounded-md bg-white hover:bg-slate-50" title="Enregistrer cette vue">
                    <Save className="w-5 h-5" />
                 </button>
             ) : (
                 <div className="flex items-center gap-1 animate-in fade-in bg-white border border-blue-300 rounded-md p-0.5">
                    <input type="text" className="p-1.5 text-xs border-none focus:ring-0 w-32 bg-transparent text-slate-900" placeholder="Nom..." value={analysisName} onChange={e => setAnalysisName(e.target.value)} autoFocus />
                    <button onClick={handleSaveAnalysis} className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700"><Check className="w-3 h-3" /></button>
                    <button onClick={() => setIsSaving(false)} className="p-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-300"><X className="w-3 h-3" /></button>
                 </div>
             )}

             <div className="h-6 w-px bg-slate-300 mx-1"></div>

             {/* EXPORT BUTTON */}
             <div className="relative">
                <button
                   onClick={() => setShowExportMenu(!showExportMenu)}
                   className="p-2 text-slate-500 hover:text-blue-600 border border-slate-300 rounded-md bg-white hover:bg-slate-50 flex items-center gap-1"
                   title="Exporter"
                >
                   <FileDown className="w-5 h-5" />
                </button>
                {showExportMenu && (
                   <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1">
                      <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Format PDF</div>
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
                      <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Format Web</div>
                      <button 
                         onClick={() => handleExport('html')}
                         className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                      >
                         <FileType className="w-4 h-4 text-orange-500" /> Export HTML
                      </button>
                   </div>
                )}
             </div>

             <button
                onClick={handleExportToDashboard}
                className="p-2 text-slate-500 hover:text-blue-600 border border-slate-300 rounded-md bg-white hover:bg-slate-50"
                title="Ajouter au tableau de bord"
            >
                <LayoutDashboard className="w-5 h-5" />
            </button>

           {mode === 'snapshot' ? (
              <div className="flex items-center gap-2 w-full xl:w-auto ml-2">
                 <select 
                    className="flex-1 sm:flex-none bg-slate-50 border border-slate-300 text-slate-700 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2 min-w-[200px]"
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
                className="text-xs text-blue-600 hover:underline disabled:text-slate-400"
                disabled={filters.length === 0}
              >
                Reset Filtres
              </button>
           </div>
           
           <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
              
              {/* 1. DIMENSIONS */}
              <div>
                 <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center">
                    1. {mode === 'snapshot' ? 'Axe Analyse (X)' : 'Séries à suivre'}
                 </label>
                 <select 
                    className="w-full mb-2 p-2.5 bg-white border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    value={dimension}
                    onChange={(e) => setDimension(e.target.value)}
                 >
                    {fields.map(f => <option key={f} value={f}>{f}</option>)}
                 </select>
                 
                 <label className="block text-xs font-bold text-slate-500 mb-2 mt-3 uppercase">Métrique</label>
                 <div className="grid grid-cols-3 gap-2">
                    <button 
                       onClick={() => setMetric('count')}
                       className={`flex flex-col items-center justify-center py-2 px-1 text-xs font-medium rounded border transition-colors ${metric === 'count' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-200 text-slate-500'}`}
                    >
                       <Check className={`w-3 h-3 mb-1 ${metric === 'count' ? 'opacity-100' : 'opacity-0'}`} />
                       Compte
                    </button>
                    <button 
                       onClick={() => setMetric('distinct')}
                       className={`flex flex-col items-center justify-center py-2 px-1 text-xs font-medium rounded border transition-colors ${metric === 'distinct' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-200 text-slate-500'}`}
                    >
                       <Filter className={`w-3 h-3 mb-1 ${metric === 'distinct' ? 'opacity-100' : 'opacity-0'}`} />
                       Distinct
                    </button>
                    <button 
                       onClick={() => setMetric('sum')}
                       className={`flex flex-col items-center justify-center py-2 px-1 text-xs font-medium rounded border transition-colors ${metric === 'sum' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-200 text-slate-500'}`}
                    >
                       <Calculator className={`w-3 h-3 mb-1 ${metric === 'sum' ? 'opacity-100' : 'opacity-0'}`} />
                       Somme
                    </button>
                 </div>

                 {/* Selector for Sum Field */}
                 {metric === 'sum' && (
                    <div className="mt-2 p-2 bg-slate-50 rounded border border-slate-200 animate-in fade-in slide-in-from-top-2 duration-300">
                       <label className="block text-xs font-bold text-slate-600 mb-1">Champ à additionner :</label>
                       {numericFields.length > 0 ? (
                          <select 
                             className="w-full p-1.5 bg-white border border-slate-300 text-slate-800 text-xs rounded focus:ring-blue-500 focus:border-blue-500"
                             value={valueField}
                             onChange={(e) => setValueField(e.target.value)}
                          >
                             {numericFields.map(f => {
                                const unit = currentDataset?.fieldConfigs?.[f]?.unit;
                                return <option key={f} value={f}>{f} {unit ? `(${unit})` : ''}</option>
                             })}
                          </select>
                       ) : (
                          <p className="text-xs text-red-500 italic">Aucun champ numérique détecté.</p>
                       )}
                    </div>
                 )}
              </div>

              {/* 2. FILTERS */}
              <div>
                 <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center">
                    2. Filtres ({filters.length})
                 </label>
                 
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
                 <button onClick={addFilter} className="text-xs text-blue-600 flex items-center hover:text-blue-800 font-medium border border-dashed border-blue-300 rounded w-full justify-center py-1.5 hover:bg-blue-50">
                    <Filter className="w-3 h-3 mr-1" /> Ajouter un filtre
                 </button>
              </div>

              {/* 3. VISUAL TYPE */}
              <div>
                 <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center">
                    3. Visuel
                 </label>
                 <div className="grid grid-cols-3 gap-2">
                    {mode === 'snapshot' ? (
                       <>
                          {[
                             { id: 'bar', icon: BarChart3, label: 'Barres', rotate: 90 },
                             { id: 'column', icon: BarChart3, label: 'Histo' },
                             { id: 'pie', icon: PieIcon, label: 'Donut' },
                             { id: 'area', icon: TrendingUp, label: 'Aire' },
                             { id: 'radar', icon: RadarIcon, label: 'Radar' },
                             { id: 'treemap', icon: LayoutGrid, label: 'Carte' },
                             { id: 'kpi', icon: Activity, label: 'KPI' },
                          ].map((type) => {
                             const Icon = type.icon;
                             return (
                                <button
                                   key={type.id}
                                   onClick={() => setChartType(type.id as ChartType)}
                                   className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${chartType === type.id ? 'bg-slate-100 border-slate-400 text-slate-800 shadow-sm' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'}`}
                                >
                                   <Icon className={`w-5 h-5 mb-1 ${type.rotate ? 'transform rotate-90' : ''}`} />
                                   <span className="text-[10px] font-medium">{type.label}</span>
                                </button>
                             )
                          })}
                       </>
                    ) : (
                       <>
                           <button
                              onClick={() => setChartType('line')}
                              className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${chartType === 'line' ? 'bg-slate-100 border-slate-400 text-slate-800 shadow-sm' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'}`}
                           >
                              <Activity className="w-5 h-5 mb-1" />
                              <span className="text-[10px] font-medium">Lignes</span>
                           </button>
                           <button
                              onClick={() => setChartType('area')}
                              className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${chartType === 'area' ? 'bg-slate-100 border-slate-400 text-slate-800 shadow-sm' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'}`}
                           >
                              <TrendingUp className="w-5 h-5 mb-1" />
                              <span className="text-[10px] font-medium">Aires</span>
                           </button>
                       </>
                    )}
                 </div>
              </div>

              {/* 4. OPTIONS */}
              <div className="pt-4 border-t border-slate-100 space-y-4">
                 
                 {/* Sort & Limit */}
                 <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Options</label>
                    <div className="flex gap-2 mb-2">
                       {mode === 'snapshot' && (
                          <select 
                             className="flex-1 text-xs border border-slate-200 rounded p-1.5 bg-slate-50"
                             value={sortOrder}
                             onChange={(e) => setSortOrder(e.target.value as any)}
                          >
                             <option value="desc">Décroissant</option>
                             <option value="asc">Croissant</option>
                             <option value="alpha">Alphabétique</option>
                          </select>
                       )}
                       <div className="flex items-center border border-slate-200 rounded bg-white px-2 w-28">
                           <span className="text-xs text-slate-400 mr-1">Top:</span>
                           <input 
                              type="number"
                              className="w-full text-xs border-none p-1.5 focus:ring-0"
                              value={limit}
                              onChange={(e) => setLimit(Number(e.target.value))}
                              placeholder="N"
                           />
                       </div>
                    </div>
                 </div>

                 {/* Toggles */}
                 <div className="space-y-2">
                    {mode === 'snapshot' && (
                       <label className="flex items-center gap-2 cursor-pointer">
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${isCumulative ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-300 bg-white'}`}>
                             {isCumulative && <Check className="w-3 h-3" />}
                          </div>
                          <input type="checkbox" className="hidden" checked={isCumulative} onChange={() => setIsCumulative(!isCumulative)} />
                          <span className="text-xs text-slate-700">Mode Cumulatif</span>
                       </label>
                    )}

                    <label className="flex items-center gap-2 cursor-pointer">
                       <div className={`w-4 h-4 rounded border flex items-center justify-center ${showTable ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-300 bg-white'}`}>
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
                       <label className="text-xs font-bold text-slate-500 uppercase flex items-center">
                          Sous-Groupe
                       </label>
                       <select 
                          className="w-full p-1.5 bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded focus:ring-0"
                          value={segment}
                          onChange={(e) => setSegment(e.target.value)}
                       >
                          <option value="">-- Aucun --</option>
                          {fields.filter(f => f !== dimension).map(f => <option key={f} value={f}>{f}</option>)}
                       </select>
                    </div>
                 )}
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
                    {mode === 'snapshot' ? (
                        <span>Analyse : {dimension} <span className="text-slate-400">|</span> {metric === 'sum' ? `Somme de ${valueField}` : 'Nombre'}</span>
                    ) : (
                        <span>Évolution : {dimension} <span className="text-slate-400">|</span> {metric === 'sum' ? `Somme de ${valueField}` : 'Nombre'}</span>
                    )}
                 </h3>
                 {segment && mode === 'snapshot' && <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500">par {segment}</span>}
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
