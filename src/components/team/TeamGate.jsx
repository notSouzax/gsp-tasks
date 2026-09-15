import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useTeam } from '../../features/team/TeamContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Icons } from '../ui/Icons';

/**
 * Pantalla de acceso a Equipo: unirse con clave o invitación, o crear un equipo.
 * Se muestra cuando el usuario todavía no pertenece a ningún equipo (o pulsa
 * "unirse a otro"). `embedded` la usa el selector para volver atrás.
 */
const TeamGate = ({ onCancel }) => {
    const { joinByCode, acceptInvite, createTeam } = useTeam();
    const { userRole } = useWorkspace();
    const canCreate = userRole === 'owner' || userRole === 'admin';

    const [mode, setMode] = useState('join'); // join | invite | create
    const [code, setCode] = useState('');
    const [teamName, setTeamName] = useState('');
    const [busy, setBusy] = useState(false);

    const handleJoin = async () => {
        if (!code.trim()) return toast.error('Introduce la clave');
        setBusy(true);
        try {
            if (mode === 'invite') await acceptInvite(code.trim());
            else await joinByCode(code.trim());
            toast.success('Te has unido al equipo');
        } catch (err) {
            toast.error(err?.message || 'No se pudo unir');
        } finally {
            setBusy(false);
        }
    };

    const handleCreate = async () => {
        if (!teamName.trim()) return toast.error('Ponle un nombre al equipo');
        setBusy(true);
        try {
            await createTeam(teamName.trim());
            toast.success('Equipo creado');
        } catch (err) {
            toast.error(err?.message || 'No se pudo crear el equipo');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="flex-1 flex items-center justify-center bg-[var(--bg-primary)] p-6">
            <div className="w-full max-w-md bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl p-8 shadow-xl">
                <div className="flex flex-col items-center text-center mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined text-[34px] text-indigo-500">groups</span>
                    </div>
                    <h2 className="text-xl font-bold text-[var(--text-primary)]">Acceso a Equipo</h2>
                    <p className="text-sm text-[var(--text-muted)] mt-1">
                        Únete a un equipo con tu clave de acceso o una invitación.
                    </p>
                </div>

                {/* Selector unirse / invitación */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-[var(--bg-tertiary)] rounded-xl mb-4">
                    {[
                        { id: 'join', label: 'Con clave', icon: 'key' },
                        { id: 'invite', label: 'Invitación', icon: 'mail' },
                    ].map((m) => (
                        <button
                            key={m.id}
                            onClick={() => setMode(m.id)}
                            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                                mode === m.id ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                        >
                            <span className="material-symbols-outlined text-[18px]">{m.icon}</span>
                            {m.label}
                        </button>
                    ))}
                </div>

                {mode !== 'create' ? (
                    <div className="space-y-3">
                        <input
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                            placeholder={mode === 'invite' ? 'Código de invitación' : 'Clave de acceso (p. ej. AB12CD34)'}
                            className="w-full text-center tracking-widest font-mono bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] placeholder:tracking-normal placeholder:font-sans placeholder:text-sm focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 outline-none"
                        />
                        <button
                            onClick={handleJoin}
                            disabled={busy}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-indigo-500/20"
                        >
                            {busy ? <Icons.Loader size={16} className="animate-spin" /> : <Icons.Check size={16} />}
                            Unirme al equipo
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <input
                            type="text"
                            value={teamName}
                            onChange={(e) => setTeamName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                            placeholder="Nombre del equipo (p. ej. Departamento X)"
                            className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 outline-none"
                        />
                        <button
                            onClick={handleCreate}
                            disabled={busy}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-indigo-500/20"
                        >
                            {busy ? <Icons.Loader size={16} className="animate-spin" /> : <Icons.Plus size={16} />}
                            Crear equipo
                        </button>
                    </div>
                )}

                {/* Crear / cancelar */}
                <div className="mt-5 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between text-sm">
                    {canCreate ? (
                        <button
                            onClick={() => setMode(mode === 'create' ? 'join' : 'create')}
                            className="text-indigo-500 hover:text-indigo-400 font-medium"
                        >
                            {mode === 'create' ? '← Unirme a un equipo' : 'Crear un equipo nuevo'}
                        </button>
                    ) : <span />}
                    {onCancel && (
                        <button onClick={onCancel} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                            Cancelar
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TeamGate;
