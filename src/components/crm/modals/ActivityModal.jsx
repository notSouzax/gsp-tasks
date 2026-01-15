import React, { useState, useEffect, useCallback } from 'react';
import { Icons } from '../../ui/Icons';

const ActivityModal = ({ activity, contacts, opportunities, onClose, onSave, onDelete }) => {
    const isEditing = !!activity?.id;
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        activity_type: 'task',
        due_date: '',
        due_time: '',
        duration_minutes: 30,
        priority: 'normal',
        contact_id: '',
        opportunity_id: '',
    });

    // ESC key handler
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Escape') {
            onClose();
        }
    }, [onClose]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    useEffect(() => {
        if (activity) {
            let dueDate = '';
            let dueTime = '';

            if (activity.due_date) {
                const date = new Date(activity.due_date);
                dueDate = date.toISOString().split('T')[0];
                dueTime = date.toTimeString().slice(0, 5);
            }

            setFormData({
                title: activity.title || '',
                description: activity.description || '',
                activity_type: activity.activity_type || 'task',
                due_date: dueDate,
                due_time: dueTime,
                duration_minutes: activity.duration_minutes || 30,
                priority: activity.priority || 'normal',
                contact_id: activity.contact_id || '',
                opportunity_id: activity.opportunity_id || '',
            });
        }
    }, [activity]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title.trim() || saving) return;

        let dueDateTime = null;
        if (formData.due_date) {
            const time = formData.due_time || '09:00';
            dueDateTime = new Date(`${formData.due_date}T${time}`).toISOString();
        }

        setSaving(true);
        const data = {
            title: formData.title,
            description: formData.description || null,
            activity_type: formData.activity_type,
            due_date: dueDateTime,
            duration_minutes: parseInt(formData.duration_minutes) || 30,
            priority: formData.priority,
            contact_id: formData.contact_id || null,
            opportunity_id: formData.opportunity_id || null,
        };

        try {
            await onSave(data);
        } finally {
            setSaving(false);
        }
    };

    const activityTypes = [
        { value: 'call', label: '📞 Llamada', icon: 'call' },
        { value: 'meeting', label: '👥 Reunión', icon: 'groups' },
        { value: 'email', label: '📧 Email', icon: 'mail' },
        { value: 'task', label: '✅ Tarea', icon: 'check_circle' },
        { value: 'note', label: '📝 Nota', icon: 'sticky_note_2' },
        { value: 'deadline', label: '⏰ Deadline', icon: 'schedule' },
    ];

    const durations = [
        { value: 15, label: '15 min' },
        { value: 30, label: '30 min' },
        { value: 45, label: '45 min' },
        { value: 60, label: '1 hora' },
        { value: 90, label: '1.5 horas' },
        { value: 120, label: '2 horas' },
    ];

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#1e293b] rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden border border-white/10">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-white/10 bg-slate-800/50">
                    <h2 className="text-xl font-bold text-white">
                        {isEditing ? 'Editar Actividad' : 'Nueva Actividad'}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <Icons.X size={24} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-5 space-y-5 overflow-y-auto max-h-[calc(90vh-140px)]">
                    {/* Activity Type */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Tipo de Actividad
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {activityTypes.map(type => (
                                <button
                                    key={type.value}
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, activity_type: type.value }))}
                                    className={`p-2 rounded-lg border text-sm font-medium transition-all ${formData.activity_type === type.value
                                        ? 'border-indigo-500 bg-indigo-500/20 text-indigo-400'
                                        : 'border-slate-700 text-slate-400 hover:border-slate-600'
                                        }`}
                                >
                                    {type.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">
                            Título *
                        </label>
                        <input
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            placeholder="Ej: Llamada de seguimiento con cliente"
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                            required
                        />
                    </div>

                    {/* Date & Time */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                Fecha
                            </label>
                            <input
                                type="date"
                                name="due_date"
                                value={formData.due_date}
                                onChange={handleChange}
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                Hora
                            </label>
                            <input
                                type="time"
                                name="due_time"
                                value={formData.due_time}
                                onChange={handleChange}
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                            />
                        </div>
                    </div>

                    {/* Duration & Priority */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                Duración
                            </label>
                            <select
                                name="duration_minutes"
                                value={formData.duration_minutes}
                                onChange={handleChange}
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                            >
                                {durations.map(d => (
                                    <option key={d.value} value={d.value}>{d.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                Prioridad
                            </label>
                            <select
                                name="priority"
                                value={formData.priority}
                                onChange={handleChange}
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                            >
                                <option value="low">🔽 Baja</option>
                                <option value="normal">➡️ Normal</option>
                                <option value="high">🔼 Alta</option>
                                <option value="urgent">🔥 Urgente</option>
                            </select>
                        </div>
                    </div>

                    {/* Contact & Opportunity */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                Contacto
                            </label>
                            <select
                                name="contact_id"
                                value={formData.contact_id}
                                onChange={handleChange}
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                            >
                                <option value="">Sin asignar</option>
                                {contacts.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.first_name} {c.last_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                Oportunidad
                            </label>
                            <select
                                name="opportunity_id"
                                value={formData.opportunity_id}
                                onChange={handleChange}
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                            >
                                <option value="">Sin asignar</option>
                                {opportunities.map(o => (
                                    <option key={o.id} value={o.id}>{o.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">
                            Descripción
                        </label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows={3}
                            placeholder="Notas o detalles adicionales..."
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all resize-none"
                        />
                    </div>

                    {/* Footer - inside form for submit to work */}
                    <div className="flex items-center justify-between pt-4 border-t border-white/10">
                        <div>
                            {onDelete && (
                                <button
                                    type="button"
                                    onClick={onDelete}
                                    className="px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                                >
                                    Eliminar
                                </button>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                            >
                                {saving && (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                )}
                                {isEditing ? 'Guardar Cambios' : 'Crear Actividad'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ActivityModal;
