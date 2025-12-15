import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { isSameDay, parseISO, isBefore } from 'date-fns';

const Dashboard = ({ boards }) => {

    const safeParseDate = (date) => {
        if (!date) return null;
        if (date instanceof Date) return date;
        if (typeof date === 'string') return parseISO(date);
        return new Date(date);
    };

    // --- Data Aggregation ---
    const allTasks = useMemo(() => {
        return boards.flatMap(b => b.columns.flatMap(c => (c.cards || []).map(t => ({ ...t, status: c.title }))));
    }, [boards]);

    const stats = useMemo(() => {
        const today = new Date();
        const urgent = allTasks.filter(t => t.title.toLowerCase().includes('urgente') || t.description?.toLowerCase().includes('urgente')).length; // Simple heuristic
        const dueToday = allTasks.filter(t => {
            if (!t.next_notification_at) return false;
            const date = safeParseDate(t.next_notification_at);
            return isSameDay(date, today);
        }).length;
        const completed = allTasks.filter(t => t.status.toLowerCase().includes('completado') || t.status.toLowerCase().includes('done')).length;

        // Efficiency: (Completed / Total) * 100
        const efficiency = allTasks.length > 0 ? Math.round((completed / allTasks.length) * 100) : 0;

        return { urgent, dueToday, completed, efficiency };
    }, [allTasks]);

    const overdueTasks = useMemo(() => {
        const today = new Date();
        return allTasks.filter(t => {
            if (!t.next_notification_at) return false;
            const date = safeParseDate(t.next_notification_at);
            return isBefore(date, today) && !isSameDay(date, today);
        }).slice(0, 5);
    }, [allTasks]);

    const dueTodayTasks = useMemo(() => {
        const today = new Date();
        return allTasks.filter(t => {
            if (!t.next_notification_at) return false;
            const date = safeParseDate(t.next_notification_at);
            return isSameDay(date, today);
        }).slice(0, 5);
    }, [allTasks]);

    // Mock Chart Data (since we don't have historical snapshots)
    const chartData = [
        { name: '01 Oct', ToDo: 10, InProgress: 5, Done: 2 },
        { name: '08 Oct', ToDo: 15, InProgress: 8, Done: 5 },
        { name: '15 Oct', ToDo: 12, InProgress: 12, Done: 10 },
        { name: '22 Oct', ToDo: 8, InProgress: 15, Done: 20 },
        { name: '29 Oct', ToDo: 5, InProgress: 10, Done: 35 }, // Trend towards completion
    ];

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0f172a]/95">
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:px-10 lg:px-20 w-full max-w-[1440px] mx-auto">
                <div className="flex flex-col flex-1 gap-6 w-full">
                    {/* Header Section */}
                    <div className="flex flex-wrap items-end justify-between gap-4 pb-2">
                        <div className="flex flex-col gap-1">
                            <h1 className="text-white text-3xl font-black leading-tight tracking-[-0.033em]">Dashboard Principal</h1>
                            <p className="text-[#93adc8] text-base font-normal">Eficiencia, flujo de trabajo y prioridades inmediatas.</p>
                        </div>
                        {/* Actions (Visual Only for now) */}
                        <div className="flex gap-3">
                            <button className="flex items-center justify-center gap-2 rounded-lg h-10 px-4 bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20">
                                <span className="material-symbols-outlined text-[18px]">tune</span>
                                <span className="truncate">Filtros</span>
                            </button>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard icon="warning" color="red" label="Críticas" value={stats.urgent} change="+1" />
                        <StatCard icon="event_busy" color="orange" label="Vencen Hoy" value={stats.dueToday} change="=" changeColor="text-gray-400" />
                        <StatCard icon="check_circle" color="green" label="Completadas" value={stats.completed} change="+5%" />
                        <StatCard icon="water_drop" color="blue" label="Eficiencia" value={`${stats.efficiency}%`} change="+1.5%" />
                    </div>

                    {/* Chart Section */}
                    <div className="w-full bg-[#1e2936] rounded-xl border border-[#344d65] shadow-xl p-6 relative">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <span className="material-symbols-outlined text-indigo-500">stacked_line_chart</span>
                                    Diagrama de Flujo Acumulado
                                </h3>
                                <p className="text-sm text-gray-400 mt-1 pl-8">Interacción en tiempo real con fases y progreso.</p>
                            </div>
                        </div>

                        <div className="h-72 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorToDo" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorInProgress" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorDone" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#344d65" vertical={false} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e2936', borderColor: '#344d65', color: '#fff' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Area type="monotone" dataKey="Done" stackId="1" stroke="#10b981" fillOpacity={1} fill="url(#colorDone)" name="Completado" />
                                    <Area type="monotone" dataKey="InProgress" stackId="1" stroke="#3b82f6" fillOpacity={1} fill="url(#colorInProgress)" name="En Progreso" />
                                    <Area type="monotone" dataKey="ToDo" stackId="1" stroke="#f59e0b" fillOpacity={1} fill="url(#colorToDo)" name="Por Hacer" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Task Lists Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full pb-6">
                        {/* Overdue */}
                        <TaskListCard
                            title="Vencidas"
                            count={overdueTasks.length}
                            icon="priority_high"
                            color="red"
                            tasks={overdueTasks}
                        />

                        {/* Due Today */}
                        <TaskListCard
                            title="Vencen Hoy"
                            count={dueTodayTasks.length}
                            icon="today"
                            color="orange"
                            tasks={dueTodayTasks}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Subcomponents ---

