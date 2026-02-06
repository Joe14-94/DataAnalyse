
import React, { useState } from 'react';
import { Database, X, Check, Info } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface SaveAsDatasetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  defaultName?: string;
}

export const SaveAsDatasetModal: React.FC<SaveAsDatasetModalProps> = ({
  isOpen,
  onClose,
  onSave,
  defaultName = ''
}) => {
  const [name, setName] = useState(defaultName);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim());
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Sauvegarder comme nouveau Dataset">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-brand-50 border border-brand-100 p-3 rounded-lg flex items-start gap-3">
          <Info className="w-4 h-4 text-brand-600 mt-0.5" />
          <div className="text-xs text-brand-800 leading-relaxed">
            Cela créera un nouveau Dataset à partir des données actuellement affichées dans votre TCD.
            <br />
            <strong>Note :</strong> Ce dataset sera automatiquement synchronisé lorsque vous importerez de nouvelles données dans le dataset source.
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Nom du nouveau Dataset
          </label>
          <input
            type="text"
            className="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
            placeholder="Ex: Synthèse des ventes par région"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} type="button">
            Annuler
          </Button>
          <Button
            type="submit"
            disabled={!name.trim()}
            className="bg-brand-600 hover:bg-brand-700 text-white"
          >
            <Check className="w-4 h-4 mr-2" />
            Créer le Dataset
          </Button>
        </div>
      </form>
    </Modal>
  );
};
