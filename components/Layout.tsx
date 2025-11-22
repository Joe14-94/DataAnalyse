
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Upload, History, Settings, Database, PieChart, ChevronDown, Plus, Table2, HardDrive, ArrowDownWideNarrow, HelpCircle } from 'lucide-react';
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
  const { datasets, currentDatasetId, switchDataset, batches } = useData();
  const [storageUsed, setStorageUsed] = useState<number>(0);
  const [storagePercent, setStoragePercent] = useState<number>(0);

  const navItems = [
    { name: 'Tableau de bord', icon: LayoutDashboard, path: '/' },
    { name: 'Données', icon: Table2, path: '/data' },
    { name: 'Importation', icon: Upload, path: '/import' },
    { name: 'Historique imports', icon: History, path: '/history' },
    { name: 'Analyse sur mesure', icon: PieChart, path: '/analytics' },
    { name: 'TCD', icon: ArrowDownWideNarrow, path: '/pivot' },
    { name: 'Paramètres', icon: Settings, path: '/settings' },
    { name: 'Aide et informations', icon: HelpCircle, path: '/help' },
  ];

  // Calculate Storage Usage
  useEffect(() => {
    const calculateStorage = () => {
      try {
        let total = 0;
        for(let x in localStorage) {
          // Only count strings that are own properties
          if(Object.prototype.hasOwnProperty.call(localStorage, x)) {
            total += (localStorage[x].length + x.length) * 2; // *2 for approx UTF-16 byte size
          }
        }
        
        // Convert to KB
        const kb = total / 1024;
        // Limit is roughly 5MB (5120 KB) - 10MB depending on browser. Conservatively 5MB.
        const limit = 5120; 
        const percent = Math.min(100, (kb / limit) * 100);
        
        setStorageUsed(kb);
        setStoragePercent(percent);
      } catch (e) {
        console.warn("Storage calc error", e);
      }
    };

    // Recalculate when data likely changes
    calculateStorage();
    const interval = setInterval(calculateStorage, 5000); // Check periodically
    return () => clearInterval(interval);
  }, [datasets, batches]);

  const getStorageColor = (p: number) => {
    if (p > 90) return 'bg-red-500';
    if (p > 70) return 'bg-orange-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="h-screen w-screen bg-slate-50 flex flex-col md:flex-row overflow-hidden text-slate-800">
      {/* Sidebar / Mobile Header */}
      <aside className="bg-white border-b md:border-b-0 md:border-r border-slate-200 w-full md:w-64 flex-shrink-0 h-auto md:h-full flex flex-col overflow-y-auto z-20">
        <div className="p-4 md:p-6">
          <div className="flex items-center gap-2 font-bold text-xl text-blue-700 mb-6">
            <div className="p-1.5 bg-blue-600 rounded-md text-white">
              <Database size={20} />
            </div>
            <span>DataScope</span>
          </div>

          {/* DATASET SELECTOR */}
          <div className="mb-6">
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
        </div>

        <nav className="flex md:flex-col p-2 md:p-4 gap-1 overflow-x-auto md:overflow-visible flex-1">
          {navItems.map((item) => {
            const isActive = path === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-colors whitespace-nowrap
                  ${isActive 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
              >
                <Icon size={18} />
                {item.name}
              </Link>
            );
          })}
        </nav>
        
        {/* Footer Stats */}
        <div className="p-4 border-t border-slate-100 hidden md:block bg-slate-50/50">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
             <div className="flex items-center gap-1">
                <HardDrive size={12} />
                <span>Stockage</span>
             </div>
             <span className={storagePercent > 90 ? "text-red-600 font-bold" : ""}>{Math.round(storagePercent)}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-1.5 mb-3 overflow-hidden">
             <div 
               className={`h-1.5 rounded-full transition-all duration-500 ${getStorageColor(storagePercent)}`} 
               style={{ width: `${Math.max(2, storagePercent)}%` }}
             ></div>
          </div>
          <div className="text-xs text-slate-400 text-center">
            v{APP_VERSION}
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