import React, { useState } from 'react';
import { Icons } from '../ui/Icons';
import { formatDate, TIME_UNITS, calculateNextNotification } from '../../utils/helpers';
import { Linkify } from '../../utils/helpers';
import { Toggle } from '../ui/Toggle';

const TaskDetailModal = ({ task, columns, onClose, onUpdate, onDelete }) => {
    const [commentText, setCommentText] = useState("");
    const [isEditingDesc, setIsEditingDesc] = useState(false);
    const [tempDesc, setTempDesc] = useState(task?.description || "");
    const [editingCommentId, setEditingCommentId] = useState(null);
    const [editingCommentText, setEditingCommentText] = useState("");

    // Reminder settings
    const [reminderEnabled, setReminderEnabled] = useState(task?.reminder_enabled ?? false);
    const [reminderValue, setReminderValue] = useState(task?.reminder_value ?? "");
    const [reminderUnit, setReminderUnit] = useState(task?.reminder_unit ?? 'minutes');
    const [forceRecalculate, setForceRecalculate] = useState(false);

    const currentColumn = columns?.find(c => c.title === task?.status);

    if (!task || !columns) return null;

    const handleStatusChange = (newStatus) => { onUpdate({ ...task, status: newStatus }); };

    const handleAddComment = (e) => {
        if (e) e.preventDefault();
        if (!commentText.trim()) return;
        const newComment = { id: Date.now(), text: commentText, createdAt: Date.now() };
        const updatedComments = task.comments ? [...task.comments, newComment] : [newComment];
        onUpdate({ ...task, comments: updatedComments });
        setCommentText('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleAddComment();
        }
    };

    const handleDeleteComment = (commentId) => {
        const updatedComments = task.comments.filter(c => c.id !== commentId);
        onUpdate({ ...task, comments: updatedComments });
    };

    const startEditingComment = (comment) => {
        setEditingCommentId(comment.id);
        setEditingCommentText(comment.text);
    };

    const saveEditedComment = () => {
        if (!editingCommentText.trim()) return;
        const updatedComments = task.comments.map(c =>
            c.id === editingCommentId ? { ...c, text: editingCommentText } : c
        );
        onUpdate({ ...task, comments: updatedComments });
        setEditingCommentId(null);
        setEditingCommentText("");
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-white/5 flex justify-between items-start">
                    <div className="flex-1 mr-4"><h2 className="text-2xl font-bold text-white mb-2">{task.title}</h2><div className="flex items-center gap-3"><select value={task.status} onChange={(e) => handleStatusChange(e.target.value)} className="bg-slate-800 text-xs font-medium text-indigo-300 border border-indigo-500/30 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-500">{columns.map(c => <option key={c.id} value={c.title}>{c.title}</option>)}</select><span className="text-gray-500 text-xs flex items-center"><Icons.Calendar /><span className="ml-1">Creado: {formatDate(task.createdAt, true)}</span></span></div></div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors"><Icons.X /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-2"><h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Descripción</h3>{!isEditingDesc ? (<button onClick={() => setIsEditingDesc(true)} className="text-gray-500 hover:text-indigo-400 transition-colors p-1" title="Editar descripción"><Icons.Edit /></button>) : (<div className="flex gap-2"><button onClick={() => { onUpdate({ ...task, description: tempDesc }); setIsEditingDesc(false); }} className="text-green-400 hover:text-green-300 transition-colors p-1" title="Guardar"><Icons.Check /></button><button onClick={() => { setTempDesc(task.description || ''); setIsEditingDesc(false); }} className="text-red-400 hover:text-red-300 transition-colors p-1" title="Cancelar"><Icons.X /></button></div>)}</div>
                        {isEditingDesc ? (<textarea value={tempDesc} onChange={(e) => setTempDesc(e.target.value)} placeholder="Añade una descripción..." className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all h-32 resize-none" autoFocus />) : (<div className="bg-slate-950/50 p-4 rounded-xl border border-white/5 text-gray-300 text-base leading-relaxed min-h-[60px] whitespace-pre-wrap"><Linkify text={task.description || "Sin descripción."} /></div>)}
                    </div>

                    {currentColumn?.allow_card_overrides !== false && (
                        <div className="mb-8">
                            <h3 className="text-sm font-medium text-gray-400 mb-4 uppercase tracking-wider">Avisos / Recordatorios</h3>

                            {!reminderEnabled && currentColumn?.default_reminder_enabled && (
                                <div className="mb-3 text-xs text-gray-500 flex items-center gap-2 bg-slate-950/30 p-2 rounded border border-white/5">
                                    <Icons.Bell className="w-3 h-3" />
                                    <span>
                                        Usando aviso de columna: {currentColumn.default_reminder_value} {TIME_UNITS.find(u => u.value === currentColumn.default_reminder_unit)?.label || currentColumn.default_reminder_unit}
                                    </span>
                                </div>
                            )}

                            <Toggle
                                label="Avisos personalizados"
                                checked={reminderEnabled}
                                onChange={setReminderEnabled}
                            />

                            {reminderEnabled && (
                                <div className="flex gap-2 mt-3 pl-2 border-l-2 border-indigo-500/30">
                                    <input
                                        type="number"
                                        value={reminderValue}
                                        onChange={(e) => setReminderValue(e.target.value)}
                                        placeholder="0"
                                        className="w-20 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                                    />
                                    <select
                                        value={reminderUnit}
                                        onChange={(e) => setReminderUnit(e.target.value)}
                                        className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                                    >
                                        {TIME_UNITS.map(unit => (
                                            <option key={unit.value} value={unit.value}>{unit.label}</option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => setForceRecalculate(true)}
                                        className={`p-1.5 rounded transition-colors ${forceRecalculate ? 'text-green-400 bg-green-400/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                        title="Resetear tiempo (se aplicará al guardar)"
                                    >
                                        <Icons.RotateCcw />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    <div>
                        <h3 className="text-sm font-medium text-gray-400 mb-4 uppercase tracking-wider flex items-center gap-2">Comentarios<span className="bg-white/10 text-xs px-2 py-0.5 rounded-full">{task.comments?.length || 0}</span></h3>
                        <div className="space-y-4 mb-6">
                            {(!task.comments || task.comments.length === 0) && (<p className="text-gray-600 text-sm italic">No hay comentarios aún.</p>)}
                            {task.comments?.map(comment => (
                                <div key={comment.id} className="flex gap-3 group">
                                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0 text-xs font-bold">YO</div>
                                    <div className="flex-1">
                                        <div className="flex items-baseline justify-between mb-1">
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-indigo-300 text-sm font-medium">Usuario</span>
                                                <span className="text-gray-600 text-xs">{formatDate(comment.createdAt, true)}</span>
                                            </div>
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                                <button onClick={() => startEditingComment(comment)} className="text-gray-500 hover:text-indigo-400 transition-colors p-1" title="Editar"><Icons.Edit size={14} /></button>
                                                <button onClick={() => handleDeleteComment(comment.id)} className="text-gray-500 hover:text-red-400 transition-colors p-1" title="Eliminar"><Icons.Trash2 size={14} /></button>
                                            </div>
                                        </div>

                                        {editingCommentId === comment.id ? (
                                            <div className="mt-1">
                                                <textarea
                                                    value={editingCommentText}
                                                    onChange={(e) => setEditingCommentText(e.target.value)}
                                                    className="w-full bg-slate-800 border border-indigo-500/50 rounded-lg p-3 text-sm text-gray-300 focus:outline-none min-h-[80px] mb-2"
                                                    autoFocus
                                                />
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => setEditingCommentId(null)} className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors">Cancelar</button>
                                                    <button onClick={saveEditedComment} className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-500 transition-colors">Guardar</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-gray-300 text-sm bg-white/5 p-3 rounded-r-xl rounded-bl-xl border border-white/5 whitespace-pre-wrap">{comment.text}</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="relative">
                            <textarea
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Escribe un comentario... (Mayús + Enter para salto de línea)"
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-4 pr-12 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none min-h-[50px] overflow-hidden"
                                style={{ height: Math.max(50, commentText.split('\n').length * 24) + 'px' }}
                            />
                            <button
                                onClick={(e) => handleAddComment(e)}
                                disabled={!commentText.trim()}
                                className="absolute right-2 bottom-2 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors"
                            >
                                <Icons.Send />
                            </button>
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t border-white/5 bg-slate-950/30 flex justify-between items-center">
                    <button
                        onClick={() => {
                            const updates = {
                                ...task,
                                reminder_enabled: reminderEnabled,
                                reminder_value: reminderValue === "" ? null : parseInt(reminderValue),
                                reminder_unit: reminderUnit
                            };

                            // Check if reminder settings have changed
                            const hasSettingsChanged =
                                reminderEnabled !== task.reminder_enabled ||
                                (reminderEnabled && (
                                    parseInt(reminderValue) !== task.reminder_value ||
                                    reminderUnit !== task.reminder_unit
                                ));

                            // Calculate next_notification_at only if settings changed, reset requested, or it's missing
                            if (reminderEnabled && reminderValue) {
                                if (hasSettingsChanged || forceRecalculate || !task.next_notification_at) {
                                    updates.next_notification_at = calculateNextNotification(reminderValue, reminderUnit);
                                } else {
                                    // Preserve existing timer
                                    updates.next_notification_at = task.next_notification_at;
                                }
                            } else {
                                updates.next_notification_at = null;
                            }

                            onUpdate(updates);
                            // Optional: Close modal or show success feedback
                            // onClose(); 
                        }}
                        className="flex items-center gap-2 text-white bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg transition-colors text-sm font-medium shadow-lg shadow-indigo-500/20"
                    >
                        <Icons.Check className="w-4 h-4" /> Guardar
                    </button>
                    <button onClick={() => { onDelete(task.id); onClose(); }} className="flex items-center gap-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 px-4 py-2 rounded-lg transition-colors text-sm font-medium"><Icons.Trash2 /> Eliminar Tarea</button>
                </div>
            </div>
        </div>
    );
};

export default TaskDetailModal;
