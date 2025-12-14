/**
 * AI Service for Kanban App
 * Handles:
 * 1. Entity Learning (associating names with clients)
 * 2. Smart Routing (finding the right board/column)
 * 3. Professional Formatting (grammar, punctuation, invoicing terms)
 * 4. Intent Parsing (splitting title/comment)
 * 5. Dynamic Vocabulary & Error Correction (Typos)
 */

// --- TOOL: LEVENSHTEIN DISTANCE ---
const levenshteinDistance = (a, b) => {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) { matrix[i] = [i]; }
    for (let j = 0; j <= a.length; j++) { matrix[0][j] = j; }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    return matrix[b.length][a.length];
};

// --- MODULE: WORD CORRECTOR (VOCABULARY) ---
const WordCorrector = {
    key: 'kanban-ai-vocab',
    stopWords: new Set(['el', 'la', 'lo', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'o', 'pero', 'si', 'no', 'en', 'a', 'de', 'para', 'por', 'con', 'sin', 'sobre', 'que', 'se', 'su', 'mi', 'tu', 'es', 'son', 'al', 'del']),

    // Seed with common verbs and NOUNS to prevent over-correction (e.g. Facturas vs Facturar)
    initialVocab: [
        // Verbos de acción comunes
        'pedir', 'cambiar', 'hacer', 'enviar', 'solicitar', 'adjuntar', 'revisar', 'facturar', 'pagar', 'llamar',
        'cobre', 'cobrar', 'devolver', 'emitir', 'contabilizar', 'presentar', 'liquidar', 'poder',

        // Sustantivos Relacionados (Evitar corrección a verbos)
        'cambio', 'cambios', 'solicitud', 'solicitudes', 'revisión', 'revisiones', 'pago', 'pagos', 'llamada', 'llamadas',
        'entrega', 'entregas', 'devolución', 'devoluciones', 'emisión', 'presentación', 'liquidación',

        // Documentos y Conceptos Básicos
        'factura', 'facturas', 'presupuesto', 'presupuestos', 'cliente', 'clientes', 'proveedor', 'tique', 'ticket',
        'documento', 'informe', 'reunión', 'cita', 'urgente', 'importante', 'pendiente', 'error', 'bug',
        'albarán', 'albaranes', 'recibo', 'recibos', 'pedido', 'oferta', 'proforma',

        // Fiscalidad e Impuestos
        'iva', 'irpf', 'retención', 'retenciones', 'modelo', 'trimestre', 'anual', 'declaración',
        'hacienda', 'aeat', 'seguridad', 'social', 'autónomo', 'cuota', 'impuesto', 'tasa',

        // Contabilidad y Bancos
        'banco', 'transferencia', 'remesa', 'domiciliación', 'bizum', 'tarjeta', 'efectivo', 'caja',
        'vencimiento', 'cobro', 'pago', 'devolución', 'abono', 'rectificativa', 'saldo',
        'base', 'imponible', 'total', 'neto', 'bruto', 'suplido', 'gasto', 'inversión'
    ],

    getVocab() {
        try {
            const saved = localStorage.getItem(this.key);
            let vocab = saved ? JSON.parse(saved) : {};

            // Ensure initial vocab exists
            let changed = false;
            this.initialVocab.forEach(word => {
                if (!vocab[word]) {
                    vocab[word] = 5; // Give them a head start freq
                    changed = true;
                }
            });

            if (changed) this.saveVocab(vocab);

            return vocab;
        } catch (e) {
            return {};
        }
    },

    saveVocab(vocab) {
        localStorage.setItem(this.key, JSON.stringify(vocab));
    },

    learn(text) {
        if (!text) return;
        const vocab = this.getVocab();
        // Tokenize by spaces and punctuation
        const tokens = text.toLowerCase().split(/[^a-záéíóúñü]+/);

        for (const token of tokens) {
            if (token.length < 3 || this.stopWords.has(token)) continue;

            if (!vocab[token]) vocab[token] = 0;
            vocab[token]++;
        }
        this.saveVocab(vocab);
    },

    correct(text) {
        if (!text) return "";
        const vocab = this.getVocab();
        // Get known high-frequency words (freq >= 2)
        const knownWords = Object.keys(vocab).filter(w => vocab[w] >= 2);
        if (knownWords.length === 0) return text;

        // Split text precisely to preserve delimiters for reconstruction
        // We use split with capture group to keep delimiters
        const parts = text.split(/([^a-zA-ZáéíóúñüÁÉÍÓÚÑÜ]+)/);

        const correctedParts = parts.map(part => {
            // Check if it's a word (not a delimiter)
            if (part && /^[a-zA-ZáéíóúñüÁÉÍÓÚÑÜ]+$/.test(part)) {
                const lower = part.toLowerCase();

                // If word is known or stopword, keep it (but maybe fix casing later? sticking to original casing for now)
                if (vocab[lower] || this.stopWords.has(lower) || lower.length < 4) {
                    return part;
                }

                // If Unknown, check fuzzy match
                let bestMatch = null;
                let minDist = Infinity;

                for (const candidate of knownWords) {
                    // Optimization: Length diff must be small
                    if (Math.abs(candidate.length - lower.length) > 2) continue;

                    const dist = levenshteinDistance(lower, candidate);

                    // Threshold: Distance <= 2 implies typo
                    if (dist <= 2 && dist < minDist) {
                        minDist = dist;
                        bestMatch = candidate;
                    }
                }

                if (bestMatch) {
                    // Match casing of original if possible? Or just use lower/Title from candidate?
                    // Let's preserve original Capitalization logic if original was capitalized
                    const isCap = part.charAt(0) === part.charAt(0).toUpperCase();
                    return isCap ? bestMatch.charAt(0).toUpperCase() + bestMatch.slice(1) : bestMatch;
                }
            }
            return part;
        });

        return correctedParts.join('');
    }
};

