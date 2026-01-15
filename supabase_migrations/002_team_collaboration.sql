-- =====================================================
-- Migration 002: Team Collaboration & Invitation System
-- =====================================================
-- PART 1: ROLE ENUM TYPE
DO $$ BEGIN CREATE TYPE workspace_role AS ENUM ('owner', 'admin', 'member', 'viewer');
EXCEPTION
WHEN duplicate_object THEN null;
END $$;
-- PART 2: WORKSPACES TABLE
-- Create the workspaces table first (Required for boards and members)
CREATE TABLE IF NOT EXISTS workspaces (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    user_id uuid REFERENCES auth.users(id) NOT NULL,
    -- Owner of the workspace
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
-- Enable Row Level Security (RLS) on workspaces
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
-- CHECK FOR user_id COLUMN (Fix for schema mismatch)
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'workspaces'
        AND column_name = 'user_id'
) THEN -- Check if 'owner' exists (common alternative) and rename it
IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'workspaces'
        AND column_name = 'owner'
) THEN
ALTER TABLE workspaces
    RENAME COLUMN owner TO user_id;
ELSE -- Otherwise add user_id column (nullable first to avoid errors)
ALTER TABLE workspaces
ADD COLUMN user_id uuid REFERENCES auth.users(id);
END IF;
END IF;
END $$;
-- Policy for owners to manage their workspaces
DROP POLICY IF EXISTS "owner_manage_workspaces" ON workspaces;
CREATE POLICY owner_manage_workspaces ON workspaces FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
-- CHECK FOR slug COLUMN (Fix for schema mismatch)
DO $$ BEGIN -- Check/Add slug
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'workspaces'
        AND column_name = 'slug'
) THEN
ALTER TABLE workspaces
ADD COLUMN slug TEXT;
UPDATE workspaces
SET slug = 'workspace-' || substr(id::text, 1, 8)
WHERE slug IS NULL;
END IF;
-- Check/Add created_by
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'workspaces'
        AND column_name = 'created_by'
) THEN -- Use user_id as created_by if missing
IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'workspaces'
        AND column_name = 'user_id'
) THEN
ALTER TABLE workspaces
ADD COLUMN created_by uuid REFERENCES auth.users(id);
-- Populate existing?
UPDATE workspaces
SET created_by = user_id
WHERE created_by IS NULL;
ELSE
ALTER TABLE workspaces
ADD COLUMN created_by uuid REFERENCES auth.users(id);
END IF;
END IF;
END $$;
-- PART 3: BACKFILL DEFAULT WORKSPACES
-- Create a default workspace for each user who doesn't have one
-- This ensures 'UPDATE boards' has something to link to
INSERT INTO workspaces (name, user_id, slug, created_by)
SELECT 'Mi Espacio de Trabajo',
    id,
    'workspace-' || substr(gen_random_uuid()::text, 1, 8),
    id
FROM auth.users u
WHERE NOT EXISTS (
        SELECT 1
        FROM workspaces w
        WHERE w.user_id = u.id
    );
-- PART 4: WORKSPACE MEMBERS TABLE
-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS workspace_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role workspace_role DEFAULT 'member',
    joined_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    invited_at timestamptz,
    invited_by uuid REFERENCES auth.users(id),
    UNIQUE(workspace_id, user_id)
);
-- Ensure columns exist (idempotency for existing table)
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'workspace_members'
        AND column_name = 'role'
) THEN
ALTER TABLE workspace_members
ADD COLUMN role workspace_role DEFAULT 'member';
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'workspace_members'
        AND column_name = 'invited_at'
) THEN
ALTER TABLE workspace_members
ADD COLUMN invited_at timestamptz;
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'workspace_members'
        AND column_name = 'invited_by'
) THEN
ALTER TABLE workspace_members
ADD COLUMN invited_by uuid REFERENCES auth.users(id);
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'workspace_members'
        AND column_name = 'joined_at'
) THEN
ALTER TABLE workspace_members
ADD COLUMN joined_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL;
END IF;
END $$;
-- Check/Add user_id (if missing)
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'workspaces'
        AND column_name = 'user_id'
) THEN IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'workspaces'
        AND column_name = 'owner'
) THEN
ALTER TABLE workspaces
    RENAME COLUMN owner TO user_id;
