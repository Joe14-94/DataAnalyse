import React from 'react';
import { History, Trash2, X, Check, FileText } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { formatDateFr } from '../../utils';

interface VersionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    ds: any;
    dsBatches: any[];
    deleteBatch: (id: string) => void;
}

export const VersionsModal: React.FC<VersionsModalProps> = ({ isOpen, onClose, ds, dsBatches, deleteBatch }) => {
    if (!isOpen) return null;
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Gérer les imports : ${ds?.name}`}
            icon={<History className="w-6 h-6 text-brand-600" />}
            maxWidth="2xl"
        >
            <div className="space-y-4">
                <p className="text-sm text-slate-600 mb-4">Liste de toutes les versions de données importées.</p>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b">
                            <tr>
                                <th className="px-4 py-3 font-bold text-slate-700">Date d'import</th>
                                <th className="px-4 py-3 font-bold text-slate-700">Lignes</th>
                                <th className="px-4 py-3 text-right font-bold text-slate-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y bg-white">
                            {dsBatches.length === 0 ? <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-400 italic">Aucun import.</td></tr> : dsBatches.map(batch => (
                                <tr key={batch.id}>
                                    <td className="px-4 py-3 font-medium">{formatDateFr(batch.date)}</td>
                                    <td className="px-4 py-3">{batch.rows.length}</td>
                                    <td className="px-4 py-3 text-right">
                                        <button onClick={() => { if (window.confirm(`Supprimer l'import du ${formatDateFr(batch.date)} ?`)) deleteBatch(batch.id); }} className="text-red-500 hover:bg-red-50 p-1.5 rounded"><Trash2 className="w-4 h-4" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="flex justify-end pt-4"><Button variant="outline" onClick={onClose}>Fermer</Button></div>
            </div>
        </Modal>
    );
};

interface AxisModalProps {
    isOpen: boolean;
    onClose: () => void;
    axisForm: any;
    setAxisForm: (form: any) => void;
    handleCreateAxis: () => void;
}

