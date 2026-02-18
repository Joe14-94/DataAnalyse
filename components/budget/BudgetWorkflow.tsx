import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Clock, CheckCircle, XCircle, FileText, Calendar, Users, Eye, Edit2, Upload, Lock } from 'lucide-react';
import { Budget } from '../../types';

interface BudgetWorkflowProps {
    budgets: Budget[];
    onSelectBudget: (id: string) => void;
    onValidateVersion: (budgetId: string, versionId: string) => void;
    onRejectVersion: (budgetId: string, versionId: string) => void;
    onSubmitVersion: (budgetId: string, versionId: string) => void;
    onLockBudget: (budgetId: string) => void;
}

export const BudgetWorkflow: React.FC<BudgetWorkflowProps> = ({
    budgets,
    onSelectBudget,
    onValidateVersion,
    onRejectVersion,
    onSubmitVersion,
    onLockBudget
}) => {
    const pendingSubmissions = budgets.flatMap(budget =>
        budget.versions.filter(v => v.status === 'submitted').map(v => ({ budget, version: v }))
    );

    const draftVersions = budgets.flatMap(budget =>
        budget.versions.filter(v => v.status === 'draft').map(v => ({ budget, version: v }))
    );

    const validatedVersions = budgets.flatMap(budget =>
        budget.versions.filter(v => v.status === 'validated').map(v => ({ budget, version: v }))
    );

    const rejectedVersions = budgets.flatMap(budget =>
        budget.versions.filter(v => v.status === 'rejected').map(v => ({ budget, version: v }))
    );

    return (
        <div className="space-y-4">
            {/* Pending Submissions */}
            <Card title="Soumissions en attente" icon={<Clock className="w-5 h-5 text-yellow-600" />}>
                {pendingSubmissions.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                        <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p>Aucune soumission en attente</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {pendingSubmissions.map(({ budget, version }) => (
                            <div key={`${budget.id}-${version.id}`} className="border border-slate-200 rounded-lg p-4 hover:border-brand-300 transition-colors">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h4 className="font-bold text-slate-800">{budget.name}</h4>
                                            <span className="text-xs font-bold px-2 py-1 rounded bg-brand-100 text-brand-700">{version.name}</span>
                                        </div>
                                        <div className="flex items-center gap-4 text-xs text-slate-600">
                                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Exercice {budget.fiscalYear}</span>
                                            <span className="flex items-center gap-1"><Users className="w-3 h-3" />Soumis par {version.submittedBy || 'Inconnu'}</span>
                                            {version.submittedAt && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(version.submittedAt).toLocaleDateString('fr-FR')}</span>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" size="sm" className="text-green-600 border-green-200" onClick={() => onValidateVersion(budget.id, version.id)}>
                                            <CheckCircle className="w-4 h-4 mr-2" /> Valider
                                        </Button>
                                        <Button variant="outline" size="sm" className="text-red-600 border-red-200" onClick={() => onRejectVersion(budget.id, version.id)}>
                                            <XCircle className="w-4 h-4 mr-2" /> Rejeter
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {/* Draft Versions */}
            <Card title="Brouillons à soumettre" icon={<FileText className="w-5 h-5 text-gray-600" />}>
                {draftVersions.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                        <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p>Aucun brouillon</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {draftVersions.map(({ budget, version }) => (
                            <div key={`${budget.id}-${version.id}`} className="border border-slate-200 rounded-lg p-4 hover:border-brand-300 transition-colors">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h4 className="font-bold text-slate-800">{budget.name}</h4>
                                            <span className="text-xs font-bold px-2 py-1 rounded bg-gray-100 text-gray-700">{version.name}</span>
                                        </div>
                                        <div className="flex items-center gap-4 text-xs text-slate-600">
                                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Exercice {budget.fiscalYear}</span>
                                            <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{version.lines.length} ligne(s)</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" size="sm" className="text-brand-600 border-brand-200" onClick={() => onSelectBudget(budget.id)}>
                                            <Edit2 className="w-4 h-4 mr-2" /> Éditer
                                        </Button>
                                        <Button variant="outline" size="sm" className="text-brand-600 border-brand-200" onClick={() => onSubmitVersion(budget.id, version.id)}>
                                            <Upload className="w-4 h-4 mr-2" /> Soumettre
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {/* Validated Versions */}
            <Card title="Versions validées" icon={<CheckCircle className="w-5 h-5 text-green-600" />}>
                {validatedVersions.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                        <CheckCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p>Aucune version validée</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {validatedVersions.map(({ budget, version }) => (
                            <div key={`${budget.id}-${version.id}`} className="border border-green-200 rounded-lg p-4 bg-green-50">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h4 className="font-bold text-slate-800">{budget.name}</h4>
                                            <span className="text-xs font-bold px-2 py-1 rounded bg-green-100 text-green-700">{version.name}</span>
                                        </div>
                                        <div className="flex items-center gap-4 text-xs text-slate-600">
                                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Exercice {budget.fiscalYear}</span>
                                            <span className="flex items-center gap-1"><Users className="w-3 h-3" />Validé par {version.validatedBy || 'Inconnu'}</span>
                                            {version.validatedAt && <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" />{new Date(version.validatedAt).toLocaleDateString('fr-FR')}</span>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" size="sm" className="text-brand-600 border-brand-200" onClick={() => onSelectBudget(budget.id)}>
                                            <Eye className="w-4 h-4 mr-2" /> Voir
                                        </Button>
                                        <Button variant="outline" size="sm" className="text-purple-600 border-purple-200" onClick={() => onLockBudget(budget.id)} disabled={budget.isLocked}>
                                            <Lock className="w-4 h-4 mr-2" /> {budget.isLocked ? 'Verrouillé' : 'Verrouiller'}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {/* Rejected Versions */}
            <Card title="Versions rejetées" icon={<XCircle className="w-5 h-5 text-red-600" />}>
                {rejectedVersions.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                        <XCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p>Aucune version rejetée</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {rejectedVersions.map(({ budget, version }) => (
                            <div key={`${budget.id}-${version.id}`} className="border border-red-200 rounded-lg p-4 bg-red-50">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h4 className="font-bold text-slate-800">{budget.name}</h4>
                                            <span className="text-xs font-bold px-2 py-1 rounded bg-red-100 text-red-700">{version.name}</span>
                                        </div>
                                        {version.rejectionReason && (
                                            <div className="mb-2 text-sm text-red-700 bg-red-100 px-3 py-2 rounded">
                                                <span className="font-bold">Motif:</span> {version.rejectionReason}
                                            </div>
                                        )}
                                        <div className="flex items-center gap-4 text-xs text-slate-600">
                                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Exercice {budget.fiscalYear}</span>
                                            <span className="flex items-center gap-1"><Users className="w-3 h-3" />Rejeté par {version.validatedBy || 'Inconnu'}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" size="sm" className="text-brand-600 border-brand-200" onClick={() => onSelectBudget(budget.id)}>
                                            <Edit2 className="w-4 h-4 mr-2" /> Modifier
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    );
};
