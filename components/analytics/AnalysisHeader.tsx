import React from 'react';
import {
  LayoutDashboard,
  Save,
  FileDown,
  ExternalLink,
  CalendarRange,
  Calculator
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Dataset } from '../../types';

interface AnalysisHeaderProps {
  currentDataset: Dataset;
  datasets: Dataset[];
  switchDataset: (id: string) => void;
  navigate: (path: string) => void;
  handleSaveAnalysis: () => void;
  setShowExportMenu: (v: boolean) => void;
  handleOpenInDashboard: () => void;
}

export const AnalysisHeader: React.FC<AnalysisHeaderProps> = ({
  currentDataset,
  datasets,
  switchDataset,
  navigate,
  handleSaveAnalysis,
  setShowExportMenu,
  handleOpenInDashboard
}) => {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 flex-shrink-0 bg-white p-4 border-b border-slate-200">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-100 rounded-lg">
            <LayoutDashboard className="w-5 h-5 text-brand-600" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">
              Studio d'Analyse
            </h2>
            <div className="flex items-center gap-2">
              <select
                className="bg-transparent border-none p-0 text-sm font-bold text-slate-500 focus:ring-0 cursor-pointer hover:text-brand-600 transition-colors"
                value={currentDataset.id}
                onChange={(e) => switchDataset(e.target.value)}
              >
                {datasets.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 w-full md:w-auto">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleSaveAnalysis}
          className="font-bold uppercase tracking-wider text-[10px]"
        >
          <Save className="w-3.5 h-3.5 mr-1.5" /> Sauvegarder
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowExportMenu(true)}
          className="font-bold uppercase tracking-wider text-[10px]"
        >
          <FileDown className="w-3.5 h-3.5 mr-1.5" /> Exporter
        </Button>
        <div className="w-px h-8 bg-slate-200 mx-1 hidden md:block" />
        <Button
          variant="primary"
          size="sm"
          onClick={handleOpenInDashboard}
          className="font-bold uppercase tracking-wider text-[10px] bg-brand-600 shadow-md"
        >
          <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Vers Dashboard
        </Button>
      </div>
    </div>
  );
};
