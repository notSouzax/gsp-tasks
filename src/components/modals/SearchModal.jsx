import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';

const SearchModal = ({ isOpen, onClose, boards, onTaskClick }) => {
    const [searchQuery, setSearchQuery] = useState('');

    // Aggregate all tasks with board/column context
    const allTasks = useMemo(() => {
        if (!boards) return [];
        return boards.flatMap(b =>
            (b.columns || []).flatMap(c =>
                (c.cards || []).map(t => ({
                    ...t,
                    boardId: b.id,
                    boardTitle: b.title,
                    columnTitle: c.title
                }))
            )
        );
    }, [boards]);

    // Filter tasks by search query
    const filteredTasks = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const query = searchQuery.toLowerCase();
        return allTasks.filter(t =>
            t.title?.toLowerCase().includes(query) ||
            t.description?.toLowerCase().includes(query)
        );
    }, [allTasks, searchQuery]);

    if (!isOpen) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/60 backdrop-blur-[2px] transition-all duration-300"
            onClick={onClose}
        >
            <div
                className="w-full max-w-2xl bg-[#0f172a] rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden flex flex-col max-h-[75vh] animate-in fade-in zoom-in-95 duration-200 transform scale-100"
                onClick={e => e.stopPropagation()}
            >
                {/* Search Header */}
                <div className="px-6 py-4 border-b border-slate-700/50 bg-gradient-to-r from-indigo-500/20 to-indigo-500/5 flex items-center gap-4">
                    <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 shadow-lg border border-white/5">
                        <span className="material-symbols-outlined text-[24px]">search</span>
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar tareas..."
                        autoFocus
                        className="flex-1 bg-transparent text-white text-lg font-medium placeholder:text-slate-500 outline-none"
                    />
                    <button
                        onClick={onClose}
                        className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors border border-transparent hover:border-white/5"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Results */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-[#0f172a]">
                    {searchQuery.trim() === '' ? (
                        <div className="text-center py-16 text-slate-500 flex flex-col items-center gap-4">
                            <div className="p-4 rounded-full bg-slate-800/50">
                                <span className="material-symbols-outlined text-5xl opacity-50">search</span>
                            </div>
                            <p className="font-medium">Escribe para buscar entre todas tus tareas.</p>
                        </div>
                    ) : filteredTasks.length === 0 ? (
                        <div className="text-center py-16 text-slate-500 flex flex-col items-center gap-4">
                            <div className="p-4 rounded-full bg-slate-800/50">
                                <span className="material-symbols-outlined text-5xl opacity-50">search_off</span>
                            </div>
                            <p className="font-medium">No se encontraron tareas para "{searchQuery}"</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredTasks.map((task, index) => (
                                <div
                                    key={task.id}
                                    onClick={() => { onTaskClick?.(task); onClose(); }}
                                    className="p-4 rounded-xl bg-[#1e293b] border border-slate-700/50 hover:border-indigo-500/50 hover:bg-[#253045] hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 group flex flex-col gap-2 relative overflow-hidden cursor-pointer"
                                    style={{ animationDelay: `${index * 50}ms` }}
                                >
                                    <div className="absolute top-0 left-0 w-1 h-full bg-slate-700 group-hover:bg-indigo-500 transition-colors"></div>

                                    {/* Title */}
                                    <h5 className="text-base font-bold text-slate-100 group-hover:text-white leading-snug pl-3">
                                        {task.title}
                                    </h5>

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

                                    {/* Description (if exists) */}
                                    {task.description && (
                                        <p className="text-sm text-slate-400 line-clamp-1 leading-relaxed pl-3 mt-1">
                                            {task.description}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/50 flex justify-between items-center">
                    <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                        {searchQuery.trim() ? `${filteredTasks.length} resultado(s)` : 'Buscar en todos los tableros'}
                    </span>
                    <div className="text-xs text-slate-600">
                        <kbd className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700">ESC</kbd> para cerrar
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default SearchModal;
