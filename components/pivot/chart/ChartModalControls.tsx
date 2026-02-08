import React from 'react';
import { TrendingUp } from 'lucide-react';
import { getChartTypeConfig } from '../../../logic/pivotToChart';

interface ChartModalControlsProps {
    selectedChartType: any;
    onChartTypeChange: (type: any) => void;
    chartTypeOptions: any[];
    metadata: any;
    limit: number;
    onLimitChange: (limit: number) => void;
    isHierarchicalType: boolean;
    availableLevels: number;
    hierarchyLevel: number | undefined;
    onHierarchyLevelChange: (level: number | undefined) => void;
    sortBy: string;
    onSortByChange: (sortBy: any) => void;
    sortOrder: string;
    onSortOrderChange: (order: any) => void;
    sunburstTitle: string;
    onSunburstTitleChange: (title: string) => void;
    showCenterTotal: boolean;
    onShowCenterTotalChange: (show: boolean) => void;
    showSunburstLegend: boolean;
    onShowSunburstLegendChange: (show: boolean) => void;
    colorMode: any;
    onColorModeChange: (mode: any) => void;
    colorPalette: any;
    onColorPaletteChange: (palette: any) => void;
    singleColor: string;
    onSingleColorChange: (color: string) => void;
    gradientStart: string;
    onGradientStartChange: (color: string) => void;
    gradientEnd: string;
    onGradientEndChange: (color: string) => void;
    updateMode: string;
    onUpdateModeChange: (mode: any) => void;
}

export const ChartModalControls: React.FC<ChartModalControlsProps> = ({
    selectedChartType, onChartTypeChange, chartTypeOptions, metadata,
    limit, onLimitChange, isHierarchicalType,
    availableLevels, hierarchyLevel, onHierarchyLevelChange,
    sortBy, onSortByChange, sortOrder, onSortOrderChange,
    sunburstTitle, onSunburstTitleChange, showCenterTotal, onShowCenterTotalChange, showSunburstLegend, onShowSunburstLegendChange,
    colorMode, onColorModeChange, colorPalette, onColorPaletteChange,
    singleColor, onSingleColorChange, gradientStart, onGradientStartChange, gradientEnd, onGradientEndChange,
    updateMode, onUpdateModeChange
}) => {
    return (
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-600">Type:</label>
                <select
                    value={selectedChartType}
                    onChange={(e) => onChartTypeChange(e.target.value)}
                    className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                >
                    {chartTypeOptions.map((type) => {
                        const config = getChartTypeConfig(type);
                        return (
                            <option key={type} value={type}>
                                {config.label}
                                {type === metadata.suggestedType && ' ★'}
                            </option>
                        );
                    })}
                </select>
            </div>

            <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-600">
                    {isHierarchicalType ? 'Limiter (Niv.1):' : 'Limiter à:'}
                </label>
                <select
                    value={limit}
                    onChange={(e) => onLimitChange(Number(e.target.value))}
                    className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                >
                    <option value={0}>Tout afficher</option>
                    <option value={5}>Top 5</option>
                    <option value={10}>Top 10</option>
                    <option value={15}>Top 15</option>
                    <option value={20}>Top 20</option>
                </select>
            </div>

            {availableLevels > 1 && !isHierarchicalType && (
                <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-slate-600">Niveau:</label>
                    <select
                        value={hierarchyLevel === undefined ? '' : hierarchyLevel}
                        onChange={(e) => onHierarchyLevelChange(e.target.value === '' ? undefined : Number(e.target.value))}
                        className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                    >
                        <option value="">Tous les niveaux</option>
                        {Array.from({ length: availableLevels }, (_, i) => (
                            <option key={i} value={i}>Niveau {i + 1}</option>
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
                            onChange={(e) => onSortByChange(e.target.value)}
                            className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
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
                                onChange={(e) => onSortOrderChange(e.target.value)}
                                className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
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
                    onChange={(e) => onColorModeChange(e.target.value)}
                    className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                >
                    <option value="multi">Plusieurs couleurs</option>
                    <option value="single">Couleur unique</option>
                    <option value="gradient">Dégradé</option>
                </select>
            </div>

            {colorMode === 'multi' && (
                <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-slate-600">Palette:</label>
                    <select
                        value={colorPalette}
                        onChange={(e) => onColorPaletteChange(e.target.value)}
                        className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                    >
                        <option value="default">Défaut</option>
                        <option value="pastel">Pastel</option>
                        <option value="vibrant">Vibrant</option>
                    </select>
                </div>
            )}

            {colorMode === 'single' && (
                <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-slate-600">Couleur:</label>
                    <input type="color" value={singleColor} onChange={(e) => onSingleColorChange(e.target.value)} className="w-8 h-8 rounded border border-slate-300 cursor-pointer" />
                    <span className="text-xs text-slate-500">{singleColor}</span>
                </div>
            )}

            {colorMode === 'gradient' && (
                <>
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold text-slate-600">Début:</label>
                        <input type="color" value={gradientStart} onChange={(e) => onGradientStartChange(e.target.value)} className="w-8 h-8 rounded border border-slate-300 cursor-pointer" />
                        <span className="text-xs text-slate-500">{gradientStart}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold text-slate-600">Fin:</label>
                        <input type="color" value={gradientEnd} onChange={(e) => onGradientEndChange(e.target.value)} className="w-8 h-8 rounded border border-slate-300 cursor-pointer" />
                        <span className="text-xs text-slate-500">{gradientEnd}</span>
                    </div>
                </>
            )}

            {selectedChartType === 'sunburst' && (
                <>
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold text-slate-600">Titre:</label>
                        <input type="text" value={sunburstTitle} onChange={(e) => onSunburstTitleChange(e.target.value)} className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" placeholder="Titre du graphique" style={{ minWidth: '200px' }} />
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="checkbox" id="show-center-total" checked={showCenterTotal} onChange={(e) => onShowCenterTotalChange(e.target.checked)} className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500" />
                        <label htmlFor="show-center-total" className="text-xs font-semibold text-slate-600 cursor-pointer">Total au centre</label>
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="checkbox" id="show-sunburst-legend" checked={showSunburstLegend} onChange={(e) => onShowSunburstLegendChange(e.target.checked)} className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500" />
                        <label htmlFor="show-sunburst-legend" className="text-xs font-semibold text-slate-600 cursor-pointer">Légende niveaux</label>
                    </div>
                </>
            )}

            <div className="ml-auto flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-50 border border-brand-100 rounded-lg shadow-sm">
                    <input type="checkbox" id="auto-update-modal" checked={updateMode === 'latest'} onChange={e => onUpdateModeChange(e.target.checked ? 'latest' : 'fixed')} className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500" />
                    <label htmlFor="auto-update-modal" className="text-xs font-bold text-brand-800 cursor-pointer select-none">Mise à jour automatique</label>
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
