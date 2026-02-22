import { useState, useEffect, useMemo, useCallback } from 'react';
import { useData, usePipeline } from '../context/DataContext';
import { DataRow, TransformationType } from '../types';
import { generateId } from '../utils';
import {
    applyFilter, applyJoin, applyAggregate, applyUnion, applySelect,
    applyRename, applySort, applyDistinct, applySplit, applyMerge, applyCalculate,
    applyPivot, applyUnpivot
} from '../utils/transformations';
import { notify } from '../utils/notify';

// ── Local type ────────────────────────────────────────────────────────────────

export interface TransformationStep {
    id: string;
    type: TransformationType;
    label: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    config: any;
    isExpanded: boolean;
}

// ── Step label map ────────────────────────────────────────────────────────────

const STEP_LABELS: Record<TransformationType, string> = {
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
    select: 'Sélectionner colonnes',
};

// ── Default configs ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getDefaultConfig = (type: TransformationType): any => {
    switch (type) {
        case 'filter':    return { conditions: [], combineWith: 'AND' };
        case 'select':    return { columns: [], exclude: false };
        case 'rename':    return { mappings: [] };
        case 'sort':      return { fields: [] };
        case 'split':     return { column: '', separator: ',', newColumns: [] };
        case 'merge':     return { columns: [], newColumn: '', separator: ' ' };
        case 'calculate': return { newColumn: '', formula: '' };
        case 'aggregate': return { groupBy: [], aggregations: [] };
        case 'pivot':     return { index: '', columns: '', values: '', aggFunc: 'sum' };
        case 'join':      return { type: 'inner', leftKey: '', rightKey: '', rightDatasetId: '', suffix: '_right' };
        case 'union':     return { rightDatasetId: '' };
        case 'unpivot':   return { idVars: [], valueVars: [], varName: 'variable', valueName: 'value' };
        default:          return {};
    }
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useETLPipelineLogic() {
    const { datasets, batches } = useData();
    const { pipelineModule, addPipeline, updatePipeline, deletePipeline } = usePipeline();

    const [activePipelineId, setActivePipelineId] = useState<string | null>(null);
    const [pipelineName, setPipelineName]           = useState('Nouveau Pipeline');
    const [steps, setSteps]                         = useState<TransformationStep[]>([]);
    const [sourceDatasetId, setSourceDatasetId]     = useState<string>('');
    const [showAddStep, setShowAddStep]             = useState(false);
    const [showPipelineList, setShowPipelineList]   = useState(true);

    const previewLimit = 100;

    // Load pipeline when selected
    useEffect(() => {
        if (activePipelineId) {
            const p = pipelineModule.pipelines.find(p => p.id === activePipelineId);
            if (p) {
                setPipelineName(p.name);
                const loadedSteps: TransformationStep[] = p.nodes.map(node => ({
                    id: node.id,
                    type: node.type,
                    label: node.label,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    config: (node.config as any).config || node.config,
                    isExpanded: false,
                }));
                setSteps(loadedSteps);

                const sourceNode = p.nodes.find(n => n.type === 'source');
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                if (sourceNode && (sourceNode.config as any).datasetId) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    setSourceDatasetId((sourceNode.config as any).datasetId);
                }
            }
        } else {
            setSteps([]);
            setSourceDatasetId('');
            setPipelineName('Nouveau Pipeline');
        }
    }, [activePipelineId, pipelineModule.pipelines]);

    // ── Handlers ─────────────────────────────────────────────────────────────

    const handleSavePipeline = useCallback(() => {
        const nodes = steps.map(step => ({
            id: step.id,
            type: step.type,
            label: step.label,
            position: { x: 0, y: 0 },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            config: step.type === 'source' ? { type: 'source', datasetId: sourceDatasetId } : { type: step.type, config: step.config } as any,
            isValid: true,
        }));

        if (activePipelineId) {
            updatePipeline(activePipelineId, { name: pipelineName, nodes, connections: [] });
            notify.success('Pipeline mis à jour !');
        } else {
            const id = addPipeline({ name: pipelineName, nodes, connections: [] });
            setActivePipelineId(id);
            notify.success('Pipeline sauvegardé !');
        }
    }, [steps, sourceDatasetId, activePipelineId, pipelineName, updatePipeline, addPipeline]);

    const handleNewPipeline = useCallback(() => {
        setActivePipelineId(null);
        setSteps([]);
        setSourceDatasetId('');
        setPipelineName('Nouveau Pipeline');
        setShowPipelineList(false);
    }, []);

    const addStep = useCallback((type: TransformationType) => {
        const newStep: TransformationStep = {
            id: `step-${generateId()}`,
            type,
            label: STEP_LABELS[type],
            config: getDefaultConfig(type),
            isExpanded: true,
        };
        setSteps(prev => [...prev, newStep]);
        setShowAddStep(false);
    }, []);

    const updateStepConfig = useCallback((stepId: string, config: unknown) => {
        setSteps(prev => prev.map(s => s.id === stepId ? { ...s, config } : s));
    }, []);

    const deleteStep = useCallback((stepId: string) => {
        setSteps(prev => prev.filter(s => s.id !== stepId));
    }, []);

    const toggleStepExpanded = useCallback((stepId: string) => {
        setSteps(prev => prev.map(s => s.id === stepId ? { ...s, isExpanded: !s.isExpanded } : s));
    }, []);

    const moveStep = useCallback((stepId: string, direction: 'up' | 'down') => {
        setSteps(prev => {
            const index = prev.findIndex(s => s.id === stepId);
            if (index === -1) return prev;
            if (direction === 'up' && index === 0) return prev;
            if (direction === 'down' && index === prev.length - 1) return prev;
            const next = [...prev];
            const newIndex = direction === 'up' ? index - 1 : index + 1;
            [next[index], next[newIndex]] = [next[newIndex], next[index]];
            return next;
        });
    }, []);

    // ── Data computations ─────────────────────────────────────────────────────

    const sourceData = useMemo(() => {
        if (!sourceDatasetId) return [];
        const dataset = datasets.find(d => d.id === sourceDatasetId);
        if (!dataset) return [];
        return batches.filter(b => b.datasetId === sourceDatasetId).flatMap(b => b.rows);
    }, [sourceDatasetId, datasets, batches]);

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

    const pipelineResults = useMemo(() => {
        const results: Record<string, { data: DataRow[]; error?: string }> = {};
        if (sourceData.length === 0) return results;

        let currentData = [...sourceData];
        for (const step of steps) {
            try {
                currentData = executeStep(currentData, step);
                results[step.id] = { data: currentData };
            } catch (error) {
                results[step.id] = {
                    data: [],
                    error: error instanceof Error ? error.message : 'Erreur inconnue',
                };
                break;
            }
        }
        return results;
    }, [sourceData, steps, executeStep]);

    const getColumns = (data: DataRow[]): string[] =>
        data.length === 0 ? [] : Object.keys(data[0]);

    const finalResult = steps.length > 0
        ? pipelineResults[steps[steps.length - 1].id]
        : { data: sourceData };

    return {
        // state
        datasets, batches,
        pipelineModule,
        activePipelineId, setActivePipelineId,
        pipelineName, setPipelineName,
        steps,
        sourceDatasetId, setSourceDatasetId,
        showAddStep, setShowAddStep,
        showPipelineList, setShowPipelineList,
        previewLimit,
        // handlers
        handleSavePipeline,
        handleNewPipeline,
        addStep,
        updateStepConfig,
        deleteStep,
        toggleStepExpanded,
        moveStep,
        deletePipeline,
        // computed
        sourceData,
        pipelineResults,
        getColumns,
        finalResult,
    };
}
