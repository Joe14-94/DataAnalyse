import React from 'react';
import { Check } from 'lucide-react';

interface CheckboxProps {
  checked: boolean;
  onChange: () => void;
  label?: string;
  className?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({ checked, onChange, label, className = '' }) => (
  <label className={`flex items-center gap-2 cursor-pointer group select-none ${className}`}>
    <input
      type="checkbox"
      className="sr-only peer"
      checked={checked}
      onChange={onChange}
    />
    <div 
      className={`w-4 h-4 rounded border flex items-center justify-center transition-all duration-200
      ${checked ? 'bg-white border-brand-600 shadow-sm' : 'bg-white border-slate-300 group-hover:border-brand-400'}
      peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500 peer-focus-visible:ring-offset-2`}
    >
       {checked && <Check className="w-3 h-3 text-brand-600 animate-in zoom-in duration-200" strokeWidth={3} />}
    </div>
    {label && <span className="text-xs text-slate-600 group-hover:text-slate-900 transition-colors">{label}</span>}
  </label>
);