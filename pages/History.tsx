
import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Trash2, Filter, Download, Database, AlertCircle } from 'lucide-react';
import { formatDateFr } from '../utils';

export const History: React.FC = () => {
  const { batches, deleteBatch, currentDataset, datasets } = useData();
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');

  // Reset selection when dataset changes
  useEffect(() => {
    setSelectedBatchId('');
  }, [currentDataset?.id]);

  // Default to latest batch if available
  useEffect(() => {
    if (!selectedBatchId && batches.length > 0) {
      setSelectedBatchId(batches[batches.length - 1].id);
    }
  }, [batches, selectedBatchId]);

  const currentBatch = batches.find(b => b.id === selectedBatchId);
  const fields = currentDataset ? currentDataset.fields : [];

  const handleExportCSV = () => {
    if (!currentBatch) return;
    const headers = ['Id', ...fields];
    const csvContent = [
      headers.join(';'),
      ...currentBatch.rows.map(row => {
        const cols = [row.id];
        fields.forEach(f => {
          let val = row[f] !== undefined ? row[f] : '';
          
          // Conversion en string pour traitement
          let stringVal = String(val);

          // SECURITE OWASP : Prévention CSV Injection
          if (/^[=+\-@]/.test(stringVal)) {
            stringVal = `'${stringVal}`;
          }

          if (stringVal.includes(';') || stringVal.includes('\n') || stringVal.includes('"')) {
            stringVal = `"${stringVal.replace(/"/g, '""')}"`;
          }
          
          cols.push(stringVal);
        });
        return cols.join(';');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Safer download
    const link = document.createElement('a');
    link.href = url;
    link.download = `export_${currentDataset?.name}_${currentBatch.date}.csv`;
    link.style.display = 'none';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, 100);
  };

  if (!currentDataset) {
    return (
       <div className="h-full flex flex-col items-center justify-center text-center bg-white rounded-lg border border-dashed border-slate-300 m-4">
          <Database className="w-12 h-12 text-slate-300 mb-4" />
          <p className="text-slate-600 font-medium">Aucun tableau sélectionné</p>
          <p className="text-slate-500 text-sm max-w-md mt-2">
             Utilisez le menu en haut pour sélectionner un tableau ou en créer un nouveau.
          </p>
       </div>
    );
 }

  return (
    <div className="h-full overflow-y-auto p-4 md:p-8 custom-scrollbar">
       <div className="space-y-6 pb-12"> {/* Removed max-w-7xl */}
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
           <div>
              <h2 className="text-2xl font-bold text-slate-800">Historique : {currentDataset.name}</h2>
              <p className="text-sm text-slate-500 mt-1">Gérez les imports passés de ce tableau.</p>
           </div>
           
           <div className="flex items-center gap-2 bg-white p-1 rounded-md border border-slate-200 shadow-sm">
             <Filter className="w-4 h-4 text-slate-500 ml-2" />
             <select 
               className="block w-full pl-2 pr-8 py-1 text-sm border-0 focus:ring-0 text-slate-700 bg-white focus:outline-none"
               style={{ backgroundColor: '#ffffff', color: '#334155' }}
               value={selectedBatchId}
               onChange={(e) => setSelectedBatchId(e.target.value)}
             >
               {batches.length === 0 && <option value="">Aucun historique</option>}
               {batches.map(b => (
                 <option key={b.id} value={b.id}>
                   Import du {formatDateFr(b.date)} ({b.rows.length} lignes)
                 </option>
               ))}
             </select>
           </div>
         </div>
   
         {currentBatch ? (
           <Card>
             <div className="flex justify-between items-center border-b border-slate-100 p-4 bg-slate-50">
               <div className="flex items-center gap-4">
                 <div className="text-sm text-slate-500">
                   Date: <span className="font-semibold text-slate-900">{formatDateFr(currentBatch.date)}</span>
                 </div>
                 <div className="text-sm text-slate-500">
                   Lignes: <span className="font-semibold text-slate-900">{currentBatch.rows.length}</span>
                 </div>
               </div>
               <div className="flex gap-2">
                 <Button variant="outline" size="sm" onClick={handleExportCSV}>
                   <Download className="w-4 h-4 mr-2" />
                   CSV
                 </Button>
                 <Button variant="danger" size="sm" onClick={() => {
                   if (window.confirm('Supprimer cet import ?')) deleteBatch(currentBatch.id);
                 }}>
                   <Trash2 className="w-4 h-4 mr-2" />
                   Supprimer
                 </Button>
               </div>
             </div>
   
             <div className="overflow-x-auto">
               <table className="min-w-full divide-y divide-slate-200">
                 <thead className="bg-slate-50">
                   <tr>
                     <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Id</th>
                     {fields.map(f => (
                       <th key={f} className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">
                         {f}
                       </th>
                     ))}
                   </tr>
                 </thead>
                 <tbody className="bg-white divide-y divide-slate-200">
                   {currentBatch.rows.map((row, idx) => (
                     <tr key={`${row.id}-${idx}`} className="hover:bg-slate-50 transition-colors">
                       <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-400 text-xs">{row.id}</td>
                       {fields.map(f => {
                          const val = row[f];
                          let displayVal: React.ReactNode = val;
                          if (typeof val === 'boolean') {
                            displayVal = val ? (
                              <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">Oui</span>
                            ) : (
                              <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-500 text-xs">Non</span>
                            );
                          }
                          return (
                            <td key={f} className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                              {displayVal !== undefined ? displayVal : <span className="text-slate-300">-</span>}
                            </td>
                          );
                       })}
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
           </Card>
         ) : (
           <div className="text-center py-20 bg-white rounded-lg border border-dashed border-slate-300">
              <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Aucun import pour ce tableau.</p>
              <p className="text-sm text-slate-400">Allez dans "Importation" pour ajouter des données.</p>
           </div>
         )}
       </div>
    </div>
  );
};
