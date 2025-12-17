import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Icons } from './ui/Icons';
import { formatDate, TIME_UNITS, getEffectiveCardReminder, isReminderActive } from '../utils/helpers';
import { Linkify, COLOR_MAP } from '../utils/helpers';


const TaskCard = ({ task, index, onClick, onDelete, onUpdate, onMove, color, cardConfig, columns }) => {
    const commentCount = task.comments ? task.comments.length : 0;
    const lastComment = commentCount > 0 ? task.comments[task.comments.length - 1] : null;

    const currentColumn = columns?.find(c => c.title === task.status);
    const effectiveReminder = getEffectiveCardReminder(task, currentColumn);

    // DEBUG REMINDER - Removed

    // Force re-render when reminder is due
    const [_, setTick] = React.useState(0);
    React.useEffect(() => {
        if (!task.next_notification_at) return;

        const now = Date.now();
        const timeUntilDue = new Date(task.next_notification_at).getTime() - now;

        if (timeUntilDue > 0) {
            const timer = setTimeout(() => {
                setTick(t => t + 1);
            }, timeUntilDue);
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

    const formatTimeShort = (timestamp) => {
        return formatDate(timestamp, true);
    };

    // Dynamic border class based on prop
    const isCustomColor = color.startsWith('#');
    const borderColor = isCustomColor ? color : (COLOR_MAP[color] || '#6366f1');
    const borderStyle = { borderTopColor: borderColor };
    const borderClass = '';

    const getColumnColor = (col) => {
        if (col.color.startsWith('#')) return col.color;
        return COLOR_MAP[col.color] || '#6366f1';
    };

    // Text Only Mode
    if (config.enableTextOnly) {
        return (
            <Draggable draggableId={'task-' + task.id.toString()} index={index}>
                {(provided) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        onClick={() => onClick(task)}
                        className={`glass-panel p-4 rounded-xl cursor-pointer group ${borderClass} shadow-lg shadow-black/20 dark:!bg-[#1b2537] w-full max-w-full break-words`}
                        style={{ borderTopWidth: '2px', borderTopStyle: 'solid', borderTopColor: borderColor, ...provided.draggableProps.style }}
                    >
                        <h3 className="font-semibold text-[var(--text-primary)] text-base leading-tight mb-1">{task.title}</h3>
                        {task.description && (
                            <div className="text-gray-500 text-sm line-clamp-3"><Linkify text={task.description} /></div>
                        )}
                    </div>
                )}
            </Draggable>
        );
    }

    return (
        <Draggable draggableId={'task-' + task.id.toString()} index={index}>
            {(provided) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    onClick={() => onClick(task)}
                    className={`glass-panel p-4 rounded-xl cursor-pointer group ${borderClass} shadow-lg shadow-black/20 flex flex-col gap-3 relative dark:!bg-[#1b2537] w-full max-w-full break-words`}
                    style={{ borderTopWidth: '2px', borderTopStyle: 'solid', ...borderStyle, ...provided.draggableProps.style }}
                >
                    <div className="flex justify-between items-start">
                        <div className="flex items-start gap-2 pr-6 flex-1">
                            <h3 className="font-semibold text-[var(--text-primary)] text-base leading-tight">{task.title}</h3>
                            {isReminderActive(task) && (
                                <div
                                    className="bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-extrabold shrink-0 shadow-sm"
                                    title={`Aviso programado`}
                                >
                                    !
                                </div>
                            )}
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(task.id);
                            }}
                            className="absolute top-3 right-3 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                            title="Eliminar tarea"
                        >
                            <Icons.Trash2 />
                        </button>
                    </div>



                    {/* DEBUG: Remove after fixing */}
                    <div className="text-[8px] text-red-500 flex flex-col">
                        <span>{task.next_notification_at ? `Due: ${new Date(task.next_notification_at).toLocaleTimeString()}` : 'No Due'}</span>
                        <span>{effectiveReminder ? 'Has Config' : 'No Config'}</span>
                        <span>{isReminderActive(task) ? 'Active' : 'Pending'}</span>
                    </div>

                    {task.description && (
                        <div className="mt-1 text-gray-500 text-sm line-clamp-2"><Linkify text={task.description} /></div>
                    )}

                    {/* INLINE CHECKLIST */}
                    {Array.isArray(task.checklist) && task.checklist.length > 0 && (
                        <div className="mt-2 space-y-1">
                            {task.checklist.map(item => (
                                <div
                                    key={item.id}
                                    className="flex items-start gap-2 text-xs group/item"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const newChecklist = task.checklist.map(i => i.id === item.id ? { ...i, completed: !i.completed } : i);
                                        onUpdate({ ...task, checklist: newChecklist });
                                    }}
                                >
                                    <div
                                        className={`mt-0.5 cursor-pointer ${item.completed ? '' : 'text-gray-400 hover:text-indigo-400'}`}
                                        style={item.completed ? { color: borderColor } : {}}
                                    >
                                        {item.completed ? <Icons.CheckSquare size={14} /> : <Icons.Square size={14} />}
                                    </div>
                                    <span className={`flex-1 cursor-pointer select-none ${item.completed ? 'text-gray-500 line-through decoration-gray-600' : 'text-gray-300'}`}>
                                        {item.text}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {lastComment && (
                        <div
                            className="rounded-lg p-2.5 border"
                            style={{
                                backgroundColor: borderColor + '10', // 10 = ~6% opacity hex, or use '1A' for 10%
                                borderColor: borderColor + '30',
                            }}
                        >
                            <div className="flex justify-between items-center mb-1">
                                <span
                                    className="text-[10px] font-bold uppercase tracking-wider"
                                    style={{ color: borderColor }}
                                >
                                    Último comentario
                                </span>
                                <span
                                    className="text-[10px] font-bold dark:font-normal"
                                    style={{ color: borderColor, opacity: 0.8 }}
                                >
                                    {formatTimeShort(lastComment.createdAt || lastComment.created_at)}
                                </span>
                            </div>
                            <p className="text-xs text-gray-800 dark:text-gray-200 line-clamp-2 leading-relaxed whitespace-pre-wrap">"{lastComment.text}"</p>
                        </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-white/5 flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center text-gray-500 text-xs" title="Fecha de creación">
                                <Icons.Calendar />
                                <span className="ml-1">{formatDate(task.createdAt)}</span>
                            </div>
                            {commentCount > 0 && (
                                <div className="flex items-center text-xs" style={{ color: borderColor }}>
                                    <Icons.MessageSquare />
                                    <span className="ml-1">{commentCount}</span>
                                </div>
                            )}
                            {/* Reverted style but kept progress as optional summary if needed, but if showing full list, maybe redundant? specific user request was to SEE the checklist. I'll keep the summary in the footer but make the items visible in the body */}
                            {Array.isArray(task.checklist) && task.checklist.length > 0 && (
                                <div className="flex items-center text-xs" style={{ color: borderColor }}>
                                    <Icons.CheckSquare />
                                    <span className="ml-1">
                                        {task.checklist.filter(i => i.completed).length}/{task.checklist.length}
                                    </span>
                                </div>
                            )}

                        </div>

                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                            {config.enableMove && columns && (
                                <select
                                    value={task.status}
                                    onChange={(e) => onUpdate({ ...task, status: e.target.value })}
                                    className="bg-white/5 border border-white/10 rounded px-1 py-0.5 text-[10px] text-gray-400 focus:text-white outline-none max-w-[120px]"
                                    title="Mover a..."
                                >
                                    {columns.map(c => (
                                        <option key={c.id} value={c.title} style={{ backgroundColor: getColumnColor(c), color: '#fff' }}>
                                            {c.title}
                                        </option>
                                    ))}
                                </select>
                            )}

                            {config.enableOrder && (
                                <select
                                    value={task.sortOptionId || ""}
                                    onChange={(e) => {
                                        const opt = ORDER_OPTIONS.find(o => o.id === e.target.value);
                                        if (opt) {
                                            onMove(task, opt.action, opt.id);
                                        }
                                    }}
                                    className="bg-white/5 border border-white/10 rounded px-1 py-0.5 text-[10px] text-gray-400 focus:text-white outline-none max-w-[120px]"
                                    title="Ordenar/Estado..."
                                >
                                    <option value="" disabled>Estado...</option>
                                    {ORDER_OPTIONS.map(opt => (
                                        <option key={opt.id} value={opt.id} className="bg-slate-800 text-white">
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </Draggable>
    );
};

export default TaskCard;
