import React, { useState, useRef, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useTeamMessages } from '../../features/team/hooks/useTeamMessages';
import { buildMemberMap, getMember, formatTime, formatDayLabel } from '../../features/team/utils';
import { Icons } from '../ui/Icons';

const Avatar = ({ member, size = 36 }) => {
    if (member?.avatar_url) {
        return (
            <img
                src={member.avatar_url}
                alt={member.name}
                style={{ width: size, height: size }}
                className="rounded-full object-cover flex-shrink-0 ring-2 ring-[var(--bg-primary)]"
            />
        );
    }
    return (
        <div
            style={{ width: size, height: size }}
            className="rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold flex-shrink-0 ring-2 ring-[var(--bg-primary)]"
        >
            {member?.name?.charAt(0)?.toUpperCase() || 'U'}
        </div>
    );
};

const TeamChat = () => {
    const { currentUser } = useAuth();
    const { currentWorkspace, workspaceMembers, userRole } = useWorkspace();
    const { messages, isLoading, sendMessage, deleteMessage, isSending } = useTeamMessages(
        currentWorkspace?.id,
        currentUser
    );

    const [text, setText] = useState('');
    const bottomRef = useRef(null);
    const isAdmin = userRole === 'owner' || userRole === 'admin';

    const memberMap = useMemo(
        () => buildMemberMap(workspaceMembers, currentUser),
        [workspaceMembers, currentUser]
    );

    // Auto-scroll al final cuando llegan mensajes
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length]);

    const handleSend = async (e) => {
        e?.preventDefault();
        const value = text.trim();
        if (!value) return;
        setText('');
        try {
            await sendMessage(value);
        } catch {
            toast.error('No se pudo enviar el mensaje');
            setText(value); // restaurar en caso de error
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleDelete = async (id) => {
        try {
            await deleteMessage(id);
        } catch {
            toast.error('No se pudo eliminar el mensaje');
        }
    };

    // Agrupar mensajes por día para mostrar separadores
    const grouped = useMemo(() => {
        const groups = [];
        let currentDay = null;
        messages.forEach((msg) => {
            const day = formatDayLabel(msg.created_at);
            if (day !== currentDay) {
                groups.push({ type: 'day', id: `day-${msg.id}`, label: day });
                currentDay = day;
            }
            groups.push({ type: 'msg', ...msg });
        });
        return groups;
    }, [messages]);

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-[var(--bg-primary)]">
            {/* Lista de mensajes */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-4 md:px-8 py-6 space-y-1">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center gap-3 text-[var(--text-muted)]">
                        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[32px] text-indigo-500">forum</span>
                        </div>
                        <p className="text-sm font-medium text-[var(--text-secondary)]">Aún no hay mensajes</p>
                        <p className="text-xs">Sé el primero en escribir al equipo 👋</p>
                    </div>
                ) : (
                    grouped.map((item) => {
                        if (item.type === 'day') {
                            return (
                                <div key={item.id} className="flex items-center justify-center my-4">
                                    <span className="text-[11px] font-semibold text-[var(--text-muted)] bg-[var(--bg-secondary)] border border-[var(--border-subtle)] px-3 py-1 rounded-full uppercase tracking-wider">
                                        {item.label}
                                    </span>
                                </div>
                            );
                        }
                        const member = getMember(memberMap, item.user_id);
                        const isOwn = item.user_id === currentUser?.id;
                        const canDelete = isOwn || isAdmin;
                        return (
                            <div
                                key={item.id}
                                className={`group flex items-start gap-3 py-1.5 ${isOwn ? 'flex-row-reverse' : ''}`}
                            >
                                <Avatar member={member} />
                                <div className={`flex flex-col max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
                                    <div className={`flex items-center gap-2 mb-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
                                        <span className="text-xs font-semibold text-[var(--text-primary)]">
                                            {isOwn ? 'Tú' : member.name}
                                        </span>
                                        <span className="text-[10px] text-[var(--text-muted)]">
                                            {formatTime(item.created_at)}
                                        </span>
                                    </div>
                                    <div
                                        className={`
                                            relative px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words
                                            ${isOwn
                                                ? 'bg-gradient-to-br from-indigo-600 to-indigo-500 text-white rounded-tr-sm shadow-lg shadow-indigo-500/20'
                                                : 'bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-tl-sm'}
                                        `}
                                    >
                                        {item.content}
                                        {canDelete && (
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                className={`
                                                    absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity
                                                    w-7 h-7 flex items-center justify-center rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]
                                                    text-[var(--text-muted)] hover:text-red-500 hover:border-red-500/40
                                                    ${isOwn ? '-left-9' : '-right-9'}
                                                `}
                                                title="Eliminar mensaje"
                                            >
                                                <Icons.Trash2 size={13} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={bottomRef} />
            </div>

            {/* Barra de escritura */}
            <form
                onSubmit={handleSend}
                className="border-t border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/60 backdrop-blur-sm px-4 md:px-8 py-4"
            >
                <div className="flex items-end gap-3 max-w-4xl mx-auto">
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        rows={1}
                        placeholder="Escribe un mensaje para el equipo..."
                        className="flex-1 resize-none max-h-32 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 outline-none custom-scrollbar transition-all"
                    />
                    <button
                        type="submit"
                        disabled={!text.trim() || isSending}
                        className="w-11 h-11 flex-shrink-0 flex items-center justify-center bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-all shadow-lg shadow-indigo-500/20"
                        title="Enviar"
                    >
                        <Icons.Send size={18} />
                    </button>
                </div>
            </form>
        </div>
    );
};

export default TeamChat;
