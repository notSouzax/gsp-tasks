import React, { useState } from 'react';
import { useAutomations } from '../hooks/useAutomations';
import AutomationEditor from './AutomationEditor';
import { TriggerRegistry } from '../engine/TriggerRegistry';
// Import ConfirmationModal from modals directory
import ConfirmationModal from '../../../components/modals/ConfirmationModal';

const AutomationList = ({ boardId, onClose, isInline = false, context = 'boards', triggerCreate = false, onEditorClose }) => {
    const {
        automations,
        loading,
        toggleAutomation,
        deleteAutomation,
        duplicateAutomation
    } = useAutomations(boardId, context);

    const [editingAutomation, setEditingAutomation] = useState(null);
    const [isCreating, setIsCreating] = useState(triggerCreate);
    const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, title: '', message: '', action: null });

    const handleEdit = (automation) => {
        setEditingAutomation(automation);
        setIsCreating(false);
    };

    const handleCreate = () => {
        setEditingAutomation(null);
        setIsCreating(true);
    };

    const handleCloseEditor = () => {
        setEditingAutomation(null);
        setIsCreating(false);
        onEditorClose?.();
    };

    const handleDelete = (id, name) => {
        setConfirmConfig({
            isOpen: true,
            title: 'Eliminar Automatización',
            message: `¿Estás seguro de que quieres eliminar la automatización "${name}"?`,
            action: async () => {
                await deleteAutomation(id);
                setConfirmConfig({ isOpen: false, title: '', message: '', action: null });
            },
            isDanger: true
        });
    };

    if (editingAutomation || isCreating) {
        return (
            <AutomationEditor
                automation={editingAutomation}
                boardId={boardId}
                context={context}
                onClose={handleCloseEditor}
                isInline={isInline}
            />
        );
    }

    // Modal mode wrapper
    if (!isInline) {
        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-[var(--bg-primary)] dark:bg-[#0f172a] rounded-2xl border border-[var(--border-subtle)] shadow-[var(--shadow-xl)] w-full max-w-4xl max-h-[85vh] flex flex-col">
                    {/* Modal Header */}
                    <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                                <span className="text-xl">⚡</span>
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-[var(--text-primary)]">Automatizaciones</h2>
                                <p className="text-xs text-[var(--text-secondary)]">Automatiza tu flujo de trabajo</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
                        >
                            <span className="material-symbols-outlined text-[var(--text-secondary)] text-[18px]">close</span>
                        </button>
                    </div>

                    {/* Modal Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        <AutomationGrid
                            automations={automations}
                            loading={loading}
                            onEdit={handleEdit}
                            onCreate={handleCreate}
                            onToggle={toggleAutomation}
                            onDuplicate={duplicateAutomation}
                            onDelete={handleDelete}
                        />
                    </div>
                </div>

                <ConfirmationModal
                    isOpen={confirmConfig.isOpen}
                    onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
                    onConfirm={confirmConfig.action}
                    title={confirmConfig.title}
                    message={confirmConfig.message}
                    confirmText="Eliminar"
                    cancelText="Cancelar"
                    isDanger={confirmConfig.isDanger}
                />
            </div>
        );
    }

    // Inline mode - just the grid
    return (
        <div className="h-full">
            <AutomationGrid
                automations={automations}
                loading={loading}
                onEdit={handleEdit}
                onCreate={handleCreate}
                onToggle={toggleAutomation}
                onDuplicate={duplicateAutomation}
                onDelete={handleDelete}
            />

            <ConfirmationModal
                isOpen={confirmConfig.isOpen}
                onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
                onConfirm={confirmConfig.action}
                title={confirmConfig.title}
                message={confirmConfig.message}
                confirmText="Eliminar"
                cancelText="Cancelar"
                isDanger={confirmConfig.isDanger}
            />
        </div>
    );
};

// Automation Grid Component
const AutomationGrid = ({ automations, loading, onEdit, onCreate, onToggle, onDuplicate, onDelete }) => {
    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (automations.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-20 h-20 rounded-2xl bg-[var(--bg-secondary)] dark:bg-slate-800/50 flex items-center justify-center mb-6">
                    <span className="text-4xl">🤖</span>
                </div>
                <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                    Sin automatizaciones
                </h3>
                <p className="text-sm text-[var(--text-secondary)] mb-8 max-w-sm">
                    Crea tu primera automatización para ahorrar tiempo en tareas repetitivas
                </p>
                <button
                    onClick={onCreate}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-indigo-500/20"
                >
                    <span className="material-symbols-outlined text-[20px]">add</span>
                    Crear Automatización
                </button>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {automations.map((automation) => (
                <AutomationCard
                    key={automation.id}
                    automation={automation}
                    onEdit={() => onEdit(automation)}
                    onToggle={() => onToggle(automation.id)}
                    onDuplicate={() => onDuplicate(automation.id)}
                    onDelete={() => onDelete(automation.id, automation.name)}
                />
            ))}

            {/* Create from Template Card */}
            <div
                onClick={onCreate}
                className="group bg-[var(--bg-secondary)]/30 hover:bg-[var(--bg-secondary)]/50 dark:bg-slate-800/30 dark:hover:bg-slate-800/50 rounded-2xl border-2 border-dashed border-[var(--border-default)] hover:border-indigo-500/50 p-6 cursor-pointer transition-all flex flex-col items-center justify-center min-h-[200px]"
            >
                <div className="w-12 h-12 rounded-xl bg-[var(--bg-tertiary)] dark:bg-slate-700/50 group-hover:bg-indigo-500/20 flex items-center justify-center mb-3 transition-colors">
                    <span className="material-symbols-outlined text-[var(--text-secondary)] group-hover:text-indigo-500 text-[28px] transition-colors">add</span>
                </div>
                <span className="text-[var(--text-primary)] font-medium mb-1">Crear desde cero</span>
                <span className="text-xs text-[var(--text-muted)] text-center">
                    Inicia rápidamente con una<br />automatización personalizada
                </span>
            </div>
        </div>
    );
};

