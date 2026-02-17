import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { TrendingUp, Plus, Calendar, Eye, Edit2, Trash2, RefreshCw } from 'lucide-react';
import { ForecastLine } from '../../types';
import { notify } from '../../utils/common';
import { useConfirm } from '../../hooks/useConfirm';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface ForecastListProps {
    forecasts: any[];
    reconciliationReports: any[];
    chartsOfAccounts: any[];
    onSelectForecast: (id: string) => void;
    onDeleteForecast: (id: string) => void;
    onCreateForecast: (name: string, type: any, year: number, chartId: string, isRolling: boolean) => void;
}

export const ForecastList: React.FC<ForecastListProps> = ({
    forecasts,
    reconciliationReports,
    chartsOfAccounts,
    onSelectForecast,
    onDeleteForecast,
    onCreateForecast
}) => {
    const { confirm, ...confirmProps } = useConfirm();

    return (
        <div className="space-y-6">
            <ConfirmDialog
                isOpen={confirmProps.isOpen}
                onClose={confirmProps.handleCancel}
                onConfirm={confirmProps.handleConfirm}
                {...confirmProps.options}
            />
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-l-4 border-l-brand-500">
                    <div className="text-sm text-slate-600 font-bold">Total Forecasts</div>
                    <div className="text-2xl font-bold text-slate-800 mt-1">
                        {forecasts.length}
                    </div>
                </Card>
                <Card className="border-l-4 border-l-brand-500">
                    <div className="text-sm text-slate-600 font-bold">Rolling Forecasts</div>
                    <div className="text-2xl font-bold text-slate-800 mt-1">
                        {forecasts.filter(f => f.isRolling).length}
                    </div>
                </Card>
                <Card className="border-l-4 border-l-purple-500">
                    <div className="text-sm text-slate-600 font-bold">ML Activé</div>
                    <div className="text-2xl font-bold text-slate-800 mt-1">
                        {forecasts.filter(f => f.mlConfig?.enabled).length}
                    </div>
                </Card>
                <Card className="border-l-4 border-l-green-500">
                    <div className="text-sm text-slate-600 font-bold">Rapports</div>
                    <div className="text-2xl font-bold text-slate-800 mt-1">
                        {reconciliationReports.length}
                    </div>
                </Card>
            </div>

            {/* Action Button */}
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-800">Mes Forecasts</h2>
                <Button
                    className="bg-brand-600 hover:bg-brand-700"
                    onClick={() => {
                        const year = new Date().getFullYear();
                        const defaultChart = chartsOfAccounts[0];
                        if (!defaultChart) {
                            notify.warning('Veuillez d\'abord créer un plan comptable dans les paramètres.');
                            return;
                        }
                        const name = prompt('Nom du forecast:', `Forecast ${year}`);
                        if (name) {
                            confirm({
                                title: 'Type de Forecast',
                                message: 'Voulez-vous activer le Rolling forecast (12 mois glissants) ?',
                                confirmLabel: 'Oui, Rolling',
                                cancelLabel: 'Non, Fixe',
                                variant: 'info'
                            }).then(isRolling => {
                                onCreateForecast(name, 'monthly', year, defaultChart.id, isRolling);
                            });
                        }
                    }}
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Nouveau forecast
                </Button>
            </div>

            {/* Forecasts List */}
            {forecasts.length === 0 ? (
                <Card>
                    <div className="text-center py-12">
                        <TrendingUp className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-slate-800 mb-2">
                            Aucun forecast
                        </h3>
                        <p className="text-sm text-slate-600 mb-6">
                            Créez votre premier forecast pour commencer les prévisions
                        </p>
                        <Button
                            className="bg-brand-600 hover:bg-brand-700"
                            onClick={() => {
                                const year = new Date().getFullYear();
                                const defaultChart = chartsOfAccounts[0];
                                if (!defaultChart) {
                                    notify.warning('Veuillez d\'abord créer un plan comptable.');
                                    return;
                                }
                                const name = prompt('Nom du forecast:', `Forecast ${year}`);
                                if (name) {
                                    confirm({
                                        title: 'Type de Forecast',
                                        message: 'Activer le Rolling forecast ?',
                                        confirmLabel: 'Activer',
                                        cancelLabel: 'Laisser fixe',
                                        variant: 'info'
                                    }).then(isRolling => {
                                        onCreateForecast(name, 'monthly', year, defaultChart.id, isRolling);
                                    });
                                }
                            }}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Créer un forecast
                        </Button>
                    </div>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {forecasts.map(forecast => {
                        const activeVersion = forecast.versions.find((v: any) => v.id === forecast.activeVersionId);
                        const statusColors: Record<string, string> = {
                            draft: 'bg-gray-100 text-gray-700',
                            submitted: 'bg-brand-100 text-brand-700',
                            validated: 'bg-green-100 text-green-700',
                            locked: 'bg-purple-100 text-purple-700'
                        };

                        return (
                            <Card key={forecast.id} className="hover:shadow-lg transition-shadow">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <h3 className="font-bold text-slate-800 mb-1">
                                            {forecast.name}
                                            {forecast.isRolling && (
                                                <RefreshCw className="w-4 h-4 text-brand-600 inline-block ml-2" />
                                            )}
                                        </h3>
                                        <div className="flex items-center gap-2 text-xs text-slate-600">
                                            <Calendar className="w-3 h-3" />
                                            <span>Exercice {forecast.fiscalYear}</span>
                                        </div>
                                    </div>
                                    {activeVersion && (
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${statusColors[activeVersion.status]}`}>
                                            {activeVersion.status}
                                        </span>
                                    )}
                                </div>

                                <div className="space-y-2 mb-3">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-600">Type:</span>
                                        <span className="font-bold text-slate-800">{forecast.type}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-600">Versions:</span>
                                        <span className="font-bold text-slate-800">{forecast.versions.length}</span>
                                    </div>
                                    {forecast.isRolling && (
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-600">Snapshots:</span>
                                            <span className="font-bold text-slate-800">
                                                {forecast.rollingSnapshots?.length || 0}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 pt-3 border-t border-slate-200">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 text-brand-600 border-brand-200"
                                        onClick={() => onSelectForecast(forecast.id)}
                                    >
                                        <Eye className="w-4 h-4 mr-2" />
                                        Voir
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 text-slate-600 border-slate-200"
                                        onClick={() => onSelectForecast(forecast.id)}
                                    >
                                        <Edit2 className="w-4 h-4 mr-2" />
                                        Éditer
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-red-600 border-red-200"
                                        onClick={async () => {
                                            const ok = await confirm({
                                                title: 'Supprimer le forecast',
                                                message: `Supprimer "${forecast.name}" ?`,
                                                variant: 'danger'
                                            });
                                            if (ok) {
                                                onDeleteForecast(forecast.id);
                                            }
                                        }}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
