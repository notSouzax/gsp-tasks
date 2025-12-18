import React, { useState, useMemo } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { isSameDay, parseISO, isBefore, subDays, format } from 'date-fns';
import DashboardListModal from './modals/DashboardListModal';
import { COLOR_MAP } from '../utils/helpers';

const CHART_COLORS = [
    '#f59e0b', // Amber (ToDo-ish)
    '#3b82f6', // Blue (Progress-ish)
    '#10b981', // Emerald (Done-ish)
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#f97316', // Orange
    '#6366f1', // Indigo
];

const Dashboard = ({ boards, onNavigateToTask }) => {
    const [activeModal, setActiveModal] = useState(null);
    // Default to the first board if available
    const [chartBoardId, setChartBoardId] = useState(boards?.[0]?.id || '');

    // Sync chartBoardId if boards change and current selection is invalid
    React.useEffect(() => {
        if (boards.length > 0) {
            const currentExists = boards.find(b => String(b.id) === String(chartBoardId));
            if (!currentExists) {
                setChartBoardId(boards[0].id);
            }
        }
    }, [boards, chartBoardId]);

    const safeParseDate = (date) => {
        if (!date) return null;
        if (date instanceof Date) return date;
        if (typeof date === 'string') return parseISO(date);
        return new Date(date);
    };

    // --- Data Aggregation ---
    const allTasks = useMemo(() => {
        return boards.flatMap(b =>
            b.columns.flatMap(c =>
                (c.cards || []).map(t => ({
                    ...t,
                    boardId: b.id, // Add boardId
                    boardTitle: b.title,
                    columnTitle: c.title,
                    status: c.title
                }))
            )
        );
    }, [boards]);

    const overdueTasks = useMemo(() => {
        const now = new Date();
        return allTasks.filter(t => {
            if (!t.next_notification_at) return false;
            const date = safeParseDate(t.next_notification_at);
            return isBefore(date, now); // Strictly before now (includes earlier today)
        }).sort((a, b) => safeParseDate(b.next_notification_at) - safeParseDate(a.next_notification_at));
    }, [allTasks]);

    const dueTodayTasks = useMemo(() => {
        const now = new Date();
        return allTasks.filter(t => {
            if (!t.next_notification_at) return false;
            const date = safeParseDate(t.next_notification_at);
            // It is today AND it hasn't passed yet
            return isSameDay(date, now) && !isBefore(date, now);
        }).sort((a, b) => safeParseDate(a.next_notification_at) - safeParseDate(b.next_notification_at));
    }, [allTasks]);

    const stats = useMemo(() => {
        // Reuse the logic from overdueTasks/dueTodayTasks to ensure consistency
        const urgent = overdueTasks.length;
        const dueToday = dueTodayTasks.length;

        const completed = allTasks.filter(t =>
            t.status.toLowerCase().includes('completado') ||
            t.status.toLowerCase().includes('listo') || // Common variations
            t.status.toLowerCase().includes('done')
        ).length;

        // Efficiency: (Completed / Total) * 100
        const efficiency = allTasks.length > 0 ? Math.round((completed / allTasks.length) * 100) : 0;

        return { urgent, dueToday, completed, efficiency };
    }, [allTasks, overdueTasks, dueTodayTasks]);

    // --- Chart Data Logic (Dynnamic Columns) ---
    const { chartData: currentChartData, chartKeys, chartColors } = useMemo(() => {
        // Find selected board (Type safe comparison)
        const selectedBoard = boards.find(b => String(b.id) === String(chartBoardId));

        if (!selectedBoard) return { chartData: [], chartKeys: [], chartColors: [] };

        // Use natural array order (matches Kanban Board visual order)
        const columns = selectedBoard.columns || [];
        const keys = columns.map(c => c.title);

        // Map column colors
        const colors = columns.map((c, i) => {
            if (c.color && COLOR_MAP[c.color]) {
                return COLOR_MAP[c.color];
            }
            return c.color || CHART_COLORS[i % CHART_COLORS.length];
        });

        // Generate last 5 days
        const now = new Date();
        const data = Array.from({ length: 5 }).map((_, i) => {
            const daysAgo = 4 - i;
            const date = subDays(now, daysAgo);

            const entry = {
                name: format(date, 'dd/MM') // e.g., 17/12
            };

            columns.forEach((col, colIndex) => {
                const realCount = (col.cards || []).length;
                let simulatedValue = realCount;

                if (daysAgo > 0) {
                    // Back-project simulation based on typical Kanban flow
                    if (colIndex === columns.length - 1) {
                        // "Done" (last col): Typically grows over time. So it was smaller in the past.
                        // Reduce by ~15% per day back
                        simulatedValue = Math.max(0, Math.round(realCount * (1 - (daysAgo * 0.15))));
                    } else if (colIndex === 0) {
                        // "ToDo" (first col): Typically shrinks or refills. Let's assume it was slightly fuller.
                        // Increase by ~5% per day back
                        simulatedValue = Math.round(realCount * (1 + (daysAgo * 0.05)));
                    } else {
                        // "In Progress" (middle): Variable. Add slight noise.
                        // Fluctuate +/- 1 or 2
                        const variance = Math.floor(Math.random() * 2);
                        simulatedValue = Math.max(0, realCount + (Math.random() > 0.5 ? variance : -variance));
                    }
                }

                entry[col.title] = simulatedValue;
            });
            return entry;
        });

        return { chartData: data, chartKeys: keys, chartColors: colors };
    }, [boards, chartBoardId]);



    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-transparent">
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 w-full">
                <div className="flex flex-col flex-1 gap-8 w-full">

                    {/* Header Section */}
                    {/* Moved to App Header but we can keep a sub-header or remove if redundant.
                        The main title is in the App Header now.
                        Let's keep a summary or greeting here, or just the stats.
                    */}
                    <div className="flex flex-col gap-0.5 pb-2">
                        <h1 className="text-2xl font-bold text-white tracking-tight">Resumen de Actividad</h1>
                        <p className="text-slate-400 text-xs">Visión general de tu productividad y tareas pendientes.</p>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                        {/* Críticas = Vencidas */}
                        <StatCard icon="warning" color="red" label="Críticas (Vencidas)" value={stats.urgent} />
                        <StatCard icon="event_busy" color="orange" label="Vencen Hoy" value={stats.dueToday} />
                        <StatCard icon="check_circle" color="green" label="Completadas" value={stats.completed} />
                        <StatCard icon="water_drop" color="blue" label="Eficiencia" value={`${stats.efficiency}%`} />
                    </div>

                    {/* Chart Section */}
                    <div className="w-full bg-[#0f172a] rounded-xl border border-slate-700/50 shadow-xl p-4 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 relative z-10">
                            <div>
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <span className="material-symbols-outlined text-indigo-400">bar_chart</span>
                                    Progreso por Columnas
                                </h3>
                                <p className="text-xs text-slate-400 mt-1">Distribución de tareas por estado en el tiempo.</p>
                            </div>

                            {/* Board Selector for Chart Analysis */}
                            <div className="relative inline-block">
                                <select
                                    value={chartBoardId}
                                    onChange={(e) => setChartBoardId(e.target.value)}
                                    className="appearance-none bg-[#1e293b] border border-slate-700/50 text-slate-200 text-xs font-semibold rounded-lg pl-4 pr-10 py-2 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all cursor-pointer shadow-lg shadow-black/20 hover:bg-[#253045]"
                                >
                                    {boards.map(board => (
                                        <option key={board.id} value={board.id}>{board.title}</option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                    <span className="material-symbols-outlined text-slate-400 text-[16px]">expand_more</span>
                                </div>
                            </div>
                        </div>

                        <div className="h-72 w-full mb-6 relative z-10">
                            <ResponsiveContainer width="100%" height="100%" key={`bar-${chartBoardId}-${chartKeys.join('-')}`}>
                                <BarChart data={currentChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                                        itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                                        cursor={{ fill: 'rgba(99, 102, 241, 0.1)' }}
                                    />
                                    {chartKeys.map((key, index) => (
                                        <Bar
                                            key={key}
                                            dataKey={key}
                                            stackId="a"
                                            fill={chartColors[index]}
                                            name={key}
                                            radius={index === chartKeys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                                            barSize={32}
                                        />
                                    ))}
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Custom Legend to guarantee order */}
                        <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 px-4 pb-2 border-t border-slate-800/50 pt-6">
                            {chartKeys.map((key, index) => (
                                <div key={key} className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full ring-2 ring-[#0f172a]" style={{ backgroundColor: chartColors[index] }} />
                                    <span className="text-xs text-slate-400 font-medium">{key}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Task Lists Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full pb-8">
                        {/* Overdue */}
                        <TaskListCard
                            title="Tareas Vencidas"
                            count={overdueTasks.length}
                            icon="priority_high"
                            color="red"
                            tasks={overdueTasks.slice(0, 5)}
                            onTaskClick={onNavigateToTask}
                            onViewAll={() => setActiveModal({
                                type: 'overdue',
                                title: 'Tareas Vencidas',
                                tasks: overdueTasks,
                                color: 'red',
                                icon: 'priority_high'
                            })}
                        />

                        {/* Due Today */}
                        <TaskListCard
                            title="Vencen Hoy"
                            count={dueTodayTasks.length}
                            icon="today"
                            color="orange"
                            tasks={dueTodayTasks.slice(0, 5)}
                            onTaskClick={onNavigateToTask}
                            onViewAll={() => setActiveModal({
                                type: 'dueToday',
                                title: 'Vencen Hoy',
                                tasks: dueTodayTasks,
                                color: 'orange',
                                icon: 'today'
                            })}
                        />
                    </div>
                </div >
            </div >

            {/* View All Modal */}
            < DashboardListModal
                isOpen={!!activeModal}
                onClose={() => setActiveModal(null)}
                title={activeModal?.title || ''}
                tasks={activeModal?.tasks || []}
                color={activeModal?.color || 'red'}
                icon={activeModal?.icon || 'error'}
                onTaskClick={onNavigateToTask}
            />
        </div >
    );
};

// --- Subcomponents ---

const StatCard = ({ icon, color, label, value, change, changeColor = "text-emerald-400" }) => {
    const colorClasses = {
        red: "bg-red-500/10 text-red-500 shadow-[0_0_15px_-3px_rgba(239,68,68,0.2)]",
        orange: "bg-orange-500/10 text-orange-500 shadow-[0_0_15px_-3px_rgba(249,115,22,0.2)]",
        green: "bg-emerald-500/10 text-emerald-500 shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)]",
        blue: "bg-blue-500/10 text-blue-500 shadow-[0_0_15px_-3px_rgba(59,130,246,0.2)]",
    };

    return (
        <div className="flex items-center gap-3 rounded-xl p-4 bg-[#0f172a] border border-slate-700/50 shadow-lg hover:shadow-xl hover:bg-[#1e293b] hover:-translate-y-1 transition-all duration-300 group cursor-default">
            <div className={`w-12 h-12 flex items-center justify-center rounded-xl shrink-0 ${colorClasses[color]} transition-transform duration-300 group-hover:scale-110`}>
                <span className="material-symbols-outlined text-[24px]">{icon}</span>
            </div>
            <div className="flex flex-col">
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-0.5">{label}</p>
                <div className="flex items-baseline gap-2">
                    <p className="text-white text-2xl font-bold tracking-tight">{value}</p>
                    <span className={`${color === 'red' ? 'text-red-400' : changeColor} text-[10px] font-bold bg-white/5 px-1.5 rounded-full`}>{change}</span>
                </div>
            </div>
        </div>
    );
};

const TaskListCard = ({ title, count, icon, color, tasks, onViewAll, onTaskClick }) => {
    const colorMap = {
        red: {
            headerGradient: 'from-red-500/20 to-red-500/5',
            iconBg: 'bg-red-500/20',
            iconText: 'text-red-400',
            borderColor: 'border-red-500/20',
            buttonHover: 'hover:text-red-300'
        },
        orange: {
            headerGradient: 'from-orange-500/20 to-orange-500/5',
            iconBg: 'bg-orange-500/20',
            iconText: 'text-orange-400',
            borderColor: 'border-orange-500/20',
            buttonHover: 'hover:text-orange-300'
        },
    };
    const c = colorMap[color];

    return (
        <div className={`flex flex-col rounded-2xl bg-[#0f172a] border border-slate-700/50 shadow-xl overflow-hidden h-full group hover:border-slate-600/50 transition-colors`}>
            {/* Header */}
            <div className={`px-4 py-3 border-b border-slate-800 bg-gradient-to-r ${c.headerGradient} flex justify-between items-center relative overflow-hidden`}>
                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="flex items-center gap-3 relative z-10">
                    <div className={`w-8 h-8 flex items-center justify-center rounded-lg ${c.iconBg} ${c.iconText} shadow-lg`}>
                        <span className="material-symbols-outlined text-[20px]">{icon}</span>
                    </div>
                    <h4 className="text-white font-bold text-base tracking-wide">{title}</h4>
                </div>
                <span className={`bg-[#0f172a]/50 border border-white/10 ${c.iconText} text-xs px-3 py-1 rounded-full font-bold shadow-sm backdrop-blur-sm z-10`}>{count}</span>
            </div>

            {/* List */}
            <div className="flex-1 flex flex-col divide-y divide-slate-800/50 overflow-y-auto max-h-[350px] custom-scrollbar bg-[#0f172a]">
                {tasks.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-10 text-center opacity-50 h-full">
                        <span className="material-symbols-outlined text-4xl text-slate-600">task_alt</span>
                        <span className="text-slate-500 text-sm font-medium">Todo al día. ¡Buen trabajo!</span>
                    </div>
                ) : tasks.map(task => (
                    <div key={task.id}
                        onClick={() => onTaskClick?.(task)}
                        className="p-4 hover:bg-[#1e293b] transition-colors group/item cursor-pointer flex flex-col gap-2 relative"
                    >
                        <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-transparent group-hover/item:bg-indigo-500 transition-colors"></div>
                        {/* Top Row: Title */}
                        <div className="pl-2">
                            <h5 className="text-sm font-bold text-slate-200 group-hover/item:text-white leading-snug">{task.title}</h5>
                            {task.description && (
                                <p className="text-xs text-slate-400 line-clamp-2 mt-1 font-medium">{task.description}</p>
                            )}
                        </div>

                        {/* Location Context (Board > Column) */}
                        <div className="flex items-center flex-wrap gap-2 text-[10px] pl-2 mt-1">
                            <span className="flex items-center gap-1 text-slate-500">
                                {task.boardTitle}
                            </span>
                            <span className="text-slate-700">/</span>
                            <span className={`font-semibold ${color === 'red' ? 'text-red-400' : 'text-orange-400'}`}>
                                {task.columnTitle}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-3 bg-[#1e293b]/50 text-center border-t border-slate-800 backdrop-blur-sm">
                <button onClick={onViewAll} className={`text-xs font-bold text-slate-400 ${c.buttonHover} hover:text-white transition-colors flex items-center justify-center gap-1 mx-auto py-1`}>
                    Ver lista completa <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </button>
            </div>
        </div>
    );
};

export default Dashboard;
