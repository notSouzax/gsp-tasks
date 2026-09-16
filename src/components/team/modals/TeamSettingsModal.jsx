import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useTeam } from '../../../features/team/TeamContext';
import { useAuth } from '../../../context/AuthContext';
import { Icons } from '../../ui/Icons';

const ROLE_LABELS = { admin: 'Administrador', editor: 'Editor', member: 'Miembro' };
const ROLE_COLORS = {
    admin: 'text-purple-500 bg-purple-500/10',
    editor: 'text-cyan-500 bg-cyan-500/10',
    member: 'text-[var(--text-muted)] bg-[var(--bg-tertiary)]',
};

const CopyRow = ({ label, value, hint }) => {
    const copy = () => {
        try { navigator.clipboard.writeText(value); toast.success('Copiado'); } catch { /* ignore */ }
    };
    return (
        <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">{label}</label>
            <div className="flex items-center gap-2">
                <code className="flex-1 font-mono text-lg tracking-widest text-[var(--text-primary)] bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-center">{value}</code>
                <button onClick={copy} className="w-10 h-10 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-indigo-500 hover:bg-indigo-500/10 border border-[var(--border-subtle)]" title="Copiar">
                    <Icons.Copy size={16} />
                </button>
            </div>
            {hint && <p className="text-xs text-[var(--text-muted)] mt-1.5">{hint}</p>}
        </div>
    );
};

