import React from 'react';
import { useData } from '../context/DataContext';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import {
    RotateCcw, ArrowRight, Check, X, AlertTriangle
} from 'lucide-react';
import { useImportLogic } from '../hooks/useImportLogic';
import { ImportSourceSelector } from '../components/import/ImportSourceSelector';
import { ImportDatasetTarget } from '../components/import/ImportDatasetTarget';
import { ImportCleaningToolbar } from '../components/import/ImportCleaningToolbar';
import { ImportMappingTable } from '../components/import/ImportMappingTable';

export const Import: React.FC = () => {
    const {
        // State
        step, setStep,
        text, setText,
        date, setDate,
        fileEncoding, setFileEncoding,
        rawData,
        mapping,
        autoMappedIndices,
        selectedColIndex, setSelectedColIndex,
        previewPage, setPreviewPage,
        rowsPerPage, setRowsPerPage,
        deleteConfirm, setDeleteConfirm,
        isDragging, setIsDragging,
        isProcessingFile,
        fileInputRef,
        tempFieldConfigs,
        targetDatasetId, setTargetDatasetId,
        newDatasetName, setNewDatasetName,
        detectedDatasetId,
        updateMode, setUpdateMode,
        successMessage, setSuccessMessage,

        // Data
        datasets,
        paginatedPreviewRows,
        previewTotalPages,

        // Confirm Hook
        isOpen, options, handleConfirm, handleCancel,

        // Handlers
        handleAnalyzeText,
        handleFileSelect,
        handleDrop,
        handleCleanColumn,
        handleRemoveDuplicates,
        handleRemoveRow,
        handleRemoveHeader,
        handleMappingChange,
        handleConfigChange,
        handleFinalizeImport,
        handleBack
    } = useImportLogic();

    const renderInputStep = () => (
        <div className="space-y-6">
            {successMessage && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative flex items-center animate-in fade-in slide-in-from-top-2">
                    <Check className="w-5 h-5 mr-2" />
                    <span>{successMessage}</span>
                    <button onClick={() => setSuccessMessage(null)} className="absolute right-3 top-3 text-green-600 hover:text-green-800">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            <ImportSourceSelector
                date={date}
                setDate={setDate}
                fileEncoding={fileEncoding}
                setFileEncoding={setFileEncoding}
                isDragging={isDragging}
                setIsDragging={setIsDragging}
                isProcessingFile={isProcessingFile}
                onFileSelect={handleFileSelect}
                onDrop={handleDrop}
                fileInputRef={fileInputRef}
                text={text}
                setText={setText}
                onAnalyzeText={handleAnalyzeText}
            />
        </div>
    );

    const renderMappingStep = () => {
        if (!rawData) return null;

        return (
            <div className="space-y-6 animate-in slide-in-from-right duration-300 relative">
                {/* Internal UI Delete Confirmation */}
                {deleteConfirm && (
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[10000] flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-red-100 rounded-full text-red-600">
                                    <AlertTriangle className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800">
                                    {deleteConfirm.type === 'header' ? "Supprimer l'en-tête ?" : "Supprimer cette ligne ?"}
                                </h3>
                            </div>
                            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                                {deleteConfirm.type === 'header'
                                    ? "La ligne d'en-tête actuelle sera supprimée. La première ligne de données deviendra le nouvel en-tête des colonnes."
                                    : "Cette ligne sera exclue de l'import. Cette action est irréversible pour cette session d'import."}
                            </p>
                            <div className="flex justify-end gap-3">
                                <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Annuler</Button>
                                <Button variant="danger" onClick={deleteConfirm.type === 'header' ? handleRemoveHeader : handleRemoveRow}>
                                    Confirmer la suppression
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                <ImportDatasetTarget
                    date={date}
                    setDate={setDate}
                    detectedDatasetId={detectedDatasetId}
                    datasets={datasets}
                    targetDatasetId={targetDatasetId}
                    setTargetDatasetId={setTargetDatasetId}
                    newDatasetName={newDatasetName}
                    setNewDatasetName={setNewDatasetName}
                    updateMode={updateMode}
                    setUpdateMode={setUpdateMode}
                />

                <ImportCleaningToolbar
                    selectedColIndex={selectedColIndex}
                    headerName={selectedColIndex !== null ? rawData.headers[selectedColIndex] : ''}
                    onClean={handleCleanColumn}
                    onRemoveDuplicates={handleRemoveDuplicates}
                />

                <ImportMappingTable
                    rawData={rawData}
                    mapping={mapping}
                    autoMappedIndices={autoMappedIndices}
                    selectedColIndex={selectedColIndex}
                    setSelectedColIndex={setSelectedColIndex}
                    rowsPerPage={rowsPerPage}
                    setRowsPerPage={setRowsPerPage}
                    previewPage={previewPage}
                    setPreviewPage={setPreviewPage}
                    previewTotalPages={previewTotalPages}
                    paginatedPreviewRows={paginatedPreviewRows}
                    targetDatasetId={targetDatasetId}
                    datasets={datasets}
                    tempFieldConfigs={tempFieldConfigs}
                    onMappingChange={handleMappingChange}
                    onConfigChange={handleConfigChange}
                    onDeleteHeader={() => setDeleteConfirm({ type: 'header' })}
                    onDeleteRow={(idx) => setDeleteConfirm({ type: 'row', index: idx })}
                />

                <div className="flex justify-between pt-4 pb-12">
                    <Button variant="outline" onClick={handleBack} icon={<RotateCcw className="w-4 h-4" />}>
                        Recommencer
                    </Button>
                    <Button onClick={handleFinalizeImport} icon={<ArrowRight className="w-4 h-4" />}>
                        {updateMode === 'overwrite' ? 'Écraser et importer' : 'Valider l\'import'}
                    </Button>
                </div>
            </div>
        );
    };

    return (
        <div className="h-full overflow-y-auto p-4 md:p-8 custom-scrollbar">
            <ConfirmDialog
                isOpen={isOpen}
                onClose={handleCancel}
                onConfirm={handleConfirm}
                {...options}
            />
            <div className="space-y-6 pb-12 max-w-[1600px] mx-auto">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-slate-800">Importation des données</h2>
                    <div className="text-sm text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
                        Étape {step === 'input' ? '1/2' : '2/2'}
                    </div>
                </div>

                {step === 'input' && renderInputStep()}
                {step === 'mapping' && renderMappingStep()}
            </div>
        </div>
    );
};
