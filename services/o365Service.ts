/**
 * Service d'intégration Microsoft 365 (OneDrive / SharePoint)
 *
 * POC - Proof of Concept
 *
 * Fonctionnalités:
 * - Authentification via MSAL (Microsoft Authentication Library)
 * - Upload/Download de backups vers OneDrive
 * - Liste des backups disponibles
 * - Génération de liens de partage
 *
 * Sécurité:
 * - OAuth 2.0 avec PKCE (Proof Key for Code Exchange)
 * - Tokens stockés de manière sécurisée par MSAL
 * - Scopes minimaux requis
 */

import {
  PublicClientApplication,
  AccountInfo,
  AuthenticationResult,
  InteractionRequiredAuthError,
  BrowserCacheLocation
} from '@azure/msal-browser';
import { Client } from '@microsoft/microsoft-graph-client';
import type { DriveItem } from '@microsoft/microsoft-graph-types';
import type { AppState, SharePackage, ShareableContentType, ShareLinkScope, ShareMetadata, SharePermission } from '../types';

// Configuration MSAL
// IMPORTANT: Le Client ID est configuré UNE FOIS par le DÉVELOPPEUR DataScope
// Pas par chaque utilisateur final !
//
// En développement : Configurer dans .env.local (fichier non commité)
// En production : Variable d'environnement au moment du build (Vite)
//
// Les utilisateurs finaux n'ont RIEN à configurer. Ils cliquent juste
// "Se connecter à Microsoft 365" et acceptent les permissions OAuth.
const getClientId = (): string => {
  // @ts-ignore - Vite env types
  return import.meta.env?.VITE_O365_CLIENT_ID || 'YOUR_CLIENT_ID_HERE';
};

const MSAL_CONFIG = {
  auth: {
    // Client ID UNIQUE de l'application DataScope
    // Créé UNE FOIS par le développeur dans Azure AD App Registration
    // Partagé par TOUS les utilisateurs (comme Google OAuth Client ID)
    clientId: getClientId(),

    // Authority "common" = Supporte tous les types de comptes Microsoft
    // - Comptes organisationnels (Azure AD)
    // - Comptes Microsoft personnels (Outlook.com, Hotmail, etc.)
    authority: 'https://login.microsoftonline.com/common',

    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: BrowserCacheLocation.LocalStorage,
    storeAuthStateInCookie: false, // Set to true for IE11/Edge
  },
};

// Permissions Microsoft Graph nécessaires
// Chaque utilisateur accepte ces permissions individuellement (popup OAuth)
const LOGIN_SCOPES = [
  'User.Read',           // Lire le profil utilisateur (nom, email)
  'Files.ReadWrite',     // Accès OneDrive en lecture/écriture (UNIQUEMENT du user)
];

// Nom du dossier dans OneDrive pour stocker les backups
const BACKUP_FOLDER = 'DataScope_Backups';

/**
 * Types personnalisés
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

/**
 * Service principal O365
 */
