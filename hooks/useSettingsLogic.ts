import { useState, useRef } from 'react';
import { useData } from '../context/DataContext';
import { useSettings } from '../context/SettingsContext';
import { useReferentials } from '../context/ReferentialContext';
import { runSelfDiagnostics } from '../utils';
import { DiagnosticSuite, AppState, Dataset } from '../types';
import { useHistory } from './useHistory';

export type SettingsTab = 'general' | 'ui' | 'finance' | 'o365' | 'security' | 'about';

export const useSettingsLogic = () => {
  const {
    getBackupJson,
    currentDataset,
    currentDatasetId,
    switchDataset,
    companyLogo,
    updateCompanyLogo,
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

  const { uiPrefs, updateUIPrefs, resetUIPrefs } = useSettings();

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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    state: historyState,
    set: setHistoryState,
    undo,
    redo,
    canUndo,
    canRedo
  } = useHistory<{ activeTab: SettingsTab }>({ activeTab: 'general' });

  const [searchTerm, setSearchTerm] = useState('');

  // Stats
  const datasetsCount = datasets.length;
  const totalRows = batches.reduce((sum, b) => sum + b.rows.length, 0);
  const totalBatchesCount = batches.length;
  const storageUsed = '4.2 MB'; // Placeholder for now
  const storageLimit = '50 MB';

  // Diagnostics
  const [diagResults, setDiagResults] = useState<DiagnosticSuite[] | null>(null);
  const [isRunningDiag, setIsRunningDiag] = useState(false);

  // Backup/Restore
  const [backupModalMode, setBackupModalMode] = useState<'backup' | 'restore' | null>(null);
  const [restoreFileContent, setRestoreFileContent] = useState<string | null>(null);
  const [restoreAvailableData, setRestoreAvailableData] = useState<Partial<AppState> | undefined>(
    undefined
  );

  // Management State
  const [editingDatasetId, setEditingDatasetId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editingAnalysisId, setEditingAnalysisId] = useState<string | null>(null);
  const [editAnalysisName, setEditAnalysisName] = useState('');
  const [viewingDatasetVersionsId, setViewingDatasetVersionsId] = useState<string | null>(null);

  // Finance UI State
  const [activeFinanceTab, setActiveFinanceTab] = useState<
    'charts' | 'axes' | 'calendar' | 'masterdata'
  >('charts');
  const [showAxisModal, setShowAxisModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showMasterDataModal, setShowMasterDataModal] = useState(false);
  const [masterDataType, setMasterDataType] = useState<
    'customer' | 'supplier' | 'product' | 'employee'
  >('customer');
  const [viewingChartId, setViewingChartId] = useState<string | null>(null);
  const [searchAccountQuery, setSearchAccountQuery] = useState('');
  const [editingChartId, setEditingChartId] = useState<string | null>(null);
  const [editChartName, setEditChartName] = useState('');
  const [showRestoreModal, setShowRestoreModal] = useState(false);

  // Forms
  const [axisForm, setAxisForm] = useState({
    code: '',
    name: '',
    isMandatory: false,
    allowMultiple: false
  });
  const [calendarForm, setCalendarForm] = useState({
    fiscalYear: new Date().getFullYear(),
    startDate: '',
    endDate: ''
  });
  const [masterDataForm, setMasterDataForm] = useState({
    code: '',
    name: '',
    category: '',
    taxId: ''
  });

  // Handlers
  const handleDownloadBackup = (keys: (keyof AppState)[]) => {
    const json = getBackupJson(keys);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `datascope_backup_${keys.length >= 10 ? 'complete' : 'partielle'}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    setBackupModalMode(null);
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
          setRestoreFileContent(content);
          setRestoreAvailableData(parsed);
          setBackupModalMode('restore');
        } catch (err) {
          alert('Fichier invalide');
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmRestore = async (keys: (keyof AppState)[]) => {
    if (!restoreFileContent) return;
    const success = await importBackup(restoreFileContent, keys);
    if (success) {
      alert('Restauration effectuée avec succès !');
      setBackupModalMode(null);
    }
  };

  const handleRunDiagnostics = () => {
    setIsRunningDiag(true);
    setTimeout(() => {
      setDiagResults(runSelfDiagnostics());
      setIsRunningDiag(false);
    }, 800);
  };

  const handleCreateAxis = () => {
    if (!axisForm.code || !axisForm.name) return;
    addAnalyticalAxis({ ...axisForm, code: axisForm.code.toUpperCase(), level: 1, isActive: true });
    setShowAxisModal(false);
    setAxisForm({ code: '', name: '', isMandatory: false, allowMultiple: false });
  };

  const handleCreateCalendar = () => {
    if (!calendarForm.startDate || !calendarForm.endDate) return;

    const start = new Date(calendarForm.startDate);
    const end = new Date(calendarForm.endDate);
    const periods = [];

    let current = new Date(start);
    let periodNum = 1;

    while (current < end) {
      const periodEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
      if (periodEnd > end) break;

      periods.push({
        id: `period_${periodNum}`,
        code: `${calendarForm.fiscalYear}-${String(periodNum).padStart(2, '0')}`,
        name: `Période ${periodNum}`,
        type: 'month' as const,
        fiscalYear: calendarForm.fiscalYear,
        startDate: current.toISOString().split('T')[0],
        endDate: periodEnd.toISOString().split('T')[0],
        isClosed: false,
        createdAt: Date.now()
      });

      current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
      periodNum++;
    }

    addFiscalCalendar({ ...calendarForm, name: `Calendrier ${calendarForm.fiscalYear}`, periods });
    setShowCalendarModal(false);
    setCalendarForm({ fiscalYear: new Date().getFullYear(), startDate: '', endDate: '' });
  };

  const handleCreateMasterData = () => {
    if (!masterDataForm.code || !masterDataForm.name) return;
    addMasterDataItem({ ...masterDataForm, type: masterDataType, isActive: true });
    setShowMasterDataModal(false);
  };

  return {
    // State
    activeTab: historyState.activeTab,
    setActiveTab: (tab: SettingsTab) => setHistoryState((prev) => ({ ...prev, activeTab: tab })),
    searchTerm,
    setSearchTerm,
    datasetsCount,
    totalRows,
    totalBatchesCount,
    storageUsed,
    storageLimit,
    diagResults,
    isRunningDiag,
    showRestoreModal,
    setShowRestoreModal,
    editingDatasetId,
    setEditingDatasetId,
    editName,
    setEditName,
    editingAnalysisId,
    setEditingAnalysisId,
    editAnalysisName,
    setEditAnalysisName,
    viewingDatasetVersionsId,
    setViewingDatasetVersionsId,
    backupModalMode,
    setBackupModalMode,
    restoreAvailableData,
    activeFinanceTab,
    setActiveFinanceTab,
    showAxisModal,
    setShowAxisModal,
    showCalendarModal,
    setShowCalendarModal,
    showMasterDataModal,
    setShowMasterDataModal,
    masterDataType,
    setMasterDataType,
    viewingChartId,
    setViewingChartId,
    searchAccountQuery,
    setSearchAccountQuery,
    editingChartId,
    setEditingChartId,
    editChartName,
    setEditChartName,
    axisForm,
    setAxisForm,
    calendarForm,
    setCalendarForm,
    masterDataForm,
    setMasterDataForm,
    fileInputRef,

    // Data from contexts
    uiPrefs,
    batches,
    datasets,
    currentDataset,
    currentDatasetId,
    companyLogo,
    importBackup,
    savedAnalyses,
    chartsOfAccounts,
    analyticalAxes,
    fiscalCalendars,
    masterData,
    dashboardWidgets,
    savedMappings,

    // Handlers
    updateUIPrefs,
    resetUIPrefs,
    setCompanyLogo: updateCompanyLogo,
    handleDownloadBackup,
    handleExportBackup: () => handleDownloadBackup(['datasets', 'batches', 'dashboardWidgets', 'savedAnalyses', 'companyLogo', 'financeReferentials', 'budgetModule', 'forecastModule', 'pipelineModule', 'uiPrefs']),
    handleFileChange,
    handleConfirmRestore,
    handleRunDiagnostics,
    loadDemoData,
    clearAll,
    deleteDataset,
    updateDatasetName,
    deleteAnalysis,
    updateAnalysis,
    deleteBatch,
    addChartOfAccounts,
    setDefaultChartOfAccounts,
    deleteChartOfAccounts,
    updateChartOfAccounts,
    importPCGTemplate,
    importIFRSTemplate,
    handleCreateAxis,
    handleCreateCalendar,
    handleCreateMasterData,
    startEditing: (ds: Dataset) => {
      setEditingDatasetId(ds.id);
      setEditName(ds.name);
    },
    saveEditing: () => {
      if (editingDatasetId && editName.trim()) {
        updateDatasetName(editingDatasetId, editName.trim());
        setEditingDatasetId(null);
      }
    },
    cancelEditing: () => setEditingDatasetId(null),
    startEditingAnalysis: (a: any) => {
      setEditingAnalysisId(a.id);
      setEditAnalysisName(a.name);
    },
    saveEditingAnalysis: () => {
      if (editingAnalysisId && editAnalysisName.trim()) {
        updateAnalysis(editingAnalysisId, { name: editAnalysisName.trim() });
        setEditingAnalysisId(null);
      }
    },
    cancelEditingAnalysis: () => setEditingAnalysisId(null),
    startEditingChart: (id: string, name: string) => {
      setEditingChartId(id);
      setEditChartName(name);
    },
    saveChartEditing: () => {
      if (editingChartId && editChartName.trim()) {
        updateChartOfAccounts(editingChartId, { name: editChartName.trim() });
        setEditingChartId(null);
      }
    },
    cancelChartEditing: () => setEditingChartId(null)
  };
};
