import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import ActivityModal from './modals/ActivityModal';
import { Icons } from '../ui/Icons';
import toast from 'react-hot-toast';
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const CRMActivities = () => {
    const { activities, createActivity, updateActivity, completeActivity, deleteActivity, contacts, opportunities } = useCRM();
    const [showModal, setShowModal] = useState(false);
    const [editingActivity, setEditingActivity] = useState(null);
    const [filter, setFilter] = useState('pending'); // 'pending' | 'overdue' | 'today' | 'upcoming'

    // Filter activities
    const filteredActivities = activities.filter(activity => {
        if (activity.is_done) return false;

        const dueDate = activity.due_date ? parseISO(activity.due_date) : null;

        switch (filter) {
            case 'overdue':
                return dueDate && isPast(dueDate) && !isToday(dueDate);
            case 'today':
                return dueDate && isToday(dueDate);
            case 'upcoming':
                return dueDate && !isPast(dueDate) && !isToday(dueDate);
            default: // 'pending' - all pending
                return true;
        }
    });

    // Group by date
    const overdueActivities = activities.filter(a => !a.is_done && a.due_date && isPast(parseISO(a.due_date)) && !isToday(parseISO(a.due_date)));
    const todayActivities = activities.filter(a => !a.is_done && a.due_date && isToday(parseISO(a.due_date)));
    const upcomingActivities = activities.filter(a => !a.is_done && a.due_date && !isPast(parseISO(a.due_date)) && !isToday(parseISO(a.due_date)));

    const activityIcons = {
        call: { icon: 'call', color: 'text-blue-400 bg-blue-500/20' },
        meeting: { icon: 'groups', color: 'text-purple-400 bg-purple-500/20' },
        email: { icon: 'mail', color: 'text-amber-400 bg-amber-500/20' },
        task: { icon: 'check_circle', color: 'text-emerald-400 bg-emerald-500/20' },
        note: { icon: 'sticky_note_2', color: 'text-slate-400 bg-slate-500/20' },
        deadline: { icon: 'schedule', color: 'text-red-400 bg-red-500/20' },
    };

    const handleCreate = () => {
        setEditingActivity(null);
        setShowModal(true);
    };

    const handleEdit = (activity) => {
        setEditingActivity(activity);
        setShowModal(true);
    };

    const handleSave = async (data) => {
        try {
            if (editingActivity) {
                await updateActivity(editingActivity.id, data);
                toast.success('Actividad actualizada');
            } else {
                await createActivity(data);
                toast.success('Actividad creada');
            }
            setShowModal(false);
            setEditingActivity(null);
        } catch {
            toast.error('Error al guardar actividad');
        }
    };

    const handleComplete = async (activity) => {
        try {
            await completeActivity(activity.id);
            toast.success('Actividad completada');
        } catch {
            toast.error('Error al completar');
        }
    };

    const handleDelete = async () => {
        if (!editingActivity) return;
        try {
            await deleteActivity(editingActivity.id);
            toast.success('Actividad eliminada');
            setShowModal(false);
            setEditingActivity(null);
        } catch {
            toast.error('Error al eliminar');
        }
    };

    const formatActivityDate = (dateStr) => {
        if (!dateStr) return 'Sin fecha';
        const date = parseISO(dateStr);

        if (isToday(date)) return `Hoy, ${format(date, 'HH:mm', { locale: es })}`;
        if (isTomorrow(date)) return `Mañana, ${format(date, 'HH:mm', { locale: es })}`;

        return format(date, "d 'de' MMMM, HH:mm", { locale: es });
    };

    const ActivityCard = ({ activity }) => {
        const iconConfig = activityIcons[activity.activity_type] || activityIcons.task;
        const isOverdue = activity.due_date && isPast(parseISO(activity.due_date)) && !isToday(parseISO(activity.due_date));

        return (
            <div
                className={`bg-slate-800/50 rounded-lg p-4 border transition-all hover:border-indigo-500/30 cursor-pointer group ${isOverdue ? 'border-red-500/30' : 'border-white/5'
                    }`}
                onClick={() => handleEdit(activity)}
            >
                <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconConfig.color}`}>
                        <span className="material-symbols-outlined text-[20px]">{iconConfig.icon}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                            <h4 className="font-medium text-white group-hover:text-indigo-400 transition-colors">{activity.title}</h4>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleComplete(activity); }}
                                className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                title="Marcar como completada"
                            >
                                <Icons.Check size={16} />
                            </button>
                        </div>

                        {activity.description && (
                            <p className="text-sm text-slate-400 mt-1 line-clamp-2">{activity.description}</p>
                        )}

                        <div className="flex items-center gap-4 mt-2 text-xs">
                            <span className={`${isOverdue ? 'text-red-400' : 'text-slate-400'}`}>
                                <span className="material-symbols-outlined text-[12px] align-middle mr-1">schedule</span>
                                {formatActivityDate(activity.due_date)}
                            </span>

                            {activity.contact && (
                                <span className="text-slate-500">
                                    <Icons.User size={12} className="inline mr-1" />
                                    {activity.contact.first_name} {activity.contact.last_name}
                                </span>
                            )}

                            {activity.opportunity && (
                                <span className="text-slate-500">
                                    <span className="material-symbols-outlined text-[12px] align-middle mr-1">monetization_on</span>
                                    {activity.opportunity.name}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setFilter('pending')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'pending' ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:bg-slate-700'
                            }`}
                    >
                        Todas ({activities.filter(a => !a.is_done).length})
                    </button>
                    <button
                        onClick={() => setFilter('overdue')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'overdue' ? 'bg-red-500/20 text-red-400' : 'text-slate-400 hover:bg-slate-700'
                            }`}
                    >
                        Vencidas ({overdueActivities.length})
                    </button>
                    <button
                        onClick={() => setFilter('today')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'today' ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400 hover:bg-slate-700'
                            }`}
                    >
                        Hoy ({todayActivities.length})
                    </button>
                    <button
                        onClick={() => setFilter('upcoming')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'upcoming' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:bg-slate-700'
                            }`}
                    >
                        Próximas ({upcomingActivities.length})
                    </button>
                </div>

                <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors shadow-lg shadow-indigo-500/20"
                >
                    <Icons.Plus size={18} />
                    Nueva Actividad
                </button>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2 mb-6">
                {[
                    { type: 'call', label: 'Llamada', icon: 'call' },
                    { type: 'meeting', label: 'Reunión', icon: 'groups' },
                    { type: 'email', label: 'Email', icon: 'mail' },
                    { type: 'task', label: 'Tarea', icon: 'check_circle' },
                ].map(action => (
                    <button
                        key={action.type}
                        onClick={() => { setEditingActivity({ activity_type: action.type }); setShowModal(true); }}
                        className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 hover:bg-slate-700 border border-white/5 rounded-lg text-sm text-slate-300 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[16px]">{action.icon}</span>
                        {action.label}
                    </button>
                ))}
            </div>

            {/* Activities List */}
            <div className="flex-1 overflow-auto space-y-3">
                {filteredActivities.map(activity => (
                    <ActivityCard key={activity.id} activity={activity} />
                ))}

                {filteredActivities.length === 0 && (
                    <div className="text-center py-12 text-slate-500">
                        <span className="material-symbols-outlined text-[48px] mb-2 block opacity-50">event_available</span>
                        No hay actividades pendientes
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <ActivityModal
                    activity={editingActivity}
                    contacts={contacts}
                    opportunities={opportunities}
                    onClose={() => { setShowModal(false); setEditingActivity(null); }}
                    onSave={handleSave}
                    onDelete={editingActivity?.id ? handleDelete : null}
                />
            )}
        </div>
    );
};

export default CRMActivities;
