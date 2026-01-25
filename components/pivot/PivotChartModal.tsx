
import React, { useState, useEffect, useMemo } from 'react';
import { X, Check, BarChart3, PieChart, TrendingUp, LayoutGrid, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, LineChart, Line, AreaChart, Area, Pie, Cell, PieChart as RechartsPieChart } from 'recharts';
import { Button } from '../../components/ui/Button';
import { PivotResult } from '../../logic/pivotEngine';
import html2canvas from 'html2canvas';

interface PivotChartModalProps {
    isOpen: boolean;
    onClose: () => void;
    pivotData: PivotResult | null;
    config: {
        rowFields: string[];
        colFields: string[];
        valField: string;
        aggType: string;
    };
    onAddToDashboard: (chartConfig: any) => void;
}

type ChartType = 'bar' | 'line' | 'area' | 'pie';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

export const PivotChartModal: React.FC<PivotChartModalProps> = ({ isOpen, onClose, pivotData, config, onAddToDashboard }) => {
    const [selectedChartType, setSelectedChartType] = useState<ChartType>('bar');
    const [chartData, setChartData] = useState<any[]>([]);

    // 1. Prepare Data for Charts
    useEffect(() => {
        if (!pivotData) return;

        // Flatten pivot data for charts
        // Format: { name: "Row Label", "Col1": 10, "Col2": 20, ... }
        const data = pivotData.displayRows.map(row => {
            const item: any = { name: row.keys.join(' - ') }; // Combine row keys

            // Add robust metric values using a safe key
            pivotData.colHeaders.forEach(col => {
                // IMPORTANT: Recharts doesn't like dots in keys for dataKey access
                // We use a safe key or just use the col string if simple.
                // For simplicity here, we assume col headers are safe or we access them via bracket notation in custom tooltips
                item[col] = row.metrics[col] || 0;
            });

            // Also keep row total
            item['Total'] = row.rowTotal;
            return item;
        });

        setChartData(data);

        // Auto-detect best chart type
        const isTimeSeries = config.rowFields.some(f => f.toLowerCase().includes('date') || f.toLowerCase().includes('mois') || f.toLowerCase().includes('année'));
        const hasManyItems = data.length > 10;
        const hasSingleSeries = pivotData.colHeaders.length === 1 && pivotData.colHeaders[0] === 'Total';

        if (isTimeSeries) setSelectedChartType('line');
        else if (hasSingleSeries && !hasManyItems) setSelectedChartType('pie');
        else if (hasManyItems) setSelectedChartType('bar'); // Horizontal bar usually better for many items, but standard bar here

    }, [pivotData, config]);

    if (!isOpen || !pivotData) return null;

    const handleSave = () => {
        // Create widget config compatible with Dashboard
        const widgetConfig = {
            title: `Analyse ${config.valField} par ${config.rowFields.join('/')}`,
            type: 'chart',
            size: 'md',
            config: {
                chartType: selectedChartType,
                // We need to map this to the dashboard data source logic
                // Ideally, we pass the pivot configuration to re-calculate, or a static dataset
                // For "Quick Chart", we might want to snapshot the current view or reference the pivot analysis
                // SIMPLE VERSION: We save the analysis config. 
                // COMPLEX VERSION: We create a specific chart widget.

                // Let's assume we pass a "Source Pivot" config
                source: {
                    datasetId: pivotData.datasetId, // Need datasetId in PivotResult if not present
                    type: 'pivot',
                    pivotConfig: { ...config }
                },
                metric: config.aggType,
                dimension: config.rowFields[0],
                valueField: config.valField
            }
        };
        onAddToDashboard(widgetConfig);
        onClose();
    };

    const handleExportImage = async () => {
        const element = document.getElementById('quick-chart-preview');
        if (!element) return;
        try {
            const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff' });
            const link = document.createElement('a');
            link.download = `chart_${new Date().toISOString().slice(0, 10)}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (e) {
            console.error("Export failed", e);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-xl">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-600" />
                        Visualisation Rapide
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar: Chart Types */}
                    <div className="w-48 border-r border-slate-200 p-4 bg-slate-50 space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Type de graphique</label>

                        <button
                            onClick={() => setSelectedChartType('bar')}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg text-sm font-medium transition-colors ${selectedChartType === 'bar' ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300' : 'hover:bg-white text-slate-600 border border-transparent hover:border-slate-200'}`}
                        >
                            <BarChart3 className="w-4 h-4" /> Barres
                        </button>
                        <button
                            onClick={() => setSelectedChartType('line')}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg text-sm font-medium transition-colors ${selectedChartType === 'line' ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300' : 'hover:bg-white text-slate-600 border border-transparent hover:border-slate-200'}`}
                        >
                            <TrendingUp className="w-4 h-4" /> Courbes
                        </button>
                        <button
                            onClick={() => setSelectedChartType('area')}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg text-sm font-medium transition-colors ${selectedChartType === 'area' ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300' : 'hover:bg-white text-slate-600 border border-transparent hover:border-slate-200'}`}
                        >
                            <LayoutGrid className="w-4 h-4" /> Aires
                        </button>
                        <button
                            onClick={() => setSelectedChartType('pie')}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg text-sm font-medium transition-colors ${selectedChartType === 'pie' ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300' : 'hover:bg-white text-slate-600 border border-transparent hover:border-slate-200'}`}
                        >
                            <PieChart className="w-4 h-4" /> Secteurs
                        </button>
                    </div>

                    {/* Chart Preview */}
                    <div className="flex-1 p-6 bg-white overflow-auto flex flex-col">
                        <div id="quick-chart-preview" className="flex-1 min-h-[400px] w-full p-4 border border-slate-100 rounded-lg">
                            <h3 className="text-center font-bold text-slate-700 mb-4">{`Analyse ${config.valField} par ${config.rowFields.join(' & ')}`}</h3>
                            <ResponsiveContainer width="100%" height="100%">
                                {selectedChartType === 'bar' ? (
                                    <BarChart data={chartData}>
                                        <XAxis dataKey="name" fontSize={11} tickLine={false} />
                                        <YAxis fontSize={11} tickLine={false} tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            formatter={(val: number) => [val.toLocaleString('fr-FR'), '']}
                                        />
                                        <Legend />
                                        {pivotData.colHeaders.map((col, idx) => (
                                            <Bar key={col} dataKey={col} fill={COLORS[idx % COLORS.length]} radius={[4, 4, 0, 0]} />
                                        ))}
                                    </BarChart>
                                ) : selectedChartType === 'line' ? (
                                    <LineChart data={chartData}>
                                        <XAxis dataKey="name" fontSize={11} tickLine={false} />
                                        <YAxis fontSize={11} tickLine={false} />
                                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                        <Legend />
                                        {pivotData.colHeaders.map((col, idx) => (
                                            <Line key={col} type="monotone" dataKey={col} stroke={COLORS[idx % COLORS.length]} strokeWidth={2} dot={false} />
                                        ))}
                                    </LineChart>
                                ) : selectedChartType === 'area' ? (
                                    <AreaChart data={chartData}>
                                        <XAxis dataKey="name" fontSize={11} tickLine={false} />
                                        <YAxis fontSize={11} tickLine={false} />
                                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                        <Legend />
                                        {pivotData.colHeaders.map((col, idx) => (
                                            <Area key={col} type="monotone" dataKey={col} fill={COLORS[idx % COLORS.length]} stroke={COLORS[idx % COLORS.length]} fillOpacity={0.2} />
                                        ))}
                                    </AreaChart>
                                ) : (
                                    <RechartsPieChart>
                                        <Pie
                                            data={chartData}
                                            dataKey={pivotData.colHeaders[0] || 'Total'} // Take first series or total
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={120}
                                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                        >
                                            {chartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </RechartsPieChart>
                                )}
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-xl flex justify-end gap-3">
                    <Button variant="outline" onClick={handleExportImage} icon={<Download className="w-4 h-4" />}>
                        Exporter PNG
                    </Button>
                    <Button onClick={handleSave} icon={<Check className="w-4 h-4" />}>
                        Ajouter au Dashboard
                    </Button>
                </div>
            </div>
        </div>
    );
};
