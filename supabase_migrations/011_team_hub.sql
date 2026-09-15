-- =====================================================
-- Migration 011: Team Hub (Chat de departamento + Documentación)
-- =====================================================
-- Añade un apartado de equipo con dos funciones:
--   1) Chat de departamento en tiempo real
--   2) Base de documentación visual (manuales, videotutoriales, cambios...)
--
-- Permisos:
--   - Todos los miembros del workspace pueden ver la documentación y usar el chat.
--   - Solo owner/admin (o miembros con permiso de "editor" concedido) pueden
--     crear/editar/borrar documentos.
-- =====================================================

-- -----------------------------------------------------
-- PART 1: TEAM MESSAGES (Chat de departamento)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS team_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content text NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 4000),
    created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_team_messages_workspace ON team_messages(workspace_id, created_at);
ALTER TABLE team_messages ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------
-- PART 2: TEAM DOC EDITORS (permiso de editor por usuario)
-- -----------------------------------------------------
-- Owner/admin pueden conceder permiso de "editor" a miembros concretos para
-- que puedan gestionar la documentación sin ser administradores del workspace.
CREATE TABLE IF NOT EXISTS team_doc_editors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    granted_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_team_doc_editors_workspace ON team_doc_editors(workspace_id);
ALTER TABLE team_doc_editors ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------
-- PART 3: TEAM DOCUMENTS (Documentación)
-- -----------------------------------------------------
-- kind: 'file' (archivo subido a Storage) o 'link' (enlace externo, p.ej. YouTube/Loom)
-- category: 'cambios' | 'videotutoriales' | 'manuales_programa' | 'procedimientos'
CREATE TABLE IF NOT EXISTS team_documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    title text NOT NULL CHECK (char_length(title) > 0),
    description text,
    category text NOT NULL DEFAULT 'manuales_programa',
    kind text NOT NULL DEFAULT 'file' CHECK (kind IN ('file', 'link')),
    -- Para kind = 'file'
    storage_path text,       -- ruta interna en el bucket (para borrar el archivo)
    file_url text,           -- URL pública del archivo
    file_name text,
    file_size bigint,
    mime_type text,
    -- Para kind = 'link'
    external_url text,
    -- Metadatos
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_team_documents_workspace ON team_documents(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_team_documents_category ON team_documents(workspace_id, category);
ALTER TABLE team_documents ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------
-- PART 4: HELPER FUNCTIONS
-- -----------------------------------------------------
-- ¿Es el usuario miembro del workspace?
CREATE OR REPLACE FUNCTION is_workspace_member(p_workspace_id uuid, p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_id = p_workspace_id
          AND user_id = p_user_id
    );
$$;

-- ¿Puede el usuario gestionar la documentación? (owner/admin o editor concedido)
CREATE OR REPLACE FUNCTION can_manage_team_docs(p_workspace_id uuid, p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_id = p_workspace_id
          AND user_id = p_user_id
          AND role IN ('owner', 'admin')
    )
    OR EXISTS (
        SELECT 1 FROM team_doc_editors
        WHERE workspace_id = p_workspace_id
          AND user_id = p_user_id
    );
$$;

-- ¿Es el usuario owner/admin del workspace?
CREATE OR REPLACE FUNCTION is_workspace_admin(p_workspace_id uuid, p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_id = p_workspace_id
          AND user_id = p_user_id
          AND role IN ('owner', 'admin')
    );
$$;

-- -----------------------------------------------------
-- PART 5: RLS POLICIES — team_messages
-- -----------------------------------------------------
DROP POLICY IF EXISTS "Members can read team messages" ON team_messages;
CREATE POLICY "Members can read team messages" ON team_messages FOR
SELECT USING (is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "Members can send team messages" ON team_messages;
CREATE POLICY "Members can send team messages" ON team_messages FOR
INSERT WITH CHECK (
    user_id = auth.uid()
    AND is_workspace_member(workspace_id, auth.uid())
);

-- Se pueden borrar los mensajes propios; los admins pueden borrar cualquiera
DROP POLICY IF EXISTS "Users can delete own messages or admins any" ON team_messages;
CREATE POLICY "Users can delete own messages or admins any" ON team_messages FOR DELETE USING (
    user_id = auth.uid()
    OR is_workspace_admin(workspace_id, auth.uid())
);

-- -----------------------------------------------------
-- PART 6: RLS POLICIES — team_doc_editors
-- -----------------------------------------------------
DROP POLICY IF EXISTS "Members can view doc editors" ON team_doc_editors;
CREATE POLICY "Members can view doc editors" ON team_doc_editors FOR
SELECT USING (is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "Admins can grant doc editor" ON team_doc_editors;
CREATE POLICY "Admins can grant doc editor" ON team_doc_editors FOR
INSERT WITH CHECK (is_workspace_admin(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "Admins can revoke doc editor" ON team_doc_editors;
CREATE POLICY "Admins can revoke doc editor" ON team_doc_editors FOR DELETE USING (
    is_workspace_admin(workspace_id, auth.uid())
);

-- -----------------------------------------------------
-- PART 7: RLS POLICIES — team_documents
-- -----------------------------------------------------
DROP POLICY IF EXISTS "Members can view team documents" ON team_documents;
CREATE POLICY "Members can view team documents" ON team_documents FOR
SELECT USING (is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "Managers can insert team documents" ON team_documents;
CREATE POLICY "Managers can insert team documents" ON team_documents FOR
INSERT WITH CHECK (
    uploaded_by = auth.uid()
    AND can_manage_team_docs(workspace_id, auth.uid())
);

DROP POLICY IF EXISTS "Managers can update team documents" ON team_documents;
CREATE POLICY "Managers can update team documents" ON team_documents FOR
UPDATE USING (can_manage_team_docs(workspace_id, auth.uid()))
WITH CHECK (can_manage_team_docs(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "Managers can delete team documents" ON team_documents;
CREATE POLICY "Managers can delete team documents" ON team_documents FOR DELETE USING (
    can_manage_team_docs(workspace_id, auth.uid())
);

-- -----------------------------------------------------
-- PART 8: REALTIME
-- -----------------------------------------------------
-- Habilitar realtime en el chat (idempotente)
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE team_messages;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE team_documents;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- -----------------------------------------------------
-- PART 9: STORAGE BUCKET (team-docs)
-- -----------------------------------------------------
-- Bucket público para archivos de documentación (manuales, vídeos...).
INSERT INTO storage.buckets (id, name, public)
VALUES ('team-docs', 'team-docs', true)
ON CONFLICT (id) DO NOTHING;

-- Cualquiera con la URL pública puede leer (bucket público)
DROP POLICY IF EXISTS "Public read team-docs" ON storage.objects;
CREATE POLICY "Public read team-docs" ON storage.objects FOR
SELECT USING (bucket_id = 'team-docs');

-- Solo usuarios autenticados pueden subir
DROP POLICY IF EXISTS "Authenticated upload team-docs" ON storage.objects;
CREATE POLICY "Authenticated upload team-docs" ON storage.objects FOR
INSERT WITH CHECK (bucket_id = 'team-docs' AND auth.role() = 'authenticated');

-- Solo usuarios autenticados pueden actualizar/borrar objetos del bucket
DROP POLICY IF EXISTS "Authenticated update team-docs" ON storage.objects;
CREATE POLICY "Authenticated update team-docs" ON storage.objects FOR
UPDATE USING (bucket_id = 'team-docs' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated delete team-docs" ON storage.objects;
CREATE POLICY "Authenticated delete team-docs" ON storage.objects FOR DELETE USING (
    bucket_id = 'team-docs' AND auth.role() = 'authenticated'
);
