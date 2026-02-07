import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UIPrefs } from '../types';

interface SettingsContextType {
  uiPrefs: UIPrefs;
  updateUIPrefs: (updates: Partial<UIPrefs>) => void;
  resetUIPrefs: () => void;
}

const DEFAULT_UI_PREFS: UIPrefs = {
  fontSize: 11,
  fontFamily: 'inter',
  density: 'compact',
  sidebarWidth: 176,
  theme: 'light',
  style: 'classic',
  colorPalette: 'blue'
};

export const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{
  initialPrefs?: UIPrefs;
  onPrefsChange?: (prefs: UIPrefs) => void;
  children: React.ReactNode;
}> = ({ initialPrefs, onPrefsChange, children }) => {
  const [uiPrefs, setUiPrefs] = useState<UIPrefs>(initialPrefs || DEFAULT_UI_PREFS);

  const updateUIPrefs = useCallback(
    (updates: Partial<UIPrefs>) => {
      setUiPrefs((prev) => {
        const newPrefs = { ...prev, ...updates };
        if (onPrefsChange) onPrefsChange(newPrefs);
        return newPrefs;
      });
    },
    [onPrefsChange]
  );

  const resetUIPrefs = useCallback(() => {
    setUiPrefs(DEFAULT_UI_PREFS);
    if (onPrefsChange) onPrefsChange(DEFAULT_UI_PREFS);
  }, [onPrefsChange]);

  // Configuration des palettes de couleurs
  const palettes = {
    blue: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a'
    },
    indigo: {
      50: '#eef2ff',
      100: '#e0e7ff',
      200: '#c7d2fe',
      300: '#a5b4fc',
      400: '#818cf8',
      500: '#6366f1',
      600: '#4f46e5',
      700: '#4338ca',
      800: '#3730a3',
      900: '#312e81'
    },
    emerald: {
      50: '#ecfdf5',
      100: '#d1fae5',
      200: '#a7f3d0',
      300: '#6ee7b7',
      400: '#34d399',
      500: '#10b981',
      600: '#059669',
      700: '#047857',
      800: '#065f46',
      900: '#064e3b'
    },
    rose: {
      50: '#fff1f2',
      100: '#ffe4e6',
      200: '#fecdd3',
      300: '#fda4af',
      400: '#fb7185',
      500: '#f43f5e',
      600: '#e11d48',
      700: '#be123c',
      800: '#9f1239',
      900: '#881337'
    },
    amber: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f'
    },
    slate: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a'
    },
    teal: {
      50: '#f0fdfa',
      100: '#ccfbf1',
      200: '#99f6e4',
      300: '#5eead4',
      400: '#2dd4bf',
      500: '#14b8a6',
      600: '#0d9488',
      700: '#0f766e',
      800: '#115e59',
      900: '#134e4a'
    },
    violet: {
      50: '#f5f3ff',
      100: '#ede9fe',
      200: '#ddd6fe',
      300: '#c4b5fd',
      400: '#a78bfa',
      500: '#8b5cf6',
      600: '#7c3aed',
      700: '#6d28d9',
      800: '#5b21b6',
      900: '#4c1d95'
    },
    orange: {
      50: '#fff7ed',
      100: '#ffedd5',
      200: '#fed7aa',
      300: '#fdba74',
      400: '#fb923c',
      500: '#f97316',
      600: '#ea580c',
      700: '#c2410c',
      800: '#9a3412',
      900: '#7c2d12'
    }
  };

  // Appliquer les variables CSS au changement de prefs
  useEffect(() => {
    const root = document.documentElement;

    // Font & Sidebar
    root.style.setProperty('--app-font-size', `${uiPrefs.fontSize}px`);
    root.style.setProperty('--app-sidebar-width', `${uiPrefs.sidebarWidth}px`);

    // Classes de police
    root.classList.remove('font-sans', 'font-serif', 'font-mono', 'font-outfit', 'font-inter');
    root.classList.add(`font-${uiPrefs.fontFamily}`);

    // Thème & Style classes
    root.classList.remove('light', 'dark', 'style-classic', 'style-material', 'style-glass');
    root.classList.add(uiPrefs.theme);
    root.classList.add(`style-${uiPrefs.style}`);

    // Palette de couleurs
    const palette = palettes[uiPrefs.colorPalette || 'blue'];
    Object.entries(palette).forEach(([key, value]) => {
      root.style.setProperty(`--brand-${key}`, value);
    });

    // Theme specific variables
    if (uiPrefs.theme === 'dark') {
      root.style.setProperty('--canvas', '#0f172a'); // slate-950
      root.style.setProperty('--surface', '#1e293b'); // slate-800
      root.style.setProperty('--txt-main', '#f8fafc'); // slate-50
      root.style.setProperty('--txt-secondary', '#cbd5e1'); // slate-300
      root.style.setProperty('--txt-muted', '#64748b'); // slate-500
      root.style.setProperty('--border-default', '#334155'); // slate-700
    } else {
      root.style.setProperty('--canvas', '#f8fafc'); // slate-50
      root.style.setProperty('--surface', '#ffffff');
      root.style.setProperty('--txt-main', '#1e293b'); // slate-800
      root.style.setProperty('--txt-secondary', '#475569'); // slate-600
      root.style.setProperty('--txt-muted', '#94a3b8'); // slate-400
      root.style.setProperty('--border-default', '#e2e8f0'); // slate-200
    }
  }, [uiPrefs]);

  return (
    <SettingsContext.Provider value={{ uiPrefs, updateUIPrefs, resetUIPrefs }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
