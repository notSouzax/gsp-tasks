import React, { useState, useEffect } from 'react';
import { Icons } from '../ui/Icons';
import { useSettings } from '../../context/SettingsContext';

const BoardSettingsModal = ({ board, onClose, onSave, onDelete }) => {
    const { settings } = useSettings();
    const [title, setTitle] = useState(board.title);
    const [columnWidth, setColumnWidth] = useState(board.columnWidth || settings.columnWidth || 365);

    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!title.trim()) return;
        onSave(board.id, {
            title: title.trim(),
            columnWidth: parseInt(columnWidth)
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-md bg-[var(--bg-secondary)] rounded-2xl shadow-2xl border border-[var(--border-color)] overflow-hidden animate-scaleIn">
                <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center">
                    <h2 className="text-xl font-bold text-[var(--text-primary)]">Configurar Tablero</h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 rounded-lg transition-colors"
                    >
                        <Icons.X />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-[var(--text-secondary)]">
                            Título del Tablero
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 placeholder-gray-500 transition-all"
                            placeholder="Nombre del tablero"
                            autoFocus
                        />
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-medium text-[var(--text-secondary)]">
                                Ancho de las Columnas (px)
                            </label>
                            <span className="text-xs font-mono bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded-md border border-indigo-500/20">
                                {columnWidth}px
                            </span>
                        </div>
                        <input
                            type="range"
                            min="250"
                            max="600"
                            step="5"
                            value={columnWidth}
                            onChange={(e) => setColumnWidth(e.target.value)}
                            className="w-full h-2 bg-[var(--bg-primary)] rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                        <p className="text-xs text-[var(--text-secondary)]">
                            Define qué tan anchas se verán las columnas solo en este tablero.
                        </p>
                    </div>

                    <div className="pt-4 flex gap-3">
                        {onDelete && (
                            <button
                                type="button"
                                onClick={() => onDelete(board.id)}
                                className="px-4 py-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors font-medium"
                            >
                                Eliminar Tablero
                            </button>
                        )}
                        <div className="flex-1 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)] rounded-xl transition-colors font-medium border border-transparent hover:border-[var(--border-color)]"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={!title.trim()}
                                className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-medium shadow-lg shadow-indigo-500/25 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Guardar Cambios
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default BoardSettingsModal;
