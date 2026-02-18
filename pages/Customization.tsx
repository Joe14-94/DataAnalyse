import React from 'react';
import { useData } from '../context/DataContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Trash2, Image as ImageIcon, Palette, UploadCloud, AlertCircle, Check, Type, Layout as LayoutIcon, Maximize2, RotateCcw } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { validateLogoUri, notify } from '../utils/common';
import { useConfirm } from '../hooks/useConfirm';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

export const Customization: React.FC = () => {
  const { companyLogo, updateCompanyLogo } = useData();
  const { uiPrefs, updateUIPrefs, resetUIPrefs } = useSettings();
  const { confirm, ...confirmProps } = useConfirm();

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          // Validation de taille (1Mo max)
          if (file.size > 1024 * 1024) { 
              notify.error("Le fichier est trop volumineux", "La taille maximum est de 1 Mo.");
              return;
          }

          const reader = new FileReader();
          reader.onload = (ev) => {
              if (ev.target?.result) {
                  const validated = validateLogoUri(ev.target.result as string);
                  if (validated) {
                      updateCompanyLogo(validated);
                  } else {
                      notify.error("Le format du fichier image n'est pas supporté ou est invalide.");
                  }
              }
          };
          reader.readAsDataURL(file);
      }
      // Reset input value pour permettre de ré-uploader le même fichier si besoin
      e.target.value = '';
  };

  const handleRemoveLogo = async () => {
      const ok = await confirm({
          title: 'Supprimer le logo',
          message: "Voulez-vous vraiment supprimer le logo et revenir à l'affichage par défaut ?",
          variant: 'danger'
      });
      if (ok) {
          updateCompanyLogo(undefined);
      }
  };

  return (
    <div className="h-full overflow-y-auto p-4 md:p-8 custom-scrollbar">
       <ConfirmDialog
           isOpen={confirmProps.isOpen}
           onClose={confirmProps.handleCancel}
           onConfirm={confirmProps.handleConfirm}
           {...confirmProps.options}
       />
       <div className="w-full space-y-6 pb-12">
         
         <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-pink-100 text-pink-700 rounded-lg">
                <Palette className="w-6 h-6" />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-slate-800">Personnalisation</h2>
                <p className="text-sm text-slate-500">Gérez l'identité visuelle de votre application.</p>
            </div>
         </div>
         
         {/* DESIGN SYSTEM CONFIGURATION */}
         <Card
            title="Design System & Style Global"
            icon={<Palette className="w-5 h-5 text-brand-600" />}
         >
            <div className="space-y-8">
               <p className="text-sm text-txt-secondary">
                  Personnalisez l'affichage global de l'application. Ces réglages s'appliquent à tous les composants pour garantir une cohérence visuelle.
               </p>

               {/* Thème et Style */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Theme Selection */}
                  <div className="space-y-3">
                     <label className="text-sm font-bold text-txt-main block uppercase tracking-wider text-xs">Thème de l'interface</label>
                     <div className="grid grid-cols-2 gap-2">
                        {[
                           { id: 'light', name: 'Clair' },
                           { id: 'dark', name: 'Sombre' }
                        ].map(t => (
                           <button
                              key={t.id}
                              onClick={() => updateUIPrefs({ theme: t.id as any })}
                              className={`p-3 text-left border rounded-lg transition-all flex items-center justify-between ${uiPrefs.theme === t.id ? 'border-brand-600 bg-brand-50' : 'border-border-default hover:border-txt-muted bg-surface'}`}
                           >
                              <span className={`text-sm font-bold ${uiPrefs.theme === t.id ? 'text-brand-700' : 'text-txt-main'}`}>{t.name}</span>
                              {uiPrefs.theme === t.id && <Check className="w-4 h-4 text-brand-600" />}
                           </button>
                        ))}
                     </div>
                  </div>

                  {/* Style Selection */}
                  <div className="space-y-3">
                     <label className="text-sm font-bold text-txt-main block uppercase tracking-wider text-xs">Style visuel</label>
                     <div className="grid grid-cols-3 gap-2">
                        {[
                           { id: 'classic', name: 'Classique' },
                           { id: 'material', name: 'Material' },
                           { id: 'glass', name: 'Liquid Glass' }
                        ].map(s => (
                           <button
                              key={s.id}
                              onClick={() => updateUIPrefs({ style: s.id as any })}
                              className={`p-2 text-center border rounded-lg transition-all ${uiPrefs.style === s.id ? 'border-brand-600 bg-brand-50' : 'border-border-default hover:border-txt-muted bg-surface'}`}
                           >
                              <div className={`text-xs font-bold ${uiPrefs.style === s.id ? 'text-brand-700' : 'text-txt-main'}`}>{s.name}</div>
                           </button>
                        ))}
                     </div>
                  </div>
               </div>

               {/* Color Ambiance */}
               <div className="space-y-3">
                  <label className="text-sm font-bold text-txt-main block uppercase tracking-wider text-xs">Ambiance colorimétrique (Palette)</label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-3">
                     {[
                        { id: 'blue', color: '#2563eb', name: 'Océan' },
                        { id: 'indigo', color: '#4f46e5', name: 'Royal' },
                        { id: 'violet', color: '#7c3aed', name: 'Abysse' },
                        { id: 'emerald', color: '#059669', name: 'Émeraude' },
                        { id: 'teal', color: '#0d9488', name: 'Lagon' },
                        { id: 'rose', color: '#e11d48', name: 'Framboise' },
                        { id: 'orange', color: '#ea580c', name: 'Aurore' },
                        { id: 'amber', color: '#d97706', name: 'Solaire' },
                        { id: 'slate', color: '#475569', name: 'Graphite' }
                     ].map(p => (
                        <button
                           key={p.id}
                           onClick={() => updateUIPrefs({ colorPalette: p.id as any })}
                           className={`group flex flex-col items-center gap-2 p-2 rounded-xl transition-all ${uiPrefs.colorPalette === p.id ? 'bg-brand-50 ring-2 ring-brand-600' : 'hover:bg-canvas border border-transparent hover:border-border-default'}`}
                        >
                           <div
                              className="w-10 h-10 rounded-full shadow-md border-2 border-white transition-transform group-hover:scale-110"
                              style={{ backgroundColor: p.color }}
                           />
                           <span className={`text-xs font-bold uppercase tracking-tight text-center ${uiPrefs.colorPalette === p.id ? 'text-brand-700' : 'text-txt-muted'}`}>
                              {p.name}
                           </span>
                        </button>
                     ))}
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Font Size */}
                  <div className="space-y-4">
                     <div className="flex justify-between items-center">
                        <label className="text-sm font-bold text-txt-main flex items-center gap-2 uppercase tracking-wider text-xs">
                           <Type className="w-4 h-4 text-txt-muted" /> Taille de police
                        </label>
                        <span className="text-xs font-mono bg-canvas px-2 py-1 rounded text-txt-secondary">{uiPrefs.fontSize}px</span>
                     </div>
                     <input
                        type="range"
                        min="8"
                        max="18"
                        step="1"
                        value={uiPrefs.fontSize}
                        onChange={(e) => updateUIPrefs({ fontSize: parseInt(e.target.value) })}
                        className="w-full h-2 bg-border-default rounded-lg appearance-none cursor-pointer accent-brand-600"
                     />
                     <div className="flex justify-between text-xs text-txt-muted font-bold uppercase">
                        <span>Minuscule</span>
                        <span>Large</span>
                     </div>
                  </div>

                  {/* Sidebar Width */}
                  <div className="space-y-4">
                     <div className="flex justify-between items-center">
                        <label className="text-sm font-bold text-txt-main flex items-center gap-2 uppercase tracking-wider text-xs">
                           <LayoutIcon className="w-4 h-4 text-txt-muted" /> Largeur du menu
                        </label>
                        <span className="text-xs font-mono bg-canvas px-2 py-1 rounded text-txt-secondary">{uiPrefs.sidebarWidth}px</span>
                     </div>
                     <input
                        type="range"
                        min="140"
                        max="300"
                        step="4"
                        value={uiPrefs.sidebarWidth}
                        onChange={(e) => updateUIPrefs({ sidebarWidth: parseInt(e.target.value) })}
                        className="w-full h-2 bg-border-default rounded-lg appearance-none cursor-pointer accent-brand-600"
                     />
                     <div className="flex justify-between text-xs text-txt-muted font-bold uppercase">
                        <span>Étroit</span>
                        <span>Large</span>
                     </div>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Font Family */}
                  <div className="space-y-3">
                     <label className="text-sm font-bold text-txt-main block uppercase tracking-wider text-xs">Identité visuelle (Police)</label>
                     <div className="grid grid-cols-2 gap-2">
                        {[
                           { id: 'inter', name: 'Inter (Pro)', fontClass: 'font-inter' },
                           { id: 'outfit', name: 'Outfit (Moderne)', fontClass: 'font-outfit' },
                           { id: 'sans', name: 'Système Sans', fontClass: 'font-sans' },
                           { id: 'mono', name: 'Fira Mono', fontClass: 'font-mono' }
                        ].map(f => (
                           <button
                              key={f.id}
                              onClick={() => updateUIPrefs({ fontFamily: f.id as any })}
                              className={`p-3 text-left border rounded-lg transition-all ${uiPrefs.fontFamily === f.id ? 'border-brand-600 bg-brand-50' : 'border-border-default hover:border-border-default bg-surface'}`}
                           >
                              <div className={`text-sm font-bold ${f.fontClass} truncate ${uiPrefs.fontFamily === f.id ? 'text-brand-700' : 'text-txt-main'}`}>{f.name}</div>
                              <div className="text-xs text-txt-muted mt-0.5">Interface complète</div>
                           </button>
                        ))}
                     </div>
                  </div>

                  {/* Density / Presets */}
                  <div className="space-y-3">
                     <label className="text-sm font-bold text-txt-main block uppercase tracking-wider text-xs">Densité d'affichage</label>
                     <div className="space-y-2">
                        {[
                           { id: 'ultra', name: 'Mode Expert', desc: 'Densité maximale pour TCD massifs', size: 10, sw: 160 },
                           { id: 'compact', name: 'Mode Compact', desc: 'Équilibre productivité/lisibilité', size: 12, sw: 192 },
                           { id: 'comfortable', name: 'Mode Confort', desc: 'Lisibilité aérée et fluide', size: 14, sw: 240 }
                        ].map(p => (
                           <button
                              key={p.id}
                              onClick={() => updateUIPrefs({ density: p.id as any, fontSize: p.size, sidebarWidth: p.sw })}
                              className={`w-full p-2.5 text-left border rounded-lg flex items-center gap-3 transition-all ${uiPrefs.density === p.id ? 'border-brand-600 bg-brand-50' : 'border-border-default hover:border-border-default bg-surface'}`}
                           >
                              <div className={`p-1.5 rounded-md ${uiPrefs.density === p.id ? 'bg-brand-600 text-white' : 'bg-canvas text-txt-muted'}`}>
                                 <Maximize2 className="w-3.5 h-3.5" />
                              </div>
                              <div className="flex-1">
                                 <div className={`text-xs font-bold ${uiPrefs.density === p.id ? 'text-brand-700' : 'text-txt-main'}`}>{p.name}</div>
                                 <div className="text-xs text-txt-muted font-medium">{p.desc}</div>
                              </div>
                              {uiPrefs.density === p.id && <Check className="w-4 h-4 text-brand-600" />}
                           </button>
                        ))}
                     </div>
                  </div>
               </div>

               <div className="pt-4 border-t border-border-default flex justify-end">
                  <Button variant="ghost" onClick={resetUIPrefs} className="text-txt-muted hover:text-txt-main">
                     <RotateCcw className="w-4 h-4 mr-2" /> Réinitialiser le style par défaut
                  </Button>
               </div>
            </div>
         </Card>

         <Card title="Identité de l'entreprise">
            <div className="flex flex-col md:flex-row gap-8 items-start">
                
                {/* Zone Aperçu */}
                <div className="space-y-3 flex-shrink-0">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Aperçu actuel</span>
                    <div className="w-64 h-40 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center overflow-hidden relative shadow-sm group">
                        {companyLogo ? (
                            <img 
                                src={companyLogo} 
                                alt="Logo Entreprise" 
                                className="w-full h-full object-contain p-4 transition-transform duration-300 group-hover:scale-105" 
                            />
                        ) : (
                            <div className="text-center p-4">
                                <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                                <span className="text-xs text-slate-400 font-medium">Aucun logo défini</span>
                            </div>
                        )}
                    </div>
                    <p className="text-xs text-slate-400 text-center w-64">
                        Ce logo apparaîtra dans le menu latéral et sur les exports PDF.
                    </p>
                </div>

                {/* Zone Contrôles */}
                <div className="flex-1 space-y-6 pt-2 w-full max-w-lg">
                    <div className="bg-brand-50 border border-brand-100 rounded-lg p-4">
                        <h4 className="text-sm font-bold text-brand-900 mb-2 flex items-center gap-2">
                            <UploadCloud className="w-4 h-4" />
                            Importer un logo
                        </h4>
                        <p className="text-xs text-brand-800 mb-4 leading-relaxed">
                            Sélectionnez une image pour remplacer le titre "DataScope". 
                            Nous recommandons un fichier <strong>PNG avec fond transparent</strong> pour un meilleur rendu.
                        </p>

                        <label className="block">
                            <span className="sr-only">Choisir un fichier</span>
                            <input
                                type="file"
                                accept="image/png, image/jpeg, image/svg+xml, image/webp"
                                onChange={handleLogoChange}
                                className="block w-full text-sm text-slate-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-md file:border-0
                                file:text-xs file:font-semibold
                                file:bg-brand-600 file:text-white
                                hover:file:bg-brand-700
                                cursor-pointer border border-slate-300 rounded-md bg-white shadow-sm"
                            />
                        </label>
                        <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                            <AlertCircle className="w-3 h-3" />
                            <span>Max: 1 Mo. Formats: PNG, JPG, SVG, WEBP.</span>
                        </div>
                    </div>

                    {companyLogo && (
                        <div className="pt-4 border-t border-slate-100">
                            <Button 
                                variant="danger" 
                                size="sm" 
                                onClick={handleRemoveLogo}
                                className="w-full sm:w-auto"
                            >
                                <Trash2 className="w-4 h-4 mr-2" /> Supprimer le logo actuel
                            </Button>
                        </div>
                    )}
                </div>
            </div>
         </Card>
       </div>
    </div>
  );
};