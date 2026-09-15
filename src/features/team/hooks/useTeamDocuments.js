import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabaseClient';
import { STORAGE_BUCKET } from '../constants';

/**
 * Documentación del equipo (scoped por team_id).
 * @param {string} teamId - ID del equipo activo
 * @param {Object} currentUser
 */
export const useTeamDocuments = (teamId, currentUser) => {
    const queryClient = useQueryClient();
    const userId = currentUser?.id;
    const queryKey = ['team', 'documents', teamId];

    const { data: documents = [], isLoading, error } = useQuery({
        queryKey,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('team_documents')
                .select('*')
                .eq('team_id', teamId)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        },
        enabled: !!teamId,
        staleTime: 30_000,
    });

    const uploadFile = async (file, meta) => {
        const ext = file.name.split('.').pop();
        const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const storagePath = `${teamId}/${safeName}`;

        const { error: uploadError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(storagePath, file, { upsert: false, cacheControl: '3600' });
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);

        const { data, error } = await supabase
            .from('team_documents')
            .insert([{
                team_id: teamId,
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
                    team_id: teamId,
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
