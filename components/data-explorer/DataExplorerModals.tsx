import React from 'react';
import { AlertTriangle, GitCommit } from 'lucide-react';
import { Button } from '../ui/Button';
import { formatDateFr } from '../../utils';

interface DeleteRowModalProps {
    deleteConfirmRow: any;
    onClose: () => void;
    onConfirm: () => void;
}

export const DeleteRowModal: React.FC<DeleteRowModalProps> = ({ deleteConfirmRow, onClose, onConfirm }) => {
    if (!deleteConfirmRow) return null;
    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-red-100 rounded-full text-red-600">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">Confirmer la suppression</h3>
                </div>
                <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                    Vous êtes sur le point de supprimer cette ligne définitivement de l'import du
                    <strong> {formatDateFr(deleteConfirmRow._importDate)}</strong>.
                    <br /><br />
                    Cette action est irréversible.
                </p>
                <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={onClose}>Annuler</Button>
                    <Button variant="danger" onClick={onConfirm}>Supprimer la ligne</Button>
                </div>
            </div>
        </div>
    );
};

interface EditModeToolbarProps {
    isEditMode: boolean;
    pendingChanges: any;
    handleSaveEdits: () => void;
    handleCancelEdits: () => void;
}

export const EditModeToolbar: React.FC<EditModeToolbarProps> = ({
    isEditMode, pendingChanges, handleSaveEdits, handleCancelEdits
}) => {
    if (!isEditMode) return null;
    return (
        <div className="bg-brand-50 border border-brand-200 rounded-lg p-3 shadow-sm flex items-center justify-between animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-100 rounded-full text-brand-600">
                    <GitCommit className="w-5 h-5" />
                </div>
                <div>
                    <p className="text-sm font-bold text-brand-900">Mode Édition Activé</p>
                    <p className="text-xs text-brand-700">Modifiez les cellules directement dans le tableau. Les changements ne sont pas encore enregistrés.</p>
                </div>
            </div>
            <div className="flex gap-3">
                <Button variant="outline" onClick={handleCancelEdits}>Annuler</Button>
                <Button variant="primary" onClick={handleSaveEdits} className="bg-brand-600 hover:bg-brand-700 shadow-md">
                    Enregistrer les modifications ({Object.values(pendingChanges).reduce((acc: number, curr: any) => acc + Object.keys(curr).length, 0)} lignes)
                </Button>
            </div>
        </div>
    );
};
