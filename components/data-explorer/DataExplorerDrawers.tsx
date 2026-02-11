import React from 'react';
import { Palette, X, Plus, Trash2, ArrowRight, Link as LinkIcon, AlertTriangle, History, GitCommit, Columns, ArrowUp, ArrowDown, Info } from 'lucide-react';
import { Button } from '../ui/Button';
import { formatDateFr } from '../../utils';
import { Dataset, ConditionalRule, DataRow } from '../../types';

interface ConditionalFormattingDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    currentDataset: Dataset;
    selectedFormatCol: string;
    setSelectedFormatCol: (col: string) => void;
    newRule: Partial<ConditionalRule>;
    setNewRule: (rule: Partial<ConditionalRule>) => void;
    handleAddConditionalRule: () => void;
    handleRemoveConditionalRule: (col: string, id: string) => void;
}

export const ConditionalFormattingDrawer: React.FC<ConditionalFormattingDrawerProps> = ({
    isOpen, onClose, currentDataset, selectedFormatCol, setSelectedFormatCol,
    newRule, setNewRule, handleAddConditionalRule, handleRemoveConditionalRule
}) => {
    if (!isOpen) return null;
    return (
        <>
            <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity" onClick={onClose} />
            <div className="fixed inset-y-0 right-0 w-full md:w-[500px] bg-surface shadow-2xl flex flex-col z-50 animate-in slide-in-from-right duration-300 border-l border-border-default">
                <div className="p-ds-6 border-b border-border-default flex justify-between items-center bg-purple-50/50">
                    <div><h3 className="text-lg font-bold text-txt-main flex items-center gap-ds-2"><Palette className="w-5 h-5 text-purple-600" /> Formatage Conditionnel</h3><p className="text-sm text-txt-secondary">Appliquez des styles selon des règles</p></div>
                    <button onClick={onClose} className="text-txt-muted hover:text-txt-secondary p-ds-2 hover:bg-surface rounded-full transition-colors"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-ds-6 flex-1 overflow-y-auto custom-scrollbar space-y-8">
                    <div>
                        <label className="block text-xs font-bold text-txt-secondary uppercase mb-ds-2">Appliquer sur la colonne</label>
                        <select className="w-full p-ds-2.5 border border-border-default rounded-md bg-surface focus:ring-purple-500 focus:border-purple-500 text-sm" value={selectedFormatCol} onChange={e => setSelectedFormatCol(e.target.value)}>
                            {(currentDataset.fields || []).map((f) => <option key={f} value={f}>{f}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-txt-secondary uppercase mb-ds-2">Règles existantes</label>
                        <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar bg-canvas p-ds-2 rounded border border-border-default min-h-[60px]">
                            {(currentDataset.fieldConfigs?.[selectedFormatCol]?.conditionalFormatting || []).length === 0 ? <div className="text-xs text-txt-muted italic text-center py-4">Aucune règle définie pour cette colonne.</div> : (currentDataset.fieldConfigs?.[selectedFormatCol]?.conditionalFormatting || []).map((rule) => (
                                <div key={rule.id} className="flex items-center justify-between bg-surface p-ds-2 rounded border border-border-default shadow-sm text-xs">
                                    <div className="flex items-center gap-ds-2 flex-wrap"><span className="font-mono bg-slate-100 px-1 rounded text-txt-secondary">{rule.operator === 'gt' ? '>' : rule.operator === 'lt' ? '<' : rule.operator === 'contains' ? 'contient' : '='} {rule.value}</span><ArrowRight className="w-3 h-3 text-txt-muted" /><span className={`px-2 py-0.5 rounded ${rule.style.color} ${rule.style.backgroundColor} ${rule.style.fontWeight}`}>Exemple</span></div>
                                    <button onClick={() => handleRemoveConditionalRule(selectedFormatCol, rule.id)} className="text-txt-muted hover:text-red-500 p-1"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="bg-purple-50 p-ds-4 rounded-lg border border-purple-100 space-y-4">
                        <div className="text-sm font-bold text-purple-800 flex items-center gap-ds-2"><Plus className="w-4 h-4" /> Nouvelle règle</div>
                        <div className="flex gap-ds-2">
                            <select className="w-1/3 p-ds-2 text-xs border-purple-200 rounded focus:ring-purple-500" value={newRule.operator} onChange={e => setNewRule({ ...newRule, operator: e.target.value as ConditionalRule['operator'] })}>
                                <option value="gt">Supérieur à (&gt;)</option>
                                <option value="lt">Inférieur à (&lt;)</option>
                                <option value="eq">Égal à (=)</option>
                                <option value="contains">Contient</option>
                                <option value="empty">Est vide</option>
                            </select>
                            {newRule.operator !== 'empty' && <input type={newRule.operator === 'contains' ? 'text' : 'number'} className="flex-1 p-ds-2 text-xs border-purple-200 rounded focus:ring-purple-500" placeholder="Valeur..." value={newRule.value} onChange={e => setNewRule({ ...newRule, value: e.target.value })} />}
                        </div>
                        <div className="space-y-2">
                            <span className="text-xs text-purple-800 font-bold">Style à appliquer :</span>
                            <div className="grid grid-cols-2 gap-ds-2">
                                <select className="p-ds-2 text-xs border-purple-200 rounded focus:ring-purple-500" value={newRule.style?.color} onChange={e => setNewRule({ ...newRule, style: { ...newRule.style, color: e.target.value } })}>
                                    <option value="text-txt-main">Texte Noir</option>
                                    <option value="text-red-600">Texte Rouge</option>
                                    <option value="text-green-600">Texte Vert</option>
                                    <option value="text-brand-600">Texte Bleu</option>
                                    <option value="text-orange-600">Texte Orange</option>
                                </select>
                                <select className="p-ds-2 text-xs border-purple-200 rounded focus:ring-purple-500" value={newRule.style?.backgroundColor} onChange={e => setNewRule({ ...newRule, style: { ...newRule.style, backgroundColor: e.target.value } })}>
                                    <option value="">Fond (Aucun)</option>
                                    <option value="bg-red-100">Fond Rouge</option>
                                    <option value="bg-green-100">Fond Vert</option>
                                    <option value="bg-brand-100">Fond Bleu</option>
                                    <option value="bg-yellow-100">Fond Jaune</option>
                                </select>
                            </div>
                            <button onClick={() => setNewRule({ ...newRule, style: { ...newRule.style, fontWeight: newRule.style?.fontWeight === 'font-bold' ? 'font-normal' : 'font-bold' } })} className={`w-full py-2 border rounded text-xs font-bold transition-colors ${newRule.style?.fontWeight === 'font-bold' ? 'bg-purple-200 border-purple-300 text-purple-800' : 'bg-surface border-purple-200 text-txt-secondary'}`}>{newRule.style?.fontWeight === 'font-bold' ? 'Gras (Activé)' : 'Gras (Désactivé)'}</button>
                        </div>
                        <button onClick={handleAddConditionalRule} className="w-full py-2 bg-purple-600 text-white text-sm font-bold rounded shadow-sm hover:bg-purple-700 transition-colors">Ajouter cette règle</button>
                    </div>
                </div>
            </div>
        </>
    );
};

interface VLookupConfig {
    targetDatasetId: string;
    primaryKey: string;
    secondaryKey: string;
    columnsToAdd: string[];
    newColumnName: string;
}

interface VlookupDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    vlookupConfig: VLookupConfig;
    setVlookupConfig: (config: VLookupConfig) => void;
    datasets: Dataset[];
    currentDataset: Dataset | null;
    handleApplyVlookup: () => void;
}

export const VlookupDrawer: React.FC<VlookupDrawerProps> = ({
    isOpen, onClose, vlookupConfig, setVlookupConfig, datasets, currentDataset, handleApplyVlookup
}) => {
    if (!isOpen) return null;
    return (
        <>
            <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity" onClick={onClose} />
            <div className="fixed inset-y-0 right-0 w-full md:w-[500px] bg-surface shadow-2xl flex flex-col z-50 animate-in slide-in-from-right duration-300 border-l border-border-default">
                <div className="p-ds-6 border-b border-border-default flex justify-between items-center bg-brand-50/50">
                    <div>
                        <h3 className="text-lg font-bold text-txt-main flex items-center gap-ds-2">
                            <LinkIcon className="w-5 h-5 text-brand-600" /> RechercheV (VLookup)
                        </h3>
                        <p className="text-sm text-txt-secondary">Enrichir avec des données d'une autre source</p>
                    </div>
                    <button onClick={onClose} className="text-txt-muted hover:text-txt-secondary p-ds-2 hover:bg-surface rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-ds-6 flex-1 overflow-y-auto custom-scrollbar space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-txt-secondary uppercase mb-ds-2">
                            1. Dataset source (où chercher les données)
                        </label>
                        <select
                            className="w-full p-ds-2.5 border border-border-default rounded-md bg-surface focus:ring-brand-500 focus:border-brand-500 text-sm"
                            value={vlookupConfig.targetDatasetId}
                            onChange={(e) => setVlookupConfig({ ...vlookupConfig, targetDatasetId: e.target.value, secondaryKey: '', columnsToAdd: [] })}
                        >
                            <option value="">-- Sélectionner un dataset --</option>
                            {datasets.filter(d => d.id !== currentDataset?.id).map(ds => (
                                <option key={ds.id} value={ds.id}>{ds.name}</option>
                            ))}
                        </select>
                    </div>

                    {vlookupConfig.targetDatasetId && (
                        <>
                            <div>
                                <label className="block text-xs font-bold text-txt-secondary uppercase mb-ds-2">
                                    2. Clé de jointure dans {currentDataset?.name}
                                </label>
                                <select
                                    className="w-full p-ds-2.5 border border-border-default rounded-md bg-surface focus:ring-brand-500 focus:border-brand-500 text-sm"
                                    value={vlookupConfig.primaryKey}
                                    onChange={(e) => setVlookupConfig({ ...vlookupConfig, primaryKey: e.target.value })}
                                >
                                    <option value="">-- Sélectionner un champ --</option>
                                    {currentDataset?.fields.map((f) => (
                                        <option key={f} value={f}>{f}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-txt-secondary uppercase mb-ds-2">
                                    3. Clé de jointure dans {datasets.find(d => d.id === vlookupConfig.targetDatasetId)?.name}
                                </label>
                                <select
                                    className="w-full p-ds-2.5 border border-border-default rounded-md bg-surface focus:ring-brand-500 focus:border-brand-500 text-sm"
                                    value={vlookupConfig.secondaryKey}
                                    onChange={(e) => setVlookupConfig({ ...vlookupConfig, secondaryKey: e.target.value })}
                                >
                                    <option value="">-- Sélectionner un champ --</option>
                                    {datasets.find(d => d.id === vlookupConfig.targetDatasetId)?.fields.map((f) => (
                                        <option key={f} value={f}>{f}</option>
                                    ))}
                                </select>
                            </div>
                        </>
                    )}

                    {vlookupConfig.secondaryKey && (
                        <>
                            <div>
                                <label className="block text-xs font-bold text-txt-secondary uppercase mb-ds-2">
                                    4. Colonnes à récupérer
                                </label>
                                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar bg-canvas p-ds-3 rounded border border-border-default">
                                    {datasets.find(d => d.id === vlookupConfig.targetDatasetId)?.fields.map((f) => (
                                        <label key={f} className="flex items-center gap-ds-2 cursor-pointer hover:bg-surface p-ds-2 rounded transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={vlookupConfig.columnsToAdd.includes(f)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setVlookupConfig({ ...vlookupConfig, columnsToAdd: [...vlookupConfig.columnsToAdd, f] });
                                                    } else {
                                                        setVlookupConfig({ ...vlookupConfig, columnsToAdd: vlookupConfig.columnsToAdd.filter((c) => c !== f) });
                                                    }
                                                }}
                                                className="rounded border-border-default text-brand-600 focus:ring-brand-500"
                                            />
                                            <span className="text-sm text-txt-secondary">{f}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-txt-secondary uppercase mb-ds-2">
                                    5. Nom de la nouvelle colonne
                                </label>
                                <input
                                    type="text"
                                    className="w-full p-ds-2.5 border border-border-default rounded-md bg-surface focus:ring-brand-500 focus:border-brand-500 text-sm"
                                    placeholder="Ex: Informations Client"
                                    value={vlookupConfig.newColumnName}
                                    onChange={(e) => setVlookupConfig({ ...vlookupConfig, newColumnName: e.target.value })}
                                />
                            </div>
                        </>
                    )}

                    <div className="bg-brand-50 border border-brand-200 rounded-lg p-ds-4">
                        <div className="flex gap-ds-3">
                            <AlertTriangle className="w-5 h-5 text-brand-600 flex-shrink-0 mt-0.5" />
                            <div className="text-xs text-brand-800 space-y-1">
                                <p className="font-bold">Comment ça fonctionne ?</p>
                                <p>Cette fonction va chercher les valeurs dans le dataset source en utilisant les clés de jointure, et ajouter une nouvelle colonne à vos données actuelles.</p>
                                <p className="font-semibold mt-2">⚠️ Cette opération modifie définitivement votre dataset.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-ds-4 border-t border-border-default bg-canvas flex justify-end gap-ds-3">
                    <Button variant="outline" onClick={onClose}>Annuler</Button>
                    <Button
                        onClick={handleApplyVlookup}
                        disabled={!vlookupConfig.targetDatasetId || !vlookupConfig.primaryKey || !vlookupConfig.secondaryKey || vlookupConfig.columnsToAdd.length === 0 || !vlookupConfig.newColumnName.trim()}
                        className="bg-brand-600 hover:bg-brand-700"
                    >
                        Enrichir les données
                    </Button>
                </div>
            </div>
        </>
    );
};

interface DetailsDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    selectedRow: (DataRow & { _importDate: string; _batchId: string }) | null;
    trackingKey: string;
    setTrackingKey: (key: string) => void;
    currentDataset: Dataset;
    historyData: DataRow[];
}

export const DetailsDrawer: React.FC<DetailsDrawerProps> = ({
    isOpen, onClose, selectedRow, trackingKey, setTrackingKey, currentDataset, historyData
}) => {
    if (!isOpen || !selectedRow) return null;
    return (
        <div className="fixed inset-y-0 right-0 w-full md:w-[600px] bg-surface shadow-2xl transform transition-transform duration-300 z-40 flex flex-col border-l border-border-default">
            <div className="p-ds-6 bg-canvas border-b border-border-default flex justify-between items-start">
                <div><div className="flex items-center gap-ds-2 mb-1"><History className="w-5 h-5 text-brand-600" /><h3 className="text-lg font-bold text-txt-main">Fiche Détail & Historique</h3></div><p className="text-xs text-txt-secondary">Suivi de l'entité via la clé : <strong className="text-txt-secondary">{trackingKey}</strong></p></div>
                <button onClick={onClose} className="text-txt-muted hover:text-txt-secondary bg-surface rounded-full p-1 shadow-sm border border-border-default"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-3 bg-canvas border-b border-border-default flex items-center gap-ds-3"><span className="text-xs font-bold text-txt-secondary uppercase">Clé de réconciliation :</span><select className="text-xs bg-surface border-border-default rounded py-1 px-2 focus:ring-brand-500 focus:border-brand-500" value={trackingKey} onChange={(e) => setTrackingKey(e.target.value)}>{(currentDataset.fields || []).map((f) => <option key={f} value={f}>{f}</option>)}</select></div>
            <div className="flex-1 overflow-y-auto p-ds-6 custom-scrollbar bg-canvas/50 space-y-8">
                <div className="bg-surface rounded-lg border border-border-default shadow-sm overflow-hidden">
                    <div className="bg-brand-50 px-4 py-2 border-b border-brand-100 flex justify-between items-center"><span className="text-xs font-bold text-brand-700 uppercase tracking-wider">État Actuel</span><span className="text-xs bg-surface px-2 py-0.5 rounded-full border border-brand-200 text-brand-600 font-mono">{formatDateFr(selectedRow._importDate)}</span></div>
                    <div className="p-ds-4 grid grid-cols-2 gap-ds-4">
                        {Object.entries(selectedRow).filter(([k]) => !k.startsWith('_') && k !== 'id').map(([key, val]) => (
                            <div key={key} className="space-y-1"><dt className="text-xs font-medium text-txt-muted uppercase">{key}</dt><dd className="text-sm font-medium text-txt-main break-words bg-canvas p-ds-2 rounded border border-border-default">{val !== undefined && val !== null && val !== '' ? String(val) : <span className="text-slate-300 italic">Vide</span>}</dd></div>
                        ))}
                    </div>
                </div>
                <div className="relative">
                    <div className="absolute top-0 bottom-0 left-4 w-px bg-slate-200"></div>
                    <h4 className="text-sm font-bold text-txt-secondary mb-ds-4 ml-10 flex items-center gap-ds-2"><GitCommit className="w-4 h-4" /> Chronologie des modifications</h4>
                    <div className="space-y-6">
                        {historyData.map((histRow, idx) => {
                            const prevRow = historyData[idx + 1];
                            const changes = prevRow ? currentDataset.fields.filter((f) => String(histRow[f]) !== String(prevRow[f])) : [];
                            const isCreation = !prevRow;
                            return (
                                <div key={histRow._batchId} className="relative pl-10 group">
                                    <div className={`absolute left-[13px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm z-10 ${isCreation ? 'bg-green-500' : (changes.length > 0 ? 'bg-amber-500' : 'bg-slate-300')}`}></div>
                                    <div className="bg-surface p-ds-4 rounded-lg border border-border-default shadow-sm transition-shadow hover:shadow-md">
                                        <div className="flex justify-between items-start mb-3">
                                            <div><div className="text-xs font-bold text-txt-secondary">{formatDateFr(histRow._importDate)}</div><div className="text-xs text-txt-muted font-mono mt-0.5">Batch: {histRow._batchId}</div></div>
                                            {isCreation ? <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full uppercase">Création</span> : changes.length > 0 ? <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full uppercase">{changes.length} Modif(s)</span> : <span className="px-2 py-1 bg-slate-100 text-txt-secondary text-xs font-bold rounded-full uppercase">Inchangé</span>}
                                        </div>
                                        {changes.length > 0 && prevRow && (
                                            <div className="space-y-2 bg-amber-50/50 p-ds-3 rounded border border-amber-100/50">
                                                {changes.map((field: any) => (
                                                    <div key={field} className="text-xs grid grid-cols-[1fr,auto,1fr] gap-ds-2 items-center">
                                                        <div className="text-right text-txt-secondary line-through decoration-red-400 decoration-2">{String(prevRow[field] || 'Vide')}</div>
                                                        <div className="text-center text-slate-300"><ArrowRight className="w-3 h-3 inline" /></div>
                                                        <div className="font-bold text-txt-main">{String(histRow[field] || 'Vide')}</div>
                                                        <div className="col-span-3 text-xs text-txt-muted uppercase tracking-wider text-center mt-0.5">{field}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

interface ColumnManagementDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    currentDataset: Dataset;
    reorderDatasetFields: (id: string, fields: string[]) => void;
}

export const ColumnManagementDrawer: React.FC<ColumnManagementDrawerProps> = ({
    isOpen, onClose, currentDataset, reorderDatasetFields
}) => {
    if (!isOpen || !currentDataset) return null;
    return (
        <>
            <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity" onClick={onClose} />
            <div className="fixed inset-y-0 right-0 w-full md:w-[400px] bg-surface shadow-2xl flex flex-col z-50 animate-in slide-in-from-right duration-300 border-l border-border-default">
                <div className="p-ds-6 border-b border-border-default flex justify-between items-center bg-canvas">
                    <div>
                        <h3 className="text-lg font-bold text-txt-main flex items-center gap-ds-2">
                            <Columns className="w-5 h-5 text-brand-600" /> Gestion des colonnes
                        </h3>
                        <p className="text-sm text-txt-secondary">Réorganisez l'ordre d'affichage</p>
                    </div>
                    <button onClick={onClose} className="text-txt-muted hover:text-txt-secondary p-ds-2 hover:bg-surface rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-ds-4 bg-amber-50 border-b border-amber-100 flex gap-ds-3">
                    <Info className="w-5 h-5 text-amber-600 shrink-0" />
                    <p className="text-xs text-amber-800 font-medium">
                        Utilisez les flèches pour changer l'ordre. Cet ordre sera conservé dans toutes les vues utilisant ce dataset.
                    </p>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-ds-4 space-y-1">
                    {(currentDataset.fields || []).map((field, idx: number) => (
                        <div
                            key={field}
                            className="flex items-center gap-ds-3 p-ds-2 bg-surface border border-border-default rounded-lg hover:border-brand-300 transition-all group"
                        >
                            <div className="flex flex-col gap-1">
                                <button
                                    disabled={idx === 0}
                                    onClick={() => {
                                        const newFields = [...currentDataset.fields];
                                        [newFields[idx], newFields[idx-1]] = [newFields[idx-1], newFields[idx]];
                                        reorderDatasetFields(currentDataset.id, newFields);
                                    }}
                                    className="text-txt-muted hover:text-brand-600 disabled:opacity-20"
                                >
                                    <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    disabled={idx === currentDataset.fields.length - 1}
                                    onClick={() => {
                                        const newFields = [...currentDataset.fields];
                                        [newFields[idx], newFields[idx+1]] = [newFields[idx+1], newFields[idx]];
                                        reorderDatasetFields(currentDataset.id, newFields);
                                    }}
                                    className="text-txt-muted hover:text-brand-600 disabled:opacity-20"
                                >
                                    <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            <span className="text-sm font-medium text-txt-secondary truncate flex-1">{field}</span>
                            <div className="text-xs font-bold text-slate-300 uppercase px-1.5 py-0.5 border border-border-default rounded">
                                Pos. {idx + 1}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-ds-4 border-t border-border-default bg-canvas flex justify-end">
                    <Button onClick={onClose} className="w-full">
                        Fermer
                     </Button>
                </div>
            </div>
        </>
    );
};
