import React, { useState, useMemo } from 'react';
import { X, Database, Link as LinkIcon, Plus, Trash2, AlertCircle, Check } from 'lucide-react';
import { generateId } from '../../utils';

interface PivotSourceConfig {
    id: string;
    datasetId: string;
    isPrimary: boolean;
    joinConfig?: {
        primaryKey: string;
        secondaryKey: string;
        joinType?: 'left' | 'inner';
    };
    color: string;
}

interface SourceManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    sources: PivotSourceConfig[];
    datasets: any[];
    batches: any[];
    primaryDataset: any | null;
    onSourcesChange: (sources: PivotSourceConfig[]) => void;
}

const SOURCE_COLORS = ['blue', 'indigo', 'purple', 'pink', 'teal', 'orange'];

const SOURCE_COLOR_CLASSES: Record<string, { border: string, text: string, bg: string }> = {
    blue: { border: 'border-brand-500', text: 'text-brand-700', bg: 'bg-brand-50' },
    indigo: { border: 'border-brand-500', text: 'text-brand-700', bg: 'bg-brand-50' },
    purple: { border: 'border-purple-500', text: 'text-purple-700', bg: 'bg-purple-50' },
    pink: { border: 'border-pink-500', text: 'text-pink-700', bg: 'bg-pink-50' },
    teal: { border: 'border-teal-500', text: 'text-teal-700', bg: 'bg-teal-50' },
    orange: { border: 'border-orange-500', text: 'text-orange-700', bg: 'bg-orange-50' }
};

