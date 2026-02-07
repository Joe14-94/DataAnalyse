import React from 'react';

// --- TITRES ---
interface HeadingProps {
  level?: 1 | 2 | 3 | 4;
  children: React.ReactNode;
  className?: string;
}

export const Heading: React.FC<HeadingProps> = ({ level = 1, children, className = '' }) => {
  const styles = {
    1: 'text-[1.8em] font-bold text-txt-main tracking-tight',
    2: 'text-[1.5em] font-bold text-txt-main',
    3: 'text-[1.2em] font-semibold text-txt-main',
    4: 'text-base font-bold text-txt-secondary uppercase tracking-wider'
  };

  const Tag = `h${level}` as React.ElementType;

  return <Tag className={`${styles[level]} ${className}`}>{children}</Tag>;
};

// --- TEXTE COURANT ---
interface TextProps {
  size?: 'xs' | 'sm' | 'base' | 'lg';
  weight?: 'normal' | 'medium' | 'bold';
  variant?: 'main' | 'secondary' | 'muted' | 'brand' | 'danger' | 'success';
  children: React.ReactNode;
  className?: string;
  as?: 'p' | 'span' | 'div';
}

export const Text: React.FC<TextProps> = ({
  size = 'sm',
  weight = 'normal',
  variant = 'main',
  children,
  className = '',
  as = 'p'
}) => {
  const sizes = {
    xs: 'text-xs',
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg'
  };

  const variants = {
    main: 'text-txt-main',
    secondary: 'text-txt-secondary',
    muted: 'text-txt-muted',
    brand: 'text-brand-600',
    danger: 'text-danger-text',
    success: 'text-success-text'
  };

  const weights = {
    normal: 'font-normal',
    medium: 'font-medium',
    bold: 'font-bold'
  };

  const Tag = as as React.ElementType;

  return (
    <Tag className={`${sizes[size]} ${variants[variant]} ${weights[weight]} ${className}`}>
      {children}
    </Tag>
  );
};
