import { toast } from 'sonner';

/**
 * Système de notification standardisé pour l'application
 */
export const notify = {
  success: (message: string, description?: string) => {
    toast.success(message, { description });
  },
  error: (message: string, description?: string) => {
    toast.error(message, { description });
  },
  warning: (message: string, description?: string) => {
    toast.warning(message, { description });
  },
  info: (message: string, description?: string) => {
    toast.info(message, { description });
  },
  message: (message: string, description?: string) => {
    toast(message, { description });
  },
  promise: <T>(promise: Promise<T>, messages: { loading: string; success: string | ((data: T) => string); error: string | ((error: any) => string) }) => {
    return toast.promise(promise, messages);
  },
  dismiss: (id?: string | number) => {
    toast.dismiss(id);
  }
};
