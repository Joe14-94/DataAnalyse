
import React, { useRef, useState } from 'react';
import { useData } from '../context/DataContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Download, Upload, Trash2, ShieldAlert, WifiOff, Database, PlayCircle, Table2, Calendar, Stethoscope, CheckCircle2, XCircle, AlertTriangle, Edit2, Check, X } from 'lucide-react';
import { APP_VERSION, runSelfDiagnostics } from '../utils';
import { useNavigate } from 'react-router-dom';
import { DiagnosticSuite, Dataset } from '../types';

export const Settings: React.FC = () => {
  const { 
    getBackupJson, importBackup, clearAll, loadDemoData, 
    batches, datasets, deleteDataset, updateDatasetName
  } = useData();
  
  // Ref pour l'import de backup JSON uniquement
  const backupInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Diagnostics State
  const [diagResults, setDiagResults] = useState<DiagnosticSuite[] | null>(null);
  const [isRunningDiag, setIsRunningDiag] = useState(false);

  // Renaming State
  const [editingDatasetId, setEditingDatasetId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleDownloadBackup = () => {
    const json = getBackupJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `datascope_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.style.display = 'none';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, 100);
  };

  const handleImportBackupClick = () => {
    backupInputRef.current?.click();
  };

  const handleBackupFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = await importBackup(content);
        if (success) {
          alert('Restauration effectuée avec succès !');
        } else {
          alert('Erreur lors de la restauration. Le fichier est peut-être corrompu.');
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleLoadDemo = () => {
    if (batches.length > 0) {
      if (!window.confirm("Cette action va remplacer vos données actuelles par des données de test. Continuer ?")) {
        return;
      }
    }
    loadDemoData();
    navigate('/');
  };

  const handleReset = () => {
    if (window.confirm("ATTENTION : Cette action va effacer TOUTES les données de l'application localement. Êtes-vous sûr ?")) {
      clearAll();
    }
  };

  const handleDeleteDataset = (id: string, name: string) => {
     if (window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement la typologie "${name}" et tout son historique d'imports ? Cette action est irréversible.`)) {
        deleteDataset(id);
     }
  };

  const handleRunDiagnostics = () => {
     setIsRunningDiag(true);
     setDiagResults(null);
     setTimeout(() => {
        const results = runSelfDiagnostics();
        setDiagResults(results);
        setIsRunningDiag(false);
     }, 800);
  };

  // Renaming Handlers
  const startEditing = (ds: Dataset) => {
      setEditingDatasetId(ds.id);
      setEditName(ds.name);
  };

  const saveEditing = () => {
      if (editingDatasetId && editName.trim()) {
          updateDatasetName(editingDatasetId, editName.trim());
          setEditingDatasetId(null);
      }
  };

  const cancelEditing = () => {
      setEditingDatasetId(null);
      setEditName('');
  };

  return (
    <div className="h-full overflow-y-auto p-4 md:p-8 custom-scrollbar">
       <div className="pb-10 space-y-6"> 
         <h2 className="text-2xl font-bold text-slate-800">Paramètres et maintenance</h2>
         
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Colonne Gauche (Contenu Principal) */}
            <div className="lg:col-span-2 space-y-6">
               
               {/* 1. DIAGNOSTICS */}
               <Card title="Centre de Conformité & Diagnostic">
                  <div className="space-y-4">
                     <p className="text-sm text-slate-600">
                        Vérifiez l'intégrité des moteurs de calcul.
                     </p>

                     <div className="flex items-center gap-4">
                        <Button onClick={handleRunDiagnostics} disabled={isRunningDiag} className="bg-emerald-600 hover:bg-emerald-700">
                           {isRunningDiag ? 'Analyse...' : <><Stethoscope className="w-4 h-4 mr-2" /> Lancer l'audit</>}
                        </Button>
                     </div>

                     {diagResults && (
                        <div className="mt-4 border rounded-lg overflow-hidden animate-in fade-in slide-in-from-top-2">
                           {diagResults.map((suite, idx) => {
                              const failures = suite.tests.filter(t => t.status === 'failure');
                              const isSuccess = failures.length === 0;

                              return (
                                 <div key={idx} className="border-b last:border-0 border-slate-100">
                                    <div className={`p-3 flex justify-between items-center ${isSuccess ? 'bg-slate-50' : 'bg-red-50'}`}>
                                       <h4 className="font-bold text-sm text-slate-800">{suite.category}</h4>
                                       <span className={`text-xs font-bold px-2 py-0.5 rounded ${isSuccess ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                          {isSuccess ? 'Conforme' : `${failures.length} Erreur(s)`}
                                       </span>
                                    </div>
                                    <div className="p-3 bg-white space-y-2">
                                       {suite.tests.map(test => (
                                          <div key={test.id} className="flex items-center justify-between text-xs border-b border-dashed border-slate-100 last:border-0 pb-1 last:pb-0">
                                             <div className="flex items-center gap-2">
                                                {test.status === 'success' ? (
                                                   <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                ) : (
                                                   <XCircle className="w-4 h-4 text-red-500" />
                                                )}
                                                <span className="text-slate-700">{test.name}</span>
                                             </div>
                                          </div>
                                       ))}
                                    </div>
                                 </div>
                              );
                           })}
                        </div>
                     )}
                  </div>
               </Card>

               {/* 2. GESTION DES TYPOLOGIES */}
               <Card title="Gestion des typologies">
                  <div className="space-y-4">
                     <p className="text-sm text-slate-600">
                        Gérez vos typologies de tableaux.
                     </p>
                     
                     <div className="divide-y divide-slate-100 border border-slate-200 rounded-md bg-white">
                        {datasets.length === 0 ? (
                           <div className="p-4 text-center text-slate-400 text-sm italic">
                              Aucune typologie configurée.
                           </div>
                        ) : (
                           datasets.map(ds => {
                              const dsBatches = batches.filter(b => b.datasetId === ds.id);
                              const isEditing = editingDatasetId === ds.id;

                              return (
                                 <div key={ds.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors group">
                                    <div className="flex items-start gap-3 flex-1">
                                       <div className="p-2 bg-blue-50 rounded text-blue-600 mt-0.5">
                                          <Table2 className="w-5 h-5" />
                                       </div>
                                       <div className="flex-1">
                                          {isEditing ? (
                                              <div className="flex items-center gap-2">
                                                  <input 
                                                      type="text" 
                                                      className="border border-slate-300 rounded px-2 py-1 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none w-full max-w-[250px]"
                                                      value={editName}
                                                      onChange={(e) => setEditName(e.target.value)}
                                                      autoFocus
                                                      onKeyDown={(e) => { if(e.key === 'Enter') saveEditing(); if(e.key === 'Escape') cancelEditing(); }}
                                                  />
                                                  <button onClick={saveEditing} className="bg-green-100 text-green-700 p-1.5 rounded hover:bg-green-200"><Check className="w-4 h-4" /></button>
                                                  <button onClick={cancelEditing} className="bg-slate-100 text-slate-600 p-1.5 rounded hover:bg-slate-200"><X className="w-4 h-4" /></button>
                                              </div>
                                          ) : (
                                              <div className="flex items-center gap-2">
                                                  <h4 className="font-bold text-slate-800">{ds.name}</h4>
                                              </div>
                                          )}
                                          
                                          <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500">
                                             <span className="flex items-center gap-1">
                                                <Database className="w-3 h-3" />
                                                {dsBatches.length} import(s)
                                             </span>
                                          </div>
                                       </div>
                                    </div>
                                    
                                    {!isEditing && (
                                        <div className="flex items-center gap-2 shrink-0">
                                            <Button variant="outline" size="sm" onClick={() => startEditing(ds)}>
                                               <Edit2 className="w-4 h-4 mr-2" /> Renommer
                                            </Button>
                                            <Button variant="outline" size="sm" className="text-red-600 border-slate-200" onClick={() => handleDeleteDataset(ds.id, ds.name)}>
                                               <Trash2 className="w-4 h-4 mr-2" /> Supprimer
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
            </div>

            {/* Colonne Droite (Outils) */}
            <div className="space-y-6">
               <Card title="Sauvegarde et restauration">
                 <div className="space-y-4">
                   <p className="text-sm text-slate-600">
                     Sécurisez vos données via un fichier JSON.
                   </p>
                   <div className="flex flex-col gap-3 pt-2">
                     <Button onClick={handleDownloadBackup} disabled={batches.length === 0} className="w-full">
                       <Download className="w-4 h-4 mr-2" /> Télécharger sauvegarde
                     </Button>
                     <div className="relative">
                        <input 
                           type="file" 
                           ref={backupInputRef}
                           className="hidden" 
                           accept=".json" 
                           onChange={handleBackupFileChange}
                        />
                        <Button variant="outline" onClick={handleImportBackupClick} className="w-full">
                           <Upload className="w-4 h-4 mr-2" /> Restaurer sauvegarde
                        </Button>
                     </div>
                   </div>
                 </div>
               </Card>
         
               <Card title="Zone de danger" className="border-red-200 bg-red-50">
                 <div className="space-y-4">
                   <div className="flex items-start gap-3">
                     <div className="p-2 bg-white rounded-full text-red-500 shadow-sm">
                        <ShieldAlert className="w-6 h-6" />
                     </div>
                     <div>
                       <h4 className="font-medium text-red-900">Réinitialisation totale</h4>
                       <p className="text-xs text-red-800 mt-1">
                         Supprime toutes les données définitivement.
                       </p>
                     </div>
                   </div>
                   <div className="pt-2">
                     <Button variant="danger" onClick={handleReset} className="w-full">
                       <Trash2 className="w-4 h-4 mr-2" /> Tout supprimer
                     </Button>
                   </div>
                 </div>
               </Card>
            </div>
         </div>

         <div className="text-center text-xs text-slate-400 pt-8">
           <p>DataScope v{APP_VERSION}</p>
           <p>© 2025 - Application interne</p>
         </div>
       </div>
    </div>
  );
};
