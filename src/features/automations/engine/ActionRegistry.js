/**
 * ACTION REGISTRY
 * Registro de todas las acciones disponibles y su lógica de ejecución
 */

import { supabase } from '../../../lib/supabaseClient';
import toast from 'react-hot-toast';

// Definición de acciones disponibles
const ACTIONS = {
    // ========================================
    // ACCIONES DE TAREAS
    // ========================================
    'move_task': {
        name: 'Mover tarea',
        description: 'Mueve la tarea a otra columna',
        icon: '➡️',
        category: 'tasks',
        configFields: [
            { key: 'columnId', label: 'Columna destino', type: 'column_select', required: true },
            { key: 'columnTitle', label: 'O buscar por nombre', type: 'text', required: false }
        ],
        execute: async (config, context) => {
            const { task, columns } = context;
            if (!task) throw new Error('No hay tarea en el contexto');

            let targetColumn = null;

            // Buscar columna por ID
            if (config.columnId && columns) {
                targetColumn = columns.find(c => String(c.id) === String(config.columnId));
            }

            // Buscar por título si no se encontró por ID
            if (!targetColumn && config.columnTitle && columns) {
                targetColumn = columns.find(c =>
                    c.title.toLowerCase().includes(config.columnTitle.toLowerCase())
                );
            }

            if (!targetColumn) {
                throw new Error(`Columna destino no encontrada: ${config.columnId || config.columnTitle}`);
            }

            // Actualizar en Supabase
            const { error } = await supabase
                .from('tasks')
                .update({ column_id: targetColumn.id })
                .eq('id', task.id);

            if (error) throw error;

            return {
                success: true,
                message: `Tarea movida a "${targetColumn.title}"`,
                newColumnId: targetColumn.id
            };
        }
    },

    'create_task': {
        name: 'Crear tarea',
        description: 'Crea una nueva tarea',
        icon: '✨',
        category: 'tasks',
        configFields: [
            { key: 'title', label: 'Título', type: 'text', required: true },
            { key: 'description', label: 'Descripción', type: 'textarea', required: false },
            { key: 'columnId', label: 'En columna', type: 'column_select', required: true }
        ],
        execute: async (config, _context) => {
            const { data, error } = await supabase
                .from('tasks')
                .insert([{
                    title: config.title,
                    description: config.description || '',
                    column_id: config.columnId,
                    position: 0 // Se añade al principio
                }])
                .select()
                .single();

            if (error) throw error;

            return {
                success: true,
                message: `Tarea "${config.title}" creada`,
                taskId: data.id
            };
        }
    },

    'update_task': {
        name: 'Actualizar tarea',
        description: 'Modifica campos de la tarea',
        icon: '📝',
        category: 'tasks',
        configFields: [
            {
                key: 'field', label: 'Campo', type: 'select',
                options: ['title', 'description', 'priority'], required: true
            },
            { key: 'value', label: 'Nuevo valor', type: 'text', required: true }
        ],
        execute: async (config, context) => {
            const { task } = context;
            if (!task) throw new Error('No hay tarea en el contexto');

            const updateData = { [config.field]: config.value };

            const { error } = await supabase
                .from('tasks')
                .update(updateData)
                .eq('id', task.id);

            if (error) throw error;

            return {
                success: true,
                message: `Campo "${config.field}" actualizado`,
                field: config.field,
                value: config.value
            };
        }
    },

    // ========================================
    // ACCIONES DE COMENTARIOS
    // ========================================
    'add_comment': {
        name: 'Añadir comentario',
        description: 'Añade un comentario automático a la tarea',
        icon: '💬',
        category: 'comments',
        configFields: [
            { key: 'text', label: 'Texto del comentario', type: 'textarea', required: true }
        ],
        execute: async (config, context) => {
            const { task, userId } = context;
            if (!task) throw new Error('No hay tarea en el contexto');
            if (!userId) throw new Error('No hay usuario en el contexto');

            // El supabase client ya tiene la sesión del usuario autenticado
            const { data, error } = await supabase
                .from('comments')
                .insert([{
                    task_id: task.id,
                    user_id: userId,
                    text: config.text
                }])
                .select()
                .single();

            if (error) {
                console.error('Error creando comentario:', error);
                throw new Error(`Error al crear comentario: ${error.message}`);
            }

            return {
                success: true,
                message: 'Comentario añadido',
                commentId: data?.id
            };
        }
    },

    // ========================================
    // ACCIONES DE NOTIFICACIÓN
    // ========================================
    'in_app_notification': {
        name: 'Notificación en app',
        description: 'Muestra una notificación toast en la aplicación',
        icon: '🔔',
        category: 'notifications',
        configFields: [
            { key: 'message', label: 'Mensaje', type: 'text', required: true },
            {
                key: 'type', label: 'Tipo', type: 'select',
                options: ['success', 'error', 'info'], default: 'info', required: false
            }
        ],
        execute: async (config, _context) => {
            const type = config.type || 'info';
            const message = config.message;

            // Mostrar toast según el tipo
            switch (type) {
                case 'success':
                    toast.success(message, { icon: '✅' });
                    break;
                case 'error':
                    toast.error(message, { icon: '❌' });
                    break;
                default:
                    toast(message, { icon: '💡' });
            }

            return {
                success: true,
                message: `Notificación mostrada: ${message}`,
                type
            };
        }
    },

    'push_notification': {
        name: 'Notificación push',
        description: 'Envía una notificación push del navegador',
        icon: '📲',
        category: 'notifications',
        configFields: [
            { key: 'title', label: 'Título', type: 'text', required: true },
            { key: 'body', label: 'Mensaje', type: 'text', required: true }
        ],
        execute: async (config, _context) => {
            // Verificar soporte y permisos
            if (!('Notification' in window)) {
                throw new Error('Notificaciones push no soportadas en este navegador');
            }

            if (Notification.permission === 'denied') {
                throw new Error('Permisos de notificación denegados');
            }

            if (Notification.permission !== 'granted') {
                const permission = await Notification.requestPermission();
                if (permission !== 'granted') {
                    throw new Error('Permisos de notificación no concedidos');
                }
            }

            // Mostrar notificación
            new Notification(config.title, {
                body: config.body,
                icon: '/favicon.ico',
                tag: `automation-${Date.now()}`
            });

            return {
                success: true,
                message: `Push enviado: ${config.title}`
            };
        }
    },

    'send_email': {
        name: 'Enviar email',
        description: 'Envía un email usando Supabase Edge Function',
        icon: '📧',
        category: 'notifications',
        configFields: [
            { key: 'to', label: 'Destinatario(s)', type: 'text', required: true, placeholder: 'email@example.com' },
            { key: 'subject', label: 'Asunto', type: 'text', required: true },
            { key: 'body', label: 'Mensaje', type: 'textarea', required: true },
            {
                key: 'format',
                label: 'Formato',
                type: 'select',
                options: ['text', 'html'],
                default: 'text',
                required: false
            }
        ],
        execute: async (config, _context) => {
            const { to, subject, body, format } = config;

            // Preparar email data
            const emailData = {
                to: to.includes(',') ? to.split(',').map(e => e.trim()) : to,
                subject,
                [format === 'html' ? 'html' : 'text']: body
            };

            // Llamar Edge Function
            const { data, error } = await supabase.functions.invoke('send-automation-email', {
                body: emailData
            });

            if (error) {
                console.error('Error enviando email:', error);
                throw new Error(`Error al enviar email: ${error.message}`);
            }

            if (!data.success) {
                throw new Error(data.error || 'Error desconocido al enviar email');
            }

            return {
                success: true,
                message: `Email enviado a ${to}`,
                emailId: data.emailId
            };
        }
    },

    // ========================================
    // ACCIONES DE INTEGRACIÓN
    // ========================================
    'webhook': {
        name: 'Webhook',
        description: 'Envía una petición HTTP a una URL externa con retry y autenticación',
        icon: '🌐',
        category: 'integrations',
        configFields: [
            { key: 'url', label: 'URL', type: 'text', required: true },
            {
                key: 'method', label: 'Método', type: 'select',
                options: ['POST', 'GET', 'PUT', 'PATCH', 'DELETE'], default: 'POST', required: false
            },
            { key: 'headers', label: 'Headers (JSON)', type: 'textarea', required: false, placeholder: '{"X-API-Key": "tu-api-key"}' },
            { key: 'body', label: 'Body (JSON)', type: 'textarea', required: false },
            {
                key: 'authType',
                label: 'Tipo de autenticación',
                type: 'select',
                options: ['none', 'bearer', 'basic', 'api_key'],
                default: 'none',
                required: false
            },
            { key: 'authToken', label: 'Token/API Key', type: 'text', required: false },
            { key: 'retries', label: 'Reintentos', type: 'number', default: 0, required: false }
        ],
        execute: async (config, context) => {
            const method = config.method || 'POST';
            const maxRetries = parseInt(config.retries) || 0;
            let headers = { 'Content-Type': 'application/json' };
            let body = null;

            // Añadir autenticación
            if (config.authType && config.authType !== 'none' && config.authToken) {
                switch (config.authType) {
                    case 'bearer':
                        headers['Authorization'] = `Bearer ${config.authToken}`;
                        break;
                    case 'basic':
                        headers['Authorization'] = `Basic ${btoa(config.authToken)}`;
                        break;
                    case 'api_key':
                        headers['X-API-Key'] = config.authToken;
                        break;
                }
            }

            // Parsear headers personalizados
            if (config.headers) {
                try {
                    headers = { ...headers, ...JSON.parse(config.headers) };
                } catch (_e) {
                    throw new Error('Headers JSON inválido');
                }
            }

            // Preparar body
            if (config.body && method !== 'GET') {
                try {
                    const bodyObj = JSON.parse(config.body);
                    // Añadir contexto de automatización
                    bodyObj._automation = {
                        task_id: context.task?.id,
                        task_title: context.task?.title,
                        column_title: context.column?.title,
                        timestamp: new Date().toISOString()
                    };
                    body = JSON.stringify(bodyObj);
                } catch (_e) {
                    // Si no es JSON válido, enviar como texto
                    body = config.body;
                }
            }

            // Función de fetch con retry
            let lastError;
            for (let attempt = 0; attempt <= maxRetries; attempt++) {
                try {
                    const response = await fetch(config.url, {
                        method,
                        headers,
                        body: method !== 'GET' ? body : undefined
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }

                    const responseData = await response.text();
                    let parsedData;
                    try {
                        parsedData = JSON.parse(responseData);
                    } catch {
                        parsedData = responseData;
                    }

                    return {
                        success: true,
                        message: `Webhook exitoso (${response.status})`,
                        status: response.status,
                        data: parsedData
                    };
                } catch (error) {
                    lastError = error;
                    if (attempt < maxRetries) {
                        // Esperar antes de reintentar (exponential backoff)
                        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
                    }
                }
            }

            throw new Error(`Webhook falló después de ${maxRetries + 1} intentos: ${lastError.message}`);
        }
    },

    // ========================================
    // ACCIONES DE LÓGICA
    // ========================================
    'delay': {
        name: 'Esperar',
        description: 'Pausa la ejecución por un tiempo',
        icon: '⏳',
        category: 'logic',
        configFields: [
            { key: 'seconds', label: 'Segundos', type: 'number', default: 5, required: true }
        ],
        execute: async (config) => {
            const seconds = config.seconds || 5;
            await new Promise(resolve => setTimeout(resolve, seconds * 1000));

            return {
                success: true,
                message: `Esperó ${seconds} segundos`
            };
        }
    }
};

export const ActionRegistry = {
    /**
     * Obtiene todas las acciones disponibles
     */
    getAll() {
        return Object.entries(ACTIONS).map(([type, action]) => ({
            type,
            ...action
        }));
    },

    /**
     * Obtiene una acción específica por tipo
     */
    get(type) {
        return ACTIONS[type] ? { type, ...ACTIONS[type] } : null;
    },

    /**
     * Ejecuta una acción
     */
    async execute(type, config, context) {
        const action = ACTIONS[type];
        if (!action) {
            throw new Error(`Acción desconocida: ${type}`);
        }

        return await action.execute(config, context);
    },

    /**
     * Obtiene las acciones agrupadas por categoría
     */
    getGrouped() {
        const grouped = {};

        Object.entries(ACTIONS).forEach(([type, action]) => {
            const category = action.category || 'other';
            if (!grouped[category]) {
                grouped[category] = [];
            }
            grouped[category].push({ type, ...action });
        });

        return grouped;
    },

    /**
     * Obtiene los nombres de categorías
     */
    getCategoryNames() {
        return {
            tasks: 'Tareas',
            comments: 'Comentarios',
            notifications: 'Notificaciones',
            integrations: 'Integraciones',
            logic: 'Lógica'
        };
    }
};

export default ActionRegistry;
