import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabaseClient';

/**
 * Hook para gestionar contactos del CRM
 * @param {Object} currentUser - Usuario autenticado
 * @returns {Object} Estado y operaciones de contactos
 */
export const useContacts = (currentUser) => {
    const [contacts, setContacts] = useState([]);

    const fetchContacts = useCallback(async () => {
        if (!currentUser) return;

        const { data, error } = await supabase
            .from('crm_contacts')
            .select(`
                *,
                company:crm_companies(id, name)
            `)
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching contacts:', error);
            return;
        }

        setContacts(data || []);
    }, [currentUser]);

    const createContact = useCallback(async (contactData) => {
        if (!currentUser) return null;

        const { data, error } = await supabase
            .from('crm_contacts')
            .insert([{ ...contactData, user_id: currentUser.id }])
            .select(`*, company:crm_companies(id, name)`)
            .single();

        if (error) {
            console.error('Error creating contact:', error);
            throw error;
        }

        setContacts(prev => [data, ...prev]);
        return data;
    }, [currentUser]);

    const updateContact = useCallback(async (id, updates) => {
        const { data, error } = await supabase
            .from('crm_contacts')
            .update(updates)
            .eq('id', id)
            .select(`*, company:crm_companies(id, name)`)
            .single();

        if (error) {
            console.error('Error updating contact:', error);
            throw error;
        }

        setContacts(prev => prev.map(c => c.id === id ? data : c));
        return data;
    }, []);

    const deleteContact = useCallback(async (id) => {
        const { error } = await supabase
            .from('crm_contacts')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting contact:', error);
            throw error;
        }

        setContacts(prev => prev.filter(c => c.id !== id));
    }, []);

    return {
        contacts,
        setContacts,
        fetchContacts,
        createContact,
        updateContact,
        deleteContact
    };
};
