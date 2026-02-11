import React from 'react';
import { VirtualItem } from '@tanstack/react-virtual';
import { formatDateLabelForDisplay } from '../../utils';
import { PivotMetric, FieldConfig, PivotResult, TemporalComparisonResult, TemporalComparisonConfig, Dataset, PivotRow } from '../../types';

interface PivotTableRowProps {
    isTemporalMode: boolean;
    rowFields: string[];
    columnWidths: Record<string, number>;
    rowFieldLeftPositions: number[];
    getCellFormatting: (rowKeys: string[], col: string, value: string | number | undefined, metricLabel: string, rowType: 'data' | 'subtotal' | 'grandTotal') => any;
    primaryDataset: Dataset | null;
    handleDrilldown: (rowKeys: string[], colLabel: string, value: number | string | undefined, metricLabel: string) => void;
    handleTemporalDrilldown: (result: TemporalComparisonResult, sourceId: string, metricLabel: string) => void;
    virtualCols: VirtualItem[];
    allDataColumns: { key: string; width: number; isDiff?: boolean }[];
    metricInfoCache: Map<string, any>;
    temporalConfig: TemporalComparisonConfig | null;
    effectiveMetrics: PivotMetric[];
    metricLabelMap: Map<string, PivotMetric>;
    formatOutput: (val: string | number | undefined | null, metric?: PivotMetric, isDelta?: boolean) => string;
    isSelectionMode: boolean;
    isItemSelected: (rowKeys: string[], colLabel: string) => boolean;
    showTotalCol: boolean;
    handleKeyDown: (e: React.KeyboardEvent, handler: () => void) => void;
    // For standard mode
    pivotRow?: PivotRow;
    // For temporal mode
    temporalResult?: TemporalComparisonResult;
    index: number;
    measureElement?: (el: HTMLElement | null) => void;
}

