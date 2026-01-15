/**
 * CONDITION EVALUATOR
 * Evalúa condiciones para determinar si una automatización debe ejecutarse
 */

// Operadores disponibles
const OPERATORS = {
    'equals': (a, b) => String(a).toLowerCase() === String(b).toLowerCase(),
    'not_equals': (a, b) => String(a).toLowerCase() !== String(b).toLowerCase(),
    'contains': (a, b) => String(a).toLowerCase().includes(String(b).toLowerCase()),
    'not_contains': (a, b) => !String(a).toLowerCase().includes(String(b).toLowerCase()),
    'starts_with': (a, b) => String(a).toLowerCase().startsWith(String(b).toLowerCase()),
    'ends_with': (a, b) => String(a).toLowerCase().endsWith(String(b).toLowerCase()),
    'greater_than': (a, b) => Number(a) > Number(b),
    'less_than': (a, b) => Number(a) < Number(b),
    'greater_or_equal': (a, b) => Number(a) >= Number(b),
    'less_or_equal': (a, b) => Number(a) <= Number(b),
    'is_empty': (a) => !a || a === '' || (Array.isArray(a) && a.length === 0),
    'is_not_empty': (a) => a && a !== '' && (!Array.isArray(a) || a.length > 0),
    'is_true': (a) => a === true || a === 'true' || a === 1,
    'is_false': (a) => a === false || a === 'false' || a === 0
};

// Campos disponibles para condiciones
const CONDITION_FIELDS = {
    'task.title': {
        label: 'Título de la tarea',
        type: 'string',
        getValue: (context) => context.task?.title
    },
    'task.description': {
        label: 'Descripción',
        type: 'string',
        getValue: (context) => context.task?.description
    },
    'task.priority': {
        label: 'Prioridad',
        type: 'string',
        getValue: (context) => context.task?.priority
    },
    'task.has_due_date': {
        label: 'Tiene fecha de vencimiento',
        type: 'boolean',
        getValue: (context) => !!context.task?.next_notification_at
    },
    'task.checklist_count': {
        label: 'Número de items en checklist',
        type: 'number',
        getValue: (context) => context.task?.checklist?.length || 0
    },
    'task.checklist_completed': {
        label: 'Items completados',
        type: 'number',
        getValue: (context) => {
            const checklist = context.task?.checklist || [];
            return checklist.filter(item => item.checked).length;
        }
    },
    'task.comments_count': {
        label: 'Número de comentarios',
        type: 'number',
        getValue: (context) => context.task?.comments?.length || 0
    },
    'column.title': {
        label: 'Nombre de la columna',
        type: 'string',
        getValue: (context) => context.toColumn?.title || context.column?.title
    },
    'from_column.title': {
        label: 'Columna origen',
        type: 'string',
        getValue: (context) => context.fromColumn?.title
    },
    'comment.text': {
        label: 'Texto del comentario',
        type: 'string',
        getValue: (context) => context.comment?.text
    }
};

export const ConditionEvaluator = {
    /**
     * Evalúa un conjunto de condiciones
     * @param {Array} conditions - Array de condiciones
     * @param {string} logic - 'AND' o 'OR'
     * @param {object} context - Contexto con los datos
     */
    evaluate(conditions, logic = 'AND', context) {
        if (!conditions || conditions.length === 0) {
            return true; // Sin condiciones = siempre pasa
        }

        const results = conditions.map(condition =>
            this.evaluateSingle(condition, context)
        );

        if (logic === 'AND') {
            return results.every(Boolean);
        } else {
            return results.some(Boolean);
        }
    },

    /**
     * Evalúa una condición individual
     */
    evaluateSingle(condition, context) {
        const { field, operator, value } = condition;

        // Obtener el valor del campo desde el contexto
        const fieldDef = CONDITION_FIELDS[field];
        const fieldValue = fieldDef ? fieldDef.getValue(context) : this.getNestedValue(context, field);

        // Obtener la función del operador
        const operatorFn = OPERATORS[operator];
        if (!operatorFn) {
            console.warn(`Operador desconocido: ${operator}`);
            return false;
        }

        // Evaluar
        try {
            return operatorFn(fieldValue, value);
        } catch (err) {
            console.error('Error evaluando condición:', err);
            return false;
        }
    },

    /**
     * Obtiene un valor anidado de un objeto usando notación de punto
     */
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    },

    /**
     * Obtiene todos los campos disponibles para condiciones
     */
    getAvailableFields() {
        return Object.entries(CONDITION_FIELDS).map(([key, field]) => ({
            key,
            ...field
        }));
    },

    /**
     * Obtiene todos los operadores disponibles
     */
    getAvailableOperators() {
        return [
            { key: 'equals', label: 'Es igual a', types: ['string', 'number'] },
            { key: 'not_equals', label: 'No es igual a', types: ['string', 'number'] },
            { key: 'contains', label: 'Contiene', types: ['string'] },
            { key: 'not_contains', label: 'No contiene', types: ['string'] },
            { key: 'starts_with', label: 'Empieza con', types: ['string'] },
            { key: 'ends_with', label: 'Termina con', types: ['string'] },
            { key: 'greater_than', label: 'Mayor que', types: ['number'] },
            { key: 'less_than', label: 'Menor que', types: ['number'] },
            { key: 'greater_or_equal', label: 'Mayor o igual', types: ['number'] },
            { key: 'less_or_equal', label: 'Menor o igual', types: ['number'] },
            { key: 'is_empty', label: 'Está vacío', types: ['string', 'array'] },
            { key: 'is_not_empty', label: 'No está vacío', types: ['string', 'array'] },
            { key: 'is_true', label: 'Es verdadero', types: ['boolean'] },
            { key: 'is_false', label: 'Es falso', types: ['boolean'] }
        ];
    },

    /**
     * Obtiene operadores compatibles con un tipo de campo
     */
    getOperatorsForFieldType(type) {
        return this.getAvailableOperators().filter(op =>
            op.types.includes(type) || op.types.includes('any')
        );
    }
};

export default ConditionEvaluator;
