import React from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
    Workflow, Plus, Save, Trash2, Settings, ChevronDown, ChevronUp,
    Filter, Merge, BarChart3, Copy, Scissors, ArrowLeftRight, Table2, AlertCircle, Search, Clock
} from 'lucide-react';
import { TransformationType } from '../types';
import { useETLPipelineLogic } from '../hooks/useETLPipelineLogic';
import { ETLDataPreview } from '../components/etl/ETLDataPreview';
import { StepConfiguration } from '../components/etl/ETLStepConfigs';

export const ETLPipeline: React.FC = () => {
    const {
        datasets, batches,
        pipelineModule,
        activePipelineId, setActivePipelineId,
        pipelineName, setPipelineName,
        steps,
        sourceDatasetId, setSourceDatasetId,
        showAddStep, setShowAddStep,
        showPipelineList, setShowPipelineList,
        previewLimit,
        handleSavePipeline,
        handleNewPipeline,
        addStep,
        updateStepConfig,
        deleteStep,
        toggleStepExpanded,
        moveStep,
        deletePipeline,
        sourceData,
        pipelineResults,
        getColumns,
        finalResult,
    } = useETLPipelineLogic();

    return (
        <div className="p-4 md:p-8 w-full">
            {/* ── Header ── */}
            <div className="mb-6 flex items-center justify-between">
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
                    <Button variant="outline" onClick={() => setShowPipelineList(!showPipelineList)}>
                        <Clock className="w-4 h-4 mr-2" />
                        {showPipelineList ? 'Cacher la liste' : 'Mes Pipelines'}
                    </Button>
                    <Button onClick={handleNewPipeline} variant="outline" className="text-brand-600 border-brand-200 hover:bg-brand-50">
                        <Plus className="w-4 h-4 mr-2" />
                        Nouveau
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* ── Pipeline list ── */}
                {showPipelineList && (
                    <div className="lg:col-span-1">
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
                                            onClick={() => setActivePipelineId(p.id)}
                                        >
                                            <div className="min-w-0">
                                                <div className="font-bold text-sm text-slate-800 truncate">{p.name}</div>
                                                <div className="text-xs text-slate-500 mt-0.5">
                                                    Modifié le {new Date(p.updatedAt).toLocaleDateString('fr-FR')}
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); if (window.confirm('Supprimer ce pipeline ?')) deletePipeline(p.id); }}
                                                className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </Card>
                    </div>
                )}

                {/* ── Main content ── */}
                <div className={showPipelineList ? 'lg:col-span-3 space-y-6' : 'lg:col-span-4 space-y-6'}>

                    {/* Pipeline name + save */}
                    <Card className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                            <input
                                type="text"
                                value={pipelineName}
                                onChange={(e) => setPipelineName(e.target.value)}
                                className="text-xl font-bold text-slate-800 bg-transparent border-none focus:ring-0 w-full"
                                placeholder="Nom du pipeline..."
                            />
                        </div>
                        <Button onClick={handleSavePipeline}>
                            <Save className="w-4 h-4 mr-2" />
                            Sauvegarder
                        </Button>
                    </Card>

                    {/* Source selection */}
                    <Card>
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Source de données</h3>
                        <select
                            value={sourceDatasetId}
                            onChange={(e) => setSourceDatasetId(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-400"
                        >
                            <option value="">-- Sélectionner un dataset --</option>
                            {datasets.map(dataset => (
                                <option key={dataset.id} value={dataset.id}>
                                    {dataset.name} ({batches.filter(b => b.datasetId === dataset.id).reduce((sum, b) => sum + b.rows.length, 0)} lignes)
                                </option>
                            ))}
                        </select>

                        {sourceDatasetId && sourceData.length > 0 && (
                            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
                                <p className="text-sm text-green-800">
                                    ✓ {sourceData.length} lignes chargées • {getColumns(sourceData).length} colonnes
                                </p>
                            </div>
                        )}
                    </Card>

                    {sourceDatasetId && sourceData.length > 0 && (
                        <>
                            {/* Transformation steps */}
                            <Card>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold text-slate-800">
                                        Étapes de transformation ({steps.length})
                                    </h3>
                                    <Button onClick={() => setShowAddStep(!showAddStep)} className="bg-brand-600 hover:bg-brand-700">
                                        <Plus className="w-4 h-4 mr-2" />
                                        Ajouter une étape
                                    </Button>
                                </div>

                                {/* Add step menu */}
                                {showAddStep && (
                                    <div className="mb-4 bg-slate-50 border border-slate-200 rounded-lg p-4">
                                        <h4 className="font-bold text-slate-700 mb-3">Choisir une transformation</h4>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                            {([
                                                ['filter',    <Filter className="w-4 h-4 mr-2" key="f" />,        'Filtre'],
                                                ['select',    <Table2 className="w-4 h-4 mr-2" key="s" />,        'Sélectionner'],
                                                ['sort',      <ArrowLeftRight className="w-4 h-4 mr-2" key="so" />, 'Tri'],
                                                ['aggregate', <BarChart3 className="w-4 h-4 mr-2" key="a" />,     'Agrégation'],
                                                ['calculate', <Settings className="w-4 h-4 mr-2" key="c" />,      'Calculer'],
                                                ['split',     <Scissors className="w-4 h-4 mr-2" key="sp" />,     'Diviser'],
                                                ['merge',     <Merge className="w-4 h-4 mr-2" key="m" />,         'Fusionner'],
                                                ['rename',    <Copy className="w-4 h-4 mr-2" key="r" />,          'Renommer'],
                                                ['distinct',  <Copy className="w-4 h-4 mr-2" key="d" />,          'Dédoublonner'],
                                                ['join',      <Merge className="w-4 h-4 mr-2" key="j" />,         'Jointure'],
                                                ['union',     <Plus className="w-4 h-4 mr-2" key="u" />,          'Union'],
                                                ['pivot',     <BarChart3 className="w-4 h-4 mr-2" key="p" />,     'Pivot'],
                                                ['unpivot',   <ArrowLeftRight className="w-4 h-4 mr-2" key="up" />, 'Unpivot'],
                                            ] as [TransformationType, React.ReactNode, string][]).map(([type, icon, label]) => (
                                                <Button key={type} variant="outline" size="sm" onClick={() => addStep(type)}>
                                                    {icon}{label}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Steps list */}
                                {steps.length === 0 ? (
                                    <div className="text-center py-8 text-slate-500">
                                        <Workflow className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                        <p>Aucune transformation</p>
                                        <p className="text-sm mt-2">Ajoutez des étapes pour transformer vos données</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {steps.map((step, index) => {
                                            const result = pipelineResults[step.id];
                                            const prevData = index === 0
                                                ? sourceData
                                                : (pipelineResults[steps[index - 1].id]?.data || []);

                                            return (
                                                <div key={step.id} className="border border-slate-200 rounded-lg">
                                                    <div className="p-3 bg-slate-50 flex items-center justify-between">
                                                        <div className="flex items-center gap-3 flex-1">
                                                            <span className="text-xs font-bold text-slate-500">#{index + 1}</span>
                                                            <h4 className="font-bold text-slate-800">{step.label}</h4>
                                                            {result && (
                                                                <span className="text-xs text-slate-600">
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
                                                        <div className="flex items-center gap-1">
                                                            {index > 0 && (
                                                                <Button variant="outline" size="sm" onClick={() => moveStep(step.id, 'up')}>
                                                                    <ChevronUp className="w-3 h-3" />
                                                                </Button>
                                                            )}
                                                            {index < steps.length - 1 && (
                                                                <Button variant="outline" size="sm" onClick={() => moveStep(step.id, 'down')}>
                                                                    <ChevronDown className="w-3 h-3" />
                                                                </Button>
                                                            )}
                                                            <Button variant="outline" size="sm" onClick={() => toggleStepExpanded(step.id)}>
                                                                {step.isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                            </Button>
                                                            <Button variant="outline" size="sm" onClick={() => deleteStep(step.id)} className="text-red-600">
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    {step.isExpanded && (
                                                        <div className="p-4 border-t border-slate-200">
                                                            <StepConfiguration
                                                                step={step}
                                                                availableColumns={getColumns(prevData)}
                                                                datasets={datasets}
                                                                onUpdate={(config) => updateStepConfig(step.id, config)}
                                                            />

                                                            {result && !result.error && (
                                                                <div className="mt-4">
                                                                    <h5 className="font-bold text-sm text-slate-700 mb-2">
                                                                        Aperçu ({Math.min(result.data.length, previewLimit)} / {result.data.length} lignes)
                                                                    </h5>
                                                                    <ETLDataPreview data={result.data.slice(0, previewLimit)} />
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
                                        })}
                                    </div>
                                )}
                            </Card>

                            {/* Final result */}
                            {steps.length > 0 && finalResult && !finalResult.error && (
                                <Card>
                                    <h3 className="text-lg font-bold text-slate-800 mb-4">
                                        Résultat final • {finalResult.data.length} lignes
                                    </h3>
                                    <ETLDataPreview data={finalResult.data.slice(0, previewLimit)} />
                                </Card>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
