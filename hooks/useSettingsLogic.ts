import { useState, useRef, useReducer } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useSettings as useUISettings } from '../context/SettingsContext';
import { useReferentials } from '../context/ReferentialContext';
import { runSelfDiagnostics } from '../utils';
import { AppState, DiagnosticSuite, CalculatedField, Dataset, MasterDataItem, MasterDataType } from '../types';
import { notify } from '../utils/common';
import { useConfirm } from './useConfirm';

type SettingsAction =
    | { type: 'SET_DIAG_RESULTS'; payload: DiagnosticSuite[] | null }
    | { type: 'SET_IS_RUNNING_DIAG'; payload: boolean }
    | { type: 'SET_EDITING_DATASET_ID'; payload: string | null }
    | { type: 'SET_EDIT_NAME'; payload: string }
    | { type: 'SET_BACKUP_MODAL_MODE'; payload: 'backup' | 'restore' | null }
    | { type: 'SET_RESTORE_FILE_CONTENT'; payload: string | null }
    | { type: 'SET_RESTORE_AVAILABLE_DATA'; payload: Partial<AppState> | undefined }
    | { type: 'SET_EDITING_ANALYSIS_ID'; payload: string | null }
    | { type: 'SET_EDIT_ANALYSIS_NAME'; payload: string }
    | { type: 'SET_ACTIVE_FINANCE_TAB'; payload: 'charts' | 'axes' | 'calendar' | 'masterdata' }
    | { type: 'SET_SHOW_AXIS_MODAL'; payload: boolean }
    | { type: 'SET_SHOW_CALENDAR_MODAL'; payload: boolean }
    | { type: 'SET_SHOW_MASTER_DATA_MODAL'; payload: boolean }
    | { type: 'SET_MASTER_DATA_TYPE'; payload: MasterDataType }
    | { type: 'SET_VIEWING_CHART_ID'; payload: string | null }
    | { type: 'SET_SEARCH_ACCOUNT_QUERY'; payload: string }
    | { type: 'SET_VIEWING_DATASET_VERSIONS_ID'; payload: string | null }
    | { type: 'SET_EDITING_CHART_ID'; payload: string | null }
    | { type: 'SET_EDIT_CHART_NAME'; payload: string }
    | { type: 'SET_AXIS_FORM'; payload: any }
    | { type: 'SET_CALENDAR_FORM'; payload: any }
    | { type: 'SET_MASTER_DATA_FORM'; payload: any };

interface SettingsState {
    diagResults: DiagnosticSuite[] | null;
    isRunningDiag: boolean;
    editingDatasetId: string | null;
    editName: string;
    backupModalMode: 'backup' | 'restore' | null;
    restoreFileContent: string | null;
    restoreAvailableData: Partial<AppState> | undefined;
    editingAnalysisId: string | null;
    editAnalysisName: string;
    activeFinanceTab: 'charts' | 'axes' | 'calendar' | 'masterdata';
    showAxisModal: boolean;
    showCalendarModal: boolean;
    showMasterDataModal: boolean;
    masterDataType: MasterDataType;
    viewingChartId: string | null;
    searchAccountQuery: string;
    viewingDatasetVersionsId: string | null;
    editingChartId: string | null;
    editChartName: string;
    axisForm: { code: string; name: string; isMandatory: boolean; allowMultiple: boolean };
    calendarForm: { fiscalYear: number; startDate: string; endDate: string };
    masterDataForm: { code: string; name: string; category: string; taxId: string };
}

const initialState: SettingsState = {
    diagResults: null,
    isRunningDiag: false,
    editingDatasetId: null,
    editName: '',
    backupModalMode: null,
    restoreFileContent: null,
    restoreAvailableData: undefined,
    editingAnalysisId: null,
    editAnalysisName: '',
    activeFinanceTab: 'charts',
    showAxisModal: false,
    showCalendarModal: false,
    showMasterDataModal: false,
    masterDataType: 'customer',
    viewingChartId: null,
    searchAccountQuery: '',
    viewingDatasetVersionsId: null,
    editingChartId: null,
    editChartName: '',
    axisForm: { code: '', name: '', isMandatory: false, allowMultiple: false },
    calendarForm: { fiscalYear: new Date().getFullYear(), startDate: '', endDate: '' },
    masterDataForm: { code: '', name: '', category: '', taxId: '' }
};

