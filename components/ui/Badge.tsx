
import React from 'react';

type BadgeVariant = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral', className = '', icon }) => {
  const styles = {
    neutral: "bg-canvas text-txt-secondary border-border-default",
    brand: "bg-brand-50 text-brand-700 border-brand-200",
    success: "bg-success-bg text-success-text border-success-border",
    warning: "bg-warning-bg text-warning-text border-warning-border",
    danger: "bg-danger-bg text-danger-text border-danger-border",
    info: "bg-info-bg text-info-text border-info-border",
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[variant]} ${className}`}>
      {icon && <span className="mr-1.5 -ml-0.5">{icon}</span>}
      {children}
    </span>
  );
};
