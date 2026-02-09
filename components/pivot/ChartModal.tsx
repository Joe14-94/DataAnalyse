import React, { useMemo } from 'react';
import { ChartModalHeader } from './chart/ChartModalHeader';
import { ChartModalControls } from './chart/ChartModalControls';
import { ChartModalDisplay } from './chart/ChartModalDisplay';
import { ChartModalFooter } from './chart/ChartModalFooter';
import { useChartModalLogic } from '../../hooks/useChartModalLogic';
import { PivotResult, PivotConfig, TemporalComparisonConfig } from '../../types';
import { getAvailableHierarchyLevels } from '../../logic/pivotToChart';

interface ChartModalProps {
    isOpen: boolean;
    onClose: () => void;
    pivotData: PivotResult;
    pivotConfig: PivotConfig;
    isTemporalMode?: boolean;
    temporalComparison?: TemporalComparisonConfig | null;
    selectedBatchId?: string;
    companyLogo?: string;
}

export const ChartModal: React.FC<ChartModalProps> = ({
    isOpen,
    onClose,
    pivotData,
    pivotConfig,
    isTemporalMode = false,
    temporalComparison = null,
    selectedBatchId,
    companyLogo
}) => {
    const {
        chartContainerRef,
        state,
        dispatch,
        metadata,
        chartData,
        colors,
        sunburstData,
        sunburstColors,
        d3HierarchyData,
        currentTreemapData,
        handleTreemapDrill,
        handleTreemapBreadcrumb,
        handleChartTypeChange,
        handleCreateWidget,
        handleOpenInAnalytics,
        handleExportHTML,
        handleExportPNG,
        handleExportPDF,
        handleExportXLSX
    } = useChartModalLogic({
        pivotData,
        pivotConfig,
        isTemporalMode,
        temporalComparison,
        selectedBatchId,
        onClose
    });

    const availableLevels = useMemo(() => {
        return getAvailableHierarchyLevels(pivotData);
    }, [pivotData]);

    if (!isOpen) return null;

    const chartTypeOptions: any[] = [
        'column', 'bar', 'stacked-column', 'stacked-bar', 'percent-column', 'percent-bar',
        'line', 'area', 'stacked-area', 'pie', 'donut', 'radar', 'sunburst', 'treemap'
    ];

    const isHierarchicalType = state.selectedChartType === 'sunburst' || state.selectedChartType === 'treemap';

    return (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl max-w-7xl w-full max-h-[95vh] flex flex-col">
                <ChartModalHeader
                    metadata={metadata}
                    selectedChartType={state.selectedChartType}
                    sunburstData={sunburstData}
                    onOpenInAnalytics={handleOpenInAnalytics}
                    onClose={onClose}
                />

                <ChartModalControls
                    selectedChartType={state.selectedChartType}
                    onChartTypeChange={handleChartTypeChange}
                    chartTypeOptions={chartTypeOptions}
                    metadata={metadata}
                    limit={state.limit}
                    onLimitChange={(val) => dispatch({ type: 'SET_LIMIT', payload: val })}
                    isHierarchicalType={isHierarchicalType}
                    availableLevels={availableLevels}
                    hierarchyLevel={state.hierarchyLevel}
                    onHierarchyLevelChange={(val) => dispatch({ type: 'SET_HIERARCHY_LEVEL', payload: val })}
                    sortBy={state.sortBy}
                    onSortByChange={(val) => dispatch({ type: 'SET_SORT_BY', payload: val })}
                    sortOrder={state.sortOrder}
                    onSortOrderChange={(val) => dispatch({ type: 'SET_SORT_ORDER', payload: val })}
                    sunburstTitle={state.sunburstTitle}
                    onSunburstTitleChange={(val) => dispatch({ type: 'SET_SUNBURST_TITLE', payload: val })}
                    showCenterTotal={state.showCenterTotal}
                    onShowCenterTotalChange={(val) => dispatch({ type: 'SET_SHOW_CENTER_TOTAL', payload: val })}
                    showSunburstLegend={state.showSunburstLegend}
                    onShowSunburstLegendChange={(val) => dispatch({ type: 'SET_SHOW_SUNBURST_LEGEND', payload: val })}
                    colorMode={state.colorMode}
                    onColorModeChange={(val) => dispatch({ type: 'SET_COLOR_MODE', payload: val })}
                    colorPalette={state.colorPalette}
                    onColorPaletteChange={(val) => dispatch({ type: 'SET_COLOR_PALETTE', payload: val })}
                    singleColor={state.singleColor}
                    onSingleColorChange={(val) => dispatch({ type: 'SET_SINGLE_COLOR', payload: val })}
                    gradientStart={state.gradientStart}
                    onGradientStartChange={(val) => dispatch({ type: 'SET_GRADIENT_START', payload: val })}
                    gradientEnd={state.gradientEnd}
                    onGradientEndChange={(val) => dispatch({ type: 'SET_GRADIENT_END', payload: val })}
                    updateMode={state.updateMode}
                    onUpdateModeChange={(val) => dispatch({ type: 'SET_UPDATE_MODE', payload: val })}
                />

                <div className="p-6 overflow-hidden" style={{ height: '600px' }}>
                    <div className="h-full w-full" ref={chartContainerRef}>
                        <ChartModalDisplay
                            selectedChartType={state.selectedChartType}
                            chartData={chartData}
                            metadata={metadata}
                            colors={colors}
                            pivotConfig={pivotConfig}
                            sunburstData={sunburstData}
                            d3HierarchyData={d3HierarchyData}
                            sunburstColors={sunburstColors}
                            sunburstTitle={state.sunburstTitle}
                            showSunburstLegend={state.showSunburstLegend}
                            currentTreemapData={currentTreemapData || []}
                            treemapDrillPath={state.treemapDrillPath}
                            onTreemapDrill={handleTreemapDrill}
                            onTreemapBreadcrumb={handleTreemapBreadcrumb}
                        />
                    </div>
                </div>

                <ChartModalFooter
                    selectedChartType={state.selectedChartType}
                    onClose={onClose}
                    onCreateWidget={handleCreateWidget}
                    showExportMenu={state.showExportMenu}
                    onToggleExportMenu={() => dispatch({ type: 'SET_EXPORT_MENU', payload: !state.showExportMenu })}
                    onExportHTML={() => handleExportHTML(companyLogo)}
                    onExportPNG={handleExportPNG}
                    onExportPDF={(mode) => handleExportPDF(mode, companyLogo)}
                    onExportXLSX={handleExportXLSX}
                    onOpenInAnalytics={handleOpenInAnalytics}
                />
            </div>
        </div>
    );
};
