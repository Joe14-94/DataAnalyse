import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Plus, Trash2, X, Activity } from 'lucide-react';
import { Forecast } from '../../types';

interface ForecastDriversProps {
  selectedForecast: Forecast | null;
  showNewDriverModal: boolean;
  setShowNewDriverModal: (v: boolean) => void;
  driverName: string;
  setDriverName: (v: string) => void;
  driverUnit: string;
  setDriverUnit: (v: string) => void;
  handleAddDriver: () => void;
  deleteDriver: (fid: string, did: string) => void;
}

export const ForecastDrivers: React.FC<ForecastDriversProps> = ({
  selectedForecast,
  showNewDriverModal,
  setShowNewDriverModal,
  driverName,
  setDriverName,
  driverUnit,
  setDriverUnit,
  handleAddDriver,
  deleteDriver
}) => {
  if (!selectedForecast) {
    return (
      <div className="text-center py-12 text-slate-500">
        Sélectionnez un forecast pour gérer les drivers
      </div>
    );
  }

  return (
    <Card title="Drivers de forecast" icon={<Activity className="w-5 h-5 text-brand-600" />}>
      <div className="flex justify-between mb-4">
        <p className="text-sm text-slate-600">
          Gérez les indicateurs clés (volumes, prix...) qui pilotent vos prévisions
        </p>
        <Button variant="outline" size="sm" onClick={() => setShowNewDriverModal(true)}>
          <Plus className="w-4 h-4 mr-2" /> Nouveau driver
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {selectedForecast.drivers.map((driver) => (
          <div key={driver.id} className="border rounded-lg p-4 bg-slate-50 relative">
            <button
              onClick={() => deleteDriver(selectedForecast.id, driver.id)}
              className="absolute top-2 right-2 text-slate-400 hover:text-red-600"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <h4 className="font-bold">{driver.name}</h4>
            <div className="text-xs text-slate-500 mb-2">Unité: {driver.unit || 'N/A'}</div>
            {/* Values preview... */}
          </div>
        ))}
      </div>

      {showNewDriverModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between mb-4">
              <h3 className="font-bold">Nouveau Driver</h3>
              <button onClick={() => setShowNewDriverModal(false)}>
                <X />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1">Nom</label>
                <input
                  type="text"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Unité</label>
                <input
                  type="text"
                  value={driverUnit}
                  onChange={(e) => setDriverUnit(e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </div>
              <Button className="w-full bg-brand-600" onClick={handleAddDriver}>
                Créer
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
