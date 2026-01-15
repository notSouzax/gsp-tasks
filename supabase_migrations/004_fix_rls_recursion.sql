-- =====================================================
-- Migration 004: Fix Infinite Recursion in RLS
-- =====================================================
-- The issue: "View teammates" and "View workspaces" policies reference each other or themselves,
-- creating an infinite loop that crashes the server (Status 500).
-- SOLUTION: Use a SECURITY DEFINER function to read memberships without triggering RLS.
-- 1. Create Helper Function (Bypasses RLS)
CREATE OR REPLACE FUNCTION get_my_workspace_ids() RETURNS uuid [] LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public -- Secure search path
    AS $$ BEGIN RETURN ARRAY(
        SELECT workspace_id
        FROM workspace_members
        WHERE user_id = auth.uid()
    );
END;
$$;
-- 2. Fix WORKSPACES Policy
DROP POLICY IF EXISTS "Ver workspaces propios" ON workspaces;
DROP POLICY IF EXISTS "Select workspaces" ON workspaces;
-- Safety drop for any other name
CREATE POLICY "Ver workspaces propios" ON workspaces FOR
SELECT USING (id = ANY(get_my_workspace_ids()));
-- 3. Fix WORKSPACE_MEMBERS Policies (The main culprit)
DROP POLICY IF EXISTS "View teammates" ON workspace_members;
DROP POLICY IF EXISTS "View members" ON workspace_members;
DROP POLICY IF EXISTS "Select members" ON workspace_members;
-- Also drop the "View own membership" just to be clean and combine or keep separate
DROP POLICY IF EXISTS "View own membership" ON workspace_members;
-- Allow seeing ALL members of workspaces I belong to (including myself)
CREATE POLICY "View workspace members" ON workspace_members FOR
SELECT USING (
        workspace_id = ANY(get_my_workspace_ids())
    );
-- 4. Fix BOARDS Policy (Just in case)
-- Use the same safe function to avoid re-triggering member checks
DROP POLICY IF EXISTS "Workspace members can view boards" ON boards;
DROP POLICY IF EXISTS "Select boards" ON boards;
DROP POLICY IF EXISTS "Ver tableros" ON boards;
CREATE POLICY "Ver tableros" ON boards FOR
SELECT USING (
        user_id = auth.uid() -- Personal boards
        OR workspace_id = ANY(get_my_workspace_ids()) -- Team boards
    );
-- 5. Ensure INSERT policies are safe too (from 003)
-- (We don't strictly need to change INSERTs as they usually use WITH CHECK, but let's be safe if they use SELECTs)
-- The INSERT policies from 003 are likely fine as they check simple conditions, but if they reference tables, they might loop.
-- Let's redefine the Board Create policy to use the safe function.
DROP POLICY IF EXISTS "Users can create boards" ON boards;
CREATE POLICY "Users can create boards" ON boards FOR
INSERT WITH CHECK (
        user_id = auth.uid()
        OR workspace_id = ANY(get_my_workspace_ids())
    );
-- End of fixes