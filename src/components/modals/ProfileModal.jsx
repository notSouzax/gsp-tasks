import React, { useState } from 'react';
import { Icons } from '../ui/Icons';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { supabase } from '../../lib/supabaseClient';
import { getRoleName, getRoleColor, WORKSPACE_ROLES } from '../../utils/permissions';
import ConfirmationModal from './ConfirmationModal'; // Correct import path assuming shared UI component

const ProfileModal = ({ onClose }) => {
    const { currentUser, updateUser, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');

    // Profile fields
    const [name, setName] = useState(currentUser?.name || currentUser?.full_name || '');
    const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatar_url || '');

    // Security fields
    const [email, setEmail] = useState(currentUser?.email || '');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // State
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    const handleAvatarUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            showMessage('error', 'Por favor selecciona una imagen');
            return;
        }

        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            showMessage('error', 'La imagen no puede superar 2MB');
            return;
        }

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${currentUser.id}-${Date.now()}.${fileExt}`;
            const filePath = `avatars/${fileName}`;

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true });

            if (uploadError) {
                throw uploadError;
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            setAvatarUrl(publicUrl);
            showMessage('success', 'Imagen subida correctamente');
        } catch (err) {
            console.error('Upload error:', err);
            showMessage('error', err.message || 'Error al subir la imagen');
        } finally {
            setUploading(false);
        }
    };

    const showMessage = (type, text) => {
        setMessage({ type, text });
        setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            const result = await updateUser(currentUser.id, {
                name,
                full_name: name,
                avatar_url: avatarUrl
            });

            if (result.success) {
                showMessage('success', 'Perfil actualizado correctamente');
            } else {
                showMessage('error', result.message || 'Error al actualizar');
            }
        } catch (err) {
            showMessage('error', err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleChangeEmail = async () => {
        if (email === currentUser?.email) {
            showMessage('info', 'El email no ha cambiado');
            return;
        }

        setSaving(true);
        try {
            const { error } = await supabase.auth.updateUser({ email });
            if (error) {
                showMessage('error', error.message);
            } else {
                showMessage('success', 'Se ha enviado un email de confirmación a la nueva dirección');
            }
        } catch (err) {
            showMessage('error', err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async () => {
        if (!newPassword || !confirmPassword) {
            showMessage('error', 'Completa ambos campos de contraseña');
            return;
        }
        if (newPassword !== confirmPassword) {
            showMessage('error', 'Las contraseñas no coinciden');
            return;
        }
        if (newPassword.length < 6) {
            showMessage('error', 'La contraseña debe tener al menos 6 caracteres');
            return;
        }

        setSaving(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) {
                showMessage('error', error.message);
            } else {
                showMessage('success', 'Contraseña actualizada correctamente');
                setNewPassword('');
                setConfirmPassword('');
            }
        } catch (err) {
            showMessage('error', err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = () => {
        logout();
        onClose();
    };

    const inputStyle = "w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all";
    const labelStyle = "block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2";

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                className="bg-[var(--bg-secondary)] border border-[var(--border-color)] w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        {/* Avatar Preview */}
                        <div className="relative">
                            <img
                                src={avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&background=6366f1&color=fff&size=128`}
                                alt="Avatar"
                                className="w-14 h-14 rounded-full object-cover border-2 border-indigo-500/30"
                            />
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-[var(--bg-secondary)]"></div>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-[var(--text-primary)]">Mi Perfil</h2>
                            <p className="text-sm text-[var(--text-secondary)]">{currentUser?.email}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowLogoutConfirm(true)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-400/10 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                        >
                            Salir
                        </button>
                        <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-2 hover:bg-slate-700 rounded-lg">
                            <Icons.X />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-[var(--border-color)]">
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'profile' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-400 hover:text-white'}`}
                    >
                        Datos Personales
                    </button>
                    <button
                        onClick={() => setActiveTab('security')}
                        className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'security' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-400 hover:text-white'}`}
                    >
                        Seguridad
                    </button>
                    <button
                        onClick={() => setActiveTab('workspace')}
                        className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'workspace' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-400 hover:text-white'}`}
                    >
                        Workspace
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">

                    {/* Message */}
                    {message.text && (
                        <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                            message.type === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            }`}>
                            {message.text}
                        </div>
                    )}

                    {activeTab === 'profile' && (
                        <form onSubmit={handleSaveProfile} className="space-y-5">
                            {/* Name */}
                            <div>
                                <label className={labelStyle}>Nombre completo</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Tu nombre y apellidos"
                                    className={inputStyle}
                                />
                            </div>

                            {/* Avatar Upload */}
                            <div>
                                <label className={labelStyle}>Foto de perfil</label>
                                <div className="flex items-center gap-4">
                                    {/* Preview */}
                                    <img
                                        src={avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&background=6366f1&color=fff&size=128`}
                                        alt="Avatar"
                                        className="w-16 h-16 rounded-full object-cover border-2 border-slate-600"
                                    />
                                    {/* Upload Button */}
                                    <div className="flex-1">
                                        <label className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-all cursor-pointer">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleAvatarUpload}
                                                className="hidden"
                                                disabled={uploading}
                                            />
                                            {uploading ? (
                                                <span>Subiendo...</span>
                                            ) : (
                                                <>
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                    <span>Subir imagen</span>
                                                </>
                                            )}
                                        </label>
                                        <p className="text-xs text-slate-500 mt-1.5">JPG, PNG o GIF. Máximo 2MB.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Save Button */}
                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
                            >
                                {saving ? 'Guardando...' : 'Guardar Cambios'}
                            </button>
                        </form>
                    )}

                    {activeTab === 'security' && (
                        <div className="space-y-6">
                            {/* Email Section */}
                            <div className="space-y-3">
                                <label className={labelStyle}>Email</label>
                                <div className="flex gap-2">
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className={`${inputStyle} flex-1`}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleChangeEmail}
                                        disabled={saving || email === currentUser?.email}
                                        className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
                                    >
                                        Cambiar
                                    </button>
                                </div>
                                <p className="text-xs text-slate-500">Recibirás un email de confirmación</p>
                            </div>

                            <div className="border-t border-slate-700/50"></div>

                            {/* Password Section */}
                            <div className="space-y-3">
                                <label className={labelStyle}>Cambiar contraseña</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Nueva contraseña (mínimo 6 caracteres)"
                                    className={inputStyle}
                                />
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirmar contraseña"
                                    className={inputStyle}
                                />
                                <button
                                    type="button"
                                    onClick={handleChangePassword}
                                    disabled={saving || !newPassword}
                                    className="w-full px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
                                >
                                    {saving ? 'Cambiando...' : 'Cambiar Contraseña'}
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'workspace' && (
                        <WorkspaceTab />
                    )}
                </div>
            </div>

            <ConfirmationModal
                isOpen={showLogoutConfirm}
                onClose={() => setShowLogoutConfirm(false)}
                onConfirm={handleLogout}
                title="Cerrar Sessión"
                message="¿Estás seguro de que quieres cerrar tu sesión actual?"
                confirmText="Cerrar Sesión"
                cancelText="Cancelar"
                isDanger={true}
            />
        </div>
    );
};

