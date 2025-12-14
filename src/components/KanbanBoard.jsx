import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { calculateNextNotification } from '../utils/helpers';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import Column from './Column';
import CreateTaskModal from './modals/CreateTaskModal';
import ColumnModal from './modals/ColumnModal';
import TaskDetailModal from './modals/TaskDetailModal';
import ConfirmationModal from './modals/ConfirmationModal';

const KanbanBoard = ({ boardId, initialColumns, onColumnsChange }) => {
    const { currentUser } = useAuth();
    const [columns, setColumns] = useState(initialColumns);
    const [editingColumn, setEditingColumn] = useState(null);
    const [editingTask, setEditingTask] = useState(null);
    const [creatingTaskColumn, setCreatingTaskColumn] = useState(null);
    const [taskToDelete, setTaskToDelete] = useState(null);

    useEffect(() => { setColumns(initialColumns); }, [initialColumns]);

    // Helper to update local state + notify parent (optimistic UI)
    const updateLocalColumns = (newColumns) => {
        setColumns(newColumns);
        onColumnsChange(newColumns);
    };

    const handleAddTask = (columnTitle) => { setCreatingTaskColumn(columnTitle); };

    const handleSaveTask = async (taskData) => {
        const targetColumn = columns.find(c => c.title === creatingTaskColumn);
        if (!targetColumn) return;

        // Prepare new task object
        const newTaskPayload = {
            column_id: targetColumn.id,
            title: taskData.title,
            description: taskData.description,
            position: (targetColumn.cards || []).length, // Append to end
            reminder_enabled: false,
            reminder_value: null,
            reminder_unit: 'minutes',
            next_notification_at: null
        };

        // Apply column defaults
        if (targetColumn.default_reminder_enabled) {
            const nextTime = calculateNextNotification(targetColumn.default_reminder_value, targetColumn.default_reminder_unit);
            newTaskPayload.next_notification_at = nextTime ? new Date(nextTime).toISOString() : null;
        }

        console.log("Creating new task with payload:", newTaskPayload);

        // DB Insert
        const { data: insertedTask, error } = await supabase
            .from('tasks')
            .insert([newTaskPayload])
            .select()
            .single();

        if (error) {
            console.error("Error creating task:", error);
            alert("Error creando tarea: " + error.message);
            return;
        }

        // Optimistic Update (Immediate - before comment DB)
        const newTaskForUI = {
            ...insertedTask,
            createdAt: insertedTask.created_at, // Map for UI compatibility
            comments: taskData.initialComment ? [{
                id: 'temp-' + Date.now(),
                text: taskData.initialComment,
                createdAt: new Date().toISOString(), // UI expects createdAt
                created_at: new Date().toISOString() // DB typical
            }] : []
        };

        const newColumns = columns.map(col => {
            if (col.id === targetColumn.id) {
                return { ...col, cards: [...(col.cards || []), newTaskForUI] };
            }
            return col;
        });
        updateLocalColumns(newColumns);
        setCreatingTaskColumn(null);

        // Handle Comment in Background (Fire and Forget)
        if (taskData.initialComment) {
            // Use existing auth state or fetch if strictly needed (but we have currentUser in scope now)
            // Even better: use the ID we already have or just fetch without awaiting the result to block UI
            supabase
                .from('comments')
                .insert([{
                    task_id: insertedTask.id,
                    user_id: currentUser?.id || (await supabase.auth.getUser()).data.user.id,
                    text: taskData.initialComment
                }])
                .then(({ error }) => {
                    if (error) console.error("Error creating comment (background):", error);
                });
        }
    };

    const handleUpdateTask = async (updatedTask) => {
        // Optimistic Update
        const newColumns = columns.map(col => {
            const colCards = col.cards || [];
            const taskIndex = colCards.findIndex(t => t.id === updatedTask.id);
            // Move across columns logic handled in DragEnd, this is mostly for editing content in modal
            if (taskIndex > -1) {
                const newCards = [...colCards];
                newCards[taskIndex] = updatedTask;
                return { ...col, cards: newCards };
            }
            return col;
        });
        updateLocalColumns(newColumns);

        // DB Update
        // Extract fields that belong to 'tasks' table
        const { id, title, description, reminder_enabled, reminder_value, reminder_unit, next_notification_at, sort_option_id } = updatedTask;

        // If status changed (moved column via dropdown), handled separately usually, but let's support it if simple
        // ideally move logic is separate. Assuming same column for simple content update:
        const { error } = await supabase
            .from('tasks')
            .update({
                title, description, reminder_enabled, reminder_value, reminder_unit, next_notification_at, sort_option_id
            })
            .eq('id', id);

        if (error) console.error("Error updating task:", error);

        // Handle new comments if any (simple check: mostly comments added via separate handler in modal)
        // TaskDetailModal usually handles comment addition itself. 
    };

    const handleDeleteTask = (taskId) => {
        let task = null;
        for (const col of columns) {
            const t = col.cards?.find(card => card.id === taskId);
            if (t) { task = t; break; }
        }
        setTaskToDelete(task || { id: taskId, title: 'Tarea' });
    };

    const confirmDeleteTask = async () => {
        if (!taskToDelete) return;
        const taskId = taskToDelete.id;

        // Optimistic
        const newColumns = columns.map(col => ({ ...col, cards: (col.cards || []).filter(t => t.id !== taskId) }));
        updateLocalColumns(newColumns);
        setTaskToDelete(null);
        if (editingTask?.id === taskId) setEditingTask(null);

        // DB
        const { error } = await supabase.from('tasks').delete().eq('id', taskId);
        if (error) console.error("Error deleting task:", error);
    };

    // Columns
    const handleUpdateColumn = async (colId, updates) => {
        // Optimistic
        const newColumns = columns.map(c => c.id === colId ? { ...c, ...updates } : c);
        updateLocalColumns(newColumns);

        // DB
        // Separate 'cardConfig' or other JSON fields if needed
        const { title, color, cardConfig, default_reminder_enabled, default_reminder_value, default_reminder_unit, allow_card_overrides } = updates;

        const payload = { title, color };
        if (cardConfig) payload.card_config = cardConfig;
        if (default_reminder_enabled !== undefined) payload.default_reminder_enabled = default_reminder_enabled;
        if (default_reminder_value !== undefined) payload.default_reminder_value = default_reminder_value;
        if (default_reminder_unit !== undefined) payload.default_reminder_unit = default_reminder_unit;
        if (allow_card_overrides !== undefined) payload.allow_card_overrides = allow_card_overrides;

        const { error } = await supabase
            .from('columns')
            .update(payload)
            .eq('id', colId);

        if (error) console.error("Error updating column:", error);
    };

    const onDragEnd = async (result) => {
        const { destination, source, type } = result;
        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        // COLUMN REORDERING
        if (type === 'column') {
            const newColumns = Array.from(columns);
            const [movedColumn] = newColumns.splice(source.index, 1);
            newColumns.splice(destination.index, 0, movedColumn);
            updateLocalColumns(newColumns);

            // DB Update: Loop and update positions
            for (let i = 0; i < newColumns.length; i++) {
                if (newColumns[i].position !== i) {
                    await supabase.from('columns').update({ position: i }).eq('id', newColumns[i].id);
                }
            }
            return;
        }

        // TASK REORDERING
        // Note: droppableIds are strings now, verify conversion
        // TASK REORDERING
        const startColumn = columns.find(col => 'col-' + col.id.toString() === source.droppableId);
        const finishColumn = columns.find(col => 'col-' + col.id.toString() === destination.droppableId);

        if (!startColumn || !finishColumn) return;

        // Same Column
        if (startColumn === finishColumn) {
            const newCards = Array.from(startColumn.cards || []);
            const [movedCard] = newCards.splice(source.index, 1);
            newCards.splice(destination.index, 0, movedCard);

            const newColumn = { ...startColumn, cards: newCards };
            const newColumns = columns.map(col => col.id === newColumn.id ? newColumn : col);
            updateLocalColumns(newColumns);

            // DB Update Positions
            // Update the moved card and any cards that shifted
            for (let i = 0; i < newCards.length; i++) {
                if (newCards[i].position !== i) {
                    await supabase.from('tasks').update({ position: i }).eq('id', newCards[i].id);
                }
            }
            return;
        }

        // Moving to Different Column
        const startCards = Array.from(startColumn.cards || []);
        const [movedCard] = startCards.splice(source.index, 1);

        // Update local object for optimistic UI
        let updatedCard = { ...movedCard, status: finishColumn.title, column_id: finishColumn.id };

        // Recalculate notification logic
        if (!updatedCard.reminder_enabled && finishColumn.default_reminder_enabled) {
            updatedCard.next_notification_at = calculateNextNotification(finishColumn.default_reminder_value, finishColumn.default_reminder_unit);
        } else if (!updatedCard.reminder_enabled && !finishColumn.default_reminder_enabled) {
            updatedCard.next_notification_at = null;
        }

        const finishCards = Array.from(finishColumn.cards || []);
        finishCards.splice(destination.index, 0, updatedCard);

        const newColumns = columns.map(col => {
            if (col.id === startColumn.id) return { ...col, cards: startCards };
            if (col.id === finishColumn.id) return { ...col, cards: finishCards };
            return col;
        });
        updateLocalColumns(newColumns);

        // DB Update
        // 1. Move the card
        await supabase.from('tasks').update({
            column_id: finishColumn.id,
            position: destination.index,
            next_notification_at: updatedCard.next_notification_at
        }).eq('id', movedCard.id);

        // 2. Re-index finish column
        for (let i = 0; i < finishCards.length; i++) {
            // Skip the moved card since we just updated it, unless we want to ensure position is perfect (safer to update all)
            // But wait, the moved card update above sets it to `destination.index`.
            // If we just loop others, we might miss if things shifted.
            // Safest is to loop ALL in destination.
            if (finishCards[i].id !== movedCard.id) {
                await supabase.from('tasks').update({ position: i }).eq('id', finishCards[i].id);
            }
        }

        // 3. Re-index start column
        for (let i = 0; i < startCards.length; i++) {
            await supabase.from('tasks').update({ position: i }).eq('id', startCards[i].id);
        }
    };

    // Add handler for creating columns from the board
    const handleCreateColumn = async (title, color, cardConfig) => {
        const position = columns.length;
        const { data, error } = await supabase.from('columns').insert([{
            board_id: boardId,
            title,
            color,
            card_config: cardConfig,
            position
        }]).select().single();

        if (error) {
            console.error(error);
            return;
        }

        updateLocalColumns([...columns, { ...data, cards: [], cardConfig: data.card_config }]);
    };

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="all-columns" direction="horizontal" type="column">
                {(provided) => (
                    <div
                        className="flex-1 overflow-x-auto overflow-y-hidden"
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                    >
                        <div className="h-full flex p-6 gap-6" style={{ minWidth: 'max-content' }}>
                            {columns.map((col, index) => (
                                <Draggable key={col.id} draggableId={'col-' + col.id.toString()} index={index}>
                                    {(provided, snapshot) => (
                                        <Column
                                            column={col}
                                            tasks={col.cards || [] /* Use col.cards directly, simpler than flattening allTasks */}
                                            allColumns={columns}
                                            onAdd={handleAddTask}
                                            onTaskClick={setEditingTask}
                                            onDelete={handleDeleteTask}
                                            onUpdateTask={handleUpdateTask}
                                            // Handle special "Move" actions from dropdown
                                            onMoveTask={(task, action, sortId) => {
                                                // Simplified: update sortOptionId locally + DB
                                                handleUpdateTask({ ...task, sortOptionId: sortId });
                                            }}
                                            onUpdateColumn={handleUpdateColumn}
                                            onEditColumn={setEditingColumn}
                                            provided={provided}
                                            snapshot={snapshot}
                                        />
                                    )}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                            <div className="w-40 flex-shrink-0">
                                <button
                                    onClick={() => setEditingColumn({ isCreating: true })}
                                    className="w-full h-12 border-2 border-dashed border-white/10 rounded-xl flex items-center justify-center text-gray-500 hover:text-white hover:border-white/20 transition-all"
                                >
                                    + Añadir Columna
                                </button>
                            </div>
                        </div>
                        {creatingTaskColumn && (<CreateTaskModal columnTitle={creatingTaskColumn} onClose={() => setCreatingTaskColumn(null)} onSave={handleSaveTask} />)}
                        {editingColumn && (<ColumnModal column={editingColumn.isCreating ? null : editingColumn} isCreating={editingColumn.isCreating} onClose={() => setEditingColumn(null)} onUpdate={(idOrData, data) => {
                            if (editingColumn.isCreating) {
                                handleCreateColumn(idOrData.title, idOrData.color, idOrData.cardConfig);
                            } else {
                                handleUpdateColumn(idOrData, data);
                            }
                        }} onDelete={(colId) => {
                            updateLocalColumns(columns.filter(c => c.id !== colId));
                            supabase.from('columns').delete().eq('id', colId).then(e => { if (e.error) console.error(e.error) });
                        }} />)}
                        {editingTask && (<TaskDetailModal key={editingTask.id} task={editingTask} columns={columns} onClose={() => setEditingTask(null)} onUpdate={(updated) => { handleUpdateTask(updated); setEditingTask(null); }} onDelete={(taskId) => { handleDeleteTask(taskId); /* Close modal if open? it stays open until confirmed? logic handles it */ }} />)}

                        <ConfirmationModal
                            isOpen={!!taskToDelete}
                            onClose={() => setTaskToDelete(null)}
                            onConfirm={confirmDeleteTask}
                            title="¿Eliminar tarea?"
                            message={`Se eliminará la tarea "${taskToDelete?.title}" permanentemente.`}
                            confirmText="Sí, Eliminar"
                        />
                    </div>
                )}
            </Droppable>
        </DragDropContext>
    );
};

export default KanbanBoard;
