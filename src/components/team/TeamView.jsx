import React, { useState, useRef, useEffect } from 'react';
import { TeamProvider, useTeam } from '../../features/team/TeamContext';
import TeamChat from './TeamChat';
import TeamDocs from './TeamDocs';
import TeamChanges from './TeamChanges';
import TeamGate from './TeamGate';
import TeamSettingsModal from './modals/TeamSettingsModal';
import { Icons } from '../ui/Icons';

const TEAM_TABS = [
    { id: 'chat', label: 'Chat', icon: 'forum' },
    { id: 'docs', label: 'Documentación', icon: 'auto_stories' },
    { id: 'changes', label: 'Cambios', icon: 'campaign' },
];

const TeamSelector = ({ teams, currentTeamId, onSelect, onJoin }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const current = teams.find((t) => t.id === currentTeamId);

    useEffect(() => {
        if (!open) return;
        const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, [open]);

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen((o) => !o)}
                className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors max-w-[240px]"
            >
                <span className="material-symbols-outlined text-[20px] text-indigo-500">groups</span>
                <span className="text-sm font-bold text-[var(--text-primary)] truncate">{current?.name || 'Equipo'}</span>
                <Icons.ChevronDown size={15} className={`text-[var(--text-muted)] transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute left-0 top-full mt-1 w-64 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl shadow-2xl py-1.5 z-50 overflow-hidden">
                    <div className="max-h-64 overflow-y-auto custom-scrollbar">
                        {teams.map((t) => (
                            <button
                                key={t.id}
                                onClick={() => { onSelect(t.id); setOpen(false); }}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                                    t.id === currentTeamId
                                        ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 font-semibold'
                                        : 'text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                                }`}
                            >
                                <span className="material-symbols-outlined text-[18px] opacity-70">groups</span>
                                <span className="truncate flex-1">{t.name}</span>
                                {t.id === currentTeamId && <Icons.Check size={15} className="text-indigo-500" />}
                            </button>
                        ))}
                    </div>
                    <div className="border-t border-[var(--border-subtle)] mt-1 pt-1">
                        <button
                            onClick={() => { setOpen(false); onJoin(); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-indigo-500 hover:bg-indigo-500/10 transition-colors font-medium"
                        >
                            <Icons.Plus size={16} />
                            Unirse / crear equipo…
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const TeamViewInner = () => {
    const { teams, teamsLoading, currentTeamId, setCurrentTeamId } = useTeam();
    const [activeTab, setActiveTab] = useState('chat');
    const [showSettings, setShowSettings] = useState(false);
    const [showJoin, setShowJoin] = useState(false);

    if (teamsLoading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-[var(--bg-primary)]">
                <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (teams.length === 0) {
        return <TeamGate />;
    }

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-primary)]">
            {/* Barra superior: selector de equipo + ajustes */}
            <div className="flex items-center justify-between gap-3 px-6 pt-3 pb-2 border-b border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/40">
                <div className="flex items-center gap-2 min-w-0">
                    <TeamSelector
                        teams={teams}
                        currentTeamId={currentTeamId}
                        onSelect={setCurrentTeamId}
                        onJoin={() => setShowJoin(true)}
                    />
                </div>
                <button
                    onClick={() => setShowSettings(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-lg transition-colors border border-[var(--border-subtle)]"
                    title="Ajustes del equipo"
                >
                    <Icons.Settings size={16} />
                    <span className="hidden sm:inline">Ajustes</span>
                </button>
            </div>

            {/* Pestañas */}
            <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/50 backdrop-blur-sm">
                <div className="flex items-center gap-1 px-6 py-2">
                    {TEAM_TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                activeTab === tab.id
                                    ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 shadow-lg shadow-indigo-500/10'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] dark:hover:bg-white/5'
                            }`}
                        >
                            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Contenido */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {activeTab === 'chat' && <TeamChat />}
                {activeTab === 'docs' && <TeamDocs />}
                {activeTab === 'changes' && <TeamChanges />}
            </div>

            {showSettings && <TeamSettingsModal onClose={() => setShowSettings(false)} />}
            {showJoin && (
                <div className="fixed inset-0 z-[100] flex">
                    <TeamGate onCancel={() => setShowJoin(false)} />
                </div>
            )}
        </div>
    );
};

const TeamView = () => (
    <TeamProvider>
        <TeamViewInner />
    </TeamProvider>
);

export default TeamView;
