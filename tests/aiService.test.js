import { describe, it, expect, beforeEach } from 'vitest';
import {
    parseTaskIntent,
    learnEntity,
    learnVocabulary,
    learnConfirmation,
    learnCorrection,
    injectContext,
} from '../src/utils/aiService';

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Build a minimal boards array for testing parseTaskIntent.
 */
const makeBoards = (overrides = []) => {
    const defaults = [
        {
            id: 'board-1',
            title: 'Trabajo',
            columns: [
                { id: 'col-1', title: 'Por Hacer', cards: [] },
                { id: 'col-2', title: 'En Progreso', cards: [] },
                { id: 'col-3', title: 'Completado', cards: [] },
            ],
        },
        {
            id: 'board-2',
            title: 'Personal',
            columns: [
                { id: 'col-4', title: 'Pendiente', cards: [] },
                { id: 'col-5', title: 'Hecho', cards: [] },
            ],
        },
    ];
    return overrides.length ? overrides : defaults;
};

// =============================================================================
// parseTaskIntent — Keyword Parsing
// =============================================================================
describe('parseTaskIntent', () => {
    it('returns null for empty/null inputs', () => {
        expect(parseTaskIntent(null, makeBoards(), 'board-1')).toBeNull();
        expect(parseTaskIntent('', makeBoards(), 'board-1')).toBeNull();
        expect(parseTaskIntent('hello', null, 'board-1')).toBeNull();
    });

    it('extracts title from "Cliente X" keyword', () => {
        const result = parseTaskIntent('Cliente Maderas Moreno', makeBoards(), 'board-1');
        expect(result).not.toBeNull();
        expect(result.title.toLowerCase()).toContain('maderas moreno');
    });

    it('extracts title and comment from "Cliente X Tarea Y"', () => {
        const result = parseTaskIntent(
            'Cliente Maderas Moreno Tarea revisar facturas del mes',
            makeBoards(),
            'board-1'
        );
        expect(result).not.toBeNull();
        expect(result.title.toLowerCase()).toContain('maderas moreno');
        // Comment should contain the task description
        expect(result.comment.length).toBeGreaterThan(0);
    });

    it('extracts only comment when "Tarea" keyword is used alone', () => {
        const result = parseTaskIntent('Tarea enviar presupuesto', makeBoards(), 'board-1');
        expect(result).not.toBeNull();
        expect(result.title).toBe('Nueva Tarea');
        expect(result.comment.length).toBeGreaterThan(0);
    });

    it('uses full text as title when no keywords found (fallback mode)', () => {
        const result = parseTaskIntent('Revisar inventario', makeBoards(), 'board-1');
        expect(result).not.toBeNull();
        expect(result.title.toLowerCase()).toContain('revisar inventario');
        expect(result.comment).toBe('');
    });

    // =========================================================================
    // Smart Routing
    // =========================================================================
    it('defaults to active board when no board mentioned', () => {
        const result = parseTaskIntent('Revisar inventario', makeBoards(), 'board-1');
        expect(result.boardId).toBe('board-1');
    });

    it('routes to mentioned board', () => {
        const result = parseTaskIntent('en Personal Revisar inventario', makeBoards(), 'board-1');
        expect(result.boardId).toBe('board-2');
    });

    it('routes to first column by default', () => {
        const result = parseTaskIntent('Revisar inventario', makeBoards(), 'board-1');
        expect(result.columnId).toBe('col-1');
    });

    it('routes to mentioned column', () => {
        const result = parseTaskIntent(
            'Revisar inventario En Progreso',
            makeBoards(),
            'board-1'
        );
        expect(result.columnId).toBe('col-2');
    });

    // =========================================================================
    // Formatting
    // =========================================================================
    it('capitalizes the title', () => {
        const result = parseTaskIntent('revisar inventario', makeBoards(), 'board-1');
        expect(result.title[0]).toMatch(/[A-ZÁÉÍÓÚÑ]/);
    });

    it('title does not end with a period', () => {
        const result = parseTaskIntent(
            'Cliente Maderas Moreno',
            makeBoards(),
            'board-1'
        );
        expect(result.title.endsWith('.')).toBe(false);
    });
});

// =============================================================================
// Entity Learning
// =============================================================================
describe('Entity Learning', () => {
    it('learnEntity stores the entity for later retrieval in parseTaskIntent', () => {
        learnEntity('Maderas Moreno');
        // Now parse with just the name — should match as title
        const result = parseTaskIntent('Maderas Moreno revisar algo', makeBoards(), 'board-1');
        expect(result).not.toBeNull();
        expect(result.title).toBeTruthy();
    });
});

// =============================================================================
// Vocabulary & Correction Learning
// =============================================================================
describe('Vocabulary Learning', () => {
    it('learnVocabulary does not throw', () => {
        expect(() => learnVocabulary('factura presupuesto cliente')).not.toThrow();
    });

    it('learnConfirmation does not throw', () => {
        expect(() => learnConfirmation('Test Title', 'Test Comment')).not.toThrow();
    });

    it('learnCorrection does not throw', () => {
        expect(() => learnCorrection('Orginal', 'Original', 'Coment', 'Comment')).not.toThrow();
    });
});

// =============================================================================
// injectContext
// =============================================================================
describe('injectContext', () => {
    it('does not throw with valid boards', () => {
        expect(() => injectContext(makeBoards())).not.toThrow();
    });

    it('handles null gracefully', () => {
        expect(() => injectContext(null)).not.toThrow();
    });
});
