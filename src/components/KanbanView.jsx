import React, { useState } from 'react';
import { Plus, LayoutGrid, ChevronDown, Trash2, Edit2, Check, X, GripVertical } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import KanbanBoard from './KanbanBoard';

const KanbanView = ({
    boards,
    activeBoardId,
    onSwitchBoard,
    onCreateBoard,
    onEditBoard,
    onDeleteBoard,
    onReorderBoards,
    onColumnsChange,
    pendingTaskId
}) => {
    const [isCreating, setIsCreating] = useState(false);
    const [newBoardTitle, setNewBoardTitle] = useState('');
    const [editingBoardId, setEditingBoardId] = useState(null);
    const [editingTitle, setEditingTitle] = useState('');

    const activeBoard = boards.find(b => b.id === activeBoardId) || boards[0];

    // DnD Sensors for board reordering
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleCreate = (e) => {
        e.preventDefault();
        if (newBoardTitle.trim()) {
            onCreateBoard(newBoardTitle);
            setNewBoardTitle('');
            setIsCreating(false);
        }
    };

    const startEditing = (board, e) => {
        e.stopPropagation();
        setEditingBoardId(board.id);
        setEditingTitle(board.title);
    };

    const saveEditing = (e) => {
        e?.preventDefault();
        if (editingTitle.trim()) {
            onEditBoard(editingBoardId, { title: editingTitle });
        }
        setEditingBoardId(null);
    };

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
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* Board Selector Header */}
            <div className="flex-shrink-0 p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/50 backdrop-blur-sm">
                <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide">
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={boards.map(b => b.id)} strategy={horizontalListSortingStrategy}>
                            {boards.map(board => (
                                <SortableBoardTab
                                    key={board.id}
                                    board={board}
                                    isActive={board.id === activeBoardId}
                                    isEditing={editingBoardId === board.id}
                                    editingTitle={editingTitle}
                                    setEditingTitle={setEditingTitle}
                                    onSelect={() => onSwitchBoard(board.id)}
                                    onStartEdit={(e) => startEditing(board, e)}
                                    onSaveEdit={saveEditing}
                                    onDelete={(e) => { e.stopPropagation(); onDeleteBoard(board.id); }}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>

                    {/* Create New Board */}
                    {isCreating ? (
                        <form onSubmit={handleCreate} className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
                            <input
                                autoFocus
                                type="text"
                                value={newBoardTitle}
                                onChange={(e) => setNewBoardTitle(e.target.value)}
                                placeholder="Nombre del tablero..."
                                className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none placeholder:text-[var(--text-muted)] w-48"
                                onBlur={() => { if (!newBoardTitle.trim()) setIsCreating(false); }}
                            />
                            <button
                                type="submit"
                                className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
                            >
                                <Check size={16} />
                            </button>
                            <button
                                type="button"
                                onClick={() => { setIsCreating(false); setNewBoardTitle(''); }}
                                className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </form>
                    ) : (
                        <button
                            onClick={() => setIsCreating(true)}
                            className="flex items-center gap-2 px-4 py-2.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-dashed border-[var(--border-default)] hover:border-indigo-500/50 rounded-xl transition-all hover:bg-indigo-500/5 group"
                        >
                            <Plus size={16} className="group-hover:rotate-90 transition-transform duration-300" />
                            <span className="text-sm font-medium whitespace-nowrap">Nuevo Tablero</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Kanban Board */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {activeBoard ? (
                    <KanbanBoard
                        key={activeBoard.id}
                        boardId={activeBoard.id}
                        initialColumns={activeBoard.columns}
                        onColumnsChange={(newCols) => onColumnsChange?.({ columns: newCols })}
                        initialTaskId={pendingTaskId}
                    />
                ) : (
                    <div className="flex-1 flex items-center justify-center text-[var(--text-secondary)]">
                        <div className="text-center space-y-4">
                            <LayoutGrid size={48} className="mx-auto opacity-30" />
                            <p>No hay tableros. Crea uno para empezar.</p>
                            <button
                                onClick={() => setIsCreating(true)}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
                            >
                                Crear Tablero
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Sortable Board Tab Component
const SortableBoardTab = ({
    board,
    isActive,
    isEditing,
    editingTitle,
    setEditingTitle,
    onSelect,
    onStartEdit,
    onSaveEdit,
    onDelete
}) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: board.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 50 : undefined,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`
                group flex items-center gap-2 px-4 py-2.5 rounded-xl cursor-pointer transition-all
                ${isActive
                    ? 'bg-indigo-500/20 dark:bg-gradient-to-r dark:from-indigo-600/30 dark:via-indigo-500/20 dark:to-transparent text-indigo-600 dark:text-white ring-1 ring-indigo-500/40 shadow-lg shadow-indigo-500/10'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] dark:hover:bg-slate-800/50'
                }
            `}
            onClick={onSelect}
        >
            {/* Drag Handle */}
            <div
                {...attributes}
                {...listeners}
                className="p-1 -ml-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
            >
                <GripVertical size={14} />
            </div>

            {/* Board Icon */}
            <div className={`
                w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold uppercase
                ${isActive ? 'bg-indigo-500 text-white' : 'bg-[var(--bg-secondary)] dark:bg-slate-700 text-[var(--text-primary)] dark:text-slate-300'}
            `}>
                {board.title.charAt(0)}
            </div>

            {/* Title or Edit Input */}
            {isEditing ? (
                <form onSubmit={onSaveEdit} onClick={(e) => e.stopPropagation()}>
                    <input
                        autoFocus
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onBlur={onSaveEdit}
                        className="bg-[var(--bg-secondary)] border border-indigo-500 rounded px-2 py-1 text-sm text-[var(--text-primary)] outline-none w-32"
                    />
                </form>
            ) : (
                <span className="text-sm font-medium whitespace-nowrap">{board.title}</span>
            )}

            {/* Actions */}
            {!isEditing && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                    <button
                        onClick={onStartEdit}
                        className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded transition-colors"
                    >
                        <Edit2 size={12} />
                    </button>
                    <button
                        onClick={onDelete}
                        className="p-1 text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                    >
                        <Trash2 size={12} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default KanbanView;
