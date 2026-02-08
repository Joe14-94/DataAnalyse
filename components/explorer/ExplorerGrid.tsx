import React from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown, Hash, Calculator, Trash2 } from 'lucide-react';
import { Virtualizer, VirtualItem } from '@tanstack/react-virtual';
import { formatDateFr, formatNumberValue } from '../../utils';
import { Dataset, CalculatedField } from '../../types';
import { ExplorerRow } from '../../hooks/useDataExplorerLogic';

interface ExplorerGridProps {
  tableContainerRef: React.RefObject<HTMLDivElement>;
  rowVirtualizer: Virtualizer<HTMLDivElement, Element>;
  processedRows: ExplorerRow[];
  displayFields: string[];
  currentDataset: Dataset;
  calculatedFields: CalculatedField[];
  columnWidths: Record<string, number>;
  sortConfig: { key: string; direction: 'asc' | 'desc' } | null;
  handleHeaderClick: (field: string) => void;
  handleResizeStart: (e: React.MouseEvent, columnKey: string, currentWidth: number) => void;
  showColumnBorders: boolean;
  showFilters: boolean;
  columnFilters: Record<string, string>;
  handleColumnFilterChange: (key: string, value: string) => void;
  isEditMode: boolean;
  pendingChanges: Record<string, Record<string, Record<string, string | number | boolean>>>;
  handleCellEdit: (
    batchId: string,
    rowId: string,
    field: string,
    value: string | number | boolean
  ) => void;
  getCellStyle: (fieldName: string, value: any) => string;
  handleRowClick: (row: ExplorerRow) => void;
  setDeleteConfirmRow: (row: ExplorerRow) => void;
  selectedCol: string | null;
}

