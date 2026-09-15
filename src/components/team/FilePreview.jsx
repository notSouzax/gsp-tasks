import React, { useState, useEffect } from 'react';
import {
    isImageDoc,
    isPdfDoc,
    isTextDoc,
    isOfficeDoc,
    getOfficeViewerUrl,
} from '../../features/team/utils';
import { getCategoryStyle, getCategory } from '../../features/team/constants';

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
 * Para PDF y texto, descarga el archivo como blob y lo renderiza desde el
 * propio origen (blob:), evitando que el navegador muestre el placeholder de
 * descarga que aparece al incrustar recursos cross-origin en un iframe.
 */
const FilePreview = ({ doc }) => {
    const [blobUrl, setBlobUrl] = useState(null);
    const [textContent, setTextContent] = useState(null);
    const [status, setStatus] = useState('idle'); // idle | loading | ready | error

    const image = isImageDoc(doc);
    const pdf = isPdfDoc(doc);
    const text = isTextDoc(doc);
    const office = isOfficeDoc(doc);
    const needsFetch = pdf || text;

    useEffect(() => {
        if (!needsFetch || !doc.file_url) return;

        let cancelled = false;
        let createdUrl = null;
        setStatus('loading');

        (async () => {
            try {
                const res = await fetch(doc.file_url);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);

                if (text) {
                    const content = await res.text();
                    if (cancelled) return;
                    setTextContent(content);
                } else {
                    // PDF: forzamos el tipo para que el navegador lo abra incrustado
                    const buffer = await res.blob();
                    const typed = new Blob([buffer], { type: 'application/pdf' });
                    createdUrl = URL.createObjectURL(typed);
                    if (cancelled) {
                        URL.revokeObjectURL(createdUrl);
                        return;
                    }
                    setBlobUrl(createdUrl);
                }
                setStatus('ready');
            } catch {
                if (!cancelled) setStatus('error');
            }
        })();

        return () => {
            cancelled = true;
            if (createdUrl) URL.revokeObjectURL(createdUrl);
        };
    }, [doc.file_url, needsFetch, text]);

    // Imágenes: directo, el navegador las muestra sin problema
    if (image) {
        return <img src={doc.file_url} alt={doc.title} className="w-full max-h-[70vh] object-contain bg-black" />;
    }

    // Documentos de Office: visor de Office Online (requiere URL pública, que la tenemos)
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

    if (needsFetch) {
        if (status === 'loading' || status === 'idle') return <Spinner />;
        if (status === 'error') {
            return <Fallback doc={doc} message="No se pudo cargar la vista previa. Usa el botón de descargar para abrir el archivo." />;
        }
        if (pdf && blobUrl) {
            return <iframe src={blobUrl} title={doc.title} className="w-full bg-white" style={{ height: '70vh' }} />;
        }
        if (text && textContent !== null) {
            return (
                <pre className="w-full max-h-[70vh] overflow-auto custom-scrollbar bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-xs leading-relaxed p-4 whitespace-pre-wrap break-words">
                    {textContent}
                </pre>
            );
        }
    }

    return <Fallback doc={doc} />;
};

export default FilePreview;