export const PivotTableRow: React.FC<PivotTableRowProps> = React.memo((props) => {
    const {
        isTemporalMode, rowFields, columnWidths, rowFieldLeftPositions, getCellFormatting,
        primaryDataset, handleDrilldown, handleTemporalDrilldown, virtualCols, allDataColumns,
        metricInfoCache, temporalConfig, effectiveMetrics, metricLabelMap, formatOutput,
        isSelectionMode, isItemSelected, showTotalCol, handleKeyDown,
        pivotRow, temporalResult, measureElement
    } = props;

    if (isTemporalMode && temporalResult) {
        const result = temporalResult;
        const isSubtotal = result.isSubtotal || false;
        const subtotalLevel = result.subtotalLevel || 0;
        const labels = result.groupLabel.split('\x1F');

        return (
            <tr className={isSubtotal ? `bg-slate-50 font-bold border-t border-slate-200` : 'hover:bg-brand-50/30'}>
                {Array.from({ length: rowFields.length }, (_, gIdx) => {
                    if (isSubtotal && gIdx > subtotalLevel) return null;
                    const field = rowFields[gIdx];
                    const width = columnWidths[`group_${field}`] || 150;
                    const left = rowFieldLeftPositions[gIdx];
                    const rowStyle = getCellFormatting(result.groupLabel.split('\x1F'), '', undefined, '', isSubtotal ? 'subtotal' : 'data');
                    const onRowCellClick = () => handleDrilldown(result.groupLabel.split('\x1F').slice(0, gIdx + 1), '', undefined, '');
                    return (
                        <td key={gIdx} className={`px-2 py-1 text-xs border-r border-slate-200 whitespace-nowrap overflow-hidden truncate sticky left-0 z-20 bg-white cursor-pointer hover:bg-brand-50 transition-colors focus:ring-2 focus:ring-brand-500 focus:outline-none focus:z-30 ${isSubtotal ? 'font-bold bg-slate-50' : ''}`}
                            role="button"
                            tabIndex={0}
                            style={isSubtotal && gIdx === subtotalLevel ? { ...rowStyle, left: `${left}px` } : { ...rowStyle, width, minWidth: width, maxWidth: width, left: `${left}px` }}
                            colSpan={isSubtotal && gIdx === subtotalLevel ? rowFields.length - subtotalLevel : 1}
                            onClick={onRowCellClick}
                            onKeyDown={(e) => handleKeyDown(e, onRowCellClick)}>
                            {(!isSubtotal || gIdx <= subtotalLevel) ? (gIdx === subtotalLevel && isSubtotal ? `Total ${primaryDataset?.fieldConfigs?.[rowFields[gIdx]]?.type === 'date' ? formatDateLabelForDisplay(labels[gIdx]) : labels[gIdx]}` : (primaryDataset?.fieldConfigs?.[rowFields[gIdx]]?.type === 'date' ? formatDateLabelForDisplay(labels[gIdx]) : labels[gIdx])) : ''}
                        </td>
                    );
                })}
                {virtualCols[0]?.start > 0 && <td />}
                {virtualCols.map((vCol: VirtualItem) => {
                    const col = allDataColumns[vCol.index];
                    const colKey = col.key;
                    if (col.isDiff) {
                        const baseKey = colKey.replace('_DELTA', '');
                        const sourceId = baseKey.split('_')[0];
                        const mLabel = metricInfoCache.get(baseKey)?.metricLabel || '';
                        const delta = result.deltas[sourceId]?.[mLabel] || { value: 0, percentage: 0 };
                        return (
                            <td key={colKey} className={`px-2 py-1 text-xs text-right border-r tabular-nums font-bold overflow-hidden truncate ${delta.value > 0 ? 'text-green-600' : delta.value < 0 ? 'text-red-600' : 'text-slate-400'}`} style={{ width: vCol.size, minWidth: vCol.size, maxWidth: vCol.size }}>
                                {temporalConfig?.deltaFormat === 'percentage' ? (delta.percentage !== 0 ? `${delta.percentage > 0 ? '+' : ''}${Number(delta.percentage || 0).toFixed(1)}%` : '-') : (delta.value !== 0 ? formatOutput(delta.value, metricLabelMap.get(mLabel), true) : '-')}
                            </td>
                        );
                    }
                    const { metricLabel, metric } = metricInfoCache.get(colKey) || {};
                    const sourceId = colKey.split('_')[0];
                    const value = result.values[sourceId]?.[metricLabel || ''] || 0;
                    const customStyle = getCellFormatting(result.groupLabel.split('\x1F'), colKey, value, metricLabel || '', isSubtotal ? 'subtotal' : 'data');
                    const displayColLabel = effectiveMetrics.length > 1 ? `${temporalConfig?.sources.find(s=>s.id===sourceId)?.label || sourceId} - ${metricLabel}` : (temporalConfig?.sources.find(s=>s.id===sourceId)?.label || sourceId);
                    const isSelected = isSelectionMode && isItemSelected(result.groupLabel.split('\x1F'), displayColLabel);
                    const onDataCellClick = () => { if (isSelectionMode) handleDrilldown(result.groupLabel.split('\x1F'), displayColLabel, value, metricLabel || ''); else if (!isSubtotal) handleTemporalDrilldown(result, sourceId, metricLabel || ''); };

                    return (
                        <td key={colKey} className={`px-2 py-1 text-xs text-right border-r border-slate-200 tabular-nums cursor-pointer overflow-hidden truncate focus:ring-2 focus:ring-brand-500 focus:outline-none focus:z-30 ${sourceId === temporalConfig?.referenceSourceId ? 'bg-blue-50/30' : ''} ${isSelectionMode ? (isSelected ? 'bg-brand-100 ring-1 ring-brand-400' : 'hover:bg-brand-50 hover:ring-1 hover:ring-brand-300') : 'hover:bg-blue-100'}`}
                            role="button"
                            tabIndex={0}
                            style={{ width: vCol.size, minWidth: vCol.size, maxWidth: vCol.size, ...customStyle }}
                            onClick={onDataCellClick}
                            onKeyDown={(e) => handleKeyDown(e, onDataCellClick)}>
                            {formatOutput(value, metric || effectiveMetrics[0])}
                        </td>
                    );
                })}
            </tr>
        );
    } else if (pivotRow) {
        const row = pivotRow;
        return (
            <tr ref={measureElement} className={`${row.type === 'subtotal' ? 'bg-slate-50 font-bold' : 'hover:bg-brand-50/30'}`}>
                {(rowFields || []).map((field, cIdx) => {
                    const width = columnWidths[`row_${field}`] || 150;
                    const left = rowFieldLeftPositions[cIdx];
                    const headerStyle = getCellFormatting(row.keys, '', undefined, '', row.type);
                    if (row.type === 'subtotal') {
                        if (cIdx < row.level) return <td key={cIdx} className="px-2 py-1 text-xs text-slate-500 border-r border-slate-200 bg-slate-50 overflow-hidden truncate sticky left-0 z-20" style={{ width, minWidth: width, maxWidth: width, left: `${left}px`, ...headerStyle }}>{primaryDataset?.fieldConfigs?.[rowFields[cIdx]]?.type === 'date' ? formatDateLabelForDisplay(row.keys[cIdx]) : row.keys[cIdx]}</td>;
                        if (cIdx === row.level) return <td key={cIdx} colSpan={rowFields.length - cIdx} className="px-2 py-1 text-xs text-slate-700 border-r border-slate-200 font-bold italic text-right overflow-hidden truncate sticky left-0 z-20 bg-slate-50" style={{ left: `${left}px`, ...headerStyle }}>{row.label?.startsWith('Total ') && primaryDataset?.fieldConfigs?.[rowFields[row.level]]?.type === 'date' ? `Total ${formatDateLabelForDisplay(row.label.substring(6))}` : row.label}</td>;
                        return null;
                    }
                    const onRowCellClick = () => handleDrilldown(row.keys.slice(0, cIdx + 1), '', undefined, '');
                    return <td key={cIdx} className="px-2 py-1 text-xs text-slate-700 border-r border-slate-200 whitespace-nowrap overflow-hidden truncate sticky left-0 z-20 bg-white cursor-pointer hover:bg-brand-50 transition-colors focus:ring-2 focus:ring-brand-500 focus:outline-none focus:z-30"
                        role="button"
                        tabIndex={0}
                        style={{ width, minWidth: width, maxWidth: width, left: `${left}px`, ...headerStyle }}
                        onClick={onRowCellClick}
                        onKeyDown={(e) => handleKeyDown(e, onRowCellClick)}>{primaryDataset?.fieldConfigs?.[rowFields[cIdx]]?.type === 'date' ? formatDateLabelForDisplay(row.keys[cIdx]) : row.keys[cIdx]}</td>;
                })}
                {virtualCols[0]?.start > 0 && <td />}
                {virtualCols.map((vCol: VirtualItem) => {
                    const colKey = allDataColumns[vCol.index].key;
                    const val = row.metrics[colKey];
                    const { colLabel, metricLabel, metric, isDiff, isPct } = metricInfoCache.get(colKey) || {};
                    const customStyle = getCellFormatting(row.keys, colKey, val, metricLabel || '', row.type);
                    let formatted = formatOutput(val, metric, isDiff);
                    let cellClass = "text-slate-600";
                    if (isDiff) {
                        if (Number(val) > 0) {
                            if (!formatted.startsWith('+')) formatted = `+${formatted}`;
                            cellClass = "text-green-600 font-bold";
                        }
                        else if (Number(val) < 0) { cellClass = "text-red-600 font-bold"; }
                        else cellClass = "text-slate-400";
                    } else if (isPct) {
                        if (val === 0 || val === undefined) formatted = '-';
                        else { formatted = `${Number(val).toFixed(1)}%`; if (Number(val) > 0) cellClass = "text-green-600 font-bold"; else if (Number(val) < 0) cellClass = "text-red-600 font-bold"; }
                    }
                    const isSelected = isSelectionMode && isItemSelected(row.keys, colLabel || colKey);
                    const onDataCellClick = () => handleDrilldown(row.keys, colLabel || colKey, val as string | number | undefined, metricLabel || '');
                    return <td key={colKey} className={`px-2 py-1 text-xs text-right border-r border-slate-200 tabular-nums cursor-pointer transition-all overflow-hidden truncate focus:ring-2 focus:ring-brand-500 focus:outline-none focus:z-30 ${cellClass} ${isDiff || isPct ? 'bg-brand-50/20' : ''} ${isSelectionMode ? (isSelected ? 'bg-brand-100 ring-1 ring-brand-400' : 'hover:bg-brand-50 hover:ring-1 hover:ring-brand-300') : 'hover:bg-brand-100'}`}
                        role="button"
                        tabIndex={0}
                        style={{ width: vCol.size, minWidth: vCol.size, maxWidth: vCol.size, ...customStyle }}
                        onClick={onDataCellClick}
                        onKeyDown={(e) => handleKeyDown(e, onDataCellClick)}>{formatted}</td>;
                })}
                {showTotalCol && effectiveMetrics.length > 0 && (
                    <td className={`px-2 py-1 text-right border-l border-slate-200 cursor-pointer transition-all focus:ring-2 focus:ring-brand-500 focus:outline-none focus:z-30 ${isSelectionMode ? (isItemSelected(row.keys, 'Total') ? 'bg-blue-100 ring-1 ring-blue-400' : 'bg-slate-50 hover:bg-blue-50 hover:ring-1 hover:ring-blue-300') : 'bg-slate-50 hover:bg-blue-100'}`}
                        role="button"
                        tabIndex={0}
                        style={{ width: columnWidths['Grand Total'] || 150, minWidth: 150, maxWidth: 150, ...getCellFormatting(row.keys, 'Total', typeof row.rowTotal === 'object' ? (Object.values(row.rowTotal)[0] as any) : row.rowTotal, '', row.type) }}
                        onClick={() => { const value = typeof row.rowTotal === 'object' ? (Object.values(row.rowTotal)[0] as any) : row.rowTotal; handleDrilldown(row.keys, 'Total', value, ''); }}
                        onKeyDown={(e) => handleKeyDown(e, () => { const value = typeof row.rowTotal === 'object' ? (Object.values(row.rowTotal)[0] as any) : row.rowTotal; handleDrilldown(row.keys, 'Total', value, ''); })}>
                        {typeof row.rowTotal === 'object' ? <div className="flex flex-col gap-0.5">{Object.entries(row.rowTotal as Record<string, any>).map(([label, v], idx) => { const metric = metricLabelMap.get(label); const metricStyle = getCellFormatting(row.keys, 'Total', v, label, row.type); return <div key={idx} className="text-xs whitespace-nowrap" style={metricStyle}><span className="text-slate-400 font-medium mr-1">{label}:</span><span className="font-bold text-slate-800">{formatOutput(v, metric)}</span></div>; })}</div> : <span className="text-xs font-bold text-slate-800">{formatOutput(row.rowTotal as any, effectiveMetrics[0])}</span>}
                    </td>
                )}
            </tr>
        );
    }
    return null;
});
