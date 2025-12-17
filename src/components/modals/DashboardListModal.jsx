import React from 'react';
import { createPortal } from 'react-dom';

const DashboardListModal = ({ isOpen, onClose, title, tasks, color, icon, onTaskClick }) => {
    if (!isOpen) return null;

    const colorMap = {
        red: {
            headerGradient: 'from-red-500/20 to-red-500/5',
            bgIcon: 'bg-red-500/10',
            textIcon: 'text-red-400',
            textHeader: 'text-white',
            border: 'border-slate-700/50'
        },
        orange: {
            headerGradient: 'from-orange-500/20 to-orange-500/5',
            bgIcon: 'bg-orange-500/10',
            textIcon: 'text-orange-400',
            textHeader: 'text-white',
            border: 'border-slate-700/50'
        },
    };
    const c = colorMap[color] || colorMap.red;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px] transition-all duration-300" onClick={onClose}>
            <div
                className={`w-full max-w-3xl bg-[#0f172a] rounded-2xl border ${c.border} shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200 transform scale-100`}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className={`px-8 py-6 border-b border-slate-700/50 bg-gradient-to-r ${c.headerGradient} flex justify-between items-center shrink-0`}>
                    <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 flex items-center justify-center rounded-xl ${c.bgIcon} ${c.textIcon} shadow-lg border border-white/5`}>
                            <span className="material-symbols-outlined text-[28px]">{icon}</span>
                        </div>
                        <div>
                            <h2 className={`${c.textHeader} font-bold text-2xl tracking-tight`}>{title}</h2>
                            <p className="text-slate-400 text-sm font-medium mt-0.5">Lista completa de tareas pendientes.</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors border border-transparent hover:border-white/5"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-[#0f172a]">
                    <div className="space-y-4">
                        {tasks.length === 0 ? (
                            <div className="text-center py-16 text-slate-500 flex flex-col items-center gap-4">
                                <div className="p-4 rounded-full bg-slate-800/50">
                                    <span className="material-symbols-outlined text-5xl opacity-50">inbox</span>
                                </div>
                                <p className="font-medium">No hay tareas en esta lista.</p>
                            </div>
                        ) : tasks.map((task, index) => (
                            <div key={task.id}
                                onClick={() => { onTaskClick?.(task); onClose(); }}
                                className="p-5 rounded-xl bg-[#1e293b] border border-slate-700/50 hover:border-indigo-500/50 hover:bg-[#253045] hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 group flex flex-col gap-3 relative overflow-hidden cursor-pointer"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <div className="absolute top-0 left-0 w-1 h-full bg-slate-700 group-hover:bg-indigo-500 transition-colors"></div>
                                {/* Top Row */}
                                <div className="flex justify-between items-start gap-3 pl-3">
                                    <h5 className="text-base font-bold text-slate-100 group-hover:text-white leading-snug">{task.title}</h5>
                                </div>

                                {/* Context Badges */}
                                <div className="flex items-center flex-wrap gap-2 text-xs pl-3">
                                    <span className="flex items-center gap-1.5 bg-indigo-500/10 text-indigo-300 px-2.5 py-1 rounded-md border border-indigo-500/20 font-medium">
                                        <span className="material-symbols-outlined text-[14px]">dashboard</span>
                                        {task.boardTitle}
                                    </span>
                                    <span className="text-slate-600 font-bold">/</span>
                                    <span className="flex items-center gap-1.5 bg-slate-700/30 text-slate-300 px-2.5 py-1 rounded-md border border-slate-600/30 font-medium">
                                        <span className="material-symbols-outlined text-[14px]">view_column</span>
                                        {task.columnTitle}
                                    </span>
                                </div>

                                {/* Description */}
                                {task.description && (
                                    <p className="text-sm text-slate-400 mt-1 line-clamp-2 leading-relaxed pl-3 border-l-2 border-slate-700/50">
                                        {task.description}
                                    </p>
                                )}

                                {/* Last Comment */}
                                {task.comments && task.comments.length > 0 && (
                                    <div className="mt-2 ml-3 p-3 bg-slate-900/50 rounded-lg border border-slate-700/50 flex flex-col gap-1">
                                        <div className="flex justify-between items-center mb-1">
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined text-[14px] text-slate-500">chat_bubble</span>
                                                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Último comentario</span>
                                            </div>
                                            <span className="text-[10px] text-slate-600 font-mono">
                                                {new Date(task.comments[task.comments.length - 1].created_at).toLocaleString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-300 italic leading-relaxed">
                                            "{task.comments[task.comments.length - 1].text}"
                                        </p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-8 py-4 border-t border-slate-800 bg-[#0f172a] flex justify-between items-center bg-slate-900/50">
                    <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                        Mostrando {tasks.length} tareas
                    </span>
                    <button onClick={onClose} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-colors border border-slate-700 hover:border-slate-600">
                        Cerrar
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default DashboardListModal;
