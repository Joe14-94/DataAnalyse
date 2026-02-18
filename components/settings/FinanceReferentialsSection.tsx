import React from 'react';
import { Building2, FileText, GitBranch, CalendarDays, Users, Plus, Trash2, Check, X } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { ChartOfAccounts, AnalyticalAxis, FiscalCalendar, MasterDataItem, MasterDataType } from '../../types/finance';

interface FinanceReferentialsSectionProps {
    activeFinanceTab: 'charts' | 'axes' | 'calendar' | 'masterdata';
    setActiveFinanceTab: (tab: 'charts' | 'axes' | 'calendar' | 'masterdata') => void;
    chartsOfAccounts: ChartOfAccounts[];
    importPCGTemplate: () => void;
    importIFRSTemplate: () => void;
    editingChartId: string | null;
    editChartName: string;
    setEditChartName: (name: string) => void;
    saveChartEditing: () => void;
    cancelChartEditing: () => void;
    handleViewChart: (id: string) => void;
    startEditingChart: (id: string, name: string) => void;
    setDefaultChartOfAccounts: (id: string) => void;
    handleDeleteChart: (id: string, name: string) => void;
    analyticalAxes: AnalyticalAxis[];
    setShowAxisModal: (show: boolean) => void;
    fiscalCalendars: FiscalCalendar[];
    setShowCalendarModal: (show: boolean) => void;
    masterData: MasterDataItem[];
    setMasterDataType: (type: MasterDataType) => void;
    setShowMasterDataModal: (show: boolean) => void;
}

