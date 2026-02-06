
import React, { useState, useMemo, useEffect } from 'react';
import { useWidgets, useDatasets } from '../context/DataContext';
import { X, Maximize2 } from 'lucide-react';
import { DashboardWidget } from '../types';
import { useNavigate } from 'react-router-dom';

import { WidgetCard } from '../components/dashboard/WidgetCard';
import { WidgetDisplay } from '../components/dashboard/WidgetDisplay';
import { WidgetDrawer } from '../components/dashboard/WidgetDrawer';
import { DashboardHeader } from '../components/dashboard/DashboardHeader';
import { DashboardFilters } from '../components/dashboard/DashboardFilters';
import { ShareDashboardModal } from '../components/dashboard/ShareDashboardModal';
import { useWidgetData } from '../hooks/useWidgetData';
import { useExport } from '../hooks/useExport';
import { o365Service } from '../services/o365Service';

const FullscreenWidgetView: React.FC<{ widget: DashboardWidget, globalDateRange: any }> = ({ widget, globalDateRange }) => {
   const data = useWidgetData(widget, globalDateRange);
   return <WidgetDisplay widget={widget} data={data} />;
};

export const Dashboard: React.FC = () => {
   const {
      dashboardWidgets, addDashboardWidget, removeDashboardWidget,
      duplicateDashboardWidget, updateDashboardWidget, reorderDashboardWidgets,
      dashboardFilters, clearDashboardFilters, setDashboardFilter
   } = useWidgets();

   const { datasets, currentDatasetId, switchDataset } = useDatasets();
   const [isEditMode, setIsEditMode] = useState(false);
   const [editingWidgetId, setEditingWidgetId] = useState<string | null>(null);
   const [showWidgetDrawer, setShowWidgetDrawer] = useState(false);
   const [tempWidget, setTempWidget] = useState<Partial<DashboardWidget>>({
      type: 'kpi', size: 'sm', height: 'md',
      style: { borderColor: 'border-slate-200', borderWidth: '1' },
      config: { metric: 'count' }
   });
   const navigate = useNavigate();
   const { handleExportImage: exportImage, handleExportCSV: exportCSV } = useExport();

   // D&D State
   const [draggedWidgetIndex, setDraggedWidgetIndex] = useState<number | null>(null);

   // GLOBAL DATE FILTERS
   const [globalDateRange, setGlobalDateRange] = useState<{ start: string, end: string }>({ start: '', end: '' });

   // WIDGET MENUS STATE
   const [openMenuWidgetId, setOpenMenuWidgetId] = useState<string | null>(null);
   const [fullscreenWidgetId, setFullscreenWidgetId] = useState<string | null>(null);

   // PHASE 1 - Partage collaboratif
   const [showShareModal, setShowShareModal] = useState(false);
   const [isO365Authenticated, setIsO365Authenticated] = useState(false);

   // Vérifier l'authentification O365 au montage
   useEffect(() => {
      const checkO365Auth = async () => {
         if (!o365Service.isConfigured()) {
            setIsO365Authenticated(false);
            return;
         }
         try {
            const isAuth = await o365Service.isAuthenticated();
            setIsO365Authenticated(isAuth);
         } catch (err) {
            console.error('O365 auth check failed:', err);
            setIsO365Authenticated(false);
         }
      };
      checkO365Auth();
   }, []);

   const handleSaveWidget = () => {
      if (!tempWidget.title) return;
      if (tempWidget.type !== 'text' && !tempWidget.config?.source?.datasetId && tempWidget.config?.source?.mode !== 'temporal') return;
      if (editingWidgetId) updateDashboardWidget(editingWidgetId, tempWidget);
      else addDashboardWidget(tempWidget as any);
      setShowWidgetDrawer(false);
      setEditingWidgetId(null);
      setTempWidget({
         type: 'kpi', size: 'sm', height: 'md',
         style: { borderColor: 'border-slate-200', borderWidth: '1' },
         config: { metric: 'count' }
      });
   };

   const openNewWidget = () => {
      setEditingWidgetId(null);
      setTempWidget({
         title: '', type: 'kpi', size: 'sm', height: 'md',
         style: { borderColor: 'border-slate-200', borderWidth: '1' },
         config: {
            metric: 'count',
            source: undefined
         }
      });
      setShowWidgetDrawer(true);
   };

   const openEditWidget = (w: DashboardWidget) => {
      setEditingWidgetId(w.id);
      // Initialize default color values for pivotChart widgets if they don't exist
      let updatedWidget = { ...w, style: w.style || { borderColor: 'border-slate-200', borderWidth: '1' } };
      if (updatedWidget.config?.pivotChart) {
         updatedWidget.config.pivotChart = {
            ...updatedWidget.config.pivotChart,
            colorMode: updatedWidget.config.pivotChart.colorMode || 'multi',
            colorPalette: updatedWidget.config.pivotChart.colorPalette || 'vibrant',
            singleColor: updatedWidget.config.pivotChart.singleColor || '#0066cc',
            gradientStart: updatedWidget.config.pivotChart.gradientStart || '#0066cc',
            gradientEnd: updatedWidget.config.pivotChart.gradientEnd || '#e63946'
         };
      }
      setTempWidget(updatedWidget);
      setShowWidgetDrawer(true);
   };

   // EXPORT HANDLERS
   const handleExportImage = (widgetId: string, title: string) => {
      setOpenMenuWidgetId(null);
      exportImage(widgetId, title);
   };

   const handleExportCSV = (data: any, title: string) => {
      setOpenMenuWidgetId(null);
      exportCSV(data, title);
   };

   const handlePresentationMode = () => {
      const elem = document.documentElement;
      if (!document.fullscreenElement) {
         elem.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable fullscreen mode: ${err.message} (${err.name})`);
         });
      } else {
         document.exitFullscreen();
      }
   };

   // Drag Handlers
   const handleDragStart = (e: React.DragEvent, index: number) => {
      setDraggedWidgetIndex(index);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(index));
   };

   const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
   };

   const handleDrop = (e: React.DragEvent, targetIndex: number) => {
      e.preventDefault();
      if (draggedWidgetIndex === null) return;
      reorderDashboardWidgets(draggedWidgetIndex, targetIndex);
      setDraggedWidgetIndex(null);
   };

   const availableFields = useMemo(() => {
      if (!tempWidget.config?.source?.datasetId) return [];
      return datasets.find(d => d.id === tempWidget.config?.source?.datasetId)?.fields || [];
   }, [tempWidget.config?.source?.datasetId, datasets]);

   const secondaryFields = useMemo(() => {
      if (!tempWidget.config?.secondarySource?.datasetId) return [];
      return datasets.find(d => d.id === tempWidget.config?.secondarySource?.datasetId)?.fields || [];
   }, [tempWidget.config?.secondarySource?.datasetId, datasets]);

   const allFields = useMemo(() => [...availableFields, ...secondaryFields], [availableFields, secondaryFields]);

   const fullscreenWidget = useMemo(() =>
      dashboardWidgets.find(w => w.id === fullscreenWidgetId),
      [dashboardWidgets, fullscreenWidgetId]
   );

   return (
      <div className="h-full overflow-y-auto p-4 md:p-8 custom-scrollbar relative bg-canvas">
         {fullscreenWidgetId && fullscreenWidget && (
            <div className="fixed inset-0 z-50 bg-white p-8 flex flex-col animate-in zoom-in-95 duration-200">
               <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-slate-800">
                     {fullscreenWidget.title}
                  </h2>
                  <button onClick={() => setFullscreenWidgetId(null)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors">
                     <X className="w-6 h-6 text-slate-600" />
                  </button>
               </div>
               <div className="flex-1 bg-slate-50 rounded-xl border border-slate-200 p-6 shadow-inner">
                  <FullscreenWidgetView widget={fullscreenWidget} globalDateRange={globalDateRange} />
               </div>
            </div>
         )}

         <div className="max-w-7xl mx-auto space-y-6 pb-12">
            <DashboardHeader
               isEditMode={isEditMode}
               setIsEditMode={setIsEditMode}
               openNewWidget={openNewWidget}
               handlePresentationMode={handlePresentationMode}
               navigate={navigate}
               onShareDashboard={() => setShowShareModal(true)}
               canShare={isO365Authenticated && dashboardWidgets.length > 0}
            />

            <DashboardFilters
               globalDateRange={globalDateRange}
               setGlobalDateRange={setGlobalDateRange}
               dashboardFilters={dashboardFilters}
               setDashboardFilter={setDashboardFilter}
               clearDashboardFilters={clearDashboardFilters}
            />

            {/* Grid */}
            {dashboardWidgets.length === 0 ? (
               <div className="text-center py-20 border-2 border-dashed border-border-default rounded-xl bg-surface">
                  <div className="w-12 h-12 text-txt-muted mx-auto mb-3" />
                  <p className="mb-4">Votre tableau de bord est vide.</p>
                  <button className="px-4 py-2 bg-brand-600 text-white rounded-lg" onClick={() => { setIsEditMode(true); openNewWidget(); }}>Créer mon premier widget</button>
               </div>
            ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {dashboardWidgets.map((widget, index) => (
                     <WidgetCard
                        key={widget.id}
                        widget={widget}
                        index={index}
                        isEditMode={isEditMode}
                        globalDateRange={globalDateRange}
                        openMenuWidgetId={openMenuWidgetId}
                        setOpenMenuWidgetId={setOpenMenuWidgetId}
                        setFullscreenWidgetId={setFullscreenWidgetId}
                        handleExportImage={handleExportImage}
                        handleExportCSV={handleExportCSV}
                        handleDragStart={handleDragStart}
                        handleDragOver={handleDragOver}
                        handleDrop={handleDrop}
                        updateDashboardWidget={updateDashboardWidget}
                        duplicateDashboardWidget={duplicateDashboardWidget}
                        openEditWidget={openEditWidget}
                        removeDashboardWidget={removeDashboardWidget}
                     />
                  ))}
               </div>
            )}
         </div>

         <WidgetDrawer
            isOpen={showWidgetDrawer}
            onClose={() => setShowWidgetDrawer(false)}
            editingWidgetId={editingWidgetId}
            tempWidget={tempWidget}
            setTempWidget={setTempWidget}
            handleSaveWidget={handleSaveWidget}
            datasets={datasets}
            allFields={allFields}
            globalDateRange={globalDateRange}
         />

         {/* Phase 1 - Modal de partage collaboratif */}
         <ShareDashboardModal
            isOpen={showShareModal}
            onClose={() => setShowShareModal(false)}
            dashboardName="Mon Dashboard"
            widgets={dashboardWidgets}
            datasets={datasets}
            batches={[]} // TODO: Récupérer les batches associés aux datasets
            uiPrefs={undefined} // TODO: Récupérer les uiPrefs
         />
      </div>
   );
};
