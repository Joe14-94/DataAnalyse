import React from 'react';
import { BarChart3, TrendingUp, ChevronDown, ChevronRight, Home } from 'lucide-react';
import {
  ChartType,
  ColorMode,
  ColorPalette,
  getChartTypeConfig
} from '../../../logic/pivotToChart';

interface ChartConfigurationPanelProps {
  selectedChartType: ChartType;
  setSelectedChartType: (t: ChartType) => void;
  availableLevels: number;
  hierarchyLevel: number | undefined;
  setHierarchyLevel: (l: number | undefined) => void;
  limit: number;
  setLimit: (l: number) => void;
  sortBy: 'name' | 'value' | 'none';
  setSortBy: (s: 'name' | 'value' | 'none') => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (o: 'asc' | 'desc') => void;
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
  updateMode: 'fixed' | 'latest';
  setUpdateMode: (m: 'fixed' | 'latest') => void;
}

export const ChartConfigurationPanel: React.FC<ChartConfigurationPanelProps> = ({
  selectedChartType,
  setSelectedChartType,
  availableLevels,
  hierarchyLevel,
  setHierarchyLevel,
  limit,
  setLimit,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
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
  updateMode,
  setUpdateMode
}) => {
  return (
    <div className="w-80 border-r border-slate-200 p-6 overflow-y-auto custom-scrollbar flex flex-col gap-8 bg-slate-50/30">
      {/* Type de graphique */}
      <section>
        <div className="flex items-center gap-2 mb-4 text-slate-800 font-bold">
          <BarChart3 className="w-5 h-5 text-brand-600" />
          <h3 className="text-sm uppercase tracking-wider">Type de graphique</h3>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            'column',
            'bar',
            'line',
            'area',
            'pie',
            'donut',
            'radar',
            'treemap',
            'sunburst',
            'radial',
            'funnel'
          ].map((type) => (
            <button
              key={type}
              onClick={() => setSelectedChartType(type as ChartType)}
              className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${selectedChartType === type ? 'bg-brand-600 border-brand-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:border-brand-300'}`}
            >
              {getChartTypeConfig(type as ChartType)?.label || type}
            </button>
          ))}
        </div>
      </section>

      {/* Configuration des données */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 mb-2 text-slate-800 font-bold">
          <ChevronRight className="w-5 h-5 text-brand-600" />
          <h3 className="text-sm uppercase tracking-wider">Données</h3>
        </div>

        {availableLevels > 1 && (
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase">
              Niveau de hiérarchie
            </label>
            <select
              className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-brand-500 outline-none"
              value={hierarchyLevel === undefined ? '-1' : hierarchyLevel}
              onChange={(e) =>
                setHierarchyLevel(e.target.value === '-1' ? undefined : Number(e.target.value))
              }
            >
              <option value="-1">Auto (Feuilles uniquement)</option>
              {Array.from({ length: availableLevels }).map((_, i) => (
                <option key={i} value={i}>
                  Niveau {i + 1}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-500 uppercase">Limite (Top N)</label>
          <input
            type="number"
            min="0"
            className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-brand-500 outline-none"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            placeholder="Ex: 10 (0 = tout)"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase">Trier par</label>
            <select
              className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-brand-500 outline-none"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
            >
              <option value="value">Valeur</option>
              <option value="name">Nom</option>
              <option value="none">Aucun</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase">Ordre</label>
            <select
              className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-brand-500 outline-none"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
            >
              <option value="desc">Décroissant</option>
              <option value="asc">Croissant</option>
            </select>
          </div>
        </div>
      </section>

      {/* Style & Couleurs */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 mb-2 text-slate-800 font-bold">
          <TrendingUp className="w-5 h-5 text-brand-600" />
          <h3 className="text-sm uppercase tracking-wider">Style & Couleurs</h3>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-500 uppercase">
            Mode de coloration
          </label>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            {[
              { id: 'multi', label: 'Palette' },
              { id: 'single', label: 'Unique' },
              { id: 'gradient', label: 'Dégradé' }
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => setColorMode(mode.id as ColorMode)}
                className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${colorMode === mode.id ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {colorMode === 'multi' && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
            <label className="block text-xs font-bold text-slate-500 uppercase">Palette</label>
            <div className="grid grid-cols-3 gap-2">
              {['default', 'pastel', 'vibrant'].map((p) => (
                <button
                  key={p}
                  onClick={() => setColorPalette(p as ColorPalette)}
                  className={`py-1 rounded border text-[10px] font-bold capitalize transition-all ${colorPalette === p ? 'bg-brand-50 border-brand-600 text-brand-600' : 'bg-white border-slate-200 text-slate-500 hover:border-brand-300'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {colorMode === 'single' && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
            <label className="block text-xs font-bold text-slate-500 uppercase">
              Couleur unique
            </label>
            <input
              type="color"
              className="w-full h-8 rounded-lg cursor-pointer border border-slate-200 p-1"
              value={singleColor}
              onChange={(e) => setSingleColor(e.target.value)}
            />
          </div>
        )}

        {colorMode === 'gradient' && (
          <div className="grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 uppercase text-[10px]">
                Début
              </label>
              <input
                type="color"
                className="w-full h-8 rounded-lg cursor-pointer border border-slate-200 p-1"
                value={gradientStart}
                onChange={(e) => setGradientStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 uppercase text-[10px]">
                Fin
              </label>
              <input
                type="color"
                className="w-full h-8 rounded-lg cursor-pointer border border-slate-200 p-1"
                value={gradientEnd}
                onChange={(e) => setGradientEnd(e.target.value)}
              />
            </div>
          </div>
        )}
      </section>

      {/* Mode de mise à jour */}
      <section className="pt-4 border-t border-slate-100">
        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
          Comportement Dashboard
        </label>
        <select
          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-brand-500 outline-none"
          value={updateMode}
          onChange={(e) => setUpdateMode(e.target.value as 'fixed' | 'latest')}
        >
          <option value="latest">Auto-refresh (Dernières données)</option>
          <option value="fixed">Figé (Batch actuel uniquement)</option>
        </select>
        <p className="text-[10px] text-slate-400 mt-2 italic">
          {updateMode === 'latest'
            ? "Le widget s'actualisera à chaque nouvel import de données."
            : "Le widget gardera toujours les données de l'import actuel."}
        </p>
      </section>
    </div>
  );
};
