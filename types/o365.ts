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
