/**
 * Utilidades del apartado de Equipo.
 */

/**
 * Construye un mapa { user_id: { name, avatar_url, email } } a partir de los
 * miembros del workspace, incluyendo al usuario actual como respaldo.
 */
export const buildMemberMap = (workspaceMembers = [], currentUser = null) => {
    const map = {};
    workspaceMembers.forEach((m) => {
        const p = m.profiles || {};
        map[m.user_id] = {
            id: m.user_id,
            name: p.full_name || p.email?.split('@')[0] || 'Miembro',
            avatar_url: p.avatar_url || null,
            email: p.email || null,
            role: m.role,
        };
    });
    if (currentUser?.id && !map[currentUser.id]) {
        map[currentUser.id] = {
            id: currentUser.id,
            name: currentUser.name || currentUser.email?.split('@')[0] || 'Yo',
            avatar_url: currentUser.avatar_url || null,
            email: currentUser.email || null,
            role: currentUser.role,
        };
    }
    return map;
};

export const getMember = (map, id) =>
    map[id] || { id, name: 'Usuario', avatar_url: null, email: null };

/** Formatea un tamaño en bytes a algo legible. */
export const formatFileSize = (bytes) => {
    if (!bytes && bytes !== 0) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let i = 0;
    while (size >= 1024 && i < units.length - 1) {
        size /= 1024;
        i++;
    }
    return `${size.toFixed(size >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
};

/** Extensión en minúsculas del archivo (por file_name o por la URL). */
export const getDocExtension = (doc) => {
    const source = doc.file_name || doc.file_url || '';
    const clean = source.split('?')[0].split('#')[0];
    const parts = clean.split('.');
    return parts.length > 1 ? parts.pop().toLowerCase() : '';
};

const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif', 'ico'];
const VIDEO_EXTS = ['mp4', 'webm', 'ogg', 'mov', 'm4v'];
const TEXT_EXTS = ['txt', 'md', 'markdown', 'csv', 'json', 'log', 'xml', 'yml', 'yaml'];
const OFFICE_EXTS = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];

// La detección usa el MIME y, como respaldo, la extensión del archivo.
export const isImageDoc = (doc) =>
    doc.kind === 'file' && ((doc.mime_type || '').startsWith('image/') || IMAGE_EXTS.includes(getDocExtension(doc)));
export const isVideoFileDoc = (doc) =>
    doc.kind === 'file' && ((doc.mime_type || '').startsWith('video/') || VIDEO_EXTS.includes(getDocExtension(doc)));
export const isPdfDoc = (doc) =>
    doc.kind === 'file' && ((doc.mime_type || '') === 'application/pdf' || getDocExtension(doc) === 'pdf');
export const isTextDoc = (doc) =>
    doc.kind === 'file' && ((doc.mime_type || '').startsWith('text/') || TEXT_EXTS.includes(getDocExtension(doc)));
export const isOfficeDoc = (doc) =>
    doc.kind === 'file' && OFFICE_EXTS.includes(getDocExtension(doc));

/** URL del visor de Office Online (requiere que el archivo sea públicamente accesible). */
export const getOfficeViewerUrl = (fileUrl) =>
    `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;

/**
 * Devuelve una URL de embed para enlaces de YouTube/Vimeo/Loom, o null si no
 * se reconoce (en cuyo caso se tratará como enlace externo normal).
 */
export const getVideoEmbedUrl = (url) => {
    if (!url) return null;
    try {
        const u = new URL(url);
        const host = u.hostname.replace('www.', '');

        // YouTube
        if (host === 'youtube.com' || host === 'm.youtube.com') {
            const id = u.searchParams.get('v');
            if (id) return `https://www.youtube.com/embed/${id}`;
            if (u.pathname.startsWith('/embed/')) return url;
        }
        if (host === 'youtu.be') {
            const id = u.pathname.slice(1);
            if (id) return `https://www.youtube.com/embed/${id}`;
        }
        // Vimeo
        if (host === 'vimeo.com') {
            const id = u.pathname.split('/').filter(Boolean)[0];
            if (id && /^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`;
        }
        // Loom
        if (host === 'loom.com' && u.pathname.includes('/share/')) {
            return url.replace('/share/', '/embed/');
        }
        if (host === 'loom.com' && u.pathname.includes('/embed/')) {
            return url;
        }
    } catch {
        return null;
    }
    return null;
};

/** ¿El enlace externo es un vídeo reproducible (YouTube/Vimeo/Loom)? */
export const isVideoLink = (doc) => doc.kind === 'link' && !!getVideoEmbedUrl(doc.external_url);

/** Formatea una fecha ISO a hora local corta (HH:MM). */
export const formatTime = (iso) => {
    try {
        return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } catch {
        return '';
    }
};

/** Formatea una fecha ISO a fecha local corta (dd/mm/yyyy). */
export const formatDate = (iso) => {
    try {
        return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
        return '';
    }
};

/** Etiqueta de día para separadores del chat (Hoy / Ayer / fecha). */
export const formatDayLabel = (iso) => {
    try {
        const d = new Date(iso);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
        const sameDay = (a, b) =>
            a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
        if (sameDay(d, today)) return 'Hoy';
        if (sameDay(d, yesterday)) return 'Ayer';
        return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
    } catch {
        return '';
    }
};
