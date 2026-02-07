import React from 'react';
import { CalendarRange, X, Filter, FilterX, MousePointerClick } from 'lucide-react';
import { Badge } from '../ui/Badge';

interface DashboardFiltersProps {
  globalDateRange: { start: string; end: string };
  setGlobalDateRange: (range: { start: string; end: string }) => void;
  dashboardFilters: Record<string, any>;
  setDashboardFilter: (field: string, value: any) => void;
  clearDashboardFilters: () => void;
}

export const DashboardFilters: React.FC<DashboardFiltersProps> = ({
  globalDateRange,
  setGlobalDateRange,
  dashboardFilters,
  setDashboardFilter,
  clearDashboardFilters
}) => {
  return (
    <div className="flex flex-col lg:flex-row gap-4 bg-white p-3 rounded-lg border border-slate-200 shadow-sm items-start lg:items-center">
      {/* DATE RANGE PICKER (GLOBAL) */}
      <div className="flex items-center gap-2 border-r border-slate-100 pr-4 mr-2">
        <div className="bg-brand-50 p-2 rounded text-brand-600">
          <CalendarRange className="w-4 h-4" />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <label className="text-xs font-bold text-slate-400 uppercase">Début</label>
            <input
              type="date"
              className="text-sm border border-slate-200 rounded p-1 text-slate-700 bg-white focus:ring-brand-500 focus:border-brand-500"
              value={globalDateRange.start}
              onChange={(e) => setGlobalDateRange({ ...globalDateRange, start: e.target.value })}
            />
          </div>
          <span className="text-slate-300 mt-3">-</span>
          <div className="flex flex-col">
            <label className="text-xs font-bold text-slate-400 uppercase">Fin</label>
            <input
              type="date"
              className="text-sm border border-slate-200 rounded p-1 text-slate-700 bg-white focus:ring-brand-500 focus:border-brand-500"
              value={globalDateRange.end}
              onChange={(e) => setGlobalDateRange({ ...globalDateRange, end: e.target.value })}
            />
          </div>
          {(globalDateRange.start || globalDateRange.end) && (
            <button
              onClick={() => setGlobalDateRange({ start: '', end: '' })}
              className="mt-3 p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-red-500 transition-colors"
              title="Effacer la période"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* DRILL DOWN FILTERS */}
      {Object.keys(dashboardFilters).length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="text-xs font-bold text-brand-700 flex items-center mr-2">
            <Filter className="w-3 h-3 mr-1" /> Filtres actifs :
          </div>
          {Object.entries(dashboardFilters).map(([field, value]) => (
            <Badge
              key={field}
              variant="brand"
              className="bg-brand-50 border-brand-200 shadow-sm pl-2 pr-1 py-1 flex items-center gap-1"
            >
              <span className="text-brand-400">{field}:</span>
              <span className="font-bold text-brand-900">{String(value)}</span>
              <button
                onClick={() => setDashboardFilter(field, null)}
                className="ml-1 hover:bg-brand-100 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
          <button
            onClick={clearDashboardFilters}
            className="ml-auto text-xs text-slate-400 hover:text-red-600 font-medium flex items-center px-2 py-1 hover:bg-red-50 rounded transition-colors"
          >
            <FilterX className="w-3 h-3 mr-1" /> Tout effacer
          </button>
        </div>
      ) : (
        <div className="text-xs text-slate-400 italic flex items-center gap-1.5">
          <MousePointerClick className="w-3 h-3" /> Cliquez sur un graphique pour filtrer le tableau
          de bord
        </div>
      )}
    </div>
  );
};
