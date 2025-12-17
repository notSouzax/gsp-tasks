import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { calculateNextNotification } from '../utils/helpers';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import Column from './Column';
import CreateTaskModal from './modals/CreateTaskModal';
import ColumnModal from './modals/ColumnModal';
import TaskDetailModal from './modals/TaskDetailModal';
import ConfirmationModal from './modals/ConfirmationModal';

const KanbanBoard = ({ boardId, initialColumns, onColumnsChange, initialTaskId }) => {
    const { currentUser } = useAuth();
    const [columns, setColumns] = useState(initialColumns);
    const [editingColumn, setEditingColumn] = useState(null);
    const [editingTask, setEditingTask] = useState(null);
    const [creatingTaskColumn, setCreatingTaskColumn] = useState(null);
    const [taskToDelete, setTaskToDelete] = useState(null);

    // Refs for auto-scroll functionality
    const scrollContainerRef = useRef(null);
    const autoScrollIntervalRef = useRef(null);
    const mousePosRef = useRef({ x: 0, y: 0 });
    const isDraggingRef = useRef(false);

    // Set up persistent mouse tracking
    useEffect(() => {
        const trackMouse = (e) => {
            mousePosRef.current = { x: e.clientX, y: e.clientY };
        };
        window.addEventListener('mousemove', trackMouse);
        return () => window.removeEventListener('mousemove', trackMouse);
    }, []);

    useEffect(() => { setColumns(initialColumns); }, [initialColumns]);

    // Handle initial task navigation
    useEffect(() => {
        if (initialTaskId && columns.length > 0) {
            // Wait for DOM
            setTimeout(() => {
                const taskElement = document.getElementById(`task-${initialTaskId}`);
                if (taskElement) {
                    taskElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Visual highlight
                    taskElement.classList.add('ring-2', 'ring-indigo-500', 'ring-offset-2', 'ring-offset-[#0f172a]');
                    setTimeout(() => {
                        taskElement.classList.remove('ring-2', 'ring-indigo-500', 'ring-offset-2', 'ring-offset-[#0f172a]');
                    }, 2000);
                }
            }, 500);
        }
    }, [initialTaskId, columns]);

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
        const isTopInsertion = targetColumn.card_config?.insertion_policy === 'top';
        const newTaskPayload = {
            column_id: targetColumn.id,
            title: taskData.title,
            description: taskData.description,
            position: isTopInsertion ? 0 : (targetColumn.cards || []).length, // Top = 0, Bottom = length
            reminder_enabled: false,
            reminder_value: null,
            reminder_unit: 'minutes',
            next_notification_at: null,
            checklist: taskData.checklist || [] // Add checklist to payload
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
                if (isTopInsertion) {
                    // Prepend and shift others
                    const shiftedCards = (col.cards || []).map(c => ({ ...c, position: c.position + 1 }));
                    return { ...col, cards: [newTaskForUI, ...shiftedCards] };
                }
                return { ...col, cards: [...(col.cards || []), newTaskForUI] };
            }
            return col;
        });
        updateLocalColumns(newColumns);
        setCreatingTaskColumn(null);

        // Handle Shifting for Top Insertion DB Sync
        if (isTopInsertion) {
            // We need to increment position for all existing cards in this column
            // Best way is a stored procedure, but loop works for small lists.
            // Or update with a filter.
            const existingIds = (targetColumn.cards || []).map(c => c.id);
            // We can't do a simple increment update easily without raw SQL or a loop
            // Loop is safer for now.
            for (const card of (targetColumn.cards || [])) {
                await supabase.from('tasks').update({ position: card.position + 1 }).eq('id', card.id);
            }
        }

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

        // Auto-Sort if enabled (this overrides insertion policy if active)
        if (targetColumn.card_config?.auto_sort) {
            setTimeout(() => handleToggleSort(targetColumn.id, true), 500);
        }
    };

    const handleUpdateTask = async (updatedTask) => {
        // Find original task to detect comment changes
        let originalTask = null;
        for (const col of columns) {
            const t = col.cards?.find(card => card.id === updatedTask.id);
            if (t) { originalTask = t; break; }
        }

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

        // SYNC COMMENTS
        if (originalTask) {
            const oldComments = originalTask.comments || [];
            const newComments = updatedTask.comments || [];

            // ADDED
            const added = newComments.filter(nc => !oldComments.some(oc => oc.id === nc.id));
            added.forEach(async c => {
                const { data, error } = await supabase.from('comments').insert({
                    task_id: updatedTask.id,
                    user_id: currentUser.id,
                    text: c.text
                }).select().single();

                if (!error && data) {
                    // Update ID in local state (Columns) to replace temp ID with real ID
                    setColumns(prev => {
                        const newCols = prev.map(col => ({
                            ...col,
                            cards: (col.cards || []).map(Card => {
                                if (Card.id === updatedTask.id) {
                                    return {
                                        ...Card,
                                        comments: (Card.comments || []).map(comm => comm.id === c.id ? { ...comm, id: data.id, createdAt: data.created_at } : comm)
                                    };
                                }
                                return Card;
                            })
                        }));
                        setTimeout(() => onColumnsChange(newCols), 0); // Propagate to parent
                        return newCols;
                    });

                    // Update ID in Modal state (editingTask)
                    setEditingTask(prev => {
                        if (!prev || prev.id !== updatedTask.id) return prev;
                        return {
                            ...prev,
                            comments: (prev.comments || []).map(comm => comm.id === c.id ? { ...comm, id: data.id, createdAt: data.created_at } : comm)
                        };
                    });
                } else if (error) console.error("Error saving comment:", error);
            });

            // DELETED
            const deleted = oldComments.filter(oc => !newComments.some(nc => nc.id === oc.id));
            deleted.forEach(async c => {
                const { error } = await supabase.from('comments').delete().eq('id', c.id);
                if (error) console.error("Error deleting comment:", error);
            });

            // EDITED
            const edited = newComments.filter(nc => {
                const old = oldComments.find(oc => oc.id === nc.id);
                return old && old.text !== nc.text;
            });
            edited.forEach(async c => {
                const { error } = await supabase.from('comments').update({ text: c.text }).eq('id', c.id);
                if (error) console.error("Error updating comment:", error);
            });
        }

        // DB Update
        // Extract fields that belong to 'tasks' table
        const { id, title, description, reminder_enabled, reminder_value, reminder_unit, next_notification_at, sort_option_id, checklist } = updatedTask;

        // If status changed (moved column via dropdown), handled separately usually, but let's support it if simple
        // ideally move logic is separate. Assuming same column for simple content update:
        const { error } = await supabase
            .from('tasks')
            .update({
                title, description, reminder_enabled, reminder_value, reminder_unit, next_notification_at, sort_option_id, checklist
            })
            .eq('id', id);

        if (error) console.error("Error updating task:", error);
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
        const newColumns = columns.map(c => {
            if (c.id === colId) {
                const updated = { ...c, ...updates };
                // Sync cardConfig (camel) to card_config (snake) for consistency in local state
                if (updates.cardConfig) {
                    updated.card_config = updates.cardConfig;
                }
                return updated;
            }
            return c;
        });
        updateLocalColumns(newColumns);

        // DB
        // Separate 'cardConfig' or other JSON fields if needed
        const { title, color, cardConfig, default_reminder_enabled, default_reminder_value, default_reminder_unit, allow_card_overrides, isCollapsed } = updates;

        const payload = { title, color };
        if (cardConfig) payload.card_config = cardConfig;
        if (default_reminder_enabled !== undefined) payload.default_reminder_enabled = default_reminder_enabled;
        if (default_reminder_value !== undefined) payload.default_reminder_value = default_reminder_value;
        if (default_reminder_unit !== undefined) payload.default_reminder_unit = default_reminder_unit;
        if (allow_card_overrides !== undefined) payload.allow_card_overrides = allow_card_overrides;
        if (isCollapsed !== undefined) payload.is_collapsed = isCollapsed;

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

        // Auto-Sort Finish Column if Enabled
        if (finishColumn.card_config?.auto_sort) {
            handleToggleSort(finishColumn.id, true);
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

    const sortCardsByDate = (cards) => {
        return [...cards].sort((a, b) => {
            const dateA = a.next_notification_at ? new Date(a.next_notification_at).getTime() : Number.MAX_SAFE_INTEGER;
            const dateB = b.next_notification_at ? new Date(b.next_notification_at).getTime() : Number.MAX_SAFE_INTEGER;
            if (dateA === dateB) return a.position - b.position;
            return dateA - dateB;
        });
    };

    const handleToggleSort = async (columnId, forceSort = false) => {
        const column = columns.find(c => c.id === columnId);
        if (!column) return;

        const currentConfig = column.cardConfig || column.card_config || {};
        const isCurrentlyEnabled = currentConfig.auto_sort === true;
        const newAutoSortState = forceSort ? isCurrentlyEnabled : !isCurrentlyEnabled;

        let newCardConfig = { ...currentConfig, auto_sort: newAutoSortState };

        // 1. Enabling Sort: Save Snapshot
        if (newAutoSortState && !isCurrentlyEnabled && !forceSort) {
            const currentOrder = column.cards ? column.cards.map(c => c.id) : [];
            newCardConfig.original_order = currentOrder;
        }

        // 2. Disabling Sort: Restore Snapshot
        // But only if we are actually toggling it off (not forcing)
        let restoredCards = null;
        if (!newAutoSortState && isCurrentlyEnabled && !forceSort) {
            const originalOrder = currentConfig.original_order || [];
            if (originalOrder.length > 0 && column.cards) {
                restoredCards = [...column.cards].sort((a, b) => {
                    const indexA = originalOrder.indexOf(a.id);
                    const indexB = originalOrder.indexOf(b.id);
                    // If both present, sort by index
                    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                    // If one present, it comes first
                    if (indexA !== -1) return -1;
                    if (indexB !== -1) return 1;
                    // If neither, keep current relative order (or by ID/Creation)
                    return 0;
                });
                // Clear snapshot after restoring? Or keep it? Clearing is standard for "Revert"
                // But wait, if they toggle on/off multiple times without moving, we might want to keep?
                // Usually revert implies "back to how it was before I messed with it".
                // Let's keep it in case, or clear it. Clearing prevents stale data buildup.
                delete newCardConfig.original_order;
            }
        }

        if (!forceSort) {
            handleUpdateColumn(column.id, { cardConfig: newCardConfig });
        }

        // 3. Perform Sorting / Restoring
        if (newAutoSortState) {
            // Apply Priority Sort
            if (!column.cards || column.cards.length === 0) return;
            const sortedCards = sortCardsByDate(column.cards);
            applyCardOrder(column, sortedCards, newCardConfig, forceSort);

        } else if (restoredCards) {
            // Apply Restored Order
            applyCardOrder(column, restoredCards, newCardConfig, forceSort);
        }
    };

    const applyCardOrder = async (column, orderedCards, newCardConfig, forceSort) => {
        const updatedCards = orderedCards.map((card, index) => ({ ...card, position: index }));
        const hasChanged = updatedCards.some((c, i) => c.id !== column.cards[i].id);

        if (hasChanged) {
            const newColumns = columns.map(col => {
                if (col.id === column.id) {
                    return { ...col, cards: updatedCards, card_config: forceSort ? col.card_config : newCardConfig };
                }
                return col;
            });
            updateLocalColumns(newColumns);

            for (const card of updatedCards) {
                if (card.position !== column.cards.find(c => c.id === card.id)?.position) {
                    await supabase.from('tasks').update({ position: card.position }).eq('id', card.id);
                }
            }
        } else if (!forceSort) {
            // If local update didn't happen via handleUpdateColumn fast enough or we just changed config
            // handleUpdateColumn handles config logic, so we are good.
        }
    };










    const handleDragUpdate = (update) => {
        if (!scrollContainerRef.current || !isDraggingRef.current) return;

        const container = scrollContainerRef.current;
        const containerRect = container.getBoundingClientRect();
        const mouseX = mousePosRef.current.x;

        const threshold = 150;
        const scrollAmount = 40; // Increased for faster scroll

        const distanceFromRight = containerRect.right - mouseX;
        const distanceFromLeft = mouseX - containerRect.left;

        // Clear existing interval
        if (autoScrollIntervalRef.current) {
            clearInterval(autoScrollIntervalRef.current);
            autoScrollIntervalRef.current = null;
        }

        // Scroll right when near right edge
        if (distanceFromRight > 0 && distanceFromRight < threshold) {
            autoScrollIntervalRef.current = setInterval(() => {
                if (!scrollContainerRef.current || !isDraggingRef.current) {
                    clearInterval(autoScrollIntervalRef.current);
                    autoScrollIntervalRef.current = null;
                    return;
                }

                const container = scrollContainerRef.current;
                const maxScroll = container.scrollWidth - container.clientWidth;

                if (container.scrollLeft < maxScroll) {
                    container.scrollLeft = Math.min(container.scrollLeft + scrollAmount, maxScroll);
                } else {
                    clearInterval(autoScrollIntervalRef.current);
                    autoScrollIntervalRef.current = null;
                }
            }, 50); // Faster interval for smoother scroll
        }
        // Scroll left when near left edge
        else if (distanceFromLeft > 0 && distanceFromLeft < threshold) {
            autoScrollIntervalRef.current = setInterval(() => {
                if (!scrollContainerRef.current || !isDraggingRef.current) {
                    clearInterval(autoScrollIntervalRef.current);
                    autoScrollIntervalRef.current = null;
                    return;
                }

                const container = scrollContainerRef.current;

                if (container.scrollLeft > 0) {
                    container.scrollLeft = Math.max(container.scrollLeft - scrollAmount, 0);
                } else {
                    clearInterval(autoScrollIntervalRef.current);
                    autoScrollIntervalRef.current = null;
                }
            }, 50); // Faster interval for smoother scroll
        }
    };

    const handleDragStart = () => {
        isDraggingRef.current = true;
    };

    const handleDragEnd = (result) => {
        isDraggingRef.current = false;

        // Clear auto-scroll interval
        if (autoScrollIntervalRef.current) {
            clearInterval(autoScrollIntervalRef.current);
            autoScrollIntervalRef.current = null;
        }

        // Call existing onDragEnd logic
        onDragEnd(result);
    };

    // Cleanup auto-scroll on unmount
    useEffect(() => {
        return () => {
            if (autoScrollIntervalRef.current) {
                clearInterval(autoScrollIntervalRef.current);
            }
        };
    }, []);

    return (
        <DragDropContext
            onDragEnd={handleDragEnd}
            onDragUpdate={handleDragUpdate}
            onDragStart={handleDragStart}
        >
            <Droppable droppableId="all-columns" direction="horizontal" type="column">
                {(provided) => (
                    <div
                        className="flex-1 overflow-x-auto overflow-y-hidden"
                        ref={(el) => {
                            provided.innerRef(el);
                            scrollContainerRef.current = el;
                        }}
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
                                            onSort={handleToggleSort}
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
                        {creatingTaskColumn && (<CreateTaskModal columnTitle={creatingTaskColumn} targetColumn={columns.find(c => c.title === creatingTaskColumn)} onClose={() => setCreatingTaskColumn(null)} onSave={handleSaveTask} />)}
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
                        {editingTask && (<TaskDetailModal key={editingTask.id} task={editingTask} columns={columns} onClose={() => setEditingTask(null)} onUpdate={(updated, shouldClose = true) => { handleUpdateTask(updated); if (shouldClose) setEditingTask(null); else setEditingTask(updated); }} onDelete={(taskId) => { handleDeleteTask(taskId); }} />)}

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
