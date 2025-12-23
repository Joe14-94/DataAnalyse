
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useData } from '../context/DataContext';
import { parseRawData, mapDataToSchema, areHeadersSimilar, detectUnit, detectColumnType, readExcelFile, readTextFile } from '../utils';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { DataRow, RawImportData, FieldConfig } from '../types';
import { UploadCloud, ArrowRight, RotateCcw, Check, Edit2, Zap, AlertTriangle, Database, FileSpreadsheet, FileText, X, Wand2, CaseUpper, CaseLower, Eraser, CopyX, ChevronLeft, ChevronRight, Hash, Trash2 } from 'lucide-react';

export const Import: React.FC = () => {
  const { 
    addBatch, savedMappings, updateSavedMappings, 
    datasets, createDataset, addFieldToDataset, updateDatasetConfigs, switchDataset, deleteDataset
  } = useData();
  
  // --- State ---
  const [step, setStep] = useState<'input' | 'mapping' | 'confirm'>('input');
  const [text, setText] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [rawData, setRawData] = useState<RawImportData | null>(null);
  const [mapping, setMapping] = useState<Record<number, string | 'ignore'>>({});
  const [autoMappedIndices, setAutoMappedIndices] = useState<number[]>([]);
  const [selectedColIndex, setSelectedColIndex] = useState<number | null>(null); // For Cleaning

  // Pagination for Preview
  const [previewPage, setPreviewPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Delete Confirmation State
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'row' | 'header', index?: number } | null>(null);

  // Drag & Drop State
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

  // Success Message
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // --- Reset success message on change ---
  useEffect(() => {
     if (successMessage) {
        const timer = setTimeout(() => setSuccessMessage(null), 5000);
        return () => clearTimeout(timer);
     }
  }, [successMessage]);

  // --- Handlers ---

  const processImportData = (result: RawImportData) => {
    setRawData(result);
    setPreviewPage(1); // Reset preview
    
    // 1. Détection de structure
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
      setNewDatasetName(`Données du ${new Date().toLocaleDateString()}`);
    }

    setStep('mapping');
    setUpdateMode('merge'); 
    setTempFieldConfigs({}); // Reset configs
  };

  const handleAnalyzeText = () => {
    if (!text.trim()) return;
    const result = parseRawData(text);
    processImportData(result);
  };

  // FILE HANDLING
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFile(e.target.files[0]);
    }
    // Reset input to allow re-selection
    e.target.value = '';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const processFile = async (file: File) => {
    setIsProcessingFile(true);
    try {
      let result: RawImportData;

      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        result = await readExcelFile(file);
      } else {
        // Assume text/csv
        const textContent = await readTextFile(file);
        result = parseRawData(textContent);
      }

      if (result.totalRows === 0) {
        alert("Le fichier semble vide ou mal formaté.");
      } else {
        processImportData(result);
      }
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la lecture du fichier.");
    } finally {
      setIsProcessingFile(false);
    }
  };

  // DATA CLEANING ACTIONS
  const handleCleanColumn = (action: 'trim' | 'upper' | 'lower' | 'proper' | 'empty_zero') => {
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
  };

  const handleRemoveDuplicates = () => {
     if (selectedColIndex === null || !rawData) return;

     // Keep track of seen values
     const seen = new Set<string>();
     const newRows = rawData.rows.filter(row => {
        const val = String(row[selectedColIndex]).trim().toLowerCase();
        if (seen.has(val)) return false;
        seen.add(val);
        return true;
     });

     if (newRows.length < rawData.rows.length) {
        const removed = rawData.rows.length - newRows.length;
        if (window.confirm(`${removed} doublons détectés sur cette colonne. Voulez-vous les supprimer ?`)) {
           setRawData({ ...rawData, rows: newRows, totalRows: newRows.length });
           setSuccessMessage(`${removed} doublons supprimés.`);
        }
     } else {
        alert("Aucun doublon trouvé sur cette colonne.");
     }
  };

  const handleRemoveRow = () => {
      if (!rawData || !deleteConfirm || deleteConfirm.type !== 'row' || deleteConfirm.index === undefined) return;
      
      // Calculate true index based on page
      const trueIndex = (previewPage - 1) * rowsPerPage + deleteConfirm.index;
      const newRows = [...rawData.rows];
      newRows.splice(trueIndex, 1);
      setRawData({
          ...rawData,
          rows: newRows,
          totalRows: newRows.length
      });
      setDeleteConfirm(null);
  };

  const handleRemoveHeader = () => {
      if (!rawData || rawData.rows.length === 0) return;
      
      const newHeaders = rawData.rows[0];
      const newRows = rawData.rows.slice(1);
      setRawData({
          headers: newHeaders,
          rows: newRows,
          totalRows: newRows.length
      });
      setDeleteConfirm(null);
  };


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
        // Si config existe déjà, on la garde
        if (existingConfigs[mappedName]) {
           initialConfigs[mappedName] = existingConfigs[mappedName];
        } else {
           // Sinon on utilise la détection automatique
           const sampleValues = rawData.rows.slice(0, 20).map(r => r[index] || '');
           const detectedType = detectColumnType(sampleValues);
           
           if (detectedType === 'number') {
              const detectedUnit = detectUnit(sampleValues);
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

  const handleMappingChange = (colIndex: number, value: string) => {
    if (value === '__CREATE_NEW__') {
       if (rawData) {
         const headerName = rawData.headers[colIndex];
         setMapping(prev => ({ ...prev, [colIndex]: headerName }));
       }
    } else {
      setMapping(prev => ({ ...prev, [colIndex]: value }));
    }
    setAutoMappedIndices(prev => prev.filter(i => i !== colIndex));
  };

  const handleConfigChange = (fieldName: string, key: keyof FieldConfig, value: string) => {
    setTempFieldConfigs(prev => ({
      ...prev,
      [fieldName]: { ...prev[fieldName], [key]: value }
    }));
  };

  const handleFinalizeImport = () => {
    if (!rawData) return;

    let finalDatasetId = targetDatasetId;

    // Gestion Ecraser
    if (targetDatasetId !== 'NEW' && updateMode === 'overwrite') {
       const oldDs = datasets.find(d => d.id === targetDatasetId);
       if (oldDs) {
          const oldName = oldDs.name;
          deleteDataset(targetDatasetId);
          finalDatasetId = createDataset(oldName, [], {}); // Empty initially
       }
    }

    const fieldsToProcess = Object.entries(mapping)
      .filter(([_, name]) => name !== 'ignore')
      .map(([idx, name]) => ({ name: name as string, idx: parseInt(idx) }));

    const uniqueFieldNames = Array.from(new Set(fieldsToProcess.map(f => f.name)));

    // 1. Creation / Mise à jour structure
    if (targetDatasetId === 'NEW' || (targetDatasetId !== 'NEW' && updateMode === 'overwrite' && finalDatasetId !== targetDatasetId)) {
       if (targetDatasetId === 'NEW') {
          finalDatasetId = createDataset(newDatasetName || 'Nouveau Tableau', uniqueFieldNames, tempFieldConfigs);
       } else {
         // Cas overwrite recréé
         uniqueFieldNames.forEach(f => addFieldToDataset(finalDatasetId, f, tempFieldConfigs[f]));
       }
    } else {
      // Mode Merge
      fieldsToProcess.forEach(({ name }) => {
         addFieldToDataset(finalDatasetId, name, tempFieldConfigs[name]);
      });
      // Mettre à jour les configs existantes si changées
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

    // 4. Sauvegarde
    addBatch(finalDatasetId, date, finalRows);
    switchDataset(finalDatasetId); 

    // Reset
    setText('');
    setRawData(null);
    setMapping({});
    setStep('input');
    setSuccessMessage(`Import réussi ! ${finalRows.length} lignes intégrées.`);
  };

  const handleBack = () => {
    if (step === 'mapping') setStep('input');
  };

  // --- Render Helpers ---

  // Pagination Logic
  const paginatedPreviewRows = useMemo(() => {
     if (!rawData) return [];
     const start = (previewPage - 1) * rowsPerPage;
     return rawData.rows.slice(start, start + rowsPerPage);
  }, [rawData, previewPage, rowsPerPage]);

  const previewTotalPages = rawData ? Math.ceil(rawData.totalRows / rowsPerPage) : 0;

  // --- Renders ---

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Date & DropZone */}
        <div className="space-y-6">
          <Card className="p-6">
             <label htmlFor="import-date" className="block text-sm font-bold text-slate-700 mb-2">
               1. Date de l'extraction
             </label>
             <input
               type="date"
               id="import-date"
               value={date}
               onChange={(e) => setDate(e.target.value)}
               className="block w-full rounded-md border border-slate-300 bg-white text-slate-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5"
               required
             />
          </Card>

          <Card className="p-6 flex flex-col h-64">
             <label className="block text-sm font-bold text-slate-700 mb-3">
               2. Fichier source
             </label>
             
             <div 
                className={`flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200
                   ${isDragging ? 'border-blue-500 bg-blue-50 scale-[1.02]' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'}
                `}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
             >
                {isProcessingFile ? (
                   <div className="animate-pulse flex flex-col items-center">
                      <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3" />
                      <span className="text-blue-600 font-medium">Lecture du fichier...</span>
                   </div>
                ) : (
                   <>
                      <div className="p-4 bg-white rounded-full shadow-sm mb-3">
                         <UploadCloud className="w-8 h-8 text-blue-600" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-700">Cliquez ou glissez un fichier ici</h3>
                      <p className="text-xs text-slate-500 mt-1">Supporte .xlsx, .xls, .csv, .txt</p>
                      <input 
                         type="file" 
                         ref={fileInputRef} 
                         className="hidden" 
                         accept=".xlsx,.xls,.csv,.txt" 
                         onChange={handleFileSelect}
                      />
                   </>
                )}
             </div>
          </Card>
        </div>

        {/* Right: Copy Paste Fallback */}
        <Card className="p-6 flex flex-col">
           <div className="flex justify-between items-center mb-3">
              <label htmlFor="paste-area" className="block text-sm font-bold text-slate-700">
                3. Ou coller le contenu (Legacy)
              </label>
              <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded">Texte brut</span>
           </div>
           <textarea
             id="paste-area"
             className="flex-1 w-full rounded-md border border-slate-300 bg-white text-slate-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-xs font-mono p-3 resize-none"
             placeholder={`Alternative : Copiez ici les données de votre tableau Excel...\nHeader 1 \t Header 2\nVal 1 \t Val 2`}
             value={text}
             onChange={(e) => setText(e.target.value)}
           />
           <div className="flex justify-end pt-4">
             <Button onClick={handleAnalyzeText} disabled={!text.trim()}>
               Analyser le texte
               <ArrowRight className="w-4 h-4 ml-2" />
             </Button>
           </div>
        </Card>
      </div>
    </div>
  );

  const renderMappingStep = () => {
    if (!rawData) return null;

    const selectedDS = datasets.find(d => d.id === targetDatasetId);
    const availableFields = selectedDS ? selectedDS.fields : [];
    
    const mappedFields = Object.values(mapping).filter(m => m !== 'ignore');
    const newFields = mappedFields.filter(f => !availableFields.includes(f));
    const missingFields = availableFields.filter(f => !mappedFields.includes(f));
    const hasStructureChanges = selectedDS && (newFields.length > 0 || missingFields.length > 0);

    return (
      <div className="space-y-6 animate-in slide-in-from-right duration-300 relative">
        
        {/* CONFIRMATION MODAL */}
        {deleteConfirm && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
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

        {/* Choix du Dataset Cible */}
        <Card className="p-6 border-blue-200 bg-blue-50">
           <div className="flex justify-between items-start">
              <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
                <Database className="w-5 h-5" />
                Destination de l'import
              </h3>
              
              {/* Date Editing in Step 2 */}
              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-md shadow-sm border border-blue-100">
                 <label htmlFor="step2-date" className="text-xs font-bold text-blue-800">Date d'extraction :</label>
                 <input
                   type="date"
                   id="step2-date"
                   value={date}
                   onChange={(e) => setDate(e.target.value)}
                   className="text-sm border-none bg-transparent focus:ring-0 text-slate-700 font-medium p-0 w-32"
                 />
                 <Edit2 className="w-3 h-3 text-blue-400" />
              </div>
           </div>
           
           <div className="space-y-4">
              {detectedDatasetId && (
                 <div className="flex items-center gap-2 text-sm text-green-700 bg-green-100 p-2 rounded border border-green-200">
                    <Check className="w-4 h-4" />
                    Typologie reconnue : <strong>{datasets.find(d => d.id === detectedDatasetId)?.name}</strong>
                 </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <label className={`relative flex items-start p-4 cursor-pointer rounded-lg border-2 transition-all ${targetDatasetId === 'NEW' ? 'border-blue-500 bg-white shadow-md' : 'border-slate-200 bg-slate-50 hover:bg-white'}`}>
                    <input 
                       type="radio" 
                       name="targetDS" 
                       value="NEW" 
                       checked={targetDatasetId === 'NEW'} 
                       onChange={() => setTargetDatasetId('NEW')}
                       className="mt-1 h-4 w-4 text-blue-600 border-gray-300 bg-white focus:ring-blue-500"
                    />
                    <div className="ml-3 w-full">
                       <span className="block text-sm font-medium text-slate-900">Créer une nouvelle typologie</span>
                       {targetDatasetId === 'NEW' && (
                          <input 
                            type="text" 
                            placeholder="Nom du tableau (ex: Ventes 2025)"
                            className="mt-2 block w-full rounded-md border-slate-300 bg-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                            value={newDatasetName}
                            onChange={(e) => setNewDatasetName(e.target.value)}
                            autoFocus
                          />
                       )}
                    </div>
                 </label>

                 {datasets.length > 0 && (
                    <label className={`relative flex items-start p-4 cursor-pointer rounded-lg border-2 transition-all ${targetDatasetId !== 'NEW' ? 'border-blue-500 bg-white shadow-md' : 'border-slate-200 bg-slate-50 hover:bg-white'}`}>
                       <input 
                          type="radio" 
                          name="targetDS" 
                          value="EXISTING_FALLBACK"
                          checked={targetDatasetId !== 'NEW'} 
                          onChange={() => setTargetDatasetId(detectedDatasetId || datasets[0].id)}
                          className="mt-1 h-4 w-4 text-blue-600 border-gray-300 bg-white focus:ring-blue-500"
                       />
                       <div className="ml-3 w-full">
                          <span className="block text-sm font-medium text-slate-900">Ajouter à une typologie existante</span>
                          <select 
                             className="mt-2 block w-full rounded-md border-slate-300 shadow-sm bg-white focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 disabled:opacity-50"
                             value={targetDatasetId !== 'NEW' ? targetDatasetId : ''}
                             onChange={(e) => setTargetDatasetId(e.target.value)}
                             disabled={targetDatasetId === 'NEW'}
                          >
                             {datasets.map(d => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                             ))}
                          </select>
                       </div>
                    </label>
                 )}
              </div>
           </div>
        </Card>

        {/* TOOLBAR CLEANING (Appears when a column is selected) */}
        <div className={`transition-all duration-300 overflow-hidden ${selectedColIndex !== null ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
           <div className="bg-white border border-purple-200 rounded-lg p-4 shadow-sm bg-gradient-to-r from-white to-purple-50">
               <div className="flex items-center gap-2 mb-2 text-purple-800 text-xs font-bold uppercase tracking-wider">
                  <Wand2 className="w-4 h-4" /> 
                  Outils de nettoyage : {selectedColIndex !== null ? rawData.headers[selectedColIndex] : ''}
               </div>
               <div className="flex flex-wrap gap-2">
                  <button onClick={() => handleCleanColumn('trim')} className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 hover:border-purple-300 hover:bg-purple-50 rounded text-xs text-slate-700 transition-colors shadow-sm">
                     <Eraser className="w-3 h-3" /> Trim (Espaces)
                  </button>
                  <button onClick={() => handleCleanColumn('upper')} className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 hover:border-purple-300 hover:bg-purple-50 rounded text-xs text-slate-700 transition-colors shadow-sm">
                     <CaseUpper className="w-3 h-3" /> MAJUSCULE
                  </button>
                  <button onClick={() => handleCleanColumn('lower')} className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 hover:border-purple-300 hover:bg-purple-50 rounded text-xs text-slate-700 transition-colors shadow-sm">
                     <CaseLower className="w-3 h-3" /> minuscule
                  </button>
                  <button onClick={() => handleCleanColumn('proper')} className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 hover:border-purple-300 hover:bg-purple-50 rounded text-xs text-slate-700 transition-colors shadow-sm">
                     <CaseUpper className="w-3 h-3" /> Nom Propre
                  </button>
                  <div className="w-px bg-slate-300 mx-1"></div>
                  <button onClick={handleRemoveDuplicates} className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 hover:border-red-300 hover:bg-red-50 hover:text-red-700 rounded text-xs text-slate-700 transition-colors shadow-sm">
                     <CopyX className="w-3 h-3" /> Dédupliquer
                  </button>
                  <button onClick={() => handleCleanColumn('empty_zero')} className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 hover:border-purple-300 hover:bg-purple-50 rounded text-xs text-slate-700 transition-colors shadow-sm">
                     Vide → 0
                  </button>
               </div>
           </div>
        </div>

        {/* Alerte Evolution */}
        {targetDatasetId !== 'NEW' && hasStructureChanges && (
           <Card className="p-4 border-amber-300 bg-amber-50">
              <div className="flex items-start gap-3">
                 <AlertTriangle className="w-6 h-6 text-amber-600 mt-0.5" />
                 <div className="flex-1">
                    <h4 className="text-base font-bold text-amber-800">Évolution de la structure détectée</h4>
                    <p className="text-sm text-amber-700 mt-1">
                       Le fichier importé comporte des différences avec "<strong>{selectedDS?.name}</strong>".
                    </p>
                    
                    <div className="mt-4 pt-4 border-t border-amber-200">
                       <div className="flex flex-col sm:flex-row gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                             <input type="radio" name="updateMode" value="merge" checked={updateMode === 'merge'} onChange={() => setUpdateMode('merge')} className="text-amber-600 bg-white focus:ring-amber-500" />
                             <span className="text-sm font-bold text-slate-800">Mettre à jour (fusionner)</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                             <input type="radio" name="updateMode" value="overwrite" checked={updateMode === 'overwrite'} onChange={() => setUpdateMode('overwrite')} className="text-amber-600 bg-white focus:ring-amber-500" />
                             <span className="text-sm font-bold text-slate-800">Écraser et remplacer</span>
                          </label>
                       </div>
                    </div>
                 </div>
              </div>
           </Card>
        )}

        {/* Tableau de Mapping */}
        <Card className="overflow-hidden border-slate-200 shadow-md">
          {/* Header Controls */}
          <div className="px-4 py-2 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                 <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                     <FileSpreadsheet className="w-4 h-4" /> Prévisualisation
                 </h4>
                 <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-full">
                    {rawData.totalRows.toLocaleString()} lignes
                 </span>
              </div>
              
              <div className="flex items-center gap-2 text-xs">
                 <span className="text-slate-500">Lignes par page :</span>
                 <select 
                    className="bg-white border border-slate-300 rounded px-2 py-1 text-slate-700 text-xs focus:ring-blue-500 focus:border-blue-500"
                    value={rowsPerPage}
                    onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPreviewPage(1); }}
                 >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                 </select>

                 <div className="w-px h-4 bg-slate-300 mx-2"></div>

                 <button 
                    onClick={() => setPreviewPage(p => Math.max(1, p - 1))}
                    disabled={previewPage === 1}
                    className="p-1 rounded hover:bg-slate-200 disabled:opacity-50 transition-colors"
                 >
                    <ChevronLeft className="w-4 h-4" />
                 </button>
                 <span className="font-mono text-slate-600 min-w-[100px] text-center">
                    {((previewPage - 1) * rowsPerPage) + 1} - {Math.min(previewPage * rowsPerPage, rawData.totalRows)} / {rawData.totalRows}
                 </span>
                 <button 
                    onClick={() => setPreviewPage(p => Math.min(previewTotalPages, p + 1))}
                    disabled={previewPage === previewTotalPages}
                    className="p-1 rounded hover:bg-slate-200 disabled:opacity-50 transition-colors"
                 >
                    <ChevronRight className="w-4 h-4" />
                 </button>
              </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200" style={{ contentVisibility: 'auto' }}>
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-2 py-3 w-10 border-b-2 border-slate-200 text-center">
                        <button 
                            onClick={() => setDeleteConfirm({ type: 'header' })}
                            className="text-slate-400 hover:text-red-600 transition-colors p-1 rounded hover:bg-red-50"
                            title="Supprimer cette ligne d'en-tête (utilise la ligne suivante)"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                  </th> 
                  {rawData.headers.map((header, idx) => {
                    const mappedVal = mapping[idx];
                    const isMapped = mappedVal && mappedVal !== 'ignore';
                    const isAutoDetected = autoMappedIndices.includes(idx);
                    const isSelected = selectedColIndex === idx;
                    
                    return (
                      <th 
                        key={idx} 
                        className={`px-4 py-3 text-left w-64 min-w-[220px] border-b-2 transition-colors cursor-pointer relative group
                           ${isSelected ? 'bg-purple-50 border-purple-500' : (isMapped ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:bg-slate-200')}
                        `}
                        onClick={() => setSelectedColIndex(idx)}
                      >
                        {/* Header Info */}
                        <div className="mb-2 flex items-center justify-between gap-1">
                           <div className="flex items-center gap-1 text-xs font-bold text-slate-500 tracking-wider">
                              {targetDatasetId === 'NEW' ? <FileText className="w-3 h-3" /> : <FileSpreadsheet className="w-3 h-3" />}
                              Source
                           </div>
                           {isAutoDetected && isMapped && (
                            <div className="flex items-center text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                              <Zap className="w-3 h-3 mr-1" fill="currentColor" />
                              Auto
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between">
                           <div className="text-sm font-bold text-slate-900 mb-3 truncate" title={header}>{header}</div>
                           {isSelected && <Wand2 className="w-4 h-4 text-purple-600 mb-3 animate-pulse" />}
                        </div>
                        
                        {/* Sélecteur Mapping */}
                        <div className="mb-3" onClick={e => e.stopPropagation()}>
                          <div className="text-xs font-medium text-slate-500 mb-1">Destination :</div>
                          {targetDatasetId === 'NEW' ? (
                            <input 
                                type="text"
                                className="block w-full rounded-md border-slate-300 text-sm bg-white text-slate-900 focus:border-blue-500 focus:ring-blue-500 shadow-sm p-1.5"
                                value={mapping[idx] || header}
                                onChange={(e) => handleMappingChange(idx, e.target.value)}
                            />
                          ) : (
                            <select
                                className={`block w-full rounded-md border-slate-300 text-sm focus:border-blue-500 focus:ring-blue-500 shadow-sm p-1.5 ${isMapped ? 'bg-white font-medium text-blue-700 border-blue-300' : 'bg-slate-50 text-slate-500'}`}
                                value={mapping[idx] || 'ignore'}
                                onChange={(e) => handleMappingChange(idx, e.target.value)}
                            >
                                <option value="ignore">Ignorer</option>
                                <optgroup label="Champs actuels">
                                  {availableFields.map(f => <option key={f} value={f}>{f}</option>)}
                                </optgroup>
                                <optgroup label="Nouveau champ">
                                  <option value={header} className="text-blue-600 font-bold">+ Ajouter "{header}"</option>
                                </optgroup>
                            </select>
                          )}
                        </div>

                        {/* CONFIGURATION TYPE ET UNITE */}
                        {isMapped && (
                           <div className="bg-white border border-slate-200 rounded p-2 space-y-2 shadow-sm" onClick={e => e.stopPropagation()}>
                              <div className="flex gap-1">
                                 <select
                                    className="block w-full text-xs border-slate-200 rounded bg-slate-50 py-1 focus:ring-1 focus:ring-blue-500"
                                    value={tempFieldConfigs[mappedVal]?.type || 'text'}
                                    onChange={(e) => handleConfigChange(mappedVal, 'type', e.target.value)}
                                 >
                                    <option value="text">Texte</option>
                                    <option value="number">Nombre</option>
                                    <option value="date">Date</option>
                                    <option value="boolean">Oui/Non</option>
                                 </select>
                              </div>
                              
                              {/* Input Unité si Nombre + Echelle */}
                              {tempFieldConfigs[mappedVal]?.type === 'number' && (
                                 <div className="space-y-1 animate-in fade-in duration-200">
                                    <div className="flex gap-1">
                                       <input
                                          type="text"
                                          className="block w-1/2 text-xs border-slate-200 rounded bg-white p-1 placeholder-slate-300 focus:ring-1 focus:ring-blue-500"
                                          placeholder="Unité (€)"
                                          value={tempFieldConfigs[mappedVal]?.unit || ''}
                                          onChange={(e) => handleConfigChange(mappedVal, 'unit', e.target.value)}
                                       />
                                       <input
                                          type="number"
                                          min="0"
                                          max="5"
                                          className="block w-1/2 text-xs border-slate-200 rounded bg-white p-1 placeholder-slate-300 focus:ring-1 focus:ring-blue-500"
                                          placeholder="Décim."
                                          value={tempFieldConfigs[mappedVal]?.decimalPlaces !== undefined ? tempFieldConfigs[mappedVal]?.decimalPlaces : ''}
                                          onChange={(e) => handleConfigChange(mappedVal, 'decimalPlaces', e.target.value)}
                                          title="Nombre de décimales"
                                       />
                                    </div>
                                    
                                    <select
                                        className="block w-full text-[10px] border-slate-200 rounded bg-slate-50 py-1 focus:ring-1 focus:ring-blue-500 text-slate-600"
                                        value={tempFieldConfigs[mappedVal]?.displayScale || 'none'}
                                        onChange={(e) => handleConfigChange(mappedVal, 'displayScale', e.target.value)}
                                        title="Échelle d'affichage"
                                    >
                                        <option value="none">Normal (1:1)</option>
                                        <option value="thousands">Milliers (k)</option>
                                        <option value="millions">Millions (M)</option>
                                        <option value="billions">Milliards (Md)</option>
                                    </select>
                                 </div>
                              )}
                           </div>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {paginatedPreviewRows.map((row, rowIdx) => (
                  <tr key={rowIdx} className="group hover:bg-red-50/50">
                    <td className="px-2 py-2 text-center border-r border-slate-100">
                        <button 
                            onClick={() => setDeleteConfirm({ type: 'row', index: rowIdx })}
                            className="text-slate-300 hover:text-red-600 transition-colors p-1"
                            title="Supprimer cette ligne de l'import"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </td>
                    {row.map((cell, cellIdx) => (
                      <td key={cellIdx} className={`px-4 py-2 text-sm ${mapping[cellIdx] !== 'ignore' ? 'text-slate-900 bg-slate-50/50' : 'text-slate-400'}`}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={handleBack}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Recommencer
          </Button>
          <Button onClick={handleFinalizeImport}>
            <ArrowRight className="w-4 h-4 mr-2" />
            {updateMode === 'overwrite' ? 'Écraser et importer' : 'Valider l\'import'}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full overflow-y-auto p-4 md:p-8 custom-scrollbar">
       <div className="space-y-6 pb-12"> 
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
