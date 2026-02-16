import { useState, useMemo, useEffect, useCallback } from 'react';
import { useData, usePipeline } from '../context/DataContext';
import { DataRow, TransformationType, PipelineNode } from '../types';
import { generateId, notify } from '../utils/common';
import {
    applyFilter, applyJoin, applyAggregate, applyUnion, applySelect,
    applyRename, applySort, applyDistinct, applySplit, applyMerge, applyCalculate,
    applyPivot, applyUnpivot
} from '../utils/transformations';

export interface TransformationStep {
    id: string;
    type: TransformationType;
    label: string;
    config: any;
    isExpanded: boolean;
}

export const useETLPipelineLogic = () => {
    const { datasets, batches } = useData();
    const { pipelineModule, addPipeline, updatePipeline, deletePipeline } = usePipeline();

    // UI state
    const [activePipelineId, setActivePipelineId] = useState<string | null>(null);
    const [pipelineName, setPipelineName] = useState('Nouveau Pipeline');

    // Pipeline state (current working copy)
    const [steps, setSteps] = useState<TransformationStep[]>([]);
    const [sourceDatasetId, setSourceDatasetId] = useState<string>('');
    const [showAddStep, setShowAddStep] = useState(false);
    const [showPipelineList, setShowPipelineList] = useState(true);
    const previewLimit = 100;

    // Load pipeline when selected
    useEffect(() => {
        if (activePipelineId) {
            const p = pipelineModule.pipelines.find(p => p.id === activePipelineId);
            if (p) {
                setPipelineName(p.name);
                // Convert nodes back to steps
                const loadedSteps: TransformationStep[] = p.nodes.map(node => ({
                    id: node.id,
                    type: node.type,
                    label: node.label,
                    config: (node.config as any).config || node.config, // Handle nesting if any
                    isExpanded: false
                }));
                setSteps(loadedSteps);

                // Find source dataset ID from the first 'source' node if it exists
                const sourceNode = p.nodes.find(n => n.type === 'source');
                if (sourceNode && (sourceNode.config as any).datasetId) {
                    setSourceDatasetId((sourceNode.config as any).datasetId);
                }
            }
        } else {
            setSteps([]);
            setSourceDatasetId('');
            setPipelineName('Nouveau Pipeline');
        }
    }, [activePipelineId, pipelineModule.pipelines]);

    const handleSavePipeline = useCallback(() => {
        if (!pipelineName.trim()) {
            notify.warning('Veuillez donner un nom au pipeline');
            return;
        }

        const nodes: PipelineNode[] = steps.map(step => ({
            id: step.id,
            type: step.type,
            label: step.label,
            position: { x: 0, y: 0 },
            config: step.type === 'source' ? { type: 'source', datasetId: sourceDatasetId } : { type: step.type, config: step.config } as any,
            isValid: true
        }));

        if (activePipelineId) {
            updatePipeline(activePipelineId, { name: pipelineName, nodes, connections: [] });
            notify.success('Pipeline mis à jour !');
        } else {
            const id = addPipeline({
                name: pipelineName,
                nodes,
                connections: []
            });
            setActivePipelineId(id);
            notify.success('Pipeline sauvegardé !');
        }
    }, [activePipelineId, pipelineName, steps, sourceDatasetId, addPipeline, updatePipeline]);

    const handleNewPipeline = useCallback(() => {
        setActivePipelineId(null);
        setSteps([]);
        setSourceDatasetId('');
        setPipelineName('Nouveau Pipeline');
        setShowPipelineList(false);
    }, []);

    const handleDeletePipeline = useCallback((id: string) => {
        if (window.confirm('Supprimer ce pipeline ?')) {
            deletePipeline(id);
            if (activePipelineId === id) {
                handleNewPipeline();
            }
            notify.success('Pipeline supprimé');
        }
    }, [deletePipeline, activePipelineId, handleNewPipeline]);

    // Get source data
    const sourceData = useMemo(() => {
        if (!sourceDatasetId) return [];
        const dataset = datasets.find(d => d.id === sourceDatasetId);
        if (!dataset) return [];
        return batches
            .filter(b => b.datasetId === sourceDatasetId)
            .flatMap(b => b.rows);
    }, [sourceDatasetId, datasets, batches]);

    // Execute a single step
    const executeStep = useCallback((data: DataRow[], step: TransformationStep): DataRow[] => {
        switch (step.type) {
            case 'filter':
                return applyFilter(data, step.config.conditions || [], step.config.combineWith || 'AND');
            case 'select':
                return applySelect(data, step.config.columns || [], step.config.exclude);
            case 'rename':
                return applyRename(data, step.config.mappings || []);
            case 'sort':
                return applySort(data, step.config.fields || []);
            case 'distinct':
                return applyDistinct(data);
            case 'split':
                return applySplit(data, step.config.column, step.config.separator, step.config.newColumns, step.config.limit);
            case 'merge':
                return applyMerge(data, step.config.columns, step.config.newColumn, step.config.separator);
            case 'calculate':
                return applyCalculate(data, step.config.newColumn, step.config.formula);
            case 'aggregate':
                return applyAggregate(data, step.config.groupBy || [], step.config.aggregations || []);
            case 'pivot':
                return applyPivot(data, step.config.index, step.config.columns, step.config.values, step.config.aggFunc);
            case 'join': {
                const rightDS = datasets.find(d => d.id === step.config.rightDatasetId);
                const rightData = rightDS ? batches.filter(b => b.datasetId === rightDS.id).flatMap(b => b.rows) : [];
                return applyJoin(data, rightData, step.config.leftKey, step.config.rightKey, step.config.type || 'inner', step.config.suffix || '_right');
            }
            case 'union': {
                const rightDS = datasets.find(d => d.id === step.config.rightDatasetId);
                const rightData = rightDS ? batches.filter(b => b.datasetId === rightDS.id).flatMap(b => b.rows) : [];
                return applyUnion(data, rightData);
            }
            case 'unpivot':
                return applyUnpivot(data, step.config.idVars || [], step.config.valueVars || [], step.config.varName || 'variable', step.config.valueName || 'value');
            default:
                return data;
        }
    }, [batches, datasets]);

    // Execute pipeline and get result at each step
    const pipelineResults = useMemo(() => {
        const results: { [stepId: string]: { data: DataRow[]; error?: string } } = {};
        if (sourceData.length === 0) return results;

        let currentData = [...sourceData];
        for (const step of steps) {
            try {
                currentData = executeStep(currentData, step);
                results[step.id] = { data: currentData };
            } catch (error) {
                results[step.id] = {
                    data: [],
                    error: error instanceof Error ? error.message : 'Erreur inconnue'
                };
                break; // Stop on error
            }
        }
        return results;
    }, [sourceData, steps, executeStep]);

    // Helpers
    const getColumns = useCallback((data: DataRow[]): string[] => {
        if (data.length === 0) return [];
        return Object.keys(data[0]);
    }, []);

    const getStepLabel = (type: TransformationType): string => {
        const labels: { [key in TransformationType]: string } = {
            source: 'Source',
            filter: 'Filtre',
            join: 'Jointure',
            aggregate: 'Agrégation',
            union: 'Union',
            pivot: 'Pivot',
            unpivot: 'Unpivot',
            split: 'Diviser colonne',
            merge: 'Fusionner colonnes',
            calculate: 'Colonne calculée',
            sort: 'Tri',
            distinct: 'Dédoublonnage',
            rename: 'Renommer',
            select: 'Sélectionner colonnes'
        };
        return labels[type];
    };

    const getDefaultConfig = (type: TransformationType): any => {
        switch (type) {
            case 'filter': return { conditions: [], combineWith: 'AND' };
            case 'select': return { columns: [], exclude: false };
            case 'rename': return { mappings: [] };
            case 'sort': return { fields: [] };
            case 'split': return { column: '', separator: ',', newColumns: [] };
            case 'merge': return { columns: [], newColumn: '', separator: ' ' };
            case 'calculate': return { newColumn: '', formula: '' };
            case 'aggregate': return { groupBy: [], aggregations: [] };
            case 'pivot': return { index: '', columns: '', values: '', aggFunc: 'sum' };
            case 'join': return { type: 'inner', leftKey: '', rightKey: '', rightDatasetId: '', suffix: '_right' };
            case 'union': return { rightDatasetId: '' };
            case 'unpivot': return { idVars: [], valueVars: [], varName: 'variable', valueName: 'value' };
            default: return {};
        }
    };

    // Actions
    const addStep = (type: TransformationType) => {
        const newStep: TransformationStep = {
            id: `step-${generateId()}`,
            type,
            label: getStepLabel(type),
            config: getDefaultConfig(type),
            isExpanded: true
        };
        setSteps([...steps, newStep]);
        setShowAddStep(false);
    };

    const updateStepConfig = (stepId: string, config: any) => {
        setSteps(steps.map(step => step.id === stepId ? { ...step, config } : step));
    };

    const deleteStep = (stepId: string) => {
        setSteps(steps.filter(step => step.id !== stepId));
    };

    const toggleStepExpanded = (stepId: string) => {
        setSteps(steps.map(step => step.id === stepId ? { ...step, isExpanded: !step.isExpanded } : step));
    };

    const moveStep = (stepId: string, direction: 'up' | 'down') => {
        const index = steps.findIndex(s => s.id === stepId);
        if (index === -1) return;
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === steps.length - 1) return;
        const newSteps = [...steps];
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];
        setSteps(newSteps);
    };

    const finalResult = steps.length > 0
        ? pipelineResults[steps[steps.length - 1].id]
        : { data: sourceData };

    return {
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
        getColumns
    };
};
