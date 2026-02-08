import React from 'react';
import { X, BarChart3 } from 'lucide-react';
import { useChartModalLogic } from '../../hooks/useChartModalLogic';
import { ChartOptions } from './ChartOptions';
import { ChartPreview } from './ChartPreview';
import { ChartFooter } from './ChartFooter';
import { ChartType } from '../../logic/pivotToChart';
import { PivotResult, PivotConfig, TemporalComparisonConfig } from '../../types';

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

export const ChartModal: React.FC<ChartModalProps> = (props) => {
  const {
    isOpen,
    onClose,
    pivotData,
    pivotConfig,
    isTemporalMode,
    temporalComparison,
    selectedBatchId,
    companyLogo
  } = props;
  const logic = useChartModalLogic(
    pivotData,
    pivotConfig,
    isTemporalMode,
    temporalComparison,
    selectedBatchId,
    companyLogo,
    onClose
  );

  if (!isOpen) return null;

  const chartTypeOptions: ChartType[] = [
    'column',
    'bar',
    'stacked-column',
    'stacked-bar',
    'percent-column',
    'percent-bar',
    'line',
    'area',
    'stacked-area',
    'pie',
    'donut',
    'radar',
    'sunburst',
    'treemap'
  ];

  const hasData = !!(logic.selectedChartType === 'sunburst'
    ? logic.sunburstData && logic.sunburstData.rings.length > 0
    : logic.selectedChartType === 'treemap'
      ? logic.currentTreemapData && logic.currentTreemapData.length > 0
      : logic.chartData && logic.chartData.length > 0);

  return (
    <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl max-w-7xl w-full max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-gradient-to-r from-brand-50 to-purple-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-100 rounded-lg">
              <BarChart3 className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800">Visualisation graphique</h2>
              <p className="text-xs text-slate-500">
                {logic.metadata.totalDataPoints} points • {logic.metadata.seriesNames.length} séries
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <ChartOptions
          selectedChartType={logic.selectedChartType}
          setSelectedChartType={logic.setSelectedChartType}
          metadata={logic.metadata}
          chartTypeOptions={chartTypeOptions}
          limit={logic.limit}
          setLimit={logic.setLimit}
          availableLevels={pivotConfig.rowFields.length}
          hierarchyLevel={logic.hierarchyLevel}
          setHierarchyLevel={logic.setHierarchyLevel}
          sortBy={logic.sortBy}
          setSortBy={logic.setSortBy}
          sortOrder={logic.sortOrder}
          setSortOrder={logic.setSortOrder}
          colorMode={logic.colorMode}
          setColorMode={logic.setColorMode}
          colorPalette={logic.colorPalette}
          setColorPalette={logic.setColorPalette}
          singleColor={logic.singleColor}
          setSingleColor={logic.setSingleColor}
          gradientStart={logic.gradientStart}
          setGradientStart={logic.setGradientStart}
          gradientEnd={logic.gradientEnd}
          setGradientEnd={logic.setGradientEnd}
          sunburstTitle={logic.sunburstTitle}
          setSunburstTitle={logic.setSunburstTitle}
          showCenterTotal={logic.showCenterTotal}
          setShowCenterTotal={logic.setShowCenterTotal}
          showSunburstLegend={logic.showSunburstLegend}
          setShowSunburstLegend={logic.setShowSunburstLegend}
          updateMode={logic.updateMode}
          setUpdateMode={logic.setUpdateMode}
        />

        <div className="p-6 overflow-hidden flex-1" style={{ height: '600px' }}>
          <div className="h-full w-full" ref={logic.chartContainerRef}>
            <ChartPreview
              selectedChartType={logic.selectedChartType}
              hasData={hasData}
              chartData={logic.chartData}
              metadata={logic.metadata}
              colors={logic.colors}
              pivotConfig={pivotConfig}
              sunburstData={logic.sunburstData}
              d3HierarchyData={logic.d3HierarchyData}
              sunburstTitle={logic.sunburstTitle}
              showSunburstLegend={logic.showSunburstLegend}
              sunburstColors={logic.sunburstColors}
              currentTreemapData={logic.currentTreemapData || []}
              treemapDrillPath={logic.treemapDrillPath}
              handleTreemapDrill={logic.handleTreemapDrill}
              handleTreemapBreadcrumb={logic.handleTreemapBreadcrumb}
            />
          </div>
        </div>

        <ChartFooter
          selectedChartType={logic.selectedChartType}
          handleCreateWidget={logic.handleCreateWidget}
          showExportMenu={logic.showExportMenu}
          setShowExportMenu={logic.setShowExportMenu}
          handleExportHTML={logic.handleExportHTML}
          handleExportPNG={logic.handleExportPNG}
          handleExportPDF={logic.handleExportPDF}
          handleExportXLSX={logic.handleExportXLSX}
          handleOpenInAnalytics={logic.handleOpenInAnalytics}
          onClose={onClose}
        />
      </div>
    </div>
  );
};
