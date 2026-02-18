import { useReducer, useCallback, useRef, ChangeEvent } from 'react';
import { useBudget } from '../context/BudgetContext';
import { useReferentials } from '../context/ReferentialContext';
import { BudgetVersion } from '../types';
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

export type BudgetTab = 'list' | 'editor' | 'comparison' | 'workflow' | 'templates' | 'referentials';

interface BudgetState {
    activeTab: BudgetTab;
    selectedBudgetId: string | null;
    selectedVersionId: string | null;
    editingCellId: string | null;
    editingValue: string;
    showNewBudgetModal: boolean;
    showNewLineModal: boolean;
    newLineAccount: string;
    showAccountSelector: boolean;
    accountSearchQuery: string;
    showImportModal: boolean;
    importError: string | null;
    isImporting: boolean;
    showTemplateModal: boolean;
    showEditTemplateModal: boolean;
    editingTemplateId: string | null;
    templateName: string;
    templateDescription: string;
    templateCategory: string;
    templateSourceBudgetId: string;
    compareVersion1Id: string | null;
    compareVersion2Id: string | null;
    showAxisImportModal: boolean;
    selectedAxisId: string;
    axisImportError: string | null;
    isImportingAxis: boolean;
    showNewAxisModal: boolean;
    newAxisCode: string;
    newAxisName: string;
    newAxisMandatory: boolean;
}

type BudgetAction =
    | { type: 'SET_ACTIVE_TAB'; payload: BudgetTab }
    | { type: 'SET_SELECTED_BUDGET'; payload: string | null }
    | { type: 'SET_SELECTED_VERSION'; payload: string | null }
    | { type: 'SET_EDITING_CELL'; payload: { id: string | null, value: string } }
    | { type: 'SET_EDITING_VALUE'; payload: string }
    | { type: 'TOGGLE_MODAL'; payload: { modal: keyof BudgetState, value: boolean } }
    | { type: 'SET_ACCOUNT_SEARCH'; payload: string }
    | { type: 'SET_IMPORT_ERROR'; payload: string | null }
    | { type: 'SET_IS_IMPORTING'; payload: boolean }
    | { type: 'SET_TEMPLATE_FIELD'; payload: { field: string, value: any } }
    | { type: 'SET_COMPARE_VERSION'; payload: { index: 1 | 2, id: string | null } }
    | { type: 'SET_AXIS_FIELD'; payload: { field: string, value: any } }
    | { type: 'RESET_TEMPLATE_FORM' }
    | { type: 'RESET_AXIS_FORM' };

const initialState: BudgetState = {
    activeTab: 'list',
    selectedBudgetId: null,
    selectedVersionId: null,
    editingCellId: null,
    editingValue: '',
    showNewBudgetModal: false,
    showNewLineModal: false,
    newLineAccount: '',
    showAccountSelector: false,
    accountSearchQuery: '',
    showImportModal: false,
    importError: null,
    isImporting: false,
    showTemplateModal: false,
    showEditTemplateModal: false,
    editingTemplateId: null,
    templateName: '',
    templateDescription: '',
    templateCategory: '',
    templateSourceBudgetId: '',
    compareVersion1Id: null,
    compareVersion2Id: null,
    showAxisImportModal: false,
    selectedAxisId: '',
    axisImportError: null,
    isImportingAxis: false,
    showNewAxisModal: false,
    newAxisCode: '',
    newAxisName: '',
    newAxisMandatory: false,
};

