import React, { useState } from 'react';
import { Database, X, AlertCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface SaveAsDatasetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  defaultName: string;
}

export const SaveAsDatasetModal: React.FC<SaveAsDatasetModalProps> = ({
  isOpen,
  onClose,
  onSave,
  defaultName
}) => {
  const [name, setName] = useState(defaultName);

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim());
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Créer un nouveau Dataset à partir du TCD">
      <div className="p-6 space-y-4">
        <div className="bg-brand-50 border border-brand-100 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-brand-600 shrink-0" />
          <div className="text-sm text-brand-800">
            <p className="font-semibold">Informations importantes</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Seules les lignes de données seront incluses (pas les totaux/sous-totaux).</li>
              <li>
                Le nouveau Dataset sera automatiquement mis à jour lors de l'import de nouvelles
                données sources.
              </li>
              <li>Toutes les filtres actifs seront appliqués au Dataset créé.</li>
            </ul>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Nom du nouveau Dataset
          </label>
          <div className="relative">
            <Database className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
              placeholder="Ex: Analyse Ventes 2024"
              autoFocus
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim()}
            className="bg-brand-600 text-white hover:bg-brand-700"
          >
            Créer le Dataset
          </Button>
        </div>
      </div>
    </Modal>
  );
};
