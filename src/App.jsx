import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import KanbanBoard from './components/KanbanBoard';
import { Icons } from './components/ui/Icons';
import { SettingsProvider } from './context/SettingsContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProfileModal from './components/modals/ProfileModal';
import LoginModal from './components/modals/LoginModal';

const AppContent = () => {
  const { currentUser } = useAuth();
  const [showProfile, setShowProfile] = useState(false);
  const [boards, setBoards] = useState([]);
  const [activeBoardId, setActiveBoardId] = useState(null);

  // Load boards when currentUser changes
  useEffect(() => {
    if (!currentUser) {
      setBoards([]);
      setActiveBoardId(null);
      return;
    }

    const storageKey = `kanban-boards-${currentUser.id}`;
    const saved = localStorage.getItem(storageKey);

    if (saved) {
      const loadedBoards = JSON.parse(saved);
      setBoards(loadedBoards);
      const savedActive = localStorage.getItem(`kanban-active-board-${currentUser.id}`);
      setActiveBoardId(savedActive || loadedBoards[0]?.id);
    } else {
      // Default board for new users
      const defaultBoard = {
        id: Date.now().toString(),
        title: 'Mi Primer Tablero',
        columns: [
          { id: 'todo', title: 'Por Hacer', color: 'bg-blue-500', cards: [] },
          { id: 'doing', title: 'En Progreso', color: 'bg-yellow-500', cards: [] },
          { id: 'done', title: 'Completado', color: 'bg-green-500', cards: [] }
        ]
      };
      setBoards([defaultBoard]);
      setActiveBoardId(defaultBoard.id);
    }
  }, [currentUser]);

  // Save boards when they change
  useEffect(() => {
    if (currentUser && boards.length > 0) {
      localStorage.setItem(`kanban-boards-${currentUser.id}`, JSON.stringify(boards));
    }
  }, [boards, currentUser]);

  // Save active board
  useEffect(() => {
    if (currentUser && activeBoardId) {
      localStorage.setItem(`kanban-active-board-${currentUser.id}`, activeBoardId);
    }
  }, [activeBoardId, currentUser]);

  const activeBoard = boards.find(b => b.id === activeBoardId) || boards[0];

  const updateActiveBoard = (newBoardData) => {
    if (!activeBoard) return;
    setBoards(boards.map(b => b.id === activeBoard.id ? { ...b, ...newBoardData } : b));
  };

  const handleCreateBoard = (title) => {
    const newBoard = { id: Date.now().toString(), title, columns: [{ id: 'todo', title: 'Por Hacer', color: 'bg-blue-500', cards: [] }, { id: 'doing', title: 'En Progreso', color: 'bg-yellow-500', cards: [] }, { id: 'done', title: 'Completado', color: 'bg-green-500', cards: [] }] };
    setBoards([...boards, newBoard]);
    setActiveBoardId(newBoard.id);
  };

  const handleEditBoard = (boardId, newTitle) => { setBoards(boards.map(b => b.id === boardId ? { ...b, title: newTitle } : b)); };

  const handleDeleteBoard = (boardId) => {
    if (boards.length === 1) { alert("No puedes eliminar el último tablero."); return; }
    if (confirm("¿Seguro que quieres eliminar este tablero?")) {
      const newBoards = boards.filter(b => b.id !== boardId);
      setBoards(newBoards);
      if (activeBoardId === boardId) { setActiveBoardId(newBoards[0].id); }
    }
  };

  if (!currentUser) {
    return <LoginModal />;
  }

  if (!activeBoard) return <div className="flex h-screen items-center justify-center text-[var(--text-secondary)]">Cargando...</div>;

  return (
    <div className="flex h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden font-sans selection:bg-indigo-500/30 transition-colors duration-300">
      <Sidebar boards={boards} activeBoardId={activeBoardId} onSwitchBoard={setActiveBoardId} onCreateBoard={handleCreateBoard} onEditBoard={handleEditBoard} onDeleteBoard={handleDeleteBoard} />
      <div className="flex-1 flex flex-col min-w-0 bg-[var(--bg-primary)] relative transition-colors duration-300">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/10 via-[var(--bg-primary)]/0 to-[var(--bg-primary)]/0 pointer-events-none" />
        <header className="h-16 border-b border-[var(--border-color)] flex items-center justify-between px-6 bg-[var(--bg-primary)]/50 backdrop-blur-xl z-10 transition-colors duration-300">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[var(--text-primary)] to-[var(--text-secondary)]">{activeBoard.title}</h2>
            <div className="h-4 w-px bg-[var(--border-color)]" />
            <div className="flex -space-x-2">{[1, 2, 3].map(i => (<div key={i} className="w-8 h-8 rounded-full bg-slate-800 border-2 border-[var(--bg-primary)] flex items-center justify-center text-xs font-medium text-gray-400">U{i}</div>))}<button className="w-8 h-8 rounded-full bg-slate-800 border-2 border-[var(--bg-primary)] flex items-center justify-center text-xs font-medium text-gray-400 hover:bg-slate-700 transition-colors">+</button></div>
          </div>
          <div className="flex items-center gap-3">
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
        <KanbanBoard key={activeBoard.id} initialColumns={activeBoard.columns} onColumnsChange={(newCols) => updateActiveBoard({ columns: newCols })} />
      </div>
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
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
