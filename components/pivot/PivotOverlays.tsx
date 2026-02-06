import React from 'react';
import { MousePointerClick, Palette } from 'lucide-react';
import { Button } from '../ui/Button';
import { SpecificDashboardItem } from '../../types';

interface SelectionOverlayProps {
    itemsCount: number;
    onVisualize: () => void;
    onCreateReport: () => void;
    onCancel: () => void;
    onClear: () => void;
}

export const SelectionOverlay: React.FC<SelectionOverlayProps> = ({
    itemsCount, onVisualize, onCreateReport, onCancel, onClear
}) => (
    <div className="absolute top-0 left-0 right-0 z-50 bg-brand-600 text-white p-2 flex justify-between items-center shadow-md animate-in slide-in-from-top">
        <div className="flex items-center gap-2 px-2">
            <MousePointerClick className="w-4 h-4 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider">Mode sélection : Cliquez sur une cellule pour l'ajouter</span>
        </div>
        <div className="flex items-center gap-2">
            <span className="bg-white/20 text-white px-2 py-0.5 rounded text-xs font-black border border-white/30">{itemsCount} CELLULES</span>
            <Button size="sm" className="bg-brand-800 text-white font-black hover:bg-brand-900 py-1 shadow-sm border-none" onClick={onVisualize} disabled={itemsCount === 0}>Visualiser</Button>
            <Button size="sm" className="bg-white text-slate-900 font-black hover:bg-brand-50 py-1 shadow-sm border-none" onClick={onCreateReport}>Créer Rapport</Button>
            <Button size="sm" variant="outline" className="text-white border-white/30 hover:bg-white/10 py-1" onClick={onCancel}>Annuler</Button>
            <Button size="sm" variant="outline" className="text-white border-white/30 hover:bg-white/10 py-1" onClick={onClear} disabled={itemsCount === 0}>Vider</Button>
        </div>
    </div>
);

interface FormattingOverlayProps {
    onCancel: () => void;
}

export const FormattingOverlay: React.FC<FormattingOverlayProps> = ({ onCancel }) => (
    <div className="absolute top-0 left-0 right-0 z-50 bg-indigo-600 text-white p-2 flex justify-between items-center shadow-md animate-in slide-in-from-top">
        <div className="flex items-center gap-2 px-2">
            <Palette className="w-4 h-4 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider">Mise en forme : Cliquez sur une ligne, colonne ou cellule pour l'affecter à la règle</span>
        </div>
        <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="text-white border-white/30 hover:bg-white/10 py-1" onClick={onCancel}>Annuler</Button>
        </div>
    </div>
);
