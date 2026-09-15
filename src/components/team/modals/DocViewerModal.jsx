import React from 'react';
import { getCategory, getCategoryStyle } from '../../../features/team/constants';
import {
    isVideoFileDoc,
    getVideoEmbedUrl,
    formatFileSize,
    formatDate,
    getMember,
} from '../../../features/team/utils';
import { Icons } from '../../ui/Icons';
import FilePreview from '../FilePreview';

const DocViewerModal = ({ doc, memberMap, onClose }) => {
    if (!doc) return null;

    const category = getCategory(doc.category);
    const style = getCategoryStyle(category.color);
    const uploader = getMember(memberMap, doc.uploaded_by);

    const videoFile = isVideoFileDoc(doc);
    const embedUrl = doc.kind === 'link' ? getVideoEmbedUrl(doc.external_url) : null;
    const openUrl = doc.kind === 'file' ? doc.file_url : doc.external_url;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <div
                className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Cabecera */}
                <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-[var(--border-subtle)]">
                    <div className="min-w-0">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${style.bg} ${style.text} ring-1 ${style.ring} mb-2`}>
                            <span className="material-symbols-outlined text-[13px]">{category.icon}</span>
                            {category.label}
                        </span>
                        <h2 className="text-lg font-bold text-[var(--text-primary)] truncate">{doc.title}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                    >
                        <Icons.X size={20} />
                    </button>
                </div>

                {/* Contenido */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    <div className="rounded-xl overflow-hidden bg-black/40 border border-[var(--border-subtle)]">
                        {embedUrl ? (
                            <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
                                <iframe
                                    src={embedUrl}
                                    title={doc.title}
                                    className="absolute inset-0 w-full h-full"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                                    allowFullScreen
                                />
                            </div>
                        ) : videoFile ? (
                            <video src={doc.file_url} controls className="w-full max-h-[70vh] bg-black">
                                Tu navegador no soporta la reproducción de vídeo.
                            </video>
                        ) : doc.kind === 'link' ? (
                            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                                <div className={`w-20 h-20 rounded-2xl ${style.bg} flex items-center justify-center`}>
                                    <span className={`material-symbols-outlined text-[40px] ${style.text}`}>link</span>
                                </div>
                                <p className="text-sm text-[var(--text-secondary)]">
                                    Este contenido se abre en una pestaña nueva.
                                </p>
                            </div>
                        ) : (
                            <FilePreview doc={doc} />
                        )}
                    </div>

                    {doc.description && (
                        <div className="mt-5">
                            <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Descripción</h3>
                            <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                                {doc.description}
                            </p>
                        </div>
                    )}
                </div>

                {/* Pie */}
                <div className="flex items-center justify-between gap-4 px-6 py-4 border-t border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/40">
                    <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] min-w-0">
                        <span className="material-symbols-outlined text-[16px]">person</span>
                        <span className="truncate">{uploader.name}</span>
                        <span>·</span>
                        <span>{formatDate(doc.created_at)}</span>
                        {doc.kind === 'file' && doc.file_size ? (
                            <>
                                <span>·</span>
                                <span>{formatFileSize(doc.file_size)}</span>
                            </>
                        ) : null}
                    </div>
                    <a
                        href={openUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-indigo-500/20 flex-shrink-0"
                    >
                        <span className="material-symbols-outlined text-[18px]">
                            {doc.kind === 'link' ? 'open_in_new' : 'download'}
                        </span>
                        {doc.kind === 'link' ? 'Abrir enlace' : 'Descargar'}
                    </a>
                </div>
            </div>
        </div>
    );
};

export default DocViewerModal;