export const ExplorerGrid: React.FC<ExplorerGridProps> = ({
  tableContainerRef,
  rowVirtualizer,
  processedRows,
  displayFields,
  currentDataset,
  calculatedFields,
  columnWidths,
  sortConfig,
  handleHeaderClick,
  handleResizeStart,
  showColumnBorders,
  showFilters,
  columnFilters,
  handleColumnFilterChange,
  isEditMode,
  pendingChanges,
  handleCellEdit,
  getCellStyle,
  handleRowClick,
  setDeleteConfirmRow,
  selectedCol
}) => {
  const totalColumns = displayFields.length + 3 + calculatedFields.length;

  return (
    <div
      ref={tableContainerRef}
      className="flex-1 overflow-auto custom-scrollbar relative w-full flex flex-col"
    >
      <table
        className="w-full divide-y divide-slate-200 border-collapse text-left"
        style={{ height: rowVirtualizer.getTotalSize(), tableLayout: 'fixed', minWidth: '100%' }}
      >
        <thead className="bg-slate-50 sticky top-0 z-20 shadow-sm">
          <tr>
            <th
              className={`px-6 py-3 text-left text-xs font-bold text-slate-500 tracking-wider whitespace-nowrap bg-slate-50 border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors select-none group relative ${showColumnBorders ? 'border-r border-slate-200' : ''}`}
              onClick={() => handleHeaderClick('_importDate')}
              style={{
                width: columnWidths['_importDate'] || 140,
                minWidth: 140,
                maxWidth: columnWidths['_importDate'] || 140
              }}
            >
              <div className="flex items-center gap-2 justify-between">
                <div className="flex items-center gap-2">
                  <span>Date d'import</span>
                  {sortConfig?.key === '_importDate' ? (
                    sortConfig.direction === 'asc' ? (
                      <ArrowUp className="w-3 h-3 text-brand-600" />
                    ) : (
                      <ArrowDown className="w-3 h-3 text-brand-600" />
                    )
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
                <div
                  className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-brand-400 active:bg-brand-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  onMouseDown={(e) =>
                    handleResizeStart(e, '_importDate', columnWidths['_importDate'] || 140)
                  }
                />
              </div>
            </th>
            <th
              className={`px-6 py-3 text-left text-xs font-bold text-slate-500 tracking-wider whitespace-nowrap bg-slate-50 border-b border-slate-200 relative group ${showColumnBorders ? 'border-r border-slate-200' : ''}`}
              style={{
                width: columnWidths['id'] || 120,
                minWidth: 120,
                maxWidth: columnWidths['id'] || 120
              }}
            >
              <div className="flex items-center gap-2 justify-between">
                <span>Id</span>
                <div
                  className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-brand-400 active:bg-brand-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  onMouseDown={(e) => handleResizeStart(e, 'id', columnWidths['id'] || 120)}
                />
              </div>
            </th>
            {displayFields.map((field) => {
              const isSelected = selectedCol === field;
              const isBlended = field.startsWith('[');
              const fieldConfig = currentDataset.fieldConfigs?.[field];
              const isNumeric = fieldConfig?.type === 'number';
              const colWidth = columnWidths[field] || (isNumeric ? 120 : 180);
              return (
                <th
                  key={field}
                  className={`px-6 py-3 text-left text-xs font-bold tracking-wider whitespace-nowrap border-b cursor-pointer transition-colors select-none group relative ${isSelected ? 'bg-brand-50 text-brand-900 border-brand-300' : isBlended ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'} ${showColumnBorders ? 'border-r' : ''}`}
                  onClick={() => handleHeaderClick(field)}
                  style={{ width: colWidth, minWidth: 80, maxWidth: colWidth }}
                >
                  <div className="flex items-center gap-2 justify-between">
                    <div className="flex items-center gap-2">
                      {isNumeric && <Hash className="w-3 h-3 text-slate-400" />}
                      <span>{field}</span>
                      {sortConfig?.key === field ? (
                        sortConfig.direction === 'asc' ? (
                          <ArrowUp className="w-3 h-3 text-brand-600" />
                        ) : (
                          <ArrowDown className="w-3 h-3 text-brand-600" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-brand-400 active:bg-brand-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      onMouseDown={(e) => handleResizeStart(e, field, colWidth)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </th>
              );
            })}
            {calculatedFields.map((cf) => {
              const colWidth = columnWidths[cf.name] || 150;
              return (
                <th
                  key={cf.id}
                  title={`Formule: ${cf.formula}`}
                  className={`px-6 py-3 text-left text-xs font-bold text-indigo-600 tracking-wider whitespace-nowrap bg-indigo-50 border-b border-indigo-200 cursor-pointer hover:bg-indigo-100 transition-colors select-none group relative ${showColumnBorders ? 'border-r' : ''}`}
                  onClick={() => handleHeaderClick(cf.name)}
                  style={{ width: colWidth, minWidth: 80, maxWidth: colWidth }}
                >
                  <div className="flex items-center gap-2 justify-between">
                    <div className="flex items-center gap-2">
                      <Calculator className="w-3 h-3" />
                      <span>{cf.name}</span>
                      {sortConfig?.key === cf.name ? (
                        sortConfig.direction === 'asc' ? (
                          <ArrowUp className="w-3 h-3 text-indigo-600" />
                        ) : (
                          <ArrowDown className="w-3 h-3 text-indigo-600" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-indigo-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-400 active:bg-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      onMouseDown={(e) => handleResizeStart(e, cf.name, colWidth)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </th>
              );
            })}
            <th
              className="px-3 py-3 border-b border-slate-200 bg-slate-50"
              style={{ width: 60, minWidth: 60, maxWidth: 60 }}
            ></th>
          </tr>
          {showFilters && (
            <tr className="bg-slate-50">
              <th
                className={`px-2 py-2 border-b border-slate-200 ${showColumnBorders ? 'border-r' : ''}`}
                style={{
                  width: columnWidths['_importDate'] || 140,
                  minWidth: 140,
                  maxWidth: columnWidths['_importDate'] || 140
                }}
              >
                <input
                  type="text"
                  className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white focus:ring-1 focus:ring-brand-500 font-normal"
                  placeholder="Filtre date..."
                  value={columnFilters['_importDate'] || ''}
                  onChange={(e) => handleColumnFilterChange('_importDate', e.target.value)}
                />
              </th>
              <th
                className={`px-2 py-2 border-b border-slate-200 ${showColumnBorders ? 'border-r' : ''}`}
                style={{
                  width: columnWidths['id'] || 120,
                  minWidth: 120,
                  maxWidth: columnWidths['id'] || 120
                }}
              >
                <input
                  type="text"
                  className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white focus:ring-1 focus:ring-brand-500 font-normal"
                  placeholder="Filtre Id..."
                  value={columnFilters['id'] || ''}
                  onChange={(e) => handleColumnFilterChange('id', e.target.value)}
                />
              </th>
              {displayFields.map((field) => {
                const fieldConfig = currentDataset.fieldConfigs?.[field];
                const isNumeric = fieldConfig?.type === 'number';
                const colWidth = columnWidths[field] || (isNumeric ? 120 : 180);
                return (
                  <th
                    key={`filter-${field}`}
                    className={`px-2 py-2 border-b border-slate-200 ${showColumnBorders ? 'border-r' : ''}`}
                    style={{ width: colWidth, minWidth: 80, maxWidth: colWidth }}
                  >
                    <input
                      type="text"
                      className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white focus:ring-1 focus:ring-brand-500 font-normal"
                      placeholder={
                        columnFilters[field] === '__EMPTY__' ? '(Vide)' : `Filtre ${field}...`
                      }
                      value={columnFilters[field] === '__EMPTY__' ? '' : columnFilters[field] || ''}
                      onChange={(e) => handleColumnFilterChange(field, e.target.value)}
                    />
                  </th>
                );
              })}
              {calculatedFields.map((cf) => {
                const colWidth = columnWidths[cf.name] || 150;
                return (
                  <th
                    key={`filter-${cf.id}`}
                    className={`px-2 py-2 border-b border-indigo-200 bg-indigo-50 ${showColumnBorders ? 'border-r' : ''}`}
                    style={{ width: colWidth, minWidth: 80, maxWidth: colWidth }}
                  >
                    <input
                      type="text"
                      className="w-full px-2 py-1 text-xs border border-indigo-200 rounded bg-white focus:ring-1 focus:ring-indigo-500 font-normal"
                      placeholder={`Filtre...`}
                      value={columnFilters[cf.name] || ''}
                      onChange={(e) => handleColumnFilterChange(cf.name, e.target.value)}
                    />
                  </th>
                );
              })}
              <th
                className="border-b border-slate-200 bg-slate-50"
                style={{ width: 60, minWidth: 60, maxWidth: 60 }}
              ></th>
            </tr>
          )}
        </thead>
        <tbody className="bg-white divide-y divide-slate-200">
          {rowVirtualizer.getTotalSize() > 0 && (
            <tr>
              <td
                style={{ height: `${rowVirtualizer.getVirtualItems()[0]?.start || 0}px` }}
                colSpan={totalColumns}
              />
            </tr>
          )}
          {rowVirtualizer.getVirtualItems().map((virtualRow: VirtualItem) => {
            const row = processedRows[virtualRow.index];
            return (
              <tr
                key={virtualRow.key}
                className="hover:bg-brand-50 transition-colors cursor-pointer group"
                onClick={() => handleRowClick(row)}
              >
                <td
                  className={`px-6 py-2 whitespace-nowrap text-sm text-slate-500 font-mono group-hover:text-brand-600 ${showColumnBorders ? 'border-r border-slate-200' : ''}`}
                  style={{
                    width: columnWidths['_importDate'] || 140,
                    minWidth: 140,
                    maxWidth: columnWidths['_importDate'] || 140
                  }}
                >
                  {formatDateFr(row._importDate)}
                </td>
                <td
                  className={`px-6 py-2 whitespace-nowrap text-sm text-slate-600 font-mono ${showColumnBorders ? 'border-r border-slate-200' : ''}`}
                  style={{
                    width: columnWidths['id'] || 120,
                    minWidth: 120,
                    maxWidth: columnWidths['id'] || 120
                  }}
                >
                  {row.id}
                </td>
                {displayFields.map((field) => {
                  const val = pendingChanges[row._batchId]?.[row.id]?.[field] ?? row[field];
                  let displayVal: React.ReactNode = val;
                  const cellStyle = getCellStyle(field, val);
                  const config = currentDataset.fieldConfigs?.[field];
                  const isBlended = field.startsWith('[');
                  const isNumeric = config?.type === 'number';
                  const colWidth = columnWidths[field] || (isNumeric ? 120 : 180);

                  if (!isEditMode || isBlended) {
                    if (config?.type === 'number' && val !== undefined && val !== '')
                      displayVal = formatNumberValue(val as any, config);
                    else if (config?.type === 'date' && val !== undefined && val !== '')
                      displayVal = formatDateFr(val as any);
                    else if (typeof val === 'boolean')
                      displayVal = val ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          Oui
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500">
                          Non
                        </span>
                      );
                    else if (!val && val !== 0)
                      displayVal = <span className="text-slate-300">-</span>;
                  }

                  return (
                    <td
                      key={field}
                      className={`px-3 py-1 whitespace-nowrap text-sm text-slate-700 truncate ${cellStyle} ${config?.type === 'number' ? 'text-right font-mono' : ''} ${isBlended ? 'text-purple-700 bg-purple-50/20' : ''} ${showColumnBorders ? 'border-r border-slate-200' : ''}`}
                      title={String(val)}
                      style={{ width: colWidth, minWidth: 80, maxWidth: colWidth }}
                    >
                      {isEditMode && !isBlended ? (
                        <input
                          type="text"
                          className="w-full px-2 py-1 text-sm border border-brand-300 rounded focus:ring-1 focus:ring-brand-500 bg-white"
                          value={String(val ?? '')}
                          onChange={(e) =>
                            handleCellEdit(row._batchId, row.id, field, e.target.value)
                          }
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        displayVal
                      )}
                    </td>
                  );
                })}
                {calculatedFields.map((cf) => {
                  const val = row[cf.name];
                  const cellStyle = getCellStyle(cf.name, val);
                  const colWidth = columnWidths[cf.name] || 150;
                  const config = currentDataset.fieldConfigs?.[cf.name] || {
                    type: cf.outputType || 'number',
                    unit: cf.unit
                  };
                  let displayVal: React.ReactNode = val;
                  if (config.type === 'number' && val !== undefined && val !== null && val !== '')
                    displayVal = formatNumberValue(val, config);
                  else if (config.type === 'boolean')
                    displayVal = val ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        Oui
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500">
                        Non
                      </span>
                    );
                  else if (!val && val !== 0)
                    displayVal = <span className="text-indigo-200">-</span>;
                  return (
                    <td
                      key={cf.id}
                      className={`px-3 py-1 whitespace-nowrap text-sm text-indigo-700 font-medium truncate bg-indigo-50/30 ${config.type === 'number' ? 'text-right font-mono' : ''} ${cellStyle} ${showColumnBorders ? 'border-r border-slate-200' : ''}`}
                      style={{ width: colWidth, minWidth: 80, maxWidth: colWidth }}
                    >
                      {displayVal}
                    </td>
                  );
                })}
                <td
                  className="px-3 py-2 text-right"
                  style={{ width: 60, minWidth: 60, maxWidth: 60 }}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDeleteConfirmRow(row);
                    }}
                    className="text-slate-300 hover:text-red-600 p-1 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            );
          })}
          {rowVirtualizer.getTotalSize() > 0 && (
            <tr>
              <td
                style={{
                  height: `${rowVirtualizer.getTotalSize() - (rowVirtualizer.getVirtualItems()[rowVirtualizer.getVirtualItems().length - 1]?.end || 0)}px`
                }}
                colSpan={totalColumns}
              />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
