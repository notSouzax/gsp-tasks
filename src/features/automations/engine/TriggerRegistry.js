/**
 * TRIGGER REGISTRY
 * Registro de todos los triggers disponibles y su lógica de evaluación
 */

// Definición de triggers disponibles
const TRIGGERS = {
    // ========================================
    // TRIGGERS DE MOVIMIENTO
    // ========================================
    'task.moved': {
        name: 'Tarea movida',
        description: 'Cuando una tarea es movida a cualquier columna',
        icon: '🔄',
        configFields: [],
        evaluate: (config, context) => {
            return context.fromColumn && context.toColumn &&
                context.fromColumn !== context.toColumn;
        }
    },

    'task.moved_to': {
        name: 'Tarea movida a columna',
        description: 'Cuando una tarea es movida a una columna específica',
        icon: '➡️',
        configFields: [
            { key: 'columnId', label: 'Columna destino', type: 'column_select', required: true },
            { key: 'columnTitle', label: 'O nombre de columna', type: 'text', required: false }
        ],
        evaluate: (config, context) => {
            if (!context.toColumn) return false;

            // Verificar por ID o por título
            if (config.columnId && context.toColumn.id) {
                return String(config.columnId) === String(context.toColumn.id);
            }
            if (config.columnTitle && context.toColumn.title) {
                return context.toColumn.title.toLowerCase().includes(config.columnTitle.toLowerCase());
            }
            return false;
        }
    },

    'task.moved_from': {
        name: 'Tarea sale de columna',
        description: 'Cuando una tarea sale de una columna específica',
        icon: '⬅️',
        configFields: [
            { key: 'columnId', label: 'Columna origen', type: 'column_select', required: true },
            { key: 'columnTitle', label: 'O nombre de columna', type: 'text', required: false }
        ],
        evaluate: (config, context) => {
            if (!context.fromColumn) return false;

            if (config.columnId && context.fromColumn.id) {
                return String(config.columnId) === String(context.fromColumn.id);
            }
            if (config.columnTitle && context.fromColumn.title) {
                return context.fromColumn.title.toLowerCase().includes(config.columnTitle.toLowerCase());
            }
            return false;
        }
    },

    // ========================================
    // TRIGGERS DE CREACIÓN/EDICIÓN
    // ========================================
    'task.created': {
        name: 'Tarea creada',
        description: 'Cuando se crea una nueva tarea',
        icon: '✨',
        configFields: [
            { key: 'columnId', label: 'En columna (opcional)', type: 'column_select', required: false }
        ],
        evaluate: (config, context) => {
            if (!context.task) return false;

            // Si se especifica columna, verificar
            if (config.columnId) {
                return String(context.task.column_id) === String(config.columnId);
            }

            return true; // Sin filtro, cualquier tarea creada
        }
    },

    'task.updated': {
        name: 'Tarea actualizada',
        description: 'Cuando se modifica una tarea',
        icon: '📝',
        configFields: [
            {
                key: 'field', label: 'Campo específico (opcional)', type: 'select',
                options: ['title', 'description', 'priority', 'any'], required: false
            }
        ],
        evaluate: (config, context) => {
            if (!context.task || !context.changes) return false;

            if (config.field && config.field !== 'any') {
                return context.changes.hasOwnProperty(config.field);
            }

            return Object.keys(context.changes).length > 0;
        }
    },

    'task.deleted': {
        name: 'Tarea eliminada',
        description: 'Cuando se elimina una tarea',
        icon: '🗑️',
        configFields: [],
        evaluate: (config, context) => {
            return !!context.task;
        }
    },

    // ========================================
    // TRIGGERS TEMPORALES
    // ========================================
    'task.overdue': {
        name: 'Tarea vencida',
        description: 'Cuando una tarea supera su fecha de vencimiento',
        icon: '⏰',
        configFields: [],
        evaluate: (config, context) => {
            if (!context.task || !context.task.next_notification_at) return false;

            const dueDate = new Date(context.task.next_notification_at);
            return dueDate < new Date();
        }
    },

    'task.due_soon': {
        name: 'Tarea próxima a vencer',
        description: 'Cuando faltan X horas para el vencimiento',
        icon: '⚠️',
        configFields: [
            { key: 'hours', label: 'Horas antes', type: 'number', default: 24, required: true }
        ],
        evaluate: (config, context) => {
            if (!context.task || !context.task.next_notification_at) return false;

            const dueDate = new Date(context.task.next_notification_at);
            const now = new Date();
            const hoursUntilDue = (dueDate - now) / (1000 * 60 * 60);

            return hoursUntilDue > 0 && hoursUntilDue <= (config.hours || 24);
        }
    },

    // ========================================
    // TRIGGERS PROGRAMADOS (SCHEDULED)
    // ========================================
    'schedule.daily': {
        name: 'Diariamente',
        description: 'Se ejecuta todos los días a una hora específica',
        icon: '📅',
        category: 'scheduled',
        configFields: [
            { key: 'time', label: 'Hora (HH:MM)', type: 'time', default: '09:00', required: true }
        ],
        // Los scheduled triggers no se evalúan en frontend, se ejecutan en Edge Function
        evaluate: () => false // Se ejecutan via cron job
    },

    'schedule.weekly': {
        name: 'Semanalmente',
        description: 'Se ejecuta semanalmente en un día específico',
        icon: '📆',
        category: 'scheduled',
        configFields: [
            {
                key: 'day', label: 'Día de la semana', type: 'select', required: true,
                options: [
                    { value: 0, label: 'Domingo' },
                    { value: 1, label: 'Lunes' },
                    { value: 2, label: 'Martes' },
                    { value: 3, label: 'Miércoles' },
                    { value: 4, label: 'Jueves' },
                    { value: 5, label: 'Viernes' },
                    { value: 6, label: 'Sábado' }
                ]
            },
            { key: 'time', label: 'Hora (HH:MM)', type: 'time', default: '09:00', required: true }
        ],
        evaluate: () => false // Se ejecutan via cron job
    },

    'schedule.monthly': {
        name: 'Mensualmente',
        description: 'Se ejecuta mensualmente en un día específico del mes',
        icon: '📊',
        category: 'scheduled',
        configFields: [
            { key: 'day', label: 'Día del mes (1-31)', type: 'number', min: 1, max: 31, default: 1, required: true },
            { key: 'time', label: 'Hora (HH:MM)', type: 'time', default: '09:00', required: true }
        ],
        evaluate: () => false // Se ejecutan via cron job
    },

    'task.overdue.scheduled': {
        name: 'Tareas vencidas (programado)',
        description: 'Detecta automáticamente tareas vencidas cada hora',
        icon: '🔴',
        category: 'scheduled',
        configFields: [],
        evaluate: () => false // Se ejecutan via cron job
    },

    'task.due_soon.scheduled': {
        name: 'Tareas próximas a vencer (programado)',
        description: 'Detecta tareas próximas a vencer (configurable)',
        icon: '🟡',
        category: 'scheduled',
        configFields: [
            { key: 'hours_before', label: 'Horas antes del vencimiento', type: 'number', default: 24, min: 1, max: 168, required: true }
        ],
        evaluate: () => false // Se ejecutan via cron job
    },

    // ========================================
    // TRIGGERS DE PROGRESO
    // ========================================
    'checklist.completed': {
        name: 'Checklist completado',
        description: 'Cuando todos los items del checklist están marcados',
        icon: '✅',
        configFields: [],
        evaluate: (config, context) => {
            if (!context.task || !context.task.checklist) return false;

            const checklist = context.task.checklist;
            if (!Array.isArray(checklist) || checklist.length === 0) return false;

            return checklist.every(item => item.checked === true);
        }
    },

    'comment.added': {
        name: 'Comentario añadido',
        description: 'Cuando se añade un comentario a una tarea',
        icon: '💬',
        configFields: [
            { key: 'contains', label: 'Contiene texto (opcional)', type: 'text', required: false }
        ],
        evaluate: (config, context) => {
            if (!context.comment) return false;

            if (config.contains) {
                return context.comment.text.toLowerCase().includes(config.contains.toLowerCase());
            }

            return true;
        }
    },

    // ========================================
    // TRIGGERS CRM - OPORTUNIDADES
    // ========================================
    'opportunity.created': {
        name: 'Oportunidad creada',
        description: 'Cuando se crea una nueva oportunidad',
        icon: '🎯',
        category: 'crm',
        configFields: [
            { key: 'pipelineId', label: 'Pipeline (opcional)', type: 'pipeline_select', required: false }
        ],
        evaluate: (config, context) => {
            if (!context.opportunity) return false;
            if (config.pipelineId) {
                return String(context.opportunity.pipeline_id) === String(config.pipelineId);
            }
            return true;
        }
    },

    'opportunity.moved_to': {
        name: 'Oportunidad movida a etapa',
        description: 'Cuando una oportunidad se mueve a una etapa específica',
        icon: '➡️',
        category: 'crm',
        configFields: [
            { key: 'stageId', label: 'Etapa destino', type: 'stage_select', required: true }
        ],
        evaluate: (config, context) => {
            if (!context.opportunity || !context.toStage) return false;
            return String(context.toStage.id) === String(config.stageId);
        }
    },

    'opportunity.won': {
        name: 'Oportunidad ganada',
        description: 'Cuando una oportunidad se marca como ganada',
        icon: '🏆',
        category: 'crm',
        configFields: [],
        evaluate: (config, context) => {
            if (!context.opportunity) return false;
            return context.opportunity.is_won === true;
        }
    },

    'opportunity.lost': {
        name: 'Oportunidad perdida',
        description: 'Cuando una oportunidad se marca como perdida',
        icon: '❌',
        category: 'crm',
        configFields: [],
        evaluate: (config, context) => {
            if (!context.opportunity) return false;
            return context.opportunity.is_lost === true;
        }
    },

    'opportunity.updated': {
        name: 'Oportunidad actualizada',
        description: 'Cuando se modifica una oportunidad',
        icon: '📝',
        category: 'crm',
        configFields: [
            {
                key: 'field', label: 'Campo específico (opcional)', type: 'select',
                options: ['expected_revenue', 'probability', 'expected_close_date', 'any'], required: false
            }
        ],
        evaluate: (config, context) => {
            if (!context.opportunity || !context.changes) return false;
            if (config.field && config.field !== 'any') {
                return context.changes.hasOwnProperty(config.field);
            }
            return Object.keys(context.changes).length > 0;
        }
    },

    // ========================================
    // TRIGGERS CRM - ACTIVIDADES
    // ========================================
    'crm_activity.created': {
        name: 'Actividad CRM creada',
        description: 'Cuando se crea una actividad (llamada, reunión, etc.)',
        icon: '📞',
        category: 'crm',
        configFields: [
            {
                key: 'activityType', label: 'Tipo de actividad', type: 'select', required: false,
                options: [
                    { value: 'call', label: 'Llamada' },
                    { value: 'meeting', label: 'Reunión' },
                    { value: 'email', label: 'Email' },
                    { value: 'task', label: 'Tarea' },
                    { value: 'any', label: 'Cualquiera' }
                ]
            }
        ],
        evaluate: (config, context) => {
            if (!context.activity) return false;
            if (config.activityType && config.activityType !== 'any') {
                return context.activity.activity_type === config.activityType;
            }
            return true;
        }
    },

    'crm_activity.completed': {
        name: 'Actividad CRM completada',
        description: 'Cuando se completa una actividad',
        icon: '✅',
        category: 'crm',
        configFields: [],
        evaluate: (config, context) => {
            if (!context.activity) return false;
            return context.activity.is_done === true;
        }
    },

    // ========================================
    // TRIGGERS CRM - CONTACTOS
    // ========================================
    'contact.created': {
        name: 'Contacto creado',
        description: 'Cuando se crea un nuevo contacto',
        icon: '👤',
        category: 'crm',
        configFields: [],
        evaluate: (config, context) => {
            return !!context.contact;
        }
    },

    'contact.updated': {
        name: 'Contacto actualizado',
        description: 'Cuando se modifica un contacto',
        icon: '📝',
        category: 'crm',
        configFields: [],
        evaluate: (config, context) => {
            if (!context.contact || !context.changes) return false;
            return Object.keys(context.changes).length > 0;
        }
    },

    // ========================================
    // TRIGGERS CALENDARIO
    // ========================================
    'event.created': {
        name: 'Evento creado',
        description: 'Cuando se crea un nuevo evento en el calendario',
        icon: '📅',
        category: 'calendar',
        configFields: [
            { key: 'tagId', label: 'Con etiqueta (opcional)', type: 'tag_select', required: false }
        ],
        evaluate: (config, context) => {
            if (!context.event) return false;
            if (config.tagId) {
                return context.event.tag_id === config.tagId;
            }
            return true;
        }
    },

    'event.upcoming': {
        name: 'Evento próximo',
        description: 'Cuando un evento está por comenzar',
        icon: '⏰',
        category: 'calendar',
        configFields: [
            { key: 'minutesBefore', label: 'Minutos antes', type: 'number', default: 15, required: true }
        ],
        evaluate: (config, context) => {
            if (!context.event || !context.event.start_time) return false;
            const startTime = new Date(context.event.start_time);
            const now = new Date();
            const minutesUntilStart = (startTime - now) / (1000 * 60);
            return minutesUntilStart > 0 && minutesUntilStart <= (config.minutesBefore || 15);
        }
    },

    'event.started': {
        name: 'Evento iniciado',
        description: 'Cuando un evento comienza',
        icon: '▶️',
        category: 'calendar',
        configFields: [],
        evaluate: (config, context) => {
            if (!context.event || !context.event.start_time) return false;
            const startTime = new Date(context.event.start_time);
            const now = new Date();
            // Consider started if within 5 minutes of start time
            const minutesDiff = Math.abs((now - startTime) / (1000 * 60));
            return minutesDiff <= 5;
        }
    },

    'event.updated': {
        name: 'Evento actualizado',
        description: 'Cuando se modifica un evento',
        icon: '📝',
        category: 'calendar',
        configFields: [],
        evaluate: (config, context) => {
            if (!context.event || !context.changes) return false;
            return Object.keys(context.changes).length > 0;
        }
    }
};

