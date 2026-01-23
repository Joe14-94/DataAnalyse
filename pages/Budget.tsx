import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
    DollarSign, Plus, FileText, TrendingUp, GitBranch,
    Calendar, Users, Lock, Unlock, CheckCircle, XCircle,
    Clock, Edit2, Trash2, Copy, Eye, MessageSquare,
    Download, Upload, Filter, Search
} from 'lucide-react';
import { useBudget } from '../context/BudgetContext';
import { useReferentials } from '../context/ReferentialContext';

type BudgetTab = 'list' | 'editor' | 'comparison' | 'workflow' | 'templates';

export const Budget: React.FC = () => {
    const [activeTab, setActiveTab] = useState<BudgetTab>('list');
    const { budgets, templates } = useBudget();
    const { chartsOfAccounts, fiscalCalendars } = useReferentials();

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
                    <Button className="bg-brand-600 hover:bg-brand-700">
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
                        { id: 'templates' as const, label: 'Modèles', icon: Copy }
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
                                <Card className="border-l-4 border-l-blue-500">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-sm text-slate-600 font-bold">Total Budgets</div>
                                            <div className="text-2xl font-bold text-slate-800 mt-1">{budgets.length}</div>
                                        </div>
                                        <FileText className="w-8 h-8 text-blue-500" />
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
                                        <Button className="bg-brand-600 hover:bg-brand-700">
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
                                                submitted: 'bg-blue-100 text-blue-700',
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
                                                            <Button variant="outline" size="sm" className="text-blue-600 border-blue-200">
                                                                <Eye className="w-4 h-4 mr-2" />
                                                                Voir
                                                            </Button>
                                                            <Button variant="outline" size="sm" className="text-slate-600 border-slate-200">
                                                                <Edit2 className="w-4 h-4 mr-2" />
                                                                Éditer
                                                            </Button>
                                                            <Button variant="outline" size="sm" className="text-red-600 border-red-200">
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
                        <Card title="Éditeur budgétaire" icon={<Edit2 className="w-5 h-5 text-brand-600" />}>
                            <div className="text-center py-12 text-slate-500">
                                <Edit2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                                <p>Sélectionnez ou créez un budget pour accéder à l'éditeur</p>
                            </div>
                        </Card>
                    )}

                    {activeTab === 'comparison' && (
                        <Card title="Comparaison de versions" icon={<GitBranch className="w-5 h-5 text-brand-600" />}>
                            <div className="text-center py-12 text-slate-500">
                                <GitBranch className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                                <p>Comparez différentes versions de vos budgets</p>
                            </div>
                        </Card>
                    )}

                    {activeTab === 'workflow' && (
                        <Card title="Workflow de validation" icon={<CheckCircle className="w-5 h-5 text-brand-600" />}>
                            <div className="text-center py-12 text-slate-500">
                                <CheckCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                                <p>Gérez les soumissions et validations de budgets</p>
                            </div>
                        </Card>
                    )}

                    {activeTab === 'templates' && (
                        <Card title="Modèles budgétaires" icon={<Copy className="w-5 h-5 text-brand-600" />}>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-slate-600">
                                        Créez des modèles réutilisables pour accélérer la création de budgets
                                    </p>
                                    <Button variant="outline" className="text-brand-600 border-brand-200">
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
                                                <Button variant="outline" size="sm" className="w-full text-brand-600 border-brand-200">
                                                    Utiliser ce modèle
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
};
