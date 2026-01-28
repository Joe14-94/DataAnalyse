import React, { useState, useEffect } from 'react';
import { X, Calculator, Plus, Info } from 'lucide-react';
import { Button } from '../ui/Button';

interface CalculatedFieldModalProps {
    isOpen: boolean;
    onClose: () => void;
    fields: string[];
    onSave: (name: string, formula: string) => void;
}

export const CalculatedFieldModal: React.FC<CalculatedFieldModalProps> = ({ isOpen, onClose, fields, onSave }) => {
    if (!isOpen) return null;

    const [name, setName] = useState('');
    const [formula, setFormula] = useState('');
    const [field1, setField1] = useState('');
    const [field2, setField2] = useState('');
    const [mode, setMode] = useState<'custom' | 'percent'>('percent');

    const handleSave = () => {
        let finalFormula = formula;
        if (mode === 'percent' && field1 && field2) {
            finalFormula = `([${field1}] / [${field2}]) * 100`;
        }
        if (name && finalFormula) {
            onSave(name, finalFormula);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-indigo-50">
                    <div className="flex items-center gap-2">
                        <Calculator className="w-5 h-5 text-indigo-600" />
                        <h3 className="font-bold text-slate-800">Ajouter un champ calculé</h3>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nom du champ</label>
                        <input
                            type="text"
                            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="Ex: Taux de marge, % Réalisation"
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                    </div>

                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button
                            onClick={() => setMode('percent')}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${mode === 'percent' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Pourcentage (%)
                        </button>
                        <button
                            onClick={() => setMode('custom')}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${mode === 'custom' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Formule libre
                        </button>
                    </div>

                    {mode === 'percent' ? (
                        <div className="space-y-3 p-3 bg-indigo-50/50 rounded-lg border border-indigo-100">
                            <div>
                                <label className="block text-[10px] font-bold text-indigo-700 uppercase mb-1">Numérateur (A)</label>
                                <select
                                    className="w-full border border-indigo-200 rounded-md px-2 py-1.5 text-sm bg-white"
                                    value={field1}
                                    onChange={e => setField1(e.target.value)}
                                >
                                    <option value="">-- Choisir --</option>
                                    {fields.map(f => <option key={f} value={f}>{f}</option>)}
                                </select>
                            </div>
                            <div className="flex justify-center text-indigo-300">
                                <div className="h-px bg-indigo-200 w-full self-center"></div>
                                <span className="px-2 font-bold">/</span>
                                <div className="h-px bg-indigo-200 w-full self-center"></div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-indigo-700 uppercase mb-1">Dénominateur (B)</label>
                                <select
                                    className="w-full border border-indigo-200 rounded-md px-2 py-1.5 text-sm bg-white"
                                    value={field2}
                                    onChange={e => setField2(e.target.value)}
                                >
                                    <option value="">-- Choisir --</option>
                                    {fields.map(f => <option key={f} value={f}>{f}</option>)}
                                </select>
                            </div>
                            <p className="text-[10px] text-indigo-600 italic mt-1 flex items-center gap-1">
                                <Info className="w-3 h-3" /> Formule : (A / B) * 100
                            </p>
                        </div>
                    ) : (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex justify-between">
                                <span>Formule</span>
                                <span className="text-[10px] normal-case font-normal text-slate-400">Ex: [Ventes] - [Coûts]</span>
                            </label>
                            <textarea
                                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none h-24"
                                placeholder="Utilisez les noms de champs entre crochets []"
                                value={formula}
                                onChange={e => setFormula(e.target.value)}
                            />
                        </div>
                    )}
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-3">
                    <Button variant="outline" onClick={onClose} className="flex-1">Annuler</Button>
                    <Button
                        onClick={handleSave}
                        disabled={!name || (mode === 'percent' ? (!field1 || !field2) : !formula)}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 shadow-md"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Créer le champ
                    </Button>
                </div>
            </div>
        </div>
    );
};