class O365Service {
  private msalInstance: PublicClientApplication | null = null;
  private graphClient: Client | null = null;
  private currentAccount: AccountInfo | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialise l'instance MSAL (appelé automatiquement lors du premier usage)
   */
  private async initialize(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        this.msalInstance = new PublicClientApplication(MSAL_CONFIG);
        await this.msalInstance.initialize();

        // Vérifier si un utilisateur est déjà connecté
        const accounts = this.msalInstance.getAllAccounts();
        if (accounts.length > 0) {
          this.currentAccount = accounts[0];
          await this.initializeGraphClient();
        }
      } catch (error) {
        console.error('[O365Service] Initialization failed:', error);
        throw new Error('Impossible d\'initialiser le service Microsoft 365');
      }
    })();

    return this.initPromise;
  }

  /**
   * Initialise le client Microsoft Graph
   */
  private async initializeGraphClient(): Promise<void> {
    if (!this.msalInstance || !this.currentAccount) {
      throw new Error('Non authentifié');
    }

    this.graphClient = Client.init({
      authProvider: async (done) => {
        try {
          const token = await this.getAccessToken();
          done(null, token);
        } catch (error) {
          done(error as Error, null);
        }
      },
    });
  }

  /**
   * Obtient un access token (avec refresh automatique si expiré)
   */
  private async getAccessToken(): Promise<string> {
    if (!this.msalInstance || !this.currentAccount) {
      throw new Error('Non authentifié');
    }

    try {
      // Essayer d'obtenir le token silencieusement (depuis le cache)
      const response = await this.msalInstance.acquireTokenSilent({
        scopes: LOGIN_SCOPES,
        account: this.currentAccount,
      });
      return response.accessToken;
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) {
        // Si le token est expiré, demander une nouvelle authentification
        const response = await this.msalInstance.acquireTokenPopup({
          scopes: LOGIN_SCOPES,
        });
        return response.accessToken;
      }
      throw error;
    }
  }

  /**
   * Vérifie si l'utilisateur est authentifié
   */
  async isAuthenticated(): Promise<boolean> {
    await this.initialize();
    return this.currentAccount !== null;
  }

  /**
   * Récupère les informations de l'utilisateur connecté
   */
  async getCurrentUser(): Promise<O365User | null> {
    if (!this.currentAccount) {
      return null;
    }

    return {
      displayName: this.currentAccount.name || 'Utilisateur',
      email: this.currentAccount.username,
      id: this.currentAccount.localAccountId,
    };
  }

  /**
   * Connexion interactive via popup
   */
  async login(): Promise<O365User> {
    await this.initialize();

    if (!this.msalInstance) {
      throw new Error('Service non initialisé');
    }

    try {
      const response: AuthenticationResult = await this.msalInstance.loginPopup({
        scopes: LOGIN_SCOPES,
        prompt: 'select_account',
      });

      this.currentAccount = response.account;
      await this.initializeGraphClient();

      return {
        displayName: response.account.name || 'Utilisateur',
        email: response.account.username,
        id: response.account.localAccountId,
      };
    } catch (error) {
      console.error('[O365Service] Login failed:', error);
      throw new Error('Échec de la connexion Microsoft 365');
    }
  }

  /**
   * Déconnexion
   */
  async logout(): Promise<void> {
    if (!this.msalInstance || !this.currentAccount) {
      return;
    }

    try {
      await this.msalInstance.logoutPopup({
        account: this.currentAccount,
      });
      this.currentAccount = null;
      this.graphClient = null;
    } catch (error) {
      console.error('[O365Service] Logout failed:', error);
      throw new Error('Échec de la déconnexion');
    }
  }

  /**
   * Crée le dossier de backup dans OneDrive s'il n'existe pas
   */
  private async ensureBackupFolder(): Promise<void> {
    if (!this.graphClient) {
      throw new Error('Non authentifié');
    }

    try {
      // Vérifier si le dossier existe
      await this.graphClient
        .api(`/me/drive/root:/${BACKUP_FOLDER}`)
        .get();
    } catch (error: any) {
      if (error.statusCode === 404) {
        // Le dossier n'existe pas, le créer
        await this.graphClient
          .api('/me/drive/root/children')
          .post({
            name: BACKUP_FOLDER,
            folder: {},
            '@microsoft.graph.conflictBehavior': 'rename',
          });
      } else {
        throw error;
      }
    }
  }

  /**
   * Sauvegarde un backup dans OneDrive
   */
  async saveBackupToOneDrive(
    filename: string,
    data: Partial<AppState>
  ): Promise<void> {
    if (!this.graphClient) {
      throw new Error('Non authentifié');
    }

    try {
      await this.ensureBackupFolder();

      // Convertir les données en JSON
      const jsonContent = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });

      // Ajouter timestamp si pas déjà présent dans le nom
      const timestampedFilename = filename.includes('_')
        ? filename
        : `${filename.replace('.json', '')}_${new Date().toISOString().split('T')[0]}.json`;

      // Upload vers OneDrive
      // Pour les fichiers < 4MB, utiliser PUT simple
      if (blob.size < 4 * 1024 * 1024) {
        await this.graphClient
          .api(`/me/drive/root:/${BACKUP_FOLDER}/${timestampedFilename}:/content`)
          .put(blob);
      } else {
        // Pour les gros fichiers, utiliser upload session (non implémenté dans POC)
        throw new Error('Fichier trop volumineux (max 4MB pour le POC)');
      }
    } catch (error) {
      console.error('[O365Service] Save backup failed:', error);
      throw new Error('Échec de la sauvegarde sur OneDrive');
    }
  }

  /**
   * Liste les backups disponibles dans OneDrive
   */
  async listBackups(): Promise<BackupMetadata[]> {
    if (!this.graphClient) {
      throw new Error('Non authentifié');
    }

    try {
      await this.ensureBackupFolder();

      const response = await this.graphClient
        .api(`/me/drive/root:/${BACKUP_FOLDER}:/children`)
        .filter("endsWith(name, '.json')")
        .orderby('lastModifiedDateTime desc')
        .top(50) // Limiter à 50 backups récents
        .get();

      const items: DriveItem[] = response.value || [];

      return items.map((item) => ({
        id: item.id!,
        name: item.name!,
        size: item.size!,
        createdDateTime: item.createdDateTime!,
        lastModifiedDateTime: item.lastModifiedDateTime!,
        downloadUrl: (item as any)['@microsoft.graph.downloadUrl'],
      }));
    } catch (error) {
      console.error('[O365Service] List backups failed:', error);
      throw new Error('Impossible de lister les backups OneDrive');
    }
  }

  /**
   * Télécharge un backup depuis OneDrive
   */
  async loadBackupFromOneDrive(fileId: string): Promise<Partial<AppState>> {
    if (!this.graphClient) {
      throw new Error('Non authentifié');
    }

    try {
      // Obtenir le contenu du fichier
      const response = await this.graphClient
        .api(`/me/drive/items/${fileId}/content`)
        .get();

      // Le contenu est retourné directement comme objet JSON
      return response as Partial<AppState>;
    } catch (error) {
      console.error('[O365Service] Load backup failed:', error);
      throw new Error('Échec du chargement du backup depuis OneDrive');
    }
  }

  /**
   * Supprime un backup de OneDrive
   */
  async deleteBackup(fileId: string): Promise<void> {
    if (!this.graphClient) {
      throw new Error('Non authentifié');
    }

    try {
      await this.graphClient
        .api(`/me/drive/items/${fileId}`)
        .delete();
    } catch (error) {
      console.error('[O365Service] Delete backup failed:', error);
      throw new Error('Échec de la suppression du backup');
    }
  }

  /**
   * Crée un lien de partage pour un backup (lecture seule)
   */
  async createShareLink(fileId: string, scope: 'anonymous' | 'organization' = 'organization'): Promise<string> {
    if (!this.graphClient) {
      throw new Error('Non authentifié');
    }

    try {
      const response = await this.graphClient
        .api(`/me/drive/items/${fileId}/createLink`)
        .post({
          type: 'view', // Lecture seule
          scope: scope,
        });

      return response.link.webUrl;
    } catch (error) {
      console.error('[O365Service] Create share link failed:', error);
      throw new Error('Échec de la création du lien de partage');
    }
  }

  /**
   * Crée et partage du contenu (Dashboard, Analyse, etc.)
   * Phase 1 - Partage collaboratif
   */
  async shareContent<T = any>(
    type: ShareableContentType,
    name: string,
    content: T,
    options: {
      includeData?: boolean;
      scope?: ShareLinkScope;
      description?: string;
      permission?: SharePermission;
    } = {}
  ): Promise<ShareMetadata> {
    if (!this.graphClient) {
      throw new Error('Non authentifié');
    }

    const currentUser = await this.getCurrentUser();
    if (!currentUser) {
      throw new Error('Utilisateur non trouvé');
    }

    try {
      // 1. Créer le package de partage
      const sharePackage: SharePackage<T> = {
        type,
        name,
        description: options.description,
        sharedBy: currentUser.email,
        sharedAt: new Date().toISOString(),
        version: '2026-01-31-01', // Version de l'app
        content,
        includeData: options.includeData ?? true,
        isSnapshot: true, // Phase 1 : lecture seule
      };

      // 2. Générer le nom du fichier
      const timestamp = new Date().toISOString().split('T')[0];
      const sanitizedName = name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const fileName = `shared_${type}_${sanitizedName}_${timestamp}.json`;

      // 3. Upload vers OneDrive (dossier DataScope_Backups)
      await this.ensureBackupFolder();

      const jsonContent = JSON.stringify(sharePackage, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });

      const uploadResponse = await this.graphClient
        .api(`/me/drive/root:/${BACKUP_FOLDER}/${fileName}:/content`)
        .put(blob);

      const fileId = uploadResponse.id;

      // 4. Créer le lien de partage
      const shareLink = await this.createShareLink(
        fileId,
        options.scope ?? 'organization'
      );

      // 5. Retourner les métadonnées
      const shareMetadata: ShareMetadata = {
        shareId: `share_${Date.now()}`,
        contentType: type,
        contentName: name,
        fileId,
        fileName,
        shareLink,
        scope: options.scope ?? 'organization',
        permission: options.permission ?? 'read',
        createdAt: new Date().toISOString(),
      };

      return shareMetadata;
    } catch (error) {
      console.error('[O365Service] Share content failed:', error);
      throw new Error('Échec du partage du contenu');
    }
  }

  /**
   * Charge du contenu partagé depuis un fichier OneDrive
   * Supporte à la fois fileId et downloadUrl
   */
  async loadSharedContent<T = any>(
    fileIdOrUrl: string
  ): Promise<SharePackage<T>> {
    if (!this.graphClient) {
      throw new Error('Non authentifié');
    }

    try {
      let content: string;

      // Vérifier si c'est une URL de téléchargement OneDrive
      if (fileIdOrUrl.startsWith('http')) {
        // Télécharger depuis URL
        const response = await fetch(fileIdOrUrl);
        if (!response.ok) {
          throw new Error('Impossible de télécharger le fichier');
        }
        content = await response.text();
      } else {
        // Utiliser l'API Graph avec fileId
        const response = await this.graphClient
          .api(`/me/drive/items/${fileIdOrUrl}/content`)
          .get();
        content = typeof response === 'string' ? response : JSON.stringify(response);
      }

      // Parser le JSON
      const sharePackage: SharePackage<T> = JSON.parse(content);

      // Valider que c'est bien un SharePackage
      if (!sharePackage.type || !sharePackage.sharedBy || !sharePackage.content) {
        throw new Error('Format de fichier invalide');
      }

      return sharePackage;
    } catch (error) {
      console.error('[O365Service] Load shared content failed:', error);
      throw new Error('Échec du chargement du contenu partagé');
    }
  }

  /**
   * Vérifie si un fichier JSON est un SharePackage
   */
  async isSharePackage(jsonContent: string): Promise<boolean> {
    try {
      const parsed = JSON.parse(jsonContent);
      return (
        parsed.type &&
        parsed.sharedBy &&
        parsed.sharedAt &&
        parsed.content !== undefined &&
        parsed.isSnapshot !== undefined
      );
    } catch {
      return false;
    }
  }

  /**
   * Vérifie si la configuration est valide
   */
  isConfigured(): boolean {
    return MSAL_CONFIG.auth.clientId !== 'YOUR_CLIENT_ID_HERE' &&
           MSAL_CONFIG.auth.clientId.length > 0;
  }
}

// Export singleton
export const o365Service = new O365Service();
export default o365Service;