const TeamSettingsModal = ({ onClose }) => {
    const { currentUser } = useAuth();
    const {
        currentTeam, isTeamAdmin, canManage, members, invitations,
        regenerateCode, renameTeam, createInvitation, revokeInvitation,
        updateMemberRole, removeMember, leaveTeam,
    } = useTeam();
    const [busy, setBusy] = useState(false);
    const [name, setName] = useState(currentTeam?.name || '');
    useEffect(() => { setName(currentTeam?.name || ''); }, [currentTeam?.name]);

    const handleRename = async () => {
        const value = name.trim();
        if (!value || value === currentTeam?.name) return;
        try { await renameTeam(value); toast.success('Nombre actualizado'); }
        catch { toast.error('No se pudo actualizar el nombre'); }
    };

    const handleRegenerate = async () => {
        if (!window.confirm('¿Cambiar la clave de acceso? La anterior dejará de funcionar.')) return;
        setBusy(true);
        try { await regenerateCode(); toast.success('Clave regenerada'); }
        catch { toast.error('No se pudo regenerar'); }
        finally { setBusy(false); }
    };

    const handleInvite = async () => {
        setBusy(true);
        try { await createInvitation({ role: 'member', maxUses: 1, days: 30 }); toast.success('Invitación creada'); }
        catch { toast.error('No se pudo crear la invitación'); }
        finally { setBusy(false); }
    };

    const handleRole = async (userId, role) => {
        try { await updateMemberRole(userId, role); toast.success('Rol actualizado'); }
        catch { toast.error('No se pudo cambiar el rol'); }
    };

    const handleRemove = async (userId) => {
        if (!window.confirm('¿Expulsar a este miembro del equipo?')) return;
        try { await removeMember(userId); toast.success('Miembro expulsado'); }
        catch { toast.error('No se pudo expulsar'); }
    };

    const handleLeave = async () => {
        if (!window.confirm('¿Salir de este equipo? Dejarás de ver su contenido.')) return;
        try { await leaveTeam(currentTeam.id); toast.success('Has salido del equipo'); onClose(); }
        catch { toast.error('No se pudo salir'); }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
                    <div>
                        <h2 className="text-lg font-bold text-[var(--text-primary)]">{currentTeam?.name}</h2>
                        <p className="text-xs text-[var(--text-muted)]">Ajustes del equipo</p>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]">
                        <Icons.X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                    {/* Nombre del equipo (admins y editores) */}
                    {canManage && (
                        <div>
                            <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Nombre del equipo</label>
                            <div className="flex items-center gap-2">
                                <input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                                    className="flex-1 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-indigo-500"
                                />
                                <button
                                    onClick={handleRename}
                                    disabled={!name.trim() || name.trim() === currentTeam?.name}
                                    className="px-3 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg"
                                >
                                    Guardar
                                </button>
                            </div>
                        </div>
                    )}

                    {isTeamAdmin && (
                        <>
                            {/* Clave de acceso */}
                            <div>
                                <CopyRow label="Clave de acceso" value={currentTeam?.access_code || ''} hint="Compártela para que se unan al equipo." />
                                <button onClick={handleRegenerate} disabled={busy} className="mt-2 text-xs font-medium text-indigo-500 hover:text-indigo-400 flex items-center gap-1">
                                    <Icons.RotateCcw size={13} /> Regenerar clave
                                </button>
                            </div>

                            {/* Invitaciones */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Invitaciones de un solo uso</label>
                                    <button onClick={handleInvite} disabled={busy} className="flex items-center gap-1 text-xs font-medium text-indigo-500 hover:text-indigo-400">
                                        <Icons.Plus size={14} /> Crear
                                    </button>
                                </div>
                                {invitations.length === 0 ? (
                                    <p className="text-xs text-[var(--text-muted)]">No hay invitaciones activas.</p>
                                ) : (
                                    <div className="space-y-1.5">
                                        {invitations.map((inv) => (
                                            <div key={inv.id} className="flex items-center gap-2 text-sm">
                                                <code className="flex-1 font-mono tracking-wider text-[var(--text-primary)] bg-[var(--bg-tertiary)] rounded-lg px-3 py-1.5">{inv.invitation_code}</code>
                                                <button onClick={() => { navigator.clipboard?.writeText(inv.invitation_code); toast.success('Copiado'); }} className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-indigo-500" title="Copiar"><Icons.Copy size={14} /></button>
                                                <button onClick={() => revokeInvitation(inv.id)} className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-red-500" title="Revocar"><Icons.Trash2 size={14} /></button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* Miembros */}
                    <div>
                        <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Miembros ({members.length})</label>
                        <div className="space-y-2">
                            {members.map((m) => {
                                const p = m.profile || {};
                                const name = p.full_name || p.email?.split('@')[0] || 'Miembro';
                                const isSelf = m.user_id === currentUser?.id;
                                return (
                                    <div key={m.user_id} className="flex items-center gap-3 p-2.5 rounded-xl bg-[var(--bg-tertiary)]/50 border border-[var(--border-subtle)]">
                                        {p.avatar_url ? (
                                            <img src={p.avatar_url} alt={name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                                        ) : (
                                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold flex-shrink-0">{name.charAt(0).toUpperCase()}</div>
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-[var(--text-primary)] truncate">{name} {isSelf && <span className="text-[var(--text-muted)] font-normal">(tú)</span>}</p>
                                            {isTeamAdmin && !isSelf ? (
                                                <select
                                                    value={m.role}
                                                    onChange={(e) => handleRole(m.user_id, e.target.value)}
                                                    className="mt-1 text-xs bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-md px-2 py-1 text-[var(--text-primary)] outline-none"
                                                >
                                                    <option value="admin">Administrador</option>
                                                    <option value="editor">Editor</option>
                                                    <option value="member">Miembro</option>
                                                </select>
                                            ) : (
                                                <span className={`inline-block mt-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${ROLE_COLORS[m.role]}`}>{ROLE_LABELS[m.role]}</span>
                                            )}
                                        </div>
                                        {isTeamAdmin && !isSelf && (
                                            <button onClick={() => handleRemove(m.user_id)} className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10" title="Expulsar"><Icons.Trash2 size={14} /></button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Salir */}
                    <div className="pt-2 border-t border-[var(--border-subtle)]">
                        <button onClick={handleLeave} className="text-sm font-medium text-red-500 hover:text-red-400">
                            Salir de este equipo
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeamSettingsModal;
