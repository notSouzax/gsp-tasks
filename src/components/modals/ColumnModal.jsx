import React, { useState, useEffect, useRef } from 'react';
import { Icons } from '../ui/Icons';
import { Toggle } from '../ui/Toggle';
import { AVAILABLE_COLORS, COLOR_MAP } from '../../utils/helpers';

const ColumnModal = ({ column, isCreating, onClose, onUpdate, onDelete }) => {
    const [title, setTitle] = useState(column?.title || "");
    const [color, setColor] = useState(column?.color || "indigo");
    const [cardConfig, setCardConfig] = useState(column?.cardConfig || {
        enableMove: true, enableOrder: false, enableTextOnly: false,
        orderOptions: [
            { id: 'start', label: 'Inicio', action: 'move-start' },
            { id: 'end', label: 'Fin', action: 'move-end' },
            { id: 'review', label: 'En Revisión', action: 'none' },
            { id: 'paused', label: 'Pausado', action: 'none' },
            { id: 'urgent', label: 'Urgente', action: 'none' }
        ]
    });
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const colorInputRef = useRef(null);

    useEffect(() => {
        if (!cardConfig.orderOptions) {
            setCardConfig(prev => ({
                ...prev, orderOptions: [
                    { id: 'start', label: 'Inicio', action: 'move-start' },
                    { id: 'end', label: 'Fin', action: 'move-end' },
                    { id: 'review', label: 'En Revisión', action: 'none' },
                    { id: 'paused', label: 'Pausado', action: 'none' },
                    { id: 'urgent', label: 'Urgente', action: 'none' }
                ]
            }));
        }
    }, []);

    const handleSave = (e) => { e.preventDefault(); if (!title.trim()) return; const data = { title, color, cardConfig }; if (isCreating) { onUpdate(data); } else { onUpdate(column.id, data); } onClose(); };
    const addOrderOption = () => { const newOption = { id: Date.now().toString(), label: 'Nueva Opción', action: 'none' }; setCardConfig({ ...cardConfig, orderOptions: [...(cardConfig.orderOptions || []), newOption] }); };
    const updateOrderOption = (id, field, value) => { const newOptions = cardConfig.orderOptions.map(opt => opt.id === id ? { ...opt, [field]: value } : opt); setCardConfig({ ...cardConfig, orderOptions: newOptions }); };
    const removeOrderOption = (id) => { const newOptions = cardConfig.orderOptions.filter(opt => opt.id !== id); setCardConfig({ ...cardConfig, orderOptions: newOptions }); };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl p-6 max-h-[90vh] overflow-y-auto custom-scrollbar" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-white mb-4">{isCreating ? "Nueva Columna" : "Editar Columna"}</h2>
                <form onSubmit={handleSave}>
                    <div className="mb-4"><label className="block text-xs font-medium text-gray-400 mb-1">Nombre</label><input autoFocus type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all" /></div>
                    <div className="mb-6">
                        <label className="block text-xs font-medium text-gray-400 mb-2">Color</label>
                        <div className="flex gap-3 items-start">
                            <div className="grid grid-cols-10 gap-2">
                                {AVAILABLE_COLORS.map(c => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setColor(c)}
                                        style={{ backgroundColor: COLOR_MAP[c] }}
                                        className={`w-6 h-6 rounded-full ring-2 ring-offset-2 ring-offset-slate-900 ${color === c ? 'ring-white' : 'ring-transparent'} hover:scale-110 transition-transform`}
                                    />
                                ))}
                            </div>
                            <div className="relative pt-0.5">
                                <button
                                    type="button"
                                    onClick={() => colorInputRef.current?.click()}
                                    className="w-6 h-6 rounded-full bg-slate-700 ring-2 ring-offset-2 ring-offset-slate-900 flex items-center justify-center hover:scale-110 transition-transform"
                                    title="Color personalizado"
                                >
                                    <Icons.Plus />
                                </button>
                                <input
                                    ref={colorInputRef}
                                    type="color"
                                    value={color}
                                    onChange={(e) => setColor(e.target.value)}
                                    className="absolute opacity-0 w-0 h-0"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="mb-6 space-y-2">
                        <label className="block text-xs font-medium text-gray-400 mb-2">Configuración de Tarjetas</label>
                        <Toggle label="Solo Texto (Vista Limpia)" checked={cardConfig.enableTextOnly} onChange={(val) => setCardConfig({ ...cardConfig, enableTextOnly: val })} />
                        {!cardConfig.enableTextOnly && (<><Toggle label="Función para Mover Entre Columnas" checked={cardConfig.enableMove} onChange={(val) => setCardConfig({ ...cardConfig, enableMove: val })} /><Toggle label="Función de Orden" checked={cardConfig.enableOrder} onChange={(val) => setCardConfig({ ...cardConfig, enableOrder: val })} />
                            {cardConfig.enableOrder && (<div className="mt-3 pl-2 border-l-2 border-white/10 space-y-3"><div className="flex justify-between items-center"><label className="text-xs font-medium text-gray-400">Opciones del Desplegable</label><button type="button" onClick={addOrderOption} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"><Icons.Plus /> Añadir</button></div><div className="space-y-2">{(cardConfig.orderOptions || []).map((opt, idx) => (<div key={opt.id || idx} className="flex gap-2 items-center bg-slate-800/50 p-2 rounded border border-white/5"><input type="text" value={opt.label} onChange={(e) => updateOrderOption(opt.id, 'label', e.target.value)} className="flex-1 bg-transparent text-xs text-white outline-none border-b border-transparent focus:border-indigo-500/50 px-1" placeholder="Nombre..." /><select value={opt.action} onChange={(e) => updateOrderOption(opt.id, 'action', e.target.value)} className="bg-slate-900 text-[10px] text-gray-300 border border-white/10 rounded px-1 py-0.5 outline-none"><option value="none">Solo Etiqueta</option><option value="move-start">Mover al Inicio</option><option value="move-end">Mover al Final</option></select><button type="button" onClick={() => removeOrderOption(opt.id)} className="text-gray-500 hover:text-red-400 p-1"><Icons.X /></button></div>))}</div></div>)}</>)}
                    </div>
                    <div className="flex justify-end gap-2 pt-4 border-t border-white/5">
                        {!isCreating && (<button type="button" onClick={() => setShowDeleteConfirm(true)} className="px-4 py-2 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors mr-auto">Eliminar</button>)}
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors">Cancelar</button>
                        <button type="submit" disabled={!title.trim()} className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50">{isCreating ? "Crear Columna" : "Guardar Cambios"}</button>
                    </div>
                </form>
                {showDeleteConfirm && (<div className="absolute inset-0 bg-slate-900/95 flex items-center justify-center p-6 rounded-2xl z-10"><div className="text-center"><div className="w-12 h-12 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><Icons.Trash2 /></div><h3 className="text-lg font-bold text-white mb-2">¿Eliminar esta columna?</h3><p className="text-sm text-gray-400 mb-6">Todas las tareas en esta columna también serán eliminadas permanentemente.</p><div className="flex justify-center gap-3"><button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors">Cancelar</button><button onClick={() => onDelete(column.id)} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg shadow-lg shadow-red-500/20 transition-colors">Sí, Eliminar</button></div></div></div>)}
            </div>
        </div>
    );
};

export default ColumnModal;
