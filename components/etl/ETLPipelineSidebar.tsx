import React from 'react';
import { Search, Trash2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { PipelineModule } from '../../types';

interface ETLPipelineSidebarProps {
    pipelineModule: PipelineModule;
    activePipelineId: string | null;
    onSelect: (id: string) => void;
    onDelete: (id: string) => void;
}

export const ETLPipelineSidebar: React.FC<ETLPipelineSidebarProps> = ({
    pipelineModule,
    activePipelineId,
    onSelect,
    onDelete
}) => {
    return (
        <Card className="h-full">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Search className="w-4 h-4" />
                Mes Pipelines
            </h3>
            <div className="space-y-2">
                {pipelineModule.pipelines.length === 0 ? (
                    <p className="text-sm text-slate-500 italic py-4 text-center">Aucun pipeline sauvegardé</p>
                ) : (
                    pipelineModule.pipelines.map(p => (
                        <div
                            key={p.id}
                            className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between group ${
                                activePipelineId === p.id ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:border-slate-300'
                            }`}
                            onClick={() => onSelect(p.id)}
                        >
                            <div className="min-w-0">
                                <div className="font-bold text-sm text-slate-800 truncate">{p.name}</div>
                                <div className="text-xs text-slate-500 mt-0.5">
                                    Modifié le {new Date(p.updatedAt).toLocaleDateString('fr-FR')}
                                </div>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); onDelete(p.id); }}
                                className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                title="Supprimer le pipeline"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </Card>
    );
};
