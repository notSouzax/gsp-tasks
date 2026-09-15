import React from 'react';
import toast from 'react-hot-toast';
import { getRoleName } from '../../../utils/permissions';
import { Icons } from '../../ui/Icons';
import { Toggle } from '../../ui/Toggle';

/**
 * Modal para que owner/admin concedan o revoquen el permiso de "editor"
 * de documentación a miembros concretos del workspace.
 */
const ManageEditorsModal = ({ members, currentUser, isEditor, onGrant, onRevoke, onClose }) => {
    const handleToggle = async (member, next) => {
        try {
            if (next) {
                await onGrant(member.user_id);
                toast.success(`Permiso de editor concedido`);
            } else {
                await onRevoke(member.user_id);
                toast.success(`Permiso de editor retirado`);
            }
        } catch (err) {
            toast.error(err?.message || 'No se pudo actualizar el permiso');
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
            <div
                className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
                    <div>
                        <h2 className="text-lg font-bold text-[var(--text-primary)]">Permisos de documentación</h2>
                        <p className="text-xs text-[var(--text-muted)] mt-1">
                            Los editores pueden subir y borrar documentos. Owner y administradores ya tienen este permiso.
                        </p>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors">
                        <Icons.X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
                    {members.length === 0 ? (
                        <p className="text-sm text-[var(--text-muted)] text-center py-8">No hay miembros en el workspace.</p>
                    ) : (
                        members.map((member) => {
                            const p = member.profiles || {};
                            const name = p.full_name || p.email?.split('@')[0] || 'Miembro';
                            const isAdminRole = member.role === 'owner' || member.role === 'admin';
                            const isSelf = member.user_id === currentUser?.id;
                            const enabled = isAdminRole || isEditor(member.user_id);

                            return (
                                <div
                                    key={member.id || member.user_id}
                                    className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-tertiary)]/50 border border-[var(--border-subtle)]"
                                >
                                    {p.avatar_url ? (
                                        <img src={p.avatar_url} alt={name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                                    ) : (
                                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                                            {name.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                                            {name} {isSelf && <span className="text-[var(--text-muted)] font-normal">(tú)</span>}
                                        </p>
                                        <p className="text-xs text-[var(--text-muted)] truncate">
                                            {getRoleName(member.role)}
                                        </p>
                                    </div>

                                    {isAdminRole ? (
                                        <span className="text-[11px] font-semibold text-indigo-500 bg-indigo-500/10 px-2.5 py-1 rounded-full flex-shrink-0">
                                            Siempre puede
                                        </span>
                                    ) : (
                                        <Toggle
                                            checked={enabled}
                                            onChange={(val) => handleToggle(member, val)}
                                        />
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default ManageEditorsModal;
