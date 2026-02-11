import React from 'react';
import { ArrowUp, ArrowDown, X } from 'lucide-react';
import { VirtualItem } from '@tanstack/react-virtual';
import { formatDateLabelForDisplay } from '../../utils';
import { PivotMetric, TemporalComparisonConfig } from '../../types';

interface PivotTableHeaderProps {
    isTemporalMode: boolean;
    rowFields: string[];
    columnLabels: Record<string, string>;
    editingColumn: string | null;
    setEditingColumn: (v: string | null) => void;
    setColumnLabels: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    rowFieldLeftPositions: number[];
    columnWidths: Record<string, number>;
    getCellFormatting: (rowKeys: string[], col: string, value: string | number | undefined, metricLabel: string, rowType: 'data' | 'subtotal' | 'grandTotal') => any;
    isEditMode: boolean;
    handleHeaderClick: (newSortBy: string) => void;
    renderSortIcon: (target: string) => React.ReactNode;
    onRemoveField?: (zone: 'row' | 'col' | 'val' | 'filter', field: string) => void;
    onResizeStart: (e: React.MouseEvent, id: string, defaultWidth: number) => void;
    handleKeyDown: (e: React.KeyboardEvent, handler: () => void) => void;
    virtualCols: VirtualItem[];
    allDataColumns: { key: string; width: number; isDiff?: boolean }[];
    metricInfoCache: Map<string, any>;
    temporalConfig: TemporalComparisonConfig | null;
    metrics: PivotMetric[];
    showTotalCol: boolean;
    effectiveMetrics: PivotMetric[];
}

