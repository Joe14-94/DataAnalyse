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
    <div 
      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors 
      ${checked ? 'bg-white border-brand-600' : 'bg-white border-slate-300 group-hover:border-brand-400'}`}
    >
       {checked && <Check className="w-3 h-3 text-brand-600" strokeWidth={3} />}
    </div>
    <input type="checkbox" className="hidden" checked={checked} onChange={onChange} />
    {label && <span className="text-xs text-slate-600 group-hover:text-slate-900">{label}</span>}
  </label>
);