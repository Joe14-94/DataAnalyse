import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';

interface MultiSelectProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  options,
  selected,
  onChange,
  placeholder = 'Sélectionner...'
}) => {
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
      onChange(selected.filter((s) => s !== value));
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
        className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-left text-xs flex items-center justify-between hover:border-brand-300 focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
      >
        <span className="truncate text-slate-700">
          {selected.length === 0
            ? placeholder
            : selected.length === options.length
              ? 'Tout sélectionné'
              : `${selected.length} sélectionné(s)`}
        </span>
        <ChevronDown className="w-3 h-3 text-slate-400 ml-1 shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto custom-scrollbar">
          <div className="p-1 border-b border-slate-100 flex justify-between">
            <button
              onClick={handleSelectAll}
              className="text-[10px] font-bold text-brand-600 hover:text-brand-800 px-1 py-0.5"
            >
              {selected.length === options.length ? 'Désélectionner tout' : 'Tout sélectionner'}
            </button>
            {selected.length > 0 && (
              <button
                onClick={() => onChange([])}
                className="text-[10px] text-slate-400 hover:text-red-500"
              >
                Effacer
              </button>
            )}
          </div>
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => handleToggle(option)}
              className="w-full px-3 py-1.5 text-left text-xs hover:bg-slate-50 flex items-center justify-between transition-colors"
            >
              <span
                className={
                  selected.includes(option) ? 'font-bold text-brand-700' : 'text-slate-600'
                }
              >
                {option}
              </span>
              {selected.includes(option) && <Check className="w-3 h-3 text-brand-600" />}
            </button>
          ))}
          {options.length === 0 && (
            <div className="p-3 text-center text-[10px] text-slate-400 italic">
              Aucune option disponible
            </div>
          )}
        </div>
      )}
    </div>
  );
};
