import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

const SettingsContext = createContext();

export const useSettings = () => useContext(SettingsContext);

// Detect system theme preference
const getSystemTheme = () => {
    if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
};

export const SettingsProvider = ({ children }) => {
    const authContext = useAuth();
    const currentUser = authContext?.currentUser;

    const [settings, setSettings] = useState(() => {
        // Default settings
        const defaults = {
            theme: 'system', // 'dark', 'light', or 'system'
            columnWidth: 365,
            fontSize: 14,
            autoArchiveHours: 0,
            defaultColumns: [
                { id: 'todo', title: 'Por Hacer', color: 'bg-blue-500' },
                { id: 'doing', title: 'En Progreso', color: 'bg-yellow-500' },
                { id: 'done', title: 'Completado', color: 'bg-green-500' }
            ]
        };

        if (!currentUser) return defaults;

        const saved = localStorage.getItem(`kanban-settings-${currentUser.id}`);
        return saved ? JSON.parse(saved) : defaults;
    });

    // Track the actual resolved theme (for 'system' mode)
    const [resolvedTheme, setResolvedTheme] = useState(() => {
        if (settings.theme === 'system') {
            return getSystemTheme();
        }
        return settings.theme;
    });

    // Update settings when user changes
    useEffect(() => {
        if (!currentUser) return;

        const saved = localStorage.getItem(`kanban-settings-${currentUser.id}`);
        if (saved) {
            const parsed = JSON.parse(saved);
            setSettings(parsed);
        } else {
            // Reset to defaults if no settings found for this user
            setSettings({
                theme: 'system',
                columnWidth: 365,
                fontSize: 14,
                autoArchiveHours: 0,
                defaultColumns: [
                    { id: 'todo', title: 'Por Hacer', color: 'bg-blue-500' },
                    { id: 'doing', title: 'En Progreso', color: 'bg-yellow-500' },
                    { id: 'done', title: 'Completado', color: 'bg-green-500' }
                ]
            });
        }
    }, [currentUser]);

    // Listen for system theme changes
    useEffect(() => {
        if (settings.theme !== 'system') {
            setResolvedTheme(settings.theme);
            return;
        }

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const handleChange = (e) => {
            setResolvedTheme(e.matches ? 'dark' : 'light');
        };

        // Set initial value
        setResolvedTheme(mediaQuery.matches ? 'dark' : 'light');

        // Listen for changes
        mediaQuery.addEventListener('change', handleChange);

        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [settings.theme]);

    const applySettings = useCallback((s, resolved) => {
        const root = document.documentElement;
        const themeToApply = s.theme === 'system' ? resolved : s.theme;

        // Theme: Simply toggle the 'dark' class
        // CSS variables in index.css handle all color changes
        if (themeToApply === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }

        // Layout settings
        root.style.setProperty('--column-width', `${s.columnWidth}px`);
        root.style.setProperty('--font-size-base', `${s.fontSize}px`);
    }, []);

    useEffect(() => {
        if (currentUser) {
            localStorage.setItem(`kanban-settings-${currentUser.id}`, JSON.stringify(settings));
        }
        applySettings(settings, resolvedTheme);
    }, [settings, resolvedTheme, currentUser, applySettings]);

    const updateSettings = (updates) => {
        setSettings(prev => ({ ...prev, ...updates }));
    };

    // Convenience function to toggle theme
    const toggleTheme = () => {
        setSettings(prev => {
            const currentResolved = prev.theme === 'system' ? resolvedTheme : prev.theme;
            return { ...prev, theme: currentResolved === 'dark' ? 'light' : 'dark' };
        });
    };

    // Set theme to system preference
    const useSystemTheme = () => {
        setSettings(prev => ({ ...prev, theme: 'system' }));
    };

    const resetSettings = () => {
        setSettings({
            theme: 'system',
            columnWidth: 365,
            fontSize: 14,
            autoArchiveHours: 0,
            defaultColumns: [
                { id: 'todo', title: 'Por Hacer', color: 'bg-blue-500' },
                { id: 'doing', title: 'En Progreso', color: 'bg-yellow-500' },
                { id: 'done', title: 'Completado', color: 'bg-green-500' }
            ]
        });
    };

    return (
        <SettingsContext.Provider value={{
            settings,
            updateSettings,
            resetSettings,
            toggleTheme,
            useSystemTheme,
            resolvedTheme, // The actual theme being applied ('dark' or 'light')
            isDark: resolvedTheme === 'dark'
        }}>
            {children}
        </SettingsContext.Provider>
    );
};