// --- MODULE: ENTITY MEMORY ---
const EntityMemory = {
    key: 'kanban-ai-entities',

    getEntities() {
        try {
            const saved = localStorage.getItem(this.key);
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error("Error reading entity memory", e);
            return [];
        }
    },

    add(name) {
        if (!name || name.length < 3) return;
        const entities = this.getEntities();
        const normalized = name.toLowerCase().trim();

        // Don't duplicate
        if (!entities.some(e => e.toLowerCase() === normalized)) {
            entities.push(name.trim()); // Save with original casing
            localStorage.setItem(this.key, JSON.stringify(entities));
        }
    },

    // Find if text STARTS with a known entity
    matchStart(text) {
        const entities = this.getEntities();
        // Sort by length desc to match longest first
        entities.sort((a, b) => b.length - a.length);

        const lowerText = text.toLowerCase();

        for (const entity of entities) {
            if (lowerText.startsWith(entity.toLowerCase())) {
                return entity; // Return the known casing
            }
        }
        return null;
    }
};

// --- MODULE: FORMATTER ---
const formatText = (text) => {
    if (!text) return "";

    let formatted = text.trim();

    // 1. Capitalize first letter
    formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);

    // 2. Fix Punctuation Spacing (e.g. "hola ." -> "hola.")
    formatted = formatted.replace(/\s+([.,;?!:])/g, '$1');

    // 3. Ensure space AFTER punctuation if missing (e.g. "hola.adios" -> "hola. adios")
    formatted = formatted.replace(/([.,;?!:])([^\s])/g, '$1 $2');

    // 4. Smart Commas (Conjunctions)
    // Add comma before: pero, aunque, sin embargo, ya que, debido a
    const connectors = ["pero", "aunque", "mas", "sino", "ya que", "debido a", "es decir"];
    for (const conn of connectors) {
        // Look for [space] connector [space] that is NOT preceded by punctuation
        const regex = new RegExp(`([^.,;?!])\\s+(${conn})\\b`, 'gi');
        formatted = formatted.replace(regex, '$1, $2');
    }

    // 5. Smart Colons
    // Add colon after: por ejemplo, son, como son, nota, importante, aviso
    const introPhrases = ["por ejemplo", "como son", "nota", "importante", "aviso"];
    for (const phrase of introPhrases) {
        const regex = new RegExp(`\\b(${phrase})\\s+([^:.,;?!])`, 'gi');
        formatted = formatted.replace(regex, '$1: $2');
    }

    // 6. Invoicing Keywords Capitalization
    const keywords = [
        "factura", "base imponible", "irpf", "iva", "presupuesto", "total",
        "cliente", "proveedor", "vencimiento", "albarán", "retención", "suplido"
    ];

    for (const kw of keywords) {
        const regex = new RegExp(`\\b${kw}\\b`, 'gi');
        formatted = formatted.replace(regex, (match) => {
            return match.charAt(0).toUpperCase() + match.slice(1);
        });
    }

    // 7. Ensure it ends with punctuation if it's a sentence (and long enough)
    if (formatted.length > 10 && !/[.,;?!:]$/.test(formatted)) {
        formatted += ".";
    }

    return formatted;
};

// --- MAIN EXPORTS ---

export const learnEntity = (name) => {
    EntityMemory.add(name);
    // Also learn individual words from the name
    WordCorrector.learn(name);
};

// Also export a specific learn function for general text (comments)
export const learnVocabulary = (text) => {
    WordCorrector.learn(text);
};

export const injectContext = (boards) => {
    if (!boards) return;
    boards.forEach(board => {
        WordCorrector.learn(board.title); // Learn Board Name
        if (board.columns) {
            board.columns.forEach(col => {
                WordCorrector.learn(col.title); // Learn Column Name
            });
        }
    });
};

