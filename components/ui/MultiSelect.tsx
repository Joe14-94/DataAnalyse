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
        className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-left text-xs flex items-center justify-between hover:border-blue-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
      >
        <span className="truncate text-slate-700">
          {selected.length === 0 
            ? placeholder 
            : selected.length === options.length 
               ? 'Tout sélectionné' 
               : `${selected.length} sélectionné(s)`
          }
        </span>
        <ChevronDown className="w-3 h-3 text-slate-400 ml-1 shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded shadow-lg max-h-60 overflow-y-auto custom-scrollbar">
          <div className="sticky top-0 bg-slate-50 p-2 border-b border-slate-100 flex justify-between items-center">
             <span className="text-xs font-bold text-slate-500 uppercase">Options</span>
             <button onClick={handleSelectAll} className="text-xs text-blue-600 hover:underline">
                {selected.length === options.length ? 'Tout décocher' : 'Tout cocher'}
             </button>
          </div>
          {options.length === 0 ? (
             <div className="p-2 text-xs text-slate-400 italic text-center">Aucune donnée</div>
          ) : (
             options.map(option => {
               const isChecked = selected.includes(option);
               return (
                  <div key={option} className="flex items-center px-2 py-1.5 hover:bg-slate-50 cursor-pointer" onClick={() => handleToggle(option)}>
                     <div 
                        className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center mr-2 transition-colors 
                        ${isChecked ? 'bg-white border-blue-600' : 'bg-white border-slate-300'}`}
                      >
                        {isChecked && <Check className="w-3 h-3 text-blue-600" strokeWidth={3} />}
                     </div>
                     <span className="text-xs text-slate-700 truncate" title={option}>{option}</span>
                  </div>
               );
             })
          )}
        </div>
      )}
    </div>
  );
};