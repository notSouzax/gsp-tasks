import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay, addDays, subDays } from 'date-fns';

/**
 * Computes date range based on view + currentDate, with 2-day buffer.
 */
const getDateRange = (view, currentDate) => {
    let start, end;
    if (view === 'month') {
        start = startOfMonth(currentDate);
        end = endOfMonth(currentDate);
    } else if (view === 'week') {
        start = startOfWeek(currentDate, { weekStartsOn: 1 });
        end = endOfWeek(currentDate, { weekStartsOn: 1 });
    } else {
        start = startOfDay(currentDate);
        end = endOfDay(currentDate);
    }
    return {
        dateStrStart: format(subDays(start, 2), 'yyyy-MM-dd'),
        dateStrEnd: format(addDays(end, 2), 'yyyy-MM-dd'),
    };
};

/**
 * Hook que centraliza todas las queries y mutations del Calendar con React Query.
 */
export const useCalendarQueries = (user, currentDate, view) => {
    const queryClient = useQueryClient();
    const userId = user?.id;
    const { dateStrStart, dateStrEnd } = getDateRange(view, currentDate);

    // =====================================================
    // QUERIES
    // =====================================================

    const { data: events = [], isLoading: eventsLoading } = useQuery({
        queryKey: ['calendar', 'events', userId, dateStrStart, dateStrEnd],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('calendar_events')
                .select('*')
                .eq('user_id', userId)
                .gte('date', dateStrStart)
                .lte('date', dateStrEnd)
                .order('start_time');
            if (error) throw error;
            return data || [];
        },
        enabled: !!userId,
        staleTime: 30_000,
    });

    const { data: tags = [] } = useQuery({
        queryKey: ['calendar', 'tags', userId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('calendar_tags')
                .select('*')
                .eq('user_id', userId)
                .order('name');
            if (error) throw error;
            return data || [];
        },
        enabled: !!userId,
        staleTime: 60_000,
    });

    const { data: integrations = [] } = useQuery({
        queryKey: ['calendar', 'integrations', userId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('calendar_integrations')
                .select('*')
                .eq('user_id', userId);
            if (error) throw error;
            return data || [];
        },
        enabled: !!userId,
        staleTime: 60_000,
    });

    const { data: crmActivities = [] } = useQuery({
        queryKey: ['calendar', 'crm-activities', userId, dateStrStart, dateStrEnd],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('crm_activities')
                .select('*, contact:crm_contacts(first_name, last_name), opportunity:crm_opportunities(name)')
                .eq('user_id', userId)
                .gte('due_date', dateStrStart)
                .lte('due_date', dateStrEnd)
                .eq('is_done', false)
                .order('due_date');
            if (error) {
                console.log('CRM activities not available:', error.message);
                return [];
            }
            return data || [];
        },
        enabled: !!userId,
        staleTime: 30_000,
    });

    const { data: crmOpportunities = [] } = useQuery({
        queryKey: ['calendar', 'crm-opportunities', userId, dateStrStart, dateStrEnd],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('crm_opportunities')
                .select('*, stage:crm_stages(name, color)')
                .eq('user_id', userId)
                .gte('expected_close_date', dateStrStart)
                .lte('expected_close_date', dateStrEnd)
                .is('is_won', false)
                .is('is_lost', false)
                .order('expected_close_date');
            if (error) {
                console.log('CRM opportunities not available:', error.message);
                return [];
            }
            return data || [];
        },
        enabled: !!userId,
        staleTime: 30_000,
    });

    // =====================================================
    // MUTATIONS
    // =====================================================

    const invalidateEvents = () => queryClient.invalidateQueries({ queryKey: ['calendar', 'events'] });
    const invalidateTags = () => queryClient.invalidateQueries({ queryKey: ['calendar', 'tags'] });
    const invalidateIntegrations = () => queryClient.invalidateQueries({ queryKey: ['calendar', 'integrations'] });

    // --- Tag mutations ---
    const addTagMut = useMutation({
        mutationFn: async ({ name, color }) => {
            const { data, error } = await supabase
                .from('calendar_tags')
                .insert([{ user_id: userId, name: name.trim(), color }])
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: invalidateTags,
    });

    const updateTagMut = useMutation({
        mutationFn: async ({ id, name, color }) => {
            const { error } = await supabase
                .from('calendar_tags')
                .update({ name: name.trim(), color })
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            invalidateTags();
            invalidateEvents(); // Reload events to reflect color changes
        },
    });

    const deleteTagMut = useMutation({
        mutationFn: async (id) => {
            const { error } = await supabase
                .from('calendar_tags')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            invalidateTags();
            invalidateEvents();
        },
    });

    // --- Integration mutation ---
    const updateIntegrationMut = useMutation({
        mutationFn: async (integrationData) => {
            const { error } = await supabase
                .from('calendar_integrations')
                .upsert({
                    user_id: userId,
                    slug: integrationData.slug,
                    name: integrationData.name.trim(),
                    color: integrationData.color,
                    is_visible: integrationData.is_visible
                }, { onConflict: 'user_id, slug' });
            if (error) throw error;
        },
        onSuccess: invalidateIntegrations,
    });

    // --- Event drag (optimistic) ---
    const moveEventMut = useMutation({
        mutationFn: async ({ eventId, date, start_time, end_time }) => {
            const { error } = await supabase
                .from('calendar_events')
                .update({ date, start_time, end_time })
                .eq('id', eventId);
            if (error) throw error;
        },
        onMutate: async ({ eventId, date, start_time, end_time }) => {
            await queryClient.cancelQueries({ queryKey: ['calendar', 'events'] });
            const prevKey = ['calendar', 'events', userId, dateStrStart, dateStrEnd];
            const prev = queryClient.getQueryData(prevKey);
            queryClient.setQueryData(prevKey, (old) =>
                (old || []).map(e =>
                    e.id === eventId ? { ...e, date, start_time, end_time } : e
                )
            );
            return { prev, prevKey };
        },
        onError: (_err, _vars, context) => {
            if (context?.prev) {
                queryClient.setQueryData(context.prevKey, context.prev);
            }
        },
        onSettled: invalidateEvents,
    });

    return {
        // Data
        events,
        tags,
        integrations,
        crmActivities,
        crmOpportunities,
        loading: eventsLoading,

        // Tag operations
        addTag: (name, color) => addTagMut.mutateAsync({ name, color }),
        updateTag: (tag) => updateTagMut.mutateAsync(tag),
        deleteTag: (id) => deleteTagMut.mutateAsync(id),

        // Integration operations
        updateIntegration: (data) => updateIntegrationMut.mutateAsync(data),

        // Event drag
        moveEvent: (eventId, date, start_time, end_time) =>
            moveEventMut.mutateAsync({ eventId, date, start_time, end_time }),

        // Refresh
        invalidateEvents,
    };
};
