import { useState, useRef, useCallback } from 'react';
import { useBudget } from '../context/BudgetContext';
import { useReferentials } from '../context/ReferentialContext';
import { BudgetVersion, Budget } from '../types';
import { useHistory } from './useHistory';
import {
  readBudgetExcelFile,
  readBudgetCSVFile,
  convertImportToBudgetLines,
  exportBudgetToExcel,
  downloadBudgetTemplate
} from '../utils/budgetImport';
import {
  readAnalyticalAxisExcelFile,
  readAnalyticalAxisCSVFile,
  convertImportToAxisValues,
  exportAxisValuesToExcel,
  downloadAnalyticalAxisTemplate
} from '../utils/analyticalAxisImport';
import { toast } from 'sonner';

export type BudgetTab =
  | 'list'
  | 'editor'
  | 'comparison'
  | 'workflow'
  | 'templates'
  | 'referentials';

export const useBudgetLogic = () => {
  const {
    budgets,
    templates,
    addBudget,
    updateBudget,
    deleteBudget,
    addVersion,
    updateVersion,
    deleteVersion,
    setActiveVersion,
    duplicateVersion,
    addLine,
    updateLine,
    deleteLine,
    updateLineValue,
    submitVersion,
    validateVersion,
    rejectVersion,
    lockBudget,
    unlockBudget,
    compareVersions,
    addTemplate,
    deleteTemplate
  } = useBudget();

  const {
    chartsOfAccounts,
    fiscalCalendars,
    analyticalAxes,
    axisValues,
    addAnalyticalAxis,
    addAxisValues,
    deleteAxisValue,
    getAxisValues
  } = useReferentials();

  // --- STATE WITH HISTORY ---
  const {
    state: historyState,
    set: setHistoryState,
    undo,
    redo,
    canUndo,
    canRedo,
    clear: clearHistory
  } = useHistory<{
    activeTab: BudgetTab;
    selectedBudgetId: string | null;
    selectedVersionId: string | null;
  }>({
    activeTab: 'list',
    selectedBudgetId: null,
    selectedVersionId: null
  });

  const { activeTab, selectedBudgetId, selectedVersionId } = historyState;

  const setActiveTab = (tab: BudgetTab) =>
    setHistoryState((prev) => ({ ...prev, activeTab: tab }));
  const setSelectedBudgetId = (id: string | null) =>
    setHistoryState((prev) => ({ ...prev, selectedBudgetId: id }));
  const setSelectedVersionId = (id: string | null) =>
    setHistoryState((prev) => ({ ...prev, selectedVersionId: id }));

  // Editor state
  const [editingCellId, setEditingCellId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [showNewBudgetModal, setShowNewBudgetModal] = useState(false);
  const [showNewLineModal, setShowNewLineModal] = useState(false);
  const [newLineAccount, setNewLineAccount] = useState('');
  const [showAccountSelector, setShowAccountSelector] = useState(false);
  const [accountSearchQuery, setAccountSearchQuery] = useState('');

  // Import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Template state
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showEditTemplateModal, setShowEditTemplateModal] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateCategory, setTemplateCategory] = useState('');
  const [templateSourceBudgetId, setTemplateSourceBudgetId] = useState<string>('');

  // Comparison state
  const [compareVersion1Id, setCompareVersion1Id] = useState<string | null>(null);
  const [compareVersion2Id, setCompareVersion2Id] = useState<string | null>(null);

  // Analytical Axis Import state
  const [showAxisImportModal, setShowAxisImportModal] = useState(false);
  const [selectedAxisId, setSelectedAxisId] = useState<string>('');
  const [axisImportError, setAxisImportError] = useState<string | null>(null);
  const [isImportingAxis, setIsImportingAxis] = useState(false);
  const axisFileInputRef = useRef<HTMLInputElement>(null);
  const [showNewAxisModal, setShowNewAxisModal] = useState(false);
  const [newAxisCode, setNewAxisCode] = useState('');
  const [newAxisName, setNewAxisName] = useState('');
  const [newAxisMandatory, setNewAxisMandatory] = useState(false);

  // Get selected budget and version
  const selectedBudget =
    (selectedBudgetId ? budgets.find((b) => b.id === selectedBudgetId) : null) || null;
  const selectedVersion =
    (selectedBudget && selectedVersionId
      ? selectedBudget.versions.find((v) => v.id === selectedVersionId)
      : null) || null;
  const selectedChart =
    (selectedBudget
      ? chartsOfAccounts.find((c) => c.id === selectedBudget.chartOfAccountsId)
      : null) || null;
  const selectedCalendar =
    (selectedBudget?.fiscalCalendarId
      ? fiscalCalendars.find((c) => c.id === selectedBudget.fiscalCalendarId)
      : null) || null;

  // Handler functions
  const handleCreateBudget = useCallback(
    (name: string, fiscalYear: number, chartId: string, calendarId?: string) => {
      const startDate = `${fiscalYear}-01-01`;
      const endDate = `${fiscalYear}-12-31`;
      addBudget({
        name,
        fiscalYear,
        chartOfAccountsId: chartId,
        fiscalCalendarId: calendarId,
        versions: [],
        owner: 'Current User',
        isLocked: false,
        startDate,
        endDate
      });
      setShowNewBudgetModal(false);
      toast.success(`Budget "${name}" créé avec succès.`);
    },
    [addBudget]
  );

  const handleSelectBudget = useCallback(
    (budgetId: string) => {
      const budget = budgets.find((b) => b.id === budgetId);
      const activeVersion = budget
        ? budget.versions.find((v) => v.id === budget.activeVersionId) || budget.versions[0]
        : null;

      setHistoryState({
        ...historyState,
        selectedBudgetId: budgetId,
        selectedVersionId: activeVersion?.id || null,
        activeTab: 'editor'
      });
    },
    [budgets, historyState, setHistoryState]
  );

  const handleAddVersion = useCallback(() => {
    if (!selectedBudgetId || !selectedBudget) return;
    const newVersionNumber = selectedBudget.versions.length + 1;
    addVersion(selectedBudgetId, {
      budgetId: selectedBudgetId,
      versionNumber: newVersionNumber,
      name: `Version ${newVersionNumber}`,
      scenario: 'realistic',
      status: 'draft',
      lines: [],
      isActive: false
    });
    toast.success(`Version ${newVersionNumber} ajoutée.`);
  }, [selectedBudgetId, selectedBudget, addVersion]);

  const handleAddLine = useCallback(
    (accountCode: string) => {
      if (!selectedBudgetId || !selectedVersionId) return;
      const account = selectedChart?.accounts.find((a) => a.code === accountCode);
      if (!account) return;

      addLine(selectedBudgetId, selectedVersionId, {
        accountCode: account.code,
        accountLabel: account.label,
        periodValues: {},
        isLocked: false
      });
      setShowNewLineModal(false);
      setNewLineAccount('');
      setAccountSearchQuery('');
      toast.success(`Compte ${accountCode} ajouté au budget.`);
    },
    [selectedBudgetId, selectedVersionId, selectedChart, addLine]
  );

  const handleCellEdit = useCallback((lineId: string, periodId: string, currentValue: number) => {
    setEditingCellId(`${lineId}-${periodId}`);
    setEditingValue(currentValue.toString());
  }, []);

  const handleCellSave = useCallback(
    (lineId: string, periodId: string) => {
      if (!selectedBudgetId || !selectedVersionId) return;
      const value = parseFloat(editingValue) || 0;
      updateLineValue(selectedBudgetId, selectedVersionId, lineId, periodId, value);
      setEditingCellId(null);
      setEditingValue('');
    },
    [selectedBudgetId, selectedVersionId, editingValue, updateLineValue]
  );

  const handleCellCancel = useCallback(() => {
    setEditingCellId(null);
    setEditingValue('');
  }, []);

  const handleDeleteLine = useCallback(
    (lineId: string) => {
      if (!selectedBudgetId || !selectedVersionId) return;
      if (window.confirm('Êtes-vous sûr de vouloir supprimer cette ligne budgétaire ?')) {
        deleteLine(selectedBudgetId, selectedVersionId, lineId);
        toast.success('Ligne supprimée.');
      }
    },
    [selectedBudgetId, selectedVersionId, deleteLine]
  );

  const handleImportFile = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !selectedBudgetId || !selectedVersionId || !selectedBudget) return;

      setIsImporting(true);
      setImportError(null);

      try {
        const fileExt = file.name.split('.').pop()?.toLowerCase();
        let importData;

        if (fileExt === 'xlsx' || fileExt === 'xls') {
          importData = await readBudgetExcelFile(file);
        } else if (fileExt === 'csv') {
          importData = await readBudgetCSVFile(file);
        } else {
          throw new Error('Format de fichier non supporté. Utilisez .xlsx, .xls ou .csv');
        }

        const newLines = convertImportToBudgetLines(importData, selectedBudget.chartOfAccountsId);

        if (newLines.length === 0) {
          throw new Error('Aucune ligne budgétaire trouvée dans le fichier');
        }

        const version = selectedBudget.versions.find((v) => v.id === selectedVersionId);
        if (version) {
          updateVersion(selectedBudgetId, selectedVersionId, {
            lines: [...version.lines, ...newLines]
          });
        }

        setShowImportModal(false);
        toast.success(`${newLines.length} ligne(s) budgétaire(s) importée(s) avec succès !`);
      } catch (error) {
        setImportError(error instanceof Error ? error.message : "Erreur lors de l'import");
        toast.error(error instanceof Error ? error.message : "Erreur lors de l'import");
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [selectedBudgetId, selectedVersionId, selectedBudget, updateVersion]
  );

  const handleExportBudget = useCallback(() => {
    if (!selectedBudget || !selectedVersion || !selectedCalendar) return;

    const periods = selectedCalendar.periods.map((p) => ({
      id: p.id,
      name: p.name
    }));

    exportBudgetToExcel(
      `${selectedBudget.name} - ${selectedVersion.name}`,
      selectedVersion.lines,
      periods
    );
    toast.success('Export réussi.');
  }, [selectedBudget, selectedVersion, selectedCalendar]);

  const handleDownloadTemplate = useCallback(() => {
    const year = selectedBudget?.fiscalYear || new Date().getFullYear();
    downloadBudgetTemplate(year);
  }, [selectedBudget]);

  const handleCreateTemplate = useCallback(() => {
    if (!templateName.trim()) {
      toast.error('Veuillez saisir un nom pour le modèle');
      return;
    }

    let accountCodes: string[] = [];
    if (templateSourceBudgetId) {
      const sourceBudget = budgets.find((b) => b.id === templateSourceBudgetId);
      if (sourceBudget && sourceBudget.versions.length > 0) {
        const latestVersion = sourceBudget.versions[sourceBudget.versions.length - 1];
        accountCodes = latestVersion.lines.map((line) => line.accountCode);
      }
    }

    addTemplate({
      name: templateName.trim(),
      description: templateDescription.trim() || undefined,
      category: templateCategory.trim() || undefined,
      accountCodes,
      isActive: true
    });

    setTemplateName('');
    setTemplateDescription('');
    setTemplateCategory('');
    setTemplateSourceBudgetId('');
    setShowTemplateModal(false);

    toast.success('Modèle créé avec succès !');
  }, [
    templateName,
    templateSourceBudgetId,
    templateDescription,
    templateCategory,
    budgets,
    addTemplate
  ]);

  const handleDeleteTemplate = useCallback(
    (templateId: string, templateName: string) => {
      if (window.confirm(`Êtes-vous sûr de vouloir supprimer le modèle "${templateName}" ?`)) {
        deleteTemplate(templateId);
        toast.success('Modèle supprimé.');
      }
    },
    [deleteTemplate]
  );

  const handleUseTemplate = useCallback(
    (templateId: string) => {
      const template = templates.find((t) => t.id === templateId);
      if (!template) {
        toast.error('Modèle non trouvé');
        return;
      }

      const newBudgetName = `Budget depuis ${template.name}`;
      const fiscalYear = new Date().getFullYear();
      const startDate = `${fiscalYear}-01-01`;
      const endDate = `${fiscalYear}-12-31`;

      const initialVersion: BudgetVersion = {
        id: `version-${Date.now()}`,
        budgetId: '',
        versionNumber: 1,
        name: 'V1 - Initial',
        scenario: 'realistic',
        status: 'draft',
        lines: [],
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      addBudget({
        name: newBudgetName,
        chartOfAccountsId: chartsOfAccounts[0]?.id || '',
        fiscalYear,
        fiscalCalendarId: fiscalCalendars[0]?.id,
        versions: [initialVersion],
        startDate,
        endDate,
        owner: 'user@example.com',
        isLocked: false
      });

      setTimeout(() => {
        const createdBudget = budgets.find((b) => b.name === newBudgetName);
        if (createdBudget && createdBudget.versions.length > 0) {
          const version = createdBudget.versions[0];

          template.accountCodes.forEach((accountCode) => {
            addLine(createdBudget.id, version.id, {
              accountCode,
              periodValues: {},
              isLocked: false
            });
          });

          setSelectedBudgetId(createdBudget.id);
          setSelectedVersionId(version.id);
          setActiveTab('editor');

          toast.success(
            `Budget "${newBudgetName}" créé avec ${template.accountCodes.length} comptes !`
          );
        }
      }, 100);
    },
    [templates, budgets, chartsOfAccounts, fiscalCalendars, addBudget, addLine]
  );

  const handleEditTemplate = useCallback(
    (templateId: string) => {
      const template = templates.find((t) => t.id === templateId);
      if (!template) return;

      setEditingTemplateId(templateId);
      setTemplateName(template.name);
      setTemplateDescription(template.description || '');
      setTemplateCategory(template.category || '');
      setShowEditTemplateModal(true);
    },
    [templates]
  );

  const handleUpdateTemplate = useCallback(() => {
    if (!editingTemplateId) return;

    if (!templateName.trim()) {
      toast.error('Veuillez saisir un nom pour le modèle');
      return;
    }

    const template = templates.find((t) => t.id === editingTemplateId);
    if (!template) return;

    deleteTemplate(editingTemplateId);
    addTemplate({
      name: templateName.trim(),
      description: templateDescription.trim() || undefined,
      category: templateCategory.trim() || undefined,
      accountCodes: template.accountCodes,
      isActive: template.isActive
    });

    setTemplateName('');
    setTemplateDescription('');
    setTemplateCategory('');
    setEditingTemplateId(null);
    setShowEditTemplateModal(false);

    toast.success('Modèle modifié avec succès !');
  }, [
    editingTemplateId,
    templateName,
    templateDescription,
    templateCategory,
    templates,
    deleteTemplate,
    addTemplate
  ]);

  const handleCreateAxis = useCallback(() => {
    if (!newAxisCode.trim() || !newAxisName.trim()) {
      toast.error("Veuillez saisir un code et un nom pour l'axe");
      return;
    }

    if (analyticalAxes.some((axis) => axis.code === newAxisCode.trim())) {
      toast.error('Un axe avec ce code existe déjà');
      return;
    }

    addAnalyticalAxis({
      code: newAxisCode.trim().toUpperCase(),
      name: newAxisName.trim(),
      isMandatory: newAxisMandatory,
      allowMultiple: false,
      level: analyticalAxes.length + 1,
      isActive: true
    });

    setNewAxisCode('');
    setNewAxisName('');
    setNewAxisMandatory(false);
    setShowNewAxisModal(false);

    toast.success('Axe analytique créé avec succès !');
  }, [newAxisCode, newAxisName, newAxisMandatory, analyticalAxes, addAnalyticalAxis]);

  const handleAxisFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (!selectedAxisId) {
        toast.error('Veuillez sélectionner un axe analytique');
        return;
      }

      setIsImportingAxis(true);
      setAxisImportError(null);

      try {
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        let importData;

        if (fileExtension === 'xlsx' || fileExtension === 'xls') {
          importData = await readAnalyticalAxisExcelFile(file);
        } else if (fileExtension === 'csv') {
          importData = await readAnalyticalAxisCSVFile(file);
        } else {
          throw new Error('Format de fichier non supporté. Utilisez .xlsx, .xls ou .csv');
        }

        const newValues = convertImportToAxisValues(importData, selectedAxisId);
        addAxisValues(newValues);

        setShowAxisImportModal(false);
        setSelectedAxisId('');
        toast.success(`Import réussi ! ${newValues.length} valeur(s) importée(s).`);
      } catch (error) {
        setAxisImportError(error instanceof Error ? error.message : "Erreur lors de l'import");
        toast.error(error instanceof Error ? error.message : "Erreur lors de l'import");
      } finally {
        setIsImportingAxis(false);
        if (axisFileInputRef.current) {
          axisFileInputRef.current.value = '';
        }
      }
    },
    [selectedAxisId, addAxisValues]
  );

  const handleExportAxisValues = useCallback(
    (axisId: string) => {
      const axis = analyticalAxes.find((a) => a.id === axisId);
      if (!axis) return;

      const values = getAxisValues(axisId);
      if (values.length === 0) {
        toast.error('Aucune valeur à exporter pour cet axe');
        return;
      }

      exportAxisValuesToExcel(values, axis.name);
      toast.success('Export réussi.');
    },
    [analyticalAxes, getAxisValues]
  );

  const handleDeleteAxisValue = useCallback(
    (valueId: string, valueName: string) => {
      if (window.confirm(`Êtes-vous sûr de vouloir supprimer la valeur "${valueName}" ?`)) {
        deleteAxisValue(valueId);
        toast.success('Valeur supprimée.');
      }
    },
    [deleteAxisValue]
  );

  return {
    undo,
    redo,
    canUndo,
    canRedo,
    activeTab,
    setActiveTab,
    budgets,
    templates,
    chartsOfAccounts,
    fiscalCalendars,
    analyticalAxes,
    axisValues,
    selectedBudgetId,
    setSelectedBudgetId,
    selectedVersionId,
    setSelectedVersionId,
    editingCellId,
    editingValue,
    setEditingValue,
    showNewBudgetModal,
    setShowNewBudgetModal,
    showNewLineModal,
    setShowNewLineModal,
    newLineAccount,
    setNewLineAccount,
    showAccountSelector,
    setShowAccountSelector,
    accountSearchQuery,
    setAccountSearchQuery,
    showImportModal,
    setShowImportModal,
    importError,
    setImportError,
    isImporting,
    setIsImporting,
    fileInputRef,
    showTemplateModal,
    setShowTemplateModal,
    showEditTemplateModal,
    setShowEditTemplateModal,
    editingTemplateId,
    setEditingTemplateId,
    templateName,
    setTemplateName,
    templateDescription,
    setTemplateDescription,
    templateCategory,
    setTemplateCategory,
    templateSourceBudgetId,
    setTemplateSourceBudgetId,
    compareVersion1Id,
    setCompareVersion1Id,
    compareVersion2Id,
    setCompareVersion2Id,
    showAxisImportModal,
    setShowAxisImportModal,
    selectedAxisId,
    setSelectedAxisId,
    axisImportError,
    setAxisImportError,
    isImportingAxis,
    setIsImportingAxis,
    axisFileInputRef,
    showNewAxisModal,
    setShowNewAxisModal,
    newAxisCode,
    setNewAxisCode,
    newAxisName,
    setNewAxisName,
    newAxisMandatory,
    setNewAxisMandatory,
    selectedBudget,
    selectedVersion,
    selectedChart,
    selectedCalendar,
    handleCreateBudget,
    handleSelectBudget,
    handleAddVersion,
    handleAddLine,
    handleCellEdit,
    handleCellSave,
    handleCellCancel,
    handleDeleteLine,
    handleImportFile,
    handleExportBudget,
    handleDownloadTemplate,
    handleCreateTemplate,
    handleDeleteTemplate,
    handleUseTemplate,
    handleEditTemplate,
    handleUpdateTemplate,
    handleCreateAxis,
    handleAxisFileSelect,
    handleExportAxisValues,
    handleDeleteAxisValue,
    downloadAnalyticalAxisTemplate,
    // Context methods
    deleteBudget,
    submitVersion,
    validateVersion,
    rejectVersion,
    lockBudget,
    compareVersions,
    getAxisValues
  };
};
