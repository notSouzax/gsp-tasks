import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabaseClient';

const CONTACTS_SELECT = `*, company:crm_companies(id, name)`;

/**
 * Hook para gestionar contactos del CRM con React Query
 * @param {Object} currentUser - Usuario autenticado
 */
export const useContacts = (currentUser) => {
    const queryClient = useQueryClient();
    const userId = currentUser?.id;

    const { data: contacts = [], isLoading, error } = useQuery({
        queryKey: ['crm', 'contacts', userId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('crm_contacts')
                .select(CONTACTS_SELECT)
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        },
        enabled: !!userId,
        staleTime: 30_000,
    });

    const createContact = useMutation({
        mutationFn: async (contactData) => {
            const { data, error } = await supabase
                .from('crm_contacts')
                .insert([{ ...contactData, user_id: userId }])
                .select(CONTACTS_SELECT)
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crm', 'contacts'] }),
    });

    const updateContact = useMutation({
        mutationFn: async ({ id, updates }) => {
            const { data, error } = await supabase
                .from('crm_contacts')
                .update(updates)
                .eq('id', id)
                .select(CONTACTS_SELECT)
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crm', 'contacts'] }),
    });

    const deleteContact = useMutation({
        mutationFn: async (id) => {
            const { error } = await supabase
                .from('crm_contacts')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crm', 'contacts'] }),
    });

    return {
        contacts,
        isLoading,
        error,
        createContact: (data) => createContact.mutateAsync(data),
        updateContact: (id, updates) => updateContact.mutateAsync({ id, updates }),
        deleteContact: (id) => deleteContact.mutateAsync(id),
    };
};
