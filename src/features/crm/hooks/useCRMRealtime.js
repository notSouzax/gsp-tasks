import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabaseClient';

/**
 * Hook que escucha cambios en tiempo real de las tablas CRM
 * e invalida los queries de React Query correspondientes.
 * 
 * @param {Object} currentUser - Usuario autenticado
 */
export const useCRMRealtime = (currentUser) => {
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!currentUser) return;

        const tableToQueryKey = {
            crm_pipelines: ['crm', 'pipelines'],
            crm_stages: ['crm', 'stages'],
            crm_contacts: ['crm', 'contacts'],
            crm_companies: ['crm', 'companies'],
            crm_opportunities: ['crm', 'opportunities'],
            crm_activities: ['crm', 'activities'],
        };

        const channel = supabase
            .channel('crm-realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'crm_pipelines', filter: `user_id=eq.${currentUser.id}` },
                () => queryClient.invalidateQueries({ queryKey: tableToQueryKey.crm_pipelines })
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'crm_stages' },
                () => queryClient.invalidateQueries({ queryKey: tableToQueryKey.crm_stages })
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'crm_contacts', filter: `user_id=eq.${currentUser.id}` },
                () => queryClient.invalidateQueries({ queryKey: tableToQueryKey.crm_contacts })
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'crm_companies', filter: `user_id=eq.${currentUser.id}` },
                () => queryClient.invalidateQueries({ queryKey: tableToQueryKey.crm_companies })
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'crm_opportunities', filter: `user_id=eq.${currentUser.id}` },
                () => queryClient.invalidateQueries({ queryKey: tableToQueryKey.crm_opportunities })
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'crm_activities', filter: `user_id=eq.${currentUser.id}` },
                () => queryClient.invalidateQueries({ queryKey: tableToQueryKey.crm_activities })
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUser, queryClient]);
};
