import React, { useMemo, useState } from 'react';
import { Database, Activity } from 'lucide-react';
import { useDataExplorerLogic } from '../hooks/useDataExplorerLogic';
import { DataExplorerHeader } from '../components/data-explorer/DataExplorerHeader';
import { DataExplorerToolbar } from '../components/data-explorer/DataExplorerToolbar';
import { DataExplorerGrid } from '../components/data-explorer/DataExplorerGrid';
import { ConditionalFormattingDrawer, VlookupDrawer, DetailsDrawer, ColumnManagementDrawer } from '../components/data-explorer/DataExplorerDrawers';
import { DeleteRowModal, EditModeToolbar } from '../components/data-explorer/DataExplorerModals';
import { CalculatedFieldModal } from '../components/pivot/CalculatedFieldModal';
import { DataProfilingPanel } from '../components/data-explorer/DataProfilingPanel';

export const DataExplorer: React.FC = () => {
    const {
        currentDataset,
        datasets,
        batches,
        currentDatasetId,
        processedRows,
        displayFields,
        allColumns,
        distributionData,
        historyData,
        rowVirtualizer,
        colVirtualizer,
        tableContainerRef,
        state,
        dispatch,
        switchDataset,
        handleHeaderClick,
        handleColumnFilterChange,
        clearFilters,
        handleResizeStart,
        handleRowClick,
        handleCellEdit,
        handleSaveEdits,
        handleCancelEdits,
        handleSaveCalculatedField,
        handleEditCalculatedField,
        handleAddConditionalRule,
        handleRemoveConditionalRule,
        handleFormatChange,
        handleRenameColumn,
        handleDeleteColumn,
        handleApplyVlookup,
        handleDeleteRow,
        confirmDeleteRow,
        handleExportFullCSV,
        deleteBatch,
        reorderDatasetFields,
        navigate,
        getCellStyle
    } = useDataExplorerLogic();

    const [showProfiling, setShowProfiling] = useState(false);

    const activeBatchFilter = state.columnFilters['_batchId'] ? state.columnFilters['_batchId'].replace(/^=/, '') : null;
    const activeBatchDate = activeBatchFilter ? batches.find(b => b.id === activeBatchFilter)?.date : null;

    const selectedConfig = useMemo(() => {
        if (!state.selectedCol || !currentDataset) return null;
        const config = currentDataset.fieldConfigs?.[state.selectedCol];
        if (config) return config;

        const calcField = currentDataset.calculatedFields?.find((f: any) => f.name === state.selectedCol);
        if (calcField) {
            return {
                type: calcField.outputType || 'number',
                unit: calcField.unit
            };
        }
        return null;
    }, [state.selectedCol, currentDataset]);

    const isSelectedNumeric = selectedConfig?.type === 'number';

    if (!currentDataset) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-center bg-slate-50 rounded-lg border border-dashed border-slate-300 m-4">
                <Database className="w-12 h-12 text-slate-300 mb-4" />
                <p className="text-slate-600 font-medium">Aucun tableau sélectionné</p>
                <div className="mt-4">
                    <label htmlFor="dataset-select" className="sr-only">Sélectionner un tableau</label>
                    <select
                        id="dataset-select"
                        className="appearance-none bg-white border border-slate-300 text-slate-700 text-sm rounded-md py-2 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
                        value=""
                        onChange={(e) => {
                            if (e.target.value === '__NEW__') navigate('/import');
                            else switchDataset(e.target.value);
                        }}
                    >
                        <option value="" disabled>Choisir une typologie</option>
                        {datasets.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                        <option disabled>──────────</option>
                        <option value="__NEW__">+ Nouvelle typologie...</option>
                    </select>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col p-4 md:p-8 gap-4 relative">
            <DeleteRowModal
                deleteConfirmRow={state.deleteConfirmRow}
                onClose={() => dispatch({ type: 'SET_DELETE_CONFIRM_ROW', payload: null })}
                onConfirm={confirmDeleteRow}
            />

            {/* Profiling toggle */}
            <div className="absolute top-4 right-4 z-40">
              <button
                onClick={() => setShowProfiling(v => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg shadow transition-colors"
                title="Profil de qualité des données"
              >
                <Activity className="w-3.5 h-3.5" />
                Profil qualité
              </button>
            </div>

            <DataExplorerHeader
                currentDataset={currentDataset}
                datasets={datasets}
                batches={batches}
                currentDatasetId={currentDatasetId}
                switchDataset={switchDataset}
                processedRowsCount={processedRows.length}
                totalRowsCount={processedRows.length} // Simplified for UI
                activeBatchDate={activeBatchDate || null}
                blendingConfig={state.blendingConfig}
                searchTerm={state.searchTerm}
                setSearchTerm={(term) => dispatch({ type: 'SET_SEARCH_TERM', payload: term })}
                isFormatDrawerOpen={state.isFormatDrawerOpen}
                setFormatDrawerOpen={(open) => dispatch({ type: 'SET_FORMAT_DRAWER_OPEN', payload: open })}
                isCalcModalOpen={state.isCalcModalOpen}
                setCalcModalOpen={(open) => dispatch({ type: 'SET_CALC_MODAL_OPEN', payload: open })}
                isVlookupDrawerOpen={state.isVlookupDrawerOpen}
                setVlookupDrawerOpen={(open) => dispatch({ type: 'SET_VLOOKUP_DRAWER_OPEN', payload: open })}
                isEditMode={state.isEditMode}
                setEditMode={(open) => dispatch({ type: 'SET_EDIT_MODE', payload: open })}
                showFilters={state.showFilters}
                setShowFilters={(show) => dispatch({ type: 'SET_SHOW_FILTERS', payload: show })}
                isColumnDrawerOpen={state.isColumnDrawerOpen}
                setColumnDrawerOpen={(open) => dispatch({ type: 'SET_COLUMN_DRAWER_OPEN', payload: open })}
                showColumnBorders={state.showColumnBorders}
                setShowColumnBorders={(show) => dispatch({ type: 'SET_SHOW_BORDERS', payload: show })}
                hasFilters={Object.keys(state.columnFilters).length > 0 || state.searchTerm !== ''}
                clearFilters={clearFilters}
                activeBatchFilter={activeBatchFilter || null}
                handleColumnFilterChange={handleColumnFilterChange}
                deleteBatch={deleteBatch}
                handleExportFullCSV={handleExportFullCSV}
                navigate={navigate}
            />

            <EditModeToolbar
                isEditMode={state.isEditMode}
                pendingChanges={state.pendingChanges}
                handleSaveEdits={handleSaveEdits}
                handleCancelEdits={handleCancelEdits}
            />

            <DataExplorerToolbar
                selectedCol={state.selectedCol}
                renamingValue={state.renamingValue}
                setRenamingValue={(val) => dispatch({ type: 'SET_RENAMING_VALUE', payload: val })}
                handleRenameColumn={handleRenameColumn}
                selectedConfig={selectedConfig}
                handleFormatChange={handleFormatChange as any}
                isSelectedNumeric={isSelectedNumeric}
                currentDataset={currentDataset}
                handleEditCalculatedField={handleEditCalculatedField}
                handleDeleteColumn={handleDeleteColumn}
                setSelectedCol={(col) => dispatch({ type: 'SET_SELECTED_COL', payload: col })}
                distributionData={distributionData}
            />

            <div className="flex-1 flex min-h-0 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden relative">
                <DataExplorerGrid
                    tableContainerRef={tableContainerRef}
                    rowVirtualizer={rowVirtualizer}
                    colVirtualizer={colVirtualizer}
                    processedRows={processedRows}
                    displayFields={displayFields}
                    allColumns={allColumns}
                    currentDataset={currentDataset}
                    sortConfig={state.sortConfig}
                    handleHeaderClick={handleHeaderClick}
                    columnWidths={state.columnWidths}
                    handleResizeStart={handleResizeStart}
                    showColumnBorders={state.showColumnBorders}
                    showFilters={state.showFilters}
                    columnFilters={state.columnFilters}
                    handleColumnFilterChange={handleColumnFilterChange}
                    isEditMode={state.isEditMode}
                    pendingChanges={state.pendingChanges}
                    handleCellEdit={handleCellEdit}
                    handleRowClick={handleRowClick}
                    handleDeleteRow={handleDeleteRow}
                    getCellStyle={getCellStyle}
                    selectedCol={state.selectedCol}
                />

                <CalculatedFieldModal
                    isOpen={state.isCalcModalOpen}
                    onClose={() => {
                        dispatch({ type: 'SET_CALC_MODAL_OPEN', payload: false });
                        dispatch({ type: 'SET_EDITING_CALC_FIELD', payload: null });
                    }}
                    fields={currentDataset.fields}
                    onSave={handleSaveCalculatedField}
                    initialField={state.editingCalcField}
                    sampleRow={processedRows[0]}
                />

                <ConditionalFormattingDrawer
                    isOpen={state.isFormatDrawerOpen}
                    onClose={() => dispatch({ type: 'SET_FORMAT_DRAWER_OPEN', payload: false })}
                    currentDataset={currentDataset}
                    selectedFormatCol={state.selectedFormatCol}
                    setSelectedFormatCol={(col) => dispatch({ type: 'SET_SELECTED_FORMAT_COL', payload: col })}
                    newRule={state.newRule}
                    setNewRule={(rule) => dispatch({ type: 'SET_NEW_RULE', payload: rule })}
                    handleAddConditionalRule={handleAddConditionalRule}
                    handleRemoveConditionalRule={handleRemoveConditionalRule}
                />

                <VlookupDrawer
                    isOpen={state.isVlookupDrawerOpen}
                    onClose={() => dispatch({ type: 'SET_VLOOKUP_DRAWER_OPEN', payload: false })}
                    vlookupConfig={state.vlookupConfig}
                    setVlookupConfig={(config) => dispatch({ type: 'SET_VLOOKUP_CONFIG', payload: config })}
                    datasets={datasets}
                    currentDataset={currentDataset}
                    handleApplyVlookup={handleApplyVlookup}
                />

                <DetailsDrawer
                    isOpen={state.isDrawerOpen}
                    onClose={() => dispatch({ type: 'SET_DRAWER_OPEN', payload: false })}
                    selectedRow={state.selectedRow}
                    trackingKey={state.trackingKey}
                    setTrackingKey={(key) => dispatch({ type: 'SET_TRACKING_KEY', payload: key })}
                    currentDataset={currentDataset}
                    historyData={historyData}
                />

                <ColumnManagementDrawer
                    isOpen={state.isColumnDrawerOpen}
                    onClose={() => dispatch({ type: 'SET_COLUMN_DRAWER_OPEN', payload: false })}
                    currentDataset={currentDataset}
                    reorderDatasetFields={reorderDatasetFields}
                />
            </div>

            {showProfiling && currentDataset && (
              <div className="fixed inset-y-0 right-0 w-full md:w-[640px] bg-white border-l border-slate-200 shadow-2xl z-50 overflow-y-auto custom-scrollbar">
                <DataProfilingPanel
                  rows={processedRows}
                  fields={currentDataset.fields}
                  fieldConfigs={currentDataset.fieldConfigs}
                  onClose={() => setShowProfiling(false)}
                />
              </div>
            )}
        </div>
    );
};
