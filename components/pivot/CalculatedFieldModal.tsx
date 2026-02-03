import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Calculator, Plus, Info, FunctionSquare, Database, Sparkles, Check, ChevronDown, ChevronUp, BookOpen, Trash2, ArrowUp, ArrowDown, Wand2, Type as TypeIcon, Scissors, Layers, MessageSquare } from 'lucide-react';
import { Button } from '../ui/Button';
import { evaluateFormula, generateId } from '../../utils';
import { CalculatedField, CalculatedFieldAction, CalculatedFieldActionType } from '../../types';
import { generateFormulaFromActions } from '../../utils/calculatedFields';
import { CalculatedFieldHelpModal } from './CalculatedFieldHelpModal';

interface CalculatedFieldModalProps {
    isOpen: boolean;
    onClose: () => void;
    fields: string[];
    onSave: (field: Partial<CalculatedField>) => void;
    initialField?: CalculatedField | null;
    sampleRow?: any;
}

export const CalculatedFieldModal: React.FC<CalculatedFieldModalProps> = ({ isOpen, onClose, fields, onSave, initialField, sampleRow }) => {
    if (!isOpen) return null;

    const [name, setName] = useState(initialField?.name || '');
    const [formula, setFormula] = useState(initialField?.formula || '');
    const [outputType, setOutputType] = useState<'number' | 'text' | 'boolean'>(initialField?.outputType || 'number');
    const [unit, setUnit] = useState(initialField?.unit || '');
    const [mode, setMode] = useState<'formula' | 'actions'>(initialField?.mode || 'formula');
    const [actions, setActions] = useState<CalculatedFieldAction[]>(initialField?.actions || []);

    const [previewResult, setPreviewResult] = useState<{ value: any; error?: string } | null>(null);
    const [showExamples, setShowExamples] = useState(false);
    const [showHelpModal, setShowHelpModal] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (initialField) {
            setName(initialField.name);
            setFormula(initialField.formula);
            setOutputType(initialField.outputType);
            setUnit(initialField.unit || '');
            setMode(initialField.mode || 'formula');
            setActions(initialField.actions || []);
        } else {
            setName('');
            setFormula('');
            setOutputType('number');
            setUnit('');
            setMode('formula');
            setActions([]);
        }
    }, [initialField, isOpen]);

    useEffect(() => {
        if (!formula) {
            setPreviewResult(null);
            return;
        }
        const timer = setTimeout(() => {
            if (sampleRow) {
                try {
                    const res = evaluateFormula(sampleRow, formula, outputType);
                    if (res === null && formula.trim() !== '') {
                        setPreviewResult({ value: null, error: "Syntaxe invalide" });
                    } else {
                        setPreviewResult({ value: res });
                    }
                } catch (e) {
                    setPreviewResult({ value: null, error: "Erreur de calcul" });
                }
            } else {
                setPreviewResult({ value: null, error: "Pas de données pour l'aperçu" });
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [formula, sampleRow, outputType]);

    const insertIntoFormula = (text: string) => {
        if (!textareaRef.current) return;
        const start = textareaRef.current.selectionStart;
        const end = textareaRef.current.selectionEnd;
        const newFormula = formula.substring(0, start) + text + formula.substring(end);
        setFormula(newFormula);
        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.focus();
                textareaRef.current.setSelectionRange(start + text.length, start + text.length);
            }
        }, 10);
    };

    // --- ACTIONS LOGIC ---

    const addAction = (type: CalculatedFieldActionType) => {
        const newAction: CalculatedFieldAction = {
            id: generateId(),
            type,
            params: type === 'source' ? { field: fields[0] } :
                    type === 'concat' ? { otherFields: [], separator: ' ' } :
                    ['replace', 'regex'].includes(type) ? { search: '', pattern: '', replacement: '' } :
                    ['add', 'subtract', 'multiply', 'divide'].includes(type) ? { value: 0 } :
                    ['left', 'right', 'substring'].includes(type) ? { count: 5, start: 0, length: 5 } :
                    {}
        };
        const newActions = [...actions, newAction];
        setActions(newActions);
        if (mode === 'actions') {
            setFormula(generateFormulaFromActions(newActions, fields));
        }
    };

    const updateAction = (id: string, params: any) => {
        const newActions = actions.map(a => a.id === id ? { ...a, params: { ...a.params, ...params } } : a);
        setActions(newActions);
        setFormula(generateFormulaFromActions(newActions, fields));
    };

    const removeAction = (id: string) => {
        const newActions = actions.filter(a => a.id !== id);
        setActions(newActions);
        setFormula(generateFormulaFromActions(newActions, fields));
    };

    const moveAction = (index: number, direction: 'up' | 'down') => {
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= actions.length) return;
        const newActions = [...actions];
        [newActions[index], newActions[newIndex]] = [newActions[newIndex], newActions[index]];
        setActions(newActions);
        setFormula(generateFormulaFromActions(newActions, fields));
    };

    const handleSave = () => {
        if (name && formula) {
            onSave({
                id: initialField?.id,
                name,
                formula,
                outputType,
                unit: outputType === 'number' ? unit : undefined,
                mode,
                actions: mode === 'actions' ? actions : undefined
            });
            onClose();
        }
    };

    const functions = [
        // Logique et Math
        { name: 'SI', syntax: 'SI(condition, vrai, faux)', desc: 'Condition logique', category: 'Logique' },
        { name: 'SOMME', syntax: 'SOMME(v1, v2...)', desc: 'Additionne les valeurs', category: 'Math' },
        { name: 'MOYENNE', syntax: 'MOYENNE(v1, v2...)', desc: 'Moyenne des valeurs', category: 'Math' },
        { name: 'ARRONDI', syntax: 'ARRONDI(nombre, décimales)', desc: 'Arrondit un nombre', category: 'Math' },
        { name: 'ABS', syntax: 'ABS(nombre)', desc: 'Valeur absolue', category: 'Math' },
        { name: 'MIN', syntax: 'MIN(v1, v2...)', desc: 'Valeur minimale', category: 'Math' },
        { name: 'MAX', syntax: 'MAX(v1, v2...)', desc: 'Valeur maximale', category: 'Math' },

        // Concaténation et transformation
        { name: 'CONCAT', syntax: 'CONCAT(texte1, texte2, [sep])', desc: 'Concatène avec séparateur optionnel', category: 'Texte' },
        { name: 'MAJUSCULE', syntax: 'MAJUSCULE(texte)', desc: 'Convertit en majuscules', category: 'Texte' },
        { name: 'MINUSCULE', syntax: 'MINUSCULE(texte)', desc: 'Convertit en minuscules', category: 'Texte' },
        { name: 'CAPITALISEPREMIER', syntax: 'CAPITALISEPREMIER(texte)', desc: 'Première lettre en majuscule', category: 'Texte' },
        { name: 'CAPITALISEMOTS', syntax: 'CAPITALISEMOTS(texte)', desc: 'Chaque mot commence par une majuscule', category: 'Texte' },

        // Recherche et remplacement
        { name: 'REMPLACER', syntax: 'REMPLACER(texte, cherche, remplace)', desc: 'Remplace avec regex', category: 'Texte' },
        { name: 'SUBSTITUER', syntax: 'SUBSTITUER(texte, ancien, nouveau)', desc: 'Remplace sans regex', category: 'Texte' },
        { name: 'TROUVE', syntax: 'TROUVE(cherche, texte, [début])', desc: 'Position de la sous-chaîne (-1 si absent)', category: 'Texte' },
        { name: 'CONTIENT', syntax: 'CONTIENT(texte, cherche)', desc: 'Vérifie si contient la sous-chaîne', category: 'Texte' },

        // Extraction
        { name: 'EXTRAIRE', syntax: 'EXTRAIRE(texte, début, [long])', desc: 'Extrait une sous-chaîne', category: 'Texte' },
        { name: 'GAUCHE', syntax: 'GAUCHE(texte, nb)', desc: 'Premiers n caractères', category: 'Texte' },
        { name: 'DROITE', syntax: 'DROITE(texte, nb)', desc: 'Derniers n caractères', category: 'Texte' },

        // Utilitaires texte
        { name: 'LONGUEUR', syntax: 'LONGUEUR(texte)', desc: 'Nombre de caractères', category: 'Texte' },
        { name: 'SUPPRESPACE', syntax: 'SUPPRESPACE(texte)', desc: 'Supprime les espaces de début/fin', category: 'Texte' },
    ];

    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-[90vw] h-[90vh] overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-indigo-50 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="bg-indigo-600 p-1.5 rounded-lg text-white">
                            <Calculator className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800">{initialField ? 'Modifier le champ calculé' : 'Nouveau champ calculé'}</h3>
                            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Assistant de création</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-white rounded-full transition-colors"><X className="w-5 h-5" /></button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar flex-1">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Left Column: Basic Info & Configuration (span 4) */}
                        <div className="lg:col-span-4 space-y-4">
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Nom du champ</label>
                                    <input
                                        type="text"
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all focus:border-indigo-500"
                                        placeholder="Ex: Taux de marge, % Réalisation"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Type de résultat</label>
                                        <select
                                            className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                            value={outputType}
                                            onChange={e => setOutputType(e.target.value as any)}
                                        >
                                            <option value="number">Nombre</option>
                                            <option value="text">Texte</option>
                                            <option value="boolean">Vrai/Faux</option>
                                        </select>
                                    </div>
                                    {outputType === 'number' && (
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Unité</label>
                                            <input
                                                type="text"
                                                className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                                placeholder="Ex: €, %"
                                                value={unit}
                                                onChange={e => setUnit(e.target.value)}
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="pt-2">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-wider">Mode de création</label>
                                    <div className="flex p-1 bg-slate-200 rounded-lg gap-1">
                                        <button
                                            onClick={() => setMode('formula')}
                                            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${mode === 'formula' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:bg-slate-300/50'}`}
                                        >
                                            Formule libre
                                        </button>
                                        <button
                                            onClick={() => {
                                                setMode('actions');
                                                if (actions.length === 0) {
                                                    // Initialisation par défaut avec une source
                                                    addAction('source');
                                                }
                                            }}
                                            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${mode === 'actions' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:bg-slate-300/50'}`}
                                        >
                                            Assistant par étapes
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {mode === 'formula' ? (
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider flex justify-between">
                                        <span>Formule</span>
                                        <span className="text-[9px] normal-case font-medium text-slate-400">Ex: [Ventes] - [Coûts]</span>
                                    </label>
                                    <div className="relative group">
                                        <textarea
                                            ref={textareaRef}
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none h-40 shadow-sm transition-all focus:border-indigo-500 bg-slate-50 focus:bg-white"
                                            placeholder="Utilisez les noms de champs entre crochets []"
                                            value={formula}
                                            onChange={e => setFormula(e.target.value)}
                                        />
                                        <div className="absolute bottom-2 right-2 flex gap-1">
                                            <button onClick={() => setFormula('')} className="p-1 text-slate-300 hover:text-slate-500 transition-colors" title="Effacer"><X className="w-3 h-3" /></button>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-slate-400 italic">
                                        Cliquez sur les champs et fonctions à droite pour les insérer dans la formule.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Séquence d'actions</label>
                                        <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">Ordre séquentiel</span>
                                    </div>

                                    <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                                        {actions.length === 0 ? (
                                            <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                                                <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                                <p className="text-xs text-slate-400 font-medium px-4">Aucune action définie.<br/>Commencez par choisir un champ source.</p>
                                            </div>
                                        ) : (
                                            actions.map((action, idx) => (
                                                <div key={action.id} className={`bg-white border rounded-xl shadow-sm overflow-hidden group transition-all ${action.type === 'source' ? 'border-brand-200' : 'border-slate-200 hover:border-indigo-300'}`}>
                                                    <div className={`px-3 py-2 border-b flex items-center justify-between ${action.type === 'source' ? 'bg-brand-50 border-brand-100' : 'bg-slate-50 border-slate-200'}`}>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`${action.type === 'source' ? 'bg-brand-600' : 'bg-indigo-600'} text-white w-4 h-4 rounded-full text-[9px] flex items-center justify-center font-bold`}>{idx + 1}</span>
                                                            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-tight truncate w-32">
                                                                {action.type === 'source' ? 'Source des données' : action.type.toUpperCase()}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            {action.type !== 'source' && (
                                                                <>
                                                                    <button onClick={() => moveAction(idx, 'up')} disabled={idx <= 1} className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-20"><ArrowUp className="w-3 h-3" /></button>
                                                                    <button onClick={() => moveAction(idx, 'down')} disabled={idx === actions.length - 1} className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-20"><ArrowDown className="w-3 h-3" /></button>
                                                                    <button onClick={() => removeAction(action.id)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="p-3 space-y-3">
                                                        {action.type === 'source' && (
                                                            <div>
                                                                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Champ source</label>
                                                                <select
                                                                    className="w-full text-xs border border-slate-200 rounded px-2 py-1 bg-slate-50 focus:bg-white font-bold text-slate-700"
                                                                    value={action.params.field || ''}
                                                                    onChange={e => updateAction(action.id, { field: e.target.value })}
                                                                >
                                                                    <option value="" disabled>Sélectionner un champ</option>
                                                                    {fields.map(f => <option key={f} value={f}>{f}</option>)}
                                                                </select>
                                                            </div>
                                                        )}

                                                        {/* Action specific inputs */}
                                                        {action.type === 'replace' && (
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div>
                                                                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Chercher</label>
                                                                    <input type="text" className="w-full text-xs border border-slate-200 rounded px-2 py-1" value={action.params.search || ''} onChange={e => updateAction(action.id, { search: e.target.value })} />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Remplacer</label>
                                                                    <input type="text" className="w-full text-xs border border-slate-200 rounded px-2 py-1" value={action.params.replacement || ''} onChange={e => updateAction(action.id, { replacement: e.target.value })} />
                                                                </div>
                                                            </div>
                                                        )}
                                                        {action.type === 'regex' && (
                                                            <div className="space-y-2">
                                                                <div>
                                                                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Motif Regex</label>
                                                                    <input type="text" className="w-full text-xs font-mono border border-slate-200 rounded px-2 py-1" value={action.params.pattern || ''} onChange={e => updateAction(action.id, { pattern: e.target.value })} placeholder="Ex: [0-9]+" />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Remplacement</label>
                                                                    <input type="text" className="w-full text-xs border border-slate-200 rounded px-2 py-1" value={action.params.replacement || ''} onChange={e => updateAction(action.id, { replacement: e.target.value })} />
                                                                </div>
                                                            </div>
                                                        )}
                                                        {action.type === 'concat' && (
                                                            <div className="space-y-2">
                                                                <div>
                                                                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Colonnes à ajouter</label>
                                                                    <div className="flex flex-wrap gap-1 p-2 bg-slate-50 border border-slate-200 rounded-lg min-h-[40px]">
                                                                        {(action.params.otherFields || []).map((f: string) => (
                                                                            <span key={f} className="inline-flex items-center gap-1 bg-white border border-indigo-200 text-indigo-700 px-1.5 py-0.5 rounded text-[9px] font-bold">
                                                                                {f}
                                                                                <button onClick={() => updateAction(action.id, { otherFields: action.params.otherFields.filter((of: string) => of !== f) })} className="hover:text-red-500"><X className="w-2.5 h-2.5" /></button>
                                                                            </span>
                                                                        ))}
                                                                        <select
                                                                            className="text-[9px] bg-transparent border-none focus:ring-0 text-slate-400"
                                                                            onChange={e => {
                                                                                if (!e.target.value) return;
                                                                                const current = action.params.otherFields || [];
                                                                                if (!current.includes(e.target.value)) {
                                                                                    updateAction(action.id, { otherFields: [...current, e.target.value] });
                                                                                }
                                                                                e.target.value = "";
                                                                            }}
                                                                        >
                                                                            <option value="">+ Ajouter...</option>
                                                                            {fields.map(f => <option key={f} value={f}>{f}</option>)}
                                                                        </select>
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Séparateur</label>
                                                                    <input type="text" className="w-full text-xs border border-slate-200 rounded px-2 py-1" value={action.params.separator || ''} onChange={e => updateAction(action.id, { separator: e.target.value })} placeholder="Ex: - , /" />
                                                                </div>
                                                            </div>
                                                        )}
                                                        {['add', 'subtract', 'multiply', 'divide'].includes(action.type) && (
                                                            <div>
                                                                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Valeur</label>
                                                                <input type="number" className="w-full text-xs border border-slate-200 rounded px-2 py-1" value={action.params.value || 0} onChange={e => updateAction(action.id, { value: parseFloat(e.target.value) })} />
                                                            </div>
                                                        )}
                                                        {['left', 'right'].includes(action.type) && (
                                                            <div>
                                                                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Nombre de caractères</label>
                                                                <input type="number" className="w-full text-xs border border-slate-200 rounded px-2 py-1" value={action.params.count || 5} onChange={e => updateAction(action.id, { count: parseInt(e.target.value) })} />
                                                            </div>
                                                        )}
                                                        {action.type === 'substring' && (
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div>
                                                                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Position début</label>
                                                                    <input type="number" className="w-full text-xs border border-slate-200 rounded px-2 py-1" value={action.params.start || 0} onChange={e => updateAction(action.id, { start: parseInt(e.target.value) })} />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Longueur</label>
                                                                    <input type="number" className="w-full text-xs border border-slate-200 rounded px-2 py-1" value={action.params.length || 5} onChange={e => updateAction(action.id, { length: parseInt(e.target.value) })} />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    <div className="pt-2">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Plus className="w-3 h-3 text-indigo-600" />
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ajouter une transformation</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-1.5">
                                            <button onClick={() => addAction('trim')} className="text-left px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-medium text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 transition-all flex items-center gap-1.5"><Scissors className="w-3 h-3" /> Nettoyer (Trim)</button>
                                            <button onClick={() => addAction('upper')} className="text-left px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-medium text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 transition-all flex items-center gap-1.5"><TypeIcon className="w-3 h-3" /> Majuscule</button>
                                            <button onClick={() => addAction('replace')} className="text-left px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-medium text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 transition-all flex items-center gap-1.5"><Wand2 className="w-3 h-3" /> Remplacer</button>
                                            <button onClick={() => addAction('regex')} className="text-left px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-medium text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 transition-all flex items-center gap-1.5"><MessageSquare className="w-3 h-3" /> Regex</button>
                                            <button onClick={() => addAction('concat')} className="text-left px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-medium text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 transition-all flex items-center gap-1.5"><Plus className="w-3 h-3" /> Concaténer</button>
                                            {outputType === 'number' && (
                                                <button onClick={() => addAction('add')} className="text-left px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-medium text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 transition-all flex items-center gap-1.5"><Calculator className="w-3 h-3" /> Calculer</button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-slate-200">
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-wider">Formule générée (Lecture seule)</label>
                                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 text-[10px] font-mono text-slate-600 break-all h-20 overflow-y-auto custom-scrollbar">
                                            {formula || "Choisissez un champ source pour commencer..."}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Middle Column: Fields (span 5) */}
                        <div className="lg:col-span-5 flex flex-col border border-slate-200 rounded-xl overflow-hidden bg-slate-50 shadow-inner">
                            <div className="flex bg-white border-b border-slate-200 p-2.5 items-center gap-2">
                                <Database className="w-3.5 h-3.5 text-indigo-600" />
                                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Champs</span>
                            </div>
                            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar min-h-[300px]">
                                <div className="grid grid-cols-1 gap-1.5">
                                    {fields.map(f => (
                                        <button
                                            key={f}
                                            title={f}
                                            onClick={() => insertIntoFormula(`[${f}]`)}
                                            className="group text-left px-3 py-2 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 transition-all flex items-center justify-between"
                                        >
                                            <span className="truncate flex-1 font-medium">{f}</span>
                                            <Plus className="w-3 h-3 text-slate-300 group-hover:text-indigo-500" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Functions (span 3) */}
                        <div className="lg:col-span-3 flex flex-col border border-slate-200 rounded-xl overflow-hidden bg-slate-50 shadow-inner">
                            <div className="flex bg-white border-b border-slate-200 p-2.5 items-center gap-2">
                                <FunctionSquare className="w-3.5 h-3.5 text-indigo-600" />
                                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Fonctions</span>
                            </div>
                            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar max-h-[400px]">
                                <div className="space-y-3">
                                    {['Logique', 'Math', 'Texte'].map(category => {
                                        const categoryFunctions = functions.filter(fn => fn.category === category);
                                        if (categoryFunctions.length === 0) return null;
                                        return (
                                            <div key={category}>
                                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-1">{category}</div>
                                                <div className="space-y-1.5">
                                                    {categoryFunctions.map(fn => (
                                                        <button
                                                            key={fn.name}
                                                            onClick={() => insertIntoFormula(`${fn.name}(`)}
                                                            className="w-full text-left px-3 py-2 bg-white border border-slate-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-all group"
                                                        >
                                                            <div className="flex justify-between items-center mb-0.5">
                                                                <span className="text-[11px] font-bold text-indigo-700 font-mono">{fn.name}</span>
                                                                <Plus className="w-3 h-3 text-slate-300 group-hover:text-indigo-500" />
                                                            </div>
                                                            <div className="text-[9px] text-slate-400 font-mono mb-1">{fn.syntax}</div>
                                                            <div className="text-[9px] text-slate-500 leading-tight">{fn.desc}</div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Preview Section */}
                    <div className={`p-4 rounded-xl border ${previewResult?.error ? 'bg-red-50 border-red-200' : 'bg-green-50/50 border-green-200'} transition-all shadow-sm`}>
                        <div className="flex items-center justify-between mb-2">
                            <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${previewResult?.error ? 'text-red-700' : 'text-green-700'}`}>
                                {previewResult?.error ? <X className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                                {previewResult?.error ? 'Erreur dans la formule' : 'Aperçu du résultat'}
                            </span>
                            {!previewResult?.error && formula && <span className="text-[10px] text-green-600 font-medium italic">Calculé sur la 1ère ligne</span>}
                        </div>
                        <div className={`text-base font-mono break-all ${previewResult?.error ? 'text-red-800 italic opacity-80' : 'text-slate-800 font-bold'}`}>
                            {previewResult ? (previewResult.error || (previewResult.value === null ? 'null' : String(previewResult.value)) + (unit && outputType === 'number' ? ` ${unit}` : '')) : <span className="text-slate-400 italic">Saisissez une formule pour voir un aperçu...</span>}
                        </div>
                    </div>

                    {/* Examples Section */}
                    <div className="border border-indigo-200 rounded-xl overflow-hidden bg-indigo-50/50 shadow-sm">
                        <button
                            onClick={() => setShowExamples(!showExamples)}
                            className="w-full p-3 flex items-center justify-between hover:bg-indigo-100/50 transition-colors"
                        >
                            <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-2">
                                <BookOpen className="w-4 h-4" />
                                Exemples d'utilisation (REMPLACER, Regex, Remplacements multiples)
                            </span>
                            {showExamples ? <ChevronUp className="w-4 h-4 text-indigo-600" /> : <ChevronDown className="w-4 h-4 text-indigo-600" />}
                        </button>

                        {showExamples && (
                            <div className="p-4 space-y-3 bg-white border-t border-indigo-200">
                                {/* Example 1: Simple replacement */}
                                <div className="border-l-4 border-indigo-400 pl-3 py-2 bg-indigo-50/30">
                                    <div className="text-[10px] font-bold text-indigo-900 mb-1">✓ Remplacement simple</div>
                                    <code className="text-[10px] font-mono text-slate-700 block mb-1">REMPLACER([Test], "AZERTY", "QSDFGH")</code>
                                    <div className="text-[9px] text-slate-600">→ Remplace toutes les occurrences de "AZERTY" par "QSDFGH"</div>
                                </div>

                                {/* Example 2: Multiple replacements */}
                                <div className="border-l-4 border-amber-400 pl-3 py-2 bg-amber-50/30">
                                    <div className="text-[10px] font-bold text-amber-900 mb-1">✓ Remplacements multiples en chaîne (ordre d'exécution)</div>
                                    <code className="text-[10px] font-mono text-slate-700 block mb-1">
                                        REMPLACER(REMPLACER(REMPLACER([Statut], "En cours", "Active"), "Terminé", "Done"), "Annulé", "Cancelled")
                                    </code>
                                    <div className="text-[9px] text-slate-600">→ Remplace plusieurs chaînes différentes en imbriquant les fonctions</div>
                                    <div className="text-[9px] text-amber-700 font-medium mt-1 bg-amber-100 p-1.5 rounded">
                                        ⚠️ Ordre d'exécution : 1️⃣ "En cours"→"Active" 2️⃣ "Terminé"→"Done" 3️⃣ "Annulé"→"Cancelled"
                                    </div>
                                    <div className="text-[9px] text-amber-700 mt-1">Les remplacements s'exécutent de l'intérieur vers l'extérieur, dans l'ordre des imbrications</div>
                                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-[9px]">
                                        <div className="font-bold text-red-900 mb-1">❌ ERREUR COURANTE : Ne mettez PAS les REMPLACER sur plusieurs lignes !</div>
                                        <code className="text-red-700 block font-mono text-[8px]">
                                            REMPLACER([Code], "A", "B")<br/>
                                            REMPLACER([Code], "C", "D") ← Ignoré !
                                        </code>
                                        <div className="text-red-800 mt-1">Seule la 1ère ligne sera prise en compte. Il faut imbriquer les fonctions.</div>
                                    </div>
                                </div>

                                {/* Example 3: Regex - Remove all digits */}
                                <div className="border-l-4 border-purple-400 pl-3 py-2 bg-purple-50/30">
                                    <div className="text-[10px] font-bold text-purple-900 mb-1">✓ Regex : Supprimer tous les chiffres</div>
                                    <code className="text-[10px] font-mono text-slate-700 block mb-1">REMPLACER([Code], "[0-9]+", "")</code>
                                    <div className="text-[9px] text-slate-600">→ "ABC123DEF" devient "ABCDEF"</div>
                                    <div className="text-[9px] text-purple-700 font-medium mt-1">Pattern: [0-9]+ = un ou plusieurs chiffres</div>
                                </div>

                                {/* Example 4: Regex - Replace spaces */}
                                <div className="border-l-4 border-green-400 pl-3 py-2 bg-green-50/30">
                                    <div className="text-[10px] font-bold text-green-900 mb-1">✓ Regex : Remplacer tous les espaces</div>
                                    <code className="text-[10px] font-mono text-slate-700 block mb-1">REMPLACER([Tel], " ", "")</code>
                                    <div className="text-[9px] text-slate-600">→ "06 12 34 56 78" devient "0612345678"</div>
                                </div>

                                {/* Example 5: Regex - Replace special chars */}
                                <div className="border-l-4 border-pink-400 pl-3 py-2 bg-pink-50/30">
                                    <div className="text-[10px] font-bold text-pink-900 mb-1">✓ Regex : Supprimer caractères spéciaux</div>
                                    <code className="text-[10px] font-mono text-slate-700 block mb-1">REMPLACER([Texte], "[^a-zA-Z0-9 ]", "")</code>
                                    <div className="text-[9px] text-slate-600">→ Garde uniquement lettres, chiffres et espaces</div>
                                    <div className="text-[9px] text-pink-700 font-medium mt-1">Pattern: [^...] = tout SAUF ce qui est dans les crochets</div>
                                </div>

                                {/* Example 6: Regex - Extract domain from email */}
                                <div className="border-l-4 border-cyan-400 pl-3 py-2 bg-cyan-50/30">
                                    <div className="text-[10px] font-bold text-cyan-900 mb-1">✓ Regex : Remplacer tout après @</div>
                                    <code className="text-[10px] font-mono text-slate-700 block mb-1">REMPLACER([Email], "@.*", "@example.com")</code>
                                    <div className="text-[9px] text-slate-600">→ "user@ancien.com" devient "user@example.com"</div>
                                    <div className="text-[9px] text-cyan-700 font-medium mt-1">Pattern: .* = n'importe quoi après @</div>
                                </div>

                                {/* Example 7: Regex - Replace text with dots (escaped) */}
                                <div className="border-l-4 border-orange-400 pl-3 py-2 bg-orange-50/30">
                                    <div className="text-[10px] font-bold text-orange-900 mb-1">✓ Regex : Remplacer texte avec points (A.B.C.D)</div>
                                    <code className="text-[10px] font-mono text-slate-700 block mb-1">REMPLACER([Code], "A\\.B\\.C\\.[A-Z]", "X.Y.Z")</code>
                                    <div className="text-[9px] text-slate-600">→ "A.B.C.D" ou "A.B.C.E" deviennent "X.Y.Z"</div>
                                    <div className="text-[9px] text-orange-700 font-medium mt-1">Important : Le point doit être échappé avec \. car en regex, . = n'importe quel caractère</div>
                                    <div className="text-[9px] text-orange-700 font-medium mt-1">Pattern: [A-Z] = une lettre majuscule (D, E, F, etc.)</div>
                                </div>

                                {/* Example 8: Multiple regex replacements with dots */}
                                <div className="border-l-4 border-teal-400 pl-3 py-2 bg-teal-50/30">
                                    <div className="text-[10px] font-bold text-teal-900 mb-1">✓ Regex : Remplacements multiples de codes avec points</div>
                                    <code className="text-[10px] font-mono text-slate-700 block mb-1 break-all">
                                        REMPLACER(REMPLACER(REMPLACER([Code Entité], "0\\.1\\.17\\.0", "AZERTT"), "A\\.6\\..*", "DAS"), "[0-9]+\\..*", "Autres")
                                    </code>
                                    <div className="text-[9px] text-slate-600 space-y-0.5">
                                        <div>→ 1️⃣ "0.1.17.0" devient "AZERTT"</div>
                                        <div>→ 2️⃣ "A.6.x.x" (A.6 suivi de n'importe quoi) devient "DAS"</div>
                                        <div>→ 3️⃣ Tous les autres codes commençant par un chiffre deviennent "Autres"</div>
                                    </div>
                                    <div className="text-[9px] text-teal-700 font-medium mt-2 bg-teal-100 p-1.5 rounded">
                                        💡 Astuce : Mettez les patterns les plus spécifiques EN PREMIER (au centre de l'imbrication), et les plus généraux à la fin (à l'extérieur)
                                    </div>
                                </div>

                                {/* Regex Quick Reference */}
                                <div className="border border-slate-300 rounded-lg p-3 bg-slate-50 mt-3">
                                    <div className="text-[10px] font-bold text-slate-700 mb-2 flex items-center gap-1">
                                        <Info className="w-3 h-3" />
                                        Aide Regex (expressions régulières)
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-[9px]">
                                        <div>
                                            <code className="font-mono text-indigo-700">[0-9]</code>
                                            <span className="text-slate-600"> = un chiffre</span>
                                        </div>
                                        <div>
                                            <code className="font-mono text-indigo-700">[a-z]</code>
                                            <span className="text-slate-600"> = une lettre minuscule</span>
                                        </div>
                                        <div>
                                            <code className="font-mono text-indigo-700">[A-Z]</code>
                                            <span className="text-slate-600"> = une lettre majuscule</span>
                                        </div>
                                        <div>
                                            <code className="font-mono text-indigo-700">[^...]</code>
                                            <span className="text-slate-600"> = tout sauf ...</span>
                                        </div>
                                        <div>
                                            <code className="font-mono text-indigo-700">+</code>
                                            <span className="text-slate-600"> = un ou plusieurs</span>
                                        </div>
                                        <div>
                                            <code className="font-mono text-indigo-700">*</code>
                                            <span className="text-slate-600"> = zéro ou plusieurs</span>
                                        </div>
                                        <div>
                                            <code className="font-mono text-indigo-700">.</code>
                                            <span className="text-slate-600"> = n'importe quel caractère</span>
                                        </div>
                                        <div>
                                            <code className="font-mono text-indigo-700">\s</code>
                                            <span className="text-slate-600"> = espace blanc</span>
                                        </div>
                                        <div>
                                            <code className="font-mono text-indigo-700">\.</code>
                                            <span className="text-slate-600"> = point littéral (échappé)</span>
                                        </div>
                                        <div>
                                            <code className="font-mono text-indigo-700">\\</code>
                                            <span className="text-slate-600"> = échapper un caractère spécial</span>
                                        </div>
                                    </div>
                                    <div className="mt-2 text-[9px] text-slate-500 italic">
                                        Note : SUBSTITUER ne supporte pas les regex, utilisez REMPLACER pour les patterns complexes
                                    </div>
                                </div>

                                {/* Practical tip */}
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mt-2">
                                    <div className="text-[9px] text-blue-900 flex items-start gap-1">
                                        <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <strong>Astuce :</strong> Pour remplacer plusieurs chaînes différentes, imbriquez les REMPLACER les uns dans les autres comme dans l'exemple 2. Les remplacements sont ordonnancés : la première règle (la plus imbriquée) s'exécute en premier, puis la seconde, puis la troisième, etc. Testez avec l'aperçu en temps réel pour vérifier le résultat !
                                        </div>
                                    </div>
                                </div>

                                {/* Complete Documentation Button */}
                                <button
                                    onClick={() => setShowHelpModal(true)}
                                    className="w-full mt-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg p-3 flex items-center justify-center gap-2 font-medium text-sm transition-all shadow-md hover:shadow-lg"
                                >
                                    <BookOpen className="w-5 h-5" />
                                    📚 Voir la documentation complète
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-3 flex-shrink-0">
                    <Button variant="outline" onClick={onClose} className="flex-1">Annuler</Button>
                    <Button
                        onClick={handleSave}
                        disabled={!name || !formula || !!previewResult?.error}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 shadow-md text-white font-bold"
                    >
                        {initialField ? <Check className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                        {initialField ? 'Enregistrer les modifications' : 'Créer le champ'}
                    </Button>
                </div>
            </div>

            {/* Help Modal */}
            <CalculatedFieldHelpModal
                isOpen={showHelpModal}
                onClose={() => setShowHelpModal(false)}
            />
        </div>
    );
};
