-- =====================================================
-- Migration 010: Automation Triggers for CRM/Calendar
-- VERSIÓN SIMPLIFICADA (sin current_setting)
-- =====================================================
-- Enable pg_net extension for async HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;
-- =====================================================
-- FUNCTION: Generic trigger to notify automation system
-- =====================================================
CREATE OR REPLACE FUNCTION notify_automation_trigger() RETURNS TRIGGER AS $$
DECLARE trigger_type_param text;
payload jsonb;
BEGIN -- Get trigger type from function argument
trigger_type_param := TG_ARGV [0];
-- Build payload
payload := jsonb_build_object(
    'trigger_type',
    trigger_type_param,
    'record',
    row_to_json(NEW),
    'old_record',
    row_to_json(OLD),
    'user_id',
    COALESCE(NEW.user_id, OLD.user_id),
    'table_name',
    TG_TABLE_NAME,
    'operation',
    TG_OP
);
-- Call Edge Function asynchronously via pg_net
-- IMPORTANTE: Reemplaza 'YOUR-PROJECT-REF' con tu project ID real
-- Ejemplo: si tu URL es https://abcdefgh.supabase.co, usa 'abcdefgh'
PERFORM net.http_post(
    url := 'https://yycsfmkzwcohjlyddmdb.supabase.co/functions/v1/execute-automation',
    headers := jsonb_build_object(
        'Content-Type',
        'application/json',
        'Authorization',
        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5Y3NmbWt6d2NvaGpseWRkbWRiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTcyNjYzNywiZXhwIjoyMDgxMzAyNjM3fQ.Tr_VkgZLA8g0P3imK1QoMKspP44czyGZDe3uhuYDuH0'
    ),
    body := payload::text
);
RETURN NEW;
EXCEPTION
WHEN OTHERS THEN -- Si falla el HTTP request, no queremos bloquear la transacción
RAISE WARNING 'Failed to trigger automation: %',
SQLERRM;
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- =====================================================
-- CRM TRIGGERS: Opportunities
-- =====================================================
-- Trigger: opportunity.created
DROP TRIGGER IF EXISTS on_opportunity_created ON crm_opportunities;
CREATE TRIGGER on_opportunity_created
AFTER
INSERT ON crm_opportunities FOR EACH ROW EXECUTE FUNCTION notify_automation_trigger('opportunity.created');
-- Trigger: opportunity.updated (general)
DROP TRIGGER IF EXISTS on_opportunity_updated ON crm_opportunities;
CREATE TRIGGER on_opportunity_updated
AFTER
UPDATE ON crm_opportunities FOR EACH ROW EXECUTE FUNCTION notify_automation_trigger('opportunity.updated');
-- Trigger: opportunity.won (specific)
DROP TRIGGER IF EXISTS on_opportunity_won ON crm_opportunities;
CREATE TRIGGER on_opportunity_won
AFTER
UPDATE ON crm_opportunities FOR EACH ROW
    WHEN (
        NEW.is_won = true
        AND OLD.is_won = false
    ) EXECUTE FUNCTION notify_automation_trigger('opportunity.won');
-- Trigger: opportunity.lost (specific)
DROP TRIGGER IF EXISTS on_opportunity_lost ON crm_opportunities;
CREATE TRIGGER on_opportunity_lost
AFTER
UPDATE ON crm_opportunities FOR EACH ROW
    WHEN (
        NEW.is_lost = true
        AND OLD.is_lost = false
    ) EXECUTE FUNCTION notify_automation_trigger('opportunity.lost');
-- Trigger: opportunity.moved_to (stage changed)
DROP TRIGGER IF EXISTS on_opportunity_moved ON crm_opportunities;
CREATE TRIGGER on_opportunity_moved
AFTER
UPDATE OF stage_id ON crm_opportunities FOR EACH ROW
    WHEN (
        OLD.stage_id IS DISTINCT
        FROM NEW.stage_id
    ) EXECUTE FUNCTION notify_automation_trigger('opportunity.moved_to');
-- =====================================================
-- CRM TRIGGERS: Contacts
-- =====================================================
-- Trigger: contact.created
DROP TRIGGER IF EXISTS on_contact_created ON crm_contacts;
CREATE TRIGGER on_contact_created
AFTER
INSERT ON crm_contacts FOR EACH ROW EXECUTE FUNCTION notify_automation_trigger('contact.created');
-- Trigger: contact.updated
DROP TRIGGER IF EXISTS on_contact_updated ON crm_contacts;
CREATE TRIGGER on_contact_updated
AFTER
UPDATE ON crm_contacts FOR EACH ROW EXECUTE FUNCTION notify_automation_trigger('contact.updated');
-- =====================================================
-- CRM TRIGGERS: Activities
-- =====================================================
-- Trigger: crm_activity.created
DROP TRIGGER IF EXISTS on_activity_created ON crm_activities;
CREATE TRIGGER on_activity_created
AFTER
INSERT ON crm_activities FOR EACH ROW EXECUTE FUNCTION notify_automation_trigger('crm_activity.created');
-- Trigger: crm_activity.completed (when is_done changes to true)
DROP TRIGGER IF EXISTS on_activity_completed ON crm_activities;
CREATE TRIGGER on_activity_completed
AFTER
UPDATE ON crm_activities FOR EACH ROW
    WHEN (
        NEW.is_done = true
        AND OLD.is_done = false
    ) EXECUTE FUNCTION notify_automation_trigger('crm_activity.completed');
-- =====================================================
-- CALENDAR TRIGGERS: Events
-- =====================================================
-- Trigger: event.created
DROP TRIGGER IF EXISTS on_event_created ON calendar_events;
CREATE TRIGGER on_event_created
AFTER
INSERT ON calendar_events FOR EACH ROW EXECUTE FUNCTION notify_automation_trigger('event.created');
-- Trigger: event.updated
DROP TRIGGER IF EXISTS on_event_updated ON calendar_events;
CREATE TRIGGER on_event_updated
AFTER
UPDATE ON calendar_events FOR EACH ROW EXECUTE FUNCTION notify_automation_trigger('event.updated');
-- =====================================================
-- VERIFICACIÓN
-- =====================================================
-- Ver que los triggers están creados
SELECT tgname as trigger_name,
    tgrelid::regclass as table_name,
    tgenabled as is_enabled
FROM pg_trigger
WHERE tgname LIKE 'on_%'
ORDER BY tgrelid::regclass::text,
    tgname;