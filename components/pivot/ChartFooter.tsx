import React from 'react';
import { PlusSquare, Download, ChevronDown, ExternalLink } from 'lucide-react';
import { getChartTypeConfig } from '../../logic/pivotToChart';

interface ChartFooterProps {
  selectedChartType: any;
  handleCreateWidget: () => void;
  showExportMenu: boolean;
  setShowExportMenu: (v: boolean) => void;
  handleExportHTML: () => void;
  handleExportPNG: () => void;
  handleExportPDF: (mode: 'A4' | 'adaptive') => void;
  handleExportXLSX: () => void;
  handleOpenInAnalytics: () => void;
  onClose: () => void;
}

export const ChartFooter: React.FC<ChartFooterProps> = ({
  selectedChartType,
  handleCreateWidget,
  showExportMenu,
  setShowExportMenu,
  handleExportHTML,
  handleExportPNG,
  handleExportPDF,
  handleExportXLSX,
  handleOpenInAnalytics,
  onClose
}) => {
  return (
    <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
      <div className="text-xs text-slate-600 font-semibold">
        {getChartTypeConfig(selectedChartType).bestFor}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleCreateWidget}
          className="px-3 py-1.5 text-xs bg-brand-100 text-brand-700 rounded-lg hover:bg-brand-200 flex items-center gap-1 border border-brand-300"
        >
          <PlusSquare className="w-3 h-3" /> Créer widget
        </button>
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="px-3 py-1.5 text-xs bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 flex items-center gap-1"
          >
            <Download className="w-3 h-3" /> Exporter <ChevronDown className="w-3 h-3" />
          </button>
          {showExportMenu && (
            <div className="absolute bottom-full right-0 mb-2 bg-white border rounded-lg shadow-lg z-50 overflow-hidden min-w-[150px]">
              {[
                'HTML',
                'PNG (Haute résolution)',
                'PDF (Adaptatif)',
                'PDF (A4)',
                'XLSX (Excel)'
              ].map((opt, i) => (
                <button
                  key={opt}
                  onClick={() => {
                    if (i === 0) handleExportHTML();
                    else if (i === 1) handleExportPNG();
                    else if (i === 2) handleExportPDF('adaptive');
                    else if (i === 3) handleExportPDF('A4');
                    else handleExportXLSX();
                  }}
                  className="w-full text-left px-4 py-2 text-xs hover:bg-brand-50 border-b last:border-0"
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={handleOpenInAnalytics}
          className="px-3 py-1.5 text-xs bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 flex items-center gap-1"
        >
          <ExternalLink className="w-3 h-3" /> Analytics
        </button>
        <button
          onClick={onClose}
          className="px-4 py-1.5 text-xs bg-slate-700 text-white rounded-lg hover:bg-slate-800"
        >
          Fermer
        </button>
      </div>
    </div>
  );
};
