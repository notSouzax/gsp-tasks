import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    // Initial users including Super Admin
    const [users, setUsers] = useState(() => {
        const superAdmin = {
            id: 'super-admin',
            name: 'Souza',
            email: 'souza@admin.com',
            username: 'Souza',
            password: 'Souzacositi1',
            role: 'admin',
            avatar: null
        };

        const saved = localStorage.getItem('kanban-users');
        let initialUsers = [];
        if (saved) {
            const parsed = JSON.parse(saved);
            // Filter out any existing super-admin to ensure we use the fresh one
            initialUsers = parsed.filter(u => u.id !== 'super-admin');
        }

        return [superAdmin, ...initialUsers];
    });

    const [currentUser, setCurrentUser] = useState(() => {
        const saved = localStorage.getItem('kanban-current-user');
        return saved ? JSON.parse(saved) : null; // Start with NO user logged in
    });

    const [invites, setInvites] = useState(() => {
        const saved = localStorage.getItem('kanban-invites');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem('kanban-users', JSON.stringify(users));
    }, [users]);

    useEffect(() => {
        if (currentUser) {
            localStorage.setItem('kanban-current-user', JSON.stringify(currentUser));
        } else {
            localStorage.removeItem('kanban-current-user');
        }
    }, [currentUser]);

    useEffect(() => {
        localStorage.setItem('kanban-invites', JSON.stringify(invites));
    }, [invites]);

    const login = (username, password) => {
        const user = users.find(u => u.username === username && u.password === password);
        if (user) {
            setCurrentUser(user);
            return { success: true };
        }
        return { success: false, message: 'Credenciales incorrectas' };
    };

    const logout = () => {
        setCurrentUser(null);
    };

    const updateUser = (userId, updates) => {
        setUsers(users.map(u => u.id === userId ? { ...u, ...updates } : u));
        if (currentUser && currentUser.id === userId) {
            setCurrentUser(prev => ({ ...prev, ...updates }));
        }
    };

    const inviteUser = (email) => {
        const token = Math.random().toString(36).substring(2, 15);
        const newInvite = { email, token, createdAt: Date.now() };
        setInvites([...invites, newInvite]);
        return token; // In real app, send email with link containing token
    };

    const register = (token, username, password, name) => {
        const inviteIndex = invites.findIndex(i => i.token === token);
        if (inviteIndex === -1) {
            return { success: false, message: 'Invitación inválida o expirada' };
        }

        const invite = invites[inviteIndex];
        const newUser = {
            id: Date.now().toString(),
            username,
            password,
            name,
            email: invite.email,
            role: 'user',
            avatar: null
        };

        setUsers([...users, newUser]);

        // Remove used invite
        const newInvites = [...invites];
        newInvites.splice(inviteIndex, 1);
        setInvites(newInvites);

        setCurrentUser(newUser);
        return { success: true };
    };

    const deleteUser = (userId) => {
        if (userId === 'super-admin') return; // Cannot delete super admin
        setUsers(users.filter(u => u.id !== userId));
    };

    const isAdmin = currentUser?.role === 'admin';

    return (
        <AuthContext.Provider value={{
            currentUser,
            users,
            login,
            logout,
            updateUser,
            inviteUser,
            register,
            deleteUser,
            isAdmin
        }}>
            {children}
        </AuthContext.Provider>
    );
};
