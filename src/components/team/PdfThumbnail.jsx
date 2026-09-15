import React, { useEffect, useRef, useState } from 'react';
import { getPdfjs } from '../../features/team/pdf';

/**
 * Miniatura de un PDF: renderiza la primera página con PDF.js y la muestra
 * ajustada al ancho de la tarjeta (recortada por arriba, estilo "portada").
 * Mientras carga o si falla, muestra un icono de respaldo.
 */
const PdfThumbnail = ({ url, style }) => {
    const canvasRef = useRef(null);
    const [status, setStatus] = useState('loading'); // loading | ready | error

    useEffect(() => {
        let cancelled = false;
        let pdfDoc = null;

        (async () => {
            try {
                const pdfjs = await getPdfjs();
                const res = await fetch(url);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.arrayBuffer();
                if (cancelled) return;

                pdfDoc = await pdfjs.getDocument({ data }).promise;
                const page = await pdfDoc.getPage(1);
                const canvas = canvasRef.current;
                if (!canvas || cancelled) return;

                const dpr = window.devicePixelRatio || 1;
                const width = canvas.parentElement?.clientWidth || 320;
                const base = page.getViewport({ scale: 1 });
                const viewport = page.getViewport({ scale: (width / base.width) * dpr });

                canvas.width = viewport.width;
                canvas.height = viewport.height;
                await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
                if (!cancelled) setStatus('ready');
            } catch {
                if (!cancelled) setStatus('error');
            } finally {
                if (pdfDoc) {
                    try { pdfDoc.destroy(); } catch { /* ignore */ }
                }
            }
        })();

        return () => { cancelled = true; };
    }, [url]);

    return (
        <div className="w-full h-full overflow-hidden bg-white flex items-start justify-center">
            {status !== 'ready' && (
                <div className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br ${style?.gradient || ''}`}>
                    {status === 'loading' ? (
                        <div className="w-7 h-7 border-[3px] border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                    ) : (
                        <span className={`material-symbols-outlined text-[52px] ${style?.text || 'text-[var(--text-muted)]'} opacity-80`}>
                            picture_as_pdf
                        </span>
                    )}
                </div>
            )}
            {/* El canvas se muestra alineado arriba; el contenedor recorta el resto */}
            <canvas ref={canvasRef} style={{ width: '100%', height: 'auto', display: status === 'ready' ? 'block' : 'none' }} />
        </div>
    );
};

export default PdfThumbnail;
