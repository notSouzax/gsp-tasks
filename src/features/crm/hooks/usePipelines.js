import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabaseClient';

/**
 * Hook para gestionar pipelines y stages del CRM con React Query
 * @param {Object} currentUser - Usuario autenticado
 */
export const usePipelines = (currentUser) => {
    const queryClient = useQueryClient();
    const userId = currentUser?.id;
    const [activePipelineId, setActivePipelineId] = useState(null);

    // =====================================================
    // QUERIES
    // =====================================================

    const { data: pipelines = [], isLoading: pipelinesLoading } = useQuery({
        queryKey: ['crm', 'pipelines', userId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('crm_pipelines')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: true });
            if (error) throw error;

            // If no pipelines, create default
            if (!data || data.length === 0) {
                const newPipeline = await createDefaultPipeline();
                if (newPipeline) return [newPipeline];
                return [];
            }

            return data;
        },
        enabled: !!userId,
        staleTime: 60_000,
    });

    // Set active pipeline when pipelines load (replaces deprecated onSuccess)
    useEffect(() => {
        if (pipelines.length > 0 && !activePipelineId) {
            const defaultPipeline = pipelines.find(p => p.is_default) || pipelines[0];
            setActivePipelineId(defaultPipeline.id);
        }
    }, [pipelines, activePipelineId]);

    const { data: stages = [], isLoading: stagesLoading } = useQuery({
        queryKey: ['crm', 'stages', userId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('crm_stages')
                .select('*')
                .order('position', { ascending: true });
            if (error) throw error;
            return data || [];
        },
        enabled: !!userId,
        staleTime: 60_000,
    });

    // Computed values
    const activePipeline = pipelines.find(p => p.id === activePipelineId);
    const activeStages = stages
        .filter(s => s.pipeline_id === activePipelineId)
        .sort((a, b) => a.position - b.position);

    // =====================================================
    // DEFAULT PIPELINE CREATION
    // =====================================================

    const createDefaultPipeline = async () => {
        if (!userId) return null;
        try {
            const { data: pipeline, error: pipelineError } = await supabase
                .from('crm_pipelines')
                .insert([{
                    user_id: userId,
                    name: 'Pipeline Principal',
                    description: 'Pipeline de ventas predeterminado',
                    is_default: true
                }])
                .select()
                .single();

            if (pipelineError) {
                console.error('Error creating default pipeline:', pipelineError);
                return null;
            }

            const defaultStages = [
                { pipeline_id: pipeline.id, name: 'Nuevo', color: 'slate', position: 0, probability: 10, is_won: false, is_lost: false },
                { pipeline_id: pipeline.id, name: 'Calificado', color: 'blue', position: 1, probability: 20, is_won: false, is_lost: false },
                { pipeline_id: pipeline.id, name: 'Propuesta', color: 'purple', position: 2, probability: 40, is_won: false, is_lost: false },
                { pipeline_id: pipeline.id, name: 'Negociación', color: 'amber', position: 3, probability: 60, is_won: false, is_lost: false },
                { pipeline_id: pipeline.id, name: 'Ganado', color: 'emerald', position: 4, probability: 100, is_won: true, is_lost: false },
                { pipeline_id: pipeline.id, name: 'Perdido', color: 'red', position: 5, probability: 0, is_won: false, is_lost: true },
            ];

            const { error: stagesError } = await supabase
                .from('crm_stages')
                .insert(defaultStages)
                .select();

            if (stagesError) console.error('Error creating default stages:', stagesError);
            // Invalidate stages so they get refetched
            queryClient.invalidateQueries({ queryKey: ['crm', 'stages'] });

            return pipeline;
        } catch (err) {
            console.error('Error in createDefaultPipeline:', err);
            return null;
        }
    };

    // =====================================================
    // MUTATIONS: PIPELINES
    // =====================================================

    const invalidatePipelines = () => queryClient.invalidateQueries({ queryKey: ['crm', 'pipelines'] });
    const invalidateStages = () => queryClient.invalidateQueries({ queryKey: ['crm', 'stages'] });

    const createPipelineMut = useMutation({
        mutationFn: async (pipelineData) => {
            // 1. Create pipeline
            const { data: pipeline, error: pipelineError } = await supabase
                .from('crm_pipelines')
                .insert([{
                    user_id: userId,
                    name: pipelineData.name,
                    description: pipelineData.description || '',
                    is_default: pipelineData.is_default || false
                }])
                .select()
                .single();
            if (pipelineError) throw pipelineError;

            // 2. Create default stages
            const defaultStages = [
                { pipeline_id: pipeline.id, name: 'Nuevo', color: 'slate', position: 0, probability: 10, is_won: false, is_lost: false },
                { pipeline_id: pipeline.id, name: 'Calificado', color: 'blue', position: 1, probability: 20, is_won: false, is_lost: false },
                { pipeline_id: pipeline.id, name: 'Propuesta', color: 'purple', position: 2, probability: 40, is_won: false, is_lost: false },
                { pipeline_id: pipeline.id, name: 'Negociación', color: 'amber', position: 3, probability: 60, is_won: false, is_lost: false },
                { pipeline_id: pipeline.id, name: 'Ganado', color: 'emerald', position: 4, probability: 100, is_won: true, is_lost: false },
                { pipeline_id: pipeline.id, name: 'Perdido', color: 'red', position: 5, probability: 0, is_won: false, is_lost: true },
            ];
            const { error: stagesError } = await supabase
                .from('crm_stages')
                .insert(defaultStages)
                .select();
            if (stagesError) console.error('Error creating stages:', stagesError);

            // If is_default, unmark others
            if (pipelineData.is_default) {
                await supabase
                    .from('crm_pipelines')
                    .update({ is_default: false })
                    .neq('id', pipeline.id);
            }

            return pipeline;
        },
        onSuccess: () => {
            invalidatePipelines();
            invalidateStages();
        },
    });

    const updatePipelineMut = useMutation({
        mutationFn: async ({ id, updates }) => {
            const { data, error } = await supabase
                .from('crm_pipelines')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;

            if (updates.is_default) {
                await supabase
                    .from('crm_pipelines')
                    .update({ is_default: false })
                    .neq('id', id);
            }
            return data;
        },
        onSuccess: invalidatePipelines,
    });

    const deletePipelineMut = useMutation({
        mutationFn: async (id) => {
            if (pipelines.length <= 1) {
                throw new Error('No puedes eliminar el único pipeline');
            }
            const { error } = await supabase
                .from('crm_pipelines')
                .delete()
                .eq('id', id);
            if (error) throw error;
            return id;
        },
        onSuccess: (deletedId) => {
            invalidatePipelines();
            invalidateStages();
            if (activePipelineId === deletedId) {
                const remaining = pipelines.filter(p => p.id !== deletedId);
                const newActive = remaining.find(p => p.is_default) || remaining[0];
                if (newActive) setActivePipelineId(newActive.id);
            }
        },
    });

    // =====================================================
    // MUTATIONS: STAGES
    // =====================================================

    const createStageMut = useMutation({
        mutationFn: async (stageData) => {
            const { data, error } = await supabase
                .from('crm_stages')
                .insert([stageData])
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: invalidateStages,
    });

    const updateStageMut = useMutation({
        mutationFn: async ({ id, updates }) => {
            const { data, error } = await supabase
                .from('crm_stages')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: invalidateStages,
    });

    const deleteStageMut = useMutation({
        mutationFn: async (id) => {
            const { error } = await supabase
                .from('crm_stages')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: invalidateStages,
    });

    const reorderStagesMut = useMutation({
        mutationFn: async ({ stageIds }) => {
            const updates = stageIds.map((id, index) => ({ id, position: index }));
            const { error } = await supabase
                .from('crm_stages')
                .upsert(updates);
            if (error) throw error;
        },
        onSuccess: invalidateStages,
    });

    return {
        // State
        pipelines,
        stages,
        activePipelineId,
        activePipeline,
        activeStages,
        isLoading: pipelinesLoading || stagesLoading,

        // Setters
        setActivePipelineId,

        // Pipelines CRUD
        createPipeline: (data) => createPipelineMut.mutateAsync(data),
        updatePipeline: (id, updates) => updatePipelineMut.mutateAsync({ id, updates }),
        deletePipeline: (id) => deletePipelineMut.mutateAsync(id),

        // Stages CRUD
        createStage: (data) => createStageMut.mutateAsync(data),
        updateStage: (id, updates) => updateStageMut.mutateAsync({ id, updates }),
        deleteStage: (id) => deleteStageMut.mutateAsync(id),
        reorderStages: (pipelineId, stageIds) => reorderStagesMut.mutateAsync({ pipelineId, stageIds }),
    };
};
