-- ============================================
-- MIGRACIÓN: Sistema de Automatizaciones Visuales
-- Fecha: 2025-12-20
-- Descripción: Tablas para automatizaciones tipo Zapier
-- ============================================
-- ============================================
-- 1. TABLA: automations
-- Almacena las reglas de automatización del usuario
-- ============================================
CREATE TABLE IF NOT EXISTS automations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    board_id BIGINT REFERENCES boards(id) ON DELETE CASCADE,
    -- Metadata
    name TEXT NOT NULL,
    description TEXT,
    is_enabled BOOLEAN DEFAULT true,
    icon TEXT DEFAULT '⚡',
    -- Trigger Configuration
    trigger_type TEXT NOT NULL,
    trigger_config JSONB DEFAULT '{}'::jsonb,
    -- Conditions (opcional, array de condiciones)
    conditions JSONB DEFAULT '[]'::jsonb,
    condition_logic TEXT DEFAULT 'AND' CHECK (condition_logic IN ('AND', 'OR')),
    -- Actions (array ordenado de acciones a ejecutar)
    actions JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Stats de ejecución
    run_count INTEGER DEFAULT 0,
    last_run_at TIMESTAMP WITH TIME ZONE,
    last_error TEXT,
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_automations_user ON automations(user_id);
CREATE INDEX IF NOT EXISTS idx_automations_board ON automations(board_id);
CREATE INDEX IF NOT EXISTS idx_automations_trigger ON automations(trigger_type);
CREATE INDEX IF NOT EXISTS idx_automations_enabled ON automations(is_enabled)
WHERE is_enabled = true;
-- ============================================
-- 2. TABLA: automation_logs
-- Historial de ejecuciones de automatizaciones
-- ============================================
CREATE TABLE IF NOT EXISTS automation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    automation_id UUID REFERENCES automations(id) ON DELETE CASCADE NOT NULL,
    -- Datos del trigger que disparó la ejecución
    trigger_data JSONB DEFAULT '{}'::jsonb,
    -- Acciones ejecutadas y sus resultados
    actions_executed JSONB DEFAULT '[]'::jsonb,
    -- Estado de la ejecución
    status TEXT NOT NULL CHECK (
        status IN ('success', 'partial', 'failed', 'skipped')
    ),
    error_message TEXT,
    -- Métricas
    duration_ms INTEGER,
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Índice para consultas de logs por automatización
CREATE INDEX IF NOT EXISTS idx_automation_logs_automation ON automation_logs(automation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_logs_status ON automation_logs(status);
-- ============================================
-- 3. RLS POLICIES
-- ============================================
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;
-- Automations: Solo el usuario propietario puede ver/editar
CREATE POLICY "Ver propias automatizaciones" ON automations FOR
SELECT USING (auth.uid() = user_id);
CREATE POLICY "Crear automatizaciones" ON automations FOR
INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Actualizar propias automatizaciones" ON automations FOR
UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Eliminar propias automatizaciones" ON automations FOR DELETE USING (auth.uid() = user_id);
-- Automation Logs: Solo lectura para el propietario de la automatización
CREATE POLICY "Ver logs de propias automatizaciones" ON automation_logs FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM automations
            WHERE automations.id = automation_logs.automation_id
                AND automations.user_id = auth.uid()
        )
    );
-- Permitir INSERT desde el sistema (para logging)
CREATE POLICY "Insertar logs de automatizaciones" ON automation_logs FOR
INSERT WITH CHECK (
        EXISTS (
            SELECT 1
            FROM automations
            WHERE automations.id = automation_logs.automation_id
                AND automations.user_id = auth.uid()
        )
    );
-- ============================================
-- 4. FUNCIÓN: Actualizar timestamp de updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_automation_timestamp() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trigger_update_automation_timestamp BEFORE
UPDATE ON automations FOR EACH ROW EXECUTE FUNCTION update_automation_timestamp();
-- ============================================
-- 5. FUNCIÓN: Incrementar contador de ejecuciones
-- ============================================
CREATE OR REPLACE FUNCTION increment_automation_run_count(automation_uuid UUID) RETURNS void AS $$ BEGIN
UPDATE automations
SET run_count = run_count + 1,
    last_run_at = NOW()
WHERE id = automation_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ============================================
-- FIN DE MIGRACIÓN
-- ============================================