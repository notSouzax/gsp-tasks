import React, { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { DOC_CATEGORIES, getCategoryStyle, MAX_FILE_MB } from '../../../features/team/constants';
import { formatFileSize } from '../../../features/team/utils';
import { Icons } from '../../ui/Icons';

const UploadDocModal = ({ onClose, onUploadFile, onCreateLink, defaultCategory }) => {
    const [mode, setMode] = useState('file'); // 'file' | 'link'
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState(defaultCategory || DOC_CATEGORIES[2].id);
    const [file, setFile] = useState(null);
    const [externalUrl, setExternalUrl] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef(null);

    const pickFile = (f) => {
        if (!f) return;
        if (f.size > MAX_FILE_MB * 1024 * 1024) {
            toast.error(`El archivo supera el límite de ${MAX_FILE_MB} MB. Para vídeos pesados, usa un enlace.`);
            return;
        }
        setFile(f);
        if (!title) setTitle(f.name.replace(/\.[^/.]+$/, ''));
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        pickFile(e.dataTransfer.files?.[0]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim()) return toast.error('Ponle un título');

        if (mode === 'file' && !file) return toast.error('Selecciona un archivo');
        if (mode === 'link') {
            if (!externalUrl.trim()) return toast.error('Introduce un enlace');
            try {
                new URL(externalUrl.trim());
            } catch {
                return toast.error('El enlace no es válido');
            }
        }

        setSubmitting(true);
        try {
            const meta = { title: title.trim(), description: description.trim(), category };
            if (mode === 'file') {
                await onUploadFile(file, meta);
            } else {
                await onCreateLink({ ...meta, external_url: externalUrl.trim() });
            }
            toast.success('Documento añadido');
            onClose();
        } catch (err) {
            toast.error(err?.message || 'No se pudo guardar el documento');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
            <div
                className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Cabecera */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
                    <h2 className="text-lg font-bold text-[var(--text-primary)]">Añadir documentación</h2>
                    <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors">
                        <Icons.X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
                    {/* Selector de modo */}
                    <div className="grid grid-cols-2 gap-2 p-1 bg-[var(--bg-tertiary)] rounded-xl">
                        {[
                            { id: 'file', label: 'Subir archivo', icon: 'upload_file' },
                            { id: 'link', label: 'Enlace / vídeo', icon: 'link' },
                        ].map((m) => (
                            <button
                                key={m.id}
                                type="button"
                                onClick={() => setMode(m.id)}
                                className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                                    mode === m.id
                                        ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 shadow-sm'
                                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                            >
                                <span className="material-symbols-outlined text-[18px]">{m.icon}</span>
                                {m.label}
                            </button>
                        ))}
                    </div>

                    {/* Zona de archivo o enlace */}
                    {mode === 'file' ? (
                        <div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                onChange={(e) => pickFile(e.target.files?.[0])}
                            />
                            {file ? (
                                <div className="flex items-center gap-3 p-4 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-xl">
                                    <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                                        <span className="material-symbols-outlined text-[22px] text-indigo-500">draft</span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{file.name}</p>
                                        <p className="text-xs text-[var(--text-muted)]">{formatFileSize(file.size)}</p>
                                    </div>
                                    <button type="button" onClick={() => setFile(null)} className="text-[var(--text-muted)] hover:text-red-500">
                                        <Icons.X size={18} />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                    onDragLeave={() => setDragOver(false)}
                                    onDrop={handleDrop}
                                    className={`w-full flex flex-col items-center justify-center gap-2 py-8 border-2 border-dashed rounded-xl transition-colors ${
                                        dragOver ? 'border-indigo-500 bg-indigo-500/5' : 'border-[var(--border-default)] hover:border-indigo-400'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-[32px] text-indigo-500">cloud_upload</span>
                                    <span className="text-sm text-[var(--text-secondary)]">Arrastra un archivo o haz clic para elegir</span>
                                    <span className="text-xs text-[var(--text-muted)]">Máximo {MAX_FILE_MB} MB · PDF, imágenes, vídeo, Office...</span>
                                </button>
                            )}
                        </div>
                    ) : (
                        <div>
                            <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Enlace</label>
                            <input
                                type="url"
                                value={externalUrl}
                                onChange={(e) => setExternalUrl(e.target.value)}
                                placeholder="https://youtube.com/... o cualquier enlace"
                                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 outline-none"
                            />
                            <p className="text-xs text-[var(--text-muted)] mt-1.5">
                                Ideal para videotutoriales pesados (YouTube, Vimeo, Loom) o documentos en Drive.
                            </p>
                        </div>
                    )}

                    {/* Título */}
                    <div>
                        <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Título</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Ej. Cómo crear una tarea nueva"
                            className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 outline-none"
                        />
                    </div>

                    {/* Descripción */}
                    <div>
                        <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                            Descripción <span className="normal-case font-normal">(opcional)</span>
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            placeholder="Breve resumen de qué explica este documento..."
                            className="w-full resize-none bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 outline-none custom-scrollbar"
                        />
                    </div>

                    {/* Categoría */}
                    <div>
                        <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Categoría</label>
                        <div className="grid grid-cols-2 gap-2">
                            {DOC_CATEGORIES.map((cat) => {
                                const style = getCategoryStyle(cat.color);
                                const active = category === cat.id;
                                return (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => setCategory(cat.id)}
                                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-all ${
                                            active
                                                ? style.chipActive
                                                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] ring-1 ring-transparent'
                                        }`}
                                    >
                                        <span className={`material-symbols-outlined text-[18px] ${active ? '' : style.text}`}>{cat.icon}</span>
                                        <span className="truncate">{cat.shortLabel}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </form>

                {/* Pie */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--border-subtle)]">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-indigo-500/20"
                    >
                        {submitting ? (
                            <>
                                <Icons.Loader size={16} className="animate-spin" />
                                Guardando...
                            </>
                        ) : (
                            <>
                                <Icons.Plus size={16} />
                                Añadir
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UploadDocModal;
