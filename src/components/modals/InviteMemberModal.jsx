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
        <div className="fixed inset-0 bg-[var(--overlay-bg)] backdrop-blur-[2px] flex items-center justify-center z-50 p-4 transition-all duration-300" onClick={handleClose}>
            <div
                className="bg-[var(--bg-secondary)] dark:bg-[#0f172a] border border-[var(--border-default)] dark:border-slate-700/50 rounded-2xl w-full max-w-md shadow-[var(--shadow-xl)] overflow-hidden transform transition-all scale-100"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-stone-100/30 dark:bg-slate-900/50 p-6 pb-4 border-b border-[var(--border-subtle)] dark:border-white/5">
                    <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
                            Invitar Miembro
                        </span>
                    </h2>
                </div>

                {/* Content */}
                <div className="p-6 pt-4">
                    {!generatedCode ? (
                        <>
                            {/* Role Selection */}
                            <div className="mb-5">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                                    Rol
                                </label>
                                <div className="relative inline-block w-full">
                                    <select
                                        value={selectedRole}
                                        onChange={(e) => setSelectedRole(e.target.value)}
                                        className="w-full bg-[var(--bg-elevated)] dark:bg-[#1e293b] hover:bg-stone-50 dark:hover:bg-[#253045] border border-[var(--border-default)] dark:border-slate-700 rounded-lg pl-3 pr-10 py-3 text-[var(--text-primary)] dark:text-slate-200 text-sm focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none appearance-none transition-all cursor-pointer"
                                        disabled={loading}
                                    >
                                        <option value={WORKSPACE_ROLES.ADMIN}>{getRoleName(WORKSPACE_ROLES.ADMIN)}</option>
                                        <option value={WORKSPACE_ROLES.MEMBER}>{getRoleName(WORKSPACE_ROLES.MEMBER)}</option>
                                        <option value={WORKSPACE_ROLES.VIEWER}>{getRoleName(WORKSPACE_ROLES.VIEWER)}</option>
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                        <Icons.ChevronDown className="text-slate-400" size={14} />
                                    </div>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-1">
                                    {selectedRole === WORKSPACE_ROLES.ADMIN && 'Puede invitar y gestionar miembros'}
                                    {selectedRole === WORKSPACE_ROLES.MEMBER && 'Puede crear y editar tareas y boards'}
                                    {selectedRole === WORKSPACE_ROLES.VIEWER && 'Solo puede ver, no puede editar'}
                                </p>
                            </div>

                            {/* Max Uses */}
                            <div className="mb-5">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                                    Usos permitidos
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={maxUses}
                                    onChange={(e) => setMaxUses(parseInt(e.target.value) || 1)}
                                    className="w-full bg-[var(--bg-elevated)] dark:bg-[#1e293b] border border-[var(--border-default)] dark:border-slate-700 rounded-lg px-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                                    disabled={loading}
                                />
                                <p className="text-[10px] text-slate-500 mt-1">
                                    Número de personas que pueden usar este código
                                </p>
                            </div>

                            {/* Expiration */}
                            <div className="mb-5">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                                    Expira en (días)
                                </label>
                                <div className="relative inline-block w-full">
                                    <select
                                        value={expiresInDays}
                                        onChange={(e) => setExpiresInDays(parseInt(e.target.value))}
                                        className="w-full bg-[var(--bg-elevated)] dark:bg-[#1e293b] hover:bg-stone-50 dark:hover:bg-[#253045] border border-[var(--border-default)] dark:border-slate-700 rounded-lg pl-3 pr-10 py-3 text-[var(--text-primary)] dark:text-slate-200 text-sm focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none appearance-none transition-all cursor-pointer"
                                        disabled={loading}
                                    >
                                        <option value={1}>1 día</option>
                                        <option value={3}>3 días</option>
                                        <option value={7}>7 días</option>
                                        <option value={14}>14 días</option>
                                        <option value={30}>30 días</option>
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                        <Icons.ChevronDown className="text-slate-400" size={14} />
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2">
                                    <Icons.AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-sm text-red-400">{error}</p>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex justify-end gap-3 pt-2 border-t border-white/5">
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="px-5 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-stone-100 dark:hover:bg-white/5 rounded-xl transition-all"
                                    disabled={loading}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleGenerate}
                                    disabled={loading}
                                    className="px-6 py-2.5 text-sm font-bold bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
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
                                    <p className="text-sm text-slate-400">
                                        Comparte este código con la persona que quieres invitar
                                    </p>
                                </div>

                                {/* Code Display */}
                                <div className="p-6 bg-[var(--bg-elevated)] dark:bg-[#1e293b] rounded-xl border border-[var(--border-default)] dark:border-slate-700">
                                    <p className="text-3xl font-mono font-bold text-[var(--text-primary)] tracking-widest mb-2">
                                        {generatedCode.invitation_code}
                                    </p>
                                    <p className="text-[10px] text-slate-500">
                                        Expira: {new Date(generatedCode.expires_at).toLocaleDateString()} •
                                        {' '}Usos: 0/{generatedCode.max_uses}
                                    </p>
                                </div>

                                {/* Copy Button */}
                                <button
                                    onClick={handleCopyCode}
                                    className="w-full px-4 py-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 rounded-xl transition-all flex items-center justify-center gap-2"
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
                                className="w-full mt-4 px-5 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-stone-100 dark:hover:bg-white/5 rounded-xl transition-all"
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