/**
 * Parses voice command to extract intent, routing, and content.
 * @param {string} text - Voice transcript
 * @param {Array} boards - All available boards
 * @param {string} activeBoardId - Current board ID
 */
export const parseTaskIntent = (text, boards, activeBoardId) => {
    if (!text || !boards) return null;

    // --- STEP 0: AUTO-CORRECTION ---
    // Correct typos before any parsing
    let rawText = WordCorrector.correct(text);
    rawText = rawText.trim();

    let detectedBoard = null;
    let detectedColumn = null;

    // --- STEP 1: SMART ROUTING ---

    // 1.a Detect Board
    // Sort boards by length to match specific names first
    const sortedBoards = [...boards].sort((a, b) => b.title.length - a.title.length);

    for (const board of sortedBoards) {
        const boardTitle = board.title.toLowerCase();
        // Check if message explicitly mentions the board
        const match = rawText.toLowerCase().match(new RegExp(`(en|para|tablero)\\s+${boardTitle}`, 'i'));

        if (match) {
            detectedBoard = board;
            // Clean up the routing part from text
            rawText = rawText.replace(match[0], '').trim();
            break;
        }
    }

    const targetBoard = detectedBoard || boards.find(b => b.id === activeBoardId) || boards[0];

    // 1.b Detect Column (within target board)
    const sortedColumns = [...targetBoard.columns].sort((a, b) => b.title.length - a.title.length);

    for (const col of sortedColumns) {
        const colTitle = col.title.toLowerCase();
        const index = rawText.toLowerCase().lastIndexOf(colTitle);

        if (index !== -1) {
            detectedColumn = col;
            const removeRegex = new RegExp(`(en|a|para|la columna)?\\s*${col.title}`, 'gi');
            rawText = rawText.replace(removeRegex, '').trim();
            break;
        }
    }

    const targetColumnId = detectedColumn ? detectedColumn.id : targetBoard.columns[0]?.id;

    // --- STEP 2: ENTITY & INTENT PARSING ---

    const prefixes = [
        "crear una tarea", "crear tarea", "nueva tarea", "añadir tarea", "agregar tarea",
        "pon una tarea", "anota", "recuérdame", "crear", "tarea"
    ];

    let lowerRaw = rawText.toLowerCase();
    for (const prefix of prefixes) {
        if (lowerRaw.startsWith(prefix)) {
            rawText = rawText.slice(prefix.length).trim();
            break;
        }
    }

    let title = "";
    let comment = "";

    // A. Check Memory Logic
    const knownEntity = EntityMemory.matchStart(rawText);

    if (knownEntity) {
        title = knownEntity;
        comment = rawText.slice(knownEntity.length).trim();
        comment = comment.replace(/^([.,;?!]|\s)+/g, '');

    } else {
        // B. Heuristic Split Logic
        const periodIndex = rawText.indexOf('.');

        if (periodIndex !== -1) {
            title = rawText.substring(0, periodIndex).trim();
            comment = rawText.substring(periodIndex + 1).trim();
        } else {
            const keyWords = [" quiere ", " necesita ", " dice ", " pide ", " solicita ", " tiene "];
            let splitIndex = -1;

            for (const kw of keyWords) {
                const idx = rawText.toLowerCase().indexOf(kw);
                if (idx !== -1) {
                    splitIndex = idx;
                    break;
                }
            }

            if (splitIndex !== -1) {
                title = rawText.substring(0, splitIndex).trim();
                comment = rawText.substring(splitIndex).trim();
            } else {
                title = rawText;
                comment = "";
            }
        }
    }

    // --- STEP 3: FORMATTING ---
    if (title.length === 0) title = "Nueva Tarea";

    title = formatText(title);
    comment = formatText(comment);

    if (title.endsWith('.')) title = title.slice(0, -1);

    // LEARNING MOMENT: Learn the vocabulary from this new command
    // We learn from the CORRECTED text, reinforcing it.
    WordCorrector.learn(title);
    WordCorrector.learn(comment);

    // --- STEP 4: VALIDATION ---
    // Heuristic: If we have a long sentence (> 4 words) but NO comment (meaning we couldn't split Title/Comment)
    // and NO known Entity was found... it might be ambiguous.
    // Exception: If everything is Title because it's short ("Comprar Pan"), that's fine.

    const wordCount = rawText.split(' ').length;
    if (wordCount > 4 && comment.length === 0 && !knownEntity) {
        return {
            error: "unclear",
            needsRepetition: true,
            originalText: rawText
        };
    }

    return {
        title,
        boardId: targetBoard.id,
        columnId: targetColumnId,
        description: "",
        comment
    };
};
