
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Database, Plus, ChevronDown, ChevronRight as ChevronRightIcon, Trash2, Calendar, Filter, Table2, Layers, Calculator, GripVertical, X, ArrowUp, ArrowDown, Palette } from 'lucide-react';
import { PivotSourceConfig, Dataset, FilterRule, ImportBatch, FieldConfig, AggregationType, DateGrouping } from '../../types';
import { SOURCE_COLOR_CLASSES } from '../../utils/constants';
import { formatDateFr } from '../../utils';
import { Checkbox } from '../ui/Checkbox';

interface PivotSidePanelProps {
   sources: PivotSourceConfig[];
   datasets: Dataset[];
   datasetBatches: ImportBatch[];
   selectedBatchId: string;
   setSelectedBatchId: (id: string) => void;
   startAddSource: () => void;
   removeSource: (id: string) => void;
   isDataSourcesPanelCollapsed: boolean;
   setIsDataSourcesPanelCollapsed: (v: boolean) => void;
   isTemporalMode: boolean;
   isTemporalConfigPanelCollapsed: boolean;
   setIsTemporalConfigPanelCollapsed: (v: boolean) => void;
   setIsTemporalSourceModalOpen: (v: boolean) => void;
   temporalConfig: any;
   setTemporalConfig: (c: any) => void;
   rowFields: string[];
   setRowFields: (f: string[]) => void;
   colFields: string[];
   setColFields: (f: string[]) => void;
   valField: string;
   handleValFieldChange: (f: string) => void;
   setValField: (f: string) => void;
   aggType: AggregationType;
   setAggType: (t: AggregationType) => void;
   metrics: any[];
   setMetrics: (m: any[]) => void;
   valFormatting: Partial<FieldConfig>;
   setValFormatting: (f: Partial<FieldConfig>) => void;
   filters: FilterRule[];
   setFilters: (f: FilterRule[]) => void;
   isFieldsPanelCollapsed: boolean;
   setIsFieldsPanelCollapsed: (v: boolean) => void;
   groupedFields: any[];
   expandedSections: Record<string, boolean>;
   toggleSection: (id: string) => void;
   usedFields: Set<string>;
   allAvailableFields: string[];
   primaryDataset: Dataset | null;
   colGrouping: DateGrouping;
   setColGrouping: (g: DateGrouping) => void;
   isColFieldDate: boolean;
   showSubtotals: boolean;
   setShowSubtotals: (v: boolean) => void;
   showTotalCol: boolean;
   setShowTotalCol: (v: boolean) => void;
   showVariations: boolean;
   setShowVariations: (v: boolean) => void;
   handleDragStart: (e: React.DragEvent, field: string, source: any) => void;
   handleDragOver: (e: React.DragEvent) => void;
   handleDrop: (e: React.DragEvent, targetZone: any) => void;
   removeField: (zone: any, field: string, index?: number) => void;
   draggedField: string | null;
   openCalcModal?: () => void;
   removeCalculatedField?: (id: string) => void;
   openEditCalcModal?: (field: any) => void;
   openFormattingModal: () => void;
}