function settingsReducer(state: SettingsState, action: SettingsAction): SettingsState {
    switch (action.type) {
        case 'SET_DIAG_RESULTS': return { ...state, diagResults: action.payload };
        case 'SET_IS_RUNNING_DIAG': return { ...state, isRunningDiag: action.payload };
        case 'SET_EDITING_DATASET_ID': return { ...state, editingDatasetId: action.payload };
        case 'SET_EDIT_NAME': return { ...state, editName: action.payload };
        case 'SET_BACKUP_MODAL_MODE': return { ...state, backupModalMode: action.payload };
        case 'SET_RESTORE_FILE_CONTENT': return { ...state, restoreFileContent: action.payload };
        case 'SET_RESTORE_AVAILABLE_DATA': return { ...state, restoreAvailableData: action.payload };
        case 'SET_EDITING_ANALYSIS_ID': return { ...state, editingAnalysisId: action.payload };
        case 'SET_EDIT_ANALYSIS_NAME': return { ...state, editAnalysisName: action.payload };
        case 'SET_ACTIVE_FINANCE_TAB': return { ...state, activeFinanceTab: action.payload };
        case 'SET_SHOW_AXIS_MODAL': return { ...state, showAxisModal: action.payload };
        case 'SET_SHOW_CALENDAR_MODAL': return { ...state, showCalendarModal: action.payload };
        case 'SET_SHOW_MASTER_DATA_MODAL': return { ...state, showMasterDataModal: action.payload };
        case 'SET_MASTER_DATA_TYPE': return { ...state, masterDataType: action.payload };
        case 'SET_VIEWING_CHART_ID': return { ...state, viewingChartId: action.payload };
        case 'SET_SEARCH_ACCOUNT_QUERY': return { ...state, searchAccountQuery: action.payload };
        case 'SET_VIEWING_DATASET_VERSIONS_ID': return { ...state, viewingDatasetVersionsId: action.payload };
        case 'SET_EDITING_CHART_ID': return { ...state, editingChartId: action.payload };
        case 'SET_EDIT_CHART_NAME': return { ...state, editChartName: action.payload };
        case 'SET_AXIS_FORM': return { ...state, axisForm: action.payload };
        case 'SET_CALENDAR_FORM': return { ...state, calendarForm: action.payload };
        case 'SET_MASTER_DATA_FORM': return { ...state, masterDataForm: action.payload };
        default: return state;
    }
}

