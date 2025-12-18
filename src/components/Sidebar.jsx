import React, { useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Icons } from './ui/Icons';
import logo from '../assets/logo.jpg';
import SettingsModal from './modals/SettingsModal';

const Sidebar = ({ boards, activeBoardId, onSwitchBoard, onCreateBoard, onEditBoard, onDeleteBoard, activeView, onSwitchView, onReorderBoards }) => {
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
            onEditBoard(editingBoardId, { title: editingTitle });
        }
        setEditingBoardId(null);
    };

    // DnD Sensors for board reordering
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (active.id !== over?.id) {
            const oldIndex = boards.findIndex(b => b.id === active.id);
            const newIndex = boards.findIndex(b => b.id === over.id);
            const reorderedBoards = arrayMove(boards, oldIndex, newIndex);
            onReorderBoards?.(reorderedBoards);
        }
    };

    return (
        <div
            className={`
                ${isCollapsed ? 'w-20' : 'w-72'} 
                bg-[#0f172a] border-r border-white/5 flex flex-col flex-shrink-0 transition-all duration-300 relative z-50
                shadow-2xl shadow-black/20
            `}
        >
            {/* Collapse Toggle */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -right-3.5 top-[26px] w-7 h-7 flex items-center justify-center bg-[#0f172a] border border-white/10 text-slate-400 hover:text-white rounded-full shadow-xl hover:scale-110 transition-all z-50"
            >
                {isCollapsed ? <Icons.ChevronRight size={14} /> : <Icons.ChevronLeft size={14} />}
            </button>

            {/* Logo Area */}
            <div className={`h-20 flex items-center ${isCollapsed ? 'justify-center' : 'px-6'} border-b border-white/5`}>
                <div className="relative group cursor-pointer overflow-hidden rounded-xl">
                    <img src={logo} alt="Logo" className="w-10 h-10 object-cover rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300" />
                    <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-xl pointer-events-none" />
                </div>
                {!isCollapsed && (
                    <div className="ml-4 opacity-100 transition-opacity duration-300">
                        <h1 className="font-bold text-lg text-white leading-none tracking-tight">Gestor</h1>
                        <span className="text-xs text-indigo-400 font-medium tracking-wider uppercase">Pro v1.0</span>
                    </div>
                )}
            </div>

            {/* Main Navigation */}
            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8 custom-scrollbar">

                {/* Section 1: Views */}
                <div className="space-y-1">
                    {!isCollapsed && <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 px-2">Vistas</div>}
                    <NavItem
                        active={activeView === 'dashboard'}
                        onClick={() => onSwitchView('dashboard')}
                        title="Dashboard"
                        collapsed={isCollapsed}
                    >
                        <span className="material-symbols-outlined text-[20px]">grid_view</span>
                        {!isCollapsed && <span className="text-sm font-medium">Dashboard</span>}
                    </NavItem>
                </div>

                {/* Section 2: Boards */}
                <div className="space-y-1">
                    {!isCollapsed && (
                        <div className="flex items-center justify-between px-2 mb-3 mt-2">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tableros</span>
                            <button
                                onClick={() => setIsCreating(true)}
                                className="text-slate-500 hover:text-indigo-400 transition-colors p-1 rounded hover:bg-white/5"
                                title="Crear Tablero"
                            >
                                <Icons.Plus size={14} />
                            </button>
                        </div>
                    )}

                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={boards.map(b => b.id)} strategy={verticalListSortingStrategy}>
                            {boards.map(board => (
                                <SortableBoardItem
                                    key={board.id}
                                    board={board}
                                    isEditing={editingBoardId === board.id}
                                    editingTitle={editingTitle}
                                    setEditingTitle={setEditingTitle}
                                    saveEditing={saveEditing}
                                    startEditing={startEditing}
                                    onDeleteBoard={onDeleteBoard}
                                    activeView={activeView}
                                    activeBoardId={activeBoardId}
                                    onSwitchView={onSwitchView}
                                    onSwitchBoard={onSwitchBoard}
                                    isCollapsed={isCollapsed}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>


                    {/* Create New (Input or Button if Nav Header hidden) */}
                    {!isCollapsed && isCreating && (
                        <form onSubmit={handleCreate} className="mt-2 px-1 animate-in fade-in slide-in-from-top-2">
                            <input
                                autoFocus
                                type="text"
                                value={newBoardTitle}
                                onChange={(e) => setNewBoardTitle(e.target.value)}
                                placeholder="Nombre del tablero..."
                                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none placeholder:text-slate-600 transition-all"
                            />
                            <div className="flex gap-2 mt-2">
                                <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs py-1.5 rounded-md font-medium transition-colors">Crear</button>
                                <button type="button" onClick={() => setIsCreating(false)} className="px-3 py-1.5 text-slate-400 hover:text-slate-200 text-xs font-medium hover:bg-white/5 rounded-md transition-colors">Cancelar</button>
                            </div>
                        </form>
                    )}

                    {/* Collapsed Create Button */}
                    {isCollapsed && (
                        <button
                            onClick={() => setIsCollapsed(false)}
                            className="w-full flex items-center justify-center p-2.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/5 rounded-xl transition-all mt-4 border border-dashed border-slate-700"
                            title="Crear nuevo tablero"
                        >
                            <Icons.Plus size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/5 bg-[#0b1120]">
                <NavItem
                    onClick={() => setShowSettings(true)}
                    active={showSettings}
                    title="Configuración"
                    collapsed={isCollapsed}
                >
                    <Icons.Settings size={20} className={showSettings ? "animate-spin-slow" : ""} />
                    {!isCollapsed && <span className="text-sm font-medium">Configuración</span>}
                </NavItem>
            </div>

            {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
        </div>
    );
};

export default Sidebar;

// SortableBoardItem - Board item with drag handle
const SortableBoardItem = ({ board, isEditing, editingTitle, setEditingTitle, saveEditing, startEditing, onDeleteBoard, activeView, activeBoardId, onSwitchView, onSwitchBoard, isCollapsed }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: board.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 50 : undefined,
    };

    return (
        <div ref={setNodeRef} style={style} className="relative group">
            {isEditing && !isCollapsed ? (
                <form onSubmit={saveEditing} className="px-1 py-1">
                    <input
                        autoFocus
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onBlur={saveEditing}
                        className="w-full bg-slate-800 border border-indigo-500 rounded-lg px-3 py-2 text-sm text-white outline-none shadow-lg shadow-indigo-500/20"
                    />
                </form>
            ) : (
                <div className="flex items-center">
                    {/* Drag Handle */}
                    {!isCollapsed && (
                        <div
                            {...attributes}
                            {...listeners}
                            className="p-1 mr-0.5 text-slate-600 hover:text-slate-400 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <Icons.GripVertical size={12} />
                        </div>
                    )}
                    <div className="flex-1">
                        <NavItem
                            active={activeView === 'board' && activeBoardId === board.id}
                            onClick={() => { onSwitchView('board'); onSwitchBoard(board.id); }}
                            title={board.title}
                            collapsed={isCollapsed}
                        >
                            <div className={`
                                w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold uppercase transition-colors
                                ${activeView === 'board' && activeBoardId === board.id ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400 group-hover:text-white'}
                            `}>
                                {board.title.charAt(0)}
                            </div>
                            {!isCollapsed && <span className="truncate text-sm font-medium">{board.title}</span>}

                            {/* Actions */}
                            {!isCollapsed && (
                                <div className="absolute right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div
                                        onClick={(e) => { e.stopPropagation(); startEditing(board); }}
                                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg cursor-pointer"
                                    >
                                        <Icons.Edit size={12} />
                                    </div>
                                    <div
                                        onClick={(e) => { e.stopPropagation(); onDeleteBoard(board.id); }}
                                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer"
                                    >
                                        <Icons.Trash2 size={12} />
                                    </div>
                                </div>
                            )}
                        </NavItem>
                    </div>
                </div>
            )}
        </div>
    );
};

const NavItem = ({ active, children, onClick, title, collapsed }) => (
    <button
        onClick={onClick}
        title={title}
        className={`
            group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative
            ${active
                ? 'bg-gradient-to-r from-indigo-600/20 via-indigo-500/10 to-transparent text-white ring-1 ring-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}
            ${collapsed ? 'justify-center px-0' : ''}
        `}
        style={active ? { boxShadow: '0 0 20px rgba(99, 102, 241, 0.15), inset 0 1px 0 rgba(255,255,255,0.05)' } : {}}
    >
        {active && !collapsed && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-500 rounded-r-full" />}
        {children}
    </button>
);
