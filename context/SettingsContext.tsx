
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
    sidebarWidth: 176
};

export const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{
    initialPrefs?: UIPrefs,
    onPrefsChange?: (prefs: UIPrefs) => void,
    children: React.ReactNode
}> = ({ initialPrefs, onPrefsChange, children }) => {
    const [uiPrefs, setUiPrefs] = useState<UIPrefs>(initialPrefs || DEFAULT_UI_PREFS);

    const updateUIPrefs = useCallback((updates: Partial<UIPrefs>) => {
        setUiPrefs(prev => {
            const newPrefs = { ...prev, ...updates };
            if (onPrefsChange) onPrefsChange(newPrefs);
            return newPrefs;
        });
    }, [onPrefsChange]);

    const resetUIPrefs = useCallback(() => {
        setUiPrefs(DEFAULT_UI_PREFS);
        if (onPrefsChange) onPrefsChange(DEFAULT_UI_PREFS);
    }, [onPrefsChange]);

    // Appliquer les variables CSS au changement de prefs
    useEffect(() => {
        const root = document.documentElement;
        root.style.setProperty('--app-font-size', `${uiPrefs.fontSize}px`);
        root.style.setProperty('--app-sidebar-width', `${uiPrefs.sidebarWidth}px`);

        // Classes de police (Appliquées à html pour impacter tout le document)
        root.classList.remove('font-sans', 'font-serif', 'font-mono', 'font-outfit', 'font-inter');
        root.classList.add(`font-${uiPrefs.fontFamily}`);

        // On nettoie aussi le body au cas ou
        document.body.classList.remove('font-sans', 'font-serif', 'font-mono', 'font-outfit', 'font-inter');
        document.body.classList.add(`font-${uiPrefs.fontFamily}`);
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
