import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import {
  Clock,
  CheckCircle,
  FileText,
  XCircle,
  Edit2,
  Upload,
  Eye,
  Lock,
  Calendar,
  Users
} from 'lucide-react';
import { Budget } from '../../types';

interface BudgetWorkflowProps {
  budgets: Budget[];
  onSelectBudget: (budgetId: string) => void;
  onSubmitVersion: (budgetId: string, versionId: string, user: string) => void;
  onValidateVersion: (budgetId: string, versionId: string, user: string) => void;
  onRejectVersion: (budgetId: string, versionId: string, user: string, reason: string) => void;
  onLockBudget: (budgetId: string) => void;
}

export const BudgetWorkflow: React.FC<BudgetWorkflowProps> = ({
  budgets,
  onSelectBudget,
  onSubmitVersion,
  onValidateVersion,
  onRejectVersion,
  onLockBudget
}) => {
  const pendingSubmissions = budgets.flatMap((budget) =>
    budget.versions.filter((v) => v.status === 'submitted').map((v) => ({ budget, version: v }))
  );

  const draftVersions = budgets.flatMap((budget) =>
    budget.versions.filter((v) => v.status === 'draft').map((v) => ({ budget, version: v }))
  );

  const validatedVersions = budgets.flatMap((budget) =>
    budget.versions.filter((v) => v.status === 'validated').map((v) => ({ budget, version: v }))
  );

  const rejectedVersions = budgets.flatMap((budget) =>
    budget.versions.filter((v) => v.status === 'rejected').map((v) => ({ budget, version: v }))
  );

  return (
    <div className="space-y-4">
      <Card title="Soumissions en attente" icon={<Clock className="w-5 h-5 text-yellow-600" />}>
        {pendingSubmissions.length === 0 ? (
          <div className="text-center py-8 text-slate-500">Aucune soumission en attente</div>
        ) : (
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
                      <span>Exercice {budget.fiscalYear}</span>
                      <span>Soumis par {version.submittedBy || 'Inconnu'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-green-600 border-green-200"
                      onClick={() => onValidateVersion(budget.id, version.id, 'Current User')}
                    >
                      Valider
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-200"
                      onClick={() => {
                        const reason = prompt('Motif de rejet:');
                        if (reason) onRejectVersion(budget.id, version.id, 'Current User', reason);
                      }}
                    >
                      Rejeter
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Brouillons à soumettre" icon={<FileText className="w-5 h-5 text-gray-600" />}>
        {draftVersions.length === 0 ? (
          <div className="text-center py-8 text-slate-500">Aucun brouillon</div>
        ) : (
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
                    <div className="text-xs text-slate-600">
                      Exercice {budget.fiscalYear} • {version.lines.length} ligne(s)
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-brand-600 border-brand-200"
                      onClick={() => onSelectBudget(budget.id)}
                    >
                      Éditer
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-brand-600 border-brand-200"
                      onClick={() => onSubmitVersion(budget.id, version.id, 'Current User')}
                    >
                      Soumettre
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Versions validées" icon={<CheckCircle className="w-5 h-5 text-green-600" />}>
        {validatedVersions.length === 0 ? (
          <div className="text-center py-8 text-slate-500">Aucune version validée</div>
        ) : (
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
                    <div className="text-xs text-slate-600">
                      Exercice {budget.fiscalYear} • Validé par {version.validatedBy || 'Inconnu'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-brand-600 border-brand-200"
                      onClick={() => onSelectBudget(budget.id)}
                    >
                      Voir
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-purple-600 border-purple-200"
                      onClick={() => onLockBudget(budget.id)}
                      disabled={budget.isLocked}
                    >
                      {budget.isLocked ? 'Verrouillé' : 'Verrouiller'}
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
