/**
 * AUTOMATION EDITOR
 * Editor visual para crear/editar automatizaciones
 */

import React, { useState } from 'react';
import { useAutomations } from '../hooks/useAutomations';
import TriggerSelector from './TriggerSelector';
import ActionBuilder from './ActionBuilder';
import ConditionBuilder from './ConditionBuilder';
import { TriggerRegistry } from '../engine/TriggerRegistry';
import { ActionRegistry } from '../engine/ActionRegistry';
import toast from 'react-hot-toast';

const AutomationEditor = ({ automation, boardId, onClose, context = 'boards', isInline = false }) => {
    const { createAutomation, updateAutomation } = useAutomations(boardId, context);
    const isEditing = !!automation;

    // Form state
    const [name, setName] = useState(automation?.name || '');
    const [icon, setIcon] = useState(automation?.icon || '⚡');
    const [triggerType, setTriggerType] = useState(automation?.trigger_type || '');
    const [triggerConfig, setTriggerConfig] = useState(automation?.trigger_config || {});
    const [conditions, setConditions] = useState(automation?.conditions || []);
    const [conditionLogic, setConditionLogic] = useState(automation?.condition_logic || 'AND');
    const [actions, setActions] = useState(automation?.actions || []);
    const [isEnabled, setIsEnabled] = useState(automation?.is_enabled !== false);

    const [saving, setSaving] = useState(false);
    const [activeStep, setActiveStep] = useState(automation ? 'review' : 'trigger');
    const [actionMenuOpen, setActionMenuOpen] = useState(false);

    // Validate form
    const isValid = name.trim() && triggerType && actions.length > 0;

    const handleSave = async () => {
        if (!isValid) {
            toast.error('Completa todos los campos requeridos');
            return;
        }

        setSaving(true);
        try {
            const data = {
                name: name.trim(),
                icon,
                trigger_type: triggerType,
                trigger_config: triggerConfig,
                conditions,
                condition_logic: conditionLogic,
                actions,
                is_enabled: isEnabled
            };

            if (isEditing) {
                await updateAutomation(automation.id, data);
                toast.success('Automatización actualizada');
            } else {
                await createAutomation(data);
                toast.success('Automatización creada');
            }
            onClose();
        } catch (error) {
            toast.error('Error: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const selectedTrigger = TriggerRegistry.get(triggerType);

    // Wrapper classes based on inline mode
    const wrapperClass = isInline
        ? "flex-1 flex flex-col h-full overflow-hidden"
        : "fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4";

    const containerClass = isInline
        ? `flex-1 flex flex-col h-full overflow-hidden ${actionMenuOpen ? 'min-h-[60vh]' : ''}`
        : `bg-[#0f172a] rounded-2xl border border-slate-700/50 shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col ${actionMenuOpen ? 'min-h-[60vh]' : ''}`;

    return (
        <div className={wrapperClass}>
            <div className={containerClass} style={{ transition: 'min-height 500ms cubic-bezier(0.4, 0, 0.2, 1)' }}>

                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors"
                        >
                            <span className="material-symbols-outlined text-slate-400 text-[18px]">arrow_back</span>
                        </button>
                        <div>
                            <h2 className="text-lg font-bold text-white">
                                {isEditing ? 'Editar' : 'Nueva'} Automatización
                            </h2>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <span className="text-sm text-slate-400">Activa</span>
                            <div
                                onClick={() => setIsEnabled(!isEnabled)}
                                className={`w-10 h-6 rounded-full transition-colors ${isEnabled ? 'bg-indigo-600' : 'bg-slate-700'} relative`}
                            >
                                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${isEnabled ? 'left-5' : 'left-1'}`} />
                            </div>
                        </label>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6 custom-scrollbar">

                    {/* Name & Icon */}
                    <div className="flex gap-3">
                        <div className="relative">
                            <button
                                className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl hover:border-slate-600 transition-colors"
                                onClick={() => {
                                    const icons = ['⚡', '🔔', '📧', '🚀', '✨', '🎯', '💰', '📋', '🔗', '⏰'];
                                    const currentIndex = icons.indexOf(icon);
                                    setIcon(icons[(currentIndex + 1) % icons.length]);
                                }}
                            >
                                {icon}
                            </button>
                        </div>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Nombre de la automatización..."
                            className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none transition-colors"
                        />
                    </div>

                    {/* Step 1: Trigger */}
                    <section className="space-y-3">
                        <div
                            className="flex items-center gap-2 cursor-pointer"
                            onClick={() => setActiveStep(activeStep === 'trigger' ? '' : 'trigger')}
                        >
                            <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold">
                                1
                            </div>
                            <span className="font-semibold text-white">CUANDO</span>
                            {triggerType && (
                                <span className="text-sm text-slate-400">
                                    — {selectedTrigger?.name}
                                </span>
                            )}
                            <span className="material-symbols-outlined text-slate-500 text-[18px] ml-auto">
                                {activeStep === 'trigger' ? 'expand_less' : 'expand_more'}
                            </span>
                        </div>

                        {activeStep === 'trigger' && (
                            <TriggerSelector
                                selectedType={triggerType}
                                config={triggerConfig}
                                onSelect={(type) => {
                                    setTriggerType(type);
                                    setTriggerConfig({});
                                }}
                                onConfigChange={setTriggerConfig}
                                boardId={boardId}
                                context={context}
                            />
                        )}
                    </section>

                    {/* Step 2: Conditions (Optional) */}
                    {triggerType && (
                        <section className="space-y-3">
                            <div
                                className="flex items-center gap-2 cursor-pointer"
                                onClick={() => setActiveStep(activeStep === 'conditions' ? '' : 'conditions')}
                            >
                                <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">
                                    2
                                </div>
                                <span className="font-semibold text-white">SI</span>
                                <span className="text-xs text-slate-500">(opcional)</span>
                                {conditions.length > 0 && (
                                    <span className="text-sm text-slate-400">
                                        — {conditions.length} condiciones
                                    </span>
                                )}
                                <span className="material-symbols-outlined text-slate-500 text-[18px] ml-auto">
                                    {activeStep === 'conditions' ? 'expand_less' : 'expand_more'}
                                </span>
                            </div>

                            {activeStep === 'conditions' && (
                                <ConditionBuilder
                                    conditions={conditions}
                                    logic={conditionLogic}
                                    onChange={setConditions}
                                    onLogicChange={setConditionLogic}
                                />
                            )}
                        </section>
                    )}

                    {/* Step 3: Actions */}
                    {triggerType && (
                        <section className="space-y-3">
                            <div
                                className="flex items-center gap-2 cursor-pointer"
                                onClick={() => setActiveStep(activeStep === 'actions' ? '' : 'actions')}
                            >
                                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">
                                    3
                                </div>
                                <span className="font-semibold text-white">ENTONCES</span>
                                {actions.length > 0 && (
                                    <span className="text-sm text-slate-400">
                                        — {actions.length} acciones
                                    </span>
                                )}
                                <span className="material-symbols-outlined text-slate-500 text-[18px] ml-auto">
                                    {activeStep === 'actions' ? 'expand_less' : 'expand_more'}
                                </span>
                            </div>

                            {activeStep === 'actions' && (
                                <ActionBuilder
                                    actions={actions}
                                    onChange={setActions}
                                    boardId={boardId}
                                    onMenuToggle={setActionMenuOpen}
                                />
                            )}
                        </section>
                    )}

                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-700/50 flex items-center justify-between">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!isValid || saving}
                        className={`
                            px-6 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2
                            ${isValid
                                ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                            }
                        `}
                    >
                        {saving ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Guardando...
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-[18px]">check</span>
                                {isEditing ? 'Guardar Cambios' : 'Crear Automatización'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AutomationEditor;
