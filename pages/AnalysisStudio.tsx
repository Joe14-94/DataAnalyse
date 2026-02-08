import React from 'react';
import { useAnalysisStudioLogic } from '../hooks/useAnalysisStudioLogic';
import { AnalysisSidebar } from '../components/analytics/AnalysisSidebar';
import { AnalysisHeader } from '../components/analytics/AnalysisHeader';
import { AnalysisTableDisplay } from '../components/analytics/AnalysisTableDisplay';
import { AnalysisChartDisplay } from '../components/analytics/AnalysisChartDisplay';
import { AnalysisToolbar } from '../components/analytics/AnalysisToolbar';
import { Modal } from '../components/ui/Modal';
import { Database, Download, FileText, Globe } from 'lucide-react';

export const AnalysisStudio: React.FC = () => {
  const logic = useAnalysisStudioLogic();
  const {
    currentDataset,
    datasets,
    switchDataset,
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
    getDistinctValuesForField,
    handleSaveAnalysis,
    showExportMenu,
    setShowExportMenu,
    snapshotData,
    trendData,
    chartColors,
    isCalculating,
    mode,
    setMode,
    handleExport,
    navigate
  } = logic;

  const exportContainerRef = React.useRef<HTMLDivElement>(null);

  if (!currentDataset) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center bg-slate-50 rounded-lg border border-dashed border-slate-300 m-4">
        <Database className="w-12 h-12 text-slate-300 mb-4" />
        <p className="text-slate-600 font-medium">Aucun tableau sélectionné pour l'analyse</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-100/50 overflow-hidden">
      <AnalysisHeader
        currentDataset={currentDataset}
        datasets={datasets}
        switchDataset={switchDataset}
        navigate={navigate}
        handleSaveAnalysis={handleSaveAnalysis}
        setShowExportMenu={setShowExportMenu}
        handleOpenInDashboard={logic.handleExportToDashboard}
      />

      <div className="flex-1 flex overflow-hidden">
        <AnalysisSidebar
          mode={mode}
          setMode={setMode}
          batches={batches}
          selectedBatchId={selectedBatchId}
          setSelectedBatchId={setSelectedBatchId}
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
          dimension={dimension}
          setDimension={setDimension}
          metric={metric}
          setMetric={setMetric}
          valueField={valueField}
          setValueField={setValueField}
          metric2={metric2}
          setMetric2={setMetric2}
          valueField2={valueField2}
          setValueField2={setValueField2}
          segment={segment}
          setSegment={setSegment}
          chartType={chartType}
          setChartType={setChartType}
          limit={limit}
          setLimit={setLimit}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
          isCumulative={isCumulative}
          setIsCumulative={setIsCumulative}
          filters={filters}
          addFilter={addFilter}
          updateFilter={updateFilter}
          removeFilter={removeFilter}
          showForecast={showForecast}
          setShowForecast={setShowForecast}
          colorMode={colorMode}
          setColorMode={setColorMode}
          colorPalette={colorPalette}
          setColorPalette={setColorPalette}
          singleColor={singleColor}
          setSingleColor={setSingleColor}
          gradientStart={gradientStart}
          setGradientStart={setGradientStart}
          gradientEnd={gradientEnd}
          setGradientEnd={setGradientEnd}
          chartTitle={chartTitle}
          setChartTitle={setChartTitle}
          customUnit={customUnit}
          setCustomUnit={setCustomUnit}
          fields={fields}
          numericFields={numericFields}
          currentDataset={currentDataset}
          getDistinctValuesForField={getDistinctValuesForField}
        />

        <div className="flex-1 flex flex-col min-w-0 bg-slate-100 p-4 md:p-6 overflow-y-auto custom-scrollbar">
          <div ref={exportContainerRef} className="space-y-6">
            <AnalysisChartDisplay
              mode={mode}
              chartType={chartType}
              chartTitle={chartTitle}
              snapshotData={snapshotData}
              trendData={trendData}
              dimension={dimension}
              metric={metric}
              metric2={metric2}
              segment={segment}
              isCalculating={isCalculating}
              colorMode={colorMode}
              colorPalette={colorPalette}
              singleColor={singleColor}
              gradientStart={gradientStart}
              gradientEnd={gradientEnd}
              customUnit={customUnit}
              chartColors={chartColors}
              valueField={valueField}
              valueField2={valueField2}
              showForecast={showForecast}
            />

            <div className="grid grid-cols-1 gap-6">
              <AnalysisTableDisplay
                mode={mode}
                snapshotData={snapshotData}
                trendData={trendData}
                dimension={dimension}
                metric2={metric2}
                isCumulative={isCumulative}
                customUnit={customUnit}
                showForecast={showForecast}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Export Menu Modal */}
      <Modal
        isOpen={showExportMenu}
        onClose={() => setShowExportMenu(false)}
        title="Exporter l'analyse"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={() => handleExport('png')}
            className="flex flex-col items-center justify-center p-6 bg-slate-50 border border-slate-200 rounded-xl hover:bg-brand-50 hover:border-brand-200 transition-all group"
          >
            <Download className="w-8 h-8 text-slate-400 group-hover:text-brand-600 mb-3" />
            <span className="font-bold text-slate-700">Image PNG</span>
            <span className="text-xs text-slate-500 uppercase mt-1">Snapshot Haute Résol.</span>
          </button>
          <button
            onClick={() => handleExport('xlsx')}
            className="flex flex-col items-center justify-center p-6 bg-slate-50 border border-slate-200 rounded-xl hover:bg-green-50 hover:border-green-200 transition-all group"
          >
            <FileText className="w-8 h-8 text-slate-400 group-hover:text-green-600 mb-3" />
            <span className="font-bold text-slate-700">Excel (XLSX)</span>
            <span className="text-xs text-slate-500 uppercase mt-1">
              Données Brutes & Totaux
            </span>
          </button>
          <button
            onClick={() => handleExport('html')}
            className="flex flex-col items-center justify-center p-6 bg-slate-50 border border-slate-200 rounded-xl hover:bg-purple-50 hover:border-purple-200 transition-all group"
          >
            <Globe className="w-8 h-8 text-slate-400 group-hover:text-purple-600 mb-3" />
            <span className="font-bold text-slate-700">HTML Interactif</span>
            <span className="text-xs text-slate-500 uppercase mt-1">Rapport Standalone</span>
          </button>
        </div>
      </Modal>
    </div>
  );
};
