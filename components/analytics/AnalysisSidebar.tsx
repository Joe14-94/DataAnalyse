import React from 'react';
import {
  Database,
  Activity,
  TrendingUp,
  Filter,
  Table as TableIcon,
  ChevronDown,
  X,
  Settings2,
  BarChart3,
  PieChart as PieIcon,
  Radar as RadarIcon,
  LayoutGrid,
  CalendarRange,
  Calculator
} from 'lucide-react';
import { MultiSelect } from './MultiSelect';
import { FilterRule, ColorMode, ColorPalette, Dataset, ImportBatch } from '../../types';
import { AnalysisMode, MetricType, ChartType } from '../../hooks/useAnalysisStudioLogic';

interface AnalysisSidebarProps {
  mode: AnalysisMode;
  setMode: (mode: AnalysisMode) => void;
  batches: ImportBatch[];
  selectedBatchId: string;
  setSelectedBatchId: (id: string) => void;
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
  dimension: string;
  setDimension: (dim: string) => void;
  metric: MetricType;
  setMetric: (m: MetricType) => void;
  valueField: string;
  setValueField: (f: string) => void;
  metric2: MetricType | 'none';
  setMetric2: (m: MetricType | 'none') => void;
  valueField2: string;
  setValueField2: (f: string) => void;
  segment: string;
  setSegment: (s: string) => void;
  chartType: ChartType;
  setChartType: (t: ChartType) => void;
  limit: number;
  setLimit: (l: number) => void;
  sortOrder: 'asc' | 'desc' | 'none';
  setSortOrder: (o: 'asc' | 'desc' | 'none') => void;
  isCumulative: boolean;
  setIsCumulative: (c: boolean) => void;
  filters: FilterRule[];
  addFilter: () => void;
  updateFilter: (index: number, updates: Partial<FilterRule>) => void;
  removeFilter: (index: number) => void;
  showForecast: boolean;
  setShowForecast: (s: boolean) => void;
  colorMode: ColorMode;
  setColorMode: (m: ColorMode) => void;
  colorPalette: ColorPalette;
  setColorPalette: (p: ColorPalette) => void;
  singleColor: string;
  setSingleColor: (c: string) => void;
  gradientStart: string;
  setGradientStart: (c: string) => void;
  gradientEnd: string;
  setGradientEnd: (c: string) => void;
  chartTitle: string;
  setChartTitle: (t: string) => void;
  customUnit: string;
  setCustomUnit: (u: string) => void;
  fields: string[];
  numericFields: string[];
  currentDataset: Dataset | null;
  getDistinctValuesForField: (field: string) => string[];
}

