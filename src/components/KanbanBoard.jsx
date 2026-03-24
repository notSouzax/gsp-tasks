import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { calculateNextNotification } from '../utils/helpers';
import { AutomationEngine } from '../features/automations';
import {
    DndContext,
    closestCorners,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
    MeasuringStrategy,
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

// Custom collision algorithm: measures distance from the POINTER to each droppable's
// center, rather than from the dragged overlay's center (which is what closestCenter does).
//
// WHY this matters:
//   closestCenter uses the overlay's bounding-box center as the reference point.
//   If you grab a card near its bottom, the overlay's center is ~half-card-height
//   ABOVE the cursor. So the nearest card by center-distance is 1-2 cards above
//   where you're actually pointing → the drop shadow appears too high.
//
//   pointerToClosestCenter uses the raw pointer coordinates as the reference, so
//   the shadow always tracks the cursor intuitively. It still measures to card
//   CENTERS (not card edges), so transitions are stable: the winner only changes
//   when the pointer crosses the midpoint between two card centers, preventing
//   the rapid toggling / 2-card-skip that plagued pointerWithin.
//
// Keyboard fallback: if pointerCoordinates is null (keyboard navigation), we fall
// back to closestCenter so arrow-key sorting still works correctly.
function pointerToClosestCenter({ droppableContainers, droppableRects, pointerCoordinates, collisionRect }) {
    // Keyboard navigation has no pointer — fall back to overlay-center distance
    if (!pointerCoordinates) {
        return closestCenter({ droppableContainers, droppableRects, pointerCoordinates, collisionRect });
    }

    const { x: px, y: py } = pointerCoordinates;
    let minDist = Infinity;
    let winner = null;

    for (const container of droppableContainers) {
        const rect = droppableRects.get(container.id);
        if (!rect) continue;
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dist = Math.hypot(px - cx, py - cy);
        if (dist < minDist) {
            minDist = dist;
            winner = container;
        }
    }

    return winner
        ? [{ id: winner.id, data: { droppableContainer: winner, value: minDist } }]
        : [];
}

// Type-aware collision detection factory.
// Returns a NEW function each time dragType changes (null → 'TASK'/'COLUMN' on drag start).
// dnd-kit v6 with MeasuringStrategy.WhileDragging re-evaluates collisions after every
// DOM change. If the collision function is completely stable (useCallback([])), dnd-kit
// never gets the internal "reset" it needs between measurement cycles, causing an
// infinite measurement → render → measurement loop.
// By recreating this function when dragType changes (once per drag session), we give
// dnd-kit the prop-change signal it needs to flush its internal "over" tracking state.
const buildCollisionDetection = (dragType) => (args) => {
    const { droppableContainers, droppableRects, pointerCoordinates, collisionRect } = args;

    if (dragType === 'COLUMN') {
        const colContainers = droppableContainers.filter(c => String(c.id).startsWith('col-'));
        return closestCorners({ droppableContainers: colContainers, droppableRects, pointerCoordinates, collisionRect });
    }

    // TASK drag: column-scoped pointer collision
    //
    // Core insight: column containers (col-X) are also registered droppables and their
    // centers sit in the MIDDLE of the column. If we include them in the candidate pool,
    // the column center often wins over nearby task cards → over.id = 'col-X' → the
    // SortableContext can't find 'col-X' in taskIds → shadow freezes or jumps to a
    // wrong position.
    //
    // Solution: find which column the cursor is currently inside (by X-bounds), then
    // search ONLY the tasks in that column. This gives accurate vertical shadow tracking
    // with zero column-center interference. Column containers are only used as a fallback
    // for empty-column targets (no tasks to collide with).
    const taskContainers = droppableContainers.filter(c => !String(c.id).startsWith('col-'));
    const colContainers = droppableContainers.filter(c => String(c.id).startsWith('col-'));

    if (pointerCoordinates) {
        const px = pointerCoordinates.x;

        // Identify which column contains the cursor (by X bounds)
        const cursorCol = colContainers.find(col => {
            const rect = droppableRects.get(col.id);
            return rect && px >= rect.left && px <= rect.right;
        });

        if (cursorCol) {
            const colRect = droppableRects.get(cursorCol.id);
            if (!colRect) {
                // Rect disappeared mid-drag (rare timing edge case) — skip to fallback
                return pointerToClosestCenter({ droppableContainers: taskContainers, droppableRects, pointerCoordinates, collisionRect });
            }
            // Only tasks whose horizontal center falls within this column
            const tasksInCol = taskContainers.filter(t => {
                const rect = droppableRects.get(t.id);
                if (!rect) return false;
                const taskCenterX = (rect.left + rect.right) / 2;
                return taskCenterX >= colRect.left && taskCenterX <= colRect.right;
            });

            if (tasksInCol.length > 0) {
                // Non-empty column: find nearest task by pointer-to-center distance
                return pointerToClosestCenter({ droppableContainers: tasksInCol, droppableRects, pointerCoordinates, collisionRect });
            }
            // Empty column: return the column container so handleDragOver can append to it
            return [{ id: cursorCol.id, data: { droppableContainer: cursorCol, value: 0 } }];
        }
    }

    // Fallback: pointer outside all columns, or keyboard navigation (no pointerCoordinates)
    const taskHits = pointerToClosestCenter({ droppableContainers: taskContainers, droppableRects, pointerCoordinates, collisionRect });
    if (taskHits.length > 0) return taskHits;
    return closestCenter({ droppableContainers, droppableRects, pointerCoordinates, collisionRect });
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
    // Refs mirror the state above so that drag handlers always read the CURRENT value
    // without being recreated on every state change (which would give DndContext new
    // callback references mid-drag and cause erratic behavior).
    const activeDragTypeRef = useRef(null);
    const activeDragItemRef = useRef(null);
    const dragOriginContainerRef = useRef(null); // Tracks which column a task was in BEFORE handleDragOver moved it
    const hasScrolledRef = useRef(false);

    // Configure drag sensors
    // distance: 10 — require a slightly more deliberate movement before activating drag
    // (reduces accidental drags on click/tap)
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 10,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Re-created once when activeDragType changes (null → 'TASK'/'COLUMN' at drag start).
    // This single prop change gives dnd-kit the internal flush it needs when using
    // MeasuringStrategy.WhileDragging. After that, the function is stable for the
    // entire drag session. The handlers themselves read from activeDragTypeRef (not
    // from this memoized value) so they stay stable even across this one re-creation.
    const collisionDetection = useMemo(
        () => buildCollisionDetection(activeDragType),
        [activeDragType]
    );

    useEffect(() => {
        // CRITICAL: Only sync from props when BOARD CHANGES.
        // We ignore prop updates for the same board to prevent "Echo Loops" and "Stale Prop Reverts" during drag.
        // Local state is King while on the same board.
        setColumns(initialColumns);
        columnsRef.current = initialColumns;
        lastReportedColumnsRef.current = JSON.stringify(initialColumns);
    }, [boardId]); // ONLY triggers on board switch

    // Initialize AutomationEngine
    useEffect(() => {
        if (currentUser?.id) {
            AutomationEngine.initialize(currentUser.id);
        }
    }, [currentUser?.id]);

    // Listen for automation data changes and refresh
    useEffect(() => {
        const handleDataChange = async () => {
            // Refrescar columnas desde Supabase cuando una automatización cambie datos
            try {
                const { data: freshColumns } = await supabase
                    .from('columns')
                    .select(`
                        *,
                        cards:tasks(
                            *,
                            comments(*)
                        )
                    `)
                    .eq('board_id', boardId)
                    .order('position');

                if (freshColumns) {
                    setColumns(freshColumns);
                }
            } catch (error) {
                console.error('Error refrescando después de automatización:', error);
            }
        };

        AutomationEngine.on('dataChanged', handleDataChange);

        return () => {
            AutomationEngine.off('dataChanged', handleDataChange);
        };
    }, [boardId]);

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
            toast.error("Error creando tarea: " + error.message);
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

        // 🤖 AUTOMATION: Disparar trigger task.created
        AutomationEngine.trigger('task.created', {
            task: newTaskForUI,
            column: targetColumn,
            columns,
            userId: currentUser?.id
        });
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
            const item = cols.find(c => 'col-' + c.id === id);
            // Update refs FIRST (synchronous, immediate) so collision detection
            // and subsequent handleDragOver read the correct type right away.
            activeDragTypeRef.current = 'COLUMN';
            activeDragItemRef.current = item;
            dragOriginContainerRef.current = null;
            // State update is for the DragOverlay render only
            setActiveDragType('COLUMN');
            setActiveDragItem(item);
        } else {
            // Record the ORIGINAL container BEFORE any handleDragOver moves it
            const originContainer = cols.find(col => col.cards.find(t => 'task-' + t.id === id));
            dragOriginContainerRef.current = originContainer ? 'col-' + originContainer.id : null;

            let item = null;
            for (const col of cols) {
                const task = col.cards.find(t => 'task-' + t.id === id);
                if (task) { item = task; break; }
            }
            activeDragTypeRef.current = 'TASK';
            activeDragItemRef.current = item;
            setActiveDragType('TASK');
            setActiveDragItem(item);
        }
    }, []);

    const handleDragOver = useCallback((event) => {
        const { active, over } = event;
        const overId = over?.id;

        // Read from ref — not from state closure — so this handler doesn't need
        // activeDragType in its deps and is never recreated mid-drag.
        if (!overId || active.id === overId || activeDragTypeRef.current === 'COLUMN') return;

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
            if (overId === overContainer) {
                newIndex = overItems.length;
            } else {
                const isBelowOverItem =
                    over &&
                    active.rect.current.translated &&
                    active.rect.current.translated.top >
                    over.rect.top + over.rect.height;

                const modifier = isBelowOverItem ? 1 : 0;
                newIndex = overIndex >= 0 ? overIndex + modifier : overItems.length;
            }

            const newState = prev.map((c) => {
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

            // CRITICAL: Sync ref immediately so handleDragEnd reads the latest state.
            // Without this, React's batched rendering means columnsRef is stale
            // when handleDragEnd fires in the same event cycle.
            columnsRef.current = newState;

            return newState;
        });
    }, [findContainer]); // activeDragType removed — now read from ref




    const handleDragEnd = useCallback(async (event) => {
        const { active, over } = event;

        // Capture type from ref BEFORE clearing (ref is synchronous, state is async)
        const dragType = activeDragTypeRef.current;

        // Clear drag state immediately (ref + state)
        activeDragTypeRef.current = null;
        activeDragItemRef.current = null;
        setActiveDragItem(null);
        setActiveDragType(null);

        if (!over) return;

        // Use ref for latest state in async handler
        const cols = columnsRef.current;

        if (dragType === 'COLUMN') {
            if (active.id !== over.id) {
                const overId = over.id;
                const actualOverId = String(overId).startsWith('col-') ? overId : findContainer(overId);

                if (!actualOverId) return;

                const oldIndex = cols.findIndex(c => 'col-' + c.id === active.id);
                const newIndex = cols.findIndex(c => 'col-' + c.id === actualOverId);
                const newColumns = arrayMove(cols, oldIndex, newIndex);
                updateLocalColumns(newColumns);
                // DB Update in parallel
                await Promise.all(
                    newColumns
                        .filter((col, i) => col.position !== i)
                        .map((col) => {
                            const newPos = newColumns.indexOf(col);
                            return supabase.from('columns').update({ position: newPos }).eq('id', col.id);
                        })
                );
            }
            return;
        }

        // Processing Task Drop
        // Use the ORIGINAL container from dragStart (before handleDragOver moved it)
        // and the CURRENT container for the destination.
        const originalContainer = dragOriginContainerRef.current;
        const currentContainer = findContainer(active.id); // Where the task IS now (after handleDragOver)
        const overContainer = findContainer(over.id);

        // Reset origin ref
        dragOriginContainerRef.current = null;

        // Determine if this was a cross-column move by comparing the ORIGINAL
        // container (before handleDragOver) with the current destination.
        const wasCrossColumn = originalContainer && originalContainer !== currentContainer;


        if (currentContainer && overContainer) {
            const activeCol = cols.find(c => 'col-' + c.id === currentContainer);
            const overCol = cols.find(c => 'col-' + c.id === overContainer);

            // Safety check
            if (!activeCol || !overCol) return;

            if (!wasCrossColumn) {
                // Internal reorder within same column
                const col = cols.find(c => 'col-' + c.id === currentContainer);
                if (!col) return;
                const cards = [...col.cards];
                const oldIdx = cards.findIndex(t => 'task-' + t.id === active.id);

                // over.id can be either a task ID ('task-X') or the column ID ('col-X')
                // when the user drops into the empty area of the column.
                // If it's the column itself, move the card to the end.
                let newIdx = cards.findIndex(t => 'task-' + t.id === over.id);
                if (newIdx === -1 && String(over.id).startsWith('col-')) {
                    // Dropped on column area — append to end (if not already there)
                    newIdx = cards.length - 1;
                }

                if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
                    const sortedCards = arrayMove(cards, oldIdx, newIdx);
                    const newCols = cols.map(c => c.id === col.id ? { ...c, cards: sortedCards } : c);
                    updateLocalColumns(newCols);
                    // Update DB positions in parallel (best-effort — UI already updated optimistically)
                    const reorderResults = await Promise.allSettled(sortedCards.map((card, i) =>
                        supabase.from('tasks').update({ position: i }).eq('id', card.id)
                    ));
                    if (reorderResults.some(r => r.status === 'rejected' || r.value?.error)) {
                        console.warn('[DND] Some reorder positions failed to save');
                    }
                }
            } else {
                // Cross-column move: task was moved by handleDragOver, now persist to DB.
                // The task is currently in currentContainer (the destination).
                const targetColumn = cols.find(c => 'col-' + c.id === currentContainer);
                if (!targetColumn) return;

                // Find the task — it should be in targetColumn after handleDragOver moved it
                let task = targetColumn.cards.find(t => 'task-' + t.id === active.id);
                // Fallback: search all columns in case of timing edge case
                if (!task) {
                    for (const col of cols) {
                        task = col.cards.find(t => 'task-' + t.id === active.id);
                        if (task) break;
                    }
                }
                if (!task) return;

                // Calculate reminder for target column
                let nextNotif = task.next_notification_at;
                if (!task.reminder_enabled && targetColumn.default_reminder_enabled) {
                    const nextTime = calculateNextNotification(targetColumn.default_reminder_value, targetColumn.default_reminder_unit);
                    nextNotif = nextTime ? new Date(nextTime).toISOString() : null;
                } else if (!task.reminder_enabled && !targetColumn.default_reminder_enabled) {
                    nextNotif = null;
                }

                // Persist task to TARGET column
                const taskPosition = targetColumn.cards.findIndex(t => t.id === task.id);
                const { error: updateError } = await supabase.from('tasks').update({
                    column_id: targetColumn.id,
                    position: taskPosition >= 0 ? taskPosition : 0,
                    next_notification_at: nextNotif
                }).eq('id', task.id);

                if (updateError) {
                    console.error('[DND] Failed to persist cross-column move:', updateError);
                    toast.error('No se pudo guardar el movimiento. Recarga si el problema persiste.');
                    // Don't return — keep optimistic UI; positions will self-heal on next load
                }

                // Update all positions in target column in parallel (best-effort)
                const posResults = await Promise.allSettled(targetColumn.cards.map((card, i) =>
                    supabase.from('tasks').update({ position: i }).eq('id', card.id)
                ));
                const posErrors = posResults.filter(r => r.status === 'rejected' || r.value?.error);
                if (posErrors.length > 0) {
                    console.warn('[DND] Some position updates failed (non-critical):', posErrors.length);
                }

                if (targetColumn.card_config?.auto_sort) {
                    handleToggleSort(targetColumn.id, true);
                }

                // 🤖 AUTOMATION: Disparar triggers de movimiento
                const fromCol = cols.find(c => 'col-' + c.id === originalContainer);
                AutomationEngine.trigger('task.moved', {
                    task,
                    fromColumn: fromCol,
                    toColumn: targetColumn,
                    columns: cols,
                    userId: currentUser?.id
                });
                AutomationEngine.trigger('task.moved_to', {
                    task,
                    fromColumn: fromCol,
                    toColumn: targetColumn,
                    columns: cols,
                    userId: currentUser?.id
                });
                AutomationEngine.trigger('task.moved_from', {
                    task,
                    fromColumn: fromCol,
                    toColumn: targetColumn,
                    columns: cols,
                    userId: currentUser?.id
                });

                // Sync final state to parent (useBoards) so it reflects the cross-column move
                updateLocalColumns(columnsRef.current);
            }
        }
    }, [findContainer, handleToggleSort, updateLocalColumns, currentUser?.id]); // activeDragType removed — now read from ref

    // Called when drag is cancelled (ESC key, pointer lost, etc.)
    // Without this, activeDragItem/Type state would stay set and the DragOverlay
    // would remain visible indefinitely.
    const handleDragCancel = useCallback(() => {
        activeDragTypeRef.current = null;
        activeDragItemRef.current = null;
        dragOriginContainerRef.current = null;
        setActiveDragItem(null);
        setActiveDragType(null);
    }, []);

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


    // CUSTOM AUTO-SCROLL: Proportional speed — accelerates smoothly as the pointer
    // approaches the edge (0 px/frame at the threshold boundary → MAX_SPEED at edge).
    // This feels much more natural than a constant linear speed.
    const scrollContainerRef = useRef(null);
    const mousePositionRef = useRef({ x: 0, y: 0 });

    useEffect(() => {
        if (!activeDragItem || !scrollContainerRef.current) return;

        const container = scrollContainerRef.current;
        // Constant speed — no acceleration. The user perceives acceleration as
        // "going crazy"; a steady 3 px/frame (~180 px/s at 60 fps) is enough to
        // cross a column in ~1.5 s and feels controlled.
        const SCROLL_SPEED = 3;
        // Zone inside the container edge where scrolling activates.
        const EDGE_THRESHOLD = 150;
        // Allow cursor to travel this far PAST the container edge and still scroll.
        // Needed because when you grab a card near its center and drag left, the
        // card's visual extends past the edge before your cursor does, making it
        // feel like scroll stopped too early.
        const OUTER_BUFFER = 160;

        let animationFrameId = null;
        let cancelled = false; // Guard against stale loops if cleanup races RAF

        const handleMouseMove = (e) => {
            mousePositionRef.current = { x: e.clientX, y: e.clientY };
        };

        const scrollLoop = () => {
            if (cancelled) return; // Stale loop — exit without rescheduling

            const rect = container.getBoundingClientRect();
            const mouseX = mousePositionRef.current.x;
            const distFromLeft = mouseX - rect.left;
            const distFromRight = rect.right - mouseX;

            if (distFromLeft < EDGE_THRESHOLD && distFromLeft > -OUTER_BUFFER) {
                container.scrollLeft -= SCROLL_SPEED;
            } else if (distFromRight < EDGE_THRESHOLD && distFromRight > -OUTER_BUFFER) {
                container.scrollLeft += SCROLL_SPEED;
            }

            animationFrameId = requestAnimationFrame(scrollLoop);
        };

        document.addEventListener('mousemove', handleMouseMove);
        animationFrameId = requestAnimationFrame(scrollLoop);

        return () => {
            cancelled = true;
            document.removeEventListener('mousemove', handleMouseMove);
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
        };
    }, [activeDragItem]);

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={collisionDetection}
            measuring={measuringConfig}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
            autoScroll={false}  // DISABLED: Using custom implementation above
        >
            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-x-auto overflow-y-hidden scrollbar-hide"
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
                            className="w-full h-12 border-2 border-dashed border-[var(--border-default)] dark:border-white/10 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:text-indigo-600 dark:hover:text-white hover:border-indigo-500/30 dark:hover:border-white/20 transition-all"
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
