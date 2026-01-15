import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useActivity } from '../../context/ActivityContext';
import { Icons } from '../ui/Icons';
import { formatRelativeTime, formatDateGroup } from '../../utils/helpers';

const ActivityDrawer = ({ isOpen, onClose, boardId = null }) => {
    const activityContext = useActivity();

    const {
        activities,
        loading,
        filters,
        fetchActivities,
        updateFilters,
        resetFilters,
        formatActivityForDisplay,
    } = activityContext;

    const [showFilters, setShowFilters] = useState(false);
    const [page, setPage] = useState(0);
    const ITEMS_PER_PAGE = 50;

    // Cargar actividades al abrir el drawer
    useEffect(() => {
        if (isOpen) {
            fetchActivities(boardId, ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
        }
    }, [isOpen, boardId, filters, page, fetchActivities]);

    // Agrupar actividades por día
    const groupActivitiesByDay = (activities) => {
        const groups = {};

        activities.forEach((activity) => {
            const dayKey = formatDateGroup(activity.created_at);

            if (!groups[dayKey]) {
                groups[dayKey] = [];
            }
            groups[dayKey].push(activity);
        });

        return groups;
    };

    const activityGroups = groupActivitiesByDay(activities);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Overlay */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
                        onClick={onClose}
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed right-0 top-0 h-full w-full sm:w-[500px] bg-white dark:bg-gray-800 shadow-2xl z-50 flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-3">
                                <div className="w-6 h-6 text-indigo-600"><Icons.Layout /></div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                        Historial de Actividad
                                    </h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {activities.length} eventos
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setShowFilters(!showFilters)}
                                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    title="Filtros"
                                >
                                    <div className={`w-5 h-5 ${showFilters ? 'text-indigo-600' : 'text-gray-600'}`}><Icons.Search /></div>
                                </button>
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <div className="w-5 h-5 text-gray-600 dark:text-gray-400"><Icons.X /></div>
                                </button>
                            </div>
                        </div>

                        {/* Filters Panel */}
                        <AnimatePresence>
                            {showFilters && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                >
                                    <div className="p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    Tipo de Entidad
                                                </label>
                                                <select
                                                    value={filters.entityType || ''}
                                                    onChange={(e) =>
                                                        updateFilters({ entityType: e.target.value || null })
                                                    }
                                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                                >
                                                    <option value="">Todos</option>
                                                    <option value="task">Tareas</option>
                                                    <option value="column">Columnas</option>
                                                    <option value="board">Tableros</option>
                                                    <option value="comment">Comentarios</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    Tipo de Acción
                                                </label>
                                                <select
                                                    value={filters.actionType || ''}
                                                    onChange={(e) =>
                                                        updateFilters({ actionType: e.target.value || null })
                                                    }
                                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                                >
                                                    <option value="">Todas</option>
                                                    <option value="create">Creaciones</option>
                                                    <option value="update">Actualizaciones</option>
                                                    <option value="move">Movimientos</option>
                                                    <option value="delete">Eliminaciones</option>
                                                </select>
                                            </div>

                                            <button
                                                onClick={resetFilters}
                                                className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
                                            >
                                                Resetear Filtros
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Timeline */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {loading ? (
                                <SkeletonTheme baseColor="#1e293b" highlightColor="#334155">
                                    <div className="space-y-6">
                                        {/* Skeleton Day Header */}
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="h-px flex-1 bg-gray-700" />
                                            <Skeleton width={120} height={16} />
                                            <div className="h-px flex-1 bg-gray-700" />
                                        </div>

                                        {/* Skeleton Activity Cards */}
                                        {[1, 2, 3, 4, 5].map((i) => (
                                            <div key={i} className="relative pl-6">
                                                <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-500/30 via-purple-500/30 to-pink-500/30" />
                                                <div className="absolute -left-[0.1rem] top-1 w-4 h-4 rounded-full bg-gray-800 border-2 border-gray-600" />
                                                <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                                                    <div className="flex items-start gap-3">
                                                        <Skeleton circle width={32} height={32} />
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <Skeleton circle width={24} height={24} />
                                                                <Skeleton width={100} height={14} />
                                                            </div>
                                                            <Skeleton width="90%" height={16} className="mb-2" />
                                                            <Skeleton width={80} height={12} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </SkeletonTheme>
                            ) : activities.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center">
                                    <div className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4 flex items-center justify-center"><Icons.Layout /></div>
                                    <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">
                                        No hay actividad aún
                                    </p>
                                    <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                                        Las acciones que realices aparecerán aquí
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    {Object.entries(activityGroups).map(([day, dayActivities], groupIndex) => (
                                        <motion.div
                                            key={day}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: groupIndex * 0.1 }}
                                        >
                                            {/* Day Header */}
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                                                <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                                    {day}
                                                </span>
                                                <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                                            </div>

                                            {/* Activities */}
                                            <div className="relative pl-6 space-y-4">
                                                {/* Vertical Line */}
                                                <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-500 via-purple-500 to-pink-500" />

                                                {dayActivities.map((activity, index) => {
                                                    const formatted = formatActivityForDisplay(activity);

                                                    return (
                                                        <motion.div
                                                            key={activity.id}
                                                            initial={{ opacity: 0, x: 20 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ delay: index * 0.05 }}
                                                            className="relative group"
                                                        >
                                                            {/* Timeline Dot */}
                                                            <div className={`absolute -left-[1.1rem] top-1 w-4 h-4 rounded-full bg-white dark:bg-gray-800 border-2 ${formatted.color.replace('text-', 'border-')} shadow-sm`} />

                                                            {/* Activity Card */}
                                                            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700">
                                                                <div className="flex items-start gap-3">
                                                                    {/* Icon */}
                                                                    <span className="text-2xl flex-shrink-0">
                                                                        {formatted.icon}
                                                                    </span>

                                                                    {/* Content */}
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            {formatted.userAvatar ? (
                                                                                <img
                                                                                    src={formatted.userAvatar}
                                                                                    alt={formatted.userName}
                                                                                    className="w-6 h-6 rounded-full"
                                                                                />
                                                                            ) : (
                                                                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                                                                                    {formatted.userName.charAt(0).toUpperCase()}
                                                                                </div>
                                                                            )}
                                                                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                                                                {formatted.userName}
                                                                            </span>
                                                                        </div>

                                                                        <p className="text-sm text-gray-700 dark:text-gray-300">
                                                                            {formatted.displayText}
                                                                        </p>

                                                                        {/* Context Pills - Tablero y Columna */}
                                                                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                                                            {/* Board Badge */}
                                                                            {formatted.boardTitle && (
                                                                                <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 rounded text-[10px] font-medium flex items-center gap-1">
                                                                                    📋 {formatted.boardTitle}
                                                                                </span>
                                                                            )}

                                                                            {/* Column Badge (for non-move actions) */}
                                                                            {formatted.columnTitle && !formatted.fromColumn && (
                                                                                <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-[10px] font-medium flex items-center gap-1">
                                                                                    📁 {formatted.columnTitle}
                                                                                </span>
                                                                            )}

                                                                            {/* Move action: From -> To columns */}
                                                                            {formatted.fromColumn && formatted.toColumn && (
                                                                                <>
                                                                                    <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-[10px] font-medium">
                                                                                        {formatted.fromColumn}
                                                                                    </span>
                                                                                    <span className="text-gray-500 text-xs">→</span>
                                                                                    <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-[10px] font-medium">
                                                                                        {formatted.toColumn}
                                                                                    </span>
                                                                                </>
                                                                            )}
                                                                        </div>

                                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                                                            {formatRelativeTime(activity.created_at)}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    );
                                                })}
                                            </div>
                                        </motion.div>
                                    ))}

                                    {/* Load More */}
                                    {activities.length >= ITEMS_PER_PAGE && (
                                        <button
                                            onClick={() => setPage((p) => p + 1)}
                                            className="w-full py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
                                        >
                                            Cargar más
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default ActivityDrawer;
