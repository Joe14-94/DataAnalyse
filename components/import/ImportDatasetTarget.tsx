import React from 'react';
import { Database, Check, Edit2, AlertTriangle } from 'lucide-react';
import { Card } from '../ui/Card';
import { Dataset } from '../../types';

interface ImportDatasetTargetProps {
    date: string;
    setDate: (date: string) => void;
    detectedDatasetId: string | null;
    datasets: Dataset[];
    targetDatasetId: string | 'NEW';
    setTargetDatasetId: (id: string | 'NEW') => void;
    newDatasetName: string;
    setNewDatasetName: (name: string) => void;
    updateMode: 'merge' | 'overwrite';
    setUpdateMode: (mode: 'merge' | 'overwrite') => void;
}

export const ImportDatasetTarget: React.FC<ImportDatasetTargetProps> = ({
    date, setDate,
    detectedDatasetId,
    datasets,
    targetDatasetId, setTargetDatasetId,
    newDatasetName, setNewDatasetName,
    updateMode, setUpdateMode
}) => {
    const selectedDS = datasets.find(d => d.id === targetDatasetId);

    // Simple check for structure changes could be passed as prop if needed,
    // but here we just render the conflict resolution if it's not a new dataset
    const hasStructureChanges = targetDatasetId !== 'NEW'; // Simplified for component

    return (
        <div className="space-y-6">
            <Card className="p-6 border-brand-200 bg-brand-50">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <h3 className="text-lg font-bold text-brand-900 mb-4 flex items-center gap-2">
                        <Database className="w-5 h-5" />
                        Destination de l'import
                    </h3>

                    <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-md shadow-sm border border-brand-100">
                        <label htmlFor="step2-date" className="text-xs font-bold text-brand-700">Date d'extraction :</label>
                        <input
                            type="date"
                            id="step2-date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="text-sm border-none bg-transparent focus:ring-0 text-slate-700 font-medium p-0 w-32"
                        />
                        <Edit2 className="w-3 h-3 text-brand-400" />
                    </div>
                </div>

                <div className="space-y-4">
                    {detectedDatasetId && (
                        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-100 p-2 rounded border border-green-200">
                            <Check className="w-4 h-4" />
                            Typologie reconnue : <strong>{datasets.find(d => d.id === detectedDatasetId)?.name}</strong>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className={`relative flex items-start p-4 cursor-pointer rounded-lg border-2 transition-all ${targetDatasetId === 'NEW' ? 'border-brand-500 bg-white shadow-md' : 'border-slate-200 bg-slate-50 hover:bg-white'}`}>
                            <input
                                type="radio"
                                name="targetDS"
                                value="NEW"
                                checked={targetDatasetId === 'NEW'}
                                onChange={() => setTargetDatasetId('NEW')}
                                className="mt-1 h-4 w-4 text-brand-600 border-gray-300 bg-white focus:ring-brand-500"
                            />
                            <div className="ml-3 w-full">
                                <span className="block text-sm font-medium text-slate-900">Créer une nouvelle typologie</span>
                                {targetDatasetId === 'NEW' && (
                                    <input
                                        type="text"
                                        placeholder="Nom du tableau (ex: Ventes 2025)"
                                        className="mt-2 block w-full rounded-md border-slate-300 bg-white shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2"
                                        value={newDatasetName}
                                        onChange={(e) => setNewDatasetName(e.target.value)}
                                        autoFocus
                                    />
                                )}
                            </div>
                        </label>

                        {datasets.length > 0 && (
                            <label className={`relative flex items-start p-4 cursor-pointer rounded-lg border-2 transition-all ${targetDatasetId !== 'NEW' ? 'border-brand-500 bg-white shadow-md' : 'border-slate-200 bg-slate-50 hover:bg-white'}`}>
                                <input
                                    type="radio"
                                    name="targetDS"
                                    value="EXISTING_FALLBACK"
                                    checked={targetDatasetId !== 'NEW'}
                                    onChange={() => setTargetDatasetId(detectedDatasetId || datasets[0].id)}
                                    className="mt-1 h-4 w-4 text-brand-600 border-gray-300 bg-white focus:ring-brand-500"
                                />
                                <div className="ml-3 w-full">
                                    <span className="block text-sm font-medium text-slate-900">Ajouter à une typologie existante</span>
                                    <select
                                        className="mt-2 block w-full rounded-md border-slate-300 shadow-sm bg-white focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2 disabled:opacity-50"
                                        value={targetDatasetId !== 'NEW' ? targetDatasetId : ''}
                                        onChange={(e) => setTargetDatasetId(e.target.value)}
                                        disabled={targetDatasetId === 'NEW'}
                                    >
                                        {datasets.map(d => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </label>
                        )}
                    </div>
                </div>
            </Card>

            {targetDatasetId !== 'NEW' && (
                <Card className="p-4 border-amber-300 bg-amber-50">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-6 h-6 text-amber-600 mt-0.5" />
                        <div className="flex-1">
                            <h4 className="text-base font-bold text-amber-800">Mode de mise à jour</h4>
                            <p className="text-sm text-amber-700 mt-1">
                                Choisissez comment intégrer les données dans "<strong>{selectedDS?.name}</strong>".
                            </p>

                            <div className="mt-4 pt-4 border-t border-amber-200">
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="updateMode" value="merge" checked={updateMode === 'merge'} onChange={() => setUpdateMode('merge')} className="text-amber-600 bg-white focus:ring-amber-500" />
                                        <span className="text-sm font-bold text-slate-800">Mettre à jour (fusionner)</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="updateMode" value="overwrite" checked={updateMode === 'overwrite'} onChange={() => setUpdateMode('overwrite')} className="text-amber-600 bg-white focus:ring-amber-500" />
                                        <span className="text-sm font-bold text-slate-800">Écraser et remplacer</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
};
