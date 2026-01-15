import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabaseClient';

/**
 * Hook para gestionar pipelines y stages del CRM
 * @param {Object} currentUser - Usuario autenticado
 * @returns {Object} Estado y operaciones de pipelines/stages
 */
export const usePipelines = (currentUser) => {
    const [pipelines, setPipelines] = useState([]);
    const [stages, setStages] = useState([]);
    const [activePipelineId, setActivePipelineId] = useState(null);

    // Computed values
    const activePipeline = pipelines.find(p => p.id === activePipelineId);
    const activeStages = stages
        .filter(s => s.pipeline_id === activePipelineId)
        .sort((a, b) => a.position - b.position);

    // =====================================================
    // DEFAULT PIPELINE CREATION
    // =====================================================

    const createDefaultPipeline = useCallback(async () => {
        if (!currentUser) return null;

        try {
            // 1. Create the pipeline
            const { data: pipeline, error: pipelineError } = await supabase
                .from('crm_pipelines')
                .insert([{
                    user_id: currentUser.id,
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

            // 2. Create default stages
            const defaultStages = [
                { pipeline_id: pipeline.id, name: 'Nuevo', color: 'slate', position: 0, probability: 10, is_won: false, is_lost: false },
                { pipeline_id: pipeline.id, name: 'Calificado', color: 'blue', position: 1, probability: 20, is_won: false, is_lost: false },
                { pipeline_id: pipeline.id, name: 'Propuesta', color: 'purple', position: 2, probability: 40, is_won: false, is_lost: false },
                { pipeline_id: pipeline.id, name: 'Negociación', color: 'amber', position: 3, probability: 60, is_won: false, is_lost: false },
                { pipeline_id: pipeline.id, name: 'Ganado', color: 'emerald', position: 4, probability: 100, is_won: true, is_lost: false },
                { pipeline_id: pipeline.id, name: 'Perdido', color: 'red', position: 5, probability: 0, is_won: false, is_lost: true },
            ];

            const { data: stagesData, error: stagesError } = await supabase
                .from('crm_stages')
                .insert(defaultStages)
                .select();

            if (stagesError) {
                console.error('Error creating default stages:', stagesError);
            } else {
                setStages(stagesData || []);
            }

            console.log('Default pipeline created:', pipeline.name);
            return pipeline;

        } catch (err) {
            console.error('Error in createDefaultPipeline:', err);
            return null;
        }
    }, [currentUser]);

    // =====================================================
    // FETCH FUNCTIONS
    // =====================================================

    const fetchPipelines = useCallback(async () => {
        if (!currentUser) return;

        const { data, error } = await supabase
            .from('crm_pipelines')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching pipelines:', error);
            return;
        }

        // If no pipelines, create default
        if (!data || data.length === 0) {
            console.log('No pipelines found, creating default...');
            const newPipeline = await createDefaultPipeline();
            if (newPipeline) {
                setPipelines([newPipeline]);
                setActivePipelineId(newPipeline.id);
            }
            return;
        }

        setPipelines(data);

        // Set default active pipeline
        if (data.length > 0 && !activePipelineId) {
            const defaultPipeline = data.find(p => p.is_default) || data[0];
            setActivePipelineId(defaultPipeline.id);
        }
    }, [currentUser, activePipelineId, createDefaultPipeline]);

    const fetchStages = useCallback(async () => {
        if (!currentUser) return;

        const { data, error } = await supabase
            .from('crm_stages')
            .select('*')
            .order('position', { ascending: true });

        if (error) {
            console.error('Error fetching stages:', error);
            return;
        }

        setStages(data || []);
    }, [currentUser]);

    // =====================================================
    // CRUD: PIPELINES
    // =====================================================

    const createPipeline = useCallback(async (pipelineData) => {
        if (!currentUser) return null;

        try {
            // 1. Create the pipeline
            const { data: pipeline, error: pipelineError } = await supabase
                .from('crm_pipelines')
                .insert([{
                    user_id: currentUser.id,
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

            const { data: stagesData, error: stagesError } = await supabase
                .from('crm_stages')
                .insert(defaultStages)
                .select();

            if (stagesError) console.error('Error creating stages:', stagesError);
            else setStages(prev => [...prev, ...stagesData]);

            // If is_default, update other pipelines
            if (pipelineData.is_default) {
                await supabase
                    .from('crm_pipelines')
                    .update({ is_default: false })
                    .neq('id', pipeline.id);
                setPipelines(prev => prev.map(p => ({ ...p, is_default: false })));
            }

            setPipelines(prev => [...prev, pipeline]);
            return pipeline;
        } catch (err) {
            console.error('Error creating pipeline:', err);
            throw err;
        }
    }, [currentUser]);

    const updatePipeline = useCallback(async (id, updates) => {
        try {
            const { data, error } = await supabase
                .from('crm_pipelines')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            // If marked as default, unmark others
            if (updates.is_default) {
                await supabase
                    .from('crm_pipelines')
                    .update({ is_default: false })
                    .neq('id', id);
                setPipelines(prev => prev.map(p =>
                    p.id === id ? data : { ...p, is_default: false }
                ));
            } else {
                setPipelines(prev => prev.map(p => p.id === id ? data : p));
            }

            return data;
        } catch (err) {
            console.error('Error updating pipeline:', err);
            throw err;
        }
    }, []);

    const deletePipeline = useCallback(async (id) => {
        // Don't allow deleting the only pipeline
        if (pipelines.length <= 1) {
            throw new Error('No puedes eliminar el único pipeline');
        }

        try {
            const { error } = await supabase
                .from('crm_pipelines')
                .delete()
                .eq('id', id);

            if (error) throw error;

            // Clean up stages from deleted pipeline
            setStages(prev => prev.filter(s => s.pipeline_id !== id));
            setPipelines(prev => prev.filter(p => p.id !== id));

            // If was active pipeline, switch to first available
            if (activePipelineId === id) {
                const remaining = pipelines.filter(p => p.id !== id);
                const newActive = remaining.find(p => p.is_default) || remaining[0];
                if (newActive) setActivePipelineId(newActive.id);
            }
        } catch (err) {
            console.error('Error deleting pipeline:', err);
            throw err;
        }
    }, [pipelines, activePipelineId]);

    // =====================================================
    // CRUD: STAGES
    // =====================================================

    const createStage = useCallback(async (stageData) => {
        const { data, error } = await supabase
            .from('crm_stages')
            .insert([stageData])
            .select()
            .single();

        if (error) {
            console.error('Error creating stage:', error);
            throw error;
        }

        setStages(prev => [...prev, data].sort((a, b) => a.position - b.position));
        return data;
    }, []);

    const updateStage = useCallback(async (id, updates) => {
        const { data, error } = await supabase
            .from('crm_stages')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating stage:', error);
            throw error;
        }

        setStages(prev => prev.map(s => s.id === id ? data : s).sort((a, b) => a.position - b.position));
        return data;
    }, []);

    const deleteStage = useCallback(async (id) => {
        const { error } = await supabase
            .from('crm_stages')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting stage:', error);
            throw error;
        }

        setStages(prev => prev.filter(s => s.id !== id));
    }, []);

    const reorderStages = useCallback(async (pipelineId, stageIds) => {
        // stageIds order determines the new positions
        const updates = stageIds.map((id, index) => ({
            id,
            position: index
        }));

        // Batch update using upsert
        const { error } = await supabase
            .from('crm_stages')
            .upsert(updates);

        if (error) {
            console.error('Error reordering stages:', error);
            throw error;
        }

        // Update local state
        setStages(prev => {
            const newStages = [...prev];
            updates.forEach(update => {
                const stage = newStages.find(s => s.id === update.id);
                if (stage) stage.position = update.position;
            });
            return newStages.sort((a, b) => a.position - b.position);
        });
    }, []);

    return {
        // State
        pipelines,
        stages,
        activePipelineId,
        activePipeline,
        activeStages,

        // Setters (for realtime)
        setPipelines,
        setStages,
        setActivePipelineId,

        // Fetch
        fetchPipelines,
        fetchStages,

        // Pipelines CRUD
        createPipeline,
        updatePipeline,
        deletePipeline,

        // Stages CRUD
        createStage,
        updateStage,
        deleteStage,
        reorderStages
    };
};