ELSE
ALTER TABLE workspaces
ADD COLUMN user_id uuid REFERENCES auth.users(id);
END IF;
END IF;
-- Try to fill null user_id from created_by if it exists
IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'workspaces'
        AND column_name = 'created_by'
) THEN
UPDATE workspaces
SET user_id = created_by
WHERE user_id IS NULL
    AND created_by IS NOT NULL;
END IF;
END $$;
-- Backfill: Add owners as members of their workspaces
INSERT INTO workspace_members (workspace_id, user_id, role, joined_at)
SELECT w.id,
    w.user_id,
    'owner'::workspace_role,
    now()
FROM workspaces w
WHERE w.user_id IS NOT NULL
    AND NOT EXISTS (
        SELECT 1
        FROM workspace_members wm
        WHERE wm.workspace_id = w.id
            AND wm.user_id = w.user_id
    );
-- PART 5: LINK BOARDS TO WORKSPACES
-- Add workspace_id column to boards
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'boards'
        AND column_name = 'workspace_id'
) THEN
ALTER TABLE boards
ADD COLUMN workspace_id uuid REFERENCES workspaces(id);
END IF;
END $$;
-- Link existing boards to the user's workspace
UPDATE boards b
SET workspace_id = (
        SELECT w.id
        FROM workspaces w
        WHERE w.user_id = b.user_id
        LIMIT 1
    )
WHERE workspace_id IS NULL;
-- PART 6: WORKSPACE INVITATIONS TABLE
CREATE TABLE IF NOT EXISTS workspace_invitations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    invitation_code text NOT NULL UNIQUE,
    role workspace_role NOT NULL DEFAULT 'member',
    invited_by uuid NOT NULL REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    expires_at timestamptz DEFAULT (now() + interval '7 days'),
    max_uses int DEFAULT 1,
    uses_count int DEFAULT 0,
    status text DEFAULT 'active' CHECK (
        status IN ('active', 'expired', 'revoked', 'exhausted')
    ),
    CONSTRAINT valid_expiration CHECK (expires_at > created_at)
);
CREATE INDEX IF NOT EXISTS idx_invitations_workspace ON workspace_invitations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_invitations_code ON workspace_invitations(invitation_code);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON workspace_invitations(status);
-- Enable RLS on invitations
ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;
-- PART 7: HELPER FUNCTIONS
-- Function to generate unique invitation code
CREATE OR REPLACE FUNCTION generate_invitation_code() RETURNS text LANGUAGE plpgsql AS $$
DECLARE chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
result text := '';
i int;
BEGIN FOR i IN 1..8 LOOP result := result || substr(
    chars,
    floor(random() * length(chars) + 1)::int,
    1
);
END LOOP;
RETURN result;
END;
$$;
-- Function to accept workspace invitation
CREATE OR REPLACE FUNCTION accept_workspace_invitation(
        p_invitation_code text,
        p_user_id uuid
    ) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_invitation workspace_invitations;
v_workspace_id uuid;
v_role workspace_role;
v_already_member boolean;
BEGIN -- Get invitation details
SELECT * INTO v_invitation
FROM workspace_invitations
WHERE invitation_code = p_invitation_code
    AND status = 'active'
    AND expires_at > now()
    AND uses_count < max_uses;
-- Check if invitation exists and is valid
IF NOT FOUND THEN RETURN jsonb_build_object(
    'success',
    false,
    'error',
    'Invalid or expired invitation code'
);
END IF;
-- Check if already a member
SELECT EXISTS (
        SELECT 1
        FROM workspace_members
        WHERE workspace_id = v_invitation.workspace_id
            AND user_id = p_user_id
    ) INTO v_already_member;
