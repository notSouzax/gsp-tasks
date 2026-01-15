import React, { useMemo } from 'react';
import { useCRM } from '../../context/CRMContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const CRMDashboard = () => {
    const {
        getStats,
        opportunities,
        activities,
        activeStages,
        contacts
    } = useCRM();

    const stats = getStats();

    // Pipeline Chart Data
    const pipelineData = useMemo(() => {
        return activeStages
            .filter(s => !s.is_won && !s.is_lost)
            .map(stage => {
                const stageOpps = opportunities.filter(o => o.stage_id === stage.id);
                return {
                    name: stage.name,
                    value: stageOpps.reduce((sum, o) => sum + (parseFloat(o.expected_revenue) || 0), 0),
                    count: stageOpps.length,
                    color: getStageColor(stage.color),
                };
            });
    }, [activeStages, opportunities]);

    // Lead Source Distribution
    const sourceData = useMemo(() => {
        const sources = {};
        contacts.forEach(c => {
            const source = c.lead_source || 'Sin fuente';
            sources[source] = (sources[source] || 0) + 1;
        });
        return Object.entries(sources).map(([name, value], i) => ({
            name: formatSourceName(name),
            value,
            color: COLORS[i % COLORS.length]
        }));
    }, [contacts]);

    // Forecast Data - Valor ponderado por etapa
    const forecastData = useMemo(() => {
        return activeStages
            .filter(s => !s.is_won && !s.is_lost)
            .map(stage => {
                const stageOpps = opportunities.filter(o => o.stage_id === stage.id && !o.is_won && !o.is_lost);
                const totalValue = stageOpps.reduce((sum, o) => sum + (parseFloat(o.expected_revenue) || 0), 0);
                const avgProbability = stageOpps.length > 0
                    ? stageOpps.reduce((sum, o) => sum + (o.probability || stage.default_probability || 50), 0) / stageOpps.length
                    : stage.default_probability || 50;
                const weightedValue = stageOpps.reduce((sum, o) => {
                    const prob = o.probability || stage.default_probability || 50;
                    return sum + ((parseFloat(o.expected_revenue) || 0) * prob / 100);
                }, 0);

                return {
                    name: stage.name,
                    totalValue,
                    weightedValue,
                    probability: Math.round(avgProbability),
                    count: stageOpps.length,
                    color: getStageColor(stage.color)
                };
            });
    }, [activeStages, opportunities]);

    // Upcoming Activities (next 7 days)
    const upcomingActivities = activities
        .filter(a => !a.is_done)
        .slice(0, 5);

    // Total forecast
    const totalForecast = forecastData.reduce((sum, d) => sum + d.weightedValue, 0);

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR',
            notation: 'compact',
            maximumFractionDigits: 1
        }).format(value || 0);
    };

    return (
        <div className="flex-1 overflow-auto p-6">
            {/* KPIs Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <StatCard
                    icon="monetization_on"
                    label="Pipeline Total"
                    value={formatCurrency(stats.totalPipelineValue)}
                    subvalue={`${formatCurrency(stats.weightedPipelineValue)} ponderado`}
                    color="from-indigo-500 to-purple-500"
                />
                <StatCard
                    icon="trending_up"
                    label="Oportunidades Activas"
                    value={stats.activeOpportunities}
                    subvalue={`${stats.wonOpportunities} ganadas`}
                    color="from-emerald-500 to-teal-500"
                />
                <StatCard
                    icon="people"
                    label="Contactos"
                    value={stats.totalContacts}
                    subvalue={`${stats.totalCompanies} empresas`}
                    color="from-blue-500 to-cyan-500"
                />
                <StatCard
                    icon="percent"
                    label="Tasa de Conversión"
                    value={`${stats.conversionRate}%`}
                    subvalue={`${stats.lostOpportunities} perdidas`}
                    color="from-amber-500 to-orange-500"
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Pipeline Funnel */}
                <div className="bg-slate-800/50 rounded-xl border border-white/5 p-5">
                    <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-indigo-400">view_kanban</span>
                        Pipeline por Etapa
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={pipelineData} layout="vertical" margin={{ left: 20, right: 20 }}>
                                <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} stroke="#64748b" fontSize={11} />
                                <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={11} width={80} />
                                <Tooltip
                                    formatter={(value) => [formatCurrency(value), 'Valor']}
                                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                    labelStyle={{ color: '#fff' }}
                                />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                    {pipelineData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Lead Sources */}
                <div className="bg-slate-800/50 rounded-xl border border-white/5 p-5">
                    <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-emerald-400">source</span>
                        Contactos por Fuente
                    </h3>
                    <div className="h-64 flex items-center">
                        {sourceData.length > 0 ? (
                            <>
                                <div className="w-1/2 h-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={sourceData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={40}
                                                outerRadius={80}
                                                paddingAngle={2}
                                                dataKey="value"
                                            >
                                                {sourceData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="w-1/2 space-y-2">
                                    {sourceData.map((item, i) => (
                                        <div key={i} className="flex items-center gap-2 text-sm">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                            <span className="text-slate-300 flex-1">{item.name}</span>
                                            <span className="text-white font-medium">{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-slate-500">
                                Sin datos de fuentes
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Forecast Section */}
            <div className="bg-slate-800/50 rounded-xl border border-white/5 p-5 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-emerald-400">analytics</span>
                        Forecast de Ventas
                    </h3>
                    <div className="text-right">
                        <div className="text-2xl font-bold text-emerald-400">{formatCurrency(totalForecast)}</div>
                        <div className="text-xs text-slate-400">Valor ponderado total</div>
                    </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {forecastData.map((stage, i) => (
                        <div key={i} className="bg-slate-900/50 rounded-lg p-3 border border-white/5">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                                <span className="text-sm text-slate-300 truncate">{stage.name}</span>
                            </div>
                            <div className="text-lg font-bold text-white">{formatCurrency(stage.weightedValue)}</div>
                            <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
                                <span>{stage.count} opp</span>
                                <span className="text-emerald-400">{stage.probability}%</span>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-1 mt-2">
                                <div
                                    className="h-1 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                                    style={{ width: `${stage.probability}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
                {forecastData.length === 0 && (
                    <div className="text-center py-8 text-slate-500">
                        No hay oportunidades activas para calcular forecast
                    </div>
                )}
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Opportunities */}
                <div className="lg:col-span-2 bg-slate-800/50 rounded-xl border border-white/5 p-5">
                    <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-purple-400">local_offer</span>
                        Oportunidades Recientes
                    </h3>
                    <div className="space-y-3">
                        {[...opportunities]
                            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                            .slice(0, 5)
                            .map(opp => (
                                <div key={opp.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                                    <div>
                                        <div className="font-medium text-white">{opp.name}</div>
                                        <div className="text-sm text-slate-400">
                                            {opp.company?.name || opp.contact?.first_name || 'Sin asignar'}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-semibold text-emerald-400">{formatCurrency(opp.expected_revenue)}</div>
                                        <div className="text-xs text-slate-500">{opp.stage?.name}</div>
                                    </div>
                                </div>
                            ))}
                        {opportunities.length === 0 && (
                            <div className="text-center py-8 text-slate-500">
                                Sin oportunidades
                            </div>
                        )}
                    </div>
                </div>

                {/* Upcoming Activities */}
                <div className="bg-slate-800/50 rounded-xl border border-white/5 p-5">
                    <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-amber-400">schedule</span>
                        Próximas Actividades
                    </h3>
                    <div className="space-y-3">
                        {upcomingActivities.map(activity => (
                            <div key={activity.id} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getActivityStyle(activity.activity_type)}`}>
                                    <span className="material-symbols-outlined text-[16px]">{getActivityIcon(activity.activity_type)}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-white text-sm truncate">{activity.title}</div>
                                    <div className="text-xs text-slate-400">
                                        {activity.due_date ? new Date(activity.due_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Sin fecha'}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {upcomingActivities.length === 0 && (
                            <div className="text-center py-8 text-slate-500 text-sm">
                                Sin actividades pendientes
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Helper Components
const StatCard = ({ icon, label, value, subvalue, color }) => (
    <div className="bg-slate-800/50 rounded-xl border border-white/5 p-5 relative overflow-hidden">
        <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full bg-gradient-to-br ${color} opacity-10 blur-2xl`} />
        <div className="flex items-start justify-between">
            <div>
                <p className="text-slate-400 text-sm mb-1">{label}</p>
                <p className="text-2xl font-bold text-white">{value}</p>
                {subvalue && <p className="text-xs text-slate-500 mt-1">{subvalue}</p>}
            </div>
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${color} bg-opacity-20 flex items-center justify-center`}>
                <span className="material-symbols-outlined text-white">{icon}</span>
            </div>
        </div>
    </div>
);

// Helpers
const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6'];

const getStageColor = (color) => {
    const colors = {
        slate: '#64748b',
        blue: '#3b82f6',
        purple: '#8b5cf6',
        amber: '#f59e0b',
        emerald: '#10b981',
        red: '#ef4444',
        indigo: '#6366f1',
    };
    return colors[color] || colors.indigo;
};

const formatSourceName = (source) => {
    const names = {
        web: 'Sitio Web',
        referral: 'Referido',
        social: 'Redes Sociales',
        ads: 'Publicidad',
        event: 'Evento',
        cold_call: 'Llamada en frío',
        email: 'Email',
        partner: 'Partner',
        other: 'Otro',
        'Sin fuente': 'Sin fuente',
    };
    return names[source] || source;
};

const getActivityIcon = (type) => {
    const icons = { call: 'call', meeting: 'groups', email: 'mail', task: 'check_circle', note: 'sticky_note_2', deadline: 'schedule' };
    return icons[type] || 'check_circle';
};

const getActivityStyle = (type) => {
    const styles = {
        call: 'text-blue-400 bg-blue-500/20',
        meeting: 'text-purple-400 bg-purple-500/20',
        email: 'text-amber-400 bg-amber-500/20',
        task: 'text-emerald-400 bg-emerald-500/20',
        note: 'text-slate-400 bg-slate-500/20',
        deadline: 'text-red-400 bg-red-500/20',
    };
    return styles[type] || styles.task;
};

export default CRMDashboard;
