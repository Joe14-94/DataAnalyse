import React, { useState, useMemo } from 'react';
import { X, Calendar, Database, Check } from 'lucide-react';
import { Dataset, ImportBatch, TemporalComparisonSource } from '../../types';
import { formatDateFr } from '../../utils';
import { extractYearFromDate } from '../../utils/temporalComparison';

interface TemporalSourceModalProps {
    isOpen: boolean;
    onClose: () => void;
    primaryDataset: Dataset | null;
    batches: ImportBatch[];
    currentSources: TemporalComparisonSource[];
    onSourcesChange: (sources: TemporalComparisonSource[], referenceId: string) => void;
}

export const TemporalSourceModal: React.FC<TemporalSourceModalProps> = ({
    isOpen,
    onClose,
    primaryDataset,
    batches,
    currentSources,
    onSourcesChange
}) => {
    const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>(
        currentSources.map(s => s.batchId)
    );
    const [referenceId, setReferenceId] = useState<string>(
        currentSources.find(s => s.label.includes('2024'))?.id || ''
    );
    const [labels, setLabels] = useState<{ [batchId: string]: string }>(
        Object.fromEntries(currentSources.map(s => [s.batchId, s.label]))
    );

    // Get batches for primary dataset
    const datasetBatches = useMemo(() => {
        if (!primaryDataset) return [];
        return batches
            .filter(b => b.datasetId === primaryDataset.id)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [batches, primaryDataset]);

    // Auto-detect year from batch data
    const detectYearForBatch = (batch: ImportBatch): number | undefined => {
        if (batch.rows.length === 0) return undefined;

        // Try to find a date column
        const dateFields = ['Date écriture', 'Date', 'date', 'DATE'];
        for (const field of dateFields) {
            if (batch.rows[0][field]) {
                const year = extractYearFromDate(batch.rows[0][field]);
                if (year) return year;
            }
        }

        // Fallback to batch import date
        return new Date(batch.date).getFullYear();
    };

    const toggleBatch = (batchId: string) => {
        if (selectedBatchIds.includes(batchId)) {
            setSelectedBatchIds(prev => prev.filter(id => id !== batchId));
        } else {
            if (selectedBatchIds.length >= 4) {
                alert('Maximum 4 sources');
                return;
            }

            // Auto-generate label
            const batch = datasetBatches.find(b => b.id === batchId);
            if (batch) {
                const year = detectYearForBatch(batch);
                const autoLabel = year ? `${year}` : formatDateFr(batch.date);
                setLabels(prev => ({ ...prev, [batchId]: autoLabel }));
            }

            setSelectedBatchIds(prev => [...prev, batchId]);
        }
    };

    const handleSave = () => {
        if (selectedBatchIds.length < 2) {
            alert('Sélectionnez au moins 2 sources à comparer');
            return;
        }

        if (!referenceId) {
            alert('Sélectionnez une source de référence');
            return;
        }

        // Build sources
        const sources: TemporalComparisonSource[] = selectedBatchIds.map(batchId => {
            const batch = datasetBatches.find(b => b.id === batchId)!;
            const label = labels[batchId] || formatDateFr(batch.date);
            const year = detectYearForBatch(batch);

            return {
                id: `temp_${batchId}`,
                datasetId: primaryDataset!.id,
                batchId,
                label,
                importDate: new Date(batch.date).getTime(),
                year
            };
        });

        onSourcesChange(sources, referenceId);
        onClose();
    };

    if (!isOpen || !primaryDataset) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-purple-600" />
                        <h2 className="text-lg font-bold text-slate-800">Configuration Comparaison Temporelle</h2>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Instructions */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-slate-700">
                            <strong>1.</strong> Sélectionnez 2 à 4 imports à comparer<br />
                            <strong>2.</strong> Nommez chaque source (ex: "2024", "2025", "Budget 2026")<br />
                            <strong>3.</strong> Choisissez la source de référence pour calculer les écarts
                        </p>
                    </div>

                    {/* Dataset Info */}
                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded">
                        <Database className="w-4 h-4 text-slate-500" />
                        <span className="text-sm font-bold text-slate-700">Dataset: {primaryDataset.name}</span>
                        <span className="text-xs text-slate-500">({datasetBatches.length} imports disponibles)</span>
                    </div>

                    {/* Batch Selection */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-700 mb-2">Imports disponibles</h3>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {datasetBatches.map(batch => {
                                const isSelected = selectedBatchIds.includes(batch.id);
                                const year = detectYearForBatch(batch);

                                return (
                                    <div
                                        key={batch.id}
                                        className={`p-3 border rounded-lg cursor-pointer transition-all ${
                                            isSelected
                                                ? 'border-blue-400 bg-blue-50'
                                                : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                                        }`}
                                        onClick={() => toggleBatch(batch.id)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                                        isSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                                                    }`}>
                                                        {isSelected && <Check className="w-3 h-3 text-white" />}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-slate-700">
                                                            Import du {formatDateFr(batch.date)}
                                                        </div>
                                                        <div className="text-xs text-slate-500">
                                                            {batch.rows.length} lignes
                                                            {year && ` • Année détectée: ${year}`}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Label Input */}
                                                {isSelected && (
                                                    <div className="mt-2 ml-7">
                                                        <label className="text-xs font-bold text-slate-600 block mb-1">
                                                            Nom de cette source
                                                        </label>
                                                        <input
                                                            type="text"
                                                            className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                                            placeholder="Ex: 2024, Budget 2025..."
                                                            value={labels[batch.id] || ''}
                                                            onChange={(e) => {
                                                                e.stopPropagation();
                                                                setLabels(prev => ({ ...prev, [batch.id]: e.target.value }));
                                                            }}
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Reference Radio */}
                                            {isSelected && (
                                                <div className="ml-4">
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name="reference"
                                                            checked={referenceId === `temp_${batch.id}`}
                                                            onChange={() => setReferenceId(`temp_${batch.id}`)}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="w-4 h-4"
                                                        />
                                                        <span className="text-xs font-bold text-blue-600">Référence</span>
                                                    </label>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Summary */}
                    {selectedBatchIds.length > 0 && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <div className="text-sm font-bold text-green-800 mb-2">
                                Résumé de la comparaison
                            </div>
                            <div className="text-xs text-green-700 space-y-1">
                                {selectedBatchIds.map(batchId => {
                                    const batch = datasetBatches.find(b => b.id === batchId);
                                    const label = labels[batchId] || formatDateFr(batch?.date || '');
                                    const isRef = referenceId === `temp_${batchId}`;

                                    return (
                                        <div key={batchId} className="flex items-center gap-2">
                                            <span className="font-bold">{label}</span>
                                            {isRef && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-bold">RÉFÉRENCE</span>}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-200 flex justify-between items-center">
                    <div className="text-xs text-slate-500">
                        {selectedBatchIds.length} / 4 sources sélectionnées
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded"
                        >
                            Annuler
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={selectedBatchIds.length < 2 || !referenceId}
                            className="px-4 py-2 text-sm font-bold bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Appliquer
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
