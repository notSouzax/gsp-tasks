import React, { useState } from 'react';
import { learnConfirmation, learnCorrection } from '../../utils/aiService';

const CreateTaskModal = ({ columnTitle, initialData, onClose, onSave, boards = [], isGlobal = false }) => {
    // Global Mode State
    const [selectedBoardId, setSelectedBoardId] = useState(boards.length > 0 ? boards[0].id : null);
    // If global, defaulting to first column of first board, else null
    const [selectedColumnId, setSelectedColumnId] = useState(null);

    // Initialize/Update selected column when board changes
    React.useEffect(() => {
        if (isGlobal && selectedBoardId) {
            const board = boards.find(b => b.id == selectedBoardId); // Loose equality for number/string id
            if (board && board.columns.length > 0) {
                // If the previously selected column is valid for this board, keep it? No, safer to reset to first.
                // Unless we want sophisticated logic, but "first column" is specific enough for a default.
                setSelectedColumnId(board.columns[0].id);
            } else {
                setSelectedColumnId(null);
            }
        }
    }, [selectedBoardId, isGlobal, boards]);

    const [title, setTitle] = useState(initialData?.title || "");
    const [description, setDescription] = useState(initialData?.description || "");
    const [initialComment, setInitialComment] = useState(initialData?.initialComment || "");

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!title.trim()) return;

        // Validation for Global Mode
        if (isGlobal && (!selectedBoardId || !selectedColumnId)) {
            alert("Por favor selecciona un tablero y una columna.");
            return;
        }

        // AI LEARNING LOGIC... (Preserved)
        if (initialData && (initialData.title || initialData.initialComment)) {
            const originalTitle = initialData.title || "";
            const originalComment = initialData.initialComment || "";
            const cleanTitle = title.trim();
            const cleanComment = initialComment.trim();
            if (cleanTitle === originalTitle.trim() && cleanComment === originalComment.trim()) {
                learnConfirmation(cleanTitle, cleanComment);
            } else {
                learnCorrection(originalTitle, title, originalComment, initialComment);
            }
        }

        onSave({
            title,
            description,
            initialComment,
            // Extra fields for global mode
            targetBoardId: selectedBoardId,
            targetColumnId: selectedColumnId
        });
        onClose();
    };

    // Derived values for UI
    const activeBoardForSelect = boards.find(b => b.id == selectedBoardId);
    const columnsForSelect = activeBoardForSelect ? activeBoardForSelect.columns : [];

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl p-6" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-white mb-4">
                    {isGlobal ? "Nueva Tarea Global" : <>Nueva Tarea en <span className="text-indigo-400">{columnTitle}</span></>}
                </h2>
                <form onSubmit={handleSubmit}>
                    {isGlobal && (
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Tablero</label>
                                <select
                                    value={selectedBoardId || ""}
                                    onChange={(e) => setSelectedBoardId(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                >
                                    {boards.map(b => (
                                        <option key={b.id} value={b.id}>{b.title}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Columna</label>
                                <select
                                    value={selectedColumnId || ""}
                                    onChange={(e) => setSelectedColumnId(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    disabled={!selectedBoardId}
                                >
                                    {columnsForSelect.map(c => (
                                        <option key={c.id} value={c.id}>{c.title}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
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
