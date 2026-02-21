import { toast } from 'sonner';

/**
 * Centralised notification helpers — replaces native alert() with Sonner toasts.
 * Usage:
 *   notify.success('Import réussi !')
 *   notify.error('Fichier invalide')
 *   notify.warning('Limite atteinte')
 *   notify.info('Rapport ajouté au dashboard')
 */
export const notify = {
  success: (message: string, description?: string) =>
    toast.success(message, { description }),

  error: (message: string, description?: string) =>
    toast.error(message, { description }),

  warning: (message: string, description?: string) =>
    toast.warning(message, { description }),

  info: (message: string, description?: string) =>
    toast.info(message, { description }),
};