// Workspace Tab Component
const WorkspaceTab = () => {
    const {
        currentWorkspace,
        workspaceMembers,
        pendingInvitations,
        userRole,
        canInviteMembers,
        canManageMembers,
        updateMemberRole,
        removeMember,
        revokeInvitation,
        createInvitation
    } = useWorkspace();
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [showNewInvite, setShowNewInvite] = useState(false);
    const [newInviteRole, setNewInviteRole] = useState(WORKSPACE_ROLES.MEMBER);
    const [newInviteUses, setNewInviteUses] = useState(1);
    const [newInviteExpiry, setNewInviteExpiry] = useState(7);

    // Confirmation State
    const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, title: '', message: '', action: null });

    const showMessage = (type, text) => {
        setMessage({ type, text });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    };

    const handleRoleChange = async (memberId, newRole) => {
        setLoading(true);
        try {
            await updateMemberRole(memberId, newRole);
            showMessage('success', 'Rol actualizado');
        } catch (err) {
            showMessage('error', err.message || 'Error al cambiar rol');
        } finally {
            setLoading(false);
        }
    };

    const requestRemoveMember = (memberId) => {
        setConfirmConfig({
            isOpen: true,
            title: 'Eliminar Miembro',
            message: '¿Estás seguro de que quieres eliminar a este miembro del workspace? Perderá acceso a todos los tableros y datos.',
            action: () => handleRemoveMember(memberId),
            isDanger: true
        });
    };

    const handleRemoveMember = async (memberId) => {
        setLoading(true);
        try {
            await removeMember(memberId);
            showMessage('success', 'Miembro eliminado');
        } catch (err) {
            showMessage('error', err.message || 'Error al eliminar');
        } finally {
            setLoading(false);
            setConfirmConfig({ isOpen: false, title: '', message: '', action: null });
        }
    };

    const requestRevokeInvitation = (inviteId) => {
        setConfirmConfig({
            isOpen: true,
            title: 'Revocar Invitación',
            message: '¿Estás seguro de que quieres revocar esta invitación? El código dejará de funcionar inmediatamente.',
            action: () => handleRevokeInvitation(inviteId),
            isDanger: true
        });
    };

    const handleRevokeInvitation = async (inviteId) => {
        setLoading(true);
        try {
            await revokeInvitation(inviteId);
            showMessage('success', 'Invitación revocada');
        } catch (err) {
            showMessage('error', err.message || 'Error al revocar');
        } finally {
            setLoading(false);
            setConfirmConfig({ isOpen: false, title: '', message: '', action: null });
        }
    };

    const handleCreateInvite = async () => {
        setLoading(true);
        try {
            const invite = await createInvitation(newInviteRole, newInviteUses, newInviteExpiry);
            showMessage('success', `Código creado: ${invite.invitation_code}`);
            setShowNewInvite(false);
        } catch (err) {
            showMessage('error', err.message || 'Error al crear invitación');
        } finally {
            setLoading(false);
        }
    };

    const copyCode = (code) => {
        navigator.clipboard.writeText(code);
        showMessage('success', 'Código copiado');
    };

    if (!currentWorkspace) {
        return <div className="p-4 text-center text-slate-400">No hay workspace activo</div>;
    }

    return (
        <div className="space-y-6">
            {/* Message */}
            {message.text && (
                <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                    'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}>
                    {message.text}
                </div>
            )}

            {/* Workspace Info */}
            <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Workspace Actual</h3>
                <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600">
                    <p className="text-white font-medium">{currentWorkspace.name}</p>
                    <p className="text-sm text-slate-400 mt-1">Tu rol: <span className={`font-semibold ${getRoleColor(userRole)}`}>{getRoleName(userRole)}</span></p>
                </div>
            </div>

            <div className="border-t border-slate-700/50"></div>

            {/* Members Section */}
            <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Miembros ({workspaceMembers.length})</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                    {workspaceMembers.map(member => {
                        const isCurrentUser = member.user_id === currentUser?.id;
                        const isOwner = member.role === WORKSPACE_ROLES.OWNER;
                        const canManageThis = canManageMembers && !isCurrentUser && !isOwner;

                        return (
                            <div key={member.user_id} className="p-3 bg-slate-700/30 rounded-lg border border-slate-600 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-semibold">
                                        {member.profiles?.full_name?.charAt(0) || member.profiles?.email?.charAt(0).toUpperCase() || '?'}
                                    </div>
                                    <div>
                                        <p className="text-white font-medium flex items-center gap-2">
                                            {member.profiles?.full_name || member.profiles?.email || 'Usuario'}
                                            {isCurrentUser && <span className="text-xs text-slate-400">(Tú)</span>}
                                        </p>
                                        <p className="text-xs text-slate-400">{member.profiles?.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {canManageThis ? (
                                        <>
                                            <select
                                                value={member.role}
                                                onChange={(e) => handleRoleChange(member.user_id, e.target.value)}
                                                disabled={loading}
                                                className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-sm text-white"
                                            >
                                                <option value={WORKSPACE_ROLES.ADMIN}>{getRoleName(WORKSPACE_ROLES.ADMIN)}</option>
                                                <option value={WORKSPACE_ROLES.MEMBER}>{getRoleName(WORKSPACE_ROLES.MEMBER)}</option>
                                                <option value={WORKSPACE_ROLES.VIEWER}>{getRoleName(WORKSPACE_ROLES.VIEWER)}</option>
                                            </select>
                                            <button
                                                onClick={() => requestRemoveMember(member.user_id)}
                                                disabled={loading}
                                                className="p-1.5 text-red-400 hover:bg-red-400/10 rounded transition-colors"
                                                title="Eliminar"
                                            >
                                                <Icons.X className="w-4 h-4" />
                                            </button>
                                        </>
                                    ) : (
                                        <span className={`px-2 py-1 rounded text-xs font-semibold ${getRoleColor(member.role)}`}>
                                            {getRoleName(member.role)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="border-t border-slate-700/50"></div>

            {/* Invitations Section */}
            {canInviteMembers && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Invitaciones</h3>
                        <button
                            onClick={() => setShowNewInvite(!showNewInvite)}
                            className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                        >
                            <Icons.Plus className="w-4 h-4" />
                            Nueva
                        </button>
                    </div>

                    {/* New Invitation Form */}
                    {showNewInvite && (
                        <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600 space-y-3">
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Rol</label>
                                <select
                                    value={newInviteRole}
                                    onChange={(e) => setNewInviteRole(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                                >
                                    <option value={WORKSPACE_ROLES.ADMIN}>{getRoleName(WORKSPACE_ROLES.ADMIN)}</option>
                                    <option value={WORKSPACE_ROLES.MEMBER}>{getRoleName(WORKSPACE_ROLES.MEMBER)}</option>
                                    <option value={WORKSPACE_ROLES.VIEWER}>{getRoleName(WORKSPACE_ROLES.VIEWER)}</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Usos</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="100"
                                        value={newInviteUses}
                                        onChange={(e) => setNewInviteUses(parseInt(e.target.value))}
                                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Expira (días)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="30"
                                        value={newInviteExpiry}
                                        onChange={(e) => setNewInviteExpiry(parseInt(e.target.value))}
                                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleCreateInvite}
                                    disabled={loading}
                                    className="flex-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-sm font-medium disabled:opacity-50"
                                >
                                    Crear
                                </button>
                                <button
                                    onClick={() => setShowNewInvite(false)}
                                    className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Invitation List */}
                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                        {pendingInvitations.length === 0 ? (
                            <p className="text-sm text-slate-500 text-center py-4">No hay invitaciones activas</p>
                        ) : (
                            pendingInvitations.map(invite => {
                                const expired = new Date(invite.expires_at) < new Date();
                                const exhausted = invite.uses_count >= invite.max_uses;
                                const daysLeft = Math.ceil((new Date(invite.expires_at) - new Date()) / (1000 * 60 * 60 * 24));

                                return (
                                    <div key={invite.id} className="p-3 bg-slate-700/30 rounded-lg border border-slate-600">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <code className="px-2 py-1 bg-slate-800 rounded text-indigo-400 font-mono text-sm font-bold">
                                                    {invite.invitation_code}
                                                </code>
                                                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getRoleColor(invite.role)}`}>
                                                    {getRoleName(invite.role)}
                                                </span>
                                            </div>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => copyCode(invite.invitation_code)}
                                                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-600 rounded transition-colors"
                                                    title="Copiar"
                                                >
                                                    <Icons.Copy className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => requestRevokeInvitation(invite.id)}
                                                    disabled={loading}
                                                    className="p-1.5 text-red-400 hover:bg-red-400/10 rounded transition-colors"
                                                    title="Revocar"
                                                >
                                                    <Icons.X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-slate-400">
                                            <span>
                                                {expired ? '❌ Expirado' : exhausted ? '✅ Agotado' : `⏱️ ${daysLeft} días restantes`}
                                            </span>
                                            <span>Usos: {invite.uses_count}/{invite.max_uses}</span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            <ConfirmationModal
                isOpen={confirmConfig.isOpen}
                onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
                onConfirm={confirmConfig.action}
                title={confirmConfig.title}
                message={confirmConfig.message}
                confirmText="Confirmar"
                cancelText="Cancelar"
                isDanger={confirmConfig.isDanger}
            />
        </div>
    );
};

export default ProfileModal;
