import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { Icons } from '../components/ui/Icons';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { getRoleName } from '../utils/permissions';
import ProfileModal from '../components/modals/ProfileModal';
import CreateTaskModal from '../components/modals/CreateTaskModal';
import SearchModal from '../components/modals/SearchModal';
import ActivityDrawer from '../components/modals/ActivityDrawer';
import JoinWorkspaceModal from '../components/modals/JoinWorkspaceModal';
import InviteMemberModal from '../components/modals/InviteMemberModal';
import { useVoiceInput } from '../hooks/useVoiceInput';
import BoardSettingsModal from '../components/modals/BoardSettingsModal';

const MainLayout = ({
    boards,
    onEditBoard,
    onDeleteBoard,
    onGlobalTaskSave,
    onNavigateToTask,
    pendingVoiceTask,
    setPendingVoiceTask,
    finalizeVoiceTask,
    activeBoard
}) => {
    const location = useLocation();
    const { currentUser } = useAuth();
    const { userRole } = useWorkspace();
    const [showProfile, setShowProfile] = useState(false);
    const [showGlobalTaskModal, setShowGlobalTaskModal] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [showActivityDrawer, setShowActivityDrawer] = useState(false);
    const [showJoinWorkspace, setShowJoinWorkspace] = useState(false);
    const [showInviteMember, setShowInviteMember] = useState(false);
    const [showBoardSettings, setShowBoardSettings] = useState(false);

    // Voice Input Logic
    const { isRecording, startRecording, stopRecording, isSupported } = useVoiceInput();

    const getPageTitle = () => {
        const path = location.pathname;
        if (path === '/') return 'Dashboard';
        if (path === '/tableros') return 'Tableros';
        if (path === '/crm') return 'CRM';
        if (path === '/automations') return 'Automatizaciones';
        if (path === '/calendar') return 'Calendario';
        return 'Gestor';
    };

    return (
        <div className="flex h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden font-sans selection:bg-indigo-500/30 transition-colors duration-300">
            <Sidebar />

            <div className="flex-1 flex flex-col min-w-0 bg-[var(--bg-primary)] relative transition-colors duration-300">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/10 via-[var(--bg-primary)]/0 to-[var(--bg-primary)]/0 pointer-events-none" />

                {/* HEADER */}
                <header className="h-16 border-b border-[var(--border-subtle)] flex items-center justify-between px-6 bg-[var(--bg-tertiary)]/80 backdrop-blur-md z-10 transition-colors duration-300 shadow-sm">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-cyan-500 dark:from-indigo-400 dark:to-cyan-400 tracking-tight">
                            {getPageTitle()}
                        </h2>
                        {location.pathname === '/tableros' && (
                            <button
                                onClick={() => setShowBoardSettings(true)}
                                className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] dark:hover:bg-white/10 rounded-lg transition-all"
                                title="Configuración del Tablero"
                            >
                                <Icons.Settings />
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        {/* GLOBAL NEW TASK BUTTON */}
                        <button
                            onClick={() => setShowGlobalTaskModal(true)}
                            className="w-9 h-9 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-lg transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center group"
                            title="Nueva Tarea Global"
                        >
                            <Icons.Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                        </button>

                        {isSupported && (
                            <button
                                onClick={isRecording ? stopRecording : startRecording}
                                className={`w-9 h-9 rounded-lg transition-all duration-300 flex items-center justify-center ${isRecording
                                    ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30 animate-pulse'
                                    : 'text-[var(--text-secondary)] hover:text-indigo-500 hover:bg-indigo-500/10'
                                    }`}
                                title={isRecording ? "Detener grabación" : "Crear tarea con voz"}
                            >
                                {isRecording ? <Icons.MicOff /> : <Icons.Mic />}
                            </button>
                        )}
                        <button onClick={() => setShowSearch(true)} className="w-9 h-9 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] dark:hover:bg-white/5 rounded-lg transition-colors" title="Buscar tareas"><Icons.Search /></button>
                        <button
                            onClick={() => setShowActivityDrawer(true)}
                            className="w-9 h-9 flex items-center justify-center text-[var(--text-secondary)] hover:text-indigo-500 hover:bg-indigo-500/10 rounded-lg transition-colors"
                            title="Historial de Actividad"
                        >
                            <Icons.Activity />
                        </button>

                        {/* Workspace Buttons */}
                        <button
                            onClick={() => setShowInviteMember(true)}
                            className="w-9 h-9 flex items-center justify-center text-[var(--text-secondary)] hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors"
                            title="Invitar Miembro"
                        >
                            <Icons.UserPlus />
                        </button>
                        <button
                            onClick={() => setShowJoinWorkspace(true)}
                            className="w-9 h-9 flex items-center justify-center text-[var(--text-secondary)] hover:text-green-500 hover:bg-green-500/10 rounded-lg transition-colors"
                            title="Unirse a Workspace"
                        >
                            <Icons.Users />
                        </button>

                        <div className="h-6 w-px bg-[var(--border-subtle)] mx-1" />

                        <div
                            className="flex items-center gap-3 pl-2 cursor-pointer group"
                            onClick={() => setShowProfile(true)}
                        >
                            <div className="text-right hidden sm:block">
                                <div className="text-sm font-medium text-[var(--text-primary)] group-hover:text-indigo-500 transition-colors">{currentUser?.name || 'Usuario'}</div>
                                <div className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wider">{getRoleName(userRole) || currentUser?.role || 'Invitado'}</div>
                            </div>
                            {currentUser?.avatar_url ? (
                                <img
                                    src={currentUser.avatar_url}
                                    alt="Avatar"
                                    className="w-9 h-9 rounded-lg object-cover shadow-lg shadow-indigo-500/20 ring-2 ring-transparent group-hover:ring-indigo-500/50 transition-all"
                                />
                            ) : (
                                <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20 ring-2 ring-transparent group-hover:ring-indigo-500/50 transition-all">
                                    {currentUser?.name?.charAt(0) || 'U'}
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* MAIN CONTENT AREA */}
                <Outlet />

            </div>

            {/* GLOBAL MODALS */}
            {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}

            {showBoardSettings && activeBoard && (
                <BoardSettingsModal
                    board={activeBoard}
                    onClose={() => setShowBoardSettings(false)}
                    onSave={onEditBoard}
                    onDelete={onDeleteBoard}
                />
            )}

            {pendingVoiceTask && (
                <CreateTaskModal
                    columnTitle={pendingVoiceTask.targetColumn?.title || 'Columna'}
                    initialData={pendingVoiceTask.taskData}
                    onClose={() => setPendingVoiceTask(null)}
                    onSave={finalizeVoiceTask}
                />
            )}

            {showGlobalTaskModal && (
                <CreateTaskModal
                    isGlobal={true}
                    boards={boards}
                    onClose={() => setShowGlobalTaskModal(false)}
                    onSave={onGlobalTaskSave}
                />
            )}

            <SearchModal
                isOpen={showSearch}
                onClose={() => setShowSearch(false)}
                boards={boards}
                onTaskClick={onNavigateToTask}
            />

            <ActivityDrawer
                isOpen={showActivityDrawer}
                onClose={() => setShowActivityDrawer(false)}
                boardId={null} // Global activity
            />

            <JoinWorkspaceModal
                isOpen={showJoinWorkspace}
                onClose={() => setShowJoinWorkspace(false)}
            />

            <InviteMemberModal
                isOpen={showInviteMember}
                onClose={() => setShowInviteMember(false)}
            />
        </div>
    );
};

export default MainLayout;
