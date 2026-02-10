import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface MultiSelectProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({ options, selected, onChange, placeholder = 'Sélectionner...' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter(s => s !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const handleSelectAll = () => {
     if (selected.length === options.length) {
        onChange([]);
     } else {
        onChange(options);
     }
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-surface border border-border-default rounded px-ds-2 py-ds-1 text-left text-xs flex items-center justify-between hover:border-brand-300 focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition-colors"
      >
        <span className="truncate text-txt-main">
          {selected.length === 0 
            ? placeholder 
            : selected.length === options.length 
               ? 'Tout sélectionné' 
               : `${selected.length} sélectionné(s)`
          }
        </span>
        <ChevronDown className="w-3 h-3 text-txt-muted ml-1 shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-ds-1 bg-surface border border-border-default rounded shadow-lg max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-100">
          <div className="sticky top-0 bg-canvas p-ds-2 border-b border-border-default flex justify-between items-center">
             <span className="text-xs font-bold text-txt-muted uppercase">Options</span>
             <button onClick={handleSelectAll} className="text-xs text-brand-600 hover:text-brand-700 hover:underline transition-colors">
                {selected.length === options.length ? 'Tout décocher' : 'Tout cocher'}
             </button>
          </div>
          {options.length === 0 ? (
             <div className="p-ds-2 text-xs text-txt-muted italic text-center">Aucune donnée</div>
          ) : (
             options.map(option => {
               const isChecked = selected.includes(option);
               return (
                  <div key={option} className="flex items-center px-ds-2 py-ds-1.5 hover:bg-canvas cursor-pointer transition-colors" onClick={() => handleToggle(option)}>
                     <div 
                        className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center mr-ds-2 transition-colors
                        ${isChecked ? 'bg-brand-600 border-brand-600' : 'bg-surface border-border-default'}`}
                      >
                        {isChecked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                     </div>
                     <span className="text-xs text-txt-main truncate" title={option}>{option}</span>
                  </div>
               );
             })
          )}
        </div>
      )}
    </div>
  );
};