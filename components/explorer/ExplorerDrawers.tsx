import React from 'react';
import {
  X,
  Palette,
  Trash2,
  ArrowRight,
  Plus,
  Link as LinkIcon,
  AlertTriangle,
  History,
  GitCommit,
  Columns,
  ArrowUp,
  ArrowDown,
  Info
} from 'lucide-react';
import { Button } from '../ui/Button';
import { formatDateFr } from '../../utils';
import { Dataset, ConditionalRule } from '../../types';
import { ExplorerRow } from '../../hooks/useDataExplorerLogic';

interface ExplorerDrawersProps {
  isFormatDrawerOpen: boolean;
  setIsFormatDrawerOpen: (v: boolean) => void;
  currentDataset: Dataset;
  selectedFormatCol: string;
  setSelectedFormatCol: (v: string) => void;
  newRule: Partial<ConditionalRule>;
  setNewRule: (v: Partial<ConditionalRule>) => void;
  handleAddConditionalRule: () => void;
  handleRemoveConditionalRule: (col: string, id: string) => void;

  isVlookupDrawerOpen: boolean;
  setIsVlookupDrawerOpen: (v: boolean) => void;
  datasets: Dataset[];
  vlookupConfig: {
    targetDatasetId: string;
    primaryKey: string;
    secondaryKey: string;
    columnsToAdd: string[];
    newColumnName: string;
  };
  setVlookupConfig: (v: any) => void;
  handleApplyVlookup: () => void;

  isDrawerOpen: boolean;
  setIsDrawerOpen: (v: boolean) => void;
  selectedRow: ExplorerRow | null;
  trackingKey: string;
  setTrackingKey: (v: string) => void;
  historyData: ExplorerRow[];

  isColumnDrawerOpen: boolean;
  setIsColumnDrawerOpen: (v: boolean) => void;
  reorderDatasetFields: (id: string, fields: string[]) => void;
}

