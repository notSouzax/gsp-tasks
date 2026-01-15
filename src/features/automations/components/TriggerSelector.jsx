/**
 * TRIGGER SELECTOR
 * Selector visual de triggers para automatizaciones
 */

import React, { useState, useEffect } from 'react';
import { TriggerRegistry } from '../engine/TriggerRegistry';
import { supabase } from '../../../lib/supabaseClient';

const TriggerSelector = ({ selectedType, config, onSelect, onConfigChange, boardId, context = 'boards' }) => {
    // Use context-filtered triggers instead of all triggers
    const triggers = TriggerRegistry.getByContext(context);

    // Get grouped triggers based on context
    const getGroupedByContext = () => {
        const grouped = TriggerRegistry.getGrouped();
        switch (context) {
            case 'crm':
                return { crm: grouped.crm };
            case 'calendar':
                return { calendar: grouped.calendar };
            default: // boards
                return {
                    movement: grouped.movement,
                    creation: grouped.creation,
                    temporal: grouped.temporal,
                    scheduled: grouped.scheduled,
                    progress: grouped.progress
                };
        }
    };

    const grouped = getGroupedByContext();
    const [columns, setColumns] = useState([]);

    // Cargar columnas para selectores
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

    const categoryNames = {
        movement: { name: 'Movimiento', icon: '🔄' },
        creation: { name: 'Creación/Edición', icon: '✏️' },
        temporal: { name: 'Temporales', icon: '⏰' },
        scheduled: { name: 'Programados', icon: '📅' },
        progress: { name: 'Progreso', icon: '📊' },
        crm: { name: 'CRM', icon: '🤝' },
        calendar: { name: 'Calendario', icon: '📅' }
    };

    const selectedTrigger = triggers.find(t => t.type === selectedType);

    return (
        <div className="space-y-4">
            {/* Trigger Selection */}
            {!selectedType ? (
                <div className="space-y-4">
                    {Object.entries(grouped).map(([category, triggerTypes]) => (
                        <div key={category}>
                            <div className="flex items-center gap-2 mb-2">
                                <span>{categoryNames[category]?.icon}</span>
                                <span className="text-xs font-medium text-slate-400 uppercase">
                                    {categoryNames[category]?.name}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 items-start">
                                {triggerTypes.map(type => {
                                    const trigger = triggers.find(t => t.type === type);
                                    if (!trigger) return null;

                                    return (
                                        <button
                                            key={type}
                                            onClick={() => onSelect(type)}
                                            className="p-3 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 hover:border-indigo-500/50 rounded-xl text-left transition-all group"
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-lg">{trigger.icon}</span>
                                                <span className="font-medium text-white text-sm">{trigger.name}</span>
                                            </div>
                                            <p className="text-xs text-slate-500 line-clamp-1">
                                                {trigger.description}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                /* Selected Trigger + Config */
                <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl">
                        <span className="text-2xl">{selectedTrigger?.icon}</span>
                        <div className="flex-1">
                            <span className="font-medium text-white">{selectedTrigger?.name}</span>
                            <p className="text-xs text-slate-400">{selectedTrigger?.description}</p>
                        </div>
                        <button
                            onClick={() => onSelect('')}
                            className="w-8 h-8 rounded-lg hover:bg-slate-700/50 flex items-center justify-center"
                        >
                            <span className="material-symbols-outlined text-slate-400 text-[16px]">close</span>
                        </button>
                    </div>

                    {/* Config Fields */}
                    {selectedTrigger?.configFields?.length > 0 && (
                        <div className="space-y-3 pl-4 border-l-2 border-slate-700">
                            {selectedTrigger.configFields.map(field => (
                                <ConfigField
                                    key={field.key}
                                    field={field}
                                    value={config[field.key]}
                                    onChange={(value) => onConfigChange({ ...config, [field.key]: value })}
                                    columns={columns}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// Campo de configuración dinámico
const ConfigField = ({ field, value, onChange, columns }) => {
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
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:border-indigo-500 focus:outline-none"
                    >
                        <option value="">Seleccionar columna...</option>
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
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:border-indigo-500 focus:outline-none"
                    >
                        {field.options?.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
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
                        value={value || field.default || ''}
                        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:border-indigo-500 focus:outline-none"
                    />
                </div>
            );

        case 'text':
        default:
            return (
                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                        {field.label}
                        {field.required && <span className="text-red-400 ml-1">*</span>}
                    </label>
                    <input
                        type="text"
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={field.placeholder}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                    />
                </div>
            );
    }
};

export default TriggerSelector;
