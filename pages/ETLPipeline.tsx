import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { notify } from '../utils/notify';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
    Workflow, Plus, Save, Trash2, Settings, ChevronDown, ChevronUp,
    Filter, Merge, BarChart3, Copy, Scissors, ArrowLeftRight, Table2, X, AlertCircle, Search, Clock
} from 'lucide-react';
import { useData, usePipeline } from '../context/DataContext';
import { DataRow, TransformationType, FilterCondition, FilterOperator } from '../types';
import { generateId } from '../utils';
import {
    applyFilter, applyJoin, applyAggregate, applyUnion, applySelect,
    applyRename, applySort, applyDistinct, applySplit, applyMerge, applyCalculate,
    applyPivot, applyUnpivot
} from '../utils/transformations';

interface TransformationStep {
    id: string;
    type: TransformationType;
    label: string;
    config: any;
    isExpanded: boolean;
}

// ==================== CONFIGURATION COMPONENTS ====================
// These must be declared BEFORE StepConfiguration to avoid "Cannot access before initialization" errors

// Data preview component
const DataPreview: React.FC<{ data: DataRow[] }> = ({ data }) => {
    if (data.length === 0) {
        return <p className="text-sm text-slate-500">Aucune donnée</p>;
    }

    const columns = Object.keys(data[0]);

    return (
        <div className="overflow-x-auto border border-slate-200 rounded">
            <table className="w-full text-sm">
                <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                        {columns.map(col => (
                            <th key={col} className="text-left p-2 font-bold text-slate-700">
                                {col}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, i) => (
                        <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                            {columns.map(col => (
                                <td key={col} className="p-2 text-slate-800">
                                    {String(row[col] ?? '')}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// Filter configuration component
const FilterConfig: React.FC<{
    config: { conditions: FilterCondition[]; combineWith: 'AND' | 'OR' };
    availableColumns: string[];
    onUpdate: (config: any) => void;
}> = ({ config, availableColumns, onUpdate }) => {
    const addCondition = () => {
        onUpdate({
            ...config,
            conditions: [...config.conditions, { field: availableColumns[0] || '', operator: 'equals' as FilterOperator, value: '' }]
        });
    };

    const updateCondition = (index: number, updates: Partial<FilterCondition>) => {
        const newConditions = [...config.conditions];
        newConditions[index] = { ...newConditions[index], ...updates };
        onUpdate({ ...config, conditions: newConditions });
    };

    const removeCondition = (index: number) => {
        onUpdate({
            ...config,
            conditions: config.conditions.filter((_, i) => i !== index)
        });
    };

    return (
        <div className="space-y-3">
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Combiner avec</label>
                <select
                    value={config.combineWith}
                    onChange={(e) => onUpdate({ ...config, combineWith: e.target.value as 'AND' | 'OR' })}
                    className="px-3 py-2 border border-slate-300 rounded"
                >
                    <option value="AND">ET (toutes les conditions)</option>
                    <option value="OR">OU (au moins une condition)</option>
                </select>
            </div>

            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-bold text-slate-700">Conditions</label>
                    <Button variant="outline" size="sm" onClick={addCondition}>
                        <Plus className="w-3 h-3 mr-1" />
                        Ajouter
                    </Button>
                </div>

                {config.conditions.map((condition, index) => (
                    <div key={index} className="flex items-center gap-2 mb-2">
                        <select
                            value={condition.field}
                            onChange={(e) => updateCondition(index, { field: e.target.value })}
                            className="px-2 py-1 border border-slate-300 rounded text-sm"
                        >
                            {availableColumns.map(col => (
                                <option key={col} value={col}>{col}</option>
                            ))}
                        </select>

                        <select
                            value={condition.operator}
                            onChange={(e) => updateCondition(index, { operator: e.target.value as FilterOperator })}
                            className="px-2 py-1 border border-slate-300 rounded text-sm"
                        >
                            <option value="equals">=</option>
                            <option value="not_equals">≠</option>
                            <option value="contains">contient</option>
                            <option value="not_contains">ne contient pas</option>
                            <option value="starts_with">commence par</option>
                            <option value="ends_with">finit par</option>
                            <option value="greater_than">&gt;</option>
                            <option value="less_than">&lt;</option>
                            <option value="greater_or_equal">≥</option>
                            <option value="less_or_equal">≤</option>
                            <option value="is_empty">est vide</option>
                            <option value="is_not_empty">n'est pas vide</option>
                        </select>

                        {!['is_empty', 'is_not_empty'].includes(condition.operator) && (
                            <input
                                type="text"
                                value={condition.value || ''}
                                onChange={(e) => updateCondition(index, { value: e.target.value })}
                                placeholder="Valeur"
                                className="px-2 py-1 border border-slate-300 rounded text-sm flex-1"
                            />
                        )}

                        <Button variant="outline" size="sm" onClick={() => removeCondition(index)} className="text-red-600">
                            <X className="w-3 h-3" />
                        </Button>
                    </div>
                ))}

                {config.conditions.length === 0 && (
                    <p className="text-xs text-slate-500">Aucune condition définie</p>
                )}
            </div>
        </div>
    );
};

// Calculate configuration component
const CalculateConfig: React.FC<{
    config: { newColumn: string; formula: string };
    availableColumns: string[];
    onUpdate: (config: any) => void;
}> = ({ config, availableColumns, onUpdate }) => {
    return (
        <div className="space-y-3">
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Nom de la nouvelle colonne</label>
                <input
                    type="text"
                    value={config.newColumn}
                    onChange={(e) => onUpdate({ ...config, newColumn: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded"
                    placeholder="Ex: Total"
                />
            </div>
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                    Formule (utilisez [Colonne] pour référencer)
                </label>
                <input
                    type="text"
                    value={config.formula}
                    onChange={(e) => onUpdate({ ...config, formula: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded font-mono text-sm"
                    placeholder="Ex: [Prix] * [Quantité]"
                />
                <p className="text-xs text-slate-500 mt-1">
                    Colonnes disponibles: {availableColumns.map(c => `[${c}]`).join(', ')}
                </p>
            </div>
        </div>
    );
};

// Select configuration component
const SelectConfig: React.FC<{
    config: { columns: string[]; exclude: boolean };
    availableColumns: string[];
    onUpdate: (config: any) => void;
}> = ({ config, availableColumns, onUpdate }) => {
    const toggleColumn = (col: string) => {
        const newCols = config.columns.includes(col)
            ? config.columns.filter(c => c !== col)
            : [...config.columns, col];
        onUpdate({ ...config, columns: newCols });
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-4 mb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="radio"
                        checked={!config.exclude}
                        onChange={() => onUpdate({ ...config, exclude: false })}
                    />
                    <span className="text-sm font-medium">Conserver</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="radio"
                        checked={config.exclude}
                        onChange={() => onUpdate({ ...config, exclude: true })}
                    />
                    <span className="text-sm font-medium">Exclure</span>
                </label>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 border border-slate-200 rounded bg-slate-50">
                {availableColumns.map(col => (
                    <label key={col} className="flex items-center gap-2 text-xs p-1 hover:bg-white rounded cursor-pointer">
                        <input
                            type="checkbox"
                            checked={config.columns.includes(col)}
                            onChange={() => toggleColumn(col)}
                        />
                        <span className="truncate">{col}</span>
                    </label>
                ))}
            </div>
        </div>
    );
};

// Aggregate configuration component
const AggregateConfig: React.FC<{
    config: { groupBy: string[]; aggregations: { field: string; operation: string; alias?: string }[] };
    availableColumns: string[];
    onUpdate: (config: any) => void;
}> = ({ config, availableColumns, onUpdate }) => {
    const addAggregation = () => {
        onUpdate({
            ...config,
            aggregations: [...config.aggregations, { field: availableColumns[0], operation: 'sum' }]
        });
    };

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Grouper par</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto p-2 border border-slate-200 rounded">
                    {availableColumns.map(col => (
                        <label key={col} className="flex items-center gap-2 text-xs">
                            <input
                                type="checkbox"
                                checked={config.groupBy.includes(col)}
                                onChange={(e) => {
                                    const newGroup = e.target.checked
                                        ? [...config.groupBy, col]
                                        : config.groupBy.filter(c => c !== col);
                                    onUpdate({ ...config, groupBy: newGroup });
                                }}
                            />
                            {col}
                        </label>
                    ))}
                </div>
            </div>
            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-bold text-slate-700">Agrégations</label>
                    <Button variant="outline" size="sm" onClick={addAggregation}>
                        <Plus className="w-3 h-3 mr-1" /> Ajouter
                    </Button>
                </div>
                {config.aggregations.map((agg, idx) => (
                    <div key={idx} className="flex gap-2 mb-2 items-center">
                        <select
                            value={agg.field}
                            onChange={(e) => {
                                const newAggs = [...config.aggregations];
                                newAggs[idx].field = e.target.value;
                                onUpdate({ ...config, aggregations: newAggs });
                            }}
                            className="text-xs p-1 border border-slate-300 rounded flex-1"
                        >
                            {availableColumns.map(col => <option key={col} value={col}>{col}</option>)}
                        </select>
                        <select
                            value={agg.operation}
                            onChange={(e) => {
                                const newAggs = [...config.aggregations];
                                newAggs[idx].operation = e.target.value;
                                onUpdate({ ...config, aggregations: newAggs });
                            }}
                            className="text-xs p-1 border border-slate-300 rounded"
                        >
                            <option value="sum">Somme</option>
                            <option value="avg">Moyenne</option>
                            <option value="count">Nombre</option>
                            <option value="min">Min</option>
                            <option value="max">Max</option>
                            <option value="first">Premier</option>
                            <option value="last">Dernier</option>
                        </select>
                        <input
                            type="text"
                            placeholder="Alias"
                            value={agg.alias || ''}
                            onChange={(e) => {
                                const newAggs = [...config.aggregations];
                                newAggs[idx].alias = e.target.value;
                                onUpdate({ ...config, aggregations: newAggs });
                            }}
                            className="text-xs p-1 border border-slate-300 rounded w-24"
                        />
                        <Button variant="outline" size="sm" onClick={() => {
                            onUpdate({ ...config, aggregations: config.aggregations.filter((_, i) => i !== idx) });
                        }} className="text-red-500 border-none"><Trash2 className="w-3 h-3" /></Button>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Sort configuration component
const SortConfig: React.FC<{
    config: { fields: { field: string; direction: 'asc' | 'desc' }[] };
    availableColumns: string[];
    onUpdate: (config: any) => void;
}> = ({ config, availableColumns, onUpdate }) => {
    const addSort = () => {
        onUpdate({
            ...config,
            fields: [...config.fields, { field: availableColumns[0], direction: 'asc' }]
        });
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-bold text-slate-700">Tris</label>
                <Button variant="outline" size="sm" onClick={addSort}>
                    <Plus className="w-3 h-3 mr-1" /> Ajouter
                </Button>
            </div>
            {config.fields.map((s, idx) => (
                <div key={idx} className="flex gap-2 mb-1">
                    <select
                        value={s.field}
                        onChange={(e) => {
                            const newFields = [...config.fields];
                            newFields[idx].field = e.target.value;
                            onUpdate({ ...config, fields: newFields });
                        }}
                        className="text-xs p-1 border border-slate-300 rounded flex-1"
                    >
                        {availableColumns.map(col => <option key={col} value={col}>{col}</option>)}
                    </select>
                    <select
                        value={s.direction}
                        onChange={(e) => {
                            const newFields = [...config.fields];
                            newFields[idx].direction = e.target.value as 'asc' | 'desc';
                            onUpdate({ ...config, fields: newFields });
                        }}
                        className="text-xs p-1 border border-slate-300 rounded"
                    >
                        <option value="asc">Croissant</option>
                        <option value="desc">Décroissant</option>
                    </select>
                    <Button variant="outline" size="sm" onClick={() => {
                        onUpdate({ ...config, fields: config.fields.filter((_, i) => i !== idx) });
                    }} className="text-red-500 border-none"><Trash2 className="w-3 h-3" /></Button>
                </div>
            ))}
        </div>
    );
};

// Rename configuration component
const RenameConfig: React.FC<{
    config: { mappings: { oldName: string; newName: string }[] };
    availableColumns: string[];
    onUpdate: (config: any) => void;
}> = ({ config, availableColumns, onUpdate }) => {
    const addMapping = () => {
        onUpdate({
            ...config,
            mappings: [...config.mappings, { oldName: availableColumns[0], newName: '' }]
        });
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-bold text-slate-700">Mappages</label>
                <Button variant="outline" size="sm" onClick={addMapping}>
                    <Plus className="w-3 h-3 mr-1" /> Ajouter
                </Button>
            </div>
            {config.mappings.map((m, idx) => (
                <div key={idx} className="flex gap-2 mb-1">
                    <select
                        value={m.oldName}
                        onChange={(e) => {
                            const newMappings = [...config.mappings];
                            newMappings[idx].oldName = e.target.value;
                            onUpdate({ ...config, mappings: newMappings });
                        }}
                        className="text-xs p-1 border border-slate-300 rounded flex-1"
                    >
                        {availableColumns.map(col => <option key={col} value={col}>{col}</option>)}
                    </select>
                    <ArrowLeftRight className="w-4 h-4 mt-1 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Nouveau nom"
                        value={m.newName}
                        onChange={(e) => {
                            const newMappings = [...config.mappings];
                            newMappings[idx].newName = e.target.value;
                            onUpdate({ ...config, mappings: newMappings });
                        }}
                        className="text-xs p-1 border border-slate-300 rounded flex-1"
                    />
                    <Button variant="outline" size="sm" onClick={() => {
                        onUpdate({ ...config, mappings: config.mappings.filter((_, i) => i !== idx) });
                    }} className="text-red-500 border-none"><Trash2 className="w-3 h-3" /></Button>
                </div>
            ))}
        </div>
    );
};

// Split configuration component
const SplitConfig: React.FC<{
    config: { column: string; separator: string; newColumns: string[]; limit?: number };
    availableColumns: string[];
    onUpdate: (config: any) => void;
}> = ({ config, availableColumns, onUpdate }) => {
    return (
        <div className="space-y-3">
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Colonne à diviser</label>
                <select
                    value={config.column}
                    onChange={(e) => onUpdate({ ...config, column: e.target.value })}
                    className="w-full text-xs p-2 border border-slate-300 rounded"
                >
                    <option value="">-- Sélectionner --</option>
                    {availableColumns.map(col => <option key={col} value={col}>{col}</option>)}
                </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Séparateur</label>
                    <input
                        type="text"
                        value={config.separator}
                        onChange={(e) => onUpdate({ ...config, separator: e.target.value })}
                        className="w-full text-xs p-2 border border-slate-300 rounded"
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Limite (optionnel)</label>
                    <input
                        type="number"
                        value={config.limit || ''}
                        onChange={(e) => onUpdate({ ...config, limit: parseInt(e.target.value) || undefined })}
                        className="w-full text-xs p-2 border border-slate-300 rounded"
                    />
                </div>
            </div>
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Noms des nouvelles colonnes (séparés par une virgule)</label>
                <input
                    type="text"
                    value={config.newColumns.join(', ')}
                    onChange={(e) => onUpdate({ ...config, newColumns: e.target.value.split(',').map(s => s.trim()) })}
                    className="w-full text-xs p-2 border border-slate-300 rounded"
                    placeholder="Col1, Col2"
                />
            </div>
        </div>
    );
};

// Merge configuration component
const MergeConfig: React.FC<{
    config: { columns: string[]; newColumn: string; separator: string };
    availableColumns: string[];
    onUpdate: (config: any) => void;
}> = ({ config, availableColumns, onUpdate }) => {
    return (
        <div className="space-y-3">
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nom de la nouvelle colonne</label>
                <input
                    type="text"
                    value={config.newColumn}
                    onChange={(e) => onUpdate({ ...config, newColumn: e.target.value })}
                    className="w-full text-xs p-2 border border-slate-300 rounded"
                />
            </div>
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Séparateur</label>
                <input
                    type="text"
                    value={config.separator}
                    onChange={(e) => onUpdate({ ...config, separator: e.target.value })}
                    className="w-full text-xs p-2 border border-slate-300 rounded"
                />
            </div>
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Colonnes à fusionner</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto p-2 border border-slate-200 rounded">
                    {availableColumns.map(col => (
                        <label key={col} className="flex items-center gap-2 text-xs">
                            <input
                                type="checkbox"
                                checked={config.columns.includes(col)}
                                onChange={(e) => {
                                    const newCols = e.target.checked
                                        ? [...config.columns, col]
                                        : config.columns.filter(c => c !== col);
                                    onUpdate({ ...config, columns: newCols });
                                }}
                            />
                            {col}
                        </label>
                    ))}
                </div>
            </div>
        </div>
    );
};

// Pivot configuration component
const PivotConfig: React.FC<{
    config: { index: string; columns: string; values: string; aggFunc: string };
    availableColumns: string[];
    onUpdate: (config: any) => void;
}> = ({ config, availableColumns, onUpdate }) => {
    return (
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Index (Lignes)</label>
                <select value={config.index} onChange={(e) => onUpdate({ ...config, index: e.target.value })} className="w-full text-xs p-2 border border-slate-300 rounded">
                    <option value="">-- Sélectionner --</option>
                    {availableColumns.map(col => <option key={col} value={col}>{col}</option>)}
                </select>
            </div>
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Colonnes</label>
                <select value={config.columns} onChange={(e) => onUpdate({ ...config, columns: e.target.value })} className="w-full text-xs p-2 border border-slate-300 rounded">
                    <option value="">-- Sélectionner --</option>
                    {availableColumns.map(col => <option key={col} value={col}>{col}</option>)}
                </select>
            </div>
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Valeurs</label>
                <select value={config.values} onChange={(e) => onUpdate({ ...config, values: e.target.value })} className="w-full text-xs p-2 border border-slate-300 rounded">
                    <option value="">-- Sélectionner --</option>
                    {availableColumns.map(col => <option key={col} value={col}>{col}</option>)}
                </select>
            </div>
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Agrégation</label>
                <select value={config.aggFunc} onChange={(e) => onUpdate({ ...config, aggFunc: e.target.value })} className="w-full text-xs p-2 border border-slate-300 rounded">
                    <option value="sum">Somme</option>
                    <option value="avg">Moyenne</option>
                    <option value="count">Nombre</option>
                </select>
            </div>
        </div>
    );
};

// Join configuration component
const JoinConfig: React.FC<{
    config: { type: string; leftKey: string; rightKey: string; rightDatasetId: string; suffix: string };
    availableColumns: string[];
    datasets: any[];
    onUpdate: (config: any) => void;
}> = ({ config, availableColumns, datasets, onUpdate }) => {
    const rightDS = datasets.find(d => d.id === config.rightDatasetId);
    return (
        <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Dataset à joindre</label>
                    <select value={config.rightDatasetId} onChange={(e) => onUpdate({ ...config, rightDatasetId: e.target.value, rightKey: '' })} className="w-full text-xs p-2 border border-slate-300 rounded">
                        <option value="">-- Sélectionner --</option>
                        {datasets.map(ds => <option key={ds.id} value={ds.id}>{ds.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Type de jointure</label>
                    <select value={config.type} onChange={(e) => onUpdate({ ...config, type: e.target.value })} className="w-full text-xs p-2 border border-slate-300 rounded">
                        <option value="inner">Interne (Inner)</option>
                        <option value="left">Gauche (Left)</option>
                        <option value="right">Droite (Right)</option>
                        <option value="full">Complète (Full)</option>
                    </select>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Clé (Pipeline actuel)</label>
                    <select value={config.leftKey} onChange={(e) => onUpdate({ ...config, leftKey: e.target.value })} className="w-full text-xs p-2 border border-slate-300 rounded">
                        <option value="">-- Sélectionner --</option>
                        {availableColumns.map(col => <option key={col} value={col}>{col}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Clé (Dataset cible)</label>
                    <select value={config.rightKey} onChange={(e) => onUpdate({ ...config, rightKey: e.target.value })} className="w-full text-xs p-2 border border-slate-300 rounded">
                        <option value="">-- Sélectionner --</option>
                        {rightDS?.fields.map((f: string) => <option key={f} value={f}>{f}</option>)}
                    </select>
                </div>
            </div>
        </div>
    );
};

// Unpivot configuration component
const UnpivotConfig: React.FC<{
    config: { idVars: string[]; valueVars: string[]; varName: string; valueName: string };
    availableColumns: string[];
    onUpdate: (config: any) => void;
}> = ({ config, availableColumns, onUpdate }) => {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Nom de colonne variable</label>
                    <input type="text" value={config.varName} onChange={(e) => onUpdate({ ...config, varName: e.target.value })} className="w-full text-xs p-2 border border-slate-300 rounded" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Nom de colonne valeur</label>
                    <input type="text" value={config.valueName} onChange={(e) => onUpdate({ ...config, valueName: e.target.value })} className="w-full text-xs p-2 border border-slate-300 rounded" />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Colonnes ID (à garder)</label>
                    <div className="max-h-32 overflow-y-auto p-2 border border-slate-200 rounded">
                        {availableColumns.map(col => (
                            <label key={col} className="flex items-center gap-2 text-xs">
                                <input type="checkbox" checked={config.idVars.includes(col)} onChange={(e) => {
                                    const next = e.target.checked ? [...config.idVars, col] : config.idVars.filter(c => c !== col);
                                    onUpdate({ ...config, idVars: next });
                                }} /> {col}
                            </label>
                        ))}
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Colonnes Valeurs (à dépivoter)</label>
                    <div className="max-h-32 overflow-y-auto p-2 border border-slate-200 rounded">
                        {availableColumns.map(col => (
                            <label key={col} className="flex items-center gap-2 text-xs">
                                <input type="checkbox" checked={config.valueVars.includes(col)} onChange={(e) => {
                                    const next = e.target.checked ? [...config.valueVars, col] : config.valueVars.filter(c => c !== col);
                                    onUpdate({ ...config, valueVars: next });
                                }} /> {col}
                            </label>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Union configuration component
const UnionConfig: React.FC<{
    config: { rightDatasetId: string };
    datasets: any[];
    onUpdate: (config: any) => void;
}> = ({ config, datasets, onUpdate }) => {
    return (
        <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Dataset à ajouter (Union)</label>
            <select value={config.rightDatasetId} onChange={(e) => onUpdate({ ...config, rightDatasetId: e.target.value })} className="w-full text-xs p-2 border border-slate-300 rounded">
                <option value="">-- Sélectionner --</option>
                {datasets.map(ds => <option key={ds.id} value={ds.id}>{ds.name}</option>)}
            </select>
        </div>
    );
};

// Component for step configuration
const StepConfiguration: React.FC<{
    step: TransformationStep;
    availableColumns: string[];
    datasets: any[];
    onUpdate: (config: any) => void;
}> = ({ step, availableColumns, datasets, onUpdate }) => {
    switch (step.type) {
        case 'filter':
            return <FilterConfig config={step.config} availableColumns={availableColumns} onUpdate={onUpdate} />;
        case 'select':
            return <SelectConfig config={step.config} availableColumns={availableColumns} onUpdate={onUpdate} />;
        case 'aggregate':
            return <AggregateConfig config={step.config} availableColumns={availableColumns} onUpdate={onUpdate} />;
        case 'calculate':
            return <CalculateConfig config={step.config} availableColumns={availableColumns} onUpdate={onUpdate} />;
        case 'sort':
            return <SortConfig config={step.config} availableColumns={availableColumns} onUpdate={onUpdate} />;
        case 'rename':
            return <RenameConfig config={step.config} availableColumns={availableColumns} onUpdate={onUpdate} />;
        case 'split':
            return <SplitConfig config={step.config} availableColumns={availableColumns} onUpdate={onUpdate} />;
        case 'merge':
            return <MergeConfig config={step.config} availableColumns={availableColumns} onUpdate={onUpdate} />;
        case 'pivot':
            return <PivotConfig config={step.config} availableColumns={availableColumns} onUpdate={onUpdate} />;
        case 'unpivot':
            return <UnpivotConfig config={step.config} availableColumns={availableColumns} onUpdate={onUpdate} />;
        case 'join':
            return <JoinConfig config={step.config} availableColumns={availableColumns} datasets={datasets} onUpdate={onUpdate} />;
        case 'union':
            return <UnionConfig config={step.config} datasets={datasets} onUpdate={onUpdate} />;
        case 'distinct':
            return <div className="text-sm text-slate-600 italic">Cette étape supprime toutes les lignes identiques.</div>;
        default:
            return <div className="text-sm text-slate-600">Configuration non disponible pour ce type de transformation.</div>;
    }
};

// ==================== MAIN COMPONENT ====================

export const ETLPipeline: React.FC = () => {
    const { datasets, batches } = useData();
    const { pipelineModule, addPipeline, updatePipeline, deletePipeline } = usePipeline();

    // UI state
    const [activePipelineId, setActivePipelineId] = useState<string | null>(null);
    const [pipelineName, setPipelineName] = useState('Nouveau Pipeline');

    // Pipeline state (current working copy)
    const [steps, setSteps] = useState<TransformationStep[]>([]);
    const [sourceDatasetId, setSourceDatasetId] = useState<string>('');
    const [showAddStep, setShowAddStep] = useState(false);
    const previewLimit = 100;
    const [showPipelineList, setShowPipelineList] = useState(true);

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

    const handleSavePipeline = () => {
        const nodes = steps.map(step => ({
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
    };

    const handleNewPipeline = () => {
        setActivePipelineId(null);
        setSteps([]);
        setSourceDatasetId('');
        setPipelineName('Nouveau Pipeline');
        setShowPipelineList(false);
    };

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
                return applySplit(
                    data,
                    step.config.column,
                    step.config.separator,
                    step.config.newColumns,
                    step.config.limit
                );

            case 'merge':
                return applyMerge(
                    data,
                    step.config.columns,
                    step.config.newColumn,
                    step.config.separator
                );

            case 'calculate':
                return applyCalculate(data, step.config.newColumn, step.config.formula);

            case 'aggregate':
                return applyAggregate(
                    data,
                    step.config.groupBy || [],
                    step.config.aggregations || []
                );

            case 'pivot':
                return applyPivot(
                    data,
                    step.config.index,
                    step.config.columns,
                    step.config.values,
                    step.config.aggFunc
                );

            case 'join': {
                const rightDS = datasets.find(d => d.id === step.config.rightDatasetId);
                const rightData = rightDS ? batches.filter(b => b.datasetId === rightDS.id).flatMap(b => b.rows) : [];
                return applyJoin(
                    data,
                    rightData,
                    step.config.leftKey,
                    step.config.rightKey,
                    step.config.type || 'inner',
                    step.config.suffix || '_right'
                );
            }

            case 'union': {
                const rightDS = datasets.find(d => d.id === step.config.rightDatasetId);
                const rightData = rightDS ? batches.filter(b => b.datasetId === rightDS.id).flatMap(b => b.rows) : [];
                return applyUnion(data, rightData);
            }

            case 'unpivot':
                return applyUnpivot(
                    data,
                    step.config.idVars || [],
                    step.config.valueVars || [],
                    step.config.varName || 'variable',
                    step.config.valueName || 'value'
                );

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

    // Get columns from current data
    const getColumns = (data: DataRow[]): string[] => {
        if (data.length === 0) return [];
        return Object.keys(data[0]);
    };

    // Add a new step
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

    // Get default config for a step type
    const getDefaultConfig = (type: TransformationType): any => {
        switch (type) {
            case 'filter':
                return { conditions: [], combineWith: 'AND' };
            case 'select':
                return { columns: [], exclude: false };
            case 'rename':
                return { mappings: [] };
            case 'sort':
                return { fields: [] };
            case 'split':
                return { column: '', separator: ',', newColumns: [] };
            case 'merge':
                return { columns: [], newColumn: '', separator: ' ' };
            case 'calculate':
                return { newColumn: '', formula: '' };
            case 'aggregate':
                return { groupBy: [], aggregations: [] };
            case 'pivot':
                return { index: '', columns: '', values: '', aggFunc: 'sum' };
            case 'join':
                return { type: 'inner', leftKey: '', rightKey: '', rightDatasetId: '', suffix: '_right' };
            case 'union':
                return { rightDatasetId: '' };
            case 'unpivot':
                return { idVars: [], valueVars: [], varName: 'variable', valueName: 'value' };
            default:
                return {};
        }
    };

    // Get label for step type
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

    const updateStepConfig = (stepId: string, config: any) => {
        setSteps(steps.map(step =>
            step.id === stepId ? { ...step, config } : step
        ));
    };

    const deleteStep = (stepId: string) => {
        setSteps(steps.filter(step => step.id !== stepId));
    };

    const toggleStepExpanded = (stepId: string) => {
        setSteps(steps.map(step =>
            step.id === stepId ? { ...step, isExpanded: !step.isExpanded } : step
        ));
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

    // Get final result
    const finalResult = steps.length > 0
        ? pipelineResults[steps[steps.length - 1].id]
        : { data: sourceData };

    return (
        <div className="p-4 md:p-8 w-full">
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
                                                onClick={(e) => { e.stopPropagation(); if(window.confirm('Supprimer ce pipeline ?')) deletePipeline(p.id); }}
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

                <div className={showPipelineList ? 'lg:col-span-3 space-y-6' : 'lg:col-span-4 space-y-6'}>
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

            {/* Source Selection */}
            <Card className="mb-6">
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
                    {/* Pipeline Steps */}
                    <Card className="mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-slate-800">
                                Étapes de transformation ({steps.length})
                            </h3>
                            <Button
                                onClick={() => setShowAddStep(!showAddStep)}
                                className="bg-brand-600 hover:bg-brand-700"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Ajouter une étape
                            </Button>
                        </div>

                        {/* Add Step Menu */}
                        {showAddStep && (
                            <div className="mb-4 bg-slate-50 border border-slate-200 rounded-lg p-4">
                                <h4 className="font-bold text-slate-700 mb-3">Choisir une transformation</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    <Button variant="outline" size="sm" onClick={() => addStep('filter')}>
                                        <Filter className="w-4 h-4 mr-2" />
                                        Filtre
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => addStep('select')}>
                                        <Table2 className="w-4 h-4 mr-2" />
                                        Sélectionner
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => addStep('sort')}>
                                        <ArrowLeftRight className="w-4 h-4 mr-2" />
                                        Tri
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => addStep('aggregate')}>
                                        <BarChart3 className="w-4 h-4 mr-2" />
                                        Agrégation
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => addStep('calculate')}>
                                        <Settings className="w-4 h-4 mr-2" />
                                        Calculer
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => addStep('split')}>
                                        <Scissors className="w-4 h-4 mr-2" />
                                        Diviser
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => addStep('merge')}>
                                        <Merge className="w-4 h-4 mr-2" />
                                        Fusionner
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => addStep('rename')}>
                                        <Copy className="w-4 h-4 mr-2" />
                                        Renommer
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => addStep('distinct')}>
                                        <Copy className="w-4 h-4 mr-2" />
                                        Dédoublonner
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => addStep('join')}>
                                        <Merge className="w-4 h-4 mr-2" />
                                        Jointure
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => addStep('union')}>
                                        <Plus className="w-4 h-4 mr-2" />
                                        Union
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => addStep('pivot')}>
                                        <BarChart3 className="w-4 h-4 mr-2" />
                                        Pivot
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => addStep('unpivot')}>
                                        <ArrowLeftRight className="w-4 h-4 mr-2" />
                                        Unpivot
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Steps List */}
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
                                    const prevData = index === 0 ? sourceData : (pipelineResults[steps[index - 1].id]?.data || []);

                                    return (
                                        <div key={step.id} className="border border-slate-200 rounded-lg">
                                            {/* Step Header */}
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
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => moveStep(step.id, 'up')}
                                                        >
                                                            <ChevronUp className="w-3 h-3" />
                                                        </Button>
                                                    )}
                                                    {index < steps.length - 1 && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => moveStep(step.id, 'down')}
                                                        >
                                                            <ChevronDown className="w-3 h-3" />
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => toggleStepExpanded(step.id)}
                                                    >
                                                        {step.isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => deleteStep(step.id)}
                                                        className="text-red-600"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Step Configuration */}
                                            {step.isExpanded && (
                                                <div className="p-4 border-t border-slate-200">
                                                    <StepConfiguration
                                                        step={step}
                                                        availableColumns={getColumns(prevData)}
                                                        datasets={datasets}
                                                        onUpdate={(config) => updateStepConfig(step.id, config)}
                                                    />

                                                    {/* Preview */}
                                                    {result && !result.error && (
                                                        <div className="mt-4">
                                                            <h5 className="font-bold text-sm text-slate-700 mb-2">
                                                                Aperçu ({Math.min(result.data.length, previewLimit)} / {result.data.length} lignes)
                                                            </h5>
                                                            <DataPreview data={result.data.slice(0, previewLimit)} />
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

                    {/* Final Result */}
                    {steps.length > 0 && finalResult && !finalResult.error && (
                        <Card>
                            <h3 className="text-lg font-bold text-slate-800 mb-4">
                                Résultat final • {finalResult.data.length} lignes
                            </h3>
                            <DataPreview data={finalResult.data.slice(0, previewLimit)} />
                        </Card>
                    )}
                </>
            )}
                </div>
            </div>
        </div>
    );
};
