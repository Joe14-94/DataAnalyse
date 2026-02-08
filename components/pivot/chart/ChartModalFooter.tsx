import React from 'react';
import { PlusSquare, Download, ChevronDown, ExternalLink } from 'lucide-react';
import { getChartTypeConfig } from '../../../logic/pivotToChart';

interface ChartModalFooterProps {
    selectedChartType: any;
    onClose: () => void;
    onCreateWidget: () => void;
    showExportMenu: boolean;
    onToggleExportMenu: () => void;
    onExportHTML: () => void;
    onExportPNG: () => void;
    onExportPDF: (mode: 'A4' | 'adaptive') => void;
    onExportXLSX: () => void;
    onOpenInAnalytics: () => void;
}

export const ChartModalFooter: React.FC<ChartModalFooterProps> = ({
    selectedChartType,
    onClose,
    onCreateWidget,
    showExportMenu,
    onToggleExportMenu,
    onExportHTML,
    onExportPNG,
    onExportPDF,
    onExportXLSX,
    onOpenInAnalytics
}) => {
    return (
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="text-xs text-slate-600">
                <span className="font-semibold">{getChartTypeConfig(selectedChartType).bestFor}</span>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={onCreateWidget}
                    className="px-3 py-1.5 text-xs bg-brand-100 text-brand-700 rounded-lg hover:bg-brand-200 transition-colors flex items-center gap-1 border border-brand-300"
                    title="Ajouter ce graphique au tableau de bord"
                >
                    <PlusSquare className="w-3 h-3" />
                    Créer widget
                </button>

                <div className="relative">
                    <button
                        onClick={onToggleExportMenu}
                        className="px-3 py-1.5 text-xs bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors flex items-center gap-1"
                    >
                        <Download className="w-3 h-3" />
                        Exporter
                        <ChevronDown className="w-3 h-3" />
                    </button>

                    {showExportMenu && (
                        <div className="absolute bottom-full right-0 mb-2 bg-white border border-slate-200 rounded-lg shadow-lg z-50 overflow-hidden">
                            <button onClick={onExportHTML} className="w-full text-left px-4 py-2 text-xs hover:bg-brand-50 text-slate-700 border-b border-slate-100">HTML</button>
                            <button onClick={onExportPNG} className="w-full text-left px-4 py-2 text-xs hover:bg-brand-50 text-slate-700 border-b border-slate-100">PNG (Haute résolution)</button>
                            <button onClick={() => onExportPDF('adaptive')} className="w-full text-left px-4 py-2 text-xs hover:bg-brand-50 text-slate-700 border-b border-slate-100">PDF (Adaptatif)</button>
                            <button onClick={() => onExportPDF('A4')} className="w-full text-left px-4 py-2 text-xs hover:bg-brand-50 text-slate-700 border-b border-slate-100">PDF (A4)</button>
                            <button onClick={onExportXLSX} className="w-full text-left px-4 py-2 text-xs hover:bg-brand-50 text-slate-700">XLSX (Excel)</button>
                        </div>
                    )}
                </div>

                <button
                    onClick={onOpenInAnalytics}
                    className="px-3 py-1.5 text-xs bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors flex items-center gap-1"
                    title="Ouvrir dans Analytics"
                >
                    <ExternalLink className="w-3 h-3" />
                    Analytics
                </button>

                <button
                    onClick={onClose}
                    className="px-4 py-1.5 text-xs bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                    Fermer
                </button>
            </div>
        </div>
    );
};
