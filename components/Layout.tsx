import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Upload, History, Settings, Database, PieChart, ChevronDown, Plus, Table2, HardDrive, ArrowDownWideNarrow, HelpCircle, Save, ChevronLeft, ChevronRight, Menu, Palette } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { APP_VERSION } from '../utils';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;
  const { datasets, currentDatasetId, switchDataset, batches, getBackupJson, companyLogo } = useData();
  const [storageUsed, setStorageUsed] = useState<string>('0 MB');
  const [storagePercent, setStoragePercent] = useState<number>(0);
  
  // Sidebar State
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems = [
    { name: 'Tableau de bord', icon: LayoutDashboard, path: '/' },
    { name: 'Données', icon: Table2, path: '/data' },
    { name: 'Importation', icon: Upload, path: '/import' },
    { name: 'Historique imports', icon: History, path: '/history' },
    { name: 'Création de graphiques', icon: PieChart, path: '/analytics' },
    { name: 'TCD', icon: ArrowDownWideNarrow, path: '/pivot' },
    { name: 'Personnalisation', icon: Palette, path: '/customization' }, // NOUVEAU MENU
    { name: 'Paramètres', icon: Settings, path: '/settings' },
    { name: 'Aide et informations', icon: HelpCircle, path: '/help' },
  ];

  // Calculate Storage Usage using Navigator Storage API (IndexedDB support)
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
    const interval = setInterval(calculateStorage, 10000); // Check periodically
    return () => clearInterval(interval);
  }, [datasets, batches]);

  const handleQuickSave = () => {
    const json = getBackupJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Safer download method
    const link = document.createElement('a');
    link.href = url;
    link.download = `datascope_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.style.display = 'none';
    link.target = '_blank';
    
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  };

  const getStorageColor = (p: number) => {
    if (p > 90) return 'bg-red-500';
    if (p > 70) return 'bg-orange-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="h-screen w-screen bg-slate-50 flex flex-col md:flex-row overflow-hidden text-slate-800">
      {/* Sidebar / Mobile Header */}
      <aside 
        className={`bg-white border-b md:border-b-0 md:border-r border-slate-200 flex-shrink-0 h-auto md:h-full flex flex-col transition-all duration-300 z-20
          ${isCollapsed ? 'md:w-20' : 'md:w-64'} w-full
        `}
      >
        <div className={`p-4 ${isCollapsed ? 'flex justify-center' : ''} relative`}>
          <div className="flex items-center gap-2 font-bold text-xl text-blue-700 mb-6 overflow-hidden min-h-[40px]">
            {companyLogo ? (
               <img 
                  src={companyLogo} 
                  alt="Logo Entreprise" 
                  className={`object-contain max-h-10 ${isCollapsed ? 'w-full' : 'w-auto max-w-[180px]'}`} 
               />
            ) : (
               <>
                  <div className="p-1.5 bg-blue-600 rounded-md text-white shrink-0">
                    <Database size={20} />
                  </div>
                  {!isCollapsed && <span className="whitespace-nowrap">DataScope</span>}
               </>
            )}
          </div>

          {/* Collapse Toggle Button */}
          <button 
             onClick={() => setIsCollapsed(!isCollapsed)}
             className="hidden md:flex absolute top-4 -right-3 bg-white border border-slate-200 rounded-full p-1 shadow-sm text-slate-500 hover:text-blue-600 z-30"
          >
             {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>

          {/* DATASET SELECTOR */}
          <div className={`mb-6 ${isCollapsed ? 'hidden' : 'block'}`}>
            <label className="block text-xs font-semibold text-slate-500 mb-2">Typologie de tableau</label>
            <div className="relative">
              <select
                className="w-full appearance-none bg-slate-100 border border-slate-200 text-slate-700 text-sm rounded-md py-2 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={currentDatasetId || ''}
                onChange={(e) => {
                   if (e.target.value === '__NEW__') {
                      navigate('/import');
                   } else {
                      switchDataset(e.target.value);
                   }
                }}
              >
                {datasets.length === 0 && <option value="">Aucun tableau</option>}
                {datasets.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
                <option disabled>──────────</option>
                <option value="__NEW__">+ Nouvelle typologie...</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                <ChevronDown size={14} />
              </div>
            </div>
          </div>
          
          {/* Collapsed Dataset Indicator */}
          {isCollapsed && (
             <div className="mb-6 flex justify-center" title="Changer de typologie">
                <button 
                  onClick={() => setIsCollapsed(false)}
                  className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                >
                   <Table2 size={20} />
                </button>
             </div>
          )}
        </div>

        <nav className="flex md:flex-col p-2 md:p-3 gap-1 overflow-x-auto md:overflow-visible flex-1 custom-scrollbar">
          {navItems.map((item) => {
            const isActive = path === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                title={isCollapsed ? item.name : ''}
                className={`flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium transition-colors whitespace-nowrap
                  ${isActive 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
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
        
        {/* Footer Stats & Quick Save */}
        <div className={`p-4 border-t border-slate-100 hidden md:flex flex-col bg-slate-50/50 space-y-3 ${isCollapsed ? 'items-center' : ''}`}>
          
          <button 
             onClick={handleQuickSave}
             className={`flex items-center justify-center gap-2 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-200 text-slate-600 hover:text-blue-700 text-xs font-bold py-2 rounded transition-colors
                ${isCollapsed ? 'w-10 h-10 p-0' : 'w-full px-4'}
             `}
             title="Sauvegarder les données maintenant (JSON)"
          >
             <Save className={`${isCollapsed ? 'w-4 h-4' : 'w-3 h-3'}`} />
             {!isCollapsed && "Sauvegarde rapide"}
          </button>

          {!isCollapsed && (
             <div>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                   <div className="flex items-center gap-1" title="Stockage IndexedDB (Disque)">
                      <HardDrive size={12} />
                      <span>Disque : {storageUsed}</span>
                   </div>
                   {storagePercent > 0 && <span className={storagePercent > 90 ? "text-red-600 font-bold" : ""}>{Math.round(storagePercent)}%</span>}
                </div>
                {storagePercent > 0 && (
                   <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                       <div 
                       className={`h-1.5 rounded-full transition-all duration-500 ${getStorageColor(storagePercent)}`} 
                       style={{ width: `${Math.max(2, storagePercent)}%` }}
                       ></div>
                   </div>
                )}
             </div>
          )}

          <div className="text-xs text-slate-400 text-center">
            {isCollapsed ? 'v25' : `v${APP_VERSION}`}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-full relative overflow-hidden bg-slate-50">
        {children}
      </main>
    </div>
  );
};