import React from 'react';
import { Icons } from './ui/Icons';
import { Linkify, COLOR_MAP } from '../utils/helpers';


const TaskCard = ({ task, onClick, onDelete, onUpdate, onMove, color, cardConfig, columns }) => {
    const commentCount = task.comments ? task.comments.length : 0;
    const lastComment = commentCount > 0 ? task.comments[task.comments.length - 1] : null;

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
        const date = new Date(timestamp);
        return date.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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
            <div
                onClick={() => onClick(task)}
                className={`glass-panel p-4 rounded-xl mb-3 hover:bg-white/5 transition-all cursor-pointer group border-l-4 ${borderClass} shadow-lg shadow-black/20`}
                style={{ borderLeftColor: borderColor }}
            >
                <h3 className="font-semibold text-gray-100 text-lg leading-tight mb-1">{task.title}</h3>
                {task.description && (
                    <div className="text-gray-500 text-sm line-clamp-3"><Linkify text={task.description} /></div>
                )}
            </div>
        );
    }

    return (
        <div
            onClick={() => onClick(task)}
            className={`glass-panel p-4 rounded-xl mb-3 hover:bg-white/5 transition-all cursor-pointer group border-t-4 ${borderClass} shadow-lg shadow-black/20 flex flex-col gap-3 relative`}
            style={borderStyle}
        >
            <div className="flex justify-between items-start">
                <div className="flex items-start gap-3 pr-6">
                    <h3 className="font-semibold text-gray-100 text-lg leading-tight">{task.title}</h3>
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

            {task.description && (
                <div className="text-gray-500 text-sm mt-1 line-clamp-2"><Linkify text={task.description} /></div>
            )}

            {lastComment && (
                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-2.5">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Último comentario</span>
                        <span className="text-[10px] text-indigo-300/70">{formatTimeShort(lastComment.createdAt)}</span>
                    </div>
                    <p className="text-xs text-indigo-100 line-clamp-2 leading-relaxed">"{lastComment.text}"</p>
                </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-white/5 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                    <div className="flex items-center text-gray-500 text-xs" title="Fecha de creación">
                        <Icons.Calendar />
                        <span className="ml-1">{new Date(task.createdAt).toLocaleDateString()}</span>
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
    );
};

export default TaskCard;
