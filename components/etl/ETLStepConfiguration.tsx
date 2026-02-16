import React from 'react';
import { Plus, X, Trash2, ArrowLeftRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { FilterCondition, FilterOperator, Dataset } from '../../types';
import { TransformationStep } from '../../hooks/useETLPipelineLogic';

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
    datasets: Dataset[];
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
    datasets: Dataset[];
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

interface StepConfigurationProps {
    step: TransformationStep;
    availableColumns: string[];
    datasets: Dataset[];
    onUpdate: (config: any) => void;
}

export const ETLStepConfiguration: React.FC<StepConfigurationProps> = ({ step, availableColumns, datasets, onUpdate }) => {
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
