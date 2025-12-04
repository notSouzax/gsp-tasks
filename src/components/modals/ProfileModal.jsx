import React, { useState } from 'react';
import { Icons } from '../ui/Icons';
import { useAuth } from '../../context/AuthContext';

const ProfileModal = ({ onClose }) => {
    const { currentUser, updateUser, users, addUser, deleteUser, isAdmin, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');
    const [name, setName] = useState(currentUser?.name || '');
    const [email, setEmail] = useState(currentUser?.email || '');

    // Admin state
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserName, setNewUserName] = useState('');

    const handleSaveProfile = (e) => {
        e.preventDefault();
        updateUser(currentUser.id, { name, email });
        alert('Perfil actualizado');
    };

    const handleInviteUser = (e) => {
        e.preventDefault();
        if (newUserEmail && newUserName) {
            addUser({ email: newUserEmail, name: newUserName });
            setNewUserEmail('');
            setNewUserName('');
            alert('Usuario invitado');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20">
                            {currentUser?.name?.charAt(0) || 'U'}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-[var(--text-primary)]">Mi Perfil</h2>
                            <p className="text-sm text-[var(--text-secondary)]">{currentUser?.role === 'admin' ? 'Super Admin' : 'Usuario'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                if (confirm('¿Cerrar sesión?')) {
                                    logout();
                                    onClose();
                                }
                            }}
                            className="text-red-400 hover:text-red-300 hover:bg-red-400/10 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors mr-2"
                        >
                            Cerrar Sesión
                        </button>
                        <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                            <Icons.X />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-[var(--border-color)] px-6 gap-6">
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'profile' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                    >
                        Datos Personales
                    </button>
                    {isAdmin && (
                        <button
                            onClick={() => setActiveTab('users')}
                            className={`py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'users' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                        >
                            Gestión de Usuarios
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">

                    {activeTab === 'profile' && (
                        <form onSubmit={handleSaveProfile} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Nombre Completo</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-primary)] outline-none focus:border-indigo-500 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Correo Electrónico</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-primary)] outline-none focus:border-indigo-500 transition-colors"
                                />
                            </div>
                            <div className="pt-4">
                                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors">
                                    Guardar Cambios
                                </button>
                            </div>
                        </form>
                    )}

                    {activeTab === 'users' && isAdmin && (
                        <div className="space-y-8">
                            {/* Invite User */}
                            <div className="bg-[var(--bg-primary)]/50 p-4 rounded-xl border border-[var(--border-color)]">
                                <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">Invitar Nuevo Usuario</h3>
                                <form onSubmit={handleInviteUser} className="flex gap-3">
                                    <input
                                        type="text"
                                        placeholder="Nombre"
                                        value={newUserName}
                                        onChange={(e) => setNewUserName(e.target.value)}
                                        className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-indigo-500"
                                    />
                                    <input
                                        type="email"
                                        placeholder="Email"
                                        value={newUserEmail}
                                        onChange={(e) => setNewUserEmail(e.target.value)}
                                        className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-indigo-500"
                                    />
                                    <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium whitespace-nowrap">
                                        Invitar
                                    </button>
                                </form>
                            </div>

                            {/* User List */}
                            <div>
                                <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">Usuarios Activos</h3>
                                <div className="space-y-2">
                                    {users.map(user => (
                                        <div key={user.id} className="flex items-center justify-between p-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)]">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
                                                    {user.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-[var(--text-primary)]">{user.name}</div>
                                                    <div className="text-xs text-[var(--text-secondary)]">{user.email}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className={`text-xs px-2 py-1 rounded-full ${user.role === 'admin' ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                                    {user.role}
                                                </span>
                                                {user.id !== currentUser.id && (
                                                    <button
                                                        onClick={() => deleteUser(user.id)}
                                                        className="text-red-400 hover:text-red-300 p-1"
                                                        title="Eliminar usuario"
                                                    >
                                                        <Icons.Trash2 />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default ProfileModal;
