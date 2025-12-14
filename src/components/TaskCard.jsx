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

    // DEBUG REMINDER
    console.log(`Card ${task.id} (${task.title}):`, {
        next_notif: task.next_notification_at,
        now: new Date().toISOString(),
        active: isReminderActive(task),
        effective: effectiveReminder,
        column: currentColumn?.title
    });

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

                    {lastComment && (
                        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-2.5">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Último comentario</span>
                                <span className="text-[10px] font-bold text-indigo-400 dark:text-indigo-300/70 dark:font-normal">{formatTimeShort(lastComment.createdAt)}</span>
                            </div>
                            <p className="text-xs text-gray-800 dark:text-indigo-100 line-clamp-2 leading-relaxed whitespace-pre-wrap">"{lastComment.text}"</p>
                        </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-white/5 flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center text-gray-500 text-xs" title="Fecha de creación">
                                <Icons.Calendar />
                                <span className="ml-1">{formatDate(task.createdAt)}</span>
                            </div>
                            {commentCount > 0 && (
                                <div className="flex items-center text-indigo-400 text-xs">
                                    <Icons.MessageSquare />
                                    <span className="ml-1">{commentCount}</span>
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
