import React, { useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import ConfirmationModal from './ConfirmationModal';

// Colores para eventos - exportado para reutilización
export const EVENT_COLORS = [
    { id: 'blue', bg: 'bg-blue-600', hover: 'hover:bg-blue-700', light: 'bg-blue-600/20', text: 'text-blue-400' },
    { id: 'green', bg: 'bg-emerald-500', hover: 'hover:bg-emerald-600', light: 'bg-emerald-500/20', text: 'text-emerald-400' },
    { id: 'red', bg: 'bg-rose-500', hover: 'hover:bg-rose-600', light: 'bg-rose-500/20', text: 'text-rose-400' },
    { id: 'yellow', bg: 'bg-amber-400', hover: 'hover:bg-amber-500', light: 'bg-amber-400/20', text: 'text-amber-400' },
    { id: 'purple', bg: 'bg-purple-500', hover: 'hover:bg-purple-600', light: 'bg-purple-500/20', text: 'text-purple-400' },
    { id: 'orange', bg: 'bg-orange-500', hover: 'hover:bg-orange-600', light: 'bg-orange-500/20', text: 'text-orange-400' },
    { id: 'pink', bg: 'bg-pink-500', hover: 'hover:bg-pink-600', light: 'bg-pink-500/20', text: 'text-pink-400' },
    { id: 'indigo', bg: 'bg-indigo-500', hover: 'hover:bg-indigo-600', light: 'bg-indigo-500/20', text: 'text-indigo-400' },
];

const EventModal = ({
    date,
    event,
    onClose,
    onSave,
    userId,
    initialStartTime = '',
    initialEndTime = '',
    initialAllDay = true,
    tags = []
}) => {
    // Si no hay userId, intentamos obtenerlo de nuevo para evitar fallos por props asíncronas
    const { currentUser } = useAuth();
    const activeUserId = userId || currentUser?.id;

    const [title, setTitle] = useState(event?.title || '');
    const [description, setDescription] = useState(event?.description || '');
    const [eventDate, setEventDate] = useState(date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
    const [startTime, setStartTime] = useState(event ? (event.start_time || '') : initialStartTime);
    const [endTime, setEndTime] = useState(event ? (event.end_time || '') : initialEndTime);
    const [tagId, setTagId] = useState(event?.tag_id || '');
    const [allDay, setAllDay] = useState(event ? event.all_day : (date ? initialAllDay : true));
    const [saving, setSaving] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const handleSave = async (e) => {
        if (e) e.preventDefault();

        if (!activeUserId) {
            toast.error('Sesión no válida. Por favor, reinicia la aplicación.');
            return;
        }

        if (!title.trim()) {
            toast.error('El título es obligatorio');
            return;
        }

        setSaving(true);
        try {
            const eventData = {
                user_id: activeUserId,
                title: title.trim(),
                description: description.trim() || null,
                date: eventDate,
                start_time: allDay ? null : (startTime || null),
                end_time: allDay ? null : (endTime || null),
                tag_id: tagId || null,
                all_day: allDay
            };

            let error;
            if (event?.id) {
                const { error: updateError } = await supabase.from('calendar_events').update(eventData).eq('id', event.id);
                error = updateError;
                if (!error) toast.success('Evento actualizado');
            } else {
                const { error: insertError } = await supabase.from('calendar_events').insert(eventData);
                error = insertError;
                if (!error) toast.success('Evento creado');
            }

            if (error) throw error;
            onSave();
        } catch (error) {
            console.error('Error saving event:', error);
            toast.error(error.message || 'Error al guardar el evento');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = () => {
        if (!event?.id) return;
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        try {
            const { error } = await supabase.from('calendar_events').delete().eq('id', event.id);
            if (error) throw error;
            toast.success('Evento eliminado');
            onSave();
        } catch (error) {
            console.error('Error deleting event:', error);
            toast.error('Error al eliminar el evento');
        } finally {
            setShowDeleteConfirm(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
            <div className="bg-[#0f172a] rounded-2xl border border-slate-700/50 shadow-2xl w-full max-w-md overflow-hidden transform animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between bg-slate-900/50">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-blue-400">edit_calendar</span>
                        {event ? 'Editar Evento' : 'Nuevo Evento'}
                    </h3>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-stone-200 dark:hover:bg-slate-700 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                        <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">Título</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="¿Qué vas a hacer?"
                            className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all"
                            autoFocus
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">Fecha</label>
                            <input
                                type="date"
                                value={eventDate}
                                onChange={(e) => setEventDate(e.target.value)}
                                className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white focus:border-blue-500 focus:outline-none transition-all"
                            />
                        </div>
                        <div className="flex items-end pb-3">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={allDay}
                                    onChange={(e) => setAllDay(e.target.checked)}
                                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500"
                                />
                                <span className="text-sm text-slate-400 group-hover:text-slate-200 transition-colors">Todo el día</span>
                            </label>
                        </div>
                    </div>

                    {!allDay && (
                        <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-200">
                            <div>
                                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">Inicio</label>
                                <input
                                    type="time"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white focus:border-blue-500 focus:outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">Fin</label>
                                <input
                                    type="time"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white focus:border-blue-500 focus:outline-none transition-all"
                                />
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">Descripción</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Añade más detalles..."
                            rows={3}
                            className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none resize-none transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">Etiqueta</label>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => setTagId('')}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${!tagId ? 'bg-slate-700 text-white border-slate-600 ring-2 ring-white/10' : 'bg-slate-800/50 text-slate-500 border-slate-700/50 hover:bg-slate-800'}`}
                            >
                                Ninguna
                            </button>
                            {tags.map(tag => {
                                const color = EVENT_COLORS.find(c => c.id === tag.color) || EVENT_COLORS[0];
                                return (
                                    <button
                                        key={tag.id}
                                        type="button"
                                        onClick={() => setTagId(tag.id)}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 ${tagId === tag.id ? `${color.bg} text-white border-white/20 ring-2 ring-white/10` : 'bg-slate-800/50 text-slate-400 border-slate-700/50 hover:bg-slate-800'}`}
                                    >
                                        <div className={`w-2 h-2 rounded-full ${color.bg} border border-white/20`} />
                                        {tag.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 bg-slate-900/50 border-t border-slate-700/50 flex items-center justify-between">
                    {event ? (
                        <button onClick={handleDelete} className="px-4 py-2 text-red-400 hover:text-red-300 text-sm font-bold flex items-center gap-2 group transition-colors">
                            <span className="material-symbols-outlined text-[18px] group-hover:scale-110 transition-transform">delete</span>
                            Eliminar
                        </button>
                    ) : <div />}
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-5 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm font-bold transition-colors">Cancelar</button>
                        <button
                            onClick={handleSave}
                            disabled={saving || !title.trim()}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-600/20 active:scale-95 transition-all flex items-center gap-2"
                        >
                            {saving ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <span className="material-symbols-outlined text-[18px]">save</span>
                            )}
                            {saving ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                </div>
            </div>

            <ConfirmationModal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={confirmDelete}
                title="¿Eliminar evento?"
                message={`¿Estás seguro de que quieres eliminar el evento "${title}"?`}
                confirmText="Eliminar"
                isDanger={true}
            />
        </div>
    );
};

export default EventModal;
