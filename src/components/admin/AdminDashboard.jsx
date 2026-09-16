import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useAdmin } from '../../features/admin/useAdmin';
import { Icons } from '../ui/Icons';
import ConfirmationModal from '../modals/ConfirmationModal';

const ROLE_OPTIONS = [
    { value: 'admin', label: 'Admin' },
    { value: 'editor', label: 'Editor' },
    { value: 'member', label: 'Común' },
];
const TABS = [
    { id: 'users', label: 'Usuarios', icon: 'group' },
    { id: 'teams', label: 'Equipos', icon: 'groups' },
];

const AdminDashboard = () => {
    const { currentUser, isSuperadmin } = useAuth();
    const admin = useAdmin(isSuperadmin);
    const [tab, setTab] = useState('users');

    if (!isSuperadmin) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center text-[var(--text-muted)] p-8">
                <span className="material-symbols-outlined text-[44px] text-[var(--text-muted)]">lock</span>
                <p className="text-base font-semibold text-[var(--text-secondary)]">Acceso restringido</p>
                <p className="text-sm">Este panel solo está disponible para el administrador principal.</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-primary)]">
            <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/50 backdrop-blur-sm">
                <div className="flex items-center gap-1 px-6 py-2.5">
                    {TABS.map((t) => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                tab === t.id
                                    ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
                            }`}
                        >
                            <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-4 md:px-8 py-6">
                <div className="max-w-4xl mx-auto">
                    {tab === 'users' && <UsersTab admin={admin} currentUser={currentUser} />}
                    {tab === 'teams' && <TeamsTab admin={admin} />}
                </div>
            </div>
        </div>
    );
};

// ============ USUARIOS ============
const UsersTab = ({ admin, currentUser }) => {
    const { users, teams, memberships } = admin;
    const [showCreate, setShowCreate] = useState(false);
    const [expanded, setExpanded] = useState(null);
    const [userToDelete, setUserToDelete] = useState(null);

    const teamsById = useMemo(() => Object.fromEntries(teams.map((t) => [t.id, t])), [teams]);
    const membByUser = useMemo(() => {
        const m = {};
        memberships.forEach((r) => { (m[r.user_id] ||= []).push(r); });
        return m;
    }, [memberships]);

    const handleDelete = async () => {
        try { await admin.deleteUser(userToDelete.id); toast.success('Usuario eliminado'); }
        catch (e) { toast.error(e.message); }
        finally { setUserToDelete(null); }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider">Usuarios ({users.length})</h3>
                <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-sm font-medium rounded-lg shadow-lg shadow-indigo-500/20">
                    <Icons.UserPlus size={16} /> Crear usuario
                </button>
            </div>

            <div className="space-y-2">
                {users.map((u) => {
                    const mine = membByUser[u.id] || [];
                    const isOpen = expanded === u.id;
                    return (
                        <div key={u.id} className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
                            <div className="flex items-center gap-3 p-3">
                                {u.avatar_url ? (
                                    <img src={u.avatar_url} alt={u.full_name} className="w-10 h-10 rounded-full object-cover" />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold">{(u.full_name || u.email).charAt(0).toUpperCase()}</div>
                                )}
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{u.full_name || u.email.split('@')[0]}</p>
                                        {u.is_superadmin && <span className="text-[10px] font-bold text-purple-500 bg-purple-500/10 px-2 py-0.5 rounded-full">SUPERADMIN</span>}
                                    </div>
                                    <p className="text-xs text-[var(--text-muted)] truncate">{u.email}</p>
                                </div>
                                <span className="hidden sm:inline text-xs text-[var(--text-muted)]">{mine.length} equipo(s)</span>
                                <button onClick={() => setExpanded(isOpen ? null : u.id)} className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]" title="Gestionar equipos">
                                    <Icons.ChevronDown size={16} className={isOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
                                </button>
                                {u.id !== currentUser?.id && !u.is_superadmin && (
                                    <button onClick={() => setUserToDelete(u)} className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10" title="Eliminar usuario">
                                        <Icons.Trash2 size={15} />
                                    </button>
                                )}
                            </div>

                            {isOpen && (
                                <div className="border-t border-[var(--border-subtle)] p-3 bg-[var(--bg-tertiary)]/30 space-y-2">
                                    <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Equipos y roles</p>
                                    {mine.length === 0 && <p className="text-xs text-[var(--text-muted)]">No pertenece a ningún equipo.</p>}
                                    {mine.map((m) => (
                                        <div key={m.team_id} className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-[16px] text-indigo-500">groups</span>
                                            <span className="text-sm text-[var(--text-primary)] flex-1 truncate">{teamsById[m.team_id]?.name || 'Equipo'}</span>
                                            <select
                                                value={m.role}
                                                onChange={async (e) => { try { await admin.updateMemberRole(m.team_id, u.id, e.target.value); toast.success('Rol actualizado'); } catch { toast.error('Error'); } }}
                                                className="text-xs bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-md px-2 py-1 text-[var(--text-primary)] outline-none"
                                            >
                                                {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                                            </select>
                                            <button onClick={async () => { try { await admin.removeMember(m.team_id, u.id); toast.success('Quitado del equipo'); } catch { toast.error('Error'); } }} className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-red-500" title="Quitar del equipo">
                                                <Icons.X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                    <AddToTeam admin={admin} user={u} teams={teams} mine={mine} />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {showCreate && <CreateUserModal admin={admin} onClose={() => setShowCreate(false)} />}
            <ConfirmationModal
                isOpen={!!userToDelete}
                onClose={() => setUserToDelete(null)}
                onConfirm={handleDelete}
                title="¿Eliminar usuario?"
                message={`Se eliminará la cuenta de "${userToDelete?.email}" de forma permanente.`}
                confirmText="Sí, Eliminar"
                isDanger
            />
        </div>
    );
};

const AddToTeam = ({ admin, user, teams, mine }) => {
    const mineIds = new Set(mine.map((m) => m.team_id));
    const available = teams.filter((t) => !mineIds.has(t.id));
    const [teamId, setTeamId] = useState('');
    const [role, setRole] = useState('member');
    if (available.length === 0) return null;

    const add = async () => {
        if (!teamId) return;
        try { await admin.addMember(teamId, user.id, role); toast.success('Añadido al equipo'); setTeamId(''); }
        catch (e) { toast.error(e.message || 'Error'); }
    };

    return (
        <div className="flex items-center gap-2 pt-2 border-t border-[var(--border-subtle)]">
            <select value={teamId} onChange={(e) => setTeamId(e.target.value)} className="flex-1 text-xs bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-md px-2 py-1.5 text-[var(--text-primary)] outline-none">
                <option value="">Añadir a un equipo…</option>
                {available.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="text-xs bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-md px-2 py-1.5 text-[var(--text-primary)] outline-none">
                {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <button onClick={add} disabled={!teamId} className="px-3 py-1.5 text-xs font-medium bg-indigo-500/15 text-indigo-500 rounded-md disabled:opacity-40">Añadir</button>
        </div>
    );
};

const CreateUserModal = ({ admin, onClose }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [busy, setBusy] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        if (!email.trim() || !password) return toast.error('Email y contraseña obligatorios');
        setBusy(true);
        try {
            await admin.createUser({ email: email.trim(), password, full_name: name.trim() });
            toast.success('Usuario creado');
            onClose();
        } catch (err) { toast.error(err.message || 'No se pudo crear'); }
        finally { setBusy(false); }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
            <form onSubmit={submit} className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
                    <h2 className="text-lg font-bold text-[var(--text-primary)]">Crear usuario</h2>
                    <button type="button" onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"><Icons.X size={20} /></button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Nombre</label>
                        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre y apellidos" className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Email</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@ejemplo.com" className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Contraseña temporal</label>
                        <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-indigo-500" />
                        <p className="text-xs text-[var(--text-muted)] mt-1.5">Comparte estas credenciales con la persona; podrá cambiarla luego.</p>
                    </div>
                </div>
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--border-subtle)]">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Cancelar</button>
                    <button type="submit" disabled={busy} className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg">
                        {busy ? <Icons.Loader size={16} className="animate-spin" /> : <Icons.UserPlus size={16} />} Crear
                    </button>
                </div>
            </form>
        </div>
    );
};

// ============ EQUIPOS ============
const AdminTeamRow = ({ team, count, admin, onDelete }) => {
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(team.name);

    const save = async () => {
        const value = name.trim();
        if (!value || value === team.name) { setEditing(false); setName(team.name); return; }
        try { await admin.renameTeam(team.id, value); toast.success('Nombre actualizado'); setEditing(false); }
        catch { toast.error('No se pudo renombrar'); }
    };

    return (
        <div className="flex items-center gap-3 p-3 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl">
            <span className="material-symbols-outlined text-[22px] text-indigo-500">groups</span>
            <div className="min-w-0 flex-1">
                {editing ? (
                    <input
                        autoFocus
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setEditing(false); setName(team.name); } }}
                        onBlur={save}
                        className="w-full bg-[var(--bg-tertiary)] border border-indigo-500 rounded-lg px-2 py-1 text-sm text-[var(--text-primary)] outline-none"
                    />
                ) : (
                    <div className="flex items-center gap-1.5 group">
                        <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{team.name}</p>
                        <button onClick={() => setEditing(true)} className="text-[var(--text-muted)] hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" title="Renombrar">
                            <Icons.Edit size={13} />
                        </button>
                    </div>
                )}
                <p className="text-xs text-[var(--text-muted)]">{count} miembro(s)</p>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-[10px] text-[var(--text-muted)] uppercase">Clave</span>
                <code className="font-mono text-sm tracking-widest text-[var(--text-primary)] bg-[var(--bg-tertiary)] rounded-lg px-2.5 py-1">{team.access_code}</code>
                <button onClick={() => { navigator.clipboard?.writeText(team.access_code); toast.success('Copiado'); }} className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-indigo-500" title="Copiar clave"><Icons.Copy size={14} /></button>
                <button onClick={onDelete} className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10" title="Eliminar equipo"><Icons.Trash2 size={15} /></button>
            </div>
        </div>
    );
};

const TeamsTab = ({ admin }) => {
    const { teams, memberships } = admin;
    const [name, setName] = useState('');
    const [busy, setBusy] = useState(false);
    const [teamToDelete, setTeamToDelete] = useState(null);

    const countByTeam = useMemo(() => {
        const c = {};
        memberships.forEach((m) => { c[m.team_id] = (c[m.team_id] || 0) + 1; });
        return c;
    }, [memberships]);

    const create = async () => {
        if (!name.trim()) return toast.error('Ponle un nombre');
        setBusy(true);
        try { await admin.createTeam(name.trim()); setName(''); toast.success('Equipo creado'); }
        catch { toast.error('No se pudo crear'); }
        finally { setBusy(false); }
    };

    const handleDelete = async () => {
        try { await admin.deleteTeam(teamToDelete.id); toast.success('Equipo eliminado'); }
        catch { toast.error('No se pudo eliminar'); }
        finally { setTeamToDelete(null); }
    };

    return (
        <div>
            <div className="flex items-center gap-2 mb-5">
                <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && create()} placeholder="Nombre del nuevo equipo" className="flex-1 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-indigo-500" />
                <button onClick={create} disabled={busy} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 text-white text-sm font-medium rounded-xl shadow-lg shadow-indigo-500/20">
                    <Icons.Plus size={16} /> Crear equipo
                </button>
            </div>

            <div className="space-y-2">
                {teams.map((t) => (
                    <AdminTeamRow key={t.id} team={t} count={countByTeam[t.id] || 0} admin={admin} onDelete={() => setTeamToDelete(t)} />
                ))}
            </div>

            <ConfirmationModal
                isOpen={!!teamToDelete}
                onClose={() => setTeamToDelete(null)}
                onConfirm={handleDelete}
                title="¿Eliminar equipo?"
                message={`Se eliminará "${teamToDelete?.name}" y todo su contenido (chat, documentos, cambios). Esta acción no se puede deshacer.`}
                confirmText="Sí, Eliminar"
                isDanger
            />
        </div>
    );
};

export default AdminDashboard;
