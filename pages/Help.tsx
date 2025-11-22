
import React from 'react';
import { Card } from '../components/ui/Card';
import { 
  LayoutDashboard, History, PieChart, ArrowDownWideNarrow, 
  Settings, ShieldCheck, Database, WifiOff, Layers,
  FileSpreadsheet, Filter, Link as LinkIcon,
  Activity, Radar, LayoutGrid, ListOrdered,
  UploadCloud, Wand2, MousePointerClick, Calculator, Palette
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
                      <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                        <UploadCloud className="w-4 h-4" /> Fichiers ou Copier/Coller
                      </h4>
                      <p className="text-xs text-slate-600 mt-1">
                         Glissez-déposez directement vos fichiers <strong>Excel (.xlsx)</strong> ou CSV. 
                         Vous pouvez toujours utiliser le copier/coller pour des petits volumes de données.
                      </p>
                   </div>
                </div>

                <div className="flex gap-3">
                   <div className="bg-blue-100 text-blue-700 font-bold w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">2</div>
                   <div>
                      <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                         <Wand2 className="w-4 h-4 text-purple-600" /> Nettoyage & Mapping
                      </h4>
                      <p className="text-xs text-slate-600 mt-1">
                         Associez vos colonnes importées aux champs existants.
                         Utilisez la nouvelle <strong>barre d'outils de nettoyage</strong> (cliquez sur une colonne) pour :
                      </p>
                      <ul className="list-disc list-inside text-xs text-slate-500 mt-1 ml-1">
                        <li>Supprimer les espaces inutiles (Trim)</li>
                        <li>Harmoniser la casse (MAJ/min)</li>
                        <li>Supprimer les doublons</li>
                      </ul>
                   </div>
                </div>

                <div className="flex gap-3">
                   <div className="bg-blue-100 text-blue-700 font-bold w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">3</div>
                   <div>
                      <h4 className="font-bold text-slate-700 text-sm">Fusion vs Écrasement</h4>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                         <div className="bg-slate-50 p-2 rounded border border-slate-100">
                            <span className="text-xs font-bold text-green-700 block mb-1">Fusionner</span>
                            <span className="text-[10px] text-slate-500">Ajoute les colonnes sans toucher aux existantes.</span>
                         </div>
                         <div className="bg-slate-50 p-2 rounded border border-slate-100">
                            <span className="text-xs font-bold text-red-700 block mb-1">Écraser</span>
                            <span className="text-[10px] text-slate-500">Remplace totalement la structure du tableau.</span>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
          </Card>

          {/* Guide DONNEES AVANCEES (NEW) */}
          <Card title="Gestion Avancée des Données">
             <div className="space-y-5">
                <div className="flex gap-3">
                   <div className="p-2 bg-indigo-50 rounded text-indigo-600 shrink-0 h-fit">
                      <Calculator className="w-5 h-5" />
                   </div>
                   <div>
                      <h4 className="font-bold text-slate-700 text-sm">Champs Calculés</h4>
                      <p className="text-xs text-slate-600 mt-1">
                         Créez des colonnes virtuelles basées sur des formules mathématiques simples.
                         Ces champs sont recalculés automatiquement à chaque import.
                      </p>
                      <div className="bg-slate-50 text-xs font-mono p-2 mt-2 rounded border border-slate-200 text-slate-600">
                         Exemple : [Prix Unitaire] * [Quantité] * 1.2
                      </div>
                   </div>
                </div>

                <div className="flex gap-3">
                   <div className="p-2 bg-pink-50 rounded text-pink-600 shrink-0 h-fit">
                      <Palette className="w-5 h-5" />
                   </div>
                   <div>
                      <h4 className="font-bold text-slate-700 text-sm">Formatage Conditionnel</h4>
                      <p className="text-xs text-slate-600 mt-1">
                         Définissez des règles visuelles pour mettre en évidence les valeurs critiques dans l'explorateur de données.
                      </p>
                      <div className="flex gap-2 mt-2">
                         <span className="text-[10px] bg-red-100 text-red-700 px-2 py-1 rounded border border-red-200">Si Marge &lt; 0</span>
                         <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded border border-green-200">Si Statut = "Validé"</span>
                      </div>
                   </div>
                </div>
             </div>
          </Card>

          {/* Guide DASHBOARD */}
          <Card title="Tableau de bord Interactif">
             <div className="space-y-4">
                <div className="flex items-start gap-3">
                   <div className="p-2 bg-blue-50 rounded text-blue-600"><LayoutDashboard className="w-5 h-5" /></div>
                   <div>
                      <h4 className="font-bold text-slate-700 text-sm">Widgets & Visualisations</h4>
                      <p className="text-xs text-slate-600 mt-1 mb-2">
                         Créez des indicateurs clés (KPI), graphiques et listes pour piloter votre activité.
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                          <div className="flex items-center gap-1"><Radar className="w-3 h-3" /> Radar</div>
                          <div className="flex items-center gap-1"><LayoutGrid className="w-3 h-3" /> Treemap</div>
                          <div className="flex items-center gap-1"><Filter className="w-3 h-3" /> Entonnoir</div>
                          <div className="flex items-center gap-1"><Activity className="w-3 h-3" /> Jauges</div>
                      </div>
                   </div>
                </div>

                <div className="flex items-start gap-3 bg-blue-50 p-3 rounded border border-blue-100">
                   <div className="p-1.5 bg-white rounded text-blue-600"><MousePointerClick className="w-4 h-4" /></div>
                   <div>
                      <h4 className="font-bold text-blue-900 text-sm">Filtrage Transversal (Drill-down)</h4>
                      <p className="text-xs text-blue-800 mt-1">
                         Le tableau de bord est interactif : <strong>cliquez sur une barre, une part de camembert ou une ligne</strong> pour filtrer instantanément tous les autres widgets selon cette dimension.
                      </p>
                   </div>
                </div>

                <div className="flex items-start gap-3">
                   <div className="p-2 bg-indigo-50 rounded text-indigo-600"><LinkIcon className="w-5 h-5" /></div>
                   <div>
                      <h4 className="font-bold text-slate-700 text-sm">Croisement de données (Jointure)</h4>
                      <p className="text-xs text-slate-600 mt-1">
                         Liez deux tableaux différents dans un même widget (ex: Ventes + RH) en utilisant une clé commune (email, ID...).
                      </p>
                   </div>
                </div>
             </div>
          </Card>

          {/* Guide TCD */}
          <Card title="Tableau croisé dynamique (TCD)">
             <div className="space-y-4">
                <p className="text-sm text-slate-600">
                   Le module TCD est un outil puissant pour synthétiser vos données multi-dimensionnelles.
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                         <Layers className="w-4 h-4 text-slate-400" /> Multi-niveaux
                      </div>
                      <p className="text-xs text-slate-500">
                         Ajoutez jusqu'à 3 niveaux de regroupement en ligne (ex: Pays &gt; Ville &gt; Magasin).
                      </p>
                   </div>
                   
                   <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                         <ArrowDownWideNarrow className="w-4 h-4 text-slate-400" /> Interactif
                      </div>
                      <p className="text-xs text-slate-500">
                         Redimensionnez les colonnes à la souris et triez en cliquant sur les en-têtes.
                      </p>
                   </div>
                </div>
             </div>
          </Card>

          {/* Guide ANALYSE */}
          <Card title="Studio d'analyse">
             <div className="flex flex-col gap-4 h-full">
                <div className="flex gap-3 items-start">
                   <div className="p-2 bg-teal-50 rounded text-teal-600"><PieChart className="w-5 h-5" /></div>
                   <div>
                      <h4 className="font-bold text-slate-700 text-sm">Deux modes de lecture</h4>
                      <ul className="text-xs text-slate-600 mt-1 space-y-2">
                         <li className="flex gap-2">
                            <span className="font-bold text-slate-800">Instantané :</span>
                            Pour une date donnée, quelle est la répartition ?
                         </li>
                         <li className="flex gap-2">
                            <span className="font-bold text-slate-800">Temporel :</span>
                            Comment évolue une donnée spécifique à travers le temps ?
                         </li>
                      </ul>
                   </div>
                </div>
             </div>
          </Card>

          {/* Guide HISTORIQUE */}
          <Card title="Historique & Traçabilité">
             <div className="flex flex-col gap-4 h-full">
                <div className="flex gap-3 items-start">
                   <div className="p-2 bg-emerald-50 rounded text-emerald-600"><History className="w-5 h-5" /></div>
                   <div>
                      <h4 className="font-bold text-slate-700 text-sm">Suivi des modifications</h4>
                      <p className="text-xs text-slate-600 mt-1">
                         Dans l'onglet "Données", cliquez sur une ligne pour ouvrir le volet d'historique.
                         Vous verrez l'évolution exacte de chaque champ au fil des imports, avec les changements mis en évidence.
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
