import React, { useState } from 'react';
import TeamChat from './TeamChat';
import TeamDocs from './TeamDocs';
import TeamChanges from './TeamChanges';

const TEAM_TABS = [
    { id: 'chat', label: 'Chat', icon: 'forum' },
    { id: 'docs', label: 'Documentación', icon: 'auto_stories' },
    { id: 'changes', label: 'Cambios', icon: 'campaign' },
];

const TeamView = () => {
    const [activeTab, setActiveTab] = useState('chat');

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-primary)]">
            {/* Cabecera con pestañas */}
            <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/50 backdrop-blur-sm">
                <div className="flex items-center gap-1 px-6 py-3">
                    {TEAM_TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                                ${activeTab === tab.id
                                    ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 shadow-lg shadow-indigo-500/10'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] dark:hover:bg-white/5'}
                            `}
                        >
                            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Contenido de la pestaña */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {activeTab === 'chat' && <TeamChat />}
                {activeTab === 'docs' && <TeamDocs />}
                {activeTab === 'changes' && <TeamChanges />}
            </div>
        </div>
    );
};

export default TeamView;
