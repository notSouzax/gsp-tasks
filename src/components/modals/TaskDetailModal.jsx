import React, { useState, useEffect } from 'react';
import { Icons } from '../ui/Icons';
import { formatDate } from '../../utils/helpers';
import { Linkify } from '../../utils/helpers';


const TaskDetailModal = ({ task, columns, onClose, onUpdate, onDelete }) => {
    const [commentText, setCommentText] = useState("");
    const [isEditingDesc, setIsEditingDesc] = useState(false);
    const [tempDesc, setTempDesc] = useState(task.description || "");
    useEffect(() => { setTempDesc(task.description || ""); }, [task.description]);
    const handleStatusChange = (newStatus) => { onUpdate({ ...task, status: newStatus }); };
    const handleAddComment = (e) => { e.preventDefault(); if (!commentText.trim()) return; const newComment = { id: Date.now(), text: commentText, createdAt: Date.now() }; const updatedComments = task.comments ? [...task.comments, newComment] : [newComment]; onUpdate({ ...task, comments: updatedComments }); setCommentText(''); };


    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-white/5 flex justify-between items-start">
                    <div className="flex-1 mr-4"><h2 className="text-2xl font-bold text-white mb-2">{task.title}</h2><div className="flex items-center gap-3"><select value={task.status} onChange={(e) => handleStatusChange(e.target.value)} className="bg-slate-800 text-xs font-medium text-indigo-300 border border-indigo-500/30 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-500">{columns.map(c => <option key={c.id} value={c.title}>{c.title}</option>)}</select><span className="text-gray-500 text-xs flex items-center"><Icons.Calendar /><span className="ml-1">Creado: {formatDate(task.createdAt, true)}</span></span></div></div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors"><Icons.X /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-2"><h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Descripción</h3>{!isEditingDesc ? (<button onClick={() => setIsEditingDesc(true)} className="text-gray-500 hover:text-indigo-400 transition-colors p-1" title="Editar descripción"><Icons.Edit /></button>) : (<div className="flex gap-2"><button onClick={() => { onUpdate({ ...task, description: tempDesc }); setIsEditingDesc(false); }} className="text-green-400 hover:text-green-300 transition-colors p-1" title="Guardar"><Icons.Check /></button><button onClick={() => { setTempDesc(task.description || ''); setIsEditingDesc(false); }} className="text-red-400 hover:text-red-300 transition-colors p-1" title="Cancelar"><Icons.X /></button></div>)}</div>
                        {isEditingDesc ? (<textarea value={tempDesc} onChange={(e) => setTempDesc(e.target.value)} placeholder="Añade una descripción..." className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all h-32 resize-none" autoFocus />) : (<div className="bg-slate-950/50 p-4 rounded-xl border border-white/5 text-gray-300 text-base leading-relaxed min-h-[60px] whitespace-pre-wrap"><Linkify text={task.description || "Sin descripción."} /></div>)}
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-gray-400 mb-4 uppercase tracking-wider flex items-center gap-2">Comentarios<span className="bg-white/10 text-xs px-2 py-0.5 rounded-full">{task.comments?.length || 0}</span></h3>
                        <div className="space-y-4 mb-6">{(!task.comments || task.comments.length === 0) && (<p className="text-gray-600 text-sm italic">No hay comentarios aún.</p>)}{task.comments?.map(comment => (<div key={comment.id} className="flex gap-3 group"><div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0 text-xs font-bold">YO</div><div className="flex-1"><div className="flex items-baseline gap-2 mb-1"><span className="text-indigo-300 text-sm font-medium">Usuario</span><span className="text-gray-600 text-xs">{formatDate(comment.createdAt, true)}</span></div><div className="text-gray-300 text-sm bg-white/5 p-3 rounded-r-xl rounded-bl-xl border border-white/5">{comment.text}</div></div></div>))}</div>
                        <form onSubmit={handleAddComment} className="relative"><input type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Escribe un comentario..." className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-4 pr-12 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all" /><button type="submit" disabled={!commentText.trim()} className="absolute right-2 top-2 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors"><Icons.Send /></button></form>
                    </div>
                </div>
                <div className="p-4 border-t border-white/5 bg-slate-950/30 flex justify-end"><button onClick={() => { onDelete(task.id); onClose(); }} className="flex items-center gap-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 px-4 py-2 rounded-lg transition-colors text-sm font-medium"><Icons.Trash2 /> Eliminar Tarea</button></div>
            </div>
        </div>
    );
};

export default TaskDetailModal;
