import { describe, it, expect } from 'vitest';
import {
    WORKSPACE_ROLES,
    PERMISSIONS,
    hasPermission,
    canEditItem,
    canDeleteItem,
    getRoleName,
    getRoleColor,
    getRolePermissions,
} from '../src/utils/permissions';

// =============================================================================
// hasPermission
// =============================================================================
describe('hasPermission', () => {
    it('returns false for null/undefined inputs', () => {
        expect(hasPermission(null, PERMISSIONS.VIEW_BOARDS)).toBe(false);
        expect(hasPermission(WORKSPACE_ROLES.OWNER, null)).toBe(false);
        expect(hasPermission(undefined, undefined)).toBe(false);
    });

    it('owner has ALL permissions', () => {
        Object.values(PERMISSIONS).forEach((perm) => {
            expect(hasPermission(WORKSPACE_ROLES.OWNER, perm)).toBe(true);
        });
    });

    it('admin can invite & remove members but cannot manage workspace or change roles', () => {
        expect(hasPermission(WORKSPACE_ROLES.ADMIN, PERMISSIONS.INVITE_MEMBERS)).toBe(true);
        expect(hasPermission(WORKSPACE_ROLES.ADMIN, PERMISSIONS.REMOVE_MEMBERS)).toBe(true);
        expect(hasPermission(WORKSPACE_ROLES.ADMIN, PERMISSIONS.MANAGE_WORKSPACE)).toBe(false);
        expect(hasPermission(WORKSPACE_ROLES.ADMIN, PERMISSIONS.CHANGE_MEMBER_ROLES)).toBe(false);
    });

    it('member can create tasks but cannot delete all tasks', () => {
        expect(hasPermission(WORKSPACE_ROLES.MEMBER, PERMISSIONS.CREATE_TASKS)).toBe(true);
        expect(hasPermission(WORKSPACE_ROLES.MEMBER, PERMISSIONS.DELETE_ALL_TASKS)).toBe(false);
    });

    it('viewer can only view boards and activity log', () => {
        expect(hasPermission(WORKSPACE_ROLES.VIEWER, PERMISSIONS.VIEW_BOARDS)).toBe(true);
        expect(hasPermission(WORKSPACE_ROLES.VIEWER, PERMISSIONS.VIEW_ACTIVITY_LOG)).toBe(true);
        expect(hasPermission(WORKSPACE_ROLES.VIEWER, PERMISSIONS.CREATE_TASKS)).toBe(false);
        expect(hasPermission(WORKSPACE_ROLES.VIEWER, PERMISSIONS.ADD_COMMENTS)).toBe(false);
    });

    it('unknown role has no permissions', () => {
        expect(hasPermission('unknown_role', PERMISSIONS.VIEW_BOARDS)).toBe(false);
    });
});

// =============================================================================
// canEditItem
// =============================================================================
describe('canEditItem', () => {
    const userId = 'user-1';
    const otherId = 'user-2';

    it('owner/admin can edit any item (editAll permission)', () => {
        expect(canEditItem(WORKSPACE_ROLES.OWNER, otherId, userId, PERMISSIONS.EDIT_ALL_TASKS, PERMISSIONS.EDIT_OWN_TASKS)).toBe(true);
        expect(canEditItem(WORKSPACE_ROLES.ADMIN, otherId, userId, PERMISSIONS.EDIT_ALL_TASKS, PERMISSIONS.EDIT_OWN_TASKS)).toBe(true);
    });

    it('member can edit own item only', () => {
        expect(canEditItem(WORKSPACE_ROLES.MEMBER, userId, userId, PERMISSIONS.EDIT_ALL_TASKS, PERMISSIONS.EDIT_OWN_TASKS)).toBe(true);
        expect(canEditItem(WORKSPACE_ROLES.MEMBER, otherId, userId, PERMISSIONS.EDIT_ALL_TASKS, PERMISSIONS.EDIT_OWN_TASKS)).toBe(false);
    });

    it('viewer cannot edit anything', () => {
        expect(canEditItem(WORKSPACE_ROLES.VIEWER, userId, userId, PERMISSIONS.EDIT_ALL_TASKS, PERMISSIONS.EDIT_OWN_TASKS)).toBe(false);
    });
});

// =============================================================================
// canDeleteItem
// =============================================================================
describe('canDeleteItem', () => {
    const userId = 'user-1';
    const otherId = 'user-2';

    it('owner/admin can delete any item', () => {
        expect(canDeleteItem(WORKSPACE_ROLES.OWNER, otherId, userId, PERMISSIONS.DELETE_ALL_TASKS, PERMISSIONS.DELETE_OWN_TASKS)).toBe(true);
        expect(canDeleteItem(WORKSPACE_ROLES.ADMIN, otherId, userId, PERMISSIONS.DELETE_ALL_TASKS, PERMISSIONS.DELETE_OWN_TASKS)).toBe(true);
    });

    it('member can delete own item only', () => {
        expect(canDeleteItem(WORKSPACE_ROLES.MEMBER, userId, userId, PERMISSIONS.DELETE_ALL_TASKS, PERMISSIONS.DELETE_OWN_TASKS)).toBe(true);
        expect(canDeleteItem(WORKSPACE_ROLES.MEMBER, otherId, userId, PERMISSIONS.DELETE_ALL_TASKS, PERMISSIONS.DELETE_OWN_TASKS)).toBe(false);
    });

    it('viewer cannot delete anything', () => {
        expect(canDeleteItem(WORKSPACE_ROLES.VIEWER, userId, userId, PERMISSIONS.DELETE_ALL_TASKS, PERMISSIONS.DELETE_OWN_TASKS)).toBe(false);
    });
});

// =============================================================================
// getRoleName
// =============================================================================
describe('getRoleName', () => {
    it('returns Spanish names for known roles', () => {
        expect(getRoleName('owner')).toBe('Propietario');
        expect(getRoleName('admin')).toBe('Administrador');
        expect(getRoleName('member')).toBe('Miembro');
        expect(getRoleName('viewer')).toBe('Observador');
    });

    it('returns the raw value for unknown roles', () => {
        expect(getRoleName('superadmin')).toBe('superadmin');
    });
});

// =============================================================================
// getRoleColor
// =============================================================================
describe('getRoleColor', () => {
    it('returns the correct color for each role', () => {
        expect(getRoleColor('owner')).toBe('purple');
        expect(getRoleColor('admin')).toBe('blue');
        expect(getRoleColor('member')).toBe('green');
        expect(getRoleColor('viewer')).toBe('gray');
    });

    it('returns gray for unknown roles', () => {
        expect(getRoleColor('unknown')).toBe('gray');
    });
});

// =============================================================================
// getRolePermissions
// =============================================================================
describe('getRolePermissions', () => {
    it('owner gets all permissions', () => {
        const ownerPerms = getRolePermissions('owner');
        expect(ownerPerms).toEqual(expect.arrayContaining(Object.values(PERMISSIONS)));
        expect(ownerPerms.length).toBe(Object.values(PERMISSIONS).length);
    });

    it('viewer gets exactly 2 permissions', () => {
        const viewerPerms = getRolePermissions('viewer');
        expect(viewerPerms).toHaveLength(2);
        expect(viewerPerms).toContain(PERMISSIONS.VIEW_BOARDS);
        expect(viewerPerms).toContain(PERMISSIONS.VIEW_ACTIVITY_LOG);
    });

    it('unknown role returns empty array', () => {
        expect(getRolePermissions('unknown')).toEqual([]);
    });
});
