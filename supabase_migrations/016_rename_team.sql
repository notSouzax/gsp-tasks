-- =====================================================
-- Migration 016: Renombrar equipo (admins y editores)
-- =====================================================
-- Permite cambiar SOLO el nombre del equipo a admins y editores, sin darles
-- acceso a modificar la clave de acceso u otros campos (eso sigue siendo solo
-- de admins vía la política UPDATE de teams).
-- =====================================================

CREATE OR REPLACE FUNCTION rename_team(p_team uuid, p_name text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NOT (can_manage_team_content(p_team, auth.uid()) OR is_superadmin(auth.uid())) THEN
        RAISE EXCEPTION 'No autorizado';
    END IF;
    UPDATE teams SET name = COALESCE(NULLIF(trim(p_name), ''), name) WHERE id = p_team;
END; $$;
