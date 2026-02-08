import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Edit2, ArrowLeft, Plus, Calendar, Download, Upload, FileText, Trash2, X, AlertCircle } from 'lucide-react';
import { Budget, BudgetVersion, ChartOfAccounts, FiscalCalendar } from '../../types';

interface BudgetEditorProps {
    selectedBudget: Budget | null;
    selectedVersion: BudgetVersion | null;
    selectedChart: ChartOfAccounts | null;
    selectedCalendar: FiscalCalendar | null;
    editingCellId: string | null;
    editingValue: string;
    onBack: () => void;
    onSetVersion: (id: string) => void;
    onAddVersion: () => void;
    onDownloadTemplate: () => void;
    onShowImport: () => void;
    onExport: () => void;
    onShowNewLine: () => void;
    onCellEdit: (lineId: string, periodId: string, value: number) => void;
    onCellSave: (lineId: string, periodId: string) => void;
    onCellCancel: () => void;
    onEditingValueChange: (value: string) => void;
    onDeleteLine: (lineId: string) => void;
}

export const BudgetEditor: React.FC<BudgetEditorProps> = ({
    selectedBudget,
    selectedVersion,
    selectedChart,
    selectedCalendar,
    editingCellId,
    editingValue,
    onBack,
    onSetVersion,
    onAddVersion,
    onDownloadTemplate,
    onShowImport,
    onExport,
    onShowNewLine,
    onCellEdit,
    onCellSave,
    onCellCancel,
    onEditingValueChange,
    onDeleteLine
}) => {
    if (!selectedBudget) {
        return (
            <Card title="Éditeur budgétaire" icon={<Edit2 className="w-5 h-5 text-brand-600" />}>
                <div className="text-center py-12 text-slate-500">
                    <Edit2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="mb-4">Sélectionnez un budget dans la liste pour commencer l'édition</p>
                    <Button onClick={onBack} className="bg-brand-600 hover:bg-brand-700">
                        Retour à la liste
                    </Button>
                </div>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <Card>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="sm" onClick={onBack}>
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Retour
                        </Button>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                {selectedBudget.name}
                                {selectedBudget.isLocked && <span title="Verrouillé">🔒</span>}
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

                <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-bold text-slate-700">Version:</span>
                    {selectedBudget.versions.map(version => {
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
                                onClick={() => onSetVersion(version.id)}
                                className={`px-3 py-1 rounded border text-sm font-bold transition-all ${
                                    selectedVersion?.id === version.id
                                        ? 'ring-2 ring-brand-400 ' + statusColors[version.status as keyof typeof statusColors]
                                        : statusColors[version.status as keyof typeof statusColors]
                                }`}
                            >
                                {version.name}
                            </button>
                        );
                    })}
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
                        <span className="text-sm text-slate-600">
                            {selectedVersion.lines.length} ligne(s)
                        </span>
                    </div>
                )}
            </Card>

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
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Template
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onShowImport}
                                disabled={selectedBudget.isLocked || selectedVersion.status !== 'draft'}
                                className="text-brand-600 border-brand-200"
                            >
                                <Upload className="w-4 h-4 mr-2" />
                                Importer
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onExport}
                                disabled={selectedVersion.lines.length === 0}
                                className="text-green-600 border-green-200"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Exporter
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onShowNewLine}
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
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b-2 border-slate-300">
                                        <th className="text-left p-2 font-bold text-slate-700 bg-slate-50 sticky left-0">Compte</th>
                                        <th className="text-left p-2 font-bold text-slate-700 bg-slate-50">Libellé</th>
                                        {(selectedCalendar?.periods || []).map(period => (
                                            <th key={period.id} className="text-right p-2 font-bold text-slate-700 bg-slate-50">{period.name}</th>
                                        ))}
                                        <th className="text-right p-2 font-bold text-slate-700 bg-slate-50">Total</th>
                                        <th className="text-center p-2 font-bold text-slate-700 bg-slate-50">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedVersion.lines.map(line => {
                                        const periods = selectedCalendar?.periods || [];
                                        const total = periods.reduce((sum, period) => sum + (line.periodValues[period.id] || 0), 0);

                                        return (
                                            <tr key={line.id} className="border-b border-slate-100 hover:bg-slate-50">
                                                <td className="p-2 font-mono text-xs bg-white sticky left-0">{line.accountCode}</td>
                                                <td className="p-2 text-xs">{line.accountLabel}</td>
                                                {periods.map(period => {
                                                    const cellId = `${line.id}-${period.id}`;
                                                    const value = line.periodValues[period.id] || 0;
                                                    const isEditing = editingCellId === cellId;
                                                    const isDisabled = selectedBudget.isLocked || selectedVersion.status !== 'draft' || line.isLocked;

                                                    return (
                                                        <td key={period.id} className="p-1 text-right">
                                                            {isEditing ? (
                                                                <input
                                                                    type="text"
                                                                    value={editingValue}
                                                                    onChange={(e) => onEditingValueChange(e.target.value)}
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
                                                                    className={`w-full px-2 py-1 rounded text-right ${isDisabled ? 'cursor-not-allowed text-slate-400' : 'hover:bg-brand-50 cursor-pointer'} ${value !== 0 ? 'font-bold' : ''}`}
                                                                >
                                                                    {value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                </button>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                                <td className="p-2 text-right font-bold text-slate-800 bg-slate-50">
                                                    {total.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
        </div>
    );
};
