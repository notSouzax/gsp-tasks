/**
 * ACTION BUILDER
 * Constructor visual de acciones para automatizaciones
 */

import React, { useState, useEffect } from 'react';
import { ActionRegistry } from '../engine/ActionRegistry';
import { VariableResolver } from '../engine/VariableResolver';
import { supabase } from '../../../lib/supabaseClient';

const ActionBuilder = ({ actions, onChange, boardId, onMenuToggle }) => {
    const groupedActions = ActionRegistry.getGrouped();
    const categoryNames = ActionRegistry.getCategoryNames();
    const [columns, setColumns] = useState([]);
    const [showAddMenu, setShowAddMenu] = useState(false);

    // Notify parent when menu opens/closes
    const toggleMenu = (open) => {
        setShowAddMenu(open);
        onMenuToggle?.(open);
    };

    // Cargar columnas
    useEffect(() => {
        const loadColumns = async () => {
            if (!boardId) return;
            const { data } = await supabase
                .from('columns')
                .select('id, title')
                .eq('board_id', boardId)
                .order('position');
            setColumns(data || []);
        };
        loadColumns();
    }, [boardId]);

    const addAction = (type) => {
        const action = ActionRegistry.get(type);
        const newAction = {
            id: crypto.randomUUID(),
            type,
            config: {}
        };

        // Set defaults
        action?.configFields?.forEach(field => {
            if (field.default !== undefined) {
                newAction.config[field.key] = field.default;
            }
        });

        onChange([...actions, newAction]);
        toggleMenu(false);
    };

    const updateAction = (index, updates) => {
        const newActions = [...actions];
        newActions[index] = { ...newActions[index], ...updates };
        onChange(newActions);
    };

    const removeAction = (index) => {
        onChange(actions.filter((_, i) => i !== index));
    };

    const moveAction = (index, direction) => {
        const newActions = [...actions];
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= newActions.length) return;

        [newActions[index], newActions[targetIndex]] = [newActions[targetIndex], newActions[index]];
        onChange(newActions);
    };

    return (
        <div className="space-y-3">
            {/* Actions List */}
            {actions.map((action, index) => (
                <ActionCard
                    key={action.id || index}
                    action={action}
                    index={index}
                    total={actions.length}
                    columns={columns}
                    onUpdate={(updates) => updateAction(index, updates)}
                    onRemove={() => removeAction(index)}
                    onMoveUp={() => moveAction(index, -1)}
                    onMoveDown={() => moveAction(index, 1)}
                />
            ))}

            {/* Add Action Button */}
            <div className="relative">
                <button
                    onClick={() => toggleMenu(!showAddMenu)}
                    className="w-full py-3 border-2 border-dashed border-slate-700 hover:border-indigo-500/50 rounded-xl text-slate-400 hover:text-indigo-400 transition-all flex items-center justify-center gap-2"
                >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    Añadir Acción
                </button>

                {showAddMenu && (
                    <>
                        <div className="fixed inset-0 z-10" onClick={() => toggleMenu(false)} />
                        <div className="absolute left-0 right-0 top-full mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-20 p-3 max-h-80 overflow-y-auto">
                            {/* Header con botón cerrar */}
                            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-700">
                                <span className="text-sm font-medium text-slate-300">Seleccionar acción</span>
                                <button
                                    onClick={() => toggleMenu(false)}
                                    className="w-6 h-6 rounded-lg hover:bg-slate-700 flex items-center justify-center transition-colors"
                                >
                                    <span className="material-symbols-outlined text-slate-400 text-[16px]">close</span>
                                </button>
                            </div>
                            {Object.entries(groupedActions).map(([category, categoryActions]) => (
                                <div key={category} className="mb-3 last:mb-0">
                                    <div className="text-xs font-medium text-slate-500 uppercase mb-2">
                                        {categoryNames[category]}
                                    </div>
                                    <div className="space-y-1">
                                        {categoryActions.map(action => (
                                            <button
                                                key={action.type}
                                                onClick={() => addAction(action.type)}
                                                className="w-full p-2 hover:bg-slate-700/50 rounded-lg text-left flex items-center gap-2 transition-colors"
                                            >
                                                <span>{action.icon}</span>
                                                <div>
                                                    <span className="text-sm text-white">{action.name}</span>
                                                    <p className="text-xs text-slate-500 line-clamp-1">{action.description}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

// Tarjeta de acción individual
const ActionCard = ({ action, index, total, columns, onUpdate, onRemove, onMoveUp, onMoveDown }) => {
    const actionDef = ActionRegistry.get(action.type);
    const [expanded, setExpanded] = useState(true);
    const [showVariables, setShowVariables] = useState(false);

    const updateConfig = (key, value) => {
        onUpdate({ config: { ...action.config, [key]: value } });
    };

    return (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
            {/* Header */}
            <div
                className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-slate-700/30 transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">
                    {index + 1}
                </div>
                <span className="text-lg">{actionDef?.icon}</span>
                <span className="font-medium text-white flex-1">{actionDef?.name}</span>

                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    {index > 0 && (
                        <button
                            onClick={onMoveUp}
                            className="w-6 h-6 rounded hover:bg-slate-600 flex items-center justify-center"
                        >
                            <span className="material-symbols-outlined text-slate-400 text-[14px]">arrow_upward</span>
                        </button>
                    )}
                    {index < total - 1 && (
                        <button
                            onClick={onMoveDown}
                            className="w-6 h-6 rounded hover:bg-slate-600 flex items-center justify-center"
                        >
                            <span className="material-symbols-outlined text-slate-400 text-[14px]">arrow_downward</span>
                        </button>
                    )}
                    <button
                        onClick={onRemove}
                        className="w-6 h-6 rounded hover:bg-red-500/20 flex items-center justify-center"
                    >
                        <span className="material-symbols-outlined text-red-400 text-[14px]">delete</span>
                    </button>
                </div>

                <span className="material-symbols-outlined text-slate-500 text-[18px]">
                    {expanded ? 'expand_less' : 'expand_more'}
                </span>
            </div>

            {/* Config Fields */}
            {expanded && actionDef?.configFields?.length > 0 && (
                <div className="px-4 pb-4 pt-1 space-y-3 border-t border-slate-700/50">
                    {actionDef.configFields.map(field => (
                        <ActionConfigField
                            key={field.key}
                            field={field}
                            value={action.config[field.key]}
                            onChange={(value) => updateConfig(field.key, value)}
                            columns={columns}
                            onShowVariables={() => setShowVariables(!showVariables)}
                        />
                    ))}

                    {/* Variables Helper */}
                    {showVariables && (
                        <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                            <div className="text-xs font-medium text-slate-400 mb-2">Variables disponibles:</div>
                            <div className="flex flex-wrap gap-1">
                                {VariableResolver.getAvailableVariables().slice(0, 10).map(v => (
                                    <code
                                        key={v.path}
                                        className="px-2 py-0.5 bg-slate-800 text-indigo-300 text-xs rounded cursor-pointer hover:bg-indigo-500/20"
                                        onClick={() => navigator.clipboard.writeText(`{{${v.path}}}`)}
                                        title={v.label}
                                    >
                                        {`{{${v.path}}}`}
                                    </code>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// Campo de configuración para acciones
const ActionConfigField = ({ field, value, onChange, columns, onShowVariables }) => {
    switch (field.type) {
        case 'column_select':
            return (
                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                        {field.label}
                        {field.required && <span className="text-red-400 ml-1">*</span>}
                    </label>
                    <select
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:border-indigo-500 focus:outline-none"
                    >
                        <option value="">Seleccionar...</option>
                        {columns.map(col => (
                            <option key={col.id} value={col.id}>{col.title}</option>
                        ))}
                    </select>
                </div>
            );

        case 'select':
            return (
                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                        {field.label}
                        {field.required && <span className="text-red-400 ml-1">*</span>}
                    </label>
                    <select
                        value={value || field.default || ''}
                        onChange={(e) => onChange(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:border-indigo-500 focus:outline-none"
                    >
                        {field.options?.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                </div>
            );

        case 'textarea':
            return (
                <div>
                    <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-slate-400">
                            {field.label}
                            {field.required && <span className="text-red-400 ml-1">*</span>}
                        </label>
                        <button
                            onClick={onShowVariables}
                            className="text-xs text-indigo-400 hover:text-indigo-300"
                        >
                            + Variables
                        </button>
                    </div>
                    <textarea
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        rows={3}
                        placeholder={field.placeholder || `Usa {{task.title}} para variables`}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:border-indigo-500 focus:outline-none resize-none"
                    />
                </div>
            );

        case 'number':
            return (
                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                        {field.label}
                        {field.required && <span className="text-red-400 ml-1">*</span>}
                    </label>
                    <input
                        type="number"
                        value={value ?? field.default ?? ''}
                        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:border-indigo-500 focus:outline-none"
                    />
                </div>
            );

        case 'text':
        default:
            return (
                <div>
                    <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-slate-400">
                            {field.label}
                            {field.required && <span className="text-red-400 ml-1">*</span>}
                        </label>
                        <button
                            onClick={onShowVariables}
                            className="text-xs text-indigo-400 hover:text-indigo-300"
                        >
                            + Variables
                        </button>
                    </div>
                    <input
                        type="text"
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={field.placeholder || `Usa {{task.title}} para variables`}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                    />
                </div>
            );
    }
};

export default ActionBuilder;
