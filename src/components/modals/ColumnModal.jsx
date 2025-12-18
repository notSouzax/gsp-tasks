import React, { useState, useRef } from 'react';
import { Icons } from '../ui/Icons';
import { Toggle } from '../ui/Toggle';
import { AVAILABLE_COLORS, COLOR_MAP, TIME_UNITS, calculateNextNotification } from '../../utils/helpers';

const ColumnModal = ({ column, isCreating, onClose, onUpdate, onDelete }) => {
    const [title, setTitle] = useState(column?.title || "");
    const [color, setColor] = useState(column?.color || "indigo");
    const [cardConfig, setCardConfig] = useState(() => {
        const initialConfig = column?.cardConfig ? { ...column.cardConfig } : { enableMove: false, enableOrder: false, enableTextOnly: false };
        if (!initialConfig.orderOptions) {
            initialConfig.orderOptions = [
                { id: 'start', label: 'Inicio', action: 'move-start' },
                { id: 'end', label: 'Fin', action: 'move-end' },
                { id: 'review', label: 'En Revisión', action: 'none' },
                { id: 'paused', label: 'Pausado', action: 'none' },
                { id: 'urgent', label: 'Urgente', action: 'none' }
            ];
        }
        return initialConfig;
    });
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Reminder settings state
    const [defaultReminderEnabled, setDefaultReminderEnabled] = useState(column?.default_reminder_enabled ?? false);
    const [defaultReminderValue, setDefaultReminderValue] = useState(column?.default_reminder_value ?? "");
    const [defaultReminderUnit, setDefaultReminderUnit] = useState(column?.default_reminder_unit ?? 'minutes');
    const [allowCardOverrides, setAllowCardOverrides] = useState(column?.allow_card_overrides ?? false);
    const [forceRecalculate, setForceRecalculate] = useState(false);

    const colorInputRef = useRef(null);

    // useEffect for default options removed (moved to initial state)

    const handleSave = (e) => {
        e.preventDefault();
        if (!title.trim()) return;

        const data = {
            title,
            color,
            cardConfig,
            // Reminder settings
            default_reminder_enabled: defaultReminderEnabled,
            default_reminder_value: defaultReminderValue === "" ? null : parseInt(defaultReminderValue),
            default_reminder_unit: defaultReminderUnit,
            allow_card_overrides: allowCardOverrides
        };

        // If not creating, check if we need to update existing cards
        if (!isCreating && column.cards) {
            // Check if reminder settings have changed
            const hasReminderSettingsChanged =
                defaultReminderEnabled !== column.default_reminder_enabled ||
                (defaultReminderEnabled && (
                    parseInt(defaultReminderValue) !== column.default_reminder_value ||
                    defaultReminderUnit !== column.default_reminder_unit
                ));

            // Only update cards if reminder settings changed or reset requested
            if (hasReminderSettingsChanged || forceRecalculate) {
                const updatedCards = column.cards.map(card => {
                    // If card has manual override enabled, don't touch it
                    if (card.reminder_enabled) return card;

                    // If column default is enabled, calculate new notification time
                    if (defaultReminderEnabled && defaultReminderValue) {
                        return {
                            ...card,
                            next_notification_at: calculateNextNotification(defaultReminderValue, defaultReminderUnit)
                        };
                    }

                    // If column default is disabled, clear notification
                    return {
                        ...card,
                        next_notification_at: null
                    };
                });
                data.cards = updatedCards;
            }
        }

        if (isCreating) { onUpdate(data); } else { onUpdate(column.id, data); }
        onClose();
    };

    const addOrderOption = () => { const newOption = { id: Date.now().toString(), label: 'Nueva Opción', action: 'none' }; setCardConfig({ ...cardConfig, orderOptions: [...(cardConfig.orderOptions || []), newOption] }); };
    const updateOrderOption = (id, field, value) => { const newOptions = cardConfig.orderOptions.map(opt => opt.id === id ? { ...opt, [field]: value } : opt); setCardConfig({ ...cardConfig, orderOptions: newOptions }); };
    const removeOrderOption = (id) => { const newOptions = cardConfig.orderOptions.filter(opt => opt.id !== id); setCardConfig({ ...cardConfig, orderOptions: newOptions }); };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-50 p-4 transition-all duration-300" onClick={onClose}>
            <div
                className="bg-[#0f172a] border border-slate-700/50 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden transform transition-all scale-100 flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-slate-900/50 p-6 pb-4 border-b border-white/5 flex-shrink-0">
                    <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                        {isCreating ? "Nueva Columna" : "Editar Columna"}
                    </h2>
                </div>

                <div className="overflow-y-auto custom-scrollbar p-6 pt-4 flex-1">
                    <form onSubmit={handleSave}>
                        <div className="mb-6">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Nombre</label>
                            <input
                                autoFocus
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full bg-[#1e293b] border border-slate-700/50 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all placeholder-slate-600"
                            />
                        </div>

                        <div className="mb-6">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Color de Columna</label>
                            <div className="flex gap-3 items-start">
                                <div className="grid grid-cols-10 gap-2">
                                    {AVAILABLE_COLORS.map(c => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => setColor(c)}
                                            style={{ backgroundColor: COLOR_MAP[c] }}
                                            className={`w-5 h-5 rounded-full ring-2 ring-offset-2 ring-offset-[#0f172a] ${color === c ? 'ring-white scale-110' : 'ring-transparent opacity-70 hover:opacity-100'} transition-all`}
                                        />
                                    ))}
                                </div>
                                <div className="relative pt-0.5 ml-2 pl-2 border-l border-white/10">
                                    <button
                                        type="button"
                                        onClick={() => colorInputRef.current?.click()}
                                        className="w-5 h-5 rounded-full bg-slate-700 ring-1 ring-white/20 flex items-center justify-center hover:bg-slate-600 transition-colors"
                                        title="Color personalizado"
                                    >
                                        <Icons.Plus size={12} />
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

                        <div className="mb-6 space-y-4">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Configuración de Tarjetas</label>
                            <div className="bg-[#1e293b]/30 p-4 rounded-xl border border-slate-800 space-y-3">
                                <Toggle label="Solo Texto (Vista Limpia)" checked={cardConfig.enableTextOnly} onChange={(val) => setCardConfig({ ...cardConfig, enableTextOnly: val })} />
                                {!cardConfig.enableTextOnly && (
                                    <>
                                        <Toggle label="Ordenar Manualmente" checked={cardConfig.enableOrder} onChange={(val) => setCardConfig({ ...cardConfig, enableOrder: val })} />

                                        {cardConfig.enableOrder && (
                                            <div className="mt-3 pt-3 border-t border-slate-700/50 space-y-3 animate-in fade-in slide-in-from-top-1">
                                                <div className="flex justify-between items-center">
                                                    <label className="text-[10px] font-medium text-slate-400">Opciones Personalizadas</label>
                                                    <button type="button" onClick={addOrderOption} className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 bg-indigo-500/10 px-1.5 py-0.5 rounded"><Icons.Plus size={10} /> Añadir</button>
                                                </div>
                                                <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                                                    {(cardConfig.orderOptions || []).map((opt, idx) => (
                                                        <div key={opt.id || idx} className="flex gap-2 items-center bg-slate-900/50 p-1.5 rounded border border-slate-700/50 group">
                                                            <input type="text" value={opt.label} onChange={(e) => updateOrderOption(opt.id, 'label', e.target.value)} className="flex-1 bg-transparent text-xs text-slate-200 outline-none border-b border-transparent focus:border-indigo-500/50 px-1 placeholder-slate-600" placeholder="Nombre..." />
                                                            <div className="relative inline-block">
                                                                <select value={opt.action} onChange={(e) => updateOrderOption(opt.id, 'action', e.target.value)} className="appearance-none bg-[#1e293b] hover:bg-[#253045] text-[10px] text-slate-300 border border-slate-700 rounded-lg pl-2 pr-7 py-1 outline-none max-w-[110px] transition-all cursor-pointer focus:ring-1 focus:ring-indigo-500/50">
                                                                    <option value="none">Etiqueta</option>
                                                                    <option value="move-start">Inicio</option>
                                                                    <option value="move-end">Fin</option>
                                                                </select>
                                                                <div className="absolute inset-y-0 right-0 flex items-center pr-1.5 pointer-events-none">
                                                                    <Icons.ChevronDown size={10} className="text-slate-400" />
                                                                </div>
                                                            </div>
                                                            <button type="button" onClick={() => removeOrderOption(opt.id)} className="text-slate-600 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"><Icons.X size={12} /></button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            <div className="pt-2 border-t border-white/5 mt-2">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Orden de Creación</label>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-700/50 bg-[#1e293b]/50 hover:bg-[#1e293b] cursor-pointer transition-colors group">
                                        <div className="relative flex items-center justify-center">
                                            <input
                                                type="radio"
                                                name="insertion_policy"
                                                value="bottom"
                                                checked={(cardConfig.insertion_policy || 'bottom') === 'bottom'}
                                                onChange={() => setCardConfig({ ...cardConfig, insertion_policy: 'bottom' })}
                                                className="peer appearance-none w-5 h-5 rounded-full border-2 border-slate-600 checked:border-indigo-500 checked:bg-indigo-500/10 transition-all"
                                            />
                                            <div className="absolute w-2.5 h-2.5 rounded-full bg-indigo-500 scale-0 peer-checked:scale-100 transition-transform pointer-events-none"></div>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-slate-200 group-hover:text-white">Al final (Por defecto)</span>
                                            <span className="text-xs text-slate-500">Las nuevas tareas aparecerán abajo (Cola)</span>
                                        </div>
                                    </label>

                                    <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-700/50 bg-[#1e293b]/50 hover:bg-[#1e293b] cursor-pointer transition-colors group">
                                        <div className="relative flex items-center justify-center">
                                            <input
                                                type="radio"
                                                name="insertion_policy"
                                                value="top"
                                                checked={cardConfig.insertion_policy === 'top'}
                                                onChange={() => setCardConfig({ ...cardConfig, insertion_policy: 'top' })}
                                                className="peer appearance-none w-5 h-5 rounded-full border-2 border-slate-600 checked:border-indigo-500 checked:bg-indigo-500/10 transition-all"
                                            />
                                            <div className="absolute w-2.5 h-2.5 rounded-full bg-indigo-500 scale-0 peer-checked:scale-100 transition-transform pointer-events-none"></div>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-slate-200 group-hover:text-white">Al principio</span>
                                            <span className="text-xs text-slate-500">Las nuevas tareas aparecerán arriba (Pila)</span>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="mb-6 space-y-4 border-t border-white/5 pt-4">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Avisos Automáticos</label>
                            <div className="bg-[#1e293b]/30 p-4 rounded-xl border border-slate-800 space-y-3">
                                <Toggle
                                    label="Activar avisos por defecto"
                                    checked={defaultReminderEnabled}
                                    onChange={setDefaultReminderEnabled}
                                />

                                {defaultReminderEnabled && (
                                    <div className="flex gap-2 mt-2 mb-3 pl-2 border-l-2 border-indigo-500/30 animate-in fade-in slide-in-from-left-2">
                                        <input
                                            type="number"
                                            value={defaultReminderValue}
                                            onChange={(e) => setDefaultReminderValue(e.target.value)}
                                            placeholder="0"
                                            className="w-16 bg-[#0f172a] border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none text-center"
                                        />
                                        <div className="relative inline-block flex-1">
                                            <select
                                                value={defaultReminderUnit}
                                                onChange={(e) => setDefaultReminderUnit(e.target.value)}
                                                className="appearance-none w-full bg-[#0f172a] border border-slate-700 rounded-lg pl-3 pr-8 py-1.5 text-xs text-white focus:ring-1 focus:ring-indigo-500 outline-none transition-colors cursor-pointer hover:bg-[#1e293b]"
                                            >
                                                {TIME_UNITS.map(unit => (
                                                    <option key={unit.value} value={unit.value}>{unit.label}</option>
                                                ))}
                                            </select>
                                            <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none">
                                                <Icons.ChevronDown size={12} className="text-slate-400" />
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setForceRecalculate(true)}
                                            className={`p-1.5 rounded-lg transition-colors border ${forceRecalculate ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-transparent text-slate-500 border-transparent hover:bg-white/5 hover:text-slate-300'}`}
                                            title="Resetear tiempo"
                                        >
                                            <Icons.RotateCcw size={14} />
                                        </button>
                                    </div>
                                )}

                                <Toggle
                                    label="Permitir override en tarjeta"
                                    checked={allowCardOverrides}
                                    onChange={setAllowCardOverrides}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-white/5 flex-shrink-0">
                            {!isCreating && (<button type="button" onClick={() => setShowDeleteConfirm(true)} className="px-3 py-2 text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors mr-auto flex items-center gap-1"><Icons.Trash2 size={14} /> Eliminar</button>)}
                            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all">Cancelar</button>
                            <button type="submit" disabled={!title.trim()} className="px-5 py-2 text-sm font-bold bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none">{isCreating ? "Crear Columna" : "Guardar"}</button>
                        </div>
                    </form>
                </div>

                {/* Internal Delete Confirmation Overlay */}
                {showDeleteConfirm && (
                    <div className="absolute inset-0 bg-[#0f172a]/95 backdrop-blur-sm flex items-center justify-center p-6 z-20 animate-in fade-in zoom-in-95 duration-200">
                        <div className="text-center w-full">
                            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20 shadow-xl shadow-red-500/5">
                                <Icons.Trash2 size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">¿Eliminar esta columna?</h3>
                            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                                Se eliminarán permanentemente todas las tareas que contenga.<br />Esta acción no se puede deshacer.
                            </p>
                            <div className="flex justify-center gap-3">
                                <button onClick={() => setShowDeleteConfirm(false)} className="px-5 py-2.5 text-sm font-medium text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors">Cancelar</button>
                                <button onClick={() => { onDelete(column.id); onClose(); }} className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 rounded-xl shadow-lg shadow-red-500/20 transition-all transform hover:-translate-y-0.5">Sí, Eliminar</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ColumnModal;
