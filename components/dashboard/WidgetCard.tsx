
import React from 'react';
import { MoreVertical, Maximize2, Image as ImageIcon, FileText, GripHorizontal, Move, Copy, Settings, Trash2 } from 'lucide-react';
import { DashboardWidget } from '../../types';
import { useWidgetData } from '../../hooks/useWidgetData';
import { WidgetDisplay } from './WidgetDisplay';

interface WidgetCardProps {
   widget: DashboardWidget;
   index: number;
   isEditMode: boolean;
   globalDateRange: { start: string; end: string };
   openMenuWidgetId: string | null;
   setOpenMenuWidgetId: (id: string | null) => void;
   setFullscreenWidgetId: (id: string | null) => void;
   handleExportImage: (id: string, title: string) => void;
   handleExportCSV: (data: any, title: string) => void;
   handleDragStart: (e: React.DragEvent, index: number) => void;
   handleDragOver: (e: React.DragEvent) => void;
   handleDrop: (e: React.DragEvent, targetIndex: number) => void;
   updateDashboardWidget: (id: string, updates: Partial<DashboardWidget>) => void;
   duplicateDashboardWidget: (id: string) => void;
   openEditWidget: (w: DashboardWidget) => void;
   removeDashboardWidget: (id: string) => void;
}

export const WidgetCard: React.FC<WidgetCardProps> = React.memo(({
   widget, index, isEditMode, globalDateRange,
   openMenuWidgetId, setOpenMenuWidgetId, setFullscreenWidgetId,
   handleExportImage, handleExportCSV,
   handleDragStart, handleDragOver, handleDrop,
   updateDashboardWidget, duplicateDashboardWidget, openEditWidget, removeDashboardWidget
}) => {
   const widgetData = useWidgetData(widget, globalDateRange);

   const colSpan = widget.size === 'full' ? 'md:col-span-2 lg:col-span-4' : widget.size === 'lg' ? 'md:col-span-2 lg:col-span-3' : widget.size === 'md' ? 'md:col-span-2' : 'col-span-1';
   const heightClass = widget.height === 'sm' ? 'h-32' : widget.height === 'lg' ? 'h-96' : widget.height === 'xl' ? 'h-[500px]' : 'h-64';
   const isText = widget.type === 'text';
   const bgColor = isText && widget.config.textStyle?.color === 'primary' ? 'bg-brand-50 border-brand-200' : 'bg-white';
   const borderClass = widget.style?.borderColor || 'border-slate-200';
   const widthClass = widget.style?.borderWidth === '0' ? 'border-0' : widget.style?.borderWidth === '2' ? 'border-2' : widget.style?.borderWidth === '4' ? 'border-4' : 'border';

   return (
      <div
         className={`${colSpan}`}
         draggable={isEditMode}
         onDragStart={(e) => handleDragStart(e, index)}
         onDragOver={handleDragOver}
         onDrop={(e) => handleDrop(e, index)}
      >
         <div id={`widget-container-${widget.id}`} className={`${bgColor} rounded-lg ${widthClass} ${borderClass} ${isEditMode ? 'ring-2 ring-brand-100 border-brand-300 cursor-move' : ''} shadow-sm p-4 flex flex-col ${heightClass} relative group transition-all`}>

            {!isEditMode && (
               <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="relative">
                     <button onClick={() => setOpenMenuWidgetId(openMenuWidgetId === widget.id ? null : widget.id)} className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600">
                        <MoreVertical className="w-4 h-4" />
                     </button>
                     {openMenuWidgetId === widget.id && (
                        <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20 animate-in fade-in zoom-in-95 duration-100">
                           <button onClick={() => setFullscreenWidgetId(widget.id)} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2 text-slate-700">
                              <Maximize2 className="w-3 h-3" /> Agrandir
                           </button>
                           <div className="border-t border-slate-100 my-1"></div>
                           <button onClick={() => handleExportImage(widget.id, widget.title)} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2 text-slate-700">
                              <ImageIcon className="w-3 h-3" /> Image (.png)
                           </button>
                           <button onClick={() => handleExportCSV(widgetData, widget.title)} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2 text-slate-700">
                              <FileText className="w-3 h-3" /> Données (.csv)
                           </button>
                        </div>
                     )}
                  </div>
               </div>
            )}

            {isEditMode && (
               <div className="absolute top-2 left-1/2 transform -translate-x-1/2 p-1 bg-slate-100/80 rounded-full text-slate-400 opacity-50 group-hover:opacity-100">
                  <GripHorizontal className="w-4 h-4" />
               </div>
            )}

            {isEditMode && (
               <div className="absolute top-2 right-2 flex gap-1 bg-white/90 p-1 rounded shadow-sm z-10 border border-slate-200 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex gap-0.5 mr-2">
                     <button onClick={() => updateDashboardWidget(widget.id, { size: widget.size === 'full' ? 'sm' : widget.size === 'lg' ? 'full' : widget.size === 'md' ? 'lg' : 'md' })} className="p-1 hover:bg-slate-100 rounded text-slate-500" title="Changer largeur"><Move className="w-3 h-3" /></button>
                  </div>
                  <div className="w-px bg-slate-200 mx-0.5"></div>
                  <button onClick={() => duplicateDashboardWidget(widget.id)} className="p-1 hover:bg-brand-50 rounded text-brand-600"><Copy className="w-3 h-3" /></button>
                  <button onClick={() => openEditWidget(widget)} className="p-1 hover:bg-brand-50 rounded text-brand-600"><Settings className="w-3 h-3" /></button>
                  <button onClick={() => removeDashboardWidget(widget.id)} className="p-1 hover:bg-red-50 rounded text-red-600"><Trash2 className="w-3 h-3" /></button>
               </div>
            )}
            <h3 className="text-sm font-bold text-slate-500 mb-1.5 uppercase tracking-wider truncate" title={widget.title}>{widget.title}</h3>
            <div className="flex-1 min-h-0 pointer-events-none md:pointer-events-auto">
               <WidgetDisplay widget={widget} data={widgetData} />
            </div>
         </div>
      </div>
   );
});
