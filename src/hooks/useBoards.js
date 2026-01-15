import { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';
import logger from '../utils/logger';
import { calculateNextNotification } from '../utils/helpers';

/**
 * useBoards - Custom hook for board management
 * 
 * Handles all board-related state and operations including:
 * - Fetching and caching boards from Supabase
 * - CRUD operations (create, update, delete, reorder)
 * - Task creation within boards
 * - Active board persistence
 * 
 * @param {Object} currentUser - The authenticated user object
 * @param {Object} currentWorkspace - The current workspace object
 * @param {boolean} workspaceLoading - Whether workspace is still loading
 * @returns {Object} Board state and handlers
 */
export function useBoards(currentUser, currentWorkspace, workspaceLoading) {
    // =========================================================================
    // STATE
    // =========================================================================
    const [boards, setBoards] = useState([]);
    const [activeBoardId, setActiveBoardId] = useState(null);
    const [boardToDelete, setBoardToDelete] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Derived state: active board object
    const activeBoard = useMemo(() =>
        boards.find(b => b.id === activeBoardId) || boards[0],
        [boards, activeBoardId]
    );

    // =========================================================================
    // DATA FETCHING
    // =========================================================================

    /**
     * Fetch all boards for the current user with nested columns, tasks, and comments
     */
    const fetchBoards = useCallback(async () => {
        if (!currentUser) {
            setBoards([]);
            setActiveBoardId(null);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        logger.debug('useBoards', 'Fetching boards for user:', currentUser.id);

        try {
            let { data: userBoards, error } = await supabase
                .from('boards')
                .select(`
                    *,
                    columns (
                        *,
                        cards:tasks (
                            *,
                            comments (*)
                        )
                    )
                `)
                .eq('user_id', currentUser.id)
                .order('order', { ascending: true, nullsFirst: false })
                .order('created_at', { ascending: true });

            if (error) {
                logger.error('useBoards', 'Error fetching boards:', error);
                throw error;
            }

            // Transform and sort nested data
            if (userBoards) {
                userBoards = userBoards.map(board => ({
                    ...board,
                    columnWidth: board.column_width,
                    columns: (board.columns || [])
                        .sort((a, b) => (a.position || 0) - (b.position || 0))
                        .map(col => ({
                            ...col,
                            isCollapsed: col.is_collapsed,
                            cards: (col.cards || [])
                                .sort((a, b) => a.position - b.position)
                                .map(task => ({
                                    ...task,
                                    createdAt: task.created_at,
                                    comments: (task.comments || [])
                                        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
                                }))
                        }))
                }));
            }

            if (!userBoards || userBoards.length === 0) {
                logger.info('useBoards', 'No boards found. Creating default board...');
                await handleCreateBoard('Mi Primer Tablero');
            } else {
                setBoards(userBoards);

                // Restore saved active board preference
                const savedActive = localStorage.getItem(`kanban-active-board-${currentUser.id}`);
                if (savedActive && userBoards.find(b => b.id.toString() === savedActive)) {
                    setActiveBoardId(savedActive);
                } else {
                    setActiveBoardId(userBoards[0].id);
                }
            }
        } catch (error) {
            logger.error('useBoards', 'Failed to fetch boards:', error);
            toast.error('Error al cargar tableros');
        } finally {
            setIsLoading(false);
        }
    }, [currentUser]);

    // Fetch boards when user or workspace changes
    useEffect(() => {
        if (workspaceLoading) return;
        fetchBoards();
    }, [currentUser, workspaceLoading, fetchBoards]);

    // Persist active board preference
    useEffect(() => {
        if (currentUser && activeBoardId) {
            localStorage.setItem(`kanban-active-board-${currentUser.id}`, activeBoardId);
        }
    }, [activeBoardId, currentUser]);

    // =========================================================================
    // BOARD CRUD OPERATIONS
    // =========================================================================

    /**
     * Create a new board with default columns
     */
    const handleCreateBoard = useCallback(async (title) => {
        if (!currentUser) return null;

        try {
            // 1. Create board linked to workspace
            const { data: boardData, error: boardError } = await supabase
                .from('boards')
                .insert([{
                    title,
                    user_id: currentUser.id,
                    column_width: 365,
                    workspace_id: currentWorkspace?.id
                }])
                .select()
                .single();

            if (boardError) throw boardError;

            // 2. Create default columns
            const defaultColumns = [
                { board_id: boardData.id, title: 'Por Hacer', color: 'indigo', position: 0 },
                { board_id: boardData.id, title: 'En Progreso', color: 'amber', position: 1 },
                { board_id: boardData.id, title: 'Completado', color: 'emerald', position: 2 }
            ];

            const { data: insertedColumns, error: colError } = await supabase
                .from('columns')
                .insert(defaultColumns)
                .select();

            if (colError) {
                logger.error('useBoards', 'Error creating default columns:', colError);
            }

            // 3. Update local state
            const newBoard = {
                ...boardData,
                columnWidth: boardData.column_width,
                columns: (insertedColumns || []).map(col => ({ ...col, cards: [] }))
            };

            setBoards(prev => [...prev, newBoard]);
            setActiveBoardId(newBoard.id);
            toast.success(`Tablero "${title}" creado`);

            return newBoard;
        } catch (error) {
            logger.error('useBoards', 'Error creating board:', error);
            toast.error('Error al crear el tablero');
            return null;
        }
    }, [currentUser, currentWorkspace]);

    /**
     * Update board settings (title, column width, etc.)
     */
    const handleUpdateBoardSettings = useCallback(async (boardId, updates) => {
        // Optimistic update with UI field names
        setBoards(prev => prev.map(b => b.id === boardId ? { ...b, ...updates } : b));

        // Map UI field names to DB field names
        const dbUpdates = { ...updates };
        if (dbUpdates.columnWidth !== undefined) {
            dbUpdates.column_width = dbUpdates.columnWidth;
            delete dbUpdates.columnWidth;
        }

        const { error } = await supabase
            .from('boards')
            .update(dbUpdates)
            .eq('id', boardId);

        if (error) {
            logger.error('useBoards', 'Error updating board:', error);
            toast.error('Error al actualizar tablero');
        }
    }, []);

    /**
     * Update the currently active board
     */
    const updateActiveBoard = useCallback((newBoardData) => {
        if (!activeBoard) return;
        setBoards(prev => prev.map(b => b.id === activeBoard.id ? { ...b, ...newBoardData } : b));
    }, [activeBoard]);

    /**
     * Reorder boards (from drag and drop)
     */
    const handleReorderBoards = useCallback(async (reorderedBoards) => {
        // Optimistic update with new order
        const boardsWithOrder = reorderedBoards.map((b, idx) => ({ ...b, order: idx }));
        setBoards(boardsWithOrder);

        // Persist to DB
        try {
            for (const [idx, board] of reorderedBoards.entries()) {
                await supabase.from('boards').update({ order: idx }).eq('id', board.id);
            }
        } catch (error) {
            logger.error('useBoards', 'Error reordering boards:', error);
        }
    }, []);

    /**
     * Initiate board deletion (shows confirmation)
     */
    const handleDeleteBoard = useCallback((boardId) => {
        if (boards.length === 1) {
            toast.error('No puedes eliminar el último tablero');
            return;
        }
        setBoardToDelete(boards.find(b => b.id === boardId));
    }, [boards]);

    /**
     * Cancel board deletion
     */
    const cancelDeleteBoard = useCallback(() => {
        setBoardToDelete(null);
    }, []);

    /**
     * Confirm and execute board deletion with cascade
     */
    const confirmDeleteBoard = useCallback(async () => {
        if (!boardToDelete) return;

        const boardId = boardToDelete.id;
        const boardTitle = boardToDelete.title;

        // Store original state for rollback
        const originalBoards = boards;
        const originalActiveBoardId = activeBoardId;

        // Optimistic update
        const newBoards = boards.filter(b => b.id !== boardId);
        setBoards(newBoards);
        if (activeBoardId === boardId) {
            setActiveBoardId(newBoards[0]?.id);
        }
        setBoardToDelete(null);

        try {
            // 1. Delete activity logs referencing this board
            const { error: activityError } = await supabase
                .from('activity_logs')
                .delete()
                .eq('board_id', boardId);

            if (activityError) {
                throw new Error(`Error eliminando logs de actividad: ${activityError.message}`);
            }

            // 2. Get all columns for this board
            const { data: columns } = await supabase
                .from('columns')
                .select('id')
                .eq('board_id', boardId);

            if (columns && columns.length > 0) {
                const columnIds = columns.map(c => c.id);

                // 3. Get tasks to delete their comments
                const { data: tasks } = await supabase
                    .from('tasks')
                    .select('id')
                    .in('column_id', columnIds);

                if (tasks && tasks.length > 0) {
                    const taskIds = tasks.map(t => t.id);
                    await supabase.from('comments').delete().in('task_id', taskIds);
                }

                // 4. Delete tasks
                await supabase.from('tasks').delete().in('column_id', columnIds);

                // 5. Delete columns
                await supabase.from('columns').delete().eq('board_id', boardId);
            }

            // 6. Delete the board
            const { error: boardError } = await supabase
                .from('boards')
                .delete()
                .eq('id', boardId);

            if (boardError) {
                throw new Error(`Error eliminando tablero: ${boardError.message}`);
            }

            toast.success(`Tablero "${boardTitle}" eliminado`);
        } catch (error) {
            logger.error('useBoards', 'Error deleting board:', error);
            // Rollback
            setBoards(originalBoards);
            setActiveBoardId(originalActiveBoardId);
            toast.error(error.message || 'Error al eliminar tablero');
        }
    }, [boardToDelete, boards, activeBoardId]);

    // =========================================================================
    // TASK OPERATIONS
    // =========================================================================

    /**
     * Create a task in a specific board and column
     * Shared logic for voice input and global task modal
     */
    const createTaskInColumn = useCallback(async (targetBoard, targetColumn, taskData) => {
        const { title, description, initialComment, checklist } = taskData;

        // Build new task object
        const newTask = {
            id: Date.now(),
            title,
            description: description || "",
            createdAt: new Date().toISOString(),
            comments: initialComment ? [{
                id: Date.now(),
                text: initialComment,
                createdAt: new Date().toISOString()
            }] : [],
            reminder_enabled: false,
            reminder_value: null,
            reminder_unit: 'minutes',
            next_notification_at: null,
            checklist: checklist || []
        };

        // Apply column defaults
        if (targetColumn.default_reminder_enabled) {
            newTask.next_notification_at = calculateNextNotification(
                targetColumn.default_reminder_value,
                targetColumn.default_reminder_unit
            );
        }

        // Optimistic update
        setBoards(prevBoards => prevBoards.map(b => {
            if (b.id === targetBoard.id) {
                const newColumns = b.columns.map(col => {
                    if (col.id === targetColumn.id) {
                        return { ...col, cards: [...(col.cards || []), newTask] };
                    }
                    return col;
                });
                return { ...b, columns: newColumns };
            }
            return b;
        }));

        // Persist to Supabase
        const { data: insertedTask, error } = await supabase.from('tasks').insert([{
            column_id: targetColumn.id,
            title: newTask.title,
            description: newTask.description,
            position: (targetColumn.cards || []).length,
            next_notification_at: newTask.next_notification_at
                ? new Date(newTask.next_notification_at).toISOString()
                : null,
            checklist: newTask.checklist
        }]).select().single();

        // Add comment if provided
        if (!error && initialComment && insertedTask) {
            await supabase.from('comments').insert([{
                task_id: insertedTask.id,
                user_id: currentUser?.id,
                text: initialComment
            }]);
        }

        // Switch board if different from active
        if (targetBoard.id !== activeBoardId) {
            setActiveBoardId(targetBoard.id);
        }

        // Notify user
        if (!error) {
            toast.success(`Tarea "${title}" creada`);
        } else {
            toast.error('Error al crear la tarea');
            logger.error('useBoards', 'Error creating task:', error);
        }

        return insertedTask;
    }, [currentUser, activeBoardId]);

    /**
     * Handle global task save (from CreateTaskModal)
     */
    const handleGlobalTaskSave = useCallback(async (taskData) => {
        const { targetBoardId, targetColumnId } = taskData;

        const targetBoard = boards.find(b => b.id == targetBoardId);
        const targetColumn = targetBoard?.columns.find(c => c.id == targetColumnId);

        if (!targetBoard || !targetColumn) {
            logger.error('useBoards', 'Target board or column not found');
            toast.error('Error: Tablero o columna no encontrados');
            return null;
        }

        return await createTaskInColumn(targetBoard, targetColumn, taskData);
    }, [boards, createTaskInColumn]);

    // =========================================================================
    // RETURN PUBLIC API
    // =========================================================================
    return {
        // State
        boards,
        setBoards,
        activeBoardId,
        setActiveBoardId,
        activeBoard,
        boardToDelete,
        isLoading,

        // Board operations
        handleCreateBoard,
        handleUpdateBoardSettings,
        handleEditBoard: handleUpdateBoardSettings, // Alias
        updateActiveBoard,
        handleReorderBoards,
        handleDeleteBoard,
        cancelDeleteBoard,
        confirmDeleteBoard,

        // Task operations
        createTaskInColumn,
        handleGlobalTaskSave,

        // Refresh
        refreshBoards: fetchBoards
    };
}

export default useBoards;
