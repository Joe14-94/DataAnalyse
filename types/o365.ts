/**
 * Types pour l'intégration Microsoft 365 (OneDrive / SharePoint)
 * POC - Proof of Concept
 */

export interface O365User {
  displayName: string;
  email: string;
  id: string;
}

export interface BackupMetadata {
  id: string;
  name: string;
  size: number;
  createdDateTime: string;
  lastModifiedDateTime: string;
  downloadUrl?: string;
}

export interface O365ServiceState {
  isAuthenticated: boolean;
  user: O365User | null;
  isLoading: boolean;
  error: string | null;
}

export type ShareLinkScope = 'anonymous' | 'organization';

export interface O365Config {
  clientId: string;
  enabled: boolean;
}

/**
 * Préférences utilisateur pour l'intégration O365
 */
export interface O365Preferences {
  autoSyncEnabled: boolean;
  autoSyncIntervalMinutes: number;
  defaultShareScope: ShareLinkScope;
  lastSyncTimestamp: string | null;
}

/**
 * Types de contenu partageable
 */
export type ShareableContentType = 'dashboard' | 'analysis' | 'dataset' | 'workspace';

/**
 * Permissions de partage
 */
export type SharePermission = 'read' | 'write';

/**
 * Package de partage générique
 */
export interface SharePackage<T = any> {
  // Métadonnées du partage
  type: ShareableContentType;
  name: string;
  description?: string;
  sharedBy: string; // Email de l'utilisateur qui partage
  sharedAt: string; // ISO 8601 timestamp
  version: string; // Version de l'app

  // Contenu partagé
  content: T;

  // Options de partage
  includeData: boolean; // Si false, seulement la configuration
  isSnapshot: boolean; // true = lecture seule, false = connecté
}

/**
 * Contenu d'un dashboard partagé
 */
export interface SharedDashboardContent {
  dashboardWidgets: any[]; // Les widgets du dashboard
  datasets?: any[]; // Optionnel : datasets sources si includeData = true
  batches?: any[]; // Optionnel : données si includeData = true
  uiPrefs?: any; // Préférences UI pour affichage correct
}

/**
 * Contenu d'une analyse partagée
 */
export interface SharedAnalysisContent {
  savedAnalysis: any; // L'analyse sauvegardée
  dataset?: any; // Optionnel : dataset source si includeData = true
  batches?: any[]; // Optionnel : données si includeData = true
}

/**
 * Métadonnées d'un partage créé
 */
export interface ShareMetadata {
  shareId: string;
  contentType: ShareableContentType;
  contentName: string;
  fileId: string; // ID du fichier OneDrive
  fileName: string;
  shareLink: string; // URL du lien de partage
  scope: ShareLinkScope;
  permission: SharePermission;
  createdAt: string;
  expiresAt?: string;
}

/**
 * Historique des partages de l'utilisateur
 */
export interface ShareHistory {
  shares: ShareMetadata[];
}
