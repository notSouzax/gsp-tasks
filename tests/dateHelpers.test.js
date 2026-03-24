import { describe, it, expect } from 'vitest';
import {
    formatRelativeTime,
    formatDateTime,
    formatDate,
    formatDateGroup,
} from '../src/utils/dateHelpers';

// =============================================================================
// formatRelativeTime
// =============================================================================
describe('formatRelativeTime', () => {
    it('returns empty string for null/undefined', () => {
        expect(formatRelativeTime(null)).toBe('');
        expect(formatRelativeTime(undefined)).toBe('');
    });

    it('returns a Spanish relative time string for a recent Date', () => {
        const now = new Date();
        const result = formatRelativeTime(now);
        // date-fns in Spanish: "hace menos de un minuto" or similar
        expect(result).toContain('hace');
    });

    it('works with ISO string input', () => {
        const isoStr = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
        const result = formatRelativeTime(isoStr);
        expect(result).toContain('hace');
    });

    it('handles a date far in the past', () => {
        const old = new Date('2020-01-01T00:00:00Z');
        const result = formatRelativeTime(old);
        expect(result).toContain('hace');
    });
});

// =============================================================================
// formatDateTime
// =============================================================================
describe('formatDateTime', () => {
    it('returns empty string for null', () => {
        expect(formatDateTime(null)).toBe('');
    });

    it('returns full Spanish format by default', () => {
        const date = new Date(2024, 11, 18, 20, 30); // Dec 18, 2024, 20:30
        const result = formatDateTime(date);
        // Should contain day and month in Spanish
        expect(result).toContain('18');
        expect(result).toContain('20:30');
    });

    it('smart mode returns "hoy" for today', () => {
        const now = new Date();
        now.setHours(14, 30, 0, 0);
        const result = formatDateTime(now, { smart: true });
        expect(result).toContain('hoy');
        expect(result).toContain('14:30');
    });

    it('smart mode returns "ayer" for yesterday', () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(10, 0, 0, 0);
        const result = formatDateTime(yesterday, { smart: true });
        expect(result).toContain('ayer');
        expect(result).toContain('10:00');
    });

    it('short mode returns abbreviated format', () => {
        const date = new Date(2024, 11, 18, 20, 30);
        const result = formatDateTime(date, { short: true });
        expect(result).toContain('18');
        expect(result).toContain('20:30');
    });

    it('handles ISO string input', () => {
        const result = formatDateTime('2024-06-15T09:00:00Z');
        expect(result).toContain('15');
        expect(result.length).toBeGreaterThan(5);
    });
});

// =============================================================================
// formatDate
// =============================================================================
describe('formatDate', () => {
    it('returns empty string for null', () => {
        expect(formatDate(null)).toBe('');
    });

    it('returns dd/MM/yyyy by default', () => {
        const date = new Date(2024, 5, 15); // June 15, 2024
        const result = formatDate(date);
        expect(result).toBe('15/06/2024');
    });

    it('includes time when requested', () => {
        const date = new Date(2024, 5, 15, 14, 30);
        const result = formatDate(date, true);
        expect(result).toBe('15/06/2024 14:30');
    });

    it('handles ISO string input', () => {
        const result = formatDate('2024-01-01T00:00:00Z');
        expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });
});

// =============================================================================
// formatDateGroup
// =============================================================================
describe('formatDateGroup', () => {
    it('returns empty string for null', () => {
        expect(formatDateGroup(null)).toBe('');
    });

    it('returns "Hoy" for today', () => {
        expect(formatDateGroup(new Date())).toBe('Hoy');
    });

    it('returns "Ayer" for yesterday', () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        expect(formatDateGroup(yesterday)).toBe('Ayer');
    });

    it('returns full Spanish date for older dates', () => {
        const old = new Date(2023, 5, 20); // June 20, 2023
        const result = formatDateGroup(old);
        expect(result).toContain('20');
        expect(result).toContain('junio');
        expect(result).toContain('2023');
    });
});
