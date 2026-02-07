import React from 'react';
import { TrendingUp } from 'lucide-react';
import { ChartType, ColorMode, ColorPalette } from '../../logic/pivotToChart';
import { getChartTypeConfig } from '../../logic/pivotToChart';

interface ChartOptionsProps {
  selectedChartType: ChartType;
  setSelectedChartType: (v: ChartType) => void;
  metadata: any;
  chartTypeOptions: ChartType[];
  limit: number;
  setLimit: (v: number) => void;
  availableLevels: number;
  hierarchyLevel: number | undefined;
  setHierarchyLevel: (v: number | undefined) => void;
  sortBy: 'name' | 'value' | 'none';
  setSortBy: (v: 'name' | 'value' | 'none') => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (v: 'asc' | 'desc') => void;
  colorMode: ColorMode;
  setColorMode: (v: ColorMode) => void;
  colorPalette: ColorPalette;
  setColorPalette: (v: ColorPalette) => void;
  singleColor: string;
  setSingleColor: (v: string) => void;
  gradientStart: string;
  setGradientStart: (v: string) => void;
  gradientEnd: string;
  setGradientEnd: (v: string) => void;
  sunburstTitle: string;
  setSunburstTitle: (v: string) => void;
  showCenterTotal: boolean;
  setShowCenterTotal: (v: boolean) => void;
  showSunburstLegend: boolean;
  setShowSunburstLegend: (v: boolean) => void;
  updateMode: 'fixed' | 'latest';
  setUpdateMode: (v: 'fixed' | 'latest') => void;
}

export const ChartOptions: React.FC<ChartOptionsProps> = ({
  selectedChartType,
  setSelectedChartType,
  metadata,
  chartTypeOptions,
  limit,
  setLimit,
  availableLevels,
  hierarchyLevel,
  setHierarchyLevel,
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
  sunburstTitle,
  setSunburstTitle,
  showCenterTotal,
  setShowCenterTotal,
  showSunburstLegend,
  setShowSunburstLegend,
  updateMode,
  setUpdateMode
}) => {
  const isHierarchicalType = selectedChartType === 'sunburst' || selectedChartType === 'treemap';

  return (
    <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <label className="text-xs font-semibold text-slate-600">Type:</label>
        <select
          value={selectedChartType}
          onChange={(e) => setSelectedChartType(e.target.value as ChartType)}
          className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-brand-500 outline-none"
        >
          {chartTypeOptions.map((type) => (
            <option key={type} value={type}>
              {getChartTypeConfig(type).label} {type === metadata.suggestedType && ' ★'}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs font-semibold text-slate-600">
          {isHierarchicalType ? 'Limiter (Niv.1):' : 'Limiter à:'}
        </label>
        <select
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-brand-500 outline-none"
        >
          {[0, 5, 10, 15, 20].map((v) => (
            <option key={v} value={v}>
              {v === 0 ? 'Tout afficher' : `Top ${v}`}
            </option>
          ))}
        </select>
      </div>

      {availableLevels > 1 && !isHierarchicalType && (
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-600">Niveau:</label>
          <select
            value={hierarchyLevel === undefined ? '' : hierarchyLevel}
            onChange={(e) =>
              setHierarchyLevel(e.target.value === '' ? undefined : Number(e.target.value))
            }
            className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-brand-500 outline-none"
          >
            <option value="">Tous les niveaux</option>
            {Array.from({ length: availableLevels }, (_, i) => (
              <option key={i} value={i}>
                Niveau {i + 1}
              </option>
            ))}
          </select>
        </div>
      )}

      {!isHierarchicalType && selectedChartType !== 'pie' && selectedChartType !== 'donut' && (
        <>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600">Trier par:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-brand-500 outline-none"
            >
              <option value="value">Valeur</option>
              <option value="name">Nom</option>
              <option value="none">Aucun</option>
            </select>
          </div>
          {sortBy !== 'none' && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600">Ordre:</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-brand-500 outline-none"
              >
                <option value="desc">Décroissant</option>
                <option value="asc">Croissant</option>
              </select>
            </div>
          )}
        </>
      )}

      <div className="flex items-center gap-2">
        <label className="text-xs font-semibold text-slate-600">Mode couleur:</label>
        <select
          value={colorMode}
          onChange={(e) => setColorMode(e.target.value as ColorMode)}
          className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-brand-500 outline-none"
        >
          <option value="multi">Plusieurs</option>
          <option value="single">Unique</option>
          <option value="gradient">Dégradé</option>
        </select>
      </div>

      {colorMode === 'multi' && (
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-600">Palette:</label>
          <select
            value={colorPalette}
            onChange={(e) => setColorPalette(e.target.value as ColorPalette)}
            className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-brand-500 outline-none"
          >
            <option value="default">Défaut</option>
            <option value="pastel">Pastel</option>
            <option value="vibrant">Vibrant</option>
          </select>
        </div>
      )}

      {colorMode === 'single' && (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={singleColor}
            onChange={(e) => setSingleColor(e.target.value)}
            className="w-8 h-8 rounded border cursor-pointer"
          />
        </div>
      )}

      {colorMode === 'gradient' && (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={gradientStart}
            onChange={(e) => setGradientStart(e.target.value)}
            className="w-8 h-8 rounded border cursor-pointer"
          />
          <TrendingUp className="w-4 h-4 text-slate-400" />
          <input
            type="color"
            value={gradientEnd}
            onChange={(e) => setGradientEnd(e.target.value)}
            className="w-8 h-8 rounded border cursor-pointer"
          />
        </div>
      )}

      {selectedChartType === 'sunburst' && (
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-600">Titre:</label>
          <input
            type="text"
            value={sunburstTitle}
            onChange={(e) => setSunburstTitle(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 bg-white outline-none w-40"
          />
        </div>
      )}

      <div className="ml-auto flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-50 border border-brand-100 rounded-lg shadow-sm">
          <input
            type="checkbox"
            id="auto-update-modal"
            checked={updateMode === 'latest'}
            onChange={(e) => setUpdateMode(e.target.checked ? 'latest' : 'fixed')}
            className="w-4 h-4 text-brand-600 rounded border-slate-300"
          />
          <label
            htmlFor="auto-update-modal"
            className="text-xs font-bold text-brand-800 cursor-pointer"
          >
            Mise à jour auto
          </label>
        </div>
        {selectedChartType === metadata.suggestedType && (
          <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-semibold">
            <TrendingUp className="w-3 h-3" /> Recommandé
          </div>
        )}
      </div>
    </div>
  );
};
