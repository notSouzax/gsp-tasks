import React, { useState, useEffect, useCallback } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { supabase } from './lib/supabaseClient';
import logger from './utils/logger';

import { useVoiceInput } from './hooks/useVoiceInput';
import { useBoards } from './hooks/useBoards';
import { parseTaskIntent, learnEntity, injectContext } from './utils/aiService';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ActivityProvider } from './context/ActivityContext';
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceContext';
import LoginModal from './components/modals/LoginModal';
import ConfirmationModal from './components/modals/ConfirmationModal';

// Router Imports
import { Routes, Route, useNavigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import DashboardPage from './pages/DashboardPage';
import KanbanPage from './pages/KanbanPage';
import CRMPage from './pages/CRMPage';
import AutomationsPage from './pages/AutomationsPage';
import CalendarPage from './pages/CalendarPage';

/**
 * AppContent - Main application content component
 * Handles routing, voice input, and coordinates between different views
 */
const AppContent = () => {
  logger.debug('AppContent', 'STARTED RENDER');
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { settings } = useSettings();
  const { currentWorkspace, loading: workspaceLoading } = useWorkspace();

  // =========================================================================
  // BOARD MANAGEMENT (via useBoards hook)
  // =========================================================================
  const {
    boards,
    activeBoardId,
    setActiveBoardId,
    activeBoard,
    boardToDelete,
    isLoading: boardsLoading,
    handleCreateBoard,
    handleUpdateBoardSettings,
    handleEditBoard,
    updateActiveBoard,
    handleReorderBoards,
    handleDeleteBoard,
    cancelDeleteBoard,
    confirmDeleteBoard,
    createTaskInColumn,
    handleGlobalTaskSave
  } = useBoards(currentUser, currentWorkspace, workspaceLoading);

  // =========================================================================
  // VOICE INPUT STATE
  // =========================================================================
  const [pendingVoiceTask, setPendingVoiceTask] = useState(null);
  const [pendingTaskId, setPendingTaskId] = useState(null);
  const { isRecording, transcript, resetTranscript } = useVoiceInput();
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);

  // =========================================================================
  // VOICE COMMAND PROCESSING
  // =========================================================================
  const handleVoiceCommand = useCallback(async (text) => {
    if (!text || !activeBoard) return;

    setIsProcessingVoice(true);
    try {
      injectContext(boards);
      const taskData = parseTaskIntent(text, boards, activeBoard.id);

      if (taskData?.needsRepetition) {
        toast.error('No te he entendido bien. Por favor, repite la orden.');
        return;
      }

      if (taskData) {
        const { title, boardId, columnId, description, comment } = taskData;

        let targetBoard = activeBoard;
        if (boardId && boardId !== activeBoard.id) {
          targetBoard = boards.find(b => b.id === boardId) || activeBoard;
        }

        const targetColumn = targetBoard.columns.find(c => c.id === columnId) || targetBoard.columns[0];

        setPendingVoiceTask({
          taskData: { title, description, initialComment: comment },
          targetBoard,
          targetColumn
        });

        learnEntity(title);
      }
    } catch (error) {
      logger.error('AppContent', 'Error processing voice command:', error);
    } finally {
      setIsProcessingVoice(false);
      resetTranscript();
    }
  }, [activeBoard, boards, resetTranscript]);

  const finalizeVoiceTask = async (confirmedData) => {
    if (!pendingVoiceTask) return;
    const { targetBoard, targetColumn } = pendingVoiceTask;

    await createTaskInColumn(targetBoard, targetColumn, confirmedData);
    setPendingVoiceTask(null);
  };

  // Process voice command when transcript updates and recording finishes
  useEffect(() => {
    if (!isRecording && transcript && !isProcessingVoice) {
      handleVoiceCommand(transcript);
    }
  }, [isRecording, transcript, isProcessingVoice, handleVoiceCommand]);

  // =========================================================================
  // BOARD SETTINGS EFFECTS
  // =========================================================================

  // Apply board-specific column width
  useEffect(() => {
    if (!activeBoard) return;
    const widthToApply = activeBoard.columnWidth || activeBoard.column_width || settings.columnWidth || 365;
    document.documentElement.style.setProperty('--column-width', `${widthToApply}px`);
  }, [activeBoard, settings.columnWidth]);

  // =========================================================================
  // NAVIGATION
  // =========================================================================
  const handleNavigateToTask = (task) => {
    navigate('/tableros');
    if (task.boardId !== activeBoardId) {
      setActiveBoardId(task.boardId);
    }
    setPendingTaskId(task.id);
  };

  // =========================================================================
  // LOADING STATES
  // =========================================================================
  if (workspaceLoading) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-[var(--bg-primary)] text-[var(--text-secondary)] gap-4">
        <div className="animate-pulse text-indigo-400">Iniciando Espacio de Trabajo...</div>
        <div className="text-xs text-slate-500">Sincronizando permisos y configuración</div>
      </div>
    );
  }

  if (!currentUser) {
    logger.debug('AppContent', 'No User -> Showing LoginModal');
    return <LoginModal />;
  }

  if (boardsLoading || !activeBoard) {
    logger.debug('AppContent', 'Loading boards or no active board. Boards count:', boards.length);
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-[var(--bg-primary)] text-[var(--text-secondary)] gap-4">
        <div className="animate-pulse">Cargando tus tableros...</div>
        <div className="text-xs max-w-md text-center px-4">
          Si esto tarda mucho, es posible que no tengas tableros o haya un error de conexión.
          <br />UID: {currentUser?.id}
          <br />WS: {currentWorkspace?.id}
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

  // =========================================================================
  // MAIN RENDER
  // =========================================================================
  logger.debug('AppContent', 'Rendering Main UI. ActiveBoard:', activeBoard?.id);

  return (
    <React.Suspense fallback={<div className="flex items-center justify-center h-screen bg-[#0f172a] text-white">Cargando...</div>}>
      <Routes>
        <Route
          element={
            <MainLayout
              boards={boards}
              activeBoardId={activeBoardId}
              onSwitchBoard={setActiveBoardId}
              onCreateBoard={handleCreateBoard}
              onEditBoard={handleEditBoard}
              onDeleteBoard={handleDeleteBoard}
              onReorderBoards={handleReorderBoards}
              onGlobalTaskSave={handleGlobalTaskSave}
              onNavigateToTask={handleNavigateToTask}
              pendingVoiceTask={pendingVoiceTask}
              setPendingVoiceTask={setPendingVoiceTask}
              finalizeVoiceTask={finalizeVoiceTask}
              activeBoard={activeBoard}
            />
          }
        >
          <Route index element={<DashboardPage boards={boards} onNavigateToTask={handleNavigateToTask} />} />
          <Route
            path="tableros"
            element={
              <KanbanPage
                boards={boards}
                activeBoardId={activeBoardId}
                onSwitchBoard={setActiveBoardId}
                onCreateBoard={handleCreateBoard}
                onEditBoard={handleEditBoard}
                onDeleteBoard={handleDeleteBoard}
                onReorderBoards={handleReorderBoards}
                updateActiveBoard={updateActiveBoard}
                pendingTaskId={pendingTaskId}
              />
            }
          />
          <Route path="crm" element={<CRMPage />} />
          <Route path="automations" element={<AutomationsPage activeBoardId={activeBoardId} />} />
          <Route path="calendar" element={<CalendarPage />} />
        </Route>
      </Routes>
      <ConfirmationModal
        isOpen={!!boardToDelete}
        onClose={cancelDeleteBoard}
        onConfirm={confirmDeleteBoard}
        title="¿Eliminar tablero?"
        message={`Se eliminará el tablero "${boardToDelete?.title}" y todas sus tareas. Esta acción no se puede deshacer.`}
        confirmText="Sí, Eliminar"
      />
    </React.Suspense>
  );
};

/**
 * App - Root component with providers
 */
const App = () => {
  return (
    <AuthProvider>
      <SettingsProvider>
        <WorkspaceProvider>
          <ActivityProvider>
            <AppContent />
            <Toaster
              position="top-center"
              toastOptions={{
                duration: 3000,
                style: {
                  background: '#1e293b',
                  color: '#f1f5f9',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  borderRadius: '12px',
                  fontSize: '14px',
                },
                success: {
                  iconTheme: {
                    primary: '#10b981',
                    secondary: '#f1f5f9',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#f1f5f9',
                  },
                },
              }}
            />
          </ActivityProvider>
        </WorkspaceProvider>
      </SettingsProvider>
    </AuthProvider>
  );
};

export default App;
