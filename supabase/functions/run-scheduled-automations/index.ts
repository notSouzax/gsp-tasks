import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

serve(async (req) => {
    // CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
            }
        })
    }

    try {
        console.log('🕐 Running scheduled automations check...')

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        // 1. Obtener todos los triggers programados que deben ejecutarse
        const { data: triggers, error: fetchError } = await supabase
            .from('scheduled_trigger_state')
            .select(`
                *,
                automations (
                    id,
                    name,
                    trigger_type,
                    trigger_config,
                    conditions,
                    actions,
                    user_id,
                    is_enabled
                )
            `)
            .eq('is_active', true)
            .lte('next_run_at', new Date().toISOString())

        if (fetchError) {
            console.error('Error fetching triggers:', fetchError)
            throw fetchError
        }

        console.log(`Found ${triggers?.length || 0} triggers to run`)

        const results = []

        // 2. Ejecutar cada trigger
        for (const trigger of triggers || []) {
            const automation = trigger.automations

            if (!automation || !automation.is_enabled) {
                console.log(`Skipping disabled automation: ${trigger.id}`)
                continue
            }

            try {
                console.log(`Executing automation: ${automation.name} (${automation.trigger_type})`)

                // 3. Ejecutar las acciones de la automatización
                await executeAutomationActions(automation, trigger, supabase)

                // 4. Actualizar last_run y calcular next_run
                const nextRun = calculateNextRun(trigger)

                const { error: updateError } = await supabase
                    .from('scheduled_trigger_state')
                    .update({
                        last_run_at: new Date().toISOString(),
                        next_run_at: nextRun.toISOString(),
                        run_count: (trigger.run_count || 0) + 1,
                        last_error: null
                    })
                    .eq('id', trigger.id)

                if (updateError) {
                    console.error('Error updating trigger state:', updateError)
                }

                // 5. Log de ejecución
                await supabase.from('automation_logs').insert({
                    automation_id: automation.id,
                    trigger_data: {
                        trigger_type: automation.trigger_type,
                        scheduled_time: trigger.next_run_at,
                        executed_at: new Date().toISOString()
                    },
                    actions_executed: automation.actions,
                    status: 'success'
                })

                results.push({
                    automation_id: automation.id,
                    automation_name: automation.name,
                    status: 'success',
                    next_run: nextRun.toISOString()
                })

            } catch (error) {
                console.error(`Error executing automation ${automation.name}:`, error)

                // Registrar error
                await supabase
                    .from('scheduled_trigger_state')
                    .update({
                        last_error: error.message,
                        last_run_at: new Date().toISOString()
                    })
                    .eq('id', trigger.id)

                await supabase.from('automation_logs').insert({
                    automation_id: automation.id,
                    trigger_data: { error: error.message },
                    actions_executed: [],
                    status: 'failed',
                    error_message: error.message
                })

                results.push({
                    automation_id: automation.id,
                    automation_name: automation.name,
                    status: 'error',
                    error: error.message
                })
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                executed_count: results.length,
                results
            }),
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                }
            }
        )

    } catch (error) {
        console.error('Error in scheduled automations:', error)
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message
            }),
            {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                }
            }
        )
    }
})

// Función auxiliar: Ejecutar acciones de una automatización
async function executeAutomationActions(automation, trigger, supabase) {
    const context = {
        trigger: automation.trigger_type,
        triggerData: trigger,
        timestamp: new Date().toISOString()
    }

    // Para triggers de tareas (overdue/due_soon), primero obtener las tareas relevantes
    if (['task.overdue', 'task.due_soon'].includes(automation.trigger_type)) {
        const tasks = await getRelevantTasks(automation, trigger, supabase)

        // Ejecutar acciones para cada tarea
        for (const task of tasks) {
            context.task = task
            await executeActions(automation.actions, context, supabase)
        }
    } else {
        // Para triggers de calendario (daily/weekly/monthly), ejecutar una vez
        await executeActions(automation.actions, context, supabase)
    }
}

// Función auxiliar: Obtener tareas relevantes para triggers task.overdue o task.due_soon
async function getRelevantTasks(automation, trigger, supabase) {
    const now = new Date()
    let query = supabase.from('tasks').select('*').eq('user_id', automation.user_id)

    if (automation.trigger_type === 'task.overdue') {
        // Tareas con due_date en el pasado
        query = query.lt('due_date', now.toISOString()).is('completed_at', null)
    } else if (automation.trigger_type === 'task.due_soon') {
        // Tareas que vencen en las próximas X horas
        const hoursAhead = trigger.hours_before || 24
        const futureTime = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000)
        query = query
            .gte('due_date', now.toISOString())
            .lte('due_date', futureTime.toISOString())
            .is('completed_at', null)
    }

    const { data, error } = await query

    if (error) {
        console.error('Error fetching tasks:', error)
        return []
    }

    return data || []
}

