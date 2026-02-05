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
    onSourcesChange: (sources: TemporalComparisonSource[], referenceId: string, extraConfig?: any) => void;
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
        (currentSources || []).map(s => s.batchId)
    );
    const [referenceId, setReferenceId] = useState<string>(
        (currentSources || []).find(s => s.label.includes('2024'))?.id || ''
    );

    const [comparisonMode, setComparisonMode] = useState<'mtd' | 'ytd'>(
        'mtd'
    );

    const [comparisonMonth, setComparisonMonth] = useState<number>(
        new Date().getMonth() + 1
    );

    // Initialize labels with proper format for existing sources
    const [labels, setLabels] = useState<{ [batchId: string]: string }>(() => {
        const initialLabels: { [batchId: string]: string } = {};
        (currentSources || []).forEach(s => {
            const batch = batches.find(b => b.id === s.batchId);
            if (batch) {
                // Force the new format for all labels
                initialLabels[s.batchId] = `Import: ${formatDateFr(batch.date)}`;
            } else {
                // Fallback to existing label if batch not found
                initialLabels[s.batchId] = s.label;
            }
        });
        return initialLabels;
    });

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

            // Auto-generate label with import date for uniqueness
            const batch = datasetBatches.find(b => b.id === batchId);
            if (batch) {
                const year = detectYearForBatch(batch);
                const autoLabel = `Import: ${formatDateFr(batch.date)}`;
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

        // Update configuration with new modes
        const configUpdates = {
            comparisonMode,
            comparisonMonth,
            periodFilter: comparisonMode === 'ytd'
                ? { startMonth: 1, endMonth: comparisonMonth }
                : { startMonth: comparisonMonth, endMonth: comparisonMonth }
        };

        // We need a way to pass these extra config items.
        // Let's modify onSourcesChange signature if needed or just handle it in PivotTable.
        onSourcesChange(sources, referenceId, configUpdates);
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
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {/* New: Period Selection */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                           <Calendar className="w-4 h-4 text-brand-600" />
                           Période de comparaison
                        </h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase">Mode de cumul</label>
                                <div className="flex bg-slate-100 p-1 rounded-lg">
                                    <button
                                        onClick={() => setComparisonMode('mtd')}
                                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${comparisonMode === 'mtd' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500'}`}
                                    >
                                        Mois (MTD)
                                    </button>
                                    <button
                                        onClick={() => setComparisonMode('ytd')}
                                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${comparisonMode === 'ytd' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500'}`}
                                    >
                                        Cumul (YTD)
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase">Mois cible</label>
                                <select
                                    className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-sm font-medium focus:ring-2 focus:ring-brand-500"
                                    value={comparisonMonth}
                                    onChange={(e) => setComparisonMonth(parseInt(e.target.value))}
                                >
                                    {['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'].map((m, i) => (
                                        <option key={i+1} value={i+1}>{m}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <p className="mt-3 text-xs text-slate-500 italic">
                            {comparisonMode === 'ytd'
                                ? "Compare les données du 1er janvier jusqu'au mois sélectionné."
                                : "Compare uniquement les données du mois sélectionné."}
                        </p>
                    </div>

                    {/* Instructions */}
                    <div className="bg-brand-50 border border-brand-200 rounded-lg p-3">
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
                                                ? 'border-brand-400 bg-brand-50'
                                                : 'border-slate-200 hover:border-brand-300 hover:bg-slate-50'
                                        }`}
                                        onClick={() => toggleBatch(batch.id)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                                        isSelected ? 'border-brand-600 bg-brand-600' : 'border-slate-300'
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
                                                            className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
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
                                                        <span className="text-xs font-bold text-brand-600">Référence</span>
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
                                            {isRef && <span className="px-2 py-0.5 bg-brand-100 text-brand-700 rounded text-xs font-bold">RÉFÉRENCE</span>}
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
                            className="px-4 py-2 text-sm font-bold bg-brand-600 text-white rounded hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Appliquer
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
