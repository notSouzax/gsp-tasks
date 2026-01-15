import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabaseClient';

/**
 * Hook para gestionar actividades del CRM
 * @param {Object} currentUser - Usuario autenticado
 * @returns {Object} Estado y operaciones de actividades
 */
export const useActivities = (currentUser) => {
    const [activities, setActivities] = useState([]);

    const fetchActivities = useCallback(async () => {
        if (!currentUser) return;

        const { data, error } = await supabase
            .from('crm_activities')
            .select(`
                *,
                contact:crm_contacts(id, first_name, last_name),
                opportunity:crm_opportunities(id, name)
            `)
            .eq('user_id', currentUser.id)
            .eq('is_done', false)
            .order('due_date', { ascending: true });

        if (error) {
            console.error('Error fetching activities:', error);
            return;
        }

        setActivities(data || []);
    }, [currentUser]);

    const createActivity = useCallback(async (activityData) => {
        if (!currentUser) return null;

        const { data, error } = await supabase
            .from('crm_activities')
            .insert([{ ...activityData, user_id: currentUser.id }])
            .select(`
                *,
                contact:crm_contacts(id, first_name, last_name),
                opportunity:crm_opportunities(id, name)
            `)
            .single();

        if (error) {
            console.error('Error creating activity:', error);
            throw error;
        }

        setActivities(prev => [...prev, data].sort((a, b) =>
            new Date(a.due_date) - new Date(b.due_date)
        ));
        return data;
    }, [currentUser]);

    const updateActivity = useCallback(async (id, updates) => {
        const { data, error } = await supabase
            .from('crm_activities')
            .update(updates)
            .eq('id', id)
            .select(`
                *,
                contact:crm_contacts(id, first_name, last_name),
                opportunity:crm_opportunities(id, name)
            `)
            .single();

        if (error) {
            console.error('Error updating activity:', error);
            throw error;
        }

        if (data.is_done) {
            setActivities(prev => prev.filter(a => a.id !== id));
        } else {
            setActivities(prev => prev.map(a => a.id === id ? data : a));
        }
        return data;
    }, []);

    const completeActivity = useCallback(async (id, outcome = null, outcomeNotes = null) => {
        const { data, error } = await supabase
            .from('crm_activities')
            .update({
                is_done: true,
                completed_at: new Date().toISOString(),
                outcome,
                outcome_notes: outcomeNotes
            })
            .eq('id', id)
            .select(`
                *,
                contact:crm_contacts(id, first_name, last_name),
                opportunity:crm_opportunities(id, name)
            `)
            .single();

        if (error) {
            console.error('Error completing activity:', error);
            throw error;
        }

        setActivities(prev => prev.filter(a => a.id !== id));
        return data;
    }, []);

    const deleteActivity = useCallback(async (id) => {
        const { error } = await supabase
            .from('crm_activities')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting activity:', error);
            throw error;
        }

        setActivities(prev => prev.filter(a => a.id !== id));
    }, []);

    return {
        activities,
        setActivities,
        fetchActivities,
        createActivity,
        updateActivity,
        completeActivity,
        deleteActivity
    };
};
