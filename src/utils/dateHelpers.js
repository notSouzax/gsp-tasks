/**
 * Date Formatting Utilities (Spanish Locale)
 * Centralized date formatting using date-fns with Spanish locale.
 */
import { formatDistanceToNow, format, isToday, isYesterday, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Formats a date as relative time in Spanish
 * @param {string|Date} timestamp - The date to format
 * @returns {string} Relative time string (e.g., "hace 3 horas")
 * @example formatRelativeTime(new Date()) // "hace un momento"
 */
export const formatRelativeTime = (timestamp) => {
    if (!timestamp) return '';
    try {
        const date = typeof timestamp === 'string' ? parseISO(timestamp) : new Date(timestamp);
        return formatDistanceToNow(date, { addSuffix: true, locale: es });
    } catch {
        return '';
    }
};

/**
 * Formats a date with full Spanish format
 * @param {string|Date} timestamp - The date to format
 * @param {Object} options - Formatting options
 * @param {boolean} options.smart - Use "hoy"/"ayer" when applicable
 * @param {boolean} options.short - Use abbreviated format (e.g., "18 dic 20:30")
 * @returns {string} Formatted date string
 * @example formatDateTime(date) // "18 de diciembre a las 20:30"
 * @example formatDateTime(date, { smart: true }) // "hoy a las 14:30"
 */
export const formatDateTime = (timestamp, options = {}) => {
    if (!timestamp) return '';
    try {
        const date = typeof timestamp === 'string' ? parseISO(timestamp) : new Date(timestamp);

        if (options.smart) {
            if (isToday(date)) {
                return `hoy a las ${format(date, 'HH:mm', { locale: es })}`;
            }
            if (isYesterday(date)) {
                return `ayer a las ${format(date, 'HH:mm', { locale: es })}`;
            }
        }

        if (options.short) {
            return format(date, "d MMM HH:mm", { locale: es });
        }

        return format(date, "d 'de' MMMM 'a las' HH:mm", { locale: es });
    } catch {
        return '';
    }
};

/**
 * Formats a date for basic display
 * @param {string|Date} timestamp - The date to format
 * @param {boolean} includeTime - Whether to include time
 * @returns {string} Formatted date (e.g., "18/12/2024" or "18/12/2024 20:30")
 */
export const formatDate = (timestamp, includeTime = false) => {
    if (!timestamp) return '';
    try {
        const date = typeof timestamp === 'string' ? parseISO(timestamp) : new Date(timestamp);
        if (includeTime) {
            return format(date, 'dd/MM/yyyy HH:mm', { locale: es });
        }
        return format(date, 'dd/MM/yyyy', { locale: es });
    } catch {
        return '';
    }
};

/**
 * Formats a date for grouping in lists/timelines
 * @param {string|Date} timestamp - The date to format
 * @returns {string} Group label (e.g., "Hoy", "Ayer", "20 de diciembre de 2024")
 */
export const formatDateGroup = (timestamp) => {
    if (!timestamp) return '';
    try {
        const date = typeof timestamp === 'string' ? parseISO(timestamp) : new Date(timestamp);

        if (isToday(date)) {
            return 'Hoy';
        }
        if (isYesterday(date)) {
            return 'Ayer';
        }

        return format(date, "d 'de' MMMM 'de' yyyy", { locale: es });
    } catch {
        return '';
    }
};
