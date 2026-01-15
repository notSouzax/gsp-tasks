import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabaseClient';

/**
 * Hook para gestionar oportunidades del CRM
 * @param {Object} currentUser - Usuario autenticado
 * @param {string} activePipelineId - ID del pipeline activo
 * @param {Array} activeStages - Etapas del pipeline activo
 * @param {Function} fetchOpportunitiesRef - Referencia para recargar (para revert en errores)
 * @returns {Object} Estado y operaciones de oportunidades
 */
export const useOpportunities = (currentUser, activePipelineId, activeStages) => {
    const [opportunities, setOpportunities] = useState([]);

    const fetchOpportunities = useCallback(async () => {
        if (!currentUser) return;

        const { data, error } = await supabase
            .from('crm_opportunities')
            .select(`
                *,
                contact:crm_contacts(id, first_name, last_name, email),
                company:crm_companies(id, name),
                stage:crm_stages(id, name, color, is_won, is_lost)
            `)
            .eq('user_id', currentUser.id)
            .order('position', { ascending: true });

        if (error) {
            console.error('Error fetching opportunities:', error);
            return;
        }

        setOpportunities(data || []);
    }, [currentUser]);

    const createOpportunity = useCallback(async (opportunityData) => {
        if (!currentUser || !activePipelineId) return null;

        // Get default stage (first stage of pipeline)
        const defaultStage = activeStages[0];

        // Get current opportunities count for position
        const currentOpps = opportunities.filter(o =>
            o.stage_id === (opportunityData.stage_id || defaultStage?.id)
        );

        const { data, error } = await supabase
            .from('crm_opportunities')
            .insert([{
                ...opportunityData,
                user_id: currentUser.id,
                pipeline_id: activePipelineId,
                stage_id: opportunityData.stage_id || defaultStage?.id,
                position: currentOpps.length
            }])
            .select(`
                *,
                contact:crm_contacts(id, first_name, last_name, email),
                company:crm_companies(id, name),
                stage:crm_stages(id, name, color, is_won, is_lost)
            `)
            .single();

        if (error) {
            console.error('Error creating opportunity:', error);
            throw error;
        }

        setOpportunities(prev => [...prev, data]);
        return data;
    }, [currentUser, activePipelineId, activeStages, opportunities]);

    const updateOpportunity = useCallback(async (id, updates) => {
        const { data, error } = await supabase
            .from('crm_opportunities')
            .update(updates)
            .eq('id', id)
            .select(`
                *,
                contact:crm_contacts(id, first_name, last_name, email),
                company:crm_companies(id, name),
                stage:crm_stages(id, name, color, is_won, is_lost)
            `)
            .single();

        if (error) {
            console.error('Error updating opportunity:', error);
            throw error;
        }

        setOpportunities(prev => prev.map(o => o.id === id ? data : o));
        return data;
    }, []);

    const moveOpportunity = useCallback(async (opportunityId, newStageId, newPosition) => {
        // Optimistic update
        setOpportunities(prev => prev.map(o =>
            o.id === opportunityId
                ? { ...o, stage_id: newStageId, position: newPosition }
                : o
        ));

        const { error } = await supabase
            .from('crm_opportunities')
            .update({ stage_id: newStageId, position: newPosition })
            .eq('id', opportunityId);

        if (error) {
            console.error('Error moving opportunity:', error);
            // Revert on error - refetch
            await fetchOpportunities();
            throw error;
        }
    }, [fetchOpportunities]);

    const deleteOpportunity = useCallback(async (id) => {
        const { error } = await supabase
            .from('crm_opportunities')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting opportunity:', error);
            throw error;
        }

        setOpportunities(prev => prev.filter(o => o.id !== id));
    }, []);

    return {
        opportunities,
        setOpportunities,
        fetchOpportunities,
        createOpportunity,
        updateOpportunity,
        moveOpportunity,
        deleteOpportunity
    };
};
