import React from 'react';

// --- LABEL ---
export const Label: React.FC<{
  children: React.ReactNode;
  className?: string;
  htmlFor?: string;
}> = ({ children, className = '', htmlFor }) => (
  <label
    htmlFor={htmlFor}
    className={`block text-xs font-bold text-txt-secondary uppercase tracking-wider mb-1.5 ${className}`}
  >
    {children}
  </label>
);

// --- INPUT ---
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`block w-full rounded-md border text-sm transition-shadow
        ${
          error
            ? 'border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500'
            : 'border-border-default text-txt-main placeholder-txt-muted focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-white'
        }
        shadow-sm py-2 px-3 focus:outline-none ${className}`}
        {...props}
      />
    );
  }
);

// --- SELECT ---
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', error, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={`block w-full rounded-md border text-sm transition-shadow
        ${
          error
            ? 'border-red-300 text-red-900 focus:border-red-500 focus:ring-red-500'
            : 'border-border-default text-txt-main focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-white'
        }
        shadow-sm py-2 pl-3 pr-10 focus:outline-none ${className}`}
        {...props}
      >
        {children}
      </select>
    );
  }
);
