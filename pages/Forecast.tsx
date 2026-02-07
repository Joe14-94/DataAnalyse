import React from 'react';
import {
  TrendingUp,
  Plus,
  FileText,
  Activity,
  Clock,
  Brain,
  CheckCircle2,
  Edit2
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useForecastLogic, ForecastTab } from '../hooks/useForecastLogic';
import { ForecastList } from '../components/forecast/ForecastList';
import { ForecastEditor } from '../components/forecast/ForecastEditor';
import { ForecastDrivers } from '../components/forecast/ForecastDrivers';
import { ForecastRolling } from '../components/forecast/ForecastRolling';
import { ForecastML } from '../components/forecast/ForecastML';
import { ForecastReconciliation } from '../components/forecast/ForecastReconciliation';

export const Forecast: React.FC = () => {
  const logic = useForecastLogic();
  const {
    activeTab,
    setActiveTab,
    forecasts,
    chartsOfAccounts,
    handleCreateForecast,
    handleSelectForecast,
    selectedForecast
  } = logic;

  return (
    <div className="h-full overflow-y-auto p-4 md:p-8 custom-scrollbar">
      <div className="pb-10 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <TrendingUp className="w-7 h-7 text-brand-600" />
              Module Forecast
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Planifiez vos revenus et dépenses avec des modèles statistiques et des drivers
            </p>
          </div>
          <Button
            className="bg-brand-600 hover:bg-brand-700"
            onClick={() => {
              const name = prompt('Nom du forecast:');
              if (name)
                handleCreateForecast(name, 'financial', 2025, chartsOfAccounts[0]?.id || '', false);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouveau forecast
          </Button>
        </div>

        {/* Tabs Navigation */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
          {[
            { id: 'list' as const, label: 'Mes forecasts', icon: FileText },
            { id: 'editor' as const, label: 'Éditeur', icon: Edit2 },
            { id: 'drivers' as const, label: 'Drivers', icon: Activity },
            { id: 'rolling' as const, label: 'Rolling', icon: Clock },
            { id: 'ml' as const, label: 'Intelligence ML', icon: Brain },
            { id: 'reconciliation' as const, label: 'Réconciliation', icon: CheckCircle2 }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ForecastTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === 'list' && (
            <ForecastList
              forecasts={forecasts}
              onSelectForecast={handleSelectForecast}
              onDeleteForecast={logic.deleteForecast}
              onCreateForecast={handleCreateForecast}
              chartsOfAccounts={chartsOfAccounts}
            />
          )}

          {activeTab === 'editor' && (
            <ForecastEditor
              selectedForecastId={logic.selectedForecastId}
              setSelectedForecastId={logic.setSelectedForecastId}
              selectedVersionId={logic.selectedVersionId}
              setSelectedVersionId={logic.setSelectedVersionId}
              forecasts={forecasts}
              chartsOfAccounts={chartsOfAccounts}
              fiscalCalendars={logic.fiscalCalendars}
              setActiveTab={setActiveTab}
              handleAddVersion={logic.handleAddVersion}
              setShowNewLineModal={logic.setShowNewLineModal}
              handleDeleteLine={logic.handleDeleteLine}
              handleCellEdit={logic.handleCellEdit}
              editingCellId={logic.editingCellId}
              editingValue={logic.editingValue}
              setEditingValue={logic.setEditingValue}
              handleCellSave={logic.handleCellSave}
              handleCellCancel={logic.handleCellCancel}
              showNewLineModal={logic.showNewLineModal}
              accountSearchQuery={logic.accountSearchQuery}
              setAccountSearchQuery={logic.setAccountSearchQuery}
              handleAddLine={logic.handleAddLine}
              generatePeriods={logic.generatePeriods}
            />
          )}

          {activeTab === 'drivers' && (
            <ForecastDrivers
              selectedForecast={selectedForecast}
              showNewDriverModal={logic.showNewDriverModal}
              setShowNewDriverModal={logic.setShowNewDriverModal}
              driverName={logic.driverName}
              setDriverName={logic.setDriverName}
              driverUnit={logic.driverUnit}
              setDriverUnit={logic.setDriverUnit}
              handleAddDriver={logic.handleAddDriver}
              deleteDriver={logic.deleteDriver}
            />
          )}

          {activeTab === 'rolling' && (
            <ForecastRolling
              selectedForecast={selectedForecast}
              handleCreateSnapshot={logic.handleCreateSnapshot}
              getRollingSnapshots={logic.getRollingSnapshots}
            />
          )}

          {activeTab === 'ml' && (
            <ForecastML
              selectedVersion={logic.selectedVersion}
              handleGenerateMLPredictions={logic.handleGenerateMLPredictions}
            />
          )}

          {activeTab === 'reconciliation' && (
            <ForecastReconciliation reconciliationReports={logic.reconciliationReports} />
          )}
        </div>
      </div>
    </div>
  );
};
