

import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { formatDateFr } from '../utils';
import { Button } from '../components/ui/Button';
import { 
  Search, Download, Database, ChevronLeft, ChevronRight, Table2, 
  Filter, ArrowUpDown, ArrowUp, ArrowDown, XCircle, X, 
  History, GitCommit, ArrowRight
} from 'lucide-react';

export const DataExplorer: React.FC = () => {
  const { currentDataset, batches } = useData();
  
  // --- State ---
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  
  // Sorting
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  
  // Column Filters
  const [showFilters, setShowFilters] = useState(false);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});

  // HISTORY & RECONCILIATION STATE
  const [selectedRow, setSelectedRow] = useState<any | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [trackingKey, setTrackingKey] = useState<string>('');

  // Initialize tracking key (Smart default)
  useEffect(() => {
     if (currentDataset && currentDataset.fields.length > 0 && !trackingKey) {
        // Try to find a likely identifier
        const candidates = ['email', 'id', 'reference', 'ref', 'code', 'matricule', 'nom'];
        const found = currentDataset.fields.find(f => candidates.includes(f.toLowerCase()));
        setTrackingKey(found || currentDataset.fields[0]);
     }
  }, [currentDataset]);

  // --- Handlers ---
  
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleColumnFilterChange = (key: string, value: string) => {
    setColumnFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setColumnFilters({});
    setSearchTerm('');
    setSortConfig(null);
    setCurrentPage(1);
  };

  const handleRowClick = (row: any) => {
     setSelectedRow(row);
     setIsDrawerOpen(true);
  };

  // --- Data Processing ---

  // 1. Flatten Data
  const allRows = useMemo(() => {
    if (!currentDataset) return [];
    return batches
      .filter(b => b.datasetId === currentDataset.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .flatMap(batch => batch.rows.map(r => ({
        ...r,
        _importDate: batch.date,
        _batchId: batch.id
      })));
  }, [currentDataset, batches]);

  // 2. Process: Filter (Global & Column) + Sort
  const processedRows = useMemo(() => {
    let data = [...allRows];

    // A. Global Search
    if (searchTerm.trim()) {
      const lowerTerm = searchTerm.toLowerCase();
      data = data.filter(row => 
        Object.values(row).some((val: any) => 
          String(val).toLowerCase().includes(lowerTerm)
        )
      );
    }

    // B. Column Filters
    Object.entries(columnFilters).forEach(([key, filterValue]) => {
      if (filterValue) {
        const lowerFilter = (filterValue as string).toLowerCase();
        data = data.filter(row => {
          const val = row[key];
          // Gestion spéciale pour la date d'import qui est une métadonnée
          if (key === '_importDate') {
             return formatDateFr(val as string).toLowerCase().includes(lowerFilter);
          }
          return String(val ?? '').toLowerCase().includes(lowerFilter);
        });
      }
    });

    // C. Sort
    if (sortConfig) {
      data.sort((a, b) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];

        if (valA == null) return 1;
        if (valB == null) return -1;

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return data;
  }, [allRows, searchTerm, columnFilters, sortConfig]);

  // 3. Pagination
  const totalPages = Math.ceil(processedRows.length / rowsPerPage);
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return processedRows.slice(start, start + rowsPerPage);
  }, [processedRows, currentPage, rowsPerPage]);

  // 4. HISTORY RECONCILIATION LOGIC
  const historyData = useMemo(() => {
     if (!selectedRow || !trackingKey) return [];
     
     const trackValue = selectedRow[trackingKey];
     if (trackValue === undefined || trackValue === '') return [selectedRow];

     // Find all rows in all batches (of current dataset) that match the key
     const relevantBatches = batches
        .filter(b => b.datasetId === currentDataset?.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Recent first

     const history: any[] = [];
     relevantBatches.forEach(batch => {
        // We look for exact string match
        const match = batch.rows.find(r => String(r[trackingKey]) === String(trackValue));
        if (match) {
           history.push({
              ...match,
              _importDate: batch.date,
              _batchId: batch.id
           });
        }
     });
     return history;
  }, [selectedRow, trackingKey, batches, currentDataset]);

  // --- Export ---
  const handleExportFullCSV = () => {
    if (!currentDataset || processedRows.length === 0) return;
    
    const headers = ['Date import', 'Id', ...currentDataset.fields];
    const csvContent = [
      headers.join(';'),
      ...processedRows.map(row => {
        const cols = [
           row._importDate,
           row.id,
           ...currentDataset.fields.map(f => {
              let val = row[f];
              let stringVal = val !== undefined ? String(val) : '';
              if (stringVal.includes(';') || stringVal.includes('\n') || stringVal.includes('"')) {
                stringVal = `"${stringVal.replace(/"/g, '""')}"`;
              }
              return stringVal;
           })
        ];
        return cols.join(';');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Export_${currentDataset.name}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!currentDataset) {
     return (
      <div className="h-full flex flex-col items-center justify-center text-center bg-slate-50 rounded-lg border border-dashed border-slate-300 m-4">
        <Database className="w-12 h-12 text-slate-300 mb-4" />
        <p className="text-slate-600 font-medium">Aucune typologie sélectionnée</p>
        <p className="text-slate-500 text-sm max-w-md mt-2">
          Veuillez sélectionner une typologie de tableau dans le menu latéral pour visualiser les données.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-4 md:p-8 gap-4 relative">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f8fafc;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 6px;
          border: 3px solid #f8fafc;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 flex-shrink-0">
        <div>
           <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Table2 className="w-6 h-6 text-slate-500" />
              Données : {currentDataset.name}
           </h2>
           <p className="text-sm text-slate-500 mt-1">
             {processedRows.length} ligne(s) affichée(s) (Total : {allRows.length})
           </p>
        </div>

        <div className="flex flex-wrap gap-3 w-full md:w-auto">
           {/* Search Input */}
           <div className="relative flex-1 md:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                 <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                 type="text"
                 className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md bg-white placeholder-slate-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
                 placeholder="Recherche globale..."
                 value={searchTerm}
                 onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
           </div>
           
           <Button 
              variant={showFilters ? "primary" : "outline"} 
              onClick={() => setShowFilters(!showFilters)}
              className="whitespace-nowrap"
           >
              <Filter className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Filtres</span>
           </Button>

           <Button variant="outline" onClick={handleExportFullCSV} disabled={processedRows.length === 0}>
              <Download className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Export</span>
           </Button>
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 flex flex-col min-h-0 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden relative">
         
         {/* Table Wrapper with Overflow */}
         <div className="flex-1 overflow-auto custom-scrollbar relative w-full">
            <table className="min-w-full divide-y divide-slate-200 border-collapse text-left">
               <thead className="bg-slate-50 sticky top-0 z-20 shadow-sm">
                  {/* Header Row */}
                  <tr>
                     {/* Colonne Date Import (Métadonnée) */}
                     <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-bold text-slate-500 tracking-wider whitespace-nowrap bg-slate-50 border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors select-none group"
                        onClick={() => handleSort('_importDate')}
                     >
                        <div className="flex items-center gap-2">
                           <span>Date d'import</span>
                           {sortConfig?.key === '_importDate' ? (
                              sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />
                           ) : (
                              <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                           )}
                        </div>
                     </th>

                     {/* Colonnes Dynamiques */}
                     {currentDataset.fields.map(field => (
                        <th 
                           key={field} 
                           scope="col" 
                           className="px-6 py-3 text-left text-xs font-bold text-slate-500 tracking-wider whitespace-nowrap bg-slate-50 border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors select-none group"
                           onClick={() => handleSort(field)}
                        >
                           <div className="flex items-center gap-2">
                              <span>{field}</span>
                              {sortConfig?.key === field ? (
                                 sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />
                              ) : (
                                 <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                              )}
                           </div>
                        </th>
                     ))}
                  </tr>

                  {/* Filter Row (Conditional) */}
                  {showFilters && (
                     <tr className="bg-slate-50">
                        <th className="px-2 py-2 border-b border-slate-200">
                           <input 
                              type="text" 
                              className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-normal"
                              placeholder="Filtre date..."
                              value={columnFilters['_importDate'] || ''}
                              onChange={(e) => handleColumnFilterChange('_importDate', e.target.value)}
                           />
                        </th>
                        {currentDataset.fields.map(field => (
                           <th key={`filter-${field}`} className="px-2 py-2 border-b border-slate-200">
                              <input 
                                 type="text" 
                                 className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-normal"
                                 placeholder={`Filtre ${field}...`}
                                 value={columnFilters[field] || ''}
                                 onChange={(e) => handleColumnFilterChange(field, e.target.value)}
                              />
                           </th>
                        ))}
                     </tr>
                  )}
               </thead>
               
               <tbody className="bg-white divide-y divide-slate-200">
                  {paginatedRows.length > 0 ? (
                     paginatedRows.map((row, idx) => (
                        <tr 
                           key={`${row._batchId}-${row.id}-${idx}`} 
                           className="hover:bg-blue-50 transition-colors cursor-pointer group"
                           onClick={() => handleRowClick(row)}
                           title="Cliquez pour voir l'historique"
                        >
                           <td className="px-6 py-3 whitespace-nowrap text-xs text-slate-500 font-mono group-hover:text-blue-600">
                              {formatDateFr(row._importDate)}
                           </td>
                           {currentDataset.fields.map(field => {
                              const val = row[field];
                              let displayVal: React.ReactNode = val;
                              
                              if (typeof val === 'boolean') {
                                 displayVal = val ? (
                                   <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Oui</span>
                                 ) : (
                                   <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500">Non</span>
                                 );
                              } else if (!val && val !== 0) {
                                 displayVal = <span className="text-slate-300">-</span>;
                              }

                              return (
                                 <td key={field} className="px-6 py-3 whitespace-nowrap text-sm text-slate-700 max-w-xs truncate" title={String(val)}>
                                    {displayVal}
                                 </td>
                              );
                           })}
                        </tr>
                     ))
                  ) : (
                     <tr>
                        <td colSpan={currentDataset.fields.length + 1} className="px-6 py-16 text-center">
                           <div className="flex flex-col items-center justify-center text-slate-400">
                              {Object.keys(columnFilters).length > 0 || searchTerm ? (
                                 <>
                                    <XCircle className="w-10 h-10 mb-2 opacity-50" />
                                    <span className="text-sm font-medium">Aucun résultat pour ces filtres.</span>
                                    <Button variant="secondary" size="sm" className="mt-3" onClick={clearFilters}>
                                       Effacer les filtres
                                    </Button>
                                 </>
                              ) : (
                                 <span className="text-sm italic">Aucune donnée enregistrée.</span>
                              )}
                           </div>
                        </td>
                     </tr>
                  )}
               </tbody>
            </table>
         </div>

         {/* Footer / Pagination */}
         <div className="bg-white border-t border-slate-200 px-4 py-2 flex items-center justify-between flex-shrink-0 z-10 h-14">
            <div className="text-xs text-slate-500">
               {processedRows.length > 0 
                 ? `${(currentPage - 1) * rowsPerPage + 1} - ${Math.min(currentPage * rowsPerPage, processedRows.length)} sur ${processedRows.length}`
                 : '0 résultat'
               }
            </div>
            
            <div className="flex items-center gap-4">
               <select 
                  className="text-xs border-slate-300 rounded bg-white text-slate-600 focus:ring-blue-500 focus:border-blue-500"
                  value={rowsPerPage}
                  onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
               >
                  <option value={25}>25 lignes</option>
                  <option value={50}>50 lignes</option>
                  <option value={100}>100 lignes</option>
                  <option value={500}>500 lignes</option>
               </select>

               <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                     onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                     disabled={currentPage === 1}
                     className="relative inline-flex items-center px-2 py-1.5 rounded-l-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                     <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="relative inline-flex items-center px-4 py-1.5 border border-slate-300 bg-white text-xs font-medium text-slate-700">
                     Page {currentPage} / {Math.max(1, totalPages)}
                  </span>
                  <button
                     onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                     disabled={currentPage === totalPages || totalPages === 0}
                     className="relative inline-flex items-center px-2 py-1.5 rounded-r-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                     <ChevronRight className="h-4 w-4" />
                  </button>
               </nav>
            </div>
         </div>
      </div>

      {/* HISTORY SIDE PANEL (DRAWER) */}
      {isDrawerOpen && selectedRow && (
         <div className="absolute inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <div 
               className="absolute inset-0 bg-slate-900/20 backdrop-blur-[1px]"
               onClick={() => setIsDrawerOpen(false)}
            />
            
            {/* Drawer */}
            <div className="relative w-full max-w-xl bg-white shadow-2xl h-full flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300">
               
               {/* Drawer Header */}
               <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-start justify-between">
                  <div>
                     <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <History className="w-5 h-5 text-blue-600" />
                        Historique d'évolution
                     </h3>
                     <p className="text-xs text-slate-500 mt-1">
                        Suivi des modifications de l'entité à travers les imports.
                     </p>
                  </div>
                  <button 
                     onClick={() => setIsDrawerOpen(false)}
                     className="p-1.5 hover:bg-white rounded-full text-slate-400 hover:text-slate-700 transition-colors"
                  >
                     <X className="w-5 h-5" />
                  </button>
               </div>

               {/* Configuration Key Selector */}
               <div className="p-3 bg-blue-50 border-b border-blue-100">
                  <label className="block text-xs font-bold text-blue-800 mb-1">
                     Clé d'identification (liaison)
                  </label>
                  <select 
                     className="block w-full text-sm border-blue-200 rounded p-1.5 bg-white text-slate-700 focus:ring-blue-500 focus:border-blue-500"
                     value={trackingKey}
                     onChange={(e) => setTrackingKey(e.target.value)}
                  >
                     {currentDataset.fields.map(f => (
                        <option key={f} value={f}>{f}</option>
                     ))}
                  </select>
                  <div className="mt-2 text-xs text-blue-600 flex items-center">
                     <span className="font-bold mr-1">Valeur actuelle :</span> 
                     <span className="truncate max-w-[200px] inline-block align-bottom bg-white px-1 rounded border border-blue-100">
                        {selectedRow[trackingKey]}
                     </span>
                  </div>
               </div>

               {/* Timeline Content */}
               <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
                  {historyData.length === 0 ? (
                     <div className="text-center py-10 text-slate-400">
                        <GitCommit className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p>Aucun historique trouvé pour cette clé.</p>
                     </div>
                  ) : (
                     historyData.map((version, index) => {
                        const previousVersion = historyData[index + 1];
                        const isLatest = index === 0;

                        return (
                           <div key={version._batchId} className="relative pl-6 border-l-2 border-slate-200 last:border-0">
                              {/* Dot */}
                              <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 bg-white ${isLatest ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-300'}`} />
                              
                              {/* Date Badge */}
                              <div className="mb-2 flex items-center gap-2">
                                 <span className="text-sm font-bold text-slate-700">
                                    {formatDateFr(version._importDate)}
                                 </span>
                                 {isLatest && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 rounded font-bold">ACTUEL</span>}
                              </div>

                              {/* Content Card */}
                              <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-3 text-sm space-y-2">
                                 {currentDataset.fields.map(field => {
                                    // Si ce n'est pas la clé de tracking (qui par définition ne change pas ici)
                                    if (field === trackingKey) return null;

                                    const val = version[field];
                                    const prevVal = previousVersion ? previousVersion[field] : undefined;
                                    
                                    // Détection changement
                                    const hasChanged = previousVersion && String(val) !== String(prevVal);

                                    // Valeur display
                                    let displayVal = val;
                                    if (typeof val === 'boolean') displayVal = val ? 'Oui' : 'Non';
                                    if (val === undefined || val === '') displayVal = '-';

                                    let prevDisplayVal = prevVal;
                                    if (typeof prevVal === 'boolean') prevDisplayVal = prevVal ? 'Oui' : 'Non';

                                    return (
                                       <div key={field} className={`flex flex-col pb-2 border-b border-dashed border-slate-100 last:border-0 last:pb-0 ${hasChanged ? 'bg-amber-50 -mx-3 px-3 py-2 rounded border-transparent' : ''}`}>
                                          <div className="flex justify-between items-start">
                                             <span className="text-xs font-bold text-slate-500 w-1/3 truncate" title={field}>
                                                {field}
                                             </span>
                                             <span className={`w-2/3 text-right font-medium ${hasChanged ? 'text-amber-900' : 'text-slate-700'}`}>
                                                {displayVal}
                                             </span>
                                          </div>
                                          
                                          {hasChanged && (
                                             <div className="mt-1 text-xs flex justify-end items-center gap-1 text-amber-600/80">
                                                <span className="line-through decoration-amber-400 decoration-2 opacity-70">{prevDisplayVal}</span>
                                                <ArrowRight className="w-3 h-3" />
                                                <span>{displayVal}</span>
                                             </div>
                                          )}
                                       </div>
                                    );
                                 })}
                              </div>
                           </div>
                        );
                     })
                  )}
               </div>

            </div>
         </div>
      )}

    </div>
  );
};