import React from 'react';
import { useDataExplorerLogic } from '../hooks/useDataExplorerLogic';
import { ExplorerHeader } from '../components/explorer/ExplorerHeader';
import { ExplorerToolbar } from '../components/explorer/ExplorerToolbar';
import { ExplorerGrid } from '../components/explorer/ExplorerGrid';
import { ExplorerDrawers } from '../components/explorer/ExplorerDrawers';
import { CalculatedFieldModal } from '../components/pivot/CalculatedFieldModal';
import { Button } from '../components/ui/Button';
import {
  Database,
  GitCommit,
  Columns,
  Calculator,
  Trash2,
  AlertTriangle,
  BarChart2,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'lucide-react';

export const DataExplorer: React.FC = () => {
  const logic = useDataExplorerLogic();
  const {
    currentDataset,
    datasets,
    currentDatasetId,
    switchDataset,
    batches,
    searchTerm,
    setSearchTerm,
    showFilters,
    setShowFilters,
    columnFilters,
    handleColumnFilterChange,
    clearFilters,
    isFormatDrawerOpen,
    setIsFormatDrawerOpen,
    isCalcModalOpen,
    setIsCalcModalOpen,
    isVlookupDrawerOpen,
    setIsVlookupDrawerOpen,
    isEditMode,
    setIsEditMode,
    isColumnDrawerOpen,
    setIsColumnDrawerOpen,
    showColumnBorders,
    setShowColumnBorders,
    activeBatchFilter,
    deleteBatch,
    handleExportFullCSV,
    processedRows,
    allRows,
    blendingConfig,
    navigate,
    pendingChanges,
    handleCancelEdits,
    handleSaveEdits,
    selectedCol,
    renamingValue,
    setRenamingValue,
    handleRenameColumn,
    handleFormatChange,
    currentDataset: ds,
    handleEditCalculatedField,
    handleDeleteColumn,
    distributionData,
    tableContainerRef,
    rowVirtualizer,
    displayFields,
    sortConfig,
    handleHeaderClick,
    handleResizeStart,
    handleCellEdit,
    getCellStyle,
    handleRowClick,
    setDeleteConfirmRow,
    deleteConfirmRow,
    confirmDeleteRow,
    handleSaveCalculatedField,
    editingCalcField,
    selectedFormatCol,
    setSelectedFormatCol,
    newRule,
    setNewRule,
    handleAddConditionalRule,
    handleRemoveConditionalRule,
    vlookupConfig,
    setVlookupConfig,
    handleApplyVlookup,
    isDrawerOpen,
    setIsDrawerOpen,
    selectedRow,
    trackingKey,
    setTrackingKey,
    historyData,
    reorderDatasetFields,
    undo,
    redo,
    canUndo,
    canRedo
  } = logic;

  if (!currentDataset) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center bg-slate-50 rounded-lg border border-dashed border-slate-300 m-4">
        <Database className="w-12 h-12 text-slate-300 mb-4" />
        <p className="text-slate-600 font-medium">Aucun tableau sélectionné</p>
        <div className="mt-4">
          <select
            className="appearance-none bg-white border border-slate-300 text-slate-700 text-sm rounded-md py-2 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
            value=""
            onChange={(e) => {
              if (e.target.value === '__NEW__') navigate('/import');
              else switchDataset(e.target.value);
            }}
          >
            <option value="" disabled>
              Choisir une typologie
            </option>
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
            <option disabled>──────────</option>
            <option value="__NEW__">+ Nouvelle typologie...</option>
          </select>
        </div>
      </div>
    );
  }

  const calculatedFields = currentDataset.calculatedFields || [];
  const activeBatchDate = activeBatchFilter
    ? batches.find((b) => b.id === activeBatchFilter)?.date || null
    : null;
  const selectedConfig = selectedCol
    ? currentDataset.fieldConfigs?.[selectedCol] ||
      (calculatedFields.find((f) => f.name === selectedCol)
        ? { type: calculatedFields.find((f) => f.name === selectedCol)?.outputType || 'number' }
        : null)
    : null;
  const isSelectedNumeric = selectedConfig?.type === 'number';

  return (
    <div className="h-full flex flex-col p-4 md:p-8 gap-4 relative">
      <style>{`
            .custom-scrollbar::-webkit-scrollbar { width: 10px; height: 10px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: #f8fafc; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 6px; border: 3px solid #f8fafc; }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
         `}</style>

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmRow && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-100 rounded-full text-red-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Confirmer la suppression</h3>
            </div>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Supprimer cette ligne définitivement de l'import du <strong>{activeBatchDate}</strong>{' '}
              ? Action irréversible.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteConfirmRow(null)}>
                Annuler
              </Button>
              <Button variant="danger" onClick={confirmDeleteRow}>
                Supprimer
              </Button>
            </div>
          </div>
        </div>
      )}

      <ExplorerHeader
        currentDataset={currentDataset}
        datasets={datasets}
        currentDatasetId={currentDatasetId || ''}
        switchDataset={switchDataset}
        batches={batches}
        columnFilters={columnFilters}
        handleColumnFilterChange={handleColumnFilterChange}
        processedRowsCount={processedRows.length}
        totalRowsCount={allRows.length}
        activeBatchDate={activeBatchDate}
        blendingConfig={blendingConfig}
        navigate={navigate}
      />

      <ExplorerToolbar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        isFormatDrawerOpen={isFormatDrawerOpen}
        setIsFormatDrawerOpen={setIsFormatDrawerOpen}
        isCalcModalOpen={isCalcModalOpen}
        setIsCalcModalOpen={setIsCalcModalOpen}
        isVlookupDrawerOpen={isVlookupDrawerOpen}
        setIsVlookupDrawerOpen={setIsVlookupDrawerOpen}
        isEditMode={isEditMode}
        setIsEditMode={setIsEditMode}
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        isColumnDrawerOpen={isColumnDrawerOpen}
        setIsColumnDrawerOpen={setIsColumnDrawerOpen}
        showColumnBorders={showColumnBorders}
        setShowColumnBorders={setShowColumnBorders}
        columnFilters={columnFilters}
        clearFilters={clearFilters}
        activeBatchFilter={activeBatchFilter}
        deleteBatch={deleteBatch}
        handleExportFullCSV={handleExportFullCSV}
        processedRowsCount={processedRows.length}
        undo={undo}
        redo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
      />

      {isEditMode && (
        <div className="bg-brand-50 border border-brand-200 rounded-lg p-3 shadow-sm flex items-center justify-between animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-100 rounded-full text-brand-600">
              <GitCommit className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-brand-900">Mode Édition Activé</p>
              <p className="text-xs text-brand-700">
                Modifiez les cellules directement dans le tableau.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleCancelEdits}>
              Annuler
            </Button>
            <Button variant="primary" onClick={handleSaveEdits}>
              Enregistrer (
              {Object.values(pendingChanges).reduce(
                (acc, curr) => acc + Object.keys(curr).length,
                0
              )}{' '}
              lignes)
            </Button>
          </div>
        </div>
      )}

      {/* Formatting Toolbar */}
      <div
        className={`transition-all duration-300 overflow-hidden ${selectedCol ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="bg-white border border-brand-200 rounded-lg p-3 shadow-sm flex flex-wrap items-start gap-4">
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex items-center gap-2 border-b border-brand-100 pb-2 mb-2">
              <Columns className="w-4 h-4 text-brand-700" />
              <div className="relative group">
                <input
                  type="text"
                  className="text-sm font-bold text-brand-800 bg-transparent border-b border-brand-300 focus:outline-none focus:border-brand-600 w-48"
                  value={renamingValue}
                  onChange={(e) => setRenamingValue(e.target.value)}
                />
                {renamingValue !== selectedCol && (
                  <button
                    onClick={handleRenameColumn}
                    className="absolute -right-16 top-0 text-xs bg-brand-600 text-white px-2 py-0.5 rounded"
                  >
                    Renommer
                  </button>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2 pr-3 border-r border-brand-100">
                <span className="text-xs text-slate-600 font-medium">Type :</span>
                <select
                  className="text-xs border border-slate-200 rounded py-1 px-2"
                  value={selectedConfig?.type || 'text'}
                  onChange={(e) => handleFormatChange('type', e.target.value)}
                >
                  <option value="text">Texte</option>
                  <option value="number">Nombre</option>
                  <option value="date">Date</option>
                  <option value="boolean">Oui/Non</option>
                </select>
              </div>
              {isSelectedNumeric ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600 font-medium">Décimales :</span>
                  <div className="flex bg-white rounded border border-slate-200">
                    <button
                      onClick={() =>
                        handleFormatChange(
                          'decimalPlaces',
                          Math.max(0, (selectedConfig?.decimalPlaces ?? 2) - 1)
                        )
                      }
                      className="px-2 py-1 text-xs"
                    >
                      -
                    </button>
                    <span className="px-2 py-1 text-xs w-6 text-center">
                      {selectedConfig?.decimalPlaces ?? 2}
                    </span>
                    <button
                      onClick={() =>
                        handleFormatChange(
                          'decimalPlaces',
                          Math.min(5, (selectedConfig?.decimalPlaces ?? 2) + 1)
                        )
                      }
                      className="px-2 py-1 text-xs"
                    >
                      +
                    </button>
                  </div>
                </div>
              ) : (
                <span className="text-xs text-slate-400 italic">
                  Options limitées pour ce type.
                </span>
              )}
              <div className="ml-auto flex items-center gap-2 border-l border-slate-200 pl-3">
                {calculatedFields.find((f) => f.name === selectedCol) && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      const f = calculatedFields.find((f) => f.name === selectedCol);
                      if (f) handleEditCalculatedField(f);
                    }}
                  >
                    <Calculator className="w-3 h-3 mr-1" /> Modifier Formule
                  </Button>
                )}
                <Button onClick={handleDeleteColumn} size="sm" variant="danger">
                  <Trash2 className="w-3 h-3 mr-1" /> Supprimer
                </Button>
                <Button onClick={() => logic.setSelectedCol(null)} size="sm" variant="primary">
                  Terminer
                </Button>
              </div>
            </div>
          </div>
          <div className="w-64 h-32 bg-white rounded border border-slate-100 p-2 flex flex-col">
            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase mb-1">
              <BarChart2 className="w-3 h-3" /> Distribution
            </div>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distributionData}>
                  <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ fontSize: '10px' }} />
                  <Bar dataKey="value" fill="#0d9488" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex min-h-0 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden relative">
        <ExplorerGrid
          tableContainerRef={tableContainerRef}
          rowVirtualizer={rowVirtualizer}
          processedRows={processedRows}
          displayFields={displayFields}
          currentDataset={currentDataset}
          calculatedFields={calculatedFields}
          columnWidths={columnWidths}
          sortConfig={sortConfig}
          handleHeaderClick={handleHeaderClick}
          handleResizeStart={handleResizeStart}
          showColumnBorders={showColumnBorders}
          showFilters={showFilters}
          columnFilters={columnFilters}
          handleColumnFilterChange={handleColumnFilterChange}
          isEditMode={isEditMode}
          pendingChanges={pendingChanges}
          handleCellEdit={handleCellEdit}
          getCellStyle={getCellStyle}
          handleRowClick={handleRowClick}
          setDeleteConfirmRow={logic.setDeleteConfirmRow}
          selectedCol={selectedCol}
        />
      </div>

      <ExplorerDrawers
        isFormatDrawerOpen={isFormatDrawerOpen}
        setIsFormatDrawerOpen={setIsFormatDrawerOpen}
        currentDataset={currentDataset}
        selectedFormatCol={selectedFormatCol}
        setSelectedFormatCol={setSelectedFormatCol}
        newRule={newRule}
        setNewRule={setNewRule}
        handleAddConditionalRule={handleAddConditionalRule}
        handleRemoveConditionalRule={handleRemoveConditionalRule}
        isVlookupDrawerOpen={isVlookupDrawerOpen}
        setIsVlookupDrawerOpen={setIsVlookupDrawerOpen}
        datasets={datasets}
        vlookupConfig={vlookupConfig}
        setVlookupConfig={setVlookupConfig}
        handleApplyVlookup={handleApplyVlookup}
        isDrawerOpen={isDrawerOpen}
        setIsDrawerOpen={setIsDrawerOpen}
        selectedRow={selectedRow}
        trackingKey={trackingKey}
        setTrackingKey={setTrackingKey}
        historyData={historyData}
        isColumnDrawerOpen={isColumnDrawerOpen}
        setIsColumnDrawerOpen={setIsColumnDrawerOpen}
        reorderDatasetFields={reorderDatasetFields}
      />

      <CalculatedFieldModal
        isOpen={isCalcModalOpen}
        onClose={() => {
          setIsCalcModalOpen(false);
          logic.setEditingCalcField(null);
        }}
        fields={currentDataset.fields}
        onSave={handleSaveCalculatedField}
        initialField={editingCalcField}
        sampleRow={processedRows[0]}
      />
    </div>
  );
};
