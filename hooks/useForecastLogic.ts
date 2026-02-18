import { useReducer, useState, useMemo } from 'react';
import { useForecast } from '../context/ForecastContext';
import { useReferentials } from '../context/ReferentialContext';
import { ForecastType } from '../types';

export type ForecastTab = 'list' | 'editor' | 'rolling' | 'ml' | 'reconciliation' | 'drivers';

interface ForecastState {
    activeTab: ForecastTab;
    selectedForecastId: string | null;
    selectedVersionId: string | null;
    editingCellId: string | null;
    editingValue: string;
    showNewLineModal: boolean;
    accountSearchQuery: string;
    showNewDriverModal: boolean;
    driverName: string;
    driverUnit: string;
}

type ForecastAction =
    | { type: 'SET_TAB'; payload: ForecastTab }
    | { type: 'SELECT_FORECAST'; payload: string | null }
    | { type: 'SELECT_VERSION'; payload: string | null }
    | { type: 'START_EDIT'; payload: { cellId: string; value: string } }
    | { type: 'CANCEL_EDIT' }
    | { type: 'SET_EDIT_VALUE'; payload: string }
    | { type: 'TOGGLE_NEW_LINE_MODAL'; payload: boolean }
    | { type: 'SET_ACCOUNT_SEARCH'; payload: string }
    | { type: 'TOGGLE_NEW_DRIVER_MODAL'; payload: boolean }
    | { type: 'SET_DRIVER_FORM'; payload: Partial<{ name: string; unit: string }> };

const initialState: ForecastState = {
    activeTab: 'list',
    selectedForecastId: null,
    selectedVersionId: null,
    editingCellId: null,
    editingValue: '',
    showNewLineModal: false,
    accountSearchQuery: '',
    showNewDriverModal: false,
    driverName: '',
    driverUnit: '',
};

function forecastReducer(state: ForecastState, action: ForecastAction): ForecastState {
    switch (action.type) {
        case 'SET_TAB':
            return { ...state, activeTab: action.payload };
        case 'SELECT_FORECAST':
            return { ...state, selectedForecastId: action.payload };
        case 'SELECT_VERSION':
            return { ...state, selectedVersionId: action.payload };
        case 'START_EDIT':
            return { ...state, editingCellId: action.payload.cellId, editingValue: action.payload.value };
        case 'CANCEL_EDIT':
            return { ...state, editingCellId: null, editingValue: '' };
        case 'SET_EDIT_VALUE':
            return { ...state, editingValue: action.payload };
        case 'TOGGLE_NEW_LINE_MODAL':
            return { ...state, showNewLineModal: action.payload, accountSearchQuery: '' };
        case 'SET_ACCOUNT_SEARCH':
            return { ...state, accountSearchQuery: action.payload };
        case 'TOGGLE_NEW_DRIVER_MODAL':
            return { ...state, showNewDriverModal: action.payload, driverName: '', driverUnit: '' };
        case 'SET_DRIVER_FORM':
            return { ...state, ...action.payload };
        default:
            return state;
    }
}

