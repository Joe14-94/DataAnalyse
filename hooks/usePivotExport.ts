import * as XLSX from 'xlsx';
import {
    exportView, exportPivotToHTML, formatDateLabelForDisplay
} from '../utils';
import {
    Dataset, PivotResult, TemporalComparisonResult, TemporalComparisonConfig,
    PivotMetric, AggregationType, FieldConfig, TemporalComparisonSource
} from '../types';
import { formatPivotOutput } from '../logic/pivotEngine';

interface PivotExportProps {
    primaryDataset: Dataset | null;
    pivotData: PivotResult | null;
    temporalResults: TemporalComparisonResult[];
    temporalColTotals: Record<string, Record<string, number>> | null;
    isTemporalMode: boolean;
    temporalConfig: TemporalComparisonConfig | null;
    metrics: PivotMetric[];
    valField: string;
    aggType: AggregationType;
    rowFields: string[];
    showTotalCol: boolean;
    showVariations: boolean;
    valFormatting: Partial<FieldConfig>;
    datasets: Dataset[];
    companyLogo?: string;
    setShowExportMenu: (show: boolean) => void;
}

export const usePivotExport = (props: PivotExportProps) => {
    const {
        primaryDataset, pivotData, temporalResults, temporalColTotals, isTemporalMode,
        temporalConfig, metrics, valField, aggType, rowFields, showTotalCol,
        showVariations, valFormatting, datasets, companyLogo, setShowExportMenu
    } = props;

    const handleExport = (format: 'pdf' | 'html', mode: 'adaptive' | 'A4' = 'adaptive') => {
        setShowExportMenu(false);

        if (format === 'html') {
            const title = `TCD - ${primaryDataset?.name || 'Analyse'}`;
            const formatOutput = (val: string | number, metric?: PivotMetric) => {
                const field = metric?.field || valField;
                const type = metric?.aggType || aggType;
                return formatPivotOutput(val, field, type, primaryDataset, undefined, datasets, metric?.formatting || valFormatting);
            };

            if (isTemporalMode && (temporalResults?.length > 0)) {
                exportPivotToHTML(temporalResults, rowFields, showTotalCol, title, companyLogo, {
                    isTemporalMode: true,
                    temporalConfig,
                    temporalColTotals,
                    metrics: metrics.length > 0 ? metrics : (valField ? [{ field: valField, aggType }] : []),
                    showVariations,
                    formatOutput,
                    fieldConfigs: primaryDataset?.fieldConfigs
                });
            } else if (pivotData) {
                exportPivotToHTML(pivotData, rowFields, showTotalCol, title, companyLogo, {
                    formatOutput,
                    metrics: metrics.length > 0 ? metrics : (valField ? [{ field: valField, aggType }] : []),
                    fieldConfigs: primaryDataset?.fieldConfigs
                });
            } else {
                alert("Aucune donnée à exporter");
            }
        } else {
            exportView(format, 'pivot-export-container', `TCD - ${primaryDataset?.name || 'Analyse'}`, companyLogo, mode);
        }
    };

    const handleExportSpreadsheet = (format: 'xlsx' | 'csv') => {
        setShowExportMenu(false);

        if (!primaryDataset) {
            alert("Veuillez sélectionner un dataset");
            return;
        }

        if (!isTemporalMode && !pivotData) {
            alert("Aucune donnée à exporter");
            return;
        }

        if (isTemporalMode && (!temporalResults || temporalResults.length === 0)) {
            alert("Aucune donnée à exporter");
            return;
        }

        const exportData: (string | number | boolean | Record<string, any>)[][] = [];
        const activeMetrics = metrics.length > 0 ? metrics : (valField ? [{ field: valField, aggType }] : []);

        if (isTemporalMode && temporalConfig) {
            const headers: string[] = [...rowFields];

            temporalConfig.sources.forEach((s: TemporalComparisonSource) => {
                activeMetrics.forEach(m => {
                    const mLabel = m.label || `${m.field} (${m.aggType})`;
                    headers.push(activeMetrics.length > 1 ? `${s.label} - ${mLabel}` : s.label);
                });
                if (showVariations && s.id !== temporalConfig.referenceSourceId) {
                    activeMetrics.forEach(m => {
                        const mLabel = m.label || `${m.field} (${m.aggType})`;
                        headers.push(activeMetrics.length > 1 ? `Var. ${s.label} - ${mLabel}` : `Var. ${s.label}`);
                    });
                }
            });
            exportData.push(headers);

            temporalResults.forEach(result => {
                const rowData: (string | number | boolean | Record<string, any>)[] = [];
                const keys = result.groupLabel.split('\x1F');
                const isSubtotal = result.isSubtotal;
                const subLevel = result.subtotalLevel || 0;

                rowFields.forEach((field, idx) => {
                    const rawValue = keys[idx] || '';
                    const label = primaryDataset?.fieldConfigs?.[field]?.type === 'date' ? formatDateLabelForDisplay(rawValue) : rawValue;
                    if (isSubtotal) {
                        if (idx === subLevel) rowData.push(`Total ${label}`);
                        else if (idx < subLevel) rowData.push(label);
                        else rowData.push('');
                    } else {
                        rowData.push(label);
                    }
                });

                temporalConfig.sources.forEach((s: TemporalComparisonSource) => {
                    activeMetrics.forEach(m => {
                        const mLabel = m.label || `${m.field} (${m.aggType})`;
                        rowData.push(result.values[s.id]?.[mLabel] ?? '');
                    });
                    if (showVariations && s.id !== temporalConfig.referenceSourceId) {
                        activeMetrics.forEach(m => {
                            const mLabel = m.label || `${m.field} (${m.aggType})`;
                            const delta = result.deltas[s.id]?.[mLabel];
                            if (temporalConfig.deltaFormat === 'percentage') {
                                rowData.push(delta ? `${delta.percentage.toFixed(1)}%` : '');
                            } else {
                                rowData.push(delta?.value ?? '');
                            }
                        });
                    }
                });
                exportData.push(rowData);
            });

            if (temporalColTotals) {
                const totalsRow: (string | number | boolean | Record<string, any>)[] = ['TOTAL'];
                for (let i = 1; i < rowFields.length; i++) totalsRow.push('');

                temporalConfig.sources.forEach((s: TemporalComparisonSource) => {
                    activeMetrics.forEach(m => {
                        const mLabel = m.label || `${m.field} (${m.aggType})`;
                        totalsRow.push(temporalColTotals[s.id]?.[mLabel] ?? '');
                    });
                    if (showVariations && s.id !== temporalConfig.referenceSourceId) {
                        activeMetrics.forEach(() => totalsRow.push(''));
                    }
                });
                exportData.push(totalsRow);
            }
        } else if (pivotData) {
            const headers: string[] = [...rowFields];
            pivotData.colHeaders.forEach(header => headers.push(header));
            if (showTotalCol) headers.push('Total');
            exportData.push(headers);

            pivotData.displayRows.forEach(row => {
                const rowData: (string | number | boolean | Record<string, any>)[] = [];
                rowFields.forEach((field, index) => {
                    if (index < row.keys.length) {
                        const indent = row.type === 'subtotal' && index === row.keys.length - 1
                            ? '  '.repeat(row.level || 0)
                            : '';
                        const rawValue = row.keys[index] || '';
                        const label = primaryDataset?.fieldConfigs?.[field]?.type === 'date' ? formatDateLabelForDisplay(rawValue) : rawValue;
                        rowData.push(indent + label);
                    } else {
                        rowData.push('');
                    }
                });

                pivotData.colHeaders.forEach(colHeader => {
                    rowData.push(row.metrics[colHeader] ?? '');
                });

                if (showTotalCol) {
                    rowData.push(row.rowTotal ?? '');
                }
                exportData.push(rowData);
            });

            if (pivotData.colTotals) {
                const totalsRow: (string | number | boolean | Record<string, any>)[] = ['Total'];
                for (let i = 1; i < rowFields.length; i++) totalsRow.push('');
                pivotData.colHeaders.forEach(colHeader => totalsRow.push(pivotData.colTotals[colHeader] ?? ''));
                if (showTotalCol && pivotData.grandTotal !== undefined) totalsRow.push(pivotData.grandTotal);
                exportData.push(totalsRow);
            }
        }

        if (format === 'csv') {
            const csvContent = exportData.map(row =>
                row.map(cell => {
                    const str = String(cell);
                    if (str.includes(';') || str.includes('\n') || str.includes('"')) {
                        return `"${str.replace(/"/g, '""')}"`;
                    }
                    return str;
                }).join(';')
            ).join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `TCD_${primaryDataset.name}_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            const ws = XLSX.utils.aoa_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'TCD');
            XLSX.writeFile(wb, `TCD_${primaryDataset.name}_${new Date().toISOString().split('T')[0]}.xlsx`);
        }
    };

    return { handleExport, handleExportSpreadsheet };
};
