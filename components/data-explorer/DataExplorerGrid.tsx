import React from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown, Hash, Calculator, Trash2 } from 'lucide-react';
import { formatDateFr, formatNumberValue } from '../../utils';
import { Dataset } from '../../types/dataset';
import { DataRow } from '../../types/common';

interface DataExplorerGridProps {
    tableContainerRef: React.RefObject<HTMLDivElement>;
    rowVirtualizer: any;
    colVirtualizer: any;
    processedRows: DataRow[];
    displayFields: string[];
    allColumns: { key: string; width: number }[];
    currentDataset: Dataset;
    sortConfig: { key: string; direction: 'asc' | 'desc' } | null;
    handleHeaderClick: (field: string) => void;
    columnWidths: Record<string, number>;
    handleResizeStart: (e: React.MouseEvent, columnKey: string, currentWidth: number) => void;
    showColumnBorders: boolean;
    showFilters: boolean;
    columnFilters: Record<string, string>;
    handleColumnFilterChange: (key: string, value: string) => void;
    isEditMode: boolean;
    pendingChanges: Record<string, Record<string, any>>;
    handleCellEdit: (batchId: string, rowId: string, field: string, value: string | number | boolean) => void;
    handleRowClick: (row: DataRow & { _importDate: string; _batchId: string }) => void;
    handleDeleteRow: (row: DataRow, e: React.MouseEvent) => void;
    getCellStyle: (fieldName: string, value: string | number | boolean) => string;
    selectedCol: string | null;
}

