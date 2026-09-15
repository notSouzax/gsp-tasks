-- =====================================================
-- Migration 014: Team Spaces (equipos privados tipo canal)
-- =====================================================
-- El apartado "Equipo" pasa a organizarse en ESPACIOS/EQUIPOS privados:
--   - Un usuario no ve nada de Equipo hasta unirse a un equipo.
--   - Se entra con una clave de acceso (access_code) o por invitación.
--   - Un usuario puede pertenecer a varios equipos.
--   - El chat, documentos y cambios se asocian al equipo (team_id), no al workspace.
--
-- Roles dentro de un equipo (team_members.role):
--   - admin  : gestiona el equipo (clave, invitaciones, miembros/roles) + contenido
--   - editor : gestiona contenido (documentos y cambios), no ajustes del equipo
--   - member : lee todo y participa en el chat
--
-- Unirse a un workspace sigue funcionando igual que antes (sin cambios).
-- =====================================================

-- -----------------------------------------------------
-- PART 1: TABLAS
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS teams (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL DEFAULT 'Equipo',
    access_code text NOT NULL UNIQUE,
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS team_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'editor', 'member')),
    joined_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(team_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS team_invitations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    invitation_code text NOT NULL UNIQUE,
    role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'editor', 'member')),
    invited_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    expires_at timestamptz DEFAULT (now() + interval '30 days'),
    max_uses int DEFAULT 1,
    uses_count int DEFAULT 0,
    status text DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'exhausted'))
);
CREATE INDEX IF NOT EXISTS idx_team_invitations_team ON team_invitations(team_id);
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------
-- PART 2: HELPERS (SECURITY DEFINER, evitan recursión de RLS)
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION is_team_member(p_team uuid, p_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (SELECT 1 FROM team_members WHERE team_id = p_team AND user_id = p_user);
$$;

CREATE OR REPLACE FUNCTION is_team_admin(p_team uuid, p_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (SELECT 1 FROM team_members WHERE team_id = p_team AND user_id = p_user AND role = 'admin');
$$;

CREATE OR REPLACE FUNCTION can_manage_team_content(p_team uuid, p_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (SELECT 1 FROM team_members WHERE team_id = p_team AND user_id = p_user AND role IN ('admin', 'editor'));
$$;

-- Generador de códigos legibles (sin caracteres ambiguos)
CREATE OR REPLACE FUNCTION gen_team_code() RETURNS text LANGUAGE plpgsql AS $$
DECLARE chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; result text := ''; i int;
BEGIN
    FOR i IN 1..8 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    RETURN result;
END; $$;

-- -----------------------------------------------------
-- PART 3: FUNCIONES DE ACCIÓN
-- -----------------------------------------------------
-- Crear un equipo (el creador queda como admin)
CREATE OR REPLACE FUNCTION create_team(p_name text)
RETURNS teams LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_team teams; v_code text;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
    LOOP
        v_code := gen_team_code();
        EXIT WHEN NOT EXISTS (SELECT 1 FROM teams WHERE access_code = v_code);
    END LOOP;
    INSERT INTO teams(name, access_code, created_by)
    VALUES (COALESCE(NULLIF(trim(p_name), ''), 'Equipo'), v_code, auth.uid())
    RETURNING * INTO v_team;
    INSERT INTO team_members(team_id, user_id, role) VALUES (v_team.id, auth.uid(), 'admin');
    RETURN v_team;
END; $$;

-- Unirse con clave de acceso
CREATE OR REPLACE FUNCTION join_team_by_code(p_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_team teams;
BEGIN
    SELECT * INTO v_team FROM teams WHERE access_code = upper(trim(p_code));
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Clave no válida'); END IF;
    IF EXISTS (SELECT 1 FROM team_members WHERE team_id = v_team.id AND user_id = auth.uid()) THEN
        RETURN jsonb_build_object('success', true, 'team_id', v_team.id, 'already_member', true);
    END IF;
    INSERT INTO team_members(team_id, user_id, role) VALUES (v_team.id, auth.uid(), 'member');
    RETURN jsonb_build_object('success', true, 'team_id', v_team.id);
END; $$;

-- Unirse por invitación
CREATE OR REPLACE FUNCTION accept_team_invitation(p_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_inv team_invitations;
BEGIN
    SELECT * INTO v_inv FROM team_invitations
    WHERE invitation_code = upper(trim(p_code)) AND status = 'active'
      AND expires_at > now() AND uses_count < max_uses;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Invitación no válida o caducada'); END IF;
    IF EXISTS (SELECT 1 FROM team_members WHERE team_id = v_inv.team_id AND user_id = auth.uid()) THEN
        RETURN jsonb_build_object('success', true, 'team_id', v_inv.team_id, 'already_member', true);
    END IF;
    INSERT INTO team_members(team_id, user_id, role) VALUES (v_inv.team_id, auth.uid(), v_inv.role);
    UPDATE team_invitations SET uses_count = uses_count + 1,
        status = CASE WHEN uses_count + 1 >= max_uses THEN 'exhausted' ELSE status END
    WHERE id = v_inv.id;
    RETURN jsonb_build_object('success', true, 'team_id', v_inv.team_id);
END; $$;

-- -----------------------------------------------------
-- PART 4: RLS de teams / team_members / team_invitations
-- -----------------------------------------------------
DROP POLICY IF EXISTS "Members can view their teams" ON teams;
CREATE POLICY "Members can view their teams" ON teams FOR
SELECT USING (is_team_member(id, auth.uid()));

DROP POLICY IF EXISTS "Admins can update team" ON teams;
CREATE POLICY "Admins can update team" ON teams FOR
UPDATE USING (is_team_admin(id, auth.uid())) WITH CHECK (is_team_admin(id, auth.uid()));

DROP POLICY IF EXISTS "Admins can delete team" ON teams;
CREATE POLICY "Admins can delete team" ON teams FOR DELETE USING (is_team_admin(id, auth.uid()));

-- team_members
DROP POLICY IF EXISTS "View team members" ON team_members;
CREATE POLICY "View team members" ON team_members FOR
SELECT USING (user_id = auth.uid() OR is_team_member(team_id, auth.uid()));

DROP POLICY IF EXISTS "Admins manage members" ON team_members;
CREATE POLICY "Admins manage members" ON team_members FOR
UPDATE USING (is_team_admin(team_id, auth.uid())) WITH CHECK (is_team_admin(team_id, auth.uid()));

DROP POLICY IF EXISTS "Admins or self remove membership" ON team_members;
CREATE POLICY "Admins or self remove membership" ON team_members FOR DELETE USING (
    user_id = auth.uid() OR is_team_admin(team_id, auth.uid())
);

-- team_invitations (solo admins gestionan/ven)
DROP POLICY IF EXISTS "Admins view invitations" ON team_invitations;
CREATE POLICY "Admins view invitations" ON team_invitations FOR
SELECT USING (is_team_admin(team_id, auth.uid()));

DROP POLICY IF EXISTS "Admins create invitations" ON team_invitations;
CREATE POLICY "Admins create invitations" ON team_invitations FOR
INSERT WITH CHECK (is_team_admin(team_id, auth.uid()));

DROP POLICY IF EXISTS "Admins delete invitations" ON team_invitations;
CREATE POLICY "Admins delete invitations" ON team_invitations FOR DELETE USING (is_team_admin(team_id, auth.uid()));

-- -----------------------------------------------------
-- PART 5: AÑADIR team_id AL CONTENIDO
-- -----------------------------------------------------
ALTER TABLE team_messages ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES teams(id) ON DELETE CASCADE;
ALTER TABLE team_documents ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES teams(id) ON DELETE CASCADE;
ALTER TABLE team_changes ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES teams(id) ON DELETE CASCADE;
ALTER TABLE team_doc_editors ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES teams(id) ON DELETE CASCADE;

-- workspace_id deja de ser obligatorio (el contenido ahora se ancla al equipo)
ALTER TABLE team_messages ALTER COLUMN workspace_id DROP NOT NULL;
ALTER TABLE team_documents ALTER COLUMN workspace_id DROP NOT NULL;
ALTER TABLE team_changes ALTER COLUMN workspace_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_team_messages_team ON team_messages(team_id, created_at);
CREATE INDEX IF NOT EXISTS idx_team_documents_team ON team_documents(team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_team_changes_team ON team_changes(team_id, created_at DESC);

-- -----------------------------------------------------
-- PART 6: BACKFILL (migrar contenido existente a un equipo por workspace)
-- -----------------------------------------------------
DO $$
DECLARE w record; v_team_id uuid; v_owner uuid; v_code text;
BEGIN
    FOR w IN (
        SELECT DISTINCT workspace_id FROM (
            SELECT workspace_id FROM team_messages WHERE team_id IS NULL AND workspace_id IS NOT NULL
            UNION SELECT workspace_id FROM team_documents WHERE team_id IS NULL AND workspace_id IS NOT NULL
            UNION SELECT workspace_id FROM team_changes WHERE team_id IS NULL AND workspace_id IS NOT NULL
        ) t
    ) LOOP
        SELECT user_id INTO v_owner FROM workspace_members
        WHERE workspace_id = w.workspace_id ORDER BY (role = 'owner') DESC, joined_at LIMIT 1;

        LOOP v_code := gen_team_code(); EXIT WHEN NOT EXISTS (SELECT 1 FROM teams WHERE access_code = v_code); END LOOP;
        INSERT INTO teams(name, access_code, created_by) VALUES ('Equipo', v_code, v_owner) RETURNING id INTO v_team_id;

        INSERT INTO team_members(team_id, user_id, role)
        SELECT v_team_id, wm.user_id, CASE WHEN wm.role IN ('owner', 'admin') THEN 'admin' ELSE 'member' END
        FROM workspace_members wm WHERE wm.workspace_id = w.workspace_id
        ON CONFLICT (team_id, user_id) DO NOTHING;

        UPDATE team_messages SET team_id = v_team_id WHERE workspace_id = w.workspace_id AND team_id IS NULL;
        UPDATE team_documents SET team_id = v_team_id WHERE workspace_id = w.workspace_id AND team_id IS NULL;
        UPDATE team_changes SET team_id = v_team_id WHERE workspace_id = w.workspace_id AND team_id IS NULL;
        UPDATE team_doc_editors SET team_id = v_team_id WHERE workspace_id = w.workspace_id AND team_id IS NULL;
    END LOOP;
END $$;

-- -----------------------------------------------------
-- PART 7: RLS del contenido (ahora basado en team_id)
-- -----------------------------------------------------
-- team_messages
DROP POLICY IF EXISTS "Members can read team messages" ON team_messages;
DROP POLICY IF EXISTS "Members can send team messages" ON team_messages;
DROP POLICY IF EXISTS "Users can delete own messages or admins any" ON team_messages;
CREATE POLICY "team_messages_select" ON team_messages FOR SELECT USING (is_team_member(team_id, auth.uid()));
CREATE POLICY "team_messages_insert" ON team_messages FOR INSERT WITH CHECK (user_id = auth.uid() AND is_team_member(team_id, auth.uid()));
CREATE POLICY "team_messages_delete" ON team_messages FOR DELETE USING (user_id = auth.uid() OR is_team_admin(team_id, auth.uid()));

-- team_documents
DROP POLICY IF EXISTS "Members can view team documents" ON team_documents;
DROP POLICY IF EXISTS "Managers can insert team documents" ON team_documents;
DROP POLICY IF EXISTS "Managers can update team documents" ON team_documents;
DROP POLICY IF EXISTS "Managers can delete team documents" ON team_documents;
CREATE POLICY "team_documents_select" ON team_documents FOR SELECT USING (is_team_member(team_id, auth.uid()));
CREATE POLICY "team_documents_insert" ON team_documents FOR INSERT WITH CHECK (uploaded_by = auth.uid() AND can_manage_team_content(team_id, auth.uid()));
CREATE POLICY "team_documents_update" ON team_documents FOR UPDATE USING (can_manage_team_content(team_id, auth.uid())) WITH CHECK (can_manage_team_content(team_id, auth.uid()));
CREATE POLICY "team_documents_delete" ON team_documents FOR DELETE USING (can_manage_team_content(team_id, auth.uid()));

-- team_changes
DROP POLICY IF EXISTS "Members can view team changes" ON team_changes;
DROP POLICY IF EXISTS "Managers can insert team changes" ON team_changes;
DROP POLICY IF EXISTS "Managers can update team changes" ON team_changes;
DROP POLICY IF EXISTS "Managers can delete team changes" ON team_changes;
CREATE POLICY "team_changes_select" ON team_changes FOR SELECT USING (is_team_member(team_id, auth.uid()));
CREATE POLICY "team_changes_insert" ON team_changes FOR INSERT WITH CHECK (author_id = auth.uid() AND can_manage_team_content(team_id, auth.uid()));
CREATE POLICY "team_changes_update" ON team_changes FOR UPDATE USING (can_manage_team_content(team_id, auth.uid())) WITH CHECK (can_manage_team_content(team_id, auth.uid()));
CREATE POLICY "team_changes_delete" ON team_changes FOR DELETE USING (can_manage_team_content(team_id, auth.uid()));

-- -----------------------------------------------------
-- PART 8: REALTIME
-- -----------------------------------------------------
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE team_members; EXCEPTION WHEN duplicate_object THEN null; END $$;
