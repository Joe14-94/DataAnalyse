import React, { useState, useMemo, useEffect } from 'react';
import { Database, Link as LinkIcon, Plus, Trash2, AlertCircle, Check } from 'lucide-react';
import { generateId } from '../../utils';
import { Modal } from '../ui/Modal';

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
    indigo: { border: 'border-indigo-500', text: 'text-indigo-700', bg: 'bg-indigo-50' },
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
    const [localSources, setLocalSources] = useState<PivotSourceConfig[]>(sources);
    const [isAddingSource, setIsAddingSource] = useState(false);
    const [newSource, setNewSource] = useState<{
        targetId: string;
        key1: string;
        key2: string;
        joinType: 'left' | 'inner';
    }>({ targetId: '', key1: '', key2: '', joinType: 'left' });

    useEffect(() => {
        if (isOpen) {
            setLocalSources(sources);
        }
    }, [isOpen, sources]);

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
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Gérer les sources de données"
            icon={<Database className="w-6 h-6" />}
            maxWidth="2xl"
            footer={
                <>
                    <div className="text-sm text-txt-secondary mr-auto">
                        {localSources.length === 0 ? (
                            <span className="flex items-center gap-2 text-warning-text">
                                <AlertCircle className="w-4 h-4" />
                                Aucune source configurée
                            </span>
                        ) : (
                            <span>{localSources.length} source(s) configurée(s)</span>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="px-ds-4 py-ds-2 text-sm text-txt-secondary hover:bg-canvas rounded-lg transition-colors"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleValidate}
                        className="px-ds-6 py-ds-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium"
                    >
                        Valider
                    </button>
                </>
            }
        >
            <div className="space-y-ds-4">
                {/* Sources existantes */}
                {localSources.length > 0 && (
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-txt-secondary uppercase">Sources configurées</h3>

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
                                                    <LinkIcon className="w-4 h-4 text-indigo-600" />
                                                )}
                                                <span className={`font-bold ${colorClasses.text}`}>
                                                    {ds.name} {src.isPrimary && '(Principal)'}
                                                </span>
                                            </div>

                                            {latestBatch && (
                                                <div className="text-xs text-txt-muted mb-2">
                                                    Import: {latestBatch.date.split('T')[0]} • {latestBatch.rows.length} lignes
                                                </div>
                                            )}

                                            {!src.isPrimary && src.joinConfig && (
                                                <div className="text-xs text-txt-secondary space-y-1">
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
                                            className="p-1.5 hover:bg-danger-bg text-txt-muted hover:text-danger-text rounded transition-colors"
                                            aria-label="Supprimer la source"
                                            title="Supprimer la source"
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
                        className="w-full py-ds-3 border-2 border-dashed border-border-default rounded-lg text-txt-secondary hover:text-brand-600 hover:border-brand-400 hover:bg-brand-50 transition-colors flex items-center justify-center gap-2 font-medium"
                    >
                        <Plus className="w-5 h-5" />
                        {localSources.length === 0 ? 'Définir la source principale' : 'Ajouter une source'}
                    </button>
                ) : (
                    <div className="p-4 bg-canvas rounded-lg border border-border-default space-y-3">
                        <h4 className="text-sm font-bold text-txt-main">
                            {localSources.length === 0 ? 'Source principale' : 'Nouvelle source'}
                        </h4>

                        <div>
                            <label className="block text-xs font-medium text-txt-secondary mb-1">Dataset</label>
                            <select
                                className="w-full px-3 py-2 border border-border-default rounded-lg bg-surface text-txt-main text-sm focus:ring-2 focus:ring-brand-500 outline-none"
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
                                    <label className="block text-xs font-medium text-txt-secondary mb-1">Type de jointure</label>
                                    <select
                                        className="w-full px-3 py-2 border border-border-default rounded-lg bg-surface text-txt-main text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                                        value={newSource.joinType}
                                        onChange={e => setNewSource({ ...newSource, joinType: e.target.value as 'left' | 'inner' })}
                                    >
                                        <option value="left">LEFT JOIN (toutes les lignes primaires)</option>
                                        <option value="inner">INNER JOIN (seulement les correspondances)</option>
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-txt-secondary mb-1">Clé principale</label>
                                        <select
                                            className="w-full px-3 py-2 border border-border-default rounded-lg bg-surface text-txt-main text-sm focus:ring-2 focus:ring-brand-500 outline-none"
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
                                        <label className="block text-xs font-medium text-txt-secondary mb-1">Clé cible</label>
                                        <select
                                            className="w-full px-3 py-2 border border-border-default rounded-lg bg-surface text-txt-main text-sm focus:ring-2 focus:ring-brand-500 outline-none"
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
                                    <div className="p-3 bg-surface rounded-lg border border-border-default animate-in fade-in slide-in-from-top-1">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-bold text-txt-muted uppercase">Prévisualisation</span>
                                            <span className={`text-xs font-bold ${getQualityColor(previewStats.quality)} flex items-center gap-1`}>
                                                {previewStats.quality === 'high' ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                                                Qualité : {previewStats.quality === 'high' ? 'Excellente' : previewStats.quality === 'medium' ? 'Moyenne' : 'Faible'}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div className="flex flex-col">
                                                <span className="text-txt-muted text-xs uppercase font-bold">Correspondance</span>
                                                <span className="font-bold text-txt-main">{previewStats.matchCount} / {previewStats.totalPrimary} ({previewStats.matchRate.toFixed(1)}%)</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-txt-muted text-xs uppercase font-bold">Lignes résultantes</span>
                                                <span className="font-bold text-txt-main">~{previewStats.estimatedRows} lignes</span>
                                            </div>
                                        </div>
                                        {previewStats.quality === 'low' && (
                                            <p className="mt-2 text-xs text-danger-text italic flex items-start gap-1">
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
                                className="px-4 py-2 text-sm text-txt-secondary hover:bg-border-default rounded-lg transition-colors"
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
        </Modal>
    );
};
