import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import {
  LayoutDashboard, History, PieChart, ArrowDownWideNarrow,
  Settings, ShieldCheck, Database, WifiOff, Layers,
  FileSpreadsheet, Filter, Link as LinkIcon,
  Activity, Radar, LayoutGrid, ListOrdered,
  UploadCloud, Wand2, MousePointerClick, Calculator, Palette,
  Save, Search, Building2, GitBranch, CalendarDays, Users, FileText, Plus, CheckCircle
} from 'lucide-react';

type HelpSection = 'general' | 'import' | 'data' | 'dashboard' | 'pivot' | 'analytics' | 'finance';

export const Help: React.FC = () => {
  const [activeSection, setActiveSection] = useState<HelpSection>('general');

  const sections = [
    { id: 'general' as const, label: 'Présentation', icon: ShieldCheck },
    { id: 'import' as const, label: 'Import & Nettoyage', icon: UploadCloud },
    { id: 'data' as const, label: 'Gestion des données', icon: Database },
    { id: 'dashboard' as const, label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'pivot' as const, label: 'TCD & Studio', icon: PieChart },
    { id: 'finance' as const, label: 'Finance & Compta', icon: Building2 },
  ];

  return (
    <div className="h-full overflow-y-auto p-4 md:p-8 custom-scrollbar">
      <div className="space-y-6 pb-12">

        {/* HEADER */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-800">Aide et informations</h2>
          <p className="text-slate-600 max-w-3xl">
            Bienvenue dans le guide d'utilisation de <strong>DataScope</strong>.
            Retrouvez ici toutes les informations pour maîtriser cet outil d'analyse et de suivi de données tabulaires.
          </p>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
          {sections.map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-bold transition-all ${
                activeSection === section.id
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <section.icon className="w-4 h-4" />
              {section.label}
            </button>
          ))}
        </div>

        {/* SECTION CONTENT */}
        <div className="mt-6">

          {/* GENERAL SECTION */}
          {activeSection === 'general' && (
            <div className="space-y-6">
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
                      Allez dans <strong>Paramètres &gt; Sauvegarde</strong> pour télécharger régulièrement votre fichier <code>.json</code> de sécurité.
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* IMPORT SECTION */}
          {activeSection === 'import' && (
            <div className="space-y-6">
              <Card title="Importation des données" icon={<UploadCloud className="w-5 h-5 text-brand-600" />}>
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
                            <span className="text-xs text-slate-500">Ajoute les colonnes sans toucher aux existantes.</span>
                         </div>
                         <div className="bg-slate-50 p-2 rounded border border-slate-100">
                            <span className="text-xs font-bold text-red-700 block mb-1">Écraser</span>
                            <span className="text-xs text-slate-500">Remplace totalement la structure du tableau.</span>
                         </div>
                      </div>
                   </div>
                </div>
                </div>
              </Card>
            </div>
          )}

          {/* DATA SECTION */}
          {activeSection === 'data' && (
            <div className="space-y-6">
              <Card title="Gestion Avancée des Données" icon={<Database className="w-5 h-5 text-brand-600" />}>
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
                         <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded border border-red-200">Si Marge &lt; 0</span>
                         <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded border border-green-200">Si Statut = "Validé"</span>
                      </div>
                   </div>
                </div>
                </div>
              </Card>

              <Card title="Analyses & Sauvegardes" icon={<Save className="w-5 h-5 text-brand-600" />}>
             <div className="space-y-5">
                <div className="flex gap-3">
                    <div className="p-2 bg-teal-50 rounded text-teal-600 shrink-0 h-fit">
                       <Save className="w-5 h-5" />
                    </div>
                    <div>
                       <h4 className="font-bold text-slate-700 text-sm">Vues Enregistrées</h4>
                       <p className="text-xs text-slate-600 mt-1">
                          Ne perdez plus de temps à reconfigurer vos filtres. Dans le <strong>Studio d'Analyse</strong> et le <strong>TCD</strong>,
                          cliquez sur l'icône <Save className="w-3 h-3 inline mx-0.5"/> pour sauvegarder votre configuration actuelle.
                          Retrouvez-la plus tard via le menu déroulant.
                       </p>
                    </div>
                </div>
                
                <div className="flex gap-3">
                    <div className="p-2 bg-purple-50 rounded text-purple-600 shrink-0 h-fit">
                       <Search className="w-5 h-5" />
                    </div>
                    <div>
                       <h4 className="font-bold text-slate-700 text-sm">Navigation Contextuelle (Drill-down)</h4>
                       <p className="text-xs text-slate-600 mt-1">
                          Creusez vos données ! Dans le <strong>Tableau Croisé Dynamique (TCD)</strong>, 
                          cliquez sur n'importe quel chiffre du tableau (ou une étiquette de ligne). 
                          Cela vous redirigera automatiquement vers l'onglet <strong>Données</strong>, filtré pour n'afficher 
                          que les lignes correspondantes à cette sélection.
                       </p>
                    </div>
                </div>
                </div>
              </Card>
            </div>
          )}

          {/* DASHBOARD SECTION */}
          {activeSection === 'dashboard' && (
            <div className="space-y-6">
              <Card title="Tableau de bord Interactif" icon={<LayoutDashboard className="w-5 h-5 text-brand-600" />}>
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
            </div>
          )}

          {/* PIVOT & ANALYTICS SECTION */}
          {activeSection === 'pivot' && (
            <div className="space-y-6">
              <Card title="Tableau croisé dynamique (TCD)" icon={<Layers className="w-5 h-5 text-brand-600" />}>
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

              <Card title="Studio d'analyse" icon={<PieChart className="w-5 h-5 text-brand-600" />}>
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

              <Card title="Historique & Traçabilité" icon={<History className="w-5 h-5 text-brand-600" />}>
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
          )}

          {/* FINANCE SECTION (NEW) */}
          {activeSection === 'finance' && (
            <div className="space-y-6">
              <Card className="border-l-4 border-l-brand-500">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-brand-50 rounded-full text-brand-600 hidden sm:block">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 mb-2">Référentiels Finance & Comptabilité</h3>
                    <p className="text-sm text-slate-600 leading-relaxed mb-4">
                      DataScope intègre maintenant des fonctionnalités avancées pour la gestion comptable et financière.
                      Ces référentiels permettent de structurer vos analyses selon les normes comptables (PCG, IFRS)
                      et de réaliser des reporting financiers professionnels.
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                      <p className="font-bold mb-1">📍 Accès</p>
                      <p>Allez dans <strong>Paramètres</strong> &gt; Section <strong>"Référentiels Finance & Comptabilité"</strong></p>
                    </div>
                  </div>
                </div>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Plans Comptables */}
                <Card title="Plans Comptables" icon={<FileText className="w-5 h-5 text-brand-600" />}>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-50 rounded text-blue-600 shrink-0 h-fit">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-700 text-sm mb-2">Qu'est-ce qu'un plan comptable ?</h4>
                        <p className="text-xs text-slate-600 mb-3">
                          Un plan comptable est une nomenclature standardisée de comptes permettant de classer
                          et d'enregistrer les opérations comptables selon des normes (PCG français ou IFRS international).
                        </p>

                        <h5 className="font-bold text-slate-700 text-xs mb-2">Comment l'utiliser ?</h5>
                        <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside">
                          <li>Dans <strong>Paramètres</strong>, onglet <strong>"Plans comptables"</strong></li>
                          <li>Cliquez sur <strong>"Importer PCG"</strong> (150+ comptes) ou <strong>"Importer IFRS"</strong> (80+ comptes)</li>
                          <li>Le plan importé devient disponible pour vos analyses</li>
                        </ol>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3 rounded border border-slate-100">
                      <h5 className="text-xs font-bold text-slate-700 mb-2">Templates disponibles</h5>
                      <ul className="text-xs text-slate-600 space-y-1">
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-3 h-3 text-green-600 shrink-0 mt-0.5" />
                          <span><strong>PCG 2020</strong> : Plan Comptable Général (France) - 7 classes, hiérarchie complète</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-3 h-3 text-green-600 shrink-0 mt-0.5" />
                          <span><strong>IFRS</strong> : International Financial Reporting Standards - Structure internationale</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </Card>

                {/* Axes Analytiques */}
                <Card title="Axes Analytiques" icon={<GitBranch className="w-5 h-5 text-brand-600" />}>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-purple-50 rounded text-purple-600 shrink-0 h-fit">
                        <GitBranch className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-700 text-sm mb-2">Qu'est-ce qu'un axe analytique ?</h4>
                        <p className="text-xs text-slate-600 mb-3">
                          Les axes analytiques permettent d'analyser vos données financières selon plusieurs dimensions
                          (centres de coûts, projets, business units, zones géographiques...) pour un pilotage multi-dimensionnel.
                        </p>

                        <h5 className="font-bold text-slate-700 text-xs mb-2">Comment créer un axe ?</h5>
                        <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside">
                          <li>Dans <strong>Paramètres</strong>, onglet <strong>"Axes analytiques"</strong></li>
                          <li>Cliquez sur <strong>"Nouvel axe"</strong></li>
                          <li>Remplissez le formulaire :
                            <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                              <li><strong>Code</strong> : Identifiant court (ex: CC, PRJ, BU)</li>
                              <li><strong>Nom</strong> : Libellé explicite (ex: "Centre de coûts")</li>
                              <li><strong>Obligatoire</strong> : Si coché, l'axe sera requis pour chaque écriture</li>
                              <li><strong>Ventilation multiple</strong> : Permet de répartir une opération sur plusieurs valeurs</li>
                            </ul>
                          </li>
                        </ol>
                      </div>
                    </div>

                    <div className="bg-amber-50 p-3 rounded border border-amber-100">
                      <h5 className="text-xs font-bold text-amber-900 mb-1">💡 Exemple</h5>
                      <p className="text-xs text-amber-800">
                        Créez un axe "Centre de coûts" (code: CC) pour analyser vos charges
                        par département (R&D, Marketing, Production...).
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Calendrier Fiscal */}
                <Card title="Calendrier Fiscal" icon={<CalendarDays className="w-5 h-5 text-brand-600" />}>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-teal-50 rounded text-teal-600 shrink-0 h-fit">
                        <CalendarDays className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-700 text-sm mb-2">Qu'est-ce qu'un calendrier fiscal ?</h4>
                        <p className="text-xs text-slate-600 mb-3">
                          Le calendrier fiscal définit votre exercice comptable et ses périodes (mensuelles, trimestrielles).
                          Il permet de structurer votre reporting et de gérer les clôtures périodiques.
                        </p>

                        <h5 className="font-bold text-slate-700 text-xs mb-2">Comment créer un exercice ?</h5>
                        <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside">
                          <li>Dans <strong>Paramètres</strong>, onglet <strong>"Calendrier fiscal"</strong></li>
                          <li>Cliquez sur <strong>"Nouvel exercice"</strong></li>
                          <li>Remplissez :
                            <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                              <li><strong>Année fiscale</strong> : Ex: 2025</li>
                              <li><strong>Date de début</strong> : Ex: 01/01/2025</li>
                              <li><strong>Date de fin</strong> : Ex: 31/12/2025</li>
                            </ul>
                          </li>
                          <li>Les périodes mensuelles sont <strong>générées automatiquement</strong></li>
                        </ol>
                      </div>
                    </div>

                    <div className="bg-green-50 p-3 rounded border border-green-100">
                      <h5 className="text-xs font-bold text-green-900 mb-1">✅ Fonctionnalités</h5>
                      <ul className="text-xs text-green-800 space-y-1">
                        <li>• Génération automatique de 12 périodes mensuelles</li>
                        <li>• Support des exercices décalés (ex: 01/07/2025 → 30/06/2026)</li>
                        <li>• Clôture périodique (à venir)</li>
                      </ul>
                    </div>
                  </div>
                </Card>

                {/* Tiers & Produits */}
                <Card title="Tiers & Produits (Master Data)" icon={<Users className="w-5 h-5 text-brand-600" />}>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-indigo-50 rounded text-indigo-600 shrink-0 h-fit">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-700 text-sm mb-2">Qu'est-ce que le master data ?</h4>
                        <p className="text-xs text-slate-600 mb-3">
                          Les données de référence regroupent l'ensemble des informations sur vos clients, fournisseurs,
                          produits et employés. Elles enrichissent vos analyses en permettant des jointures et des segmentations.
                        </p>

                        <h5 className="font-bold text-slate-700 text-xs mb-2">Comment ajouter un tiers/produit ?</h5>
                        <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside">
                          <li>Dans <strong>Paramètres</strong>, onglet <strong>"Tiers & produits"</strong></li>
                          <li>Cliquez sur <strong>"Ajouter"</strong> dans la catégorie souhaitée :
                            <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                              <li><strong>Clients</strong> : Vos clients avec N° TVA/SIREN</li>
                              <li><strong>Fournisseurs</strong> : Vos fournisseurs avec N° SIRET</li>
                              <li><strong>Produits</strong> : Catalogue produits/services</li>
                              <li><strong>Salariés</strong> : Personnel pour analyses RH</li>
                            </ul>
                          </li>
                          <li>Remplissez code, nom, catégorie et infos fiscales</li>
                        </ol>
                      </div>
                    </div>

                    <div className="bg-purple-50 p-3 rounded border border-purple-100">
                      <h5 className="text-xs font-bold text-purple-900 mb-1">🎯 Cas d'usage</h5>
                      <p className="text-xs text-purple-800">
                        Associez vos écritures comptables à des clients pour générer des analyses
                        de rentabilité client, ou à des produits pour suivre les marges par gamme.
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};