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
        <div className="fixed inset-0 bg-[var(--overlay-bg)] backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--bg-secondary)] rounded-2xl w-full max-w-md border border-[var(--border-color)] shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-[var(--border-color)]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                            <Icons.Users className="w-5 h-5 text-white" />
                        </div>
                        <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                            Unirse a Workspace
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    >
                        <Icons.X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div>
                        <p className="text-sm text-neutral-400 mb-4">
                            Ingresa el código de invitación que te compartieron para unirte al workspace.
                        </p>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-[var(--text-primary)]">
                                Código de Invitación
                            </label>
                            <input
                                type="text"
                                value={invitationCode}
                                onChange={handleCodeChange}
                                placeholder="ABC12345"
                                maxLength={8}
                                className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] text-center text-2xl font-mono tracking-widest placeholder:text-neutral-600 focus:outline-none focus:border-green-500/50 focus:ring-2 focus:ring-green-500/20 transition-all"
                                disabled={loading}
                                autoFocus
                            />
                            <p className="text-xs text-neutral-500 text-center">
                                8 caracteres (letras y números)
                            </p>
                        </div>

                        {error && (
                            <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2">
                                <Icons.AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-red-400">{error}</p>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 bg-[var(--bg-primary)] hover:bg-stone-100 dark:hover:bg-white/5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-xl transition-colors"
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading || invitationCode.length !== 8}
                            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
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
    );
};

export default JoinWorkspaceModal;
