import { useCallback } from 'react';
import { supabase } from '../../../lib/supabaseClient';

/**
 * Hook para gestionar notas del CRM
 * @param {Object} currentUser - Usuario autenticado
 * @returns {Object} Operaciones de notas
 */
export const useCRMNotes = (currentUser) => {
    const createNote = useCallback(async (noteData) => {
        if (!currentUser) return null;

        const { data, error } = await supabase
            .from('crm_notes')
            .insert([{ ...noteData, user_id: currentUser.id }])
            .select()
            .single();

        if (error) {
            console.error('Error creating note:', error);
            throw error;
        }

        return data;
    }, [currentUser]);

    const fetchNotes = useCallback(async (entityType, entityId) => {
        const column = `${entityType}_id`;

        const { data, error } = await supabase
            .from('crm_notes')
            .select('*')
            .eq(column, entityId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching notes:', error);
            return [];
        }

        return data || [];
    }, []);

    return {
        createNote,
        fetchNotes
    };
};
