import React from 'react';
import { useBudgetLogic } from '../hooks/useBudgetLogic';
import { notify } from '../utils/common';
import { BudgetHeader } from '../components/budget/BudgetHeader';
import { BudgetTabs } from '../components/budget/BudgetTabs';
import { BudgetList } from '../components/budget/BudgetList';
import { BudgetEditor } from '../components/budget/BudgetEditor';
import { BudgetComparison } from '../components/budget/BudgetComparison';
import { BudgetWorkflow } from '../components/budget/BudgetWorkflow';
import { BudgetTemplates } from '../components/budget/BudgetTemplates';
import { BudgetReferentials } from '../components/budget/BudgetReferentials';
import { BudgetModals } from '../components/budget/BudgetModals';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

export const Budget: React.FC = () => {
    const {
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
        getAxisValues,
        fileInputRef,
        axisFileInputRef,
        handlers,
        confirmProps
    } = useBudgetLogic();

    return (
        <div className="h-full overflow-y-auto p-4 md:p-8 custom-scrollbar">
            <ConfirmDialog
                isOpen={confirmProps.isOpen}
                onClose={confirmProps.handleCancel}
                onConfirm={confirmProps.handleConfirm}
                {...confirmProps.options}
            />
            <div className="pb-10 space-y-6">
                <BudgetHeader
                    onCreateBudget={() => {
                        const year = new Date().getFullYear();
                        const defaultChart = chartsOfAccounts[0];
                        if (!defaultChart) {
                            notify.warning('Veuillez d\'abord créer un plan comptable dans les paramètres.');
                            return;
                        }
                        const budgetName = prompt('Nom du budget:', `Budget ${year}`);
                        if (budgetName) {
                            handlers.handleCreateBudget(budgetName, year, defaultChart.id, fiscalCalendars[0]?.id);
                        }
                    }}
                />

                <BudgetTabs
                    activeTab={state.activeTab}
                    onTabChange={(tab) => dispatch({ type: 'SET_ACTIVE_TAB', payload: tab })}
                />

                <div className="mt-6">
                    {state.activeTab === 'list' && (
                        <BudgetList
                            budgets={budgets}
                            templatesCount={templates.length}
                            onSelectBudget={handlers.handleSelectBudget}
                            onDeleteBudget={async (id, name) => {
                                const ok = await confirmProps.confirm({
                                    title: 'Supprimer le budget',
                                    message: `Êtes-vous sûr de vouloir supprimer le budget "${name}" ?`,
                                    variant: 'danger'
                                });
                                if (ok) {
                                    handlers.deleteBudget(id);
                                }
                            }}
                            onCreateBudget={() => {
                                const year = new Date().getFullYear();
                                const defaultChart = chartsOfAccounts[0];
                                if (!defaultChart) {
                                    notify.warning('Veuillez d\'abord créer un plan comptable dans les paramètres.');
                                    return;
                                }
                                const budgetName = prompt('Nom du budget:', `Budget ${year}`);
                                if (budgetName) {
                                    handlers.handleCreateBudget(budgetName, year, defaultChart.id, fiscalCalendars[0]?.id);
                                }
                            }}
                        />
                    )}

                    {state.activeTab === 'editor' && (
                        <BudgetEditor
                            selectedBudget={selectedBudget}
                            selectedVersion={selectedVersion}
                            selectedChart={selectedChart}
                            selectedCalendar={selectedCalendar}
                            editingCellId={state.editingCellId}
                            editingValue={state.editingValue}
                            onBack={() => {
                                dispatch({ type: 'SET_SELECTED_BUDGET', payload: null });
                                dispatch({ type: 'SET_SELECTED_VERSION', payload: null });
                                dispatch({ type: 'SET_ACTIVE_TAB', payload: 'list' });
                            }}
                            onSetVersion={(id) => dispatch({ type: 'SET_SELECTED_VERSION', payload: id })}
                            onAddVersion={handlers.handleAddVersion}
                            onDownloadTemplate={handlers.handleDownloadTemplate}
                            onShowImport={() => dispatch({ type: 'TOGGLE_MODAL', payload: { modal: 'showImportModal', value: true } })}
                            onExport={handlers.handleExportBudget}
                            onShowNewLine={() => dispatch({ type: 'TOGGLE_MODAL', payload: { modal: 'showNewLineModal', value: true } })}
                            onCellEdit={handlers.handleCellEdit}
                            onCellSave={handlers.handleCellSave}
                            onCellCancel={handlers.handleCellCancel}
                            onEditingValueChange={(val) => dispatch({ type: 'SET_EDITING_VALUE', payload: val })}
                            onDeleteLine={handlers.handleDeleteLine}
                        />
                    )}

                    {state.activeTab === 'comparison' && (
                        <BudgetComparison
                            budgets={budgets}
                            selectedBudgetId={state.selectedBudgetId}
                            selectedBudget={selectedBudget}
                            selectedCalendar={selectedCalendar}
                            compareVersion1Id={state.compareVersion1Id}
                            compareVersion2Id={state.compareVersion2Id}
                            onSelectBudget={(id) => {
                                dispatch({ type: 'SET_SELECTED_BUDGET', payload: id });
                                dispatch({ type: 'SET_COMPARE_VERSION', payload: { index: 1, id: null } });
                                dispatch({ type: 'SET_COMPARE_VERSION', payload: { index: 2, id: null } });
                            }}
                            onSelectVersion1={(id) => dispatch({ type: 'SET_COMPARE_VERSION', payload: { index: 1, id } })}
                            onSelectVersion2={(id) => dispatch({ type: 'SET_COMPARE_VERSION', payload: { index: 2, id } })}
                            compareVersions={handlers.compareVersions}
                        />
                    )}

                    {state.activeTab === 'workflow' && (
                        <BudgetWorkflow
                            budgets={budgets}
                            onSelectBudget={handlers.handleSelectBudget}
                            onValidateVersion={async (bid, vid) => {
                                const ok = await confirmProps.confirm({
                                    title: 'Valider la version',
                                    message: `Valider la version du budget ?`,
                                    variant: 'info'
                                });
                                if (ok) {
                                    handlers.validateVersion(bid, vid, 'Current User');
                                }
                            }}
                            onRejectVersion={(bid, vid) => {
                                const reason = prompt(`Motif de rejet :`);
                                if (reason) {
                                    handlers.rejectVersion(bid, vid, 'Current User', reason);
                                }
                            }}
                            onSubmitVersion={async (bid, vid) => {
                                const budget = budgets.find(b => b.id === bid);
                                const version = budget?.versions.find(v => v.id === vid);
                                if (version?.lines.length === 0) {
                                    notify.warning('Impossible de soumettre un budget vide.');
                                    return;
                                }
                                const ok = await confirmProps.confirm({
                                    title: 'Soumettre pour validation',
                                    message: `Soumettre pour validation ?`,
                                    variant: 'info'
                                });
                                if (ok) {
                                    handlers.submitVersion(bid, vid, 'Current User');
                                }
                            }}
                            onLockBudget={async (bid) => {
                                const ok = await confirmProps.confirm({
                                    title: 'Verrouiller le budget',
                                    message: `Verrouiller le budget ?`,
                                    variant: 'warning'
                                });
                                if (ok) {
                                    handlers.lockBudget(bid);
                                }
                            }}
                        />
                    )}

                    {state.activeTab === 'templates' && (
                        <BudgetTemplates
                            templates={templates}
                            onShowCreate={() => dispatch({ type: 'TOGGLE_MODAL', payload: { modal: 'showTemplateModal', value: true } })}
                            onUseTemplate={handlers.handleUseTemplate}
                            onEditTemplate={handlers.handleEditTemplate}
                            onDeleteTemplate={handlers.handleDeleteTemplate}
                        />
                    )}

                    {state.activeTab === 'referentials' && (
                        <BudgetReferentials
                            analyticalAxes={analyticalAxes}
                            getAxisValues={getAxisValues}
                            onDownloadTemplate={handlers.handleDownloadTemplate}
                            onShowNewAxis={() => dispatch({ type: 'TOGGLE_MODAL', payload: { modal: 'showNewAxisModal', value: true } })}
                            onShowImportAxis={(id) => {
                                dispatch({ type: 'SET_AXIS_FIELD', payload: { field: 'selectedAxisId', value: id } });
                                dispatch({ type: 'TOGGLE_MODAL', payload: { modal: 'showAxisImportModal', value: true } });
                            }}
                            onExportAxis={handlers.handleExportAxisValues}
                            onDeleteAxisValue={handlers.handleDeleteAxisValue}
                        />
                    )}
                </div>
            </div>

            <BudgetModals
                state={state}
                dispatch={dispatch}
                budgets={budgets}
                selectedChart={selectedChart}
                fileInputRef={fileInputRef}
                axisFileInputRef={axisFileInputRef}
                handlers={handlers}
            />
        </div>
    );
};
