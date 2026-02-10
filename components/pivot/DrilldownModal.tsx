import React from 'react';
import { Table2, Download } from 'lucide-react';
import { DataRow, Dataset } from '../../types';
import { formatNumberValue, formatDateFr } from '../../utils';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface DrilldownModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    rows: DataRow[];
    fields: string[];
    dataset?: Dataset | null;
}

export const DrilldownModal: React.FC<DrilldownModalProps> = ({
    isOpen,
    onClose,
    title,
    rows,
    fields,
    dataset
}) => {
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
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            maxWidth="6xl"
            icon={<Table2 className="w-5 h-5" />}
            title={
                <div>
                    <h2 className="font-bold text-txt-main">{title}</h2>
                    <p className="text-xs text-txt-secondary font-normal">{rows.length} ligne{rows.length > 1 ? 's' : ''} de détail</p>
                </div>
            }
            footer={
                <div className="flex justify-between items-center w-full">
                    <div className="text-xs text-txt-muted">
                        Affichage de {rows.length} ligne{rows.length > 1 ? 's' : ''}
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={handleExport}
                            className="text-success-text border-success-border hover:bg-success-bg/50"
                            icon={<Download className="w-4 h-4" />}
                        >
                            Exporter CSV
                        </Button>
                        <Button variant="secondary" onClick={onClose}>
                            Fermer
                        </Button>
                    </div>
                </div>
            }
        >
            <div className="border border-border-default rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-canvas border-b border-border-default z-10">
                        <tr>
                            {fields.map((field, idx) => (
                                <th
                                    key={idx}
                                    className="px-3 py-2 text-left font-semibold text-txt-main whitespace-nowrap"
                                >
                                    {field}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-default">
                        {rows.map((row, rowIdx) => (
                            <tr
                                key={rowIdx}
                                className="hover:bg-brand-50/30 transition-colors"
                            >
                                {fields.map((field, colIdx) => {
                                    const value = row[field];
                                    let displayValue: React.ReactNode;
                                    const config = dataset?.fieldConfigs?.[field];

                                    if (value === null || value === undefined) {
                                        displayValue = '-';
                                    } else if (typeof value === 'boolean') {
                                        displayValue = value ? 'Oui' : 'Non';
                                    } else if (config?.type === 'date') {
                                        displayValue = formatDateFr(value);
                                    } else if (config?.type === 'number' || typeof value === 'number') {
                                        displayValue = formatNumberValue(value, config);
                                    } else {
                                        displayValue = String(value);
                                    }

                                    return (
                                        <td
                                            key={colIdx}
                                            className="px-3 py-2 text-txt-secondary"
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
        </Modal>
    );
};
