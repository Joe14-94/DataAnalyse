import React from 'react';
import { Table2, History, Filter, Search, X, Palette, FunctionSquare, Link as LinkIcon, GitCommit, Columns, FilterX, Trash2, Download } from 'lucide-react';
import { Button } from '../ui/Button';
import { formatDateFr } from '../../utils';
import { Dataset, ImportBatch, BlendingConfig } from '../../types/dataset';

interface DataExplorerHeaderProps {
    currentDataset: Dataset | null;
    datasets: Dataset[];
    batches: ImportBatch[];
    currentDatasetId: string | null;
    switchDataset: (id: string) => void;
    processedRowsCount: number;
    totalRowsCount: number;
    activeBatchDate: string | null;
    blendingConfig: BlendingConfig | null;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    isFormatDrawerOpen: boolean;
    setFormatDrawerOpen: (open: boolean) => void;
    isCalcModalOpen: boolean;
    setCalcModalOpen: (open: boolean) => void;
    isVlookupDrawerOpen: boolean;
    setVlookupDrawerOpen: (open: boolean) => void;
    isEditMode: boolean;
    setEditMode: (open: boolean) => void;
    showFilters: boolean;
    setShowFilters: (show: boolean) => void;
    isColumnDrawerOpen: boolean;
    setColumnDrawerOpen: (open: boolean) => void;
    showColumnBorders: boolean;
    setShowColumnBorders: (show: boolean) => void;
    hasFilters: boolean;
    clearFilters: () => void;
    activeBatchFilter: string | null;
    handleColumnFilterChange: (key: string, value: string) => void;
    deleteBatch: (id: string) => void;
    handleExportFullCSV: () => void;
    navigate: (path: string) => void;
}

export const DataExplorerHeader: React.FC<DataExplorerHeaderProps> = ({
    currentDataset, datasets, batches, currentDatasetId, switchDataset,
    processedRowsCount, totalRowsCount, activeBatchDate, blendingConfig,
    searchTerm, setSearchTerm, isFormatDrawerOpen, setFormatDrawerOpen,
    isCalcModalOpen, setCalcModalOpen, isVlookupDrawerOpen, setVlookupDrawerOpen,
    isEditMode, setEditMode, showFilters, setShowFilters,
    isColumnDrawerOpen, setColumnDrawerOpen, showColumnBorders, setShowColumnBorders,
    hasFilters, clearFilters, activeBatchFilter, handleColumnFilterChange,
    deleteBatch, handleExportFullCSV, navigate
}) => {
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
                            {datasets.map(d => (
                                <option key={d.id} value={d.id}>{d.name}</option>
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
                                            handleColumnFilterChange('_batchId', '');
                                        } else {
                                            handleColumnFilterChange('_batchId', `=${val}`);
                                        }
                                    }}
                                >
                                    <option value="all">Toutes les versions</option>
                                    {batches
                                        .filter(b => b.datasetId === currentDataset.id)
                                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                        .map(b => (
                                            <option key={b.id} value={b.id}>
                                                Import du {formatDateFr(b.date)}
                                            </option>
                                        ))
                                    }
                                </select>
                            </div>
                        )}
                    </div>
                </div>

                <div className="text-sm text-slate-500 flex flex-col sm:flex-row sm:items-center gap-2">
                    <span>{processedRowsCount} ligne(s) (Total : {totalRowsCount})</span>
                    {activeBatchDate && (
                        <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 animate-in fade-in">
                            <Filter className="w-3 h-3" /> Source restreinte : Import du {formatDateFr(activeBatchDate)}
                        </span>
                    )}
                    {blendingConfig && (
                        <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 animate-in fade-in">
                            <LinkIcon className="w-3 h-3" /> Mode Drill-down : Données croisées
                        </span>
                    )}
                </div>
            </div>

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
                            title="Effacer la recherche"
                            aria-label="Effacer la recherche"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                <Button variant={isFormatDrawerOpen ? "primary" : "secondary"} onClick={() => setFormatDrawerOpen(!isFormatDrawerOpen)} className="whitespace-nowrap" title="Formatage Conditionnel"><Palette className="w-4 h-4 md:mr-2" /><span className="hidden md:inline">Conditionnel</span></Button>
                <Button variant={isCalcModalOpen ? "primary" : "secondary"} onClick={() => setCalcModalOpen(!isCalcModalOpen)} className="whitespace-nowrap" title="Calculs et Formules"><FunctionSquare className="w-4 h-4 md:mr-2" /><span className="hidden md:inline">Calculs</span></Button>
                <Button variant={isVlookupDrawerOpen ? "primary" : "secondary"} onClick={() => setVlookupDrawerOpen(!isVlookupDrawerOpen)} className="whitespace-nowrap" title="Enrichissement RECHERCHEV"><LinkIcon className="w-4 h-4 md:mr-2" /><span className="hidden md:inline">RECHERCHEV</span></Button>
                <Button variant={isEditMode ? "primary" : "outline"} onClick={() => setEditMode(!isEditMode)} className={`whitespace-nowrap ${isEditMode ? 'bg-brand-600 text-white' : ''}`} title="Mode Édition"><GitCommit className="w-4 h-4 md:mr-2" /><span className="hidden md:inline">Mode Édition</span></Button>
                <Button variant={showFilters ? "primary" : "outline"} onClick={() => setShowFilters(!showFilters)} className="whitespace-nowrap" title="Filtres de colonnes"><Filter className="w-4 h-4 md:mr-2" /><span className="hidden md:inline">Filtres</span></Button>
                <Button variant={isColumnDrawerOpen ? "primary" : "secondary"} onClick={() => setColumnDrawerOpen(!isColumnDrawerOpen)} className="whitespace-nowrap" title="Gestion des colonnes"><Columns className="w-4 h-4 md:mr-2" /><span className="hidden md:inline">Colonnes</span></Button>
                <Button variant={showColumnBorders ? "primary" : "outline"} onClick={() => setShowColumnBorders(!showColumnBorders)} className="whitespace-nowrap" title="Bordures des colonnes"><Columns className="w-4 h-4 md:mr-2" /><span className="hidden md:inline">Bordures</span></Button>

                {hasFilters && (
                    <Button variant="danger" onClick={clearFilters} className="whitespace-nowrap px-3" title="Effacer tous les filtres"><FilterX className="w-4 h-4" /></Button>
                )}

                {activeBatchFilter && (
                    <Button variant="danger" onClick={() => { if (window.confirm("Êtes-vous sûr de vouloir supprimer définitivement cet import ? Cette action est irréversible.")) { deleteBatch(activeBatchFilter); clearFilters(); } }} className="whitespace-nowrap bg-red-100 text-red-700 border-red-200 hover:bg-red-200"><Trash2 className="w-4 h-4 md:mr-2" /><span className="hidden md:inline">Supprimer l'import</span></Button>
                )}

                <Button variant="outline" onClick={handleExportFullCSV} disabled={processedRowsCount === 0}><Download className="w-4 h-4 md:mr-2" /><span className="hidden md:inline">Export</span></Button>
            </div>
        </div>
    );
};
