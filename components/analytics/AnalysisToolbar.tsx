import React from 'react';
import {
  LayoutDashboard,
  Save,
  FileDown,
  Table as TableIcon,
  BarChart3,
  ChevronDown,
  Check,
  FileType,
  Printer
} from 'lucide-react';
import { Button } from '../ui/Button';

interface AnalysisToolbarProps {
  viewMode: 'chart' | 'table';
  setViewMode: (m: 'chart' | 'table') => void;
  onExportToDashboard: () => void;
  setIsSaving: (s: boolean) => void;
  showExportMenu: boolean;
  setShowExportMenu: (s: boolean) => void;
  onExport: (format: 'pdf' | 'html' | 'png' | 'xlsx', pdfMode?: 'A4' | 'adaptive') => void;
}

export const AnalysisToolbar: React.FC<AnalysisToolbarProps> = ({
  viewMode,
  setViewMode,
  onExportToDashboard,
  setIsSaving,
  showExportMenu,
  setShowExportMenu,
  onExport
}) => {
  return (
    <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm z-10">
      <div className="flex items-center gap-4">
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('chart')}
            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-2 ${viewMode === 'chart' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <BarChart3 className="w-3.5 h-3.5" /> Graphique
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-2 ${viewMode === 'table' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <TableIcon className="w-3.5 h-3.5" /> Données
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          className="text-xs font-bold"
          onClick={onExportToDashboard}
        >
          <LayoutDashboard className="w-4 h-4 mr-2" />
          Dashboard
        </Button>

        <Button
          variant="secondary"
          size="sm"
          className="text-xs font-bold"
          onClick={() => setIsSaving(true)}
        >
          <Save className="w-4 h-4 mr-2" />
          Sauvegarder
        </Button>

        <div className="relative">
          <Button
            variant="secondary"
            size="sm"
            className="text-xs font-bold"
            onClick={() => setShowExportMenu(!showExportMenu)}
          >
            <FileDown className="w-4 h-4 mr-2" />
            Exporter
            <ChevronDown className="w-3 h-3 ml-2" />
          </Button>

          {showExportMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in duration-150">
              <div className="p-2 border-b border-slate-50 bg-slate-50/50">
                <span className="text-[10px] font-black text-slate-400 uppercase px-2">
                  Format d'export
                </span>
              </div>
              <div className="p-1">
                <button
                  onClick={() => onExport('pdf')}
                  className="w-full flex items-center gap-3 px-3 py-2 text-xs text-slate-700 hover:bg-brand-50 hover:text-brand-700 rounded-lg transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center group-hover:bg-red-100">
                    <FileType className="w-4 h-4 text-red-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold">Rapport PDF (A4)</div>
                    <div className="text-[10px] text-slate-400">Pour impression et partage</div>
                  </div>
                </button>
                <button
                  onClick={() => onExport('png')}
                  className="w-full flex items-center gap-3 px-3 py-2 text-xs text-slate-700 hover:bg-brand-50 hover:text-brand-700 rounded-lg transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center group-hover:bg-blue-100">
                    <Printer className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold">Image PNG</div>
                    <div className="text-[10px] text-slate-400">Haute résolution (Snaphot)</div>
                  </div>
                </button>
                <button
                  onClick={() => onExport('xlsx')}
                  className="w-full flex items-center gap-3 px-3 py-2 text-xs text-slate-700 hover:bg-brand-50 hover:text-brand-700 rounded-lg transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center group-hover:bg-green-100">
                    <FileType className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold">Tableur Excel</div>
                    <div className="text-[10px] text-slate-400">Données brutes et calculs</div>
                  </div>
                </button>
                <button
                  onClick={() => onExport('html')}
                  className="w-full flex items-center gap-3 px-3 py-2 text-xs text-slate-700 hover:bg-brand-50 hover:text-brand-700 rounded-lg transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center group-hover:bg-orange-100">
                    <BarChart3 className="w-4 h-4 text-orange-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold">HTML Interactif</div>
                    <div className="text-[10px] text-slate-400">Plotly.js auto-portant</div>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