// Icon color generator based on trigger type
const getIconColor = (triggerType) => {
    if (triggerType?.startsWith('opportunity')) return { bg: 'from-purple-500/20 to-pink-500/20', icon: 'text-purple-400' };
    if (triggerType?.startsWith('task')) return { bg: 'from-blue-500/20 to-cyan-500/20', icon: 'text-blue-400' };
    if (triggerType?.startsWith('event')) return { bg: 'from-green-500/20 to-emerald-500/20', icon: 'text-green-400' };
    if (triggerType?.startsWith('contact')) return { bg: 'from-amber-500/20 to-orange-500/20', icon: 'text-amber-400' };
    if (triggerType?.startsWith('schedule')) return { bg: 'from-indigo-500/20 to-violet-500/20', icon: 'text-indigo-400' };
    return { bg: 'from-slate-500/20 to-slate-400/20', icon: 'text-slate-400' };
};

// Format last run time
const formatLastRun = (lastRun) => {
    if (!lastRun) return null;

    const date = new Date(lastRun);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;

    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
};

// Modern Automation Card
const AutomationCard = ({ automation, onEdit, onToggle, onDuplicate, onDelete }) => {
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = React.useRef(null);
    const trigger = TriggerRegistry.get(automation.trigger_type);
    const colors = getIconColor(automation.trigger_type);

    React.useEffect(() => {
        if (!showMenu) return;
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setShowMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showMenu]);

    const getStatusBadge = () => {
        if (automation.last_error) {
            return (
                <span className="px-2 py-1 bg-red-500/20 text-red-400 text-[11px] font-medium rounded-full">
                    Error
                </span>
            );
        }
        return automation.is_enabled ? (
            <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-[11px] font-medium rounded-full">
                Activo
            </span>
        ) : (
            <span className="px-2 py-1 bg-slate-500/20 text-slate-400 text-[11px] font-medium rounded-full">
                Pausado
            </span>
        );
    };

    return (
        <div
            className={`
                bg-[var(--bg-secondary)] dark:bg-slate-800/50 hover:bg-[var(--bg-tertiary)] dark:hover:bg-slate-800/70 rounded-2xl border border-[var(--border-subtle)] 
                hover:border-indigo-500/30 p-5 transition-all cursor-pointer group relative shadow-[var(--shadow-sm)]
            `}
            onClick={onEdit}
        >
            {/* Menu Button */}
            <div
                ref={menuRef}
                className="absolute top-3 right-3"
                onClick={e => e.stopPropagation()}
            >
                <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="w-8 h-8 rounded-lg hover:bg-[var(--bg-tertiary)] dark:hover:bg-slate-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <span className="material-symbols-outlined text-[var(--text-secondary)] text-[20px]">more_vert</span>
                </button>

                {showMenu && (
                    <div className="absolute right-0 top-full mt-1 w-44 bg-[var(--bg-secondary)] dark:bg-slate-800 rounded-xl border border-[var(--border-default)] shadow-[var(--shadow-xl)] z-20 py-1 overflow-hidden">
                        <button
                            onClick={() => { onEdit(); setShowMenu(false); }}
                            className="w-full px-4 py-2.5 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] dark:hover:bg-slate-700 flex items-center gap-3"
                        >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                            Editar
                        </button>
                        <button
                            onClick={() => { onDuplicate(); setShowMenu(false); }}
                            className="w-full px-4 py-2.5 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] dark:hover:bg-slate-700 flex items-center gap-3"
                        >
                            <span className="material-symbols-outlined text-[18px]">content_copy</span>
                            Duplicar
                        </button>
                        <div className="h-px bg-[var(--border-subtle)] my-1" />
                        <button
                            onClick={() => { onDelete(); setShowMenu(false); }}
                            className="w-full px-4 py-2.5 text-left text-sm text-red-500 hover:bg-[var(--bg-tertiary)] dark:hover:bg-slate-700 flex items-center gap-3"
                        >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                            Eliminar
                        </button>
                    </div>
                )}
            </div>

            {/* Icon */}
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors.bg} flex items-center justify-center mb-4`}>
                <span className="text-2xl">{automation.icon || trigger?.icon || '⚡'}</span>
            </div>

            {/* Title & Description */}
            <h3 className="font-semibold text-[var(--text-primary)] text-base mb-1 pr-8 line-clamp-1">
                {automation.name}
            </h3>
            <p className="text-sm text-[var(--text-secondary)] mb-4 line-clamp-2 min-h-[40px]">
                {automation.description || trigger?.description || 'Sin descripción'}
            </p>

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)]">
                <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Última ejecución</span>
                    <span className="text-xs text-[var(--text-secondary)]">
                        {formatLastRun(automation.last_run_at) || 'Nunca'}
                    </span>
                </div>

                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    {getStatusBadge()}

                    {/* Toggle */}
                    <button
                        onClick={(e) => { e.stopPropagation(); onToggle(); }}
                        className={`
                            relative w-11 h-6 rounded-full transition-colors
                            ${automation.is_enabled ? 'bg-indigo-600' : 'bg-slate-700'}
                        `}
                    >
                        <div
                            className={`
                                absolute top-1 w-4 h-4 rounded-full bg-white transition-transform shadow-sm
                                ${automation.is_enabled ? 'left-6' : 'left-1'}
                            `}
                        />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AutomationList;
