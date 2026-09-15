import React, { useState, useEffect } from 'react';
import {
    isImageDoc,
    isPdfDoc,
    isTextDoc,
    isOfficeDoc,
    getOfficeViewerUrl,
} from '../../features/team/utils';
import { getCategoryStyle, getCategory } from '../../features/team/constants';
import PdfPreview from './PdfPreview';

const Spinner = ({ label = 'Cargando vista previa...' }) => (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-[var(--text-muted)]">
        <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        <span className="text-sm">{label}</span>
    </div>
);

const Fallback = ({ doc, message }) => {
    const style = getCategoryStyle(getCategory(doc.category).color);
    return (
        <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <div className={`w-20 h-20 rounded-2xl ${style.bg} flex items-center justify-center`}>
                <span className={`material-symbols-outlined text-[40px] ${style.text}`}>description</span>
            </div>
            <p className="text-sm text-[var(--text-secondary)] max-w-sm">
                {message || 'Vista previa no disponible para este tipo de archivo. Usa el botón de descargar.'}
            </p>
        </div>
    );
};

/**
 * Vista previa de archivos subidos.
 * - PDF: se renderiza con PDF.js (ver PdfPreview), sin depender del visor del navegador.
 * - Imágenes: directas.
 * - Office: visor de Office Online.
 * - Texto: se descarga y se muestra en un bloque de código.
 */
const FilePreview = ({ doc }) => {
    const [textContent, setTextContent] = useState(null);
    const [status, setStatus] = useState('idle'); // idle | loading | ready | error

    const image = isImageDoc(doc);
    const pdf = isPdfDoc(doc);
    const text = isTextDoc(doc);
    const office = isOfficeDoc(doc);

    useEffect(() => {
        if (!text || !doc.file_url) return;

        let cancelled = false;
        setStatus('loading');

        (async () => {
            try {
                const res = await fetch(doc.file_url);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const content = await res.text();
                if (cancelled) return;
                setTextContent(content);
                setStatus('ready');
            } catch {
                if (!cancelled) setStatus('error');
            }
        })();

        return () => { cancelled = true; };
    }, [doc.file_url, text]);

    if (image) {
        return <img src={doc.file_url} alt={doc.title} className="w-full max-h-[70vh] object-contain bg-black" />;
    }

    if (pdf) {
        return <PdfPreview url={doc.file_url} title={doc.title} />;
    }

    if (office) {
        return (
            <div className="relative w-full bg-white" style={{ height: '70vh' }}>
                <iframe
                    src={getOfficeViewerUrl(doc.file_url)}
                    title={doc.title}
                    className="absolute inset-0 w-full h-full"
                />
            </div>
        );
    }

    if (text) {
        if (status === 'loading' || status === 'idle') return <Spinner />;
        if (status === 'error') {
            return <Fallback doc={doc} message="No se pudo cargar la vista previa. Usa el botón de descargar para abrir el archivo." />;
        }
        return (
            <pre className="w-full max-h-[70vh] overflow-auto custom-scrollbar bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-xs leading-relaxed p-4 whitespace-pre-wrap break-words">
                {textContent}
            </pre>
        );
    }

    return <Fallback doc={doc} />;
};

export default FilePreview;
