import React from 'react';
import { Columns, Calculator, Trash2, BarChart2, Plus, Minus } from 'lucide-react';
import { BarChart, Bar, Tooltip, ResponsiveContainer } from 'recharts';
import { Button } from '../ui/Button';

interface DataExplorerToolbarProps {
    selectedCol: string | null;
    renamingValue: string;
    setRenamingValue: (val: string) => void;
    handleRenameColumn: () => void;
    selectedConfig: any;
    handleFormatChange: (key: string, value: any) => void;
    isSelectedNumeric: boolean;
    currentDataset: any;
    handleEditCalculatedField: (field: any) => void;
    handleDeleteColumn: () => void;
    setSelectedCol: (col: string | null) => void;
    distributionData: any[];
}

export const DataExplorerToolbar: React.FC<DataExplorerToolbarProps> = ({
    selectedCol, renamingValue, setRenamingValue, handleRenameColumn,
    selectedConfig, handleFormatChange, isSelectedNumeric,
    currentDataset, handleEditCalculatedField, handleDeleteColumn,
    setSelectedCol, distributionData
}) => {
    return (
        <div className={`transition-all duration-300 overflow-hidden ${selectedCol ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="bg-white border border-brand-200 rounded-lg p-3 shadow-sm bg-gradient-to-r from-white to-brand-50 flex flex-wrap items-start gap-4">
                {/* LEFT: Renaming and Actions */}
                <div className="flex-1 flex flex-col gap-2">
                    <div className="flex items-center gap-2 border-b border-brand-100 pb-2 mb-2">
                        <Columns className="w-4 h-4 text-brand-700" />
                        <div className="relative group">
                            <input
                                type="text"
                                className="text-sm font-bold text-brand-800 bg-transparent border-b border-brand-300 focus:outline-none focus:border-brand-600 w-48"
                                value={renamingValue}
                                onChange={e => setRenamingValue(e.target.value)}
                                placeholder={selectedCol || ''}
                            />
                            {renamingValue !== selectedCol && (
                                <button onClick={handleRenameColumn} className="absolute -right-16 top-0 text-xs bg-brand-600 text-white px-2 py-0.5 rounded hover:bg-brand-700 shadow-sm">Renommer</button>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3 items-center">
                        <div className="flex items-center gap-2 pr-3 border-r border-brand-100">
                            <span className="text-xs text-slate-600 font-medium whitespace-nowrap">Type :</span>
                            <select
                                className="text-xs border border-slate-200 rounded py-1 px-2 bg-white focus:ring-1 focus:ring-brand-500"
                                value={selectedConfig?.type || 'text'}
                                onChange={(e) => handleFormatChange('type', e.target.value)}
                            >
                                <option value="text">Texte</option>
                                <option value="number">Nombre</option>
                                <option value="date">Date</option>
                                <option value="boolean">Oui/Non</option>
                            </select>
                        </div>

                        {isSelectedNumeric ? (
                            <>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-600 font-medium">Décimales :</span>
                                    <div className="flex bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
                                        <button
                                            onClick={() => handleFormatChange('decimalPlaces', Math.max(0, (selectedConfig?.decimalPlaces ?? 2) - 1))}
                                            className="px-2 py-1 text-xs hover:bg-slate-50 text-slate-600 border-r border-slate-100 transition-colors focus:outline-none focus:ring-1 focus:ring-inset focus:ring-brand-500"
                                            title="Diminuer les décimales"
                                            aria-label="Diminuer les décimales"
                                        >
                                            <Minus className="w-3 h-3" />
                                        </button>
                                        <span className="px-2 py-1 text-xs font-mono w-6 text-center select-none">{selectedConfig?.decimalPlaces ?? 2}</span>
                                        <button
                                            onClick={() => handleFormatChange('decimalPlaces', Math.min(5, (selectedConfig?.decimalPlaces ?? 2) + 1))}
                                            className="px-2 py-1 text-xs hover:bg-slate-50 text-slate-600 border-l border-slate-100 transition-colors focus:outline-none focus:ring-1 focus:ring-inset focus:ring-brand-500"
                                            title="Augmenter les décimales"
                                            aria-label="Augmenter les décimales"
                                        >
                                            <Plus className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-600 font-medium">Échelle :</span>
                                    <select className="text-xs border border-slate-200 rounded py-1 pl-2 pr-6 bg-white focus:ring-1 focus:ring-brand-500" value={selectedConfig?.displayScale || 'none'} onChange={(e) => handleFormatChange('displayScale', e.target.value)}>
                                        <option value="none">Aucune</option>
                                        <option value="thousands">Milliers (k)</option>
                                        <option value="millions">Millions (M)</option>
                                        <option value="billions">Milliards (Md)</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-600 font-medium">Unité :</span>
                                    <input type="text" className="text-xs border border-slate-200 rounded w-16 px-2 py-1 bg-white focus:ring-1 focus:ring-brand-500" placeholder="Ex: €" value={selectedConfig?.unit || ''} onChange={(e) => handleFormatChange('unit', e.target.value)} />
                                </div>
                            </>
                        ) : (
                            <span className="text-xs text-slate-400 italic">Options de formatage non disponibles pour ce type.</span>
                        )}

                        <div className="ml-auto flex items-center gap-2 border-l border-slate-200 pl-3">
                            {currentDataset?.calculatedFields?.some((f: any) => f.name === selectedCol) && (
                                <Button
                                    size="sm"
                                    className="bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-200 shadow-sm text-xs font-semibold"
                                    onClick={() => {
                                        const field = currentDataset.calculatedFields?.find((f: any) => f.name === selectedCol);
                                        if (field) handleEditCalculatedField(field);
                                    }}
                                >
                                    <Calculator className="w-3 h-3 mr-1" /> Modifier Formule
                                </Button>
                            )}
                            <Button onClick={handleDeleteColumn} size="sm" className="bg-red-600 hover:bg-red-700 text-white border border-red-700 shadow-sm text-xs font-semibold"><Trash2 className="w-3 h-3 mr-1" /> Supprimer</Button>
                            <Button onClick={() => setSelectedCol(null)} size="sm" className="bg-brand-600 text-white hover:bg-brand-700 shadow-sm text-xs">Terminer</Button>
                        </div>
                    </div>
                </div>

                {/* RIGHT: Distribution Chart */}
                <div className="w-64 h-32 bg-white rounded border border-slate-100 p-2 flex flex-col">
                    <div className="flex items-center gap-1 text-xs font-bold text-slate-400 uppercase mb-1">
                        <BarChart2 className="w-3 h-3" /> Distribution (Top 15)
                    </div>
                    <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={distributionData}>
                                <Tooltip
                                    cursor={{ fill: '#f1f5f9' }}
                                    contentStyle={{ fontSize: '12px', padding: '4px', borderRadius: '4px' }}
                                    formatter={(value: number) => [value, 'Occurrences']}
                                />
                                <Bar dataKey="value" fill="#0d9488" radius={[2, 2, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};
