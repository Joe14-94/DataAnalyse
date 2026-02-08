import React from 'react';
import { Card } from '../ui/Card';
import { Brain, Lightbulb, CheckCircle } from 'lucide-react';

export const MLPredictions: React.FC = () => {
    return (
        <Card title="Prédictions Machine Learning" icon={<Brain className="w-5 h-5 text-brand-600" />}>
            <div className="space-y-6">
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        <Lightbulb className="w-5 h-5 text-purple-600 mt-0.5" />
                        <div>
                            <h4 className="font-bold text-purple-900 mb-1">
                                Prédictions automatiques
                            </h4>
                            <p className="text-sm text-purple-800">
                                Le système analyse l'historique pour détecter les tendances et la saisonnalité,
                                puis génère des prévisions avec intervalle de confiance.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border-l-4 border-l-purple-500">
                        <div className="text-sm text-slate-600 font-bold">Méthode</div>
                        <div className="text-lg font-bold text-slate-800 mt-1">
                            Tendance + Saisonnalité
                        </div>
                    </Card>
                    <Card className="border-l-4 border-l-brand-500">
                        <div className="text-sm text-slate-600 font-bold">Confiance</div>
                        <div className="text-lg font-bold text-slate-800 mt-1">
                            95%
                        </div>
                    </Card>
                    <Card className="border-l-4 border-l-green-500">
                        <div className="text-sm text-slate-600 font-bold">Horizon</div>
                        <div className="text-lg font-bold text-slate-800 mt-1">
                            12 mois
                        </div>
                    </Card>
                </div>

                <div>
                    <h4 className="font-bold text-slate-800 mb-3">Comment utiliser ?</h4>
                    <ol className="space-y-2 text-sm text-slate-700">
                        <li className="flex items-start gap-2">
                            <span className="font-bold text-brand-600">1.</span>
                            <span>Allez dans l'onglet "Éditeur" et sélectionnez un forecast</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="font-bold text-brand-600">2.</span>
                            <span>Pour chaque ligne avec des données historiques, cliquez sur l'icône Brain (🤖)</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="font-bold text-brand-600">3.</span>
                            <span>Le système générera automatiquement les prévisions pour les 12 prochains mois</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="font-bold text-brand-600">4.</span>
                            <span>Les cellules avec prédictions ML apparaîtront en violet avec des intervalles de confiance</span>
                        </li>
                    </ol>
                </div>

                <div className="bg-slate-50 rounded-lg p-4">
                    <h4 className="font-bold text-slate-800 mb-2">Fonctionnalités ML</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span>Détection automatique de tendance</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span>Détection de saisonnalité</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span>Intervalles de confiance 95%</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span>Prévisions sur 12 mois</span>
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
};
