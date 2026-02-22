import React from 'react';
import {
    AlertTriangle, Check, Edit2, Wand2, Eraser, CaseUpper, CaseLower, CopyX,
    Database, FileSpreadsheet, FileText, Zap, Trash2, ChevronLeft, ChevronRight,
    ArrowRight, RotateCcw
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { RawImportData, FieldConfig, Dataset } from '../../types';
import { DeleteConfirm } from '../../hooks/useImportLogic';

interface ImportMappingStepProps {
    rawData: RawImportData;
    datasets: Dataset[];
    mapping: Record<number, string | 'ignore'>;
    autoMappedIndices: number[];
    selectedColIndex: number | null;
    setSelectedColIndex: (idx: number | null) => void;
    previewPage: number;
    setPreviewPage: (p: number | ((prev: number) => number)) => void;
    rowsPerPage: number;
    setRowsPerPage: (n: number) => void;
    deleteConfirm: DeleteConfirm;
    setDeleteConfirm: (v: DeleteConfirm) => void;
    tempFieldConfigs: Record<string, FieldConfig>;
    targetDatasetId: string | 'NEW';
    setTargetDatasetId: (id: string | 'NEW') => void;
    newDatasetName: string;
    setNewDatasetName: (name: string) => void;
    detectedDatasetId: string | null;
    updateMode: 'merge' | 'overwrite';
    setUpdateMode: (m: 'merge' | 'overwrite') => void;
    date: string;
    setDate: (d: string) => void;
    paginatedPreviewRows: (string | number | boolean)[][];
    previewTotalPages: number;
    handleCleanColumn: (action: 'trim' | 'upper' | 'lower' | 'proper' | 'empty_zero') => void;
    handleRemoveDuplicates: () => void;
    handleRemoveRow: () => void;
    handleRemoveHeader: () => void;
    handleMappingChange: (colIndex: number, value: string) => void;
    handleConfigChange: (fieldName: string, key: keyof FieldConfig, value: string) => void;
    handleFinalizeImport: () => void;
    handleBack: () => void;
}

export const ImportMappingStep: React.FC<ImportMappingStepProps> = ({
    rawData, datasets, mapping, autoMappedIndices, selectedColIndex, setSelectedColIndex,
    previewPage, setPreviewPage, rowsPerPage, setRowsPerPage,
    deleteConfirm, setDeleteConfirm, tempFieldConfigs,
    targetDatasetId, setTargetDatasetId, newDatasetName, setNewDatasetName,
    detectedDatasetId, updateMode, setUpdateMode, date, setDate,
    paginatedPreviewRows, previewTotalPages,
    handleCleanColumn, handleRemoveDuplicates, handleRemoveRow, handleRemoveHeader,
    handleMappingChange, handleConfigChange, handleFinalizeImport, handleBack,
}) => {
    const selectedDS = datasets.find(d => d.id === targetDatasetId);
    const availableFields = selectedDS ? selectedDS.fields : [];
    const mappedFields = Object.values(mapping).filter(m => m !== 'ignore');
    const newFields = mappedFields.filter(f => !availableFields.includes(f));
    const missingFields = availableFields.filter(f => !mappedFields.includes(f));
    const hasStructureChanges = selectedDS && (newFields.length > 0 || missingFields.length > 0);

    return (
        <div className="space-y-6 animate-in slide-in-from-right duration-300 relative">

            {/* Delete confirmation modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-red-100 rounded-full text-red-600">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800">
                                {deleteConfirm.type === 'header' ? "Supprimer l'en-tête ?" : "Supprimer cette ligne ?"}
                            </h3>
                        </div>
                        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                            {deleteConfirm.type === 'header'
                                ? "La ligne d'en-tête actuelle sera supprimée. La première ligne de données deviendra le nouvel en-tête des colonnes."
                                : "Cette ligne sera exclue de l'import. Cette action est irréversible pour cette session d'import."}
                        </p>
                        <div className="flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Annuler</Button>
                            <Button variant="danger" onClick={deleteConfirm.type === 'header' ? handleRemoveHeader : handleRemoveRow}>
                                Confirmer la suppression
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Dataset destination */}
            <Card className="p-6 border-brand-200 bg-brand-50">
                <div className="flex justify-between items-start">
                    <h3 className="text-lg font-bold text-brand-900 mb-4 flex items-center gap-2">
                        <Database className="w-5 h-5" />
                        Destination de l'import
                    </h3>
                    <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-md shadow-sm border border-brand-100">
                        <label htmlFor="step2-date" className="text-xs font-bold text-brand-700">Date d'extraction :</label>
                        <input
                            type="date"
                            id="step2-date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="text-sm border-none bg-transparent focus:ring-0 text-slate-700 font-medium p-0 w-32"
                        />
                        <Edit2 className="w-3 h-3 text-brand-400" />
                    </div>
                </div>

                <div className="space-y-4">
                    {detectedDatasetId && (
                        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-100 p-2 rounded border border-green-200">
                            <Check className="w-4 h-4" />
                            Typologie reconnue : <strong>{datasets.find(d => d.id === detectedDatasetId)?.name}</strong>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className={`relative flex items-start p-4 cursor-pointer rounded-lg border-2 transition-all ${targetDatasetId === 'NEW' ? 'border-brand-500 bg-white shadow-md' : 'border-slate-200 bg-slate-50 hover:bg-white'}`}>
                            <input
                                type="radio" name="targetDS" value="NEW"
                                checked={targetDatasetId === 'NEW'}
                                onChange={() => setTargetDatasetId('NEW')}
                                className="mt-1 h-4 w-4 text-brand-600 border-gray-300 bg-white focus:ring-brand-500"
                            />
                            <div className="ml-3 w-full">
                                <span className="block text-sm font-medium text-slate-900">Créer une nouvelle typologie</span>
                                {targetDatasetId === 'NEW' && (
                                    <input
                                        type="text"
                                        placeholder="Nom du tableau (ex: Ventes 2025)"
                                        className="mt-2 block w-full rounded-md border-slate-300 bg-white shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2"
                                        value={newDatasetName}
                                        onChange={(e) => setNewDatasetName(e.target.value)}
                                        autoFocus
                                    />
                                )}
                            </div>
                        </label>

                        {datasets.length > 0 && (
                            <label className={`relative flex items-start p-4 cursor-pointer rounded-lg border-2 transition-all ${targetDatasetId !== 'NEW' ? 'border-brand-500 bg-white shadow-md' : 'border-slate-200 bg-slate-50 hover:bg-white'}`}>
                                <input
                                    type="radio" name="targetDS" value="EXISTING_FALLBACK"
                                    checked={targetDatasetId !== 'NEW'}
                                    onChange={() => setTargetDatasetId(detectedDatasetId || datasets[0].id)}
                                    className="mt-1 h-4 w-4 text-brand-600 border-gray-300 bg-white focus:ring-brand-500"
                                />
                                <div className="ml-3 w-full">
                                    <span className="block text-sm font-medium text-slate-900">Ajouter à une typologie existante</span>
                                    <select
                                        className="mt-2 block w-full rounded-md border-slate-300 shadow-sm bg-white focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2 disabled:opacity-50"
                                        value={targetDatasetId !== 'NEW' ? targetDatasetId : ''}
                                        onChange={(e) => setTargetDatasetId(e.target.value)}
                                        disabled={targetDatasetId === 'NEW'}
                                    >
                                        {datasets.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </div>
                            </label>
                        )}
                    </div>
                </div>
            </Card>

            {/* Cleaning toolbar */}
            <div className={`transition-all duration-300 overflow-hidden ${selectedColIndex !== null ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="bg-white border border-purple-200 rounded-lg p-4 shadow-sm bg-gradient-to-r from-white to-purple-50">
                    <div className="flex items-center gap-2 mb-2 text-purple-800 text-xs font-bold uppercase tracking-wider">
                        <Wand2 className="w-4 h-4" />
                        Outils de nettoyage : {selectedColIndex !== null ? rawData.headers[selectedColIndex] : ''}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {([
                            ['trim',       <Eraser className="w-3 h-3" key="e" />,    'Trim (Espaces)'],
                            ['upper',      <CaseUpper className="w-3 h-3" key="u" />, 'MAJUSCULE'],
                            ['lower',      <CaseLower className="w-3 h-3" key="l" />, 'minuscule'],
                            ['proper',     <CaseUpper className="w-3 h-3" key="p" />, 'Nom Propre'],
                        ] as ['trim' | 'upper' | 'lower' | 'proper', React.ReactNode, string][]).map(([action, icon, label]) => (
                            <button key={action} onClick={() => handleCleanColumn(action)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 hover:border-purple-300 hover:bg-purple-50 rounded text-xs text-slate-700 transition-colors shadow-sm">
                                {icon} {label}
                            </button>
                        ))}
                        <div className="w-px bg-slate-300 mx-1" />
                        <button onClick={handleRemoveDuplicates}
                            className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 hover:border-red-300 hover:bg-red-50 hover:text-red-700 rounded text-xs text-slate-700 transition-colors shadow-sm">
                            <CopyX className="w-3 h-3" /> Dédupliquer
                        </button>
                        <button onClick={() => handleCleanColumn('empty_zero')}
                            className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 hover:border-purple-300 hover:bg-purple-50 rounded text-xs text-slate-700 transition-colors shadow-sm">
                            Vide → 0
                        </button>
                    </div>
                </div>
            </div>

            {/* Structure change alert */}
            {targetDatasetId !== 'NEW' && hasStructureChanges && (
                <Card className="p-4 border-amber-300 bg-amber-50">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-6 h-6 text-amber-600 mt-0.5" />
                        <div className="flex-1">
                            <h4 className="text-base font-bold text-amber-800">Évolution de la structure détectée</h4>
                            <p className="text-sm text-amber-700 mt-1">
                                Le fichier importé comporte des différences avec "<strong>{selectedDS?.name}</strong>".
                            </p>
                            <div className="mt-4 pt-4 border-t border-amber-200">
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="updateMode" value="merge" checked={updateMode === 'merge'} onChange={() => setUpdateMode('merge')} className="text-amber-600 bg-white focus:ring-amber-500" />
                                        <span className="text-sm font-bold text-slate-800">Mettre à jour (fusionner)</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="updateMode" value="overwrite" checked={updateMode === 'overwrite'} onChange={() => setUpdateMode('overwrite')} className="text-amber-600 bg-white focus:ring-amber-500" />
                                        <span className="text-sm font-bold text-slate-800">Écraser et remplacer</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            )}

            {/* Mapping table */}
            <Card className="overflow-hidden border-slate-200 shadow-md">
                <div className="px-4 py-2 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                        <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <FileSpreadsheet className="w-4 h-4" /> Prévisualisation
                        </h4>
                        <span className="bg-brand-100 text-brand-700 text-xs font-bold px-2 py-0.5 rounded-full">
                            {rawData.totalRows.toLocaleString()} lignes
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-500">Lignes par page :</span>
                        <select
                            className="bg-white border border-slate-300 rounded px-2 py-1 text-slate-700 text-xs focus:ring-brand-500 focus:border-brand-500"
                            value={rowsPerPage}
                            onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPreviewPage(1); }}
                        >
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                        <div className="w-px h-4 bg-slate-300 mx-2" />
                        <button
                            onClick={() => setPreviewPage(p => Math.max(1, p - 1))}
                            disabled={previewPage === 1}
                            className="p-1 rounded hover:bg-slate-200 disabled:opacity-50 transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="font-mono text-slate-600 min-w-[100px] text-center">
                            {((previewPage - 1) * rowsPerPage) + 1} - {Math.min(previewPage * rowsPerPage, rawData.totalRows)} / {rawData.totalRows}
                        </span>
                        <button
                            onClick={() => setPreviewPage(p => Math.min(previewTotalPages, p + 1))}
                            disabled={previewPage === previewTotalPages}
                            className="p-1 rounded hover:bg-slate-200 disabled:opacity-50 transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200" style={{ contentVisibility: 'auto' }}>
                        <thead className="bg-slate-100">
                            <tr>
                                <th className="px-2 py-3 w-10 border-b-2 border-slate-200 text-center">
                                    <button
                                        onClick={() => setDeleteConfirm({ type: 'header' })}
                                        className="text-slate-400 hover:text-red-600 transition-colors p-1 rounded hover:bg-red-50"
                                        title="Supprimer cette ligne d'en-tête"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </th>
                                {rawData.headers.map((header, idx) => {
                                    const mappedVal = mapping[idx];
                                    const isMapped = mappedVal && mappedVal !== 'ignore';
                                    const isAutoDetected = autoMappedIndices.includes(idx);
                                    const isSelected = selectedColIndex === idx;

                                    return (
                                        <th
                                            key={idx}
                                            className={`px-4 py-3 text-left w-64 min-w-[220px] border-b-2 transition-colors cursor-pointer relative group
                                                ${isSelected ? 'bg-purple-50 border-purple-500' : (isMapped ? 'border-brand-500 bg-brand-50' : 'border-transparent hover:bg-slate-200')}
                                            `}
                                            onClick={() => setSelectedColIndex(idx)}
                                        >
                                            <div className="mb-2 flex items-center justify-between gap-1">
                                                <div className="flex items-center gap-1 text-xs font-bold text-slate-500 tracking-wider">
                                                    {targetDatasetId === 'NEW' ? <FileText className="w-3 h-3" /> : <FileSpreadsheet className="w-3 h-3" />}
                                                    Source
                                                </div>
                                                {isAutoDetected && isMapped && (
                                                    <div className="flex items-center text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                                                        <Zap className="w-3 h-3 mr-1" fill="currentColor" />
                                                        Auto
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <div className="text-sm font-bold text-slate-900 mb-3 truncate" title={header}>{header}</div>
                                                {isSelected && <Wand2 className="w-4 h-4 text-purple-600 mb-3 animate-pulse" />}
                                            </div>

                                            <div className="mb-3" onClick={e => e.stopPropagation()}>
                                                <div className="text-xs font-medium text-slate-500 mb-1">Destination :</div>
                                                {targetDatasetId === 'NEW' ? (
                                                    <input
                                                        type="text"
                                                        className="block w-full rounded-md border-slate-300 text-sm bg-white text-slate-900 focus:border-brand-500 focus:ring-brand-500 shadow-sm p-1.5"
                                                        value={mapping[idx] || header}
                                                        onChange={(e) => handleMappingChange(idx, e.target.value)}
                                                    />
                                                ) : (
                                                    <select
                                                        className={`block w-full rounded-md border-slate-300 text-sm focus:border-brand-500 focus:ring-brand-500 shadow-sm p-1.5 ${isMapped ? 'bg-white font-medium text-brand-700 border-brand-300' : 'bg-slate-50 text-slate-500'}`}
                                                        value={mapping[idx] || 'ignore'}
                                                        onChange={(e) => handleMappingChange(idx, e.target.value)}
                                                    >
                                                        <option value="ignore">Ignorer</option>
                                                        <optgroup label="Champs actuels">
                                                            {availableFields.map(f => <option key={f} value={f}>{f}</option>)}
                                                        </optgroup>
                                                        <optgroup label="Nouveau champ">
                                                            <option value={header} className="text-brand-600 font-bold">+ Ajouter "{header}"</option>
                                                        </optgroup>
                                                    </select>
                                                )}
                                            </div>

                                            {isMapped && (
                                                <div className="bg-white border border-slate-200 rounded p-2 space-y-2 shadow-sm" onClick={e => e.stopPropagation()}>
                                                    <div className="flex gap-1">
                                                        <select
                                                            className="block w-full text-xs border-slate-200 rounded bg-slate-50 py-1 focus:ring-1 focus:ring-brand-500"
                                                            value={tempFieldConfigs[mappedVal]?.type || 'text'}
                                                            onChange={(e) => handleConfigChange(mappedVal, 'type', e.target.value)}
                                                        >
                                                            <option value="text">Texte</option>
                                                            <option value="number">Nombre</option>
                                                            <option value="date">Date</option>
                                                            <option value="boolean">Oui/Non</option>
                                                        </select>
                                                    </div>
                                                    {tempFieldConfigs[mappedVal]?.type === 'number' && (
                                                        <div className="space-y-1 animate-in fade-in duration-200">
                                                            <div className="flex gap-1">
                                                                <input
                                                                    type="text"
                                                                    className="block w-1/2 text-xs border-slate-200 rounded bg-white p-1 placeholder-slate-300 focus:ring-1 focus:ring-brand-500"
                                                                    placeholder="Unité (€)"
                                                                    value={tempFieldConfigs[mappedVal]?.unit || ''}
                                                                    onChange={(e) => handleConfigChange(mappedVal, 'unit', e.target.value)}
                                                                />
                                                                <input
                                                                    type="number" min="0" max="5"
                                                                    className="block w-1/2 text-xs border-slate-200 rounded bg-white p-1 placeholder-slate-300 focus:ring-1 focus:ring-brand-500"
                                                                    placeholder="Décim."
                                                                    value={tempFieldConfigs[mappedVal]?.decimalPlaces !== undefined ? tempFieldConfigs[mappedVal]?.decimalPlaces : ''}
                                                                    onChange={(e) => handleConfigChange(mappedVal, 'decimalPlaces', e.target.value)}
                                                                    title="Nombre de décimales"
                                                                />
                                                            </div>
                                                            <select
                                                                className="block w-full text-xs border-slate-200 rounded bg-slate-50 py-1 focus:ring-1 focus:ring-brand-500 text-slate-600"
                                                                value={tempFieldConfigs[mappedVal]?.displayScale || 'none'}
                                                                onChange={(e) => handleConfigChange(mappedVal, 'displayScale', e.target.value)}
                                                                title="Échelle d'affichage"
                                                            >
                                                                <option value="none">Normal (1:1)</option>
                                                                <option value="thousands">Milliers (k)</option>
                                                                <option value="millions">Millions (M)</option>
                                                                <option value="billions">Milliards (Md)</option>
                                                            </select>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {paginatedPreviewRows.map((row, rowIdx) => (
                                <tr key={rowIdx} className="group hover:bg-red-50/50">
                                    <td className="px-2 py-2 text-center border-r border-slate-100">
                                        <button
                                            onClick={() => setDeleteConfirm({ type: 'row', index: rowIdx })}
                                            className="text-slate-300 hover:text-red-600 transition-colors p-1"
                                            title="Supprimer cette ligne de l'import"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                    {row.map((cell, cellIdx) => (
                                        <td key={cellIdx} className={`px-4 py-2 text-sm ${mapping[cellIdx] !== 'ignore' ? 'text-slate-900 bg-slate-50/50' : 'text-slate-400'}`}>
                                            {String(cell)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={handleBack}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Recommencer
                </Button>
                <Button onClick={handleFinalizeImport}>
                    <ArrowRight className="w-4 h-4 mr-2" />
                    {updateMode === 'overwrite' ? 'Écraser et importer' : "Valider l'import"}
                </Button>
            </div>
        </div>
    );
};
