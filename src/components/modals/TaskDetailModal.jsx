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

    // Checklist State
    const [checklist, setChecklist] = useState(task?.checklist || []);
    const [newItemText, setNewItemText] = useState("");

    // Reminder settings
    const [reminderEnabled, setReminderEnabled] = useState(task?.reminder_enabled ?? false);
    const [reminderValue, setReminderValue] = useState(task?.reminder_value ?? "");
    const [reminderUnit, setReminderUnit] = useState(task?.reminder_unit ?? 'minutes');
    const [forceRecalculate, setForceRecalculate] = useState(false);

    const currentColumn = columns?.find(c => c.title === task?.status || c.id === task?.column_id);

    if (!task || !columns) return null;

    const handleStatusChange = (newStatus) => { onUpdate({ ...task, status: newStatus }); };

    const handleAddComment = (e) => {
        if (e) e.preventDefault();
        if (!commentText.trim()) return;
        const newComment = { id: Date.now(), text: commentText, createdAt: Date.now() };
        const updatedComments = task.comments ? [...task.comments, newComment] : [newComment];
        onUpdate({ ...task, comments: updatedComments }, false);
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
        onUpdate({ ...task, comments: updatedComments }, false);
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
        onUpdate({ ...task, comments: updatedComments }, false);
        setEditingCommentId(null);
        setEditingCommentText("");
    };

    // Checklist Handlers
    const handleAddCheckItem = () => {
        if (!newItemText.trim()) return;
        const newItem = { id: Date.now(), text: newItemText, completed: false };
        const updatedChecklist = [...checklist, newItem];
        setChecklist(updatedChecklist);
        setNewItemText("");
        onUpdate({ ...task, checklist: updatedChecklist }, false);
    };

    const handleToggleCheckItem = (itemId) => {
        const updatedChecklist = checklist.map(item =>
            item.id === itemId ? { ...item, completed: !item.completed } : item
        );
        setChecklist(updatedChecklist);
        onUpdate({ ...task, checklist: updatedChecklist }, false);
    };

    const handleDeleteCheckItem = (itemId) => {
        const updatedChecklist = checklist.filter(item => item.id !== itemId);
        setChecklist(updatedChecklist);
        onUpdate({ ...task, checklist: updatedChecklist }, false);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-50 p-4 transition-all duration-300" onClick={onClose}>
            <div
                className="bg-[#0f172a] border border-slate-700/50 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex justify-between items-start bg-slate-900/50">
                    <div className="flex-1 mr-4">
                        <div className="flex items-center gap-3 mb-3">
                            {/* Status Badge */}
                            <div className="relative inline-block">
                                {(currentColumn?.cardConfig?.enableOrder) ? (
                                    <>
                                        <select
                                            value={task.status}
                                            onChange={(e) => handleStatusChange(e.target.value)}
                                            className="appearance-none bg-[#1e293b] hover:bg-[#253045] text-indigo-300 font-bold text-xs uppercase tracking-wider rounded-lg pl-3 pr-10 py-1.5 outline-none cursor-pointer transition-all border border-indigo-500/20 hover:border-indigo-500/40 focus:ring-2 focus:ring-indigo-500/50"
                                        >
                                            {columns.map(c => <option key={c.id} value={c.title}>{c.title}</option>)}
                                        </select>
                                        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                                            <Icons.ChevronDown size={14} className="text-indigo-400" />
                                        </div>
                                    </>
                                ) : (
                                    <div className="bg-indigo-500/10 text-indigo-300 font-bold text-xs uppercase tracking-wider rounded-lg px-3 py-1.5 border border-indigo-500/20">
                                        {task.status}
                                    </div>
                                )}
                            </div>
                            <span className="text-slate-500 text-xs flex items-center bg-white/5 px-2 py-1 rounded-md">
                                <Icons.Calendar size={12} className="mr-1.5 opacity-70" />
                                {formatDate(task.createdAt, true)}
                            </span>
                        </div>
                        <h2 className="text-2xl font-bold text-white leading-tight">{task.title}</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-all">
                        <Icons.X size={20} />
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-0 flex flex-col md:flex-row custom-scrollbar bg-[#0f172a]">

                    {/* Main Content (Left) */}
                    <div className="flex-1 p-6 md:p-8 md:pr-4 space-y-8">
                        {/* Description */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Icons.Layout size={14} /> Descripción
                                </h3>
                                {!isEditingDesc ? (
                                    <button onClick={() => setIsEditingDesc(true)} className="text-slate-500 hover:text-indigo-400 text-xs font-medium px-2 py-1 rounded hover:bg-indigo-500/10 transition-colors">Editar</button>
                                ) : (
                                    <div className="flex gap-2">
                                        <button onClick={() => { onUpdate({ ...task, description: tempDesc }); setIsEditingDesc(false); }} className="text-xs bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 px-2 py-1 rounded font-medium transition-colors">Guardar</button>
                                        <button onClick={() => { setTempDesc(task.description || ''); setIsEditingDesc(false); }} className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 transition-colors">Cancelar</button>
                                    </div>
                                )}
                            </div>
                            {isEditingDesc ? (
                                <textarea
                                    value={tempDesc}
                                    onChange={(e) => setTempDesc(e.target.value)}
                                    placeholder="Añade una descripción detallada..."
                                    className="w-full bg-[#1e293b] border border-slate-700/50 rounded-xl px-4 py-3 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all h-40 resize-none custom-scrollbar text-sm leading-relaxed"
                                    autoFocus
                                />
                            ) : (
                                <div className={`p-4 rounded-xl border ${task.description ? 'bg-[#1e293b]/30 border-slate-800' : 'bg-slate-900 border-dashed border-slate-800'} text-slate-300 text-sm leading-relaxed min-h-[80px] whitespace-pre-wrap`}>
                                    <Linkify text={task.description || "Sin descripción."} />
                                </div>
                            )}
                        </div>

                        {/* Checklist */}
                        {!currentColumn?.cardConfig?.enableTextOnly && (
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <Icons.CheckSquare size={14} /> Checklist
                                        {checklist.length > 0 && (
                                            <span className="bg-indigo-500/10 text-indigo-400 text-[10px] px-1.5 py-0.5 rounded font-bold">
                                                {checklist.filter(i => i.completed).length}/{checklist.length}
                                            </span>
                                        )}
                                    </h3>
                                </div>

                                <div className="bg-[#1e293b]/30 rounded-xl border border-slate-800 p-1">
                                    <div className="space-y-0.5 p-1">
                                        {checklist.map(item => (
                                            <div key={item.id} className="flex items-start gap-3 group hover:bg-[#1e293b] p-2 rounded-lg transition-colors cursor-pointer" onClick={() => handleToggleCheckItem(item.id)}>
                                                <div
                                                    className={`mt-0.5 flex-shrink-0 transition-transform duration-200 ${item.completed ? 'text-emerald-400 scale-110' : 'text-slate-600 group-hover:text-indigo-400'}`}
                                                >
                                                    {item.completed ? <Icons.CheckSquare size={16} /> : <Icons.Square size={16} />}
                                                </div>
                                                <span className={`flex-1 text-sm transition-colors ${item.completed ? 'text-slate-500 line-through decoration-slate-600' : 'text-slate-200'}`}>
                                                    {item.text}
                                                </span>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteCheckItem(item.id); }}
                                                    className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all p-1"
                                                    title="Eliminar elemento"
                                                >
                                                    <Icons.Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="p-2 pt-1">
                                        <div className="relative flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={newItemText}
                                                onChange={(e) => setNewItemText(e.target.value)}
                                                onKeyDown={(e) => { if (e.key === 'Enter') handleAddCheckItem(); }}
                                                placeholder="Añadir elemento..."
                                                className="w-full bg-[#0f172a] border border-slate-700/50 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all placeholder-slate-600"
                                            />
                                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                                                <Icons.Plus size={16} />
                                            </div>
                                            <button
                                                onClick={handleAddCheckItem}
                                                disabled={!newItemText.trim()}
                                                className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors disabled:opacity-0 disabled:pointer-events-none absolute right-1"
                                            >
                                                <Icons.Plus size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Comments */}
                        {!currentColumn?.cardConfig?.enableTextOnly && (
                            <div>
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                                    <Icons.MessageSquare size={14} /> Comentarios <span className="text-slate-600 text-[10px] ml-1">({task.comments?.length || 0})</span>
                                </h3>
                                <div className="space-y-5 mb-6">
                                    {(!task.comments || task.comments.length === 0) && (<p className="text-slate-600 text-sm italic text-center py-4">No hay comentarios aún.</p>)}
                                    {task.comments?.map(comment => (
                                        <div key={comment.id} className="flex gap-4 group">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white flex-shrink-0 text-xs font-bold shadow-lg shadow-indigo-500/10">
                                                YO
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-indigo-400 text-sm font-bold">Usuario</span>
                                                        <span className="text-slate-600 text-[10px]">{formatDate(comment.createdAt, true)}</span>
                                                    </div>
                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                                        <button onClick={() => startEditingComment(comment)} className="text-slate-500 hover:text-indigo-400 p-1 rounded hover:bg-white/5 transition-colors" title="Editar"><Icons.Edit size={12} /></button>
                                                        <button onClick={() => handleDeleteComment(comment.id)} className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-white/5 transition-colors" title="Eliminar"><Icons.Trash2 size={12} /></button>
                                                    </div>
                                                </div>

                                                {editingCommentId === comment.id ? (
                                                    <div className="relative">
                                                        <textarea
                                                            value={editingCommentText}
                                                            onChange={(e) => setEditingCommentText(e.target.value)}
                                                            className="w-full bg-[#1e293b] border border-indigo-500/50 rounded-xl p-3 text-sm text-slate-300 focus:outline-none min-h-[80px]"
                                                            autoFocus
                                                        />
                                                        <div className="flex justify-end gap-2 absolute bottom-2 right-2">
                                                            <button onClick={() => setEditingCommentId(null)} className="px-2 py-1 text-[10px] bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors">Cancelar</button>
                                                            <button onClick={saveEditedComment} className="px-2 py-1 text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white rounded transition-colors">Guardar</button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="relative bg-[#1e293b] p-3.5 rounded-2xl rounded-tl-none border border-slate-800 text-slate-300 text-sm leading-relaxed whitespace-pre-wrap shadow-sm group-hover:border-slate-700 transition-colors">
                                                        <Linkify text={comment.text} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Comment Input */}
                                <div className="relative group/input">
                                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-xl blur opacity-0 group-focus-within/input:opacity-100 transition-opacity duration-500"></div>
                                    <div className="relative flex items-end gap-2 bg-[#1e293b] p-2 rounded-xl border border-slate-700 focus-within:border-indigo-500/50 transition-colors">
                                        <textarea
                                            value={commentText}
                                            onChange={(e) => setCommentText(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            placeholder="Escribe un comentario..."
                                            className="w-full bg-transparent border-none text-white placeholder-slate-500 focus:ring-0 outline-none text-sm resize-none custom-scrollbar min-h-[40px] max-h-[120px] py-2 px-1"
                                            style={{ height: Math.max(40, Math.min(120, commentText.split('\n').length * 20)) + 'px' }}
                                        />
                                        <button
                                            onClick={(e) => handleAddComment(e)}
                                            disabled={!commentText.trim()}
                                            className="p-2 mb-0.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50 disabled:bg-slate-700 transition-all flex-shrink-0"
                                        >
                                            <Icons.Send size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sidebar (Right) */}
                    <div className="w-full md:w-72 bg-[#0f172a] border-t md:border-t-0 md:border-l border-white/5 p-6 md:p-8 space-y-8 h-full overflow-y-auto custom-scrollbar">

                        {/* Reminders / Actions */}
                        {!currentColumn?.cardConfig?.enableTextOnly && (
                            <div>
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Configuración</h3>

                                {currentColumn?.allow_card_overrides !== false && (
                                    <div className="space-y-4">
                                        <div className="bg-[#1e293b]/50 rounded-xl p-4 border border-slate-800">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
                                                    <Icons.Bell size={16} className="text-indigo-400" /> Recordatorios
                                                </div>
                                                <Toggle
                                                    checked={reminderEnabled}
                                                    onChange={setReminderEnabled}
                                                />
                                            </div>

                                            {!reminderEnabled && currentColumn?.default_reminder_enabled && (
                                                <div className="text-[10px] text-slate-500 flex items-center gap-1.5 bg-slate-950/50 p-2 rounded border border-white/5">
                                                    <Icons.Info size={10} />
                                                    <span>
                                                        Por defecto: {currentColumn.default_reminder_value} {TIME_UNITS.find(u => u.value === currentColumn.default_reminder_unit)?.label || currentColumn.default_reminder_unit}
                                                    </span>
                                                </div>
                                            )}

                                            {reminderEnabled && (
                                                <div className="space-y-2 mt-3 pt-3 border-t border-white/5 animate-in fade-in slide-in-from-top-1">
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="number"
                                                            value={reminderValue}
                                                            onChange={(e) => setReminderValue(e.target.value)}
                                                            placeholder="0"
                                                            className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-white focus:ring-1 focus:ring-indigo-500/50 outline-none text-center font-mono"
                                                        />
                                                        <div className="relative inline-block flex-1">
                                                            <select
                                                                value={reminderUnit}
                                                                onChange={(e) => setReminderUnit(e.target.value)}
                                                                className="appearance-none w-full bg-[#1e293b] hover:bg-[#253045] border border-slate-700 rounded-lg pl-3 pr-8 py-1.5 text-xs text-slate-200 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none cursor-pointer transition-all"
                                                            >
                                                                {TIME_UNITS.map(unit => (
                                                                    <option key={unit.value} value={unit.value}>{unit.label}</option>
                                                                ))}
                                                            </select>
                                                            <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none">
                                                                <Icons.ChevronDown size={12} className="text-slate-400" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setForceRecalculate(true)}
                                                        className={`w-full p-1.5 rounded-lg text-xs transition-colors border ${forceRecalculate ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-transparent text-slate-500 border-transparent hover:bg-white/5 hover:text-slate-300'}`}
                                                    >
                                                        {forceRecalculate ? "Tiempo se reseteará al guardar" : "Resetear tiempo"}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Actions Footer - Now in Sidebar */}
                        <div className="pt-4 border-t border-white/5 space-y-3">
                            <button
                                onClick={() => {
                                    const updates = {
                                        ...task,
                                        reminder_enabled: reminderEnabled,
                                        reminder_value: reminderValue === "" ? null : parseInt(reminderValue),
                                        reminder_unit: reminderUnit
                                    };
                                    const hasSettingsChanged = reminderEnabled !== task.reminder_enabled || (reminderEnabled && (parseInt(reminderValue) !== task.reminder_value || reminderUnit !== task.reminder_unit));

                                    if (reminderEnabled && reminderValue) {
                                        if (hasSettingsChanged || forceRecalculate || !task.next_notification_at) {
                                            const nextTime = calculateNextNotification(reminderValue, reminderUnit);
                                            updates.next_notification_at = nextTime ? new Date(nextTime).toISOString() : null;
                                        } else {
                                            updates.next_notification_at = task.next_notification_at;
                                        }
                                    } else {
                                        updates.next_notification_at = null;
                                    }
                                    onUpdate(updates);
                                    onClose();
                                }}
                                className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold py-2.5 rounded-xl shadow-lg shadow-indigo-500/20 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 text-sm"
                            >
                                <Icons.Check size={16} /> Guardar Cambios
                            </button>

                            <button
                                onClick={() => { onDelete(task.id); onClose(); }}
                                className="w-full flex items-center justify-center gap-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 py-2.5 rounded-xl transition-colors text-sm font-medium border border-transparent hover:border-red-500/10"
                            >
                                <Icons.Trash2 size={16} /> Eliminar Tarea
                            </button>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default TaskDetailModal;