export const TriggerRegistry = {
    /**
     * Obtiene todos los triggers disponibles
     */
    getAll() {
        return Object.entries(TRIGGERS).map(([type, trigger]) => ({
            type,
            ...trigger
        }));
    },

    /**
     * Obtiene un trigger específico por tipo
     */
    get(type) {
        return TRIGGERS[type] ? { type, ...TRIGGERS[type] } : null;
    },

    /**
     * Evalúa si un trigger coincide con el contexto dado
     */
    evaluate(type, config, context) {
        const trigger = TRIGGERS[type];
        if (!trigger) {
            console.warn(`Trigger desconocido: ${type}`);
            return false;
        }

        return trigger.evaluate(config || {}, context);
    },

    /**
     * Obtiene los triggers agrupados por categoría
     */
    getGrouped() {
        return {
            movement: ['task.moved', 'task.moved_to', 'task.moved_from'],
            creation: ['task.created', 'task.updated', 'task.deleted'],
            temporal: ['task.overdue', 'task.due_soon'],
            scheduled: ['schedule.daily', 'schedule.weekly', 'schedule.monthly', 'task.overdue.scheduled', 'task.due_soon.scheduled'],
            progress: ['checklist.completed', 'comment.added'],
            crm: ['opportunity.created', 'opportunity.moved_to', 'opportunity.won', 'opportunity.lost', 'opportunity.updated', 'crm_activity.created', 'crm_activity.completed', 'contact.created', 'contact.updated'],
            calendar: ['event.created', 'event.upcoming', 'event.started', 'event.updated']
        };
    },

    /**
     * Obtiene triggers filtrados por contexto (boards, crm, calendar)
     */
    getByContext(context) {
        const grouped = this.getGrouped();
        let triggerTypes = [];

        if (context === 'boards') {
            triggerTypes = [
                ...grouped.movement,
                ...grouped.creation,
                ...grouped.temporal,
                ...grouped.scheduled,
                ...grouped.progress
            ];
        } else if (context === 'crm') {
            triggerTypes = grouped.crm;
        } else if (context === 'calendar') {
            triggerTypes = grouped.calendar;
        } else {
            // Return all if no context specified
            return this.getAll();
        }

        return triggerTypes.map(type => this.get(type)).filter(Boolean);
    }
};

export default TriggerRegistry;

