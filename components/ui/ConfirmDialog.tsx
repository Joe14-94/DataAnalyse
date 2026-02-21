import React, { useEffect, useRef } from 'react';
import { Button } from './Button';
import { Modal } from './Modal';
import { Heading, Text } from './Typography';
import { AlertTriangle, Info, HelpCircle } from 'lucide-react';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
}

interface ConfirmDialogProps {
  isOpen: boolean;
  options: ConfirmOptions;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  options,
  onConfirm,
  onCancel
}) => {
  const {
    title = 'Confirmer',
    message,
    confirmLabel = 'Confirmer',
    cancelLabel = 'Annuler',
    variant = 'danger'
  } = options;

  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen && confirmButtonRef.current) {
      setTimeout(() => confirmButtonRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const getIcon = () => {
    switch (variant) {
      case 'danger':
        return <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />;
      case 'warning':
        return <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />;
      case 'info':
        return <Info className="w-12 h-12 text-blue-500 mb-4" />;
      default:
        return <HelpCircle className="w-12 h-12 text-brand-500 mb-4" />;
    }
  };

  const getVariantButton = () => {
    switch (variant) {
      case 'danger':
        return 'danger';
      case 'warning':
        return 'warning';
      case 'info':
        return 'primary';
      default:
        return 'primary';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onCancel} maxWidth="sm">
      <div className="flex flex-col items-center text-center p-2">
        {getIcon()}

        <Heading level={3} className="mb-2">
          {title}
        </Heading>

        <Text variant="secondary" className="mb-8 px-4">
          {message}
        </Text>

        <div className="flex gap-3 w-full">
          <Button
            variant="ghost"
            onClick={onCancel}
            className="flex-1"
          >
            {cancelLabel}
          </Button>
          <Button
            ref={confirmButtonRef}
            variant={getVariantButton() as any}
            onClick={onConfirm}
            className="flex-1"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
