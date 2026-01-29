
import React from 'react';
import { Layout, Table2, Calendar, PieChart, FileDown, Database, Save, Check, X, Printer, FileType, FileSpreadsheet, FileText, Calculator, MonitorPlay, Search, Edit3 } from 'lucide-react';
import { Dataset, SavedAnalysis } from '../../types';

interface PivotHeaderProps {
   isTemporalMode: boolean;
   setIsTemporalMode: (v: boolean) => void;
   handleToChart: () => void;
   primaryDataset: Dataset | null;
   datasets: Dataset[];
   showExportMenu: boolean;
   setShowExportMenu: (v: boolean) => void;
   handleExport: (format: 'pdf' | 'html', mode?: 'A4' | 'adaptive') => void;
   handleExportSpreadsheet: (format: 'xlsx' | 'csv') => void;
   showLoadMenu: boolean;
   setShowLoadMenu: (v: boolean) => void;
   savedAnalyses: SavedAnalysis[];
   handleLoadAnalysis: (id: string) => void;
   isSaving: boolean;
   setIsSaving: (v: boolean) => void;
   isEditMode: boolean;
   setIsEditMode: (v: boolean) => void;
   analysisName: string;
   setAnalysisName: (v: string) => void;
   handleSaveAnalysis: () => void;
   openCalcModal: () => void;
   openSpecificDashboardModal: () => void;
   selectedItemsCount?: number;
   searchTerm: string;
   setSearchTerm: (v: string) => void;
}

