
import React from 'react';
import { Layout, Table2, Calendar, PieChart, FileDown, Database, Save, Check, X, Printer, FileType, FileSpreadsheet, FileText } from 'lucide-react';
import { Dataset, SavedAnalysis } from '../../types';

interface PivotHeaderProps {
   isTemporalMode: boolean;
   setIsTemporalMode: (v: boolean) => void;
   handleToChart: () => void;
   primaryDataset: Dataset | null;
   showExportMenu: boolean;
   setShowExportMenu: (v: boolean) => void;
   handleExport: (format: any, mode?: any) => void;
   handleExportSpreadsheet: (format: any) => void;
   showLoadMenu: boolean;
   setShowLoadMenu: (v: boolean) => void;
   savedAnalyses: SavedAnalysis[];
   handleLoadAnalysis: (id: string) => void;
   isSaving: boolean;
   setIsSaving: (v: boolean) => void;
   analysisName: string;
   setAnalysisName: (v: string) => void;
   handleSaveAnalysis: () => void;
}

export const PivotHeader: React.FC<PivotHeaderProps> = ({
   isTemporalMode, setIsTemporalMode, handleToChart, primaryDataset, showExportMenu, setShowExportMenu,
   handleExport, handleExportSpreadsheet, showLoadMenu, setShowLoadMenu, savedAnalyses, handleLoadAnalysis,
   isSaving, setIsSaving, analysisName, setAnalysisName, handleSaveAnalysis
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
         </div>

         <div className="flex items-center gap-2">
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
               <button onClick={() => setShowLoadMenu(!showLoadMenu)} disabled={!primaryDataset} className="p-1.5 text-slate-500 hover:text-green-600 border border-slate-300 rounded bg-white disabled:opacity-50" title="Charger"><Database className="w-4 h-4" /></button>
               {showLoadMenu && primaryDataset && (
                  <div className="absolute right-0 mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1 max-h-80 overflow-y-auto">
                     {savedAnalyses.filter(a => a.type === 'pivot' && a.datasetId === primaryDataset.id).length === 0 ? (
                        <div className="px-3 py-2 text-xs text-slate-500 italic">Aucune analyse sauvegardée</div>
                     ) : (
                        savedAnalyses.filter(a => a.type === 'pivot' && a.datasetId === primaryDataset.id).map(a => (
                           <button key={a.id} onClick={() => handleLoadAnalysis(a.id)} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center justify-between gap-2">
                              <span className="truncate">{a.name}</span>
                              <span className="text-[10px] text-slate-400">{new Date(a.createdAt).toLocaleDateString()}</span>
                           </button>
                        ))
                     )}
                  </div>
               )}
            </div>

            {!isSaving ? (
               <button onClick={() => setIsSaving(true)} disabled={!primaryDataset} className="p-1.5 text-slate-500 hover:text-blue-600 border border-slate-300 rounded bg-white disabled:opacity-50" title="Sauvegarder"><Save className="w-4 h-4" /></button>
            ) : (
               <div className="flex items-center gap-1">
                  <input type="text" className="p-1 text-xs border border-blue-300 rounded w-24" placeholder="Nom..." value={analysisName} onChange={e => setAnalysisName(e.target.value)} autoFocus />
                  <button onClick={handleSaveAnalysis} className="p-1 bg-blue-600 text-white rounded"><Check className="w-3 h-3" /></button>
                  <button onClick={() => setIsSaving(false)} className="p-1 bg-slate-200 text-slate-600 rounded"><X className="w-3 h-3" /></button>
               </div>
            )}
         </div>
      </div>
   );
};
