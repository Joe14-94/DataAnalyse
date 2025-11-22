
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import { formatDateFr, parseSmartNumber } from '../utils';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, Cell,
  PieChart, Pie, AreaChart, Area, Treemap, LineChart, Line
} from 'recharts';
import { 
  BarChart3, PieChart as PieIcon, Activity, Radar as RadarIcon, 
  LayoutGrid, TrendingUp, Settings2, Database, HelpCircle,
  Filter, Table as TableIcon, Check, X, CalendarRange, Calculator, ChevronDown
} from 'lucide-react';
import { FieldConfig } from '../types';

type ChartType = 'bar' | 'column' | 'pie' | 'area' | 'radar' | 'treemap' | 'kpi' | 'line';
type AnalysisMode = 'snapshot' | 'trend';
type MetricType = 'count' | 'distinct' | 'sum';

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
  const { batches, currentDataset } = useData();
  const fields = currentDataset ? currentDataset.fields : [];

  // --- State Configuration ---
  const [mode, setMode] = useState<AnalysisMode>('snapshot');
  
  // Snapshot Mode State
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  
  // Trend Mode State
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Common Config
  const [dimension, setDimension] = useState<string>(''); 
  const [metric, setMetric] = useState<MetricType>('count');
  const [valueField, setValueField] = useState<string>(''); 
  const [segment, setSegment] = useState<string>(''); 
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [limit, setLimit] = useState<number>(10);
  
  // Advanced State
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc' | 'alpha'>('desc');
  const [isCumulative, setIsCumulative] = useState<boolean>(false);
  const [showTable, setShowTable] = useState<boolean>(false);
  
  // Updated Filters Structure: Values is array
  const [filters, setFilters] = useState<{field: string, values: string[]}[]>([]);

  // --- Colors ---
  const COLORS = ['#64748b', '#60a5fa', '#34d399', '#f87171', '#a78bfa', '#fbbf24', '#22d3ee', '#f472b6', '#a3e635'];

  // --- Initialization ---
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

  // --- Helpers ---
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

  // Identifie les champs numériques via la configuration du dataset ou par détection basique
  const numericFields = useMemo(() => {
     if (!currentDataset) return [];
     
     // 1. Vérifier la configuration explicite
     const configuredNumeric = Object.entries(currentDataset.fieldConfigs || ({} as Record<string, FieldConfig>))
        .filter(([_, config]) => (config as FieldConfig).type === 'number')
        .map(([name, _]) => name);
     
     if (configuredNumeric.length > 0) {
        // Filtrer pour ne garder que ceux qui existent encore dans fields
        return configuredNumeric.filter(f => fields.includes(f));
     }

     // 2. Fallback : Détection automatique sur les données
     if (!currentBatch || currentBatch.rows.length === 0) return [];
     const sample = currentBatch.rows.slice(0, 20);
     return fields.filter(f => {
        return sample.some(r => {
           const val = r[f];
           if (val === undefined || val === '' || val === null) return false;
           // On teste le parsing "intelligent" (qui vire les unités courantes)
           return parseSmartNumber(val) !== 0 || val === '0' || val === 0;
        });
     });
  }, [currentBatch, fields, currentDataset]);

  // Auto-select value field
  useEffect(() => {
     if (metric === 'sum' && !valueField && numericFields.length > 0) {
        setValueField(numericFields[0]);
     }
  }, [metric, numericFields, valueField]);

  // Wrapper pour le parsing qui utilise la config
  const getValue = (row: any, fieldName: string): number => {
     const raw = row[fieldName];
     const unit = currentDataset?.fieldConfigs?.[fieldName]?.unit;
     return parseSmartNumber(raw, unit);
  };

  const addFilter = () => {
    if (fields.length > 0) {
       setFilters([...filters, { field: fields[0], values: [] }]);
    }
  };

  const updateFilterField = (index: number, newField: string) => {
     const newFilters = [...filters];
     newFilters[index] = { field: newField, values: [] };
     setFilters(newFilters);
  };

  const updateFilterValues = (index: number, newValues: string[]) => {
     const newFilters = [...filters];
     newFilters[index].values = newValues;
     setFilters(newFilters);
  };

  const removeFilter = (index: number) => {
     setFilters(filters.filter((_, i) => i !== index));
  };

  // --- SNAPSHOT DATA ENGINE ---
  const snapshotData = useMemo(() => {
    if (mode !== 'snapshot' || !currentBatch || !dimension) return [];

    // 1. Filter Rows
    const filteredRows = currentBatch.rows.filter(row => {
       if (filters.length === 0) return true;
       return filters.every(f => {
          if (f.values.length === 0) return true; // No values selected = All
          return f.values.includes(String(row[f.field]));
       });
    });

    // 2. Aggregation
    const agg: Record<string, any> = {};
    filteredRows.forEach(row => {
      const dimVal = String(row[dimension] || 'Non défini');
      if (!agg[dimVal]) agg[dimVal] = { name: dimVal, count: 0, distinctSet: new Set(), sum: 0 };

      agg[dimVal].count++;
      
      if (metric === 'distinct') {
         agg[dimVal].distinctSet.add(row.id);
      }
      
      if (metric === 'sum' && valueField) {
         agg[dimVal].sum += getValue(row, valueField);
      }

      // Segment aggregation
      if (segment) {
        const segVal = String(row[segment] !== undefined ? row[segment] : 'N/A');
        if (!agg[dimVal][segVal]) agg[dimVal][segVal] = 0;
        
        if (metric === 'sum' && valueField) {
           agg[dimVal][segVal] += getValue(row, valueField);
        } else {
           agg[dimVal][segVal]++;
        }
      }
    });

    // 3. Transform
    let result = Object.values(agg).map((item: any) => {
      const { distinctSet, ...rest } = item;
      let finalVal = 0;
      
      if (metric === 'distinct') finalVal = distinctSet.size;
      else if (metric === 'sum') finalVal = parseFloat(item.sum.toFixed(2));
      else finalVal = item.count;

      return { ...rest, value: finalVal, size: finalVal };
    });

    // 4. Sort
    if (sortOrder === 'alpha') result.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortOrder === 'asc') result.sort((a, b) => a.value - b.value);
    else result.sort((a, b) => b.value - a.value);

    // 5. Limit
    if (limit > 0) result = result.slice(0, limit);

    // 6. Cumulative
    if (isCumulative) {
       let runningTotal = 0;
       result = result.map(item => {
          runningTotal += item.value;
          return { ...item, cumulative: parseFloat(runningTotal.toFixed(2)) };
       });
    }

    return result;
  }, [mode, currentBatch, dimension, metric, valueField, segment, limit, filters, sortOrder, isCumulative, currentDataset]);

  // --- TREND DATA ENGINE ---
  const trendData = useMemo(() => {
    if (mode !== 'trend' || !dimension) return { data: [], series: [] };

    const targetBatches = batches
       .filter(b => b.datasetId === currentDataset?.id)
       .filter(b => b.date >= startDate && b.date <= endDate)
       .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (targetBatches.length === 0) return { data: [], series: [] };

    const globalCounts: Record<string, number> = {};
    
    targetBatches.forEach(batch => {
       const batchRows = batch.rows.filter(row => {
          if (filters.length === 0) return true;
          return filters.every(f => f.values.length === 0 || f.values.includes(String(row[f.field])));
       });

       batchRows.forEach(row => {
          const val = String(row[dimension] || 'Non défini');
          let increment = 1;
          
          if (metric === 'sum' && valueField) {
             increment = getValue(row, valueField);
          }
          
          globalCounts[val] = (globalCounts[val] || 0) + increment;
       });
    });

    const topSeries = Object.entries(globalCounts)
       .sort((a, b) => b[1] - a[1])
       .slice(0, limit)
       .map(e => e[0]);

    const timeData = targetBatches.map(batch => {
       const batchRows = batch.rows.filter(row => {
          if (filters.length === 0) return true;
          return filters.every(f => f.values.length === 0 || f.values.includes(String(row[f.field])));
       });

       const point: any = {
          date: batch.date,
          displayDate: formatDateFr(batch.date),
          total: 0
       };

       topSeries.forEach(s => point[s] = 0);

       batchRows.forEach(row => {
          const val = String(row[dimension] || 'Non défini');
          if (topSeries.includes(val)) {
             let qty = 1;
             if (metric === 'sum' && valueField) {
                qty = getValue(row, valueField);
             }
             point[val] = parseFloat(((point[val] || 0) + qty).toFixed(2));
          }
          
          if (metric === 'sum' && valueField) {
             point.total += getValue(row, valueField);
          } else {
             point.total++;
          }
       });
       
       point.total = parseFloat(point.total.toFixed(2));
       return point;
    });

    return { data: timeData, series: topSeries };
  }, [mode, batches, startDate, endDate, dimension, limit, filters, currentDataset, metric, valueField]);

  // --- Insight Text ---
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
       const first = trendData.data[0];
       const last = trendData.data[trendData.data.length - 1];
       const growth = parseFloat((last.total - first.total).toFixed(2));
       return `Sur la période, le volume a évolué de ${growth > 0 ? '+' : ''}${growth.toLocaleString()}${unitLabel}.`;
    }
  }, [mode, snapshotData, trendData, currentBatch, metric, valueField, currentDataset]);

  // --- Styles ---
  const tooltipStyle = {
    backgroundColor: '#ffffff',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
    color: '#334155',
    fontSize: '12px',
    padding: '8px'
  };

  // --- Render Chart ---
  const renderVisuals = () => {
    const data = mode === 'snapshot' ? snapshotData : trendData.data;
    if (!data || data.length === 0) return <div className="flex items-center justify-center h-full text-slate-400 italic">Aucune donnée disponible</div>;

    // TABLE VIEW
    if (showTable) {
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
                      {snapshotData.map((row, idx) => (
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
                        {trendData.series.map(s => (
                           <th key={s} className="px-4 py-2 text-right text-xs font-bold text-slate-500 uppercase">{s}</th>
                        ))}
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                     {trendData.data.map((row: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50">
                           <td className="px-4 py-2 text-sm text-slate-700 font-medium">{row.displayDate}</td>
                           <td className="px-4 py-2 text-sm text-slate-900 text-right font-bold">{row.total.toLocaleString()}</td>
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

    // CHART VIEW
    if (mode === 'trend') {
       if (chartType === 'area') {
          return (
            <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={trendData.data} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="displayDate" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend verticalAlign="top" iconType="circle" wrapperStyle={{fontSize: '12px', color: '#64748b'}} />
                  {trendData.series.map((s, idx) => (
                     <Area key={s} type="monotone" dataKey={s} stackId="1" stroke={COLORS[idx % COLORS.length]} fill={COLORS[idx % COLORS.length]} />
                  ))}
               </AreaChart>
            </ResponsiveContainer>
          );
       }
       return (
         <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData.data} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
               <XAxis dataKey="displayDate" stroke="#94a3b8" fontSize={12} />
               <YAxis stroke="#94a3b8" fontSize={12} />
               <Tooltip contentStyle={tooltipStyle} />
               <Legend verticalAlign="top" iconType="circle" wrapperStyle={{fontSize: '12px', color: '#64748b'}} />
               {trendData.series.map((s, idx) => (
                  <Line key={s} type="monotone" dataKey={s} stroke={COLORS[idx % COLORS.length]} strokeWidth={2} dot={true} />
               ))}
            </LineChart>
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
                {snapshotData.map((entry, index) => (
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
                {snapshotData.map((entry, index) => (
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
                {snapshotData.map((entry, index) => (
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
              content={(props: any) => {
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
              }}
            >
              <Tooltip contentStyle={tooltipStyle} />
            </Treemap>
          </ResponsiveContainer>
        );
      case 'kpi':
        return (
           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto h-full p-2">
              {snapshotData.map((item, idx) => (
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
    <div className="flex flex-col h-[calc(100vh-8rem)] gap-4">
      
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
        <div className="w-full xl:w-auto">
           {mode === 'snapshot' ? (
              <div className="flex items-center gap-2 w-full xl:w-auto">
                 <span className="text-sm text-slate-500 whitespace-nowrap hidden sm:inline">Source :</span>
                 <select 
                    className="flex-1 sm:flex-none bg-slate-50 border border-slate-300 text-slate-700 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2 min-w-[200px]"
                    value={selectedBatchId}
                    onChange={(e) => setSelectedBatchId(e.target.value)}
                  >
                    {batches.map(b => <option key={b.id} value={b.id}>{formatDateFr(b.date)} ({b.rows.length} lignes)</option>)}
                 </select>
              </div>
           ) : (
              <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto p-1">
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
                 
                 <div className="space-y-2 mb-2">
                    {filters.map((filter, idx) => (
                       <div key={idx} className="bg-slate-50 p-2 rounded border border-slate-200 text-xs space-y-1 relative group">
                          <button onClick={() => removeFilter(idx)} className="absolute top-1 right-1 text-slate-400 hover:text-red-500">
                             <X className="w-3 h-3" />
                          </button>
                          
                          {/* Field Selector */}
                          <select 
                             className="w-full bg-white border border-slate-200 rounded px-1 py-1 mb-1"
                             value={filter.field}
                             onChange={(e) => updateFilterField(idx, e.target.value)}
                          >
                             {fields.map(f => <option key={f} value={f}>{f}</option>)}
                          </select>
                          
                          {/* Multi Select Values */}
                          <MultiSelect 
                             options={getDistinctValuesForField(filter.field)}
                             selected={filter.values}
                             onChange={(newValues) => updateFilterValues(idx, newValues)}
                             placeholder="Sélectionner valeurs..."
                          />
                       </div>
                    ))}
                 </div>
                 <button onClick={addFilter} className="text-xs text-blue-600 flex items-center hover:text-blue-800 font-medium">
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
                       <select 
                          className="w-24 text-xs border border-slate-200 rounded p-1.5 bg-slate-50"
                          value={limit}
                          onChange={(e) => setLimit(Number(e.target.value))}
                       >
                          <option value="5">Top 5</option>
                          <option value="10">Top 10</option>
                          <option value="20">Top 20</option>
                       </select>
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
           <div className="flex-1 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col relative overflow-hidden min-h-[300px]">
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
