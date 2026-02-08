import React from 'react';
import { useForecastLogic } from '../hooks/useForecastLogic';
import { ForecastHeader } from '../components/forecast/ForecastHeader';
import { ForecastList } from '../components/forecast/ForecastList';
import { ForecastEditor } from '../components/forecast/ForecastEditor';
import { ForecastDrivers } from '../components/forecast/ForecastDrivers';
import { RollingForecast } from '../components/forecast/RollingForecast';
import { MLPredictions } from '../components/forecast/MLPredictions';
import { Reconciliation } from '../components/forecast/Reconciliation';

export const Forecast: React.FC = () => {
    const {
        state,
        dispatch,
        forecasts,
        chartsOfAccounts,
        selectedForecast,
        selectedVersion,
        selectedChart,
        reconciliationReports,
        getRollingSnapshots,
        deleteForecast,
        deleteDriver,
        generatePeriods,
        handleSetTab,
        handleCreateForecast,
        handleSelectForecast,
        handleAddVersion,
        handleAddLine,
        handleCellEdit,
        handleCellSave,
        handleCellCancel,
        handleDeleteLine,
        handleGenerateMLPredictions,
        handleAddDriver,
        handleCreateSnapshot,
    } = useForecastLogic();

    return (
        <div className="p-4 md:p-8 w-full">
            <ForecastHeader
                activeTab={state.activeTab}
                onTabChange={handleSetTab}
            />

            <div>
                {state.activeTab === 'list' && (
                    <ForecastList
                        forecasts={forecasts}
                        reconciliationReports={reconciliationReports}
                        chartsOfAccounts={chartsOfAccounts}
                        onSelectForecast={handleSelectForecast}
                        onDeleteForecast={deleteForecast}
                        onCreateForecast={handleCreateForecast}
                    />
                )}

                {state.activeTab === 'editor' && (
                    <ForecastEditor
                        selectedForecast={selectedForecast}
                        selectedVersion={selectedVersion}
                        selectedChart={selectedChart}
                        editingCellId={state.editingCellId}
                        editingValue={state.editingValue}
                        showNewLineModal={state.showNewLineModal}
                        accountSearchQuery={state.accountSearchQuery}
                        onBack={() => handleSetTab('list')}
                        onSelectVersion={(id) => dispatch({ type: 'SELECT_VERSION', payload: id })}
                        onAddVersion={handleAddVersion}
                        onToggleNewLineModal={(show) => dispatch({ type: 'TOGGLE_NEW_LINE_MODAL', payload: show })}
                        onSetAccountSearch={(query) => dispatch({ type: 'SET_ACCOUNT_SEARCH', payload: query })}
                        onAddLine={handleAddLine}
                        onDeleteLine={handleDeleteLine}
                        onCellEdit={handleCellEdit}
                        onCellSave={handleCellSave}
                        onCellCancel={handleCellCancel}
                        onSetEditValue={(val) => dispatch({ type: 'SET_EDIT_VALUE', payload: val })}
                        onGenerateMLPredictions={handleGenerateMLPredictions}
                        generatePeriods={generatePeriods}
                    />
                )}

                {state.activeTab === 'drivers' && (
                    <ForecastDrivers
                        selectedForecastId={state.selectedForecastId}
                        selectedForecast={selectedForecast}
                        showNewDriverModal={state.showNewDriverModal}
                        driverName={state.driverName}
                        driverUnit={state.driverUnit}
                        onToggleNewDriverModal={(show) => dispatch({ type: 'TOGGLE_NEW_DRIVER_MODAL', payload: show })}
                        onSetDriverForm={(form) => dispatch({ type: 'SET_DRIVER_FORM', payload: form })}
                        onAddDriver={handleAddDriver}
                        onDeleteDriver={(id) => deleteDriver(state.selectedForecastId!, id)}
                        onBackToList={() => handleSetTab('list')}
                    />
                )}

                {state.activeTab === 'rolling' && (
                    <RollingForecast
                        selectedForecastId={state.selectedForecastId}
                        selectedForecast={selectedForecast}
                        getRollingSnapshots={getRollingSnapshots}
                        onCreateSnapshot={handleCreateSnapshot}
                    />
                )}

                {state.activeTab === 'ml' && <MLPredictions />}

                {state.activeTab === 'reconciliation' && (
                    <Reconciliation reconciliationReports={reconciliationReports} />
                )}
            </div>
        </div>
    );
};
