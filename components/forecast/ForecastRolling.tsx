import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Clock, Plus, Calendar } from 'lucide-react';
import { Forecast } from '../../types';

interface ForecastRollingProps {
  selectedForecast: Forecast | null;
  handleCreateSnapshot: () => void;
  getRollingSnapshots: (id: string) => any[];
}

export const ForecastRolling: React.FC<ForecastRollingProps> = ({
  selectedForecast,
  handleCreateSnapshot,
  getRollingSnapshots
}) => {
  if (!selectedForecast || !selectedForecast.isRolling) {
    return (
      <div className="text-center py-12 text-slate-500">
        Le mode Rolling n'est pas activé pour ce forecast
      </div>
    );
  }

  const snapshots = getRollingSnapshots(selectedForecast.id);

  return (
    <Card title="Forecast Glissant (Rolling)" icon={<Clock className="w-5 h-5 text-brand-600" />}>
      <div className="flex justify-between mb-6">
        <div>
          <p className="text-sm text-slate-600">
            Horizon: {selectedForecast.rollingHorizonMonths} mois
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Mise à jour automatique: {selectedForecast.autoUpdateEnabled ? 'Activée' : 'Désactivée'}
          </p>
        </div>
        <Button onClick={handleCreateSnapshot}>
          <Plus className="w-4 h-4 mr-2" /> Figer un snapshot
        </Button>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-bold uppercase text-slate-400 tracking-wider">
          Snapshots archivés
        </h4>
        {snapshots.length === 0 ? (
          <p className="text-sm italic text-slate-400">Aucun snapshot pour le moment</p>
        ) : (
          snapshots.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between p-3 border rounded hover:bg-slate-50"
            >
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-brand-500" />
                <div>
                  <div className="font-bold">{new Date(s.snapshotDate).toLocaleDateString()}</div>
                  <div className="text-xs text-slate-500">{s.name}</div>
                </div>
              </div>
              <Button variant="outline" size="sm">
                Comparer
              </Button>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};
