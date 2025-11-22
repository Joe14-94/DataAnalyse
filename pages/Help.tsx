
import React from 'react';
import { Card } from '../components/ui/Card';
import { 
  LayoutDashboard, Upload, History, PieChart, ArrowDownWideNarrow, 
  Settings, ShieldCheck, Database, WifiOff, Edit2, Layers,
  FileSpreadsheet, Filter, CheckCircle, AlertTriangle
} from 'lucide-react';

export const Help: React.FC = () => {
  return (
    <div className="h-full overflow-y-auto p-4 md:p-8 custom-scrollbar">
      <div className="space-y-8 pb-12">
        
        {/* HEADER */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-800">Aide et informations</h2>
          <p className="text-slate-600 max-w-3xl">
            Bienvenue dans le guide d'utilisation de <strong>DataScope</strong>. 
            Retrouvez ici toutes les informations pour maîtriser cet outil d'analyse et de suivi de données tabulaires.
          </p>
        </div>

        {/* 1. CONCEPT GENERAL */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border-l-4 border-l-blue-500">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-50 rounded-full text-blue-600 hidden sm:block">
                 <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">Qu'est-ce que DataScope ?</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">
                  DataScope est une application web autonome ("Local First") conçue pour vous permettre 
                  d'analyser l'évolution de vos données (Excel, CSV) dans le temps.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-3 rounded border border-slate-100">
                     <div className="flex items-center gap-2 font-bold text-slate-700 mb-1">
                        <WifiOff className="w-4 h-4" /> 100 % local et confidentiel
                     </div>
                     <p className="text-xs text-slate-500">
                        Vos données ne quittent jamais votre navigateur. Aucun serveur distant n'y a accès.
                        Tout est stocké dans la mémoire locale de votre poste.
                     </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded border border-slate-100">
                     <div className="flex items-center gap-2 font-bold text-slate-700 mb-1">
                        <Database className="w-4 h-4" /> Multi-typologies
                     </div>
                     <p className="text-xs text-slate-500">
                        Gérez plusieurs types de tableaux (RH, Ventes, Stocks...) au sein de la même interface 
                        sans mélanger les données.
                     </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
          
          <Card className="bg-indigo-50 border-indigo-100">
             <div className="h-full flex flex-col justify-center">
                <h3 className="font-bold text-indigo-900 mb-2 flex items-center gap-2">
                   <Settings className="w-5 h-5" /> Sauvegarde impérative
                </h3>
                <p className="text-sm text-indigo-800 mb-4">
                   Puisque DataScope fonctionne sans serveur, <strong>si vous videz le cache de votre navigateur, vous perdez vos données</strong>.
                </p>
                <div className="text-xs bg-white p-3 rounded border border-indigo-200 text-slate-600">
                   Allez dans <strong>Paramètres > Sauvegarde</strong> pour télécharger régulièrement votre fichier <code>.json</code> de sécurité.
                </div>
             </div>
          </Card>
        </div>

        {/* 2. GUIDES PAR FONCTIONNALITÉ */}
        <h3 className="text-xl font-bold text-slate-800 mt-8 mb-4">Guides d'utilisation</h3>
        
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          
          {/* Guide IMPORT */}
          <Card title="Importation des données">
             <div className="space-y-5">
                <div className="flex gap-3">
                   <div className="bg-blue-100 text-blue-700 font-bold w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">1</div>
                   <div>
                      <h4 className="font-bold text-slate-700 text-sm">Copier / coller</h4>
                      <p className="text-xs text-slate-600 mt-1">
                         Ouvrez votre Excel, sélectionnez vos cellules (avec les titres !) et collez-les dans la zone de texte.
                         DataScope détecte automatiquement le format.
                      </p>
                   </div>
                </div>

                <div className="flex gap-3">
                   <div className="bg-blue-100 text-blue-700 font-bold w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">2</div>
                   <div>
                      <h4 className="font-bold text-slate-700 text-sm">Mapping intelligent</h4>
                      <p className="text-xs text-slate-600 mt-1">
                         Associez vos colonnes importées aux champs existants pour assurer la continuité de l'historique.
                         Vous pouvez ignorer des colonnes inutiles ou en créer de nouvelles.
                      </p>
                   </div>
                </div>

                <div className="flex gap-3">
                   <div className="bg-blue-100 text-blue-700 font-bold w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">3</div>
                   <div>
                      <h4 className="font-bold text-slate-700 text-sm">Modes de mise à jour</h4>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                         <div className="bg-slate-50 p-2 rounded border border-slate-100">
                            <span className="text-xs font-bold text-green-700 block mb-1">Fusionner</span>
                            <span className="text-[10px] text-slate-500">Ajoute les nouvelles colonnes sans toucher aux données existantes.</span>
                         </div>
                         <div className="bg-slate-50 p-2 rounded border border-slate-100">
                            <span className="text-xs font-bold text-red-700 block mb-1">Écraser</span>
                            <span className="text-[10px] text-slate-500">Remplace la structure du tableau par celle du nouveau fichier.</span>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
          </Card>

          {/* Guide TCD */}
          <Card title="Tableau croisé dynamique (TCD)">
             <div className="space-y-4">
                <p className="text-sm text-slate-600">
                   Le module TCD est un outil puissant pour synthétiser vos données.
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                         <Layers className="w-4 h-4 text-slate-400" /> Multi-niveaux
                      </div>
                      <p className="text-xs text-slate-500">
                         Ajoutez jusqu'à 3 niveaux de regroupement en ligne (ex: Pays > Ville > Magasin).
                      </p>
                   </div>

                   <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                         <ArrowDownWideNarrow className="w-4 h-4 text-slate-400" /> Redimensionnement
                      </div>
                      <p className="text-xs text-slate-500">
                         Glissez les bordures des en-têtes de colonnes pour ajuster la largeur du tableau à votre convenance.
                      </p>
                   </div>
                   
                   <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                         <Filter className="w-4 h-4 text-slate-400" /> Tri interactif
                      </div>
                      <p className="text-xs text-slate-500">
                         Cliquez sur les en-têtes (libellés ou "Total") pour trier les données par ordre alphabétique ou par valeur.
                      </p>
                   </div>
                </div>
             </div>
          </Card>

          {/* Guide ANALYSE */}
          <Card title="Studio d'analyse">
             <div className="flex flex-col gap-4 h-full">
                <div className="flex gap-3 items-start">
                   <div className="p-2 bg-indigo-50 rounded text-indigo-600"><PieChart className="w-5 h-5" /></div>
                   <div>
                      <h4 className="font-bold text-slate-700 text-sm">Deux modes de lecture</h4>
                      <ul className="text-xs text-slate-600 mt-1 space-y-2">
                         <li className="flex gap-2">
                            <span className="font-bold text-slate-800">Instantané :</span>
                            Pour une date donnée, quelle est la répartition ? (Barres, Camembert, Radar...)
                         </li>
                         <li className="flex gap-2">
                            <span className="font-bold text-slate-800">Temporel :</span>
                            Comment évolue une donnée spécifique à travers le temps ? (Courbes, Aires)
                         </li>
                      </ul>
                   </div>
                </div>
                <div className="bg-slate-50 p-3 rounded border border-slate-100 mt-auto">
                   <h4 className="font-bold text-slate-700 text-xs mb-1 flex items-center gap-1"><Filter className="w-3 h-3" /> Filtres avancés</h4>
                   <p className="text-xs text-slate-500">
                      Vous pouvez appliquer plusieurs filtres cumulatifs pour isoler une population précise avant de lancer l'analyse.
                   </p>
                </div>
             </div>
          </Card>

          {/* Guide HISTORIQUE */}
          <Card title="Données et historique">
             <div className="flex flex-col gap-4 h-full">
                <div className="flex gap-3 items-start">
                   <div className="p-2 bg-emerald-50 rounded text-emerald-600"><History className="w-5 h-5" /></div>
                   <div>
                      <h4 className="font-bold text-slate-700 text-sm">Traçabilité complète</h4>
                      <p className="text-xs text-slate-600 mt-1">
                         Chaque import est conservé. Dans l'onglet "Données", cliquez sur une ligne pour ouvrir le volet de détail 
                         et voir comment cette donnée a évolué au fil des imports (changements de valeurs mis en évidence).
                      </p>
                   </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-auto">
                   <div className="bg-slate-50 p-3 rounded border border-slate-100">
                      <h4 className="font-bold text-slate-700 text-xs mb-1 flex items-center gap-1"><FileSpreadsheet className="w-3 h-3" /> Exports</h4>
                      <p className="text-[10px] text-slate-500">
                         Exportez vos données consolidées ou un import spécifique au format CSV standard.
                      </p>
                   </div>
                   <div className="bg-slate-50 p-3 rounded border border-slate-100">
                      <h4 className="font-bold text-slate-700 text-xs mb-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Correction</h4>
                      <p className="text-[10px] text-slate-500">
                         Un import erroné ? Allez dans "Historique imports" pour supprimer spécifiquement ce lot de données.
                      </p>
                   </div>
                </div>
             </div>
          </Card>

        </div>
      </div>
    </div>
  );
};
