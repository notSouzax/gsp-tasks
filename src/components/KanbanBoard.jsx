import React, { useState, useEffect, useMemo } from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import Column from './Column';
import CreateTaskModal from './modals/CreateTaskModal';
import ColumnModal from './modals/ColumnModal';
import TaskDetailModal from './modals/TaskDetailModal';

const KanbanBoard = ({ initialColumns, onColumnsChange }) => {
    const [columns, setColumns] = useState(initialColumns);
    const [editingColumn, setEditingColumn] = useState(null);
    const [editingTask, setEditingTask] = useState(null);
    const [creatingTaskColumn, setCreatingTaskColumn] = useState(null);

    useEffect(() => { setColumns(initialColumns); }, [initialColumns]);
    const updateColumns = (newColumns) => { setColumns(newColumns); onColumnsChange(newColumns); };
    const allTasks = useMemo(() => { return columns.flatMap(col => (col.cards || []).map(task => ({ ...task, status: col.title }))); }, [columns]);

    const handleAddTask = (columnTitle) => { setCreatingTaskColumn(columnTitle); };
    const handleSaveTask = (taskData) => {
        const newTask = { id: Date.now(), title: taskData.title, description: taskData.description, createdAt: Date.now(), comments: taskData.initialComment ? [{ id: Date.now(), text: taskData.initialComment, createdAt: Date.now() }] : [] };
        const newColumns = columns.map(col => { if (col.title === creatingTaskColumn) { return { ...col, cards: [...(col.cards || []), newTask] }; } return col; });
        updateColumns(newColumns); setCreatingTaskColumn(null);
    };
    const handleUpdateTask = (updatedTask) => {
        const newColumns = columns.map(col => {
            const colCards = col.cards || [];
            const taskIndex = colCards.findIndex(t => t.id === updatedTask.id);
            if (taskIndex > -1) {
                if (updatedTask.status && updatedTask.status !== col.title) { return { ...col, cards: colCards.filter(t => t.id !== updatedTask.id) }; }
                else { const newCards = [...colCards]; newCards[taskIndex] = updatedTask; return { ...col, cards: newCards }; }
            } else { if (updatedTask.status === col.title) { return { ...col, cards: [...colCards, updatedTask] }; } }
            return col;
        });
        updateColumns(newColumns);
    };
    const handleDeleteTask = (taskId) => { const newColumns = columns.map(col => ({ ...col, cards: (col.cards || []).filter(t => t.id !== taskId) })); updateColumns(newColumns); };
    const handleMoveTask = (task, action, sortOptionId) => {
        const currentColumn = columns.find(c => c.title === task.status); if (!currentColumn) return;
        const newColumns = columns.map(col => {
            if (col.id === currentColumn.id) {
                const updatedTask = sortOptionId ? { ...task, sortOptionId } : task;
                if (action === 'none') { return { ...col, cards: (col.cards || []).map(t => t.id === task.id ? updatedTask : t) }; }
                let newCards = (col.cards || []).filter(t => t.id !== task.id);
                if (action === 'move-start') { newCards = [updatedTask, ...newCards]; } else if (action === 'move-end') { newCards = [...newCards, updatedTask]; }
                return { ...col, cards: newCards };
            }
            return col;
        });
        updateColumns(newColumns);
    };
    const handleUpdateColumn = (colId, updates) => { const newColumns = columns.map(c => c.id === colId ? { ...c, ...updates } : c); updateColumns(newColumns); };

    const onDragEnd = (result) => {
        const { destination, source } = result;

        if (!destination) return;

        if (
            destination.droppableId === source.droppableId &&
            destination.index === source.index
        ) {
            return;
        }

        const startColumn = columns.find(col => col.id === source.droppableId);
        const finishColumn = columns.find(col => col.id === destination.droppableId);

        if (!startColumn || !finishColumn) return;

        // Moving within the same column
        if (startColumn === finishColumn) {
            const newCards = Array.from(startColumn.cards || []);
            const [movedCard] = newCards.splice(source.index, 1);
            newCards.splice(destination.index, 0, movedCard);

            const newColumn = { ...startColumn, cards: newCards };
            const newColumns = columns.map(col => col.id === newColumn.id ? newColumn : col);
            updateColumns(newColumns);
            return;
        }

        // Moving from one column to another
        const startCards = Array.from(startColumn.cards || []);
        const [movedCard] = startCards.splice(source.index, 1);

        // Update task status to match new column
        const updatedCard = { ...movedCard, status: finishColumn.title };

        const finishCards = Array.from(finishColumn.cards || []);
        finishCards.splice(destination.index, 0, updatedCard);

        const newColumns = columns.map(col => {
            if (col.id === startColumn.id) return { ...col, cards: startCards };
            if (col.id === finishColumn.id) return { ...col, cards: finishCards };
            return col;
        });

        updateColumns(newColumns);
    };

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex-1 overflow-x-auto overflow-y-hidden">
                <div className="h-full flex p-6 gap-6">
                    {columns.map(col => (<Column key={col.id} column={col} tasks={allTasks} allColumns={columns} onAdd={handleAddTask} onTaskClick={setEditingTask} onDelete={handleDeleteTask} onUpdateTask={handleUpdateTask} onMoveTask={handleMoveTask} onUpdateColumn={handleUpdateColumn} onEditColumn={setEditingColumn} />))}
                    <div className="w-40 flex-shrink-0"><button onClick={() => setEditingColumn({ isCreating: true })} className="w-full h-12 border-2 border-dashed border-white/10 rounded-xl flex items-center justify-center text-gray-500 hover:text-white hover:border-white/20 transition-all">+ Añadir Columna</button></div>
                </div>
                {creatingTaskColumn && (<CreateTaskModal columnTitle={creatingTaskColumn} onClose={() => setCreatingTaskColumn(null)} onSave={handleSaveTask} />)}
                {editingColumn && (<ColumnModal column={editingColumn.isCreating ? null : editingColumn} isCreating={editingColumn.isCreating} onClose={() => setEditingColumn(null)} onUpdate={(idOrData, data) => { if (editingColumn.isCreating) { const newCol = { id: Date.now().toString(), title: idOrData.title, color: idOrData.color, cardConfig: idOrData.cardConfig, cards: [] }; updateColumns([...columns, newCol]); } else { handleUpdateColumn(idOrData, data); } }} onDelete={(colId) => { updateColumns(columns.filter(c => c.id !== colId)); setEditingColumn(null); }} />)}
                {editingTask && (<TaskDetailModal key={editingTask.id} task={editingTask} columns={columns} onClose={() => setEditingTask(null)} onUpdate={(updated) => { handleUpdateTask(updated); setEditingTask(null); }} onDelete={(taskId) => { handleDeleteTask(taskId); setEditingTask(null); }} />)}
            </div>
        </DragDropContext>
    );
};

export default KanbanBoard;
