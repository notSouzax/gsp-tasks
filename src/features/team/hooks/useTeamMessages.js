import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabaseClient';

/**
 * Chat del equipo (scoped por team_id).
 * @param {string} teamId - ID del equipo activo
 * @param {Object} currentUser
 */
export const useTeamMessages = (teamId, currentUser) => {
    const queryClient = useQueryClient();
    const userId = currentUser?.id;
    const queryKey = ['team', 'messages', teamId];

    const { data: messages = [], isLoading, error } = useQuery({
        queryKey,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('team_messages')
                .select('*')
                .eq('team_id', teamId)
                .order('created_at', { ascending: true })
                .limit(500);
            if (error) throw error;
            return data || [];
        },
        enabled: !!teamId,
        staleTime: 10_000,
    });

    useEffect(() => {
        if (!teamId) return;
        const channel = supabase
            .channel(`team_messages:${teamId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'team_messages', filter: `team_id=eq.${teamId}` },
                () => queryClient.invalidateQueries({ queryKey })
            )
            .subscribe();
        return () => { supabase.removeChannel(channel); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [teamId, queryClient]);

    const sendMessage = useMutation({
        mutationFn: async (content) => {
            const trimmed = (content || '').trim();
            if (!trimmed) return null;
            const { data, error } = await supabase
                .from('team_messages')
                .insert([{ team_id: teamId, user_id: userId, content: trimmed }])
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
