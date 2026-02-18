import React from 'react';
import {
    Filter, Table2, ArrowLeftRight, BarChart3, Settings,
    Scissors, Merge, Copy, Plus
} from 'lucide-react';
import { Button } from '../ui/Button';
import { TransformationType } from '../../types';

interface ETLAddStepMenuProps {
    onAddStep: (type: TransformationType) => void;
}

export const ETLAddStepMenu: React.FC<ETLAddStepMenuProps> = ({ onAddStep }) => {
    const transformationTypes: { type: TransformationType; label: string; icon: any }[] = [
        { type: 'filter', label: 'Filtre', icon: Filter },
        { type: 'select', label: 'Sélectionner', icon: Table2 },
        { type: 'sort', label: 'Tri', icon: ArrowLeftRight },
        { type: 'aggregate', label: 'Agrégation', icon: BarChart3 },
        { type: 'calculate', label: 'Calculer', icon: Settings },
        { type: 'split', label: 'Diviser', icon: Scissors },
        { type: 'merge', label: 'Fusionner', icon: Merge },
        { type: 'rename', label: 'Renommer', icon: Copy },
        { type: 'distinct', label: 'Dédoublonner', icon: Copy },
        { type: 'join', label: 'Jointure', icon: Merge },
        { type: 'union', label: 'Union', icon: Plus },
        { type: 'pivot', label: 'Pivot', icon: BarChart3 },
        { type: 'unpivot', label: 'Unpivot', icon: ArrowLeftRight },
    ];

    return (
        <div className="mb-4 bg-slate-50 border border-slate-200 rounded-lg p-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <h4 className="font-bold text-slate-700 mb-3">Choisir une transformation</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {transformationTypes.map(({ type, label, icon: Icon }) => (
                    <Button
                        key={type}
                        variant="outline"
                        size="sm"
                        onClick={() => onAddStep(type)}
                        className="justify-start px-2 py-2"
                    >
                        <Icon className="w-4 h-4 mr-2 text-brand-600" />
                        <span className="text-xs">{label}</span>
                    </Button>
                ))}
            </div>
        </div>
    );
};