export const DataExplorerGrid: React.FC<DataExplorerGridProps> = ({
    tableContainerRef, rowVirtualizer, colVirtualizer, processedRows, allColumns, currentDataset,
    sortConfig, handleHeaderClick, handleResizeStart,
    showColumnBorders, showFilters, columnFilters, handleColumnFilterChange,
    isEditMode, pendingChanges, handleCellEdit, handleRowClick, handleDeleteRow,
    getCellStyle, selectedCol
}) => {
    const virtualRows = rowVirtualizer.getVirtualItems();
    const virtualCols = colVirtualizer.getVirtualItems();

    const renderHeaderCell = (colIndex: number, virtualCol: any) => {
        const column = allColumns[colIndex];
        const field = column.key;

        if (field === '_actions') {
            return (
                <div key={virtualCol.key} role="columnheader" className="bg-slate-50 border-b border-slate-200" style={{ position: 'absolute', top: 0, left: virtualCol.start, width: virtualCol.size, height: '100%' }}></div>
            );
        }

        if (field === '_importDate') {
            return (
                <div key={virtualCol.key} role="columnheader" className={`px-6 py-3 text-left text-xs font-bold text-slate-500 tracking-wider whitespace-nowrap bg-slate-50 border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors select-none group relative ${showColumnBorders ? 'border-r border-slate-200' : ''}`}
                    style={{ position: 'absolute', top: 0, left: virtualCol.start, width: virtualCol.size, height: '100%' }}
                    onClick={() => handleHeaderClick('_importDate')}>
                    <div className="flex items-center gap-2 justify-between h-full">
                        <div className="flex items-center gap-2">
                            <span>Date d'import</span>
                            {sortConfig?.key === '_importDate' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-brand-600" /> : <ArrowDown className="w-3 h-3 text-brand-600" />) : <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />}
                        </div>
                        <div className="absolute -right-1.5 top-0 bottom-0 w-3 cursor-col-resize hover:bg-brand-400 active:bg-brand-600 opacity-0 group-hover:opacity-100 transition-opacity z-30" onMouseDown={(e) => handleResizeStart(e, '_importDate', virtualCol.size)} />
                    </div>
                </div>
            );
        }

        if (field === 'id') {
             return (
                <div key={virtualCol.key} role="columnheader" className={`px-6 py-3 text-left text-xs font-bold text-slate-500 tracking-wider whitespace-nowrap bg-slate-50 border-b border-slate-200 relative group ${showColumnBorders ? 'border-r border-slate-200' : ''}`}
                    style={{ position: 'absolute', top: 0, left: virtualCol.start, width: virtualCol.size, height: '100%' }}>
                    <div className="flex items-center gap-2 justify-between h-full">
                        <span>Id</span>
                        <div className="absolute -right-1.5 top-0 bottom-0 w-3 cursor-col-resize hover:bg-brand-400 active:bg-brand-600 opacity-0 group-hover:opacity-100 transition-opacity z-30" onMouseDown={(e) => handleResizeStart(e, 'id', virtualCol.size)} />
                    </div>
                </div>
            );
        }

        const isCalculated = currentDataset.calculatedFields?.some(cf => cf.name === field);
        const isBlended = field.startsWith('[');
        const fieldConfig = currentDataset.fieldConfigs?.[field];
        const isNumeric = fieldConfig?.type === 'number';
        const isSelected = selectedCol === field;

        if (isCalculated) {
            return (
                <div key={virtualCol.key} role="columnheader" title={`Champ calculé: ${field}`} className={`px-6 py-3 text-left text-xs font-bold text-indigo-600 tracking-wider whitespace-nowrap bg-indigo-50 border-b border-indigo-200 cursor-pointer hover:bg-indigo-100 transition-colors select-none group relative ${showColumnBorders ? 'border-r' : ''}`}
                    style={{ position: 'absolute', top: 0, left: virtualCol.start, width: virtualCol.size, height: '100%' }}
                    onClick={() => handleHeaderClick(field)}>
                    <div className="flex items-center gap-2 justify-between h-full">
                        <div className="flex items-center gap-2">
                            <Calculator className="w-3 h-3" />
                            <span>{field}</span>
                            {sortConfig?.key === field ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />) : <ArrowUpDown className="w-3 h-3 text-indigo-300 opacity-0 group-hover:opacity-100 transition-opacity" />}
                        </div>
                        <div className="absolute -right-1.5 top-0 bottom-0 w-3 cursor-col-resize hover:bg-indigo-400 active:bg-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity z-30" onMouseDown={(e) => handleResizeStart(e, field, virtualCol.size)} onClick={(e) => e.stopPropagation()} />
                    </div>
                </div>
            );
        }

        return (
            <div key={virtualCol.key} role="columnheader" className={`px-6 py-3 text-left text-xs font-bold tracking-wider whitespace-nowrap border-b cursor-pointer transition-colors select-none group relative ${isSelected ? 'bg-brand-50 text-brand-900 border-brand-300' : (isBlended ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100')} ${showColumnBorders ? 'border-r' : ''}`}
                style={{ position: 'absolute', top: 0, left: virtualCol.start, width: virtualCol.size, height: '100%' }}
                onClick={() => handleHeaderClick(field)}>
                <div className="flex items-center gap-2 justify-between h-full">
                    <div className="flex items-center gap-2">
                        {isNumeric && <Hash className="w-3 h-3 text-slate-400" />}
                        <span>{field}</span>
                        {sortConfig?.key === field ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-brand-600" /> : <ArrowDown className="w-3 h-3 text-brand-600" />) : <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />}
                    </div>
                    <div className="absolute -right-1.5 top-0 bottom-0 w-3 cursor-col-resize hover:bg-brand-400 active:bg-brand-600 opacity-0 group-hover:opacity-100 transition-opacity z-30" onMouseDown={(e) => handleResizeStart(e, field, virtualCol.size)} onClick={(e) => e.stopPropagation()} />
                </div>
            </div>
        );
    };

    const renderFilterCell = (colIndex: number, virtualCol: any) => {
        const column = allColumns[colIndex];
        const field = column.key;
        if (field === '_actions') return <div key={`filter-${virtualCol.key}`} role="gridcell" className="bg-slate-50 border-b border-slate-200" style={{ position: 'absolute', top: 0, left: virtualCol.start, width: virtualCol.size, height: '100%' }}></div>;

        const isCalculated = currentDataset.calculatedFields?.some(cf => cf.name === field);
        const placeholder = field === '_importDate' ? "Filtre date..." : field === 'id' ? "Filtre Id..." : `Filtre ${field}...`;

        return (
            <div key={`filter-${virtualCol.key}`} role="gridcell" className={`px-2 py-2 border-b border-slate-200 bg-slate-50 ${isCalculated ? 'bg-indigo-50 border-indigo-200' : ''} ${showColumnBorders ? 'border-r' : ''}`} style={{ position: 'absolute', top: 0, left: virtualCol.start, width: virtualCol.size, height: '100%' }}>
                <input
                    type="text"
                    className={`w-full px-2 py-1 text-xs border rounded bg-white focus:ring-1 font-normal ${isCalculated ? 'border-indigo-200 focus:ring-indigo-500' : 'border-slate-300 focus:ring-brand-500'}`}
                    placeholder={columnFilters[field] === '__EMPTY__' ? "(Vide)" : placeholder}
                    value={columnFilters[field] === '__EMPTY__' ? '' : (columnFilters[field] || '')}
                    onChange={(e) => handleColumnFilterChange(field, e.target.value)}
                />
            </div>
        );
    };

    const renderDataCell = (rowIndex: number, colIndex: number, virtualCol: any, row: any) => {
        const column = allColumns[colIndex];
        const field = column.key;

        if (field === '_actions') {
            return (
                <div key={`${rowIndex}-${virtualCol.key}`} role="gridcell" className="px-3 py-2 text-right" style={{ position: 'absolute', top: 0, left: virtualCol.start, width: virtualCol.size, height: '100%' }}>
                    <button type="button" onClick={(e) => handleDeleteRow(row, e)} className="text-slate-300 hover:text-red-600 p-1 hover:bg-red-50 rounded transition-colors" title="Supprimer la ligne" aria-label="Supprimer la ligne"><Trash2 className="w-4 h-4" /></button>
                </div>
            );
        }

        if (field === '_importDate') {
            return (
                <div key={`${rowIndex}-${virtualCol.key}`} role="gridcell" className={`px-6 py-2 whitespace-nowrap text-sm text-slate-500 font-mono group-hover:text-brand-600 ${showColumnBorders ? 'border-r border-slate-200' : ''}`} style={{ position: 'absolute', top: 0, left: virtualCol.start, width: virtualCol.size, height: '100%' }}>
                    {formatDateFr(row._importDate)}
                </div>
            );
        }

        if (field === 'id') {
            return (
                <div key={`${rowIndex}-${virtualCol.key}`} role="gridcell" className={`px-6 py-2 whitespace-nowrap text-sm text-slate-600 font-mono ${showColumnBorders ? 'border-r border-slate-200' : ''}`} style={{ position: 'absolute', top: 0, left: virtualCol.start, width: virtualCol.size, height: '100%' }}>
                    {row.id}
                </div>
            );
        }

        const val = pendingChanges[row._batchId]?.[row.id]?.[field] ?? row[field];
        const config = currentDataset.fieldConfigs?.[field] || (currentDataset.calculatedFields?.find(cf => cf.name === field) ? { type: (currentDataset.calculatedFields?.find(cf => cf.name === field)?.outputType || 'number') as any, unit: currentDataset.calculatedFields?.find(cf => cf.name === field)?.unit } : { type: 'text' as any });
        const isNumeric = config.type === 'number';
        const isBlended = field.startsWith('[');
        const cellStyle = getCellStyle(field, val);
        const isCalculated = currentDataset.calculatedFields?.some(cf => cf.name === field);

        let displayVal: React.ReactNode = val;
        if (!isEditMode || isBlended || isCalculated) {
            if (config.type === 'number' && val !== undefined && val !== null && val !== '') displayVal = formatNumberValue(val, config);
            else if (config.type === 'date' && val !== undefined && val !== null && val !== '') displayVal = formatDateFr(val);
            else if (typeof val === 'boolean') displayVal = val ? <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Oui</span> : <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500">Non</span>;
            else if (!val && val !== 0) displayVal = <span className={isCalculated ? "text-indigo-200" : "text-slate-300"}>-</span>;
        }

        return (
            <div key={`${rowIndex}-${virtualCol.key}`}
                role="gridcell"
                className={`px-3 py-1 whitespace-nowrap text-sm truncate ${cellStyle} ${isNumeric ? 'text-right font-mono' : 'text-slate-700'} ${isBlended ? 'text-purple-700 bg-purple-50/10' : ''} ${isCalculated ? 'text-indigo-700 font-medium bg-indigo-50/10' : ''} ${showColumnBorders ? 'border-r border-slate-200' : ''}`}
                title={String(val)}
                style={{ position: 'absolute', top: 0, left: virtualCol.start, width: virtualCol.size, height: '100%' }}>
                {isEditMode && !isBlended && !isCalculated ? (
                    <input
                        type="text"
                        className="w-full h-full px-2 py-0 text-sm border border-brand-300 rounded focus:ring-1 focus:ring-brand-500 bg-white"
                        value={val ?? ''}
                        onChange={(e) => handleCellEdit(row._batchId, row.id, field, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                    />
                ) : displayVal}
            </div>
        );
    };

    return (
        <div
            ref={tableContainerRef}
            className="flex-1 overflow-auto custom-scrollbar relative w-full"
            role="grid"
            aria-rowcount={processedRows.length + 1}
            aria-colcount={allColumns.length}
            aria-label="Explorateur de données"
            tabIndex={0}
        >
            {/* STICKY HEADER & FILTERS */}
            <div
                className="sticky top-0 z-30 bg-slate-50 shadow-sm"
                style={{ width: colVirtualizer.getTotalSize() }}
                role="rowgroup"
            >
                {/* Header Row */}
                <div
                    style={{ height: 44, width: '100%', position: 'relative' }}
                    role="row"
                >
                    {virtualCols.map((virtualCol: any) => renderHeaderCell(virtualCol.index, virtualCol))}
                </div>

                {/* Filter Row */}
                {showFilters && (
                    <div
                        style={{ height: 44, width: '100%', position: 'relative' }}
                        className="border-t border-slate-200"
                        role="row"
                    >
                        {virtualCols.map((virtualCol: any) => renderFilterCell(virtualCol.index, virtualCol))}
                    </div>
                )}
            </div>

            {/* DATA CONTAINER */}
            <div
                style={{ height: rowVirtualizer.getTotalSize(), width: colVirtualizer.getTotalSize(), position: 'relative' }}
                role="rowgroup"
            >
                {/* Data Rows */}
                {virtualRows.map((virtualRow: any) => {
                    const row = processedRows[virtualRow.index] as DataRow & { _importDate: string; _batchId: string };
                    return (
                        <div
                            key={virtualRow.key}
                            className="absolute left-0 w-full hover:bg-brand-50 transition-colors cursor-pointer group border-b border-slate-200"
                            style={{ top: virtualRow.start, height: virtualRow.size }}
                            onClick={() => handleRowClick(row)}
                            role="row"
                            aria-rowindex={virtualRow.index + 2}
                        >
                            {virtualCols.map((virtualCol: any) => renderDataCell(virtualRow.index, virtualCol.index, virtualCol, row))}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
