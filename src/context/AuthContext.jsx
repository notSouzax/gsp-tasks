import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import logger from '../utils/logger';
import SplashScreen from '../components/ui/SplashScreen';

const AuthContext = createContext();
const PROFILE_CACHE_KEY = 'gsp-cached-profile';

export const useAuth = () => useContext(AuthContext);

/** Save profile to localStorage for instant restore on next visit */
const cacheProfile = (profile) => {
    try {
        localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({
            data: profile,
            ts: Date.now()
        }));
    } catch { /* quota exceeded, ignore */ }
};

/** Read cached profile (valid for 24h) */
const getCachedProfile = () => {
    try {
        const raw = localStorage.getItem(PROFILE_CACHE_KEY);
        if (!raw) return null;
        const { data, ts } = JSON.parse(raw);
        // Cache valid for 24 hours
        if (Date.now() - ts > 24 * 60 * 60 * 1000) {
            localStorage.removeItem(PROFILE_CACHE_KEY);
            return null;
        }
        return data;
    } catch {
        return null;
    }
};

const clearCachedProfile = () => {
    try { localStorage.removeItem(PROFILE_CACHE_KEY); } catch { /* ignore */ }
};

export const AuthProvider = ({ children }) => {
    // Try instant restore from cache
    const cached = useRef(getCachedProfile());
    const [currentUser, setCurrentUser] = useState(cached.current);
    const [loading, setLoading] = useState(!cached.current); // Skip loading if cached

    useEffect(() => {
        logger.debug('AuthProvider', 'Initializing...', cached.current ? '(instant restore from cache)' : '(no cache)');

        // Validate session in background (even if we already restored from cache)
        const checkSession = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) throw error;

                if (session?.user) {
                    await fetchProfile(session.user, !cached.current);
                } else {
                    // No valid session — clear cache and show login
                    clearCachedProfile();
                    setCurrentUser(null);
                    setLoading(false);
                }
            } catch (err) {
                logger.error("Auth initialization error:", err);
                if (!cached.current) {
                    setLoading(false);
                }
            }
        };

        checkSession();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            logger.debug('AuthProvider', 'Auth State Changed:', _event);

            // TOKEN_REFRESHED fires frequently — skip profile refetch to avoid
            // cascading re-renders that wipe optimistic UI state (e.g. task moves)
            if (_event === 'TOKEN_REFRESHED') {
                logger.debug('AuthProvider', 'Token refreshed — skipping profile refetch');
                return;
            }

            if (_event === 'SIGNED_OUT') {
                clearCachedProfile();
                setCurrentUser(null);
                setLoading(false);
                return;
            }
            // SIGNED_IN and INITIAL_SESSION: fetch profile but with identity protection
            // fetchProfile already has identity comparison to avoid re-renders
            if (_event === 'SIGNED_IN' || _event === 'INITIAL_SESSION') {
                if (session?.user) {
                    await fetchProfile(session.user, true);
                } else {
                    clearCachedProfile();
                    setCurrentUser(null);
                    setLoading(false);
                }
                return;
            }

            if (session?.user) {
                await fetchProfile(session.user, true);
            } else {
                clearCachedProfile();
                setCurrentUser(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    /**
     * @param {Object} user - Supabase auth user
     * @param {boolean} updateLoading - Whether to manage loading state (false for background revalidation)
     */
    const fetchProfile = async (user, updateLoading = true) => {
        logger.debug('fetchProfile', 'Starting for user', user.id, updateLoading ? '(with loading)' : '(background)');
        try {
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 2000));
            const dbPromise = supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            const { data, error } = await Promise.race([dbPromise, timeoutPromise]);

            logger.debug('fetchProfile', 'Supabase response', { data, error });

            let profile;
            if (error) {
                logger.error('Error fetching profile:', error);
                profile = {
                    id: user.id,
                    email: user.email,
                    name: user.user_metadata?.full_name || user.email.split('@')[0],
                    role: 'user',
                    ...user.user_metadata
                };
            } else {
                profile = { ...user, ...data, name: data.full_name || user.email.split('@')[0] };
            }

            setCurrentUser(prev => {
                // Only update if profile actually changed to prevent cascading re-renders
                if (prev && prev.id === profile.id && prev.email === profile.email && prev.name === profile.name && prev.role === profile.role) {
                    return prev; // Same identity → no re-render
                }
                return profile;
            });
            cacheProfile(profile);
        } catch (err) {
            logger.error("fetchProfile ERROR/TIMEOUT:", err);
            const profile = {
                id: user.id,
                email: user.email,
                name: user.user_metadata?.full_name || user.email.split('@')[0],
                role: 'user',
                ...user.user_metadata
            };
            // CRITICAL: Use identity comparison on timeout too!
            // Without this, every timeout creates a NEW object reference,
            // which changes currentUser identity → userId changes → fetchBoards
            // re-runs → overwrites local drag state with DB data.
            setCurrentUser(prev => {
                if (prev && prev.id === user.id && prev.email === user.email) {
                    return prev; // Same user → no re-render
                }
                return profile;
            });
            cacheProfile(profile);
        } finally {
            if (updateLoading) {
                logger.debug('fetchProfile', 'Finished, setting loading=false');
                setLoading(false);
            }
        }
    };

    const login = async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        if (error) return { success: false, message: error.message };
        return { success: true };
    };

    const logout = async () => {
        clearCachedProfile();
        await supabase.auth.signOut();
    };

    const register = async (email, password, name) => {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name,
                    avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
                }
            }
        });
        if (error) return { success: false, message: error.message };
        return { success: true };
    };

    // Update user profile in database
    const updateUser = async (userId, updates) => {
        try {
            const dbUpdates = {};
            if (updates.name !== undefined) dbUpdates.full_name = updates.name;
            if (updates.full_name !== undefined) dbUpdates.full_name = updates.full_name;
            if (updates.avatar_url !== undefined) dbUpdates.avatar_url = updates.avatar_url;
            if (updates.role !== undefined) dbUpdates.role = updates.role;

            const { error } = await supabase
                .from('profiles')
                .update(dbUpdates)
                .eq('id', userId);

            if (error) {
                logger.error('Error updating profile:', error);
                return { success: false, message: error.message };
            }

            // Update local state + cache
            setCurrentUser(prev => {
                const updated = { ...prev, ...updates };
                cacheProfile(updated);
                return updated;
            });
            return { success: true };
        } catch (err) {
            logger.error('Error updating profile:', err);
            return { success: false, message: err.message };
        }
    };

    const isAdmin = currentUser?.role === 'admin';

    return (
        <AuthContext.Provider value={{
            currentUser,
            loading,
            login,
            logout,
            register,
            isAdmin,
            updateUser
        }}>
            {loading ? <SplashScreen status="Iniciando sesión..." /> : children}
        </AuthContext.Provider>
    );
};
