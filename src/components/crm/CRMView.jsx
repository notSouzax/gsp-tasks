import React, { useState } from 'react';
import { CRMProvider, useCRM } from '../../context/CRMContext';
import CRMKanban from './CRMKanban';
import CRMContacts from './CRMContacts';
import CRMCompanies from './CRMCompanies';
import CRMActivities from './CRMActivities';
import CRMDashboard from './CRMDashboard';
import PipelineModal from './modals/PipelineModal';
import { Icons } from '../ui/Icons';

const CRM_TABS = [
    { id: 'pipeline', label: 'Pipeline', icon: 'view_kanban' },
    { id: 'contacts', label: 'Contactos', icon: 'contacts' },
    { id: 'companies', label: 'Empresas', icon: 'business' },
    { id: 'activities', label: 'Actividades', icon: 'task_alt' },
    { id: 'dashboard', label: 'Dashboard', icon: 'analytics' },
];

const CRMViewContent = () => {
    const [activeTab, setActiveTab] = useState('pipeline');
    const [showPipelineModal, setShowPipelineModal] = useState(false);
    const [editingPipeline, setEditingPipeline] = useState(null);

    const { loading, pipelines, activePipeline, setActivePipelineId } = useCRM();

    const handleEditPipeline = () => {
        setEditingPipeline(activePipeline);
        setShowPipelineModal(true);
    };

    const handleCreatePipeline = () => {
        setEditingPipeline(null);
        setShowPipelineModal(true);
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-[var(--bg-primary)]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                    <span className="text-[var(--text-secondary)]">Cargando CRM...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-primary)]">
            {/* CRM Header with Tabs */}
            <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/50 backdrop-blur-sm">
                <div className="flex items-center justify-between px-6 py-3">
                    {/* Tabs */}
                    <div className="flex items-center gap-1">
                        {CRM_TABS.map(tab => (
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

                    {/* Pipeline Selector (only show in pipeline view) */}
                    {activeTab === 'pipeline' && (
                        <div className="flex items-center gap-3">
                            {pipelines.length > 0 && (
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Pipeline:</span>
                                    <select
                                        value={activePipeline?.id || ''}
                                        onChange={(e) => setActivePipelineId(Number(e.target.value))}
                                        className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-primary)] focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none"
                                    >
                                        {pipelines.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>

                                    <button
                                        onClick={handleEditPipeline}
                                        className="p-2 text-[var(--text-secondary)] hover:text-indigo-500 hover:bg-indigo-500/10 rounded-lg transition-colors border border-[var(--border-subtle)]"
                                        title="Configurar Pipeline"
                                    >
                                        <Icons.Settings size={18} />
                                    </button>
                                </div>
                            )}

                            <button
                                onClick={handleCreatePipeline}
                                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-indigo-500/20"
                            >
                                <Icons.Plus size={16} />
                                Nuevo Pipeline
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden">
                {activeTab === 'pipeline' && <CRMKanban />}
                {activeTab === 'contacts' && <CRMContacts />}
                {activeTab === 'companies' && <CRMCompanies />}
                {activeTab === 'activities' && <CRMActivities />}
                {activeTab === 'dashboard' && <CRMDashboard />}
            </div>

            {/* Modals */}
            {showPipelineModal && (
                <PipelineModal
                    pipeline={editingPipeline}
                    onClose={() => setShowPipelineModal(false)}
                />
            )}
        </div>
    );
};

// Main component wrapped with CRMProvider
const CRMView = () => {
    return (
        <CRMProvider>
            <CRMViewContent />
        </CRMProvider>
    );
};

export default CRMView;
