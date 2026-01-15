/**
 * CONDITION BUILDER
 * Constructor visual de condiciones para automatizaciones
 */

import React from 'react';
import { ConditionEvaluator } from '../engine/ConditionEvaluator';

const ConditionBuilder = ({ conditions, logic, onChange, onLogicChange }) => {
    const availableFields = ConditionEvaluator.getAvailableFields();
    const availableOperators = ConditionEvaluator.getAvailableOperators();

    const addCondition = () => {
        onChange([
            ...conditions,
            {
                id: Date.now(),
                field: '',
                operator: 'equals',
                value: ''
            }
        ]);
    };

    const updateCondition = (index, updates) => {
        const newConditions = [...conditions];
        newConditions[index] = { ...newConditions[index], ...updates };
        onChange(newConditions);
    };

    const removeCondition = (index) => {
        onChange(conditions.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-3">
            {/* Logic Toggle */}
            {conditions.length > 1 && (
                <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-400">Cumplir</span>
                    <button
                        onClick={() => onLogicChange(logic === 'AND' ? 'OR' : 'AND')}
                        className={`px-3 py-1 rounded-lg font-medium transition-colors ${logic === 'AND'
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            }`}
                    >
                        {logic === 'AND' ? 'TODAS' : 'ALGUNA'}
                    </button>
                    <span className="text-slate-400">las condiciones</span>
                </div>
            )}

            {/* Conditions List */}
            {conditions.map((condition, index) => (
                <div key={condition.id || index} className="flex items-center gap-2">
                    {/* Field Select */}
                    <select
                        value={condition.field}
                        onChange={(e) => updateCondition(index, { field: e.target.value })}
                        className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:border-indigo-500 focus:outline-none"
                    >
                        <option value="">Campo...</option>
                        {availableFields.map(field => (
                            <option key={field.key} value={field.key}>
                                {field.label}
                            </option>
                        ))}
                    </select>

                    {/* Operator Select */}
                    <select
                        value={condition.operator}
                        onChange={(e) => updateCondition(index, { operator: e.target.value })}
                        className="w-32 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:border-indigo-500 focus:outline-none"
                    >
                        {availableOperators.map(op => (
                            <option key={op.key} value={op.key}>
                                {op.label}
                            </option>
                        ))}
                    </select>

                    {/* Value Input */}
                    {!['is_empty', 'is_not_empty', 'is_true', 'is_false'].includes(condition.operator) && (
                        <input
                            type="text"
                            value={condition.value}
                            onChange={(e) => updateCondition(index, { value: e.target.value })}
                            placeholder="Valor..."
                            className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                        />
                    )}

                    {/* Remove Button */}
                    <button
                        onClick={() => removeCondition(index)}
                        className="w-8 h-8 rounded-lg hover:bg-red-500/20 flex items-center justify-center"
                    >
                        <span className="material-symbols-outlined text-red-400 text-[16px]">close</span>
                    </button>
                </div>
            ))}

            {/* Add Condition Button */}
            <button
                onClick={addCondition}
                className="w-full py-2 border border-dashed border-slate-700 hover:border-blue-500/50 rounded-lg text-slate-400 hover:text-blue-400 transition-all flex items-center justify-center gap-2 text-sm"
            >
                <span className="material-symbols-outlined text-[16px]">add</span>
                Añadir Condición
            </button>

            {/* Helper Text */}
            {conditions.length === 0 && (
                <p className="text-xs text-slate-500 text-center">
                    Sin condiciones, la automatización se ejecutará siempre que coincida el trigger
                </p>
            )}
        </div>
    );
};

export default ConditionBuilder;
