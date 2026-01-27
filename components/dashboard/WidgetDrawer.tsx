
import React from 'react';
import { X, Eye, Activity, BarChart3, ListOrdered, Type, PaintBucket, Palette } from 'lucide-react';
import { Heading, Text } from '../ui/Typography';
import { Button } from '../ui/Button';
import { Label, Input, Select } from '../ui/Form';
import { DashboardWidget, WidgetType, WidgetSize, WidgetHeight, Dataset, ColorMode, ColorPalette } from '../../types';
import { WidgetDisplay } from './WidgetDisplay';
import { useWidgetData } from '../../hooks/useWidgetData';
import { BORDER_COLORS } from '../../utils/constants';

interface WidgetDrawerProps {
   isOpen: boolean;
   onClose: () => void;
   editingWidgetId: string | null;
   tempWidget: Partial<DashboardWidget>;
   setTempWidget: (w: Partial<DashboardWidget>) => void;
   handleSaveWidget: () => void;
   datasets: Dataset[];
   allFields: string[];
   globalDateRange: any;
}

const LivePreview: React.FC<{ widget: DashboardWidget, globalDateRange: any }> = ({ widget, globalDateRange }) => {
   const data = useWidgetData(widget, globalDateRange);
   const isText = widget.type === 'text';
   const bgColor = isText && widget.config.textStyle?.color === 'primary' ? 'bg-blue-50 border-blue-200' : 'bg-white';
   const borderClass = widget.style?.borderColor || 'border-slate-200';
   const widthVal = widget.style?.borderWidth || '1';
   const widthClass = widthVal === '0' ? 'border-0' : widthVal === '2' ? 'border-2' : widthVal === '4' ? 'border-4' : 'border';

   return (
      <div className={`w-full h-full rounded-lg ${borderClass} ${widthClass} shadow-sm p-4 flex flex-col ${bgColor} relative`}>
         <h3 className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider truncate">{widget.title || 'Titre du widget'}</h3>
         <div className="flex-1 min-h-0 relative"><WidgetDisplay widget={widget} data={data} /></div>
      </div>
   );
};