function budgetReducer(state: BudgetState, action: BudgetAction): BudgetState {
    switch (action.type) {
        case 'SET_ACTIVE_TAB':
            return { ...state, activeTab: action.payload };
        case 'SET_SELECTED_BUDGET':
            return { ...state, selectedBudgetId: action.payload };
        case 'SET_SELECTED_VERSION':
            return { ...state, selectedVersionId: action.payload };
        case 'SET_EDITING_CELL':
            return { ...state, editingCellId: action.payload.id, editingValue: action.payload.value };
        case 'SET_EDITING_VALUE':
            return { ...state, editingValue: action.payload };
        case 'TOGGLE_MODAL':
            return { ...state, [action.payload.modal]: action.payload.value };
        case 'SET_ACCOUNT_SEARCH':
            return { ...state, accountSearchQuery: action.payload };
        case 'SET_IMPORT_ERROR':
            return { ...state, importError: action.payload };
        case 'SET_IS_IMPORTING':
            return { ...state, isImporting: action.payload };
        case 'SET_TEMPLATE_FIELD':
            return { ...state, [action.payload.field]: action.payload.value };
        case 'SET_COMPARE_VERSION':
            return action.payload.index === 1
                ? { ...state, compareVersion1Id: action.payload.id }
                : { ...state, compareVersion2Id: action.payload.id };
        case 'SET_AXIS_FIELD':
            return { ...state, [action.payload.field]: action.payload.value };
        case 'RESET_TEMPLATE_FORM':
            return {
                ...state,
                templateName: '',
                templateDescription: '',
                templateCategory: '',
                templateSourceBudgetId: '',
                editingTemplateId: null
            };
        case 'RESET_AXIS_FORM':
            return {
                ...state,
                newAxisCode: '',
                newAxisName: '',
                newAxisMandatory: false
            };
        default:
            return state;
    }
}

