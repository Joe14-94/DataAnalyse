import React from 'react';
import { AlertCircle, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { ETLStepConfiguration } from './ETLStepConfiguration';
import { ETLDataPreview } from './ETLDataPreview';
import { DataRow, Dataset } from '../../types';
import { TransformationStep } from '../../hooks/useETLPipelineLogic';

interface ETLStepItemProps {
    step: TransformationStep;
    index: number;
    totalSteps: number;
    result?: { data: DataRow[]; error?: string };
    availableColumns: string[];
    datasets: Dataset[];
    previewLimit: number;
    onUpdate: (config: any) => void;
    onDelete: () => void;
    onToggleExpand: () => void;
    onMove: (direction: 'up' | 'down') => void;
    getColumns: (data: DataRow[]) => string[];
}

export const ETLStepItem: React.FC<ETLStepItemProps> = ({
    step,
    index,
    totalSteps,
    result,
    availableColumns,
    datasets,
    previewLimit,
    onUpdate,
    onDelete,
    onToggleExpand,
    onMove,
    getColumns
}) => {
    return (
        <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
            {/* Step Header */}
            <div className="p-3 bg-slate-50 flex items-center justify-between border-b border-slate-200">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-xs font-bold text-slate-500 shrink-0">#{index + 1}</span>
                    <h4 className="font-bold text-slate-800 truncate">{step.label}</h4>
                    {result && !result.error && (
                        <span className="text-xs text-slate-600 hidden sm:inline">
                            {result.data.length} lignes • {getColumns(result.data).length} colonnes
                        </span>
                    )}
                    {result?.error && (
                        <span className="text-xs text-red-600 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Erreur
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    {index > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onMove('up')}
                            title="Monter"
                        >
                            <ChevronUp className="w-3 h-3" />
                        </Button>
                    )}
                    {index < totalSteps - 1 && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onMove('down')}
                            title="Descendre"
                        >
                            <ChevronDown className="w-3 h-3" />
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onToggleExpand}
                    >
                        {step.isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onDelete}
                        className="text-red-600"
                        title="Supprimer"
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Step Configuration */}
            {step.isExpanded && (
                <div className="p-4">
                    <ETLStepConfiguration
                        step={step}
                        availableColumns={availableColumns}
                        datasets={datasets}
                        onUpdate={onUpdate}
                    />

                    {/* Preview */}
                    {result && !result.error && (
                        <div className="mt-4">
                            <h5 className="font-bold text-sm text-slate-700 mb-2">
                                Aperçu ({Math.min(result.data.length, previewLimit)} / {result.data.length} lignes)
                            </h5>
                            <ETLDataPreview data={result.data} limit={previewLimit} />
                        </div>
                    )}

                    {result?.error && (
                        <div className="mt-4 bg-red-50 border border-red-200 rounded p-3">
                            <p className="text-sm text-red-800">
                                <AlertCircle className="w-4 h-4 inline mr-2" />
                                {result.error}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
