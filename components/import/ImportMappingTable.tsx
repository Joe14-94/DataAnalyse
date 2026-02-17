import React from 'react';
import {
    Trash2, FileSpreadsheet, FileText, Zap, Wand2,
    ChevronLeft, ChevronRight, AlertTriangle
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { RawImportData, FieldConfig, Dataset } from '../../types';

interface ImportMappingTableProps {
    rawData: RawImportData;
    mapping: Record<number, string | 'ignore'>;
    autoMappedIndices: number[];
    selectedColIndex: number | null;
    setSelectedColIndex: (idx: number | null) => void;
    rowsPerPage: number;
    setRowsPerPage: (rows: number) => void;
    previewPage: number;
    setPreviewPage: (page: number | ((p: number) => number)) => void;
    previewTotalPages: number;
    paginatedPreviewRows: any[][];
    targetDatasetId: string | 'NEW';
    datasets: Dataset[];
    tempFieldConfigs: Record<string, FieldConfig>;
    onMappingChange: (idx: number, value: string) => void;
    onConfigChange: (fieldName: string, key: keyof FieldConfig, value: string) => void;
    onDeleteHeader: () => void;
    onDeleteRow: (idx: number) => void;
}

export const ImportMappingTable: React.FC<ImportMappingTableProps> = ({
    rawData,
    mapping,
    autoMappedIndices,
    selectedColIndex,
    setSelectedColIndex,
    rowsPerPage,
    setRowsPerPage,
    previewPage,
    setPreviewPage,
    previewTotalPages,
    paginatedPreviewRows,
    targetDatasetId,
    datasets,
    tempFieldConfigs,
    onMappingChange,
    onConfigChange,
    onDeleteHeader,
    onDeleteRow
}) => {
    const selectedDS = datasets.find(d => d.id === targetDatasetId);
    const availableFields = selectedDS ? selectedDS.fields : [];

    return (
        <Card className="overflow-hidden border-slate-200 shadow-md">
            {/* Header Controls */}
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

                    <div className="w-px h-4 bg-slate-300 mx-2"></div>

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
                                    onClick={onDeleteHeader}
                                    className="text-slate-400 hover:text-red-600 transition-colors p-1 rounded hover:bg-red-50"
                                    title="Supprimer cette ligne d'en-tête (utilise la ligne suivante)"
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
                                                    onChange={(e) => onMappingChange(idx, e.target.value)}
                                                />
                                            ) : (
                                                <select
                                                    className={`block w-full rounded-md border-slate-300 text-sm focus:border-brand-500 focus:ring-brand-500 shadow-sm p-1.5 ${isMapped ? 'bg-white font-medium text-brand-700 border-brand-300' : 'bg-slate-50 text-slate-500'}`}
                                                    value={mapping[idx] || 'ignore'}
                                                    onChange={(e) => onMappingChange(idx, e.target.value)}
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
                                                        onChange={(e) => onConfigChange(mappedVal, 'type', e.target.value)}
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
                                                                onChange={(e) => onConfigChange(mappedVal, 'unit', e.target.value)}
                                                            />
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max="5"
                                                                className="block w-1/2 text-xs border-slate-200 rounded bg-white p-1 placeholder-slate-300 focus:ring-1 focus:ring-brand-500"
                                                                placeholder="Décim."
                                                                value={tempFieldConfigs[mappedVal]?.decimalPlaces !== undefined ? tempFieldConfigs[mappedVal]?.decimalPlaces : ''}
                                                                onChange={(e) => onConfigChange(mappedVal, 'decimalPlaces', e.target.value)}
                                                                title="Nombre de décimales"
                                                            />
                                                        </div>

                                                        <select
                                                            className="block w-full text-xs border-slate-200 rounded bg-slate-50 py-1 focus:ring-1 focus:ring-brand-500 text-slate-600"
                                                            value={tempFieldConfigs[mappedVal]?.displayScale || 'none'}
                                                            onChange={(e) => onConfigChange(mappedVal, 'displayScale', e.target.value)}
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
                                        onClick={() => onDeleteRow(rowIdx)}
                                        className="text-slate-300 hover:text-red-600 transition-colors p-1"
                                        title="Supprimer cette ligne de l'import"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                                {row.map((cell, cellIdx) => (
                                    <td key={cellIdx} className={`px-4 py-2 text-sm ${mapping[cellIdx] !== 'ignore' ? 'text-slate-900 bg-slate-50/50' : 'text-slate-400'}`}>
                                        {cell}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
};
