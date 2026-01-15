import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import logger from '../utils/logger';

const ActivityContext = createContext();

export const useActivity = () => {
    const context = useContext(ActivityContext);
    if (!context) {
        throw new Error('useActivity must be used within an ActivityProvider');
    }
    return context;
};

export const ActivityProvider = ({ children }) => {
    const { currentUser } = useAuth();
    const queryClient = useQueryClient();
    const [filters, setFilters] = useState({
        boardId: null,
        entityType: null, // 'task', 'column', 'board', 'comment'
        actionType: null, // 'create', 'update', 'move', 'delete'
        userId: null,
        dateFrom: null,
        dateTo: null,
    });

    // React Query para actividades - con cache automático y refetch inteligente
    const {
        data: activities = [],
        isLoading: loading,
        refetch,
    } = useQuery({
        queryKey: ['activities', currentUser?.id, filters],
        queryFn: async () => {
            if (!currentUser) return [];

            // Consulta directa por user_id para incluir TODO el historial
            // (incluyendo tableros eliminados)
            let query = supabase
                .from('activity_logs')
                .select('*')
                .eq('user_id', currentUser.id)
                .order('created_at', { ascending: false })
                .limit(100); // Aumentado para ver más historial

            // Aplicar filtros opcionales
            if (filters.boardId) {
                query = query.eq('board_id', filters.boardId);
            }

            if (filters.entityType) {
                query = query.eq('entity_type', filters.entityType);
            }

            if (filters.actionType) {
                query = query.eq('action_type', filters.actionType);
            }

            if (filters.dateFrom) {
                query = query.gte('created_at', filters.dateFrom);
            }

            if (filters.dateTo) {
                query = query.lte('created_at', filters.dateTo);
            }

            const { data, error } = await query;

            if (error) {
                logger.error('Error fetching activities:', error);
                throw error;
            }

            logger.info('✅', 'Activities loaded:', data?.length || 0);
            return data || [];
        },
        enabled: !!currentUser,
        staleTime: 10000, // 10 segundos - datos frescos más corto
        refetchInterval: 30000, // Refetch cada 30 segundos
        refetchOnWindowFocus: true,
    });

    // Función fetchActivities para compatibilidad con componentes existentes
    const fetchActivities = async (boardId = null) => {
        if (boardId !== filters.boardId) {
            setFilters(prev => ({ ...prev, boardId }));
        } else {
            refetch();
        }
    };

    // Suscripción en tiempo real a nuevas actividades
    useEffect(() => {
        if (!currentUser) return;

        const subscription = supabase
            .channel('activity_logs_channel')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'activity_logs',
                },
                (payload) => {
                    logger.debug('ActivityContext', 'Nueva actividad detectada:', payload.new);

                    // Invalidar cache para refrescar actividades con React Query
                    queryClient.invalidateQueries({ queryKey: ['activities'] });
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [currentUser, queryClient]);

    // Actualizar filtros
    const updateFilters = (newFilters) => {
        setFilters((prev) => ({ ...prev, ...newFilters }));
    };

    // Resetear filtros
    const resetFilters = () => {
        setFilters({
            boardId: null,
            entityType: null,
            actionType: null,
            userId: null,
            dateFrom: null,
            dateTo: null,
        });
    };

    // Obtener estadísticas de actividad
    const getActivityStats = async (boardId, dateFrom, dateTo) => {
        try {
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
        } catch (error) {
            logger.error('Error fetching activity stats:', error);
            return null;
        }
    };

    // Obtener actividad por día (para heatmap)
    const getActivityHeatmap = async (boardId, days = 30) => {
        try {
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
        } catch (error) {
            logger.error('Error fetching heatmap:', error);
            return {};
        }
    };

    // Función helper para formatear actividades para la UI
    const formatActivityForDisplay = (activity) => {
        const { entity_type, action_type, metadata } = activity;

        // El metadata.display_text contiene el mensaje formateado desde el trigger
        const displayText = metadata?.display_text || `${action_type} on ${entity_type}`;

        return {
            ...activity,
            displayText,
            userName: currentUser?.name || currentUser?.email || 'Usuario',
            userAvatar: currentUser?.avatar_url,
            icon: getActivityIcon(entity_type, action_type),
            color: getActivityColor(action_type),
            // Contexto adicional del metadata
            boardTitle: metadata?.board_title,
            columnTitle: metadata?.column_title,
            taskTitle: metadata?.task_title,
            fromColumn: metadata?.from_column,
            toColumn: metadata?.to_column,
        };
    };

    // Helpers para iconos y colores
    const getActivityIcon = (entityType, actionType) => {
        const icons = {
            task: {
                create: '✨',
                update: '📝',
                move: '🚀',
                delete: '🗑️',
            },
            column: {
                create: '➕',
                update: '✏️',
                delete: '❌',
            },
            board: {
                create: '🎯',
                update: '🔄',
                delete: '🗑️',
            },
            comment: {
                create: '💬',
                delete: '🚫',
            },
        };

        return icons[entityType]?.[actionType] || '📌';
    };

    const getActivityColor = (actionType) => {
        const colors = {
            create: 'text-green-600',
            update: 'text-blue-600',
            move: 'text-purple-600',
            delete: 'text-red-600',
            archive: 'text-gray-600',
        };

        return colors[actionType] || 'text-gray-600';
    };

    const value = {
        activities,
        loading,
        filters,
        fetchActivities,
        updateFilters,
        resetFilters,
        getActivityStats,
        getActivityHeatmap,
        formatActivityForDisplay,
    };

    return <ActivityContext.Provider value={value}>{children}</ActivityContext.Provider>;
};
