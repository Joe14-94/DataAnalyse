import React from 'react';
import { Download, Upload, Database, PlayCircle, ShieldAlert, Trash2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface BackupRestoreSectionProps {
    setBackupModalMode: (mode: 'backup' | 'restore') => void;
    handleImportClick: () => void;
}

export const BackupRestoreSection: React.FC<BackupRestoreSectionProps> = ({ setBackupModalMode, handleImportClick }) => (
    <Card title="Sauvegarde et restauration">
        <div className="space-y-4">
            <p className="text-sm text-slate-600">Sécurisez vos données avec des exports.</p>
            <div className="flex flex-col gap-3">
                <Button onClick={() => setBackupModalMode('backup')} className="w-full"><Download className="w-4 h-4 mr-2" />Exporter</Button>
                <Button variant="outline" onClick={handleImportClick} className="w-full"><Upload className="w-4 h-4 mr-2" />Importer</Button>
            </div>
        </div>
    </Card>
);

interface DemoDataSectionProps {
    handleLoadDemo: () => void;
}

export const DemoDataSection: React.FC<DemoDataSectionProps> = ({ handleLoadDemo }) => (
    <Card title="Données de test" className="border-indigo-100">
        <div className="flex items-start gap-3">
            <div className="p-2 bg-indigo-50 rounded-full text-indigo-600"><Database className="w-5 h-5" /></div>
            <div className="flex-1">
                <p className="text-sm text-slate-600 mb-3">Générez des données fictives sur 6 mois.</p>
                <Button variant="secondary" onClick={handleLoadDemo} className="w-full"><PlayCircle className="w-4 h-4 mr-2" />Générer</Button>
            </div>
        </div>
    </Card>
);

interface DangerZoneSectionProps {
    handleReset: () => void;
}

export const DangerZoneSection: React.FC<DangerZoneSectionProps> = ({ handleReset }) => (
    <Card title="Zone de danger" className="border-red-200 bg-red-50">
        <div className="space-y-4">
            <div className="flex items-start gap-3">
                <div className="p-2 bg-white rounded-full text-red-500 shadow-sm"><ShieldAlert className="w-6 h-6" /></div>
                <p className="text-xs text-red-800">Supprime TOUTES les données définitivement.</p>
            </div>
            <Button variant="danger" onClick={handleReset} className="w-full"><Trash2 className="w-4 h-4 mr-2" />Tout supprimer</Button>
        </div>
    </Card>
);
