import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { calculateNextNotification } from '../utils/helpers';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
    MeasuringStrategy, // Import MeasuringStrategy
} from '@dnd-kit/core';

import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { createPortal } from 'react-dom';

import Column from './Column';
import TaskDetailModal from './modals/TaskDetailModal';
import ConfirmationModal from './modals/ConfirmationModal';
import ColumnModal from './modals/ColumnModal';
import CreateTaskModal from './modals/CreateTaskModal';
import TaskCard from './TaskCard'; // Needed for Overlay

const sortCardsByDate = (cards) => {
    return [...cards].sort((a, b) => {
        const dateA = a.next_notification_at ? new Date(a.next_notification_at).getTime() : Number.MAX_SAFE_INTEGER;
        const dateB = b.next_notification_at ? new Date(b.next_notification_at).getTime() : Number.MAX_SAFE_INTEGER;
        if (dateA === dateB) return a.position - b.position;
        return dateA - dateB;
    });
};

const KanbanBoard = ({ boardId, initialColumns, onColumnsChange, initialTaskId }) => {
    const { currentUser } = useAuth();
    const [columns, setColumns] = useState(initialColumns);
    const columnsRef = useRef(columns); // Performance optimization: Ref for stable access during drag
    const lastReportedColumnsRef = useRef(null); // CRITICAL: To prevent echo-loops from parent updates
    useEffect(() => { columnsRef.current = columns; }, [columns]);

    const [editingColumn, setEditingColumn] = useState(null);
    const [editingTask, setEditingTask] = useState(null);
    const [creatingTaskColumn, setCreatingTaskColumn] = useState(null);
    const [taskToDelete, setTaskToDelete] = useState(null);
    const [activeDragItem, setActiveDragItem] = useState(null);
    const [activeDragType, setActiveDragType] = useState(null); // 'COLUMN' or 'TASK'
    const hasScrolledRef = useRef(false);

    // Configure drag sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        // CRITICAL: Only sync from props when BOARD CHANGES.
        // We ignore prop updates for the same board to prevent "Echo Loops" and "Stale Prop Reverts" during drag.
        // Local state is King while on the same board.
        setColumns(initialColumns);
        columnsRef.current = initialColumns;
        lastReportedColumnsRef.current = JSON.stringify(initialColumns);
    }, [boardId]); // ONLY triggers on board switch

    // Handle initial task navigation
    useEffect(() => {
        if (initialTaskId && columns.length > 0 && !hasScrolledRef.current) {
            const taskExists = columns.some(col => col.cards.some(c => c.id == initialTaskId));
            if (taskExists) {
                setTimeout(() => {
                    const taskElement = document.getElementById(`task-${initialTaskId}`);
                    if (taskElement) {
                        taskElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        taskElement.classList.add('ring-2', 'ring-indigo-500', 'ring-offset-2', 'ring-offset-[#0f172a]');
                        setTimeout(() => {
                            taskElement.classList.remove('ring-2', 'ring-indigo-500', 'ring-offset-2', 'ring-offset-[#0f172a]');
                        }, 2000);
                        hasScrolledRef.current = true;
                    }
                }, 500);
            }
        }
    }, [initialTaskId, columns]);

    const updateLocalColumns = useCallback((newColumns) => {
        const json = JSON.stringify(newColumns);
        // Save what we are about to report so we can ignore it when it comes back
        lastReportedColumnsRef.current = json;

        setColumns(newColumns);
        onColumnsChange(newColumns);
    }, [onColumnsChange]);

    // --- HELPER FUNCTIONS (No External Deps or Moved Up) ---

    // Helper functions moved outside or stabilized

    const findContainer = useCallback((id) => {
        const cols = columnsRef.current; // access stable ref
        if (cols.find(col => 'col-' + col.id === id)) return id;
        const column = cols.find(col => col.cards.find(t => 'task-' + t.id === id));
        return column ? 'col-' + column.id : null;
    }, []); // No dependencies needed!


    // --- CORE HANDLERS (Ordered by Dependency) ---

    const handleUpdateColumn = useCallback(async (colId, updates) => {
        const newColumns = columns.map(c => {
            if (c.id === colId) {
                const updated = { ...c, ...updates };
                if (updates.cardConfig) updated.card_config = updates.cardConfig;
                return updated;
            }
            return c;
        });
        updateLocalColumns(newColumns);

        const { title, color, cardConfig, default_reminder_enabled, default_reminder_value, default_reminder_unit, allow_card_overrides, isCollapsed } = updates;
        const payload = { title, color, card_config: cardConfig, default_reminder_enabled, default_reminder_value, default_reminder_unit, allow_card_overrides, is_collapsed: isCollapsed };
        Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

        await supabase.from('columns').update(payload).eq('id', colId);
    }, [columns, updateLocalColumns]);

    const applyCardOrder = useCallback(async (column, orderedCards, newCardConfig, forceSort) => {
        const updatedCards = orderedCards.map((card, index) => ({ ...card, position: index }));
        const hasChanged = updatedCards.some((c, i) => c.id !== column.cards[i].id);

        if (hasChanged) {
            const newColumns = columns.map(col => {
                if (col.id === column.id) return { ...col, cards: updatedCards, card_config: forceSort ? col.card_config : newCardConfig };
                return col;
            });
            updateLocalColumns(newColumns);
            for (const card of updatedCards) {
                if (card.position !== column.cards.find(c => c.id === card.id)?.position) {
                    await supabase.from('tasks').update({ position: card.position }).eq('id', card.id);
                }
            }
        }
    }, [columns, updateLocalColumns]);

    const handleToggleSort = useCallback(async (columnId, forceSort = false) => {
        const column = columns.find(c => c.id === columnId);
        if (!column) return;
        const currentConfig = column.cardConfig || column.card_config || {};
        const isCurrentlyEnabled = currentConfig.auto_sort === true;
        const newAutoSortState = forceSort ? isCurrentlyEnabled : !isCurrentlyEnabled;
        let newCardConfig = { ...currentConfig, auto_sort: newAutoSortState };

        if (newAutoSortState && !isCurrentlyEnabled && !forceSort) {
            newCardConfig.original_order = column.cards ? column.cards.map(c => c.id) : [];
        }

        let restoredCards = null;
        if (!newAutoSortState && isCurrentlyEnabled && !forceSort) {
            const originalOrder = currentConfig.original_order || [];
            if (originalOrder.length > 0 && column.cards) {
                restoredCards = [...column.cards].sort((a, b) => {
                    const indexA = originalOrder.indexOf(a.id);
                    const indexB = originalOrder.indexOf(b.id);
                    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                    if (indexA !== -1) return -1;
                    if (indexB !== -1) return 1;
                    return 0;
                });
                delete newCardConfig.original_order;
            }
        }

        if (!forceSort) handleUpdateColumn(column.id, { cardConfig: newCardConfig });

        if (newAutoSortState && column.cards) {
            applyCardOrder(column, sortCardsByDate(column.cards), newCardConfig, forceSort);
        } else if (restoredCards) {
            applyCardOrder(column, restoredCards, newCardConfig, forceSort);
        }
    }, [columns, handleUpdateColumn, applyCardOrder]);

    const handleAddTask = useCallback((columnTitle) => { setCreatingTaskColumn(columnTitle); }, []);

    const handleSaveTask = useCallback(async (taskData) => {
        const targetColumn = columns.find(c => c.title === creatingTaskColumn);
        if (!targetColumn) return;

        const isTopInsertion = targetColumn.card_config?.insertion_policy === 'top';
        const newTaskPayload = {
            column_id: targetColumn.id,
            title: taskData.title,
            description: taskData.description,
            position: isTopInsertion ? 0 : (targetColumn.cards || []).length,
            reminder_enabled: false,
            reminder_value: null,
            reminder_unit: 'minutes',
            next_notification_at: null,
            checklist: taskData.checklist || []
        };

        if (targetColumn.default_reminder_enabled) {
            const nextTime = calculateNextNotification(targetColumn.default_reminder_value, targetColumn.default_reminder_unit);
            newTaskPayload.next_notification_at = nextTime ? new Date(nextTime).toISOString() : null;
        }

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

        const newTaskForUI = {
            ...insertedTask,
            createdAt: insertedTask.created_at,
            comments: taskData.initialComment ? [{
                id: 'temp-' + Date.now(),
                text: taskData.initialComment,
                createdAt: new Date().toISOString(),
                created_at: new Date().toISOString()
            }] : []
        };

        const newColumns = columns.map(col => {
            if (col.id === targetColumn.id) {
                if (isTopInsertion) {
                    const shiftedCards = (col.cards || []).map(c => ({ ...c, position: c.position + 1 }));
                    return { ...col, cards: [newTaskForUI, ...shiftedCards] };
                }
                return { ...col, cards: [...(col.cards || []), newTaskForUI] };
            }
            return col;
        });
        updateLocalColumns(newColumns);
        setCreatingTaskColumn(null);

        if (isTopInsertion) {
            for (const card of (targetColumn.cards || [])) {
                await supabase.from('tasks').update({ position: card.position + 1 }).eq('id', card.id);
            }
        }

        if (taskData.initialComment) {
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

        if (targetColumn.card_config?.auto_sort) {
            setTimeout(() => handleToggleSort(targetColumn.id, true), 500);
        }
    }, [columns, creatingTaskColumn, currentUser, handleToggleSort, updateLocalColumns]);

    const handleUpdateTask = useCallback(async (updatedTask) => {
        let originalTask = null;
        for (const col of columns) {
            const t = col.cards?.find(card => card.id === updatedTask.id);
            if (t) { originalTask = t; break; }
        }

        const newColumns = columns.map(col => {
            const colCards = col.cards || [];
            const taskIndex = colCards.findIndex(t => t.id === updatedTask.id);
            if (taskIndex > -1) {
                const newCards = [...colCards];
                newCards[taskIndex] = updatedTask;
                return { ...col, cards: newCards };
            }
            return col;
        });
        updateLocalColumns(newColumns);

        if (originalTask) {
            const oldComments = originalTask.comments || [];
            const newComments = updatedTask.comments || [];

            const added = newComments.filter(nc => !oldComments.some(oc => oc.id === nc.id));
            added.forEach(async c => {
                const { data } = await supabase.from('comments').insert({ task_id: updatedTask.id, user_id: currentUser.id, text: c.text }).select().single();
                if (data) {
                    setEditingTask(prev => prev ? ({ ...prev, comments: (prev.comments || []).map(cc => cc.id === c.id ? { ...cc, id: data.id } : cc) }) : null);
                }
            });
            const deleted = oldComments.filter(oc => !newComments.some(nc => nc.id === oc.id));
            deleted.forEach(async c => await supabase.from('comments').delete().eq('id', c.id));
            const edited = newComments.filter(nc => { const old = oldComments.find(oc => oc.id === nc.id); return old && old.text !== nc.text; });
            edited.forEach(async c => await supabase.from('comments').update({ text: c.text }).eq('id', c.id));
        }

        const { id, title, description, reminder_enabled, reminder_value, reminder_unit, next_notification_at, sort_option_id, checklist } = updatedTask;
        await supabase.from('tasks').update({
            title, description, reminder_enabled, reminder_value, reminder_unit, next_notification_at, sort_option_id, checklist
        }).eq('id', id);
    }, [columns, currentUser, updateLocalColumns]);

    const handleMoveTask = useCallback((task, action, sortId) => {
        handleUpdateTask({ ...task, sortOptionId: sortId });
    }, [handleUpdateTask]);

    const handleDeleteTask = useCallback((taskId) => {
        let task = null;
        for (const col of columns) {
            const t = col.cards?.find(card => card.id === taskId);
            if (t) { task = t; break; }
        }
        setTaskToDelete(task || { id: taskId, title: 'Tarea' });
    }, [columns]);

    const confirmDeleteTask = useCallback(async () => {
        if (!taskToDelete) return;
        const taskId = taskToDelete.id;
        const newColumns = columns.map(col => ({ ...col, cards: (col.cards || []).filter(t => t.id !== taskId) }));
        updateLocalColumns(newColumns);
        setTaskToDelete(null);
        if (editingTask?.id === taskId) setEditingTask(null);
        await supabase.from('tasks').delete().eq('id', taskId);
    }, [taskToDelete, columns, editingTask, updateLocalColumns]);

    const handleCreateColumn = useCallback(async (title, color, cardConfig) => {
        const position = columns.length;
        const { data, error } = await supabase.from('columns').insert([{
            board_id: boardId, title, color, card_config: cardConfig, position
        }]).select().single();
        if (!error) {
            updateLocalColumns([...columns, { ...data, cards: [], cardConfig: data.card_config }]);
        }
    }, [boardId, columns, updateLocalColumns]);


    // --- DND HANDLERS (Depend on everything basically) ---

    const handleDragStart = useCallback((event) => {
        const { active } = event;
        const id = active.id;
        const cols = columnsRef.current;
        if (String(id).startsWith('col-')) {
            setActiveDragType('COLUMN');
            setActiveDragItem(cols.find(c => 'col-' + c.id === id));
        } else {
            setActiveDragType('TASK');
            for (const col of cols) {
                const task = col.cards.find(t => 'task-' + t.id === id);
                if (task) {
                    setActiveDragItem(task);
                    break;
                }
            }
        }
    }, []);

    const handleDragOver = useCallback((event) => {
        const { active, over } = event;
        const overId = over?.id;

        if (!overId || active.id === overId || activeDragType === 'COLUMN') return;

        const activeContainer = findContainer(active.id);
        const overContainer = findContainer(overId);

        if (!activeContainer || !overContainer || activeContainer === overContainer) return;

        setColumns((prev) => {
            const activeItems = prev.find(c => 'col-' + c.id === activeContainer)?.cards || [];
            const overItems = prev.find(c => 'col-' + c.id === overContainer)?.cards || [];

            if (overItems.some(t => 'task-' + t.id === active.id)) {
                return prev;
            }

            const activeIndex = activeItems.findIndex(t => 'task-' + t.id === active.id);
            const overIndex = overItems.findIndex(t => 'task-' + t.id === overId);

            let newIndex;
            // ... (Rest of logic is fine)
            if (overId === overContainer) {
                newIndex = overItems.length + 1;
            } else {
                const isBelowOverItem =
                    over &&
                    active.rect.current.translated &&
                    active.rect.current.translated.top >
                    over.rect.top + over.rect.height;

                const modifier = isBelowOverItem ? 1 : 0;
                newIndex = overIndex >= 0 ? overIndex + modifier : overItems.length + 1;
            }
            // ...

            return prev.map((c) => {
                if ('col-' + c.id === activeContainer) {
                    return { ...c, cards: activeItems.filter((t) => 'task-' + t.id !== active.id) };
                }
                if ('col-' + c.id === overContainer) {
                    const itemMoved = activeItems[activeIndex];
                    const newCards = [
                        ...overItems.slice(0, newIndex),
                        { ...itemMoved, column_id: c.id, status: c.title },
                        ...overItems.slice(newIndex, overItems.length)
                    ];
                    return { ...c, cards: newCards };
                }
                return c;
            });
        });
    }, [activeDragType, findContainer]);




    const handleDragEnd = useCallback(async (event) => {
        const { active, over } = event;
        setActiveDragItem(null);
        setActiveDragType(null);

        if (!over) return;

        // Use ref for latest state in async handler
        const cols = columnsRef.current;

        if (activeDragType === 'COLUMN') {
            if (active.id !== over.id) {
                const oldIndex = cols.findIndex(c => 'col-' + c.id === active.id);
                const newIndex = cols.findIndex(c => 'col-' + c.id === over.id);
                const newColumns = arrayMove(cols, oldIndex, newIndex);
                updateLocalColumns(newColumns);
                // DB Update
                for (let i = 0; i < newColumns.length; i++) {
                    if (newColumns[i].position !== i) {
                        await supabase.from('columns').update({ position: i }).eq('id', newColumns[i].id);
                    }
                }
            }
            return;
        }

        // Processing Task Drop
        const activeContainer = findContainer(active.id);
        const overContainer = findContainer(over.id);

        if (activeContainer && overContainer) {
            // Find cols from CURRENT state 'cols' (Ref)
            const activeCol = cols.find(c => 'col-' + c.id === activeContainer);
            const overCol = cols.find(c => 'col-' + c.id === overContainer);

            // Safety check
            if (!activeCol || !overCol) return;

            // Fetch final column from state
            let finalColumn = cols.find(c => c.cards.some(t => 'task-' + t.id === active.id));
            if (!finalColumn) return;

            const newCards = [...finalColumn.cards];

            if (activeContainer === overContainer) {
                // Internal reorder
                const oldIdx = cols.find(c => 'col-' + c.id === activeContainer).cards.findIndex(t => 'task-' + t.id === active.id);
                const newIdx = cols.find(c => 'col-' + c.id === overContainer).cards.findIndex(t => 'task-' + t.id === over.id);
                if (oldIdx !== newIdx) {
                    const sortedCards = arrayMove(newCards, oldIdx, newIdx);
                    // Update state
                    const newCols = cols.map(c => c.id === finalColumn.id ? { ...c, cards: sortedCards } : c);
                    updateLocalColumns(newCols);
                    // Update DB positions
                    for (let i = 0; i < sortedCards.length; i++) {
                        await supabase.from('tasks').update({ position: i }).eq('id', sortedCards[i].id);
                    }
                }
            } else {
                // Cross container logic (DB persistence of new state)
                const task = finalColumn.cards.find(t => 'task-' + t.id === active.id);
                let nextNotif = task.next_notification_at;
                if (!task.reminder_enabled && finalColumn.default_reminder_enabled) {
                    const nextTime = calculateNextNotification(finalColumn.default_reminder_value, finalColumn.default_reminder_unit);
                    nextNotif = nextTime ? new Date(nextTime).toISOString() : null;
                } else if (!task.reminder_enabled && !finalColumn.default_reminder_enabled) {
                    nextNotif = null;
                }

                await supabase.from('tasks').update({
                    column_id: finalColumn.id,
                    position: finalColumn.cards.findIndex(t => t.id === task.id),
                    next_notification_at: nextNotif
                }).eq('id', task.id);

                for (let i = 0; i < finalColumn.cards.length; i++) {
                    await supabase.from('tasks').update({ position: i }).eq('id', finalColumn.cards[i].id);
                }

                if (finalColumn.card_config?.auto_sort) {
                    handleToggleSort(finalColumn.id, true);
                }
            }
        }
    }, [activeDragType, findContainer, handleToggleSort, updateLocalColumns]);

    const columnIds = useMemo(() => columns.map((col) => 'col-' + col.id), [columns]);

    const dropAnimation = useMemo(() => ({
        sideEffects: defaultDropAnimationSideEffects({
            styles: {
                active: {
                    opacity: '0.5',
                },
            },
        }),
    }), []);

    const measuringConfig = useMemo(() => ({
        droppable: {
            strategy: MeasuringStrategy.WhileDragging,
        },
    }), []);


    // CUSTOM AUTO-SCROLL: Bypasses dnd-kit's buggy React 18 auto-scroll detection
    const scrollContainerRef = useRef(null);

    useEffect(() => {
        if (!activeDragItem || !scrollContainerRef.current) return;

        const container = scrollContainerRef.current;
        const scrollSpeed = 4; // FIXED: Always 4 pixels per frame (constant speed)
        const edgeThreshold = 100; // pixels from edge to trigger scroll
        let animationFrameId = null;

        const handleAutoScroll = (e) => {
            const rect = container.getBoundingClientRect();
            const mouseX = e.clientX;

            // Calculate distance from edges
            const distFromLeft = mouseX - rect.left;
            const distFromRight = rect.right - mouseX;

            let scrollAmount = 0;

            if (distFromLeft < edgeThreshold) {
                // Near left edge - scroll left at constant speed
                scrollAmount = -scrollSpeed;
            } else if (distFromRight < edgeThreshold) {
                // Near right edge - scroll right at constant speed
                scrollAmount = scrollSpeed;
            }

            if (scrollAmount !== 0) {
                container.scrollLeft += scrollAmount;
            }

            animationFrameId = requestAnimationFrame(() => handleAutoScroll(e));
        };

        const onMouseMove = (e) => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            handleAutoScroll(e);
        };

        document.addEventListener('mousemove', onMouseMove);

        return () => {
            document.removeEventListener('mousemove', onMouseMove);
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
        };
    }, [activeDragItem]);

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            measuring={measuringConfig}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            autoScroll={false}  // DISABLED: Using custom implementation above
        >
            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-x-auto overflow-y-hidden"
            >
                <div className="h-full flex p-6 gap-6" style={{ minWidth: 'max-content' }}>
                    <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
                        {columns.map((col) => (
                            <Column
                                key={col.id}
                                column={col}
                                tasks={col.cards || []}
                                // allColumns removed to prevent re-renders
                                onAdd={handleAddTask}
                                onTaskClick={setEditingTask}
                                onDelete={handleDeleteTask}
                                onUpdateTask={handleUpdateTask}
                                onSort={handleToggleSort}
                                onMoveTask={handleMoveTask}
                                onUpdateColumn={handleUpdateColumn}
                                onEditColumn={setEditingColumn}
                            />
                        ))}
                    </SortableContext>

                    <div className="w-40 flex-shrink-0">
                        <button
                            onClick={() => setEditingColumn({ isCreating: true })}
                            className="w-full h-12 border-2 border-dashed border-white/10 rounded-xl flex items-center justify-center text-gray-500 hover:text-white hover:border-white/20 transition-all"
                        >
                            + Añadir Columna
                        </button>
                    </div>
                </div>

                {createPortal(
                    <DragOverlay dropAnimation={dropAnimation}>
                        {activeDragItem && activeDragType === 'COLUMN' ? (
                            <Column
                                column={activeDragItem}
                                tasks={activeDragItem.cards || []}
                                allColumns={columns}
                                isOverlay
                            />
                        ) : activeDragItem && activeDragType === 'TASK' ? (
                            <TaskCard
                                task={activeDragItem}
                                index={0}
                                color={columns.find(c => c.id === activeDragItem.column_id)?.color || '#6366f1'}
                                isOverlay
                            />
                        ) : null}
                    </DragOverlay>,
                    document.body
                )}

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
        </DndContext>
    );
};

export default KanbanBoard;
