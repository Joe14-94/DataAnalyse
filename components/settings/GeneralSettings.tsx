import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import {
  PlayCircle,
  Trash2,
  CheckCircle2,
  XCircle,
  Stethoscope,
  RotateCcw,
  History,
  Table2,
  Database,
  Calendar,
  Edit2,
  Check,
  X,
  WifiOff
} from 'lucide-react';
import { formatDateFr } from '../../utils';
import { Dataset } from '../../types';

interface GeneralSettingsProps {
  loadDemoData: () => void;
  clearAll: () => void;
  diagResults: any[] | null;
  isRunningDiag: boolean;
  handleRunDiagnostics: () => void;
  datasets: Dataset[];
  batches: any[];
  editingDatasetId: string | null;
  editName: string;
  setEditName: (name: string) => void;
  startEditing: (ds: Dataset) => void;
  cancelEditing: () => void;
  saveEditing: () => void;
  setViewingDatasetVersionsId: (id: string | null) => void;
  handleDeleteDataset: (id: string, name: string) => void;
}

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({
  loadDemoData,
  clearAll,
  diagResults,
  isRunningDiag,
  handleRunDiagnostics,
  datasets,
  batches,
  editingDatasetId,
  editName,
  setEditName,
  startEditing,
  cancelEditing,
  saveEditing,
  setViewingDatasetVersionsId,
  handleDeleteDataset
}) => {
  return (
    <div className="space-y-6">
      <Card title="Données de démonstration & Maintenance">
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-4">
            <PlayCircle className="w-6 h-6 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-bold text-amber-900">Générer des données fictives</p>
              <p className="text-xs text-amber-800 mt-1 mb-3">
                Idéal pour tester les fonctionnalités de l'application sans importer vos propres
                fichiers.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="bg-white border-amber-300 text-amber-700 hover:bg-amber-100"
                onClick={loadDemoData}
              >
                Générer données démo
              </Button>
            </div>
          </div>

          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-4">
            <Trash2 className="w-6 h-6 text-red-600 shrink-0" />
            <div>
              <p className="text-sm font-bold text-red-900">Réinitialisation complète</p>
              <p className="text-xs text-red-800 mt-1 mb-3">
                Efface définitivement TOUTES vos données (datasets, imports, analyses, widgets).
              </p>
              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  if (window.confirm('Action irréversible : Effacer TOUTES les données ?'))
                    clearAll();
                }}
              >
                Tout effacer
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Card title="Diagnostics système" icon={<Stethoscope className="w-5 h-5 text-brand-600" />}>
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Vérifiez l'intégrité de vos données et le bon fonctionnement de l'application.
          </p>
          <Button
            onClick={handleRunDiagnostics}
            isLoading={isRunningDiag}
            variant="secondary"
            size="sm"
          >
            <Stethoscope className="w-4 h-4 mr-2" /> Exécuter les diagnostics
          </Button>

          {diagResults && (
            <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
              {diagResults.map((res: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    {res.status === 'ok' ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span className="text-xs font-bold text-slate-700">{res.name}</span>
                  </div>
                  <span className="text-xs text-slate-500 italic">{res.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <Card title="Gestion des typologies">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Gérez vos typologies de tableaux. La suppression d'une typologie efface également tout
            l'historique des données associées.
          </p>
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-md bg-white">
            {datasets.length === 0 ? (
              <div className="p-4 text-center text-slate-400 text-sm italic">
                Aucune typologie configurée.
              </div>
            ) : (
              datasets.map((ds) => {
                const dsBatches = batches.filter((b) => b.datasetId === ds.id);
                const lastUpdate =
                  dsBatches.length > 0
                    ? Math.max(...dsBatches.map((b) => b.createdAt))
                    : ds.createdAt;
                const isEditing = editingDatasetId === ds.id;

                return (
                  <div
                    key={ds.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors group"
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2 bg-brand-50 rounded text-brand-600 mt-0.5">
                        <Table2 className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              className="border border-slate-300 rounded px-2 py-1 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-brand-500 outline-none w-full max-w-[250px]"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEditing();
                                if (e.key === 'Escape') cancelEditing();
                              }}
                            />
                            <button
                              onClick={saveEditing}
                              className="bg-brand-100 text-brand-700 p-1.5 rounded hover:bg-brand-200"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="bg-slate-100 text-slate-600 p-1.5 rounded hover:bg-slate-200"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <h4 className="font-bold text-slate-800">{ds.name}</h4>
                        )}
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Database className="w-3 h-3" />
                            {dsBatches.length} import(s)
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            MAJ : {new Date(lastUpdate).toLocaleDateString('fr-FR')}
                          </span>
                          <span>• {ds.fields.length} colonnes</span>
                        </div>
                      </div>
                    </div>
                    {!isEditing && (
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-brand-600"
                          onClick={() => setViewingDatasetVersionsId(ds.id)}
                        >
                          <History className="w-4 h-4 mr-2" />
                          Gérer les imports
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-slate-600"
                          onClick={() => startEditing(ds)}
                        >
                          <Edit2 className="w-4 h-4 mr-2" />
                          Renommer
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600"
                          onClick={() => handleDeleteDataset(ds.id, ds.name)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Supprimer
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Card>

      <Card title="Confidentialité & stockage" className="border-brand-200 bg-brand-50">
        <div className="flex items-start gap-4 text-brand-900">
          <div className="p-2 bg-white rounded-full shadow-sm">
            <WifiOff className="w-6 h-6 text-brand-600" />
          </div>
          <div>
            <p className="font-bold text-lg">Mode 100% local</p>
            <p className="mt-1 text-brand-800 text-sm leading-relaxed">
              Cette application s'exécute exclusivement dans votre navigateur. Aucune donnée n'est
              transmise vers un serveur externe ou le cloud.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
