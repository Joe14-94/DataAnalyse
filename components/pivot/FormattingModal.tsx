
import React, { useState } from 'react';
import { X, Plus, Trash2, Palette, AlertCircle, Check, Info } from 'lucide-react';
import { PivotStyleRule, ConditionalFormattingRule, PivotMetric } from '../../types/pivot';
import { Button } from '../ui/Button';

interface FormattingModalProps {
  isOpen: boolean;
  onClose: () => void;
  styleRules: PivotStyleRule[];
  setStyleRules: (rules: PivotStyleRule[]) => void;
  conditionalRules: ConditionalFormattingRule[];
  setConditionalRules: (rules: ConditionalFormattingRule[]) => void;
  metrics: PivotMetric[];
  rowFields: string[];
  colFields: string[];
}

const COLORS = [
  { name: 'Transparent', value: 'transparent' },
  { name: 'Rouge', value: '#fee2e2', text: '#991b1b' },
  { name: 'Rouge Foncé', value: '#ef4444', text: '#ffffff' },
  { name: 'Vert', value: '#dcfce7', text: '#166534' },
  { name: 'Vert Foncé', value: '#22c55e', text: '#ffffff' },
  { name: 'Bleu', value: '#dbeafe', text: '#1e40af' },
  { name: 'Bleu Foncé', value: '#3b82f6', text: '#ffffff' },
  { name: 'Jaune', value: '#fef9c3', text: '#854d0e' },
  { name: 'Orange', value: '#ffedd5', text: '#9a3412' },
  { name: 'Gris', value: '#f1f5f9', text: '#334155' },
  { name: 'Noir', value: '#1e293b', text: '#ffffff' },
];

