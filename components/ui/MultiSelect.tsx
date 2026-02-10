import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';

interface MultiSelectProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({ options, selected, onChange, placeholder = 'Sélectionner...' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    const lower = searchTerm.toLowerCase();
    return options.filter(opt => opt.toLowerCase().includes(lower));
  }, [options, searchTerm]);

  const rowVirtualizer = useVirtualizer({
    count: filteredOptions.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 32,
    overscan: 5,
  });

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        setIsOpen(true);
        setActiveIndex(0);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'Escape':
        setIsOpen(false);
        setActiveIndex(-1);
        setSearchTerm('');
        e.preventDefault();
        break;
      case 'ArrowDown':
        setActiveIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
        e.preventDefault();
        break;
      case 'ArrowUp':
        setActiveIndex(prev => (prev > 0 ? prev - 1 : 0));
        e.preventDefault();
        break;
      case 'Enter':
      case ' ':
        // Only toggle if we are not typing in the search box (or if no search box focused)
        if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
          handleToggle(filteredOptions[activeIndex]);
          e.preventDefault();
        }
        break;
      case 'Tab':
        setIsOpen(false);
        setActiveIndex(-1);
        setSearchTerm('');
        break;
    }
  };

  useEffect(() => {
    if (isOpen && activeIndex >= 0) {
        rowVirtualizer.scrollToIndex(activeIndex, { align: 'auto' });
    }
  }, [activeIndex, isOpen, rowVirtualizer]);

  const handleSelectAll = () => {
     if (selected.length === options.length) {
        onChange([]);
     } else {
        onChange(options);
     }
  };

  const handleSelectVisible = () => {
    if (searchTerm) {
        const newSelected = new Set(selected);
        const allVisibleSelected = filteredOptions.every(opt => newSelected.has(opt));

        if (allVisibleSelected) {
            filteredOptions.forEach(opt => newSelected.delete(opt));
        } else {
            filteredOptions.forEach(opt => newSelected.add(opt));
        }
        onChange(Array.from(newSelected));
    } else {
        handleSelectAll();
    }
  };

  return (
    <div className="relative w-full" ref={containerRef} onKeyDown={handleKeyDown}>
      <button
        type="button"
        onClick={() => {
            setIsOpen(!isOpen);
            if (!isOpen) setActiveIndex(0);
        }}
        className="w-full bg-surface border border-border-default rounded px-ds-2 py-ds-1 text-left text-xs flex items-center justify-between hover:border-brand-300 focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition-colors"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
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
        <div
            className="absolute z-50 w-full mt-ds-1 bg-surface border border-border-default rounded shadow-lg max-h-80 overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col"
        >
          <div className="p-ds-2 bg-canvas border-b border-border-default space-y-ds-2 shrink-0">
             <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-txt-muted uppercase">
                    {searchTerm ? `${filteredOptions.length} résultat(s)` : 'Options'}
                </span>
                <button
                    type="button"
                    onClick={handleSelectVisible}
                    className="text-xs text-brand-600 hover:text-brand-700 hover:underline transition-colors focus:outline-none font-bold"
                    tabIndex={-1}
                >
                    {searchTerm
                        ? (filteredOptions.every(o => selected.includes(o)) ? 'Tout désélectionner' : 'Tout sélectionner')
                        : (selected.length === options.length ? 'Tout décocher' : 'Tout cocher')
                    }
                </button>
             </div>
             <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-txt-muted" />
                <input
                    type="text"
                    placeholder="Rechercher..."
                    className="w-full pl-8 pr-8 py-1.5 text-xs bg-surface border border-border-default rounded focus:ring-1 focus:ring-brand-500 outline-none text-txt-main"
                    value={searchTerm}
                    onChange={e => {
                        setSearchTerm(e.target.value);
                        setActiveIndex(0);
                    }}
                    autoFocus
                />
                {searchTerm && (
                    <button
                        onClick={() => setSearchTerm('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-txt-muted hover:text-txt-main"
                    >
                        <X className="w-3 h-3" />
                    </button>
                )}
             </div>
          </div>

          <div
            ref={listRef}
            className="overflow-y-auto custom-scrollbar flex-1 min-h-[100px] max-h-[300px]"
            role="listbox"
          >
            {filteredOptions.length === 0 ? (
                <div className="p-ds-4 text-xs text-txt-muted italic text-center">Aucun résultat</div>
            ) : (
                <div
                    style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}
                >
                    {rowVirtualizer.getVirtualItems().map(virtualRow => {
                        const option = filteredOptions[virtualRow.index];
                        const isChecked = selected.includes(option);
                        const isActive = virtualRow.index === activeIndex;

                        return (
                            <div
                                key={virtualRow.key}
                                className={`absolute top-0 left-0 w-full flex items-center px-ds-2 py-ds-1.5 cursor-pointer transition-colors ${isActive ? 'bg-brand-50' : 'hover:bg-canvas'}`}
                                style={{ height: `${virtualRow.size}px`, transform: `translateY(${virtualRow.start}px)` }}
                                onClick={() => handleToggle(option)}
                                role="option"
                                aria-selected={isChecked}
                            >
                                <div
                                    className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center mr-ds-2 transition-colors
                                    ${isChecked ? 'bg-brand-600 border-brand-600' : 'bg-surface border-border-default'}`}
                                >
                                    {isChecked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                                </div>
                                <span className="text-xs text-txt-main truncate" title={option}>{option}</span>
                            </div>
                        );
                    })}
                </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};