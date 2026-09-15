import React from 'react';
import { getCategory, getCategoryStyle } from '../../features/team/constants';
import {
    isImageDoc,
    isVideoFileDoc,
    isVideoLink,
    isPdfDoc,
    formatFileSize,
    formatDate,
    getMember,
} from '../../features/team/utils';
import { Icons } from '../ui/Icons';

/** Intenta obtener una miniatura para enlaces de YouTube. */
const getYouTubeThumb = (url) => {
    try {
        const u = new URL(url);
        const host = u.hostname.replace('www.', '');
        let id = null;
        if (host === 'youtube.com' || host === 'm.youtube.com') id = u.searchParams.get('v');
        else if (host === 'youtu.be') id = u.pathname.slice(1);
        return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
    } catch {
        return null;
    }
};

const DocumentCard = ({ doc, memberMap, canManage, onOpen, onDelete }) => {
    const category = getCategory(doc.category);
    const style = getCategoryStyle(category.color);
    const uploader = getMember(memberMap, doc.uploaded_by);

    const image = isImageDoc(doc);
    const videoFile = isVideoFileDoc(doc);
    const videoLink = isVideoLink(doc);
    const isVideo = videoFile || videoLink;
    const pdf = isPdfDoc(doc);
    const ytThumb = doc.kind === 'link' ? getYouTubeThumb(doc.external_url) : null;

    // Icono representativo del tipo de documento
    let typeIcon = 'description';
    if (isVideo) typeIcon = 'play_circle';
    else if (image) typeIcon = 'image';
    else if (pdf) typeIcon = 'picture_as_pdf';
    else if (doc.kind === 'link') typeIcon = 'link';

    return (
        <div
            onClick={() => onOpen(doc)}
            className="group relative flex flex-col bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl overflow-hidden cursor-pointer hover:border-indigo-500/40 hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-0.5 transition-all duration-200"
        >
            {/* Cabecera visual */}
            <div className="relative h-36 overflow-hidden">
                {image ? (
                    <img src={doc.file_url} alt={doc.title} className="w-full h-full object-cover" loading="lazy" />
                ) : ytThumb ? (
                    <img src={ytThumb} alt={doc.title} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${style.gradient} flex items-center justify-center`}>
                        <span className={`material-symbols-outlined text-[52px] ${style.text} opacity-80`}>
                            {typeIcon}
                        </span>
                    </div>
                )}

                {/* Overlay de play para vídeos */}
                {isVideo && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                        <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-[30px] text-indigo-600 ml-0.5">play_arrow</span>
                        </div>
                    </div>
                )}

                {/* Badge de categoría */}
                <div className="absolute top-3 left-3">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold backdrop-blur-md ${style.bg} ${style.text} ring-1 ${style.ring}`}>
                        <span className="material-symbols-outlined text-[13px]">{category.icon}</span>
                        {category.shortLabel}
                    </span>
                </div>

                {/* Botón de borrar (solo gestores) */}
                {canManage && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(doc); }}
                        className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-lg bg-black/40 backdrop-blur-md text-white/90 hover:bg-red-500 opacity-0 group-hover:opacity-100 transition-all"
                        title="Eliminar documento"
                    >
                        <Icons.Trash2 size={15} />
                    </button>
                )}
            </div>

            {/* Cuerpo */}
            <div className="flex flex-col flex-1 p-4">
                <h3 className="text-sm font-bold text-[var(--text-primary)] line-clamp-2 group-hover:text-indigo-500 transition-colors">
                    {doc.title}
                </h3>
                {doc.description && (
                    <p className="text-xs text-[var(--text-secondary)] mt-1.5 line-clamp-2 leading-relaxed">
                        {doc.description}
                    </p>
                )}

                {/* Pie: autor + fecha + tamaño */}
                <div className="flex items-center justify-between mt-auto pt-3 text-[11px] text-[var(--text-muted)]">
                    <span className="flex items-center gap-1.5 min-w-0">
                        <span className="material-symbols-outlined text-[14px]">person</span>
                        <span className="truncate">{uploader.name}</span>
                    </span>
                    <span className="flex items-center gap-2 flex-shrink-0">
                        {doc.kind === 'file' && doc.file_size ? (
                            <span>{formatFileSize(doc.file_size)}</span>
                        ) : null}
                        <span>{formatDate(doc.created_at)}</span>
                    </span>
                </div>
            </div>
        </div>
    );
};

export default DocumentCard;
