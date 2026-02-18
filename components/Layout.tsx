
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Upload, Settings, Database, PieChart, Table2, HardDrive, ArrowDownWideNarrow, HelpCircle, Save, ChevronLeft, ChevronRight, Palette, DollarSign, TrendingUp, Workflow } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { APP_VERSION } from '../utils';
import { OnboardingTour } from './OnboardingTour';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const path = location.pathname;
  const { datasets, batches, getBackupJson, companyLogo } = useData();
  const [storageUsed, setStorageUsed] = useState<string>('0 MB');
  const [storagePercent, setStoragePercent] = useState<number>(0);

  // Sidebar State
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems = [
    { name: 'Tableau de bord', icon: LayoutDashboard, path: '/', id: 'tour-nav-dashboard' },
    { name: 'Données', icon: Table2, path: '/data', id: 'tour-nav-data' },
    { name: 'Importation', icon: Upload, path: '/import', id: 'tour-nav-import' },
    { name: "Studio d'Analyse", icon: PieChart, path: '/analytics', id: 'tour-nav-analytics' },
    { name: 'TCD', icon: ArrowDownWideNarrow, path: '/pivot' },
    { name: 'Budgets', icon: DollarSign, path: '/budget' },
    { name: 'Forecasts', icon: TrendingUp, path: '/forecast' },
    { name: 'Pipeline ETL', icon: Workflow, path: '/etl' },
    { name: 'Personnalisation', icon: Palette, path: '/customization' },
    { name: 'Paramètres', icon: Settings, path: '/settings' },
    { name: 'Aide et informations', icon: HelpCircle, path: '/help' },
  ];

  // Calculate Storage Usage
  useEffect(() => {
    const calculateStorage = async () => {
      if (navigator.storage && navigator.storage.estimate) {
        try {
          const { usage, quota } = await navigator.storage.estimate();
          if (usage !== undefined && quota !== undefined) {
            const usageMB = (usage / (1024 * 1024)).toFixed(1);
            const percent = (usage / quota) * 100;
            setStorageUsed(`${usageMB} MB`);
            setStoragePercent(percent);
          }
        } catch (e) {
          console.warn("Storage estimate failed", e);
        }
      }
    };
    calculateStorage();
    const interval = setInterval(calculateStorage, 10000);
    return () => clearInterval(interval);
  }, [datasets, batches]);

  const handleQuickSave = () => {
    const json = getBackupJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `datascope_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  const getStorageColor = (p: number) => {
    if (p > 90) return 'bg-red-500';
    if (p > 70) return 'bg-orange-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="h-screen w-screen bg-canvas flex flex-col md:flex-row overflow-hidden text-txt-main font-sans">
      <OnboardingTour />

      {/* Sidebar */}
      <aside
        style={{ width: isCollapsed ? undefined : 'var(--app-sidebar-width)' }}
        className={`bg-surface border-b md:border-b-0 md:border-r border-border-default flex-shrink-0 h-auto md:h-full flex flex-col transition-all duration-300 z-20
          ${isCollapsed ? 'md:w-16' : ''} w-full
        `}
      >
        <div className={`p-ds-4 ${isCollapsed ? 'flex justify-center' : ''} relative`}>
          <div className="flex items-center gap-ds-2 font-bold text-xl text-brand-600 mb-6 overflow-hidden min-h-[40px]">
            {companyLogo ? (
              <img
                src={companyLogo}
                alt="Logo"
                className={`object-contain max-h-8 ${isCollapsed ? 'w-full' : 'w-auto max-w-[140px]'}`}
              />
            ) : (
              <>
                <div className="p-1.5 bg-brand-600 rounded-md text-white shrink-0">
                  <Database size={16} />
                </div>
                {!isCollapsed && <span className="whitespace-nowrap tracking-tight text-lg">DataScope</span>}
              </>
            )}
          </div>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex absolute top-4 -right-3 bg-surface border border-border-default rounded-full p-0.5 shadow-sm text-txt-muted hover:text-brand-600 z-30"
            aria-label={isCollapsed ? "Agrandir la barre latérale" : "Réduire la barre latérale"}
            title={isCollapsed ? "Agrandir" : "Réduire"}
          >
            {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
          </button>
        </div>

        <nav className="flex md:flex-col p-2 md:p-3 gap-1 overflow-x-auto md:overflow-visible flex-1 custom-scrollbar">
          {navItems.map((item) => {
            const isActive = path === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                id={item.id}
                to={item.path}
                title={isCollapsed ? item.name : ''}
                className={`flex items-center gap-ds-2 px-2 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap
                  ${isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-txt-secondary hover:bg-canvas hover:text-txt-main'
                  }
                  ${isCollapsed ? 'justify-center' : ''}
                `}
              >
                <Icon size={isCollapsed ? 18 : 15} className="shrink-0" />
                {!isCollapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        <div className={`p-ds-4 border-t border-border-default hidden md:flex flex-col bg-canvas/50 space-y-2 ${isCollapsed ? 'items-center' : ''}`}>
          <button
            onClick={handleQuickSave}
            className={`flex items-center justify-center gap-1.5 bg-surface hover:bg-brand-50 border border-border-default hover:border-brand-200 text-txt-secondary hover:text-brand-700 text-xs font-bold py-1.5 rounded transition-colors
                ${isCollapsed ? 'w-8 h-8 p-0' : 'w-full px-3'}
             `}
            title="Sauvegarde rapide"
            aria-label="Sauvegarde rapide"
          >
            <Save className={`${isCollapsed ? 'w-3.5 h-3.5' : 'w-3 h-3'}`} />
            {!isCollapsed && "Sauvegarde"}
          </button>

          {!isCollapsed && (
            <div>
              <div className="flex items-center justify-between text-xs text-txt-muted mb-1">
                <div className="flex items-center gap-1">
                  <HardDrive size={10} />
                  <span>Disque : {storageUsed}</span>
                </div>
                {storagePercent > 0 && <span className={storagePercent > 90 ? "text-red-600 font-bold" : ""}>{Math.round(storagePercent)}%</span>}
              </div>
              {storagePercent > 0 && (
                <div className="w-full bg-border-default rounded-full h-1 overflow-hidden">
                  <div
                    className={`h-1 rounded-full transition-all duration-500 ${getStorageColor(storagePercent)}`}
                    style={{ width: `${Math.max(2, storagePercent)}%` }}
                  ></div>
                </div>
              )}
            </div>
          )}

        </div>
      </aside>

      <main className="flex-1 h-full relative overflow-hidden bg-canvas">
        {children}
        <div className="absolute bottom-1 right-2 text-xs text-txt-muted pointer-events-none z-[60] font-medium bg-surface/50 px-1 rounded shadow-sm border border-border-default">
           v{APP_VERSION} | 13/02/2026
        </div>
      </main>
    </div>
  );
};
