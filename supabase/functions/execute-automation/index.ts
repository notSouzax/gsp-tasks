import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

serve(async (req) => {
    // CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
            }
        });
    }

    try {
        const { trigger_type, record, old_record, user_id, table_name, operation } = await req.json();

        console.log(`🔔 Automation trigger: ${trigger_type} on ${table_name} (${operation})`);

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // 1. Buscar automations activas con este trigger_type
        const { data: automations, error: fetchError } = await supabase
            .from('automations')
            .select('*')
            .eq('trigger_type', trigger_type)
            .eq('is_enabled', true)
            .eq('user_id', user_id);

        if (fetchError) {
            console.error('Error fetching automations:', fetchError);
            throw fetchError;
        }

        if (!automations || automations.length === 0) {
            console.log(`No active automations for trigger: ${trigger_type}`);
            return new Response(JSON.stringify({ success: true, message: 'No automations to run' }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        console.log(`Found ${automations.length} automation(s) to evaluate`);

        const results = [];

        // 2. Ejecutar cada automatización
        for (const automation of automations) {
            try {
                console.log(`Evaluating automation: ${automation.name}`);

                // 3. Evaluar condiciones
                const conditionsPassed = evaluateConditions(
                    automation.conditions || [],
                    record,
                    old_record
                );

                if (!conditionsPassed) {
                    console.log(`Conditions not met for: ${automation.name}`);
                    continue;
                }

                console.log(`Conditions passed for: ${automation.name}, executing actions...`);

                // 4. Ejecutar acciones
                const context = {
                    trigger_type,
                    record,
                    old_record,
                    user_id,
                    table_name
                };

                await executeActions(automation.actions || [], context, supabase);

                // 5. Log de ejecución exitosa
                await supabase.from('automation_logs').insert({
                    automation_id: automation.id,
                    trigger_data: { trigger_type, record, old_record },
                    actions_executed: automation.actions,
                    status: 'success'
                });

                results.push({
                    automation_id: automation.id,
                    automation_name: automation.name,
                    status: 'success'
                });

            } catch (error) {
                console.error(`Error executing automation ${automation.name}:`, error);

                // Log de error
                await supabase.from('automation_logs').insert({
                    automation_id: automation.id,
                    trigger_data: { trigger_type, record, old_record },
                    actions_executed: [],
                    status: 'failed',
                    error_message: error.message
                });

                results.push({
                    automation_id: automation.id,
                    automation_name: automation.name,
                    status: 'error',
                    error: error.message
                });
            }
        }

        return new Response(JSON.stringify({ success: true, results }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error in execute-automation:', error);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});

// =====================================================
// CONDITION EVALUATION
// =====================================================

function evaluateConditions(conditions, record, oldRecord) {
    if (!conditions || conditions.length === 0) {
        return true; // No conditions = always pass
    }

    // Conditions are in format: { operator: 'AND'|'OR', conditions: [...] }
    const operator = conditions[0]?.operator || 'AND';
    const conditionList = conditions[0]?.conditions || conditions;

    if (operator === 'OR') {
        return conditionList.some(cond => evaluateSingleCondition(cond, record, oldRecord));
    } else {
        return conditionList.every(cond => evaluateSingleCondition(cond, record, oldRecord));
    }
}

function evaluateSingleCondition(condition, record, oldRecord) {
    const { field, operator, value } = condition;

    // Get field value from record
    const fieldValue = getFieldValue(record, field);

    switch (operator) {
        case 'equals':
            return fieldValue == value;
        case 'not_equals':
            return fieldValue != value;
        case 'contains':
            return String(fieldValue).toLowerCase().includes(String(value).toLowerCase());
        case 'not_contains':
            return !String(fieldValue).toLowerCase().includes(String(value).toLowerCase());
        case 'greater_than':
            return Number(fieldValue) > Number(value);
        case 'less_than':
            return Number(fieldValue) < Number(value);
        case 'is_empty':
            return !fieldValue || fieldValue === '' || fieldValue === null;
        case 'is_not_empty':
            return fieldValue && fieldValue !== '' && fieldValue !== null;
        case 'changed':
            return oldRecord && fieldValue !== getFieldValue(oldRecord, field);
        default:
            console.warn(`Unknown operator: ${operator}`);
            return false;
    }
}

function getFieldValue(obj, path) {
    const keys = path.split('.');
    let value = obj;
    for (const key of keys) {
        value = value?.[key];
    }
    return value;
}

// =====================================================
// ACTION EXECUTION
// =====================================================

async function executeActions(actions, context, supabase) {
    for (const action of actions) {
        try {
            console.log(`Executing action: ${action.type}`);

            switch (action.type) {
                case 'send_email':
                    await executeSendEmail(action.config, context, supabase);
                    break;

                case 'webhook':
                    await executeWebhook(action.config, context);
                    break;

                case 'in_app_notification':
                    await executeInAppNotification(action.config, context, supabase);
                    break;

                case 'add_comment':
                    await executeAddComment(action.config, context, supabase);
                    break;

                case 'move_task':
                    await executeMoveTask(action.config, context, supabase);
                    break;

                case 'update_task':
                    await executeUpdateTask(action.config, context, supabase);
                    break;

                default:
                    console.log(`Unknown action type: ${action.type}`);
            }
        } catch (error) {
            console.error(`Error executing action ${action.type}:`, error);
            // Continue with next action even if one fails
        }
    }
}

// Action implementations

async function executeSendEmail(config, context, supabase) {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-automation-email`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({
            to: config.to,
            subject: replaceVariables(config.subject, context),
            body: replaceVariables(config.body || config.text, context),
            format: config.format || 'text'
        })
    });

    if (!response.ok) {
        throw new Error(`Failed to send email: ${response.statusText}`);
    }
}

async function executeWebhook(config, context) {
    let headers = {
        'Content-Type': 'application/json',
        ...(config.headers || {})
    };

    // Add authentication if configured
    if (config.authType && config.authType !== 'none' && config.authToken) {
        switch (config.authType) {
            case 'bearer':
                headers['Authorization'] = `Bearer ${config.authToken}`;
                break;
            case 'basic':
                headers['Authorization'] = `Basic ${btoa(config.authToken)}`;
                break;
            case 'api_key':
                headers['X-API-Key'] = config.authToken;
                break;
        }
    }

    const body = config.body ? replaceVariables(config.body, context) : JSON.stringify(context.record);

    const response = await fetch(config.url, {
        method: config.method || 'POST',
        headers,
        body: config.method !== 'GET' ? body : undefined
    });

    if (!response.ok) {
        throw new Error(`Webhook failed: ${response.statusText}`);
    }
}

async function executeInAppNotification(config, context, supabase) {
    // Insert into notifications table (if exists)
    const { error } = await supabase.from('notifications').insert({
        user_id: context.user_id,
        message: replaceVariables(config.message, context),
        type: config.type || 'info',
        created_at: new Date().toISOString()
    });

    if (error && error.code !== '42P01') { // Ignore if table doesn't exist
        console.error('Error creating notification:', error);
    }
}

async function executeAddComment(config, context, supabase) {
    // Only works for task-related triggers
    const taskId = context.record?.id || context.record?.task_id;
    if (!taskId) {
        console.warn('No task_id available for add_comment action');
        return;
    }

    const { error } = await supabase.from('comments').insert({
        task_id: taskId,
        user_id: context.user_id,
        text: replaceVariables(config.text, context),
        created_at: new Date().toISOString()
    });

    if (error) {
        throw new Error(`Failed to add comment: ${error.message}`);
    }
}

async function executeMoveTask(config, context, supabase) {
    const taskId = context.record?.id;
    if (!taskId) return;

    const { error } = await supabase
        .from('tasks')
        .update({ column_id: config.columnId })
        .eq('id', taskId);

    if (error) {
        throw new Error(`Failed to move task: ${error.message}`);
    }
}

async function executeUpdateTask(config, context, supabase) {
    const taskId = context.record?.id;
    if (!taskId) return;

    const updates = {};
    updates[config.field] = config.value;

    const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId);

    if (error) {
        throw new Error(`Failed to update task: ${error.message}`);
    }
}

// Helper: Replace {{variable}} patterns in strings
function replaceVariables(text, context) {
    if (typeof text !== 'string') return text;

    return text.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
        const path = varName.trim().split('.');
        let value = context;

        for (const key of path) {
            value = value?.[key];
        }

        return value !== undefined ? String(value) : match;
    });
}