export const useForecastLogic = () => {
    const [state, dispatch] = useReducer(forecastReducer, initialState);
    const {
        forecasts,
        addForecast, updateForecast, deleteForecast,
        addVersion, updateVersion, setActiveVersion,
        addLine, updateLine, deleteLine, updateLineValue,
        addDriver, updateDriver, deleteDriver, updateDriverValue,
        createRollingSnapshot, getRollingSnapshots,
        generateMLPredictions, detectSeasonality, calculateTrend,
        reconciliationReports, createReconciliationReport,
        submitVersion, validateVersion
    } = useForecast();
    const { chartsOfAccounts, fiscalCalendars } = useReferentials();

    // Derived data
    const selectedForecast = useMemo(() =>
        state.selectedForecastId ? forecasts.find(f => f.id === state.selectedForecastId) : null
    , [forecasts, state.selectedForecastId]);

    const selectedVersion = useMemo(() =>
        selectedForecast && state.selectedVersionId
            ? selectedForecast.versions.find(v => v.id === state.selectedVersionId)
            : null
    , [selectedForecast, state.selectedVersionId]);

    const selectedChart = useMemo(() =>
        selectedForecast
            ? chartsOfAccounts.find(c => c.id === selectedForecast.chartOfAccountsId)
            : null
    , [chartsOfAccounts, selectedForecast]);

    const selectedCalendar = useMemo(() =>
        selectedForecast?.fiscalCalendarId
            ? fiscalCalendars.find(c => c.id === selectedForecast.fiscalCalendarId)
            : null
    , [fiscalCalendars, selectedForecast]);

    // Helpers
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

    // Actions
    const handleSetTab = (tab: ForecastTab) => dispatch({ type: 'SET_TAB', payload: tab });

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
        const forecast = forecasts.find(f => f.id === forecastId);
        dispatch({ type: 'SELECT_FORECAST', payload: forecastId });
        if (forecast) {
            const activeVersion = forecast.versions.find(v => v.id === forecast.activeVersionId) || forecast.versions[0];
            dispatch({ type: 'SELECT_VERSION', payload: activeVersion?.id || null });
        }
        dispatch({ type: 'SET_TAB', payload: 'editor' });
    };

    const handleAddVersion = () => {
        if (!state.selectedForecastId || !selectedForecast) return;
        const newVersionNumber = selectedForecast.versions.length + 1;
        const today = new Date().toISOString().split('T')[0];

        addVersion(state.selectedForecastId, {
            forecastId: state.selectedForecastId,
            versionNumber: newVersionNumber,
            name: `Version ${newVersionNumber}`,
            referenceDate: today,
            status: 'draft',
            lines: [],
            isActive: false
        });
    };

    const handleAddLine = (accountCode: string) => {
        if (!state.selectedForecastId || !state.selectedVersionId) return;
        const account = selectedChart?.accounts.find(a => a.code === accountCode);
        if (!account) return;

        addLine(state.selectedForecastId, state.selectedVersionId, {
            accountCode: account.code,
            accountLabel: account.label,
            method: 'manual',
            forecastValues: {},
            isLocked: false
        });
        dispatch({ type: 'TOGGLE_NEW_LINE_MODAL', payload: false });
    };

    const handleCellEdit = (lineId: string, periodId: string, currentValue: number) => {
        dispatch({
            type: 'START_EDIT',
            payload: { cellId: `${lineId}-${periodId}`, value: currentValue.toString() }
        });
    };

    const handleCellSave = (lineId: string, periodId: string) => {
        if (!state.selectedForecastId || !state.selectedVersionId) return;
        const value = parseFloat(state.editingValue) || 0;
        updateLineValue(state.selectedForecastId, state.selectedVersionId, lineId, periodId, value);
        dispatch({ type: 'CANCEL_EDIT' });
    };

    const handleCellCancel = () => dispatch({ type: 'CANCEL_EDIT' });

    const handleDeleteLine = (lineId: string) => {
        if (!state.selectedForecastId || !state.selectedVersionId) return;
        if (window.confirm('Êtes-vous sûr de vouloir supprimer cette ligne de forecast ?')) {
            deleteLine(state.selectedForecastId, state.selectedVersionId, lineId);
        }
    };

    const handleGenerateMLPredictions = (lineId: string) => {
        if (!state.selectedForecastId || !state.selectedVersionId) return;
        generateMLPredictions(state.selectedForecastId, state.selectedVersionId, lineId, 24);
    };

    const handleAddDriver = () => {
        if (!state.selectedForecastId || !state.driverName.trim()) return;
        addDriver(state.selectedForecastId, {
            name: state.driverName,
            unit: state.driverUnit,
            historicalValues: {},
            forecastValues: {}
        });
        dispatch({ type: 'TOGGLE_NEW_DRIVER_MODAL', payload: false });
    };

    const handleCreateSnapshot = () => {
        if (!state.selectedForecastId) return;
        const today = new Date().toISOString().split('T')[0];
        createRollingSnapshot(state.selectedForecastId, today);
    };

    return {
        state,
        dispatch,
        forecasts,
        chartsOfAccounts,
        fiscalCalendars,
        selectedForecast,
        selectedVersion,
        selectedChart,
        selectedCalendar,
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
    };
};