export const FinanceReferentialsSection: React.FC<FinanceReferentialsSectionProps> = ({
    activeFinanceTab, setActiveFinanceTab, chartsOfAccounts, importPCGTemplate, importIFRSTemplate,
    editingChartId, editChartName, setEditChartName, saveChartEditing, cancelChartEditing,
    handleViewChart, startEditingChart, setDefaultChartOfAccounts, handleDeleteChart,
    analyticalAxes, setShowAxisModal, fiscalCalendars, setShowCalendarModal,
    masterData, setMasterDataType, setShowMasterDataModal
}) => {
    return (
        <Card title="Référentiels Finance & Comptabilité" icon={<Building2 className="w-5 h-5 text-brand-600" />}>
            <div className="space-y-6">
                <p className="text-sm text-slate-600">
                    Configurez les référentiels comptables et analytiques pour structurer vos analyses financières.
                </p>

                <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
                    {[
                        { id: 'charts' as const, label: 'Plans comptables', icon: FileText },
                        { id: 'axes' as const, label: 'Axes analytiques', icon: GitBranch },
                        { id: 'calendar' as const, label: 'Calendrier fiscal', icon: CalendarDays },
                        { id: 'masterdata' as const, label: 'Tiers & produits', icon: Users }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveFinanceTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-bold transition-all ${
                                activeFinanceTab === tab.id ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="min-h-[200px]">
                    {activeFinanceTab === 'charts' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-slate-800">Plans comptables configurés</h3>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={importPCGTemplate} className="text-brand-600 border-brand-200 hover:bg-brand-50"><FileText className="w-4 h-4 mr-2" />Importer PCG</Button>
                                    <Button variant="outline" size="sm" onClick={importIFRSTemplate} className="text-purple-600 border-purple-200 hover:bg-purple-50"><FileText className="w-4 h-4 mr-2" />Importer IFRS</Button>
                                </div>
                            </div>
                            {chartsOfAccounts.length === 0 ? (
                                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg p-8 text-center">
                                    <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                    <p className="text-slate-500 font-medium mb-2">Aucun plan comptable configuré</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100 border border-slate-200 rounded-md bg-white">
                                    {chartsOfAccounts.map(chart => (
                                        <div key={chart.id} className="p-4 hover:bg-slate-50 transition-colors">
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex-1 min-w-0">
                                                    {editingChartId === chart.id ? (
                                                        <div className="flex items-center gap-2">
                                                            <input type="text" className="border border-slate-300 rounded px-2 py-1 text-sm font-bold text-slate-800 flex-1" value={editChartName} onChange={(e) => setEditChartName(e.target.value)} autoFocus />
                                                            <button onClick={saveChartEditing} className="bg-brand-100 text-brand-700 p-1.5 rounded"><Check className="w-4 h-4" /></button>
                                                            <button onClick={cancelChartEditing} className="bg-slate-100 text-slate-600 p-1.5 rounded"><X className="w-4 h-4" /></button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="flex items-center gap-3">
                                                                <h4 className="font-bold text-slate-800">{chart.name}</h4>
                                                                {chart.isDefault && <span className="text-xs font-bold px-2 py-1 bg-brand-100 text-brand-700 rounded">Par défaut</span>}
                                                            </div>
                                                            <div className="text-xs text-slate-500 mt-1">{chart.standard} • {chart.accounts.length} comptes</div>
                                                        </>
                                                    )}
                                                </div>
                                                {!editingChartId && (
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <Button variant="outline" size="sm" onClick={() => handleViewChart(chart.id)} className="text-brand-600 border-brand-200">Voir</Button>
                                                        <Button variant="outline" size="sm" onClick={() => startEditingChart(chart.id, chart.name)} className="text-slate-600 border-slate-200">Renommer</Button>
                                                        {!chart.isDefault && <Button variant="ghost" size="sm" onClick={() => setDefaultChartOfAccounts(chart.id)} className="text-slate-500">Par défaut</Button>}
                                                        <Button variant="outline" size="sm" onClick={() => handleDeleteChart(chart.id, chart.name)} className="text-red-600 border-red-200"><Trash2 className="w-4 h-4" /></Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeFinanceTab === 'axes' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-slate-800">Axes analytiques configurés</h3>
                                <Button variant="outline" size="sm" onClick={() => setShowAxisModal(true)} className="text-brand-600 border-brand-200"><Plus className="w-4 h-4 mr-2" />Nouvel axe</Button>
                            </div>
                            {analyticalAxes.length === 0 ? (
                                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg p-8 text-center">
                                    <GitBranch className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                    <p className="text-slate-500 font-medium mb-2">Aucun axe analytique configuré</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100 border border-slate-200 rounded-md bg-white">
                                    {analyticalAxes.map((axis) => (
                                        <div key={axis.id} className="p-4 hover:bg-slate-50">
                                            <div className="flex items-center gap-3">
                                                <h4 className="font-bold text-slate-800">{axis.name}</h4>
                                                <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-600">{axis.code}</span>
                                                {axis.isMandatory && <span className="text-xs font-bold px-2 py-1 bg-red-100 text-red-700 rounded">Obligatoire</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeFinanceTab === 'calendar' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-slate-800">Calendriers fiscaux</h3>
                                <Button variant="outline" size="sm" onClick={() => setShowCalendarModal(true)} className="text-brand-600 border-brand-200"><Plus className="w-4 h-4 mr-2" />Nouvel exercice</Button>
                            </div>
                            {fiscalCalendars.length === 0 ? (
                                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg p-8 text-center">
                                    <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                    <p className="text-slate-500 font-medium mb-2">Aucun calendrier fiscal configuré</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100 border border-slate-200 rounded-md bg-white">
                                    {fiscalCalendars.map((cal) => (
                                        <div key={cal.id} className="p-4">
                                            <h4 className="font-bold text-slate-800">Exercice {cal.fiscalYear}</h4>
                                            <div className="text-xs text-slate-500">{cal.startDate} → {cal.endDate} • {cal.periods.length} périodes</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeFinanceTab === 'masterdata' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-slate-800">Données de référence</h3>
                            </div>
                            <div className="space-y-3">
                                {['customer', 'supplier', 'product', 'employee'].map(type => {
                                    const items = masterData.filter(md => md.type === type && md.isActive);
                                    const labels: any = { customer: 'Clients', supplier: 'Fournisseurs', product: 'Produits', employee: 'Salariés' };
                                    return (
                                        <div key={type} className="border border-slate-200 rounded-lg p-3 bg-white">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-bold text-slate-700">{labels[type]} ({items.length})</span>
                                                <Button variant="ghost" size="sm" onClick={() => { setMasterDataType(type as any); setShowMasterDataModal(true); }} className="text-brand-600">Ajouter</Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
};
