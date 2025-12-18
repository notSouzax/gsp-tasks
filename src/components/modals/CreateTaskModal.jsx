import React, { useState } from 'react';
import { learnConfirmation, learnCorrection } from '../../utils/aiService';
import { Icons } from '../ui/Icons';

const CreateTaskModal = ({ columnTitle, initialData, onClose, onSave, boards = [], isGlobal = false, targetColumn }) => {
    // Global Mode State
    const [selectedBoardId, setSelectedBoardId] = useState(boards.length > 0 ? boards[0].id : null);
    // If global, defaulting to first column of first board, else null
    const [selectedColumnId, setSelectedColumnId] = useState(null);

    // Initialize/Update selected column when board changes
    React.useEffect(() => {
        if (isGlobal && selectedBoardId) {
            const board = boards.find(b => b.id == selectedBoardId); // Loose equality for number/string id
            if (board && board.columns.length > 0) {
                setSelectedColumnId(board.columns[0].id);
            } else {
                setSelectedColumnId(null);
            }
        }
    }, [selectedBoardId, isGlobal, boards]);

    const [title, setTitle] = useState(initialData?.title || "");
    const [description, setDescription] = useState(initialData?.description || "");
    const [initialComment, setInitialComment] = useState(initialData?.initialComment || "");

    // Checklist State
    const [showChecklist, setShowChecklist] = useState(false);
    const [checklistItems, setChecklistItems] = useState([]);
    const [newCheckItemText, setNewCheckItemText] = useState("");

    const handleAddCheckItem = () => {
        if (!newCheckItemText.trim()) return;
        setChecklistItems([...checklistItems, { id: Date.now(), text: newCheckItemText, completed: false }]);
        setNewCheckItemText("");
    };

    const handleDeleteCheckItem = (id) => {
        setChecklistItems(checklistItems.filter(i => i.id !== id));
    };

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
            checklist: checklistItems,
            // Extra fields for global mode
            targetBoardId: selectedBoardId,
            targetColumnId: selectedColumnId
        });
        onClose();
    };

    // Derived values for UI
    const activeBoardForSelect = boards.find(b => b.id == selectedBoardId);
    const columnsForSelect = activeBoardForSelect ? activeBoardForSelect.columns : [];

    // Derive Active Config for Text Only Mode
    let activeConfig = {};
    if (isGlobal) {
        const board = boards.find(b => b.id == selectedBoardId);
        const col = board?.columns?.find(c => c.id == selectedColumnId);
        activeConfig = col?.cardConfig || col?.card_config || {};
    } else {
        activeConfig = targetColumn?.cardConfig || targetColumn?.card_config || {};
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-50 p-4 transition-all duration-300" onClick={onClose}>
            <div
                className="bg-[#0f172a] border border-slate-700/50 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden transform transition-all scale-100"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-slate-900/50 p-6 pb-4 border-b border-white/5">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
                            {isGlobal ? "Nueva Tarea Global" : "Nueva Tarea"}
                        </span>
                        {!isGlobal && <span className="text-slate-500 text-sm font-normal">en {columnTitle}</span>}
                    </h2>
                </div>

                <div className="p-6 pt-4">
                    <form onSubmit={handleSubmit}>
                        {isGlobal && (
                            <div className="grid grid-cols-2 gap-4 mb-5">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tablero</label>
                                    <div className="relative inline-block w-full">
                                        <select
                                            value={selectedBoardId || ""}
                                            onChange={(e) => setSelectedBoardId(e.target.value)}
                                            className="w-full bg-[#1e293b] hover:bg-[#253045] border border-slate-700 rounded-lg pl-3 pr-10 py-2.5 text-slate-200 text-sm focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none appearance-none transition-all cursor-pointer"
                                        >
                                            {boards.map(b => (
                                                <option key={b.id} value={b.id}>{b.title}</option>
                                            ))}
                                        </select>
                                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                            <Icons.ChevronDown className="text-slate-400" size={14} />
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Columna</label>
                                    <div className="relative inline-block w-full">
                                        <select
                                            value={selectedColumnId || ""}
                                            onChange={(e) => setSelectedColumnId(e.target.value)}
                                            className="w-full bg-[#1e293b] hover:bg-[#253045] border border-slate-700 rounded-lg pl-3 pr-10 py-2.5 text-slate-200 text-sm focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none appearance-none transition-all cursor-pointer disabled:opacity-50"
                                            disabled={!selectedBoardId}
                                        >
                                            {columnsForSelect.map(c => (
                                                <option key={c.id} value={c.id}>{c.title}</option>
                                            ))}
                                        </select>
                                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                            <Icons.ChevronDown className="text-slate-400" size={14} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="mb-5">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Título</label>
                            <input
                                autoFocus
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="¿Qué hay que hacer?"
                                className="w-full bg-[#1e293b] border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all font-medium"
                            />
                        </div>

                        <div className="mb-5">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Descripción</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Detalles adicionales..."
                                className="w-full bg-[#1e293b] border border-slate-700 rounded-lg px-4 py-3 text-slate-300 placeholder-slate-600 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all h-24 resize-none custom-scrollbar"
                            />
                        </div>

                        {!activeConfig.enableTextOnly && (
                            <>
                                <div className="mb-5">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Comentario Inicial <span className="text-slate-600 normal-case font-normal">(Opcional)</span></label>
                                    <input
                                        type="text"
                                        value={initialComment}
                                        onChange={(e) => setInitialComment(e.target.value)}
                                        placeholder="Añadir una nota rápida..."
                                        className="w-full bg-[#1e293b] border border-slate-700 rounded-lg px-4 py-2.5 text-slate-300 placeholder-slate-600 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                                    />
                                </div>

                                {/* Checklist Section */}
                                <div className="mb-6">
                                    {!showChecklist && checklistItems.length === 0 ? (
                                        <button
                                            type="button"
                                            onClick={() => setShowChecklist(true)}
                                            className="text-xs flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 transition-colors font-medium group"
                                        >
                                            <div className="p-1 rounded bg-indigo-500/10 group-hover:bg-indigo-500/20"><Icons.CheckSquare size={14} /></div>
                                            Añadir Checklist
                                        </button>
                                    ) : (
                                        <div className="bg-[#1e293b]/50 p-4 rounded-xl border border-dashed border-slate-700/50">
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex justify-between items-center">
                                                Checklist
                                                {checklistItems.length > 0 && <span className="bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full text-[10px] font-bold">{checklistItems.length}</span>}
                                            </label>
                                            <div className="space-y-2 mb-3">
                                                {checklistItems.map(item => (
                                                    <div key={item.id} className="flex items-center gap-3 text-sm text-slate-300 bg-[#0f172a] p-2 rounded-lg border border-slate-800 group">
                                                        <Icons.Square className="text-slate-600 w-4 h-4 flex-shrink-0" />
                                                        <span className="flex-1 truncate">{item.text}</span>
                                                        <button type="button" onClick={() => handleDeleteCheckItem(item.id)} className="text-slate-600 hover:text-red-400 transition-colors"><Icons.Trash2 size={14} /></button>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={newCheckItemText}
                                                    onChange={(e) => setNewCheckItemText(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            handleAddCheckItem();
                                                        }
                                                    }}
                                                    placeholder="Nuevo elemento..."
                                                    className="flex-1 bg-[#0f172a] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none placeholder-slate-600 transition-colors"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleAddCheckItem}
                                                    disabled={!newCheckItemText.trim()}
                                                    className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:hover:bg-indigo-600"
                                                >
                                                    <Icons.Plus size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        <div className="flex justify-end gap-3 pt-2 border-t border-white/5">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-5 py-2.5 text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={!title.trim()}
                                className="px-6 py-2.5 text-sm font-bold bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                            >
                                Crear Tarea
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CreateTaskModal;