export const PivotTableHeader: React.FC<PivotTableHeaderProps> = React.memo((props) => {
    const {
        isTemporalMode, rowFields, columnLabels, editingColumn, setEditingColumn, setColumnLabels,
        rowFieldLeftPositions, columnWidths, getCellFormatting, isEditMode, handleHeaderClick,
        renderSortIcon, onRemoveField, onResizeStart, handleKeyDown, virtualCols, allDataColumns,
        metricInfoCache, temporalConfig, metrics, showTotalCol, effectiveMetrics
    } = props;

    if (isTemporalMode) {
        return (
            <tr className="bg-slate-50">
                {(rowFields || []).map((field, idx) => {
                    const displayLabel = columnLabels[`group_${field}`] || field;
                    const isEditing = editingColumn === `group_${field}`;
                    const widthId = `group_${field}`;
                    const width = columnWidths[widthId] || 150;
                    const left = rowFieldLeftPositions[idx];
                    const headerStyle = getCellFormatting([field], '', undefined, '', 'data');
                    const onHeaderClickAction = () => { if (isEditMode) setEditingColumn(`group_${field}`); else if (idx === 0) handleHeaderClick('label'); };
                    return (
                        <th key={field} className={`px-2 py-1.5 text-left text-xs font-bold uppercase border-b border-r border-slate-200 whitespace-nowrap sticky left-0 z-40 cursor-pointer transition-colors group relative focus:ring-2 focus:ring-brand-500 focus:outline-none focus:z-50 ${isEditMode ? 'bg-amber-50/50 text-amber-700 border-dashed border-amber-200 hover:bg-amber-100' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                            role="button"
                            tabIndex={0}
                            style={{ width, minWidth: width, maxWidth: width, left: `${left}px`, ...headerStyle }}
                            onClick={onHeaderClickAction}
                            onKeyDown={(e) => handleKeyDown(e, onHeaderClickAction)}>
                            <div className="flex items-center overflow-hidden gap-1">
                                <span className="truncate flex-1">{isEditing ? <input type="text" value={columnLabels[`group_${field}`] || field} autoFocus className="w-full px-1 py-0.5 text-xs border border-brand-300 rounded text-slate-900" onClick={(e) => e.stopPropagation()} onChange={(e) => setColumnLabels((prev) => ({ ...prev, [`group_${field}`]: e.target.value }))} onBlur={() => setEditingColumn(null)} onKeyDown={(e) => { if (e.key === 'Enter') setEditingColumn(null); }} /> : displayLabel}</span>
                                {onRemoveField && !isEditing && <button onClick={(e) => { e.stopPropagation(); onRemoveField('row', field); }} className="p-0.5 hover:bg-red-100 text-red-400 hover:text-red-600 rounded transition-all bg-white/50 shadow-sm border border-slate-100" title="Retirer"><X className="w-3 h-3" /></button>}
                                {idx === 0 && renderSortIcon('label')}
                            </div>
                            <div className="absolute -right-1.5 top-0 bottom-0 w-3 cursor-col-resize hover:bg-brand-400/40 z-30 transition-colors" onMouseDown={(e) => onResizeStart(e, widthId, 150)} />
                        </th>
                    );
                })}
                {virtualCols[0]?.start > 0 && <th style={{ width: virtualCols[0].start }} />}
                {virtualCols.map((vCol: VirtualItem) => {
                    const col = allDataColumns[vCol.index];
                    const colKey = col.key;
                    if (col.isDiff) return <th key={colKey} className="px-2 py-1.5 text-right text-xs font-bold uppercase border-b border-r border-slate-200 bg-purple-50 text-purple-700" style={{ width: vCol.size, minWidth: vCol.size, maxWidth: vCol.size }}>Δ</th>;

                    const { metricLabel, metric } = metricInfoCache.get(colKey) || {};
                    const sourceId = colKey.split('_')[0];
                    const source = temporalConfig?.sources.find(s => s.id === sourceId);
                    const displayLabel = metrics.length > 1 ? `${source?.label || sourceId} - ${metricLabel}` : (source?.label || sourceId);
                    const headerStyle = getCellFormatting([], colKey, undefined, metricLabel || '', 'data');

                    const onColClick = () => { if (isEditMode) setEditingColumn(colKey); else handleHeaderClick(sourceId); };
                    return (
                        <th key={colKey} className={`px-2 py-1.5 text-right text-xs font-bold uppercase border-b border-r border-slate-200 cursor-pointer group relative transition-colors focus:ring-2 focus:ring-brand-500 focus:outline-none focus:z-50 ${isEditMode ? 'bg-amber-50/50 text-amber-700 border-dashed border-amber-200 hover:bg-amber-100' : sourceId === temporalConfig?.referenceSourceId ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                            role="button"
                            tabIndex={0}
                            style={{ width: vCol.size, minWidth: vCol.size, maxWidth: vCol.size, ...headerStyle }}
                            onClick={onColClick}
                            onKeyDown={(e) => handleKeyDown(e, onColClick)}>
                            <div className="flex items-center justify-end overflow-hidden gap-1">
                                <span className="truncate flex-1">{editingColumn === colKey ? <input type="text" value={columnLabels[colKey] || displayLabel} autoFocus className="w-full px-1 py-0.5 text-xs border border-brand-300 rounded text-slate-900" onClick={(e) => e.stopPropagation()} onChange={(e) => setColumnLabels((prev) => ({ ...prev, [colKey]: e.target.value }))} onBlur={() => setEditingColumn(null)} onKeyDown={(e) => { if (e.key === 'Enter') setEditingColumn(null); }} /> : (columnLabels[colKey] || displayLabel)}</span>
                                {metric && renderSortIcon(sourceId)}
                            </div>
                            <div className="absolute -right-1.5 top-0 bottom-0 w-3 cursor-col-resize hover:bg-brand-400/40 z-30 transition-colors" onMouseDown={(e) => onResizeStart(e, colKey, 120)} />
                        </th>
                    );
                })}
            </tr>
        );
    }

    return (
        <tr className="bg-slate-50">
            {rowFields.map((field, idx) => {
                const widthId = `row_${field}`;
                const width = columnWidths[widthId] || 150;
                const left = rowFieldLeftPositions[idx];
                const headerStyle = getCellFormatting([field], '', undefined, '', 'data');
                const onRowHeaderClick = () => { if (isEditMode) setEditingColumn(`row_${field}`); else if (idx === 0) handleHeaderClick('label'); };
                return (
                    <th key={field} className={`px-2 py-1.5 text-left text-xs font-bold uppercase border-b border-r border-slate-200 whitespace-nowrap sticky left-0 z-40 cursor-pointer group relative transition-colors focus:ring-2 focus:ring-brand-500 focus:outline-none focus:z-50 ${isEditMode ? 'bg-amber-50 text-amber-700 border-dashed border-amber-200 hover:bg-amber-100' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                        role="button"
                        tabIndex={0}
                        style={{ width, minWidth: width, maxWidth: width, left: `${left}px`, ...headerStyle }}
                        onClick={onRowHeaderClick}
                        onKeyDown={(e) => handleKeyDown(e, onRowHeaderClick)}>
                        <div className="flex items-center overflow-hidden gap-1">
                            <span className="truncate flex-1">{editingColumn === `row_${field}` ? <input type="text" value={columnLabels[`row_${field}`] || field} autoFocus className="w-full px-1 py-0.5 text-xs border border-brand-300 rounded text-slate-900" onClick={(e) => e.stopPropagation()} onChange={(e) => setColumnLabels((prev) => ({ ...prev, [`row_${field}`]: e.target.value }))} onBlur={() => setEditingColumn(null)} onKeyDown={(e) => { if (e.key === 'Enter') setEditingColumn(null); }} /> : (columnLabels[`row_${field}`] || field)}</span>
                            {onRemoveField && !editingColumn?.startsWith('row_') && <button onClick={(e) => { e.stopPropagation(); onRemoveField('row', field); }} className="p-0.5 hover:bg-red-100 text-red-400 hover:text-red-600 rounded transition-all bg-white/50 shadow-sm border border-slate-100" title="Retirer"><X className="w-3 h-3" /></button>}
                            {idx === 0 && renderSortIcon('label')}
                        </div>
                        <div className="absolute -right-1.5 top-0 bottom-0 w-3 cursor-col-resize hover:bg-brand-400/40 z-30 transition-colors" onMouseDown={(e) => onResizeStart(e, widthId, 150)} />
                    </th>
                );
            })}
            {virtualCols[0]?.start > 0 && <th style={{ width: virtualCols[0].start }} />}
            {virtualCols.map((vCol: VirtualItem) => {
                const col = allDataColumns[vCol.index];
                const colKey = col.key;
                const { colLabel, metricLabel, metric, isDiff, isPct } = metricInfoCache.get(colKey) || {};
                let displayLabel = isDiff ? 'Var.' : isPct ? '%' : formatDateLabelForDisplay(colLabel || colKey);
                if (metricLabel && !isDiff && !isPct && colLabel === 'ALL') displayLabel = metricLabel;
                else if (metricLabel && !isDiff && !isPct) displayLabel = `${displayLabel} - ${metricLabel}`;
                const headerStyle = getCellFormatting([], colKey, undefined, metricLabel || '', 'data');
                const onColHeaderClick = () => { if (isEditMode) setEditingColumn(colKey); else handleHeaderClick(colKey); };
                return (
                    <th key={colKey} className={`px-2 py-1.5 text-right text-xs font-bold uppercase border-b border-r border-slate-200 whitespace-nowrap cursor-pointer group relative transition-colors focus:ring-2 focus:ring-brand-500 focus:outline-none focus:z-50 ${isEditMode ? 'bg-amber-50/50 text-amber-700 border-dashed border-amber-200 hover:bg-amber-100' : isDiff || isPct ? 'bg-blue-50 text-blue-700 hover:bg-blue-100' : 'text-slate-500 hover:bg-slate-100'}`}
                        role="button"
                        tabIndex={0}
                        style={{ width: vCol.size, minWidth: vCol.size, maxWidth: vCol.size, ...headerStyle }}
                        onClick={onColHeaderClick}
                        onKeyDown={(e) => handleKeyDown(e, onColHeaderClick)}>
                        <div className="flex items-center justify-end overflow-hidden gap-1">
                            <span className="truncate flex-1">{editingColumn === colKey ? <input type="text" value={columnLabels[colKey] || displayLabel} autoFocus className="w-full px-1 py-0.5 text-xs border border-brand-300 rounded text-slate-900" onClick={(e) => e.stopPropagation()} onChange={(e) => setColumnLabels((prev) => ({ ...prev, [colKey]: e.target.value }))} onBlur={() => setEditingColumn(null)} onKeyDown={(e) => { if (e.key === 'Enter') setEditingColumn(null); }} /> : (columnLabels[colKey] || displayLabel)}</span>
                            {onRemoveField && !isDiff && !isPct && !editingColumn && <button onClick={(e) => { e.stopPropagation(); const info = metricInfoCache.get(colKey); if (info?.metric) onRemoveField('val', info.metric.field); else if (colLabel && colLabel !== 'ALL') onRemoveField('col', colLabel!); }} className="p-0.5 hover:bg-red-100 text-red-400 hover:text-red-600 rounded transition-all bg-white/50 shadow-sm border border-slate-100" title="Retirer"><X className="w-3 h-3" /></button>}
                            {renderSortIcon(colKey)}
                        </div>
                        <div className="absolute -right-1.5 top-0 bottom-0 w-3 cursor-col-resize hover:bg-brand-400/40 z-30 transition-colors" onMouseDown={(e) => onResizeStart(e, colKey, 120)} />
                    </th>
                );
            })}
            {showTotalCol && effectiveMetrics.length > 0 && (
                <th className="px-2 py-1.5 text-right text-xs font-black text-slate-700 uppercase border-b bg-slate-100 whitespace-nowrap cursor-pointer group focus:ring-2 focus:ring-brand-500 focus:outline-none focus:z-50"
                    role="button"
                    tabIndex={0}
                    style={{ width: columnWidths['Grand Total'] || 150, minWidth: 150, maxWidth: 150 }}
                    onClick={() => handleHeaderClick('value')}
                    onKeyDown={(e) => handleKeyDown(e, () => handleHeaderClick('value'))}>
                    <div className="flex items-center justify-end relative">Total {renderSortIcon('value')}<div className="absolute -right-2 top-0 bottom-0 w-4 cursor-col-resize hover:bg-brand-400/40 z-30 transition-colors" onMouseDown={(e) => onResizeStart(e, 'Grand Total', 150)} /></div>
                </th>
            )}
        </tr>
    );
});
