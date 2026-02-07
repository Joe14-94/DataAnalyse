import { useState } from 'react';
import { useForecast } from '../context/ForecastContext';
import { useReferentials } from '../context/ReferentialContext';
import { ForecastType } from '../types';

export type ForecastTab = 'list' | 'editor' | 'rolling' | 'ml' | 'reconciliation' | 'drivers';

export const useForecastLogic = () => {
  const [activeTab, setActiveTab] = useState<ForecastTab>('list');
  const {
    forecasts,
    addForecast,
    updateForecast,
    deleteForecast,
    addVersion,
    updateVersion,
    setActiveVersion,
    addLine,
    updateLine,
    deleteLine,
    updateLineValue,
    addDriver,
    updateDriver,
    deleteDriver,
    updateDriverValue,
    createRollingSnapshot,
    getRollingSnapshots,
    generateMLPredictions,
    detectSeasonality,
    calculateTrend,
    reconciliationReports,
    createReconciliationReport,
    submitVersion,
    validateVersion
  } = useForecast();
  const { chartsOfAccounts, fiscalCalendars } = useReferentials();

  // Editor state
  const [selectedForecastId, setSelectedForecastId] = useState<string | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [editingCellId, setEditingCellId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [showNewLineModal, setShowNewLineModal] = useState(false);
  const [accountSearchQuery, setAccountSearchQuery] = useState('');

  // Drivers state
  const [showNewDriverModal, setShowNewDriverModal] = useState(false);
  const [driverName, setDriverName] = useState('');
  const [driverUnit, setDriverUnit] = useState('');

  // Get selected forecast and version
  const selectedForecast = selectedForecastId
    ? forecasts.find((f) => f.id === selectedForecastId)
    : null;
  const selectedVersion =
    selectedForecast && selectedVersionId
      ? selectedForecast.versions.find((v) => v.id === selectedVersionId)
      : null;
  const selectedChart = selectedForecast
    ? chartsOfAccounts.find((c) => c.id === selectedForecast.chartOfAccountsId)
    : null;
  const selectedCalendar = selectedForecast?.fiscalCalendarId
    ? fiscalCalendars.find((c) => c.id === selectedForecast.fiscalCalendarId)
    : null;

  // Generate period IDs for next 12 months from reference date
  const generatePeriods = (referenceDate: string, count: number = 12) => {
    const periods = [];
    const startDate = new Date(referenceDate);
    for (let i = 0; i < count; i++) {
      const date = new Date(startDate);
      date.setMonth(date.getMonth() + i);
      periods.push({
        id: date.toISOString().substring(0, 7),
        name: date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
      });
    }
    return periods;
  };

  // Handler functions
  const handleCreateForecast = (
    name: string,
    type: ForecastType,
    fiscalYear: number,
    chartId: string,
    isRolling: boolean
  ) => {
    const today = new Date();
    const referenceDate = today.toISOString().split('T')[0];

    addForecast({
      name,
      type,
      fiscalYear,
      chartOfAccountsId: chartId,
      fiscalCalendarId: fiscalCalendars[0]?.id,
      isRolling,
      rollingHorizonMonths: isRolling ? 12 : undefined,
      autoUpdateEnabled: isRolling,
      drivers: [],
      versions: [],
      owner: 'Current User',
      isLocked: false
    });
  };

  const handleSelectForecast = (forecastId: string) => {
    const forecast = forecasts.find((f) => f.id === forecastId);
    setSelectedForecastId(forecastId);
    if (forecast) {
      const activeVersion =
        forecast.versions.find((v) => v.id === forecast.activeVersionId) || forecast.versions[0];
      setSelectedVersionId(activeVersion?.id || null);
    }
    setActiveTab('editor');
  };

  const handleAddVersion = () => {
    if (!selectedForecastId || !selectedForecast) return;
    const newVersionNumber = selectedForecast.versions.length + 1;
    const today = new Date().toISOString().split('T')[0];

    addVersion(selectedForecastId, {
      forecastId: selectedForecastId,
      versionNumber: newVersionNumber,
      name: `Version ${newVersionNumber}`,
      referenceDate: today,
      status: 'draft',
      lines: [],
      isActive: false
    });
  };

  const handleAddLine = (accountCode: string) => {
    if (!selectedForecastId || !selectedVersionId) return;
    const account = selectedChart?.accounts.find((a) => a.code === accountCode);
    if (!account) return;

    addLine(selectedForecastId, selectedVersionId, {
      accountCode: account.code,
      accountLabel: account.label,
      method: 'manual',
      forecastValues: {},
      isLocked: false
    });
    setShowNewLineModal(false);
    setAccountSearchQuery('');
  };

  const handleCellEdit = (lineId: string, periodId: string, currentValue: number) => {
    setEditingCellId(`${lineId}-${periodId}`);
    setEditingValue(currentValue.toString());
  };

  const handleCellSave = (lineId: string, periodId: string) => {
    if (!selectedForecastId || !selectedVersionId) return;
    const value = parseFloat(editingValue) || 0;
    updateLineValue(selectedForecastId, selectedVersionId, lineId, periodId, value);
    setEditingCellId(null);
    setEditingValue('');
  };

  const handleCellCancel = () => {
    setEditingCellId(null);
    setEditingValue('');
  };

  const handleDeleteLine = (lineId: string) => {
    if (!selectedForecastId || !selectedVersionId) return;
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette ligne de forecast ?')) {
      deleteLine(selectedForecastId, selectedVersionId, lineId);
    }
  };

  const handleGenerateMLPredictions = (lineId: string) => {
    if (!selectedForecastId || !selectedVersionId) return;
    generateMLPredictions(selectedForecastId, selectedVersionId, lineId, 24);
  };

  const handleAddDriver = () => {
    if (!selectedForecastId || !driverName.trim()) return;
    addDriver(selectedForecastId, {
      name: driverName,
      unit: driverUnit,
      historicalValues: {},
      forecastValues: {}
    });
    setShowNewDriverModal(false);
    setDriverName('');
    setDriverUnit('');
  };

  const handleCreateSnapshot = () => {
    if (!selectedForecastId) return;
    const today = new Date().toISOString().split('T')[0];
    createRollingSnapshot(selectedForecastId, today);
  };

  return {
    activeTab,
    setActiveTab,
    forecasts,
    chartsOfAccounts,
    fiscalCalendars,
    reconciliationReports,
    selectedForecastId,
    setSelectedForecastId,
    selectedVersionId,
    setSelectedVersionId,
    editingCellId,
    setEditingCellId,
    editingValue,
    setEditingValue,
    showNewLineModal,
    setShowNewLineModal,
    accountSearchQuery,
    setAccountSearchQuery,
    showNewDriverModal,
    setShowNewDriverModal,
    driverName,
    setDriverName,
    driverUnit,
    setDriverUnit,
    selectedForecast,
    selectedVersion,
    selectedChart,
    selectedCalendar,

    generatePeriods,
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
    deleteForecast,
    deleteDriver,
    getRollingSnapshots
  };
};
