-- =====================================================
-- Migration 012: Fix SECURITY DEFINER view (aviso del Security Advisor)
-- =====================================================
-- El Security Advisor de Supabase marca como CRITICAL la vista
-- public.scheduled_triggers_overview (creada en 006_scheduled_triggers.sql)
-- porque se definió con la propiedad SECURITY DEFINER por defecto: se ejecuta
-- con los permisos de su creador y se salta el Row Level Security (RLS) del
-- usuario que la consulta. Como la vista no filtra por auth.uid(), un usuario
-- podría ver triggers/automatizaciones de otros usuarios.
--
-- Solución: activar security_invoker para que la vista respete el RLS del
-- usuario que la consulta (las políticas de 'automations' y
-- 'scheduled_trigger_state' filtran ya por user_id = auth.uid()).
--
-- Requiere PostgreSQL 15+ (Supabase lo cumple). No afecta a la app: la vista
-- no se usa en el frontend, es solo un resumen para debugging/UI.
-- =====================================================

ALTER VIEW public.scheduled_triggers_overview SET (security_invoker = on);
