import React from 'react';
import { Card } from '../ui/Card';
import { BarChart3, AlertCircle, Lightbulb } from 'lucide-react';

interface ReconciliationProps {
    reconciliationReports: any[];
}

export const Reconciliation: React.FC<ReconciliationProps> = ({ reconciliationReports }) => {
    return (
        <Card title="Réconciliation Forecast vs Réalisé" icon={<BarChart3 className="w-5 h-5 text-brand-600" />}>
            <div className="space-y-6">
                <div className="bg-brand-50 border border-brand-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-brand-600 mt-0.5" />
                        <div>
                            <h4 className="font-bold text-brand-900 mb-1">
                                Analyse des écarts
                            </h4>
                            <p className="text-sm text-brand-800">
                                Comparez vos prévisions avec les réalisations pour améliorer la précision de vos futurs forecasts.
                            </p>
                        </div>
                    </div>
                </div>

                {reconciliationReports.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                        <BarChart3 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <p>Aucun rapport de réconciliation</p>
                        <p className="text-sm mt-2">
                            Les rapports seront générés automatiquement lorsque des données réelles seront disponibles
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {reconciliationReports.map(report => (
                            <div key={report.id} className="border border-slate-200 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h4 className="font-bold text-slate-800">
                                            Rapport du {new Date(report.createdAt).toLocaleDateString('fr-FR')}
                                        </h4>
                                        <p className="text-sm text-slate-600 mt-1">
                                            Période: {new Date(report.periodStart).toLocaleDateString('fr-FR')} → {new Date(report.periodEnd).toLocaleDateString('fr-FR')}
                                        </p>
                                    </div>
                                </div>

                                {/* Summary Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                                    <div className="bg-slate-50 rounded p-3">
                                        <div className="text-xs text-slate-600 font-bold">Total Forecast</div>
                                        <div className="text-lg font-bold text-slate-800 mt-1">
                                            {report.totalForecast.toLocaleString('fr-FR')} €
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 rounded p-3">
                                        <div className="text-xs text-slate-600 font-bold">Total Réalisé</div>
                                        <div className="text-lg font-bold text-slate-800 mt-1">
                                            {report.totalActual.toLocaleString('fr-FR')} €
                                        </div>
                                    </div>
                                    <div className={`rounded p-3 ${
                                        report.totalVariance >= 0 ? 'bg-green-50' : 'bg-red-50'
                                    }`}>
                                        <div className="text-xs text-slate-600 font-bold">Écart</div>
                                        <div className={`text-lg font-bold mt-1 ${
                                            report.totalVariance >= 0 ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                            {report.totalVariance >= 0 ? '+' : ''}{report.totalVariance.toLocaleString('fr-FR')} €
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 rounded p-3">
                                        <div className="text-xs text-slate-600 font-bold">MAPE</div>
                                        <div className="text-lg font-bold text-slate-800 mt-1">
                                            {report.mape?.toFixed(1)}%
                                        </div>
                                    </div>
                                </div>

                                {/* Recommendations */}
                                {report.recommendations && report.recommendations.length > 0 && (
                                    <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
                                        <h5 className="font-bold text-yellow-900 mb-2 flex items-center gap-2">
                                            <Lightbulb className="w-4 h-4" />
                                            Recommandations
                                        </h5>
                                        <ul className="space-y-1 text-sm text-yellow-800">
                                            {report.recommendations.map((rec: string, idx: number) => (
                                                <li key={idx}>• {rec}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Variances count */}
                                <div className="text-sm text-slate-600">
                                    {report.variances.length} écart(s) identifié(s)
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Card>
    );
};
