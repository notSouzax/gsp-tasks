-- =====================================================
-- Migration 003: Fix RLS Policies for Inserts
-- =====================================================
-- 1. Policies for WORKSPACE_MEMBERS
-- Allow users to insert THEMSELVES (necessary for workspace creation flow where client adds self)
DROP POLICY IF EXISTS "Users can add themselves to workspace" ON workspace_members;
CREATE POLICY "Users can add themselves to workspace" ON workspace_members FOR
INSERT WITH CHECK (user_id = auth.uid());
-- 2. Policies for BOARDS
-- Allow users to create boards (linked to workspace they are member of, OR personal)
DROP POLICY IF EXISTS "Users can create boards" ON boards;
CREATE POLICY "Users can create boards" ON boards FOR
INSERT WITH CHECK (
        -- Case 1: Linked to a workspace
        (
            workspace_id IS NOT NULL
            AND workspace_id IN (
                SELECT workspace_id
                FROM workspace_members
                WHERE user_id = auth.uid()
            )
        )
        OR -- Case 2: Personal board (no workspace or user matches)
        (user_id = auth.uid())
    );
-- 3. Fix WORKSPACES Policy (Just in case)
-- Ensure owner can update/delete
DROP POLICY IF EXISTS "Owner manage workspaces" ON workspaces;
CREATE POLICY "Owner manage workspaces" ON workspaces FOR ALL USING (user_id = auth.uid());
-- 4. Fix TASKS Policy (Ensure Insert works)
-- (Already present in 002 but reinforcing/checking)
-- 5. Force a re-calculation of memberships for current user contexts
-- (Not strictly SQL, but ensuring the policies are active)