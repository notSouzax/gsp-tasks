import React, { useState } from 'react';
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
                    <span className="material-symbols-outlined text-[20px] text-indigo-500">groups</span>
                    <select
                        value={currentTeamId || ''}
                        onChange={(e) => {
                            if (e.target.value === '__join__') { setShowJoin(true); return; }
                            setCurrentTeamId(e.target.value);
                        }}
                        className="bg-transparent text-sm font-bold text-[var(--text-primary)] outline-none cursor-pointer max-w-[220px] truncate"
                    >
                        {teams.map((t) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                        <option value="__join__">＋ Unirse / crear equipo…</option>
                    </select>
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
