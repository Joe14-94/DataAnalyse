import React from 'react';
import { Database, Table as TableIcon, Filter, Check, LayoutGrid, BarChart3, PieChart as PieIcon, Activity, TrendingUp, Radar as RadarIcon, Settings2, X } from 'lucide-react';
import { AnalysisMode, ChartType, MetricType } from '../../hooks/useAnalysisStudioLogic';
import { MultiSelect } from '../ui/MultiSelect';
import { FilterRule, ColorMode, ColorPalette } from '../../types';
import { Dataset } from '../../types/dataset';

interface AnalysisStudioSidebarProps {
    mode: AnalysisMode;
    dimension: string;
    onSetDimension: (dim: string) => void;
    fields: string[];
    metric: MetricType;
    onSetMetric: (m: MetricType) => void;
    valueField: string;
    onSetValueField: (f: string) => void;
    numericFields: string[];
    currentDataset: Dataset | null;
    metric2: MetricType | 'none';
    onSetMetric2: (m: MetricType | 'none') => void;
    valueField2: string;
    onSetValueField2: (f: string) => void;
    filters: FilterRule[];
    onSetFilters: (filters: FilterRule[]) => void;
    getDistinctValuesForField: (field: string) => string[];
    limit: number;
    onSetLimit: (limit: number) => void;
    sortOrder: 'desc' | 'asc' | 'alpha';
    onSetSortOrder: (order: 'desc' | 'asc' | 'alpha') => void;
    isCumulative: boolean;
    onToggleCumulative: () => void;
    showTable: boolean;
    onToggleTable: () => void;
    showForecast: boolean;
    onToggleForecast: () => void;
    segment: string;
    onSetSegment: (seg: string) => void;
    chartType: ChartType;
    onSetChartType: (type: ChartType) => void;
    colorMode: ColorMode;
    onSetColorMode: (mode: ColorMode) => void;
    colorPalette: ColorPalette;
    onSetColorPalette: (palette: ColorPalette) => void;
    singleColor: string;
    onSetSingleColor: (color: string) => void;
    gradientStart: string;
    onSetGradientStart: (color: string) => void;
    gradientEnd: string;
    onSetGradientEnd: (color: string) => void;
    chartTitle: string;
    onSetChartTitle: (title: string) => void;
    customUnit: string;
    onSetCustomUnit: (unit: string) => void;
}

