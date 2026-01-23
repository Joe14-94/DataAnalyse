
import React, { useRef, useState } from 'react';
import { useData } from '../context/DataContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Download, Upload, Trash2, ShieldAlert, WifiOff, Database, PlayCircle, Table2, Calendar, Stethoscope, CheckCircle2, XCircle, AlertTriangle, Edit2, Check, X, Building2, GitBranch, CalendarDays, Users, Plus, FileText } from 'lucide-react';
import { APP_VERSION, runSelfDiagnostics } from '../utils';
import { useNavigate } from 'react-router-dom';
import { DiagnosticSuite, Dataset, UIPrefs } from '../types';
import { useSettings } from '../context/SettingsContext';
import { Palette, Type, Layout as LayoutIcon, Maximize2, RotateCcw } from 'lucide-react';
import { useReferentials } from '../context/ReferentialContext';

export const Settings: React.FC = () => {
   const { getBackupJson, importBackup, clearAll, loadDemoData, batches, datasets, deleteDataset, updateDatasetName } = useData();
   const { uiPrefs, updateUIPrefs, resetUIPrefs } = useSettings();
   const {
      chartsOfAccounts,
      addChartOfAccounts,
      setDefaultChartOfAccounts,
      analyticalAxes,
      addAnalyticalAxis,
      fiscalCalendars,
      addFiscalCalendar,
      masterData,
      addMasterDataItem,
      importPCGTemplate,
      importIFRSTemplate
   } = useReferentials();
   const fileInputRef = useRef<HTMLInputElement>(null);
   const navigate = useNavigate();

   // Diagnostics State
   const [diagResults, setDiagResults] = useState<DiagnosticSuite[] | null>(null);
   const [isRunningDiag, setIsRunningDiag] = useState(false);

   // Renaming State
   const [editingDatasetId, setEditingDatasetId] = useState<string | null>(null);
   const [editName, setEditName] = useState('');

   // Finance Settings State
   type FinanceTab = 'charts' | 'axes' | 'calendar' | 'masterdata';
   const [activeFinanceTab, setActiveFinanceTab] = useState<FinanceTab>('charts');

   // Modal states for creating referentials
   const [showAxisModal, setShowAxisModal] = useState(false);
   const [showCalendarModal, setShowCalendarModal] = useState(false);
   const [showMasterDataModal, setShowMasterDataModal] = useState(false);
   const [masterDataType, setMasterDataType] = useState<'customer' | 'supplier' | 'product' | 'employee'>('customer');

   // Form states
   const [axisForm, setAxisForm] = useState({ code: '', name: '', isMandatory: false, allowMultiple: false });
   const [calendarForm, setCalendarForm] = useState({ fiscalYear: new Date().getFullYear(), startDate: '', endDate: '' });
   const [masterDataForm, setMasterDataForm] = useState({ code: '', name: '', category: '', taxId: '' });

   const handleDownloadBackup = () => {
      const json = getBackupJson();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      // Safer download implementation
      const link = document.createElement('a');
      link.href = url;
      link.download = `datascope_backup_${new Date().toISOString().split('T')[0]}.json`;
      link.style.display = 'none';
      link.target = '_blank'; // Fixes some restrictive sandbox issues
      document.body.appendChild(link);
      link.click();

      // Cleanup with delay
      setTimeout(() => {
         document.body.removeChild(link);
         URL.revokeObjectURL(url);
      }, 100);
   };

   const handleImportClick = () => {
      fileInputRef.current?.click();
   };

   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

   // Finance referentials handlers
   const handleCreateAxis = () => {
      if (!axisForm.code || !axisForm.name) {
         alert('Veuillez remplir le code et le nom de l\'axe');
         return;
      }
      addAnalyticalAxis({
         code: axisForm.code.toUpperCase(),
         name: axisForm.name,
         isMandatory: axisForm.isMandatory,
         allowMultiple: axisForm.allowMultiple,
         level: 1,
         isActive: true
      });
      setShowAxisModal(false);
      setAxisForm({ code: '', name: '', isMandatory: false, allowMultiple: false });
   };

   const handleCreateCalendar = () => {
      if (!calendarForm.startDate || !calendarForm.endDate) {
         alert('Veuillez remplir les dates de début et fin');
         return;
      }

      // Generate monthly periods
      const start = new Date(calendarForm.startDate);
      const end = new Date(calendarForm.endDate);
      const periods = [];

      let current = new Date(start);
      let periodNum = 1;

      while (current < end) {
         const periodEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
         if (periodEnd > end) break;

         periods.push({
            id: `period_${periodNum}`,
            code: `${calendarForm.fiscalYear}-${String(periodNum).padStart(2, '0')}`,
            name: `Période ${periodNum}`,
            type: 'month' as const,
            fiscalYear: calendarForm.fiscalYear,
            startDate: current.toISOString().split('T')[0],
            endDate: periodEnd.toISOString().split('T')[0],
            isClosed: false,
            createdAt: Date.now()
         });

         current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
         periodNum++;
      }

      addFiscalCalendar({
         name: `Calendrier ${calendarForm.fiscalYear}`,
         fiscalYear: calendarForm.fiscalYear,
         startDate: calendarForm.startDate,
         endDate: calendarForm.endDate,
         periods
      });

      setShowCalendarModal(false);
      setCalendarForm({ fiscalYear: new Date().getFullYear(), startDate: '', endDate: '' });
   };

   const handleCreateMasterData = () => {
      if (!masterDataForm.code || !masterDataForm.name) {
         alert('Veuillez remplir le code et le nom');
         return;
      }

      addMasterDataItem({
         type: masterDataType,
         code: masterDataForm.code,
         name: masterDataForm.name,
         category: masterDataForm.category || undefined,
         taxId: masterDataForm.taxId || undefined,
         isActive: true
      });

      setShowMasterDataModal(false);
      setMasterDataForm({ code: '', name: '', category: '', taxId: '' });
   };

   return (
      <div className="h-full overflow-y-auto p-4 md:p-8 custom-scrollbar">
         <div className="pb-10 space-y-6">
            <h2 className="text-2xl font-bold text-slate-800">Paramètres et maintenance</h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               {/* Left Column (Main Content) */}
               <div className="lg:col-span-2 space-y-6">

                  {/* FINANCE REFERENTIALS CONFIGURATION (NOUVEAU) */}
                  <Card
                     title="Référentiels Finance & Comptabilité"
                     icon={<Building2 className="w-5 h-5 text-brand-600" />}
                  >
                     <div className="space-y-6">
                        <p className="text-sm text-slate-600">
                           Configurez les référentiels comptables et analytiques pour structurer vos analyses financières.
                           Ces paramètres sont essentiels pour le reporting réglementaire et le pilotage de la performance.
                        </p>

                        {/* Tabs */}
                        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
                           {[
                              { id: 'charts' as const, label: 'Plans comptables', icon: FileText },
                              { id: 'axes' as const, label: 'Axes analytiques', icon: GitBranch },
                              { id: 'calendar' as const, label: 'Calendrier fiscal', icon: CalendarDays },
                              { id: 'masterdata' as const, label: 'Tiers & produits', icon: Users }
                           ].map(tab => (
                              <button
                                 key={tab.id}
                                 onClick={() => setActiveFinanceTab(tab.id)}
                                 className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-bold transition-all ${
                                    activeFinanceTab === tab.id
                                       ? 'bg-brand-600 text-white'
                                       : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                 }`}
                              >
                                 <tab.icon className="w-4 h-4" />
                                 {tab.label}
                              </button>
                           ))}
                        </div>

                        {/* Tab Content */}
                        <div className="min-h-[200px]">
                           {activeFinanceTab === 'charts' && (
                              <div className="space-y-4">
                                 <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-bold text-slate-800">Plans comptables configurés</h3>
                                    <div className="flex gap-2">
                                       <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => importPCGTemplate()}
                                          className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                       >
                                          <FileText className="w-4 h-4 mr-2" />
                                          Importer PCG
                                       </Button>
                                       <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => importIFRSTemplate()}
                                          className="text-purple-600 border-purple-200 hover:bg-purple-50"
                                       >
                                          <FileText className="w-4 h-4 mr-2" />
                                          Importer IFRS
                                       </Button>
                                    </div>
                                 </div>

                                 {chartsOfAccounts.length === 0 ? (
                                    <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg p-8 text-center">
                                       <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                       <p className="text-slate-500 font-medium mb-2">Aucun plan comptable configuré</p>
                                       <p className="text-sm text-slate-400 mb-4">
                                          Importez un template (PCG ou IFRS) pour démarrer rapidement
                                       </p>
                                    </div>
                                 ) : (
                                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-md bg-white">
                                       {chartsOfAccounts.map(chart => (
                                          <div key={chart.id} className="p-4 hover:bg-slate-50 transition-colors">
                                             <div className="flex items-center justify-between">
                                                <div>
                                                   <div className="flex items-center gap-3">
                                                      <h4 className="font-bold text-slate-800">{chart.name}</h4>
                                                      {chart.isDefault && (
                                                         <span className="text-xs font-bold px-2 py-1 bg-brand-100 text-brand-700 rounded">
                                                            Par défaut
                                                         </span>
                                                      )}
                                                   </div>
                                                   <div className="text-xs text-slate-500 mt-1">
                                                      {chart.standard} • {chart.accounts.length} comptes
                                                   </div>
                                                </div>
                                                {!chart.isDefault && (
                                                   <Button
                                                      variant="ghost"
                                                      size="sm"
                                                      onClick={() => setDefaultChartOfAccounts(chart.id)}
                                                      className="text-slate-500 hover:text-brand-600"
                                                   >
                                                      Définir par défaut
                                                   </Button>
                                                )}
                                             </div>
                                          </div>
                                       ))}
                                    </div>
                                 )}

                                 <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                                    <p className="font-bold mb-1">💡 Prochaine étape</p>
                                    <p>Les plans comptables importés pourront être édités, enrichis et associés à vos données dans une interface dédiée (prochaine version).</p>
                                 </div>
                              </div>
                           )}

                           {activeFinanceTab === 'axes' && (
                              <div className="space-y-4">
                                 <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-bold text-slate-800">Axes analytiques configurés</h3>
                                    <Button
                                       variant="outline"
                                       size="sm"
                                       onClick={() => setShowAxisModal(true)}
                                       className="text-green-600 border-green-200 hover:bg-green-50"
                                    >
                                       <Plus className="w-4 h-4 mr-2" />
                                       Nouvel axe
                                    </Button>
                                 </div>

                                 {analyticalAxes.length === 0 ? (
                                    <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg p-8 text-center">
                                       <GitBranch className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                       <p className="text-slate-500 font-medium mb-2">Aucun axe analytique configuré</p>
                                       <p className="text-sm text-slate-400 mb-4">
                                          Les axes analytiques permettent d'analyser vos données par centre de coûts, projet, business unit, etc.
                                       </p>
                                    </div>
                                 ) : (
                                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-md bg-white">
                                       {analyticalAxes.map(axis => (
                                          <div key={axis.id} className="p-4 hover:bg-slate-50 transition-colors">
                                             <div className="flex items-center justify-between">
                                                <div>
                                                   <div className="flex items-center gap-3">
                                                      <h4 className="font-bold text-slate-800">{axis.name}</h4>
                                                      <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-600">
                                                         {axis.code}
                                                      </span>
                                                      {axis.isMandatory && (
                                                         <span className="text-xs font-bold px-2 py-1 bg-red-100 text-red-700 rounded">
                                                            Obligatoire
                                                         </span>
                                                      )}
                                                   </div>
                                                   <div className="text-xs text-slate-500 mt-1">
                                                      Niveau {axis.level} {axis.allowMultiple ? '• Ventilation multiple autorisée' : ''}
                                                   </div>
                                                </div>
                                             </div>
                                          </div>
                                       ))}
                                    </div>
                                 )}

                                 <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                                    <p className="font-bold mb-1">💡 Prochaine étape</p>
                                    <p>Interface de création et gestion d'axes analytiques (centres de coûts, projets, BU, etc.) à venir.</p>
                                 </div>
                              </div>
                           )}

                           {activeFinanceTab === 'calendar' && (
                              <div className="space-y-4">
                                 <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-bold text-slate-800">Calendriers fiscaux</h3>
                                    <Button
                                       variant="outline"
                                       size="sm"
                                       onClick={() => setShowCalendarModal(true)}
                                       className="text-green-600 border-green-200 hover:bg-green-50"
                                    >
                                       <Plus className="w-4 h-4 mr-2" />
                                       Nouvel exercice
                                    </Button>
                                 </div>

                                 {fiscalCalendars.length === 0 ? (
                                    <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg p-8 text-center">
                                       <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                       <p className="text-slate-500 font-medium mb-2">Aucun calendrier fiscal configuré</p>
                                       <p className="text-sm text-slate-400 mb-4">
                                          Définissez vos exercices comptables et périodes pour le reporting financier
                                       </p>
                                    </div>
                                 ) : (
                                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-md bg-white">
                                       {fiscalCalendars.map(cal => (
                                          <div key={cal.id} className="p-4 hover:bg-slate-50 transition-colors">
                                             <div className="flex items-center justify-between">
                                                <div>
                                                   <h4 className="font-bold text-slate-800">Exercice {cal.fiscalYear}</h4>
                                                   <div className="text-xs text-slate-500 mt-1">
                                                      {cal.startDate} → {cal.endDate} • {cal.periods.length} périodes
                                                   </div>
                                                </div>
                                             </div>
                                          </div>
                                       ))}
                                    </div>
                                 )}

                                 <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                                    <p className="font-bold mb-1">💡 Prochaine étape</p>
                                    <p>Interface de gestion des exercices, périodes mensuelles, clôtures périodiques et 13ème période à venir.</p>
                                 </div>
                              </div>
                           )}

                           {activeFinanceTab === 'masterdata' && (
                              <div className="space-y-4">
                                 <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-bold text-slate-800">Données de référence (tiers, produits, salariés)</h3>
                                 </div>

                                 <div className="space-y-3">
                                    {['customer', 'supplier', 'product', 'employee'].map(type => {
                                       const items = masterData.filter(md => md.type === type && md.isActive);
                                       const labels = {
                                          customer: 'Clients',
                                          supplier: 'Fournisseurs',
                                          product: 'Produits',
                                          employee: 'Salariés'
                                       };
                                       return (
                                          <div key={type} className="border border-slate-200 rounded-lg p-3 bg-white hover:border-slate-300 transition-colors">
                                             <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                   <span className="text-sm font-bold text-slate-700">{labels[type as keyof typeof labels]}</span>
                                                   <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-600">
                                                      {items.length} enregistrement(s)
                                                   </span>
                                                </div>
                                                <Button
                                                   variant="ghost"
                                                   size="sm"
                                                   onClick={() => {
                                                      setMasterDataType(type as any);
                                                      setShowMasterDataModal(true);
                                                   }}
                                                   className="text-green-600 hover:bg-green-50"
                                                >
                                                   <Plus className="w-4 h-4 mr-1" />
                                                   Ajouter
                                                </Button>
                                             </div>
                                          </div>
                                       );
                                    })}
                                 </div>

                                 <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                                    <p className="font-bold mb-1">💡 Prochaine étape</p>
                                    <p>Interface CRUD complète pour la gestion des tiers, produits et employés à venir.</p>
                                 </div>
                              </div>
                           )}
                        </div>
                     </div>
                  </Card>

                  {/* DESIGN SYSTEM CONFIGURATION (NOUVEAU) */}
                  <Card
                     title="Design System & Typographie"
                     icon={<Palette className="w-5 h-5 text-brand-600" />}
                  >
                     <div className="space-y-8">
                        <p className="text-sm text-slate-600">
                           Personnalisez l'affichage global de l'application. Ces réglages s'appliquent à tous les tableaux et menus pour garantir une cohérence visuelle.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           {/* Font Size */}
                           <div className="space-y-4">
                              <div className="flex justify-between items-center">
                                 <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                    <Type className="w-4 h-4 text-slate-400" /> Taille de police
                                 </label>
                                 <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-600">{uiPrefs.fontSize}px</span>
                              </div>
                              <input
                                 type="range"
                                 min="8"
                                 max="18"
                                 step="1"
                                 value={uiPrefs.fontSize}
                                 onChange={(e) => updateUIPrefs({ fontSize: parseInt(e.target.value) })}
                                 className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
                              />
                              <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase">
                                 <span>Ultra (8px)</span>
                                 <span>Large (18px)</span>
                              </div>
                           </div>

                           {/* Sidebar Width */}
                           <div className="space-y-4">
                              <div className="flex justify-between items-center">
                                 <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                    <LayoutIcon className="w-4 h-4 text-slate-400" /> Largeur menu
                                 </label>
                                 <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-600">{uiPrefs.sidebarWidth}px</span>
                              </div>
                              <input
                                 type="range"
                                 min="140"
                                 max="300"
                                 step="4"
                                 value={uiPrefs.sidebarWidth}
                                 onChange={(e) => updateUIPrefs({ sidebarWidth: parseInt(e.target.value) })}
                                 className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
                              />
                              <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase">
                                 <span>Étroit</span>
                                 <span>Large</span>
                              </div>
                           </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           {/* Font Family */}
                           <div className="space-y-3">
                              <label className="text-sm font-bold text-slate-800 block">Identité visuelle (Police)</label>
                              <div className="grid grid-cols-2 gap-2">
                                 {[
                                    { id: 'inter', name: 'Inter (Pro)', fontClass: 'font-inter' },
                                    { id: 'outfit', name: 'Outfit (Modern)', fontClass: 'font-outfit' },
                                    { id: 'sans', name: 'System Sans', fontClass: 'font-sans' },
                                    { id: 'mono', name: 'Fira Mono', fontClass: 'font-mono' }
                                 ].map(f => (
                                    <button
                                       key={f.id}
                                       onClick={() => updateUIPrefs({ fontFamily: f.id as any })}
                                       className={`p-3 text-left border rounded-lg transition-all ${uiPrefs.fontFamily === f.id ? 'border-brand-600 bg-brand-50' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
                                    >
                                       <div className={`text-sm font-bold ${f.fontClass} truncate`}>{f.name}</div>
                                       <div className="text-[10px] text-slate-400 mt-1">L'application complète</div>
                                    </button>
                                 ))}
                              </div>
                           </div>

                           {/* Density / Presets */}
                           <div className="space-y-3">
                              <label className="text-sm font-bold text-slate-800 block">Densité d'affichage</label>
                              <div className="space-y-2">
                                 {[
                                    { id: 'ultra', name: 'Mode Expert (8-10px)', desc: 'Densité maximale pour TCD massif', size: 10, sw: 160 },
                                    { id: 'compact', name: 'Mode Compact (11-12px)', desc: 'Équilibre productivité/lisibilité', size: 12, sw: 192 },
                                    { id: 'comfortable', name: 'Mode Confort (13-14px)', desc: 'Lisibilité aérée et fluide', size: 14, sw: 240 }
                                 ].map(p => (
                                    <button
                                       key={p.id}
                                       onClick={() => updateUIPrefs({ density: p.id as any, fontSize: p.size, sidebarWidth: p.sw })}
                                       className={`w-full p-2.5 text-left border rounded-lg flex items-center gap-3 transition-all ${uiPrefs.density === p.id ? 'border-brand-600 bg-brand-50' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
                                    >
                                       <div className={`p-1.5 rounded-md ${uiPrefs.density === p.id ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                          <Maximize2 className="w-3.5 h-3.5" />
                                       </div>
                                       <div className="flex-1">
                                          <div className="text-xs font-bold text-slate-800">{p.name}</div>
                                          <div className="text-[9px] text-slate-400 uppercase font-bold tracking-tight">{p.desc}</div>
                                       </div>
                                       {uiPrefs.density === p.id && <Check className="w-4 h-4 text-brand-600" />}
                                    </button>
                                 ))}
                              </div>
                           </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100 flex justify-end">
                           <Button variant="ghost" onClick={resetUIPrefs} className="text-slate-500 hover:text-slate-800">
                              <RotateCcw className="w-4 h-4 mr-2" /> Réinitialiser le style par défaut
                           </Button>
                        </div>
                     </div>
                  </Card>

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
                                                      onKeyDown={(e) => { if (e.key === 'Enter') saveEditing(); if (e.key === 'Escape') cancelEditing(); }}
                                                   />
                                                   <button onClick={saveEditing} className="bg-green-100 text-green-700 p-1.5 rounded hover:bg-green-200" title="Sauvegarder">
                                                      <Check className="w-4 h-4" />
                                                   </button>
                                                   <button onClick={cancelEditing} className="bg-slate-100 text-slate-600 p-1.5 rounded hover:bg-slate-200" title="Annuler">
                                                      <X className="w-4 h-4" />
                                                   </button>
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

                                       {!isEditing && (
                                          <div className="flex items-center gap-2 shrink-0">
                                             <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-slate-600 hover:bg-slate-50 border-slate-200"
                                                onClick={() => startEditing(ds)}
                                             >
                                                <Edit2 className="w-4 h-4 mr-2" />
                                                Renommer
                                             </Button>
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
                                       )}
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

         {/* Modal: Créer un axe analytique */}
         {showAxisModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAxisModal(false)}>
               <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Créer un axe analytique</h3>
                  <div className="space-y-4">
                     <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Code de l'axe *</label>
                        <input
                           type="text"
                           className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
                           placeholder="Ex: CC, PRJ, BU"
                           value={axisForm.code}
                           onChange={(e) => setAxisForm({ ...axisForm, code: e.target.value.toUpperCase() })}
                           maxLength={10}
                        />
                     </div>
                     <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Nom de l'axe *</label>
                        <input
                           type="text"
                           className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
                           placeholder="Ex: Centre de coûts, Projet, Business Unit"
                           value={axisForm.name}
                           onChange={(e) => setAxisForm({ ...axisForm, name: e.target.value })}
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                           <input
                              type="checkbox"
                              checked={axisForm.isMandatory}
                              onChange={(e) => setAxisForm({ ...axisForm, isMandatory: e.target.checked })}
                              className="w-4 h-4 text-brand-600 border-slate-300 rounded focus:ring-brand-500"
                           />
                           <span className="text-sm text-slate-700">Axe obligatoire</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                           <input
                              type="checkbox"
                              checked={axisForm.allowMultiple}
                              onChange={(e) => setAxisForm({ ...axisForm, allowMultiple: e.target.checked })}
                              className="w-4 h-4 text-brand-600 border-slate-300 rounded focus:ring-brand-500"
                           />
                           <span className="text-sm text-slate-700">Ventilation multiple autorisée</span>
                        </label>
                     </div>
                     <div className="flex gap-3 pt-4">
                        <Button onClick={handleCreateAxis} className="flex-1">
                           <Check className="w-4 h-4 mr-2" />
                           Créer
                        </Button>
                        <Button variant="outline" onClick={() => setShowAxisModal(false)} className="flex-1">
                           <X className="w-4 h-4 mr-2" />
                           Annuler
                        </Button>
                     </div>
                  </div>
               </div>
            </div>
         )}

         {/* Modal: Créer un calendrier fiscal */}
         {showCalendarModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCalendarModal(false)}>
               <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Créer un exercice fiscal</h3>
                  <div className="space-y-4">
                     <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Année fiscale *</label>
                        <input
                           type="number"
                           className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
                           value={calendarForm.fiscalYear}
                           onChange={(e) => setCalendarForm({ ...calendarForm, fiscalYear: parseInt(e.target.value) })}
                           min="2000"
                           max="2100"
                        />
                     </div>
                     <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Date de début *</label>
                        <input
                           type="date"
                           className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
                           value={calendarForm.startDate}
                           onChange={(e) => setCalendarForm({ ...calendarForm, startDate: e.target.value })}
                        />
                     </div>
                     <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Date de fin *</label>
                        <input
                           type="date"
                           className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
                           value={calendarForm.endDate}
                           onChange={(e) => setCalendarForm({ ...calendarForm, endDate: e.target.value })}
                        />
                     </div>
                     <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-800">
                        <p className="font-bold">💡 Info</p>
                        <p>Les périodes mensuelles seront générées automatiquement entre les dates sélectionnées.</p>
                     </div>
                     <div className="flex gap-3 pt-4">
                        <Button onClick={handleCreateCalendar} className="flex-1">
                           <Check className="w-4 h-4 mr-2" />
                           Créer
                        </Button>
                        <Button variant="outline" onClick={() => setShowCalendarModal(false)} className="flex-1">
                           <X className="w-4 h-4 mr-2" />
                           Annuler
                        </Button>
                     </div>
                  </div>
               </div>
            </div>
         )}

         {/* Modal: Créer une donnée de référence */}
         {showMasterDataModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowMasterDataModal(false)}>
               <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
                  <h3 className="text-lg font-bold text-slate-800 mb-4">
                     Ajouter {
                        masterDataType === 'customer' ? 'un client' :
                        masterDataType === 'supplier' ? 'un fournisseur' :
                        masterDataType === 'product' ? 'un produit' :
                        'un salarié'
                     }
                  </h3>
                  <div className="space-y-4">
                     <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Code *</label>
                        <input
                           type="text"
                           className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
                           placeholder="Ex: CLI001, FOUR001"
                           value={masterDataForm.code}
                           onChange={(e) => setMasterDataForm({ ...masterDataForm, code: e.target.value.toUpperCase() })}
                        />
                     </div>
                     <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Nom *</label>
                        <input
                           type="text"
                           className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
                           placeholder="Ex: ACME Corp"
                           value={masterDataForm.name}
                           onChange={(e) => setMasterDataForm({ ...masterDataForm, name: e.target.value })}
                        />
                     </div>
                     <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Catégorie</label>
                        <input
                           type="text"
                           className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
                           placeholder="Ex: VIP, National, International"
                           value={masterDataForm.category}
                           onChange={(e) => setMasterDataForm({ ...masterDataForm, category: e.target.value })}
                        />
                     </div>
                     {(masterDataType === 'customer' || masterDataType === 'supplier') && (
                        <div>
                           <label className="block text-sm font-bold text-slate-700 mb-1">
                              {masterDataType === 'customer' ? 'N° TVA / SIREN' : 'N° SIRET'}
                           </label>
                           <input
                              type="text"
                              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
                              placeholder="Ex: FR12345678901"
                              value={masterDataForm.taxId}
                              onChange={(e) => setMasterDataForm({ ...masterDataForm, taxId: e.target.value })}
                           />
                        </div>
                     )}
                     <div className="flex gap-3 pt-4">
                        <Button onClick={handleCreateMasterData} className="flex-1">
                           <Check className="w-4 h-4 mr-2" />
                           Créer
                        </Button>
                        <Button variant="outline" onClick={() => setShowMasterDataModal(false)} className="flex-1">
                           <X className="w-4 h-4 mr-2" />
                           Annuler
                        </Button>
                     </div>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};
