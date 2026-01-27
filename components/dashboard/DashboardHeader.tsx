
import React from 'react';
import { Layout, Maximize2, Plus, Check, Edit3 } from 'lucide-react';
import { Heading, Text } from '../ui/Typography';
import { Button } from '../ui/Button';
import { Dataset } from '../../types';

interface DashboardHeaderProps {
   datasets: Dataset[];
   currentDatasetId: string | null;
   switchDataset: (id: string) => void;
   isEditMode: boolean;
   setIsEditMode: (mode: boolean) => void;
   openNewWidget: () => void;
   handlePresentationMode: () => void;
   navigate: (path: string) => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
   datasets, currentDatasetId, switchDataset, isEditMode, setIsEditMode, openNewWidget, handlePresentationMode, navigate
}) => {
   return (
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
         <div>
            <Heading level={2} className="flex items-center gap-2">
               <Layout className="w-6 h-6 text-slate-400" /> Tableau de bord
            </Heading>
            <Text variant="muted">Vue d'ensemble de vos données</Text>
         </div>

         <div className="relative">
            <select
               className="w-full md:w-56 appearance-none bg-white border border-slate-300 text-slate-700 text-sm rounded-md py-1.5 pl-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
               value={currentDatasetId || ''}
               onChange={(e) => {
                  if (e.target.value === '__NEW__') navigate('/import');
                  else switchDataset(e.target.value);
               }}
            >
               {datasets.length === 0 && <option value="">Aucun tableau</option>}
               {datasets.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
               ))}
               <option disabled>──────────</option>
               <option value="__NEW__">+ Nouvelle typologie...</option>
            </select>
         </div>

         <div className="flex gap-2">
            <Button variant="ghost" onClick={handlePresentationMode} icon={<Maximize2 className="w-4 h-4" />}>Plein Écran</Button>
            {isEditMode ? (
               <>
                  <Button variant="secondary" onClick={openNewWidget} icon={<Plus className="w-4 h-4" />}>Ajouter</Button>
                  <Button onClick={() => setIsEditMode(false)} icon={<Check className="w-4 h-4" />}>Terminer</Button>
               </>
            ) : (
               <Button variant="outline" onClick={() => setIsEditMode(true)} icon={<Edit3 className="w-4 h-4" />}>Personnaliser</Button>
            )}
         </div>
      </div>
   );
};
