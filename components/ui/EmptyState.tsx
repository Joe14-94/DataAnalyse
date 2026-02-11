
import React from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void; };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon, title, description, action, className = ''
}) => (
  <div className={`flex flex-col items-center justify-center h-full p-ds-8 text-center animate-in fade-in duration-500 ${className}`}>
    {icon && (
      <div className="mb-ds-4 text-txt-muted opacity-20">
        {React.isValidElement(icon)
          ? React.cloneElement(icon as React.ReactElement<{ size?: number }>, { size: 48 })
          : icon}
      </div>
    )}
    <h3 className="text-lg font-bold text-txt-main mb-ds-1">{title}</h3>
    {description && <p className="text-sm text-txt-secondary max-w-xs mb-ds-6">{description}</p>}
    {action && <Button onClick={action.onClick}>{action.label}</Button>}
  </div>
);
