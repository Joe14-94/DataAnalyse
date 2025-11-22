import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '', title }) => {
  return (
    <div className={`bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden ${className}`}>
      {title && (
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};