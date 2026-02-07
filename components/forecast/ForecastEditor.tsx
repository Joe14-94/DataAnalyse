import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import {
  Edit2,
  Plus,
  ArrowLeft,
  Calendar,
  FileText,
  Trash2,
  X,
  Download,
  Upload
} from 'lucide-react';
import { Forecast, ForecastVersion, ChartOfAccounts, FiscalCalendar } from '../../types';

interface ForecastEditorProps {
  selectedForecastId: string | null;
  setSelectedForecastId: (id: string | null) => void;
  selectedVersionId: string | null;
  setSelectedVersionId: (id: string | null) => void;
  forecasts: Forecast[];
  chartsOfAccounts: ChartOfAccounts[];
  fiscalCalendars: FiscalCalendar[];
  setActiveTab: (tab: any) => void;
  handleAddVersion: () => void;
  setShowNewLineModal: (v: boolean) => void;
  handleDeleteLine: (id: string) => void;
  handleCellEdit: (lineId: string, periodId: string, value: number) => void;
  editingCellId: string | null;
  editingValue: string;
  setEditingValue: (v: string) => void;
  handleCellSave: (lineId: string, periodId: string) => void;
  handleCellCancel: () => void;
  showNewLineModal: boolean;
  accountSearchQuery: string;
  setAccountSearchQuery: (v: string) => void;
  handleAddLine: (code: string) => void;
  generatePeriods: (date: string) => { id: string; name: string }[];
}

export const ForecastEditor: React.FC<ForecastEditorProps> = ({
  selectedForecastId,
  setSelectedForecastId,
  selectedVersionId,
  setSelectedVersionId,
  forecasts,
  chartsOfAccounts,
  fiscalCalendars,
  setActiveTab,
  handleAddVersion,
  setShowNewLineModal,
  handleDeleteLine,
  handleCellEdit,
  editingCellId,
  editingValue,
  setEditingValue,
  handleCellSave,
  handleCellCancel,
  showNewLineModal,
  accountSearchQuery,
  setAccountSearchQuery,
  handleAddLine,
  generatePeriods
}) => {
  const selectedForecast = forecasts.find((f) => f.id === selectedForecastId);
  const selectedVersion = selectedForecast?.versions.find((v) => v.id === selectedVersionId);
  const selectedChart = chartsOfAccounts.find((c) => c.id === selectedForecast?.chartOfAccountsId);
  const selectedCalendar = fiscalCalendars.find((c) => c.id === selectedForecast?.fiscalCalendarId);

  if (!selectedForecastId) {
    return (
      <Card title="Éditeur de forecast" icon={<Edit2 className="w-5 h-5 text-brand-600" />}>
        <div className="text-center py-12 text-slate-500">
          <Edit2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="mb-4">Sélectionnez un forecast dans la liste pour commencer l'édition</p>
          <Button onClick={() => setActiveTab('list')} className="bg-brand-600 hover:bg-brand-700">
            Retour à la liste
          </Button>
        </div>
      </Card>
    );
  }

  const periods = selectedVersion ? generatePeriods(selectedVersion.referenceDate) : [];

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedForecastId(null);
                setSelectedVersionId(null);
                setActiveTab('list');
              }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Retour
            </Button>
            <div>
              <h3 className="text-lg font-bold text-slate-800">{selectedForecast?.name}</h3>
              <div className="flex items-center gap-3 text-sm text-slate-600 mt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {selectedForecast?.fiscalYear}
                </span>
                <span>•</span>
                <span>{selectedChart?.name}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-bold text-slate-700">Version:</span>
          {selectedForecast?.versions.map((version) => (
            <button
              key={version.id}
              onClick={() => setSelectedVersionId(version.id)}
              className={`px-3 py-1 rounded border text-sm font-bold transition-all ${selectedVersionId === version.id ? 'bg-brand-100 text-brand-700 border-brand-300 ring-2 ring-brand-400' : 'bg-gray-100 text-gray-700 border-gray-300'}`}
            >
              {version.name}
            </button>
          ))}
          <Button variant="outline" size="sm" onClick={handleAddVersion}>
            <Plus className="w-4 h-4 mr-1" /> Nouvelle version
          </Button>
        </div>
      </Card>

      {selectedVersion && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-slate-800">Lignes de forecast</h4>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNewLineModal(true)}
                className="text-brand-600 border-brand-200"
              >
                <Plus className="w-4 h-4 mr-2" /> Ajouter ligne
              </Button>
            </div>
          </div>

          {selectedVersion.lines.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p>Aucune ligne de forecast</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-slate-300">
                    <th className="text-left p-2 font-bold text-slate-700 bg-slate-50 sticky left-0">
                      Compte
                    </th>
                    <th className="text-left p-2 font-bold text-slate-700 bg-slate-50">Libellé</th>
                    {periods.map((p) => (
                      <th
                        key={p.id}
                        className="text-right p-2 font-bold text-slate-700 bg-slate-50"
                      >
                        {p.name}
                      </th>
                    ))}
                    <th className="text-right p-2 font-bold text-slate-700 bg-slate-50">Total</th>
                    <th className="text-center p-2 font-bold text-slate-700 bg-slate-50">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {selectedVersion.lines.map((line) => {
                    const total = periods.reduce(
                      (sum, p) => sum + (line.forecastValues[p.id] || 0),
                      0
                    );
                    return (
                      <tr key={line.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-2 font-mono text-xs bg-white sticky left-0">
                          {line.accountCode}
                        </td>
                        <td className="p-2 text-xs">{line.accountLabel}</td>
                        {periods.map((p) => {
                          const cellId = `${line.id}-${p.id}`;
                          const val = line.forecastValues[p.id] || 0;
                          const isEditing = editingCellId === cellId;
                          return (
                            <td key={p.id} className="p-1 text-right">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editingValue}
                                  onChange={(e) => setEditingValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCellSave(line.id, p.id);
                                    else if (e.key === 'Escape') handleCellCancel();
                                  }}
                                  onBlur={() => handleCellSave(line.id, p.id)}
                                  autoFocus
                                  className="w-full px-2 py-1 text-right border border-brand-300 rounded"
                                />
                              ) : (
                                <button
                                  onClick={() => handleCellEdit(line.id, p.id, val)}
                                  className="w-full px-2 py-1 rounded text-right hover:bg-brand-50"
                                >
                                  {val.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                                </button>
                              )}
                            </td>
                          );
                        })}
                        <td className="p-2 text-right font-bold bg-slate-50">
                          {total.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-2 text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteLine(line.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {showNewLineModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
            <div className="p-4 border-b flex justify-between">
              <h3 className="font-bold">Ajouter une ligne</h3>
              <button onClick={() => setShowNewLineModal(false)}>
                <X />
              </button>
            </div>
            <div className="p-4 overflow-y-auto">
              <input
                type="text"
                value={accountSearchQuery}
                onChange={(e) => setAccountSearchQuery(e.target.value)}
                placeholder="Rechercher..."
                className="w-full mb-4 p-2 border rounded"
              />
              {selectedChart?.accounts
                .filter(
                  (a) =>
                    a.canReceiveEntries &&
                    (a.code.includes(accountSearchQuery) || a.label.includes(accountSearchQuery))
                )
                .map((a) => (
                  <button
                    key={a.code}
                    onClick={() => handleAddLine(a.code)}
                    className="w-full text-left p-2 hover:bg-brand-50 rounded border border-transparent hover:border-brand-200"
                  >
                    <div className="font-bold">{a.code}</div>
                    <div className="text-xs">{a.label}</div>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
