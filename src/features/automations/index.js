/**
 * AUTOMATIONS FEATURE - INDEX
 * Exporta todos los módulos del sistema de automatizaciones
 */

// Engine
export { AutomationEngine } from './engine/AutomationEngine';
export { TriggerRegistry } from './engine/TriggerRegistry';
export { ActionRegistry } from './engine/ActionRegistry';
export { ConditionEvaluator } from './engine/ConditionEvaluator';
export { VariableResolver } from './engine/VariableResolver';

// Hooks
export { useAutomations } from './hooks/useAutomations';

// Components
export { default as AutomationList } from './components/AutomationList';
export { default as AutomationEditor } from './components/AutomationEditor';
export { default as TriggerSelector } from './components/TriggerSelector';
export { default as ActionBuilder } from './components/ActionBuilder';
export { default as ConditionBuilder } from './components/ConditionBuilder';
