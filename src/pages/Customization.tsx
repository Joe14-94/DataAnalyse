
import React from 'react';
import { useData } from '../context/DataContext';
import { Card } from '../components/ui/Card';
import { Trash2, Image as ImageIcon, Palette } from 'lucide-react';

export const Customization: React.FC = () => {
  const { companyLogo, updateCompanyLogo } = useData();

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          if (file.size > 1000000) { // 1MB limit
              alert("Le fichier est trop lourd (max 1Mo).");
              return;
          }
          const reader = new FileReader();
          reader.onload = (ev) => {
              if (ev.target?.result) {
                  updateCompanyLogo(ev.target.result as string);
              }
          };
          reader.readAsDataURL(file);
      }
      e.target.value = '';
  };

  const handleRemoveLogo = () => {
      if (window.confirm("Supprimer le logo ?")) {
          updateCompanyLogo(undefined);
      }
  };

  return (
    <div className="h-full overflow-y-auto p-4 md:p-8 custom-scrollbar">
       <div className="max-w-4xl mx-auto space-y-6"> 
         <div className="flex items-center gap-3">
            <div className="p-2 bg-pink-100 text-pink-700 rounded-lg">
                <Palette className="w-6 h-6" />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-slate-800">Personnalisation</h2>
                <p className="text-sm text-slate-500">Gérez l'identité visuelle de votre application.</p>
            </div>
         </div>
         
         <Card title="Identité de l'entreprise">
            <div className="flex flex-col md:flex-row gap-8 items-start">
                {/* Zone Aperçu */}
                <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Aperçu actuel</span>
                    <div className="w-40 h-40 bg-white border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center overflow-hidden relative shadow-sm">
                        {companyLogo ? (
                            <img src={companyLogo} alt="Logo Entreprise" className="w-full h-full object-contain p-4" />
                        ) : (
                            <div className="text-center p-4">
                                <ImageIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                                <span className="text-xs text-slate-400 font-medium">Aucun logo défini</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Zone Contrôles */}
                <div className="flex-1 space-y-6 max-w-lg">
                    <div>
                        <h4 className="text-base font-bold text-slate-800 mb-1">Logo de l'application</h4>
                        <p className="text-sm text-slate-600">
                            Ce logo s'affichera en haut du menu latéral gauche et sur tous les exports PDF générés par l'application.
                        </p>
                        <ul className="mt-2 text-xs text-slate-500 list-disc list-inside space-y-1">
                            <li>Format recommandé : <strong>PNG</strong> (fond transparent) ou SVG.</li>
                            <li>Poids maximum : <strong>1 Mo</strong>.</li>
                            <li>Dimensions idéales : Ratio rectangulaire ou carré.</li>
                        </ul>
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-2">Importer une image</label>
                            {/* Input file natif stylisé avec Tailwind pour compatibilité maximale */}
                            <input
                                type="file"
                                accept="image/png, image/jpeg, image/svg+xml, image/webp"
                                onChange={handleLogoChange}
                                className="block w-full text-sm text-slate-500
                                file:mr-4 file:py-2.5 file:px-4
                                file:rounded-md file:border-0
                                file:text-sm file:font-semibold
                                file:bg-blue-600 file:text-white
                                hover:file:bg-blue-700
                                cursor-pointer border border-slate-300 rounded-md bg-white shadow-sm"
                            />
                        </div>

                        {companyLogo && (
                            <div className="pt-2 border-t border-slate-200">
                                <button 
                                    onClick={handleRemoveLogo}
                                    className="text-xs font-medium text-red-600 hover:text-red-800 hover:underline flex items-center gap-1.5"
                                >
                                    <Trash2 className="w-3.5 h-3.5" /> Supprimer le logo actuel
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
         </Card>
       </div>
    </div>
  );
};
