import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import KanbanBoard from './components/KanbanBoard';
import { Icons } from './components/ui/Icons';

const App = () => {
  const [boards, setBoards] = useState(() => {
    const saved = localStorage.getItem('kanban-boards');
    if (saved) return JSON.parse(saved);
    return [{ id: 'default', title: 'Tablero Principal', columns: [{ id: 'todo', title: 'Por Hacer', color: 'bg-blue-500', cards: [] }, { id: 'doing', title: 'En Progreso', color: 'bg-yellow-500', cards: [] }, { id: 'done', title: 'Completado', color: 'bg-green-500', cards: [] }] }];
  });
  const [activeBoardId, setActiveBoardId] = useState(() => { return localStorage.getItem('kanban-active-board') || (boards[0]?.id); });
  useEffect(() => { localStorage.setItem('kanban-boards', JSON.stringify(boards)); }, [boards]);
  useEffect(() => { localStorage.setItem('kanban-active-board', activeBoardId); }, [activeBoardId]);
  const activeBoard = boards.find(b => b.id === activeBoardId) || boards[0];
  const updateActiveBoard = (newBoardData) => { setBoards(boards.map(b => b.id === activeBoard.id ? { ...b, ...newBoardData } : b)); };
  const handleCreateBoard = (title) => { const newBoard = { id: Date.now().toString(), title, columns: [{ id: 'todo', title: 'Por Hacer', color: 'bg-blue-500', cards: [] }, { id: 'doing', title: 'En Progreso', color: 'bg-yellow-500', cards: [] }, { id: 'done', title: 'Completado', color: 'bg-green-500', cards: [] }] }; setBoards([...boards, newBoard]); setActiveBoardId(newBoard.id); };
  const handleEditBoard = (boardId, newTitle) => { setBoards(boards.map(b => b.id === boardId ? { ...b, title: newTitle } : b)); };
  const handleDeleteBoard = (boardId) => { if (boards.length === 1) { alert("No puedes eliminar el último tablero."); return; } if (confirm("¿Seguro que quieres eliminar este tablero?")) { const newBoards = boards.filter(b => b.id !== boardId); setBoards(newBoards); if (activeBoardId === boardId) { setActiveBoardId(newBoards[0].id); } } };

  return (
    <div className="flex h-screen bg-slate-900 text-white overflow-hidden font-sans selection:bg-indigo-500/30">
      <Sidebar boards={boards} activeBoardId={activeBoardId} onSwitchBoard={setActiveBoardId} onCreateBoard={handleCreateBoard} onEditBoard={handleEditBoard} onDeleteBoard={handleDeleteBoard} />
      <div className="flex-1 flex flex-col min-w-0 bg-slate-900 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/10 via-slate-900/0 to-slate-900/0 pointer-events-none" />
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-slate-900/50 backdrop-blur-xl z-10">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">{activeBoard.title}</h2>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex -space-x-2">{[1, 2, 3].map(i => (<div key={i} className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-xs font-medium text-gray-400">U{i}</div>))}<button className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-xs font-medium text-gray-400 hover:bg-slate-700 transition-colors">+</button></div>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"><Icons.Search /></button>
            <button className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"><Icons.Settings /></button>
            <div className="h-8 w-px bg-white/10 mx-1" />
            <div className="flex items-center gap-3 pl-2"><div className="text-right hidden sm:block"><div className="text-sm font-medium text-white">Usuario Demo</div><div className="text-xs text-gray-500">Admin</div></div><div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20">YO</div></div>
          </div>
        </header>
        <KanbanBoard key={activeBoard.id} initialColumns={activeBoard.columns} onColumnsChange={(newCols) => updateActiveBoard({ columns: newCols })} />
      </div>
    </div>
  );
};

export default App;
