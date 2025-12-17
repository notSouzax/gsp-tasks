import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Icons } from './ui/Icons';
import { formatDate, isReminderActive, Linkify, COLOR_MAP } from '../utils/helpers';

const TaskCard = ({ task, index, onClick, onDelete, onUpdate, onMove, color, cardConfig }) => {
    const commentCount = task.comments ? task.comments.length : 0;
    const lastComment = commentCount > 0 ? task.comments[task.comments.length - 1] : null;
    // const currentColumn = columns?.find(c => c.title === task.status); // Removed unused
    // const effectiveReminder = getEffectiveCardReminder(task, currentColumn); // Removed unused

    // Force re-render when reminder is due
    const [_, setTick] = React.useState(0);
    React.useEffect(() => {
        if (!task.next_notification_at) return;
        const now = Date.now();
        const timeUntilDue = new Date(task.next_notification_at).getTime() - now;
        if (timeUntilDue > 0) {
            const timer = setTimeout(() => setTick(t => t + 1), timeUntilDue);
            return () => clearTimeout(timer);
        }
    }, [task.next_notification_at]);

    // Config defaults
    const config = {
        enableMove: cardConfig?.enableMove ?? false,
        enableOrder: cardConfig?.enableOrder ?? false,
        enableTextOnly: cardConfig?.enableTextOnly ?? false
    };

    const DEFAULT_ORDER_OPTIONS = [
        { id: 'start', label: 'Inicio', action: 'move-start' },
        { id: 'end', label: 'Fin', action: 'move-end' },
        { id: 'review', label: 'En Revisión', action: 'none' },
        { id: 'paused', label: 'Pausado', action: 'none' },
        { id: 'urgent', label: 'Urgente', action: 'none' }
    ];
    const ORDER_OPTIONS = cardConfig?.orderOptions || DEFAULT_ORDER_OPTIONS;

    const formatTimeShort = (timestamp) => formatDate(timestamp, true);

    // Dynamic Color Logic
    const isCustomColor = color.startsWith('#');
    const borderColor = isCustomColor ? color : (COLOR_MAP[color] || '#6366f1');

    // Helper for Selects
    // const getColumnColor = ... // Removed unused

    // --- TEXT ONLY MODE ---
    if (config.enableTextOnly) {
        return (
            <Draggable draggableId={'task-' + task.id.toString()} index={index}>
                {(provided) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className="relative group bg-[#1e293b] hover:bg-[#253045] rounded-lg shadow-md hover:shadow-xl transition-all duration-200 border border-slate-700/50 cursor-grab active:cursor-grabbing overflow-hidden"
                        style={{ borderLeft: `4px solid ${borderColor}`, ...provided.draggableProps.style }}
                    >
                        {/* Drag Handle Layer */}
                        <div {...provided.dragHandleProps} className="absolute inset-0 z-0" />

                        {/* Content Layer */}
                        <div className="relative z-10 p-3 pointer-events-none">
                            <div className="pr-6 pointer-events-auto w-fit max-w-full">
                                <h3 className="font-medium text-slate-200 text-sm leading-snug select-text cursor-text w-fit">{task.title}</h3>
                                {task.description && <p className="text-slate-500 text-xs mt-1 truncate select-text cursor-text w-fit">{task.description}</p>}
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); onClick(task); }}
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-indigo-400 hover:bg-indigo-400/10 p-1.5 rounded-lg transition-all pointer-events-auto"
                                title="Editar"
                            >
                                <Icons.Edit size={14} />
                            </button>
                        </div>
                    </div>
                )}
            </Draggable>
        );
    }

    // --- FULL CARD MODE ---
    return (
        <Draggable draggableId={'task-' + task.id.toString()} index={index}>
            {(provided) => (
                <div
                    id={'task-' + task.id}
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    className="relative group bg-[#1e293b] hover:bg-[#253045] rounded-xl shadow-lg hover:shadow-2xl transition-colors duration-300 w-full mb-3 flex flex-col gap-3 overflow-hidden border border-slate-700/50 shrink-0 cursor-grab active:cursor-grabbing"
                    style={{ ...provided.draggableProps.style }}
                >
                    {/* Drag Handle Layer */}
                    <div {...provided.dragHandleProps} className="absolute inset-0 z-0" />

                    {/* Content Container (Allows click-through to drag handle by default) */}
                    <div className="relative z-10 flex flex-col gap-3 w-full pointer-events-none h-full">

                        {/* Color Stripe Top */}
                        <div className="h-1 w-full shrink-0" style={{ backgroundColor: borderColor }}></div>

                        <div className="px-4 pb-4 pt-2 flex flex-col gap-3">

                            {/* Title Row */}
                            <div className="flex justify-between items-start gap-3">
                                <div className="flex-1">
                                    <h3
                                        className="font-semibold text-slate-100 text-base leading-tight tracking-tight select-text cursor-text pointer-events-auto w-fit"
                                    >
                                        {task.title}
                                    </h3>
                                    {isReminderActive(task) && (
                                        <div className="inline-flex items-center gap-1 mt-2 text-[10px] font-bold text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                                            <Icons.Clock size={10} /> <span>VENCIDO</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all pointer-events-auto">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onClick(task); }}
                                        className="text-slate-500 hover:text-indigo-400 hover:bg-indigo-400/10 p-1.5 rounded-lg transition-all"
                                        title="Editar"
                                    >
                                        <Icons.Edit size={14} />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
                                        className="text-slate-500 hover:text-red-400 hover:bg-red-400/10 p-1.5 rounded-lg transition-all"
                                        title="Eliminar"
                                    >
                                        <Icons.Trash2 size={14} />
                                    </button>
                                </div>
                            </div>

                            {/* Description */}
                            {task.description && (
                                <div
                                    className="text-slate-400 text-sm leading-relaxed line-clamp-3 select-text cursor-text pointer-events-auto w-fit max-w-full"
                                >
                                    <Linkify text={task.description} />
                                </div>
                            )}

                            {/* CHECKLIST */}
                            {Array.isArray(task.checklist) && task.checklist.length > 0 && (
                                <div className="bg-slate-950/30 rounded-lg p-2 border border-slate-700/50 space-y-1.5 pointer-events-auto">
                                    {task.checklist.map(item => (
                                        <div
                                            key={item.id}
                                            className="flex items-start gap-2.5 group/item cursor-pointer"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const newChecklist = task.checklist.map(i => i.id === item.id ? { ...i, completed: !i.completed } : i);
                                                onUpdate({ ...task, checklist: newChecklist });
                                            }}
                                        >
                                            <div
                                                className={`mt-0.5 transition-transform duration-200 ${item.completed ? 'scale-110' : 'group-hover/item:scale-110 text-slate-500 hover:text-indigo-400'}`}
                                                style={item.completed ? { color: borderColor } : {}}
                                            >
                                                {item.completed ? <Icons.CheckSquare size={14} /> : <Icons.Square size={14} />}
                                            </div>
                                            <span className={`text-xs flex-1 transition-colors ${item.completed ? 'text-slate-600 line-through decoration-slate-600' : 'text-slate-300'}`}>
                                                {item.text}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Last Comment Bubble */}
                            {lastComment && (
                                <div
                                    className="relative rounded-2xl rounded-tl-none p-3 text-xs"
                                    style={{ backgroundColor: `${borderColor}10`, border: `1px solid ${borderColor}20` }}
                                >
                                    <div className="flex justify-between items-center mb-1 bg-transparent">
                                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: borderColor }}>
                                            ÚLTIMO COMENTARIO
                                        </span>
                                        <span className="text-[10px] opacity-60" style={{ color: borderColor }}>
                                            {formatTimeShort(lastComment.createdAt || lastComment.created_at)}
                                        </span>
                                    </div>
                                    <p className="text-slate-300 leading-snug line-clamp-2 italic select-text cursor-text pointer-events-auto w-fit">"{lastComment.text}"</p>
                                </div>
                            )}

                            {/* Footer Meta & Actions */}
                            <div className="flex items-center justify-between pt-2 border-t border-slate-700/50 mt-1">
                                {/* Meta Info */}
                                <div className="flex items-center gap-3 text-slate-500">
                                    <div className="flex items-center text-xs gap-1" title="Creado">
                                        <Icons.Calendar size={12} />
                                        <span>{formatDate(task.createdAt)}</span>
                                    </div>

                                    {(commentCount > 0 || (task.checklist && task.checklist.length > 0)) && (
                                        <div className="flex items-center gap-2">
                                            {commentCount > 0 && (
                                                <div className="flex items-center text-xs gap-0.5" style={{ color: borderColor }}>
                                                    <Icons.MessageSquare size={12} />
                                                    <span className="font-medium">{commentCount}</span>
                                                </div>
                                            )}
                                            {task.checklist && task.checklist.length > 0 && (
                                                <div className="flex items-center text-xs gap-0.5" style={{ color: borderColor }}>
                                                    <Icons.CheckSquare size={12} />
                                                    <span className="font-medium">
                                                        {task.checklist.filter(i => i.completed).length}/{task.checklist.length}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Actions Dropdowns */}
                                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                    {config.enableOrder && (
                                        <div className="relative group/select flex items-center">
                                            <select
                                                value={task.sortOptionId || ""}
                                                onChange={(e) => {
                                                    const opt = ORDER_OPTIONS.find(o => o.id === e.target.value);
                                                    if (opt) onMove(task, opt.action, opt.id);
                                                }}
                                                className="appearance-none bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-md py-1 pl-2 pr-6 text-[10px] text-slate-300 focus:text-white outline-none cursor-pointer transition-colors"
                                            >
                                                <option value="" disabled>Estado</option>
                                                {ORDER_OPTIONS.map(opt => (
                                                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                                                ))}
                                            </select>
                                            <Icons.ChevronDown size={10} className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Draggable>
    );
};

export default TaskCard;
