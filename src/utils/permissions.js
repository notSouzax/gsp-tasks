/**
 * Workspace Permission System
 * 
 * Defines role-based permissions for workspace collaboration
 */

// Role definitions
export const WORKSPACE_ROLES = {
    OWNER: 'owner',
    ADMIN: 'admin',
    MEMBER: 'member',
    VIEWER: 'viewer'
};

// Permission definitions
export const PERMISSIONS = {
    // Workspace Management
    MANAGE_WORKSPACE: 'manage_workspace',           // Edit workspace settings, delete workspace
    INVITE_MEMBERS: 'invite_members',               // Create invitations
    REMOVE_MEMBERS: 'remove_members',               // Remove members from workspace
    CHANGE_MEMBER_ROLES: 'change_member_roles',     // Modify member roles

    // Board Management
    CREATE_BOARDS: 'create_boards',                 // Create new boards
    EDIT_BOARDS: 'edit_boards',                     // Edit board settings
    DELETE_BOARDS: 'delete_boards',                 // Delete boards
    MANAGE_COLUMNS: 'manage_columns',               // Create/edit/delete columns

    // Task Management
    CREATE_TASKS: 'create_tasks',                   // Create new tasks
    EDIT_ALL_TASKS: 'edit_all_tasks',               // Edit any task
    EDIT_OWN_TASKS: 'edit_own_tasks',               // Edit tasks created by user
    DELETE_ALL_TASKS: 'delete_all_tasks',           // Delete any task
    DELETE_OWN_TASKS: 'delete_own_tasks',           // Delete tasks created by user
    MOVE_TASKS: 'move_tasks',                       // Move tasks between columns

    // Collaboration
    ADD_COMMENTS: 'add_comments',                   // Add comments to tasks
    EDIT_OWN_COMMENTS: 'edit_own_comments',         // Edit own comments
    DELETE_OWN_COMMENTS: 'delete_own_comments',     // Delete own comments
    DELETE_ALL_COMMENTS: 'delete_all_comments',     // Delete any comment

    // Viewing
    VIEW_BOARDS: 'view_boards',                     // View boards (all roles have this)
    VIEW_ACTIVITY_LOG: 'view_activity_log',         // View activity history
};

// Role to permissions mapping
const ROLE_PERMISSIONS = {
    [WORKSPACE_ROLES.OWNER]: [
        // Owners have ALL permissions
        ...Object.values(PERMISSIONS)
    ],

    [WORKSPACE_ROLES.ADMIN]: [
        // Workspace
        PERMISSIONS.INVITE_MEMBERS,
        PERMISSIONS.REMOVE_MEMBERS,

        // Boards
        PERMISSIONS.CREATE_BOARDS,
        PERMISSIONS.EDIT_BOARDS,
        PERMISSIONS.DELETE_BOARDS,
        PERMISSIONS.MANAGE_COLUMNS,

        // Tasks
        PERMISSIONS.CREATE_TASKS,
        PERMISSIONS.EDIT_ALL_TASKS,
        PERMISSIONS.DELETE_ALL_TASKS,
        PERMISSIONS.MOVE_TASKS,

        // Collaboration
        PERMISSIONS.ADD_COMMENTS,
        PERMISSIONS.EDIT_OWN_COMMENTS,
        PERMISSIONS.DELETE_OWN_COMMENTS,
        PERMISSIONS.DELETE_ALL_COMMENTS,

        // Viewing
        PERMISSIONS.VIEW_BOARDS,
        PERMISSIONS.VIEW_ACTIVITY_LOG,
    ],

    [WORKSPACE_ROLES.MEMBER]: [
        // Boards
        PERMISSIONS.CREATE_BOARDS,
        PERMISSIONS.EDIT_BOARDS,
        PERMISSIONS.MANAGE_COLUMNS,

        // Tasks
        PERMISSIONS.CREATE_TASKS,
        PERMISSIONS.EDIT_OWN_TASKS,
        PERMISSIONS.DELETE_OWN_TASKS,
        PERMISSIONS.MOVE_TASKS,

        // Collaboration
        PERMISSIONS.ADD_COMMENTS,
        PERMISSIONS.EDIT_OWN_COMMENTS,
        PERMISSIONS.DELETE_OWN_COMMENTS,

        // Viewing
        PERMISSIONS.VIEW_BOARDS,
        PERMISSIONS.VIEW_ACTIVITY_LOG,
    ],

    [WORKSPACE_ROLES.VIEWER]: [
        // Viewing only
        PERMISSIONS.VIEW_BOARDS,
        PERMISSIONS.VIEW_ACTIVITY_LOG,
    ]
};

/**
 * Check if a role has a specific permission
 * @param {string} role - User's role in workspace
 * @param {string} permission - Permission to check
 * @returns {boolean}
 */
export const hasPermission = (role, permission) => {
    if (!role || !permission) return false;
    const permissions = ROLE_PERMISSIONS[role] || [];
    return permissions.includes(permission);
};

/**
 * Check if user can edit a specific item (task, comment, etc.)
 * @param {string} role - User's role
 * @param {string} itemOwnerId - ID of user who created the item
 * @param {string} currentUserId - Current user's ID
 * @param {string} editAllPermission - Permission needed to edit all items
 * @param {string} editOwnPermission - Permission needed to edit own items
 * @returns {boolean}
 */
export const canEditItem = (role, itemOwnerId, currentUserId, editAllPermission, editOwnPermission) => {
    // Can edit if has permission to edit all
    if (hasPermission(role, editAllPermission)) {
        return true;
    }

    // Or if it's their own item and they have permission to edit own
    if (itemOwnerId === currentUserId && hasPermission(role, editOwnPermission)) {
        return true;
    }

    return false;
};

/**
 * Check if user can delete a specific item
 * @param {string} role - User's role
 * @param {string} itemOwnerId - ID of user who created the item
 * @param {string} currentUserId - Current user's ID
 * @param {string} deleteAllPermission - Permission needed to delete all items
 * @param {string} deleteOwnPermission - Permission needed to delete own items
 * @returns {boolean}
 */
export const canDeleteItem = (role, itemOwnerId, currentUserId, deleteAllPermission, deleteOwnPermission) => {
    // Can delete if has permission to delete all
    if (hasPermission(role, deleteAllPermission)) {
        return true;
    }

    // Or if it's their own item and they have permission to delete own
    if (itemOwnerId === currentUserId && hasPermission(role, deleteOwnPermission)) {
        return true;
    }

    return false;
};

/**
 * Get user-friendly role name
 * @param {string} role
 * @returns {string}
 */
export const getRoleName = (role) => {
    const roleNames = {
        [WORKSPACE_ROLES.OWNER]: 'Propietario',
        [WORKSPACE_ROLES.ADMIN]: 'Administrador',
        [WORKSPACE_ROLES.MEMBER]: 'Miembro',
        [WORKSPACE_ROLES.VIEWER]: 'Observador'
    };
    return roleNames[role] || role;
};

/**
 * Get role color for badges
 * @param {string} role
 * @returns {string}
 */
export const getRoleColor = (role) => {
    const roleColors = {
        [WORKSPACE_ROLES.OWNER]: 'purple',
        [WORKSPACE_ROLES.ADMIN]: 'blue',
        [WORKSPACE_ROLES.MEMBER]: 'green',
        [WORKSPACE_ROLES.VIEWER]: 'gray'
    };
    return roleColors[role] || 'gray';
};

/**
 * Get all permissions a role has (for display/debugging)
 * @param {string} role
 * @returns {string[]}
 */
export const getRolePermissions = (role) => {
    return ROLE_PERMISSIONS[role] || [];
};