export const WidgetDrawer: React.FC<WidgetDrawerProps> = ({
   isOpen, onClose, editingWidgetId, tempWidget, setTempWidget, handleSaveWidget, datasets, allFields, globalDateRange
}) => {
   if (!isOpen) return null;

   return (
      <div className="fixed inset-0 z-50 flex bg-slate-900/10 backdrop-blur-sm animate-in fade-in duration-200">
         <div className="flex-1 flex flex-col overflow-hidden relative border-r border-slate-200">
            <div className="absolute top-4 left-4 bg-white/80 backdrop-blur rounded-full px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm border border-slate-200 flex items-center gap-2 z-10">
               <Eye className="w-3 h-3 text-blue-600" /> Aperçu temps réel
            </div>
            <div className="flex-1 overflow-auto flex items-center justify-center p-8">
               <div className={`w-full transition-all duration-300 ${tempWidget.size === 'full' ? 'max-w-full' : 'max-w-[500px]'}`} style={{ height: tempWidget.height === 'xl' ? '500px' : '256px' }}>
                  <LivePreview widget={tempWidget as DashboardWidget} globalDateRange={globalDateRange} />
               </div>
            </div>
         </div>

         <div className="w-[500px] bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
               <div>
                  <Heading level={3}>{editingWidgetId ? 'Modifier le widget' : 'Nouveau widget'}</Heading>
                  <Text size="xs" variant="muted">Configuration de l'affichage</Text>
               </div>
               <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-8">
               <div>
                  <Label>Type de visualisation</Label>
                  <div className="grid grid-cols-4 gap-3">
                     {[
                        { id: 'kpi', label: 'Indicateur', icon: Activity },
                        { id: 'chart', label: 'Graphique', icon: BarChart3 },
                        { id: 'list', label: 'Classement', icon: ListOrdered },
                        { id: 'text', label: 'Texte', icon: Type }
                     ].map(t => {
                        const Icon = t.icon;
                        const isSelected = tempWidget.type === t.id;
                        return (
                           <button
                              key={t.id}
                              onClick={() => setTempWidget({ ...tempWidget, type: t.id as WidgetType })}
                              className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${isSelected ? 'bg-blue-50 text-blue-700 border-blue-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                           >
                              <Icon className="w-6 h-6" /><span className="font-bold text-xs">{t.label}</span>
                           </button>
                        )
                     })}
                  </div>
               </div>

               <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className={tempWidget.type === 'text' ? 'col-span-2' : ''}>
                        <Label>Titre</Label>
                        <Input value={tempWidget.title || ''} onChange={e => setTempWidget({ ...tempWidget, title: e.target.value })} placeholder="Ex: Budget vs Charge" />
                     </div>
                     {tempWidget.type !== 'text' && (
                        <>
                           <div>
                              <Label>Largeur</Label>
                              <Select value={tempWidget.size || 'sm'} onChange={e => setTempWidget({ ...tempWidget, size: e.target.value as WidgetSize })}>
                                 <option value="sm">Petit (1/4)</option>
                                 <option value="md">Moyen (2/4)</option>
                                 <option value="lg">Grand (3/4)</option>
                                 <option value="full">Large (4/4)</option>
                              </Select>
                           </div>
                           <div>
                              <Label>Hauteur</Label>
                              <Select value={tempWidget.height || 'md'} onChange={e => setTempWidget({ ...tempWidget, height: e.target.value as WidgetHeight })}>
                                 <option value="sm">Petite</option>
                                 <option value="md">Moyenne</option>
                                 <option value="lg">Grande</option>
                                 <option value="xl">Très grande</option>
                              </Select>
                           </div>
                        </>
                     )}
                  </div>
                  {tempWidget.type !== 'text' && (
                     <div>
                        <Label>Source de données</Label>
                        <Select value={tempWidget.config?.source?.datasetId || ''} onChange={e => setTempWidget({ ...tempWidget, config: { ...tempWidget.config!, source: { datasetId: e.target.value, mode: 'latest' } } })}>
                           {datasets.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </Select>
                     </div>
                  )}
               </div>

               {/* APPEARANCE SECTION */}
               <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-6">
                  <div className="space-y-3">
                     <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                        <PaintBucket className="w-4 h-4 text-blue-600" /> Style du conteneur
                     </div>
                     <div>
                        <Label>Couleur de bordure</Label>
                        <div className="flex flex-wrap gap-2">
                           {BORDER_COLORS.map(c => (
                              <button
                                 key={c.class}
                                 onClick={() => setTempWidget({ ...tempWidget, style: { ...tempWidget.style, borderColor: c.class } })}
                                 className={`w-8 h-8 rounded-full border-2 ${c.bg} transition-transform hover:scale-110 ${(tempWidget.style?.borderColor || 'border-slate-200') === c.class ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : 'border-transparent'}`}
                                 title={c.label}
                              />
                           ))}
                        </div>
                     </div>
                  </div>

                  {tempWidget.type === 'chart' && (
                     <div className="space-y-4 pt-4 border-t border-slate-200">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                           <Palette className="w-4 h-4 text-blue-600" /> Couleurs du graphique
                        </div>

                        <div>
                           <Label>Mode couleur</Label>
                           <Select
                              value={tempWidget.config?.colorMode || 'multi'}
                              onChange={e => setTempWidget({
                                 ...tempWidget,
                                 config: { ...tempWidget.config!, colorMode: e.target.value as ColorMode }
                              })}
                           >
                              <option value="multi">Plusieurs couleurs (Palette)</option>
                              <option value="single">Couleur unique</option>
                              <option value="gradient">Dégradé</option>
                           </Select>
                        </div>

                        {tempWidget.config?.colorMode === 'multi' && (
                           <div>
                              <Label>Palette</Label>
                              <Select
                                 value={tempWidget.config?.colorPalette || 'default'}
                                 onChange={e => setTempWidget({
                                    ...tempWidget,
                                    config: { ...tempWidget.config!, colorPalette: e.target.value as ColorPalette }
                                 })}
                              >
                                 <option value="default">Défaut</option>
                                 <option value="pastel">Pastel</option>
                                 <option value="vibrant">Vibrant</option>
                              </Select>
                           </div>
                        )}

                        {tempWidget.config?.colorMode === 'single' && (
                           <div>
                              <Label>Couleur</Label>
                              <div className="flex items-center gap-3">
                                 <input
                                    type="color"
                                    value={tempWidget.config?.singleColor || '#3b82f6'}
                                    onChange={e => setTempWidget({
                                       ...tempWidget,
                                       config: { ...tempWidget.config!, singleColor: e.target.value }
                                    })}
                                    className="w-10 h-10 rounded border border-slate-300 cursor-pointer"
                                 />
                                 <Input
                                    value={tempWidget.config?.singleColor || '#3b82f6'}
                                    onChange={e => setTempWidget({
                                       ...tempWidget,
                                       config: { ...tempWidget.config!, singleColor: e.target.value }
                                    })}
                                    className="font-mono text-xs"
                                 />
                              </div>
                           </div>
                        )}

                        {tempWidget.config?.colorMode === 'gradient' && (
                           <div className="grid grid-cols-2 gap-4">
                              <div>
                                 <Label>Début</Label>
                                 <div className="flex items-center gap-2">
                                    <input
                                       type="color"
                                       value={tempWidget.config?.gradientStart || '#3b82f6'}
                                       onChange={e => setTempWidget({
                                          ...tempWidget,
                                          config: { ...tempWidget.config!, gradientStart: e.target.value }
                                       })}
                                       className="w-8 h-8 rounded border border-slate-300 cursor-pointer"
                                    />
                                    <Input
                                       value={tempWidget.config?.gradientStart || '#3b82f6'}
                                       onChange={e => setTempWidget({
                                          ...tempWidget,
                                          config: { ...tempWidget.config!, gradientStart: e.target.value }
                                       })}
                                       className="font-mono text-[10px] px-1 h-8"
                                    />
                                 </div>
                              </div>
                              <div>
                                 <Label>Fin</Label>
                                 <div className="flex items-center gap-2">
                                    <input
                                       type="color"
                                       value={tempWidget.config?.gradientEnd || '#ef4444'}
                                       onChange={e => setTempWidget({
                                          ...tempWidget,
                                          config: { ...tempWidget.config!, gradientEnd: e.target.value }
                                       })}
                                       className="w-8 h-8 rounded border border-slate-300 cursor-pointer"
                                    />
                                    <Input
                                       value={tempWidget.config?.gradientEnd || '#ef4444'}
                                       onChange={e => setTempWidget({
                                          ...tempWidget,
                                          config: { ...tempWidget.config!, gradientEnd: e.target.value }
                                       })}
                                       className="font-mono text-[10px] px-1 h-8"
                                    />
                                 </div>
                              </div>
                           </div>
                        )}
                     </div>
                  )}
               </div>

               {tempWidget.type !== 'text' && (
                  <div className="space-y-6">
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <Label>Métrique</Label>
                           <Select value={tempWidget.config?.metric} onChange={e => setTempWidget({ ...tempWidget, config: { ...tempWidget.config!, metric: e.target.value as any } })}>
                              <option value="count">Compte</option>
                              <option value="sum">Somme</option>
                              <option value="avg">Moyenne</option>
                              <option value="distinct">Compte distinct</option>
                           </Select>
                        </div>
                        {['sum', 'avg', 'distinct'].includes(tempWidget.config?.metric || '') && (
                           <div>
                              <Label>Champ valeur</Label>
                              <Select value={tempWidget.config?.valueField || ''} onChange={e => setTempWidget({ ...tempWidget, config: { ...tempWidget.config!, valueField: e.target.value } })}>
                                 <option value="">-- Choisir --</option>
                                 {allFields.map(f => <option key={f} value={f}>{f}</option>)}
                              </Select>
                           </div>
                        )}
                     </div>

                     {(tempWidget.type === 'chart' || tempWidget.type === 'list') && (
                        <div className="grid grid-cols-2 gap-4">
                           <div>
                              <Label>Axe de regroupement</Label>
                              <Select value={tempWidget.config?.dimension || ''} onChange={e => setTempWidget({ ...tempWidget, config: { ...tempWidget.config!, dimension: e.target.value } })}>
                                 <option value="">-- Choisir --</option>
                                 {allFields.map(f => <option key={f} value={f}>{f}</option>)}
                              </Select>
                           </div>
                           <div>
                              <Label>Limite (Top N)</Label>
                              <Input type="number" value={tempWidget.config?.limit || 10} onChange={e => setTempWidget({ ...tempWidget, config: { ...tempWidget.config!, limit: parseInt(e.target.value) } })} />
                           </div>
                        </div>
                     )}
                  </div>
               )}
            </div>

            <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
               <Button variant="outline" onClick={onClose}>Annuler</Button>
               <Button onClick={handleSaveWidget} disabled={!tempWidget.title}>Enregistrer</Button>
            </div>
         </div>
      </div>
   );
};
