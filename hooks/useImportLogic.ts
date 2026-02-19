import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useData } from '../context/DataContext';
import { useConfirm } from './useConfirm';
import {
    parseRawData, mapDataToSchema, areHeadersSimilar,
    detectUnit, detectColumnType, readExcelFile, readTextFile,
    notify
} from '../utils';
import { RawImportData, FieldConfig } from '../types';
import { profileDataset, DatasetProfile } from '../logic/dataProfiling';

export const useImportLogic = () => {
    const {
        addBatch, savedMappings, updateSavedMappings,
        datasets, createDataset, addFieldToDataset, updateDatasetConfigs, switchDataset, deleteDataset
    } = useData();
    const { confirm, isOpen, options, handleConfirm, handleCancel } = useConfirm();

    // --- State ---
    const [step, setStep] = useState<'input' | 'mapping'>('input');
    const [text, setText] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    // File Encoding Option
    const [fileEncoding, setFileEncoding] = useState<'auto' | 'UTF-8' | 'windows-1252'>('auto');

    const [rawData, setRawData] = useState<RawImportData | null>(null);
    const [mapping, setMapping] = useState<Record<number, string | 'ignore'>>({});
    const [autoMappedIndices, setAutoMappedIndices] = useState<number[]>([]);
    const [selectedColIndex, setSelectedColIndex] = useState<number | null>(null);

    // Pagination for Preview
    const [previewPage, setPreviewPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Delete Confirmation State (Internal UI state, not for useConfirm)
    const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'row' | 'header', index?: number } | null>(null);

    // Status State
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessingFile, setIsProcessingFile] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Configuration des champs (Types & Unités)
    const [tempFieldConfigs, setTempFieldConfigs] = useState<Record<string, FieldConfig>>({});

    // New Dataset Logic
    const [targetDatasetId, setTargetDatasetId] = useState<string | 'NEW'>('NEW');
    const [newDatasetName, setNewDatasetName] = useState<string>('');
    const [detectedDatasetId, setDetectedDatasetId] = useState<string | null>(null);

    // Conflict Resolution
    const [updateMode, setUpdateMode] = useState<'merge' | 'overwrite'>('merge');

    // Success Message & Profiling
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [lastImportProfile, setLastImportProfile] = useState<DatasetProfile | null>(null);

    // --- Effects ---
    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    // Recalculer le mapping et les configs par défaut
    useEffect(() => {
        if (step !== 'mapping' || !rawData) return;

        const initialMapping: Record<number, string | 'ignore'> = {};
        const detectedFromHistory: number[] = [];
        const initialConfigs: Record<string, FieldConfig> = {};

        let availableFields: string[] = [];
        let existingConfigs: Record<string, FieldConfig> = {};

        if (targetDatasetId !== 'NEW') {
            const targetDS = datasets.find(d => d.id === targetDatasetId);
            if (targetDS) {
                availableFields = targetDS.fields;
                existingConfigs = targetDS.fieldConfigs || {};
            }
        }

        // Mapping Logic
        rawData.headers.forEach((header, index) => {
            const h = header.trim();
            let mappedName = '';

            if (targetDatasetId === 'NEW') {
                mappedName = h;
                initialMapping[index] = h;
            } else {
                if (savedMappings[h] && availableFields.includes(savedMappings[h])) {
                    initialMapping[index] = savedMappings[h];
                    mappedName = savedMappings[h];
                    detectedFromHistory.push(index);
                } else if (availableFields.includes(h)) {
                    initialMapping[index] = h;
                    mappedName = h;
                } else {
                    if (h.length > 1) {
                        initialMapping[index] = h;
                        mappedName = h;
                    } else {
                        initialMapping[index] = 'ignore';
                    }
                }
            }

            // Détection de type et unité pour le champ mappé
            if (mappedName && mappedName !== 'ignore') {
                if (existingConfigs[mappedName]) {
                    initialConfigs[mappedName] = existingConfigs[mappedName];
                } else {
                    const allColumnValues = rawData.rows.map(r => r[index] || '');
                    const detectedType = detectColumnType(allColumnValues);

                    if (detectedType === 'number') {
                        const detectedUnit = detectUnit(allColumnValues);
                        initialConfigs[mappedName] = { type: 'number', unit: detectedUnit };
                    } else {
                        initialConfigs[mappedName] = { type: detectedType };
                    }
                }
            }
        });

        setMapping(initialMapping);
        setAutoMappedIndices(detectedFromHistory);
        setTempFieldConfigs(initialConfigs);
    }, [targetDatasetId, step, rawData, datasets, savedMappings]);

    // --- Handlers ---
    const processImportData = useCallback((result: RawImportData) => {
        setRawData(result);
        setPreviewPage(1);

        let matchedId: string | null = null;
        for (const ds of datasets) {
            if (areHeadersSimilar(ds.fields, result.headers)) {
                matchedId = ds.id;
                break;
            }
        }

        if (matchedId) {
            setDetectedDatasetId(matchedId);
            setTargetDatasetId(matchedId);
        } else {
            setDetectedDatasetId(null);
            setTargetDatasetId('NEW');
            setNewDatasetName(`Données du ${new Date().toLocaleDateString('fr-FR')}`);
        }

        setStep('mapping');
        setUpdateMode('merge');
        setTempFieldConfigs({});
    }, [datasets]);

    const handleAnalyzeText = useCallback(() => {
        if (!text.trim()) return;
        try {
            const result = parseRawData(text);
            processImportData(result);
        } catch {
            notify.error("Erreur lors de l'analyse du texte.");
        }
    }, [text, processImportData]);

    const processFile = useCallback(async (file: File) => {
        setIsProcessingFile(true);
        try {
            let result: RawImportData;
            if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                result = await readExcelFile(file);
            } else {
                const textContent = await readTextFile(file, fileEncoding);
                result = parseRawData(textContent);
            }

            if (result.totalRows === 0) {
                notify.warning("Le fichier semble vide ou mal formaté.");
            } else {
                processImportData(result);
            }
        } catch (err) {
            console.error(err);
            notify.error("Erreur lors de la lecture du fichier. Vérifiez le format.");
        } finally {
            setIsProcessingFile(false);
        }
    }, [fileEncoding, processImportData]);

    const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            await processFile(e.target.files[0]);
        }
        e.target.value = '';
    }, [processFile]);

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            await processFile(e.dataTransfer.files[0]);
        }
    }, [processFile]);

    const handleCleanColumn = useCallback((action: 'trim' | 'upper' | 'lower' | 'proper' | 'empty_zero') => {
        if (selectedColIndex === null || !rawData) return;

        const newRows = rawData.rows.map(row => {
            const newRow = [...row];
            let val = String(newRow[selectedColIndex] || '');
            if (action === 'trim') val = val.trim();
            if (action === 'upper') val = val.toUpperCase();
            if (action === 'lower') val = val.toLowerCase();
            if (action === 'proper') val = val.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
            if (action === 'empty_zero') {
                if (!val || val.trim() === '') val = '0';
            }
            newRow[selectedColIndex] = val;
            return newRow;
        });
        setRawData({ ...rawData, rows: newRows });
    }, [selectedColIndex, rawData]);

    const handleRemoveDuplicates = useCallback(() => {
        if (selectedColIndex === null || !rawData) return;

        const seen = new Set<string>();
        const newRows = rawData.rows.filter(row => {
            const val = String(row[selectedColIndex]).trim().toLowerCase();
            if (seen.has(val)) return false;
            seen.add(val);
            return true;
        });

        if (newRows.length < rawData.rows.length) {
            const removed = rawData.rows.length - newRows.length;
            confirm({
                title: 'Supprimer les doublons',
                message: `${removed} doublons détectés sur cette colonne. Voulez-vous les supprimer ?`,
                confirmLabel: 'Supprimer',
                variant: 'danger'
            }).then(confirmed => {
                if (confirmed) {
                    setRawData({ ...rawData, rows: newRows, totalRows: newRows.length });
                    notify.success(`${removed} doublons supprimés.`);
                }
            });
        } else {
            notify.info("Aucun doublon trouvé sur cette colonne.");
        }
    }, [selectedColIndex, rawData, confirm]);

    const handleRemoveRow = useCallback(() => {
        if (!rawData || !deleteConfirm || deleteConfirm.type !== 'row' || deleteConfirm.index === undefined) return;
        const trueIndex = (previewPage - 1) * rowsPerPage + deleteConfirm.index;
        const newRows = [...rawData.rows];
        newRows.splice(trueIndex, 1);
        setRawData({ ...rawData, rows: newRows, totalRows: newRows.length });
        setDeleteConfirm(null);
    }, [rawData, deleteConfirm, previewPage, rowsPerPage]);

    const handleRemoveHeader = useCallback(() => {
        if (!rawData || rawData.rows.length === 0) return;
        const newHeaders = rawData.rows[0];
        const newRows = rawData.rows.slice(1);
        setRawData({ headers: newHeaders, rows: newRows, totalRows: newRows.length });
        setDeleteConfirm(null);
    }, [rawData]);

    const handleMappingChange = useCallback((colIndex: number, value: string) => {
        if (value === '__CREATE_NEW__') {
            if (rawData) {
                const headerName = rawData.headers[colIndex];
                setMapping(prev => ({ ...prev, [colIndex]: headerName }));
            }
        } else {
            setMapping(prev => ({ ...prev, [colIndex]: value }));
        }
        setAutoMappedIndices(prev => prev.filter(i => i !== colIndex));
    }, [rawData]);

    const handleConfigChange = useCallback((fieldName: string, key: keyof FieldConfig, value: string) => {
        setTempFieldConfigs(prev => ({
            ...prev,
            [fieldName]: { ...prev[fieldName], [key]: value }
        }));
    }, []);

    const handleFinalizeImport = useCallback(() => {
        if (!rawData) return;

        let finalDatasetId = targetDatasetId;

        // Gestion Ecraser
        if (targetDatasetId !== 'NEW' && updateMode === 'overwrite') {
            const oldDs = datasets.find(d => d.id === targetDatasetId);
            if (oldDs) {
                const oldName = oldDs.name;
                deleteDataset(targetDatasetId);
                finalDatasetId = createDataset(oldName, [], {});
            }
        }

        const fieldsToProcess = Object.entries(mapping)
        .filter(([, name]) => name !== 'ignore')
            .map(([idx, name]) => ({ name: name as string, idx: parseInt(idx) }));

        const uniqueFieldNames = Array.from(new Set(fieldsToProcess.map(f => f.name)));

        // 1. Creation / Mise à jour structure
        if (targetDatasetId === 'NEW' || (targetDatasetId !== 'NEW' && updateMode === 'overwrite' && finalDatasetId !== targetDatasetId)) {
            if (targetDatasetId === 'NEW') {
                finalDatasetId = createDataset(newDatasetName || 'Nouveau Tableau', uniqueFieldNames, tempFieldConfigs);
            } else {
                uniqueFieldNames.forEach(f => addFieldToDataset(finalDatasetId, f, tempFieldConfigs[f]));
            }
        } else {
            fieldsToProcess.forEach(({ name }) => {
                addFieldToDataset(finalDatasetId, name, tempFieldConfigs[name]);
            });
            updateDatasetConfigs(finalDatasetId, tempFieldConfigs);
        }

        // 2. Création des lignes
        const finalRows = mapDataToSchema(rawData, mapping);

        // 3. Apprentissage
        const newLearnedMappings: Record<string, string> = {};
        rawData.headers.forEach((header, idx) => {
            const mappedField = mapping[idx];
            if (mappedField && mappedField !== 'ignore') {
                newLearnedMappings[header.trim()] = mappedField;
            }
        });
        if (Object.keys(newLearnedMappings).length > 0) {
            updateSavedMappings(newLearnedMappings);
        }

        // 4. Profilage (avant sauvegarde pour le résumé)
        const profile = profileDataset(finalRows);
        setLastImportProfile(profile);

        // 5. Sauvegarde
        addBatch(finalDatasetId, date, finalRows);
        switchDataset(finalDatasetId);

        // Reset
        setText('');
        setRawData(null);
        setMapping({});
        setStep('input');
        setSuccessMessage(`Import réussi ! ${finalRows.length} lignes intégrées.`);
    }, [rawData, targetDatasetId, updateMode, mapping, datasets, newDatasetName, tempFieldConfigs, date, deleteDataset, createDataset, addFieldToDataset, updateDatasetConfigs, mapDataToSchema, updateSavedMappings, addBatch, switchDataset]);

    const paginatedPreviewRows = useMemo(() => {
        if (!rawData) return [];
        const start = (previewPage - 1) * rowsPerPage;
        return rawData.rows.slice(start, start + rowsPerPage);
    }, [rawData, previewPage, rowsPerPage]);

    const previewTotalPages = rawData ? Math.ceil(rawData.totalRows / rowsPerPage) : 0;

    return {
        // State
        step, setStep,
        text, setText,
        date, setDate,
        fileEncoding, setFileEncoding,
        rawData, setRawData,
        mapping, setMapping,
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
        confirm, isOpen, options, handleConfirm, handleCancel,

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
        handleBack: () => step === 'mapping' && setStep('input')
    };
};
