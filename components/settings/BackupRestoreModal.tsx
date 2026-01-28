
import React, { useState } from 'react';
import { X, Check, Download, Upload, Database, Table2, Layout, Settings as SettingsIcon, Building2, Wallet, TrendingUp, Filter, Workflow, Search } from 'lucide-react';
import { Button } from '../ui/Button';
import { Checkbox } from '../ui/Checkbox';
import { AppState } from '../../types';

interface BackupRestoreModalProps {
  mode: 'backup' | 'restore';
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedKeys: (keyof AppState)[]) => void;
  availableData?: Partial<AppState>;
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({ mode, isOpen, onClose, onConfirm, availableData }) => {
  const [selectedKeys, setSelectedKeys] = useState<(keyof AppState)[]>([
    'datasets', 'batches', 'dashboardWidgets', 'savedAnalyses', 'savedMappings',
    'financeReferentials', 'budgetModule', 'forecastModule', 'pipelineModule', 'uiPrefs', 'companyLogo'
  ]);

  if (!isOpen) return null;

  const options: { key: keyof AppState, label: string, icon: any, desc: string }[] = [
    { key: 'datasets', label: 'Typologies (Datasets)', icon: Table2, desc: 'Configuration des colonnes et champs calculés' },
    { key: 'savedMappings', label: 'Mappings de colonnes', icon: Search, desc: 'Associations mémorisées lors des imports' },
    { key: 'batches', label: 'Données (Imports)', icon: Database, desc: 'Historique de tous les fichiers importés' },
    { key: 'savedAnalyses', label: 'Analyses TCD', icon: Filter, desc: 'Tous vos Tableaux Croisés Dynamiques sauvegardés' },
    { key: 'dashboardWidgets', label: 'Tableau de bord', icon: Layout, desc: 'Configuration des widgets du dashboard' },
    { key: 'financeReferentials', label: 'Référentiels Finance', icon: Building2, desc: 'Plans comptables, axes analytiques, etc.' },
    { key: 'budgetModule', label: 'Module Budget', icon: Wallet, desc: 'Budgets, templates et commentaires' },
    { key: 'forecastModule', label: 'Module Forecast', icon: TrendingUp, desc: 'Prévisions et réconciliations' },
    { key: 'pipelineModule', label: 'Pipelines ETL', icon: Workflow, desc: 'Flux de transformation de données' },
    { key: 'uiPrefs', label: 'Préférences UI', icon: SettingsIcon, desc: 'Taille de police, thèmes, etc.' },
    { key: 'companyLogo', label: 'Logo entreprise', icon: Building2, desc: 'Le logo affiché dans les exports' },
  ];

  const toggleKey = (key: keyof AppState) => {
    setSelectedKeys(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const handleConfirm = () => {
    if (selectedKeys.length === 0) {
      alert("Veuillez sélectionner au moins un type de données.");
      return;
    }
    onConfirm(selectedKeys);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className={`p-6 text-white flex justify-between items-center ${mode === 'backup' ? 'bg-brand-600' : 'bg-emerald-600'}`}>
          <div className="flex items-center gap-3">
            {mode === 'backup' ? <Download className="w-6 h-6" /> : <Upload className="w-6 h-6" />}
            <div>
              <h3 className="text-xl font-bold">{mode === 'backup' ? 'Sauvegarde sélective' : 'Restauration sélective'}</h3>
              <p className="text-white/80 text-xs">Choisissez les éléments à {mode === 'backup' ? 'inclure dans l\'export' : 'importer'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {options.map(opt => {
              const Icon = opt.icon;
              const isAvailable = !availableData || availableData[opt.key] !== undefined;
              const isSelected = selectedKeys.includes(opt.key);

              return (
                <div
                  key={opt.key}
                  onClick={() => isAvailable && toggleKey(opt.key)}
                  className={`relative p-4 rounded-lg border-2 transition-all cursor-pointer group ${
                    !isAvailable ? 'opacity-40 grayscale cursor-not-allowed border-slate-100 bg-slate-50' :
                    isSelected ? (mode === 'backup' ? 'border-brand-500 bg-brand-50' : 'border-emerald-500 bg-emerald-50') :
                    'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-md ${
                      isSelected ? (mode === 'backup' ? 'bg-brand-600 text-white' : 'bg-emerald-600 text-white') : 'bg-slate-100 text-slate-500'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 pr-6">
                      <div className="text-sm font-bold text-slate-800">{opt.label}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">{opt.desc}</div>
                    </div>
                    {isAvailable && (
                      <div className="absolute top-4 right-4">
                         <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                           isSelected ? (mode === 'backup' ? 'bg-brand-600 border-brand-600' : 'bg-emerald-600 border-emerald-600') : 'border-slate-300'
                         }`}>
                           {isSelected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={4} />}
                         </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
          <Button variant="ghost" onClick={onClose} className="text-slate-500 hover:text-slate-800 font-bold uppercase tracking-wider text-xs">
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            className={mode === 'backup' ? 'bg-brand-600 hover:bg-brand-700 shadow-brand-200' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'}
          >
            {mode === 'backup' ? (
              <><Download className="w-4 h-4 mr-2" /> Générer le fichier de sauvegarde</>
            ) : (
              <><Check className="w-4 h-4 mr-2" /> Confirmer la restauration</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
