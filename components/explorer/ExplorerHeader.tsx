import React from 'react';
import { Table2, History, Filter } from 'lucide-react';
import { formatDateFr } from '../../utils';
import { Dataset, Batch } from '../../types';

interface ExplorerHeaderProps {
  currentDataset: Dataset;
  datasets: Dataset[];
  currentDatasetId: string;
  switchDataset: (id: string) => void;
  batches: Batch[];
  columnFilters: Record<string, string>;
  handleColumnFilterChange: (key: string, value: string) => void;
  processedRowsCount: number;
  totalRowsCount: number;
  activeBatchDate: string | null;
  blendingConfig: any;
  navigate: (path: string) => void;
}

export const ExplorerHeader: React.FC<ExplorerHeaderProps> = ({
  currentDataset,
  datasets,
  currentDatasetId,
  switchDataset,
  batches,
  columnFilters,
  handleColumnFilterChange,
  processedRowsCount,
  totalRowsCount,
  activeBatchDate,
  blendingConfig,
  navigate
}) => {
  const activeBatchFilter = columnFilters['_batchId']
    ? columnFilters['_batchId'].replace(/^=/, '')
    : null;

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 flex-shrink-0">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Table2 className="w-6 h-6 text-brand-600" />
            Données
          </h2>
          <div className="flex items-center gap-2">
            <select
              className="appearance-none bg-white border border-slate-300 text-slate-800 font-bold text-sm rounded-md py-1.5 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
              value={currentDatasetId || ''}
              onChange={(e) => {
                if (e.target.value === '__NEW__') navigate('/import');
                else switchDataset(e.target.value);
              }}
            >
              {datasets.length === 0 && <option value="">Aucun tableau</option>}
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
              <option disabled>──────────</option>
              <option value="__NEW__">+ Nouvelle typologie...</option>
            </select>

            {currentDataset && (
              <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-md border border-slate-200">
                <History className="w-3.5 h-3.5 text-slate-500 ml-1" />
                <select
                  className="bg-transparent border-none text-xs font-bold text-slate-600 focus:ring-0 py-0.5 pl-1 pr-6 cursor-pointer"
                  value={activeBatchFilter || 'all'}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'all') {
                      const newFilters = { ...columnFilters };
                      delete newFilters['_batchId'];
                      // This is a bit tricky since it modifies external state,
                      // but handleColumnFilterChange can handle it if we adjust it.
                      handleColumnFilterChange('_batchId', '');
                    } else {
                      handleColumnFilterChange('_batchId', `=${val}`);
                    }
                  }}
                >
                  <option value="all">Toutes les versions</option>
                  {batches
                    .filter((b) => b.datasetId === currentDataset.id)
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        Import du {formatDateFr(b.date)}
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="text-sm text-slate-500 flex flex-col sm:flex-row sm:items-center gap-2">
          <span>
            {processedRowsCount} ligne(s) (Total : {totalRowsCount})
          </span>
          {activeBatchDate && (
            <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 animate-in fade-in">
              <Filter className="w-3 h-3" /> Source restreinte : Import du{' '}
              {formatDateFr(activeBatchDate)}
            </span>
          )}
          {blendingConfig && (
            <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 animate-in fade-in">
              <Filter className="w-3 h-3" /> Mode Drill-down : Données croisées
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
