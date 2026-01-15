# Migration 002: Team Collaboration

## Overview

This migration adds team collaboration features to your Kanban app, including:

- Workspace invitations with codes
- Role-based permissions (Owner, Admin, Member, Viewer)
- Member management
- Team access to boards and tasks

## How to Execute

### 1. Open Supabase SQL Editor

1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"

### 2. Run the Migration

1. Open the file `002_team_collaboration.sql`
2. Copy ALL the contents
3. Paste into the Supabase SQL Editor
4. Click "Run" or press `Ctrl+Enter`

### 3. Verify Success

Run these verification queries:

```sql
-- Check if role enum was created
SELECT enum_range(NULL::workspace_role);
-- Expected: {owner,admin,member,viewer}

-- Check if workspace_members has role column
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'workspace_members' AND column_name = 'role';
-- Expected: role |  USER-DEFINED

-- Check if workspace_invitations table exists
SELECT COUNT(*) FROM workspace_invitations;
-- Expected: 0 (empty table, no errors)

-- View your workspace memberships with roles
SELECT w.name, wm.role, wm.joined_at
FROM workspace_members wm
JOIN workspaces w ON wm.workspace_id = w.id
WHERE wm.user_id = auth.uid();
-- Expected: Your workspace with role = 'owner'
```

## What Changes

### New Database Objects

1. **Enum Type:** `workspace_role`
   - Values: owner, admin, member, viewer

2. **Table:** `workspace_invitations`
   - Stores invitation codes with expiration and usage limits

3. **Enhanced Table:** `workspace_members`
   - New columns: `role`, `invited_at`, `invited_by`

4. **Functions:**
   - `generate_invitation_code()` - Creates unique 8-character codes
   - `accept_workspace_invitation()` - Processes invitation acceptance
   - `can_user_perform_action()` - Checks permissions

### Updated RLS Policies

- Workspace members can now view other members
- Team members get access to shared boards and tasks
- Owners/Admins can manage invitations
- Permissions enforced based on roles

## Testing the System

### 1. Generate an Invitation (as Owner)

```sql
-- This will be done via UI, but you can test manually:
INSERT INTO workspace_invitations (workspace_id, invitation_code, role, invited_by)
VALUES (
    'YOUR_WORKSPACE_ID',
    'TEST1234',
    'member',
    auth.uid()
);
```

### 2. Accept Invitation (as different user)

```sql
SELECT accept_workspace_invitation('TEST1234', auth.uid());
```

### 3. Check Member List

```sql
SELECT 
    u.email,
    wm.role,
    wm.joined_at
FROM workspace_members wm
JOIN profiles u ON wm.user_id = u.id
WHERE wm.workspace_id = 'YOUR_WORKSPACE_ID';
```

## Role Permissions

| Feature | Owner | Admin | Member | Viewer |
|---------|-------|-------|--------|--------|
| Manage workspace | ✅ | ❌ | ❌ | ❌ |
| Invite members | ✅ | ✅ | ❌ | ❌ |
| Remove members | ✅ | ✅ | ❌ | ❌ |
| Change roles | ✅ | ✅ | ❌ | ❌ |
| Create/edit boards | ✅ | ✅ | ✅ | ❌ |
| Create/edit tasks | ✅ | ✅ | ✅ | ❌ |
| Delete tasks | ✅ | ✅ | ✅ | ❌ |
| Add comments | ✅ | ✅ | ✅ | ❌ |
| View only | ✅ | ✅ | ✅ | ✅ |

## Rollback

If you need to revert this migration:

```sql
-- Drop new objects
DROP FUNCTION IF EXISTS accept_workspace_invitation(text, uuid);
DROP FUNCTION IF EXISTS generate_invitation_code();
DROP FUNCTION IF EXISTS can_user_perform_action(uuid, uuid, text);
DROP TABLE IF EXISTS workspace_invitations;

-- Remove added columns from workspace_members
ALTER TABLE workspace_members 
DROP COLUMN IF EXISTS role,
DROP COLUMN IF EXISTS invited_at,
DROP COLUMN IF EXISTS invited_by;

-- Drop enum type
DROP TYPE IF EXISTS workspace_role;
```

⚠️ **Warning:** Rollback will delete all invitation data and member roles!

## Next Steps

After running this migration:

1. Restart your development server
2. The workspace features will be available in the UI
3. Look for the "Workspace Settings" button in the sidebar
4. Use "Invite Member" to generate invitation codes
5. Share codes with team members

## Troubleshooting

**Error: "role already exists"**

- The migration is designed to be idempotent
- It checks if objects exist before creating them
- Safe to run multiple times

**Can't see workspace settings button**

- Make sure you're logged in as the workspace owner
- Check browser console for errors
- Verify WorkspaceProvider is wrapping your app

**Invitation code not working**

- Check if code has expired
- Verify max uses hasn't been reached
- Code must be exactly 8 characters
- Case sensitive (uppercase)
