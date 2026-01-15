import React, { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { WORKSPACE_ROLES, getRoleName } from '../../utils/permissions';
import { Icons } from '../ui/Icons';

const InviteMemberModal = ({ isOpen, onClose }) => {
    const { createInvitation, canInviteMembers } = useWorkspace();
    const [selectedRole, setSelectedRole] = useState(WORKSPACE_ROLES.MEMBER);
    const [maxUses, setMaxUses] = useState(1);
    const [expiresInDays, setExpiresInDays] = useState(7);
    const [loading, setLoading] = useState(false);
    const [generatedCode, setGeneratedCode] = useState(null);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

    const handleGenerate = async () => {
        if (!canInviteMembers) {
            setError('No tienes permisos para invitar miembros');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const invitation = await createInvitation(selectedRole, maxUses, expiresInDays);
            setGeneratedCode(invitation);
        } catch (err) {
            setError(err.message || 'Error al generar código de invitación');
        } finally {
            setLoading(false);
        }
    };

    const handleCopyCode = () => {
        if (generatedCode) {
            navigator.clipboard.writeText(generatedCode.invitation_code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleClose = () => {
        setGeneratedCode(null);
        setError('');
        setCopied(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-[var(--overlay-bg)] backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--bg-secondary)] rounded-2xl w-full max-w-md border border-[var(--border-color)] shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-[var(--border-color)]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                            <Icons.UserPlus className="w-5 h-5 text-white" />
                        </div>
                        <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                            Invitar Miembro
                        </h2>
                    </div>
                    <button
                        onClick={handleClose}
                        className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    >
                        <Icons.X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {!generatedCode ? (
                        <>
                            {/* Role Selection */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-[var(--text-primary)]">
                                    Rol
                                </label>
                                <select
                                    value={selectedRole}
                                    onChange={(e) => setSelectedRole(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                                    disabled={loading}
                                >
                                    <option value={WORKSPACE_ROLES.ADMIN}>{getRoleName(WORKSPACE_ROLES.ADMIN)}</option>
                                    <option value={WORKSPACE_ROLES.MEMBER}>{getRoleName(WORKSPACE_ROLES.MEMBER)}</option>
                                    <option value={WORKSPACE_ROLES.VIEWER}>{getRoleName(WORKSPACE_ROLES.VIEWER)}</option>
                                </select>
                                <p className="text-xs text-neutral-500">
                                    {selectedRole === WORKSPACE_ROLES.ADMIN && 'Puede invitar y gestionar miembros'}
                                    {selectedRole === WORKSPACE_ROLES.MEMBER && 'Puede crear y editar tareas y boards'}
                                    {selectedRole === WORKSPACE_ROLES.VIEWER && 'Solo puede ver, no puede editar'}
                                </p>
                            </div>

                            {/* Max Uses */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-[var(--text-primary)]">
                                    Usos permitidos
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={maxUses}
                                    onChange={(e) => setMaxUses(parseInt(e.target.value) || 1)}
                                    className="w-full px-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                                    disabled={loading}
                                />
                                <p className="text-xs text-neutral-500">
                                    Número de personas que pueden usar este código
                                </p>
                            </div>

                            {/* Expiration */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-[var(--text-primary)]">
                                    Expira en (días)
                                </label>
                                <select
                                    value={expiresInDays}
                                    onChange={(e) => setExpiresInDays(parseInt(e.target.value))}
                                    className="w-full px-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                                    disabled={loading}
                                >
                                    <option value={1}>1 día</option>
                                    <option value={3}>3 días</option>
                                    <option value={7}>7 días</option>
                                    <option value={14}>14 días</option>
                                    <option value={30}>30 días</option>
                                </select>
                            </div>

                            {error && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2">
                                    <Icons.AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-sm text-red-400">{error}</p>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="flex-1 px-4 py-2.5 bg-[var(--bg-primary)] hover:bg-stone-100 dark:hover:bg-white/5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-xl transition-colors"
                                    disabled={loading}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleGenerate}
                                    disabled={loading}
                                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Generando...
                                        </>
                                    ) : (
                                        <>
                                            <Icons.Plus className="w-4 h-4" />
                                            Generar Código
                                        </>
                                    )}
                                </button>
                            </div>
                        </>
                    ) : (
                        /* Generated Code Display */
                        <>
                            <div className="text-center space-y-4">
                                <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                                    <Icons.Check className="w-8 h-8 text-white" />
                                </div>

                                <div>
                                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
                                        ¡Código Generado!
                                    </h3>
                                    <p className="text-sm text-neutral-400">
                                        Comparte este código con la persona que quieres invitar
                                    </p>
                                </div>

                                {/* Code Display */}
                                <div className="p-6 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)]">
                                    <p className="text-3xl font-mono font-bold text-[var(--text-primary)] tracking-widest mb-2">
                                        {generatedCode.invitation_code}
                                    </p>
                                    <p className="text-xs text-neutral-500">
                                        Expira: {new Date(generatedCode.expires_at).toLocaleDateString()} •
                                        {' '}Usos: 0/{generatedCode.max_uses}
                                    </p>
                                </div>

                                {/* Copy Button */}
                                <button
                                    onClick={handleCopyCode}
                                    className="w-full px-4 py-2.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 rounded-xl transition-all flex items-center justify-center gap-2"
                                >
                                    {copied ? (
                                        <>
                                            <Icons.Check className="w-4 h-4" />
                                            ¡Copiado!
                                        </>
                                    ) : (
                                        <>
                                            <Icons.Copy className="w-4 h-4" />
                                            Copiar Código
                                        </>
                                    )}
                                </button>
                            </div>

                            <button
                                onClick={handleClose}
                                className="w-full px-4 py-2.5 bg-[var(--bg-primary)] hover:bg-stone-100 dark:hover:bg-white/5 text-[var(--text-primary)] rounded-xl transition-colors"
                            >
                                Cerrar
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InviteMemberModal;
