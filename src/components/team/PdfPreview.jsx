import React, { useEffect, useRef, useState } from 'react';
import { getPdfjs } from '../../features/team/pdf';

/**
 * Previsualiza un PDF renderizándolo con PDF.js sobre <canvas>.
 * No usa el visor de PDF del navegador, por lo que funciona igual aunque el
 * usuario tenga Chrome configurado para "descargar los PDF" en vez de abrirlos.
 */
const PdfPreview = ({ url, title }) => {
    const containerRef = useRef(null);
    const [status, setStatus] = useState('loading'); // loading | ready | error

    useEffect(() => {
        let cancelled = false;
        let pdfDoc = null;
        setStatus('loading');

        (async () => {
            try {
                const pdfjs = await getPdfjs();

                const res = await fetch(url);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.arrayBuffer();
                if (cancelled) return;

                pdfDoc = await pdfjs.getDocument({ data }).promise;
                if (cancelled) return;

                const container = containerRef.current;
                if (!container) return;
                container.innerHTML = '';

                const dpr = window.devicePixelRatio || 1;
                const width = container.clientWidth || 800;

                for (let i = 1; i <= pdfDoc.numPages; i++) {
                    if (cancelled) return;
                    const page = await pdfDoc.getPage(i);
                    const base = page.getViewport({ scale: 1 });
                    const scale = width / base.width;
                    const viewport = page.getViewport({ scale: scale * dpr });

                    const canvas = document.createElement('canvas');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    canvas.style.width = '100%';
                    canvas.style.height = 'auto';
                    canvas.style.display = 'block';
                    canvas.style.marginBottom = '10px';
                    canvas.style.borderRadius = '4px';
                    canvas.style.boxShadow = '0 1px 6px rgba(0,0,0,0.25)';

                    container.appendChild(canvas);
                    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
                }

                if (!cancelled) setStatus('ready');
            } catch {
                if (!cancelled) setStatus('error');
            }
        })();

        return () => {
            cancelled = true;
            if (pdfDoc) {
                try { pdfDoc.destroy(); } catch { /* ignore */ }
            }
        };
    }, [url]);

    return (
        <div className="relative w-full bg-[var(--bg-tertiary)]">
            {status === 'loading' && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 py-20 text-[var(--text-muted)] bg-[var(--bg-tertiary)]">
                    <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                    <span className="text-sm">Cargando vista previa...</span>
                </div>
            )}
            {status === 'error' && (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-[var(--text-secondary)]">
                    <span className="material-symbols-outlined text-[40px] text-[var(--text-muted)]">error</span>
                    <p className="text-sm max-w-sm">No se pudo cargar la vista previa. Usa el botón de descargar para abrir el archivo.</p>
                </div>
            )}
            <div
                ref={containerRef}
                className="w-full max-h-[70vh] overflow-y-auto custom-scrollbar p-3"
                style={{ minHeight: status === 'error' ? 0 : 240 }}
                aria-label={title}
            />
        </div>
    );
};

export default PdfPreview;
