import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { genCode } from './utils';

const TeamContext = createContext(null);
const LAST_TEAM_KEY = 'gsp-last-team';

export const useTeam = () => {
    const ctx = useContext(TeamContext);
    if (!ctx) throw new Error('useTeam must be used within TeamProvider');
    return ctx;
};

export const TeamProvider = ({ children }) => {
    const { currentUser } = useAuth();
    const userId = currentUser?.id;
    const queryClient = useQueryClient();

    const [selectedTeamId, setCurrentTeamId] = useState(() => {
        try { return localStorage.getItem(LAST_TEAM_KEY) || null; } catch { return null; }
    });

    // --- Equipos del usuario ---
    const { data: teams = [], isLoading: teamsLoading } = useQuery({
        queryKey: ['teams', userId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('team_members')
                .select('role, team:teams(*)')
                .eq('user_id', userId);
            if (error) throw error;
            return (data || [])
                .filter((r) => r.team)
                .map((r) => ({ ...r.team, myRole: r.role }))
                .sort((a, b) => a.name.localeCompare(b.name));
        },
        enabled: !!userId,
        staleTime: 30_000,
    });

    // Equipo actual: el seleccionado si sigue siendo válido; si no, el primero.
    const currentTeamId = useMemo(() => {
        if (selectedTeamId && teams.some((t) => t.id === selectedTeamId)) return selectedTeamId;
        return teams[0]?.id || null;
    }, [selectedTeamId, teams]);

    // Persistir la selección efectiva (solo escribe en localStorage, no estado)
    useEffect(() => {
        try {
            if (currentTeamId) localStorage.setItem(LAST_TEAM_KEY, currentTeamId);
        } catch { /* ignore */ }
    }, [currentTeamId]);

    const currentTeam = useMemo(
        () => teams.find((t) => t.id === currentTeamId) || null,
        [teams, currentTeamId]
    );
    const role = currentTeam?.myRole || null;
    const isTeamAdmin = role === 'admin';
    const canManage = role === 'admin' || role === 'editor';

    // --- Miembros del equipo actual (+ perfiles) ---
    const { data: members = [] } = useQuery({
        queryKey: ['team', 'members', currentTeamId],
        queryFn: async () => {
            const { data: rows, error } = await supabase
                .from('team_members')
                .select('*')
                .eq('team_id', currentTeamId)
                .order('joined_at', { ascending: true });
            if (error) throw error;

            const ids = (rows || []).map((r) => r.user_id);
            let profiles = [];
            if (ids.length > 0) {
                const { data: profs } = await supabase
                    .from('profiles')
                    .select('id, email, full_name, avatar_url')
                    .in('id', ids);
                profiles = profs || [];
            }
            const profMap = Object.fromEntries(profiles.map((p) => [p.id, p]));
            return (rows || []).map((r) => ({ ...r, profile: profMap[r.user_id] || null }));
        },
        enabled: !!currentTeamId,
        staleTime: 30_000,
    });

    const memberMap = useMemo(() => {
        const map = {};
        members.forEach((m) => {
            const p = m.profile || {};
            map[m.user_id] = {
                id: m.user_id,
                name: p.full_name || p.email?.split('@')[0] || 'Miembro',
                avatar_url: p.avatar_url || null,
                email: p.email || null,
                role: m.role,
            };
        });
        if (userId && !map[userId] && currentUser) {
            map[userId] = {
                id: userId,
                name: currentUser.name || currentUser.email?.split('@')[0] || 'Yo',
                avatar_url: currentUser.avatar_url || null,
                email: currentUser.email || null,
                role,
            };
        }
        return map;
    }, [members, userId, currentUser, role]);

    // --- Invitaciones (solo devuelve filas si eres admin, por RLS) ---
    const { data: invitations = [] } = useQuery({
        queryKey: ['team', 'invitations', currentTeamId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('team_invitations')
                .select('*')
                .eq('team_id', currentTeamId)
                .eq('status', 'active')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        },
        enabled: !!currentTeamId && isTeamAdmin,
        staleTime: 30_000,
    });

    // Realtime: refrescar equipos/miembros al cambiar membresías
    useEffect(() => {
        if (!userId) return;
        const channel = supabase
            .channel(`team_members_watch:${userId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members' }, () => {
                queryClient.invalidateQueries({ queryKey: ['teams'] });
                queryClient.invalidateQueries({ queryKey: ['team', 'members'] });
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [userId, queryClient]);

    const refreshTeams = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['teams'] });
        queryClient.invalidateQueries({ queryKey: ['team', 'members'] });
        queryClient.invalidateQueries({ queryKey: ['team', 'invitations'] });
    }, [queryClient]);

    // --- Acciones ---
    const createTeam = async (name) => {
        const { data, error } = await supabase.rpc('create_team', { p_name: name });
        if (error) throw error;
        refreshTeams();
        const created = Array.isArray(data) ? data[0] : data;
        if (created?.id) setCurrentTeamId(created.id);
        return created;
    };

    const joinByCode = async (code) => {
        const { data, error } = await supabase.rpc('join_team_by_code', { p_code: code });
        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'No se pudo unir');
        refreshTeams();
        if (data.team_id) setCurrentTeamId(data.team_id);
        return data;
    };

    const acceptInvite = async (code) => {
        const { data, error } = await supabase.rpc('accept_team_invitation', { p_code: code });
        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'Invitación no válida');
        refreshTeams();
        if (data.team_id) setCurrentTeamId(data.team_id);
        return data;
    };

    const leaveTeam = async (teamId) => {
        const { error } = await supabase.from('team_members').delete().eq('team_id', teamId).eq('user_id', userId);
        if (error) throw error;
        setCurrentTeamId(null);
        refreshTeams();
    };

    const regenerateCode = async () => {
        const newCode = genCode();
        const { error } = await supabase.from('teams').update({ access_code: newCode }).eq('id', currentTeamId);
        if (error) throw error;
        refreshTeams();
        return newCode;
    };

    const renameTeam = async (name) => {
        const { error } = await supabase.rpc('rename_team', { p_team: currentTeamId, p_name: name });
        if (error) throw error;
        refreshTeams();
    };

    const createInvitation = async ({ role: invRole = 'member', maxUses = 1, days = 30 } = {}) => {
        const code = genCode();
        const { data, error } = await supabase
            .from('team_invitations')
            .insert([{
                team_id: currentTeamId,
                invitation_code: code,
                role: invRole,
                invited_by: userId,
                max_uses: maxUses,
                expires_at: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(),
            }])
            .select()
            .single();
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['team', 'invitations', currentTeamId] });
        return data;
    };

    const revokeInvitation = async (id) => {
        const { error } = await supabase.from('team_invitations').delete().eq('id', id);
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['team', 'invitations', currentTeamId] });
    };

    const updateMemberRole = async (targetUserId, newRole) => {
        const { error } = await supabase
            .from('team_members')
            .update({ role: newRole })
            .eq('team_id', currentTeamId)
            .eq('user_id', targetUserId);
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['team', 'members', currentTeamId] });
        queryClient.invalidateQueries({ queryKey: ['teams'] });
    };

    const removeMember = async (targetUserId) => {
        const { error } = await supabase
            .from('team_members')
            .delete()
            .eq('team_id', currentTeamId)
            .eq('user_id', targetUserId);
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['team', 'members', currentTeamId] });
    };

    const value = {
        teams,
        teamsLoading,
        currentTeam,
        currentTeamId,
        setCurrentTeamId,
        role,
        isTeamAdmin,
        canManage,
        members,
        memberMap,
        invitations,
        createTeam,
        joinByCode,
        acceptInvite,
        leaveTeam,
        regenerateCode,
        renameTeam,
        createInvitation,
        revokeInvitation,
        updateMemberRole,
        removeMember,
        refreshTeams,
    };

    return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
};

export default TeamContext;
