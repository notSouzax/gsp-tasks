import React, { useState, useRef, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useTeamChanges } from '../../features/team/hooks/useTeamChanges';
import { useTeamEditors } from '../../features/team/hooks/useTeamEditors';
import {
    buildMemberMap,
    getMember,
    formatDate,
    formatTime,
    attachmentToDoc,
    isImageDoc,
    isVideoFileDoc,
    isVideoLink,
    isPdfDoc,
    formatFileSize,
} from '../../features/team/utils';
import { MAX_FILE_MB, getCategoryStyle } from '../../features/team/constants';
import DocViewerModal from './modals/DocViewerModal';
import PdfThumbnail from './PdfThumbnail';
import ConfirmationModal from '../modals/ConfirmationModal';
import { Icons } from '../ui/Icons';

const Avatar = ({ member, size = 40 }) =>
    member?.avatar_url ? (
        <img src={member.avatar_url} alt={member.name} style={{ width: size, height: size }} className="rounded-full object-cover flex-shrink-0" />
    ) : (
        <div style={{ width: size, height: size }} className="rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold flex-shrink-0">
            {member?.name?.charAt(0)?.toUpperCase() || 'U'}
        </div>
    );

/** Tile de un adjunto dentro de una publicación. */
const AttachmentTile = ({ doc, onOpen }) => {
    const image = isImageDoc(doc);
    const pdf = isPdfDoc(doc);
    const video = isVideoFileDoc(doc) || isVideoLink(doc);
    const style = getCategoryStyle('indigo');

    return (
        <button
            onClick={() => onOpen(doc)}
            className="group relative rounded-xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] hover:border-indigo-500/40 transition-all text-left"
            style={{ height: 120 }}
            title={doc.title}
        >
            {image ? (
                <img src={doc.file_url} alt={doc.title} className="w-full h-full object-cover" loading="lazy" />
            ) : pdf ? (
                <div className="relative w-full h-full">
                    <PdfThumbnail url={doc.file_url} style={style} />
                </div>
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-2 bg-gradient-to-br from-indigo-500/10 to-indigo-500/5">
                    <span className="material-symbols-outlined text-[30px] text-indigo-500">
                        {video ? 'play_circle' : doc.kind === 'link' ? 'link' : 'description'}
                    </span>
                    <span className="text-[10px] text-[var(--text-secondary)] text-center line-clamp-2 px-1">{doc.title}</span>
                </div>
            )}

            {video && (image || pdf) && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <span className="material-symbols-outlined text-[36px] text-white drop-shadow-lg">play_circle</span>
                </div>
            )}
            {(image || pdf) && (
                <div className="absolute bottom-0 inset-x-0 px-2 py-1 bg-gradient-to-t from-black/60 to-transparent">
                    <span className="text-[10px] text-white/90 line-clamp-1">{doc.title}</span>
                </div>
            )}
        </button>
    );
};

