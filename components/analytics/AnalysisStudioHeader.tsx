import React from 'react';
import { Settings2, Save, Check, X, FileDown, FileType, Printer, LayoutDashboard, CalendarRange } from 'lucide-react';
import { Button } from '../ui/Button';
import { AnalysisMode } from '../../hooks/useAnalysisStudioLogic';
import { Dataset } from '../../types';
import { formatDateFr } from '../../utils';

interface AnalysisStudioHeaderProps {
    mode: AnalysisMode;
    onSetMode: (mode: AnalysisMode) => void;
    currentDatasetId: string | null;
    datasets: Dataset[];
    onSwitchDataset: (id: string) => void;
    onNavigate: (path: string) => void;
    availableAnalyses: any[];
    onLoadAnalysis: (id: string) => void;
    isSaving: boolean;
    onSetSaving: (saving: boolean) => void;
    analysisName: string;
    onSetAnalysisName: (name: string) => void;
    onSaveAnalysis: () => void;
    showExportMenu: boolean;
    onSetExportMenu: (show: boolean) => void;
    onExport: (format: any, pdfMode?: any) => void;
    onExportToDashboard: () => void;
    selectedBatchId: string;
    onSetBatchId: (id: string) => void;
    batches: any[];
    startDate: string;
    endDate: string;
    onSetDates: (dates: { start?: string, end?: string }) => void;
}

export const AnalysisStudioHeader: React.FC<AnalysisStudioHeaderProps> = ({
    mode, onSetMode,
    currentDatasetId, datasets, onSwitchDataset, onNavigate,
    availableAnalyses, onLoadAnalysis,
    isSaving, onSetSaving, analysisName, onSetAnalysisName, onSaveAnalysis,
    showExportMenu, onSetExportMenu, onExport,
    onExportToDashboard,
    selectedBatchId, onSetBatchId, batches,
    startDate, endDate, onSetDates
}) => {
    return (
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center bg-white p-4 rounded-lg border border-slate-200 shadow-sm shrink-0 gap-4">
            <div className="flex items-center gap-2">
                <Settings2 className="w-6 h-6 text-slate-500" />
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Studio d'Analyse</h2>
                    <div className="mt-1">
                        <select
                            className="appearance-none bg-white border-0 text-slate-500 text-xs font-medium py-0 pr-6 pl-0 focus:outline-none cursor-pointer hover:text-slate-700"
                            value={currentDatasetId || ''}
                            onChange={(e) => {
                                if (e.target.value === '__NEW__') onNavigate('/import');
                                else onSwitchDataset(e.target.value);
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
            </div>

            <div className="flex p-1 bg-slate-100 rounded-lg self-center">
                <button
                    onClick={() => onSetMode('snapshot')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${mode === 'snapshot' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Analyse Instantanée
                </button>
                <button
                    onClick={() => onSetMode('trend')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${mode === 'trend' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Évolution Temporelle
                </button>
            </div>

            <div className="flex items-center gap-2 w-full xl:w-auto">
                <div className="relative">
                    <select
                        className="bg-slate-50 border border-slate-300 text-slate-700 text-sm rounded-md focus:ring-brand-500 focus:border-brand-500 block p-2 pr-8 min-w-[130px]"
                        onChange={(e) => { if (e.target.value) onLoadAnalysis(e.target.value); e.target.value = ""; }}
                        defaultValue=""
                    >
                        <option value="" disabled>Vues sauvegardées...</option>
                        {availableAnalyses.length === 0 && <option disabled>Aucune vue.</option>}
                        {availableAnalyses.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                </div>

                {!isSaving ? (
                    <Button
                        onClick={() => onSetSaving(true)}
                        variant="secondary"
                        size="sm"
                        icon={<Save className="w-5 h-5" />}
                        title="Enregistrer cette vue"
                    />
                ) : (
                    <div className="flex items-center gap-1 animate-in fade-in bg-white border border-brand-300 rounded-md p-0.5">
                        <input type="text" className="p-1.5 text-xs border-none focus:ring-0 w-32 bg-transparent text-slate-900" placeholder="Nom..." value={analysisName} onChange={e => onSetAnalysisName(e.target.value)} autoFocus />
                        <button onClick={onSaveAnalysis} className="p-1 bg-brand-600 text-white rounded hover:bg-brand-700 transition-colors" title="Confirmer l'enregistrement" aria-label="Confirmer l'enregistrement"><Check className="w-3 h-3" /></button>
                        <button onClick={() => onSetSaving(false)} className="p-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-300 transition-colors" title="Annuler" aria-label="Annuler"><X className="w-3 h-3" /></button>
                    </div>
                )}

                <div className="h-6 w-px bg-slate-300 mx-1"></div>

                <div className="relative">
                    <Button
                        onClick={() => onSetExportMenu(!showExportMenu)}
                        variant="secondary"
                        size="sm"
                        icon={<FileDown className="w-5 h-5" />}
                        title="Exporter"
                    />
                    {showExportMenu && (
                        <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1">
                            <div className="px-3 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Format PDF</div>
                            <button onClick={() => onExport('pdf', 'A4')} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 text-slate-700 flex items-center gap-2"><FileType className="w-4 h-4 text-red-500" /> PDF (A4 ajusté)</button>
                            <button onClick={() => onExport('pdf', 'adaptive')} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 text-slate-700 flex items-center gap-2"><Printer className="w-4 h-4 text-red-500" /> PDF (Hauteur adaptative)</button>
                            <div className="border-t border-slate-100 my-1"></div>
                            <div className="px-3 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Format Web & Image</div>
                            <button onClick={() => onExport('html')} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 text-slate-700 flex items-center gap-2"><FileType className="w-4 h-4 text-orange-500" /> Export HTML</button>
                            <button onClick={() => onExport('png')} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 text-slate-700 flex items-center gap-2"><FileType className="w-4 h-4 text-blue-500" /> Image PNG</button>
                            <div className="border-t border-slate-100 my-1"></div>
                            <div className="px-3 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Format Données</div>
                            <button onClick={() => onExport('xlsx')} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 text-slate-700 flex items-center gap-2"><FileType className="w-4 h-4 text-green-600" /> Excel (XLSX)</button>
                        </div>
                    )}
                </div>

                <Button onClick={onExportToDashboard} variant="secondary" size="sm" icon={<LayoutDashboard className="w-5 h-5" />} title="Ajouter au tableau de bord" />

                {mode === 'snapshot' ? (
                    <div className="flex items-center gap-2 w-full xl:w-auto ml-2">
                        <select className="flex-1 sm:flex-none bg-slate-50 border border-slate-300 text-slate-700 text-sm rounded-md focus:ring-brand-500 focus:border-brand-500 block p-2 min-w-[200px]" value={selectedBatchId} onChange={(e) => onSetBatchId(e.target.value)}>
                            {batches.map(b => <option key={b.id} value={b.id}>{formatDateFr(b.date)} ({b.rows.length} lignes)</option>)}
                        </select>
                    </div>
                ) : (
                    <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto p-1 ml-2">
                        <CalendarRange className="w-4 h-4 text-slate-500" />
                        <input type="date" value={startDate} onChange={(e) => onSetDates({ start: e.target.value })} className="text-sm border border-slate-300 rounded p-1.5 bg-slate-50 text-slate-700" />
                        <span className="text-slate-400 text-sm">à</span>
                        <input type="date" value={endDate} onChange={(e) => onSetDates({ end: e.target.value })} className="text-sm border border-slate-300 rounded p-1.5 bg-slate-50 text-slate-700" />
                    </div>
                )}
            </div>
        </div>
    );
};
