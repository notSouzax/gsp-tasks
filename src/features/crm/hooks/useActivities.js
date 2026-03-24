import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabaseClient';

const ACTIVITIES_SELECT = `
    *,
    contact:crm_contacts(id, first_name, last_name),
    opportunity:crm_opportunities(id, name)
`;

/**
 * Hook para gestionar actividades del CRM con React Query
 * @param {Object} currentUser - Usuario autenticado
 */
export const useActivities = (currentUser) => {
    const queryClient = useQueryClient();
    const userId = currentUser?.id;

    const { data: activities = [], isLoading, error } = useQuery({
        queryKey: ['crm', 'activities', userId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('crm_activities')
                .select(ACTIVITIES_SELECT)
                .eq('user_id', userId)
                .eq('is_done', false)
                .order('due_date', { ascending: true });
            if (error) throw error;
            return data || [];
        },
        enabled: !!userId,
        staleTime: 30_000,
    });

    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['crm', 'activities'] });

    const createActivity = useMutation({
        mutationFn: async (activityData) => {
            const { data, error } = await supabase
                .from('crm_activities')
                .insert([{ ...activityData, user_id: userId }])
                .select(ACTIVITIES_SELECT)
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: invalidate,
    });

    const updateActivity = useMutation({
        mutationFn: async ({ id, updates }) => {
            const { data, error } = await supabase
                .from('crm_activities')
                .update(updates)
                .eq('id', id)
                .select(ACTIVITIES_SELECT)
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: invalidate,
    });

    const completeActivity = useMutation({
        mutationFn: async ({ id, outcome = null, outcomeNotes = null }) => {
            const { data, error } = await supabase
                .from('crm_activities')
                .update({
                    is_done: true,
                    completed_at: new Date().toISOString(),
                    outcome,
                    outcome_notes: outcomeNotes
                })
                .eq('id', id)
                .select(ACTIVITIES_SELECT)
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: invalidate,
    });

    const deleteActivity = useMutation({
        mutationFn: async (id) => {
            const { error } = await supabase
                .from('crm_activities')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: invalidate,
    });

    return {
        activities,
        isLoading,
        error,
        createActivity: (data) => createActivity.mutateAsync(data),
        updateActivity: (id, updates) => updateActivity.mutateAsync({ id, updates }),
        completeActivity: (id, outcome, outcomeNotes) =>
            completeActivity.mutateAsync({ id, outcome, outcomeNotes }),
        deleteActivity: (id) => deleteActivity.mutateAsync(id),
    };
};
