/**
 * Centralized logging utility
 * Logs are only shown in development mode, except for errors
 */

const isDev = import.meta.env.DEV;

export const logger = {
    /**
     * Log general information (only in development)
     */
    log: (...args) => {
        if (isDev) {
            console.log(...args);
        }
    },

    /**
     * Log warnings (only in development)
     */
    warn: (...args) => {
        if (isDev) {
            console.warn(...args);
        }
    },

    /**
     * Log errors (always shown, even in production)
     */
    error: (...args) => {
        console.error(...args);
    },

    /**
     * Log debug information with a prefix (only in development)
     */
    debug: (context, ...args) => {
        if (isDev) {
            console.log(`[DEBUG:${context}]`, ...args);
        }
    },

    /**
     * Log info with emoji for better visibility (only in development)
     */
    info: (emoji, ...args) => {
        if (isDev) {
            console.log(emoji, ...args);
        }
    },
};

export default logger;
