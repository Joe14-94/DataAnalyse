import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
    TrendingUp, Plus, Calendar, BarChart3, RefreshCw, Brain,
    Edit2, Trash2, Eye, Save, X, ArrowLeft, Play, Lightbulb,
    AlertCircle, CheckCircle, Clock, FileText, Target, Zap
} from 'lucide-react';
import { useForecast } from '../context/ForecastContext';
import { useReferentials } from '../context/ReferentialContext';
import { ForecastLine, ForecastType } from '../types';

type ForecastTab = 'list' | 'editor' | 'rolling' | 'ml' | 'reconciliation' | 'drivers';

export const Forecast: React.FC = () => {
    const [activeTab, setActiveTab] = useState<ForecastTab>('list');
    const {
        forecasts,
        addForecast, updateForecast, deleteForecast,
        addVersion, updateVersion, setActiveVersion,
        addLine, updateLine, deleteLine, updateLineValue,
        addDriver, updateDriver, deleteDriver, updateDriverValue,
        createRollingSnapshot, getRollingSnapshots,
        generateMLPredictions, detectSeasonality, calculateTrend,
        reconciliationReports, createReconciliationReport,
        submitVersion, validateVersion
    } = useForecast();
    const { chartsOfAccounts, fiscalCalendars } = useReferentials();

    // Editor state
    const [selectedForecastId, setSelectedForecastId] = useState<string | null>(null);
    const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
    const [editingCellId, setEditingCellId] = useState<string | null>(null);
    const [editingValue, setEditingValue] = useState<string>('');
    const [showNewLineModal, setShowNewLineModal] = useState(false);
    const [accountSearchQuery, setAccountSearchQuery] = useState('');

    // Drivers state
    const [showNewDriverModal, setShowNewDriverModal] = useState(false);
    const [driverName, setDriverName] = useState('');
    const [driverUnit, setDriverUnit] = useState('');

    // Get selected forecast and version
    const selectedForecast = selectedForecastId ? forecasts.find(f => f.id === selectedForecastId) : null;
    const selectedVersion = selectedForecast && selectedVersionId
        ? selectedForecast.versions.find(v => v.id === selectedVersionId)
        : null;
    const selectedChart = selectedForecast
        ? chartsOfAccounts.find(c => c.id === selectedForecast.chartOfAccountsId)
        : null;
    const selectedCalendar = selectedForecast?.fiscalCalendarId
        ? fiscalCalendars.find(c => c.id === selectedForecast.fiscalCalendarId)
        : null;

    // Generate period IDs for next 12 months from reference date
    const generatePeriods = (referenceDate: string, count: number = 12) => {
        const periods = [];
        const startDate = new Date(referenceDate);
        for (let i = 0; i < count; i++) {
            const date = new Date(startDate);
            date.setMonth(date.getMonth() + i);
            periods.push({
                id: date.toISOString().substring(0, 7),
                name: date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
            });
        }
        return periods;
    };

    // Handler functions
    const handleCreateForecast = (
        name: string,
        type: ForecastType,
        fiscalYear: number,
        chartId: string,
        isRolling: boolean
    ) => {
        const today = new Date();
        const referenceDate = today.toISOString().split('T')[0];

        addForecast({
            name,
            type,
            fiscalYear,
            chartOfAccountsId: chartId,
            fiscalCalendarId: fiscalCalendars[0]?.id,
            isRolling,
            rollingHorizonMonths: isRolling ? 12 : undefined,
            autoUpdateEnabled: isRolling,
            drivers: [],
            versions: [],
            owner: 'Current User',
            isLocked: false
        });
    };

    const handleSelectForecast = (forecastId: string) => {
        const forecast = forecasts.find(f => f.id === forecastId);
        setSelectedForecastId(forecastId);
        if (forecast) {
            const activeVersion = forecast.versions.find(v => v.id === forecast.activeVersionId) || forecast.versions[0];
            setSelectedVersionId(activeVersion?.id || null);
        }
        setActiveTab('editor');
    };

    const handleAddVersion = () => {
        if (!selectedForecastId || !selectedForecast) return;
        const newVersionNumber = selectedForecast.versions.length + 1;
        const today = new Date().toISOString().split('T')[0];

        addVersion(selectedForecastId, {
            forecastId: selectedForecastId,
            versionNumber: newVersionNumber,
            name: `Version ${newVersionNumber}`,
            referenceDate: today,
            status: 'draft',
            lines: [],
            isActive: false
        });
    };

    const handleAddLine = (accountCode: string) => {
        if (!selectedForecastId || !selectedVersionId) return;
        const account = selectedChart?.accounts.find(a => a.code === accountCode);
        if (!account) return;

        addLine(selectedForecastId, selectedVersionId, {
            accountCode: account.code,
            accountLabel: account.label,
            method: 'manual',
            forecastValues: {},
            isLocked: false
        });
        setShowNewLineModal(false);
        setAccountSearchQuery('');
    };

    const handleCellEdit = (lineId: string, periodId: string, currentValue: number) => {
        setEditingCellId(`${lineId}-${periodId}`);
        setEditingValue(currentValue.toString());
    };

    const handleCellSave = (lineId: string, periodId: string) => {
        if (!selectedForecastId || !selectedVersionId) return;
        const value = parseFloat(editingValue) || 0;
        updateLineValue(selectedForecastId, selectedVersionId, lineId, periodId, value);
        setEditingCellId(null);
        setEditingValue('');
    };

    const handleCellCancel = () => {
        setEditingCellId(null);
        setEditingValue('');
    };

    const handleDeleteLine = (lineId: string) => {
        if (!selectedForecastId || !selectedVersionId) return;
        if (window.confirm('Êtes-vous sûr de vouloir supprimer cette ligne de forecast ?')) {
            deleteLine(selectedForecastId, selectedVersionId, lineId);
        }
    };

    const handleGenerateMLPredictions = (lineId: string) => {
        if (!selectedForecastId || !selectedVersionId) return;
        generateMLPredictions(selectedForecastId, selectedVersionId, lineId, 24);
    };

    const handleAddDriver = () => {
        if (!selectedForecastId || !driverName.trim()) return;
        addDriver(selectedForecastId, {
            name: driverName,
            unit: driverUnit,
            historicalValues: {},
            forecastValues: {}
        });
        setShowNewDriverModal(false);
        setDriverName('');
        setDriverUnit('');
    };

    const handleCreateSnapshot = () => {
        if (!selectedForecastId) return;
        const today = new Date().toISOString().split('T')[0];
        createRollingSnapshot(selectedForecastId, today);
    };

    return (
        <div className="p-6 max-w-[1600px] mx-auto">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-slate-800 mb-2 flex items-center gap-3">
                    <TrendingUp className="w-8 h-8 text-brand-600" />
                    Forecast & Rolling Forecast
                </h1>
                <p className="text-slate-600">
                    Pilotage moderne avec prévisions glissantes et machine learning
                </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-slate-200 overflow-x-auto">
                {[
                    { id: 'list' as ForecastTab, label: 'Liste', icon: FileText },
                    { id: 'editor' as ForecastTab, label: 'Éditeur', icon: Edit2 },
                    { id: 'drivers' as ForecastTab, label: 'Inducteurs', icon: Target },
                    { id: 'rolling' as ForecastTab, label: 'Rolling Forecast', icon: RefreshCw },
                    { id: 'ml' as ForecastTab, label: 'Prédictions ML', icon: Brain },
                    { id: 'reconciliation' as ForecastTab, label: 'Réconciliation', icon: BarChart3 }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
                            activeTab === tab.id
                                ? 'border-brand-600 text-brand-600'
                                : 'border-transparent text-slate-600 hover:text-slate-800'
                        }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div>
                {/* LIST TAB */}
                {activeTab === 'list' && (
                    <div className="space-y-6">
                        {/* Quick Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <Card className="border-l-4 border-l-brand-500">
                                <div className="text-sm text-slate-600 font-bold">Total Forecasts</div>
                                <div className="text-2xl font-bold text-slate-800 mt-1">
                                    {forecasts.length}
                                </div>
                            </Card>
                            <Card className="border-l-4 border-l-blue-500">
                                <div className="text-sm text-slate-600 font-bold">Rolling Forecasts</div>
                                <div className="text-2xl font-bold text-slate-800 mt-1">
                                    {forecasts.filter(f => f.isRolling).length}
                                </div>
                            </Card>
                            <Card className="border-l-4 border-l-purple-500">
                                <div className="text-sm text-slate-600 font-bold">ML Activé</div>
                                <div className="text-2xl font-bold text-slate-800 mt-1">
                                    {forecasts.filter(f => f.mlConfig?.enabled).length}
                                </div>
                            </Card>
                            <Card className="border-l-4 border-l-green-500">
                                <div className="text-sm text-slate-600 font-bold">Rapports</div>
                                <div className="text-2xl font-bold text-slate-800 mt-1">
                                    {reconciliationReports.length}
                                </div>
                            </Card>
                        </div>

                        {/* Action Button */}
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold text-slate-800">Mes Forecasts</h2>
                            <Button
                                className="bg-brand-600 hover:bg-brand-700"
                                onClick={() => {
                                    const year = new Date().getFullYear();
                                    const defaultChart = chartsOfAccounts[0];
                                    if (!defaultChart) {
                                        alert('Veuillez d\'abord créer un plan comptable dans les paramètres.');
                                        return;
                                    }
                                    const name = prompt('Nom du forecast:', `Forecast ${year}`);
                                    if (name) {
                                        const isRolling = window.confirm('Rolling forecast (12 mois glissants) ?');
                                        handleCreateForecast(name, 'monthly', year, defaultChart.id, isRolling);
                                    }
                                }}
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Nouveau forecast
                            </Button>
                        </div>

                        {/* Forecasts List */}
                        {forecasts.length === 0 ? (
                            <Card>
                                <div className="text-center py-12">
                                    <TrendingUp className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                                    <h3 className="text-lg font-bold text-slate-800 mb-2">
                                        Aucun forecast
                                    </h3>
                                    <p className="text-sm text-slate-600 mb-6">
                                        Créez votre premier forecast pour commencer les prévisions
                                    </p>
                                    <Button
                                        className="bg-brand-600 hover:bg-brand-700"
                                        onClick={() => {
                                            const year = new Date().getFullYear();
                                            const defaultChart = chartsOfAccounts[0];
                                            if (!defaultChart) {
                                                alert('Veuillez d\'abord créer un plan comptable.');
                                                return;
                                            }
                                            const name = prompt('Nom du forecast:', `Forecast ${year}`);
                                            if (name) {
                                                const isRolling = window.confirm('Rolling forecast ?');
                                                handleCreateForecast(name, 'monthly', year, defaultChart.id, isRolling);
                                            }
                                        }}
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Créer un forecast
                                    </Button>
                                </div>
                            </Card>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {forecasts.map(forecast => {
                                    const activeVersion = forecast.versions.find(v => v.id === forecast.activeVersionId);
                                    const statusColors = {
                                        draft: 'bg-gray-100 text-gray-700',
                                        submitted: 'bg-blue-100 text-blue-700',
                                        validated: 'bg-green-100 text-green-700',
                                        locked: 'bg-purple-100 text-purple-700'
                                    };

                                    return (
                                        <Card key={forecast.id} className="hover:shadow-lg transition-shadow">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex-1">
                                                    <h3 className="font-bold text-slate-800 mb-1">
                                                        {forecast.name}
                                                        {forecast.isRolling && (
                                                            <RefreshCw className="w-4 h-4 text-blue-600 inline-block ml-2" />
                                                        )}
                                                    </h3>
                                                    <div className="flex items-center gap-2 text-xs text-slate-600">
                                                        <Calendar className="w-3 h-3" />
                                                        <span>Exercice {forecast.fiscalYear}</span>
                                                    </div>
                                                </div>
                                                {activeVersion && (
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${statusColors[activeVersion.status]}`}>
                                                        {activeVersion.status}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="space-y-2 mb-3">
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-slate-600">Type:</span>
                                                    <span className="font-bold text-slate-800">{forecast.type}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-slate-600">Versions:</span>
                                                    <span className="font-bold text-slate-800">{forecast.versions.length}</span>
                                                </div>
                                                {forecast.isRolling && (
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="text-slate-600">Snapshots:</span>
                                                        <span className="font-bold text-slate-800">
                                                            {forecast.rollingSnapshots?.length || 0}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2 pt-3 border-t border-slate-200">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="flex-1 text-blue-600 border-blue-200"
                                                    onClick={() => handleSelectForecast(forecast.id)}
                                                >
                                                    <Eye className="w-4 h-4 mr-2" />
                                                    Voir
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="flex-1 text-slate-600 border-slate-200"
                                                    onClick={() => handleSelectForecast(forecast.id)}
                                                >
                                                    <Edit2 className="w-4 h-4 mr-2" />
                                                    Éditer
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="text-red-600 border-red-200"
                                                    onClick={() => {
                                                        if (window.confirm(`Supprimer "${forecast.name}" ?`)) {
                                                            deleteForecast(forecast.id);
                                                        }
                                                    }}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* EDITOR TAB - Similar to Budget editor but with forecast-specific features */}
                {activeTab === 'editor' && !selectedForecastId && (
                    <Card title="Éditeur de forecast" icon={<Edit2 className="w-5 h-5 text-brand-600" />}>
                        <div className="text-center py-12 text-slate-500">
                            <Edit2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                            <p className="mb-4">Sélectionnez un forecast pour commencer l'édition</p>
                            <Button
                                onClick={() => setActiveTab('list')}
                                className="bg-brand-600 hover:bg-brand-700"
                            >
                                Retour à la liste
                            </Button>
                        </div>
                    </Card>
                )}

                {activeTab === 'editor' && selectedForecastId && selectedForecast && (
                    <div className="space-y-4">
                        {/* Forecast Header */}
                        <Card>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-4">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setSelectedForecastId(null);
                                            setSelectedVersionId(null);
                                            setActiveTab('list');
                                        }}
                                    >
                                        <ArrowLeft className="w-4 h-4 mr-2" />
                                        Retour
                                    </Button>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                            {selectedForecast.name}
                                            {selectedForecast.isRolling && (
                                                <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 font-bold">
                                                    ROLLING
                                                </span>
                                            )}
                                        </h3>
                                        <div className="flex items-center gap-3 text-sm text-slate-600 mt-1">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                Exercice {selectedForecast.fiscalYear}
                                            </span>
                                            <span>•</span>
                                            <span>{selectedChart?.name}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Version Selection */}
                            <div className="flex items-center gap-3 flex-wrap">
                                <span className="text-sm font-bold text-slate-700">Version:</span>
                                {selectedForecast.versions.map(version => {
                                    const statusColors = {
                                        draft: 'bg-gray-100 text-gray-700 border-gray-300',
                                        submitted: 'bg-blue-100 text-blue-700 border-blue-300',
                                        validated: 'bg-green-100 text-green-700 border-green-300',
                                        locked: 'bg-purple-100 text-purple-700 border-purple-300'
                                    };
                                    return (
                                        <button
                                            key={version.id}
                                            onClick={() => setSelectedVersionId(version.id)}
                                            className={`px-3 py-1 rounded border text-sm font-bold transition-all ${
                                                selectedVersionId === version.id
                                                    ? 'ring-2 ring-brand-400 ' + statusColors[version.status]
                                                    : statusColors[version.status]
                                            }`}
                                        >
                                            {version.name}
                                        </button>
                                    );
                                })}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleAddVersion}
                                    disabled={selectedForecast.isLocked}
                                >
                                    <Plus className="w-4 h-4 mr-1" />
                                    Nouvelle version
                                </Button>
                            </div>
                        </Card>

                        {/* Forecast Grid */}
                        {selectedVersion && (
                            <Card>
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="font-bold text-slate-800">Lignes de forecast</h4>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setShowNewLineModal(true)}
                                            disabled={selectedForecast.isLocked || selectedVersion.status !== 'draft'}
                                            className="text-brand-600 border-brand-200"
                                        >
                                            <Plus className="w-4 h-4 mr-2" />
                                            Ajouter une ligne
                                        </Button>
                                    </div>
                                </div>

                                {selectedVersion.lines.length === 0 ? (
                                    <div className="text-center py-12 text-slate-500">
                                        <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                                        <p>Aucune ligne de forecast</p>
                                        <p className="text-sm mt-2">Ajoutez des lignes pour commencer la saisie</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b-2 border-slate-300">
                                                    <th className="text-left p-2 font-bold text-slate-700 bg-slate-50 sticky left-0">
                                                        Compte
                                                    </th>
                                                    <th className="text-left p-2 font-bold text-slate-700 bg-slate-50">
                                                        Libellé
                                                    </th>
                                                    <th className="text-left p-2 font-bold text-slate-700 bg-slate-50">
                                                        Méthode
                                                    </th>
                                                    {generatePeriods(selectedVersion.referenceDate, 12).map(period => (
                                                        <th key={period.id} className="text-right p-2 font-bold text-slate-700 bg-slate-50">
                                                            {period.name}
                                                        </th>
                                                    ))}
                                                    <th className="text-right p-2 font-bold text-slate-700 bg-slate-50">
                                                        Total
                                                    </th>
                                                    <th className="text-center p-2 font-bold text-slate-700 bg-slate-50">
                                                        Actions
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedVersion.lines.map(line => {
                                                    const periods = generatePeriods(selectedVersion.referenceDate, 12);
                                                    const total = periods.reduce((sum, period) =>
                                                        sum + (line.forecastValues[period.id] || 0), 0
                                                    );

                                                    const methodLabels = {
                                                        manual: '✋ Manuel',
                                                        copy_actual: '📋 Copie',
                                                        driver_based: '🎯 Inducteur',
                                                        ml_prediction: '🤖 ML',
                                                        trend: '📈 Tendance',
                                                        seasonal: '🌊 Saisonnier'
                                                    };

                                                    return (
                                                        <tr
                                                            key={line.id}
                                                            className="border-b border-slate-100 hover:bg-slate-50"
                                                        >
                                                            <td className="p-2 font-mono text-xs bg-white sticky left-0">
                                                                {line.accountCode}
                                                            </td>
                                                            <td className="p-2 text-xs">
                                                                {line.accountLabel}
                                                            </td>
                                                            <td className="p-2 text-xs">
                                                                <span className="px-2 py-1 rounded bg-slate-100 text-slate-700 font-bold">
                                                                    {methodLabels[line.method]}
                                                                </span>
                                                            </td>
                                                            {periods.map(period => {
                                                                const cellId = `${line.id}-${period.id}`;
                                                                const value = line.forecastValues[period.id] || 0;
                                                                const isEditing = editingCellId === cellId;
                                                                const isDisabled = selectedForecast.isLocked ||
                                                                                 selectedVersion.status !== 'draft' ||
                                                                                 line.isLocked;

                                                                // Show confidence intervals for ML predictions
                                                                const hasMlPrediction = line.mlPrediction &&
                                                                    line.mlPrediction.lowerBound[period.id] !== undefined;

                                                                return (
                                                                    <td
                                                                        key={period.id}
                                                                        className="p-1 text-right"
                                                                        title={hasMlPrediction ?
                                                                            `Intervalle: ${line.mlPrediction!.lowerBound[period.id].toFixed(0)} - ${line.mlPrediction!.upperBound[period.id].toFixed(0)}`
                                                                            : undefined}
                                                                    >
                                                                        {isEditing ? (
                                                                            <input
                                                                                type="text"
                                                                                value={editingValue}
                                                                                onChange={(e) => setEditingValue(e.target.value)}
                                                                                onKeyDown={(e) => {
                                                                                    if (e.key === 'Enter') {
                                                                                        handleCellSave(line.id, period.id);
                                                                                    } else if (e.key === 'Escape') {
                                                                                        handleCellCancel();
                                                                                    }
                                                                                }}
                                                                                onBlur={() => handleCellSave(line.id, period.id)}
                                                                                autoFocus
                                                                                className="w-full px-2 py-1 text-right border border-brand-300 rounded focus:ring-2 focus:ring-brand-400"
                                                                            />
                                                                        ) : (
                                                                            <button
                                                                                onClick={() => handleCellEdit(line.id, period.id, value)}
                                                                                disabled={isDisabled}
                                                                                className={`w-full px-2 py-1 rounded text-right ${
                                                                                    isDisabled
                                                                                        ? 'cursor-not-allowed text-slate-400'
                                                                                        : 'hover:bg-brand-50 cursor-pointer'
                                                                                } ${value !== 0 ? 'font-bold' : ''} ${
                                                                                    hasMlPrediction ? 'bg-purple-50' : ''
                                                                                }`}
                                                                            >
                                                                                {value.toLocaleString('fr-FR', {
                                                                                    minimumFractionDigits: 0,
                                                                                    maximumFractionDigits: 0
                                                                                })}
                                                                            </button>
                                                                        )}
                                                                    </td>
                                                                );
                                                            })}
                                                            <td className="p-2 text-right font-bold text-slate-800 bg-slate-50">
                                                                {total.toLocaleString('fr-FR', {
                                                                    minimumFractionDigits: 0,
                                                                    maximumFractionDigits: 0
                                                                })}
                                                            </td>
                                                            <td className="p-2 text-center">
                                                                <div className="flex items-center gap-1">
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => handleGenerateMLPredictions(line.id)}
                                                                        disabled={!line.actualValues || Object.keys(line.actualValues).length < 3}
                                                                        className="text-purple-600 border-purple-200"
                                                                        title="Générer prédictions ML"
                                                                    >
                                                                        <Brain className="w-3 h-3" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => handleDeleteLine(line.id)}
                                                                        disabled={selectedForecast.isLocked || selectedVersion.status !== 'draft'}
                                                                        className="text-red-600 border-red-200"
                                                                    >
                                                                        <Trash2 className="w-3 h-3" />
                                                                    </Button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </Card>
                        )}

                        {/* New Line Modal */}
                        {showNewLineModal && (
                            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                                <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
                                    <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                                        <h3 className="text-lg font-bold text-slate-800">Ajouter une ligne de forecast</h3>
                                        <button
                                            onClick={() => {
                                                setShowNewLineModal(false);
                                                setAccountSearchQuery('');
                                            }}
                                            className="text-slate-400 hover:text-slate-600"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <div className="p-4 overflow-y-auto flex-1">
                                        <div className="mb-4">
                                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                                Rechercher un compte
                                            </label>
                                            <input
                                                type="text"
                                                value={accountSearchQuery}
                                                onChange={(e) => setAccountSearchQuery(e.target.value)}
                                                placeholder="Code ou libellé..."
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-400"
                                            />
                                        </div>
                                        <div className="space-y-1 max-h-96 overflow-y-auto">
                                            {selectedChart?.accounts
                                                .filter(acc =>
                                                    acc.canReceiveEntries &&
                                                    (accountSearchQuery === '' ||
                                                        acc.code.toLowerCase().includes(accountSearchQuery.toLowerCase()) ||
                                                        acc.label.toLowerCase().includes(accountSearchQuery.toLowerCase()))
                                                )
                                                .map(account => (
                                                    <button
                                                        key={account.code}
                                                        onClick={() => handleAddLine(account.code)}
                                                        className="w-full text-left p-2 rounded hover:bg-brand-50 border border-transparent hover:border-brand-200 transition-colors"
                                                    >
                                                        <div className="font-mono text-sm font-bold text-slate-800">
                                                            {account.code}
                                                        </div>
                                                        <div className="text-sm text-slate-600">
                                                            {'  '.repeat(account.level - 1)}{account.label}
                                                        </div>
                                                    </button>
                                                ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* DRIVERS TAB */}
                {activeTab === 'drivers' && (
                    <Card title="Inducteurs de forecast" icon={<Target className="w-5 h-5 text-brand-600" />}>
                        {!selectedForecastId ? (
                            <div className="text-center py-12 text-slate-500">
                                <Target className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                                <p>Sélectionnez un forecast pour gérer les inducteurs</p>
                                <Button
                                    onClick={() => setActiveTab('list')}
                                    className="mt-4 bg-brand-600 hover:bg-brand-700"
                                >
                                    Retour à la liste
                                </Button>
                            </div>
                        ) : (
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <p className="text-slate-600">
                                        Les inducteurs permettent de créer des prévisions basées sur des variables (volume × prix, etc.)
                                    </p>
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowNewDriverModal(true)}
                                        className="text-brand-600 border-brand-200"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Nouvel inducteur
                                    </Button>
                                </div>

                                {selectedForecast?.drivers.length === 0 ? (
                                    <div className="text-center py-12 text-slate-500">
                                        <Target className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                                        <p>Aucun inducteur défini</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {selectedForecast?.drivers.map(driver => (
                                            <div key={driver.id} className="border border-slate-200 rounded-lg p-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <h4 className="font-bold text-slate-800">{driver.name}</h4>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-red-600 border-red-200"
                                                        onClick={() => deleteDriver(selectedForecastId!, driver.id)}
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                                {driver.unit && (
                                                    <p className="text-sm text-slate-600 mb-2">Unité: {driver.unit}</p>
                                                )}
                                                <div className="text-sm text-slate-600">
                                                    Valeurs historiques: {Object.keys(driver.historicalValues).length}
                                                </div>
                                                <div className="text-sm text-slate-600">
                                                    Valeurs prévisionnelles: {Object.keys(driver.forecastValues).length}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* New Driver Modal */}
                                {showNewDriverModal && (
                                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                                        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
                                            <h3 className="text-lg font-bold text-slate-800 mb-4">Nouvel inducteur</h3>
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-sm font-bold text-slate-700 mb-2">
                                                        Nom
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={driverName}
                                                        onChange={(e) => setDriverName(e.target.value)}
                                                        placeholder="Ex: Volume de ventes"
                                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-400"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-bold text-slate-700 mb-2">
                                                        Unité (optionnel)
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={driverUnit}
                                                        onChange={(e) => setDriverUnit(e.target.value)}
                                                        placeholder="Ex: unités, €/unité"
                                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-400"
                                                    />
                                                </div>
                                                <div className="flex gap-2 pt-4">
                                                    <Button
                                                        className="flex-1 bg-brand-600 hover:bg-brand-700"
                                                        onClick={handleAddDriver}
                                                    >
                                                        Créer
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        className="flex-1"
                                                        onClick={() => {
                                                            setShowNewDriverModal(false);
                                                            setDriverName('');
                                                            setDriverUnit('');
                                                        }}
                                                    >
                                                        Annuler
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </Card>
                )}

                {/* ROLLING FORECAST TAB */}
                {activeTab === 'rolling' && (
                    <Card title="Rolling Forecast" icon={<RefreshCw className="w-5 h-5 text-brand-600" />}>
                        {!selectedForecastId || !selectedForecast?.isRolling ? (
                            <div className="text-center py-12 text-slate-500">
                                <RefreshCw className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                                <p>Sélectionnez un rolling forecast pour voir l'historique</p>
                            </div>
                        ) : (
                            <div>
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="font-bold text-slate-800">
                                            {selectedForecast.name}
                                        </h3>
                                        <p className="text-sm text-slate-600 mt-1">
                                            Horizon: {selectedForecast.rollingHorizonMonths} mois glissants
                                        </p>
                                    </div>
                                    <Button
                                        className="bg-brand-600 hover:bg-brand-700"
                                        onClick={handleCreateSnapshot}
                                    >
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                        Créer snapshot
                                    </Button>
                                </div>

                                {getRollingSnapshots(selectedForecastId).length === 0 ? (
                                    <div className="text-center py-8 text-slate-500">
                                        <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                        <p>Aucun snapshot enregistré</p>
                                        <p className="text-sm mt-2">
                                            Les snapshots permettent de suivre l'évolution des prévisions dans le temps
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {getRollingSnapshots(selectedForecastId)
                                            .sort((a, b) => b.createdAt - a.createdAt)
                                            .map(snapshot => (
                                                <div
                                                    key={snapshot.id}
                                                    className="border border-slate-200 rounded-lg p-4 hover:border-brand-300"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <div className="font-bold text-slate-800">
                                                                Snapshot du {new Date(snapshot.snapshotDate).toLocaleDateString('fr-FR')}
                                                            </div>
                                                            <div className="text-sm text-slate-600 mt-1">
                                                                Période: {new Date(snapshot.periodStart).toLocaleDateString('fr-FR')} → {new Date(snapshot.periodEnd).toLocaleDateString('fr-FR')}
                                                            </div>
                                                            <div className="text-sm text-slate-600">
                                                                {snapshot.data.length} ligne(s) de forecast
                                                            </div>
                                                        </div>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="text-blue-600 border-blue-200"
                                                        >
                                                            <Eye className="w-4 h-4 mr-2" />
                                                            Voir
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </Card>
                )}

                {/* ML PREDICTIONS TAB */}
                {activeTab === 'ml' && (
                    <Card title="Prédictions Machine Learning" icon={<Brain className="w-5 h-5 text-brand-600" />}>
                        <div className="space-y-6">
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <Lightbulb className="w-5 h-5 text-purple-600 mt-0.5" />
                                    <div>
                                        <h4 className="font-bold text-purple-900 mb-1">
                                            Prédictions automatiques
                                        </h4>
                                        <p className="text-sm text-purple-800">
                                            Le système analyse l'historique pour détecter les tendances et la saisonnalité,
                                            puis génère des prévisions avec intervalle de confiance.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Card className="border-l-4 border-l-purple-500">
                                    <div className="text-sm text-slate-600 font-bold">Méthode</div>
                                    <div className="text-lg font-bold text-slate-800 mt-1">
                                        Tendance + Saisonnalité
                                    </div>
                                </Card>
                                <Card className="border-l-4 border-l-blue-500">
                                    <div className="text-sm text-slate-600 font-bold">Confiance</div>
                                    <div className="text-lg font-bold text-slate-800 mt-1">
                                        95%
                                    </div>
                                </Card>
                                <Card className="border-l-4 border-l-green-500">
                                    <div className="text-sm text-slate-600 font-bold">Horizon</div>
                                    <div className="text-lg font-bold text-slate-800 mt-1">
                                        12 mois
                                    </div>
                                </Card>
                            </div>

                            <div>
                                <h4 className="font-bold text-slate-800 mb-3">Comment utiliser ?</h4>
                                <ol className="space-y-2 text-sm text-slate-700">
                                    <li className="flex items-start gap-2">
                                        <span className="font-bold text-brand-600">1.</span>
                                        <span>Allez dans l'onglet "Éditeur" et sélectionnez un forecast</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="font-bold text-brand-600">2.</span>
                                        <span>Pour chaque ligne avec des données historiques, cliquez sur l'icône Brain (🤖)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="font-bold text-brand-600">3.</span>
                                        <span>Le système générera automatiquement les prévisions pour les 12 prochains mois</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="font-bold text-brand-600">4.</span>
                                        <span>Les cellules avec prédictions ML apparaîtront en violet avec des intervalles de confiance</span>
                                    </li>
                                </ol>
                            </div>

                            <div className="bg-slate-50 rounded-lg p-4">
                                <h4 className="font-bold text-slate-800 mb-2">Fonctionnalités ML</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                        <span>Détection automatique de tendance</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                        <span>Détection de saisonnalité</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                        <span>Intervalles de confiance 95%</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                        <span>Prévisions sur 12 mois</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                )}

                {/* RECONCILIATION TAB */}
                {activeTab === 'reconciliation' && (
                    <Card title="Réconciliation Forecast vs Réalisé" icon={<BarChart3 className="w-5 h-5 text-brand-600" />}>
                        <div className="space-y-6">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                                    <div>
                                        <h4 className="font-bold text-blue-900 mb-1">
                                            Analyse des écarts
                                        </h4>
                                        <p className="text-sm text-blue-800">
                                            Comparez vos prévisions avec les réalisations pour améliorer la précision de vos futurs forecasts.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {reconciliationReports.length === 0 ? (
                                <div className="text-center py-12 text-slate-500">
                                    <BarChart3 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                                    <p>Aucun rapport de réconciliation</p>
                                    <p className="text-sm mt-2">
                                        Les rapports seront générés automatiquement lorsque des données réelles seront disponibles
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {reconciliationReports.map(report => (
                                        <div
                                            key={report.id}
                                            className="border border-slate-200 rounded-lg p-4"
                                        >
                                            <div className="flex items-center justify-between mb-4">
                                                <div>
                                                    <h4 className="font-bold text-slate-800">
                                                        Rapport du {new Date(report.createdAt).toLocaleDateString('fr-FR')}
                                                    </h4>
                                                    <p className="text-sm text-slate-600 mt-1">
                                                        Période: {new Date(report.periodStart).toLocaleDateString('fr-FR')} → {new Date(report.periodEnd).toLocaleDateString('fr-FR')}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Summary Cards */}
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                                                <div className="bg-slate-50 rounded p-3">
                                                    <div className="text-xs text-slate-600 font-bold">Total Forecast</div>
                                                    <div className="text-lg font-bold text-slate-800 mt-1">
                                                        {report.totalForecast.toLocaleString('fr-FR')} €
                                                    </div>
                                                </div>
                                                <div className="bg-slate-50 rounded p-3">
                                                    <div className="text-xs text-slate-600 font-bold">Total Réalisé</div>
                                                    <div className="text-lg font-bold text-slate-800 mt-1">
                                                        {report.totalActual.toLocaleString('fr-FR')} €
                                                    </div>
                                                </div>
                                                <div className={`rounded p-3 ${
                                                    report.totalVariance >= 0 ? 'bg-green-50' : 'bg-red-50'
                                                }`}>
                                                    <div className="text-xs text-slate-600 font-bold">Écart</div>
                                                    <div className={`text-lg font-bold mt-1 ${
                                                        report.totalVariance >= 0 ? 'text-green-600' : 'text-red-600'
                                                    }`}>
                                                        {report.totalVariance >= 0 ? '+' : ''}{report.totalVariance.toLocaleString('fr-FR')} €
                                                    </div>
                                                </div>
                                                <div className="bg-slate-50 rounded p-3">
                                                    <div className="text-xs text-slate-600 font-bold">MAPE</div>
                                                    <div className="text-lg font-bold text-slate-800 mt-1">
                                                        {report.mape?.toFixed(1)}%
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Recommendations */}
                                            {report.recommendations && report.recommendations.length > 0 && (
                                                <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
                                                    <h5 className="font-bold text-yellow-900 mb-2 flex items-center gap-2">
                                                        <Lightbulb className="w-4 h-4" />
                                                        Recommandations
                                                    </h5>
                                                    <ul className="space-y-1 text-sm text-yellow-800">
                                                        {report.recommendations.map((rec, idx) => (
                                                            <li key={idx}>• {rec}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {/* Variances count */}
                                            <div className="text-sm text-slate-600">
                                                {report.variances.length} écart(s) identifié(s)
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </Card>
                )}
            </div>
        </div>
    );
};
