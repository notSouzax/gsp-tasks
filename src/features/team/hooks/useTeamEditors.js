import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabaseClient';

/**
 * Hook para gestionar los permisos de "editor" de documentación.
 * Owner/admin pueden conceder o revocar el permiso a miembros concretos.
 *
 * @param {string} workspaceId - ID del workspace activo
 * @param {Object} currentUser - Usuario autenticado
 */
export const useTeamEditors = (workspaceId, currentUser) => {
    const queryClient = useQueryClient();
    const userId = currentUser?.id;
    const queryKey = ['team', 'editors', workspaceId];

    const { data: editors = [], isLoading } = useQuery({
        queryKey,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('team_doc_editors')
                .select('*')
                .eq('workspace_id', workspaceId);
            if (error) throw error;
            return data || [];
        },
        enabled: !!workspaceId,
        staleTime: 30_000,
    });

    const editorIds = editors.map((e) => e.user_id);

    const grantEditor = useMutation({
        mutationFn: async (targetUserId) => {
            const { data, error } = await supabase
                .from('team_doc_editors')
                .insert([{ workspace_id: workspaceId, user_id: targetUserId, granted_by: userId }])
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    });

    const revokeEditor = useMutation({
        mutationFn: async (targetUserId) => {
            const { error } = await supabase
                .from('team_doc_editors')
                .delete()
                .eq('workspace_id', workspaceId)
                .eq('user_id', targetUserId);
            if (error) throw error;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    });

    return {
        editors,
        editorIds,
        isLoading,
        isEditor: (id) => editorIds.includes(id),
        grantEditor: (id) => grantEditor.mutateAsync(id),
        revokeEditor: (id) => revokeEditor.mutateAsync(id),
    };
};
