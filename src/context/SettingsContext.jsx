import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const SettingsContext = createContext();

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }) => {
    const { currentUser } = useAuth();

    const [settings, setSettings] = useState(() => {
        // Default settings
        const defaults = {
            theme: 'dark',
            columnWidth: 320,
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

    // Update settings when user changes
    useEffect(() => {
        if (!currentUser) return;

        const saved = localStorage.getItem(`kanban-settings-${currentUser.id}`);
        if (saved) {
            setSettings(JSON.parse(saved));
        } else {
            // Reset to defaults if no settings found for this user
            setSettings({
                theme: 'dark',
                columnWidth: 320,
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

    const applySettings = (s) => {
        const root = document.documentElement;

        // Theme
        if (s.theme === 'dark') {
            root.classList.add('dark');
            root.style.setProperty('--bg-primary', '#0f172a'); // slate-900
            root.style.setProperty('--bg-secondary', '#1e293b'); // slate-800
            root.style.setProperty('--text-primary', '#f3f4f6'); // gray-100
            root.style.setProperty('--text-secondary', '#9ca3af'); // gray-400
            root.style.setProperty('--border-color', 'rgba(255, 255, 255, 0.1)');
        } else {
            root.classList.remove('dark');
            root.style.setProperty('--bg-primary', '#f9fafb'); // gray-50
            root.style.setProperty('--bg-secondary', '#ffffff'); // white
            root.style.setProperty('--text-primary', '#111827'); // gray-900
            root.style.setProperty('--text-secondary', '#4b5563'); // gray-600
            root.style.setProperty('--border-color', 'rgba(0, 0, 0, 0.1)');
        }

        // Layout
        root.style.setProperty('--column-width', `${s.columnWidth}px`);
        root.style.setProperty('--font-size-base', `${s.fontSize}px`);
    };

    useEffect(() => {
        if (currentUser) {
            localStorage.setItem(`kanban-settings-${currentUser.id}`, JSON.stringify(settings));
        }
        applySettings(settings);
    }, [settings, currentUser]);

    const updateSettings = (updates) => {
        setSettings(prev => ({ ...prev, ...updates }));
    };

    const resetSettings = () => {
        setSettings({
            theme: 'dark',

            columnWidth: 320,
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
        <SettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
            {children}
        </SettingsContext.Provider>
    );
};
