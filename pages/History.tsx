
import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Trash2, Filter, Download, Database, AlertCircle, History as HistoryIcon } from 'lucide-react';
import { formatDateFr } from '../utils';
import { useNavigate } from 'react-router-dom';

export const History: React.FC = () => {
  const { batches, deleteBatch, currentDataset, datasets, currentDatasetId, switchDataset } = useData();
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const navigate = useNavigate();

  // Default to latest batch if available
  useEffect(() => {
    if (!selectedBatchId && batches.length > 0) {
      setSelectedBatchId(batches[batches.length - 1].id);
    }
  }, [batches, selectedBatchId]);

  const currentBatch = useMemo(() => batches.find(b => b.id === selectedBatchId), [batches, selectedBatchId]);
  const batchDataset = useMemo(() => datasets.find(d => d.id === currentBatch?.datasetId), [datasets, currentBatch]);
  const fields = batchDataset ? batchDataset.fields : [];

  const handleExportCSV = () => {
    if (!currentBatch || !batchDataset) return;
    const headers = ['Id', ...fields];
    const csvContent = [
      headers.join(';'),
      ...currentBatch.rows.map(row => {
        const cols = [row.id];
        fields.forEach(f => {
          let val = row[f] !== undefined ? row[f] : '';

          // Conversion en string pour traitement
          let stringVal = String(val);

          // SECURITE OWASP : Prévention CSV Injection
          if (/^[=+\-@]/.test(stringVal)) {
            stringVal = `'${stringVal}`;
          }

          if (stringVal.includes(';') || stringVal.includes('\n') || stringVal.includes('"')) {
            stringVal = `"${stringVal.replace(/"/g, '""')}"`;
          }

          cols.push(stringVal);
        });
        return cols.join(';');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    // Safer download
    const link = document.createElement('a');
    link.href = url;
    link.download = `export_${batchDataset.name}_${currentBatch.date}.csv`;
    link.style.display = 'none';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  };


  return (
    <div className="h-full overflow-y-auto p-4 md:p-8 custom-scrollbar">
      <div className="space-y-6 pb-12"> {/* Removed max-w-7xl */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <HistoryIcon className="w-6 h-6 text-slate-500" />
              Historique
            </h2>
            {/* DATASET SELECTOR */}
            <div className="mt-2">
              <select
                className="appearance-none bg-white border border-slate-300 text-slate-800 font-bold text-sm rounded-md py-1.5 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
                value={currentDatasetId || ''}
                onChange={(e) => {
                  if (e.target.value === '__NEW__') navigate('/import');
                  else switchDataset(e.target.value);
                }}
              >
                {datasets.length === 0 && <option value="">Aucun tableau</option>}
                {datasets.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
                <option disabled>──────────</option>
                <option value="__NEW__">+ Nouvelle typologie...</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white p-1 rounded-md border border-slate-200 shadow-sm">
            <Filter className="w-4 h-4 text-slate-500 ml-2" />
            <select
              className="block w-full pl-2 pr-8 py-1 text-sm border-0 focus:ring-0 text-slate-700 bg-white focus:outline-none"
              style={{ backgroundColor: '#ffffff', color: '#334155' }}
              value={selectedBatchId}
              onChange={(e) => {
                 const bid = e.target.value;
                 setSelectedBatchId(bid);
                 const batch = batches.find(b => b.id === bid);
                 if (batch && batch.datasetId !== currentDatasetId) switchDataset(batch.datasetId);
              }}
            >
              {batches.length === 0 && <option value="">Aucun historique</option>}

              {/* Priorité au dataset actuel */}
              {currentDatasetId && batches.some(b => b.datasetId === currentDatasetId) && (
                 <optgroup label={`Versions : ${datasets.find(d => d.id === currentDatasetId)?.name}`}>
                   {batches
                     .filter(b => b.datasetId === currentDatasetId)
                     .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                     .map(b => (
                       <option key={b.id} value={b.id}>
                         Import du {formatDateFr(b.date)} ({b.rows.length} lignes)
                       </option>
                     ))
                   }
                 </optgroup>
              )}

              {/* Autres datasets */}
              {batches.some(b => b.datasetId !== currentDatasetId) && (
                 <optgroup label="Autres typologies">
                   {batches
                     .filter(b => b.datasetId !== currentDatasetId)
                     .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                     .map(b => {
                       const ds = datasets.find(d => d.id === b.datasetId);
                       return (
                         <option key={b.id} value={b.id}>
                           {ds ? `[${ds.name}] ` : ''}Import du {formatDateFr(b.date)}
                         </option>
                       );
                     })
                   }
                 </optgroup>
              )}
            </select>
          </div>
        </div>

        {currentBatch ? (
          <Card>
            <div className="flex justify-between items-center border-b border-slate-100 p-4 bg-slate-50">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                <div className="text-sm text-slate-500">
                  Typologie: <span className="font-semibold text-brand-600">{batchDataset?.name}</span>
                </div>
                <div className="text-sm text-slate-500">
                  Date: <span className="font-semibold text-slate-900">{formatDateFr(currentBatch.date)}</span>
                </div>
                <div className="text-sm text-slate-500">
                  Lignes: <span className="font-semibold text-slate-900">{currentBatch.rows.length}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExportCSV}>
                  <Download className="w-4 h-4 mr-2" />
                  CSV
                </Button>
                <Button variant="danger" size="sm" onClick={() => {
                  if (window.confirm('Supprimer cet import ?')) deleteBatch(currentBatch.id);
                }}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Id</th>
                    {fields.map(f => (
                      <th key={f} className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">
                        {f}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {currentBatch.rows.map((row, idx) => (
                    <tr key={`${row.id}-${idx}`} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-400 text-xs">{row.id}</td>
                      {fields.map(f => {
                        const val = row[f];
                        let displayVal: React.ReactNode = val;
                        if (typeof val === 'boolean') {
                          displayVal = val ? (
                            <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">Oui</span>
                          ) : (
                            <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-500 text-xs">Non</span>
                          );
                        }
                        return (
                          <td key={f} className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                            {displayVal !== undefined ? displayVal : <span className="text-slate-300">-</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <div className="text-center py-20 bg-white rounded-lg border border-dashed border-slate-300">
            <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Aucun import pour ce tableau.</p>
            <p className="text-sm text-slate-400">Allez dans "Importation" pour ajouter des données.</p>
          </div>
        )}
      </div>
    </div>
  );
};
