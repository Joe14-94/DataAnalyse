import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Filter, Download, Plus, Upload, X } from 'lucide-react';
import { AnalyticalAxis, AxisValue } from '../../types';

interface BudgetReferentialsProps {
    analyticalAxes: AnalyticalAxis[];
    getAxisValues: (id: string) => AxisValue[];
    onDownloadTemplate: () => void;
    onShowNewAxis: () => void;
    onShowImportAxis: (id: string) => void;
    onExportAxis: (id: string) => void;
    onDeleteAxisValue: (id: string, name: string) => void;
}

export const BudgetReferentials: React.FC<BudgetReferentialsProps> = ({
    analyticalAxes,
    getAxisValues,
    onDownloadTemplate,
    onShowNewAxis,
    onShowImportAxis,
    onExportAxis,
    onDeleteAxisValue
}) => {
    return (
        <Card title="Axes analytiques" icon={<Filter className="w-5 h-5 text-brand-600" />}>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-600">Gérez les axes analytiques et importez leurs valeurs en masse depuis Excel/CSV</p>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={onDownloadTemplate} className="text-slate-600">
                            <Download className="w-4 h-4 mr-2" /> Template
                        </Button>
                        <Button size="sm" className="bg-brand-600 hover:bg-brand-700" onClick={onShowNewAxis}>
                            <Plus className="w-4 h-4 mr-2" /> Nouvel axe
                        </Button>
                    </div>
                </div>

                <div className="space-y-4">
                    {analyticalAxes.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                            <Filter className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-600 font-medium">Aucun axe analytique</p>
                            <p className="text-sm text-slate-500 mt-1">Créez votre premier axe pour commencer à ventiler vos budgets</p>
                            <Button size="sm" className="mt-4 bg-brand-600 hover:bg-brand-700" onClick={onShowNewAxis}>
                                <Plus className="w-4 h-4 mr-2" /> Créer un axe
                            </Button>
                        </div>
                    ) : (
                        analyticalAxes.map(axis => {
                            const values = getAxisValues(axis.id);
                            return (
                                <div key={axis.id} className="border border-slate-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-slate-800">{axis.name}</h4>
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 font-mono">{axis.code}</span>
                                                {axis.isMandatory && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">Obligatoire</span>}
                                            </div>
                                            <p className="text-sm text-slate-600 mt-1">{values.length} valeur(s) configurée(s)</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm" onClick={() => onShowImportAxis(axis.id)} className="text-brand-600 border-brand-200">
                                                <Upload className="w-4 h-4 mr-1" /> Importer
                                            </Button>
                                            {values.length > 0 && (
                                                <Button variant="outline" size="sm" onClick={() => onExportAxis(axis.id)} className="text-green-600 border-green-200">
                                                    <Download className="w-4 h-4 mr-1" /> Exporter
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    {values.length > 0 && (
                                        <div className="mt-3 border-t border-slate-200 pt-3">
                                            <div className="text-xs font-bold text-slate-500 mb-2 uppercase">Valeurs ({values.length})</div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                                                {values.slice(0, 20).map(value => (
                                                    <div key={value.id} className="flex items-start justify-between text-sm bg-slate-50 px-2 py-1.5 rounded border border-slate-200">
                                                        <div className="flex-1 min-w-0">
                                                            {(value.category || value.subCategory) && (
                                                                <div className="text-xs text-slate-400 mb-0.5">
                                                                    {value.category && <span>{value.category}</span>}
                                                                    {value.category && value.subCategory && <span className="mx-1">›</span>}
                                                                    {value.subCategory && <span>{value.subCategory}</span>}
                                                                </div>
                                                            )}
                                                            <div>
                                                                <span className="font-mono text-xs text-slate-500 mr-2">{value.code}</span>
                                                                <span className="text-slate-800 truncate">{value.label}</span>
                                                            </div>
                                                        </div>
                                                        <button onClick={() => onDeleteAxisValue(value.id, value.label)} className="text-red-400 hover:text-red-600 ml-2 flex-shrink-0"><X className="w-3 h-3" /></button>
                                                    </div>
                                                ))}
                                                {values.length > 20 && <div className="text-xs text-slate-500 italic px-2 py-1">... et {values.length - 20} autre(s)</div>}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </Card>
    );
};
