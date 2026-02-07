import React from 'react';
import {
  HelpCircle,
  Database,
  BarChart3,
  Table as TableIcon,
  Settings,
  FileJson,
  LayoutDashboard,
  Filter,
  ArrowRightLeft,
  Calculator,
  Download,
  Terminal,
  FileBarChart,
  History,
  PencilLine,
  Search,
  Zap,
  CheckCircle2,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/Tabs';

export const Help: React.FC = () => {
  return (
    <div className="h-full overflow-y-auto bg-slate-50 custom-scrollbar p-4 md:p-8">
      <div className="w-full space-y-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-brand-600 rounded-xl text-white shadow-lg shadow-brand-200">
            <HelpCircle className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Aide & Informations</h1>
            <p className="text-slate-500">
              Maîtrisez DataScope et exploitez tout le potentiel de vos données.
            </p>
          </div>
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Aperçu & Nouveautés</TabsTrigger>
            <TabsTrigger value="guide">Guide complet</TabsTrigger>
            <TabsTrigger value="etl">Pipelines ETL</TabsTrigger>
            <TabsTrigger value="functions">Fonctions & Formules</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-6">
                <Card className="border-l-4 border-l-brand-600">
                  <div className="p-6">
                    <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <Zap className="w-5 h-5 text-amber-500" /> Nouveautés Janvier 2026
                    </h2>
                    <div className="space-y-4">
                      <div className="flex gap-4 p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
                        <div className="p-2 bg-brand-50 rounded-lg text-brand-600 h-fit">
                          <Filter className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800 text-sm">
                            TCD : Filtrage Avancé
                          </h3>
                          <p className="text-xs text-slate-600">
                            Définissez des règles précises (égal, contient, supérieur à...) sur
                            n'importe quel champ de filtre.
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-4 p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
                        <div className="p-2 bg-purple-50 rounded-lg text-purple-600 h-fit">
                          <PencilLine className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800 text-sm">
                            Mode Édition & Renommage
                          </h3>
                          <p className="text-xs text-slate-600">
                            Renommez vos colonnes et lignes en un clic grâce au nouveau mode édition
                            dédié dans le Studio.
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-4 p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
                        <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600 h-fit">
                          <FileBarChart className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800 text-sm">
                            Rapports Personnalisés
                          </h3>
                          <p className="text-xs text-slate-600">
                            Envoyez des sélections spécifiques du TCD vers votre dashboard sous
                            forme de nouveaux widgets.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card>
                  <div className="p-6">
                    <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <History className="w-5 h-5 text-indigo-500" /> Version 2026-01-29-01
                    </h2>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Cette mise à jour majeure consolide les capacités d'analyse
                      multi-dimensionnelle et renforce la portabilité des configurations via le
                      nouveau système de sauvegarde sélective.
                    </p>
                  </div>
                </Card>
              </div>

              <div className="space-y-6">
                <div className="bg-brand-900 rounded-2xl p-6 text-white shadow-xl">
                  <h3 className="font-bold mb-4 flex items-center gap-2">
                    <Database className="w-5 h-5 text-brand-300" /> État des données
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-brand-300">Confidentialité</span>
                      <span className="font-bold text-emerald-400">100% Locale</span>
                    </div>
                    <div className="w-full bg-brand-800 rounded-full h-1">
                      <div className="bg-emerald-400 h-1 rounded-full w-full"></div>
                    </div>
                    <p className="text-xs text-brand-200 leading-relaxed mt-4">
                      Toutes vos analyses sont stockées dans le cache de votre navigateur. Aucune
                      donnée n'est envoyée sur un serveur.
                    </p>
                    <div className="text-xs bg-white/10 p-3 rounded-lg border border-white/10 mt-4">
                      <strong>Recommandation :</strong> Utilisez le menu{' '}
                      <strong>Paramètres &gt; Sauvegarde</strong> pour exporter régulièrement votre
                      fichier <code>.json</code>.
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                  <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                    <div>
                      <h4 className="font-bold text-amber-900 text-sm mb-1">Attention</h4>
                      <p className="text-xs text-amber-800 leading-relaxed">
                        Le nettoyage du cache du navigateur supprimera vos données et pipelines ETL.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="guide">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card
                title="1. Importation & Mapping"
                icon={<Download className="w-5 h-5 text-brand-600" />}
              >
                <div className="space-y-3">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Glissez vos fichiers CSV ou Excel dans la zone d'import. Le système détecte
                    automatiquement les colonnes.
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5" />
                      <span>
                        <strong>Smart Mapping :</strong> Liez vos colonnes aux champs du système une
                        seule fois, DataScope s'en souviendra.
                      </span>
                    </li>
                    <li className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5" />
                      <span>
                        <strong>Batches :</strong> Vos données sont organisées par lots
                        d'importation pour une meilleure traçabilité.
                      </span>
                    </li>
                  </ul>
                </div>
              </Card>

              <Card
                title="2. Analyse Studio (TCD)"
                icon={<TableIcon className="w-5 h-5 text-purple-600" />}
              >
                <div className="space-y-3">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Le coeur de DataScope. Faites glisser vos champs pour construire vos analyses.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 bg-slate-50 rounded border border-slate-100 text-xs text-slate-600">
                      <strong>Lignes/Cols :</strong> Dimensions d'analyse
                    </div>
                    <div className="p-2 bg-slate-50 rounded border border-slate-100 text-xs text-slate-600">
                      <strong>Valeurs :</strong> Métriques calculées
                    </div>
                  </div>
                  <p className="text-xs text-brand-600 font-bold italic">
                    Astuce : Cliquez sur un chiffre pour voir le détail des lignes (Drill-down).
                  </p>
                </div>
              </Card>

              <Card
                title="3. Tableau de Bord"
                icon={<LayoutDashboard className="w-5 h-5 text-brand-600" />}
              >
                <p className="text-xs text-slate-600 leading-relaxed">
                  Épinglez vos graphiques et tableaux pour créer un cockpit de pilotage en temps
                  réel. Utilisez les filtres globaux pour explorer vos données sous tous les angles.
                </p>
              </Card>

              <Card
                title="4. Export & Partage"
                icon={<ArrowRightLeft className="w-5 h-5 text-indigo-600" />}
              >
                <p className="text-xs text-slate-600 leading-relaxed">
                  Exportez vos résultats vers Excel, PDF ou image. Partagez vos configurations avec
                  vos collègues en exportant uniquement la structure de votre analyse.
                </p>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="etl">
            <Card className="bg-slate-900 border-none text-white shadow-2xl">
              <div className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-emerald-500 rounded-lg text-white">
                    <Terminal className="w-6 h-6" />
                  </div>
                  <h2 className="text-2xl font-bold">Pipelines ETL</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                  <div className="space-y-2">
                    <div className="text-emerald-400 font-bold flex items-center gap-2">
                      <ChevronRight className="w-4 h-4" /> Extract
                    </div>
                    <p className="text-xs text-slate-400">
                      Lecture des sources brutes (Excel/CSV/Paste).
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="text-emerald-400 font-bold flex items-center gap-2">
                      <ChevronRight className="w-4 h-4" /> Transform
                    </div>
                    <p className="text-xs text-slate-400">
                      Renommage, filtres, nettoyage et calculs automatiques.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="text-emerald-400 font-bold flex items-center gap-2">
                      <ChevronRight className="w-4 h-4" /> Load
                    </div>
                    <p className="text-xs text-slate-400">
                      Intégration propre dans votre base de données locale.
                    </p>
                  </div>
                </div>
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <h4 className="font-bold text-sm mb-2">Pourquoi utiliser les Pipelines ?</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Si vous importez les mêmes fichiers chaque mois, les pipelines automatisent les
                    tâches répétitives de mise en forme. Définissez vos règles une fois, et laissez
                    DataScope faire le travail à chaque import.
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="functions">
            <div className="space-y-6">
              <Card
                title="Assistant de Calculs"
                icon={<Calculator className="w-5 h-5 text-indigo-600" />}
              >
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  DataScope supporte un large éventail de fonctions pour enrichir vos données.
                  L'assistant de création vous aide à construire vos formules sans erreur.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <h4 className="font-bold text-xs text-slate-800 mb-2">
                      Arithmétique & Logique
                    </h4>
                    <ul className="text-xs text-slate-500 space-y-1">
                      <li>
                        <code>+ , - , * , /</code> : Opérations de base
                      </li>
                      <li>
                        <code>SI(condition; vrai; faux)</code> : Test logique
                      </li>
                      <li>
                        <code>ET(c1; c2) , OU(c1; c2)</code> : Combinaisons
                      </li>
                    </ul>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <h4 className="font-bold text-xs text-slate-800 mb-2">Agrégations</h4>
                    <ul className="text-xs text-slate-500 space-y-1">
                      <li>
                        <code>SOMME()</code> : Total d'un champ
                      </li>
                      <li>
                        <code>MOYENNE()</code> : Valeur moyenne
                      </li>
                      <li>
                        <code>NB()</code> : Nombre d'occurrences
                      </li>
                    </ul>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
