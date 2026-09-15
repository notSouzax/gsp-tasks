-- =====================================================
-- Migration 013: Team Changes (muro de "Cambios en el programa")
-- =====================================================
-- Nuevo apartado tipo changelog/muro: publicaciones con texto y adjuntos
-- (fotos, documentos, vídeos o enlaces). Reutiliza el bucket 'team-docs'
-- (subcarpeta changes/) y los helpers de permisos de la migración 011.
--
-- Permisos: todos los miembros leen; solo owner/admin o editores publican
-- (misma regla que la documentación: can_manage_team_docs).
-- =====================================================

CREATE TABLE IF NOT EXISTS team_changes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    content text NOT NULL DEFAULT '',
    -- Lista de adjuntos: [{ kind:'file'|'link', url, name, size, mime, storage_path, external_url }]
    attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_team_changes_workspace ON team_changes(workspace_id, created_at DESC);
ALTER TABLE team_changes ENABLE ROW LEVEL SECURITY;

-- RLS
DROP POLICY IF EXISTS "Members can view team changes" ON team_changes;
CREATE POLICY "Members can view team changes" ON team_changes FOR
SELECT USING (is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "Managers can insert team changes" ON team_changes;
CREATE POLICY "Managers can insert team changes" ON team_changes FOR
INSERT WITH CHECK (
    author_id = auth.uid()
    AND can_manage_team_docs(workspace_id, auth.uid())
);

DROP POLICY IF EXISTS "Managers can update team changes" ON team_changes;
CREATE POLICY "Managers can update team changes" ON team_changes FOR
UPDATE USING (can_manage_team_docs(workspace_id, auth.uid()))
WITH CHECK (can_manage_team_docs(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "Managers can delete team changes" ON team_changes;
CREATE POLICY "Managers can delete team changes" ON team_changes FOR DELETE USING (
    can_manage_team_docs(workspace_id, auth.uid())
);

-- Realtime
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE team_changes;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