export const PivotHeader: React.FC<PivotHeaderProps> = ({
   isTemporalMode, setIsTemporalMode, handleToChart, primaryDataset, datasets, showExportMenu, setShowExportMenu,
   handleExport, handleExportSpreadsheet, showLoadMenu, setShowLoadMenu, savedAnalyses, handleLoadAnalysis,
   isSaving, setIsSaving, analysisName, setAnalysisName, handleSaveAnalysis,
   isEditMode, setIsEditMode,
   openCalcModal, openSpecificDashboardModal, selectedItemsCount = 0,
   searchTerm, setSearchTerm
}) => {
   return (
      <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-2 shrink-0">
         <div className="flex items-center gap-2">
            <Layout className="w-3.5 h-3.5 text-blue-600" />
            <div>
               <h2 className="text-sm font-bold text-slate-800 leading-tight">Tableau Croisé Dynamique</h2>
               <p className="text-[10px] text-slate-500">{isTemporalMode ? 'Comparaison temporelle' : 'Analyse multidimensionnelle'}</p>
            </div>
            <div className="ml-4 flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
               <button onClick={() => setIsTemporalMode(false)} className={`px-2 py-1 text-[10px] font-bold rounded transition-all ${!isTemporalMode ? 'bg-white text-blue-600 shadow' : 'text-slate-500'}`}>
                  <Table2 className="w-3 h-3 inline mr-1" />Standard
               </button>
               <button onClick={() => setIsTemporalMode(true)} className={`px-2 py-1 text-[10px] font-bold rounded transition-all ${isTemporalMode ? 'bg-white text-blue-600 shadow' : 'text-slate-500'}`}>
                  <Calendar className="w-3 h-3 inline mr-1" />Comparaison
               </button>
            </div>

            <div className="relative ml-2">
               <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
               <input
                  type="text"
                  placeholder="Rechercher..."
                  className="pl-7 pr-3 py-1.5 bg-slate-100 border-none rounded-lg text-xs w-40 md:w-64 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
               />
               {searchTerm && (
                  <button
                     onClick={() => setSearchTerm('')}
                     className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                     <X className="w-3 h-3" />
                  </button>
               )}
            </div>
         </div>

         <div className="flex items-center gap-2">
            <button
               onClick={() => setIsEditMode(!isEditMode)}
               disabled={!primaryDataset}
               className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-bold border transition-all disabled:opacity-50 ${isEditMode ? 'bg-amber-100 text-amber-700 border-amber-300 shadow-inner' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
               title={isEditMode ? "Quitter le mode édition" : "Activer le mode édition pour renommer les colonnes"}
            >
               <Edit3 className={`w-3 h-3 ${isEditMode ? 'animate-pulse' : ''}`} /> {isEditMode ? 'Édition : ON' : 'Mode Édition'}
            </button>

            <button onClick={openCalcModal} disabled={!primaryDataset} className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 disabled:opacity-50">
               <Calculator className="w-3 h-3" /> Colonne calculée
            </button>

            <button onClick={openSpecificDashboardModal} disabled={!primaryDataset} className="relative flex items-center gap-1 px-3 py-1.5 rounded text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 disabled:opacity-50">
               <MonitorPlay className="w-3 h-3" /> Créer Dashboard
               {selectedItemsCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full border border-white shadow-sm">
                     {selectedItemsCount}
                  </span>
               )}
            </button>

            <button onClick={handleToChart} disabled={!primaryDataset} className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 disabled:opacity-50">
               <PieChart className="w-3 h-3" /> Graphique
            </button>

            <div className="relative">
               <button onClick={() => setShowExportMenu(!showExportMenu)} disabled={!primaryDataset} className="px-3 py-1.5 text-xs text-slate-600 hover:text-blue-600 border border-slate-300 rounded bg-white hover:bg-slate-50 flex items-center gap-1 disabled:opacity-50">
                  <FileDown className="w-3 h-3" /> Export
               </button>
               {showExportMenu && (
                  <div className="absolute right-0 mt-1 w-40 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1">
                     <button onClick={() => handleExport('pdf', 'adaptive')} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2"><Printer className="w-3 h-3" /> PDF</button>
                     <button onClick={() => handleExport('html')} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2"><FileType className="w-3 h-3" /> HTML</button>
                     <button onClick={() => handleExportSpreadsheet('xlsx')} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2"><FileSpreadsheet className="w-3 h-3" /> Excel (XLSX)</button>
                     <button onClick={() => handleExportSpreadsheet('csv')} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2"><FileText className="w-3 h-3" /> CSV</button>
                  </div>
               )}
            </div>

            <div className="relative">
               <button onClick={() => setShowLoadMenu(!showLoadMenu)} className="p-1.5 text-slate-500 hover:text-green-600 border border-slate-300 rounded bg-white" title="Charger"><Database className="w-4 h-4" /></button>
               {showLoadMenu && (
                  <div className="absolute right-0 mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1 max-h-80 overflow-y-auto">
                     <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase bg-slate-50 border-b border-slate-100">Analyses sauvegardées</div>
                     {savedAnalyses.filter(a => a.type === 'pivot').length === 0 ? (
                        <div className="px-3 py-2 text-xs text-slate-500 italic">Aucune analyse sauvegardée</div>
                     ) : (
                        savedAnalyses.filter(a => a.type === 'pivot').map(a => {
                           const ds = datasets.find(d => d.id === a.datasetId);
                           const dateObj = new Date(a.createdAt);
                           const dateStr = dateObj.toLocaleDateString();
                           const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                           return (
                              <button key={a.id} onClick={() => handleLoadAnalysis(a.id)} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center justify-between gap-2 border-b border-slate-100 last:border-0">
                                 <div className="flex flex-col min-w-0">
                                    <span className="truncate font-bold text-slate-700">{a.name}</span>
                                    <span className="text-[10px] text-blue-600 font-medium truncate">Dataset: {ds?.name || 'Inconnu'}</span>
                                 </div>
                                 <div className="flex flex-col items-end shrink-0">
                                    <span className="text-[9px] text-slate-500 font-medium">{dateStr}</span>
                                    <span className="text-[9px] text-slate-400">{timeStr}</span>
                                 </div>
                              </button>
                           );
                        })
                     )}
                  </div>
               )}
            </div>

            {!isSaving ? (
               <button onClick={() => setIsSaving(true)} disabled={!primaryDataset} className="p-1.5 text-slate-500 hover:text-blue-600 border border-slate-300 rounded bg-white disabled:opacity-50" title="Sauvegarder"><Save className="w-4 h-4" /></button>
            ) : (
               <div className="flex items-center gap-1">
                  <input
                     type="text"
                     className="p-1 text-xs border border-blue-300 rounded w-24"
                     placeholder="Nom..."
                     value={analysisName}
                     onChange={e => setAnalysisName(e.target.value)}
                     onKeyDown={(e) => { if (e.key === 'Enter') handleSaveAnalysis(); }}
                     autoFocus
                  />
                  <button onClick={handleSaveAnalysis} className="p-1 bg-blue-600 text-white rounded"><Check className="w-3 h-3" /></button>
                  <button onClick={() => setIsSaving(false)} className="p-1 bg-slate-200 text-slate-600 rounded"><X className="w-3 h-3" /></button>
               </div>
            )}
         </div>
      </div>
   );
};
