-- ============================================
-- MIGRACIÓN: Preservar Activity Logs de Tableros Eliminados
-- Fecha: 2025-12-20
-- Descripción: Cambiar ON DELETE CASCADE a ON DELETE SET NULL
--              para que los logs se preserven cuando se elimina un tablero
-- ============================================
-- 1. Eliminar la foreign key existente
ALTER TABLE activity_logs DROP CONSTRAINT IF EXISTS activity_logs_board_id_fkey;
-- 2. Hacer board_id nullable (si no lo es ya)
ALTER TABLE activity_logs
ALTER COLUMN board_id DROP NOT NULL;
-- 3. Recrear la foreign key con SET NULL en lugar de CASCADE
ALTER TABLE activity_logs
ADD CONSTRAINT activity_logs_board_id_fkey FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE
SET NULL;
-- 4. Verificar que los logs se preserven
COMMENT ON COLUMN activity_logs.board_id IS 'ID del tablero. Se establece a NULL cuando el tablero es eliminado para preservar el historial.';
-- ============================================
-- FIN DE MIGRACIÓN
-- ============================================