export const AnalysisSidebar: React.FC<AnalysisSidebarProps> = ({
  mode,
  setMode,
  batches,
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
  addFilter,
  updateFilter,
  removeFilter,
  showForecast,
  setShowForecast,
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
  fields,
  numericFields,
  currentDataset,
  getDistinctValuesForField
}) => {
  return (
    <div className="w-80 bg-white border-r border-slate-200 h-full overflow-y-auto custom-scrollbar flex flex-col shadow-sm">
      <div className="p-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-5 h-5 text-brand-600" />
          <span className="font-black text-slate-800 uppercase tracking-tighter">
            Studio d'Analyse
          </span>
        </div>

        <div className="flex bg-slate-200 p-1 rounded-lg">
          <button
            onClick={() => setMode('snapshot')}
            className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-bold rounded-md transition-all ${mode === 'snapshot' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Activity className="w-3.5 h-3.5" /> Snapshot
          </button>
          <button
            onClick={() => setMode('trend')}
            className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-bold rounded-md transition-all ${mode === 'trend' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <TrendingUp className="w-3.5 h-3.5" /> Évolution
          </button>
        </div>
      </div>

      <div className="p-4 space-y-8 pb-20">
        {/* SECTION 1: DONNÉES */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-4 h-4 text-brand-600" />
            <span className="text-sm font-black text-slate-800 uppercase tracking-tighter">
              1. Données & Métriques
            </span>
          </div>

          <div className="space-y-4">
            {mode === 'snapshot' ? (
              <div>
                <label className="block text-xs font-black text-slate-500 mb-1 uppercase tracking-wider">
                  Sélection du batch :
                </label>
                <select
                  className="w-full p-2 bg-white border border-slate-200 text-slate-800 text-xs rounded-lg focus:ring-brand-500 shadow-sm"
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                >
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.date.split('-').reverse().join('/')})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-black text-slate-500 mb-1 uppercase tracking-wider text-[10px]">
                    Début :
                  </label>
                  <input
                    type="date"
                    className="w-full p-1.5 bg-white border border-slate-200 text-slate-800 text-xs rounded-lg focus:ring-brand-500"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 mb-1 uppercase tracking-wider text-[10px]">
                    Fin :
                  </label>
                  <input
                    type="date"
                    className="w-full p-1.5 bg-white border border-slate-200 text-slate-800 text-xs rounded-lg focus:ring-brand-500"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-black text-slate-500 mb-1 uppercase">
                Champ de données à suivre :
              </label>
              <select
                className="w-full p-2 bg-white border border-slate-200 text-slate-800 text-xs font-bold rounded-lg focus:ring-brand-500 shadow-sm"
                value={dimension}
                onChange={(e) => setDimension(e.target.value)}
              >
                {fields.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                <label className="block text-xs font-black text-slate-600 uppercase">
                  Métrique Principale (Y1)
                </label>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    onClick={() => setMetric('count')}
                    className={`py-1.5 text-xs font-bold rounded border transition-all ${metric === 'count' ? 'bg-brand-600 border-brand-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-500 hover:border-brand-300'}`}
                  >
                    Compte
                  </button>
                  <button
                    onClick={() => setMetric('distinct')}
                    className={`py-1.5 text-xs font-bold rounded border transition-all ${metric === 'distinct' ? 'bg-brand-600 border-brand-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-500 hover:border-brand-300'}`}
                  >
                    Distinct
                  </button>
                  <button
                    onClick={() => setMetric('sum')}
                    className={`py-1.5 text-xs font-bold rounded border transition-all ${metric === 'sum' ? 'bg-brand-600 border-brand-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-500 hover:border-brand-300'}`}
                  >
                    Somme
                  </button>
                </div>

                {metric === 'sum' && (
                  <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="block text-xs font-black text-slate-500 mb-1 uppercase">
                      Champ de données à afficher (Y1) :
                    </label>
                    {numericFields.length > 0 ? (
                      <select
                        className="w-full p-1.5 bg-white border border-slate-300 text-slate-800 text-xs rounded focus:ring-brand-500 shadow-sm"
                        value={valueField}
                        onChange={(e) => setValueField(e.target.value)}
                      >
                        {numericFields.map((f) => {
                          const unit = currentDataset?.fieldConfigs?.[f]?.unit;
                          return (
                            <option key={f} value={f}>
                              {f} {unit ? `(${unit})` : ''}
                            </option>
                          );
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
                  <label className="block text-xs font-black text-brand-700 uppercase">
                    Métrique Secondaire (Y2)
                  </label>
                  {metric2 !== 'none' && (
                    <button
                      onClick={() => setMetric2('none')}
                      className="text-xs font-bold text-brand-600 hover:underline uppercase"
                    >
                      Masquer
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {[
                    { id: 'none', label: 'Off' },
                    { id: 'count', label: 'Cpt' },
                    { id: 'distinct', label: 'Dist' },
                    { id: 'sum', label: 'Σ' }
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setMetric2(m.id as any)}
                      className={`py-1 text-xs font-black rounded border transition-all ${metric2 === m.id ? 'bg-brand-600 border-brand-600 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-brand-300'}`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {metric2 === 'sum' && (
                  <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="block text-xs font-black text-brand-600 mb-1 uppercase">
                      Champ de données à afficher (Y2) :
                    </label>
                    {numericFields.length > 0 ? (
                      <select
                        className="w-full p-1.5 bg-white border border-brand-200 text-slate-800 text-xs rounded focus:ring-brand-500 shadow-sm"
                        value={valueField2}
                        onChange={(e) => setValueField2(e.target.value)}
                      >
                        {numericFields.map((f) => {
                          const unit = currentDataset?.fieldConfigs?.[f]?.unit;
                          return (
                            <option key={f} value={f}>
                              {f} {unit ? `(${unit})` : ''}
                            </option>
                          );
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
        </div>

        {/* SECTION 2: FILTRES */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Filter className="w-4 h-4 text-brand-600" />
            <span className="text-sm font-black text-slate-800 uppercase tracking-tighter">
              2. Filtrage avancé ({filters.length})
            </span>
          </div>

          <div className="space-y-3 mb-3">
            {filters.map((filter, idx) => (
              <div
                key={idx}
                className="bg-slate-50 p-2 rounded border border-slate-200 text-xs space-y-2 relative group"
              >
                <button
                  onClick={() => removeFilter(idx)}
                  className="absolute top-1 right-1 text-slate-400 hover:text-red-500"
                  aria-label="Supprimer le filtre"
                >
                  <X className="w-3 h-3" />
                </button>

                {/* Field Selector */}
                <select
                  className="w-full bg-white border border-slate-200 rounded px-1 py-1"
                  value={filter.field}
                  onChange={(e) => updateFilter(idx, { field: e.target.value })}
                >
                  {fields.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
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
                {!filter.operator || filter.operator === 'in' ? (
                  <MultiSelect
                    options={getDistinctValuesForField(filter.field)}
                    selected={Array.isArray(filter.value) ? filter.value : []}
                    onChange={(newValues) => updateFilter(idx, { value: newValues })}
                    placeholder="Sélectionner valeurs..."
                  />
                ) : (
                  <input
                    type={['gt', 'lt'].includes(filter.operator) ? 'number' : 'text'}
                    className="w-full bg-white border border-slate-200 rounded px-2 py-1"
                    placeholder="Valeur..."
                    value={filter.value as string}
                    onChange={(e) => updateFilter(idx, { value: e.target.value })}
                  />
                )}
              </div>
            ))}
          </div>
          <button
            onClick={addFilter}
            className="text-xs text-brand-600 flex items-center hover:text-brand-800 font-medium border border-dashed border-brand-300 rounded w-full justify-center py-1.5 hover:bg-brand-50"
          >
            <Filter className="w-3 h-3 mr-1" /> Ajouter un filtre
          </button>
        </div>

        {/* SECTION 3: ANALYSE & GROUPEMENT */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <TableIcon className="w-4 h-4 text-brand-600" />
            <span className="text-sm font-black text-slate-800 uppercase tracking-tighter">
              3. Analyse & Groupement
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-500 uppercase">
                  Limiter au Top N :
                </label>
                <input
                  type="number"
                  className="w-16 text-xs border border-slate-200 rounded p-1 bg-slate-50 text-right font-bold"
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                />
              </div>

              {mode === 'snapshot' && (
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter">
                    Trier par valeur :
                  </label>
                  <select
                    className="text-xs border border-slate-200 rounded p-1 bg-slate-50 font-bold"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as any)}
                  >
                    <option value="none">Aucun</option>
                    <option value="desc">Décroissant</option>
                    <option value="asc">Croissant</option>
                  </select>
                </div>
              )}

              {mode === 'snapshot' && (
                <div className="flex items-center justify-between py-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter">
                    Cumul des valeurs :
                  </label>
                  <button
                    onClick={() => setIsCumulative(!isCumulative)}
                    className={`w-8 h-4 rounded-full relative transition-colors ${isCumulative ? 'bg-brand-600' : 'bg-slate-300'}`}
                  >
                    <div
                      className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${isCumulative ? 'translate-x-4' : 'translate-x-0'}`}
                    />
                  </button>
                </div>
              )}

              {mode === 'trend' && (
                <div className="flex items-center justify-between py-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter">
                    Afficher Tendance :
                  </label>
                  <button
                    onClick={() => setShowForecast(!showForecast)}
                    className={`w-8 h-4 rounded-full relative transition-colors ${showForecast ? 'bg-indigo-600' : 'bg-slate-300'}`}
                  >
                    <div
                      className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${showForecast ? 'translate-x-4' : 'translate-x-0'}`}
                    />
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-black text-slate-500 mb-1 uppercase tracking-wider">
                Segmentation (Facultatif) :
              </label>
              <select
                className="w-full p-2 bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg focus:ring-brand-500"
                value={segment}
                onChange={(e) => setSegment(e.target.value)}
              >
                <option value="">Aucune segmentation</option>
                {fields.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
              {segment && (
                <p className="text-[10px] text-brand-600 mt-1 italic font-medium">
                  💡 La segmentation active le mode multi-séries.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 4: STYLE & RENDU */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <Settings2 className="w-4 h-4 text-brand-600" />
            <span className="text-sm font-black text-slate-800 uppercase tracking-tighter">
              4. Style & Rendu
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2 mb-4">
            {[
              { id: 'column', icon: BarChart3, label: 'Col.' },
              { id: 'bar', icon: BarChart3, label: 'Barre', class: 'rotate-90' },
              { id: 'line', icon: Activity, label: 'Ligne' },
              { id: 'area', icon: Activity, label: 'Aire' },
              { id: 'pie', icon: PieIcon, label: 'Cam.' },
              { id: 'donut', icon: PieIcon, label: 'Donut' },
              { id: 'radar', icon: RadarIcon, label: 'Radar' },
              { id: 'treemap', icon: LayoutGrid, label: 'Tree' }
            ].map((type) => (
              <button
                key={type.id}
                onClick={() => setChartType(type.id as any)}
                title={type.label}
                className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${chartType === type.id ? 'bg-brand-50 border-brand-600 text-brand-600 shadow-sm ring-1 ring-brand-600' : 'bg-white border-slate-200 text-slate-400 hover:border-brand-300'}`}
              >
                <type.icon className={`w-4 h-4 ${type.class || ''}`} />
                <span className="text-[9px] font-bold mt-1 uppercase">{type.label}</span>
              </button>
            ))}
          </div>

          {/* Avancé: Titre & Unité */}
          <div className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div>
              <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase">
                Titre personnalisé :
              </label>
              <input
                type="text"
                className="w-full p-1.5 text-xs border border-slate-200 rounded"
                placeholder="Ex: Analyse de performance Q1"
                value={chartTitle}
                onChange={(e) => setChartTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase">
                Unité / Suffixe :
              </label>
              <input
                type="text"
                className="w-full p-1.5 text-xs border border-slate-200 rounded"
                placeholder="Ex: €, kg, %"
                value={customUnit}
                onChange={(e) => setCustomUnit(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-black text-slate-500 mb-2 uppercase">
                Palette de couleurs :
              </label>
              <div className="flex bg-slate-100 p-1 rounded-md mb-3">
                {['multi', 'single', 'gradient'].map((m) => (
                  <button
                    key={m}
                    onClick={() => setColorMode(m as any)}
                    className={`flex-1 py-1 text-[10px] font-black rounded uppercase transition-all ${colorMode === m ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
                  >
                    {m === 'multi' ? 'Multi' : m === 'single' ? 'Unique' : 'Grad.'}
                  </button>
                ))}
              </div>

              {colorMode === 'multi' && (
                <div className="grid grid-cols-5 gap-1.5">
                  {['p1', 'p2', 'p3', 'p4', 'p5'].map((p) => (
                    <button
                      key={p}
                      onClick={() => setColorPalette(p as any)}
                      className={`h-6 rounded-md border-2 transition-all ${colorPalette === p ? 'border-brand-600 scale-110 shadow-md' : 'border-transparent hover:scale-105'}`}
                      style={{
                        background: `linear-gradient(45deg, ${p === 'p1' ? '#6366f1' : p === 'p2' ? '#10b981' : p === 'p3' ? '#f59e0b' : p === 'p4' ? '#ef4444' : '#8b5cf6'}, #cbd5e1)`
                      }}
                    />
                  ))}
                </div>
              )}

              {colorMode === 'single' && (
                <input
                  type="color"
                  className="w-full h-8 rounded-md cursor-pointer border border-slate-200"
                  value={singleColor}
                  onChange={(e) => setSingleColor(e.target.value)}
                />
              )}

              {colorMode === 'gradient' && (
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    className="flex-1 h-8 rounded-md cursor-pointer"
                    value={gradientStart}
                    onChange={(e) => setGradientStart(e.target.value)}
                  />
                  <TrendingUp className="w-4 h-4 text-slate-400" />
                  <input
                    type="color"
                    className="flex-1 h-8 rounded-md cursor-pointer"
                    value={gradientEnd}
                    onChange={(e) => setGradientEnd(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
