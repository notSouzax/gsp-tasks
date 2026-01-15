import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import logger from '../utils/logger';

/**
 * Hook para gestionar actividades con React Query
 * Proporciona cache automático, refetch inteligente y estados loading/error
 */
export const useActivities = (boardId = null, options = {}) => {
    const { currentUser } = useAuth();
    const queryClient = useQueryClient();

    // Query principal para actividades
    const {
        data: activities = [],
        isLoading,
        isError,
        error,
        refetch,
        isFetching,
    } = useQuery({
        queryKey: ['activities', boardId, currentUser?.id],
        queryFn: async () => {
            if (!currentUser) return [];

            // Primero obtener los boards del usuario
            const { data: userBoards, error: boardsError } = await supabase
                .from('boards')
                .select('id')
                .eq('user_id', currentUser.id);

            if (boardsError) {
                logger.error('Error fetching user boards:', boardsError);
                throw boardsError;
            }

            const boardIds = userBoards?.map(b => b.id) || [];

            if (boardIds.length === 0) {
                logger.warn('No boards found for user');
                return [];
            }

            let query = supabase
                .from('activity_logs')
                .select('*')
                .in('board_id', boardIds)
                .order('created_at', { ascending: false })
                .limit(options.limit || 50);

            // Filtro por board específico
            if (boardId) {
                query = query.eq('board_id', boardId);
            }

            const { data, error: queryError } = await query;

            if (queryError) {
                logger.error('Error fetching activities:', queryError);
                throw queryError;
            }

            logger.info('✅', 'Activities loaded:', data?.length || 0);
            return data || [];
        },
        enabled: !!currentUser,
        staleTime: options.staleTime || 30000, // 30 segundos
        refetchInterval: options.refetchInterval || 60000, // Refetch cada minuto
        refetchOnWindowFocus: true,
    });

    // Mutation para invalidar y refrescar actividades
    const invalidateActivities = () => {
        queryClient.invalidateQueries({ queryKey: ['activities'] });
    };

    return {
        activities,
        isLoading,
        isError,
        error,
        refetch,
        isFetching,
        invalidateActivities,
    };
};

/**
 * Hook para estadísticas de actividad
 */
export const useActivityStats = (boardId, dateFrom, dateTo) => {
    const { currentUser } = useAuth();

    return useQuery({
        queryKey: ['activityStats', boardId, dateFrom, dateTo],
        queryFn: async () => {
            let query = supabase
                .from('activity_logs')
                .select('entity_type, action_type', { count: 'exact' });

            if (boardId) {
                query = query.eq('board_id', boardId);
            }

            if (dateFrom) {
                query = query.gte('created_at', dateFrom);
            }

            if (dateTo) {
                query = query.lte('created_at', dateTo);
            }

            const { data, error, count } = await query;

            if (error) throw error;

            // Agrupar por tipo de entidad y acción
            const stats = {
                total: count || 0,
                byEntity: {},
                byAction: {},
            };

            data?.forEach((item) => {
                stats.byEntity[item.entity_type] = (stats.byEntity[item.entity_type] || 0) + 1;
                stats.byAction[item.action_type] = (stats.byAction[item.action_type] || 0) + 1;
            });

            return stats;
        },
        enabled: !!currentUser,
        staleTime: 60000, // 1 minuto
    });
};

/**
 * Hook para heatmap de actividad
 */
export const useActivityHeatmap = (boardId, days = 30) => {
    const { currentUser } = useAuth();

    return useQuery({
        queryKey: ['activityHeatmap', boardId, days],
        queryFn: async () => {
            const dateFrom = new Date();
            dateFrom.setDate(dateFrom.getDate() - days);

            let query = supabase
                .from('activity_logs')
                .select('created_at')
                .gte('created_at', dateFrom.toISOString());

            if (boardId) {
                query = query.eq('board_id', boardId);
            }

            const { data, error } = await query;

            if (error) throw error;

            // Agrupar por día
            const heatmap = {};
            data?.forEach((item) => {
                const date = new Date(item.created_at).toISOString().split('T')[0];
                heatmap[date] = (heatmap[date] || 0) + 1;
            });

            return heatmap;
        },
        enabled: !!currentUser,
        staleTime: 5 * 60 * 1000, // 5 minutos
    });
};

export default useActivities;
