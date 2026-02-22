import React, { useMemo } from 'react';
import { X, ExternalLink, Database } from 'lucide-react';
import { DashboardWidget, DataRow } from '../../types';
import { useNavigate } from 'react-router-dom';

interface DrillThroughDrawerProps {
  widget: DashboardWidget;
  rows: DataRow[];
  onClose: () => void;
}

export const DrillThroughDrawer: React.FC<DrillThroughDrawerProps> = ({ widget, rows, onClose }) => {
  const navigate = useNavigate();
  const { dimension, valueField, filterField, filterValue } = widget.config;

  // Fields to display: show all non-id fields, max 8 columns
  const displayFields = useMemo(() => {
    if (rows.length === 0) return [];
    const allFields = Object.keys(rows[0]).filter(k => k !== 'id');
    return allFields.slice(0, 8);
  }, [rows]);

  const handleOpenInExplorer = () => {
    // Navigate to data explorer — user can apply filters there
    navigate('/data');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/30" onClick={onClose} />

      {/* Drawer */}
      <div className="w-full max-w-3xl bg-white h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Database className="w-5 h-5 text-brand-600" />
              Détail — {widget.title}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {rows.length} ligne{rows.length !== 1 ? 's' : ''} correspondante{rows.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenInExplorer}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-lg transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Ouvrir dans Données
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter info */}
        {(dimension || filterField) && (
          <div className="px-6 py-2 bg-slate-50 border-b border-slate-200 flex-shrink-0">
            <p className="text-xs text-slate-600">
              {dimension && <span className="mr-3">Dimension : <strong>{dimension}</strong></span>}
              {filterField && filterValue && <span>Filtre : <strong>{filterField} = {filterValue}</strong></span>}
            </p>
          </div>
        )}

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {rows.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm">
              Aucune donnée correspondante
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  {displayFields.map(field => (
                    <th key={field} className="text-left px-3 py-2 font-semibold text-slate-600 border-b border-slate-200 whitespace-nowrap">
                      {field}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 500).map((row, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    {displayFields.map(field => (
                      <td key={field} className="px-3 py-1.5 text-slate-700 border-b border-slate-100 whitespace-nowrap max-w-[200px] truncate">
                        {String(row[field] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {rows.length > 500 && (
          <div className="px-6 py-2 border-t border-slate-200 text-xs text-slate-500 flex-shrink-0">
            Affichage des 500 premières lignes sur {rows.length}
          </div>
        )}
      </div>
    </div>
  );
};