export function useSettingsLogic() {
    const { confirm, ...confirmProps } = useConfirm();
    const {
        getBackupJson,
        importBackup,
        clearAll,
        loadDemoData,
        batches,
        datasets,
        deleteDataset,
        updateDatasetName,
        savedAnalyses,
        deleteAnalysis,
        updateAnalysis,
        deleteBatch,
        dashboardWidgets,
        savedMappings
    } = useData();

    const { uiPrefs, updateUIPrefs, resetUIPrefs } = useUISettings();

    const {
        chartsOfAccounts,
        addChartOfAccounts,
        setDefaultChartOfAccounts,
        deleteChartOfAccounts,
        updateChartOfAccounts,
        analyticalAxes,
        addAnalyticalAxis,
        fiscalCalendars,
        addFiscalCalendar,
        masterData,
        addMasterDataItem,
        importPCGTemplate,
        importIFRSTemplate
    } = useReferentials();

    const [state, dispatch] = useReducer(settingsReducer, initialState);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    const handleDownloadBackup = (keys: (keyof AppState)[]) => {
        const json = getBackupJson(keys);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        const isComplete = keys.length >= 10;
        link.download = `datascope_backup_${isComplete ? 'complete' : 'partielle'}_${new Date().toISOString().split('T')[0]}.json`;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();

        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 100);
        dispatch({ type: 'SET_BACKUP_MODAL_MODE', payload: null });
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const content = event.target?.result as string;
            if (content) {
                try {
                    const parsed = JSON.parse(content);
                    const isSharePackage = await import('../services/o365Service')
                        .then(m => m.o365Service.isSharePackage(content));

                    if (isSharePackage) {
                        notify.info(`Import de contenu partagé détecté`, `Type: ${parsed.type} | Nom: ${parsed.name}`);
                        const shareContent = parsed.content;
                        dispatch({ type: 'SET_RESTORE_FILE_CONTENT', payload: JSON.stringify(shareContent) });
                        dispatch({ type: 'SET_RESTORE_AVAILABLE_DATA', payload: shareContent });
                        dispatch({ type: 'SET_BACKUP_MODAL_MODE', payload: 'restore' });
                    } else {
                        dispatch({ type: 'SET_RESTORE_FILE_CONTENT', payload: content });
                        dispatch({ type: 'SET_RESTORE_AVAILABLE_DATA', payload: parsed });
                        dispatch({ type: 'SET_BACKUP_MODAL_MODE', payload: 'restore' });
                    }
                } catch (err) {
                    notify.error('Fichier invalide');
                }
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const handleConfirmRestore = async (keys: (keyof AppState)[]) => {
        if (!state.restoreFileContent) return;
        const success = await importBackup(state.restoreFileContent, keys);
        if (success) {
            notify.success('Restauration effectuée avec succès !');
            dispatch({ type: 'SET_BACKUP_MODAL_MODE', payload: null });
            dispatch({ type: 'SET_RESTORE_FILE_CONTENT', payload: null });
        } else {
            notify.error('Erreur lors de la restauration.');
        }
    };

    const handleRestoreFromO365 = async (data: Partial<AppState>) => {
        const jsonContent = JSON.stringify(data);
        const success = await importBackup(jsonContent, Object.keys(data) as (keyof AppState)[]);
        if (!success) {
            notify.error('Erreur lors de la restauration depuis OneDrive.');
        } else {
            notify.success('Restauration depuis OneDrive effectuée !');
        }
    };

    const handleLoadDemo = async () => {
        if (batches.length > 0) {
            const ok = await confirm({
                title: 'Charger les données de test',
                message: "Cette action va remplacer vos données actuelles par des données de test. Continuer ?",
                variant: 'warning'
            });
            if (!ok) return;
        }
        loadDemoData();
        navigate('/');
    };

    const handleReset = async () => {
        const ok = await confirm({
            title: 'Réinitialisation complète',
            message: "ATTENTION : Cette action va effacer TOUTES les données de l'application localement. Êtes-vous sûr ?",
            variant: 'danger',
            confirmLabel: 'Tout effacer'
        });
        if (ok) {
            clearAll();
        }
    };

    const handleDeleteDataset = async (id: string, name: string) => {
        const ok = await confirm({
            title: 'Supprimer la typologie',
            message: `Êtes-vous sûr de vouloir supprimer définitivement la typologie "${name}" et tout son historique d'imports ? Cette action est irréversible.`,
            variant: 'danger'
        });
        if (ok) {
            deleteDataset(id);
        }
    };

    const handleRunDiagnostics = () => {
        dispatch({ type: 'SET_IS_RUNNING_DIAG', payload: true });
        dispatch({ type: 'SET_DIAG_RESULTS', payload: null });

        setTimeout(() => {
            const results = runSelfDiagnostics();
            dispatch({ type: 'SET_DIAG_RESULTS', payload: results });
            dispatch({ type: 'SET_IS_RUNNING_DIAG', payload: false });
        }, 800);
    };

    const handleSaveEditing = () => {
        if (state.editingDatasetId && state.editName.trim()) {
            updateDatasetName(state.editingDatasetId, state.editName.trim());
            dispatch({ type: 'SET_EDITING_DATASET_ID', payload: null });
        }
    };

    const handleSaveEditingAnalysis = () => {
        if (state.editingAnalysisId && state.editAnalysisName.trim()) {
            updateAnalysis(state.editingAnalysisId, { name: state.editAnalysisName.trim() });
            dispatch({ type: 'SET_EDITING_ANALYSIS_ID', payload: null });
            dispatch({ type: 'SET_EDIT_ANALYSIS_NAME', payload: '' });
        }
    };

    const handleDeleteAnalysis = async (id: string, name: string) => {
        const ok = await confirm({
            title: 'Supprimer l\'analyse',
            message: `Êtes-vous sûr de vouloir supprimer définitivement l'analyse "${name}" ?`,
            variant: 'danger'
        });
        if (ok) {
            deleteAnalysis(id);
        }
    };

    const handleDeleteChart = async (id: string, name: string) => {
        const chart = chartsOfAccounts.find(c => c.id === id);
        if (chart?.isDefault && chartsOfAccounts.length > 1) {
            notify.warning('Impossible de supprimer le plan comptable par défaut');
            return;
        }
        const ok = await confirm({
            title: 'Supprimer le plan comptable',
            message: `Êtes-vous sûr de vouloir supprimer le plan comptable "${name}" et tous ses comptes (${chart?.accounts.length} comptes) ? Cette action est irréversible.`,
            variant: 'danger'
        });
        if (ok) {
            deleteChartOfAccounts(id);
        }
    };

    const handleSaveChartEditing = () => {
        if (state.editingChartId && state.editChartName.trim()) {
            updateChartOfAccounts(state.editingChartId, { name: state.editChartName.trim() });
            dispatch({ type: 'SET_EDITING_CHART_ID', payload: null });
            dispatch({ type: 'SET_EDIT_CHART_NAME', payload: '' });
        }
    };

    const handleCreateAxis = () => {
        if (!state.axisForm.code || !state.axisForm.name) {
            notify.warning('Veuillez remplir le code et le nom de l\'axe');
            return;
        }
        addAnalyticalAxis({
            code: state.axisForm.code.toUpperCase(),
            name: state.axisForm.name,
            isMandatory: state.axisForm.isMandatory,
            allowMultiple: state.axisForm.allowMultiple,
            level: 1,
            isActive: true
        });
        dispatch({ type: 'SET_SHOW_AXIS_MODAL', payload: false });
        dispatch({ type: 'SET_AXIS_FORM', payload: initialState.axisForm });
    };

    const handleCreateCalendar = () => {
        if (!state.calendarForm.startDate || !state.calendarForm.endDate) {
            notify.warning('Veuillez remplir les dates de début et fin');
            return;
        }

        const start = new Date(state.calendarForm.startDate);
        const end = new Date(state.calendarForm.endDate);
        const periods = [];

        let current = new Date(start);
        let periodNum = 1;

        while (current < end) {
            const periodEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
            if (periodEnd > end) break;

            periods.push({
                id: `period_${periodNum}`,
                code: `${state.calendarForm.fiscalYear}-${String(periodNum).padStart(2, '0')}`,
                name: `Période ${periodNum}`,
                type: 'month' as const,
                fiscalYear: state.calendarForm.fiscalYear,
                startDate: current.toISOString().split('T')[0],
                endDate: periodEnd.toISOString().split('T')[0],
                isClosed: false,
                createdAt: Date.now()
            });

            current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
            periodNum++;
        }

        addFiscalCalendar({
            name: `Calendrier ${state.calendarForm.fiscalYear}`,
            fiscalYear: state.calendarForm.fiscalYear,
            startDate: state.calendarForm.startDate,
            endDate: state.calendarForm.endDate,
            periods
        });

        dispatch({ type: 'SET_SHOW_CALENDAR_MODAL', payload: false });
        dispatch({ type: 'SET_CALENDAR_FORM', payload: initialState.calendarForm });
    };

    const handleCreateMasterData = () => {
        if (!state.masterDataForm.code || !state.masterDataForm.name) {
            notify.warning('Veuillez remplir le code et le nom');
            return;
        }

        addMasterDataItem({
            type: state.masterDataType,
            code: state.masterDataForm.code,
            name: state.masterDataForm.name,
            category: state.masterDataForm.category || undefined,
            taxId: state.masterDataForm.taxId || undefined,
            isActive: true
        });

        dispatch({ type: 'SET_SHOW_MASTER_DATA_MODAL', payload: false });
        dispatch({ type: 'SET_MASTER_DATA_FORM', payload: initialState.masterDataForm });
    };

    return {
        state,
        dispatch,
        fileInputRef,
        navigate,

        // Data
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

        // Handlers
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

        // Context actions
        setDefaultChartOfAccounts,
        importPCGTemplate,
        importIFRSTemplate,
        deleteBatch,
        updateDatasetName,
        updateAnalysis,
        updateChartOfAccounts,
        confirmProps
    };
}
