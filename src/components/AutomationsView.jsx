import React, { useState } from 'react';
import { AutomationList } from '../features/automations';

const CONTEXT_TABS = [
    { id: 'boards', label: 'Tableros', icon: 'view_kanban' },
    { id: 'crm', label: 'CRM', icon: 'handshake' },
    { id: 'calendar', label: 'Calendario', icon: 'calendar_month' },
];

const AutomationsView = ({ activeBoardId }) => {
    const [activeContext, setActiveContext] = useState('boards');
    const [showEditor, setShowEditor] = useState(false);

    const handleCreateNew = () => {
        setShowEditor('new');
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-primary)]">
            {/* Modern Header */}
            <div className="px-8 py-6 border-b border-[var(--border-subtle)]">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1">
                            Gestión de Automatizaciones
                        </h1>
                        <p className="text-sm text-[var(--text-secondary)]">
                            Gestiona y monitorea tus flujos de trabajo automatizados
                        </p>
                    </div>

                    {/* Create Button - Top Right */}
                    <button
                        onClick={handleCreateNew}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30"
                    >
                        <span className="material-symbols-outlined text-[20px]">add</span>
                        Crear Nueva Automatización
                    </button>
                </div>

                {/* Context Tabs and Search */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 bg-[var(--bg-secondary)] dark:bg-slate-800/50 rounded-xl p-1 border border-[var(--border-subtle)]">
                        {CONTEXT_TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveContext(tab.id)}
                                className={`
                                    flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                                    ${activeContext === tab.id
                                        ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}
                                `}
                            >
                                <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-[20px]">
                            search
                        </span>
                        <input
                            type="text"
                            placeholder="Buscar automatizaciones..."
                            className="pl-10 pr-4 py-2 bg-[var(--bg-secondary)] dark:bg-slate-800/50 border border-[var(--border-default)] rounded-xl text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-indigo-500/50 focus:outline-none w-64"
                        />
                    </div>
                </div>
            </div>

            {/* Automation List - Grid Mode */}
            <div className="flex-1 overflow-y-auto p-8">
                <AutomationList
                    boardId={activeContext === 'boards' ? activeBoardId : null}
                    context={activeContext}
                    isInline={true}
                    onCreateNew={showEditor === 'new' ? () => setShowEditor(false) : null}
                    triggerCreate={showEditor === 'new'}
                    onEditorClose={() => setShowEditor(false)}
                />
            </div>
        </div>
    );
};

export default AutomationsView;
