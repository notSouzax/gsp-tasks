import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabaseClient';

/**
 * Hook para gestionar compañías del CRM con React Query
 * @param {Object} currentUser - Usuario autenticado
 */
export const useCompanies = (currentUser) => {
    const queryClient = useQueryClient();
    const userId = currentUser?.id;

    const { data: companies = [], isLoading, error } = useQuery({
        queryKey: ['crm', 'companies', userId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('crm_companies')
                .select('*')
                .eq('user_id', userId)
                .order('name', { ascending: true });
            if (error) throw error;
            return data || [];
        },
        enabled: !!userId,
        staleTime: 30_000,
    });

    const createCompany = useMutation({
        mutationFn: async (companyData) => {
            const { data, error } = await supabase
                .from('crm_companies')
                .insert([{ ...companyData, user_id: userId }])
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crm', 'companies'] }),
    });

    const updateCompany = useMutation({
        mutationFn: async ({ id, updates }) => {
            const { data, error } = await supabase
                .from('crm_companies')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crm', 'companies'] }),
    });

    const deleteCompany = useMutation({
        mutationFn: async (id) => {
            const { error } = await supabase
                .from('crm_companies')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crm', 'companies'] }),
    });

    return {
        companies,
        isLoading,
        error,
        createCompany: (data) => createCompany.mutateAsync(data),
        updateCompany: (id, updates) => updateCompany.mutateAsync({ id, updates }),
        deleteCompany: (id) => deleteCompany.mutateAsync(id),
    };
};
