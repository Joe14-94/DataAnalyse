import React from 'react';
import {
  Search,
  X,
  Palette,
  FunctionSquare,
  Link as LinkIcon,
  GitCommit,
  Filter,
  Columns,
  FilterX,
  Trash2,
  Download,
  Undo2,
  Redo2
} from 'lucide-react';
import { Button } from '../ui/Button';

interface ExplorerToolbarProps {
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  isFormatDrawerOpen: boolean;
  setIsFormatDrawerOpen: (v: boolean) => void;
  isCalcModalOpen: boolean;
  setIsCalcModalOpen: (v: boolean) => void;
  isVlookupDrawerOpen: boolean;
  setIsVlookupDrawerOpen: (v: boolean) => void;
  isEditMode: boolean;
  setIsEditMode: (v: boolean) => void;
  showFilters: boolean;
  setShowFilters: (v: boolean) => void;
  isColumnDrawerOpen: boolean;
  setIsColumnDrawerOpen: (v: boolean) => void;
  showColumnBorders: boolean;
  setShowColumnBorders: (v: boolean) => void;
  columnFilters: Record<string, string>;
  clearFilters: () => void;
  activeBatchFilter: string | null;
  deleteBatch: (id: string) => void;
  handleExportFullCSV: () => void;
  processedRowsCount: number;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export const ExplorerToolbar: React.FC<ExplorerToolbarProps> = ({
  searchTerm,
  setSearchTerm,
  isFormatDrawerOpen,
  setIsFormatDrawerOpen,
  isCalcModalOpen,
  setIsCalcModalOpen,
  isVlookupDrawerOpen,
  setIsVlookupDrawerOpen,
  isEditMode,
  setIsEditMode,
  showFilters,
  setShowFilters,
  isColumnDrawerOpen,
  setIsColumnDrawerOpen,
  showColumnBorders,
  setShowColumnBorders,
  columnFilters,
  clearFilters,
  activeBatchFilter,
  deleteBatch,
  handleExportFullCSV,
  processedRowsCount,
  undo,
  redo,
  canUndo,
  canRedo
}) => {
  return (
    <div className="flex flex-wrap gap-3 w-full md:w-auto">
      <div className="relative flex-1 md:w-64 group">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-slate-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-9 py-2 border border-slate-300 rounded-md bg-white placeholder-slate-400 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 sm:text-sm transition-all"
          placeholder="Recherche globale..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={undo}
          disabled={!canUndo}
          title="Annuler (Ctrl+Z)"
          className="px-2"
        >
          <Undo2 className="w-4 h-4" />
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={redo}
          disabled={!canRedo}
          title="Rétablir (Ctrl+Y)"
          className="px-2"
        >
          <Redo2 className="w-4 h-4" />
        </Button>
      </div>

      <Button
        variant={isFormatDrawerOpen ? 'primary' : 'secondary'}
        onClick={() => setIsFormatDrawerOpen(!isFormatDrawerOpen)}
        title="Formatage Conditionnel"
      >
        <Palette className="w-4 h-4 md:mr-2" />
        <span className="hidden md:inline">Conditionnel</span>
      </Button>
      <Button
        variant={isCalcModalOpen ? 'primary' : 'secondary'}
        onClick={() => setIsCalcModalOpen(!isCalcModalOpen)}
        title="Calculs et Formules"
      >
        <FunctionSquare className="w-4 h-4 md:mr-2" />
        <span className="hidden md:inline">Calculs</span>
      </Button>
      <Button
        variant={isVlookupDrawerOpen ? 'primary' : 'secondary'}
        onClick={() => setIsVlookupDrawerOpen(!isVlookupDrawerOpen)}
        title="Enrichissement RECHERCHEV"
      >
        <LinkIcon className="w-4 h-4 md:mr-2" />
        <span className="hidden md:inline">RECHERCHEV</span>
      </Button>
      <Button
        variant={isEditMode ? 'primary' : 'outline'}
        onClick={() => setIsEditMode(!isEditMode)}
        className={isEditMode ? 'bg-brand-600 text-white' : ''}
        title="Mode Édition"
      >
        <GitCommit className="w-4 h-4 md:mr-2" />
        <span className="hidden md:inline">Mode Édition</span>
      </Button>
      <Button
        variant={showFilters ? 'primary' : 'outline'}
        onClick={() => setShowFilters(!showFilters)}
        title="Filtres de colonnes"
      >
        <Filter className="w-4 h-4 md:mr-2" />
        <span className="hidden md:inline">Filtres</span>
      </Button>
      <Button
        variant={isColumnDrawerOpen ? 'primary' : 'secondary'}
        onClick={() => setIsColumnDrawerOpen(!isColumnDrawerOpen)}
        title="Gestion des colonnes"
      >
        <Columns className="w-4 h-4 md:mr-2" />
        <span className="hidden md:inline">Colonnes</span>
      </Button>
      <Button
        variant={showColumnBorders ? 'primary' : 'outline'}
        onClick={() => setShowColumnBorders(!showColumnBorders)}
        title="Bordures des colonnes"
      >
        <Columns className="w-4 h-4 md:mr-2" />
        <span className="hidden md:inline">Bordures</span>
      </Button>

      {(Object.keys(columnFilters).length > 0 || searchTerm) && (
        <Button
          variant="danger"
          onClick={clearFilters}
          className="px-3"
          title="Effacer tous les filtres"
        >
          <FilterX className="w-4 h-4" />
        </Button>
      )}

      {activeBatchFilter && (
        <Button
          variant="danger"
          onClick={() => {
            if (
              window.confirm(
                'Êtes-vous sûr de vouloir supprimer définitivement cet import ? Cette action est irréversible.'
              )
            ) {
              deleteBatch(activeBatchFilter);
              clearFilters();
            }
          }}
          className="bg-red-100 text-red-700 border-red-200 hover:bg-red-200"
        >
          <Trash2 className="w-4 h-4 md:mr-2" />
          <span className="hidden md:inline">Supprimer l'import</span>
        </Button>
      )}

      <Button variant="outline" onClick={handleExportFullCSV} disabled={processedRowsCount === 0}>
        <Download className="w-4 h-4 md:mr-2" />
        <span className="hidden md:inline">Export</span>
      </Button>
    </div>
  );
};
