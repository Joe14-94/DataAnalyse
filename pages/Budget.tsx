import React from 'react';
import {
  DollarSign,
  Plus,
  FileText,
  TrendingUp,
  GitBranch,
  Calendar,
  Users,
  CheckCircle,
  Copy,
  Filter,
  Edit2,
  Undo2,
  Redo2
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useBudgetLogic, BudgetTab } from '../hooks/useBudgetLogic';
import { BudgetList } from '../components/budget/BudgetList';
import { BudgetEditor } from '../components/budget/BudgetEditor';
import { BudgetComparison } from '../components/budget/BudgetComparison';
import { BudgetWorkflow } from '../components/budget/BudgetWorkflow';
import { BudgetTemplates } from '../components/budget/BudgetTemplates';
import { BudgetReferentials } from '../components/budget/BudgetReferentials';

export const Budget: React.FC = () => {
  const logic = useBudgetLogic();
  const {
    undo,
    redo,
    canUndo,
    canRedo,
    activeTab,
    setActiveTab,
    budgets,
    templates,
    handleCreateBudget,
    handleSelectBudget,
    chartsOfAccounts,
    fiscalCalendars
  } = logic;

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
          <div className="flex items-center gap-2 mr-4 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
            <button
              onClick={undo}
              disabled={!canUndo}
              className="p-2 text-slate-500 hover:text-brand-600 disabled:opacity-30 transition-all"
              title="Annuler (Ctrl+Z)"
            >
              <Undo2 className="w-5 h-5" />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              className="p-2 text-slate-500 hover:text-brand-600 disabled:opacity-30 transition-all"
              title="Rétablir (Ctrl+Y)"
            >
              <Redo2 className="w-5 h-5" />
            </button>
          </div>
          <Button
            className="bg-brand-600 hover:bg-brand-700"
            onClick={() => {
              const year = new Date().getFullYear();
              const defaultChart = chartsOfAccounts[0];
              if (!defaultChart) {
                alert("Veuillez d'abord créer un plan comptable dans les paramètres.");
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
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as BudgetTab)}
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
            <BudgetList
              budgets={budgets}
              templates={templates}
              onSelectBudget={handleSelectBudget}
              onCreateBudget={handleCreateBudget}
              chartsOfAccounts={chartsOfAccounts}
              fiscalCalendars={fiscalCalendars}
              onDeleteBudget={logic.deleteBudget}
            />
          )}

          {activeTab === 'editor' && (
            <BudgetEditor
              selectedBudget={logic.selectedBudget}
              selectedVersion={logic.selectedVersion}
              selectedChart={logic.selectedChart}
              selectedCalendar={logic.selectedCalendar}
              editingCellId={logic.editingCellId}
              editingValue={logic.editingValue}
              onSetEditingValue={logic.setEditingValue}
              onBackToList={() => setActiveTab('list')}
              onSelectVersion={logic.setSelectedVersionId}
              onAddVersion={logic.handleAddVersion}
              onDownloadTemplate={logic.handleDownloadTemplate}
              onShowImportModal={() => logic.setShowImportModal(true)}
              onExportBudget={logic.handleExportBudget}
              onShowNewLineModal={() => logic.setShowNewLineModal(true)}
              onCellEdit={logic.handleCellEdit}
              onCellSave={logic.handleCellSave}
              onCellCancel={logic.handleCellCancel}
              onDeleteLine={logic.handleDeleteLine}
              showImportModal={logic.showImportModal}
              onCloseImportModal={() => logic.setShowImportModal(false)}
              isImporting={logic.isImporting}
              importError={logic.importError}
              onImportFile={logic.handleImportFile}
              fileInputRef={logic.fileInputRef}
              showNewLineModal={logic.showNewLineModal}
              onCloseNewLineModal={() => logic.setShowNewLineModal(false)}
              accountSearchQuery={logic.accountSearchQuery}
              onSetAccountSearchQuery={logic.setAccountSearchQuery}
              onAddLine={logic.handleAddLine}
            />
          )}

          {activeTab === 'comparison' && (
            <BudgetComparison
              selectedBudgetId={logic.selectedBudgetId}
              onSelectBudget={logic.setSelectedBudgetId}
              budgets={budgets}
              compareVersion1Id={logic.compareVersion1Id}
              onSelectVersion1={logic.setCompareVersion1Id}
              compareVersion2Id={logic.compareVersion2Id}
              onSelectVersion2={logic.setCompareVersion2Id}
              onCompareVersions={logic.compareVersions}
              selectedCalendar={logic.selectedCalendar}
            />
          )}

          {activeTab === 'workflow' && (
            <BudgetWorkflow
              budgets={budgets}
              onValidateVersion={logic.validateVersion}
              onRejectVersion={logic.rejectVersion}
              onSubmitVersion={logic.submitVersion}
              onLockBudget={logic.lockBudget}
              onSelectBudget={handleSelectBudget}
            />
          )}

          {activeTab === 'templates' && (
            <BudgetTemplates
              templates={templates}
              budgets={budgets}
              onShowTemplateModal={() => logic.setShowTemplateModal(true)}
              showTemplateModal={logic.showTemplateModal}
              onCloseTemplateModal={() => logic.setShowTemplateModal(false)}
              templateName={logic.templateName}
              onSetTemplateName={logic.setTemplateName}
              templateDescription={logic.templateDescription}
              onSetTemplateDescription={logic.setTemplateDescription}
              templateCategory={logic.templateCategory}
              onSetTemplateCategory={logic.setTemplateCategory}
              templateSourceBudgetId={logic.templateSourceBudgetId}
              onSetTemplateSourceBudgetId={logic.setTemplateSourceBudgetId}
              onCreateTemplate={logic.handleCreateTemplate}
              onDeleteTemplate={logic.handleDeleteTemplate}
              onUseTemplate={logic.handleUseTemplate}
              onEditTemplate={logic.handleEditTemplate}
              showEditTemplateModal={logic.showEditTemplateModal}
              onCloseEditTemplateModal={() => logic.setShowEditTemplateModal(false)}
              onUpdateTemplate={logic.handleUpdateTemplate}
              editingTemplateId={logic.editingTemplateId}
            />
          )}

          {activeTab === 'referentials' && (
            <BudgetReferentials
              analyticalAxes={logic.analyticalAxes}
              getAxisValues={logic.getAxisValues}
              onDownloadTemplate={logic.downloadAnalyticalAxisTemplate}
              onShowNewAxisModal={() => logic.setShowNewAxisModal(true)}
              showNewAxisModal={logic.showNewAxisModal}
              onCloseNewAxisModal={() => logic.setShowNewAxisModal(false)}
              newAxisCode={logic.newAxisCode}
              onSetNewAxisCode={logic.setNewAxisCode}
              newAxisName={logic.newAxisName}
              onSetNewAxisName={logic.setNewAxisName}
              newAxisMandatory={logic.newAxisMandatory}
              onSetNewAxisMandatory={logic.setNewAxisMandatory}
              onCreateAxis={logic.handleCreateAxis}
              onShowAxisImportModal={(axisId) => {
                logic.setSelectedAxisId(axisId);
                logic.setShowAxisImportModal(true);
              }}
              onExportAxisValues={logic.handleExportAxisValues}
              onDeleteAxisValue={logic.handleDeleteAxisValue}
              showAxisImportModal={logic.showAxisImportModal}
              onCloseAxisImportModal={() => logic.setShowAxisImportModal(false)}
              isImportingAxis={logic.isImportingAxis}
              axisImportError={logic.axisImportError}
              axisFileInputRef={logic.axisFileInputRef}
              onAxisFileSelect={logic.handleAxisFileSelect}
            />
          )}
        </div>
      </div>
    </div>
  );
};
