import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Palette, Type, Layout as LayoutIcon, Maximize2, RotateCcw } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';

export const UIPrefsSettings: React.FC = () => {
  const { uiPrefs, updateUIPrefs, resetUIPrefs } = useSettings();

  return (
    <Card
      title="Personnalisation de l'interface"
      icon={<Palette className="w-5 h-5 text-brand-600" />}
    >
      <div className="space-y-6">
        {/* Palette Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Palette className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
              Couleurs & Thèmes
            </span>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {[
              'blue',
              'indigo',
              'emerald',
              'rose',
              'amber',
              'slate',
              'teal',
              'violet',
              'orange'
            ].map((color) => (
              <button
                key={color}
                onClick={() => updateUIPrefs({ colorPalette: color as any })}
                className={`h-10 rounded-lg border-2 transition-all flex items-center justify-center ${uiPrefs.colorPalette === color ? 'border-slate-900 scale-110 shadow-lg' : 'border-transparent hover:scale-105'}`}
                style={{
                  backgroundColor:
                    color === 'blue'
                      ? '#2563eb'
                      : color === 'indigo'
                        ? '#4f46e5'
                        : color === 'emerald'
                          ? '#059669'
                          : color === 'amber'
                            ? '#d97706'
                            : color === 'rose'
                              ? '#e11d48'
                              : color === 'slate'
                                ? '#475569'
                                : color === 'violet'
                                  ? '#7c3aed'
                                  : color === 'teal'
                                    ? '#0891b2'
                                    : '#ea580c'
                }}
              >
                {uiPrefs.colorPalette === color && (
                  <div className="w-2 h-2 bg-white rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-slate-100">
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Type className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
                Typographie
              </span>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-lg">
              {['sans', 'serif', 'mono', 'inter'].map((font) => (
                <button
                  key={font}
                  onClick={() => updateUIPrefs({ fontFamily: font as any })}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${uiPrefs.fontFamily === font ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                >
                  {font.charAt(0).toUpperCase() + font.slice(1)}
                </button>
              ))}
            </div>
            <div className="flex bg-slate-100 p-1 rounded-lg">
              {[12, 14, 16].map((size) => (
                <button
                  key={size}
                  onClick={() => updateUIPrefs({ fontSize: size })}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${uiPrefs.fontSize === size ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                >
                  {size}px
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <LayoutIcon className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
                Style visuel
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {['classic', 'material', 'glass'].map((style) => (
                <button
                  key={style}
                  onClick={() => updateUIPrefs({ style: style as any })}
                  className={`w-full text-left px-3 py-2 text-xs font-bold rounded-lg border transition-all ${uiPrefs.style === style ? 'bg-brand-50 border-brand-600 text-brand-700 ring-1 ring-brand-600' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                >
                  {style === 'classic'
                    ? 'Interface Moderne (Flat)'
                    : style === 'material'
                      ? 'Élévation & Ombres'
                      : 'Effet Verre (Frosted)'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-6 flex items-center justify-between border-t border-slate-100">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="compact-mode"
                className="w-4 h-4 text-brand-600 rounded"
                checked={uiPrefs.density === 'compact'}
                onChange={(e) =>
                  updateUIPrefs({ density: e.target.checked ? 'compact' : 'comfortable' })
                }
              />
              <label htmlFor="compact-mode" className="text-xs font-bold text-slate-700">
                Mode Compact
              </label>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={resetUIPrefs}
            className="text-slate-400 hover:text-slate-600"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-2" />
            Réinitialiser
          </Button>
        </div>
      </div>
    </Card>
  );
};
