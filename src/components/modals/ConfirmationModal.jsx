import React, { useEffect } from 'react';
import { Icons } from '../ui/Icons';

const ConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    isDanger = false,
    isLoading = false
}) => {
    // ESC key handler
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape' && isOpen && !isLoading) onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose, isLoading]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-[var(--overlay-bg)] backdrop-blur-sm flex items-center justify-center z-[100] p-4"
            onClick={isLoading ? undefined : onClose}
        >
            <div
                className="bg-[var(--bg-secondary)] dark:bg-[#0f172a] border border-[var(--border-default)] dark:border-slate-700/50 p-8 rounded-2xl max-w-sm w-full shadow-[var(--shadow-xl)] animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                <div className="text-center">
                    {/* Icon */}
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5 border ${isDanger
                        ? 'bg-red-500/10 text-red-500 border-red-500/20 shadow-xl shadow-red-500/10'
                        : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 shadow-xl shadow-indigo-500/10'
                        }`}>
                        {isDanger ? <Icons.Trash2 size={24} /> : <Icons.Help size={24} />}
                    </div>

                    {/* Content */}
                    <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2 tracking-tight">{title}</h3>
                    <p className="text-sm text-[var(--text-secondary)] mb-8 leading-relaxed max-w-[280px] mx-auto">
                        {message}
                    </p>

                    {/* Actions */}
                    <div className="flex justify-center gap-3">
                        <button
                            onClick={onClose}
                            disabled={isLoading}
                            className="px-5 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-stone-200 dark:bg-slate-800 hover:bg-stone-300 dark:hover:bg-slate-700 rounded-xl transition-colors min-w-[100px] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={() => { onConfirm?.(); }}
                            disabled={isLoading}
                            className={`px-5 py-2.5 text-sm font-bold text-white rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 min-w-[100px] disabled:opacity-50 disabled:cursor-not-allowed ${isDanger
                                ? 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 shadow-red-500/20'
                                : 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 shadow-indigo-500/20'
                                }`}
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    Procesando...
                                </span>
                            ) : (
                                confirmText
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
