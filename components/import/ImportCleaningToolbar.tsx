import React from 'react';
import { Wand2, Eraser, CaseUpper, CaseLower, CopyX } from 'lucide-react';

interface ImportCleaningToolbarProps {
    selectedColIndex: number | null;
    headerName: string;
    onClean: (action: 'trim' | 'upper' | 'lower' | 'proper' | 'empty_zero') => void;
    onRemoveDuplicates: () => void;
}

export const ImportCleaningToolbar: React.FC<ImportCleaningToolbarProps> = ({
    selectedColIndex,
    headerName,
    onClean,
    onRemoveDuplicates
}) => {
    return (
        <div className={`transition-all duration-300 overflow-hidden ${selectedColIndex !== null ? 'max-h-40 opacity-100 mb-6' : 'max-h-0 opacity-0'}`}>
           <div className="bg-white border border-purple-200 rounded-lg p-4 shadow-sm bg-gradient-to-r from-white to-purple-50">
               <div className="flex items-center gap-2 mb-2 text-purple-800 text-xs font-bold uppercase tracking-wider">
                  <Wand2 className="w-4 h-4" />
                  Outils de nettoyage : {headerName}
               </div>
               <div className="flex flex-wrap gap-2">
                  <button onClick={() => onClean('trim')} className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 hover:border-purple-300 hover:bg-purple-50 rounded text-xs text-slate-700 transition-colors shadow-sm">
                     <Eraser className="w-3 h-3" /> Trim (Espaces)
                  </button>
                  <button onClick={() => onClean('upper')} className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 hover:border-purple-300 hover:bg-purple-50 rounded text-xs text-slate-700 transition-colors shadow-sm">
                     <CaseUpper className="w-3 h-3" /> MAJUSCULE
                  </button>
                  <button onClick={() => onClean('lower')} className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 hover:border-purple-300 hover:bg-purple-50 rounded text-xs text-slate-700 transition-colors shadow-sm">
                     <CaseLower className="w-3 h-3" /> minuscule
                  </button>
                  <button onClick={() => onClean('proper')} className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 hover:border-purple-300 hover:bg-purple-50 rounded text-xs text-slate-700 transition-colors shadow-sm">
                     <CaseUpper className="w-3 h-3" /> Nom Propre
                  </button>
                  <div className="w-px bg-slate-300 mx-1"></div>
                  <button onClick={onRemoveDuplicates} className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 hover:border-red-300 hover:bg-red-50 hover:text-red-700 rounded text-xs text-slate-700 transition-colors shadow-sm">
                     <CopyX className="w-3 h-3" /> Dédupliquer
                  </button>
                  <button onClick={() => onClean('empty_zero')} className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 hover:border-purple-300 hover:bg-purple-50 rounded text-xs text-slate-700 transition-colors shadow-sm">
                     Vide → 0
                  </button>
               </div>
           </div>
        </div>
    );
};