export const AnalysisStudioSidebar: React.FC<AnalysisStudioSidebarProps> = ({
    mode, dimension, onSetDimension, fields,
    metric, onSetMetric, valueField, onSetValueField, numericFields, currentDataset,
    metric2, onSetMetric2, valueField2, onSetValueField2,
    filters, onSetFilters, getDistinctValuesForField,
    limit, onSetLimit, sortOrder, onSetSortOrder,
    isCumulative, onToggleCumulative, showTable, onToggleTable, showForecast, onToggleForecast,
    segment, onSetSegment, chartType, onSetChartType,
    colorMode, onSetColorMode, colorPalette, onSetColorPalette,
    singleColor, onSetSingleColor, gradientStart, onSetGradientStart, gradientEnd, onSetGradientEnd,
    chartTitle, onSetChartTitle, customUnit, onSetCustomUnit
}) => {
    const addFilter = () => {
        if (fields.length > 0) {
            onSetFilters([...filters, { field: fields[0], operator: 'in', value: [] }]);
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
        onSetFilters(newFilters);
    };

    const removeFilter = (index: number) => {
        onSetFilters(filters.filter((_, i) => i !== index));
    };

    return (
        <div className="lg:w-72 flex-shrink-0 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 font-semibold text-slate-700 flex items-center justify-between">
                <span>Configuration</span>
                <button
                    onClick={() => onSetFilters([])}
                    className="text-xs text-brand-600 hover:underline disabled:text-slate-400"
                    disabled={filters.length === 0}
                >
                    Réinitialiser les filtres
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
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">
                            {mode === 'snapshot' ? 'Axe Analyse (X)' : 'Champ de données à suivre'}
                        </label>
                        <select
                            className="w-full p-2 bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded focus:ring-2 focus:ring-brand-500 shadow-sm"
                            value={dimension}
                            onChange={(e) => onSetDimension(e.target.value)}
                        >
                            {fields.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                    </div>

                    <div className="space-y-3">
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                            <label className="block text-xs font-black text-slate-600 uppercase">Métrique Principale (Y1)</label>
                            <div className="grid grid-cols-5 gap-1">
                                {[
                                    { id: 'count', label: 'Cpt' },
                                    { id: 'distinct', label: 'Dist' },
                                    { id: 'sum', label: 'Σ' },
                                    { id: 'min', label: 'Min' },
                                    { id: 'max', label: 'Max' }
                                ].map(m => (
                                    <button
                                        key={m.id}
                                        onClick={() => onSetMetric(m.id as MetricType)}
                                        className={`py-1.5 text-[10px] font-bold rounded border transition-all ${metric === m.id ? 'bg-brand-600 border-brand-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-500 hover:border-brand-300'}`}
                                    >
                                        {m.label}
                                    </button>
                                ))}
                            </div>

                            {['sum', 'min', 'max'].includes(metric) && (
                                <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                                    <label className="block text-xs font-black text-slate-500 mb-1 uppercase">Champ de données à afficher (Y1) :</label>
                                    {numericFields.length > 0 ? (
                                        <select
                                            className="w-full p-1.5 bg-white border border-slate-300 text-slate-800 text-xs rounded focus:ring-brand-500 shadow-sm"
                                            value={valueField}
                                            onChange={(e) => onSetValueField(e.target.value)}
                                        >
                                            {numericFields.map(f => {
                                                const unit = currentDataset?.fieldConfigs?.[f]?.unit;
                                                return <option key={f} value={f}>{f} {unit ? `(${unit})` : ''}</option>
                                            })}
                                        </select>
                                    ) : (
                                        <p className="text-xs text-red-500 italic">Aucun champ numérique.</p>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="p-3 bg-brand-50/30 rounded-lg border border-brand-100 space-y-3">
                            <div className="flex justify-between items-center">
                                <label className="block text-xs font-black text-brand-700 uppercase">Métrique Secondaire (Y2)</label>
                                {metric2 !== 'none' && (
                                    <button onClick={() => onSetMetric2('none')} className="text-xs font-bold text-brand-600 hover:underline uppercase">Masquer</button>
                                )}
                            </div>
                            <div className="grid grid-cols-6 gap-1">
                                {[
                                    { id: 'none', label: 'Off' },
                                    { id: 'count', label: 'Cpt' },
                                    { id: 'distinct', label: 'Dist' },
                                    { id: 'sum', label: 'Σ' },
                                    { id: 'min', label: 'Min' },
                                    { id: 'max', label: 'Max' }
                                ].map(m => (
                                    <button
                                        key={m.id}
                                        onClick={() => onSetMetric2(m.id as any)}
                                        className={`py-1 text-[10px] font-black rounded border transition-all ${metric2 === m.id ? 'bg-brand-600 border-brand-600 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-brand-300'}`}
                                    >
                                        {m.label}
                                    </button>
                                ))}
                            </div>

                            {['sum', 'min', 'max'].includes(metric2) && (
                                <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                                    <label className="block text-xs font-black text-brand-600 mb-1 uppercase">Champ de données à afficher (Y2) :</label>
                                    {numericFields.length > 0 ? (
                                        <select
                                            className="w-full p-1.5 bg-white border border-brand-200 text-slate-800 text-xs rounded focus:ring-brand-500 shadow-sm"
                                            value={valueField2}
                                            onChange={(e) => onSetValueField2(e.target.value)}
                                        >
                                            {numericFields.map(f => {
                                                const unit = currentDataset?.fieldConfigs?.[f]?.unit;
                                                return <option key={f} value={f}>{f} {unit ? `(${unit})` : ''}</option>
                                            })}
                                        </select>
                                    ) : (
                                        <p className="text-xs text-red-500 italic">Aucun champ numérique.</p>
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
                                <button onClick={() => removeFilter(idx)} className="absolute top-1 right-1 text-slate-400 hover:text-red-500" aria-label="Supprimer le filtre">
                                    <X className="w-3 h-3" />
                                </button>
                                <select className="w-full bg-white border border-slate-200 rounded px-1 py-1" value={filter.field} onChange={(e) => updateFilter(idx, { field: e.target.value })}>
                                    {fields.map(f => <option key={f} value={f}>{f}</option>)}
                                </select>
                                <select className="w-full bg-white border border-slate-200 rounded px-1 py-1 font-medium text-indigo-700" value={filter.operator || 'in'} onChange={(e) => updateFilter(idx, { operator: e.target.value as any })}>
                                    <option value="in">Est égal à / Dans</option>
                                    <option value="starts_with">Commence par</option>
                                    <option value="contains">Contient</option>
                                    <option value="gt">Supérieur à (&gt;)</option>
                                    <option value="lt">Inférieur à (&lt;)</option>
                                    <option value="eq">Égal à (=)</option>
                                </select>
                                {(!filter.operator || filter.operator === 'in') ? (
                                    <MultiSelect options={getDistinctValuesForField(filter.field)} selected={Array.isArray(filter.value) ? filter.value : []} onChange={(newValues) => updateFilter(idx, { value: newValues })} placeholder="Sélectionner valeurs..." />
                                ) : (
                                    <input type={['gt', 'lt'].includes(filter.operator!) ? "number" : "text"} className="w-full bg-white border border-slate-200 rounded px-2 py-1" placeholder="Valeur..." value={filter.value as string} onChange={(e) => updateFilter(idx, { value: e.target.value })} />
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

                    <div className="space-y-3">
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-slate-500 uppercase">Limiter au Top N :</label>
                                <input type="number" className="w-16 text-xs border border-slate-200 rounded p-1 bg-slate-50 text-right font-bold" value={limit} onChange={(e) => onSetLimit(Number(e.target.value))} />
                            </div>

                            {mode === 'snapshot' && (
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Tri :</label>
                                    <select className="text-xs border border-slate-200 rounded p-1 bg-slate-50 font-medium" value={sortOrder} onChange={(e) => onSetSortOrder(e.target.value as any)}>
                                        <option value="desc">Valeur ↓</option>
                                        <option value="asc">Valeur ↑</option>
                                        <option value="alpha">Alphabétique</option>
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        {mode === 'snapshot' && (
                            <label className="flex items-center gap-2 cursor-pointer">
                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${isCumulative ? 'bg-brand-500 border-brand-500 text-white' : 'border-slate-300 bg-white'}`}>
                                    {isCumulative && <Check className="w-3 h-3" />}
                                </div>
                                <input type="checkbox" className="hidden" checked={isCumulative} onChange={onToggleCumulative} />
                                <span className="text-xs text-slate-700">Mode Cumulatif</span>
                            </label>
                        )}
                        <label className="flex items-center gap-2 cursor-pointer">
                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${showTable ? 'bg-brand-500 border-brand-500 text-white' : 'border-slate-300 bg-white'}`}>
                                {showTable && <Check className="w-3 h-3" />}
                            </div>
                            <input type="checkbox" className="hidden" checked={showTable} onChange={onToggleTable} />
                            <span className="text-xs text-slate-700">Afficher Tableau</span>
                        </label>
                        {mode === 'trend' && (
                            <label className="flex items-center gap-2 cursor-pointer animate-in fade-in">
                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${showForecast ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-300 bg-white'}`}>
                                    {showForecast && <Check className="w-3 h-3" />}
                                </div>
                                <input type="checkbox" className="hidden" checked={showForecast} onChange={onToggleForecast} />
                                <span className="text-xs text-indigo-700 font-bold">Projection (Tendance)</span>
                            </label>
                        )}
                    </div>

                    {mode === 'snapshot' && (
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Sous-Groupement (Séries)</label>
                            <select className="w-full p-2 bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded focus:ring-brand-500" value={segment} onChange={(e) => onSetSegment(e.target.value)}>
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

                    <div className="grid grid-cols-4 gap-1">
                        {(mode === 'snapshot' ? [
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
                        ] : [
                            { id: 'line', icon: Activity, label: 'Lignes' },
                            { id: 'area', icon: TrendingUp, label: 'Aires' },
                            { id: 'stacked-area', icon: TrendingUp, label: 'Aires Emp.' },
                            { id: 'column', icon: BarChart3, label: 'Histo' },
                            { id: 'stacked-column', icon: BarChart3, label: 'Histo Emp.' },
                            { id: 'percent-column', icon: BarChart3, label: 'Histo 100%' },
                        ]).map((type) => {
                            const Icon = (type as any).icon;
                            return (
                                <button key={type.id} onClick={() => onSetChartType(type.id as ChartType)} className={`flex flex-col items-center justify-center p-1.5 rounded border transition-all ${chartType === type.id ? 'bg-brand-600 border-brand-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-400 hover:border-brand-300'}`} title={type.label}>
                                    <Icon className={`w-4 h-4 ${type.rotate ? 'transform rotate-90' : ''}`} />
                                    <span className="text-xs font-bold uppercase mt-1 truncate w-full text-center">{type.label}</span>
                                </button>
                            )
                        })}
                    </div>

                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-3">
                        <label className="text-xs font-black text-slate-600 uppercase block">Schéma de Couleurs</label>
                        <div className="grid grid-cols-3 gap-1">
                            {['multi', 'single', 'gradient'].map(m => (
                                <button key={m} onClick={() => onSetColorMode(m as ColorMode)} className={`py-1 text-xs font-bold rounded border uppercase ${colorMode === m ? 'bg-white border-slate-400 text-slate-900 shadow-sm' : 'bg-transparent border-slate-200 text-slate-400'}`}>
                                    {m === 'multi' ? 'Multi' : m === 'single' ? 'Unique' : 'Dégradé'}
                                </button>
                            ))}
                        </div>
                        {colorMode === 'multi' && (
                            <select value={colorPalette} onChange={(e) => onSetColorPalette(e.target.value as ColorPalette)} className="w-full text-xs border border-slate-200 rounded p-1.5 bg-white animate-in fade-in">
                                <option value="default">Palette Défaut</option>
                                <option value="pastel">Palette Pastel</option>
                                <option value="vibrant">Palette Vibrante</option>
                            </select>
                        )}
                        {colorMode === 'single' && (
                            <div className="flex items-center gap-2 animate-in fade-in">
                                <input type="color" value={singleColor} onChange={(e) => onSetSingleColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 p-0" />
                                <span className="text-xs text-slate-600 font-mono font-bold uppercase">{singleColor}</span>
                            </div>
                        )}
                        {colorMode === 'gradient' && (
                            <div className="grid grid-cols-2 gap-2 animate-in fade-in">
                                <div className="flex items-center gap-2 bg-white p-1 rounded border border-slate-200">
                                    <input type="color" value={gradientStart} onChange={(e) => onSetGradientStart(e.target.value)} className="w-6 h-6 rounded cursor-pointer border-0 p-0" />
                                    <span className="text-xs font-bold text-slate-500 uppercase">{gradientStart}</span>
                                </div>
                                <div className="flex items-center gap-2 bg-white p-1 rounded border border-slate-200">
                                    <input type="color" value={gradientEnd} onChange={(e) => onSetGradientEnd(e.target.value)} className="w-6 h-6 rounded cursor-pointer border-0 p-0" />
                                    <span className="text-xs font-bold text-slate-500 uppercase">{gradientEnd}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* SECTION 5: TITRE & UNITE */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2 mb-2">
                        <Settings2 className="w-4 h-4 text-brand-600" />
                        <span className="text-sm font-black text-slate-800 uppercase tracking-tighter">5. Titre & Unité</span>
                    </div>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Titre du graphique</label>
                            <input type="text" className="w-full p-2 bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded focus:ring-2 focus:ring-brand-500 shadow-sm" placeholder="Auto..." value={chartTitle} onChange={(e) => onSetChartTitle(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Unité des valeurs</label>
                            <input type="text" className="w-full p-2 bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded focus:ring-2 focus:ring-brand-500 shadow-sm" placeholder="Ex: €, k€, %..." value={customUnit} onChange={(e) => onSetCustomUnit(e.target.value)} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
