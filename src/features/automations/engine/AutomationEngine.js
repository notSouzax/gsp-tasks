/**
 * AUTOMATION ENGINE
 * Motor central que gestiona la ejecución de automatizaciones
 * 
 * Responsabilidades:
 * - Escuchar eventos (triggers)
 * - Evaluar condiciones
 * - Ejecutar acciones en secuencia
 * - Registrar logs de ejecución
 */

import { supabase } from '../../../lib/supabaseClient';
import { TriggerRegistry } from './TriggerRegistry';
import { ActionRegistry } from './ActionRegistry';
import { ConditionEvaluator } from './ConditionEvaluator';
import { VariableResolver } from './VariableResolver';
import logger from '../../../utils/logger';

class AutomationEngineClass {
    constructor() {
        this.automations = [];
        this.userId = null;
        this.isInitialized = false;
        this.eventListeners = {}; // Event system for data refresh
    }

    /**
     * Inicializa el motor con las automatizaciones del usuario
     */
    async initialize(userId) {
        if (this.isInitialized && this.userId === userId) {
            return;
        }

        this.userId = userId;
        await this.loadAutomations();
        this.isInitialized = true;
        logger.info('AutomationEngine', `Inicializado con ${this.automations.length} automatizaciones`);
    }

    /**
     * Carga las automatizaciones activas del usuario desde Supabase
     */
    async loadAutomations() {
        if (!this.userId) return;

        try {
            const { data, error } = await supabase
                .from('automations')
                .select('*')
                .eq('user_id', this.userId)
                .eq('is_enabled', true);

            if (error) {
                logger.error('AutomationEngine', 'Error cargando automatizaciones:', error);
                return;
            }

            this.automations = data || [];
        } catch (err) {
            logger.error('AutomationEngine', 'Error inesperado:', err);
        }
    }

    /**
     * Refresca las automatizaciones (llamar después de crear/editar/eliminar)
     */
    async refresh() {
        await this.loadAutomations();
    }

    /**
     * Dispara un evento y ejecuta las automatizaciones que coincidan
     * @param {string} triggerType - Tipo de trigger (ej: 'task.moved_to')
     * @param {object} context - Datos del contexto del evento
     */
    async trigger(triggerType, context) {
        if (!this.isInitialized) {
            logger.warn('AutomationEngine', 'Motor no inicializado, ignorando trigger:', triggerType);
            return;
        }

        // Encontrar automatizaciones que coincidan con este trigger
        const matchingAutomations = this.automations.filter(
            auto => auto.trigger_type === triggerType
        );

        if (matchingAutomations.length === 0) {
            return;
        }

        logger.info('AutomationEngine', `Trigger "${triggerType}" disparado, ${matchingAutomations.length} automatizaciones coinciden`);

        // Ejecutar cada automatización
        for (const automation of matchingAutomations) {
            await this.executeAutomation(automation, context);
        }
    }

    /**
     * Ejecuta una automatización específica
     */
    async executeAutomation(automation, context) {
        const startTime = Date.now();
        const executionLog = {
            automation_id: automation.id,
            trigger_data: context,
            actions_executed: [],
            status: 'success',
            error_message: null,
            duration_ms: 0
        };

        try {
            // 1. Verificar que el trigger coincide con la configuración
            const triggerMatch = TriggerRegistry.evaluate(
                automation.trigger_type,
                automation.trigger_config,
                context
            );

            if (!triggerMatch) {
                executionLog.status = 'skipped';
                executionLog.error_message = 'Trigger config no coincide';
                await this.saveLog(executionLog, startTime);
                return;
            }

            // 2. Evaluar condiciones (si existen)
            if (automation.conditions && automation.conditions.length > 0) {
                const conditionsMet = ConditionEvaluator.evaluate(
                    automation.conditions,
                    automation.condition_logic,
                    context
                );

                if (!conditionsMet) {
                    executionLog.status = 'skipped';
                    executionLog.error_message = 'Condiciones no cumplidas';
                    await this.saveLog(executionLog, startTime);
                    return;
                }
            }

            // 3. Ejecutar acciones en secuencia
            for (const action of automation.actions) {
                try {
                    // Resolver variables en la configuración de la acción
                    const resolvedConfig = VariableResolver.resolve(action.config, context);

                    // Ejecutar la acción
                    const result = await ActionRegistry.execute(
                        action.type,
                        resolvedConfig,
                        context
                    );

                    executionLog.actions_executed.push({
                        type: action.type,
                        config: resolvedConfig,
                        result: result,
                        success: true
                    });

                    // Actualizar contexto con resultado de la acción (para encadenamiento)
                    context.lastActionResult = result;

                    // Emitir evento para que la UI se actualice
                    this.emit('dataChanged', {
                        action: action.type,
                        task: context.task,
                        result: result
                    });

                } catch (actionError) {
                    executionLog.actions_executed.push({
                        type: action.type,
                        config: action.config,
                        error: actionError.message,
                        success: false
                    });
                    executionLog.status = 'partial';
                    logger.error('AutomationEngine', `Error en acción ${action.type}:`, actionError);
                }
            }

            // 4. Incrementar contador de ejecuciones
            await supabase.rpc('increment_automation_run_count', {
                automation_uuid: automation.id
            });

            logger.info('AutomationEngine', `Automatización "${automation.name}" ejecutada correctamente`);

        } catch (err) {
            executionLog.status = 'failed';
            executionLog.error_message = err.message;
            logger.error('AutomationEngine', `Error ejecutando "${automation.name}":`, err);

            // Guardar error en la automatización
            await supabase
                .from('automations')
                .update({ last_error: err.message })
                .eq('id', automation.id);
        }

        await this.saveLog(executionLog, startTime);
    }

    /**
     * Guarda el log de ejecución
     */
    async saveLog(log, startTime) {
        log.duration_ms = Date.now() - startTime;

        try {
            await supabase.from('automation_logs').insert([log]);
        } catch (err) {
            logger.error('AutomationEngine', 'Error guardando log:', err);
        }
    }

    /**
     * Obtiene las automatizaciones activas para un trigger específico
     */
    getAutomationsForTrigger(triggerType) {
        return this.automations.filter(a => a.trigger_type === triggerType);
    }

    /**
     * Sistema de eventos para notificar cambios
     */
    on(event, callback) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
    }

    off(event, callback) {
        if (!this.eventListeners[event]) return;
        this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
    }

    emit(event, data) {
        if (!this.eventListeners[event]) return;
        this.eventListeners[event].forEach(callback => callback(data));
    }

    /**
     * Limpia el motor (para logout)
     */
    reset() {
        this.automations = [];
        this.userId = null;
        this.isInitialized = false;
        this.eventListeners = {};
    }
}

// Singleton
export const AutomationEngine = new AutomationEngineClass();
export default AutomationEngine;
