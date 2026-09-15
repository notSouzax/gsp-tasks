/**
 * Cargador compartido de PDF.js.
 *
 * El worker se empaqueta con Vite mediante el sufijo `?worker`, que genera un
 * archivo .js servido con el MIME correcto. Esto evita que navegadores estrictos
 * (Chrome) rechacen el worker cuando el host sirve el .mjs con un MIME que no
 * consideran ejecutable como módulo (Firefox sí lo acepta, de ahí la diferencia).
 *
 * Se inicializa una sola vez y se reutiliza el mismo worker para todos los
 * documentos (visor a pantalla completa y miniaturas de las tarjetas).
 */
let pdfjsPromise = null;

export function getPdfjs() {
    if (!pdfjsPromise) {
        pdfjsPromise = (async () => {
            const pdfjs = await import('pdfjs-dist');
            const { default: PdfWorker } = await import('pdfjs-dist/build/pdf.worker.min.mjs?worker');
            pdfjs.GlobalWorkerOptions.workerPort = new PdfWorker();
            return pdfjs;
        })();
    }
    return pdfjsPromise;
}
