import React, { useState, useMemo } from 'react';
import { X, Search, ChevronRight, Calculator, Check, AlertCircle, Info } from 'lucide-react';
import { FINANCE_KPI_LIBRARY, KpiTemplate } from '../../logic/financeKpis';
import { Button } from '../ui/Button';

interface KpiLibraryModalProps {
    isOpen: boolean;
    onClose: () => void;
    datasetFields: string[];
    onSelectKpi: (template: KpiTemplate, mapping: Record<string, string>) => void;
}

export const KpiLibraryModal: React.FC<KpiLibraryModalProps> = ({
    isOpen,
    onClose,
    datasetFields,
    onSelectKpi
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedKpi, setSelectedKpi] = useState<KpiTemplate | null>(null);
    const [mapping, setMapping] = useState<Record<string, string>>({});

    const categories = useMemo(() => Array.from(new Set(FINANCE_KPI_LIBRARY.map(k => k.category))), []);

    const filteredKpis = useMemo(() => {
        return FINANCE_KPI_LIBRARY.filter(k => {
            const matchesSearch = k.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                k.description.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = !selectedCategory || k.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [searchTerm, selectedCategory]);

    if (!isOpen) return null;

    const handleSelectKpiTemplate = (kpi: KpiTemplate) => {
        setSelectedKpi(kpi);
        // Auto-map if field name matches requirement label (case insensitive)
        const initialMapping: Record<string, string> = {};
        kpi.requirements.forEach(req => {
            const match = datasetFields.find(f => f.toLowerCase() === req.label.toLowerCase());
            if (match) initialMapping[req.id] = match;
        });
        setMapping(initialMapping);
    };

    const isMappingComplete = selectedKpi && selectedKpi.requirements.every(req => mapping[req.id]);

    const handleConfirm = () => {
        if (selectedKpi && isMappingComplete) {
            onSelectKpi(selectedKpi, mapping);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-600 rounded-lg text-white">
                            <Calculator className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Bibliothèque KPI Finance</h2>
                            <p className="text-xs text-slate-500">Choisissez un indicateur standard et mappez vos données</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-400">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 flex overflow-hidden min-h-[400px]">
                    {/* Left Panel: List */}
                    <div className="w-1/2 border-r border-slate-200 flex flex-col">
                        <div className="p-4 border-b border-slate-100 space-y-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    className="w-full pl-9 pr-3 py-2 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Rechercher un indicateur..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                <button
                                    onClick={() => setSelectedCategory(null)}
                                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors ${!selectedCategory ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                >
                                    Tous
                                </button>
                                {categories.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
                                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors ${selectedCategory === cat ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                            {filteredKpis.map(kpi => (
                                <button
                                    key={kpi.id}
                                    onClick={() => handleSelectKpiTemplate(kpi)}
                                    className={`w-full text-left p-3 rounded-lg transition-all border ${selectedKpi?.id === kpi.id ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200' : 'bg-white border-transparent hover:bg-slate-50'}`}
                                >
                                    <div className="flex justify-between items-start">
                                        <span className="text-xs font-bold text-slate-800">{kpi.name}</span>
                                        <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded uppercase font-bold">{kpi.category}</span>
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-1 line-clamp-1">{kpi.description}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Right Panel: Mapping */}
                    <div className="w-1/2 bg-slate-50/50 flex flex-col">
                        {selectedKpi ? (
                            <div className="flex-1 flex flex-col overflow-hidden">
                                <div className="p-6 border-b border-slate-100 bg-white">
                                    <h3 className="font-bold text-slate-800 text-sm mb-1">{selectedKpi.name}</h3>
                                    <p className="text-xs text-slate-500 italic">{selectedKpi.description}</p>
                                    <div className="mt-3 p-2 bg-slate-50 rounded border border-slate-200 font-mono text-[10px] text-slate-600 flex items-center gap-2">
                                        <Calculator className="w-3 h-3" /> Formule : {selectedKpi.formula}
                                    </div>
                                </div>

                                <div className="p-6 flex-1 overflow-y-auto space-y-6 custom-scrollbar">
                                    <div>
                                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Mappez les données requises</h4>
                                        <div className="space-y-4">
                                            {selectedKpi.requirements.map(req => (
                                                <div key={req.id} className="space-y-1.5">
                                                    <div className="flex justify-between">
                                                        <label className="text-xs font-bold text-slate-700">{req.label}</label>
                                                        <span className="text-[10px] text-indigo-600 flex items-center gap-1"><Info className="w-3 h-3" /> {req.type}</span>
                                                    </div>
                                                    <p className="text-[10px] text-slate-400 italic mb-1">{req.description}</p>
                                                    <select
                                                        className={`w-full p-2 text-xs border rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 ${mapping[req.id] ? 'border-indigo-300' : 'border-slate-300'}`}
                                                        value={mapping[req.id] || ''}
                                                        onChange={e => setMapping({ ...mapping, [req.id]: e.target.value })}
                                                    >
                                                        <option value="">-- Sélectionner une colonne --</option>
                                                        {datasetFields.map(f => (
                                                            <option key={f} value={f}>{f}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {!isMappingComplete && (
                                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2 text-amber-700">
                                            <AlertCircle className="w-4 h-4 shrink-0" />
                                            <p className="text-[10px]">Veuillez mapper tous les champs requis pour générer cet indicateur.</p>
                                        </div>
                                    )}

                                    {isMappingComplete && (
                                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex gap-2 text-green-700 animate-in fade-in slide-in-from-bottom-2">
                                            <Check className="w-4 h-4 shrink-0" />
                                            <p className="text-[10px]">Mapping complet ! Le KPI pourra être calculé avec précision.</p>
                                        </div>
                                    )}
                                </div>

                                <div className="p-6 bg-white border-t border-slate-100 flex justify-end gap-3">
                                    <Button variant="outline" onClick={() => setSelectedKpi(null)}>Précédent</Button>
                                    <Button disabled={!isMappingComplete} onClick={handleConfirm} className="bg-indigo-600 hover:bg-indigo-700">
                                        Générer l'indicateur
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                    <ChevronRight className="w-8 h-8" />
                                </div>
                                <h3 className="font-bold text-slate-600">Sélectionnez un KPI</h3>
                                <p className="text-xs max-w-[200px] mt-2">Choisissez un indicateur dans la liste à gauche pour configurer son mapping.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
