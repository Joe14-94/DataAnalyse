
import React from 'react';
import { usePivotLogic } from '../hooks/usePivotLogic';
import { useVirtualizer } from '@tanstack/react-virtual';

import { PivotHeader } from '../components/pivot/PivotHeader';
import { PivotSidePanel } from '../components/pivot/PivotSidePanel';
import { PivotGrid } from '../components/pivot/PivotGrid';
import { PivotFooter } from '../components/pivot/PivotFooter';
import { SelectionOverlay, FormattingOverlay } from '../components/pivot/PivotOverlays';

import { SourceManagementModal } from '../components/pivot/SourceManagementModal';
import { DrilldownModal } from '../components/pivot/DrilldownModal';
import { FormattingModal } from '../components/pivot/FormattingModal';
import { QuickChartModal } from '../components/pivot/QuickChartModal';
import { TemporalSourceModal } from '../components/pivot/TemporalSourceModal';
import { ChartModal } from '../components/pivot/ChartModal';
import { CalculatedFieldModal } from '../components/pivot/CalculatedFieldModal';
import { SpecificDashboardModal } from '../components/pivot/SpecificDashboardModal';
import { SaveAsDatasetModal } from '../components/pivot/SaveAsDatasetModal';

export const PivotTable: React.FC = () => {
    const {
        batches, datasets, savedAnalyses, primaryDataset, datasetBatches,
        blendedRows, pivotData, temporalResults, temporalColTotals, isCalculating, chartPivotData,
        sources, setSources, selectedBatchId, setSelectedBatchId,
        rowFields, setRowFields, colFields, setColFields, valField, setValField,
        colGrouping, setColGrouping, aggType, setAggType, metrics, setMetrics,
        valFormatting, setValFormatting, filters, setFilters,
        showSubtotals, setShowSubtotals, showTotalCol, setShowTotalCol, showVariations, setShowVariations,
        sortBy, setSortBy, sortOrder, setSortOrder, searchTerm, setSearchTerm,
        isSaving, setIsSaving, isEditMode, setIsEditMode, analysisName, setAnalysisName,
        showExportMenu, setShowExportMenu, showLoadMenu, setShowLoadMenu,
        expandedSections, setExpandedSections,
        isSourceModalOpen, setIsSourceModalOpen, isCalcModalOpen, setIsCalcModalOpen,
        isSpecificDashboardModalOpen, setIsSpecificDashboardModalOpen,
        isFormattingModalOpen, setIsFormattingModalOpen, isQuickChartModalOpen, setIsQuickChartModalOpen,
        isSelectionMode, setIsSelectionMode, isSaveAsDatasetModalOpen, setIsSaveAsDatasetModalOpen,
        formattingSelectionRule, setFormattingSelectionRule,
        specificDashboardItems, setSpecificDashboardItems,
        editingCalcField, setEditingCalcField, columnLabels, setColumnLabels,
        editingColumn, setEditingColumn, columnWidths, setColumnWidths,
        styleRules, setStyleRules, conditionalRules, setConditionalRules,
        isDataSourcesPanelCollapsed, setIsDataSourcesPanelCollapsed,
        isTemporalConfigPanelCollapsed, setIsTemporalConfigPanelCollapsed,
        isFieldsPanelCollapsed, setIsFieldsPanelCollapsed,
        drilldownData, setDrilldownData, isChartModalOpen, setIsChartModalOpen,
        draggedField, isTemporalMode, setIsTemporalMode,
        temporalConfig, setTemporalConfig, isTemporalSourceModalOpen, setIsTemporalSourceModalOpen,
        parentRef, footerRef,
        allAvailableFields, usedFields, groupedFields, isColFieldDate,
        handleValFieldChange, handleDragStart, handleDrop, removeField,
        handleExport, handleExportSpreadsheet, handleCellClick,
        handleTemporalDrilldown, handleLoadAnalysis, handleSaveCalculatedField,
        handleRemoveCalculatedField, handleSaveSpecificDashboard, handleSaveAnalysis,
        handleSaveAsDataset, handleReset, companyLogo
    } = usePivotLogic();

    const rowVirtualizer = useVirtualizer({
        count: pivotData ? pivotData.displayRows.length : 0,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 35,
        overscan: 20
    });

    return (
        <div className="h-full flex flex-col p-2 gap-2 relative bg-slate-50">
            <PivotHeader
               isTemporalMode={isTemporalMode} setIsTemporalMode={setIsTemporalMode} handleToChart={() => setIsChartModalOpen(true)}
               setIsSelectionMode={setIsSelectionMode}
               primaryDataset={primaryDataset} datasets={datasets} showExportMenu={showExportMenu} setShowExportMenu={setShowExportMenu}
               handleExport={handleExport} handleExportSpreadsheet={handleExportSpreadsheet} showLoadMenu={showLoadMenu} setShowLoadMenu={setShowLoadMenu}
               savedAnalyses={savedAnalyses} handleLoadAnalysis={handleLoadAnalysis} isSaving={isSaving} setIsSaving={setIsSaving}
               isEditMode={isEditMode} setIsEditMode={setIsEditMode}
               analysisName={analysisName} setAnalysisName={setAnalysisName} handleSaveAnalysis={handleSaveAnalysis}
               openCalcModal={() => { setEditingCalcField(null); setIsCalcModalOpen(true); }}
               openFormattingModal={() => setIsFormattingModalOpen(true)}
               openSpecificDashboardModal={() => setIsSpecificDashboardModalOpen(true)}
               openSaveAsDatasetModal={() => setIsSaveAsDatasetModalOpen(true)}
               selectedItemsCount={specificDashboardItems.length}
               searchTerm={searchTerm}
               setSearchTerm={setSearchTerm}
               handleReset={handleReset}
            />

            <div className="flex flex-col xl:flex-row gap-2 flex-1 min-h-0">
                <PivotSidePanel
                   {...{ sources, datasets, datasetBatches, selectedBatchId, setSelectedBatchId, startAddSource: () => setIsSourceModalOpen(true), removeSource: (id) => setSources(s => s.filter(x => x.id !== id)),
                   isDataSourcesPanelCollapsed, setIsDataSourcesPanelCollapsed, isTemporalMode, isTemporalConfigPanelCollapsed, setIsTemporalConfigPanelCollapsed, setIsTemporalSourceModalOpen, temporalConfig, setTemporalConfig,
                   rowFields, setRowFields, colFields, setColFields, valField, handleValFieldChange, setValField, aggType, setAggType, metrics, setMetrics, valFormatting, setValFormatting, filters, setFilters,
                   isFieldsPanelCollapsed, setIsFieldsPanelCollapsed, groupedFields, expandedSections, toggleSection: (id) => setExpandedSections(p => ({ ...p, [id]: !p[id] })), usedFields,
                   allAvailableFields, primaryDataset, colGrouping, setColGrouping, isColFieldDate, showSubtotals, setShowSubtotals, showTotalCol, setShowTotalCol, showVariations, setShowVariations,
                   handleDragStart, handleDragOver: (e) => e.preventDefault(), handleDrop, removeField, draggedField,
                   openCalcModal: () => { setEditingCalcField(null); setIsCalcModalOpen(true); },
                   removeCalculatedField: handleRemoveCalculatedField,
                   openEditCalcModal: (field: any) => { setEditingCalcField(field); setIsCalcModalOpen(true); },
                   openFormattingModal: () => setIsFormattingModalOpen(true) }}
                />

                <div className="flex-1 flex flex-col min-w-0 bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm relative">
                    {isSelectionMode && (
                        <SelectionOverlay
                            itemsCount={specificDashboardItems.length}
                            onVisualize={() => setIsQuickChartModalOpen(true)}
                            onCreateReport={() => { setIsSelectionMode(false); setIsSpecificDashboardModalOpen(true); }}
                            onCancel={() => { setIsSelectionMode(false); setSpecificDashboardItems([]); }}
                            onClear={() => setSpecificDashboardItems([])}
                        />
                    )}
                    {formattingSelectionRule && (
                        <FormattingOverlay onCancel={() => { setFormattingSelectionRule(null); setIsFormattingModalOpen(true); }} />
                    )}
                    <PivotGrid
                       {...{ isCalculating, isTemporalMode, pivotData, temporalResults, temporalConfig, rowFields, colFields, columnLabels, editingColumn, setEditingColumn, setColumnLabels, showVariations, showTotalCol,
                       handleDrilldown: handleCellClick, handleTemporalDrilldown, primaryDataset, datasets, aggType, valField, metrics, valFormatting, virtualItems: rowVirtualizer.getVirtualItems(), rowVirtualizer, parentRef,
                       isSelectionMode, isFormattingSelectionMode: !!formattingSelectionRule, selectedItems: specificDashboardItems, isEditMode,
                       sortBy, setSortBy, sortOrder, setSortOrder,
                       columnWidths, setColumnWidths,
                       styleRules, conditionalRules,
                       onRemoveField: removeField,
                       totalColumns: rowFields.length + (pivotData?.colHeaders.length || 0) + (showTotalCol ? 1 : 0),
                       paddingTop: rowVirtualizer.getVirtualItems().length > 0 ? rowVirtualizer.getVirtualItems()[0].start : 0,
                       paddingBottom: rowVirtualizer.getVirtualItems().length > 0 ? rowVirtualizer.getTotalSize() - rowVirtualizer.getVirtualItems()[rowVirtualizer.getVirtualItems().length - 1].end : 0 }}
                    />
                    <PivotFooter
                       {...{ pivotData, temporalColTotals, temporalConfig, rowFields, columnWidths, footerRef, valField, aggType, metrics, primaryDataset, datasets, valFormatting, showTotalCol, showVariations, styleRules, conditionalRules,
                       isSelectionMode, selectedItems: specificDashboardItems, handleDrilldown: handleCellClick, handleTemporalDrilldown }}
                    />
                </div>
            </div>

            <SourceManagementModal isOpen={isSourceModalOpen} onClose={() => setIsSourceModalOpen(false)} sources={sources} datasets={datasets} batches={batches} primaryDataset={primaryDataset} onSourcesChange={setSources} />
            <DrilldownModal isOpen={drilldownData !== null} onClose={() => setDrilldownData(null)} title={drilldownData?.title || ''} rows={drilldownData?.rows || []} fields={drilldownData?.fields || []} />
            {isChartModalOpen && chartPivotData && (
                <ChartModal
                   isOpen={isChartModalOpen}
                   onClose={() => setIsChartModalOpen(false)}
                   pivotData={chartPivotData as any}
                   pivotConfig={{
                      rows: blendedRows,
                      rowFields: isTemporalMode ? (temporalConfig?.groupByFields || []) : rowFields,
                      colFields: isTemporalMode ? [] : colFields,
                      colGrouping, valField, aggType, filters, sortBy, sortOrder, showSubtotals, showVariations,
                      currentDataset: primaryDataset, datasets, valFormatting
                   }}
                   isTemporalMode={isTemporalMode}
                   temporalComparison={temporalConfig}
                   selectedBatchId={selectedBatchId}
                   companyLogo={companyLogo}
                />
            )}
            <TemporalSourceModal isOpen={isTemporalSourceModalOpen} onClose={() => setIsTemporalSourceModalOpen(false)} primaryDataset={primaryDataset || null} batches={batches} currentSources={temporalConfig?.sources || []} onSourcesChange={(s, r, extra) => setTemporalConfig({ ...temporalConfig, ...extra, sources: s, referenceSourceId: r, deltaFormat: temporalConfig?.deltaFormat || 'value', groupByFields: rowFields, valueField: valField, aggType: aggType as any, metrics })} />
            <CalculatedFieldModal
                isOpen={isCalcModalOpen}
                onClose={() => { setIsCalcModalOpen(false); setEditingCalcField(null); }}
                fields={allAvailableFields}
                onSave={handleSaveCalculatedField}
                initialField={editingCalcField}
                sampleRow={blendedRows.length > 0 ? blendedRows[0] : null}
            />

            <FormattingModal
                isOpen={isFormattingModalOpen}
                onClose={() => setIsFormattingModalOpen(false)}
                styleRules={styleRules}
                setStyleRules={setStyleRules}
                conditionalRules={conditionalRules}
                setConditionalRules={setConditionalRules}
                metrics={metrics}
                rowFields={rowFields}
                colFields={colFields}
                additionalLabels={isTemporalMode ? (temporalConfig?.sources || []).map((s: any) => s.label) : []}
                onStartSelection={(ruleId, type) => {
                    setFormattingSelectionRule({ id: ruleId, type });
                    setIsFormattingModalOpen(false);
                }}
            />

            <SpecificDashboardModal
                isOpen={isSpecificDashboardModalOpen}
                onClose={() => setIsSpecificDashboardModalOpen(false)}
                items={specificDashboardItems}
                setItems={setSpecificDashboardItems}
                onStartSelection={() => { setIsSpecificDashboardModalOpen(false); setIsSelectionMode(true); }}
                onSave={handleSaveSpecificDashboard}
            />

            <QuickChartModal
                isOpen={isQuickChartModalOpen}
                onClose={() => setIsQuickChartModalOpen(false)}
                items={specificDashboardItems}
            />

            <SaveAsDatasetModal
                isOpen={isSaveAsDatasetModalOpen}
                onClose={() => setIsSaveAsDatasetModalOpen(false)}
                onSave={handleSaveAsDataset}
                defaultName={`Analyse ${primaryDataset?.name || ''}`}
            />
        </div>
    );
};
