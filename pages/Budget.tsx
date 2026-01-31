import React, { useState, useRef } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
    DollarSign, Plus, FileText, TrendingUp, GitBranch,
    Calendar, Users, Lock, Unlock, CheckCircle, XCircle,
    Clock, Edit2, Trash2, Copy, Eye, MessageSquare,
    Download, Upload, Filter, Search, Save, X, ArrowLeft, AlertCircle
} from 'lucide-react';
import { useBudget } from '../context/BudgetContext';
import { useReferentials } from '../context/ReferentialContext';
import { BudgetLine, BudgetVersion } from '../types';
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

type BudgetTab = 'list' | 'editor' | 'comparison' | 'workflow' | 'templates' | 'referentials';

export const Budget: React.FC = () => {
    const [activeTab, setActiveTab] = useState<BudgetTab>('list');
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

    // Editor state
    const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);
    const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
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
    const selectedBudget = selectedBudgetId ? budgets.find(b => b.id === selectedBudgetId) : null;
    const selectedVersion = selectedBudget && selectedVersionId
        ? selectedBudget.versions.find(v => v.id === selectedVersionId)
        : null;
    const selectedChart = selectedBudget
        ? chartsOfAccounts.find(c => c.id === selectedBudget.chartOfAccountsId)
        : null;
    const selectedCalendar = selectedBudget?.fiscalCalendarId
        ? fiscalCalendars.find(c => c.id === selectedBudget.fiscalCalendarId)
        : null;

    // Handler functions
    const handleCreateBudget = (name: string, fiscalYear: number, chartId: string, calendarId?: string) => {
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
    };

    const handleSelectBudget = (budgetId: string) => {
        const budget = budgets.find(b => b.id === budgetId);
        setSelectedBudgetId(budgetId);
        if (budget) {
            const activeVersion = budget.versions.find(v => v.id === budget.activeVersionId) || budget.versions[0];
            setSelectedVersionId(activeVersion?.id || null);
        }
        setActiveTab('editor');
    };

    const handleAddVersion = () => {
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
    };

    const handleAddLine = (accountCode: string) => {
        if (!selectedBudgetId || !selectedVersionId) return;
        const account = selectedChart?.accounts.find(a => a.code === accountCode);
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
    };

    const handleCellEdit = (lineId: string, periodId: string, currentValue: number) => {
        setEditingCellId(`${lineId}-${periodId}`);
        setEditingValue(currentValue.toString());
    };

    const handleCellSave = (lineId: string, periodId: string) => {
        if (!selectedBudgetId || !selectedVersionId) return;
        const value = parseFloat(editingValue) || 0;
        updateLineValue(selectedBudgetId, selectedVersionId, lineId, periodId, value);
        setEditingCellId(null);
        setEditingValue('');
    };

    const handleCellCancel = () => {
        setEditingCellId(null);
        setEditingValue('');
    };

    const handleDeleteLine = (lineId: string) => {
        if (!selectedBudgetId || !selectedVersionId) return;
        if (window.confirm('Êtes-vous sûr de vouloir supprimer cette ligne budgétaire ?')) {
            deleteLine(selectedBudgetId, selectedVersionId, lineId);
        }
    };

    // Import/Export handlers
    const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

            // Convert import data to budget lines
            const newLines = convertImportToBudgetLines(importData, selectedBudget.chartOfAccountsId);

            if (newLines.length === 0) {
                throw new Error('Aucune ligne budgétaire trouvée dans le fichier');
            }

            // Add all lines to the current version
            const version = selectedBudget.versions.find(v => v.id === selectedVersionId);
            if (version) {
                updateVersion(selectedBudgetId, selectedVersionId, {
                    lines: [...version.lines, ...newLines]
                });
            }

            setShowImportModal(false);
            alert(`${newLines.length} ligne(s) budgétaire(s) importée(s) avec succès !`);
        } catch (error) {
            setImportError(error instanceof Error ? error.message : 'Erreur lors de l\'import');
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleExportBudget = () => {
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
    };

    const handleDownloadTemplate = () => {
        const year = selectedBudget?.fiscalYear || new Date().getFullYear();
        downloadBudgetTemplate(year);
    };

    // Template handlers
    const handleCreateTemplate = () => {
        if (!templateName.trim()) {
            alert('Veuillez saisir un nom pour le modèle');
            return;
        }

        // Get account codes from selected source budget
        let accountCodes: string[] = [];
        if (templateSourceBudgetId) {
            const sourceBudget = budgets.find(b => b.id === templateSourceBudgetId);
            if (sourceBudget && sourceBudget.versions.length > 0) {
                const latestVersion = sourceBudget.versions[sourceBudget.versions.length - 1];
                accountCodes = latestVersion.lines.map(line => line.accountCode);
            }
        }

        addTemplate({
            name: templateName.trim(),
            description: templateDescription.trim() || undefined,
            category: templateCategory.trim() || undefined,
            accountCodes,
            isActive: true
        });

        // Reset form
        setTemplateName('');
        setTemplateDescription('');
        setTemplateCategory('');
        setTemplateSourceBudgetId('');
        setShowTemplateModal(false);

        alert('Modèle créé avec succès !');
    };

    const handleDeleteTemplate = (templateId: string, templateName: string) => {
        if (window.confirm(`Êtes-vous sûr de vouloir supprimer le modèle "${templateName}" ?`)) {
            deleteTemplate(templateId);
        }
    };

    const handleUseTemplate = (templateId: string) => {
        const template = templates.find(t => t.id === templateId);
        if (!template) {
            alert('Modèle non trouvé');
            return;
        }

        const newBudgetName = `Budget depuis ${template.name}`;
        const fiscalYear = new Date().getFullYear();

        // Créer un nouveau budget avec une version initiale
        const startDate = `${fiscalYear}-01-01`;
        const endDate = `${fiscalYear}-12-31`;

        const initialVersion: BudgetVersion = {
            id: `version-${Date.now()}`,
            budgetId: '', // Will be set by addBudget
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
            chartOfAccountsId: chartsOfAccounts[0]?.id || '', // Default chart
            fiscalYear,
            fiscalCalendarId: fiscalCalendars[0]?.id,
            versions: [initialVersion],
            startDate,
            endDate,
            owner: 'user@example.com', // TODO: Get from auth context
            isLocked: false
        });

        // Attendre un peu pour que le budget soit créé
        setTimeout(() => {
            const createdBudget = budgets.find(b => b.name === newBudgetName);
            if (createdBudget && createdBudget.versions.length > 0) {
                const version = createdBudget.versions[0];

                // Ajouter les lignes du template
                template.accountCodes.forEach(accountCode => {
                    addLine(createdBudget.id, version.id, {
                        accountCode,
                        periodValues: {},
                        isLocked: false
                    });
                });

                // Sélectionner le nouveau budget
                setSelectedBudgetId(createdBudget.id);
                setSelectedVersionId(version.id);
                setActiveTab('editor');

                alert(`Budget "${newBudgetName}" créé avec ${template.accountCodes.length} comptes !`);
            }
        }, 100);
    };

    const handleEditTemplate = (templateId: string) => {
        const template = templates.find(t => t.id === templateId);
        if (!template) return;

        setEditingTemplateId(templateId);
        setTemplateName(template.name);
        setTemplateDescription(template.description || '');
        setTemplateCategory(template.category || '');
        setShowEditTemplateModal(true);
    };

    const handleUpdateTemplate = () => {
        if (!editingTemplateId) return;

        if (!templateName.trim()) {
            alert('Veuillez saisir un nom pour le modèle');
            return;
        }

        const template = templates.find(t => t.id === editingTemplateId);
        if (!template) return;

        // Update template (we'll need to add updateTemplate to useBudget)
        deleteTemplate(editingTemplateId);
        addTemplate({
            name: templateName.trim(),
            description: templateDescription.trim() || undefined,
            category: templateCategory.trim() || undefined,
            accountCodes: template.accountCodes, // Keep existing accounts
            isActive: template.isActive
        });

        // Reset form
        setTemplateName('');
        setTemplateDescription('');
        setTemplateCategory('');
        setEditingTemplateId(null);
        setShowEditTemplateModal(false);

        alert('Modèle modifié avec succès !');
    };

    // Analytical Axis handlers
    const handleCreateAxis = () => {
        if (!newAxisCode.trim() || !newAxisName.trim()) {
            alert('Veuillez saisir un code et un nom pour l\'axe');
            return;
        }

        // Check if code already exists
        if (analyticalAxes.some(axis => axis.code === newAxisCode.trim())) {
            alert('Un axe avec ce code existe déjà');
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

        alert('Axe analytique créé avec succès !');
    };

    const handleAxisFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!selectedAxisId) {
            alert('Veuillez sélectionner un axe analytique');
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

            // Convert to axis values
            const newValues = convertImportToAxisValues(importData, selectedAxisId);

            // Add all values
            addAxisValues(newValues);

            setShowAxisImportModal(false);
            setSelectedAxisId('');
            alert(`Import réussi ! ${newValues.length} valeur(s) importée(s).`);

        } catch (error) {
            setAxisImportError(error instanceof Error ? error.message : 'Erreur lors de l\'import');
        } finally {
            setIsImportingAxis(false);
            if (axisFileInputRef.current) {
                axisFileInputRef.current.value = '';
            }
        }
    };

    const handleExportAxisValues = (axisId: string) => {
        const axis = analyticalAxes.find(a => a.id === axisId);
        if (!axis) return;

        const values = getAxisValues(axisId);
        if (values.length === 0) {
            alert('Aucune valeur à exporter pour cet axe');
            return;
        }

        exportAxisValuesToExcel(values, axis.name);
    };

    const handleDeleteAxisValue = (valueId: string, valueName: string) => {
        if (window.confirm(`Êtes-vous sûr de vouloir supprimer la valeur "${valueName}" ?`)) {
            deleteAxisValue(valueId);
        }
    };

    return (
        <div className="h-full overflow-y-auto p-4 md:p-8 custom-scrollbar">
            <div className="pb-10 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                            <DollarSign className="w-7 h-7 text-brand-600" />
                            Module Budgétaire
                        </h2>
                        <p className="text-sm text-slate-600 mt-1">
                            Gérez vos budgets, versions, scénarios et workflow de validation
                        </p>
                    </div>
                    <Button
                        className="bg-brand-600 hover:bg-brand-700"
                        onClick={() => {
                            const year = new Date().getFullYear();
                            const defaultChart = chartsOfAccounts[0];
                            if (!defaultChart) {
                                alert('Veuillez d\'abord créer un plan comptable dans les paramètres.');
                                return;
                            }
                            const budgetName = prompt('Nom du budget:', `Budget ${year}`);
                            if (budgetName) {
                                handleCreateBudget(budgetName, year, defaultChart.id, fiscalCalendars[0]?.id);
                            }
                        }}
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Nouveau budget
                    </Button>
                </div>

                {/* Tabs Navigation */}
                <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
                    {[
                        { id: 'list' as const, label: 'Mes budgets', icon: FileText },
                        { id: 'editor' as const, label: 'Éditeur', icon: Edit2 },
                        { id: 'comparison' as const, label: 'Comparaison', icon: GitBranch },
                        { id: 'workflow' as const, label: 'Workflow', icon: CheckCircle },
                        { id: 'templates' as const, label: 'Modèles', icon: Copy },
                        { id: 'referentials' as const, label: 'Référentiels', icon: Filter }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
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
                        <div className="space-y-6">
                            {/* Quick Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <Card className="border-l-4 border-l-brand-500">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-sm text-slate-600 font-bold">Total Budgets</div>
                                            <div className="text-2xl font-bold text-slate-800 mt-1">{budgets.length}</div>
                                        </div>
                                        <FileText className="w-8 h-8 text-brand-500" />
                                    </div>
                                </Card>
                                <Card className="border-l-4 border-l-green-500">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-sm text-slate-600 font-bold">Validés</div>
                                            <div className="text-2xl font-bold text-slate-800 mt-1">
                                                {budgets.filter(b => b.versions.some(v => v.status === 'validated')).length}
                                            </div>
                                        </div>
                                        <CheckCircle className="w-8 h-8 text-green-500" />
                                    </div>
                                </Card>
                                <Card className="border-l-4 border-l-yellow-500">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-sm text-slate-600 font-bold">En cours</div>
                                            <div className="text-2xl font-bold text-slate-800 mt-1">
                                                {budgets.filter(b => b.versions.some(v => v.status === 'draft' || v.status === 'submitted')).length}
                                            </div>
                                        </div>
                                        <Clock className="w-8 h-8 text-yellow-500" />
                                    </div>
                                </Card>
                                <Card className="border-l-4 border-l-purple-500">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-sm text-slate-600 font-bold">Modèles</div>
                                            <div className="text-2xl font-bold text-slate-800 mt-1">{templates.length}</div>
                                        </div>
                                        <Copy className="w-8 h-8 text-purple-500" />
                                    </div>
                                </Card>
                            </div>

                            {/* Budgets List */}
                            <Card title="Liste des budgets" icon={<FileText className="w-5 h-5 text-brand-600" />}>
                                {budgets.length === 0 ? (
                                    <div className="text-center py-12">
                                        <DollarSign className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                                        <h3 className="text-lg font-bold text-slate-800 mb-2">Aucun budget créé</h3>
                                        <p className="text-sm text-slate-600 mb-6">
                                            Créez votre premier budget pour commencer la planification financière
                                        </p>
                                        <Button
                                            className="bg-brand-600 hover:bg-brand-700"
                                            onClick={() => {
                                                const year = new Date().getFullYear();
                                                const defaultChart = chartsOfAccounts[0];
                                                if (!defaultChart) {
                                                    alert('Veuillez d\'abord créer un plan comptable dans les paramètres.');
                                                    return;
                                                }
                                                const budgetName = prompt('Nom du budget:', `Budget ${year}`);
                                                if (budgetName) {
                                                    handleCreateBudget(budgetName, year, defaultChart.id, fiscalCalendars[0]?.id);
                                                }
                                            }}
                                        >
                                            <Plus className="w-4 h-4 mr-2" />
                                            Créer un budget
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-slate-100">
                                        {budgets.map(budget => {
                                            const activeVersion = budget.versions.find(v => v.id === budget.activeVersionId);
                                            const statusColors = {
                                                draft: 'bg-gray-100 text-gray-700',
                                                submitted: 'bg-brand-100 text-brand-700',
                                                validated: 'bg-green-100 text-green-700',
                                                rejected: 'bg-red-100 text-red-700',
                                                locked: 'bg-purple-100 text-purple-700'
                                            };

                                            return (
                                                <div key={budget.id} className="p-4 hover:bg-slate-50 transition-colors">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-3">
                                                                <h3 className="font-bold text-slate-800">{budget.name}</h3>
                                                                {budget.isLocked && (
                                                                    <span title="Verrouillé">
                                                                        <Lock className="w-4 h-4 text-purple-600" />
                                                                    </span>
                                                                )}
                                                                {activeVersion && (
                                                                    <span className={`text-xs font-bold px-2 py-1 rounded ${statusColors[activeVersion.status]}`}>
                                                                        {activeVersion.status === 'draft' && 'Brouillon'}
                                                                        {activeVersion.status === 'submitted' && 'Soumis'}
                                                                        {activeVersion.status === 'validated' && 'Validé'}
                                                                        {activeVersion.status === 'rejected' && 'Rejeté'}
                                                                        {activeVersion.status === 'locked' && 'Verrouillé'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-4 mt-2 text-xs text-slate-600">
                                                                <span className="flex items-center gap-1">
                                                                    <Calendar className="w-3 h-3" />
                                                                    Exercice {budget.fiscalYear}
                                                                </span>
                                                                <span className="flex items-center gap-1">
                                                                    <GitBranch className="w-3 h-3" />
                                                                    {budget.versions.length} version(s)
                                                                </span>
                                                                <span className="flex items-center gap-1">
                                                                    <Users className="w-3 h-3" />
                                                                    {budget.owner}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="text-brand-600 border-brand-200"
                                                                onClick={() => handleSelectBudget(budget.id)}
                                                            >
                                                                <Eye className="w-4 h-4 mr-2" />
                                                                Voir
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="text-slate-600 border-slate-200"
                                                                onClick={() => handleSelectBudget(budget.id)}
                                                            >
                                                                <Edit2 className="w-4 h-4 mr-2" />
                                                                Éditer
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="text-red-600 border-red-200"
                                                                onClick={() => {
                                                                    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le budget "${budget.name}" ?`)) {
                                                                        deleteBudget(budget.id);
                                                                    }
                                                                }}
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </Card>
                        </div>
                    )}

                    {activeTab === 'editor' && (
                        <div className="space-y-4">
                            {!selectedBudgetId ? (
                                <Card title="Éditeur budgétaire" icon={<Edit2 className="w-5 h-5 text-brand-600" />}>
                                    <div className="text-center py-12 text-slate-500">
                                        <Edit2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                                        <p className="mb-4">Sélectionnez un budget dans la liste pour commencer l'édition</p>
                                        <Button
                                            onClick={() => setActiveTab('list')}
                                            className="bg-brand-600 hover:bg-brand-700"
                                        >
                                            Retour à la liste
                                        </Button>
                                    </div>
                                </Card>
                            ) : (
                                <>
                                    {/* Budget Header */}
                                    <Card>
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-4">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setSelectedBudgetId(null);
                                                        setSelectedVersionId(null);
                                                        setActiveTab('list');
                                                    }}
                                                >
                                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                                    Retour
                                                </Button>
                                                <div>
                                                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                                        {selectedBudget?.name}
                                                        {selectedBudget?.isLocked && (
                                                            <span title="Verrouillé">
                                                                <Lock className="w-4 h-4 text-purple-600" />
                                                            </span>
                                                        )}
                                                    </h3>
                                                    <div className="flex items-center gap-3 text-sm text-slate-600 mt-1">
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="w-3 h-3" />
                                                            Exercice {selectedBudget?.fiscalYear}
                                                        </span>
                                                        <span>•</span>
                                                        <span>{selectedChart?.name}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Version Selection */}
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <span className="text-sm font-bold text-slate-700">Version:</span>
                                            {selectedBudget?.versions.map(version => {
                                                const statusColors = {
                                                    draft: 'bg-gray-100 text-gray-700 border-gray-300',
                                                    submitted: 'bg-brand-100 text-brand-700 border-brand-300',
                                                    validated: 'bg-green-100 text-green-700 border-green-300',
                                                    rejected: 'bg-red-100 text-red-700 border-red-300',
                                                    locked: 'bg-purple-100 text-purple-700 border-purple-300'
                                                };
                                                return (
                                                    <button
                                                        key={version.id}
                                                        onClick={() => setSelectedVersionId(version.id)}
                                                        className={`px-3 py-1 rounded border text-sm font-bold transition-all ${
                                                            selectedVersionId === version.id
                                                                ? 'ring-2 ring-brand-400 ' + statusColors[version.status]
                                                                : statusColors[version.status]
                                                        }`}
                                                    >
                                                        {version.name}
                                                    </button>
                                                );
                                            })}
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleAddVersion}
                                                disabled={selectedBudget?.isLocked}
                                            >
                                                <Plus className="w-4 h-4 mr-1" />
                                                Nouvelle version
                                            </Button>
                                        </div>

                                        {selectedVersion && (
                                            <div className="mt-4 flex items-center gap-2">
                                                <span className="text-sm text-slate-600">
                                                    Scénario: <span className="font-bold">{selectedVersion.scenario}</span>
                                                </span>
                                                <span className="text-sm text-slate-600">•</span>
                                                <span className="text-sm text-slate-600">
                                                    {selectedVersion.lines.length} ligne(s)
                                                </span>
                                            </div>
                                        )}
                                    </Card>

                                    {/* Budget Grid */}
                                    {selectedVersion && (
                                        <Card>
                                            <div className="flex items-center justify-between mb-4">
                                                <h4 className="font-bold text-slate-800">Lignes budgétaires</h4>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={handleDownloadTemplate}
                                                        className="text-slate-600 border-slate-200"
                                                        title="Télécharger un template Excel"
                                                    >
                                                        <Download className="w-4 h-4 mr-2" />
                                                        Template
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setShowImportModal(true)}
                                                        disabled={selectedBudget?.isLocked || selectedVersion.status !== 'draft'}
                                                        className="text-brand-600 border-brand-200"
                                                    >
                                                        <Upload className="w-4 h-4 mr-2" />
                                                        Importer
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={handleExportBudget}
                                                        disabled={selectedVersion.lines.length === 0}
                                                        className="text-green-600 border-green-200"
                                                    >
                                                        <Download className="w-4 h-4 mr-2" />
                                                        Exporter
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setShowNewLineModal(true)}
                                                        disabled={selectedBudget?.isLocked || selectedVersion.status !== 'draft'}
                                                        className="text-brand-600 border-brand-200"
                                                    >
                                                        <Plus className="w-4 h-4 mr-2" />
                                                        Ajouter une ligne
                                                    </Button>
                                                </div>
                                            </div>

                                            {selectedVersion.lines.length === 0 ? (
                                                <div className="text-center py-12 text-slate-500">
                                                    <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                                                    <p>Aucune ligne budgétaire</p>
                                                    <p className="text-sm mt-2">Ajoutez des lignes pour commencer la saisie</p>
                                                </div>
                                            ) : (
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-sm">
                                                        <thead>
                                                            <tr className="border-b-2 border-slate-300">
                                                                <th className="text-left p-2 font-bold text-slate-700 bg-slate-50 sticky left-0">
                                                                    Compte
                                                                </th>
                                                                <th className="text-left p-2 font-bold text-slate-700 bg-slate-50">
                                                                    Libellé
                                                                </th>
                                                                {selectedCalendar ? (
                                                                    selectedCalendar.periods.map(period => (
                                                                        <th key={period.id} className="text-right p-2 font-bold text-slate-700 bg-slate-50">
                                                                            {period.name}
                                                                        </th>
                                                                    ))
                                                                ) : (
                                                                    <>
                                                                        <th className="text-right p-2 font-bold text-slate-700 bg-slate-50">Janv</th>
                                                                        <th className="text-right p-2 font-bold text-slate-700 bg-slate-50">Févr</th>
                                                                        <th className="text-right p-2 font-bold text-slate-700 bg-slate-50">Mars</th>
                                                                        <th className="text-right p-2 font-bold text-slate-700 bg-slate-50">Avr</th>
                                                                        <th className="text-right p-2 font-bold text-slate-700 bg-slate-50">Mai</th>
                                                                        <th className="text-right p-2 font-bold text-slate-700 bg-slate-50">Juin</th>
                                                                        <th className="text-right p-2 font-bold text-slate-700 bg-slate-50">Juil</th>
                                                                        <th className="text-right p-2 font-bold text-slate-700 bg-slate-50">Août</th>
                                                                        <th className="text-right p-2 font-bold text-slate-700 bg-slate-50">Sept</th>
                                                                        <th className="text-right p-2 font-bold text-slate-700 bg-slate-50">Oct</th>
                                                                        <th className="text-right p-2 font-bold text-slate-700 bg-slate-50">Nov</th>
                                                                        <th className="text-right p-2 font-bold text-slate-700 bg-slate-50">Déc</th>
                                                                    </>
                                                                )}
                                                                <th className="text-right p-2 font-bold text-slate-700 bg-slate-50">
                                                                    Total
                                                                </th>
                                                                <th className="text-center p-2 font-bold text-slate-700 bg-slate-50">
                                                                    Actions
                                                                </th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {selectedVersion.lines.map(line => {
                                                                const periods = selectedCalendar?.periods || [
                                                                    { id: '1', name: 'Janv' }, { id: '2', name: 'Févr' },
                                                                    { id: '3', name: 'Mars' }, { id: '4', name: 'Avr' },
                                                                    { id: '5', name: 'Mai' }, { id: '6', name: 'Juin' },
                                                                    { id: '7', name: 'Juil' }, { id: '8', name: 'Août' },
                                                                    { id: '9', name: 'Sept' }, { id: '10', name: 'Oct' },
                                                                    { id: '11', name: 'Nov' }, { id: '12', name: 'Déc' }
                                                                ];
                                                                const total = periods.reduce((sum, period) =>
                                                                    sum + (line.periodValues[period.id] || 0), 0
                                                                );

                                                                return (
                                                                    <tr
                                                                        key={line.id}
                                                                        className="border-b border-slate-100 hover:bg-slate-50"
                                                                    >
                                                                        <td className="p-2 font-mono text-xs bg-white sticky left-0">
                                                                            {line.accountCode}
                                                                        </td>
                                                                        <td className="p-2 text-xs">
                                                                            {line.accountLabel}
                                                                        </td>
                                                                        {periods.map(period => {
                                                                            const cellId = `${line.id}-${period.id}`;
                                                                            const value = line.periodValues[period.id] || 0;
                                                                            const isEditing = editingCellId === cellId;
                                                                            const isDisabled = selectedBudget?.isLocked ||
                                                                                             selectedVersion.status !== 'draft' ||
                                                                                             line.isLocked;

                                                                            return (
                                                                                <td
                                                                                    key={period.id}
                                                                                    className="p-1 text-right"
                                                                                >
                                                                                    {isEditing ? (
                                                                                        <input
                                                                                            type="text"
                                                                                            value={editingValue}
                                                                                            onChange={(e) => setEditingValue(e.target.value)}
                                                                                            onKeyDown={(e) => {
                                                                                                if (e.key === 'Enter') {
                                                                                                    handleCellSave(line.id, period.id);
                                                                                                } else if (e.key === 'Escape') {
                                                                                                    handleCellCancel();
                                                                                                }
                                                                                            }}
                                                                                            onBlur={() => handleCellSave(line.id, period.id)}
                                                                                            autoFocus
                                                                                            className="w-full px-2 py-1 text-right border border-brand-300 rounded focus:ring-2 focus:ring-brand-400"
                                                                                        />
                                                                                    ) : (
                                                                                        <button
                                                                                            onClick={() => handleCellEdit(line.id, period.id, value)}
                                                                                            disabled={isDisabled}
                                                                                            className={`w-full px-2 py-1 rounded text-right ${
                                                                                                isDisabled
                                                                                                    ? 'cursor-not-allowed text-slate-400'
                                                                                                    : 'hover:bg-brand-50 cursor-pointer'
                                                                                            } ${value !== 0 ? 'font-bold' : ''}`}
                                                                                        >
                                                                                            {value.toLocaleString('fr-FR', {
                                                                                                minimumFractionDigits: 2,
                                                                                                maximumFractionDigits: 2
                                                                                            })}
                                                                                        </button>
                                                                                    )}
                                                                                </td>
                                                                            );
                                                                        })}
                                                                        <td className="p-2 text-right font-bold text-slate-800 bg-slate-50">
                                                                            {total.toLocaleString('fr-FR', {
                                                                                minimumFractionDigits: 2,
                                                                                maximumFractionDigits: 2
                                                                            })}
                                                                        </td>
                                                                        <td className="p-2 text-center">
                                                                            <Button
                                                                                variant="outline"
                                                                                size="sm"
                                                                                onClick={() => handleDeleteLine(line.id)}
                                                                                disabled={selectedBudget?.isLocked || selectedVersion.status !== 'draft'}
                                                                                className="text-red-600 border-red-200"
                                                                            >
                                                                                <Trash2 className="w-3 h-3" />
                                                                            </Button>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </Card>
                                    )}

                                    {/* Import Modal */}
                                    {showImportModal && (
                                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                                            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
                                                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                                                    <h3 className="text-lg font-bold text-slate-800">Importer un budget</h3>
                                                    <button
                                                        onClick={() => {
                                                            setShowImportModal(false);
                                                            setImportError(null);
                                                        }}
                                                        className="text-slate-400 hover:text-slate-600"
                                                    >
                                                        <X className="w-5 h-5" />
                                                    </button>
                                                </div>
                                                <div className="p-6">
                                                    <div className="mb-4">
                                                        <p className="text-sm text-slate-600 mb-4">
                                                            Importez un fichier Excel (.xlsx, .xls) ou CSV (.csv) contenant les lignes budgétaires.
                                                        </p>
                                                        <div className="bg-brand-50 border border-brand-200 rounded-lg p-3 mb-4">
                                                            <h4 className="text-sm font-bold text-brand-900 mb-2">Format attendu :</h4>
                                                            <ul className="text-xs text-brand-800 space-y-1">
                                                                <li>• Colonne 1: Code compte (ex: 601000)</li>
                                                                <li>• Colonne 2: Libellé (ex: Achats de matières premières)</li>
                                                                <li>• Colonnes suivantes: Périodes (Jan 2025, Fév 2025, etc.)</li>
                                                            </ul>
                                                        </div>
                                                    </div>

                                                    {importError && (
                                                        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                                                            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                                            <div>
                                                                <h4 className="text-sm font-bold text-red-900">Erreur d'import</h4>
                                                                <p className="text-xs text-red-800 mt-1">{importError}</p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="space-y-3">
                                                        <Button
                                                            className="w-full bg-brand-600 hover:bg-brand-700"
                                                            onClick={() => fileInputRef.current?.click()}
                                                            disabled={isImporting}
                                                        >
                                                            <Upload className="w-4 h-4 mr-2" />
                                                            {isImporting ? 'Import en cours...' : 'Sélectionner un fichier'}
                                                        </Button>

                                                        <input
                                                            ref={fileInputRef}
                                                            type="file"
                                                            accept=".xlsx,.xls,.csv"
                                                            onChange={handleImportFile}
                                                            className="hidden"
                                                        />

                                                        <Button
                                                            variant="outline"
                                                            className="w-full"
                                                            onClick={() => {
                                                                handleDownloadTemplate();
                                                                setShowImportModal(false);
                                                            }}
                                                        >
                                                            <Download className="w-4 h-4 mr-2" />
                                                            Télécharger un template
                                                        </Button>
                                                    </div>

                                                    <p className="text-xs text-slate-500 mt-4">
                                                        Les lignes importées seront ajoutées à la version actuelle et pourront être modifiées par la suite.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* New Line Modal */}
                                    {showNewLineModal && (
                                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                                            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
                                                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                                                    <h3 className="text-lg font-bold text-slate-800">Ajouter une ligne budgétaire</h3>
                                                    <button
                                                        onClick={() => {
                                                            setShowNewLineModal(false);
                                                            setAccountSearchQuery('');
                                                        }}
                                                        className="text-slate-400 hover:text-slate-600"
                                                    >
                                                        <X className="w-5 h-5" />
                                                    </button>
                                                </div>
                                                <div className="p-4 overflow-y-auto flex-1">
                                                    <div className="mb-4">
                                                        <label className="block text-sm font-bold text-slate-700 mb-2">
                                                            Rechercher un compte
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={accountSearchQuery}
                                                            onChange={(e) => setAccountSearchQuery(e.target.value)}
                                                            placeholder="Code ou libellé..."
                                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-400"
                                                        />
                                                    </div>
                                                    <div className="space-y-1 max-h-96 overflow-y-auto">
                                                        {selectedChart?.accounts
                                                            .filter(acc =>
                                                                acc.canReceiveEntries &&
                                                                (accountSearchQuery === '' ||
                                                                    acc.code.toLowerCase().includes(accountSearchQuery.toLowerCase()) ||
                                                                    acc.label.toLowerCase().includes(accountSearchQuery.toLowerCase()))
                                                            )
                                                            .map(account => (
                                                                <button
                                                                    key={account.code}
                                                                    onClick={() => handleAddLine(account.code)}
                                                                    className="w-full text-left p-2 rounded hover:bg-brand-50 border border-transparent hover:border-brand-200 transition-colors"
                                                                >
                                                                    <div className="font-mono text-sm font-bold text-slate-800">
                                                                        {account.code}
                                                                    </div>
                                                                    <div className="text-sm text-slate-600">
                                                                        {'  '.repeat(account.level - 1)}{account.label}
                                                                    </div>
                                                                </button>
                                                            ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {activeTab === 'comparison' && (
                        <div className="space-y-4">
                            <Card title="Comparaison de versions" icon={<GitBranch className="w-5 h-5 text-brand-600" />}>
                                {/* Budget Selection */}
                                <div className="mb-6">
                                    <label className="block text-sm font-bold text-slate-700 mb-2">
                                        Sélectionner un budget
                                    </label>
                                    <select
                                        value={selectedBudgetId || ''}
                                        onChange={(e) => {
                                            setSelectedBudgetId(e.target.value || null);
                                            setCompareVersion1Id(null);
                                            setCompareVersion2Id(null);
                                        }}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-400"
                                    >
                                        <option value="">-- Choisir un budget --</option>
                                        {budgets.map(budget => (
                                            <option key={budget.id} value={budget.id}>
                                                {budget.name} (Exercice {budget.fiscalYear})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {selectedBudget && selectedBudget.versions.length >= 2 && (
                                    <>
                                        {/* Version Selection */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 mb-2">
                                                    Version 1
                                                </label>
                                                <select
                                                    value={compareVersion1Id || ''}
                                                    onChange={(e) => setCompareVersion1Id(e.target.value || null)}
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-400"
                                                >
                                                    <option value="">-- Choisir --</option>
                                                    {selectedBudget.versions.map(version => (
                                                        <option key={version.id} value={version.id}>
                                                            {version.name} ({version.scenario})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 mb-2">
                                                    Version 2
                                                </label>
                                                <select
                                                    value={compareVersion2Id || ''}
                                                    onChange={(e) => setCompareVersion2Id(e.target.value || null)}
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-400"
                                                >
                                                    <option value="">-- Choisir --</option>
                                                    {selectedBudget.versions.map(version => (
                                                        <option key={version.id} value={version.id} disabled={version.id === compareVersion1Id}>
                                                            {version.name} ({version.scenario})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        {/* Comparison Results */}
                                        {compareVersion1Id && compareVersion2Id && (() => {
                                            const comparison = compareVersions(selectedBudget.id, compareVersion1Id, compareVersion2Id);
                                            if (!comparison) return null;

                                            const totalV1 = comparison.version1.lines.reduce((sum, line) => {
                                                const lineTotal = Object.values(line.periodValues).reduce((s, v) => s + v, 0);
                                                return sum + lineTotal;
                                            }, 0);

                                            const totalV2 = comparison.version2.lines.reduce((sum, line) => {
                                                const lineTotal = Object.values(line.periodValues).reduce((s, v) => s + v, 0);
                                                return sum + lineTotal;
                                            }, 0);

                                            const variance = totalV2 - totalV1;
                                            const variancePercent = totalV1 !== 0 ? ((variance / totalV1) * 100) : 0;

                                            return (
                                                <div className="mt-6">
                                                    {/* Summary */}
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                                        <Card className="border-l-4 border-l-brand-500">
                                                            <div className="text-sm text-slate-600 font-bold">
                                                                Total {comparison.version1.name}
                                                            </div>
                                                            <div className="text-xl font-bold text-slate-800 mt-1">
                                                                {totalV1.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                                                            </div>
                                                        </Card>
                                                        <Card className="border-l-4 border-l-green-500">
                                                            <div className="text-sm text-slate-600 font-bold">
                                                                Total {comparison.version2.name}
                                                            </div>
                                                            <div className="text-xl font-bold text-slate-800 mt-1">
                                                                {totalV2.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                                                            </div>
                                                        </Card>
                                                        <Card className={`border-l-4 ${variance >= 0 ? 'border-l-green-500' : 'border-l-red-500'}`}>
                                                            <div className="text-sm text-slate-600 font-bold">
                                                                Écart
                                                            </div>
                                                            <div className={`text-xl font-bold mt-1 ${variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                {variance >= 0 ? '+' : ''}{variance.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                                                                <span className="text-sm ml-2">
                                                                    ({variancePercent >= 0 ? '+' : ''}{variancePercent.toFixed(1)}%)
                                                                </span>
                                                            </div>
                                                        </Card>
                                                    </div>

                                                    {/* Differences Table */}
                                                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                                                        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                                                            <h5 className="font-bold text-slate-800">
                                                                Différences ({comparison.differences.length})
                                                            </h5>
                                                        </div>
                                                        {comparison.differences.length === 0 ? (
                                                            <div className="text-center py-8 text-slate-500">
                                                                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                                                                <p>Les deux versions sont identiques</p>
                                                            </div>
                                                        ) : (
                                                            <div className="overflow-x-auto max-h-96 overflow-y-auto">
                                                                <table className="w-full text-sm">
                                                                    <thead className="bg-slate-50 sticky top-0">
                                                                        <tr>
                                                                            <th className="text-left p-2 font-bold text-slate-700">Compte</th>
                                                                            <th className="text-left p-2 font-bold text-slate-700">Période</th>
                                                                            <th className="text-right p-2 font-bold text-slate-700">V1</th>
                                                                            <th className="text-right p-2 font-bold text-slate-700">V2</th>
                                                                            <th className="text-right p-2 font-bold text-slate-700">Écart</th>
                                                                            <th className="text-right p-2 font-bold text-slate-700">%</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {comparison.differences.map((diff, idx) => (
                                                                            <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                                                                                <td className="p-2 font-mono text-xs">
                                                                                    {diff.accountCode}
                                                                                </td>
                                                                                <td className="p-2 text-xs">
                                                                                    {selectedCalendar?.periods.find(p => p.id === diff.periodId)?.name || diff.periodId}
                                                                                </td>
                                                                                <td className="p-2 text-right">
                                                                                    {diff.value1.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                                                                                </td>
                                                                                <td className="p-2 text-right">
                                                                                    {diff.value2.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                                                                                </td>
                                                                                <td className={`p-2 text-right font-bold ${
                                                                                    diff.variance >= 0 ? 'text-green-600' : 'text-red-600'
                                                                                }`}>
                                                                                    {diff.variance >= 0 ? '+' : ''}{diff.variance.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                                                                                </td>
                                                                                <td className={`p-2 text-right font-bold ${
                                                                                    diff.variancePercent >= 0 ? 'text-green-600' : 'text-red-600'
                                                                                }`}>
                                                                                    {diff.variancePercent >= 0 ? '+' : ''}{diff.variancePercent.toFixed(1)}%
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </>
                                )}

                                {selectedBudget && selectedBudget.versions.length < 2 && (
                                    <div className="text-center py-8 text-slate-500">
                                        <GitBranch className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                        <p>Ce budget doit avoir au moins 2 versions pour effectuer une comparaison</p>
                                    </div>
                                )}

                                {!selectedBudget && (
                                    <div className="text-center py-8 text-slate-500">
                                        <GitBranch className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                        <p>Sélectionnez un budget pour comparer ses versions</p>
                                    </div>
                                )}
                            </Card>
                        </div>
                    )}

                    {activeTab === 'workflow' && (
                        <div className="space-y-4">
                            {/* Pending Submissions */}
                            <Card title="Soumissions en attente" icon={<Clock className="w-5 h-5 text-yellow-600" />}>
                                {(() => {
                                    const pendingSubmissions = budgets.flatMap(budget =>
                                        budget.versions
                                            .filter(v => v.status === 'submitted')
                                            .map(v => ({ budget, version: v }))
                                    );

                                    if (pendingSubmissions.length === 0) {
                                        return (
                                            <div className="text-center py-8 text-slate-500">
                                                <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                                <p>Aucune soumission en attente</p>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="space-y-3">
                                            {pendingSubmissions.map(({ budget, version }) => (
                                                <div
                                                    key={`${budget.id}-${version.id}`}
                                                    className="border border-slate-200 rounded-lg p-4 hover:border-brand-300 transition-colors"
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-3 mb-2">
                                                                <h4 className="font-bold text-slate-800">{budget.name}</h4>
                                                                <span className="text-xs font-bold px-2 py-1 rounded bg-brand-100 text-brand-700">
                                                                    {version.name}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-4 text-xs text-slate-600">
                                                                <span className="flex items-center gap-1">
                                                                    <Calendar className="w-3 h-3" />
                                                                    Exercice {budget.fiscalYear}
                                                                </span>
                                                                <span className="flex items-center gap-1">
                                                                    <Users className="w-3 h-3" />
                                                                    Soumis par {version.submittedBy || 'Inconnu'}
                                                                </span>
                                                                {version.submittedAt && (
                                                                    <span className="flex items-center gap-1">
                                                                        <Clock className="w-3 h-3" />
                                                                        {new Date(version.submittedAt).toLocaleDateString('fr-FR')}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="text-green-600 border-green-200"
                                                                onClick={() => {
                                                                    if (window.confirm(`Valider ${version.name} du budget "${budget.name}" ?`)) {
                                                                        validateVersion(budget.id, version.id, 'Current User');
                                                                    }
                                                                }}
                                                            >
                                                                <CheckCircle className="w-4 h-4 mr-2" />
                                                                Valider
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="text-red-600 border-red-200"
                                                                onClick={() => {
                                                                    const reason = prompt(`Motif de rejet pour ${version.name} du budget "${budget.name}" :`);
                                                                    if (reason) {
                                                                        rejectVersion(budget.id, version.id, 'Current User', reason);
                                                                    }
                                                                }}
                                                            >
                                                                <XCircle className="w-4 h-4 mr-2" />
                                                                Rejeter
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })()}
                            </Card>

                            {/* Draft Versions */}
                            <Card title="Brouillons à soumettre" icon={<FileText className="w-5 h-5 text-gray-600" />}>
                                {(() => {
                                    const draftVersions = budgets.flatMap(budget =>
                                        budget.versions
                                            .filter(v => v.status === 'draft')
                                            .map(v => ({ budget, version: v }))
                                    );

                                    if (draftVersions.length === 0) {
                                        return (
                                            <div className="text-center py-8 text-slate-500">
                                                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                                <p>Aucun brouillon</p>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="space-y-3">
                                            {draftVersions.map(({ budget, version }) => (
                                                <div
                                                    key={`${budget.id}-${version.id}`}
                                                    className="border border-slate-200 rounded-lg p-4 hover:border-brand-300 transition-colors"
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-3 mb-2">
                                                                <h4 className="font-bold text-slate-800">{budget.name}</h4>
                                                                <span className="text-xs font-bold px-2 py-1 rounded bg-gray-100 text-gray-700">
                                                                    {version.name}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-4 text-xs text-slate-600">
                                                                <span className="flex items-center gap-1">
                                                                    <Calendar className="w-3 h-3" />
                                                                    Exercice {budget.fiscalYear}
                                                                </span>
                                                                <span className="flex items-center gap-1">
                                                                    <FileText className="w-3 h-3" />
                                                                    {version.lines.length} ligne(s)
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="text-brand-600 border-brand-200"
                                                                onClick={() => handleSelectBudget(budget.id)}
                                                            >
                                                                <Edit2 className="w-4 h-4 mr-2" />
                                                                Éditer
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="text-brand-600 border-brand-200"
                                                                onClick={() => {
                                                                    if (version.lines.length === 0) {
                                                                        alert('Impossible de soumettre un budget vide.');
                                                                        return;
                                                                    }
                                                                    if (window.confirm(`Soumettre ${version.name} du budget "${budget.name}" pour validation ?`)) {
                                                                        submitVersion(budget.id, version.id, 'Current User');
                                                                    }
                                                                }}
                                                            >
                                                                <Upload className="w-4 h-4 mr-2" />
                                                                Soumettre
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })()}
                            </Card>

                            {/* Validated Versions */}
                            <Card title="Versions validées" icon={<CheckCircle className="w-5 h-5 text-green-600" />}>
                                {(() => {
                                    const validatedVersions = budgets.flatMap(budget =>
                                        budget.versions
                                            .filter(v => v.status === 'validated')
                                            .map(v => ({ budget, version: v }))
                                    );

                                    if (validatedVersions.length === 0) {
                                        return (
                                            <div className="text-center py-8 text-slate-500">
                                                <CheckCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                                <p>Aucune version validée</p>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="space-y-3">
                                            {validatedVersions.map(({ budget, version }) => (
                                                <div
                                                    key={`${budget.id}-${version.id}`}
                                                    className="border border-green-200 rounded-lg p-4 bg-green-50"
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-3 mb-2">
                                                                <h4 className="font-bold text-slate-800">{budget.name}</h4>
                                                                <span className="text-xs font-bold px-2 py-1 rounded bg-green-100 text-green-700">
                                                                    {version.name}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-4 text-xs text-slate-600">
                                                                <span className="flex items-center gap-1">
                                                                    <Calendar className="w-3 h-3" />
                                                                    Exercice {budget.fiscalYear}
                                                                </span>
                                                                <span className="flex items-center gap-1">
                                                                    <Users className="w-3 h-3" />
                                                                    Validé par {version.validatedBy || 'Inconnu'}
                                                                </span>
                                                                {version.validatedAt && (
                                                                    <span className="flex items-center gap-1">
                                                                        <CheckCircle className="w-3 h-3" />
                                                                        {new Date(version.validatedAt).toLocaleDateString('fr-FR')}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="text-brand-600 border-brand-200"
                                                                onClick={() => handleSelectBudget(budget.id)}
                                                            >
                                                                <Eye className="w-4 h-4 mr-2" />
                                                                Voir
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="text-purple-600 border-purple-200"
                                                                onClick={() => {
                                                                    if (window.confirm(`Verrouiller le budget "${budget.name}" ?`)) {
                                                                        lockBudget(budget.id);
                                                                    }
                                                                }}
                                                                disabled={budget.isLocked}
                                                            >
                                                                <Lock className="w-4 h-4 mr-2" />
                                                                {budget.isLocked ? 'Verrouillé' : 'Verrouiller'}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })()}
                            </Card>

                            {/* Rejected Versions */}
                            <Card title="Versions rejetées" icon={<XCircle className="w-5 h-5 text-red-600" />}>
                                {(() => {
                                    const rejectedVersions = budgets.flatMap(budget =>
                                        budget.versions
                                            .filter(v => v.status === 'rejected')
                                            .map(v => ({ budget, version: v }))
                                    );

                                    if (rejectedVersions.length === 0) {
                                        return (
                                            <div className="text-center py-8 text-slate-500">
                                                <XCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                                <p>Aucune version rejetée</p>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="space-y-3">
                                            {rejectedVersions.map(({ budget, version }) => (
                                                <div
                                                    key={`${budget.id}-${version.id}`}
                                                    className="border border-red-200 rounded-lg p-4 bg-red-50"
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-3 mb-2">
                                                                <h4 className="font-bold text-slate-800">{budget.name}</h4>
                                                                <span className="text-xs font-bold px-2 py-1 rounded bg-red-100 text-red-700">
                                                                    {version.name}
                                                                </span>
                                                            </div>
                                                            {version.rejectionReason && (
                                                                <div className="mb-2 text-sm text-red-700 bg-red-100 px-3 py-2 rounded">
                                                                    <span className="font-bold">Motif:</span> {version.rejectionReason}
                                                                </div>
                                                            )}
                                                            <div className="flex items-center gap-4 text-xs text-slate-600">
                                                                <span className="flex items-center gap-1">
                                                                    <Calendar className="w-3 h-3" />
                                                                    Exercice {budget.fiscalYear}
                                                                </span>
                                                                <span className="flex items-center gap-1">
                                                                    <Users className="w-3 h-3" />
                                                                    Rejeté par {version.validatedBy || 'Inconnu'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="text-brand-600 border-brand-200"
                                                                onClick={() => handleSelectBudget(budget.id)}
                                                            >
                                                                <Edit2 className="w-4 h-4 mr-2" />
                                                                Modifier
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })()}
                            </Card>
                        </div>
                    )}

                    {activeTab === 'templates' && (
                        <Card title="Modèles budgétaires" icon={<Copy className="w-5 h-5 text-brand-600" />}>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-slate-600">
                                        Créez des modèles réutilisables pour accélérer la création de budgets
                                    </p>
                                    <Button
                                        variant="outline"
                                        className="text-brand-600 border-brand-200"
                                        onClick={() => setShowTemplateModal(true)}
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Nouveau modèle
                                    </Button>
                                </div>

                                {templates.length === 0 ? (
                                    <div className="text-center py-12">
                                        <Copy className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                                        <h3 className="text-lg font-bold text-slate-800 mb-2">Aucun modèle créé</h3>
                                        <p className="text-sm text-slate-600">
                                            Les modèles permettent de standardiser vos processus budgétaires
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {templates.map(template => (
                                            <div key={template.id} className="border border-slate-200 rounded-lg p-4 hover:border-brand-300 transition-colors">
                                                <div className="flex items-start justify-between mb-3">
                                                    <h4 className="font-bold text-slate-800">{template.name}</h4>
                                                    <Copy className="w-4 h-4 text-brand-600" />
                                                </div>
                                                {template.description && (
                                                    <p className="text-sm text-slate-600 mb-3">{template.description}</p>
                                                )}
                                                <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                                                    <span>{template.accountCodes.length} comptes</span>
                                                    {template.category && (
                                                        <>
                                                            <span>•</span>
                                                            <span>{template.category}</span>
                                                        </>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="flex-1 text-brand-600 border-brand-200"
                                                        onClick={() => handleUseTemplate(template.id)}
                                                    >
                                                        Utiliser ce modèle
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-brand-600 border-brand-200"
                                                        onClick={() => handleEditTemplate(template.id)}
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-red-600 border-red-200"
                                                        onClick={() => handleDeleteTemplate(template.id, template.name)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </Card>
                    )}

                    {/* Referentials Tab */}
                    {activeTab === 'referentials' && (
                        <Card title="Axes analytiques" icon={<Filter className="w-5 h-5 text-brand-600" />}>
                            <div className="space-y-6">
                                {/* Header Actions */}
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-slate-600">
                                        Gérez les axes analytiques et importez leurs valeurs en masse depuis Excel/CSV
                                    </p>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={downloadAnalyticalAxisTemplate}
                                            className="text-slate-600"
                                        >
                                            <Download className="w-4 h-4 mr-2" />
                                            Template
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="bg-brand-600 hover:bg-brand-700"
                                            onClick={() => setShowNewAxisModal(true)}
                                        >
                                            <Plus className="w-4 h-4 mr-2" />
                                            Nouvel axe
                                        </Button>
                                    </div>
                                </div>

                                {/* Analytical Axes List */}
                                <div className="space-y-4">
                                    {analyticalAxes.length === 0 ? (
                                        <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                                            <Filter className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                            <p className="text-slate-600 font-medium">Aucun axe analytique</p>
                                            <p className="text-sm text-slate-500 mt-1">
                                                Créez votre premier axe pour commencer à ventiler vos budgets
                                            </p>
                                            <Button
                                                size="sm"
                                                className="mt-4 bg-brand-600 hover:bg-brand-700"
                                                onClick={() => setShowNewAxisModal(true)}
                                            >
                                                <Plus className="w-4 h-4 mr-2" />
                                                Créer un axe
                                            </Button>
                                        </div>
                                    ) : (
                                        analyticalAxes.map(axis => {
                                            const values = getAxisValues(axis.id);
                                            return (
                                                <div key={axis.id} className="border border-slate-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="font-bold text-slate-800">{axis.name}</h4>
                                                                <span className="text-xs px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 font-mono">
                                                                    {axis.code}
                                                                </span>
                                                                {axis.isMandatory && (
                                                                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                                                                        Obligatoire
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-sm text-slate-600 mt-1">
                                                                {values.length} valeur(s) configurée(s)
                                                            </p>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setSelectedAxisId(axis.id);
                                                                    setShowAxisImportModal(true);
                                                                }}
                                                                className="text-brand-600 border-brand-200"
                                                            >
                                                                <Upload className="w-4 h-4 mr-1" />
                                                                Importer
                                                            </Button>
                                                            {values.length > 0 && (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleExportAxisValues(axis.id)}
                                                                    className="text-green-600 border-green-200"
                                                                >
                                                                    <Download className="w-4 h-4 mr-1" />
                                                                    Exporter
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Values List */}
                                                    {values.length > 0 && (
                                                        <div className="mt-3 border-t border-slate-200 pt-3">
                                                            <div className="text-xs font-bold text-slate-500 mb-2 uppercase">Valeurs ({values.length})</div>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                                                                {values.slice(0, 20).map(value => (
                                                                    <div key={value.id} className="flex items-start justify-between text-sm bg-slate-50 px-2 py-1.5 rounded border border-slate-200">
                                                                        <div className="flex-1 min-w-0">
                                                                            {(value.category || value.subCategory) && (
                                                                                <div className="text-xs text-slate-400 mb-0.5">
                                                                                    {value.category && <span>{value.category}</span>}
                                                                                    {value.category && value.subCategory && <span className="mx-1">›</span>}
                                                                                    {value.subCategory && <span>{value.subCategory}</span>}
                                                                                </div>
                                                                            )}
                                                                            <div>
                                                                                <span className="font-mono text-xs text-slate-500 mr-2">{value.code}</span>
                                                                                <span className="text-slate-800 truncate">{value.label}</span>
                                                                            </div>
                                                                        </div>
                                                                        <button
                                                                            onClick={() => handleDeleteAxisValue(value.id, value.label)}
                                                                            className="text-red-400 hover:text-red-600 ml-2 flex-shrink-0"
                                                                        >
                                                                            <X className="w-3 h-3" />
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                                {values.length > 20 && (
                                                                    <div className="text-xs text-slate-500 italic px-2 py-1">
                                                                        ... et {values.length - 20} autre(s)
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* New Axis Modal */}
                    {showNewAxisModal && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                                    <h3 className="text-lg font-bold text-slate-800">Créer un axe analytique</h3>
                                    <button
                                        onClick={() => {
                                            setShowNewAxisModal(false);
                                            setNewAxisCode('');
                                            setNewAxisName('');
                                            setNewAxisMandatory(false);
                                        }}
                                        className="text-slate-400 hover:text-slate-600"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="p-6">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                                Code *
                                            </label>
                                            <input
                                                type="text"
                                                value={newAxisCode}
                                                onChange={(e) => setNewAxisCode(e.target.value.toUpperCase())}
                                                placeholder="Ex: CC, PRJ, BU"
                                                maxLength={10}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-400 font-mono"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                                Nom *
                                            </label>
                                            <input
                                                type="text"
                                                value={newAxisName}
                                                onChange={(e) => setNewAxisName(e.target.value)}
                                                placeholder="Ex: Centre de coûts, Projet, Business Unit"
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-400"
                                            />
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id="axis-mandatory"
                                                checked={newAxisMandatory}
                                                onChange={(e) => setNewAxisMandatory(e.target.checked)}
                                                className="w-4 h-4 text-brand-600 border-slate-300 rounded focus:ring-brand-500"
                                            />
                                            <label htmlFor="axis-mandatory" className="text-sm text-slate-700">
                                                Axe obligatoire sur les lignes budgétaires
                                            </label>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 mt-6">
                                        <Button
                                            className="flex-1 bg-brand-600 hover:bg-brand-700"
                                            onClick={handleCreateAxis}
                                        >
                                            <Plus className="w-4 h-4 mr-2" />
                                            Créer
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="flex-1"
                                            onClick={() => {
                                                setShowNewAxisModal(false);
                                                setNewAxisCode('');
                                                setNewAxisName('');
                                                setNewAxisMandatory(false);
                                            }}
                                        >
                                            Annuler
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Axis Import Modal */}
                    {showAxisImportModal && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                                    <h3 className="text-lg font-bold text-slate-800">Importer des valeurs d'axe</h3>
                                    <button
                                        onClick={() => {
                                            setShowAxisImportModal(false);
                                            setSelectedAxisId('');
                                            setAxisImportError(null);
                                        }}
                                        className="text-slate-400 hover:text-slate-600"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="p-6">
                                    <div className="space-y-4">
                                        <p className="text-sm text-slate-600">
                                            Importez vos valeurs d'axe depuis un fichier Excel (.xlsx) ou CSV
                                        </p>

                                        <div className="bg-brand-50 border border-brand-200 rounded-lg p-3">
                                            <p className="text-xs text-brand-800 font-bold mb-2">Format attendu :</p>
                                            <ul className="text-xs text-brand-700 space-y-1">
                                                <li>• Colonne "Catégorie" : Catégorie (niveau 1)</li>
                                                <li>• Colonne "Sous-catégorie" : Sous-catégorie (niveau 2)</li>
                                                <li>• Colonne "Code" : Code de la valeur (requis)</li>
                                                <li>• Colonne "Libellé" : Nom de la valeur (requis)</li>
                                                <li>• Colonnes optionnelles : Code Parent, Responsable, Email Responsable</li>
                                            </ul>
                                            <p className="text-xs text-brand-600 mt-2 italic">
                                                💡 Structure hiérarchique : Catégorie → Sous-catégorie → Code → Libellé
                                            </p>
                                        </div>

                                        {axisImportError && (
                                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                                <p className="text-sm text-red-800">
                                                    <AlertCircle className="w-4 h-4 inline mr-2" />
                                                    {axisImportError}
                                                </p>
                                            </div>
                                        )}

                                        <input
                                            ref={axisFileInputRef}
                                            type="file"
                                            accept=".xlsx,.xls,.csv"
                                            onChange={handleAxisFileSelect}
                                            className="hidden"
                                        />

                                        <Button
                                            className="w-full bg-brand-600 hover:bg-brand-700"
                                            onClick={() => axisFileInputRef.current?.click()}
                                            disabled={isImportingAxis}
                                        >
                                            {isImportingAxis ? (
                                                <>
                                                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                                                    Import en cours...
                                                </>
                                            ) : (
                                                <>
                                                    <Upload className="w-4 h-4 mr-2" />
                                                    Sélectionner un fichier
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Template Creation Modal */}
                    {showTemplateModal && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
                                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                                    <h3 className="text-lg font-bold text-slate-800">Créer un modèle budgétaire</h3>
                                    <button
                                        onClick={() => {
                                            setShowTemplateModal(false);
                                            setTemplateName('');
                                            setTemplateDescription('');
                                            setTemplateCategory('');
                                        }}
                                        className="text-slate-400 hover:text-slate-600"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="p-6">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                                Nom du modèle *
                                            </label>
                                            <input
                                                type="text"
                                                value={templateName}
                                                onChange={(e) => setTemplateName(e.target.value)}
                                                placeholder="Ex: Budget Marketing, Budget RH"
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-400"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                                Description
                                            </label>
                                            <textarea
                                                value={templateDescription}
                                                onChange={(e) => setTemplateDescription(e.target.value)}
                                                placeholder="Décrivez l'utilité de ce modèle..."
                                                rows={3}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-400"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                                Catégorie
                                            </label>
                                            <input
                                                type="text"
                                                value={templateCategory}
                                                onChange={(e) => setTemplateCategory(e.target.value)}
                                                placeholder="Ex: Département, Projet, Activité"
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-400"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                                Budget source
                                            </label>
                                            <select
                                                value={templateSourceBudgetId}
                                                onChange={(e) => setTemplateSourceBudgetId(e.target.value)}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-400"
                                            >
                                                <option value="">-- Modèle vide --</option>
                                                {budgets.map(budget => {
                                                    const latestVersion = budget.versions[budget.versions.length - 1];
                                                    const lineCount = latestVersion ? latestVersion.lines.length : 0;
                                                    return (
                                                        <option key={budget.id} value={budget.id}>
                                                            {budget.name} ({lineCount} comptes)
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                        </div>

                                        {templateSourceBudgetId && (() => {
                                            const sourceBudget = budgets.find(b => b.id === templateSourceBudgetId);
                                            const latestVersion = sourceBudget?.versions[sourceBudget.versions.length - 1];
                                            const lineCount = latestVersion?.lines.length || 0;
                                            return lineCount > 0 && (
                                                <div className="bg-brand-50 border border-brand-200 rounded-lg p-3">
                                                    <p className="text-sm text-brand-800">
                                                        ℹ️ Ce modèle inclura les {lineCount} comptes du budget sélectionné
                                                    </p>
                                                </div>
                                            );
                                        })()}

                                        {!templateSourceBudgetId && (
                                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                                <p className="text-sm text-yellow-800">
                                                    ⚠️ Aucun budget sélectionné. Le modèle sera créé vide.
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-3 mt-6">
                                        <Button
                                            className="flex-1 bg-brand-600 hover:bg-brand-700"
                                            onClick={handleCreateTemplate}
                                        >
                                            <Plus className="w-4 h-4 mr-2" />
                                            Créer le modèle
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="flex-1"
                                            onClick={() => {
                                                setShowTemplateModal(false);
                                                setTemplateName('');
                                                setTemplateDescription('');
                                                setTemplateCategory('');
                                            }}
                                        >
                                            Annuler
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Template Edit Modal */}
                    {showEditTemplateModal && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
                                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                                    <h3 className="text-lg font-bold text-slate-800">Modifier le modèle budgétaire</h3>
                                    <button
                                        onClick={() => {
                                            setShowEditTemplateModal(false);
                                            setEditingTemplateId(null);
                                            setTemplateName('');
                                            setTemplateDescription('');
                                            setTemplateCategory('');
                                        }}
                                        className="text-slate-400 hover:text-slate-600"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="p-6">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                                Nom du modèle *
                                            </label>
                                            <input
                                                type="text"
                                                value={templateName}
                                                onChange={(e) => setTemplateName(e.target.value)}
                                                placeholder="Ex: Budget Marketing, Budget RH"
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-400"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                                Description
                                            </label>
                                            <textarea
                                                value={templateDescription}
                                                onChange={(e) => setTemplateDescription(e.target.value)}
                                                placeholder="Décrivez l'utilité de ce modèle..."
                                                rows={3}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-400"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                                Catégorie
                                            </label>
                                            <input
                                                type="text"
                                                value={templateCategory}
                                                onChange={(e) => setTemplateCategory(e.target.value)}
                                                placeholder="Ex: Département, Projet, Activité"
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-400"
                                            />
                                        </div>

                                        {editingTemplateId && (() => {
                                            const template = templates.find(t => t.id === editingTemplateId);
                                            return template && (
                                                <div className="bg-brand-50 border border-brand-200 rounded-lg p-3">
                                                    <p className="text-sm text-brand-800">
                                                        ℹ️ Ce modèle contient {template.accountCodes.length} comptes
                                                    </p>
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    <div className="flex items-center gap-3 mt-6">
                                        <Button
                                            className="flex-1 bg-brand-600 hover:bg-brand-700"
                                            onClick={handleUpdateTemplate}
                                        >
                                            <Save className="w-4 h-4 mr-2" />
                                            Enregistrer
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="flex-1"
                                            onClick={() => {
                                                setShowEditTemplateModal(false);
                                                setEditingTemplateId(null);
                                                setTemplateName('');
                                                setTemplateDescription('');
                                                setTemplateCategory('');
                                            }}
                                        >
                                            Annuler
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
