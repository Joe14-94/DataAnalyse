
import React from 'react';
import { Layout, Maximize2, Plus, Check, Edit3 } from 'lucide-react';
import { Heading, Text } from '../ui/Typography';
import { Button } from '../ui/Button';
import { Dataset } from '../../types';

interface DashboardHeaderProps {
   isEditMode: boolean;
   setIsEditMode: (mode: boolean) => void;
   openNewWidget: () => void;
   handlePresentationMode: () => void;
   navigate: (path: string) => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
   isEditMode, setIsEditMode, openNewWidget, handlePresentationMode, navigate
}) => {
   return (
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
         <div>
            <Heading level={2} className="flex items-center gap-2">
               <Layout className="w-6 h-6 text-slate-400" /> Tableau de bord
            </Heading>
            <Text variant="muted">Vue d'ensemble de vos données</Text>
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
