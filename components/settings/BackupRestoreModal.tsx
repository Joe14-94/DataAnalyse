import React, { useState } from 'react';
import {
  Check,
  Download,
  Upload,
  Database,
  Table2,
  Layout,
  Settings as SettingsIcon,
  Building2,
  Wallet,
  TrendingUp,
  Filter,
  Workflow,
  Search
} from 'lucide-react';
import { Button } from '../ui/Button';
import { AppState } from '../../types';
import { Modal } from '../ui/Modal';

interface BackupRestoreModalProps {
  mode: 'backup' | 'restore';
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedKeys: (keyof AppState)[]) => void;
  availableData?: Partial<AppState>;
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({
  mode,
  isOpen,
  onClose,
  onConfirm,
  availableData
}) => {
  const [selectedKeys, setSelectedKeys] = useState<(keyof AppState)[]>([
    'datasets',
    'batches',
    'dashboardWidgets',
    'savedAnalyses',
    'savedMappings',
    'financeReferentials',
    'budgetModule',
    'forecastModule',
    'pipelineModule',
    'uiPrefs',
    'companyLogo'
  ]);

  if (!isOpen) return null;

  const options: { key: keyof AppState; label: string; icon: any; desc: string }[] = [
    {
      key: 'datasets',
      label: 'Typologies (Datasets)',
      icon: Table2,
      desc: 'Configuration des colonnes et champs calculés'
    },
    {
      key: 'savedMappings',
      label: 'Mappings de colonnes',
      icon: Search,
      desc: 'Associations mémorisées lors des imports'
    },
    {
      key: 'batches',
      label: 'Données (Imports)',
      icon: Database,
      desc: 'Historique de tous les fichiers importés'
    },
    {
      key: 'savedAnalyses',
      label: 'Analyses TCD',
      icon: Filter,
      desc: 'Tous vos Tableaux Croisés Dynamiques sauvegardés'
    },
    {
      key: 'dashboardWidgets',
      label: 'Tableau de bord',
      icon: Layout,
      desc: 'Configuration des widgets du dashboard'
    },
    {
      key: 'financeReferentials',
      label: 'Référentiels Finance',
      icon: Building2,
      desc: 'Plans comptables, axes analytiques, etc.'
    },
    {
      key: 'budgetModule',
      label: 'Module Budget',
      icon: Wallet,
      desc: 'Budgets, templates et commentaires'
    },
    {
      key: 'forecastModule',
      label: 'Module Forecast',
      icon: TrendingUp,
      desc: 'Prévisions et réconciliations'
    },
    {
      key: 'pipelineModule',
      label: 'Pipelines ETL',
      icon: Workflow,
      desc: 'Flux de transformation de données'
    },
    {
      key: 'uiPrefs',
      label: 'Préférences UI',
      icon: SettingsIcon,
      desc: 'Taille de police, thèmes, etc.'
    },
    {
      key: 'companyLogo',
      label: 'Logo entreprise',
      icon: Building2,
      desc: 'Le logo affiché dans les exports'
    }
  ];

  const toggleKey = (key: keyof AppState) => {
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleConfirm = () => {
    if (selectedKeys.length === 0) {
      alert('Veuillez sélectionner au moins un type de données.');
      return;
    }
    onConfirm(selectedKeys);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="2xl"
      icon={mode === 'backup' ? <Download className="w-6 h-6" /> : <Upload className="w-6 h-6" />}
      title={
        <div>
          <h3 className="text-xl font-bold">
            {mode === 'backup' ? 'Sauvegarde sélective' : 'Restauration sélective'}
          </h3>
          <p className="text-txt-muted text-xs font-normal">
            Choisissez les éléments à {mode === 'backup' ? "inclure dans l'export" : 'importer'}
          </p>
        </div>
      }
      footer={
        <div className="flex justify-between items-center w-full">
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            className="bg-brand-600 hover:bg-brand-700 shadow-brand-200"
          >
            {mode === 'backup' ? (
              <>
                <Download className="w-4 h-4 mr-2" /> Générer le fichier de sauvegarde
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" /> Confirmer la restauration
              </>
            )}
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {options.map((opt) => {
          const Icon = opt.icon;
          const isAvailable = !availableData || availableData[opt.key] !== undefined;
          const isSelected = selectedKeys.includes(opt.key);

          return (
            <div
              key={opt.key}
              onClick={() => isAvailable && toggleKey(opt.key)}
              className={`relative p-4 rounded-lg border-2 transition-all cursor-pointer group ${
                !isAvailable
                  ? 'opacity-40 grayscale cursor-not-allowed border-border-default bg-canvas'
                  : isSelected
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-border-default hover:border-txt-muted bg-surface'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-md ${
                    isSelected ? 'bg-brand-600 text-white' : 'bg-canvas text-txt-muted'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 pr-6">
                  <div className="text-sm font-bold text-txt-main">{opt.label}</div>
                  <div className="text-xs text-txt-secondary mt-0.5 leading-tight">{opt.desc}</div>
                </div>
                {isAvailable && (
                  <div className="absolute top-4 right-4">
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                        isSelected ? 'bg-brand-600 border-brand-600' : 'border-border-default'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={4} />}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
};
