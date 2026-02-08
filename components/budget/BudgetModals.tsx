import React from 'react';
import { X, Upload, Download, AlertCircle, Plus, Save } from 'lucide-react';
import { Button } from '../ui/Button';
import { Budget, ChartOfAccounts } from '../../types';

interface BudgetModalsProps {
    state: any;
    dispatch: any;
    budgets: Budget[];
    selectedChart: ChartOfAccounts | null;
    fileInputRef: React.RefObject<HTMLInputElement>;
    axisFileInputRef: React.RefObject<HTMLInputElement>;
    handlers: any;
}

export const BudgetModals: React.FC<BudgetModalsProps> = ({
    state,
    dispatch,
    budgets,
    selectedChart,
    fileInputRef,
    axisFileInputRef,
    handlers
}) => {
    return (
        <>
            {/* Import Modal */}
            {state.showImportModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
                        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-800">Importer un budget</h3>
                            <button onClick={() => { dispatch({ type: 'TOGGLE_MODAL', payload: { modal: 'showImportModal', value: false } }); dispatch({ type: 'SET_IMPORT_ERROR', payload: null }); }} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6">
                            <div className="mb-4">
                                <p className="text-sm text-slate-600 mb-4">Importez un fichier Excel (.xlsx, .xls) ou CSV (.csv) contenant les lignes budgétaires.</p>
                                <div className="bg-brand-50 border border-brand-200 rounded-lg p-3 mb-4">
                                    <h4 className="text-sm font-bold text-brand-900 mb-2">Format attendu :</h4>
                                    <ul className="text-xs text-brand-800 space-y-1">
                                        <li>• Colonne 1: Code compte (ex: 601000)</li>
                                        <li>• Colonne 2: Libellé (ex: Achats de matières premières)</li>
                                        <li>• Colonnes suivantes: Périodes (Jan 2025, Fév 2025, etc.)</li>
                                    </ul>
                                </div>
                            </div>
                            {state.importError && (
                                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="text-sm font-bold text-red-900">Erreur d'import</h4>
                                        <p className="text-xs text-red-800 mt-1">{state.importError}</p>
                                    </div>
                                </div>
                            )}
                            <div className="space-y-3">
                                <Button className="w-full bg-brand-600 hover:bg-brand-700" onClick={() => fileInputRef.current?.click()} disabled={state.isImporting}>
                                    <Upload className="w-4 h-4 mr-2" /> {state.isImporting ? 'Import en cours...' : 'Sélectionner un fichier'}
                                </Button>
                                <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handlers.handleImportFile} className="hidden" />
                                <Button variant="outline" className="w-full" onClick={() => { handlers.handleDownloadTemplate(); dispatch({ type: 'TOGGLE_MODAL', payload: { modal: 'showImportModal', value: false } }); }}>
                                    <Download className="w-4 h-4 mr-2" /> Télécharger un template
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* New Line Modal */}
            {state.showNewLineModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-800">Ajouter une ligne budgétaire</h3>
                            <button onClick={() => { dispatch({ type: 'TOGGLE_MODAL', payload: { modal: 'showNewLineModal', value: false } }); dispatch({ type: 'SET_ACCOUNT_SEARCH', payload: '' }); }} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-4 overflow-y-auto flex-1">
                            <div className="mb-4">
                                <label className="block text-sm font-bold text-slate-700 mb-2">Rechercher un compte</label>
                                <input type="text" value={state.accountSearchQuery} onChange={(e) => dispatch({ type: 'SET_ACCOUNT_SEARCH', payload: e.target.value })} placeholder="Code ou libellé..." className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-400" />
                            </div>
                            <div className="space-y-1 max-h-96 overflow-y-auto">
                                {selectedChart?.accounts.filter(acc => acc.canReceiveEntries && (state.accountSearchQuery === '' || acc.code.toLowerCase().includes(state.accountSearchQuery.toLowerCase()) || acc.label.toLowerCase().includes(state.accountSearchQuery.toLowerCase()))).map(account => (
                                    <button key={account.code} onClick={() => handlers.handleAddLine(account.code)} className="w-full text-left p-2 rounded hover:bg-brand-50 border border-transparent hover:border-brand-200 transition-colors">
                                        <div className="font-mono text-sm font-bold text-slate-800">{account.code}</div>
                                        <div className="text-sm text-slate-600">{'  '.repeat(account.level - 1)}{account.label}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* New Axis Modal */}
            {state.showNewAxisModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-800">Créer un axe analytique</h3>
                            <button onClick={() => dispatch({ type: 'RESET_AXIS_FORM' })} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Code *</label>
                                    <input type="text" value={state.newAxisCode} onChange={(e) => dispatch({ type: 'SET_AXIS_FIELD', payload: { field: 'newAxisCode', value: e.target.value.toUpperCase() } })} placeholder="Ex: CC, PRJ, BU" maxLength={10} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-400 font-mono" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Nom *</label>
                                    <input type="text" value={state.newAxisName} onChange={(e) => dispatch({ type: 'SET_AXIS_FIELD', payload: { field: 'newAxisName', value: e.target.value } })} placeholder="Ex: Centre de coûts, Projet, Business Unit" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-400" />
                                </div>
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" id="axis-mandatory" checked={state.newAxisMandatory} onChange={(e) => dispatch({ type: 'SET_AXIS_FIELD', payload: { field: 'newAxisMandatory', value: e.target.checked } })} className="w-4 h-4 text-brand-600 border-slate-300 rounded focus:ring-brand-500" />
                                    <label htmlFor="axis-mandatory" className="text-sm text-slate-700">Axe obligatoire sur les lignes budgétaires</label>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 mt-6">
                                <Button className="flex-1 bg-brand-600 hover:bg-brand-700" onClick={handlers.handleCreateAxis}><Plus className="w-4 h-4 mr-2" /> Créer</Button>
                                <Button variant="outline" className="flex-1" onClick={() => dispatch({ type: 'TOGGLE_MODAL', payload: { modal: 'showNewAxisModal', value: false } })}>Annuler</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Axis Import Modal */}
            {state.showAxisImportModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-800">Importer des valeurs d'axe</h3>
                            <button onClick={() => { dispatch({ type: 'TOGGLE_MODAL', payload: { modal: 'showAxisImportModal', value: false } }); dispatch({ type: 'SET_AXIS_FIELD', payload: { field: 'selectedAxisId', value: '' } }); dispatch({ type: 'SET_AXIS_FIELD', payload: { field: 'axisImportError', value: null } }); }} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4">
                                <p className="text-sm text-slate-600">Importez vos valeurs d'axe depuis un fichier Excel (.xlsx) ou CSV</p>
                                <div className="bg-brand-50 border border-brand-200 rounded-lg p-3">
                                    <p className="text-xs text-brand-800 font-bold mb-2">Format attendu :</p>
                                    <ul className="text-xs text-brand-700 space-y-1">
                                        <li>• Colonne "Catégorie" : Catégorie (niveau 1)</li>
                                        <li>• Colonne "Sous-catégorie" : Sous-catégorie (niveau 2)</li>
                                        <li>• Colonne "Code" : Code de la valeur (requis)</li>
                                        <li>• Colonne "Libellé" : Nom de la valeur (requis)</li>
                                    </ul>
                                </div>
                                {state.axisImportError && (
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                        <p className="text-sm text-red-800"><AlertCircle className="w-4 h-4 inline mr-2" /> {state.axisImportError}</p>
                                    </div>
                                )}
                                <input ref={axisFileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handlers.handleAxisFileSelect} className="hidden" />
                                <Button className="w-full bg-brand-600 hover:bg-brand-700" onClick={() => axisFileInputRef.current?.click()} disabled={state.isImportingAxis}>
                                    {state.isImportingAxis ? 'Import en cours...' : 'Sélectionner un fichier'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Template Creation Modal */}
            {state.showTemplateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
                        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-800">Créer un modèle budgétaire</h3>
                            <button onClick={() => dispatch({ type: 'RESET_TEMPLATE_FORM' })} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Nom du modèle *</label>
                                    <input type="text" value={state.templateName} onChange={(e) => dispatch({ type: 'SET_TEMPLATE_FIELD', payload: { field: 'templateName', value: e.target.value } })} placeholder="Ex: Budget Marketing, Budget RH" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-400" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Description</label>
                                    <textarea value={state.templateDescription} onChange={(e) => dispatch({ type: 'SET_TEMPLATE_FIELD', payload: { field: 'templateDescription', value: e.target.value } })} placeholder="Décrivez l'utilité de ce modèle..." rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-400" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Catégorie</label>
                                    <input type="text" value={state.templateCategory} onChange={(e) => dispatch({ type: 'SET_TEMPLATE_FIELD', payload: { field: 'templateCategory', value: e.target.value } })} placeholder="Ex: Département, Projet, Activité" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-400" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Budget source</label>
                                    <select value={state.templateSourceBudgetId} onChange={(e) => dispatch({ type: 'SET_TEMPLATE_FIELD', payload: { field: 'templateSourceBudgetId', value: e.target.value } })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-400">
                                        <option value="">-- Modèle vide --</option>
                                        {budgets.map(budget => (
                                            <option key={budget.id} value={budget.id}>{budget.name} ({budget.versions[budget.versions.length - 1]?.lines.length || 0} comptes)</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 mt-6">
                                <Button className="flex-1 bg-brand-600 hover:bg-brand-700" onClick={handlers.handleCreateTemplate}><Plus className="w-4 h-4 mr-2" /> Créer le modèle</Button>
                                <Button variant="outline" className="flex-1" onClick={() => dispatch({ type: 'TOGGLE_MODAL', payload: { modal: 'showTemplateModal', value: false } })}>Annuler</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Template Edit Modal */}
            {state.showEditTemplateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
                        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-800">Modifier le modèle budgétaire</h3>
                            <button onClick={() => dispatch({ type: 'RESET_TEMPLATE_FORM' })} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Nom du modèle *</label>
                                    <input type="text" value={state.templateName} onChange={(e) => dispatch({ type: 'SET_TEMPLATE_FIELD', payload: { field: 'templateName', value: e.target.value } })} placeholder="Ex: Budget Marketing, Budget RH" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-400" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Description</label>
                                    <textarea value={state.templateDescription} onChange={(e) => dispatch({ type: 'SET_TEMPLATE_FIELD', payload: { field: 'templateDescription', value: e.target.value } })} placeholder="Décrivez l'utilité de ce modèle..." rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-400" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Catégorie</label>
                                    <input type="text" value={state.templateCategory} onChange={(e) => dispatch({ type: 'SET_TEMPLATE_FIELD', payload: { field: 'templateCategory', value: e.target.value } })} placeholder="Ex: Département, Projet, Activité" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-400" />
                                </div>
                            </div>
                            <div className="flex items-center gap-3 mt-6">
                                <Button className="flex-1 bg-brand-600 hover:bg-brand-700" onClick={handlers.handleUpdateTemplate}><Save className="w-4 h-4 mr-2" /> Enregistrer</Button>
                                <Button variant="outline" className="flex-1" onClick={() => dispatch({ type: 'TOGGLE_MODAL', payload: { modal: 'showEditTemplateModal', value: false } })}>Annuler</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
