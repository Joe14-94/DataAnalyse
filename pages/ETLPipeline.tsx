import React from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Plus, Workflow } from 'lucide-react';
import { useETLPipelineLogic } from '../hooks/useETLPipelineLogic';
import { ETLPipelineHeader } from '../components/etl/ETLPipelineHeader';
import { ETLPipelineSidebar } from '../components/etl/ETLPipelineSidebar';
import { ETLStepItem } from '../components/etl/ETLStepItem';
import { ETLAddStepMenu } from '../components/etl/ETLAddStepMenu';
import { ETLDataPreview } from '../components/etl/ETLDataPreview';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

export const ETLPipeline: React.FC = () => {
    const {
        // State
        activePipelineId, setActivePipelineId,
        pipelineName, setPipelineName,
        steps, sourceDatasetId, setSourceDatasetId,
        showAddStep, setShowAddStep,
        showPipelineList, setShowPipelineList,
        previewLimit,

        // Data
        datasets, batches, sourceData, pipelineResults, finalResult,
        pipelineModule,

        // Handlers
        handleSavePipeline, handleNewPipeline, handleDeletePipeline,
        addStep, updateStepConfig, deleteStep, toggleStepExpanded, moveStep,
        getColumns,
        confirmProps
    } = useETLPipelineLogic();

    return (
        <div className="p-4 md:p-8 w-full max-w-[1600px] mx-auto min-h-screen pb-24">
            <ConfirmDialog
                isOpen={confirmProps.isOpen}
                onClose={confirmProps.handleCancel}
                onConfirm={confirmProps.handleConfirm}
                {...confirmProps.options}
            />
            <ETLPipelineHeader
                pipelineName={pipelineName}
                onPipelineNameChange={setPipelineName}
                onSave={handleSavePipeline}
                onNew={handleNewPipeline}
                showPipelineList={showPipelineList}
                onTogglePipelineList={() => setShowPipelineList(!showPipelineList)}
            />

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {showPipelineList && (
                    <div className="lg:col-span-1">
                        <ETLPipelineSidebar
                            pipelineModule={pipelineModule}
                            activePipelineId={activePipelineId}
                            onSelect={setActivePipelineId}
                            onDelete={handleDeletePipeline}
                        />
                    </div>
                )}

                <div className={showPipelineList ? 'lg:col-span-3 space-y-6' : 'lg:col-span-4 space-y-6'}>
                    {/* Source Selection */}
                    <Card>
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Source de données</h3>
                        <select
                            value={sourceDatasetId}
                            onChange={(e) => setSourceDatasetId(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-400 bg-surface text-txt-main"
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
                                <p className="text-sm text-green-800 font-medium">
                                    ✓ {sourceData.length.toLocaleString()} lignes chargées • {getColumns(sourceData).length} colonnes
                                </p>
                            </div>
                        )}
                    </Card>

                    {sourceDatasetId && sourceData.length > 0 && (
                        <>
                            {/* Pipeline Steps */}
                            <Card>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                                    <h3 className="text-lg font-bold text-slate-800">
                                        Étapes de transformation ({steps.length})
                                    </h3>
                                    <Button
                                        onClick={() => setShowAddStep(!showAddStep)}
                                        className="bg-brand-600 hover:bg-brand-700"
                                        icon={<Plus className="w-4 h-4" />}
                                    >
                                        Ajouter une étape
                                    </Button>
                                </div>

                                {/* Add Step Menu */}
                                {showAddStep && (
                                    <ETLAddStepMenu onAddStep={addStep} />
                                )}

                                {/* Steps List */}
                                {steps.length === 0 ? (
                                    <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-slate-500">
                                        <Workflow className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                        <p className="font-medium text-lg">Aucune transformation</p>
                                        <p className="text-sm mt-1">Ajoutez des étapes pour transformer vos données en temps réel</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {steps.map((step, index) => {
                                            const result = pipelineResults[step.id];
                                            const prevData = index === 0 ? sourceData : (pipelineResults[steps[index - 1].id]?.data || []);

                                            return (
                                                <ETLStepItem
                                                    key={step.id}
                                                    step={step}
                                                    index={index}
                                                    totalSteps={steps.length}
                                                    result={result}
                                                    availableColumns={getColumns(prevData)}
                                                    datasets={datasets}
                                                    previewLimit={previewLimit}
                                                    onUpdate={(config) => updateStepConfig(step.id, config)}
                                                    onDelete={() => deleteStep(step.id)}
                                                    onToggleExpand={() => toggleStepExpanded(step.id)}
                                                    onMove={(dir) => moveStep(step.id, dir)}
                                                    getColumns={getColumns}
                                                />
                                            );
                                        })}
                                    </div>
                                )}
                            </Card>

                            {/* Final Result */}
                            {steps.length > 0 && finalResult && !finalResult.error && (
                                <Card className="border-t-4 border-t-brand-500">
                                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-brand-500" />
                                        Résultat final • {finalResult.data.length.toLocaleString()} lignes
                                    </h3>
                                    <ETLDataPreview data={finalResult.data} limit={previewLimit} />
                                </Card>
                            )}
                        </>
                    )}

                    {!sourceDatasetId && (
                        <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                            <Workflow className="w-16 h-16 text-slate-200 mb-4" />
                            <p className="text-slate-400 font-medium">Sélectionnez une source de données pour commencer</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
