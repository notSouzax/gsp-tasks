import React, { useState } from 'react';
import { Icons } from '../ui/Icons';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';

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
                            onClick={() => {
                                if (confirm('¿Cerrar sesión?')) {
                                    logout();
                                    onClose();
                                }
                            }}
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
                </div>
            </div>
        </div>
    );
};

export default ProfileModal;
