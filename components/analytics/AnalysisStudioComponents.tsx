import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

// --- Treemap Content ---
export const TreemapContent = (props: any) => {
    const { x, y, width, height, name, index, colors } = props;
    const fill = colors ? colors[index % colors.length] : '#64748b';
    const displayName = name || 'N/A';

    return (
        <g>
            <rect x={x} y={y} width={width} height={height} fill={fill} stroke="#fff" />
            {width > 60 && height > 30 && (
                <text x={x + width / 2} y={y + height / 2} textAnchor="middle" fill="#fff" fontSize={12} dy={4} style={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
                    {displayName.substring(0, 12)}
                </text>
            )}
        </g>
    );
};

// --- Multi Select Component ---
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
                className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-left text-xs flex items-center justify-between hover:border-brand-300 focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
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
                        <button onClick={handleSelectAll} className="text-xs text-brand-600 hover:underline">
                            {selected.length === options.length ? 'Tout décocher' : 'Tout cocher'}
                        </button>
                    </div>
                    {options.length === 0 ? (
                        <div className="p-2 text-xs text-slate-400 italic text-center">Aucune donnée</div>
                    ) : (
                        options.map(option => (
                            <label key={option} className="flex items-center px-2 py-1.5 hover:bg-slate-50 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 h-3 w-3 mr-2"
                                    checked={selected.includes(option)}
                                    onChange={() => handleToggle(option)}
                                />
                                <span className="text-xs text-slate-700 truncate" title={option}>{option}</span>
                            </label>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};