IF v_already_member THEN RETURN jsonb_build_object(
    'success',
    false,
    'error',
    'Already a member of this workspace'
);
END IF;
-- Add user to workspace
INSERT INTO workspace_members (
        workspace_id,
        user_id,
        role,
        invited_by,
        invited_at,
        joined_at
    )
VALUES (
        v_invitation.workspace_id,
        p_user_id,
        v_invitation.role,
        v_invitation.invited_by,
        v_invitation.created_at,
        now()
    );
-- Increment uses count
UPDATE workspace_invitations
SET uses_count = uses_count + 1,
    status = CASE
        WHEN uses_count + 1 >= max_uses THEN 'exhausted'
        ELSE status
    END
WHERE id = v_invitation.id;
RETURN jsonb_build_object(
    'success',
    true,
    'workspace_id',
    v_invitation.workspace_id,
    'role',
    v_invitation.role
);
END;
$$;
-- Function to check if user can perform action
CREATE OR REPLACE FUNCTION can_user_perform_action(
        p_user_id uuid,
        p_workspace_id uuid,
        p_action text
    ) RETURNS boolean LANGUAGE plpgsql STABLE AS $$
DECLARE v_role workspace_role;
BEGIN
SELECT role INTO v_role
FROM workspace_members
WHERE workspace_id = p_workspace_id
    AND user_id = p_user_id;
IF NOT FOUND THEN RETURN false;
END IF;
CASE
    p_action
    WHEN 'manage_workspace' THEN RETURN v_role IN ('owner');
WHEN 'invite_members' THEN RETURN v_role IN ('owner', 'admin');
WHEN 'remove_members' THEN RETURN v_role IN ('owner', 'admin');
WHEN 'edit_boards' THEN RETURN v_role IN ('owner', 'admin', 'member');
WHEN 'create_tasks' THEN RETURN v_role IN ('owner', 'admin', 'member');
WHEN 'edit_tasks' THEN RETURN v_role IN ('owner', 'admin', 'member');
WHEN 'delete_tasks' THEN RETURN v_role IN ('owner', 'admin', 'member');
WHEN 'view_only' THEN RETURN v_role = 'viewer';
ELSE RETURN false;
END CASE
;
END;
$$;
-- PART 8: RLS POLICIES
-- Invitation Policies
DROP POLICY IF EXISTS "Members can view workspace invitations" ON workspace_invitations;
CREATE POLICY "Members can view workspace invitations" ON workspace_invitations FOR
SELECT USING (
        workspace_id IN (
            SELECT workspace_id
            FROM workspace_members
            WHERE user_id = auth.uid()
                AND role IN ('owner', 'admin')
        )
    );
DROP POLICY IF EXISTS "Admins can create invitations" ON workspace_invitations;
CREATE POLICY "Admins can create invitations" ON workspace_invitations FOR
INSERT WITH CHECK (
        workspace_id IN (
            SELECT workspace_id
            FROM workspace_members
            WHERE user_id = auth.uid()
                AND role IN ('owner', 'admin')
        )
    );
DROP POLICY IF EXISTS "Admins can delete invitations" ON workspace_invitations;
CREATE POLICY "Admins can delete invitations" ON workspace_invitations FOR DELETE USING (
    workspace_id IN (
        SELECT workspace_id
        FROM workspace_members
        WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin')
    )
);
-- Workspace Members Policies
-- Must be careful with recursion. Using direct user_id check is safest for "own" membership.
DROP POLICY IF EXISTS "Users can view workspace members" ON workspace_members;
-- 1. Non-recursive policy for viewing own membership (CRITICAL for loading workspace)
CREATE POLICY "View own membership" ON workspace_members FOR
SELECT USING (user_id = auth.uid());
-- 2. Recursive policy for viewing teammates
CREATE POLICY "View teammates" ON workspace_members FOR
SELECT USING (
        workspace_id IN (
            SELECT workspace_id
            FROM workspace_members
            WHERE user_id = auth.uid()
        )
    );
