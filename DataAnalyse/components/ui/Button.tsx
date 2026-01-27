
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  icon,
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none select-none";
  
  const variants = {
    primary: "bg-brand-600 text-white hover:bg-brand-700 focus:ring-brand-500 shadow-sm",
    secondary: "bg-white text-txt-main border border-border-default hover:bg-slate-50 focus:ring-slate-400 shadow-sm",
    danger: "bg-danger-bg text-danger-text border border-danger-border hover:bg-red-100 focus:ring-red-500",
    outline: "border border-brand-200 text-brand-600 bg-transparent hover:bg-brand-50 focus:ring-brand-500",
    ghost: "bg-transparent text-txt-secondary hover:bg-slate-100 hover:text-txt-main focus:ring-slate-400"
  };

  const sizes = {
    xs: "h-7 px-2 text-xs",
    sm: "h-9 px-3 text-sm",
    md: "h-10 px-4 py-2 text-sm",
    lg: "h-12 px-6 text-base"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {icon && <span className={`mr-2 ${children ? '' : '-mr-1'}`}>{icon}</span>}
      {children}
    </button>
  );
};
