-- =====================================================
-- Migration 015: Superadmin (administrador supremo)
-- =====================================================
-- Marca un perfil como superadmin: acceso total para gestionar usuarios,
-- equipos, miembros y permisos desde el panel de Administración.
-- Solo el superadmin ve y usa ese panel.
-- =====================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_superadmin boolean NOT NULL DEFAULT false;

-- Asignar superadmin a sozinho2004@gmail.com
UPDATE profiles p
SET is_superadmin = true, role = 'admin'
FROM auth.users u
WHERE u.id = p.id AND u.email = 'sozinho2004@gmail.com';

-- Helper
CREATE OR REPLACE FUNCTION is_superadmin(p_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (SELECT 1 FROM profiles WHERE id = p_user AND is_superadmin = true);
$$;

-- -----------------------------------------------------
-- Profiles: el superadmin ve y edita todos los perfiles
-- -----------------------------------------------------
DROP POLICY IF EXISTS "Superadmin can view all profiles" ON profiles;
CREATE POLICY "Superadmin can view all profiles" ON profiles FOR
SELECT USING (is_superadmin(auth.uid()));

DROP POLICY IF EXISTS "Superadmin can update profiles" ON profiles;
CREATE POLICY "Superadmin can update profiles" ON profiles FOR
UPDATE USING (is_superadmin(auth.uid())) WITH CHECK (is_superadmin(auth.uid()));

-- -----------------------------------------------------
-- Teams: el superadmin lo ve y gestiona todo
-- -----------------------------------------------------
DROP POLICY IF EXISTS "Members can view their teams" ON teams;
CREATE POLICY "Members can view their teams" ON teams FOR
SELECT USING (is_team_member(id, auth.uid()) OR is_superadmin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update team" ON teams;
CREATE POLICY "Admins can update team" ON teams FOR
UPDATE USING (is_team_admin(id, auth.uid()) OR is_superadmin(auth.uid()))
WITH CHECK (is_team_admin(id, auth.uid()) OR is_superadmin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete team" ON teams;
CREATE POLICY "Admins can delete team" ON teams FOR DELETE USING (
    is_team_admin(id, auth.uid()) OR is_superadmin(auth.uid())
);

-- -----------------------------------------------------
-- team_members: superadmin gestiona membresías de cualquier equipo
-- -----------------------------------------------------
DROP POLICY IF EXISTS "View team members" ON team_members;
CREATE POLICY "View team members" ON team_members FOR
SELECT USING (user_id = auth.uid() OR is_team_member(team_id, auth.uid()) OR is_superadmin(auth.uid()));

DROP POLICY IF EXISTS "Superadmin insert members" ON team_members;
CREATE POLICY "Superadmin insert members" ON team_members FOR
INSERT WITH CHECK (is_superadmin(auth.uid()));

DROP POLICY IF EXISTS "Admins manage members" ON team_members;
CREATE POLICY "Admins manage members" ON team_members FOR
UPDATE USING (is_team_admin(team_id, auth.uid()) OR is_superadmin(auth.uid()))
WITH CHECK (is_team_admin(team_id, auth.uid()) OR is_superadmin(auth.uid()));

DROP POLICY IF EXISTS "Admins or self remove membership" ON team_members;
CREATE POLICY "Admins or self remove membership" ON team_members FOR DELETE USING (
    user_id = auth.uid() OR is_team_admin(team_id, auth.uid()) OR is_superadmin(auth.uid())
);

-- -----------------------------------------------------
-- team_invitations: superadmin gestiona invitaciones de cualquier equipo
-- -----------------------------------------------------
DROP POLICY IF EXISTS "Admins view invitations" ON team_invitations;
CREATE POLICY "Admins view invitations" ON team_invitations FOR
SELECT USING (is_team_admin(team_id, auth.uid()) OR is_superadmin(auth.uid()));

DROP POLICY IF EXISTS "Admins create invitations" ON team_invitations;
CREATE POLICY "Admins create invitations" ON team_invitations FOR
INSERT WITH CHECK (is_team_admin(team_id, auth.uid()) OR is_superadmin(auth.uid()));

DROP POLICY IF EXISTS "Admins delete invitations" ON team_invitations;
CREATE POLICY "Admins delete invitations" ON team_invitations FOR DELETE USING (
    is_team_admin(team_id, auth.uid()) OR is_superadmin(auth.uid())
);
