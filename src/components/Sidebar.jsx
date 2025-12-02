import React, { useState } from 'react';
import { Icons } from './ui/Icons';
import logo from '../assets/logo.jpg';

const Sidebar = ({ boards, activeBoardId, onSwitchBoard, onCreateBoard, onEditBoard, onDeleteBoard }) => {
    const [isCreating, setIsCreating] = useState(false);
    const [newBoardTitle, setNewBoardTitle] = useState("");
    const [editingBoardId, setEditingBoardId] = useState(null);
    const [editingTitle, setEditingTitle] = useState("");

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
        <div className="w-64 bg-slate-950 border-r border-white/5 flex flex-col flex-shrink-0">
            <div className="p-4 border-b border-white/5 flex items-center gap-2">
                <img src={logo} alt="GSP Logo" className="w-10 h-10 rounded-lg object-contain bg-white" />
                <h1 className="font-bold text-gray-100 tracking-tight">Gestor de Tareas</h1>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">Mis Tableros</div>
                {boards.map(board => (
                    <div key={board.id} className="relative group">
                        {editingBoardId === board.id ? (
                            <form onSubmit={saveEditing} className="px-2 py-1">
                                <input autoFocus type="text" value={editingTitle} onChange={(e) => setEditingTitle(e.target.value)} onBlur={saveEditing} className="w-full bg-slate-800 border border-indigo-500 rounded px-2 py-1 text-sm text-white outline-none" />
                            </form>
                        ) : (
                            <button onClick={() => onSwitchBoard(board.id)} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center justify-between group ${activeBoardId === board.id ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}>
                                <span className="truncate pr-6">{board.title}</span>
                                <div onClick={(e) => { e.stopPropagation(); startEditing(board); }} className="absolute right-8 opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-white transition-opacity bg-slate-950/50 rounded" title="Renombrar"><Icons.Edit /></div>
                                <div onClick={(e) => { e.stopPropagation(); onDeleteBoard(board.id); }} className="absolute right-2 opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all rounded" title="Eliminar Tablero"><Icons.Trash2 /></div>
                            </button>
                        )}
                    </div>
                ))}
                {isCreating ? (
                    <form onSubmit={handleCreate} className="mt-2 px-1">
                        <input autoFocus type="text" value={newBoardTitle} onChange={(e) => setNewBoardTitle(e.target.value)} placeholder="Nombre del tablero..." className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white focus:ring-1 focus:ring-indigo-500 outline-none mb-2" />
                        <div className="flex gap-2">
                            <button type="submit" className="flex-1 bg-indigo-600 text-white text-xs py-1 rounded hover:bg-indigo-500">Crear</button>
                            <button type="button" onClick={() => setIsCreating(false)} className="px-2 text-gray-500 hover:text-white text-xs">Cancel</button>
                        </div>
                    </form>
                ) : (
                    <button onClick={() => setIsCreating(true)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-indigo-400 hover:bg-indigo-500/5 rounded-lg transition-all mt-2"><Icons.Plus /><span>Nuevo Tablero</span></button>
                )}
            </div>
            <div className="p-4 border-t border-white/5"><div className="text-xs text-gray-600 text-center">v4.0 • Multi-Board</div></div>
        </div>
    );
};

export default Sidebar;
