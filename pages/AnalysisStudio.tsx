import React, { useCallback } from 'react';
import { Database } from 'lucide-react';
import { useAnalysisStudioLogic } from '../hooks/useAnalysisStudioLogic';
import { AnalysisStudioHeader } from '../components/analytics/AnalysisStudioHeader';
import { AnalysisStudioSidebar } from '../components/analytics/AnalysisStudioSidebar';
import { AnalysisStudioMain } from '../components/analytics/AnalysisStudioMain';

export const AnalysisStudio: React.FC = () => {
    const {
        state,
        dispatch,
        batches,
        currentDataset,
        datasets,
        currentDatasetId,
        switchDataset,
        fields,
        numericFields,
        snapshotData,
        trendData,
        chartColors,
        insightText,
        savedAnalyses,
        handlers
    } = useAnalysisStudioLogic();

    const getDistinctValuesForField = useCallback((field: string) => {
        const targetBatch = state.mode === 'snapshot'
            ? batches.find(b => b.id === state.selectedBatchId) || batches[batches.length - 1]
            : batches[batches.length - 1];
        if (!targetBatch) return [];
        const set = new Set<string>();
        targetBatch.rows.forEach(r => {
            const val = r[field] !== undefined ? String(r[field]) : '';
            if (val) set.add(val);
        });
        return Array.from(set).sort();
    }, [batches, state.mode, state.selectedBatchId]);

    if (!currentDataset) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-center bg-slate-50 rounded-lg border border-dashed border-slate-300">
                <Database className="w-12 h-12 text-slate-300 mb-4" />
                <p className="text-slate-600 font-medium">Aucun tableau sélectionné</p>
                <div className="mt-4">
                    <select
                        className="appearance-none bg-white border border-slate-300 text-slate-700 text-sm rounded-md py-2 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
                        value=""
                        onChange={(e) => {
                            if (e.target.value === '__NEW__') handlers.navigate('/import');
                            else switchDataset(e.target.value);
                        }}
                    >
                        <option value="" disabled>Choisir une typologie</option>
                        {datasets.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                        <option disabled>──────────</option>
                        <option value="__NEW__">+ Nouvelle typologie...</option>
                    </select>
                </div>
            </div>
        );
    }

    const availableAnalyses = savedAnalyses.filter(a => a.type === 'analytics' && a.datasetId === currentDataset?.id);

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)] gap-4 relative">
            <AnalysisStudioHeader
                mode={state.mode}
                onSetMode={(m) => dispatch({ type: 'SET_MODE', payload: m })}
                currentDatasetId={currentDatasetId}
                datasets={datasets}
                onSwitchDataset={switchDataset}
                onNavigate={handlers.navigate}
                availableAnalyses={availableAnalyses}
                onLoadAnalysis={handlers.handleLoadAnalysis}
                isSaving={state.isSaving}
                onSetSaving={(s) => dispatch({ type: 'SET_SAVING', payload: s })}
                analysisName={state.analysisName}
                onSetAnalysisName={(n) => dispatch({ type: 'SET_ANALYSIS_NAME', payload: n })}
                onSaveAnalysis={handlers.handleSaveAnalysis}
                showExportMenu={state.showExportMenu}
                onSetExportMenu={(s) => dispatch({ type: 'SET_EXPORT_MENU', payload: s })}
                onExport={handlers.handleExport}
                onExportToDashboard={handlers.handleExportToDashboard}
                selectedBatchId={state.selectedBatchId}
                onSetBatchId={(id) => dispatch({ type: 'SET_BATCH_ID', payload: id })}
                batches={batches}
                startDate={state.startDate}
                endDate={state.endDate}
                onSetDates={(d) => dispatch({ type: 'SET_DATES', payload: d })}
            />

            <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
                <AnalysisStudioSidebar
                    mode={state.mode}
                    dimension={state.dimension}
                    onSetDimension={(d) => dispatch({ type: 'SET_DIMENSION', payload: d })}
                    fields={fields}
                    metric={state.metric}
                    onSetMetric={(m) => dispatch({ type: 'SET_METRIC', payload: { target: 1, metric: m } })}
                    valueField={state.valueField}
                    onSetValueField={(f) => dispatch({ type: 'SET_VALUE_FIELD', payload: { target: 1, field: f } })}
                    numericFields={numericFields}
                    currentDataset={currentDataset}
                    metric2={state.metric2}
                    onSetMetric2={(m) => dispatch({ type: 'SET_METRIC', payload: { target: 2, metric: m } })}
                    valueField2={state.valueField2}
                    onSetValueField2={(f) => dispatch({ type: 'SET_VALUE_FIELD', payload: { target: 2, field: f } })}
                    filters={state.filters}
                    onSetFilters={(f) => dispatch({ type: 'SET_FILTERS', payload: f })}
                    getDistinctValuesForField={getDistinctValuesForField}
                    limit={state.limit}
                    onSetLimit={(l) => dispatch({ type: 'SET_LIMIT', payload: l })}
                    sortOrder={state.sortOrder}
                    onSetSortOrder={(o) => dispatch({ type: 'SET_SORT_ORDER', payload: o })}
                    isCumulative={state.isCumulative}
                    onToggleCumulative={() => dispatch({ type: 'TOGGLE_BOOLEAN', payload: 'isCumulative' })}
                    showTable={state.showTable}
                    onToggleTable={() => dispatch({ type: 'TOGGLE_BOOLEAN', payload: 'showTable' })}
                    showForecast={state.showForecast}
                    onToggleForecast={() => dispatch({ type: 'TOGGLE_BOOLEAN', payload: 'showForecast' })}
                    segment={state.segment}
                    onSetSegment={(s) => dispatch({ type: 'SET_SEGMENT', payload: s })}
                    chartType={state.chartType}
                    onSetChartType={(t) => dispatch({ type: 'SET_CHART_TYPE', payload: t })}
                    colorMode={state.colorMode}
                    onSetColorMode={(m) => dispatch({ type: 'SET_COLOR_CONFIG', payload: { colorMode: m } })}
                    colorPalette={state.colorPalette}
                    onSetColorPalette={(p) => dispatch({ type: 'SET_COLOR_CONFIG', payload: { colorPalette: p } })}
                    singleColor={state.singleColor}
                    onSetSingleColor={(c) => dispatch({ type: 'SET_COLOR_CONFIG', payload: { singleColor: c } })}
                    gradientStart={state.gradientStart}
                    onSetGradientStart={(c) => dispatch({ type: 'SET_COLOR_CONFIG', payload: { gradientStart: c } })}
                    gradientEnd={state.gradientEnd}
                    onSetGradientEnd={(c) => dispatch({ type: 'SET_COLOR_CONFIG', payload: { gradientEnd: c } })}
                    chartTitle={state.chartTitle}
                    onSetChartTitle={(t) => dispatch({ type: 'SET_CHART_TITLE', payload: t })}
                    customUnit={state.customUnit}
                    onSetCustomUnit={(u) => dispatch({ type: 'SET_CUSTOM_UNIT', payload: u })}
                />

                <AnalysisStudioMain
                    mode={state.mode}
                    dimension={state.dimension}
                    metric={state.metric}
                    valueField={state.valueField}
                    metric2={state.metric2}
                    valueField2={state.valueField2}
                    segment={state.segment}
                    chartType={state.chartType}
                    isCumulative={state.isCumulative}
                    showTable={state.showTable}
                    showForecast={state.showForecast}
                    snapshotData={snapshotData}
                    trendData={trendData}
                    chartColors={chartColors}
                    customUnit={state.customUnit}
                    chartTitle={state.chartTitle}
                    insightText={insightText}
                />
            </div>
        </div>
    );
};
