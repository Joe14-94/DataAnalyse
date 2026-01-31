
import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string | React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full';
  icon?: React.ReactNode;
  closeLabel?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = '2xl',
  icon,
  closeLabel = 'Fermer'
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
    full: 'max-w-full'
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={typeof title === 'string' ? 'modal-title' : undefined}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className={`relative bg-surface rounded-lg shadow-xl w-full ${maxWidthClasses[maxWidth]} max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-border-default`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-default bg-canvas/30 shrink-0">
          <div className="flex items-center gap-3">
            {icon && <div className="text-brand-600">{icon}</div>}
            {title && (
              typeof title === 'string' ? (
                <h3 id="modal-title" className="font-bold text-lg text-txt-main">{title}</h3>
              ) : title
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-canvas rounded-lg transition-colors text-txt-secondary hover:text-txt-main"
            title={closeLabel}
            aria-label={closeLabel}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 custom-scrollbar text-txt-main">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 bg-canvas/30 border-t border-border-default flex justify-end items-center gap-3 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
