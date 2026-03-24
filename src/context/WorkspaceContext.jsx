import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import { hasPermission, PERMISSIONS, WORKSPACE_ROLES } from '../utils/permissions';
import logger from '../utils/logger';

const WorkspaceContext = createContext();
const WS_CACHE_KEY = 'gsp-cached-workspace';

/** Cache workspace data for instant restore */
const cacheWorkspace = (workspace, role, members) => {
    try {
        localStorage.setItem(WS_CACHE_KEY, JSON.stringify({
            workspace, role, members: members || [],
            ts: Date.now()
        }));
    } catch { /* ignore */ }
};

const getCachedWorkspace = () => {
    try {
        const raw = localStorage.getItem(WS_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (Date.now() - parsed.ts > 24 * 60 * 60 * 1000) {
            localStorage.removeItem(WS_CACHE_KEY);
            return null;
        }
        return parsed;
    } catch { return null; }
};

const clearCachedWorkspace = () => {
    try { localStorage.removeItem(WS_CACHE_KEY); } catch { /* ignore */ }
};

export const useWorkspace = () => {
    const context = useContext(WorkspaceContext);
    if (!context) {
        throw new Error('useWorkspace must be used within WorkspaceProvider');
    }
    return context;
};

export const WorkspaceProvider = ({ children }) => {
    const { currentUser } = useAuth();
    const cached = useRef(getCachedWorkspace());
    const [currentWorkspace, setCurrentWorkspace] = useState(cached.current?.workspace || null);
    const [workspaceMembers, setWorkspaceMembers] = useState(cached.current?.members || []);
    const [pendingInvitations, setPendingInvitations] = useState([]);
    const [userRole, setUserRole] = useState(cached.current?.role || null);
    const [loading, setLoading] = useState(!cached.current);

    // Fetch user's default workspace and their role
    const fetchWorkspace = useCallback(async () => {
        try {
            // If no user, just clear state and exit
            if (!currentUser) {
                clearCachedWorkspace();
                setCurrentWorkspace(null);
                setUserRole(null);
                return;
            }

            // Get user's workspace membership (order by most recent)
            const { data: memberships, error: memberError } = await supabase
                .from('workspace_members')
                .select(`
                    role,
                    workspace_id,
                    workspaces (*)
                `)
                .eq('user_id', currentUser.id)
                .order('joined_at');

            if (memberError) {
                logger.error('Error fetching workspace:', memberError);
                // Don't return - let finally run to set loading false
            }

            // Use the first workspace (most recent)
            if (memberships && memberships.length > 0) {
                const membership = memberships[0];
                setCurrentWorkspace(membership.workspaces);
                setUserRole(membership.role);
                cacheWorkspace(membership.workspaces, membership.role, workspaceMembers);
            } else if (!memberError) {
                // FAILSAFE: Auto-create workspace if none exists (only if no error above)
                logger.info('WorkspaceContext', 'No workspace found, auto-creating one...');

                // 1. Create Workspace
                const { data: newWorkspace, error: createError } = await supabase
                    .from('workspaces')
                    .insert([{
                        name: 'Mi Espacio de Trabajo',
                        user_id: currentUser.id
                    }])
                    .select()
                    .single();

                if (createError) {
                    logger.error('Error auto-creating workspace:', createError);
                    // Don't return - let finally run
                } else {
                    // 2. Add as Owner
                    const { error: addMemberError } = await supabase
                        .from('workspace_members')
                        .insert([{
                            workspace_id: newWorkspace.id,
                            user_id: currentUser.id,
                            role: 'owner',
                            joined_at: new Date().toISOString()
                        }]);

                    if (addMemberError) {
                        logger.error('Error adding owner to new workspace:', addMemberError);
                    }

                    // 3. Link existing boards (Self-healing)
                    await supabase
                        .from('boards')
                        .update({ workspace_id: newWorkspace.id })
                        .eq('user_id', currentUser.id)
                        .is('workspace_id', null);

                    // 4. Set State
                    setCurrentWorkspace(newWorkspace);
                    setUserRole('owner');
                    cacheWorkspace(newWorkspace, 'owner', []);
                }
            }
        } catch (error) {
            logger.error('Error in fetchWorkspace:', error);
        } finally {
            // ALWAYS set loading to false to prevent infinite loading state
            setLoading(false);
        }
    }, [currentUser]);

    // Fetch workspace members
    const fetchMembers = useCallback(async () => {
        if (!currentWorkspace) return;

        try {
            const { data, error } = await supabase
                .from('workspace_members')
                .select(`
                    *,
                    profiles:user_id (
                        id,
                        email,
                        full_name,
                        avatar_url
                    )
                `)
                .eq('workspace_id', currentWorkspace.id)
                .order('joined_at', { ascending: true });

            if (error) throw error;

            const members = data || [];
            setWorkspaceMembers(members);
            // Update cache with fresh members
            if (currentWorkspace && userRole) {
                cacheWorkspace(currentWorkspace, userRole, members);
            }
        } catch (error) {
            logger.error('Error fetching members:', error);
        }
    }, [currentWorkspace]);

    // Fetch active invitations (only for admins/owners)
    const fetchInvitations = useCallback(async () => {
        if (!currentWorkspace) return;
        if (!hasPermission(userRole, PERMISSIONS.INVITE_MEMBERS)) return;

        try {
            const { data, error } = await supabase
                .from('workspace_invitations')
                .select('*')
                .eq('workspace_id', currentWorkspace.id)
                .eq('status', 'active')
                .order('created_at', { ascending: false });

            if (error) throw error;

            setPendingInvitations(data || []);
        } catch (error) {
            logger.error('Error fetching invitations:', error);
        }
    }, [currentWorkspace, userRole]);

    // Create invitation
    const createInvitation = async (role = WORKSPACE_ROLES.MEMBER, maxUses = 1, expiresInDays = 7) => {
        if (!currentWorkspace || !currentUser) return null;
        if (!hasPermission(userRole, PERMISSIONS.INVITE_MEMBERS)) {
            throw new Error('No tienes permisos para invitar miembros');
        }

        try {
            // Generate unique code
            const code = await generateInvitationCode();

            const { data, error } = await supabase
                .from('workspace_invitations')
                .insert([{
                    workspace_id: currentWorkspace.id,
                    invitation_code: code,
                    role,
                    invited_by: currentUser.id,
                    max_uses: maxUses,
                    expires_at: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
                }])
                .select()
                .single();

            if (error) throw error;

            // Refresh invitations list
            await fetchInvitations();

            return data;
        } catch (error) {
            logger.error('Error creating invitation:', error);
            throw error;
        }
    };

    // Generate invitation code
    const generateInvitationCode = async () => {
        const { data, error } = await supabase.rpc('generate_invitation_code');
        if (error) throw error;
        return data;
    };

    // Accept invitation
    const acceptInvitation = async (invitationCode) => {
        if (!currentUser) return null;

        try {
            const { data, error } = await supabase.rpc('accept_workspace_invitation', {
                p_invitation_code: invitationCode,
                p_user_id: currentUser.id
            });

            if (error) throw error;

            if (!data.success) {
                throw new Error(data.error);
            }

            // Refresh workspace data
            await fetchWorkspace();
            await fetchMembers();

            return data;
        } catch (error) {
            logger.error('Error accepting invitation:', error);
            throw error;
        }
    };

    // Revoke invitation
    const revokeInvitation = async (invitationId) => {
        if (!hasPermission(userRole, PERMISSIONS.INVITE_MEMBERS)) {
            throw new Error('No tienes permisos para revocar invitaciones');
        }

        try {
            const { error } = await supabase
                .from('workspace_invitations')
                .update({ status: 'revoked' })
                .eq('id', invitationId);

            if (error) throw error;

            // Refresh invitations
            await fetchInvitations();
        } catch (error) {
            logger.error('Error revoking invitation:', error);
            throw error;
        }
    };

    // Update member role
    const updateMemberRole = async (memberId, newRole) => {
        if (!hasPermission(userRole, PERMISSIONS.CHANGE_MEMBER_ROLES)) {
            throw new Error('No tienes permisos para cambiar roles');
        }

        try {
            const { error } = await supabase
                .from('workspace_members')
                .update({ role: newRole })
                .eq('id', memberId);

            if (error) throw error;

            // Refresh members
            await fetchMembers();
        } catch (error) {
            logger.error('Error updating member role:', error);
            throw error;
        }
    };

    // Remove member
    const removeMember = async (memberId) => {
        if (!hasPermission(userRole, PERMISSIONS.REMOVE_MEMBERS)) {
            throw new Error('No tienes permisos para eliminar miembros');
        }

        try {
            const { error } = await supabase
                .from('workspace_members')
                .delete()
                .eq('id', memberId);

            if (error) throw error;

            // Refresh members
            await fetchMembers();
        } catch (error) {
            logger.error('Error removing member:', error);
            throw error;
        }
    };

    // Permission checking helpers
    const canInviteMembers = hasPermission(userRole, PERMISSIONS.INVITE_MEMBERS);
    const canManageMembers = hasPermission(userRole, PERMISSIONS.REMOVE_MEMBERS);
    const canEditWorkspace = hasPermission(userRole, PERMISSIONS.MANAGE_WORKSPACE);

    // Load workspace on mount
    useEffect(() => {
        fetchWorkspace();
    }, [fetchWorkspace]);

    // Load members when workspace changes
    useEffect(() => {
        fetchMembers();
        fetchInvitations();
    }, [fetchMembers, fetchInvitations]);

    // Real-time subscription for workspace members
    useEffect(() => {
        if (!currentWorkspace) return;

        const channel = supabase
            .channel(`workspace_members:${currentWorkspace.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'workspace_members',
                    filter: `workspace_id=eq.${currentWorkspace.id}`
                },
                () => {
                    fetchMembers();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentWorkspace, fetchMembers]);

    const value = {
        currentWorkspace,
        workspaceMembers,
        pendingInvitations,
        userRole,
        loading,

        // Actions
        createInvitation,
        acceptInvitation,
        revokeInvitation,
        updateMemberRole,
        removeMember,
        refreshWorkspace: fetchWorkspace,
        refreshMembers: fetchMembers,

        // Permission flags
        canInviteMembers,
        canManageMembers,
        canEditWorkspace,

        // Helper to check any permission
        hasPermission: (permission) => hasPermission(userRole, permission),
    };

    return (
        <WorkspaceContext.Provider value={value}>
            {children}
        </WorkspaceContext.Provider>
    );
};

export default WorkspaceContext;
