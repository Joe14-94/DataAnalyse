import React from 'react';
import { TrendingUp, FileText, Edit2, Target, RefreshCw, Brain, BarChart3 } from 'lucide-react';
import { ForecastTab } from '../../hooks/useForecastLogic';

interface ForecastHeaderProps {
    activeTab: ForecastTab;
    onTabChange: (tab: ForecastTab) => void;
}

export const ForecastHeader: React.FC<ForecastHeaderProps> = ({ activeTab, onTabChange }) => {
    return (
        <>
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-slate-800 mb-2 flex items-center gap-3">
                    <TrendingUp className="w-8 h-8 text-brand-600" />
                    Forecast & Rolling Forecast
                </h1>
                <p className="text-slate-600">
                    Pilotage moderne avec prévisions glissantes et machine learning
                </p>
            </div>

            <div className="flex gap-2 mb-6 border-b border-slate-200 overflow-x-auto">
                {[
                    { id: 'list' as ForecastTab, label: 'Liste', icon: FileText },
                    { id: 'editor' as ForecastTab, label: 'Éditeur', icon: Edit2 },
                    { id: 'drivers' as ForecastTab, label: 'Inducteurs', icon: Target },
                    { id: 'rolling' as ForecastTab, label: 'Rolling Forecast', icon: RefreshCw },
                    { id: 'ml' as ForecastTab, label: 'Prédictions ML', icon: Brain },
                    { id: 'reconciliation' as ForecastTab, label: 'Réconciliation', icon: BarChart3 }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        className={`px-4 py-2 font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
                            activeTab === tab.id
                                ? 'border-brand-600 text-brand-600'
                                : 'border-transparent text-slate-600 hover:text-slate-800'
                        }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>
        </>
    );
};
