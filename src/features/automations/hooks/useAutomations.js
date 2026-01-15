/**
 * useAutomations Hook
 * Hook para gestionar automatizaciones del usuario
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import { AutomationEngine } from '../index';
import logger from '../../../utils/logger';

export const useAutomations = (boardId = null, context = 'boards') => {
    const { currentUser } = useAuth();
    const [automations, setAutomations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Get trigger type patterns based on context
    const getTriggerPatterns = (ctx) => {
        switch (ctx) {
            case 'crm':
                return ['opportunity.%', 'contact.%', 'crm_activity.%'];
            case 'calendar':
                return ['event.%'];
            default: // boards
                return ['task.%', 'checklist.%', 'comment.%', 'schedule.%'];
        }
    };

    // Cargar automatizaciones
    const fetchAutomations = useCallback(async () => {
        if (!currentUser) {
            setAutomations([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            let query = supabase
                .from('automations')
                .select('*')
                .eq('user_id', currentUser.id)
                .order('created_at', { ascending: false });

            // Filter by board for board context
            if (context === 'boards' && boardId) {
                query = query.or(`board_id.eq.${boardId},board_id.is.null`);
            } else if (context !== 'boards') {
                // For CRM/Calendar, only show automations without board_id
                query = query.is('board_id', null);
            }

            const { data, error: fetchError } = await query;

            if (fetchError) throw fetchError;

            // Client-side filter by trigger type patterns
            const patterns = getTriggerPatterns(context);
            const filtered = (data || []).filter(automation => {
                return patterns.some(pattern => {
                    const prefix = pattern.replace('%', '');
                    return automation.trigger_type.startsWith(prefix);
                });
            });

            setAutomations(filtered);
            setError(null);
        } catch (err) {
            logger.error('useAutomations', 'Error fetching:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [currentUser, boardId, context]);

    // Crear automatización
    const createAutomation = useCallback(async (automationData) => {
        if (!currentUser) throw new Error('Usuario no autenticado');

        const newAutomation = {
            user_id: currentUser.id,
            board_id: boardId,
            name: automationData.name,
            description: automationData.description || '',
            icon: automationData.icon || '⚡',
            trigger_type: automationData.trigger_type,
            trigger_config: automationData.trigger_config || {},
            conditions: automationData.conditions || [],
            condition_logic: automationData.condition_logic || 'AND',
            actions: automationData.actions || [],
            is_enabled: automationData.is_enabled !== false
        };

        const { data, error: insertError } = await supabase
            .from('automations')
            .insert([newAutomation])
            .select()
            .single();

        if (insertError) throw insertError;

        setAutomations(prev => [data, ...prev]);

        // Refrescar el motor
        await AutomationEngine.refresh();

        return data;
    }, [currentUser, boardId]);

    // Actualizar automatización
    const updateAutomation = useCallback(async (id, updates) => {
        const { data, error: updateError } = await supabase
            .from('automations')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (updateError) throw updateError;

        setAutomations(prev => prev.map(a => a.id === id ? data : a));

        // Refrescar el motor
        await AutomationEngine.refresh();

        return data;
    }, []);

    // Eliminar automatización
    const deleteAutomation = useCallback(async (id) => {
        const { error: deleteError } = await supabase
            .from('automations')
            .delete()
            .eq('id', id);

        if (deleteError) throw deleteError;

        setAutomations(prev => prev.filter(a => a.id !== id));

        // Refrescar el motor
        await AutomationEngine.refresh();
    }, []);

    // Toggle enabled/disabled
    const toggleAutomation = useCallback(async (id) => {
        const automation = automations.find(a => a.id === id);
        if (!automation) return;

        return updateAutomation(id, { is_enabled: !automation.is_enabled });
    }, [automations, updateAutomation]);

    // Duplicar automatización
    const duplicateAutomation = useCallback(async (id) => {
        const automation = automations.find(a => a.id === id);
        if (!automation) return;

        const duplicate = {
            name: `${automation.name} (copia)`,
            description: automation.description,
            icon: automation.icon,
            trigger_type: automation.trigger_type,
            trigger_config: automation.trigger_config,
            conditions: automation.conditions,
            condition_logic: automation.condition_logic,
            actions: automation.actions,
            is_enabled: false // Duplicados empiezan deshabilitados
        };

        return createAutomation(duplicate);
    }, [automations, createAutomation]);

    // Obtener logs de una automatización
    const getAutomationLogs = useCallback(async (automationId, limit = 20) => {
        const { data, error } = await supabase
            .from('automation_logs')
            .select('*')
            .eq('automation_id', automationId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    }, []);

    // Cargar al montar
    useEffect(() => {
        fetchAutomations();
    }, [fetchAutomations]);

    // Inicializar el motor cuando hay usuario
    useEffect(() => {
        if (currentUser) {
            AutomationEngine.initialize(currentUser.id);
        }
    }, [currentUser]);

    return {
        automations,
        loading,
        error,
        fetchAutomations,
        createAutomation,
        updateAutomation,
        deleteAutomation,
        toggleAutomation,
        duplicateAutomation,
        getAutomationLogs
    };
};

export default useAutomations;
