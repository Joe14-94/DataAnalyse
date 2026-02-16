import React from 'react';
import { Workflow, Clock, Plus, Save } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface ETLPipelineHeaderProps {
    pipelineName: string;
    onPipelineNameChange: (name: string) => void;
    onSave: () => void;
    onNew: () => void;
    showPipelineList: boolean;
    onTogglePipelineList: () => void;
}

export const ETLPipelineHeader: React.FC<ETLPipelineHeaderProps> = ({
    pipelineName,
    onPipelineNameChange,
    onSave,
    onNew,
    showPipelineList,
    onTogglePipelineList
}) => {
    return (
        <>
            <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 mb-2 flex items-center gap-3">
                        <Workflow className="w-8 h-8 text-brand-600" />
                        Pipeline de Transformation ETL
                    </h1>
                    <p className="text-slate-600">
                        Créez des pipelines de transformation de données avec preview en temps réel
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={onTogglePipelineList}>
                        <Clock className="w-4 h-4 mr-2" />
                        {showPipelineList ? 'Cacher la liste' : 'Mes Pipelines'}
                    </Button>
                    <Button onClick={onNew} variant="outline" className="text-brand-600 border-brand-200 hover:bg-brand-50">
                        <Plus className="w-4 h-4 mr-2" />
                        Nouveau
                    </Button>
                </div>
            </div>

            <Card className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex-1 w-full">
                    <input
                        type="text"
                        value={pipelineName}
                        onChange={(e) => onPipelineNameChange(e.target.value)}
                        className="text-xl font-bold text-slate-800 bg-transparent border-none focus:ring-0 w-full"
                        placeholder="Nom du pipeline..."
                    />
                </div>
                <Button onClick={onSave} className="w-full sm:w-auto">
                    <Save className="w-4 h-4 mr-2" />
                    Sauvegarder
                </Button>
            </Card>
        </>
    );
};