// Función auxiliar: Ejecutar lista de acciones
async function executeActions(actions, context, supabase) {
    for (const action of actions) {
        try {
            console.log(`Executing action: ${action.type}`)

            // Aquí implementamos las acciones más comunes
            switch (action.type) {
                case 'send_email':
                    await executeSendEmail(action.config, context, supabase)
                    break

                case 'webhook':
                    await executeWebhook(action.config, context)
                    break

                case 'in_app_notification':
                    await executeInAppNotification(action.config, context, supabase)
                    break

                case 'add_comment':
                    if (context.task) {
                        await executeAddComment(action.config, context, supabase)
                    }
                    break

                case 'move_task':
                    if (context.task) {
                        await executeMoveTask(action.config, context, supabase)
                    }
                    break

                case 'update_task':
                    if (context.task) {
                        await executeUpdateTask(action.config, context, supabase)
                    }
                    break

                default:
                    console.log(`Unknown action type: ${action.type}`)
            }
        } catch (error) {
            console.error(`Error executing action ${action.type}:`, error)
            // Continuar con la siguiente acción
        }
    }
}

// Implementaciones de acciones individuales

async function executeSendEmail(config, context, supabase) {
    // Llamar a la Edge Function send-automation-email
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-automation-email`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({
            to: config.to,
            subject: replaceVariables(config.subject, context),
            body: replaceVariables(config.body, context),
            format: config.format || 'text'
        })
    })

    if (!response.ok) {
        throw new Error(`Failed to send email: ${response.statusText}`)
    }
}

async function executeWebhook(config, context) {
    const response = await fetch(config.url, {
        method: config.method || 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(config.headers || {})
        },
        body: JSON.stringify(replaceVariables(config.body, context))
    })

    if (!response.ok) {
        throw new Error(`Webhook failed: ${response.statusText}`)
    }
}

async function executeInAppNotification(config, context, supabase) {
    // Insertar notification en tabla (si existe)
    const { error } = await supabase.from('notifications').insert({
        user_id: context.task?.user_id || context.triggerData.user_id,
        message: replaceVariables(config.message, context),
        type: config.type || 'info',
        created_at: new Date().toISOString()
    })

    if (error && error.code !== '42P01') { // Ignorar si tabla no existe
        console.error('Error creating notification:', error)
    }
}

async function executeAddComment(config, context, supabase) {
    const { error } = await supabase.from('comments').insert({
        task_id: context.task.id,
        user_id: context.task.user_id,
        content: replaceVariables(config.text, context),
        created_at: new Date().toISOString()
    })

    if (error) {
        throw new Error(`Failed to add comment: ${error.message}`)
    }
}

async function executeMoveTask(config, context, supabase) {
    const { error } = await supabase
        .from('tasks')
        .update({ column_id: config.targetColumn })
        .eq('id', context.task.id)

    if (error) {
        throw new Error(`Failed to move task: ${error.message}`)
    }
}

async function executeUpdateTask(config, context, supabase) {
    const updates = {}
    updates[config.field] = config.value

    const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', context.task.id)

    if (error) {
        throw new Error(`Failed to update task: ${error.message}`)
    }
}

// Función auxiliar: Reemplazar variables {{var}} en strings
function replaceVariables(text, context) {
    if (typeof text !== 'string') return text

    return text.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
        const path = varName.trim().split('.')
        let value = context

        for (const key of path) {
            value = value?.[key]
        }

        return value !== undefined ? String(value) : match
    })
}

// Función auxiliar: Calcular next_run basado en el tipo de trigger
function calculateNextRun(trigger) {
    const now = new Date()

    switch (trigger.trigger_type) {
        case 'schedule.daily':
            // Misma hora mañana
            const tomorrow = new Date(now)
            tomorrow.setDate(tomorrow.getDate() + 1)
            const [hours, minutes] = (trigger.schedule_time || '09:00').split(':')
            tomorrow.setHours(parseInt(hours), parseInt(minutes), 0, 0)
            return tomorrow

        case 'schedule.weekly':
            // Misma hora próxima semana (mismo día)
            const nextWeek = new Date(now)
            nextWeek.setDate(nextWeek.getDate() + 7)
            const [h, m] = (trigger.schedule_time || '09:00').split(':')
            nextWeek.setHours(parseInt(h), parseInt(m), 0, 0)
            return nextWeek

        case 'schedule.monthly':
            // Mismo día próximo mes
            const nextMonth = new Date(now)
            nextMonth.setMonth(nextMonth.getMonth() + 1)
            nextMonth.setDate(trigger.schedule_day_of_month || 1)
            const [hh, mm] = (trigger.schedule_time || '09:00').split(':')
            nextMonth.setHours(parseInt(hh), parseInt(mm), 0, 0)
            return nextMonth

        case 'task.overdue':
        case 'task.due_soon':
            // Cada hora
            const nextHour = new Date(now)
            nextHour.setHours(nextHour.getHours() + 1)
            return nextHour

        default:
            // Por defecto, en 1 hora
            const defaultNext = new Date(now)
            defaultNext.setHours(defaultNext.getHours() + 1)
            return defaultNext
    }
}
