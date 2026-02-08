import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { FileText, CheckCircle, Clock, Copy, Plus, DollarSign, Eye, Edit2, Trash2, Calendar, GitBranch, Users, Lock } from 'lucide-react';
import { Budget } from '../../types';

interface BudgetListProps {
    budgets: Budget[];
    templatesCount: number;
    onSelectBudget: (id: string) => void;
    onDeleteBudget: (id: string, name: string) => void;
    onCreateBudget: () => void;
}

export const BudgetList: React.FC<BudgetListProps> = ({
    budgets,
    templatesCount,
    onSelectBudget,
    onDeleteBudget,
    onCreateBudget
}) => {
    const validatedCount = budgets.filter(b => b.versions.some(v => v.status === 'validated')).length;
    const inProgressCount = budgets.filter(b => b.versions.some(v => v.status === 'draft' || v.status === 'submitted')).length;

    return (
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
                            <div className="text-2xl font-bold text-slate-800 mt-1">{validatedCount}</div>
                        </div>
                        <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>
                </Card>
                <Card className="border-l-4 border-l-yellow-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-sm text-slate-600 font-bold">En cours</div>
                            <div className="text-2xl font-bold text-slate-800 mt-1">{inProgressCount}</div>
                        </div>
                        <Clock className="w-8 h-8 text-yellow-500" />
                    </div>
                </Card>
                <Card className="border-l-4 border-l-purple-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-sm text-slate-600 font-bold">Modèles</div>
                            <div className="text-2xl font-bold text-slate-800 mt-1">{templatesCount}</div>
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
                            onClick={onCreateBudget}
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
                                                    <span className={`text-xs font-bold px-2 py-1 rounded ${statusColors[activeVersion.status as keyof typeof statusColors]}`}>
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
                                                onClick={() => onSelectBudget(budget.id)}
                                            >
                                                <Eye className="w-4 h-4 mr-2" />
                                                Voir
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-slate-600 border-slate-200"
                                                onClick={() => onSelectBudget(budget.id)}
                                            >
                                                <Edit2 className="w-4 h-4 mr-2" />
                                                Éditer
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-red-600 border-red-200"
                                                onClick={() => onDeleteBudget(budget.id, budget.name)}
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
    );
};
