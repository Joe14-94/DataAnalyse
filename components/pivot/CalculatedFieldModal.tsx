import React, { useState, useEffect, useRef } from 'react';
import { X, Calculator, Plus, FunctionSquare, Database, Sparkles, Check, ChevronDown, ChevronUp, BookOpen, Trash2, ArrowUp, ArrowDown, Wand2, Type as TypeIcon, Scissors, Layers, Copy } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
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
    const [name, setName] = useState(initialField?.name || '');
    const [formula, setFormula] = useState(initialField?.formula || '');
    const [outputType, setOutputType] = useState<'number' | 'text' | 'boolean' | 'date'>(initialField?.outputType || 'number');
    const [unit, setUnit] = useState(initialField?.unit || '');
    const [mode, setMode] = useState<'formula' | 'actions'>(initialField?.mode || 'formula');
    const [actions, setActions] = useState<CalculatedFieldAction[]>(initialField?.actions || []);

    const [previewResult, setPreviewResult] = useState<{ value: any; error?: string } | null>(null);
    const [copied, setCopied] = useState(false);
    const [showExamples, setShowExamples] = useState(false);
    const [showHelpModal, setShowHelpModal] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (isOpen) {
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
                } catch {
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
        { name: 'SI', syntax: 'SI(condition, vrai, faux)', desc: 'Condition logique', category: 'Logique' },
        { name: 'SOMME', syntax: 'SOMME(v1, v2...)', desc: 'Additionne les valeurs', category: 'Math' },
        { name: 'MOYENNE', syntax: 'MOYENNE(v1, v2...)', desc: 'Moyenne des valeurs', category: 'Math' },
        { name: 'ARRONDI', syntax: 'ARRONDI(nombre, décimales)', desc: 'Arrondit un nombre', category: 'Math' },
        { name: 'ABS', syntax: 'ABS(nombre)', desc: 'Valeur absolue', category: 'Math' },
        { name: 'MIN', syntax: 'MIN(v1, v2...)', desc: 'Valeur minimale', category: 'Math' },
        { name: 'MAX', syntax: 'MAX(v1, v2...)', desc: 'Valeur maximale', category: 'Math' },
        { name: 'CONCAT', syntax: 'CONCAT(texte1, texte2, [sep])', desc: 'Concatène avec séparateur optionnel', category: 'Texte' },
        { name: 'MAJUSCULE', syntax: 'MAJUSCULE(texte)', desc: 'Convertit en majuscules', category: 'Texte' },
        { name: 'MINUSCULE', syntax: 'MINUSCULE(texte)', desc: 'Convertit en minuscules', category: 'Texte' },
        { name: 'CAPITALISEPREMIER', syntax: 'CAPITALISEPREMIER(texte)', desc: 'Première lettre en majuscule', category: 'Texte' },
        { name: 'CAPITALISEMOTS', syntax: 'CAPITALISEMOTS(texte)', desc: 'Chaque mot commence par une majuscule', category: 'Texte' },
        { name: 'REMPLACER', syntax: 'REMPLACER(texte, cherche, remplace)', desc: 'Remplace avec regex', category: 'Texte' },
        { name: 'SUBSTITUER', syntax: 'SUBSTITUER(texte, ancien, nouveau)', desc: 'Remplace sans regex', category: 'Texte' },
        { name: 'TROUVE', syntax: 'TROUVE(cherche, texte, [début])', desc: 'Position de la sous-chaîne (-1 si absent)', category: 'Texte' },
        { name: 'CONTIENT', syntax: 'CONTIENT(texte, cherche)', desc: 'Vérifie si contient la sous-chaîne', category: 'Texte' },
        { name: 'EXTRAIRE', syntax: 'EXTRAIRE(texte, début, [long])', desc: 'Extrait une sous-chaîne', category: 'Texte' },
        { name: 'GAUCHE', syntax: 'GAUCHE(texte, nb)', desc: 'Premiers n caractères', category: 'Texte' },
        { name: 'DROITE', syntax: 'DROITE(texte, nb)', desc: 'Derniers n caractères', category: 'Texte' },
        { name: 'LONGUEUR', syntax: 'LONGUEUR(texte)', desc: 'Nombre de caractères', category: 'Texte' },
        { name: 'SUPPRESPACE', syntax: 'SUPPRESPACE(texte)', desc: 'Supprime les espaces de début/fin', category: 'Texte' },

        // Fonctions DATE
        { name: 'AUJOURDHUI', syntax: 'AUJOURDHUI()', desc: 'Date du jour', category: 'Date' },
        { name: 'ANNEE', syntax: 'ANNEE(date)', desc: "Extrait l'année d'une date", category: 'Date' },
        { name: 'MOIS', syntax: 'MOIS(date)', desc: "Extrait le mois (1-12) d'une date", category: 'Date' },
        { name: 'JOUR', syntax: 'JOUR(date)', desc: "Extrait le jour (1-31) d'une date", category: 'Date' },
        { name: 'DATE', syntax: 'DATE(annee, mois, jour)', desc: 'Crée une date', category: 'Date' },
        { name: 'DATEDIF', syntax: 'DATEDIF(d1, d2, [unité])', desc: 'Écart entre 2 dates (unité: j, m, a)', category: 'Date' },
    ];

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={initialField ? 'Modifier le champ calculé' : 'Nouveau champ calculé'}
            icon={<Calculator className="w-5 h-5" />}
            maxWidth="full"
            footer={
                <div className="flex gap-ds-3 w-full">
                    <Button variant="outline" onClick={onClose} className="flex-1">Annuler</Button>
                    <Button
                        onClick={handleSave}
                        disabled={!name || !formula || !!previewResult?.error}
                        className="flex-1 bg-brand-600 hover:bg-brand-700 shadow-md text-white font-bold"
                    >
                        {initialField ? <Check className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                        {initialField ? 'Enregistrer les modifications' : 'Créer le champ'}
                    </Button>
                </div>
            }
        >
            <div className="space-y-ds-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-4 space-y-4">
                        <div className="bg-canvas p-4 rounded-xl border border-border-default space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-txt-muted uppercase mb-1.5 tracking-wider">Nom du champ</label>
                                <input
                                    type="text"
                                    className="w-full border border-border-default rounded-lg px-3 py-2 text-sm bg-surface text-txt-main focus:ring-2 focus:ring-brand-500 outline-none shadow-sm transition-all"
                                    placeholder="Ex: Taux de marge, % Réalisation"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-txt-muted uppercase mb-1.5 tracking-wider">Type de résultat</label>
                                    <select
                                        className="w-full border border-border-default rounded-lg px-3 py-1.5 text-sm bg-surface text-txt-main shadow-sm focus:ring-2 focus:ring-brand-500 outline-none"
                                        value={outputType}
                                        onChange={e => setOutputType(e.target.value as any)}
                                    >
                                        <option value="number">Nombre</option>
                                        <option value="text">Texte</option>
                                        <option value="boolean">Vrai/Faux</option>
                                        <option value="date">Date</option>
                                    </select>
                                </div>
                                {outputType === 'number' ? (
                                    <div>
                                        <label className="block text-xs font-bold text-txt-muted uppercase mb-1.5 tracking-wider">Unité</label>
                                        <input
                                            type="text"
                                            className="w-full border border-border-default rounded-lg px-3 py-1.5 text-sm bg-surface text-txt-main shadow-sm focus:ring-2 focus:ring-brand-500 outline-none"
                                            placeholder="Ex: €, %"
                                            value={unit}
                                            onChange={e => setUnit(e.target.value)}
                                        />
                                    </div>
                                ) : <div />}
                            </div>

                            <div className="pt-2">
                                <label className="block text-xs font-bold text-txt-muted uppercase mb-2 tracking-wider">Mode de création</label>
                                <div className="flex p-1 bg-border-default rounded-lg gap-1">
                                    <button
                                        onClick={() => setMode('formula')}
                                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${mode === 'formula' ? 'bg-surface text-brand-600 shadow-sm' : 'text-txt-secondary hover:bg-canvas'}`}
                                    >
                                        Formule libre
                                    </button>
                                    <button
                                        onClick={() => {
                                            setMode('actions');
                                            if (actions.length === 0) addAction('source');
                                        }}
                                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${mode === 'actions' ? 'bg-surface text-brand-600 shadow-sm' : 'text-txt-secondary hover:bg-canvas'}`}
                                    >
                                        Assistant
                                    </button>
                                </div>
                            </div>
                        </div>

                        {mode === 'formula' ? (
                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-txt-muted uppercase mb-1.5 tracking-wider flex justify-between">
                                    <span>Formule</span>
                                    <span className="text-xs normal-case font-medium text-txt-muted">Ex: [Ventes] - [Coûts]</span>
                                </label>
                                <div className="relative group">
                                    <textarea
                                        ref={textareaRef}
                                        className="w-full border border-border-default rounded-lg px-3 py-2 text-sm font-mono bg-canvas text-txt-main focus:ring-2 focus:ring-brand-500 outline-none h-40 shadow-sm transition-all focus:bg-surface"
                                        placeholder="Utilisez les noms de champs entre crochets []"
                                        value={formula}
                                        onChange={e => setFormula(e.target.value)}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="block text-xs font-bold text-txt-muted uppercase tracking-wider">Séquence d'actions</label>
                                </div>

                                <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                                    {actions.length === 0 ? (
                                        <div className="text-center py-8 bg-canvas rounded-xl border border-dashed border-border-default">
                                            <Layers className="w-8 h-8 text-txt-muted mx-auto mb-2" />
                                            <p className="text-xs text-txt-muted font-medium px-4">Aucune action définie.</p>
                                        </div>
                                    ) : (
                                        actions.map((action, idx) => (
                                            <div key={action.id} className="bg-surface border border-border-default rounded-xl shadow-sm overflow-hidden group transition-all hover:border-brand-300">
                                                <div className="px-3 py-2 border-b border-border-default flex items-center justify-between bg-canvas">
                                                    <div className="flex items-center gap-2">
                                                        <span className="bg-brand-600 text-white w-4 h-4 rounded-full text-xs flex items-center justify-center font-bold">{idx + 1}</span>
                                                        <span className="text-xs font-bold text-txt-main uppercase tracking-tight truncate w-32">
                                                            {action.type === 'source' ? 'Source' : action.type.toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {action.type !== 'source' && (
                                                            <>
                                                                <button onClick={() => moveAction(idx, 'up')} disabled={idx <= 1} className="p-1 text-txt-muted hover:text-brand-600 disabled:opacity-20"><ArrowUp className="w-3 h-3" /></button>
                                                                <button onClick={() => moveAction(idx, 'down')} disabled={idx === actions.length - 1} className="p-1 text-txt-muted hover:text-brand-600 disabled:opacity-20"><ArrowDown className="w-3 h-3" /></button>
                                                                <button onClick={() => removeAction(action.id)} className="p-1 text-txt-muted hover:text-danger-text"><Trash2 className="w-3 h-3" /></button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="p-3 space-y-3">
                                                    {action.type === 'source' && (
                                                        <select
                                                            className="w-full text-xs border border-border-default rounded px-2 py-1 bg-canvas text-txt-main font-bold"
                                                            value={action.params.field || ''}
                                                            onChange={e => updateAction(action.id, { field: e.target.value })}
                                                        >
                                                            <option value="" disabled>Sélectionner un champ</option>
                                                            {fields.map(f => <option key={f} value={f}>{f}</option>)}
                                                        </select>
                                                    )}
                                                    {action.type === 'replace' && (
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <input type="text" className="w-full text-xs border border-border-default rounded px-2 py-1 bg-canvas" placeholder="Chercher" value={action.params.search || ''} onChange={e => updateAction(action.id, { search: e.target.value })} />
                                                            <input type="text" className="w-full text-xs border border-border-default rounded px-2 py-1 bg-canvas" placeholder="Remplacer" value={action.params.replacement || ''} onChange={e => updateAction(action.id, { replacement: e.target.value })} />
                                                        </div>
                                                    )}
                                                    {/* Other simplified action inputs */}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-2 pt-2">
                                    <button onClick={() => addAction('trim')} className="px-2 py-1.5 bg-canvas border border-border-default rounded-lg text-[10px] font-bold text-txt-secondary hover:border-brand-300 transition-all flex items-center gap-1.5"><Scissors className="w-3 h-3" /> TRIM</button>
                                    <button onClick={() => addAction('upper')} className="px-2 py-1.5 bg-canvas border border-border-default rounded-lg text-[10px] font-bold text-txt-secondary hover:border-brand-300 transition-all flex items-center gap-1.5"><TypeIcon className="w-3 h-3" /> UPPER</button>
                                    <button onClick={() => addAction('replace')} className="px-2 py-1.5 bg-canvas border border-border-default rounded-lg text-[10px] font-bold text-txt-secondary hover:border-brand-300 transition-all flex items-center gap-1.5"><Wand2 className="w-3 h-3" /> REPLACE</button>
                                    <button onClick={() => addAction('concat')} className="px-2 py-1.5 bg-canvas border border-border-default rounded-lg text-[10px] font-bold text-txt-secondary hover:border-brand-300 transition-all flex items-center gap-1.5"><Plus className="w-3 h-3" /> CONCAT</button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="lg:col-span-5 flex flex-col border border-border-default rounded-xl overflow-hidden bg-canvas shadow-inner">
                        <div className="flex bg-surface border-b border-border-default p-2.5 items-center gap-2">
                            <Database className="w-3.5 h-3.5 text-brand-600" />
                            <span className="text-xs font-bold text-txt-main uppercase tracking-wider">Champs disponibles</span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar min-h-[300px]">
                            <div className="grid grid-cols-1 gap-1.5">
                                {fields.map(f => (
                                    <button
                                        key={f}
                                        onClick={() => insertIntoFormula(`[${f}]`)}
                                        className="group text-left px-3 py-2 bg-surface border border-border-default rounded-lg text-xs text-txt-main hover:border-brand-300 hover:bg-brand-50 transition-all flex items-center justify-between"
                                    >
                                        <span className="truncate flex-1 font-medium">{f}</span>
                                        <Plus className="w-3 h-3 text-txt-muted group-hover:text-brand-500" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-3 flex flex-col border border-border-default rounded-xl overflow-hidden bg-canvas shadow-inner">
                        <div className="flex bg-surface border-b border-border-default p-2.5 items-center gap-2">
                            <FunctionSquare className="w-3.5 h-3.5 text-brand-600" />
                            <span className="text-xs font-bold text-txt-main uppercase tracking-wider">Fonctions</span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar max-h-[400px]">
                            <div className="space-y-3">
                                {['Logique', 'Math', 'Texte', 'Date'].map(category => {
                                    const categoryFunctions = functions.filter(fn => fn.category === category);
                                    if (categoryFunctions.length === 0) return null;
                                    return (
                                        <div key={category}>
                                            <div className="text-xs font-bold text-txt-muted uppercase tracking-wider mb-1.5 px-1">{category}</div>
                                            <div className="space-y-1.5">
                                                {categoryFunctions.map(fn => (
                                                    <button
                                                        key={fn.name}
                                                        onClick={() => insertIntoFormula(`${fn.name}(`)}
                                                        className="w-full text-left px-3 py-2 bg-surface border border-border-default rounded-lg hover:border-brand-300 hover:bg-brand-50 transition-all group"
                                                    >
                                                        <div className="flex justify-between items-center mb-0.5">
                                                            <span className="text-xs font-bold text-brand-700 font-mono">{fn.name}</span>
                                                            <Plus className="w-3 h-3 text-txt-muted group-hover:text-brand-500" />
                                                        </div>
                                                        <div className="text-[10px] text-txt-muted font-mono mb-1">{fn.syntax}</div>
                                                        <div className="text-[10px] text-txt-secondary leading-tight">{fn.desc}</div>
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

                <div className={`p-4 rounded-xl border ${previewResult?.error ? 'bg-danger-bg/20 border-danger-border' : 'bg-success-bg/20 border-success-border'} transition-all shadow-sm`}>
                    <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${previewResult?.error ? 'text-danger-text' : 'text-success-text'}`}>
                            {previewResult?.error ? <X className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                            {previewResult?.error ? 'Erreur' : 'Aperçu'}
                        </span>
                        {!previewResult?.error && formula && previewResult && (
                            <button
                                onClick={() => {
                                    const val = String(previewResult!.value) + (unit && outputType === 'number' ? ` ${unit}` : '');
                                    navigator.clipboard.writeText(val);
                                    setCopied(true);
                                    setTimeout(() => setCopied(false), 2000);
                                }}
                                className="flex items-center gap-1 text-[10px] font-bold text-success-text bg-surface px-2 py-0.5 rounded border border-success-border hover:bg-success-bg/30 transition-colors shadow-sm"
                            >
                                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                {copied ? 'Copié !' : 'Copier'}
                            </button>
                        )}
                    </div>
                    <div className={`text-base font-mono break-all ${previewResult?.error ? 'text-danger-text italic' : 'text-txt-main font-bold'}`}>
                        {previewResult ? (
                            previewResult.error ||
                            (previewResult.value === null ? 'null' :
                             (previewResult.value instanceof Date ? previewResult.value.toLocaleDateString('fr-FR') : String(previewResult.value))) +
                            (unit && outputType === 'number' ? ` ${unit}` : '')
                        ) : <span className="text-txt-muted italic">Aperçu...</span>}
                    </div>
                </div>

                <div className="border border-brand-100 rounded-xl overflow-hidden bg-brand-50/20 shadow-sm">
                    <button
                        onClick={() => setShowExamples(!showExamples)}
                        className="w-full p-3 flex items-center justify-between hover:bg-brand-50/50 transition-colors"
                    >
                        <span className="text-xs font-bold text-brand-700 uppercase tracking-wider flex items-center gap-2">
                            <BookOpen className="w-4 h-4" />
                            Exemples d'utilisation
                        </span>
                        {showExamples ? <ChevronUp className="w-4 h-4 text-brand-600" /> : <ChevronDown className="w-4 h-4 text-brand-600" />}
                    </button>
                    {showExamples && (
                        <div className="p-4 space-y-3 bg-surface border-t border-brand-100">
                             <div className="border-l-4 border-brand-400 pl-3 py-2 bg-brand-50/30">
                                <div className="text-xs font-bold text-brand-900 mb-1">✓ Remplacement simple</div>
                                <code className="text-[11px] font-mono text-txt-secondary block mb-1">REMPLACER([Statut], "A", "B")</code>
                            </div>
                            <div className="border-l-4 border-amber-400 pl-3 py-2 bg-amber-50/30">
                                <div className="text-xs font-bold text-amber-900 mb-1">✓ Calcul de date</div>
                                <code className="text-[11px] font-mono text-txt-secondary block mb-1">DATEDIF([Date début], [Date fin], "j")</code>
                            </div>
                            <button
                                onClick={() => setShowHelpModal(true)}
                                className="w-full mt-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg p-2 text-xs font-bold transition-all shadow-sm"
                            >
                                Documentation complète
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <CalculatedFieldHelpModal
                isOpen={showHelpModal}
                onClose={() => setShowHelpModal(false)}
            />
        </Modal>
    );
};
