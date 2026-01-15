/**
 * VARIABLE RESOLVER
 * Resuelve variables con sintaxis {{variable}} en las configuraciones de acciones
 * 
 * Ejemplo:
 * Input: "La tarea {{task.title}} ha sido movida a {{toColumn.title}}"
 * Output: "La tarea Revisar factura ha sido movida a Completado"
 */

export const VariableResolver = {
    // Patrón para encontrar variables: {{variable.path}}
    VARIABLE_PATTERN: /\{\{([^}]+)\}\}/g,

    /**
     * Resuelve todas las variables en un objeto de configuración
     * @param {object|string} config - Configuración con variables
     * @param {object} context - Contexto con los datos reales
     */
    resolve(config, context) {
        if (typeof config === 'string') {
            return this.resolveString(config, context);
        }

        if (Array.isArray(config)) {
            return config.map(item => this.resolve(item, context));
        }

        if (typeof config === 'object' && config !== null) {
            const resolved = {};
            for (const [key, value] of Object.entries(config)) {
                resolved[key] = this.resolve(value, context);
            }
            return resolved;
        }

        return config;
    },

    /**
     * Resuelve variables en un string
     */
    resolveString(str, context) {
        return str.replace(this.VARIABLE_PATTERN, (match, path) => {
            const value = this.getValueFromPath(path.trim(), context);
            return value !== undefined && value !== null ? String(value) : match;
        });
    },

    /**
     * Obtiene un valor del contexto usando una ruta de puntos
     * Ejemplo: "task.title" -> context.task.title
     */
    getValueFromPath(path, context) {
        // Variables especiales
        const specialVars = {
            'now': () => new Date().toISOString(),
            'today': () => new Date().toLocaleDateString('es-ES'),
            'timestamp': () => Date.now(),
            'random': () => Math.random().toString(36).substring(7)
        };

        if (specialVars[path]) {
            return specialVars[path]();
        }

        // Navegar por el path
        const parts = path.split('.');
        let current = context;

        for (const part of parts) {
            if (current === undefined || current === null) {
                return undefined;
            }

            // Soporte para arrays: items[0]
            const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
            if (arrayMatch) {
                const [, arrayName, index] = arrayMatch;
                current = current[arrayName]?.[parseInt(index)];
            } else {
                current = current[part];
            }
        }

        return current;
    },

    /**
     * Obtiene todas las variables disponibles para el contexto de automatizaciones
     */
    getAvailableVariables() {
        return [
            // Tarea
            { path: 'task.id', label: 'ID de la tarea', category: 'Tarea' },
            { path: 'task.title', label: 'Título de la tarea', category: 'Tarea' },
            { path: 'task.description', label: 'Descripción', category: 'Tarea' },
            { path: 'task.priority', label: 'Prioridad', category: 'Tarea' },
            { path: 'task.next_notification_at', label: 'Fecha de vencimiento', category: 'Tarea' },
            { path: 'task.created_at', label: 'Fecha de creación', category: 'Tarea' },

            // Columnas
            { path: 'column.title', label: 'Columna actual', category: 'Columna' },
            { path: 'column.color', label: 'Color de columna', category: 'Columna' },
            { path: 'toColumn.title', label: 'Columna destino', category: 'Columna' },
            { path: 'fromColumn.title', label: 'Columna origen', category: 'Columna' },

            // Board
            { path: 'board.id', label: 'ID del tablero', category: 'Tablero' },
            { path: 'board.title', label: 'Nombre del tablero', category: 'Tablero' },

            // Usuario
            { path: 'user.id', label: 'ID del usuario', category: 'Usuario' },
            { path: 'user.email', label: 'Email del usuario', category: 'Usuario' },
            { path: 'user.name', label: 'Nombre del usuario', category: 'Usuario' },

            // Comentario
            { path: 'comment.text', label: 'Texto del comentario', category: 'Comentario' },
            { path: 'comment.created_at', label: 'Fecha del comentario', category: 'Comentario' },

            // Especiales
            { path: 'now', label: 'Fecha/hora actual (ISO)', category: 'Sistema' },
            { path: 'today', label: 'Fecha actual', category: 'Sistema' },
            { path: 'timestamp', label: 'Timestamp actual', category: 'Sistema' },

            // Última acción
            { path: 'lastActionResult.message', label: 'Mensaje última acción', category: 'Flujo' },
            { path: 'lastActionResult.success', label: 'Éxito última acción', category: 'Flujo' }
        ];
    },

    /**
     * Obtiene variables agrupadas por categoría
     */
    getGroupedVariables() {
        const variables = this.getAvailableVariables();
        const grouped = {};

        variables.forEach(v => {
            if (!grouped[v.category]) {
                grouped[v.category] = [];
            }
            grouped[v.category].push(v);
        });

        return grouped;
    },

    /**
     * Valida que todas las variables en un string existen
     */
    validateVariables(str, context) {
        const variables = [];
        const regex = new RegExp(this.VARIABLE_PATTERN);
        let match;

        while ((match = regex.exec(str)) !== null) {
            const path = match[1].trim();
            const value = this.getValueFromPath(path, context);
            variables.push({
                path,
                found: value !== undefined,
                value
            });
        }

        return {
            valid: variables.every(v => v.found),
            variables
        };
    }
};

export default VariableResolver;