export const ExplorerDrawers: React.FC<ExplorerDrawersProps> = ({
  isFormatDrawerOpen,
  setIsFormatDrawerOpen,
  currentDataset,
  selectedFormatCol,
  setSelectedFormatCol,
  newRule,
  setNewRule,
  handleAddConditionalRule,
  handleRemoveConditionalRule,
  isVlookupDrawerOpen,
  setIsVlookupDrawerOpen,
  datasets,
  vlookupConfig,
  setVlookupConfig,
  handleApplyVlookup,
  isDrawerOpen,
  setIsDrawerOpen,
  selectedRow,
  trackingKey,
  setTrackingKey,
  historyData,
  isColumnDrawerOpen,
  setIsColumnDrawerOpen,
  reorderDatasetFields
}) => {
  return (
    <>
      {/* CONDITIONAL FORMATTING DRAWER */}
      {isFormatDrawerOpen && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setIsFormatDrawerOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 w-full md:w-[500px] bg-white shadow-2xl flex flex-col z-50 animate-in slide-in-from-right duration-300 border-l border-slate-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-purple-50/50">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Palette className="w-5 h-5 text-purple-600" /> Formatage Conditionnel
                </h3>
                <p className="text-sm text-slate-500">Appliquez des styles selon des règles</p>
              </div>
              <button
                onClick={() => setIsFormatDrawerOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-2 hover:bg-white rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-8">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  Appliquer sur la colonne
                </label>
                <select
                  className="w-full p-2.5 border border-slate-300 rounded-md bg-white focus:ring-purple-500 focus:border-purple-500 text-sm"
                  value={selectedFormatCol}
                  onChange={(e) => setSelectedFormatCol(e.target.value)}
                >
                  {(currentDataset.fields || []).map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  Règles existantes
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar bg-slate-50 p-2 rounded border border-slate-200 min-h-[60px]">
                  {(currentDataset.fieldConfigs?.[selectedFormatCol]?.conditionalFormatting || [])
                    .length === 0 ? (
                    <div className="text-xs text-slate-400 italic text-center py-4">
                      Aucune règle définie pour cette colonne.
                    </div>
                  ) : (
                    (
                      currentDataset.fieldConfigs?.[selectedFormatCol]?.conditionalFormatting || []
                    ).map((rule) => (
                      <div
                        key={rule.id}
                        className="flex items-center justify-between bg-white p-2 rounded border border-slate-200 shadow-sm text-xs"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono bg-slate-100 px-1 rounded text-slate-600">
                            {rule.operator === 'gt'
                              ? '>'
                              : rule.operator === 'lt'
                                ? '<'
                                : rule.operator === 'contains'
                                  ? 'contient'
                                  : '='}{' '}
                            {rule.value}
                          </span>
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                          <span
                            className={`px-2 py-0.5 rounded ${rule.style.color} ${rule.style.backgroundColor} ${rule.style.fontWeight}`}
                          >
                            Exemple
                          </span>
                        </div>
                        <button
                          onClick={() => handleRemoveConditionalRule(selectedFormatCol, rule.id)}
                          className="text-slate-400 hover:text-red-500 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 space-y-4">
                <div className="text-sm font-bold text-purple-800 flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Nouvelle règle
                </div>
                <div className="flex gap-2">
                  <select
                    className="w-1/3 p-2 text-xs border-purple-200 rounded focus:ring-purple-500"
                    value={newRule.operator}
                    onChange={(e) => setNewRule({ ...newRule, operator: e.target.value as any })}
                  >
                    <option value="gt">Supérieur à (&gt;)</option>
                    <option value="lt">Inférieur à (&lt;)</option>
                    <option value="eq">Égal à (=)</option>
                    <option value="contains">Contient</option>
                    <option value="empty">Est vide</option>
                  </select>
                  {newRule.operator !== 'empty' && (
                    <input
                      type={newRule.operator === 'contains' ? 'text' : 'number'}
                      className="flex-1 p-2 text-xs border-purple-200 rounded focus:ring-purple-500"
                      placeholder="Valeur..."
                      value={newRule.value}
                      onChange={(e) => setNewRule({ ...newRule, value: e.target.value })}
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <span className="text-xs text-purple-800 font-bold">Style à appliquer :</span>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      className="p-2 text-xs border-purple-200 rounded focus:ring-purple-500"
                      value={newRule.style?.color}
                      onChange={(e) =>
                        setNewRule({
                          ...newRule,
                          style: { ...newRule.style, color: e.target.value }
                        })
                      }
                    >
                      <option value="text-slate-900">Texte Noir</option>
                      <option value="text-red-600">Texte Rouge</option>
                      <option value="text-green-600">Texte Vert</option>
                      <option value="text-brand-600">Texte Bleu</option>
                      <option value="text-orange-600">Texte Orange</option>
                    </select>
                    <select
                      className="p-2 text-xs border-purple-200 rounded focus:ring-purple-500"
                      value={newRule.style?.backgroundColor}
                      onChange={(e) =>
                        setNewRule({
                          ...newRule,
                          style: { ...newRule.style, backgroundColor: e.target.value }
                        })
                      }
                    >
                      <option value="">Fond (Aucun)</option>
                      <option value="bg-red-100">Fond Rouge</option>
                      <option value="bg-green-100">Fond Vert</option>
                      <option value="bg-brand-100">Fond Bleu</option>
                      <option value="bg-yellow-100">Fond Jaune</option>
                    </select>
                  </div>
                  <button
                    onClick={() =>
                      setNewRule({
                        ...newRule,
                        style: {
                          ...newRule.style,
                          fontWeight:
                            newRule.style?.fontWeight === 'font-bold' ? 'font-normal' : 'font-bold'
                        }
                      })
                    }
                    className={`w-full py-2 border rounded text-xs font-bold transition-colors ${newRule.style?.fontWeight === 'font-bold' ? 'bg-purple-200 border-purple-300 text-purple-800' : 'bg-white border-purple-200 text-slate-500'}`}
                  >
                    {newRule.style?.fontWeight === 'font-bold'
                      ? 'Gras (Activé)'
                      : 'Gras (Désactivé)'}
                  </button>
                </div>
                <button
                  onClick={handleAddConditionalRule}
                  className="w-full py-2 bg-purple-600 text-white text-sm font-bold rounded shadow-sm hover:bg-purple-700 transition-colors"
                >
                  Ajouter cette règle
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* VLOOKUP DRAWER */}
      {isVlookupDrawerOpen && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setIsVlookupDrawerOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 w-full md:w-[500px] bg-white shadow-2xl flex flex-col z-50 animate-in slide-in-from-right duration-300 border-l border-slate-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-brand-50/50">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <LinkIcon className="w-5 h-5 text-brand-600" /> RECHERCHEV
                </h3>
                <p className="text-sm text-slate-500">
                  Enrichir avec des données d'une autre source
                </p>
              </div>
              <button
                onClick={() => setIsVlookupDrawerOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-2 hover:bg-white rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  1. Dataset source
                </label>
                <select
                  className="w-full p-2.5 border border-slate-300 rounded-md bg-white focus:ring-brand-500 focus:border-brand-500 text-sm"
                  value={vlookupConfig.targetDatasetId}
                  onChange={(e) =>
                    setVlookupConfig({
                      ...vlookupConfig,
                      targetDatasetId: e.target.value,
                      secondaryKey: '',
                      columnsToAdd: []
                    })
                  }
                >
                  <option value="">-- Sélectionner --</option>
                  {datasets
                    .filter((d) => d.id !== currentDataset?.id)
                    .map((ds) => (
                      <option key={ds.id} value={ds.id}>
                        {ds.name}
                      </option>
                    ))}
                </select>
              </div>
              {vlookupConfig.targetDatasetId && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                      2. Clé dans {currentDataset?.name}
                    </label>
                    <select
                      className="w-full p-2.5 border border-slate-300 rounded-md bg-white focus:ring-brand-500 focus:border-brand-500 text-sm"
                      value={vlookupConfig.primaryKey}
                      onChange={(e) =>
                        setVlookupConfig({ ...vlookupConfig, primaryKey: e.target.value })
                      }
                    >
                      <option value="">-- Sélectionner --</option>
                      {currentDataset?.fields.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                      3. Clé dans{' '}
                      {datasets.find((d) => d.id === vlookupConfig.targetDatasetId)?.name}
                    </label>
                    <select
                      className="w-full p-2.5 border border-slate-300 rounded-md bg-white focus:ring-brand-500 focus:border-brand-500 text-sm"
                      value={vlookupConfig.secondaryKey}
                      onChange={(e) =>
                        setVlookupConfig({ ...vlookupConfig, secondaryKey: e.target.value })
                      }
                    >
                      <option value="">-- Sélectionner --</option>
                      {datasets
                        .find((d) => d.id === vlookupConfig.targetDatasetId)
                        ?.fields.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                    </select>
                  </div>
                </>
              )}
              {vlookupConfig.secondaryKey && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                      4. Colonnes à récupérer
                    </label>
                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar bg-slate-50 p-3 rounded border border-slate-200">
                      {datasets
                        .find((d) => d.id === vlookupConfig.targetDatasetId)
                        ?.fields.map((f) => (
                          <label
                            key={f}
                            className="flex items-center gap-2 cursor-pointer hover:bg-white p-2 rounded transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={vlookupConfig.columnsToAdd.includes(f)}
                              onChange={(e) =>
                                setVlookupConfig({
                                  ...vlookupConfig,
                                  columnsToAdd: e.target.checked
                                    ? [...vlookupConfig.columnsToAdd, f]
                                    : vlookupConfig.columnsToAdd.filter((c) => c !== f)
                                })
                              }
                              className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                            />
                            <span className="text-sm text-slate-700">{f}</span>
                          </label>
                        ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                      5. Nom nouvelle colonne
                    </label>
                    <input
                      type="text"
                      className="w-full p-2.5 border border-slate-300 rounded-md bg-white focus:ring-brand-500 focus:border-brand-500 text-sm"
                      placeholder="Ex: Info Client"
                      value={vlookupConfig.newColumnName}
                      onChange={(e) =>
                        setVlookupConfig({ ...vlookupConfig, newColumnName: e.target.value })
                      }
                    />
                  </div>
                </>
              )}
              <div className="bg-brand-50 border border-brand-200 rounded-lg p-4 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
                <div className="text-xs text-brand-800 space-y-1">
                  <p className="font-bold">Comment ça fonctionne ?</p>
                  <p>
                    Cherche les valeurs via les clés et ajoute une colonne concaténée avec ' | ' si
                    plusieurs champs choisis.
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsVlookupDrawerOpen(false)}>
                Annuler
              </Button>
              <Button
                onClick={handleApplyVlookup}
                disabled={
                  !vlookupConfig.targetDatasetId ||
                  !vlookupConfig.primaryKey ||
                  !vlookupConfig.secondaryKey ||
                  vlookupConfig.columnsToAdd.length === 0 ||
                  !vlookupConfig.newColumnName.trim()
                }
                className="bg-brand-600"
              >
                Enrichir
              </Button>
            </div>
          </div>
        </>
      )}

      {/* DETAILS DRAWER */}
      {isDrawerOpen && selectedRow && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setIsDrawerOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 w-full md:w-[600px] bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300">
            <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <History className="w-5 h-5 text-brand-600" />
                  <h3 className="text-lg font-bold text-slate-800">Fiche Détail & Historique</h3>
                </div>
                <p className="text-xs text-slate-500">
                  Suivi via : <strong className="text-slate-700">{trackingKey}</strong>
                </p>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="text-slate-400 hover:text-slate-600 bg-white rounded-full p-1 shadow-sm border border-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
              <span className="text-xs font-bold text-slate-500 uppercase">Clé :</span>
              <select
                className="text-xs bg-white border-slate-300 rounded py-1 px-2"
                value={trackingKey}
                onChange={(e) => setTrackingKey(e.target.value)}
              >
                {(currentDataset.fields || []).map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-50/50 space-y-8">
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
                <div className="bg-brand-50 px-4 py-2 border-b border-brand-100 flex justify-between items-center">
                  <span className="text-xs font-bold text-brand-700 uppercase">État Actuel</span>
                  <span className="text-xs font-mono">{formatDateFr(selectedRow._importDate)}</span>
                </div>
                <div className="p-4 grid grid-cols-2 gap-4">
                  {Object.entries(selectedRow)
                    .filter(([k]) => !k.startsWith('_') && k !== 'id')
                    .map(([key, val]) => (
                      <div key={key} className="space-y-1">
                        <dt className="text-xs font-medium text-slate-400 uppercase">{key}</dt>
                        <dd className="text-sm font-medium text-slate-800 break-words bg-slate-50 p-2 rounded border border-slate-100">
                          {val != null && val !== '' ? (
                            String(val)
                          ) : (
                            <span className="text-slate-300 italic">Vide</span>
                          )}
                        </dd>
                      </div>
                    ))}
                </div>
              </div>
              <div className="relative">
                <div className="absolute top-0 bottom-0 left-4 w-px bg-slate-200" />
                <h4 className="text-sm font-bold text-slate-700 mb-4 ml-10 flex items-center gap-2">
                  <GitCommit className="w-4 h-4" /> Chronologie
                </h4>
                <div className="space-y-6">
                  {historyData.map((histRow, idx) => {
                    const prevRow = historyData[idx + 1];
                    const changes = prevRow
                      ? currentDataset.fields.filter(
                          (f) => String(histRow[f]) !== String(prevRow[f])
                        )
                      : [];
                    const isCreation = !prevRow;
                    return (
                      <div key={histRow._batchId} className="relative pl-10">
                        <div
                          className={`absolute left-[13px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm z-10 ${isCreation ? 'bg-green-500' : changes.length > 0 ? 'bg-amber-500' : 'bg-slate-300'}`}
                        />
                        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <div className="text-xs font-bold text-slate-500">
                                {formatDateFr(histRow._importDate)}
                              </div>
                            </div>
                            {isCreation ? (
                              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                                CRÉATION
                              </span>
                            ) : changes.length > 0 ? (
                              <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">
                                {changes.length} MODIF(S)
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-slate-100 text-slate-500 text-xs font-bold rounded-full">
                                INCHANGÉ
                              </span>
                            )}
                          </div>
                          {changes.length > 0 && prevRow && (
                            <div className="space-y-2 bg-amber-50/50 p-3 rounded border border-amber-100/50">
                              {changes.map((field) => (
                                <div
                                  key={field}
                                  className="text-xs grid grid-cols-[1fr,auto,1fr] gap-2 items-center"
                                >
                                  <div className="text-right text-slate-500 line-through">
                                    {String(prevRow[field] || 'Vide')}
                                  </div>
                                  <div className="text-center text-slate-300">
                                    <ArrowRight className="w-3 h-3 inline" />
                                  </div>
                                  <div className="font-bold text-slate-800">
                                    {String(histRow[field] || 'Vide')}
                                  </div>
                                  <div className="col-span-3 text-[10px] text-slate-400 uppercase text-center">
                                    {field}
                                  </div>
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
        </>
      )}

      {/* COLUMN REORDERING DRAWER */}
      {isColumnDrawerOpen && currentDataset && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setIsColumnDrawerOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 w-full md:w-[400px] bg-white shadow-2xl flex flex-col z-50 animate-in slide-in-from-right duration-300 border-l border-slate-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Columns className="w-5 h-5 text-brand-600" /> Colonnes
                </h3>
                <p className="text-sm text-slate-500">Réorganisez l'ordre</p>
              </div>
              <button
                onClick={() => setIsColumnDrawerOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 bg-amber-50 border-b border-amber-100 flex gap-3">
              <Info className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="text-xs text-amber-800">Utilisez les flèches pour changer l'ordre.</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {(currentDataset.fields || []).map((field, idx) => (
                <div
                  key={field}
                  className="flex items-center gap-3 p-2 bg-white border border-slate-200 rounded-lg hover:border-brand-300 group"
                >
                  <div className="flex flex-col gap-1">
                    <button
                      disabled={idx === 0}
                      onClick={() => {
                        const nf = [...currentDataset.fields];
                        [nf[idx], nf[idx - 1]] = [nf[idx - 1], nf[idx]];
                        reorderDatasetFields(currentDataset.id, nf);
                      }}
                      className="text-slate-400 hover:text-brand-600 disabled:opacity-20"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      disabled={idx === currentDataset.fields.length - 1}
                      onClick={() => {
                        const nf = [...currentDataset.fields];
                        [nf[idx], nf[idx + 1]] = [nf[idx + 1], nf[idx]];
                        reorderDatasetFields(currentDataset.id, nf);
                      }}
                      className="text-slate-400 hover:text-brand-600 disabled:opacity-20"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="text-sm font-medium text-slate-700 truncate flex-1">
                    {field}
                  </span>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-slate-200">
              <Button onClick={() => setIsColumnDrawerOpen(false)} className="w-full">
                Fermer
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  );
};
