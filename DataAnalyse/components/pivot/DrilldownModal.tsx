import React, { useMemo } from 'react';
import { X, Table2, Download } from 'lucide-react';
import { DataRow } from '../../types';
import { formatDateFr, formatNumberValue } from '../../utils';

interface DrilldownModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    rows: DataRow[];
    fields: string[];
}

export const DrilldownModal: React.FC<DrilldownModalProps> = ({
    isOpen,
    onClose,
    title,
    rows,
    fields
}) => {
    if (!isOpen) return null;

    const handleExport = () => {
        // Export to CSV
        const headers = fields.join(',');
        const csvRows = rows.map(row =>
            fields.map(field => {
                const value = row[field];
                const stringValue = value === undefined || value === null ? '' : String(value);
                // Escape quotes and wrap in quotes if contains comma
                return stringValue.includes(',') ? `"${stringValue.replace(/"/g, '""')}"` : stringValue;
            }).join(',')
        );
        const csv = [headers, ...csvRows].join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `drilldown_${Date.now()}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Table2 className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="font-bold text-slate-800">{title}</h2>
                            <p className="text-xs text-slate-500">{rows.length} ligne{rows.length > 1 ? 's' : ''} de détail</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleExport}
                            className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                        >
                            <Download className="w-4 h-4" />
                            Exporter CSV
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5 text-slate-500" />
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                            <tr>
                                {fields.map((field, idx) => (
                                    <th
                                        key={idx}
                                        className="px-3 py-2 text-left font-semibold text-slate-700 whitespace-nowrap"
                                    >
                                        {field}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, rowIdx) => (
                                <tr
                                    key={rowIdx}
                                    className="border-b border-slate-100 hover:bg-blue-50/50 transition-colors"
                                >
                                    {fields.map((field, colIdx) => {
                                        const value = row[field];
                                        let displayValue: string;

                                        if (value === null || value === undefined) {
                                            displayValue = '-';
                                        } else if (typeof value === 'boolean') {
                                            displayValue = value ? 'Oui' : 'Non';
                                        } else if (typeof value === 'number') {
                                            displayValue = formatNumberValue(value);
                                        } else {
                                            displayValue = String(value);
                                        }

                                        return (
                                            <td
                                                key={colIdx}
                                                className="px-3 py-2 text-slate-700"
                                            >
                                                {displayValue}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
                    <div className="text-xs text-slate-500">
                        Affichage de {rows.length} ligne{rows.length > 1 ? 's' : ''}
                    </div>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors text-sm font-medium"
                    >
                        Fermer
                    </button>
                </div>
            </div>
        </div>
    );
};
