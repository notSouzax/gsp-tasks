import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabaseClient';

/**
 * Hook del chat de departamento.
 * Carga los mensajes del workspace y se suscribe a cambios en tiempo real.
 *
 * @param {string} workspaceId - ID del workspace activo
 * @param {Object} currentUser - Usuario autenticado
 */
export const useTeamMessages = (workspaceId, currentUser) => {
    const queryClient = useQueryClient();
    const userId = currentUser?.id;
    const queryKey = ['team', 'messages', workspaceId];

    const { data: messages = [], isLoading, error } = useQuery({
        queryKey,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('team_messages')
                .select('*')
                .eq('workspace_id', workspaceId)
                .order('created_at', { ascending: true })
                .limit(500);
            if (error) throw error;
            return data || [];
        },
        enabled: !!workspaceId,
        staleTime: 10_000,
    });

    // Suscripción en tiempo real
    useEffect(() => {
        if (!workspaceId) return;

        const channel = supabase
            .channel(`team_messages:${workspaceId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'team_messages',
                    filter: `workspace_id=eq.${workspaceId}`,
                },
                () => queryClient.invalidateQueries({ queryKey })
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workspaceId, queryClient]);

    const sendMessage = useMutation({
        mutationFn: async (content) => {
            const trimmed = (content || '').trim();
            if (!trimmed) return null;
            const { data, error } = await supabase
                .from('team_messages')
                .insert([{ workspace_id: workspaceId, user_id: userId, content: trimmed }])
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    });

    const deleteMessage = useMutation({
        mutationFn: async (id) => {
            const { error } = await supabase.from('team_messages').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    });

    return {
        messages,
        isLoading,
        error,
        sendMessage: (content) => sendMessage.mutateAsync(content),
        deleteMessage: (id) => deleteMessage.mutateAsync(id),
        isSending: sendMessage.isPending,
    };
};
