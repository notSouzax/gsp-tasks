import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';

/**
 * Hook del panel de Administración (solo superadmin).
 * Gestiona usuarios, equipos y membresías/roles.
 */
export const useAdmin = (enabled) => {
    const queryClient = useQueryClient();

    const usersQuery = useQuery({
        queryKey: ['admin', 'users'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, email, full_name, avatar_url, role, is_superadmin, created_at')
                .order('created_at', { ascending: true });
            if (error) throw error;
            return data || [];
        },
        enabled: !!enabled,
        staleTime: 20_000,
    });

    const teamsQuery = useQuery({
        queryKey: ['admin', 'teams'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('teams')
                .select('*')
                .order('created_at', { ascending: true });
            if (error) throw error;
            return data || [];
        },
        enabled: !!enabled,
        staleTime: 20_000,
    });

    const membersQuery = useQuery({
        queryKey: ['admin', 'memberships'],
        queryFn: async () => {
            const { data, error } = await supabase.from('team_members').select('*');
            if (error) throw error;
            return data || [];
        },
        enabled: !!enabled,
        staleTime: 20_000,
    });

    const refresh = () => {
        queryClient.invalidateQueries({ queryKey: ['admin'] });
        queryClient.invalidateQueries({ queryKey: ['teams'] });
    };

    // --- Usuarios (via Edge Function) ---
    const createUser = async ({ email, password, full_name }) => {
        const { data, error } = await supabase.functions.invoke('admin-users', {
            body: { action: 'create_user', email, password, full_name },
        });
        if (error) throw new Error(error.message || 'Error al crear usuario');
        if (!data?.success) throw new Error(data?.error || 'Error al crear usuario');
        queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
        return data;
    };

    const deleteUser = async (userId) => {
        const { data, error } = await supabase.functions.invoke('admin-users', {
            body: { action: 'delete_user', user_id: userId },
        });
        if (error) throw new Error(error.message || 'Error al eliminar usuario');
        if (!data?.success) throw new Error(data?.error || 'Error al eliminar usuario');
        refresh();
        return data;
    };

    // --- Equipos ---
    const createTeam = async (name) => {
        const { data, error } = await supabase.rpc('create_team', { p_name: name });
        if (error) throw error;
        refresh();
        return data;
    };

    const deleteTeam = async (teamId) => {
        const { error } = await supabase.from('teams').delete().eq('id', teamId);
        if (error) throw error;
        refresh();
    };

    const renameTeam = async (teamId, name) => {
        const { error } = await supabase.from('teams').update({ name }).eq('id', teamId);
        if (error) throw error;
        refresh();
    };

    // --- Membresías / roles ---
    const addMember = async (teamId, userId, role = 'member') => {
        const { error } = await supabase
            .from('team_members')
            .upsert({ team_id: teamId, user_id: userId, role }, { onConflict: 'team_id,user_id' });
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['admin', 'memberships'] });
    };

    const updateMemberRole = async (teamId, userId, role) => {
        const { error } = await supabase
            .from('team_members')
            .update({ role })
            .eq('team_id', teamId)
            .eq('user_id', userId);
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['admin', 'memberships'] });
    };

    const removeMember = async (teamId, userId) => {
        const { error } = await supabase
            .from('team_members')
            .delete()
            .eq('team_id', teamId)
            .eq('user_id', userId);
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['admin', 'memberships'] });
    };

    const setSuperadmin = async (userId, value) => {
        const { error } = await supabase.from('profiles').update({ is_superadmin: value }).eq('id', userId);
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    };

    return {
        users: usersQuery.data || [],
        teams: teamsQuery.data || [],
        memberships: membersQuery.data || [],
        isLoading: usersQuery.isLoading || teamsQuery.isLoading,
        createUser,
        deleteUser,
        createTeam,
        deleteTeam,
        renameTeam,
        addMember,
        updateMemberRole,
        removeMember,
        setSuperadmin,
        refresh,
    };
};