export const AxisModal: React.FC<AxisModalProps> = ({ isOpen, onClose, axisForm, setAxisForm, handleCreateAxis }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-slate-800 mb-4">Créer un axe analytique</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Code *</label>
                        <input type="text" className="w-full px-3 py-2 border rounded-md" placeholder="Ex: CC" value={axisForm.code} onChange={(e) => setAxisForm({ ...axisForm, code: e.target.value.toUpperCase() })} maxLength={10} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Nom *</label>
                        <input type="text" className="w-full px-3 py-2 border rounded-md" placeholder="Ex: Centre de coûts" value={axisForm.name} onChange={(e) => setAxisForm({ ...axisForm, name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={axisForm.isMandatory} onChange={(e) => setAxisForm({ ...axisForm, isMandatory: e.target.checked })} className="w-4 h-4" /><span className="text-sm">Obligatoire</span></label>
                        <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={axisForm.allowMultiple} onChange={(e) => setAxisForm({ ...axisForm, allowMultiple: e.target.checked })} className="w-4 h-4" /><span className="text-sm">Ventilation multiple</span></label>
                    </div>
                    <div className="flex gap-3 pt-4"><Button onClick={handleCreateAxis} className="flex-1"><Check className="w-4 h-4 mr-2" />Créer</Button><Button variant="outline" onClick={onClose} className="flex-1"><X className="w-4 h-4 mr-2" />Annuler</Button></div>
                </div>
            </div>
        </div>
    );
};

interface CalendarModalProps {
    isOpen: boolean;
    onClose: () => void;
    calendarForm: any;
    setCalendarForm: (form: any) => void;
    handleCreateCalendar: () => void;
}

export const CalendarModal: React.FC<CalendarModalProps> = ({ isOpen, onClose, calendarForm, setCalendarForm, handleCreateCalendar }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-slate-800 mb-4">Créer un exercice fiscal</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Année *</label>
                        <input type="number" className="w-full px-3 py-2 border rounded-md" value={calendarForm.fiscalYear} onChange={(e) => setCalendarForm({ ...calendarForm, fiscalYear: parseInt(e.target.value) })} min="2000" max="2100" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Début *</label>
                        <input type="date" className="w-full px-3 py-2 border rounded-md" value={calendarForm.startDate} onChange={(e) => setCalendarForm({ ...calendarForm, startDate: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Fin *</label>
                        <input type="date" className="w-full px-3 py-2 border rounded-md" value={calendarForm.endDate} onChange={(e) => setCalendarForm({ ...calendarForm, endDate: e.target.value })} />
                    </div>
                    <div className="flex gap-3 pt-4"><Button onClick={handleCreateCalendar} className="flex-1"><Check className="w-4 h-4 mr-2" />Créer</Button><Button variant="outline" onClick={onClose} className="flex-1"><X className="w-4 h-4 mr-2" />Annuler</Button></div>
                </div>
            </div>
        </div>
    );
};

interface MasterDataModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: string;
    form: any;
    setForm: (form: any) => void;
    onConfirm: () => void;
}

export const MasterDataModal: React.FC<MasterDataModalProps> = ({ isOpen, onClose, type, form, setForm, onConfirm }) => {
    if (!isOpen) return null;
    const label = type === 'customer' ? 'client' : type === 'supplier' ? 'fournisseur' : type === 'product' ? 'produit' : 'salarié';
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-slate-800 mb-4">Ajouter un {label}</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Code *</label>
                        <input type="text" className="w-full px-3 py-2 border rounded-md" placeholder="Ex: CLI001" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Nom *</label>
                        <input type="text" className="w-full px-3 py-2 border rounded-md" placeholder="Ex: ACME Corp" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Catégorie</label>
                        <input type="text" className="w-full px-3 py-2 border rounded-md" placeholder="Ex: VIP" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                    </div>
                    {(type === 'customer' || type === 'supplier') && (
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">N° TVA / SIREN</label>
                            <input type="text" className="w-full px-3 py-2 border rounded-md" value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} />
                        </div>
                    )}
                    <div className="flex gap-3 pt-4"><Button onClick={onConfirm} className="flex-1"><Check className="w-4 h-4 mr-2" />Créer</Button><Button variant="outline" onClick={onClose} className="flex-1"><X className="w-4 h-4 mr-2" />Annuler</Button></div>
                </div>
            </div>
        </div>
    );
};

interface ChartViewerModalProps {
    id: string | null;
    onClose: () => void;
    chartsOfAccounts: any[];
    searchQuery: string;
    setSearchQuery: (q: string) => void;
}

export const ChartViewerModal: React.FC<ChartViewerModalProps> = ({ id, onClose, chartsOfAccounts, searchQuery, setSearchQuery }) => {
    if (!id) return null;
    const chart = chartsOfAccounts.find(c => c.id === id);
    if (!chart) return null;

    const filteredAccounts = chart.accounts.filter((acc: any) =>
        searchQuery === '' ||
        acc.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        acc.label.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a: any, b: any) => a.code.localeCompare(b.code));

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] shadow-xl flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 border-b flex justify-between items-start">
                    <div>
                        <h3 className="text-xl font-bold">{chart.name}</h3>
                        <p className="text-sm text-slate-500">{chart.standard} • {chart.accounts.length} comptes</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-500" /></button>
                </div>
                <div className="p-6 border-b">
                    <input type="text" placeholder="Rechercher un compte..." className="w-full px-4 py-2 border rounded-md" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <div className="space-y-1">
                        <div className="grid grid-cols-12 gap-4 pb-2 border-b text-xs font-bold text-slate-600 uppercase sticky top-0 bg-white">
                            <div className="col-span-2">Code</div><div className="col-span-6">Libellé</div><div className="col-span-2">Nature</div><div className="col-span-2 text-right">Imputable</div>
                        </div>
                        {filteredAccounts.map((account: any) => (
                            <div key={account.id} className={`grid grid-cols-12 gap-4 py-2 px-3 rounded hover:bg-slate-50 text-sm ${account.level === 1 ? 'bg-slate-50 font-bold' : ''}`}>
                                <div className="col-span-2 font-mono">{account.code}</div>
                                <div className="col-span-6 truncate">{'  '.repeat(Math.max(0, account.level - 1))}{account.label}</div>
                                <div className="col-span-2 truncate">{account.nature}</div>
                                <div className="col-span-2 text-right">{account.canReceiveEntries ? 'Oui' : 'Non'}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
