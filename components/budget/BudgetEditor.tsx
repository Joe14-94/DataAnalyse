import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import {
  ArrowLeft,
  Plus,
  Download,
  Upload,
  Trash2,
  FileText,
  Calendar,
  Lock,
  X,
  AlertCircle
} from 'lucide-react';
import { Budget, BudgetVersion, ChartOfAccounts, FiscalCalendar } from '../../types';

interface BudgetEditorProps {
  selectedBudget: Budget | null;
  selectedVersion: BudgetVersion | null;
  selectedChart: ChartOfAccounts | null;
  selectedCalendar: FiscalCalendar | null;
  editingCellId: string | null;
  editingValue: string;
  onSetEditingValue: (value: string) => void;
  onBackToList: () => void;
  onSelectVersion: (versionId: string) => void;
  onAddVersion: () => void;
  onDownloadTemplate: () => void;
  onShowImportModal: () => void;
  onExportBudget: () => void;
  onShowNewLineModal: () => void;
  onCellEdit: (lineId: string, periodId: string, currentValue: number) => void;
  onCellSave: (lineId: string, periodId: string) => void;
  onCellCancel: () => void;
  onDeleteLine: (lineId: string) => void;
  showImportModal: boolean;
  onCloseImportModal: () => void;
  isImporting: boolean;
  importError: string | null;
  onImportFile: (event: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  showNewLineModal: boolean;
  onCloseNewLineModal: () => void;
  accountSearchQuery: string;
  onSetAccountSearchQuery: (query: string) => void;
  onAddLine: (accountCode: string) => void;
}

export const BudgetEditor: React.FC<BudgetEditorProps> = ({
  selectedBudget,
  selectedVersion,
  selectedChart,
  selectedCalendar,
  editingCellId,
  editingValue,
  onSetEditingValue,
  onBackToList,
  onSelectVersion,
  onAddVersion,
  onDownloadTemplate,
  onShowImportModal,
  onExportBudget,
  onShowNewLineModal,
  onCellEdit,
  onCellSave,
  onCellCancel,
  onDeleteLine,
  showImportModal,
  onCloseImportModal,
  isImporting,
  importError,
  onImportFile,
  fileInputRef,
  showNewLineModal,
  onCloseNewLineModal,
  accountSearchQuery,
  onSetAccountSearchQuery,
  onAddLine
}) => {
  if (!selectedBudget) {
    return (
      <Card title="Éditeur budgétaire" icon={<FileText className="w-5 h-5 text-brand-600" />}>
        <div className="text-center py-12 text-slate-500">
          <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="mb-4">Sélectionnez un budget dans la liste pour commencer l'édition</p>
          <Button onClick={onBackToList} className="bg-brand-600 hover:bg-brand-700">
            Retour à la liste
          </Button>
        </div>
      </Card>
    );
  }

  const periods = selectedCalendar?.periods || [
    { id: '1', name: 'Janv' },
    { id: '2', name: 'Févr' },
    { id: '3', name: 'Mars' },
    { id: '4', name: 'Avr' },
    { id: '5', name: 'Mai' },
    { id: '6', name: 'Juin' },
    { id: '7', name: 'Juil' },
    { id: '8', name: 'Août' },
    { id: '9', name: 'Sept' },
    { id: '10', name: 'Oct' },
    { id: '11', name: 'Nov' },
    { id: '12', name: 'Déc' }
  ];

  const statusColors = {
    draft: 'bg-gray-100 text-gray-700 border-gray-300',
    submitted: 'bg-brand-100 text-brand-700 border-brand-300',
    validated: 'bg-green-100 text-green-700 border-green-300',
    rejected: 'bg-red-100 text-red-700 border-red-300',
    locked: 'bg-purple-100 text-purple-700 border-purple-300'
  };

  return (
    <div className="space-y-4">
      {/* Budget Header */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={onBackToList}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                {selectedBudget.name}
                {selectedBudget.isLocked && (
                  <span title="Verrouillé">
                    <Lock className="w-4 h-4 text-purple-600" />
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-3 text-sm text-slate-600 mt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Exercice {selectedBudget.fiscalYear}
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
          {selectedBudget.versions.map((version) => (
            <button
              key={version.id}
              onClick={() => onSelectVersion(version.id)}
              className={`px-3 py-1 rounded border text-sm font-bold transition-all ${
                selectedVersion?.id === version.id
                  ? 'ring-2 ring-brand-400 ' +
                    statusColors[version.status as keyof typeof statusColors]
                  : statusColors[version.status as keyof typeof statusColors]
              }`}
            >
              {version.name}
            </button>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={onAddVersion}
            disabled={selectedBudget.isLocked}
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
            <span className="text-sm text-slate-600">{selectedVersion.lines.length} ligne(s)</span>
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
                onClick={onDownloadTemplate}
                className="text-slate-600 border-slate-200"
                title="Télécharger un template Excel"
              >
                <Download className="w-4 h-4 mr-2" />
                Template
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onShowImportModal}
                disabled={selectedBudget.isLocked || selectedVersion.status !== 'draft'}
                className="text-brand-600 border-brand-200"
              >
                <Upload className="w-4 h-4 mr-2" />
                Importer
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onExportBudget}
                disabled={selectedVersion.lines.length === 0}
                className="text-green-600 border-green-200"
              >
                <Download className="w-4 h-4 mr-2" />
                Exporter
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onShowNewLineModal}
                disabled={selectedBudget.isLocked || selectedVersion.status !== 'draft'}
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
                    <th className="text-left p-2 font-bold text-slate-700 bg-slate-50">Libellé</th>
                    {periods.map((period) => (
                      <th
                        key={period.id}
                        className="text-right p-2 font-bold text-slate-700 bg-slate-50"
                      >
                        {period.name}
                      </th>
                    ))}
                    <th className="text-right p-2 font-bold text-slate-700 bg-slate-50">Total</th>
                    <th className="text-center p-2 font-bold text-slate-700 bg-slate-50">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {selectedVersion.lines.map((line) => {
                    const total = periods.reduce(
                      (sum, period) => sum + (line.periodValues[period.id] || 0),
                      0
                    );

                    return (
                      <tr key={line.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-2 font-mono text-xs bg-white sticky left-0">
                          {line.accountCode}
                        </td>
                        <td className="p-2 text-xs">{line.accountLabel}</td>
                        {periods.map((period) => {
                          const cellId = `${line.id}-${period.id}`;
                          const value = line.periodValues[period.id] || 0;
                          const isEditing = editingCellId === cellId;
                          const isDisabled =
                            selectedBudget.isLocked ||
                            selectedVersion.status !== 'draft' ||
                            line.isLocked;

                          return (
                            <td key={period.id} className="p-1 text-right">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editingValue}
                                  onChange={(e) => onSetEditingValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') onCellSave(line.id, period.id);
                                    else if (e.key === 'Escape') onCellCancel();
                                  }}
                                  onBlur={() => onCellSave(line.id, period.id)}
                                  autoFocus
                                  className="w-full px-2 py-1 text-right border border-brand-300 rounded focus:ring-2 focus:ring-brand-400"
                                />
                              ) : (
                                <button
                                  onClick={() => onCellEdit(line.id, period.id, value)}
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
                            onClick={() => onDeleteLine(line.id)}
                            disabled={selectedBudget.isLocked || selectedVersion.status !== 'draft'}
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
              <button onClick={onCloseImportModal} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-600 mb-4">
                Importez un fichier Excel (.xlsx, .xls) ou CSV contenant les lignes budgétaires.
              </p>
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
                  onChange={onImportFile}
                  className="hidden"
                />
                <Button variant="outline" className="w-full" onClick={onDownloadTemplate}>
                  <Download className="w-4 h-4 mr-2" />
                  Télécharger un template
                </Button>
              </div>
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
              <button onClick={onCloseNewLineModal} className="text-slate-400 hover:text-slate-600">
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
                  onChange={(e) => onSetAccountSearchQuery(e.target.value)}
                  placeholder="Code ou libellé..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-400"
                />
              </div>
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {selectedChart?.accounts
                  .filter(
                    (acc) =>
                      acc.canReceiveEntries &&
                      (accountSearchQuery === '' ||
                        acc.code.toLowerCase().includes(accountSearchQuery.toLowerCase()) ||
                        acc.label.toLowerCase().includes(accountSearchQuery.toLowerCase()))
                  )
                  .map((account) => (
                    <button
                      key={account.code}
                      onClick={() => onAddLine(account.code)}
                      className="w-full text-left p-2 rounded hover:bg-brand-50 border border-transparent hover:border-brand-200 transition-colors"
                    >
                      <div className="font-mono text-sm font-bold text-slate-800">
                        {account.code}
                      </div>
                      <div className="text-sm text-slate-600">
                        {'  '.repeat(account.level - 1)}
                        {account.label}
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
