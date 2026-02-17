import React, { useState } from 'react';
import { X, Layout, GripVertical, Trash2, Edit2, Check, MonitorPlay, Plus, Save, MousePointerClick } from 'lucide-react';
import { Button } from '../ui/Button';
import { SpecificDashboardItem } from '../../types';

interface SpecificDashboardModalProps {
    isOpen: boolean;
    onClose: () => void;
    items: SpecificDashboardItem[];
    setItems: (items: SpecificDashboardItem[]) => void;
    onStartSelection: () => void;
    onSave: (title: string, items: SpecificDashboardItem[]) => void;
}

export const SpecificDashboardModal: React.FC<SpecificDashboardModalProps> = ({
    isOpen, onClose, items, setItems, onStartSelection, onSave
}) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editLabel, setEditLabel] = useState('');
    const [dashboardTitle, setDashboardTitle] = useState('Nouveau Rapport TCD');

    if (!isOpen) return null;

    const removeItem = (id: string) => {
        setItems(items.filter(item => item.id !== id));
    };

    const startEditing = (item: SpecificDashboardItem) => {
        setEditingId(item.id);
        setEditLabel(item.label);
    };

    const saveEdit = () => {
        if (editingId) {
            setItems(items.map(item => item.id === editingId ? { ...item, label: editLabel } : item));
            setEditingId(null);
        }
    };

    const moveItem = (index: number, direction: 'up' | 'down') => {
        const newItems = [...items];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex >= 0 && targetIndex < newItems.length) {
            [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
            setItems(newItems);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 lg:p-8 animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl shadow-2xl w-[90vw] h-[90vh] overflow-hidden flex flex-col border border-slate-200">
                {/* Header */}
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-brand-50 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="bg-brand-600 p-1.5 rounded-lg text-white">
                            <MonitorPlay className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800">Constructeur de Dashboard Spécifique</h3>
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Arrangez vos indicateurs clés</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-white rounded-full transition-colors"><X className="w-5 h-5" /></button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar / List of items */}
                    <div className="w-full md:w-80 border-r border-slate-200 flex flex-col bg-slate-50">
                        <div className="p-4 border-b border-slate-200 bg-white">
                            <Button
                                onClick={onStartSelection}
                                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-2 shadow-sm flex items-center justify-center gap-2"
                            >
                                <MousePointerClick className="w-4 h-4" />
                                Sélectionner des cellules
                            </Button>
                            <p className="text-xs text-slate-400 mt-2 italic text-center">
                                Cliquez sur les cellules du tableau pour les ajouter
                            </p>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Composants ({items.length})</h4>
                            {items.length === 0 ? (
                                <div className="text-center py-10 px-4">
                                    <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Plus className="w-6 h-6 text-slate-400" />
                                    </div>
                                    <p className="text-xs text-slate-500">Aucun élément sélectionné. Utilisez le bouton ci-dessus pour commencer.</p>
                                </div>
                            ) : (
                                items.map((item, idx) => (
                                    <div key={item.id} className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm hover:border-brand-300 transition-all group relative">
                                        <div className="flex justify-between items-start mb-1">
                                            <div className="flex-1 min-w-0">
                                                {editingId === item.id ? (
                                                    <div className="flex gap-1">
                                                        <input
                                                            className="flex-1 text-xs border border-brand-300 rounded px-1 py-0.5 outline-none"
                                                            value={editLabel}
                                                            onChange={e => setEditLabel(e.target.value)}
                                                            autoFocus
                                                        />
                                                        <button onClick={saveEdit} className="text-green-600 hover:bg-green-50 rounded p-0.5"><Check className="w-3 h-3" /></button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-xs font-bold text-slate-700 truncate" title={item.label}>{item.label}</span>
                                                        <button onClick={() => startEditing(item)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-brand-500 transition-opacity"><Edit2 className="w-2.5 h-2.5" /></button>
                                                    </div>
                                                )}
                                                <div className="text-xs text-slate-400 truncate">{item.rowPath.join(' > ')} | {item.colLabel}</div>
                                            </div>
                                            <button onClick={() => removeItem(item.id)} className="text-slate-300 hover:text-red-500 ml-2"><Trash2 className="w-3.5 h-3.5" /></button>
                                        </div>
                                        <div className="text-lg font-black text-brand-600 font-mono mt-1">{item.value}</div>

                                        {/* Move Controls */}
                                        <div className="absolute -left-3 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => moveItem(idx, 'up')}
                                                disabled={idx === 0}
                                                className="bg-white border border-slate-200 rounded-full p-0.5 shadow-sm text-slate-400 hover:text-brand-600 disabled:opacity-0"
                                            >
                                                <GripVertical className="w-3 h-3 rotate-90" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Preview / Canvas Area */}
                    <div className="flex-1 bg-slate-100 overflow-y-auto p-8 custom-scrollbar">
                        <div className="max-w-3xl mx-auto">
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 min-h-[600px] flex flex-col overflow-hidden">
                                <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-brand-500 to-indigo-600 text-white group relative">
                                    {editingId === 'title' ? (
                                        <div className="flex gap-2">
                                            <input
                                                className="flex-1 text-2xl font-black bg-white/20 border border-white/30 rounded px-2 outline-none text-white placeholder:text-white/50"
                                                value={dashboardTitle}
                                                onChange={e => setDashboardTitle(e.target.value)}
                                                autoFocus
                                            />
                                            <button onClick={() => setEditingId(null)} className="bg-white/20 hover:bg-white/30 rounded p-1"><Check className="w-5 h-5" /></button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <h2 className="text-2xl font-black">{dashboardTitle}</h2>
                                            <button onClick={() => { setEditingId('title'); }} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/20 rounded transition-all"><Edit2 className="w-4 h-4" /></button>
                                        </div>
                                    )}
                                    <p className="text-emerald-50 text-sm opacity-80 mt-1">Rapport personnalisé généré depuis le TCD</p>
                                </div>

                                <div className="p-8 grid grid-cols-2 lg:grid-cols-3 gap-6">
                                    {items.length === 0 ? (
                                        <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 rounded-xl">
                                            <Layout className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                            <p className="text-slate-400 font-medium">Votre dashboard est vide</p>
                                        </div>
                                    ) : (
                                        items.map((item) => (
                                            <div key={item.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                                                <div className="mb-4">
                                                    <h5 className="text-xs font-black text-slate-400 uppercase tracking-[0.1em] mb-1">{item.label}</h5>
                                                    <div className="h-1 w-8 bg-brand-500 rounded-full"></div>
                                                </div>
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-3xl font-black text-slate-800 tracking-tight font-mono">{item.value}</span>
                                                </div>
                                                <div className="mt-4 pt-3 border-t border-slate-50">
                                                    <p className="text-xs text-slate-400 leading-tight italic truncate">
                                                        {item.rowPath[item.rowPath.length-1]} ({item.colLabel})
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center flex-shrink-0">
                    <p className="text-xs text-slate-500 italic">Glissez les éléments ou utilisez les flèches pour réorganiser votre dashboard.</p>
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={onClose}>Annuler</Button>
                        <Button
                            className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-8 shadow-md"
                            disabled={items.length === 0}
                            onClick={() => onSave(dashboardTitle, items)}
                        >
                            <Save className="w-4 h-4 mr-2" />
                            Sauvegarder le Dashboard
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
