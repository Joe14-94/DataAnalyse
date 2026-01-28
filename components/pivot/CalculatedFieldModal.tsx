import React, { useState, useEffect, useRef } from 'react';
import { X, Calculator, Plus, Info, FunctionSquare, Database, Sparkles, Check } from 'lucide-react';
import { Button } from '../ui/Button';
import { evaluateFormula } from '../../utils';
import { CalculatedField } from '../../types';

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
    const [previewResult, setPreviewResult] = useState<{ value: any; error?: string } | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (initialField) {
            setName(initialField.name);
            setFormula(initialField.formula);
            setOutputType(initialField.outputType);
            setUnit(initialField.unit || '');
        } else {
            setName('');
            setFormula('');
            setOutputType('number');
            setUnit('');
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
                    const res = evaluateFormula(sampleRow, formula);
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
    }, [formula, sampleRow]);

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

    const handleSave = () => {
        if (name && formula) {
            onSave({
                id: initialField?.id,
                name,
                formula,
                outputType,
                unit: outputType === 'number' ? unit : undefined
            });
            onClose();
        }
    };

    const functions = [
        { name: 'SI', syntax: 'SI(condition, vrai, faux)', desc: 'Condition logique' },
        { name: 'SOMME', syntax: 'SOMME(v1, v2...)', desc: 'Additionne les valeurs' },
        { name: 'MOYENNE', syntax: 'MOYENNE(v1, v2...)', desc: 'Moyenne des valeurs' },
        { name: 'ARRONDI', syntax: 'ARRONDI(nombre, décimales)', desc: 'Arrondit un nombre' },
        { name: 'ABS', syntax: 'ABS(nombre)', desc: 'Valeur absolue' },
    ];

    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full overflow-hidden flex flex-col max-h-[90vh]">
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

                <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Left Column: Basic Info & Formula (span 5) */}
                        <div className="lg:col-span-5 space-y-4">
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
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Type de résultat</label>
                                    <select
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none"
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
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                            placeholder="Ex: €, %"
                                            value={unit}
                                            onChange={e => setUnit(e.target.value)}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Middle Column: Fields (span 3) */}
                        <div className="lg:col-span-3 flex flex-col border border-slate-200 rounded-xl overflow-hidden bg-slate-50 shadow-inner">
                            <div className="flex bg-white border-b border-slate-200 p-2.5 items-center gap-2">
                                <Database className="w-3.5 h-3.5 text-indigo-600" />
                                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Champs</span>
                            </div>
                            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar max-h-[400px]">
                                <div className="grid grid-cols-1 gap-1.5">
                                    {fields.map(f => (
                                        <button
                                            key={f}
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

                        {/* Right Column: Functions (span 4) */}
                        <div className="lg:col-span-4 flex flex-col border border-slate-200 rounded-xl overflow-hidden bg-slate-50 shadow-inner">
                            <div className="flex bg-white border-b border-slate-200 p-2.5 items-center gap-2">
                                <FunctionSquare className="w-3.5 h-3.5 text-indigo-600" />
                                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Fonctions</span>
                            </div>
                            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar max-h-[400px]">
                                <div className="space-y-1.5">
                                    {functions.map(fn => (
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
        </div>
    );
};
