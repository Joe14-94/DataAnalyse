
import React, { useEffect } from 'react';
import { Check, Info, AlertTriangle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type?: 'success' | 'info' | 'error';
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'success', onClose, duration = 3000 }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const icons = {
    success: <Check className="w-5 h-5 text-success-text" />,
    info: <Info className="w-5 h-5 text-info-text" />,
    error: <AlertTriangle className="w-5 h-5 text-danger-text" />,
  };

  const colors = {
    success: 'bg-success-bg border-success-border',
    info: 'bg-info-bg border-info-border',
    error: 'bg-danger-bg border-danger-border',
  };

  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg animate-in slide-in-from-top-4 duration-300 ${colors[type]}`}>
      {icons[type]}
      <span className="text-sm font-medium text-txt-main">{message}</span>
      <button onClick={onClose} className="ml-2 text-txt-muted hover:text-txt-main transition-colors" aria-label="Fermer">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
