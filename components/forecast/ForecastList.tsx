import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { TrendingUp, Plus, Eye, Edit2, Trash2, Calendar, Brain, Clock } from 'lucide-react';
import { Forecast, ForecastType } from '../../types';

interface ForecastListProps {
  forecasts: Forecast[];
  onSelectForecast: (id: string) => void;
  onDeleteForecast: (id: string) => void;
  onCreateForecast: (
    name: string,
    type: ForecastType,
    year: number,
    chartId: string,
    rolling: boolean
  ) => void;
  chartsOfAccounts: any[];
}

export const ForecastList: React.FC<ForecastListProps> = ({
  forecasts,
  onSelectForecast,
  onDeleteForecast,
  onCreateForecast,
  chartsOfAccounts
}) => {
  return (
    <div className="space-y-6">
      <Card title="Mes Prévisions" icon={<TrendingUp className="w-5 h-5 text-brand-600" />}>
        {forecasts.length === 0 ? (
          <div className="text-center py-12">
            <TrendingUp className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-800 mb-2">Aucune prévision</h3>
            <p className="text-sm text-slate-600 mb-6">
              Créez votre première prévision pour anticiper vos performances.
            </p>
            <Button
              className="bg-brand-600 hover:bg-brand-700"
              onClick={() => {
                const name = window.prompt('Nom de la prévision');
                if (name && chartsOfAccounts.length > 0) {
                  onCreateForecast(
                    name,
                    'monthly',
                    new Date().getFullYear(),
                    chartsOfAccounts[0].id,
                    true
                  );
                }
              }}
            >
              <Plus className="w-4 h-4 mr-2" /> Nouvelle prévision
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {forecasts.map((f) => (
              <div
                key={f.id}
                className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-800">{f.name}</h4>
                    {f.isRolling && (
                      <span className="text-[10px] px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full font-bold uppercase">
                        Rolling
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {f.fiscalYear}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {f.versions.length} version(s)
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => onSelectForecast(f.id)}>
                    <Eye className="w-4 h-4 mr-2" /> Voir
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-200"
                    onClick={() => {
                      if (window.confirm('Supprimer ?')) onDeleteForecast(f.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
