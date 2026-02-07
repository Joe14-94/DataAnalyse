import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import {
  Building2,
  GitBranch,
  CalendarDays,
  Users,
  Plus,
  FileText,
  Trash2,
  Edit2,
  Check,
  X,
  Search,
  ShieldAlert,
  History
} from 'lucide-react';
import { useReferentials } from '../../context/ReferentialContext';
import { formatDateFr } from '../../utils';

interface FinanceSettingsProps {
  activeFinanceTab: 'charts' | 'axes' | 'calendar' | 'masterdata';
  setActiveFinanceTab: (tab: 'charts' | 'axes' | 'calendar' | 'masterdata') => void;
  setShowAxisModal: (show: boolean) => void;
  setShowCalendarModal: (show: boolean) => void;
  setShowMasterDataModal: (show: boolean) => void;
  setMasterDataType: (type: any) => void;
  importPCGTemplate: () => void;
  importIFRSTemplate: () => void;
}

export const FinanceSettings: React.FC<FinanceSettingsProps> = ({
  activeFinanceTab,
  setActiveFinanceTab,
  setShowAxisModal,
  setShowCalendarModal,
  setShowMasterDataModal,
  setMasterDataType,
  importPCGTemplate,
  importIFRSTemplate
}) => {
  const {
    chartsOfAccounts,
    analyticalAxes,
    fiscalCalendars,
    masterData,
    setDefaultChartOfAccounts,
    deleteChartOfAccounts
  } = useReferentials();

  return (
    <Card title="Référentiels Finance" icon={<ShieldAlert className="w-5 h-5 text-brand-600" />}>
      <div className="flex bg-slate-100 p-1 rounded-lg mb-6">
        {[
          { id: 'charts', label: 'Plans Comptables', icon: Building2 },
          { id: 'axes', label: 'Axes Analytiques', icon: GitBranch },
          { id: 'calendar', label: 'Calendriers Fiscaux', icon: CalendarDays },
          { id: 'masterdata', label: 'Données Maîtres', icon: Users }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveFinanceTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-md transition-all ${activeFinanceTab === tab.id ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Sub-tabs content */}
      {activeFinanceTab === 'charts' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-600">Gérez vos plans de comptes et nomenclatures.</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={importPCGTemplate}>
                Import PCG
              </Button>
              <Button size="sm" variant="outline" onClick={importIFRSTemplate}>
                Import IFRS
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            {chartsOfAccounts.map((chart) => (
              <div
                key={chart.id}
                className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-slate-400" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">{chart.name}</span>
                      {chart.isDefault && (
                        <span className="text-[10px] px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-black uppercase">
                          Par défaut
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500">
                      {chart.accounts.length} comptes configurés
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {!chart.isDefault && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDefaultChartOfAccounts(chart.id)}
                    >
                      Défaut
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:bg-red-50"
                    onClick={() => {
                      if (window.confirm('Supprimer ce plan de comptes ?'))
                        deleteChartOfAccounts(chart.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeFinanceTab === 'axes' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-600">
              Définissez vos axes de segmentation (Projets, Cost Centers...).
            </p>
            <Button size="sm" onClick={() => setShowAxisModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nouvel Axe
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {analyticalAxes.map((axis) => (
              <div key={axis.id} className="p-3 border border-slate-200 rounded-lg bg-slate-50/50">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-black text-xs text-slate-400 uppercase font-mono tracking-widest">
                    {axis.code}
                  </span>
                  {axis.isMandatory && (
                    <span className="text-[9px] px-1.5 py-0.5 bg-red-100 text-red-700 rounded font-bold">
                      REQUIS
                    </span>
                  )}
                </div>
                <div className="font-bold text-slate-800 mb-1">{axis.name}</div>
                <div className="text-xs text-slate-500">Niveau {axis.level}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeFinanceTab === 'calendar' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-600">
              Configurez vos périodes de reporting et exercices fiscaux.
            </p>
            <Button size="sm" onClick={() => setShowCalendarModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nouveau Calendrier
            </Button>
          </div>
          <div className="space-y-2">
            {fiscalCalendars.map((cal) => (
              <div
                key={cal.id}
                className="p-3 border border-slate-200 rounded-lg flex justify-between items-center"
              >
                <div>
                  <div className="font-bold text-slate-800">Exercice {cal.fiscalYear}</div>
                  <div className="text-xs text-slate-500">
                    Du {formatDateFr(cal.startDate)} au {formatDateFr(cal.endDate)} (
                    {cal.periods.length} périodes)
                  </div>
                </div>
                <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeFinanceTab === 'masterdata' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-600">Référentiels tiers, employés et produits.</p>
            <Button
              size="sm"
              onClick={() => {
                setMasterDataType('customer');
                setShowMasterDataModal(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Ajouter
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {[
              { id: 'customer', label: 'Clients' },
              { id: 'supplier', label: 'Fournisseurs' },
              { id: 'employee', label: 'Employés' },
              { id: 'product', label: 'Produits' }
            ].map((type: any) => {
              const count = (Array.isArray(masterData) ? masterData : []).filter(
                (item: any) => item.type === type.id
              ).length;
              return (
                <div
                  key={type.id}
                  className="p-3 border border-slate-200 rounded-lg text-center bg-slate-50/50"
                >
                  <div className="text-xl font-black text-brand-600">{count}</div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase mt-1">
                    {type.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
};
