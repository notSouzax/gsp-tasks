import React from 'react';
import { Icons } from '../ui/Icons';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Eliminar", cancelText = "Cancelar", isDanger = true }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-50 p-4 transition-all duration-300" onClick={onClose}>
            <div
                className="bg-[#0f172a] border border-slate-700/50 p-8 rounded-2xl max-w-sm w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200 transform scale-100"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="text-center">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5 border ${isDanger ? 'bg-red-500/10 text-red-500 border-red-500/20 shadow-xl shadow-red-500/10' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 shadow-xl shadow-indigo-500/10'}`}>
                        {isDanger ? <Icons.Trash2 size={24} /> : <Icons.HelpCircle size={24} />}
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2 tracking-tight">{title}</h3>
                    <p className="text-sm text-slate-400 mb-8 leading-relaxed max-w-[260px] mx-auto">{message}</p>
                    <div className="flex justify-center gap-3">
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 text-sm font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors min-w-[100px]"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={() => { onConfirm(); onClose(); }}
                            className={`px-5 py-2.5 text-sm font-bold text-white rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 min-w-[100px] ${isDanger
                                    ? 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 shadow-red-500/20'
                                    : 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 shadow-indigo-500/20'
                                }`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