const TeamChanges = () => {
    const { currentUser } = useAuth();
    const { currentWorkspace, workspaceMembers, userRole } = useWorkspace();
    const workspaceId = currentWorkspace?.id;

    const { changes, isLoading, createChange, deleteChange, isPublishing } = useTeamChanges(workspaceId, currentUser);
    const { editorIds } = useTeamEditors(workspaceId, currentUser);

    const isAdmin = userRole === 'owner' || userRole === 'admin';
    const canPublish = isAdmin || editorIds.includes(currentUser?.id);

    const memberMap = useMemo(() => buildMemberMap(workspaceMembers, currentUser), [workspaceMembers, currentUser]);

    // Composer
    const [text, setText] = useState('');
    const [files, setFiles] = useState([]);
    const [linkInput, setLinkInput] = useState('');
    const [showLink, setShowLink] = useState(false);
    const [links, setLinks] = useState([]);
    const fileInputRef = useRef(null);

    // Viewer + delete
    const [viewerDoc, setViewerDoc] = useState(null);
    const [toDelete, setToDelete] = useState(null);

    const addFiles = (fileList) => {
        const arr = Array.from(fileList || []);
        const valid = [];
        for (const f of arr) {
            if (f.size > MAX_FILE_MB * 1024 * 1024) {
                toast.error(`"${f.name}" supera ${MAX_FILE_MB} MB. Para vídeos pesados usa un enlace.`);
                continue;
            }
            valid.push(f);
        }
        setFiles((prev) => [...prev, ...valid]);
    };

    const addLink = () => {
        const url = linkInput.trim();
        if (!url) return;
        try { new URL(url); } catch { return toast.error('Enlace no válido'); }
        setLinks((prev) => [...prev, { url }]);
        setLinkInput('');
        setShowLink(false);
    };

    const resetComposer = () => {
        setText(''); setFiles([]); setLinks([]); setLinkInput(''); setShowLink(false);
    };

    const handlePublish = async () => {
        if (!text.trim() && files.length === 0 && links.length === 0) {
            return toast.error('Escribe algo o adjunta un archivo');
        }
        try {
            await createChange({ content: text.trim(), files, links });
            resetComposer();
            toast.success('Cambio publicado');
        } catch (err) {
            toast.error(err?.message || 'No se pudo publicar');
        }
    };

    const handleConfirmDelete = async () => {
        if (!toDelete) return;
        try {
            await deleteChange(toDelete);
            toast.success('Publicación eliminada');
        } catch {
            toast.error('No se pudo eliminar');
        } finally {
            setToDelete(null);
        }
    };

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-[var(--bg-primary)]">
            <div className="flex-1 overflow-y-auto custom-scrollbar px-4 md:px-8 py-6">
                <div className="max-w-3xl mx-auto space-y-6">
                    {/* Composer */}
                    {canPublish && (
                        <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl p-4">
                            <textarea
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                rows={3}
                                placeholder="¿Qué ha cambiado en el programa? Describe la novedad..."
                                className="w-full resize-none bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none custom-scrollbar"
                            />

                            {/* Adjuntos pendientes */}
                            {(files.length > 0 || links.length > 0) && (
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {files.map((f, i) => (
                                        <span key={`f-${i}`} className="inline-flex items-center gap-2 pl-3 pr-2 py-1.5 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg text-xs text-[var(--text-secondary)]">
                                            <span className="material-symbols-outlined text-[15px] text-indigo-500">
                                                {f.type.startsWith('image/') ? 'image' : f.type.startsWith('video/') ? 'movie' : 'draft'}
                                            </span>
                                            <span className="max-w-[160px] truncate">{f.name}</span>
                                            <span className="text-[var(--text-muted)]">{formatFileSize(f.size)}</span>
                                            <button onClick={() => setFiles((p) => p.filter((_, idx) => idx !== i))} className="text-[var(--text-muted)] hover:text-red-500">
                                                <Icons.X size={14} />
                                            </button>
                                        </span>
                                    ))}
                                    {links.map((l, i) => (
                                        <span key={`l-${i}`} className="inline-flex items-center gap-2 pl-3 pr-2 py-1.5 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg text-xs text-[var(--text-secondary)]">
                                            <span className="material-symbols-outlined text-[15px] text-indigo-500">link</span>
                                            <span className="max-w-[200px] truncate">{l.url}</span>
                                            <button onClick={() => setLinks((p) => p.filter((_, idx) => idx !== i))} className="text-[var(--text-muted)] hover:text-red-500">
                                                <Icons.X size={14} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Enlace */}
                            {showLink && (
                                <div className="flex items-center gap-2 mt-3">
                                    <input
                                        type="url"
                                        value={linkInput}
                                        onChange={(e) => setLinkInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLink())}
                                        placeholder="https://youtube.com/... o cualquier enlace"
                                        className="flex-1 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-indigo-500"
                                    />
                                    <button onClick={addLink} className="px-3 py-1.5 text-xs font-medium bg-indigo-500/15 text-indigo-500 rounded-lg">Añadir</button>
                                </div>
                            )}

                            {/* Barra de acciones */}
                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border-subtle)]">
                                <div className="flex items-center gap-1">
                                    <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
                                    <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-indigo-500 hover:bg-indigo-500/10 rounded-lg transition-colors" title="Adjuntar foto, documento o vídeo">
                                        <span className="material-symbols-outlined text-[18px]">attach_file</span>
                                        Adjuntar
                                    </button>
                                    <button onClick={() => setShowLink((s) => !s)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-indigo-500 hover:bg-indigo-500/10 rounded-lg transition-colors" title="Añadir enlace o vídeo">
                                        <span className="material-symbols-outlined text-[18px]">link</span>
                                        Enlace
                                    </button>
                                </div>
                                <button
                                    onClick={handlePublish}
                                    disabled={isPublishing}
                                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-all shadow-lg shadow-indigo-500/20"
                                >
                                    {isPublishing ? <Icons.Loader size={16} className="animate-spin" /> : <span className="material-symbols-outlined text-[18px]">send</span>}
                                    Publicar
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Feed */}
                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                        </div>
                    ) : changes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center text-center gap-3 py-20 text-[var(--text-muted)]">
                            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
                                <span className="material-symbols-outlined text-[32px] text-indigo-500">campaign</span>
                            </div>
                            <p className="text-sm font-medium text-[var(--text-secondary)]">Aún no hay cambios publicados</p>
                            <p className="text-xs">{canPublish ? 'Publica el primer cambio del programa.' : 'Aquí aparecerán las novedades del programa.'}</p>
                        </div>
                    ) : (
                        changes.map((post) => {
                            const author = getMember(memberMap, post.author_id);
                            const canDelete = isAdmin || post.author_id === currentUser?.id;
                            const attachments = post.attachments || [];
                            return (
                                <div key={post.id} className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl p-4">
                                    <div className="flex items-center gap-3 mb-3">
                                        <Avatar member={author} />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{author.name}</p>
                                            <p className="text-[11px] text-[var(--text-muted)]">{formatDate(post.created_at)} · {formatTime(post.created_at)}</p>
                                        </div>
                                        {canDelete && (
                                            <button onClick={() => setToDelete(post)} className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors" title="Eliminar">
                                                <Icons.Trash2 size={15} />
                                            </button>
                                        )}
                                    </div>

                                    {post.content && (
                                        <p className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap break-words mb-3">{post.content}</p>
                                    )}

                                    {attachments.length > 0 && (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                            {attachments.map((att, i) => (
                                                <AttachmentTile key={i} doc={attachmentToDoc(att, post)} onOpen={setViewerDoc} />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {viewerDoc && <DocViewerModal doc={viewerDoc} memberMap={memberMap} onClose={() => setViewerDoc(null)} />}
            <ConfirmationModal
                isOpen={!!toDelete}
                onClose={() => setToDelete(null)}
                onConfirm={handleConfirmDelete}
                title="¿Eliminar publicación?"
                message="Se eliminará esta publicación y sus adjuntos de forma permanente."
                confirmText="Sí, Eliminar"
                isDanger
            />
        </div>
    );
};

export default TeamChanges;