const StatCard = ({ icon, color, label, value, change, changeColor = "text-green-500" }) => {
    const colorClasses = {
        red: "bg-red-900/20 text-red-500",
        orange: "bg-orange-900/20 text-orange-500",
        green: "bg-green-900/20 text-green-500",
        blue: "bg-blue-900/20 text-blue-500",
    };

    return (
        <div className="flex items-center gap-4 rounded-xl p-4 bg-[#1e2936] border border-[#344d65] shadow-sm hover:border-indigo-500/50 transition-colors group">
            <div className={`p-2 rounded-lg shrink-0 ${colorClasses[color]}`}>
                <span className="material-symbols-outlined text-[20px]">{icon}</span>
            </div>
            <div className="flex flex-col">
                <p className="text-[#93adc8] text-xs font-medium uppercase tracking-wide">{label}</p>
                <div className="flex items-baseline gap-2">
                    <p className="text-white text-lg font-bold">{value}</p>
                    <span className={`${color === 'red' ? 'text-red-500' : changeColor} text-xs font-bold flex items-center`}>{change}</span>
                </div>
            </div>
        </div>
    );
};

const TaskListCard = ({ title, count, icon, color, tasks }) => {
    const colorMap = {
        red: { bgHeader: 'from-red-900/20', bgIcon: 'bg-red-900/40', textIcon: 'text-red-400', textHeader: 'text-red-200', border: 'border-red-900/40' },
        orange: { bgHeader: 'from-orange-900/20', bgIcon: 'bg-orange-900/40', textIcon: 'text-orange-400', textHeader: 'text-orange-200', border: 'border-orange-900/40' },
    };
    const c = colorMap[color];

    return (
        <div className={`flex flex-col rounded-xl bg-[#1e2936] border ${c.border} shadow-md overflow-hidden h-full`}>
            <div className={`px-5 py-3 border-b border-gray-700 bg-gradient-to-r ${c.bgHeader} to-[#1e2936] flex justify-between items-center`}>
                <div className="flex items-center gap-2">
                    <div className={`p-1 rounded ${c.bgIcon} ${c.textIcon}`}>
                        <span className="material-symbols-outlined text-[18px]">{icon}</span>
                    </div>
                    <h4 className={`${c.textHeader} font-bold text-base`}>{title}</h4>
                </div>
                <span className={`${c.bgIcon} ${c.textIcon} text-xs px-2.5 py-1 rounded-full font-bold`}>{count} Tareas</span>
            </div>
            <div className="flex-1 flex flex-col divide-y divide-[#344d65] overflow-y-auto max-h-[350px] custom-scrollbar">
                {tasks.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 text-sm">No hay tareas en esta sección.</div>
                ) : tasks.map(task => (
                    <div key={task.id} className="p-3 hover:bg-[#243647] transition-colors group cursor-pointer flex items-center gap-3">
                        {/* Simple status/priority indicator placeholder */}
                        <div className={`flex flex-col items-center justify-center size-10 rounded-lg ${c.bgIcon} ${c.textIcon} shrink-0 border border-white/5`}>
                            <span className="material-symbols-outlined text-lg">event</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between">
                                <h5 className="text-sm font-semibold text-white truncate">{task.title}</h5>
                                {task.reminder_enabled && <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700 text-gray-300 font-bold whitespace-nowrap ml-2">REMINDER</span>}
                            </div>
                            <p className="text-xs text-gray-400 truncate">{task.description || "Sin descripción"}</p>
                        </div>
                    </div>
                ))}
            </div>
            <div className="p-2 bg-[#161f29] text-center border-t border-[#344d65]">
                <button className={`text-xs font-bold ${c.textIcon} hover:underline`}>Ver todas</button>
            </div>
        </div>
    );
};

export default Dashboard;
