import React from 'react';
import { Card } from '../ui/Card';
import { GitBranch, CheckCircle } from 'lucide-react';
import { Budget, FiscalCalendar } from '../../types';

interface BudgetComparisonProps {
  budgets: Budget[];
  selectedBudgetId: string | null;
  onSelectBudget: (id: string | null) => void;
  compareVersion1Id: string | null;
  onSelectVersion1: (id: string | null) => void;
  compareVersion2Id: string | null;
  onSelectVersion2: (id: string | null) => void;
  onCompareVersions: (budgetId: string, v1Id: string, v2Id: string) => any;
  selectedCalendar: FiscalCalendar | null;
}

export const BudgetComparison: React.FC<BudgetComparisonProps> = ({
  budgets,
  selectedBudgetId,
  onSelectBudget,
  compareVersion1Id,
  onSelectVersion1,
  compareVersion2Id,
  onSelectVersion2,
  onCompareVersions,
  selectedCalendar
}) => {
  const selectedBudget = budgets.find((b) => b.id === selectedBudgetId);

  return (
    <Card title="Comparaison de versions" icon={<GitBranch className="w-5 h-5 text-brand-600" />}>
      {/* Budget Selection */}
      <div className="mb-6">
        <label className="block text-sm font-bold text-slate-700 mb-2">
          Sélectionner un budget
        </label>
        <select
          value={selectedBudgetId || ''}
          onChange={(e) => {
            onSelectBudget(e.target.value || null);
            onSelectVersion1(null);
            onSelectVersion2(null);
          }}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-400"
        >
          <option value="">-- Choisir un budget --</option>
          {budgets.map((budget) => (
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
              <label className="block text-sm font-bold text-slate-700 mb-2">Version 1</label>
              <select
                value={compareVersion1Id || ''}
                onChange={(e) => onSelectVersion1(e.target.value || null)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-400"
              >
                <option value="">-- Choisir --</option>
                {selectedBudget.versions.map((version) => (
                  <option key={version.id} value={version.id}>
                    {version.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Version 2</label>
              <select
                value={compareVersion2Id || ''}
                onChange={(e) => onSelectVersion2(e.target.value || null)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-400"
              >
                <option value="">-- Choisir --</option>
                {selectedBudget.versions.map((version) => (
                  <option
                    key={version.id}
                    value={version.id}
                    disabled={version.id === compareVersion1Id}
                  >
                    {version.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Comparison Results */}
          {compareVersion1Id &&
            compareVersion2Id &&
            (() => {
              const comparison = onCompareVersions(
                selectedBudget.id,
                compareVersion1Id,
                compareVersion2Id
              );
              if (!comparison) return null;

              const totalV1 = (comparison as any).version1.lines.reduce(
                (sum: number, line: any) =>
                  sum +
                  Object.values(line.periodValues || {}).reduce(
                    (s: number, v: any) => s + (v as number),
                    0
                  ),
                0
              );
              const totalV2 = (comparison as any).version2.lines.reduce(
                (sum: number, line: any) =>
                  sum +
                  Object.values(line.periodValues || {}).reduce(
                    (s: number, v: any) => s + (v as number),
                    0
                  ),
                0
              );
              const variance = totalV2 - totalV1;
              const variancePercent = totalV1 !== 0 ? (variance / totalV1) * 100 : 0;

              return (
                <div className="mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Card className="border-l-4 border-l-brand-500">
                      <div className="text-sm text-slate-600 font-bold">
                        Total {comparison.version1.name}
                      </div>
                      <div className="text-xl font-bold text-slate-800 mt-1">
                        {totalV1.toLocaleString('fr-FR')} €
                      </div>
                    </Card>
                    <Card className="border-l-4 border-l-green-500">
                      <div className="text-sm text-slate-600 font-bold">
                        Total {comparison.version2.name}
                      </div>
                      <div className="text-xl font-bold text-slate-800 mt-1">
                        {totalV2.toLocaleString('fr-FR')} €
                      </div>
                    </Card>
                    <Card
                      className={`border-l-4 ${variance >= 0 ? 'border-l-green-500' : 'border-l-red-500'}`}
                    >
                      <div className="text-sm text-slate-600 font-bold">Écart</div>
                      <div
                        className={`text-xl font-bold mt-1 ${variance >= 0 ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {variance >= 0 ? '+' : ''}
                        {variance.toLocaleString('fr-FR')} € ({variancePercent.toFixed(1)}%)
                      </div>
                    </Card>
                  </div>
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
                            </tr>
                          </thead>
                          <tbody>
                            {comparison.differences.map((diff: any, idx: number) => (
                              <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="p-2 font-mono text-xs">{diff.accountCode}</td>
                                <td className="p-2 text-xs">
                                  {selectedCalendar?.periods.find((p) => p.id === diff.periodId)
                                    ?.name || diff.periodId}
                                </td>
                                <td className="p-2 text-right">
                                  {diff.value1.toLocaleString('fr-FR')}
                                </td>
                                <td className="p-2 text-right">
                                  {diff.value2.toLocaleString('fr-FR')}
                                </td>
                                <td
                                  className={`p-2 text-right font-bold ${diff.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}
                                >
                                  {diff.variance >= 0 ? '+' : ''}
                                  {diff.variance.toLocaleString('fr-FR')}
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
    </Card>
  );
};
