import React from 'react';
import { useSettingsLogic } from '../hooks/useSettingsLogic';
import { FinanceReferentialsSection } from '../components/settings/FinanceReferentialsSection';
import { DiagnosticsSection, SavedAnalysesSection, DatasetsSection, PrivacySection } from '../components/settings/SettingsMainSections';
import { BackupRestoreSection, DemoDataSection, DangerZoneSection } from '../components/settings/SettingsSideSections';
import { VersionsModal, AxisModal, CalendarModal, MasterDataModal, ChartViewerModal } from '../components/settings/SettingsModals';
import { BackupRestoreModal } from '../components/settings/BackupRestoreModal';
import { O365Section } from '../components/settings/O365Section';
import { APP_VERSION } from '../utils';

const ENABLE_O365_POC = true;

export const Settings: React.FC = () => {
    const {
        state,
        dispatch,
        fileInputRef,
        navigate,
        batches,
        datasets,
        savedAnalyses,
        chartsOfAccounts,
        analyticalAxes,
        fiscalCalendars,
        masterData,
        uiPrefs,
        dashboardWidgets,
        savedMappings,
        handleDownloadBackup,
        handleFileChange,
        handleConfirmRestore,
        handleRestoreFromO365,
        handleLoadDemo,
        handleReset,
        handleDeleteDataset,
        handleRunDiagnostics,
        handleSaveEditing,
        handleSaveEditingAnalysis,
        handleDeleteAnalysis,
        handleDeleteChart,
        handleSaveChartEditing,
        handleCreateAxis,
        handleCreateCalendar,
        handleCreateMasterData,
        setDefaultChartOfAccounts,
        importPCGTemplate,
        importIFRSTemplate,
        deleteBatch
    } = useSettingsLogic();

    return (
        <div className="h-full overflow-y-auto p-4 md:p-8 custom-scrollbar">
            <div className="w-full pb-10 space-y-6">
                <h2 className="text-2xl font-bold text-slate-800">Paramètres et maintenance</h2>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column */}
                    <div className="lg:col-span-2 space-y-6">
                        <FinanceReferentialsSection
                            activeFinanceTab={state.activeFinanceTab}
                            setActiveFinanceTab={(tab) => dispatch({ type: 'SET_ACTIVE_FINANCE_TAB', payload: tab })}
                            chartsOfAccounts={chartsOfAccounts}
                            importPCGTemplate={importPCGTemplate}
                            importIFRSTemplate={importIFRSTemplate}
                            editingChartId={state.editingChartId}
                            editChartName={state.editChartName}
                            setEditChartName={(name) => dispatch({ type: 'SET_EDIT_CHART_NAME', payload: name })}
                            saveChartEditing={handleSaveChartEditing}
                            cancelChartEditing={() => dispatch({ type: 'SET_EDITING_CHART_ID', payload: null })}
                            handleViewChart={(id) => dispatch({ type: 'SET_VIEWING_CHART_ID', payload: id })}
                            startEditingChart={(id, name) => {
                                dispatch({ type: 'SET_EDITING_CHART_ID', payload: id });
                                dispatch({ type: 'SET_EDIT_CHART_NAME', payload: name });
                            }}
                            setDefaultChartOfAccounts={setDefaultChartOfAccounts}
                            handleDeleteChart={handleDeleteChart}
                            analyticalAxes={analyticalAxes}
                            setShowAxisModal={(show) => dispatch({ type: 'SET_SHOW_AXIS_MODAL', payload: show })}
                            fiscalCalendars={fiscalCalendars}
                            setShowCalendarModal={(show) => dispatch({ type: 'SET_SHOW_CALENDAR_MODAL', payload: show })}
                            masterData={masterData}
                            setMasterDataType={(type) => dispatch({ type: 'SET_MASTER_DATA_TYPE', payload: type })}
                            setShowMasterDataModal={(show) => dispatch({ type: 'SET_SHOW_MASTER_DATA_MODAL', payload: show })}
                        />

                        <DiagnosticsSection
                            handleRunDiagnostics={handleRunDiagnostics}
                            isRunningDiag={state.isRunningDiag}
                            diagResults={state.diagResults}
                        />

                        <SavedAnalysesSection
                            savedAnalyses={savedAnalyses}
                            datasets={datasets}
                            editingAnalysisId={state.editingAnalysisId}
                            editAnalysisName={state.editAnalysisName}
                            setEditAnalysisName={(name) => dispatch({ type: 'SET_EDIT_ANALYSIS_NAME', payload: name })}
                            saveEditingAnalysis={handleSaveEditingAnalysis}
                            cancelEditingAnalysis={() => dispatch({ type: 'SET_EDITING_ANALYSIS_ID', payload: null })}
                            startEditingAnalysis={(a) => {
                                dispatch({ type: 'SET_EDITING_ANALYSIS_ID', payload: a.id });
                                dispatch({ type: 'SET_EDIT_ANALYSIS_NAME', payload: a.name });
                            }}
                            handleDeleteAnalysis={handleDeleteAnalysis}
                        />

                        <DatasetsSection
                            datasets={datasets}
                            batches={batches}
                            editingDatasetId={state.editingDatasetId}
                            editName={state.editName}
                            setEditName={(name) => dispatch({ type: 'SET_EDIT_NAME', payload: name })}
                            saveEditing={handleSaveEditing}
                            cancelEditing={() => dispatch({ type: 'SET_EDITING_DATASET_ID', payload: null })}
                            startEditing={(ds) => {
                                dispatch({ type: 'SET_EDITING_DATASET_ID', payload: ds.id });
                                dispatch({ type: 'SET_EDIT_NAME', payload: ds.name });
                            }}
                            setViewingDatasetVersionsId={(id) => dispatch({ type: 'SET_VIEWING_DATASET_VERSIONS_ID', payload: id })}
                            handleDeleteDataset={handleDeleteDataset}
                        />

                        <PrivacySection />
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                        <BackupRestoreSection
                            setBackupModalMode={(mode) => dispatch({ type: 'SET_BACKUP_MODAL_MODE', payload: mode })}
                            handleImportClick={() => fileInputRef.current?.click()}
                        />
                        <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleFileChange} />

                        {ENABLE_O365_POC && (
                            <O365Section
                                currentState={{
                                    datasets,
                                    batches,
                                    dashboardWidgets: dashboardWidgets || [],
                                    savedAnalyses: savedAnalyses || [],
                                    savedMappings: savedMappings || {},
                                    budgetModule: undefined,
                                    forecastModule: undefined,
                                    pipelineModule: undefined,
                                    financeReferentials: {
                                        chartOfAccounts: chartsOfAccounts,
                                        analyticalAxes,
                                        fiscalCalendars,
                                        masterData
                                    },
                                    uiPrefs,
                                    version: APP_VERSION
                                }}
                                onRestoreBackup={handleRestoreFromO365}
                            />
                        )}

                        <DemoDataSection handleLoadDemo={handleLoadDemo} />
                        <DangerZoneSection handleReset={handleReset} />
                    </div>
                </div>

                {state.backupModalMode && (
                    <BackupRestoreModal
                        mode={state.backupModalMode}
                        isOpen={!!state.backupModalMode}
                        onClose={() => dispatch({ type: 'SET_BACKUP_MODAL_MODE', payload: null })}
                        availableData={state.restoreAvailableData}
                        onConfirm={(keys) => {
                            if (state.backupModalMode === 'backup') handleDownloadBackup(keys);
                            else handleConfirmRestore(keys);
                        }}
                    />
                )}

                <VersionsModal
                    isOpen={!!state.viewingDatasetVersionsId}
                    onClose={() => dispatch({ type: 'SET_VIEWING_DATASET_VERSIONS_ID', payload: null })}
                    ds={datasets.find(d => d.id === state.viewingDatasetVersionsId)}
                    dsBatches={batches.filter(b => b.datasetId === state.viewingDatasetVersionsId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())}
                    deleteBatch={deleteBatch}
                />

                <AxisModal
                    isOpen={state.showAxisModal}
                    onClose={() => dispatch({ type: 'SET_SHOW_AXIS_MODAL', payload: false })}
                    axisForm={state.axisForm}
                    setAxisForm={(form) => dispatch({ type: 'SET_AXIS_FORM', payload: form })}
                    handleCreateAxis={handleCreateAxis}
                />

                <CalendarModal
                    isOpen={state.showCalendarModal}
                    onClose={() => dispatch({ type: 'SET_SHOW_CALENDAR_MODAL', payload: false })}
                    calendarForm={state.calendarForm}
                    setCalendarForm={(form) => dispatch({ type: 'SET_CALENDAR_FORM', payload: form })}
                    handleCreateCalendar={handleCreateCalendar}
                />

                <MasterDataModal
                    isOpen={state.showMasterDataModal}
                    onClose={() => dispatch({ type: 'SET_SHOW_MASTER_DATA_MODAL', payload: false })}
                    type={state.masterDataType}
                    form={state.masterDataForm}
                    setForm={(form) => dispatch({ type: 'SET_MASTER_DATA_FORM', payload: form })}
                    onConfirm={handleCreateMasterData}
                />

                <ChartViewerModal
                    id={state.viewingChartId}
                    onClose={() => dispatch({ type: 'SET_VIEWING_CHART_ID', payload: null })}
                    chartsOfAccounts={chartsOfAccounts}
                    searchQuery={state.searchAccountQuery}
                    setSearchQuery={(q) => dispatch({ type: 'SET_SEARCH_ACCOUNT_QUERY', payload: q })}
                />

                <div className="text-center text-xs text-slate-400 pt-8">
                    <p>DataScope v{APP_VERSION}</p>
                    <p>© 2026 - Application interne</p>
                </div>
            </div>
        </div>
    );
};
