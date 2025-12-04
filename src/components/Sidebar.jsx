import React, { useState } from 'react';
import { Icons } from './ui/Icons';
import logo from '../assets/logo.jpg';
import SettingsModal from './modals/SettingsModal';

const Sidebar = ({ boards, activeBoardId, onSwitchBoard, onCreateBoard, onEditBoard, onDeleteBoard }) => {
    const [isCreating, setIsCreating] = useState(false);
    const [newBoardTitle, setNewBoardTitle] = useState("");
    const [editingBoardId, setEditingBoardId] = useState(null);
    const [editingTitle, setEditingTitle] = useState("");
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    const handleCreate = (e) => {
        e.preventDefault();
        if (newBoardTitle.trim()) {
            onCreateBoard(newBoardTitle);
            setNewBoardTitle("");
            setIsCreating(false);
        }
    };

    const startEditing = (board) => {
        setEditingBoardId(board.id);
        setEditingTitle(board.title);
    };

    const saveEditing = (e) => {
        e.preventDefault();
        if (editingTitle.trim()) {
            onEditBoard(editingBoardId, editingTitle);
        }
        setEditingBoardId(null);
    };

    return (
        <div className={`${isCollapsed ? 'w-20' : 'w-64'} dark:bg-[#020617] bg-[var(--bg-secondary)] border-r border-[var(--border-color)] flex flex-col flex-shrink-0 transition-all duration-300 relative`}>
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -right-3 top-1/2 -translate-y-1/2 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-full p-1 shadow-lg z-50"
            >
                {isCollapsed ? <Icons.ChevronRight /> : <Icons.ChevronLeft />}
            </button>

            <div className={`p-4 border-b border-[var(--border-color)] flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
                <img src={logo} alt="GSP Logo" className="w-10 h-10 rounded-lg object-contain bg-white flex-shrink-0" />
                {!isCollapsed && <h1 className="font-bold text-[var(--text-primary)] tracking-tight whitespace-nowrap overflow-hidden">Gestor de Tareas</h1>}
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
                {!isCollapsed && <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2 px-2">Mis Tableros</div>}

                {boards.map(board => (
                    <div key={board.id} className="relative group">
                        {editingBoardId === board.id && !isCollapsed ? (
                            <form onSubmit={saveEditing} className="px-2 py-1">
                                <input autoFocus type="text" value={editingTitle} onChange={(e) => setEditingTitle(e.target.value)} onBlur={saveEditing} className="w-full bg-[var(--bg-primary)] border border-indigo-500 rounded px-2 py-1 text-sm text-[var(--text-primary)] outline-none" />
                            </form>
                        ) : (
                            <button
                                onClick={() => onSwitchBoard(board.id)}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center group ${activeBoardId === board.id ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]'} ${isCollapsed ? 'justify-center px-0' : 'justify-between'}`}
                                title={isCollapsed ? board.title : ''}
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    {isCollapsed ? (
                                        <div className="w-8 h-8 rounded bg-[var(--bg-primary)] flex items-center justify-center text-xs font-bold uppercase flex-shrink-0 text-[var(--text-secondary)]">
                                            {board.title.charAt(0)}
                                        </div>
                                    ) : (
                                        <span className="truncate pr-6">{board.title}</span>
                                    )}
                                </div>

                                {!isCollapsed && (
                                    <>
                                        <div onClick={(e) => { e.stopPropagation(); startEditing(board); }} className="absolute right-8 opacity-0 group-hover:opacity-100 p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-opacity bg-[var(--bg-secondary)]/50 rounded" title="Renombrar"><Icons.Edit /></div>
                                        <div onClick={(e) => { e.stopPropagation(); onDeleteBoard(board.id); }} className="absolute right-2 opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all rounded" title="Eliminar Tablero"><Icons.Trash2 /></div>
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                ))}

                {!isCollapsed ? (
                    isCreating ? (
                        <form onSubmit={handleCreate} className="mt-2 px-1">
                            <input autoFocus type="text" value={newBoardTitle} onChange={(e) => setNewBoardTitle(e.target.value)} placeholder="Nombre del tablero..." className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-2 py-1.5 text-xs text-[var(--text-primary)] focus:ring-1 focus:ring-indigo-500 outline-none mb-2" />
                            <div className="flex gap-2">
                                <button type="submit" className="flex-1 bg-indigo-600 text-white text-xs py-1 rounded hover:bg-indigo-500">Crear</button>
                                <button type="button" onClick={() => setIsCreating(false)} className="px-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs">Cancel</button>
                            </div>
                        </form>
                    ) : (
                        <button onClick={() => setIsCreating(true)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-indigo-400 hover:bg-indigo-500/5 rounded-lg transition-all mt-2"><Icons.Plus /><span>Nuevo Tablero</span></button>
                    )
                ) : (
                    <button onClick={() => setIsCollapsed(false)} className="w-full flex items-center justify-center p-2 text-[var(--text-secondary)] hover:text-indigo-400 hover:bg-indigo-500/5 rounded-lg transition-all mt-2" title="Crear nuevo tablero"><Icons.Plus /></button>
                )}
            </div>

            <div className="p-3 border-t border-[var(--border-color)] mt-auto">
                <button
                    onClick={() => setShowSettings(true)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)] rounded-lg transition-all group ${isCollapsed ? 'justify-center px-0' : ''}`}
                    title="Configuración"
                >
                    <Icons.Settings />
                    {!isCollapsed && <span className="text-sm">Configuración</span>}
                </button>
            </div>
            {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
        </div>
    );
};

export default Sidebar;
