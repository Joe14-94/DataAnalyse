import React from 'react';
import { Stethoscope, CheckCircle2, XCircle, Layout as LayoutIcon, Table2, Database, Calendar, Edit2, Trash2, Check, X, History, WifiOff } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { formatDateFr } from '../../utils';

interface DiagnosticsSectionProps {
    handleRunDiagnostics: () => void;
    isRunningDiag: boolean;
    diagResults: any[] | null;
}

export const DiagnosticsSection: React.FC<DiagnosticsSectionProps> = ({ handleRunDiagnostics, isRunningDiag, diagResults }) => {
    return (
        <Card title="Centre de Conformité & Diagnostic">
            <div className="space-y-4">
                <p className="text-sm text-slate-600">Vérifiez l'intégrité des moteurs de calcul.</p>
                <Button onClick={handleRunDiagnostics} disabled={isRunningDiag}>
                    {isRunningDiag ? 'Exécution en cours...' : <><Stethoscope className="w-4 h-4 mr-2" /> Lancer l'audit</>}
                </Button>
                {diagResults && (
                    <div className="mt-4 border rounded-lg overflow-hidden">
                        {diagResults.map((suite, idx) => (
                            <div key={idx} className="border-b last:border-0 border-slate-100">
                                <div className={`p-3 flex justify-between items-center ${suite.tests.every((t: any) => t.status === 'success') ? 'bg-slate-50' : 'bg-red-50'}`}>
                                    <h4 className="font-bold text-sm text-slate-800">{suite.category}</h4>
                                </div>
                                <div className="p-3 bg-white space-y-2">
                                    {suite.tests.map((test: any) => (
                                        <div key={test.id} className="flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-2">
                                                {test.status === 'success' ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                                                <span>{test.name}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Card>
    );
};

interface SavedAnalysesSectionProps {
    savedAnalyses: any[];
    datasets: any[];
    editingAnalysisId: string | null;
    editAnalysisName: string;
    setEditAnalysisName: (name: string) => void;
    saveEditingAnalysis: () => void;
    cancelEditingAnalysis: () => void;
    startEditingAnalysis: (a: any) => void;
    handleDeleteAnalysis: (id: string, name: string) => void;
}

export const SavedAnalysesSection: React.FC<SavedAnalysesSectionProps> = ({
    savedAnalyses, datasets, editingAnalysisId, editAnalysisName, setEditAnalysisName,
    saveEditingAnalysis, cancelEditingAnalysis, startEditingAnalysis, handleDeleteAnalysis
}) => {
    const pivotAnalyses = savedAnalyses.filter(a => a.type === 'pivot');
    return (
        <Card title="Analyses sauvegardées" icon={<LayoutIcon className="w-5 h-5 text-indigo-600" />}>
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-md bg-white">
                {pivotAnalyses.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 text-sm italic">Aucune analyse TCD.</div>
                ) : (
                    pivotAnalyses.map(analysis => (
                        <div key={analysis.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                                <div className="p-2 bg-indigo-50 rounded text-indigo-600"><Table2 className="w-5 h-5" /></div>
                                <div className="flex-1 min-w-0">
                                    {editingAnalysisId === analysis.id ? (
                                        <div className="flex items-center gap-2">
                                            <input type="text" className="border rounded px-2 py-1 text-sm font-bold flex-1" value={editAnalysisName} onChange={(e) => setEditAnalysisName(e.target.value)} autoFocus aria-label="Nom de l'analyse" />
                                            <button onClick={saveEditingAnalysis} className="bg-brand-100 p-1.5 rounded" title="Enregistrer" aria-label="Enregistrer le nouveau nom"><Check className="w-4 h-4" /></button>
                                            <button onClick={cancelEditingAnalysis} className="bg-slate-100 p-1.5 rounded" title="Annuler" aria-label="Annuler la modification du nom"><X className="w-4 h-4" /></button>
                                        </div>
                                    ) : (
                                        <h4 className="font-bold text-slate-800 truncate">{analysis.name}</h4>
                                    )}
                                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                        <span className="flex items-center gap-1"><Database className="w-3 h-3" />{datasets.find(d => d.id === analysis.datasetId)?.name || 'Dataset supprimé'}</span>
                                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(analysis.createdAt).toLocaleDateString('fr-FR')}</span>
                                    </div>
                                </div>
                            </div>
                            {!editingAnalysisId && (
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" onClick={() => startEditingAnalysis(analysis)}><Edit2 className="w-3.5 h-3.5 mr-2" />Renommer</Button>
                                    <Button variant="outline" size="sm" onClick={() => handleDeleteAnalysis(analysis.id, analysis.name)} className="text-red-600 border-red-200"><Trash2 className="w-3.5 h-3.5 mr-2" />Supprimer</Button>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </Card>
    );
};

interface DatasetsSectionProps {
    datasets: any[];
    batches: any[];
    editingDatasetId: string | null;
    editName: string;
    setEditName: (name: string) => void;
    saveEditing: () => void;
    cancelEditing: () => void;
    startEditing: (ds: any) => void;
    setViewingDatasetVersionsId: (id: string | null) => void;
    handleDeleteDataset: (id: string, name: string) => void;
}

export const DatasetsSection: React.FC<DatasetsSectionProps> = ({
    datasets, batches, editingDatasetId, editName, setEditName, saveEditing, cancelEditing,
    startEditing, setViewingDatasetVersionsId, handleDeleteDataset
}) => {
    return (
        <Card title="Gestion des typologies">
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-md bg-white">
                {datasets.length === 0 ? <div className="p-4 text-center text-slate-400 text-sm italic">Aucune typologie.</div> : datasets.map(ds => (
                    <div key={ds.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                            <div className="p-2 bg-brand-50 rounded text-brand-600"><Table2 className="w-5 h-5" /></div>
                            <div className="flex-1">
                                {editingDatasetId === ds.id ? (
                                    <div className="flex items-center gap-2">
                                        <input type="text" className="border border-slate-300 rounded px-2 py-1 text-sm font-bold flex-1" value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus aria-label="Nom de la typologie" />
                                        <button onClick={saveEditing} className="bg-brand-100 p-1.5 rounded" title="Enregistrer" aria-label="Enregistrer le nouveau nom"><Check className="w-4 h-4" /></button>
                                        <button onClick={cancelEditing} className="bg-slate-100 p-1.5 rounded" title="Annuler" aria-label="Annuler la modification du nom"><X className="w-4 h-4" /></button>
                                    </div>
                                ) : (
                                    <h4 className="font-bold text-slate-800">{ds.name}</h4>
                                )}
                                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                    <span>{batches.filter(b => b.datasetId === ds.id).length} import(s)</span>
                                    <span>• {ds.fields.length} colonnes</span>
                                </div>
                            </div>
                        </div>
                        {!editingDatasetId && (
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => setViewingDatasetVersionsId(ds.id)}><History className="w-4 h-4 mr-2" />Gérer</Button>
                                <Button variant="outline" size="sm" onClick={() => startEditing(ds)}><Edit2 className="w-4 h-4 mr-2" />Renommer</Button>
                                <Button variant="outline" size="sm" onClick={() => handleDeleteDataset(ds.id, ds.name)} className="text-red-600 border-red-200"><Trash2 className="w-4 h-4 mr-2" />Supprimer</Button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </Card>
    );
};

export const PrivacySection: React.FC = () => (
    <Card title="Confidentialité" className="border-brand-200 bg-brand-50">
        <div className="flex items-start gap-4 text-brand-900">
            <div className="p-2 bg-white rounded-full"><WifiOff className="w-6 h-6 text-brand-600" /></div>
            <div>
                <p className="font-bold">Mode 100% local</p>
                <p className="mt-1 text-sm">Toutes vos données restent dans votre navigateur.</p>
            </div>
        </div>
    </Card>
);
