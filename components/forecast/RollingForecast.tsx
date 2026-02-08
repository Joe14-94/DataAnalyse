import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { RefreshCw, Clock, Eye } from 'lucide-react';

interface RollingForecastProps {
    selectedForecastId: string | null;
    selectedForecast: any;
    getRollingSnapshots: (id: string) => any[];
    onCreateSnapshot: () => void;
}

export const RollingForecast: React.FC<RollingForecastProps> = ({
    selectedForecastId,
    selectedForecast,
    getRollingSnapshots,
    onCreateSnapshot
}) => {
    return (
        <Card title="Rolling Forecast" icon={<RefreshCw className="w-5 h-5 text-brand-600" />}>
            {!selectedForecastId || !selectedForecast?.isRolling ? (
                <div className="text-center py-12 text-slate-500">
                    <RefreshCw className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p>Sélectionnez un rolling forecast pour voir l'historique</p>
                </div>
            ) : (
                <div>
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="font-bold text-slate-800">
                                {selectedForecast.name}
                            </h3>
                            <p className="text-sm text-slate-600 mt-1">
                                Horizon: {selectedForecast.rollingHorizonMonths} mois glissants
                            </p>
                        </div>
                        <Button
                            className="bg-brand-600 hover:bg-brand-700"
                            onClick={onCreateSnapshot}
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Créer snapshot
                        </Button>
                    </div>

                    {getRollingSnapshots(selectedForecastId).length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                            <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <p>Aucun snapshot enregistré</p>
                            <p className="text-sm mt-2">
                                Les snapshots permettent de suivre l'évolution des prévisions dans le temps
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {getRollingSnapshots(selectedForecastId)
                                .sort((a, b) => b.createdAt - a.createdAt)
                                .map(snapshot => (
                                    <div
                                        key={snapshot.id}
                                        className="border border-slate-200 rounded-lg p-4 hover:border-brand-300"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="font-bold text-slate-800">
                                                    Snapshot du {new Date(snapshot.snapshotDate).toLocaleDateString('fr-FR')}
                                                </div>
                                                <div className="text-sm text-slate-600 mt-1">
                                                    Période: {new Date(snapshot.periodStart).toLocaleDateString('fr-FR')} → {new Date(snapshot.periodEnd).toLocaleDateString('fr-FR')}
                                                </div>
                                                <div className="text-sm text-slate-600">
                                                    {snapshot.data.length} ligne(s) de forecast
                                                </div>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-brand-600 border-brand-200"
                                            >
                                                <Eye className="w-4 h-4 mr-2" />
                                                Voir
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    )}
                </div>
            )}
        </Card>
    );
};
