
import React, { useRef, useState } from 'react';
import { useData } from '../context/DataContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Download, Upload, Trash2, ShieldAlert, WifiOff, Database, PlayCircle, Table2, Calendar, Stethoscope, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { APP_VERSION, runSelfDiagnostics } from '../utils';
import { useNavigate } from 'react-router-dom';
import { DiagnosticSuite } from '../types';

export const Settings: React.FC = () => {
  const { getBackupJson, importBackup, clearAll, loadDemoData, batches, datasets, deleteDataset } = useData();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Diagnostics State
  const [diagResults, setDiagResults] = useState<DiagnosticSuite[] | null>(null);
  const [isRunningDiag, setIsRunningDiag] = useState(false);

  const handleDownloadBackup = () => {
    const json = getBackupJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `datascope_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = importBackup(content);
        if (success) {
          alert('Restauration effectuée avec succès !');
        } else {
          alert('Erreur lors de la restauration. Le fichier est peut-être corrompu.');
        }
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  const handleLoadDemo = () => {
    if (batches.length > 0) {
      if (!window.confirm("Cette action va remplacer vos données actuelles par des données de test. Continuer ?")) {
        return;
      }
    }
    loadDemoData();
    navigate('/'); // Rediriger vers le dashboard pour voir le résultat
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
     
     // Simulation d'un petit délai pour l'UX
     setTimeout(() => {
        const results = runSelfDiagnostics();
        setDiagResults(results);
        setIsRunningDiag(false);
     }, 800);
  };

  return (
    <div className="h-full overflow-y-auto p-4 md:p-8 custom-scrollbar">
       <div className="pb-10 space-y-6"> 
         <h2 className="text-2xl font-bold text-slate-800">Paramètres et maintenance</h2>
         
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column (Main Content) */}
            <div className="lg:col-span-2 space-y-6">
               
               {/* DIAGNOSTICS & COMPLIANCE (NOUVEAU) */}
               <Card title="Centre de Conformité & Diagnostic">
                  <div className="space-y-4">
                     <p className="text-sm text-slate-600">
                        Vérifiez l'intégrité des moteurs de calcul (parsing, formules, dates) pour garantir la fiabilité des analyses.
                        Utile avant de présenter des chiffres critiques.
                     </p>

                     <div className="flex items-center gap-4">
                        <Button onClick={handleRunDiagnostics} disabled={isRunningDiag} className="bg-emerald-600 hover:bg-emerald-700">
                           {isRunningDiag ? (
                              <>Exécution en cours...</>
                           ) : (
                              <><Stethoscope className="w-4 h-4 mr-2" /> Lancer l'audit de conformité</>
                           )}
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
                                             {test.message && (
                                                <span className="text-red-600 font-mono bg-red-50 px-1 rounded">{test.message}</span>
                                             )}
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

               {/* GESTION DES DATASETS */}
               <Card title="Gestion des typologies">
                  <div className="space-y-4">
                     <p className="text-sm text-slate-600">
                        Gérez vos typologies de tableaux. La suppression d'une typologie efface également tout l'historique des données associées.
                     </p>
                     
                     <div className="divide-y divide-slate-100 border border-slate-200 rounded-md bg-white">
                        {datasets.length === 0 ? (
                           <div className="p-4 text-center text-slate-400 text-sm italic">
                              Aucune typologie configurée.
                           </div>
                        ) : (
                           datasets.map(ds => {
                              const dsBatches = batches.filter(b => b.datasetId === ds.id);
                              const lastUpdate = dsBatches.length > 0 
                                 ? Math.max(...dsBatches.map(b => b.createdAt)) 
                                 : ds.createdAt;
                              
                              return (
                                 <div key={ds.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                                    <div className="flex items-start gap-3">
                                       <div className="p-2 bg-blue-50 rounded text-blue-600 mt-0.5">
                                          <Table2 className="w-5 h-5" />
                                       </div>
                                       <div>
                                          <h4 className="font-bold text-slate-800">{ds.name}</h4>
                                          <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500">
                                             <span className="flex items-center gap-1">
                                                <Database className="w-3 h-3" />
                                                {dsBatches.length} import(s)
                                             </span>
                                             <span className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                MAJ : {new Date(lastUpdate).toLocaleDateString('fr-FR')}
                                             </span>
                                             <span>
                                                • {ds.fields.length} colonnes
                                             </span>
                                          </div>
                                       </div>
                                    </div>
                                    
                                    <Button 
                                       variant="outline" 
                                       size="sm" 
                                       className="text-red-600 hover:bg-red-50 hover:border-red-200 border-slate-200"
                                       onClick={() => handleDeleteDataset(ds.id, ds.name)}
                                    >
                                       <Trash2 className="w-4 h-4 mr-2" />
                                       Supprimer
                                    </Button>
                                 </div>
                              );
                           })
                        )}
                     </div>
                  </div>
               </Card>

               <Card title="Confidentialité & stockage" className="border-blue-200 bg-blue-50">
                  <div className="flex items-start gap-4 text-blue-900">
                    <div className="p-2 bg-white rounded-full shadow-sm">
                       <WifiOff className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-bold text-lg">Mode 100% local</p>
                      <p className="mt-1 text-blue-800 text-sm leading-relaxed">
                        Cette application s'exécute exclusivement dans votre navigateur. 
                        Aucune donnée n'est transmise vers un serveur externe ou le cloud.
                        Vos informations sont stockées dans la mémoire locale de votre poste.
                      </p>
                    </div>
                  </div>
               </Card>
            </div>

            {/* Right Column (Controls) */}
            <div className="space-y-6">
               
               <Card title="Sauvegarde et restauration">
                 <div className="space-y-4">
                   <p className="text-sm text-slate-600">
                     Pour sécuriser vos données ou les transférer sur un autre poste, effectuez des sauvegardes régulières via le fichier JSON.
                   </p>
                   
                   <div className="flex flex-col gap-3 pt-2">
                     <Button onClick={handleDownloadBackup} disabled={batches.length === 0} className="w-full">
                       <Download className="w-4 h-4 mr-2" />
                       Télécharger la sauvegarde
                     </Button>
                     
                     <Button variant="outline" onClick={handleImportClick} className="w-full">
                       <Upload className="w-4 h-4 mr-2" />
                       Restaurer une sauvegarde
                     </Button>
                     <input 
                       type="file" 
                       ref={fileInputRef} 
                       className="hidden" 
                       accept=".json" 
                       onChange={handleFileChange}
                     />
                   </div>
                 </div>
               </Card>
         
               <Card title="Jeu de données de test" className="border-indigo-100">
                 <div className="flex items-start gap-3">
                   <div className="p-2 bg-indigo-50 rounded-full text-indigo-600">
                     <Database className="w-5 h-5" />
                   </div>
                   <div className="flex-1">
                     <h4 className="font-medium text-slate-900">Données de démonstration</h4>
                     <p className="text-sm text-slate-600 mt-1 mb-3">
                       Générez automatiquement un historique de données fictives sur 6 mois.
                     </p>
                     <Button variant="secondary" onClick={handleLoadDemo} className="w-full">
                       <PlayCircle className="w-4 h-4 mr-2" />
                       Générer données démo
                     </Button>
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
                         Supprime toutes les typologies et tout l'historique définitivement.
                       </p>
                     </div>
                   </div>
                   <div className="pt-2">
                     <Button variant="danger" onClick={handleReset} className="w-full">
                       <Trash2 className="w-4 h-4 mr-2" />
                       Tout supprimer
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
