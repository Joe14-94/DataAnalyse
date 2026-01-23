
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string | React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className = '', title, icon, action, noPadding = false }) => {
  return (
    <div className={`bg-surface rounded-lg border border-border-default shadow-card ${className}`}>
      {(title || action || icon) && (
        <div className="px-6 py-4 border-b border-border-default flex justify-between items-center bg-slate-50/30">
          <div className="flex items-center gap-2">
            {icon && <div className="shrink-0">{icon}</div>}
            {typeof title === 'string' ? (
              <h3 className="text-base font-bold text-txt-main">{title}</h3>
            ) : (
              title
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-6'}>
        {children}
      </div>
    </div>
  );
};
