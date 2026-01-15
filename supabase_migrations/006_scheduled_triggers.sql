-- ============================================
-- MIGRACIÓN: Triggers Programados (Scheduled Triggers)
-- Fecha: 2025-12-20
-- Descripción: Sistema de automatizaciones basadas en tiempo
-- ============================================
-- ============================================
-- 1. EXTENSIÓN: pg_cron
-- Para ejecutar tareas programadas
-- ============================================
-- Nota: pg_cron debe habilitarse desde el Dashboard de Supabase
-- Settings > Database > Extensions > pg_cron
-- Esta migración solo preparará las tablas necesarias
-- ============================================
-- 2. TABLA: scheduled_trigger_state
-- Estado y configuración de triggers programados
-- ============================================
CREATE TABLE IF NOT EXISTS scheduled_trigger_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    automation_id UUID REFERENCES automations(id) ON DELETE CASCADE NOT NULL,
    -- Tipo de trigger programado
    trigger_type TEXT NOT NULL CHECK (
        trigger_type IN (
            'schedule.daily',
            'schedule.week ly',
            'schedule.monthly',
            'task.overdue',
            'task.due_soon'
        )
    ),
    -- Configuración del schedule (para triggers de calendario)
    schedule_time TIME,
    -- Hora del día (ej: 09:00:00)
    schedule_day_of_week INTEGER CHECK (
        schedule_day_of_week BETWEEN 0 AND 6
    ),
    -- 0=Domingo, 6=Sábado
    schedule_day_of_month INTEGER CHECK (
        schedule_day_of_month BETWEEN 1 AND 31
    ),
    -- Configuración para triggers basados en tareas
    hours_before INTEGER,
    -- Para task.due_soon
    -- Timezone del usuario
    timezone TEXT DEFAULT 'UTC',
    -- Estado de ejecución
    last_run_at TIMESTAMP WITH TIME ZONE,
    next_run_at TIMESTAMP WITH TIME ZONE,
    run_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    last_error TEXT,
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Índices para búsqueda eficiente
CREATE INDEX IF NOT EXISTS idx_scheduled_trigger_automation ON scheduled_trigger_state(automation_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_trigger_next_run ON scheduled_trigger_state(next_run_at)
WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_scheduled_trigger_type ON scheduled_trigger_state(trigger_type);
-- ============================================
-- 3. FUNCIÓN: Calcular próxima ejecución
-- ============================================
CREATE OR REPLACE FUNCTION calculate_next_run(
        trigger_type_param TEXT,
        schedule_time_param TIME,
        schedule_day_of_week_param INTEGER,
        schedule_day_of_month_param INTEGER,
        timezone_param TEXT
    ) RETURNS TIMESTAMP WITH TIME ZONE LANGUAGE plpgsql AS $$
DECLARE next_run TIMESTAMP WITH TIME ZONE;
now_in_tz TIMESTAMP WITH TIME ZONE;
BEGIN -- Obtener hora actual en el timezone del usuario
now_in_tz := NOW() AT TIME ZONE timezone_param;
CASE
    trigger_type_param -- Daily: próxima ocurrencia de la hora especificada
    WHEN 'schedule.daily' THEN next_run := (CURRENT_DATE AT TIME ZONE timezone_param) + schedule_time_param;
IF next_run <= now_in_tz THEN -- Si ya pasó hoy, programar para mañana
next_run := next_run + INTERVAL '1 day';
END IF;
-- Weekly: próximo día de la semana especificado
WHEN 'schedule.weekly' THEN next_run := (CURRENT_DATE AT TIME ZONE timezone_param) + schedule_time_param;
-- Ajustar al día de la semana correcto
WHILE EXTRACT(
    DOW
    FROM next_run
) != schedule_day_of_week_param
OR next_run <= now_in_tz LOOP next_run := next_run + INTERVAL '1 day';
END LOOP;
-- Monthly: próximo día del mes especificado
WHEN 'schedule.monthly' THEN next_run := (
    DATE_TRUNC('month', CURRENT_DATE) + (schedule_day_of_month_param - 1 || ' days')::INTERVAL + schedule_time_param::INTERVAL
) AT TIME ZONE timezone_param;
IF next_run <= now_in_tz THEN -- Si ya pasó este mes, programar para el próximo mes
next_run := (
    DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' + (schedule_day_of_month_param - 1 || ' days')::INTERVAL + schedule_time_param::INTERVAL
) AT TIME ZONE timezone_param;
END IF;
-- Para overdue y due_soon, se ejecutan cada hora
WHEN 'task.overdue',
'task.due_soon' THEN next_run := NOW() + INTERVAL '1 hour';
ELSE RAISE EXCEPTION 'Unknown trigger type: %',
trigger_type_param;
END CASE
;
RETURN next_run;
END;
$$;
-- ============================================
-- 4. FUNCIÓN: Actualizar next_run automáticamente
-- ============================================
CREATE OR REPLACE FUNCTION update_next_run_trigger() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN -- Calcular next_run al insertar o actualizar
    IF TG_OP = 'INSERT'
    OR (
        TG_OP = 'UPDATE'
        AND (
            OLD.schedule_time IS DISTINCT
            FROM NEW.schedule_time
                OR OLD.schedule_day_of_week IS DISTINCT
            FROM NEW.schedule_day_of_week
                OR OLD.schedule_day_of_month IS DISTINCT
            FROM NEW.schedule_day_of_month
                OR OLD.timezone IS DISTINCT
            FROM NEW.timezone
        )
    ) THEN NEW.next_run_at := calculate_next_run(
        NEW.trigger_type,
        NEW.schedule_time,
        NEW.schedule_day_of_week,
        NEW.schedule_day_of_month,
        NEW.timezone
    );
END IF;
RETURN NEW;
END;
$$;
-- Trigger para actualizar next_run automáticamente
DROP TRIGGER IF EXISTS trigger_update_next_run ON scheduled_trigger_state;
CREATE TRIGGER trigger_update_next_run BEFORE
INSERT
    OR
UPDATE ON scheduled_trigger_state FOR EACH ROW EXECUTE FUNCTION update_next_run_trigger();
-- ============================================
-- 5. RLS POLICIES
-- ============================================
ALTER TABLE scheduled_trigger_state ENABLE ROW LEVEL SECURITY;
-- Policy: Los usuarios solo pueden ver sus propios scheduled triggers
CREATE POLICY scheduled_trigger_select_policy ON scheduled_trigger_state FOR
SELECT USING (
        automation_id IN (
            SELECT id
            FROM automations
            WHERE user_id = auth.uid()
        )
    );
-- Policy: Los usuarios solo pueden insertar scheduled triggers para sus automatizaciones
CREATE POLICY scheduled_trigger_insert_policy ON scheduled_trigger_state FOR
INSERT WITH CHECK (
        automation_id IN (
            SELECT id
            FROM automations
            WHERE user_id = auth.uid()
        )
    );
-- Policy: Los usuarios solo pueden actualizar sus propios scheduled triggers
CREATE POLICY scheduled_trigger_update_policy ON scheduled_trigger_state FOR
UPDATE USING (
        automation_id IN (
            SELECT id
            FROM automations
            WHERE user_id = auth.uid()
        )
    );
-- Policy: Los usuarios solo pueden eliminar sus propios scheduled triggers
CREATE POLICY scheduled_trigger_delete_policy ON scheduled_trigger_state FOR DELETE USING (
    automation_id IN (
        SELECT id
        FROM automations
        WHERE user_id = auth.uid()
    )
);
-- ============================================
-- 6. VISTA: Próximas ejecuciones
-- Útil para debugging y UI
-- ============================================
CREATE OR REPLACE VIEW scheduled_triggers_overview AS
SELECT st.id,
    st.automation_id,
    a.name AS automation_name,
    a.user_id,
    st.trigger_type,
    st.next_run_at,
    st.last_run_at,
    st.run_count,
    st.is_active,
    -- Tiempo hasta próxima ejecución
    EXTRACT(
        EPOCH
        FROM (st.next_run_at - NOW())
    ) AS seconds_until_next_run,
    -- Formateo amigable del schedule
    CASE
        st.trigger_type
        WHEN 'schedule.daily' THEN 'Daily at ' || TO_CHAR(st.schedule_time, 'HH24:MI')
        WHEN 'schedule.weekly' THEN 'Weekly on ' || TO_CHAR(st.schedule_day_of_week, 'Day') || ' at ' || TO_CHAR(st.schedule_time, 'HH24:MI')
        WHEN 'schedule.monthly' THEN 'Monthly on day ' || st.schedule_day_of_month || ' at ' || TO_CHAR(st.schedule_time, 'HH24:MI')
        WHEN 'task.overdue' THEN 'Check overdue tasks hourly'
        WHEN 'task.due_soon' THEN 'Check tasks due in ' || st.hours_before || ' hours'
        ELSE st.trigger_type
    END AS schedule_description
FROM scheduled_trigger_state st
    JOIN automations a ON st.automation_id = a.id
WHERE st.is_active = true;
-- ============================================
-- NOTAS DE DEPLOYMENT
-- ============================================
-- 1. Habilitar pg_cron en Supabase Dashboard:
--    Settings > Database > Extensions > Enable pg_cron
-- 2. Configurar cron job (desde Dashboard o SQL):
--    SELECT cron.schedule(
--        'run-scheduled-automations',
--        '*/5 * * * *',  -- Cada 5 minutos
--        $$
--        SELECT extensions.http_post(
--            url := 'https://[PROJECT_REF].supabase.co/functions/v1/run-scheduled-automations',
--            headers := '{"Content-Type": "application/json", "Authorization": "Bearer [ANON_KEY]"}'::jsonb,
--            body := '{}'::jsonb
--        );
--        $$
--    );
-- 3. Deploy Edge Function: supabase functions deploy run-scheduled-automations
COMMENT ON TABLE scheduled_trigger_state IS 'Estado y configuración de triggers programados para automatizaciones';
COMMENT ON FUNCTION calculate_next_run IS 'Calcula la próxima ejecución de un trigger programado';
COMMENT ON VIEW scheduled_triggers_overview IS 'Vista con información resumida de todos los triggers programados activos';