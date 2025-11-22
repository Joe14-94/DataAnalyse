
import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { parseRawData, mapDataToSchema, areHeadersSimilar, detectUnit } from '../utils';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { DataRow, RawImportData, FieldConfig } from '../types';
import { UploadCloud, ArrowRight, RotateCcw, Check, Edit2, Zap, AlertTriangle, Database, RefreshCw, Trash2, Settings, Ruler } from 'lucide-react';

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

  const handleAnalyze = () => {
    if (!text.trim()) return;
    const result = parseRawData(text);
    setRawData(result);
    
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
           // Sinon on essaie de deviner sur les 10 premières lignes
           const sampleValues = rawData.rows.slice(0, 10).map(r => r[index] || '');
           const detectedUnit = detectUnit(sampleValues);
           
           if (detectedUnit) {
             initialConfigs[mappedName] = { type: 'number', unit: detectedUnit };
           } else {
             // Si pas d'unité, est-ce que ça ressemble à un nombre pur ?
             const isNumeric = sampleValues.every(v => !v || !isNaN(parseFloat(v.replace(',', '.'))));
             if (isNumeric && sampleValues.some(v => v !== '')) {
               initialConfigs[mappedName] = { type: 'number', unit: '' };
             } else {
               initialConfigs[mappedName] = { type: 'text', unit: '' };
             }
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

  // --- Renders ---

  const renderInputStep = () => (
    <Card className="p-6 space-y-6">
       {successMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4 flex items-center">
             <Check className="w-5 h-5 mr-2" />
             <span>{successMessage}</span>
          </div>
       )}

      <div>
        <label htmlFor="import-date" className="block text-sm font-medium text-slate-700 mb-1">
          Date de l'extraction
        </label>
        <input
          type="date"
          id="import-date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="block w-full max-w-xs rounded-md border border-slate-300 bg-white text-slate-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
          required
        />
      </div>

      <div>
        <label htmlFor="paste-area" className="block text-sm font-medium text-slate-700 mb-1">
          Contenu du tableau (copier/coller)
        </label>
        <div className="relative mt-1">
          <textarea
            id="paste-area"
            rows={12}
            className="block w-full rounded-md border border-slate-300 bg-white text-slate-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm font-mono p-3"
            placeholder={`Copiez ici les données de votre tableau Excel, CSV ou Web.\nAssurez-vous que la première ligne contient les titres des colonnes.`}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={handleAnalyze} disabled={!text.trim()}>
          <UploadCloud className="w-4 h-4 mr-2" />
          Analyser les données
        </Button>
      </div>
    </Card>
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
      <div className="space-y-6">
        
        {/* Choix du Dataset Cible */}
        <Card className="p-6 border-blue-200 bg-blue-50">
           <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
             <Database className="w-5 h-5" />
             Destination de l'import
           </h3>
           
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
                       className="mt-1 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <div className="ml-3 w-full">
                       <span className="block text-sm font-medium text-slate-900">Créer une nouvelle typologie</span>
                       {targetDatasetId === 'NEW' && (
                          <input 
                            type="text" 
                            placeholder="Nom du tableau (ex: Ventes 2025)"
                            className="mt-2 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
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
                          className="mt-1 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                       />
                       <div className="ml-3 w-full">
                          <span className="block text-sm font-medium text-slate-900">Ajouter à une typologie existante</span>
                          <select 
                             className="mt-2 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 disabled:opacity-50"
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
                             <input type="radio" name="updateMode" value="merge" checked={updateMode === 'merge'} onChange={() => setUpdateMode('merge')} className="text-amber-600 focus:ring-amber-500" />
                             <span className="text-sm font-bold text-slate-800">Mettre à jour (fusionner)</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                             <input type="radio" name="updateMode" value="overwrite" checked={updateMode === 'overwrite'} onChange={() => setUpdateMode('overwrite')} className="text-amber-600 focus:ring-amber-500" />
                             <span className="text-sm font-bold text-slate-800">Écraser et remplacer</span>
                          </label>
                       </div>
                    </div>
                 </div>
              </div>
           </Card>
        )}

        {/* Tableau de Mapping */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-100">
                <tr>
                  {rawData.headers.map((header, idx) => {
                    const mappedVal = mapping[idx];
                    const isMapped = mappedVal && mappedVal !== 'ignore';
                    const isAutoDetected = autoMappedIndices.includes(idx);
                    
                    return (
                      <th key={idx} className={`px-4 py-3 text-left w-64 min-w-[220px] border-b-2 ${isMapped ? 'border-blue-500 bg-blue-50' : 'border-transparent'}`}>
                        {/* En-tête original */}
                        <div className="mb-2 flex items-center justify-between gap-1">
                           <div className="flex items-center gap-1 text-xs font-bold text-slate-500 tracking-wider">
                              <Edit2 className="w-3 h-3" />
                              Source
                           </div>
                           {isAutoDetected && isMapped && (
                            <div className="flex items-center text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                              <Zap className="w-3 h-3 mr-1" fill="currentColor" />
                              Auto
                            </div>
                          )}
                        </div>
                        <div className="text-sm font-bold text-slate-900 mb-3 truncate" title={header}>{header}</div>
                        
                        {/* Sélecteur Mapping */}
                        <div className="mb-3">
                          <div className="text-xs font-medium text-slate-500 mb-1">Destination :</div>
                          {targetDatasetId === 'NEW' ? (
                            <input 
                                type="text"
                                className="block w-full rounded-md border-slate-300 text-sm focus:border-blue-500 focus:ring-blue-500 shadow-sm p-1.5"
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
                           <div className="bg-white border border-slate-200 rounded p-2 space-y-2">
                              <div className="flex items-center gap-2">
                                 <Settings className="w-3 h-3 text-slate-400" />
                                 <span className="text-[10px] font-bold text-slate-500">Type de donnée</span>
                              </div>
                              <div className="flex gap-1">
                                 <select
                                    className="block w-full text-xs border-slate-200 rounded bg-slate-50 py-1"
                                    value={tempFieldConfigs[mappedVal]?.type || 'text'}
                                    onChange={(e) => handleConfigChange(mappedVal, 'type', e.target.value)}
                                 >
                                    <option value="text">Texte</option>
                                    <option value="number">Nombre / Montant</option>
                                    <option value="boolean">Oui / Non</option>
                                 </select>
                              </div>
                              
                              {/* Input Unité si Nombre */}
                              {tempFieldConfigs[mappedVal]?.type === 'number' && (
                                 <div className="animate-in fade-in duration-200">
                                    <div className="flex items-center gap-2 mb-1">
                                       <Ruler className="w-3 h-3 text-slate-400" />
                                       <span className="text-[10px] font-bold text-slate-500">Unité (ex: k€)</span>
                                    </div>
                                    <input
                                       type="text"
                                       className="block w-full text-xs border-slate-200 rounded bg-slate-50 p-1 placeholder-slate-300"
                                       placeholder="Aucune"
                                       value={tempFieldConfigs[mappedVal]?.unit || ''}
                                       onChange={(e) => handleConfigChange(mappedVal, 'unit', e.target.value)}
                                    />
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
                {rawData.rows.slice(0, 5).map((row, rowIdx) => (
                  <tr key={rowIdx}>
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
       <div className="max-w-6xl mx-auto space-y-6 pb-12">
         <div className="flex items-center justify-between">
           <h2 className="text-2xl font-bold text-slate-800">Importation des données</h2>
           <div className="text-sm text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200">
             Étape {step === 'input' ? '1/2' : '2/2'}
           </div>
         </div>
   
         {step === 'input' && renderInputStep()}
         {step === 'mapping' && renderMappingStep()}
       </div>
    </div>
  );
};
