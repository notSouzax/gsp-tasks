import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabaseClient';
import { STORAGE_BUCKET } from '../constants';

/**
 * Hook de gestión de documentación del equipo.
 * Los documentos están asociados a un workspace (no a un usuario), de modo
 * que todos los miembros ven la misma base de conocimiento.
 *
 * @param {string} workspaceId - ID del workspace activo
 * @param {Object} currentUser - Usuario autenticado
 */
export const useTeamDocuments = (workspaceId, currentUser) => {
    const queryClient = useQueryClient();
    const userId = currentUser?.id;
    const queryKey = ['team', 'documents', workspaceId];

    const { data: documents = [], isLoading, error } = useQuery({
        queryKey,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('team_documents')
                .select('*')
                .eq('workspace_id', workspaceId)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        },
        enabled: !!workspaceId,
        staleTime: 30_000,
    });

    /**
     * Sube un archivo al bucket de Storage y crea el registro del documento.
     * @param {File} file
     * @param {{title:string, description?:string, category:string}} meta
     */
    const uploadFile = async (file, meta) => {
        const ext = file.name.split('.').pop();
        const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const storagePath = `${workspaceId}/${safeName}`;

        const { error: uploadError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(storagePath, file, { upsert: false, cacheControl: '3600' });
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(storagePath);

        const { data, error } = await supabase
            .from('team_documents')
            .insert([{
                workspace_id: workspaceId,
                uploaded_by: userId,
                title: meta.title,
                description: meta.description || null,
                category: meta.category,
                kind: 'file',
                storage_path: storagePath,
                file_url: publicUrl,
                file_name: file.name,
                file_size: file.size,
                mime_type: file.type,
            }])
            .select()
            .single();
        if (error) throw error;
        return data;
    };

    const createLink = useMutation({
        mutationFn: async (meta) => {
            const { data, error } = await supabase
                .from('team_documents')
                .insert([{
                    workspace_id: workspaceId,
                    uploaded_by: userId,
                    title: meta.title,
                    description: meta.description || null,
                    category: meta.category,
                    kind: 'link',
                    external_url: meta.external_url,
                }])
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    });

    const uploadFileMutation = useMutation({
        mutationFn: ({ file, meta }) => uploadFile(file, meta),
        onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    });

    const updateDocument = useMutation({
        mutationFn: async ({ id, updates }) => {
            const { data, error } = await supabase
                .from('team_documents')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    });

    const deleteDocument = useMutation({
        mutationFn: async (doc) => {
            // Borrar el archivo del bucket si procede
            if (doc.kind === 'file' && doc.storage_path) {
                await supabase.storage.from(STORAGE_BUCKET).remove([doc.storage_path]);
            }
            const { error } = await supabase.from('team_documents').delete().eq('id', doc.id);
            if (error) throw error;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    });

    return {
        documents,
        isLoading,
        error,
        uploadFile: (file, meta) => uploadFileMutation.mutateAsync({ file, meta }),
        createLink: (meta) => createLink.mutateAsync(meta),
        updateDocument: (id, updates) => updateDocument.mutateAsync({ id, updates }),
        deleteDocument: (doc) => deleteDocument.mutateAsync(doc),
        isUploading: uploadFileMutation.isPending || createLink.isPending,
    };
};