export const SourceManagementModal: React.FC<SourceManagementModalProps> = ({
    isOpen,
    onClose,
    sources,
    datasets,
    batches,
    primaryDataset,
    onSourcesChange
}) => {
    // CRITICAL: Early return must be BEFORE all hooks to avoid React error #310
    if (!isOpen) return null;

    const [localSources, setLocalSources] = useState<PivotSourceConfig[]>(sources);
    const [isAddingSource, setIsAddingSource] = useState(false);
    const [newSource, setNewSource] = useState<{
        targetId: string;
        key1: string;
        key2: string;
        joinType: 'left' | 'inner';
    }>({ targetId: '', key1: '', key2: '', joinType: 'left' });

    const handleAddSource = () => {
        const isPrimary = localSources.length === 0;

        if (isPrimary) {
            if (!newSource.targetId) return;

            const source: PivotSourceConfig = {
                id: generateId(),
                datasetId: newSource.targetId,
                isPrimary: true,
                color: SOURCE_COLORS[0]
            };
            setLocalSources([source]);
        } else {
            if (!newSource.targetId || !newSource.key1 || !newSource.key2) return;

            const source: PivotSourceConfig = {
                id: generateId(),
                datasetId: newSource.targetId,
                isPrimary: false,
                joinConfig: {
                    primaryKey: newSource.key1,
                    secondaryKey: newSource.key2,
                    joinType: newSource.joinType
                },
                color: SOURCE_COLORS[localSources.length % SOURCE_COLORS.length]
            };
            setLocalSources(prev => [...prev, source]);
        }

        setIsAddingSource(false);
        setNewSource({ targetId: '', key1: '', key2: '', joinType: 'left' });
    };

    const handleRemoveSource = (sourceId: string) => {
        const source = localSources.find(s => s.id === sourceId);
        if (source?.isPrimary) {
            if (window.confirm("Supprimer la source principale réinitialisera tout. Continuer ?")) {
                setLocalSources([]);
            }
        } else {
            setLocalSources(prev => prev.filter(s => s.id !== sourceId));
        }
    };

    const handleValidate = () => {
        onSourcesChange(localSources);
        onClose();
    };

    const primarySource = localSources.find(s => s.isPrimary);
    const secondarySources = localSources.filter(s => !s.isPrimary);

    // Calculate primaryDataset from local sources to support adding secondary sources immediately
    const localPrimaryDataset = primarySource ? datasets.find(d => d.id === primarySource.datasetId) : primaryDataset;

    // --- PREVIEW LOGIC ---
    const previewStats = useMemo(() => {
        if (!newSource.targetId || !newSource.key1 || !newSource.key2 || !primarySource) return null;

        const primaryDSBatches = batches.filter(b => b.datasetId === primarySource.datasetId);
        const targetBatches = batches.filter(b => b.datasetId === newSource.targetId);

        if (primaryDSBatches.length === 0 || targetBatches.length === 0) return null;

        const primaryRows = primaryDSBatches[primaryDSBatches.length - 1].rows;
        const targetRows = targetBatches[targetBatches.length - 1].rows;

        const targetKeys = new Set(targetRows.map((r: any) => String(r[newSource.key2] || '').toLowerCase().trim()));

        let matchCount = 0;
        primaryRows.forEach((r: any) => {
            const val = String(r[newSource.key1] || '').toLowerCase().trim();
            if (val && targetKeys.has(val)) matchCount++;
        });

        const matchRate = (matchCount / primaryRows.length) * 100;

        return {
            matchCount,
            totalPrimary: primaryRows.length,
            matchRate,
            estimatedRows: newSource.joinType === 'inner' ? matchCount : primaryRows.length,
            quality: matchRate > 90 ? 'high' : matchRate > 70 ? 'medium' : 'low'
        };
    }, [newSource, localSources, batches, primarySource]);

    const getQualityColor = (quality: string) => {
        if (quality === 'high') return 'text-green-600';
        if (quality === 'medium') return 'text-orange-600';
        return 'text-red-600';
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                        <Database className="w-6 h-6 text-brand-600" />
                        <h2 className="text-xl font-bold text-slate-800">Gérer les sources de données</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* Sources existantes */}
                    {localSources.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-bold text-slate-600 uppercase">Sources configurées</h3>

                            {localSources.map(src => {
                                const ds = datasets.find(d => d.id === src.datasetId);
                                if (!ds) return null;

                                const colorClasses = SOURCE_COLOR_CLASSES[src.color] || SOURCE_COLOR_CLASSES.blue;
                                const srcBatches = batches.filter(b => b.datasetId === src.datasetId);
                                const latestBatch = srcBatches.length > 0 ? srcBatches[srcBatches.length - 1] : null;

                                return (
                                    <div
                                        key={src.id}
                                        className={`p-4 border-l-4 ${colorClasses.border} ${colorClasses.bg} rounded-r-lg`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    {src.isPrimary ? (
                                                        <Database className="w-4 h-4 text-brand-600" />
                                                    ) : (
                                                        <LinkIcon className="w-4 h-4 text-brand-600" />
                                                    )}
                                                    <span className={`font-bold ${colorClasses.text}`}>
                                                        {ds.name} {src.isPrimary && '(Principal)'}
                                                    </span>
                                                </div>

                                                {latestBatch && (
                                                    <div className="text-xs text-slate-500 mb-2">
                                                        Import: {latestBatch.date.split('T')[0]} • {latestBatch.rows.length} lignes
                                                    </div>
                                                )}

                                                {!src.isPrimary && src.joinConfig && (
                                                    <div className="text-xs text-slate-600 space-y-1">
                                                        <div>
                                                            <span className="font-semibold">{src.joinConfig.joinType?.toUpperCase() || 'LEFT'} JOIN</span>
                                                            {' • '}
                                                            <span className="font-mono">{src.joinConfig.primaryKey}</span>
                                                            {' = '}
                                                            <span className="font-mono">{src.joinConfig.secondaryKey}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <button
                                                onClick={() => handleRemoveSource(src.id)}
                                                className="p-1.5 hover:bg-red-100 text-slate-400 hover:text-red-600 rounded transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Formulaire d'ajout */}
                    {!isAddingSource ? (
                        <button
                            onClick={() => setIsAddingSource(true)}
                            className="w-full py-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:text-brand-600 hover:border-brand-400 hover:bg-brand-50 transition-colors flex items-center justify-center gap-2 font-medium"
                        >
                            <Plus className="w-5 h-5" />
                            {localSources.length === 0 ? 'Définir la source principale' : 'Ajouter une source'}
                        </button>
                    ) : (
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                            <h4 className="text-sm font-bold text-slate-700">
                                {localSources.length === 0 ? 'Source principale' : 'Nouvelle source'}
                            </h4>

                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Dataset</label>
                                <select
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                    value={newSource.targetId}
                                    onChange={e => setNewSource({ ...newSource, targetId: e.target.value })}
                                >
                                    <option value="">-- Sélectionner --</option>
                                    {datasets.filter(d => !localSources.some(s => s.datasetId === d.id)).map(d => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                            </div>

                            {localSources.length > 0 && newSource.targetId && (
                                <>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">Type de jointure</label>
                                        <select
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                            value={newSource.joinType}
                                            onChange={e => setNewSource({ ...newSource, joinType: e.target.value as 'left' | 'inner' })}
                                        >
                                            <option value="left">LEFT JOIN (toutes les lignes primaires)</option>
                                            <option value="inner">INNER JOIN (seulement les correspondances)</option>
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">Clé principale</label>
                                            <select
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                                value={newSource.key1}
                                                onChange={e => setNewSource({ ...newSource, key1: e.target.value })}
                                            >
                                                <option value="">-- Choisir --</option>
                                                {localPrimaryDataset?.fields.map((f: string) => (
                                                    <option key={f} value={f}>{f}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">Clé cible</label>
                                            <select
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                                value={newSource.key2}
                                                onChange={e => setNewSource({ ...newSource, key2: e.target.value })}
                                            >
                                                <option value="">-- Choisir --</option>
                                                {datasets.find(d => d.id === newSource.targetId)?.fields.map((f: string) => (
                                                    <option key={f} value={f}>{f}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {previewStats && (
                                        <div className="p-3 bg-white rounded-lg border border-slate-200 animate-in fade-in slide-in-from-top-1">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-bold text-slate-500 uppercase">Prévisualisation</span>
                                                <span className={`text-xs font-bold ${getQualityColor(previewStats.quality)} flex items-center gap-1`}>
                                                    {previewStats.quality === 'high' ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                                                    Qualité : {previewStats.quality === 'high' ? 'Excellente' : previewStats.quality === 'medium' ? 'Moyenne' : 'Faible'}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div className="flex flex-col">
                                                    <span className="text-slate-500 text-[0.85em] uppercase font-bold">Correspondance</span>
                                                    <span className="font-bold text-slate-700">{previewStats.matchCount} / {previewStats.totalPrimary} ({previewStats.matchRate.toFixed(1)}%)</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-slate-500 text-[0.85em] uppercase font-bold">Lignes résultantes</span>
                                                    <span className="font-bold text-slate-700">~{previewStats.estimatedRows} lignes</span>
                                                </div>
                                            </div>
                                            {previewStats.quality === 'low' && (
                                                <p className="mt-2 text-[0.85em] text-red-500 italic flex items-start gap-1">
                                                    <AlertCircle className="w-3 h-3 shrink-0" />
                                                    Peu de correspondances trouvées. Vérifiez que les clés sélectionnées contiennent des données similaires.
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    onClick={() => {
                                        setIsAddingSource(false);
                                        setNewSource({ targetId: '', key1: '', key2: '', joinType: 'left' });
                                    }}
                                    className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleAddSource}
                                    disabled={!newSource.targetId || (localSources.length > 0 && (!newSource.key1 || !newSource.key2))}
                                    className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                                >
                                    <Check className="w-4 h-4" />
                                    Ajouter
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-slate-50">
                    <div className="text-sm text-slate-600">
                        {localSources.length === 0 ? (
                            <span className="flex items-center gap-2 text-amber-600">
                                <AlertCircle className="w-4 h-4" />
                                Aucune source configurée
                            </span>
                        ) : (
                            <span>{localSources.length} source(s) configurée(s)</span>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                            Annuler
                        </button>
                        <button
                            onClick={handleValidate}
                            className="px-6 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium"
                        >
                            Valider
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
