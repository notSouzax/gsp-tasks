import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        console.log("AuthProvider: Initializing...");
        // 1. Check active session
        const checkSession = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) throw error;

                if (session?.user) {
                    await fetchProfile(session.user);
                } else {
                    setLoading(false);
                }
            } catch (err) {
                console.error("Auth initialization error:", err);
                setLoading(false); // Ensure we unblock
            }
        };

        checkSession();

        // 2. Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            console.log("Auth State Changed:", _event);
            if (session?.user) {
                await fetchProfile(session.user);
            } else {
                setCurrentUser(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchProfile = async (user) => {
        console.log("fetchProfile: Starting for user", user.id);
        try {
            // Timeout after 2 seconds to prevent hanging
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 2000));
            const dbPromise = supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            const { data, error } = await Promise.race([dbPromise, timeoutPromise]);

            console.log("fetchProfile: Supabase response", { data, error });

            if (error) {
                console.error('Error fetching profile:', error);
                // Fallback if profile doesn't exist yet (signup lag)
                setCurrentUser({
                    id: user.id,
                    email: user.email,
                    name: user.user_metadata?.full_name || user.email.split('@')[0],
                    role: 'user', // Default
                    ...user.user_metadata
                });
            } else {
                setCurrentUser({ ...user, ...data, name: data.full_name || user.email.split('@')[0] });
            }
        } catch (err) {
            console.error("fetchProfile ERROR/TIMEOUT:", err);
            // Fallback to user metadata
            setCurrentUser({
                id: user.id,
                email: user.email,
                name: user.user_metadata?.full_name || user.email.split('@')[0],
                role: 'user',
                ...user.user_metadata
            });
        } finally {
            console.log("fetchProfile: Finished, setting loading=false");
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        if (error) return { success: false, message: error.message };
        return { success: true };
    };

    const logout = async () => {
        await supabase.auth.signOut();
    };

    const register = async (email, password, name) => {
        const { data, error } = await supabase.auth.signUp({
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

    // Legacy support / Adapter methods
    const updateUser = async (userId, updates) => {
        // In a real app we would update the 'profiles' table here
        console.log("Update user not fully implemented for DB yet", updates);
    };

    const isAdmin = currentUser?.role === 'admin';

    // Helper for debugging
    const inviteUser = (email) => {
        // Supabase built-in invite logic would go here
        console.log("Invite not implemented yet", email);
        return "mock-token";
    };

    return (
        <AuthContext.Provider value={{
            currentUser,
            loading,
            login,
            logout,
            register,
            isAdmin,
            updateUser, // kept for compatibility
            inviteUser  // kept for compatibility
        }}>
            {loading ? <div className="p-10 text-center text-white">Iniciando sesión...</div> : children}
        </AuthContext.Provider>
    );
};
