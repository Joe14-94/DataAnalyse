import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle, HelpCircle, Info } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

/**
 * Dialogue de confirmation standardisé
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  variant = 'warning',
  isLoading = false
}) => {
  const Icon = variant === 'danger' ? AlertTriangle : variant === 'warning' ? HelpCircle : Info;
  const iconColor = variant === 'danger' ? 'text-red-500' : variant === 'warning' ? 'text-amber-500' : 'text-blue-500';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      icon={<Icon className={`w-5 h-5 ${iconColor}`} />}
      maxWidth="md"
      footer={
        <div className="flex gap-2 justify-end w-full">
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={() => {
              onConfirm();
              onClose();
            }}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="py-2">
        <p className="text-txt-secondary leading-relaxed">{message}</p>
      </div>
    </Modal>
  );
};