const FieldChip: React.FC<{
   field: string,
   zone: string,
   onDelete?: () => void,
   onEdit?: () => void,
   disabled?: boolean,
   color?: string,
   handleDragStart: (e: React.DragEvent, field: string, source: any) => void,
   isCalculated?: boolean
}> = ({ field, zone, onDelete, onEdit, disabled, color = 'blue', handleDragStart, isCalculated }) => {
   const isJoined = field.startsWith('[');
   const displayLabel = field.includes('] ') ? field.split('] ')[1] : field;
   const colorClasses = (SOURCE_COLOR_CLASSES as any)[color] || SOURCE_COLOR_CLASSES.blue;

   let baseStyle = `bg-white border-slate-200 text-slate-700 ${colorClasses.hover}`;
   if (isJoined) baseStyle = `${colorClasses.bg} ${colorClasses.border} ${colorClasses.text}`;

   if (disabled && zone === 'list') {
       baseStyle = 'bg-slate-100 text-slate-400 border-slate-200 opacity-60 cursor-not-allowed';
   }

   return (
       <div
           draggable={!disabled}
           onDragStart={(e) => {
               if (disabled) {
                   e.preventDefault();
                   return;
               }
               handleDragStart(e, field, zone);
           }}
           className={`group flex items-center justify-between gap-1.5 px-1.5 py-1 border rounded shadow-sm hover:shadow-md active:cursor-grabbing text-xs font-medium select-none
           ${baseStyle} ${!disabled ? 'cursor-grab' : ''}
       `}
       >
           <div className="flex items-center gap-1 overflow-hidden flex-1">
               <GripVertical className={`w-2.5 h-2.5 flex-shrink-0 ${disabled ? 'text-slate-300' : 'text-slate-400'}`} />
               {isCalculated && <Calculator className="w-2.5 h-2.5 text-indigo-500 flex-shrink-0" />}
               <span className="truncate" title={field}>{displayLabel}</span>
           </div>
           <div className="flex items-center gap-0.5">
               {onEdit && (
                   <button
                       onClick={(e) => { e.stopPropagation(); onEdit(); }}
                       className="p-0.5 hover:bg-indigo-50 text-indigo-400 hover:text-indigo-600 rounded transition-colors"
                       title="Modifier"
                   >
                       <Plus className="w-2.5 h-2.5" />
                   </button>
               )}
               {onDelete && (
                   <button
                       onClick={(e) => { e.stopPropagation(); onDelete(); }}
                       className="p-0.5 hover:bg-red-50 text-red-400 hover:text-red-600 rounded transition-colors bg-white/50 shadow-sm"
                       title="Supprimer"
                   >
                       <X className="w-2.5 h-2.5" />
                   </button>
               )}
           </div>
       </div>
   );
};

