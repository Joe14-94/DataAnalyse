import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Edit2, ArrowLeft, Plus, Calendar, FileText, Brain, Trash2, X } from 'lucide-react';

interface ForecastEditorProps {
    selectedForecast: any;
    selectedVersion: any;
    selectedChart: any;
    editingCellId: string | null;
    editingValue: string;
    showNewLineModal: boolean;
    accountSearchQuery: string;
    onBack: () => void;
    onSelectVersion: (id: string) => void;
    onAddVersion: () => void;
    onToggleNewLineModal: (show: boolean) => void;
    onSetAccountSearch: (query: string) => void;
    onAddLine: (accountCode: string) => void;
    onDeleteLine: (lineId: string) => void;
    onCellEdit: (lineId: string, periodId: string, value: number) => void;
    onCellSave: (lineId: string, periodId: string) => void;
    onCellCancel: () => void;
    onSetEditValue: (value: string) => void;
    onGenerateMLPredictions: (lineId: string) => void;
    generatePeriods: (date: string) => { id: string, name: string }[];
}

export const ForecastEditor: React.FC<ForecastEditorProps> = ({
    selectedForecast,
    selectedVersion,
    selectedChart,
    editingCellId,
    editingValue,
    showNewLineModal,
    accountSearchQuery,
    onBack,
    onSelectVersion,
    onAddVersion,
    onToggleNewLineModal,
    onSetAccountSearch,
    onAddLine,
    onDeleteLine,
    onCellEdit,
    onCellSave,
    onCellCancel,
    onSetEditValue,
    onGenerateMLPredictions,
    generatePeriods
}) => {
    if (!selectedForecast) {
        return (
            <Card title="Éditeur de forecast" icon={<Edit2 className="w-5 h-5 text-brand-600" />}>
                <div className="text-center py-12 text-slate-500">
                    <Edit2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="mb-4">Sélectionnez un forecast pour commencer l'édition</p>
                    <Button onClick={onBack} className="bg-brand-600 hover:bg-brand-700">
                        Retour à la liste
                    </Button>
                </div>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {/* Forecast Header */}
            <Card>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="sm" onClick={onBack}>
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Retour
                        </Button>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                {selectedForecast.name}
                                {selectedForecast.isRolling && (
                                    <span className="text-xs px-2 py-1 rounded bg-brand-100 text-brand-700 font-bold">
                                        ROLLING
                                    </span>
                                )}
                            </h3>
                            <div className="flex items-center gap-3 text-sm text-slate-600 mt-1">
                                <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    Exercice {selectedForecast.fiscalYear}
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
                    {selectedForecast.versions.map((version: any) => {
                        const statusColors: Record<string, string> = {
                            draft: 'bg-gray-100 text-gray-700 border-gray-300',
                            submitted: 'bg-brand-100 text-brand-700 border-brand-300',
                            validated: 'bg-green-100 text-green-700 border-green-300',
                            locked: 'bg-purple-100 text-purple-700 border-purple-300'
                        };
                        return (
                            <button
                                key={version.id}
                                onClick={() => onSelectVersion(version.id)}
                                className={`px-3 py-1 rounded border text-sm font-bold transition-all ${
                                    selectedVersion?.id === version.id
                                        ? 'ring-2 ring-brand-400 ' + statusColors[version.status]
                                        : statusColors[version.status]
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
                        disabled={selectedForecast.isLocked}
                    >
                        <Plus className="w-4 h-4 mr-1" />
                        Nouvelle version
                    </Button>
                </div>
            </Card>

            {/* Forecast Grid */}
            {selectedVersion && (
                <Card>
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="font-bold text-slate-800">Lignes de forecast</h4>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onToggleNewLineModal(true)}
                                disabled={selectedForecast.isLocked || selectedVersion.status !== 'draft'}
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
                            <p>Aucune ligne de forecast</p>
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
                                        <th className="text-left p-2 font-bold text-slate-700 bg-slate-50">
                                            Libellé
                                        </th>
                                        <th className="text-left p-2 font-bold text-slate-700 bg-slate-50">
                                            Méthode
                                        </th>
                                        {generatePeriods(selectedVersion.referenceDate).map(period => (
                                            <th key={period.id} className="text-right p-2 font-bold text-slate-700 bg-slate-50">
                                                {period.name}
                                            </th>
                                        ))}
                                        <th className="text-right p-2 font-bold text-slate-700 bg-slate-50">
                                            Total
                                        </th>
                                        <th className="text-center p-2 font-bold text-slate-700 bg-slate-50">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedVersion.lines.map((line: any) => {
                                        const periods = generatePeriods(selectedVersion.referenceDate);
                                        const total = periods.reduce((sum, period) =>
                                            sum + (line.forecastValues[period.id] || 0), 0
                                        );

                                        const methodLabels: Record<string, string> = {
                                            manual: '✋ Manuel',
                                            copy_actual: '📋 Copie',
                                            driver_based: '🎯 Inducteur',
                                            ml_prediction: '🤖 ML',
                                            trend: '📈 Tendance',
                                            seasonal: '🌊 Saisonnier'
                                        };

                                        return (
                                            <tr key={line.id} className="border-b border-slate-100 hover:bg-slate-50">
                                                <td className="p-2 font-mono text-xs bg-white sticky left-0">
                                                    {line.accountCode}
                                                </td>
                                                <td className="p-2 text-xs">
                                                    {line.accountLabel}
                                                </td>
                                                <td className="p-2 text-xs">
                                                    <span className="px-2 py-1 rounded bg-slate-100 text-slate-700 font-bold">
                                                        {methodLabels[line.method]}
                                                    </span>
                                                </td>
                                                {periods.map(period => {
                                                    const cellId = `${line.id}-${period.id}`;
                                                    const value = line.forecastValues[period.id] || 0;
                                                    const isEditing = editingCellId === cellId;
                                                    const isDisabled = selectedForecast.isLocked ||
                                                                     selectedVersion.status !== 'draft' ||
                                                                     line.isLocked;

                                                    const hasMlPrediction = line.mlPrediction &&
                                                        line.mlPrediction.lowerBound[period.id] !== undefined;

                                                    return (
                                                        <td
                                                            key={period.id}
                                                            className="p-1 text-right"
                                                            title={hasMlPrediction ?
                                                                `Intervalle: ${line.mlPrediction!.lowerBound[period.id].toFixed(0)} - ${line.mlPrediction!.upperBound[period.id].toFixed(0)}`
                                                                : undefined}
                                                        >
                                                            {isEditing ? (
                                                                <input
                                                                    type="text"
                                                                    value={editingValue}
                                                                    onChange={(e) => onSetEditValue(e.target.value)}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') {
                                                                            onCellSave(line.id, period.id);
                                                                        } else if (e.key === 'Escape') {
                                                                            onCellCancel();
                                                                        }
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
                                                                    } ${value !== 0 ? 'font-bold' : ''} ${
                                                                        hasMlPrediction ? 'bg-purple-50' : ''
                                                                    }`}
                                                                >
                                                                    {value.toLocaleString('fr-FR', {
                                                                        minimumFractionDigits: 0,
                                                                        maximumFractionDigits: 0
                                                                    })}
                                                                </button>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                                <td className="p-2 text-right font-bold text-slate-800 bg-slate-50">
                                                    {total.toLocaleString('fr-FR', {
                                                        minimumFractionDigits: 0,
                                                        maximumFractionDigits: 0
                                                    })}
                                                </td>
                                                <td className="p-2 text-center">
                                                    <div className="flex items-center gap-1">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => onGenerateMLPredictions(line.id)}
                                                            disabled={!line.actualValues || Object.keys(line.actualValues).length < 3}
                                                            className="text-purple-600 border-purple-200"
                                                            title="Générer prédictions ML"
                                                        >
                                                            <Brain className="w-3 h-3" />
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => onDeleteLine(line.id)}
                                                            disabled={selectedForecast.isLocked || selectedVersion.status !== 'draft'}
                                                            className="text-red-600 border-red-200"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </Button>
                                                    </div>
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

            {/* New Line Modal */}
            {showNewLineModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-800">Ajouter une ligne de forecast</h3>
                            <button
                                onClick={() => onToggleNewLineModal(false)}
                                className="text-slate-400 hover:text-slate-600"
                            >
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
                                    onChange={(e) => onSetAccountSearch(e.target.value)}
                                    placeholder="Code ou libellé..."
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-400"
                                />
                            </div>
                            <div className="space-y-1 max-h-96 overflow-y-auto">
                                {selectedChart?.accounts
                                    .filter((acc: any) =>
                                        acc.canReceiveEntries &&
                                        (accountSearchQuery === '' ||
                                            acc.code.toLowerCase().includes(accountSearchQuery.toLowerCase()) ||
                                            acc.label.toLowerCase().includes(accountSearchQuery.toLowerCase()))
                                    )
                                    .map((account: any) => (
                                        <button
                                            key={account.code}
                                            onClick={() => onAddLine(account.code)}
                                            className="w-full text-left p-2 rounded hover:bg-brand-50 border border-transparent hover:border-brand-200 transition-colors"
                                        >
                                            <div className="font-mono text-sm font-bold text-slate-800">
                                                {account.code}
                                            </div>
                                            <div className="text-sm text-slate-600">
                                                {'  '.repeat(account.level - 1)}{account.label}
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
