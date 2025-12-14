import React from 'react';

export const AVAILABLE_COLORS = [
    "slate", "gray", "zinc", "red", "orange", "amber", "yellow", "lime", "green", "emerald",
    "teal", "cyan", "sky", "blue", "indigo", "violet", "purple", "fuchsia", "pink", "rose"
];

export const COLOR_MAP = {
    slate: '#64748b', gray: '#6b7280', zinc: '#71717a', neutral: '#737373', stone: '#78716c',
    red: '#ef4444', orange: '#f97316', amber: '#f59e0b', yellow: '#eab308', lime: '#84cc16',
    green: '#22c55e', emerald: '#10b981', teal: '#14b8a6', cyan: '#06b6d4', sky: '#0ea5e9',
    blue: '#3b82f6', indigo: '#6366f1', violet: '#8b5cf6', purple: '#a855f7', fuchsia: '#d946ef',
    pink: '#ec4899', rose: '#f43f5e'
};

export const Linkify = ({ text }) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[\S]+)/g;
    const parts = text.split(urlRegex);
    return (
        <>
            {parts.map((part, i) => {
                if (part.match(urlRegex)) {
                    return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline break-all" onClick={(e) => e.stopPropagation()}>{part}</a>;
                }
                return part;
            })}
        </>
    );
};

export const formatDate = (timestamp, includeTime = false) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const options = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    };

    if (includeTime) {
        options.hour = '2-digit';
        options.minute = '2-digit';
    }

    return date.toLocaleString('es-ES', options);
};

export const TIME_UNITS = [
    { value: 'minutes', label: 'Minuto/s' },
    { value: 'hours', label: 'Hora/s' },
    { value: 'days', label: 'Día/s' },
    { value: 'weeks', label: 'Semana/s' },
    { value: 'months', label: 'Mes/es' },
    { value: 'years', label: 'Año/s' }
];

export const getEffectiveCardReminder = (card, column) => {
    if (card?.reminder_enabled) {
        return {
            enabled: true,
            value: card.reminder_value,
            unit: card.reminder_unit
        };
    }

    if (column?.default_reminder_enabled) {
        return {
            enabled: true,
            value: column.default_reminder_value,
            unit: column.default_reminder_unit
        };
    }

    return null;
};

export const calculateNextNotification = (value, unit) => {
    if (!value) return null;
    const numValue = parseInt(value);
    if (isNaN(numValue)) return null;

    let multiplier = 1000 * 60; // minutes default
    switch (unit) {
        case 'hours': multiplier = 1000 * 60 * 60; break;
        case 'days': multiplier = 1000 * 60 * 60 * 24; break;
        case 'weeks': multiplier = 1000 * 60 * 60 * 24 * 7; break;
        case 'months': multiplier = 1000 * 60 * 60 * 24 * 30; break;
        case 'years': multiplier = 1000 * 60 * 60 * 24 * 365; break;
        default: multiplier = 1000 * 60; // minutes
    }

    return Date.now() + (numValue * multiplier);
};

export const isReminderActive = (task) => {
    if (!task || !task.next_notification_at) return false;
    return Date.now() >= new Date(task.next_notification_at).getTime();
};