export const FormattingModal: React.FC<FormattingModalProps> = ({
  isOpen, onClose, styleRules, setStyleRules, conditionalRules, setConditionalRules, metrics, rowFields, colFields
}) => {
  const [activeTab, setActiveTab] = useState<'manual' | 'conditional'>('manual');

  if (!isOpen) return null;

  const addStyleRule = () => {
    const newRule: PivotStyleRule = {
      id: Math.random().toString(36).substr(2, 9),
      targetType: 'metric',
      targetKey: metrics[0]?.label || (metrics[0]?.field ? `${metrics[0].field} (${metrics[0].aggType})` : ''),
      style: { fontWeight: 'normal' }
    };
    setStyleRules([...styleRules, newRule]);
  };

  const removeStyleRule = (id: string) => {
    setStyleRules(styleRules.filter(r => r.id !== id));
  };

  const updateStyleRule = (id: string, updates: Partial<PivotStyleRule>) => {
    setStyleRules(styleRules.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const updateStyle = (id: string, styleUpdates: any) => {
    const rule = styleRules.find(r => r.id === id);
    if (rule) {
      updateStyleRule(id, { style: { ...rule.style, ...styleUpdates } });
    }
  };

  const addConditionalRule = () => {
    const newRule: ConditionalFormattingRule = {
      id: Math.random().toString(36).substr(2, 9),
      operator: 'gt',
      value: 0,
      style: { backgroundColor: '#dcfce7', textColor: '#166534' }
    };
    setConditionalRules([...conditionalRules, newRule]);
  };

  const removeConditionalRule = (id: string) => {
    setConditionalRules(conditionalRules.filter(r => r.id !== id));
  };

  const updateConditionalRule = (id: string, updates: Partial<ConditionalFormattingRule>) => {
    setConditionalRules(conditionalRules.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const updateConditionalStyle = (id: string, styleUpdates: any) => {
    const rule = conditionalRules.find(r => r.id === id);
    if (rule) {
      updateConditionalRule(id, { style: { ...rule.style, ...styleUpdates } });
    }
  };

  const metricLabels = metrics.map(m => m.label || `${m.field} (${m.aggType})`);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Mise en forme du TCD</h3>
              <p className="text-xs text-slate-500">Personnalisez l'apparence de vos données</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 px-4 pt-2 gap-4">
          <button
            onClick={() => setActiveTab('manual')}
            className={`px-4 py-2 text-sm font-bold border-b-2 transition-all ${activeTab === 'manual' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Mise en forme manuelle
          </button>
          <button
            onClick={() => setActiveTab('conditional')}
            className={`px-4 py-2 text-sm font-bold border-b-2 transition-all ${activeTab === 'conditional' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Mise en forme conditionnelle
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {activeTab === 'manual' ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Info className="w-4 h-4 text-brand-500" />
                  Règles de style fixes
                </h4>
                <Button onClick={addStyleRule} size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                  <Plus className="w-4 h-4 mr-2" /> Ajouter une règle
                </Button>
              </div>

              {styleRules.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                  <Palette className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">Aucune règle de style manuelle</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {styleRules.map(rule => (
                    <div key={rule.id} className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col gap-4">
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-500">Appliquer à:</span>
                          <select
                            className="text-xs border border-slate-300 rounded px-2 py-1 bg-white"
                            value={rule.targetType}
                            onChange={(e) => updateStyleRule(rule.id, { targetType: e.target.value as any, targetKey: '' })}
                          >
                            <option value="metric">Métriques</option>
                            <option value="row">Lignes spécifiques</option>
                            <option value="col">Colonnes spécifiques</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                          <span className="text-xs font-bold text-slate-500">Cible:</span>
                          {rule.targetType === 'metric' ? (
                            <select
                              className="text-xs border border-slate-300 rounded px-2 py-1 bg-white flex-1"
                              value={rule.targetKey || ''}
                              onChange={(e) => updateStyleRule(rule.id, { targetKey: e.target.value })}
                            >
                              <option value="">Toutes les métriques</option>
                              {metricLabels.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                          ) : (
                            <input
                              type="text"
                              className="text-xs border border-slate-300 rounded px-2 py-1 bg-white flex-1"
                              placeholder="Nom de la ligne/colonne..."
                              value={rule.targetKey || ''}
                              onChange={(e) => updateStyleRule(rule.id, { targetKey: e.target.value })}
                            />
                          )}
                        </div>

                        <button onClick={() => removeStyleRule(rule.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors ml-auto">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center gap-6 border-t border-slate-100 pt-4 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-500">Gras:</span>
                          <button
                            onClick={() => updateStyle(rule.id, { fontWeight: rule.style.fontWeight === 'bold' ? 'normal' : 'bold' })}
                            className={`p-1.5 rounded border transition-all ${rule.style.fontWeight === 'bold' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'}`}
                          >
                            B
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-500">Italique:</span>
                          <button
                            onClick={() => updateStyle(rule.id, { fontStyle: rule.style.fontStyle === 'italic' ? 'normal' : 'italic' })}
                            className={`p-1.5 rounded border transition-all ${rule.style.fontStyle === 'italic' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'}`}
                          >
                            I
                          </button>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-slate-500">Couleurs:</span>
                          <div className="flex gap-1">
                            {COLORS.slice(0, 6).map(c => (
                              <button
                                key={c.value}
                                onClick={() => updateStyle(rule.id, { backgroundColor: c.value, textColor: c.text })}
                                className="w-6 h-6 rounded-full border border-slate-200 shadow-sm relative overflow-hidden"
                                style={{ backgroundColor: c.value }}
                                title={c.name}
                              >
                                {rule.style.backgroundColor === c.value && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                                    <Check className="w-3 h-3 text-indigo-600" />
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex-1 flex justify-end items-center gap-4">
                           <span className="text-[10px] font-bold text-slate-400 uppercase">Aperçu :</span>
                           <div className="px-3 py-1 border rounded min-w-[100px] text-center text-sm" style={{
                             backgroundColor: rule.style.backgroundColor || 'transparent',
                             color: rule.style.textColor || 'inherit',
                             fontWeight: rule.style.fontWeight || 'normal',
                             fontStyle: rule.style.fontStyle || 'normal'
                           }}>
                             1 234,56 €
                           </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  Règles basées sur les valeurs
                </h4>
                <Button onClick={addConditionalRule} size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                  <Plus className="w-4 h-4 mr-2" /> Ajouter une règle
                </Button>
              </div>

              {conditionalRules.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                  <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">Aucune règle de mise en forme conditionnelle</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {conditionalRules.map(rule => (
                    <div key={rule.id} className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col gap-4">
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-500">Si:</span>
                          <select
                            className="text-xs border border-slate-300 rounded px-2 py-1 bg-white"
                            value={rule.metricLabel || ''}
                            onChange={(e) => updateConditionalRule(rule.id, { metricLabel: e.target.value || undefined })}
                          >
                            <option value="">Toutes les métriques</option>
                            {metricLabels.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                        </div>

                        <div className="flex items-center gap-2">
                           <span className="text-xs font-bold text-slate-500">est:</span>
                           <select
                             className="text-xs border border-slate-300 rounded px-2 py-1 bg-white"
                             value={rule.operator}
                             onChange={(e) => updateConditionalRule(rule.id, { operator: e.target.value as any })}
                           >
                             <option value="gt">&gt;</option>
                             <option value="lt">&lt;</option>
                             <option value="eq">=</option>
                             <option value="between">Entre</option>
                             <option value="contains">Contient</option>
                           </select>
                        </div>

                        <div className="flex items-center gap-2">
                           <input
                             type={rule.operator === 'contains' ? 'text' : 'number'}
                             className="text-xs border border-slate-300 rounded px-2 py-1 bg-white w-20"
                             value={rule.value}
                             onChange={(e) => updateConditionalRule(rule.id, { value: rule.operator === 'contains' ? e.target.value : parseFloat(e.target.value) })}
                           />
                           {rule.operator === 'between' && (
                             <>
                               <span className="text-xs text-slate-500">et</span>
                               <input
                                 type="number"
                                 className="text-xs border border-slate-300 rounded px-2 py-1 bg-white w-20"
                                 value={rule.value2 || 0}
                                 onChange={(e) => updateConditionalRule(rule.id, { value2: parseFloat(e.target.value) })}
                               />
                             </>
                           )}
                        </div>

                        <button onClick={() => removeConditionalRule(rule.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors ml-auto">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-100 pt-4 flex-wrap gap-4">
                        <div className="flex items-center gap-3">
                           <span className="text-xs font-bold text-slate-500">Alors appliquer:</span>
                           <div className="flex gap-1">
                             {COLORS.map(c => (
                               <button
                                 key={c.value}
                                 onClick={() => updateConditionalStyle(rule.id, { backgroundColor: c.value, textColor: c.text })}
                                 className="w-6 h-6 rounded border border-slate-200 shadow-sm relative overflow-hidden"
                                 style={{ backgroundColor: c.value }}
                                 title={c.name}
                               >
                                 {rule.style.backgroundColor === c.value && (
                                   <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                                     <Check className="w-3 h-3 text-indigo-600" />
                                   </div>
                                 )}
                               </button>
                             ))}
                           </div>
                        </div>

                        <div className="flex items-center gap-4">
                           <span className="text-[10px] font-bold text-slate-400 uppercase">Aperçu :</span>
                           <div className="px-3 py-1 border rounded min-w-[100px] text-center text-sm font-bold" style={{
                             backgroundColor: rule.style.backgroundColor || 'transparent',
                             color: rule.style.textColor || 'inherit',
                           }}>
                             1 234,56 €
                           </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={onClose} className="bg-indigo-600 hover:bg-indigo-700">Enregistrer les règles</Button>
        </div>
      </div>
    </div>
  );
};
