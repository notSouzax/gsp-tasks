import React, { useState } from 'react';


const CreateTaskModal = ({ columnTitle, onClose, onSave }) => {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [initialComment, setInitialComment] = useState("");
    const handleSubmit = (e) => { e.preventDefault(); if (!title.trim()) return; onSave({ title, description, initialComment }); onClose(); };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl p-6" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-white mb-4">Nueva Tarea en <span className="text-indigo-400">{columnTitle}</span></h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4"><label className="block text-xs font-medium text-gray-400 mb-1">Título</label><input autoFocus type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="¿Qué hay que hacer?" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all" /></div>
                    <div className="mb-4"><label className="block text-xs font-medium text-gray-400 mb-1">Descripción</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalles adicionales..." className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all h-24 resize-none" /></div>
                    <div className="mb-6"><label className="block text-xs font-medium text-gray-400 mb-1">Comentario Inicial (Opcional)</label><input type="text" value={initialComment} onChange={(e) => setInitialComment(e.target.value)} placeholder="Añadir una nota rápida..." className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all" /></div>
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors">Cancelar</button>
                        <button type="submit" disabled={!title.trim()} className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed">Crear Tarea</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateTaskModal;
