import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './lib/supabaseClient';
import Sidebar from './components/Sidebar';
import KanbanBoard from './components/KanbanBoard';

import { Icons } from './components/ui/Icons';
import CreateTaskModal from './components/modals/CreateTaskModal';
import { useVoiceInput } from './hooks/useVoiceInput';
import { parseTaskIntent, learnEntity, injectContext } from './utils/aiService';
import { calculateNextNotification } from './utils/helpers'; // Need this for default reminders
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProfileModal from './components/modals/ProfileModal';
import LoginModal from './components/modals/LoginModal';
import BoardSettingsModal from './components/modals/BoardSettingsModal';
import ConfirmationModal from './components/modals/ConfirmationModal';

const AppContent = () => {
  console.log("AppContent: STARTED RENDER");
  const { currentUser } = useAuth();
  const { settings } = useSettings();
  const [showProfile, setShowProfile] = useState(false);
  const [showBoardSettings, setShowBoardSettings] = useState(false);
  const [boards, setBoards] = useState([]);
  const [activeBoardId, setActiveBoardId] = useState(null);
  const [boardToDelete, setBoardToDelete] = useState(null);
  const [pendingVoiceTask, setPendingVoiceTask] = useState(null);

  // Voice Input Logic
  const { isRecording, transcript, startRecording, stopRecording, resetTranscript, isSupported } = useVoiceInput();
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);

  const activeBoard = boards.find(b => b.id == activeBoardId) || boards[0];

  // Process voice command when transcript updates and recording finishes
  // Note: Simple implementation - we'll watch for !isRecording and transcript presence
  // Process voice command when transcript updates and recording finishes
  const handleVoiceCommand = useCallback(async (text) => {
    if (!text || !activeBoard) return;

    setIsProcessingVoice(true);
    try {
      // 0. Inject Context (Learn current structure)
      injectContext(boards);

      // Parse the intent with full context (boards)
      const taskData = parseTaskIntent(text, boards, activeBoard.id);

      // CHECK VALIDATION
      if (taskData?.needsRepetition) {
        alert("No te he entendido bien. Por favor, repite la orden intentando separar claramente quién (Entidad) y qué (Acción).");
        return;
      }

      if (taskData) {
        const { title, boardId, columnId, description, comment } = taskData;

        // 1. Determine Target Board & Column
        let targetBoard = activeBoard;
        if (boardId && boardId !== activeBoard.id) {
          targetBoard = boards.find(b => b.id === boardId) || activeBoard;
        }

        const targetColumn = targetBoard.columns.find(c => c.id === columnId) || targetBoard.columns[0];

        // 2. STOP & CONFIRM (Don't create yet)
        setPendingVoiceTask({
          taskData: { title, description, initialComment: comment }, // UI format
          targetBoard,
          targetColumn
        });

        // 6. Learn the Entity! (We can do this now or after confirm, doing it now enables it for future)
        learnEntity(title);
      }
    } catch (error) {
      console.error("Error processing voice command:", error);
    } finally {
      setIsProcessingVoice(false);
      resetTranscript();
    }
  }, [activeBoard, boards, resetTranscript]);

  const finalizeVoiceTask = async (confirmedData) => {
    if (!pendingVoiceTask) return;
    const { targetBoard, targetColumn } = pendingVoiceTask;
    const { title, description, initialComment } = confirmedData;

    // Logic adapted from original handleVoiceCommand but using confirmed data
    const newTask = {
      id: Date.now(),
      title,
      description: description || "",
      createdAt: Date.now(),
      comments: initialComment ? [{ id: Date.now(), text: initialComment, createdAt: Date.now() }] : [],
      reminder_enabled: false,
      reminder_value: null,
      reminder_unit: 'minutes',
      next_notification_at: null
    };

    // Apply defaults
    if (targetColumn.default_reminder_enabled) {
      newTask.next_notification_at = calculateNextNotification(targetColumn.default_reminder_value, targetColumn.default_reminder_unit);
    }

    // Update State
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

    // Persist Task (and Comment) - simplified version of handleSaveTask
    // 1. Insert Task
    const { data: insertedTask, error } = await supabase.from('tasks').insert([{
      column_id: targetColumn.id,
      title: newTask.title,
      description: newTask.description,
      position: (targetColumn.cards || []).length,
      next_notification_at: newTask.next_notification_at ? new Date(newTask.next_notification_at).toISOString() : null
    }]).select().single();

    if (!error && initialComment) {
      await supabase.from('comments').insert([{
        task_id: insertedTask.id,
        user_id: currentUser.id,
        text: initialComment
      }]);
    }

    // Switch board if needed
    if (targetBoard.id !== activeBoardId) {
      setActiveBoardId(targetBoard.id);
    }

    setPendingVoiceTask(null);
  };

  // Process voice command when transcript updates and recording finishes
  // Note: Simple implementation - we'll watch for !isRecording and transcript presence
  useEffect(() => {
    if (!isRecording && transcript && !isProcessingVoice) {
      handleVoiceCommand(transcript);
    }
  }, [isRecording, transcript, isProcessingVoice, handleVoiceCommand]);

  const handleCreateBoard = useCallback(async (title) => {
    if (!currentUser) return;

    // 1. Create Board
    const { data: boardData, error: boardError } = await supabase
      .from('boards')
      .insert([{ title, user_id: currentUser.id, column_width: 365 }])
      .select()
      .single();

    if (boardError) {
      console.error("Error creating board:", boardError);
      return;
    }

    // 2. Create Default Columns
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
      console.error("Error creating default columns:", colError);
    }

    // 3. Update local state
    // Re-construct the new board with its columns and empty tasks
    const newBoard = {
      ...boardData,
      columns: (insertedColumns || []).map(col => ({ ...col, cards: [] }))
    };

    setBoards(prev => [...prev, newBoard]);
    setActiveBoardId(newBoard.id);
  }, [currentUser]);

  // Supabase Data Logic
  useEffect(() => {
    if (!currentUser) {
      setBoards([]);
      setActiveBoardId(null);
      return;
    }

    const fetchBoards = async () => {
      console.log("Fetching boards for user:", currentUser.id);
      // 1. Fetch user's boards
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
        .order('created_at', { ascending: true });

      if (error) {
        console.error("Error fetching boards:", error);
        return;
      }

      console.log("Raw boards data:", userBoards);

      // 2. Sort columns and tasks/cards manually since deep sorting in Supabase is tricky
      if (userBoards) {
        userBoards = userBoards.map(board => ({
          ...board,
          columns: (board.columns || [])
            .sort((a, b) => a.position - b.position)
            .map(col => ({
              ...col,
              cards: (col.cards || [])
                .sort((a, b) => a.position - b.position)
                .map(task => ({
                  ...task,
                  comments: (task.comments || []).sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
                }))
            }))
        }));
      }

      console.log("Processed boards:", userBoards);

      if (!userBoards || userBoards.length === 0) {
        console.log("No boards found, creating default board...");
        // Create default board for new user
        handleCreateBoard('Mi Primer Tablero'); // This will create and refetch
      } else {
        setBoards(userBoards);
        // Restore active board from localStorage or pick first
        const savedActive = localStorage.getItem(`kanban-active-board-${currentUser.id}`);
        console.log("Saved active board ID:", savedActive);
        if (savedActive && userBoards.find(b => b.id.toString() === savedActive)) {
          setActiveBoardId(savedActive);
        } else {
          console.log("Setting active board to first board:", userBoards[0].id);
          setActiveBoardId(userBoards[0].id);
        }
      }
    };

    fetchBoards();
  }, [currentUser, handleCreateBoard]);


  // IMPORTANT: We no longer auto-save to localStorage. 
  // Updates are handled by specific handler functions (create/update/delete) directly to DB.

  // Save active board preference locally
  useEffect(() => {
    if (currentUser && activeBoardId) {
      localStorage.setItem(`kanban-active-board-${currentUser.id}`, activeBoardId);
    }
  }, [activeBoardId, currentUser]);

  // Apply Board-Specific Settings (Column Width)
  useEffect(() => {
    if (!activeBoard) return;
    const widthToApply = activeBoard.columnWidth || settings.columnWidth || 365;
    document.documentElement.style.setProperty('--column-width', `${widthToApply}px`);
  }, [activeBoard, settings.columnWidth]);

  const updateActiveBoard = (newBoardData) => {
    // This is for local UI updates primarily, but if it involves columns/tasks, 
    // KanbanBoard component should handle the DB sync internally or we pass a handler.
    // For simple board updates (like title):
    if (!activeBoard) return;
    setBoards(boards.map(b => b.id === activeBoard.id ? { ...b, ...newBoardData } : b));
  };



  const handleUpdateBoardSettings = async (boardId, updates) => {
    // Optimistic update
    setBoards(boards.map(b => b.id === boardId ? { ...b, ...updates } : b));

    // DB update
    const { error } = await supabase
      .from('boards')
      .update(updates)
      .eq('id', boardId);

    if (error) {
      console.error("Error updating board:", error);
      // Revert?
    }
  };

  const handleEditBoard = handleUpdateBoardSettings; // Alias

  const handleDeleteBoard = (boardId) => {
    if (boards.length === 1) { alert("No puedes eliminar el último tablero."); return; }
    setBoardToDelete(boards.find(b => b.id === boardId));
  };

  const confirmDeleteBoard = async () => {
    if (!boardToDelete) return;
    const boardId = boardToDelete.id;

    // Optimistic
    const newBoards = boards.filter(b => b.id !== boardId);
    setBoards(newBoards);
    if (activeBoardId === boardId) { setActiveBoardId(newBoards[0].id); }
    setBoardToDelete(null);

    // DB
    const { error } = await supabase
      .from('boards')
      .delete()
      .eq('id', boardId);

    if (error) console.error("Error deleting board:", error);
  };



  if (!currentUser) {
    console.log("AppContent: No User -> Showing LoginModal");
    return <LoginModal />;
  }

  if (!activeBoard) {
    console.log("AppContent: No ActiveBoard -> Showing Loading Screen. Boards count:", boards.length);
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-[var(--bg-primary)] text-[var(--text-secondary)] gap-4">
        <div className="animate-pulse">Cargando tus tableros...</div>
        <div className="text-xs max-w-md text-center px-4">
          Si esto tarda mucho, es posible que no tengas tableros o haya un error de conexión.
          <br />UID: {currentUser?.id}
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Recargar
          </button>
          <button
            onClick={async () => { await supabase.auth.signOut(); window.location.reload(); }}
            className="px-4 py-2 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
          >
            Cerrar Sesión
          </button>
          <button
            onClick={() => handleCreateBoard("Tablero de Rescate")}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Forzar Crear Tablero
          </button>
        </div>
      </div>
    );
  }

  console.log("AppContent: Rendering Main UI. ActiveBoard:", activeBoard.id);
  return (
    <div className="flex h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden font-sans selection:bg-indigo-500/30 transition-colors duration-300">
      <Sidebar boards={boards} activeBoardId={activeBoardId} onSwitchBoard={setActiveBoardId} onCreateBoard={handleCreateBoard} onEditBoard={handleEditBoard} onDeleteBoard={handleDeleteBoard} />
      <div className="flex-1 flex flex-col min-w-0 bg-[var(--bg-primary)] relative transition-colors duration-300">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/10 via-[var(--bg-primary)]/0 to-[var(--bg-primary)]/0 pointer-events-none" />
        <header className="h-16 border-b border-[var(--border-color)] flex items-center justify-between px-6 bg-[var(--bg-primary)]/50 backdrop-blur-xl z-10 transition-colors duration-300">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[var(--text-primary)] to-[var(--text-secondary)]">{activeBoard.title}</h2>
            <button
              onClick={() => setShowBoardSettings(true)}
              className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 rounded-lg transition-colors"
              title="Configuración del Tablero"
            >
              <Icons.Settings />
            </button>

          </div>
          <div className="flex items-center gap-3">
            {isSupported && (
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`p-2 rounded-lg transition-all duration-300 flex items-center gap-2 ${isRecording
                  ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30 animate-pulse'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5'
                  }`}
                title={isRecording ? "Detener grabación" : "Crear tarea con voz"}
              >
                {isRecording ? <Icons.MicOff /> : <Icons.Mic />}
                {isRecording && <span className="text-xs font-medium">Escuchando...</span>}
              </button>
            )}
            <button className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 rounded-lg transition-colors"><Icons.Search /></button>
            <div className="h-8 w-px bg-[var(--border-color)] mx-1" />
            <div
              className="flex items-center gap-3 pl-2 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setShowProfile(true)}
            >
              <div className="text-right hidden sm:block">
                <div className="text-sm font-medium text-[var(--text-primary)]">{currentUser?.name || 'Usuario'}</div>
                <div className="text-xs text-[var(--text-secondary)] capitalize">{currentUser?.role || 'Invitado'}</div>
              </div>
              <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20">
                {currentUser?.name?.charAt(0) || 'U'}
              </div>
            </div>
          </div>
        </header>
        <KanbanBoard key={activeBoard.id} boardId={activeBoard.id} initialColumns={activeBoard.columns} onColumnsChange={(newCols) => updateActiveBoard({ columns: newCols })} />
      </div>
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
      {showBoardSettings && (
        <BoardSettingsModal
          board={activeBoard}
          onClose={() => setShowBoardSettings(false)}
          onSave={handleUpdateBoardSettings}
          onDelete={handleDeleteBoard}
        />
      )}
      <ConfirmationModal
        isOpen={!!boardToDelete}
        onClose={() => setBoardToDelete(null)}
        onConfirm={confirmDeleteBoard}
        title="¿Eliminar tablero?"
        message={`Se eliminará el tablero "${boardToDelete?.title}" y todas sus tareas. Esta acción no se puede deshacer.`}
        confirmText="Sí, Eliminar"
      />
      {pendingVoiceTask && (
        <CreateTaskModal
          columnTitle={pendingVoiceTask.targetColumn?.title || 'Columna'}
          initialData={pendingVoiceTask.taskData}
          onClose={() => setPendingVoiceTask(null)}
          onSave={finalizeVoiceTask}
        />
      )}
    </div>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <SettingsProvider>
        <AppContent />
      </SettingsProvider>
    </AuthProvider>
  );
};

export default App;
