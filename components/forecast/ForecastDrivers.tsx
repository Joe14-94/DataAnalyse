import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Target, Plus, Trash2 } from 'lucide-react';

interface ForecastDriversProps {
    selectedForecastId: string | null;
    selectedForecast: any;
    showNewDriverModal: boolean;
    driverName: string;
    driverUnit: string;
    onToggleNewDriverModal: (show: boolean) => void;
    onSetDriverForm: (form: Partial<{ name: string; unit: string }>) => void;
    onAddDriver: () => void;
    onDeleteDriver: (id: string) => void;
    onBackToList: () => void;
}

export const ForecastDrivers: React.FC<ForecastDriversProps> = ({
    selectedForecastId,
    selectedForecast,
    showNewDriverModal,
    driverName,
    driverUnit,
    onToggleNewDriverModal,
    onSetDriverForm,
    onAddDriver,
    onDeleteDriver,
    onBackToList
}) => {
    return (
        <Card title="Inducteurs de forecast" icon={<Target className="w-5 h-5 text-brand-600" />}>
            {!selectedForecastId ? (
                <div className="text-center py-12 text-slate-500">
                    <Target className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p>Sélectionnez un forecast pour gérer les inducteurs</p>
                    <Button
                        onClick={onBackToList}
                        className="mt-4 bg-brand-600 hover:bg-brand-700"
                    >
                        Retour à la liste
                    </Button>
                </div>
            ) : (
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-slate-600">
                            Les inducteurs permettent de créer des prévisions basées sur des variables (volume × prix, etc.)
                        </p>
                        <Button
                            variant="outline"
                            onClick={() => onToggleNewDriverModal(true)}
                            className="text-brand-600 border-brand-200"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Nouvel inducteur
                        </Button>
                    </div>

                    {selectedForecast?.drivers.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            <Target className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                            <p>Aucun inducteur défini</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {selectedForecast?.drivers.map((driver: any) => (
                                <div key={driver.id} className="border border-slate-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-bold text-slate-800">{driver.name}</h4>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-red-600 border-red-200"
                                            onClick={() => onDeleteDriver(driver.id)}
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    </div>
                                    {driver.unit && (
                                        <p className="text-sm text-slate-600 mb-2">Unité: {driver.unit}</p>
                                    )}
                                    <div className="text-sm text-slate-600">
                                        Valeurs historiques: {Object.keys(driver.historicalValues).length}
                                    </div>
                                    <div className="text-sm text-slate-600">
                                        Valeurs prévisionnelles: {Object.keys(driver.forecastValues).length}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* New Driver Modal */}
                    {showNewDriverModal && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                            <div className="bg-white rounded-lg shadow-xl max-md w-full mx-4 p-6">
                                <h3 className="text-lg font-bold text-slate-800 mb-4">Nouvel inducteur</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">
                                            Nom
                                        </label>
                                        <input
                                            type="text"
                                            value={driverName}
                                            onChange={(e) => onSetDriverForm({ name: e.target.value })}
                                            placeholder="Ex: Volume de ventes"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-400"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">
                                            Unité (optionnel)
                                        </label>
                                        <input
                                            type="text"
                                            value={driverUnit}
                                            onChange={(e) => onSetDriverForm({ unit: e.target.value })}
                                            placeholder="Ex: unités, €/unité"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-400"
                                        />
                                    </div>
                                    <div className="flex gap-2 pt-4">
                                        <Button
                                            className="flex-1 bg-brand-600 hover:bg-brand-700"
                                            onClick={onAddDriver}
                                        >
                                            Créer
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="flex-1"
                                            onClick={() => onToggleNewDriverModal(false)}
                                        >
                                            Annuler
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </Card>
    );
};