export const PivotSidePanel: React.FC<PivotSidePanelProps> = (props) => {
   const [fieldsZoneHeight, setFieldsZoneHeight] = useState(240);
   const [dropZonesHeight, setDropZonesHeight] = useState(300);
   const [fieldSearchTerm, setFieldSearchTerm] = useState('');
   const isResizing = useRef(false);
   const isResizingDropZones = useRef(false);
   const panelRef = useRef<HTMLDivElement>(null);
   const dropZonesRef = useRef<HTMLDivElement>(null);

   const handleMouseMove = useCallback((e: MouseEvent) => {
      if (!panelRef.current) return;
      const rect = panelRef.current.getBoundingClientRect();

      if (isResizing.current) {
         // Calculate height based on mouse Y relative to the top of the panel
         const headerOffset = 200;
         const newHeight = e.clientY - rect.top - headerOffset;
         setFieldsZoneHeight(Math.max(100, Math.min(newHeight, 800)));
      } else if (isResizingDropZones.current && dropZonesRef.current) {
         const dropZonesRect = dropZonesRef.current.getBoundingClientRect();
         const newHeight = e.clientY - dropZonesRect.top;
         setDropZonesHeight(Math.max(80, Math.min(newHeight, 600)));
      }
   }, []);

   const handleMouseUp = useCallback(() => {
      isResizing.current = false;
      isResizingDropZones.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
   }, [handleMouseMove]);

   const handleMouseDown = (e: React.MouseEvent) => {
      isResizing.current = true;
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
   };

   const handleDropZonesMouseDown = (e: React.MouseEvent) => {
      isResizingDropZones.current = true;
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
   };

   // Clean up listeners on unmount
   useEffect(() => {
      return () => {
         document.removeEventListener('mousemove', handleMouseMove);
         document.removeEventListener('mouseup', handleMouseUp);
      };
   }, [handleMouseMove, handleMouseUp]);

   const {
      sources, datasets, datasetBatches, selectedBatchId, setSelectedBatchId, startAddSource, removeSource,
      isDataSourcesPanelCollapsed, setIsDataSourcesPanelCollapsed, isTemporalMode, isTemporalConfigPanelCollapsed,
      setIsTemporalConfigPanelCollapsed, setIsTemporalSourceModalOpen, temporalConfig, setTemporalConfig,
      rowFields, setRowFields, colFields, setColFields, valField, handleValFieldChange, setValField,
      aggType, setAggType, metrics, setMetrics, valFormatting, setValFormatting, filters, setFilters,
      isFieldsPanelCollapsed, setIsFieldsPanelCollapsed, groupedFields, expandedSections, toggleSection, usedFields,
      allAvailableFields, primaryDataset, colGrouping, setColGrouping, isColFieldDate,
      showSubtotals, setShowSubtotals, showTotalCol, setShowTotalCol, showVariations, setShowVariations,
      handleDragStart, handleDragOver, handleDrop, removeField, draggedField, openCalcModal,
      removeCalculatedField, openEditCalcModal
   } = props;

   return (
      <div ref={panelRef} className="xl:w-72 flex-shrink-0 flex flex-col gap-2 min-w-0 h-full overflow-hidden">
         {/* 1. DATA SOURCES STACK */}
         <div className="bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col overflow-hidden min-h-[40px]" style={{ maxHeight: isDataSourcesPanelCollapsed ? '40px' : '220px' }}>
            <div className="p-2 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200">
               <h3 className="text-sm font-bold text-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                     <Database className="w-3.5 h-3.5 text-blue-600" />
                     Sources de données
                  </div>
                  <button onClick={() => setIsDataSourcesPanelCollapsed(!isDataSourcesPanelCollapsed)} className="text-slate-500 hover:text-slate-700 transition-colors">
                     {isDataSourcesPanelCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4 rotate-90" />}
                  </button>
               </h3>
            </div>

            {!isDataSourcesPanelCollapsed && (
               <div className="p-2 space-y-2 overflow-y-auto custom-scrollbar flex-1">
                  {sources.length === 0 ? (
                     <div className="text-center p-6 border-2 border-dashed border-blue-300 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50">
                        <Database className="w-10 h-10 mx-auto text-blue-400 mb-2" />
                        <p className="text-xs text-slate-500 mb-2">Sélectionnez une source de données</p>
                        <button onClick={startAddSource} className="w-full py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700">
                           + Définir source principale
                        </button>
                     </div>
                  ) : (
                     <div className="space-y-2">
                        {sources.map((src) => {
                           const ds = datasets.find(d => d.id === src.datasetId);
                           if (!ds) return null;
                           const srcColorClasses = (SOURCE_COLOR_CLASSES as any)[src.color] || SOURCE_COLOR_CLASSES.blue;
                           return (
                              <div key={src.id} className={`relative pl-2 border-l-2 ${srcColorClasses.border} ${srcColorClasses.bg} rounded-r-lg p-2 group`}>
                                 <div className="flex justify-between items-center mb-1">
                                    <div className={`text-xs font-bold ${srcColorClasses.text} flex items-center gap-1.5 overflow-hidden`}>
                                       {src.isPrimary ? <Database className="w-3 h-3 flex-shrink-0" /> : <Plus className="w-3 h-3 flex-shrink-0 rotate-45" />}
                                       <span className="truncate">{ds.name}</span>
                                    </div>
                                    <button onClick={() => removeSource(src.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                       <Trash2 className="w-4 h-4" />
                                    </button>
                                 </div>
                                 {src.isPrimary ? (
                                    <select className="w-full text-xs border border-slate-300 rounded px-1 py-0.5" value={selectedBatchId} onChange={(e) => setSelectedBatchId(e.target.value)}>
                                       {datasetBatches.map(b => <option key={b.id} value={b.id}>{formatDateFr(b.date)}</option>)}
                                    </select>
                                 ) : (
                                    <div className="text-[10px] text-slate-500 truncate">Jointure: {src.joinConfig?.primaryKey} = {src.joinConfig?.secondaryKey}</div>
                                 )}
                              </div>
                           );
                        })}
                        <button onClick={startAddSource} className="w-full py-1 border-2 border-dashed border-slate-300 rounded text-slate-500 hover:text-blue-600 hover:border-blue-400 text-xs font-bold flex items-center justify-center gap-1">
                           <Plus className="w-3 h-3" /> Gérer les sources
                        </button>
                     </div>
                  )}
               </div>
            )}
         </div>

         {/* 2. TEMPORAL COMPARISON CONFIG */}
         {isTemporalMode && (
            <div className="bg-white rounded-lg border border-blue-300 shadow-sm flex flex-col overflow-hidden" style={{ maxHeight: isTemporalConfigPanelCollapsed ? '40px' : 'none' }}>
               <div className="p-2 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-200">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center justify-between gap-2">
                     <div className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-purple-600" /> Configuration</div>
                     <button onClick={() => setIsTemporalConfigPanelCollapsed(!isTemporalConfigPanelCollapsed)} className="text-slate-500 transition-colors">
                        {isTemporalConfigPanelCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4 rotate-90" />}
                     </button>
                  </h3>
               </div>
               {!isTemporalConfigPanelCollapsed && (
                  <div className="p-2 space-y-2 overflow-y-auto custom-scrollbar">
                     <button onClick={() => setIsTemporalSourceModalOpen(true)} className="w-full px-2 py-1 text-xs bg-purple-50 text-purple-700 border border-purple-300 rounded hover:bg-purple-100 font-bold" disabled={!primaryDataset}>
                        + Configurer les sources
                     </button>
                     {temporalConfig && (
                        <>
                           <div>
                              <label className="text-xs font-bold text-slate-600 mb-1 block">Regrouper par</label>
                              <div className="space-y-1 mb-2">
                                 {rowFields.map((field, idx) => (
                                    <div key={field} className="flex items-center gap-1 bg-blue-50 border border-blue-300 rounded px-1.5 py-0.5">
                                       <span className="text-xs font-medium text-blue-700 flex-1">{field}</span>
                                       <div className="flex items-center gap-0.5">
                                          <button onClick={() => { if (idx > 0) { const n = [...rowFields]; [n[idx - 1], n[idx]] = [n[idx], n[idx - 1]]; setRowFields(n); } }} disabled={idx === 0} className="p-0.5 text-blue-600 hover:bg-blue-200 rounded disabled:opacity-30"><ArrowUp className="w-3 h-3" /></button>
                                          <button onClick={() => { if (idx < rowFields.length - 1) { const n = [...rowFields]; [n[idx + 1], n[idx]] = [n[idx], n[idx + 1]]; setRowFields(n); } }} disabled={idx === rowFields.length - 1} className="p-0.5 text-blue-600 hover:bg-blue-200 rounded disabled:opacity-30"><ArrowDown className="w-3 h-3" /></button>
                                          <button onClick={() => setRowFields(rowFields.filter(f => f !== field))} className="p-0.5 text-red-500 hover:bg-red-100 rounded"><X className="w-3 h-3" /></button>
                                       </div>
                                    </div>
                                 ))}
                              </div>
                              <select className="w-full text-xs border border-slate-300 rounded px-1 py-1 bg-white" value="" onChange={(e) => { if (e.target.value && !rowFields.includes(e.target.value)) setRowFields([...rowFields, e.target.value]); }} disabled={!primaryDataset}>
                                 <option value="">+ Ajouter un champ...</option>
                                 {allAvailableFields.filter(field => !rowFields.includes(field)).map(field => <option key={field} value={field}>{field}</option>)}
                              </select>
                           </div>
                           <div>
                              <label className="text-xs font-bold text-slate-600 mb-1 block">Valeur à agréger</label>
                              <select className="w-full text-xs border border-slate-300 rounded px-1 py-1 bg-white" value={valField} onChange={(e) => handleValFieldChange(e.target.value)} disabled={!primaryDataset}>
                                 <option value="">-- Choisissez --</option>
                                 {allAvailableFields.map(field => <option key={field} value={field}>{field}</option>)}
                              </select>
                           </div>
                        </>
                     )}
                  </div>
               )}
            </div>
         )}

         {/* 3. FIELDS ACCORDION */}
         <div
            className={`bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col overflow-hidden ${isFieldsPanelCollapsed ? 'flex-none' : ''}`}
            style={{
               minHeight: isFieldsPanelCollapsed ? '40px' : '100px',
               maxHeight: isFieldsPanelCollapsed ? '40px' : 'none',
               height: isFieldsPanelCollapsed ? '40px' : `${fieldsZoneHeight}px`
            }}
         >
            <div className="p-2 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200">
               <div className="flex items-center justify-between gap-2 mb-1.5">
                  <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2"><Table2 className="w-3 h-3 text-green-600" /> Champs</h3>
                  <button onClick={() => setIsFieldsPanelCollapsed(!isFieldsPanelCollapsed)} className="text-slate-500">
                     {isFieldsPanelCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4 rotate-90" />}
                  </button>
               </div>
               {!isFieldsPanelCollapsed && (
                  <input
                     type="text"
                     placeholder="Rechercher..."
                     className="w-full text-xs border border-slate-300 rounded px-1 py-0.5 bg-white"
                     disabled={sources.length === 0}
                     value={fieldSearchTerm}
                     onChange={(e) => setFieldSearchTerm(e.target.value)}
                  />
               )}
            </div>
            {!isFieldsPanelCollapsed && (
               <div
                  onDragOver={handleDragOver}
                  onDrop={(e) => {
                     e.preventDefault();
                     try {
                        const data = JSON.parse(e.dataTransfer.getData('application/json'));
                        const { field, source } = data;
                        if (source !== 'list') {
                           removeField(source, field);
                        }
                     } catch (err) {
                        console.error("Error on drop in fields list:", err);
                     }
                  }}
                  className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1"
               >
                  {groupedFields.map(group => {
                     const filteredFields = group.fields.filter((f: string) =>
                        f.toLowerCase().includes(fieldSearchTerm.toLowerCase())
                     );

                     if (fieldSearchTerm && filteredFields.length === 0) return null;

                     return (
                        <div key={group.id} className="mb-2">
                           <button onClick={() => toggleSection(group.id)} className={`w-full flex items-center gap-1 text-[10px] font-bold px-1.5 py-1 rounded transition-colors ${(SOURCE_COLOR_CLASSES as any)[group.color]?.text || 'text-slate-600'} ${(SOURCE_COLOR_CLASSES as any)[group.color]?.bg || 'bg-slate-100'}`}>
                              {expandedSections[group.id] || fieldSearchTerm ? <ChevronDown className="w-2 h-2" /> : <ChevronRightIcon className="w-2 h-2" />}{group.name}
                           </button>
                           {(expandedSections[group.id] || fieldSearchTerm) && (
                              <div className="mt-1 pl-2 space-y-1">
                                 {filteredFields.map((f: string) => {
                                    const calcField = primaryDataset?.calculatedFields?.find(cf => cf.name === f);
                                    return (
                                       <FieldChip
                                          key={f}
                                          field={f}
                                          zone="list"
                                          disabled={usedFields.has(f)}
                                          color={group.color}
                                          handleDragStart={handleDragStart}
                                          isCalculated={!!calcField}
                                          onEdit={calcField && openEditCalcModal ? () => openEditCalcModal(calcField) : undefined}
                                          onDelete={calcField && removeCalculatedField ? () => {
                                             if (confirm(`Supprimer le champ calculé "${f}" ?`)) {
                                                removeCalculatedField(calcField.id);
                                             }
                                          } : undefined}
                                       />
                                    );
                                 })}
                              </div>
                           )}
                        </div>
                     );
                  })}
               </div>
            )}
         </div>

         {/* RESIZER SEPARATOR */}
         {!isFieldsPanelCollapsed && !isTemporalMode && sources.length > 0 && (
            <div
               onMouseDown={handleMouseDown}
               className="h-1.5 hover:h-2 bg-slate-200 hover:bg-indigo-400 cursor-row-resize transition-all rounded-full mx-12 -my-1 z-10 flex items-center justify-center group"
               title="Redimensionner les zones"
            >
               <div className="w-8 h-0.5 bg-slate-400 rounded-full group-hover:bg-white opacity-50 group-hover:opacity-100"></div>
            </div>
         )}

         {/* 4. DROP ZONES */}
         {!isTemporalMode && (
            <div ref={dropZonesRef} className={`flex flex-col gap-2 transition-opacity flex-1 min-h-0 ${sources.length === 0 ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
               <div className="grid grid-cols-2 gap-2 min-h-0" style={{ height: `${dropZonesHeight}px` }}>
                  <div onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, 'filter')} className={`bg-white rounded border-2 border-dashed p-1 overflow-auto custom-scrollbar ${draggedField ? 'border-blue-300 bg-blue-50/30' : 'border-slate-200'}`}>
                     <div className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1 sticky top-0 bg-white/90 backdrop-blur-sm z-10"><Filter className="w-2 h-2" /> Filtres</div>
                     <div className="space-y-2">
                        {filters.map((f, idx) => (
                           <div key={idx} className="p-1.5 bg-slate-50 rounded border border-slate-200">
                              <FieldChip field={f.field} zone="filter" onDelete={() => removeField('filter', f.field)} handleDragStart={handleDragStart} />
                              <div className="flex flex-col gap-1 mt-1.5">
                                 <select
                                    className="w-full text-[10px] border border-slate-200 rounded p-1 bg-white font-medium"
                                    value={f.operator || 'eq'}
                                    onChange={(e) => {
                                       const n = [...filters];
                                       const newOp = e.target.value as any;
                                       n[idx] = { ...n[idx], operator: newOp };
                                       // Ajuster la valeur si on passe de IN à autre chose ou inversement
                                       if (newOp === 'in' && !Array.isArray(n[idx].value)) {
                                          n[idx].value = n[idx].value ? [String(n[idx].value)] : [];
                                       } else if (newOp !== 'in' && Array.isArray(n[idx].value)) {
                                          n[idx].value = n[idx].value.join(', ');
                                       }
                                       setFilters(n);
                                    }}
                                 >
                                    <option value="eq">Egal à</option>
                                    <option value="in">Dans la liste</option>
                                    <option value="contains">Contient</option>
                                    <option value="starts_with">Commence par</option>
                                    <option value="gt">&gt;</option>
                                    <option value="lt">&lt;</option>
                                 </select>
                                 <input
                                    type="text"
                                    className="w-full text-[10px] border border-slate-200 rounded p-1 bg-white"
                                    placeholder={f.operator === 'in' ? "Valeur1, Valeur2..." : "Valeur..."}
                                    value={Array.isArray(f.value) ? f.value.join(', ') : (f.value || '')}
                                    onChange={(e) => {
                                       const n = [...filters];
                                       const val = e.target.value;
                                       if (f.operator === 'in') {
                                          n[idx] = { ...n[idx], value: val.split(',').map(v => v.trim()).filter(v => v !== '') };
                                       } else {
                                          n[idx] = { ...n[idx], value: val };
                                       }
                                       setFilters(n);
                                    }}
                                 />
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
                  <div onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, 'col')} className={`bg-white rounded border-2 border-dashed p-1 overflow-auto custom-scrollbar ${draggedField ? 'border-blue-300 bg-blue-50/30' : 'border-slate-200'}`}>
                     <div className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1 sticky top-0 bg-white/90 backdrop-blur-sm z-10"><Table2 className="w-2 h-2" /> Colonnes</div>
                     <div className="space-y-1">
                        {colFields.map(f => <FieldChip key={f} field={f} zone="col" onDelete={() => removeField('col', f)} handleDragStart={handleDragStart} />)}
                        {isColFieldDate && <select className="w-full text-[10px] border-slate-200 rounded bg-slate-50 p-0.5" value={colGrouping} onChange={(e) => setColGrouping(e.target.value as any)}><option value="none">Brut</option><option value="year">Année</option><option value="quarter">T.</option><option value="month">Mois</option></select>}
                     </div>
                  </div>
               </div>

               {/* INTERNAL SPLITTER FOR DROP ZONES */}
               <div
                  onMouseDown={handleDropZonesMouseDown}
                  className="h-1 bg-slate-100 hover:bg-blue-400 cursor-row-resize transition-all rounded-full mx-8 -my-1.5 z-10 flex items-center justify-center group"
                  title="Redimensionner les zones de dépôt"
               >
                  <div className="w-4 h-0.5 bg-slate-300 rounded-full group-hover:bg-white opacity-50 group-hover:opacity-100"></div>
               </div>

               <div className="grid grid-cols-2 gap-2 flex-1 min-h-0">
                  <div onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, 'row')} className={`bg-white rounded border-2 border-dashed p-1 overflow-auto custom-scrollbar ${draggedField ? 'border-blue-300 bg-blue-50/30' : 'border-slate-200'}`}>
                     <div className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1 sticky top-0 bg-white/90 backdrop-blur-sm z-10"><Layers className="w-2 h-2" /> Lignes</div>
                     {rowFields.map(f => <FieldChip key={f} field={f} zone="row" onDelete={() => removeField('row', f)} handleDragStart={handleDragStart} />)}
                  </div>
                  <div onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, 'val')} className={`bg-white rounded border-2 border-dashed p-1 overflow-auto custom-scrollbar ${draggedField ? 'border-blue-300 bg-blue-50/30' : 'border-slate-200'}`}>
                     <div className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-sm z-10">
                        <div className="flex items-center gap-1"><Calculator className="w-2 h-2" /> Valeurs ({metrics.length}/15)</div>
                        {openCalcModal && (
                           <button onClick={openCalcModal} className="p-0.5 hover:bg-indigo-50 text-indigo-500 rounded transition-colors" title="Ajouter un champ calculé">
                              <Plus className="w-2.5 h-2.5" />
                           </button>
                        )}
                     </div>
                     <div className="space-y-2">
                        {metrics.map((m, idx) => (
                           <div key={`${m.field}-${idx}`} className="p-1.5 bg-slate-50 rounded border border-slate-200">
                              <FieldChip field={m.field} zone="val" onDelete={() => removeField('val', m.field, idx)} handleDragStart={handleDragStart} />
                              <div className="grid grid-cols-5 gap-0.5 mt-1">
                                 {['sum', 'count', 'avg', 'min', 'max'].map(t => (
                                    <button
                                       key={t}
                                       onClick={() => {
                                          const n = [...metrics];
                                          n[idx] = { ...n[idx], aggType: t as any };
                                          setMetrics(n);
                                       }}
                                       className={`px-0.5 py-0.5 text-[8px] uppercase rounded border ${m.aggType === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200'}`}
                                    >
                                       {t.substring(0, 3)}
                                    </button>
                                 ))}
                              </div>
                           </div>
                        ))}
                        {metrics.length === 0 && valField && (
                           <div>
                              <FieldChip field={valField} zone="val" onDelete={() => setValField('')} handleDragStart={handleDragStart} />
                           </div>
                        )}
                     </div>
                  </div>
               </div>
            </div>
         )}

         <div className="p-1.5 bg-slate-50 rounded border border-slate-200 text-xs flex flex-col gap-1">
            <button
               onClick={props.openFormattingModal}
               className="flex items-center gap-2 w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-slate-700 hover:bg-slate-50 hover:border-indigo-400 transition-all font-bold mb-1"
            >
               <Palette className="w-3.5 h-3.5 text-indigo-500" />
               Mise en forme
            </button>
            <Checkbox checked={showSubtotals} onChange={() => setShowSubtotals(!showSubtotals)} label="Sous-totaux" />
            <Checkbox checked={showTotalCol} onChange={() => setShowTotalCol(!showTotalCol)} label="Total général" />
            {(isTemporalMode || colFields.length > 0) && <Checkbox checked={showVariations} onChange={() => setShowVariations(!showVariations)} label="Variations" className="text-blue-700 font-bold" />}
         </div>
      </div>
   );
};