DROP POLICY IF EXISTS "Users can update their memberships" ON workspace_members;
CREATE POLICY "Users can update their memberships" ON workspace_members FOR
UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can remove their memberships" ON workspace_members;
CREATE POLICY "Users can remove their memberships" ON workspace_members FOR DELETE USING (user_id = auth.uid());
-- Boards RLS (Updated)
DROP POLICY IF EXISTS "Workspace members can view boards" ON boards;
CREATE POLICY "Workspace members can view boards" ON boards FOR
SELECT USING (
        user_id = auth.uid()
        OR workspace_id IN (
            SELECT workspace_id
            FROM workspace_members
            WHERE user_id = auth.uid()
        )
    );
DROP POLICY IF EXISTS "Workspace members can edit boards" ON boards;
CREATE POLICY "Workspace members can edit boards" ON boards FOR
UPDATE USING (
        workspace_id IN (
            SELECT workspace_id
            FROM workspace_members
            WHERE user_id = auth.uid()
                AND role IN ('owner', 'admin', 'member')
        )
    ) WITH CHECK (
        workspace_id IN (
            SELECT workspace_id
            FROM workspace_members
            WHERE user_id = auth.uid()
                AND role IN ('owner', 'admin', 'member')
        )
    );
-- Tasks RLS (Updated)
DROP POLICY IF EXISTS "Workspace members can view tasks" ON tasks;
CREATE POLICY "Workspace members can view tasks" ON tasks FOR
SELECT USING (
        column_id IN (
            SELECT c.id
            FROM columns c
                INNER JOIN boards b ON c.board_id = b.id
                INNER JOIN workspace_members wm ON b.workspace_id = wm.workspace_id
            WHERE wm.user_id = auth.uid()
        )
    );
DROP POLICY IF EXISTS "Workspace members can insert tasks" ON tasks;
CREATE POLICY "Workspace members can insert tasks" ON tasks FOR
INSERT WITH CHECK (
        column_id IN (
            SELECT c.id
            FROM columns c
                INNER JOIN boards b ON c.board_id = b.id
                INNER JOIN workspace_members wm ON b.workspace_id = wm.workspace_id
            WHERE wm.user_id = auth.uid()
                AND wm.role IN ('owner', 'admin', 'member')
        )
    );
DROP POLICY IF EXISTS "Workspace members can update tasks" ON tasks;
CREATE POLICY "Workspace members can update tasks" ON tasks FOR
UPDATE USING (
        column_id IN (
            SELECT c.id
            FROM columns c
                INNER JOIN boards b ON c.board_id = b.id
                INNER JOIN workspace_members wm ON b.workspace_id = wm.workspace_id
            WHERE wm.user_id = auth.uid()
                AND wm.role IN ('owner', 'admin', 'member')
        )
    ) WITH CHECK (
        column_id IN (
            SELECT c.id
            FROM columns c
                INNER JOIN boards b ON c.board_id = b.id
                INNER JOIN workspace_members wm ON b.workspace_id = wm.workspace_id
            WHERE wm.user_id = auth.uid()
                AND wm.role IN ('owner', 'admin', 'member')
        )
    );
DROP POLICY IF EXISTS "Workspace members can delete tasks" ON tasks;
CREATE POLICY "Workspace members can delete tasks" ON tasks FOR DELETE USING (
    column_id IN (
        SELECT c.id
        FROM columns c
            INNER JOIN boards b ON c.board_id = b.id
            INNER JOIN workspace_members wm ON b.workspace_id = wm.workspace_id
        WHERE wm.user_id = auth.uid()
            AND wm.role IN ('owner', 'admin', 'member')
    )
);