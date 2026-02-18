/**
 * Section O365 pour la page Settings
 * POC - Intégration Microsoft 365 (OneDrive / SharePoint)
 *
 * Fonctionnalités:
 * - Connexion/Déconnexion O365
 * - Sauvegarde vers OneDrive
 * - Liste et restauration des backups cloud
 * - Partage de dashboards
 */

import React, { useState, useEffect } from 'react';
import {
  Cloud,
  CloudOff,
  Download,
  Upload,
  Trash2,
  CheckCircle,
  AlertCircle,
  Info,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { o365Service } from '../../services/o365Service';
import { logger, notify } from '../../utils/common';
import { useConfirm } from '../../hooks/useConfirm';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import type { O365User, BackupMetadata } from '../../types/o365';
import type { AppState } from '../../types';

interface O365SectionProps {
  currentState: AppState;
  onRestoreBackup: (data: Partial<AppState>) => void;
}

export const O365Section: React.FC<O365SectionProps> = ({
  currentState,
  onRestoreBackup,
}) => {
  const { confirm, ...confirmProps } = useConfirm();
  // État local
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<O365User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backups, setBackups] = useState<BackupMetadata[]>([]);
  const [showBackupsModal, setShowBackupsModal] = useState(false);
  const [isConfigured, setIsConfigured] = useState(true);

  // Vérifier l'état d'authentification au montage
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const configured = o365Service.isConfigured();
      setIsConfigured(configured);

      if (!configured) return;

      const authenticated = await o365Service.isAuthenticated();
      setIsAuthenticated(authenticated);

      if (authenticated) {
        const user = await o365Service.getCurrentUser();
        setCurrentUser(user);
      }
    } catch (err) {
      logger.error('[O365Section] Check auth failed:', err);
    }
  };

  // Connexion
  const handleLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const user = await o365Service.login();
      setCurrentUser(user);
      setIsAuthenticated(true);
    } catch (err: any) {
      setError(err.message || 'Échec de la connexion');
      logger.error('[O365Section] Login failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Déconnexion
  const handleLogout = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await o365Service.logout();
      setCurrentUser(null);
      setIsAuthenticated(false);
      setBackups([]);
    } catch (err: any) {
      setError(err.message || 'Échec de la déconnexion');
      logger.error('[O365Section] Logout failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Sauvegarder vers OneDrive
  const handleSaveToOneDrive = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const filename = `datascope_backup_${new Date().toISOString().split('T')[0]}`;

      // Sauvegarder toutes les données importantes
      const dataToBackup: Partial<AppState> = {
        datasets: currentState.datasets,
        batches: currentState.batches,
        dashboardWidgets: currentState.dashboardWidgets,
        savedAnalyses: currentState.savedAnalyses,
        savedMappings: currentState.savedMappings,
        budgetModule: currentState.budgetModule,
        forecastModule: currentState.forecastModule,
        pipelineModule: currentState.pipelineModule,
        financeReferentials: currentState.financeReferentials,
        uiPrefs: currentState.uiPrefs,
      };

      await o365Service.saveBackupToOneDrive(filename, dataToBackup);

      notify.success('Sauvegarde OneDrive réussie !');
    } catch (err: any) {
      setError(err.message || 'Échec de la sauvegarde');
      logger.error('[O365Section] Save failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Charger la liste des backups
  const handleLoadBackupsList = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const backupsList = await o365Service.listBackups();
      setBackups(backupsList);
      setShowBackupsModal(true);
    } catch (err: any) {
      setError(err.message || 'Échec du chargement de la liste');
      logger.error('[O365Section] List backups failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Restaurer un backup
  const handleRestoreBackup = async (backup: BackupMetadata) => {
    const ok = await confirm({
      title: 'Restaurer le backup',
      message: `Voulez-vous vraiment restaurer le backup "${backup.name}" ?\n\nCela écrasera vos données actuelles.`,
      variant: 'warning',
      confirmLabel: 'Restaurer'
    });

    if (!ok) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await o365Service.loadBackupFromOneDrive(backup.id);
      onRestoreBackup(data);
      setShowBackupsModal(false);
      notify.success('Restauration réussie !');
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'Échec de la restauration');
      logger.error('[O365Section] Restore failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Supprimer un backup
  const handleDeleteBackup = async (backup: BackupMetadata) => {
    const ok = await confirm({
      title: 'Supprimer le backup',
      message: `Supprimer définitivement "${backup.name}" de OneDrive ?`,
      variant: 'danger',
      confirmLabel: 'Supprimer'
    });

    if (!ok) return;

    setIsLoading(true);
    setError(null);

    try {
      await o365Service.deleteBackup(backup.id);
      // Rafraîchir la liste
      const updatedBackups = await o365Service.listBackups();
      setBackups(updatedBackups);
      notify.success('Backup supprimé');
    } catch (err: any) {
      setError(err.message || 'Échec de la suppression');
      logger.error('[O365Section] Delete failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Formater la taille du fichier
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Formater la date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Si pas configuré, afficher message d'information
  if (!isConfigured) {
    return (
      <Card className="p-6 border-2 border-dashed border-border-default">
        <div className="flex items-start gap-3">
          <Info className="w-6 h-6 text-brand-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-bold mb-2">
              Intégration Microsoft 365 (POC)
            </h3>
            <p className="text-sm text-txt-secondary mb-4">
              Cette fonctionnalité nécessite une configuration Azure AD.
            </p>
            <div className="bg-surface p-4 rounded-lg text-xs font-mono">
              <p className="mb-2">Pour activer cette fonctionnalité :</p>
              <ol className="list-decimal list-inside space-y-1 text-txt-muted">
                <li>Créer une App Registration dans Azure AD</li>
                <li>Configurer la variable VITE_O365_CLIENT_ID</li>
                <li>Ajouter les permissions : User.Read, Files.ReadWrite</li>
              </ol>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <>
      <ConfirmDialog
        isOpen={confirmProps.isOpen}
        onClose={confirmProps.handleCancel}
        onConfirm={confirmProps.handleConfirm}
        {...confirmProps.options}
      />
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Cloud className="w-6 h-6 text-[#0078D4]" />
          <div>
            <h3 className="text-lg font-bold">Microsoft 365 - OneDrive</h3>
            <p className="text-xs text-txt-muted">
              Sauvegardez et partagez vos analyses (POC)
            </p>
          </div>
        </div>

        {/* Erreur */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-800">{error}</div>
          </div>
        )}

        {/* Non authentifié */}
        {!isAuthenticated && (
          <div>
            <p className="text-sm text-txt-secondary mb-4">
              Connectez-vous avec votre compte Microsoft pour sauvegarder vos
              données dans OneDrive et partager vos analyses avec votre équipe.
            </p>
            <Button
              onClick={handleLogin}
              disabled={isLoading}
              className="bg-[#0078D4] hover:bg-[#106EBE]"
            >
              <Cloud className="w-4 h-4 mr-2" />
              {isLoading ? 'Connexion...' : 'Se connecter à Microsoft 365'}
            </Button>
          </div>
        )}

        {/* Authentifié */}
        {isAuthenticated && currentUser && (
          <div className="space-y-4">
            {/* Info utilisateur */}
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <div className="text-sm font-semibold text-green-900">
                    {currentUser.displayName}
                  </div>
                  <div className="text-xs text-green-700">
                    {currentUser.email}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                disabled={isLoading}
              >
                <CloudOff className="w-4 h-4 mr-1" />
                Déconnecter
              </Button>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                onClick={handleSaveToOneDrive}
                disabled={isLoading}
                className="bg-brand-600 hover:bg-brand-700"
              >
                <Upload className="w-4 h-4 mr-2" />
                {isLoading ? 'Sauvegarde...' : 'Sauvegarder sur OneDrive'}
              </Button>
              <Button
                onClick={handleLoadBackupsList}
                disabled={isLoading}
                variant="secondary"
              >
                <Download className="w-4 h-4 mr-2" />
                {isLoading ? 'Chargement...' : 'Restaurer depuis OneDrive'}
              </Button>
            </div>

            {/* Info */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800">
                💡 <strong>POC Actif :</strong> Vos données sont sauvegardées
                dans le dossier "DataScope_Backups" de votre OneDrive personnel.
                Limite de taille : 4MB par backup.
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* Modal liste des backups */}
      <Modal
        isOpen={showBackupsModal}
        onClose={() => setShowBackupsModal(false)}
        maxWidth="3xl"
        title={
          <div>
            <h3 className="text-xl font-bold">Backups OneDrive</h3>
            <p className="text-txt-muted text-xs font-normal">
              {backups.length} backup(s) disponible(s)
            </p>
          </div>
        }
        icon={<Cloud className="w-6 h-6" />}
      >
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {backups.length === 0 ? (
            <div className="text-center py-8 text-txt-muted">
              <Cloud className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Aucun backup trouvé dans OneDrive</p>
            </div>
          ) : (
            backups.map((backup) => (
              <div
                key={backup.id}
                className="p-4 border-2 border-border-default rounded-lg hover:border-brand-400 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">
                      {backup.name}
                    </div>
                    <div className="text-xs text-txt-muted mt-1 space-y-0.5">
                      <div>Modifié : {formatDate(backup.lastModifiedDateTime)}</div>
                      <div>Taille : {formatFileSize(backup.size)}</div>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      onClick={() => handleRestoreBackup(backup)}
                      disabled={isLoading}
                      className="bg-brand-600 hover:bg-brand-700"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Restaurer
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteBackup(backup)}
                      disabled={isLoading}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>
    </>
  );
};
