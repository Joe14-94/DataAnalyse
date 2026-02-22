import React from 'react';
import { useImportLogic } from '../hooks/useImportLogic';
import { ImportSourceStep } from '../components/import/ImportSourceStep';
import { ImportMappingStep } from '../components/import/ImportMappingStep';

export const Import: React.FC = () => {
    const logic = useImportLogic();

    return (
        <div className="h-full overflow-y-auto p-4 md:p-8 custom-scrollbar">
            <div className="space-y-6 pb-12">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-slate-800">Importation des données</h2>
                    <div className="text-sm text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
                        Étape {logic.step === 'input' ? '1/2' : '2/2'}
                    </div>
                </div>

                {logic.step === 'input' && (
                    <ImportSourceStep
                        successMessage={logic.successMessage}
                        setSuccessMessage={logic.setSuccessMessage}
                        date={logic.date}
                        setDate={logic.setDate}
                        fileEncoding={logic.fileEncoding}
                        setFileEncoding={logic.setFileEncoding}
                        isDragging={logic.isDragging}
                        setIsDragging={logic.setIsDragging}
                        isProcessingFile={logic.isProcessingFile}
                        handleDrop={logic.handleDrop}
                        handleFileSelect={logic.handleFileSelect}
                        fileInputRef={logic.fileInputRef}
                        text={logic.text}
                        setText={logic.setText}
                        handleAnalyzeText={logic.handleAnalyzeText}
                    />
                )}

                {logic.step === 'mapping' && logic.rawData && (
                    <ImportMappingStep
                        rawData={logic.rawData}
                        datasets={logic.datasets}
                        mapping={logic.mapping}
                        autoMappedIndices={logic.autoMappedIndices}
                        selectedColIndex={logic.selectedColIndex}
                        setSelectedColIndex={logic.setSelectedColIndex}
                        previewPage={logic.previewPage}
                        setPreviewPage={logic.setPreviewPage}
                        rowsPerPage={logic.rowsPerPage}
                        setRowsPerPage={logic.setRowsPerPage}
                        deleteConfirm={logic.deleteConfirm}
                        setDeleteConfirm={logic.setDeleteConfirm}
                        tempFieldConfigs={logic.tempFieldConfigs}
                        targetDatasetId={logic.targetDatasetId}
                        setTargetDatasetId={logic.setTargetDatasetId}
                        newDatasetName={logic.newDatasetName}
                        setNewDatasetName={logic.setNewDatasetName}
                        detectedDatasetId={logic.detectedDatasetId}
                        updateMode={logic.updateMode}
                        setUpdateMode={logic.setUpdateMode}
                        date={logic.date}
                        setDate={logic.setDate}
                        paginatedPreviewRows={logic.paginatedPreviewRows}
                        previewTotalPages={logic.previewTotalPages}
                        handleCleanColumn={logic.handleCleanColumn}
                        handleRemoveDuplicates={logic.handleRemoveDuplicates}
                        handleRemoveRow={logic.handleRemoveRow}
                        handleRemoveHeader={logic.handleRemoveHeader}
                        handleMappingChange={logic.handleMappingChange}
                        handleConfigChange={logic.handleConfigChange}
                        handleFinalizeImport={logic.handleFinalizeImport}
                        handleBack={logic.handleBack}
                    />
                )}
            </div>
        </div>
    );
};
