import React from 'react';
import { useData } from '../context/DataContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Trash2, Image as ImageIcon, Palette, UploadCloud, AlertCircle } from 'lucide-react';

export const Customization: React.FC = () => {
  const { companyLogo, updateCompanyLogo } = useData();

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          // Validation de taille (1Mo max)
          if (file.size > 1024 * 1024) { 
              alert("Le fichier est trop volumineux. La taille maximum est de 1 Mo.");
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
      // Reset input value pour permettre de ré-uploader le même fichier si besoin
      e.target.value = '';
  };

  const handleRemoveLogo = () => {
      if (window.confirm("Voulez-vous vraiment supprimer le logo et revenir à l'affichage par défaut ?")) {
          updateCompanyLogo(undefined);
      }
  };

  return (
    <div className="h-full overflow-y-auto p-4 md:p-8 custom-scrollbar">
       <div className="max-w-4xl mx-auto space-y-6 pb-12"> 
         
         <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-pink-100 text-pink-700 rounded-lg">
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
                    <p className="text-[10px] text-slate-400 text-center w-64">
                        Ce logo apparaîtra dans le menu latéral et sur les exports PDF.
                    </p>
                </div>

                {/* Zone Contrôles */}
                <div className="flex-1 space-y-6 pt-2 w-full max-w-lg">
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                        <h4 className="text-sm font-bold text-blue-900 mb-2 flex items-center gap-2">
                            <UploadCloud className="w-4 h-4" />
                            Importer un logo
                        </h4>
                        <p className="text-xs text-blue-800 mb-4 leading-relaxed">
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
                                file:bg-blue-600 file:text-white
                                hover:file:bg-blue-700
                                cursor-pointer border border-slate-300 rounded-md bg-white shadow-sm"
                            />
                        </label>
                        <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-500">
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