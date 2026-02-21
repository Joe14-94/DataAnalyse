import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock sonner before importing notify
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

import { notify } from '../utils/notify';
import { toast } from 'sonner';

describe('notify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('notify.success calls toast.success with message', () => {
    notify.success('Import réussi !');
    expect(toast.success).toHaveBeenCalledWith('Import réussi !', { description: undefined });
  });

  it('notify.success passes description as second arg', () => {
    notify.success('Titre', 'Détail');
    expect(toast.success).toHaveBeenCalledWith('Titre', { description: 'Détail' });
  });

  it('notify.error calls toast.error', () => {
    notify.error('Fichier invalide');
    expect(toast.error).toHaveBeenCalledWith('Fichier invalide', { description: undefined });
  });

  it('notify.warning calls toast.warning', () => {
    notify.warning('Limite de 15 métriques atteinte');
    expect(toast.warning).toHaveBeenCalledWith('Limite de 15 métriques atteinte', { description: undefined });
  });

  it('notify.info calls toast.info', () => {
    notify.info('Rapport ajouté au dashboard');
    expect(toast.info).toHaveBeenCalledWith('Rapport ajouté au dashboard', { description: undefined });
  });

  it('each method returns the toast result', () => {
    (toast.success as ReturnType<typeof vi.fn>).mockReturnValue('toast-id');
    const result = notify.success('test');
    expect(result).toBe('toast-id');
  });
});
