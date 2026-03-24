import React, { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Icons } from '../ui/Icons';

const JoinWorkspaceModal = ({ isOpen, onClose }) => {
    const { acceptInvitation } = useWorkspace();
    const [invitationCode, setInvitationCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!invitationCode.trim()) {
            setError('Por favor ingresa un código de invitación');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await acceptInvitation(invitationCode.trim().toUpperCase());
            onClose();
            setInvitationCode('');
        } catch (err) {
            setError(err.message || 'Código de invitación inválido o expirado');
        } finally {
            setLoading(false);
        }
    };

    const handleCodeChange = (e) => {
        // Auto-uppercase and limit to 8 characters
        const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
        setInvitationCode(value);
        setError('');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-[var(--overlay-bg)] backdrop-blur-[2px] flex items-center justify-center z-50 p-4 transition-all duration-300" onClick={onClose}>
            <div
                className="bg-[var(--bg-secondary)] dark:bg-[#0f172a] border border-[var(--border-default)] dark:border-slate-700/50 rounded-2xl w-full max-w-md shadow-[var(--shadow-xl)] overflow-hidden transform transition-all scale-100"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-stone-100/30 dark:bg-slate-900/50 p-6 pb-4 border-b border-[var(--border-subtle)] dark:border-white/5">
                    <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
                            Unirse a Workspace
                        </span>
                    </h2>
                </div>

                {/* Content */}
                <div className="p-6 pt-4">
                    <form onSubmit={handleSubmit}>
                        <p className="text-xs text-slate-400 mb-5">
                            Ingresa el código de invitación que te compartieron para unirte al workspace.
                        </p>

                        <div className="mb-5">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                                Código de Invitación
                            </label>
                            <input
                                type="text"
                                value={invitationCode}
                                onChange={handleCodeChange}
                                placeholder="ABC12345"
                                maxLength={8}
                                className="w-full bg-[var(--bg-elevated)] dark:bg-[#1e293b] border border-[var(--border-default)] dark:border-slate-700 rounded-lg px-4 py-3 text-[var(--text-primary)] text-center text-2xl font-mono tracking-widest placeholder-[var(--text-muted)] focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                                disabled={loading}
                                autoFocus
                            />
                            <p className="text-[10px] text-slate-500 text-center mt-1">
                                8 caracteres (letras y números)
                            </p>
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
                                onClick={onClose}
                                className="px-5 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-stone-100 dark:hover:bg-white/5 rounded-xl transition-all"
                                disabled={loading}
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={loading || invitationCode.length !== 8}
                                className="px-6 py-2.5 text-sm font-bold bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Verificando...
                                    </>
                                ) : (
                                    <>
                                        <Icons.Check className="w-4 h-4" />
                                        Unirse
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default JoinWorkspaceModal;
