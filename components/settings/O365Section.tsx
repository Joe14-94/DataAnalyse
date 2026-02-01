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
  RefreshCw,
  Download,
  Upload,
  Link2,
  Trash2,
  CheckCircle,
  AlertCircle,
  Info,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { o365Service } from '../../services/o365Service';
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
  // État local
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<O365User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backups, setBackups] = useState<BackupMetadata[]>([]);
  const [showBackupsModal, setShowBackupsModal] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);

  // Configuration Client ID
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [clientIdInput, setClientIdInput] = useState('');
  const [savedClientId, setSavedClientId] = useState<string | null>(null);

  // Vérifier l'état d'authentification au montage
  useEffect(() => {
    checkAuthStatus();
    loadSavedClientId();
  }, []);

  // Charger le Client ID sauvegardé depuis localStorage
  const loadSavedClientId = () => {
    try {
      const saved = localStorage.getItem('datascope_o365_client_id');
      if (saved) {
        setSavedClientId(saved);
        setIsConfigured(true);
        setClientIdInput(saved);
      } else {
        setIsConfigured(false);
      }
    } catch (err) {
      console.error('[O365Section] Load client ID failed:', err);
    }
  };

  // Sauvegarder le Client ID dans localStorage et recharger MSAL
  const handleSaveClientId = () => {
    if (!clientIdInput || clientIdInput.trim().length === 0) {
      setError('Veuillez entrer un Client ID valide');
      return;
    }

    try {
      localStorage.setItem('datascope_o365_client_id', clientIdInput.trim());
      setSavedClientId(clientIdInput.trim());
      setIsConfigured(true);
      setShowConfigModal(false);
      setError(null);

      alert('✅ Client ID sauvegardé ! Rechargez la page pour appliquer les changements.');
      // Note: Il faudrait recharger MSAL ici, mais pour simplifier on demande un reload
      window.location.reload();
    } catch (err) {
      console.error('[O365Section] Save client ID failed:', err);
      setError('Échec de la sauvegarde du Client ID');
    }
  };

  // Supprimer la configuration O365
  const handleRemoveConfig = () => {
    if (!confirm('Supprimer la configuration Microsoft 365 ? Vous devrez entrer à nouveau le Client ID.')) {
      return;
    }

    try {
      localStorage.removeItem('datascope_o365_client_id');
      setSavedClientId(null);
      setIsConfigured(false);
      setIsAuthenticated(false);
      setCurrentUser(null);
      setClientIdInput('');

      alert('✅ Configuration supprimée');
    } catch (err) {
      console.error('[O365Section] Remove config failed:', err);
      setError('Échec de la suppression de la configuration');
    }
  };

  const checkAuthStatus = async () => {
    try {
      // Vérifier d'abord si le Client ID est configuré
      if (!savedClientId) {
        setIsConfigured(false);
        return;
      }

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
      console.error('[O365Section] Check auth failed:', err);
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
      console.error('[O365Section] Login failed:', err);
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
      console.error('[O365Section] Logout failed:', err);
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

      alert('✅ Sauvegarde OneDrive réussie !');
    } catch (err: any) {
      setError(err.message || 'Échec de la sauvegarde');
      console.error('[O365Section] Save failed:', err);
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
      console.error('[O365Section] List backups failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Restaurer un backup
  const handleRestoreBackup = async (backup: BackupMetadata) => {
    if (
      !confirm(
        `Voulez-vous vraiment restaurer le backup "${backup.name}" ?\n\nCela écrasera vos données actuelles.`
      )
    ) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await o365Service.loadBackupFromOneDrive(backup.id);
      onRestoreBackup(data);
      setShowBackupsModal(false);
      alert('✅ Restauration réussie ! La page va se recharger.');
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'Échec de la restauration');
      console.error('[O365Section] Restore failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Supprimer un backup
  const handleDeleteBackup = async (backup: BackupMetadata) => {
    if (!confirm(`Supprimer définitivement "${backup.name}" de OneDrive ?`)) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await o365Service.deleteBackup(backup.id);
      // Rafraîchir la liste
      const updatedBackups = await o365Service.listBackups();
      setBackups(updatedBackups);
      alert('✅ Backup supprimé');
    } catch (err: any) {
      setError(err.message || 'Échec de la suppression');
      console.error('[O365Section] Delete failed:', err);
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
      <>
        <Card className="p-6 border-2 border-dashed border-border-default">
          <div className="flex items-start gap-3">
            <Info className="w-6 h-6 text-brand-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-bold mb-2">
                Intégration Microsoft 365 (POC)
              </h3>
              <p className="text-sm text-txt-secondary mb-4">
                Cette fonctionnalité nécessite la configuration du Client ID Azure AD de votre entreprise.
              </p>
              <div className="bg-surface p-4 rounded-lg text-xs mb-4">
                <p className="mb-2 font-medium">Pour activer cette fonctionnalité :</p>
                <ol className="list-decimal list-inside space-y-1 text-txt-muted">
                  <li>Demandez à votre service IT le <strong>Client ID</strong> de l'App Registration Azure AD</li>
                  <li>Cliquez sur "Configurer" ci-dessous et entrez le Client ID</li>
                  <li>Connectez-vous avec votre compte Microsoft 365</li>
                </ol>
              </div>
              <Button
                onClick={() => setShowConfigModal(true)}
                className="bg-brand-600 hover:bg-brand-700"
              >
                <Cloud className="w-4 h-4 mr-2" />
                Configurer Client ID
              </Button>
            </div>
          </div>
        </Card>

        {/* Modal de configuration */}
        <Modal
          isOpen={showConfigModal}
          onClose={() => {
            setShowConfigModal(false);
            setError(null);
          }}
          maxWidth="2xl"
          title={
            <div>
              <h3 className="text-xl font-bold">Configuration Microsoft 365</h3>
              <p className="text-txt-muted text-xs font-normal">
                Entrez le Client ID Azure AD de votre entreprise
              </p>
            </div>
          }
          icon={<Cloud className="w-6 h-6" />}
        >
          <div className="space-y-4">
            {/* Erreur */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-800">{error}</div>
              </div>
            )}

            {/* Instructions */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-medium mb-2">Qu'est-ce que le Client ID ?</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>C'est l'identifiant de l'App Registration Azure AD de votre entreprise</li>
                    <li>Format : GUID (ex: abc12345-1234-1234-1234-1234567890ab)</li>
                    <li>Demandez-le à votre service IT si vous ne l'avez pas</li>
                    <li>Il sera stocké localement dans votre navigateur</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Champ de saisie */}
            <div>
              <label className="block text-sm font-medium text-txt-main mb-2">
                Client ID Azure AD
              </label>
              <input
                type="text"
                value={clientIdInput}
                onChange={(e) => setClientIdInput(e.target.value)}
                placeholder="abc12345-1234-1234-1234-1234567890ab"
                className="w-full px-3 py-2 border border-border-default rounded-lg font-mono text-sm"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowConfigModal(false);
                  setError(null);
                }}
              >
                Annuler
              </Button>
              <Button
                onClick={handleSaveClientId}
                className="bg-brand-600 hover:bg-brand-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Enregistrer
              </Button>
            </div>
          </div>
        </Modal>
      </>
    );
  }

  return (
    <>
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

        {/* Configuration Client ID */}
        {isConfigured && savedClientId && (
          <div className="mb-4 p-3 bg-surface border border-border-default rounded-lg">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-txt-muted mb-1">Client ID configuré</div>
                <div className="text-sm font-mono text-txt-main truncate">{savedClientId}</div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setClientIdInput(savedClientId);
                    setShowConfigModal(true);
                  }}
                  title="Modifier le Client ID"
                >
                  Modifier
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveConfig}
                  className="text-red-600 hover:bg-red-50"
                  title="Supprimer la configuration"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Authentifié */}
        {isAuthenticated && currentUser && (
          <div className="space-y-4">
            {/* Info utilisateur */}
            <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <div>
                  <div className="text-sm font-semibold text-emerald-900">
                    {currentUser.displayName}
                  </div>
                  <div className="text-xs text-emerald-700">
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
                      className="bg-emerald-600 hover:bg-emerald-700"
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

      {/* Modal de configuration Client ID (pour utilisateurs authentifiés) */}
      {isConfigured && (
        <Modal
          isOpen={showConfigModal}
          onClose={() => {
            setShowConfigModal(false);
            setError(null);
          }}
          maxWidth="2xl"
          title={
            <div>
              <h3 className="text-xl font-bold">Modifier le Client ID</h3>
              <p className="text-txt-muted text-xs font-normal">
                Modifiez le Client ID Azure AD de votre entreprise
              </p>
            </div>
          }
          icon={<Cloud className="w-6 h-6" />}
        >
          <div className="space-y-4">
            {/* Erreur */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-800">{error}</div>
              </div>
            )}

            {/* Avertissement */}
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-900">
                  <p className="font-medium mb-2">⚠️ Attention</p>
                  <p className="text-xs">
                    Modifier le Client ID vous déconnectera de Microsoft 365 et nécessitera
                    une nouvelle authentification. Assurez-vous d'avoir le bon Client ID
                    avant de continuer.
                  </p>
                </div>
              </div>
            </div>

            {/* Champ de saisie */}
            <div>
              <label className="block text-sm font-medium text-txt-main mb-2">
                Nouveau Client ID Azure AD
              </label>
              <input
                type="text"
                value={clientIdInput}
                onChange={(e) => setClientIdInput(e.target.value)}
                placeholder="abc12345-1234-1234-1234-1234567890ab"
                className="w-full px-3 py-2 border border-border-default rounded-lg font-mono text-sm"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowConfigModal(false);
                  setError(null);
                }}
              >
                Annuler
              </Button>
              <Button
                onClick={handleSaveClientId}
                className="bg-brand-600 hover:bg-brand-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Enregistrer et recharger
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};
