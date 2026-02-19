import React from 'react';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import {
    RotateCcw, ArrowRight, Check, X, AlertTriangle, Sparkles, BarChart3, Info
} from 'lucide-react';
import { useImportLogic } from '../hooks/useImportLogic';
import { ImportSourceSelector } from '../components/import/ImportSourceSelector';
import { ImportDatasetTarget } from '../components/import/ImportDatasetTarget';
import { ImportCleaningToolbar } from '../components/import/ImportCleaningToolbar';
import { ImportMappingTable } from '../components/import/ImportMappingTable';

export const Import: React.FC = () => {
    const {
        // State
        step,
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
        lastImportProfile, setLastImportProfile,

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
                <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-xl relative animate-in fade-in slide-in-from-top-2 shadow-sm">
                    <div className="flex items-start gap-4">
                        <div className="bg-green-100 p-2 rounded-full text-green-600 shrink-0">
                            <Check className="w-5 h-5" />
                        </div>
                        <div className="flex-1 pr-8">
                            <h4 className="font-bold mb-1">{successMessage}</h4>

                            {lastImportProfile && (
                                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="bg-white/60 p-3 rounded-lg border border-green-100">
                                        <div className="text-[10px] uppercase font-bold text-green-600 mb-1 flex items-center gap-1.5"><BarChart3 className="w-3 h-3" /> Qualité</div>
                                        <div className="text-xl font-black">{Math.round(lastImportProfile.qualityScore)}%</div>
                                    </div>
                                    <div className="bg-white/60 p-3 rounded-lg border border-green-100">
                                        <div className="text-[10px] uppercase font-bold text-green-600 mb-1 flex items-center gap-1.5"><Info className="w-3 h-3" /> Colonnes</div>
                                        <div className="text-xl font-black">{lastImportProfile.columnCount}</div>
                                    </div>
                                    <div className="bg-white/60 p-3 rounded-lg border border-green-100">
                                        <div className="text-[10px] uppercase font-bold text-green-600 mb-1 flex items-center gap-1.5"><Sparkles className="w-3 h-3" /> Score</div>
                                        <div className="text-xl font-black">{lastImportProfile.qualityScore > 90 ? 'Excellent' : 'Bon'}</div>
                                    </div>
                                </div>
                            )}

                            <p className="mt-3 text-xs font-medium text-green-600">
                                Vous pouvez maintenant consulter vos données dans l'onglet "Données" ou créer une analyse dans le "Studio".
                            </p>
                        </div>
                        <button
                            onClick={() => { setSuccessMessage(null); setLastImportProfile(null); }}
                            className="absolute right-4 top-4 text-green-400 hover:text-green-600 p-1 hover:bg-green-100 rounded-full transition-all"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
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
