/**
 * Modal de partage de Dashboard
 * Phase 1 - Partage collaboratif
 *
 * Permet de partager un dashboard via OneDrive avec options :
 * - Inclure les données sources ou pas
 * - Scope (organization ou anonymous)
 * - Description optionnelle
 */

import React, { useState } from 'react';
import {
  Share2,
  Copy,
  Check,
  AlertCircle,
  Info,
  Database,
  Layout,
  Users,
  Globe
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { o365Service } from '../../services/o365Service';
import type { ShareLinkScope, ShareMetadata, SharedDashboardContent } from '../../types/o365';
import type { DashboardWidget } from '../../types';

interface ShareDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  dashboardName: string;
  widgets: DashboardWidget[];
  datasets?: any[];
  batches?: any[];
  uiPrefs?: any;
}

export const ShareDashboardModal: React.FC<ShareDashboardModalProps> = ({
  isOpen,
  onClose,
  dashboardName,
  widgets,
  datasets,
  batches,
  uiPrefs
}) => {
  // État local
  const [includeData, setIncludeData] = useState(true);
  const [scope, setScope] = useState<ShareLinkScope>('organization');
  const [description, setDescription] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareMetadata, setShareMetadata] = useState<ShareMetadata | null>(null);
  const [copied, setCopied] = useState(false);

  // Calculer la taille estimée
  const estimatedSize = React.useMemo(() => {
    const content: SharedDashboardContent = {
      dashboardWidgets: widgets,
      datasets: includeData ? datasets : undefined,
      batches: includeData ? batches : undefined,
      uiPrefs
    };
    const jsonSize = JSON.stringify(content).length;
    if (jsonSize < 1024) return `${jsonSize} B`;
    if (jsonSize < 1024 * 1024) return `${(jsonSize / 1024).toFixed(1)} KB`;
    return `${(jsonSize / (1024 * 1024)).toFixed(1)} MB`;
  }, [widgets, datasets, batches, uiPrefs, includeData]);

  // Partager le dashboard
  const handleShare = async () => {
    setIsSharing(true);
    setError(null);

    try {
      // Vérifier l'authentification O365
      const isAuthenticated = await o365Service.isAuthenticated();
      if (!isAuthenticated) {
        throw new Error('Vous devez vous connecter à Microsoft 365 pour partager');
      }

      // Préparer le contenu
      const content: SharedDashboardContent = {
        dashboardWidgets: widgets,
        datasets: includeData ? datasets : undefined,
        batches: includeData ? batches : undefined,
        uiPrefs
      };

      // Partager via O365 Service
      const metadata = await o365Service.shareContent('dashboard', dashboardName, content, {
        includeData,
        scope,
        description: description || undefined,
        permission: 'read' // Phase 1 : lecture seule
      });

      setShareMetadata(metadata);
    } catch (err: any) {
      console.error('[ShareDashboardModal] Share failed:', err);
      setError(err.message || 'Échec du partage');
    } finally {
      setIsSharing(false);
    }
  };

  // Copier le lien
  const handleCopyLink = async () => {
    if (shareMetadata) {
      try {
        await navigator.clipboard.writeText(shareMetadata.shareLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Copy failed:', err);
      }
    }
  };

  // Fermer et réinitialiser
  const handleClose = () => {
    setShareMetadata(null);
    setError(null);
    setCopied(false);
    setDescription('');
    onClose();
  };

  // Si le partage est réussi, afficher le lien
  if (shareMetadata) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        maxWidth="2xl"
        icon={<Check className="w-6 h-6 text-emerald-600" />}
        title={
          <div>
            <h3 className="text-xl font-bold">Dashboard partagé avec succès !</h3>
            <p className="text-txt-muted text-xs font-normal">Le lien de partage a été créé</p>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Lien de partage */}
          <div>
            <label className="block text-sm font-medium text-txt-main mb-2">
              Lien de partage OneDrive
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareMetadata.shareLink}
                readOnly
                className="flex-1 px-3 py-2 border border-border-default rounded-lg bg-surface text-sm font-mono"
                onClick={(e) => e.currentTarget.select()}
              />
              <Button onClick={handleCopyLink} variant="secondary">
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2 text-emerald-600" />
                    Copié !
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copier
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Informations */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">Comment partager :</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Copiez ce lien et envoyez-le par email, Teams ou Slack</li>
                  <li>Les destinataires pourront télécharger le fichier depuis OneDrive</li>
                  <li>Ils devront l'importer dans DataScope (Settings → Importer des données)</li>
                  <li>Le dashboard sera en lecture seule (snapshot)</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Détails du partage */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-3 bg-surface rounded-lg border border-border-default">
              <div className="text-txt-muted text-xs mb-1">Nom du fichier</div>
              <div className="text-txt-main font-medium truncate">{shareMetadata.fileName}</div>
            </div>
            <div className="p-3 bg-surface rounded-lg border border-border-default">
              <div className="text-txt-muted text-xs mb-1">Portée</div>
              <div className="text-txt-main font-medium">
                {scope === 'organization' ? '🏢 Organisation' : '🌐 Public'}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button onClick={handleClose}>Fermer</Button>
          </div>
        </div>
      </Modal>
    );
  }

  // Formulaire de partage
  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      maxWidth="2xl"
      icon={<Share2 className="w-6 h-6" />}
      title={
        <div>
          <h3 className="text-xl font-bold">Partager "{dashboardName}"</h3>
          <p className="text-txt-muted text-xs font-normal">Créer un lien de partage OneDrive</p>
        </div>
      }
      footer={
        <div className="flex justify-between items-center w-full">
          <Button variant="ghost" onClick={handleClose} disabled={isSharing}>
            Annuler
          </Button>
          <Button
            onClick={handleShare}
            disabled={isSharing}
            className="bg-brand-600 hover:bg-brand-700"
          >
            {isSharing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Partage en cours...
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 mr-2" />
                Créer le lien de partage
              </>
            )}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Erreur */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-800">{error}</div>
          </div>
        )}

        {/* Options de contenu */}
        <div>
          <h4 className="text-sm font-medium text-txt-main mb-3">
            Que voulez-vous inclure dans le partage ?
          </h4>
          <div className="space-y-3">
            {/* Configuration (toujours inclus) */}
            <div className="flex items-start gap-3 p-3 bg-surface rounded-lg border border-border-default">
              <div className="p-2 bg-brand-50 rounded-md text-brand-600 mt-0.5">
                <Layout className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm text-txt-main">
                  ✓ Configuration du dashboard
                </div>
                <div className="text-xs text-txt-muted mt-0.5">
                  Widgets, mise en page, filtres ({widgets.length} widgets)
                </div>
              </div>
            </div>

            {/* Données sources (optionnel) */}
            <label className="flex items-start gap-3 p-3 bg-surface rounded-lg border-2 border-border-default hover:border-brand-400 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={includeData}
                onChange={(e) => setIncludeData(e.target.checked)}
                className="mt-1"
              />
              <div className="p-2 bg-emerald-50 rounded-md text-emerald-600">
                <Database className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm text-txt-main">Données sources (datasets)</div>
                <div className="text-xs text-txt-muted mt-0.5">
                  {includeData ? '✓ Inclus' : '✗ Non inclus'} - Les données brutes utilisées par les
                  widgets
                </div>
              </div>
            </label>
          </div>

          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
            💡 <strong>Taille estimée :</strong> {estimatedSize}
            {parseFloat(estimatedSize) > 4 && estimatedSize.includes('MB') && (
              <span className="ml-2 text-red-600">
                ⚠️ Attention : les fichiers &gt; 4MB peuvent échouer (limite POC)
              </span>
            )}
          </div>
        </div>

        {/* Description optionnelle */}
        <div>
          <label className="block text-sm font-medium text-txt-main mb-2">
            Description (optionnelle)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Dashboard des KPIs du Q1 2026, mis à jour le 01/02/2026"
            className="w-full px-3 py-2 border border-border-default rounded-lg resize-none"
            rows={2}
          />
        </div>

        {/* Portée du partage */}
        <div>
          <label className="block text-sm font-medium text-txt-main mb-3">Partager avec</label>
          <div className="space-y-2">
            <label className="flex items-start gap-3 p-3 bg-surface rounded-lg border-2 border-border-default hover:border-brand-400 cursor-pointer transition-colors">
              <input
                type="radio"
                name="scope"
                checked={scope === 'organization'}
                onChange={() => setScope('organization')}
                className="mt-1"
              />
              <div className="p-2 bg-blue-50 rounded-md text-blue-600">
                <Users className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm text-txt-main">
                  Mon organisation (recommandé)
                </div>
                <div className="text-xs text-txt-muted mt-0.5">
                  Seules les personnes de votre entreprise avec le lien peuvent accéder
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 bg-surface rounded-lg border-2 border-border-default hover:border-brand-400 cursor-pointer transition-colors">
              <input
                type="radio"
                name="scope"
                checked={scope === 'anonymous'}
                onChange={() => setScope('anonymous')}
                className="mt-1"
              />
              <div className="p-2 bg-amber-50 rounded-md text-amber-600">
                <Globe className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm text-txt-main">
                  Public (toute personne avec le lien)
                </div>
                <div className="text-xs text-txt-muted mt-0.5">
                  ⚠️ Le lien peut être partagé en dehors de votre organisation
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Info Phase 1 */}
        <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-purple-900">
              <p className="font-medium mb-1">Phase 1 - Partage en lecture seule :</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>
                  Le dashboard est partagé en tant que <strong>snapshot</strong> (lecture seule)
                </li>
                <li>Les destinataires peuvent consulter et dupliquer le dashboard</li>
                <li>Aucune synchronisation automatique (modifications futures non reflétées)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
