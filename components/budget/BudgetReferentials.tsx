import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Filter, Download, Plus, Upload, X, Clock, AlertCircle } from 'lucide-react';

interface BudgetReferentialsProps {
  analyticalAxes: any[];
  onDownloadTemplate: () => void;
  onShowNewAxisModal: () => void;
  onShowAxisImportModal: (axisId: string) => void;
  onExportAxisValues: (axisId: string) => void;
  onDeleteAxisValue: (valueId: string, label: string) => void;
  getAxisValues: (axisId: string) => any[];
  showNewAxisModal: boolean;
  onCloseNewAxisModal: () => void;
  newAxisCode: string;
  onSetNewAxisCode: (code: string) => void;
  newAxisName: string;
  onSetNewAxisName: (name: string) => void;
  newAxisMandatory: boolean;
  onSetNewAxisMandatory: (m: boolean) => void;
  onCreateAxis: () => void;
  showAxisImportModal: boolean;
  onCloseAxisImportModal: () => void;
  isImportingAxis: boolean;
  axisImportError: string | null;
  axisFileInputRef: React.RefObject<HTMLInputElement>;
  onAxisFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const BudgetReferentials: React.FC<BudgetReferentialsProps> = ({
  analyticalAxes,
  onDownloadTemplate,
  onShowNewAxisModal,
  onShowAxisImportModal,
  onExportAxisValues,
  onDeleteAxisValue,
  getAxisValues,
  showNewAxisModal,
  onCloseNewAxisModal,
  newAxisCode,
  onSetNewAxisCode,
  newAxisName,
  onSetNewAxisName,
  newAxisMandatory,
  onSetNewAxisMandatory,
  onCreateAxis,
  showAxisImportModal,
  onCloseAxisImportModal,
  isImportingAxis,
  axisImportError,
  axisFileInputRef,
  onAxisFileSelect
}) => {
  return (
    <Card title="Axes analytiques" icon={<Filter className="w-5 h-5 text-brand-600" />}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-600">
            Gérez les axes analytiques et importez leurs valeurs
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onDownloadTemplate}
              className="text-slate-600"
            >
              <Download className="w-4 h-4 mr-2" />
              Template
            </Button>
            <Button
              size="sm"
              className="bg-brand-600 hover:bg-brand-700"
              onClick={onShowNewAxisModal}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouvel axe
            </Button>
          </div>
        </div>
        <div className="space-y-4">
          {analyticalAxes.map((axis) => {
            const values = getAxisValues(axis.id);
            return (
              <div key={axis.id} className="border border-slate-200 rounded-lg p-4 bg-white">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-800">{axis.name}</h4>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-brand-100 text-brand-700">
                        {axis.code}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mt-1">{values.length} valeur(s)</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onShowAxisImportModal(axis.id)}
                      className="text-brand-600 border-brand-200"
                    >
                      <Upload className="w-4 h-4 mr-1" />
                      Importer
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onExportAxisValues(axis.id)}
                      className="text-green-600 border-green-200"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Exporter
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                  {values.map((value) => (
                    <div
                      key={value.id}
                      className="flex items-start justify-between text-sm bg-slate-50 px-2 py-1.5 rounded border border-slate-200"
                    >
                      <span className="truncate">
                        {value.code} - {value.label}
                      </span>
                      <button
                        onClick={() => onDeleteAxisValue(value.id, value.label)}
                        className="text-red-400 hover:text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* New Axis Modal */}
      {showNewAxisModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">Créer un axe</h3>
              <button onClick={onCloseNewAxisModal} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Code *</label>
                <input
                  type="text"
                  value={newAxisCode}
                  onChange={(e) => onSetNewAxisCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Nom *</label>
                <input
                  type="text"
                  value={newAxisName}
                  onChange={(e) => onSetNewAxisName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <Button className="w-full bg-brand-600 hover:bg-brand-700" onClick={onCreateAxis}>
                <Plus className="w-4 h-4 mr-2" />
                Créer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Axis Import Modal */}
      {showAxisImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">Importer des valeurs</h3>
              <button
                onClick={onCloseAxisImportModal}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {axisImportError && (
                <div className="bg-red-50 text-red-800 p-3 rounded">{axisImportError}</div>
              )}
              <input
                ref={axisFileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={onAxisFileSelect}
                className="hidden"
              />
              <Button
                className="w-full bg-brand-600 hover:bg-brand-700"
                onClick={() => axisFileInputRef.current?.click()}
                disabled={isImportingAxis}
              >
                {isImportingAxis ? 'Import en cours...' : 'Sélectionner un fichier'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