export const useBudgetLogic = () => {
    const [state, dispatch] = useReducer(budgetReducer, initialState);
    const {
        budgets, templates,
        addBudget, updateBudget, deleteBudget,
        addVersion, updateVersion, deleteVersion, setActiveVersion, duplicateVersion,
        addLine, updateLine, deleteLine, updateLineValue,
        submitVersion, validateVersion, rejectVersion,
        lockBudget, unlockBudget,
        compareVersions,
        addTemplate, deleteTemplate
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

    const fileInputRef = useRef<HTMLInputElement>(null);
    const axisFileInputRef = useRef<HTMLInputElement>(null);

    // Get selected budget and version
    const selectedBudget = state.selectedBudgetId ? (budgets.find(b => b.id === state.selectedBudgetId) || null) : null;
    const selectedVersion = selectedBudget && state.selectedVersionId
        ? (selectedBudget.versions.find(v => v.id === state.selectedVersionId) || null)
        : null;
    const selectedChart = selectedBudget
        ? (chartsOfAccounts.find(c => c.id === selectedBudget.chartOfAccountsId) || null)
        : null;
    const selectedCalendar = selectedBudget?.fiscalCalendarId
        ? (fiscalCalendars.find(c => c.id === selectedBudget.fiscalCalendarId) || null)
        : null;

    const handleCreateBudget = useCallback((name: string, fiscalYear: number, chartId: string, calendarId?: string) => {
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
        dispatch({ type: 'TOGGLE_MODAL', payload: { modal: 'showNewBudgetModal', value: false } });
    }, [addBudget]);

    const handleSelectBudget = useCallback((budgetId: string) => {
        const budget = budgets.find(b => b.id === budgetId);
        dispatch({ type: 'SET_SELECTED_BUDGET', payload: budgetId });
        if (budget) {
            const activeVersion = budget.versions.find(v => v.id === budget.activeVersionId) || budget.versions[0];
            dispatch({ type: 'SET_SELECTED_VERSION', payload: activeVersion?.id || null });
        }
        dispatch({ type: 'SET_ACTIVE_TAB', payload: 'editor' });
    }, [budgets]);

    const handleAddVersion = useCallback(() => {
        if (!state.selectedBudgetId || !selectedBudget) return;
        const newVersionNumber = selectedBudget.versions.length + 1;
        addVersion(state.selectedBudgetId, {
            budgetId: state.selectedBudgetId,
            versionNumber: newVersionNumber,
            name: `Version ${newVersionNumber}`,
            scenario: 'realistic',
            status: 'draft',
            lines: [],
            isActive: false
        });
    }, [state.selectedBudgetId, selectedBudget, addVersion]);

    const handleAddLine = useCallback((accountCode: string) => {
        if (!state.selectedBudgetId || !state.selectedVersionId) return;
        const account = selectedChart?.accounts.find(a => a.code === accountCode);
        if (!account) return;

        addLine(state.selectedBudgetId, state.selectedVersionId, {
            accountCode: account.code,
            accountLabel: account.label,
            periodValues: {},
            isLocked: false
        });
        dispatch({ type: 'TOGGLE_MODAL', payload: { modal: 'showNewLineModal', value: false } });
        dispatch({ type: 'SET_ACCOUNT_SEARCH', payload: '' });
    }, [state.selectedBudgetId, state.selectedVersionId, selectedChart, addLine]);

    const handleCellEdit = useCallback((lineId: string, periodId: string, currentValue: number) => {
        dispatch({ type: 'SET_EDITING_CELL', payload: { id: `${lineId}-${periodId}`, value: currentValue.toString() } });
    }, []);

    const handleCellSave = useCallback((lineId: string, periodId: string) => {
        if (!state.selectedBudgetId || !state.selectedVersionId) return;
        const value = parseFloat(state.editingValue) || 0;
        updateLineValue(state.selectedBudgetId, state.selectedVersionId, lineId, periodId, value);
        dispatch({ type: 'SET_EDITING_CELL', payload: { id: null, value: '' } });
    }, [state.selectedBudgetId, state.selectedVersionId, state.editingValue, updateLineValue]);

    const handleCellCancel = useCallback(() => {
        dispatch({ type: 'SET_EDITING_CELL', payload: { id: null, value: '' } });
    }, []);

    const handleDeleteLine = useCallback((lineId: string) => {
        if (!state.selectedBudgetId || !state.selectedVersionId) return;
        if (window.confirm('Êtes-vous sûr de vouloir supprimer cette ligne budgétaire ?')) {
            deleteLine(state.selectedBudgetId, state.selectedVersionId, lineId);
        }
    }, [state.selectedBudgetId, state.selectedVersionId, deleteLine]);

    const handleImportFile = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !state.selectedBudgetId || !state.selectedVersionId || !selectedBudget) return;

        dispatch({ type: 'SET_IS_IMPORTING', payload: true });
        dispatch({ type: 'SET_IMPORT_ERROR', payload: null });

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

            const version = selectedBudget.versions.find(v => v.id === state.selectedVersionId);
            if (version) {
                updateVersion(state.selectedBudgetId, state.selectedVersionId, {
                    lines: [...version.lines, ...newLines]
                });
            }

            dispatch({ type: 'TOGGLE_MODAL', payload: { modal: 'showImportModal', value: false } });
            alert(`${newLines.length} ligne(s) budgétaire(s) importée(s) avec succès !`);
        } catch (error) {
            dispatch({ type: 'SET_IMPORT_ERROR', payload: error instanceof Error ? error.message : 'Erreur lors de l\'import' });
        } finally {
            dispatch({ type: 'SET_IS_IMPORTING', payload: false });
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    }, [state.selectedBudgetId, state.selectedVersionId, selectedBudget, updateVersion]);

    const handleExportBudget = useCallback(() => {
        if (!selectedBudget || !selectedVersion || !selectedCalendar) return;

        const periods = selectedCalendar.periods.map(p => ({
            id: p.id,
            name: p.name
        }));

        exportBudgetToExcel(
            `${selectedBudget.name} - ${selectedVersion.name}`,
            selectedVersion.lines,
            periods
        );
    }, [selectedBudget, selectedVersion, selectedCalendar]);

    const handleDownloadTemplate = useCallback(() => {
        const year = selectedBudget?.fiscalYear || new Date().getFullYear();
        downloadBudgetTemplate(year);
    }, [selectedBudget]);

    const handleCreateTemplate = useCallback(() => {
        if (!state.templateName.trim()) {
            alert('Veuillez saisir un nom pour le modèle');
            return;
        }

        let accountCodes: string[] = [];
        if (state.templateSourceBudgetId) {
            const sourceBudget = budgets.find(b => b.id === state.templateSourceBudgetId);
            if (sourceBudget && sourceBudget.versions.length > 0) {
                const latestVersion = sourceBudget.versions[sourceBudget.versions.length - 1];
                accountCodes = latestVersion.lines.map(line => line.accountCode);
            }
        }

        addTemplate({
            name: state.templateName.trim(),
            description: state.templateDescription.trim() || undefined,
            category: state.templateCategory.trim() || undefined,
            accountCodes,
            isActive: true
        });

        dispatch({ type: 'RESET_TEMPLATE_FORM' });
        dispatch({ type: 'TOGGLE_MODAL', payload: { modal: 'showTemplateModal', value: false } });

        alert('Modèle créé avec succès !');
    }, [state.templateName, state.templateDescription, state.templateCategory, state.templateSourceBudgetId, budgets, addTemplate]);

    const handleDeleteTemplate = useCallback((templateId: string, templateName: string) => {
        if (window.confirm(`Êtes-vous sûr de vouloir supprimer le modèle "${templateName}" ?`)) {
            deleteTemplate(templateId);
        }
    }, [deleteTemplate]);

    const handleUseTemplate = useCallback((templateId: string) => {
        const template = templates.find(t => t.id === templateId);
        if (!template) {
            alert('Modèle non trouvé');
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
            const createdBudget = budgets.find(b => b.name === newBudgetName);
            if (createdBudget && createdBudget.versions.length > 0) {
                const version = createdBudget.versions[0];

                template.accountCodes.forEach(accountCode => {
                    addLine(createdBudget.id, version.id, {
                        accountCode,
                        periodValues: {},
                        isLocked: false
                    });
                });

                dispatch({ type: 'SET_SELECTED_BUDGET', payload: createdBudget.id });
                dispatch({ type: 'SET_SELECTED_VERSION', payload: version.id });
                dispatch({ type: 'SET_ACTIVE_TAB', payload: 'editor' });

                alert(`Budget "${newBudgetName}" créé avec ${template.accountCodes.length} comptes !`);
            }
        }, 100);
    }, [templates, chartsOfAccounts, fiscalCalendars, addBudget, budgets, addLine]);

    const handleEditTemplate = useCallback((templateId: string) => {
        const template = templates.find(t => t.id === templateId);
        if (!template) return;

        dispatch({ type: 'SET_TEMPLATE_FIELD', payload: { field: 'editingTemplateId', value: templateId } });
        dispatch({ type: 'SET_TEMPLATE_FIELD', payload: { field: 'templateName', value: template.name } });
        dispatch({ type: 'SET_TEMPLATE_FIELD', payload: { field: 'templateDescription', value: template.description || '' } });
        dispatch({ type: 'SET_TEMPLATE_FIELD', payload: { field: 'templateCategory', value: template.category || '' } });
        dispatch({ type: 'TOGGLE_MODAL', payload: { modal: 'showEditTemplateModal', value: true } });
    }, [templates]);

    const handleUpdateTemplate = useCallback(() => {
        if (!state.editingTemplateId) return;

        if (!state.templateName.trim()) {
            alert('Veuillez saisir un nom pour le modèle');
            return;
        }

        const template = templates.find(t => t.id === state.editingTemplateId);
        if (!template) return;

        deleteTemplate(state.editingTemplateId);
        addTemplate({
            name: state.templateName.trim(),
            description: state.templateDescription.trim() || undefined,
            category: state.templateCategory.trim() || undefined,
            accountCodes: template.accountCodes,
            isActive: template.isActive
        });

        dispatch({ type: 'RESET_TEMPLATE_FORM' });
        dispatch({ type: 'TOGGLE_MODAL', payload: { modal: 'showEditTemplateModal', value: false } });

        alert('Modèle modifié avec succès !');
    }, [state.editingTemplateId, state.templateName, state.templateDescription, state.templateCategory, templates, deleteTemplate, addTemplate]);

    const handleCreateAxis = useCallback(() => {
        if (!state.newAxisCode.trim() || !state.newAxisName.trim()) {
            alert('Veuillez saisir un code et un nom pour l\'axe');
            return;
        }

        if (analyticalAxes.some(axis => axis.code === state.newAxisCode.trim())) {
            alert('Un axe avec ce code existe déjà');
            return;
        }

        addAnalyticalAxis({
            code: state.newAxisCode.trim().toUpperCase(),
            name: state.newAxisName.trim(),
            isMandatory: state.newAxisMandatory,
            allowMultiple: false,
            level: analyticalAxes.length + 1,
            isActive: true
        });

        dispatch({ type: 'RESET_AXIS_FORM' });
        dispatch({ type: 'TOGGLE_MODAL', payload: { modal: 'showNewAxisModal', value: false } });

        alert('Axe analytique créé avec succès !');
    }, [state.newAxisCode, state.newAxisName, state.newAxisMandatory, analyticalAxes, addAnalyticalAxis]);

    const handleAxisFileSelect = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!state.selectedAxisId) {
            alert('Veuillez sélectionner un axe analytique');
            return;
        }

        dispatch({ type: 'SET_AXIS_FIELD', payload: { field: 'isImportingAxis', value: true } });
        dispatch({ type: 'SET_AXIS_FIELD', payload: { field: 'axisImportError', value: null } });

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

            const newValues = convertImportToAxisValues(importData, state.selectedAxisId);
            addAxisValues(newValues);

            dispatch({ type: 'TOGGLE_MODAL', payload: { modal: 'showAxisImportModal', value: false } });
            dispatch({ type: 'SET_AXIS_FIELD', payload: { field: 'selectedAxisId', value: '' } });
            alert(`Import réussi ! ${newValues.length} valeur(s) importée(s).`);

        } catch (error) {
            dispatch({ type: 'SET_AXIS_FIELD', payload: { field: 'axisImportError', value: error instanceof Error ? error.message : 'Erreur lors de l\'import' } });
        } finally {
            dispatch({ type: 'SET_AXIS_FIELD', payload: { field: 'isImportingAxis', value: false } });
            if (axisFileInputRef.current) {
                axisFileInputRef.current.value = '';
            }
        }
    }, [state.selectedAxisId, addAxisValues]);

    const handleExportAxisValues = useCallback((axisId: string) => {
        const axis = analyticalAxes.find(a => a.id === axisId);
        if (!axis) return;

        const values = getAxisValues(axisId);
        if (values.length === 0) {
            alert('Aucune valeur à exporter pour cet axe');
            return;
        }

        exportAxisValuesToExcel(values, axis.name);
    }, [analyticalAxes, getAxisValues]);

    const handleDeleteAxisValue = useCallback((valueId: string, valueName: string) => {
        if (window.confirm(`Êtes-vous sûr de vouloir supprimer la valeur "${valueName}" ?`)) {
            deleteAxisValue(valueId);
        }
    }, [deleteAxisValue]);

    return {
        state,
        dispatch,
        budgets,
        templates,
        selectedBudget,
        selectedVersion,
        selectedChart,
        selectedCalendar,
        chartsOfAccounts,
        fiscalCalendars,
        analyticalAxes,
        axisValues,
        getAxisValues,
        fileInputRef,
        axisFileInputRef,
        handlers: {
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
            submitVersion,
            validateVersion,
            rejectVersion,
            lockBudget,
            unlockBudget,
            deleteBudget,
            compareVersions
        }
    };
};
