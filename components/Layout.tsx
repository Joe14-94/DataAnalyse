
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Upload, History, Settings, Database, PieChart, ChevronDown, Plus, Table2, HardDrive, ArrowDownWideNarrow, HelpCircle, Save, ChevronLeft, ChevronRight, Menu, Palette } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { APP_VERSION } from '../utils';
import { Badge } from './ui/Badge';
import { Text } from './ui/Typography';
import { OnboardingTour } from './OnboardingTour';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
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
    { name: 'Historique imports', icon: History, path: '/history' },
    { name: 'Création de graphiques', icon: PieChart, path: '/analytics', id: 'tour-nav-analytics' },
    { name: 'TCD', icon: ArrowDownWideNarrow, path: '/pivot' },
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
        className={`bg-surface border-b md:border-b-0 md:border-r border-border-default flex-shrink-0 h-auto md:h-full flex flex-col transition-all duration-300 z-20
          ${isCollapsed ? 'md:w-20' : 'md:w-64'} w-full
        `}
      >
        <div className={`p-4 ${isCollapsed ? 'flex justify-center' : ''} relative`}>
          <div className="flex items-center gap-2 font-bold text-xl text-brand-600 mb-6 overflow-hidden min-h-[40px]">
            {companyLogo ? (
              <img
                src={companyLogo}
                alt="Logo"
                className={`object-contain max-h-10 ${isCollapsed ? 'w-full' : 'w-auto max-w-[180px]'}`}
              />
            ) : (
              <>
                <div className="p-1.5 bg-brand-600 rounded-md text-white shrink-0">
                  <Database size={20} />
                </div>
                {!isCollapsed && <span className="whitespace-nowrap tracking-tight">DataScope</span>}
              </>
            )}
          </div>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex absolute top-4 -right-3 bg-surface border border-border-default rounded-full p-1 shadow-sm text-txt-muted hover:text-brand-600 z-30"
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
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
                className={`flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium transition-colors whitespace-nowrap
                  ${isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-txt-secondary hover:bg-canvas hover:text-txt-main'
                  }
                  ${isCollapsed ? 'justify-center' : ''}
                `}
              >
                <Icon size={isCollapsed ? 20 : 18} className="shrink-0" />
                {!isCollapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        <div className={`p-4 border-t border-border-default hidden md:flex flex-col bg-canvas/50 space-y-3 ${isCollapsed ? 'items-center' : ''}`}>
          <button
            onClick={handleQuickSave}
            className={`flex items-center justify-center gap-2 bg-surface hover:bg-brand-50 border border-border-default hover:border-brand-200 text-txt-secondary hover:text-brand-700 text-xs font-bold py-2 rounded transition-colors
                ${isCollapsed ? 'w-10 h-10 p-0' : 'w-full px-4'}
             `}
            title="Sauvegarde rapide"
          >
            <Save className={`${isCollapsed ? 'w-4 h-4' : 'w-3 h-3'}`} />
            {!isCollapsed && "Sauvegarde"}
          </button>

          {!isCollapsed && (
            <div>
              <div className="flex items-center justify-between text-xs text-txt-muted mb-1">
                <div className="flex items-center gap-1">
                  <HardDrive size={12} />
                  <span>Disque : {storageUsed}</span>
                </div>
                {storagePercent > 0 && <span className={storagePercent > 90 ? "text-red-600 font-bold" : ""}>{Math.round(storagePercent)}%</span>}
              </div>
              {storagePercent > 0 && (
                <div className="w-full bg-border-default rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-500 ${getStorageColor(storagePercent)}`}
                    style={{ width: `${Math.max(2, storagePercent)}%` }}
                  ></div>
                </div>
              )}
            </div>
          )}

          <div className="text-xs text-txt-muted text-center">
            {isCollapsed ? `v22` : `v${APP_VERSION}`}
          </div>
        </div>
      </aside>

      <main className="flex-1 h-full relative overflow-hidden bg-canvas">
        {children}
      </main>
    </div>
  );
};
