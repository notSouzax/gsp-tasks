import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabaseClient';

const OPPORTUNITIES_SELECT = `
    *,
    contact:crm_contacts(id, first_name, last_name, email),
    company:crm_companies(id, name),
    stage:crm_stages(id, name, color, is_won, is_lost)
`;

/**
 * Hook para gestionar oportunidades del CRM con React Query
 * @param {Object} currentUser - Usuario autenticado
 * @param {string} activePipelineId - ID del pipeline activo
 * @param {Array} activeStages - Etapas del pipeline activo
 */
export const useOpportunities = (currentUser, activePipelineId, activeStages) => {
    const queryClient = useQueryClient();
    const userId = currentUser?.id;

    const { data: opportunities = [], isLoading, error } = useQuery({
        queryKey: ['crm', 'opportunities', userId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('crm_opportunities')
                .select(OPPORTUNITIES_SELECT)
                .eq('user_id', userId)
                .order('position', { ascending: true });
            if (error) throw error;
            return data || [];
        },
        enabled: !!userId,
        staleTime: 30_000,
    });

    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['crm', 'opportunities'] });

    const createOpportunity = useMutation({
        mutationFn: async (opportunityData) => {
            const defaultStage = activeStages[0];
            const currentOpps = opportunities.filter(o =>
                o.stage_id === (opportunityData.stage_id || defaultStage?.id)
            );

            const { data, error } = await supabase
                .from('crm_opportunities')
                .insert([{
                    ...opportunityData,
                    user_id: userId,
                    pipeline_id: activePipelineId,
                    stage_id: opportunityData.stage_id || defaultStage?.id,
                    position: currentOpps.length
                }])
                .select(OPPORTUNITIES_SELECT)
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: invalidate,
    });

    const updateOpportunity = useMutation({
        mutationFn: async ({ id, updates }) => {
            const { data, error } = await supabase
                .from('crm_opportunities')
                .update(updates)
                .eq('id', id)
                .select(OPPORTUNITIES_SELECT)
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: invalidate,
    });

    const moveOpportunity = useMutation({
        mutationFn: async ({ opportunityId, newStageId, newPosition }) => {
            const { error } = await supabase
                .from('crm_opportunities')
                .update({ stage_id: newStageId, position: newPosition })
                .eq('id', opportunityId);
            if (error) throw error;
        },
        // Optimistic update
        onMutate: async ({ opportunityId, newStageId, newPosition }) => {
            await queryClient.cancelQueries({ queryKey: ['crm', 'opportunities'] });
            const prev = queryClient.getQueryData(['crm', 'opportunities', userId]);
            queryClient.setQueryData(['crm', 'opportunities', userId], (old) =>
                (old || []).map(o =>
                    o.id === opportunityId
                        ? { ...o, stage_id: newStageId, position: newPosition }
                        : o
                )
            );
            return { prev };
        },
        onError: (_err, _vars, context) => {
            if (context?.prev) {
                queryClient.setQueryData(['crm', 'opportunities', userId], context.prev);
            }
        },
        onSettled: invalidate,
    });

    const deleteOpportunity = useMutation({
        mutationFn: async (id) => {
            const { error } = await supabase
                .from('crm_opportunities')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: invalidate,
    });

    return {
        opportunities,
        isLoading,
        error,
        createOpportunity: (data) => createOpportunity.mutateAsync(data),
        updateOpportunity: (id, updates) => updateOpportunity.mutateAsync({ id, updates }),
        moveOpportunity: (opportunityId, newStageId, newPosition) =>
            moveOpportunity.mutateAsync({ opportunityId, newStageId, newPosition }),
        deleteOpportunity: (id) => deleteOpportunity.mutateAsync(id),
    };
};
