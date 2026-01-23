
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Card } from '../components/ui/Card';
import { Heading, Text } from '../components/ui/Typography';
import { BarChart3, TrendingUp, Wallet, ArrowDownUp, FileDown, Table2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { calculatePL, DEFAULT_COA } from '../logic/financialEngine';

export const Finance: React.FC = () => {
    const { datasets, batches, currentDatasetId } = useData();
    const [activeTab, setActiveTab] = useState<'pl' | 'balance' | 'cashflow'>('pl');

    // Configuration simple pour le prototype
    const [accountField, setAccountField] = useState('Compte');
    const [amountField, setAmountField] = useState('Montant');

    const currentDataset = datasets.find(d => d.id === currentDatasetId);
    const datasetBatches = batches.filter(b => b.datasetId === currentDatasetId);
    const latestBatch = datasetBatches[datasetBatches.length - 1];
    const prevBatch = datasetBatches.length > 1 ? datasetBatches[datasetBatches.length - 2] : null;

    const plData = useMemo(() => {
        if (!latestBatch) return [];
        return calculatePL(latestBatch.rows, prevBatch ? prevBatch.rows : null, accountField, amountField, DEFAULT_COA);
    }, [latestBatch, prevBatch, accountField, amountField]);

    return (
        <div className="h-full overflow-y-auto p-4 md:p-8 custom-scrollbar bg-canvas font-sans">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <Heading level={2} className="flex items-center gap-2">
                            <BarChart3 className="w-6 h-6 text-txt-muted" /> États Financiers
                        </Heading>
                        <Text variant="muted">Analyse du Compte de Résultat et du Bilan</Text>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" icon={<FileDown className="w-4 h-4" />}>Exporter PDF</Button>
                        <Button variant="outline" icon={<Table2 className="w-4 h-4" />}>Excel</Button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-border-default space-x-8">
                    <button
                        onClick={() => setActiveTab('pl')}
                        className={`pb-4 text-sm font-bold transition-colors relative ${activeTab === 'pl' ? 'text-brand-600' : 'text-txt-muted hover:text-txt-secondary'}`}
                    >
                        Compte de Résultat (P&L)
                        {activeTab === 'pl' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600 rounded-full" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('balance')}
                        className={`pb-4 text-sm font-bold transition-colors relative ${activeTab === 'balance' ? 'text-brand-600' : 'text-txt-muted hover:text-txt-secondary'}`}
                    >
                        Bilan
                        {activeTab === 'balance' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600 rounded-full" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('cashflow')}
                        className={`pb-4 text-sm font-bold transition-colors relative ${activeTab === 'cashflow' ? 'text-brand-600' : 'text-txt-muted hover:text-txt-secondary'}`}
                    >
                        Flux de Trésorerie
                        {activeTab === 'cashflow' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600 rounded-full" />}
                    </button>
                </div>

                {/* Configuration / Filtres Rapides */}
                <Card className="bg-white/50 border-dashed">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-1">
                        <div>
                            <label className="text-[10px] font-bold text-txt-muted uppercase mb-1 block">Champ Compte</label>
                            <select
                                value={accountField}
                                onChange={(e) => setAccountField(e.target.value)}
                                className="w-full bg-white border border-border-default rounded px-2 py-1.5 text-sm"
                            >
                                {currentDataset?.fields.map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-txt-muted uppercase mb-1 block">Champ Montant</label>
                            <select
                                value={amountField}
                                onChange={(e) => setAmountField(e.target.value)}
                                className="w-full bg-white border border-border-default rounded px-2 py-1.5 text-sm"
                            >
                                {currentDataset?.fields.map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                        </div>
                    </div>
                </Card>

                {/* Display Area */}
                <div className="grid grid-cols-1 gap-6">
                    {activeTab === 'pl' && (
                        <Card title="Compte de Résultat Simplifié">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border-default">
                                            <th className="text-left py-3 font-bold text-txt-secondary px-4">Rubrique</th>
                                            <th className="text-right py-3 font-bold text-txt-secondary px-4">Réalisé (N)</th>
                                            <th className="text-right py-3 font-bold text-txt-secondary px-4">Précédent (N-1)</th>
                                            <th className="text-right py-3 font-bold text-txt-secondary px-4">Variation (%)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border-default">
                                        {plData.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="py-8 text-center text-txt-muted italic">
                                                    Chargez des données comptables pour afficher le P&L
                                                </td>
                                            </tr>
                                        ) : (
                                            plData.map(line => {
                                                const isMargin = ['MB', 'EBITDA', 'RN'].includes(line.code);
                                                const isHeader = line.level === 0 && !isMargin;
                                                const variation = line.prevValue && line.value ? ((line.value - line.prevValue) / Math.abs(line.prevValue)) * 100 : 0;

                                                return (
                                                    <tr key={line.code} className={`
                                                        ${isHeader ? 'bg-slate-50 font-bold text-slate-800' : ''}
                                                        ${isMargin ? 'bg-brand-50 font-bold text-brand-900 border-y-2 border-brand-100' : ''}
                                                    `}>
                                                        <td className={`py-3 px-4 ${line.level > 0 ? 'pl-8 text-txt-secondary' : ''}`}>
                                                            {line.code} - {line.name}
                                                        </td>
                                                        <td className={`text-right py-3 px-4 font-mono ${isMargin ? 'text-brand-600' : ''}`}>
                                                            {line.value.toLocaleString('fr-FR')} €
                                                        </td>
                                                        <td className="text-right py-3 px-4 text-txt-muted font-mono">
                                                            {line.prevValue ? `${line.prevValue.toLocaleString('fr-FR')} €` : '-'}
                                                        </td>
                                                        <td className={`text-right py-3 px-4 font-bold ${variation > 0 ? 'text-emerald-600' : variation < 0 ? 'text-red-600' : 'text-txt-muted'}`}>
                                                            {line.prevValue ? (
                                                                <span className="flex items-center justify-end gap-1">
                                                                    {variation > 0 ? <TrendingUp size={12} /> : null}
                                                                    {variation.toFixed(1)}%
                                                                </span>
                                                            ) : '-'}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    )}

                    {activeTab === 'balance' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card title="Actif" icon={<TrendingUp className="text-brand-600" />}>
                                <div className="h-48 flex items-center justify-center text-txt-muted italic">Bilan Actif en cours de construction...</div>
                            </Card>
                            <Card title="Passif" icon={<Wallet className="text-brand-600" />}>
                                <div className="h-48 flex items-center justify-center text-txt-muted italic">Bilan Passif en cours de construction...</div>
                            </Card>
                        </div>
                    )}

                    {activeTab === 'cashflow' && (
                        <Card title="Flux de Trésorerie">
                            <div className="h-64 flex items-center justify-center text-txt-muted italic">Le tableau de flux sera disponible prochainement</div>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
};
