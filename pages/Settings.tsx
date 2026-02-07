import React from 'react';
import {
  Settings as SettingsIcon,
  Layout,
  Database,
  Shield,
  Palette,
  Search,
  Cloud,
  Heart,
  Code
} from 'lucide-react';
import { useSettingsLogic, SettingsTab } from '../hooks/useSettingsLogic';
import { GeneralSettings } from '../components/settings/GeneralSettings';
import { UIPrefsSettings } from '../components/settings/UIPrefsSettings';
import { FinanceSettings } from '../components/settings/FinanceSettings';
import { O365Section } from '../components/settings/O365Section';
import { BackupRestoreModal } from '../components/settings/BackupRestoreModal';
import { Card } from '../components/ui/Card';

export const Settings: React.FC = () => {
  const logic = useSettingsLogic();
  const {
    activeTab,
    setActiveTab,
    searchTerm,
    setSearchTerm,
    currentDataset,
    datasets,
    datasetsCount,
    totalRows,
    totalBatchesCount,
    storageUsed,
    storageLimit
  } = logic;

  const navItems = [
    { id: 'general', label: 'Général', icon: SettingsIcon },
    { id: 'ui', label: 'Apparence & UX', icon: Layout },
    { id: 'finance', label: 'Finance & Référentiels', icon: Database },
    { id: 'o365', label: 'Microsoft 365', icon: Cloud },
    { id: 'security', label: 'Sécurité & Données', icon: Shield },
    { id: 'about', label: 'À propos', icon: Heart }
  ];

  return (
    <div className="h-full overflow-y-auto p-4 md:p-8 custom-scrollbar">
      <div className="max-w-6xl mx-auto space-y-8 pb-20">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <SettingsIcon className="w-8 h-8 text-brand-600" />
              Paramètres du Système
            </h2>
            <p className="text-slate-500 mt-1">
              Configurez vos préférences et gérez vos données locales
            </p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher un réglage..."
              className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-full md:w-64 focus:ring-2 focus:ring-brand-500 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Nav */}
          <div className="w-full lg:w-64 flex-shrink-0">
            <div className="flex lg:flex-col overflow-x-auto lg:overflow-x-visible gap-1 bg-slate-100/50 p-1 rounded-xl">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as SettingsTab)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                    activeTab === item.id
                      ? 'bg-white text-brand-600 shadow-sm ring-1 ring-slate-200'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                  }`}
                >
                  <item.icon
                    className={`w-4 h-4 ${activeTab === item.id ? 'text-brand-600' : 'text-slate-400'}`}
                  />
                  {item.label}
                </button>
              ))}
            </div>

            {/* Quick Status Info */}
            <div className="mt-8 p-4 bg-slate-50 rounded-xl border border-slate-100 hidden lg:block">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                Statut Système
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Datasets</span>
                  <span className="font-bold text-slate-700">{datasetsCount}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Total lignes</span>
                  <span className="font-bold text-slate-700">{totalRows.toLocaleString()}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-400 font-bold uppercase">Stockage local</span>
                    <span className="text-slate-600 font-bold">
                      {storageUsed} / {storageLimit}
                    </span>
                  </div>
                  <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500" style={{ width: '2%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 min-w-0">
            {activeTab === 'general' && (
              <GeneralSettings
                loadDemoData={logic.loadDemoData}
                clearAll={logic.clearAll}
                diagResults={logic.diagResults}
                isRunningDiag={logic.isRunningDiag}
                handleRunDiagnostics={logic.handleRunDiagnostics}
                datasets={datasets}
                batches={logic.batches}
                editingDatasetId={logic.editingDatasetId}
                editName={logic.editName}
                setEditName={logic.setEditName}
                startEditing={logic.startEditing}
                cancelEditing={logic.cancelEditing}
                saveEditing={logic.saveEditing}
                setViewingDatasetVersionsId={logic.setViewingDatasetVersionsId}
                handleDeleteDataset={(id, name) => {
                  if (window.confirm(`Supprimer définitivement le dataset "${name}" ?`)) {
                    logic.deleteDataset(id);
                  }
                }}
              />
            )}

            {activeTab === 'ui' && <UIPrefsSettings />}

            {activeTab === 'finance' && (
              <FinanceSettings
                activeFinanceTab={logic.activeFinanceTab}
                setActiveFinanceTab={logic.setActiveFinanceTab}
                setShowAxisModal={logic.setShowAxisModal}
                setShowCalendarModal={logic.setShowCalendarModal}
                setShowMasterDataModal={logic.setShowMasterDataModal}
                setMasterDataType={logic.setMasterDataType}
                importPCGTemplate={logic.importPCGTemplate}
                importIFRSTemplate={logic.importIFRSTemplate}
              />
            )}

            {activeTab === 'o365' && (
              <O365Section
                currentState={{
                  datasets,
                  batches: logic.batches,
                  dashboardWidgets: logic.dashboardWidgets,
                  savedAnalyses: logic.savedAnalyses,
                  savedMappings: logic.savedMappings,
                  financeReferentials: {
                    chartsOfAccounts: logic.chartsOfAccounts,
                    analyticalAxes: logic.analyticalAxes,
                    fiscalCalendars: logic.fiscalCalendars,
                    masterData: logic.masterData
                  },
                  version: '2026-02-07-01',
                  uiPrefs: logic.uiPrefs
                }}
                onRestoreBackup={(data) => logic.importBackup(JSON.stringify(data))}
              />
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <Card
                  title="Export & Backup des données"
                  icon={<Database className="w-5 h-5 text-brand-600" />}
                >
                  <div className="space-y-4">
                    <p className="text-sm text-slate-600">
                      Téléchargez une copie complète de vos données locales (TCD, Datasets,
                      Paramètres) dans un fichier JSON compressé.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={logic.handleExportBackup}
                        className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-bold hover:bg-brand-700 shadow-sm transition-all"
                      >
                        Créer un Backup
                      </button>
                      <button
                        onClick={() => logic.setShowRestoreModal(true)}
                        className="px-4 py-2 border border-brand-200 text-brand-700 rounded-lg text-sm font-bold hover:bg-brand-50 transition-all"
                      >
                        Restaurer un Backup
                      </button>
                    </div>
                  </div>
                </Card>
                <Card
                  title="Gestion des Datasets"
                  icon={<Shield className="w-5 h-5 text-red-600" />}
                >
                  <div className="divide-y divide-slate-100">
                    {datasets.map((ds) => (
                      <div key={ds.id} className="py-3 flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-slate-800">{ds.name}</h4>
                          <p className="text-xs text-slate-500">
                            {ds.fields.length} colonnes • ID: {ds.id}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            if (
                              window.confirm(`Supprimer définitivement le dataset "${ds.name}" ?`)
                            )
                              logic.deleteDataset(ds.id);
                          }}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {activeTab === 'about' && (
              <Card
                title="À propos de DataScope"
                icon={<Heart className="w-5 h-5 text-pink-500" />}
              >
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-brand-100 rounded-2xl flex items-center justify-center">
                      <SettingsIcon className="w-8 h-8 text-brand-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                        DataScope Analytics
                      </h3>
                      <p className="text-xs font-bold text-slate-500 uppercase">
                        Version 2026-02-07-01 (Audit Hardened)
                      </p>
                    </div>
                  </div>
                  <div className="prose prose-slate prose-sm max-w-none text-slate-600 leading-relaxed">
                    <p>
                      DataScope est une plateforme BI locale-first, conçue pour l'analyse de données
                      financières et opérationnelles sans compromis sur la confidentialité.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                    <Code className="w-4 h-4 text-slate-400" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Technologie : React 18 / TypeScript 5 / Vite / Tailwind
                    </span>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      <BackupRestoreModal
        isOpen={logic.showRestoreModal}
        onClose={() => logic.setShowRestoreModal(false)}
        onRestore={logic.importBackup}
      />
    </div>
  );
};

const Trash2: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);
