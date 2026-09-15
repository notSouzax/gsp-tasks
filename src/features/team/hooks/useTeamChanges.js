import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabaseClient';
import { STORAGE_BUCKET } from '../constants';

/**
 * Hook del muro de "Cambios en el programa".
 * Publicaciones con texto y adjuntos (fotos, documentos, vídeos o enlaces),
 * asociadas al workspace y en tiempo real.
 *
 * @param {string} workspaceId
 * @param {Object} currentUser
 */
export const useTeamChanges = (workspaceId, currentUser) => {
    const queryClient = useQueryClient();
    const userId = currentUser?.id;
    const queryKey = ['team', 'changes', workspaceId];

    const { data: changes = [], isLoading, error } = useQuery({
        queryKey,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('team_changes')
                .select('*')
                .eq('workspace_id', workspaceId)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        },
        enabled: !!workspaceId,
        staleTime: 15_000,
    });

    // Realtime
    useEffect(() => {
        if (!workspaceId) return;
        const channel = supabase
            .channel(`team_changes:${workspaceId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'team_changes', filter: `workspace_id=eq.${workspaceId}` },
                () => queryClient.invalidateQueries({ queryKey })
            )
            .subscribe();
        return () => { supabase.removeChannel(channel); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workspaceId, queryClient]);

    /** Sube un archivo al bucket (subcarpeta changes/) y devuelve el adjunto. */
    const uploadAttachment = async (file) => {
        const ext = file.name.split('.').pop();
        const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const storagePath = `${workspaceId}/changes/${safeName}`;

        const { error: uploadError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(storagePath, file, { upsert: false, cacheControl: '3600' });
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);

        return {
            kind: 'file',
            url: publicUrl,
            name: file.name,
            size: file.size,
            mime: file.type,
            storage_path: storagePath,
        };
    };

    /**
     * Crea una publicación.
     * @param {{ content:string, files?:File[], links?:{url:string,name?:string}[] }} payload
     */
    const createChange = useMutation({
        mutationFn: async ({ content, files = [], links = [] }) => {
            const uploaded = [];
            for (const file of files) {
                uploaded.push(await uploadAttachment(file));
            }
            const linkAttachments = links.map((l) => ({
                kind: 'link',
                external_url: l.url,
                name: l.name || l.url,
            }));

            const { data, error } = await supabase
                .from('team_changes')
                .insert([{
                    workspace_id: workspaceId,
                    author_id: userId,
                    content: content || '',
                    attachments: [...uploaded, ...linkAttachments],
                }])
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    });

    const deleteChange = useMutation({
        mutationFn: async (change) => {
            const paths = (change.attachments || [])
                .filter((a) => a.kind === 'file' && a.storage_path)
                .map((a) => a.storage_path);
            if (paths.length > 0) {
                await supabase.storage.from(STORAGE_BUCKET).remove(paths);
            }
            const { error } = await supabase.from('team_changes').delete().eq('id', change.id);
            if (error) throw error;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    });

    return {
        changes,
        isLoading,
        error,
        createChange: (payload) => createChange.mutateAsync(payload),
        deleteChange: (change) => deleteChange.mutateAsync(change),
        isPublishing: createChange.isPending,
    };
};
