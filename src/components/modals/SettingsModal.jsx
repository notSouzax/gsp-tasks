import React, { useState } from 'react';
import { Icons } from '../ui/Icons';
import { useSettings } from '../../context/SettingsContext';

const SettingsModal = ({ onClose }) => {
    const { settings, updateSettings, resetSettings } = useSettings();
    const [activeTab, setActiveTab] = useState('visual');

    const handleReset = () => {
        if (confirm('¿Estás seguro de que quieres restablecer todas las configuraciones a los valores predeterminados?')) {
            resetSettings();
        }
    };

    return (
        <div className="fixed inset-0 bg-[var(--overlay-bg)] backdrop-blur-[2px] flex items-center justify-center z-50 p-4 transition-all duration-300" onClick={onClose}>
            <div
                className="bg-[var(--bg-secondary)] dark:bg-[#0f172a] border border-[var(--border-default)] dark:border-slate-700/50 w-full max-w-2xl rounded-2xl shadow-[var(--shadow-xl)] flex flex-col max-h-[90vh] overflow-hidden transform transition-all scale-100"
                onClick={e => e.stopPropagation()}
            >

                {/* Header */}
                <div className="bg-stone-100/30 dark:bg-slate-900/50 p-6 pb-4 border-b border-[var(--border-subtle)] dark:border-white/5">
                    <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
                            Configuración
                        </span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">Personaliza tu experiencia</p>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-[var(--border-subtle)] dark:border-white/5 px-6 gap-6">
                    <button
                        onClick={() => setActiveTab('visual')}
                        className={`py-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'visual' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500 hover:text-[var(--text-primary)]'}`}
                    >
                        Visual y Diseño
                    </button>
                    <button
                        onClick={() => setActiveTab('defaults')}
                        className={`py-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'defaults' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500 hover:text-[var(--text-primary)]'}`}
                    >
                        Preferencias
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">

                    {activeTab === 'visual' && (
                        <div className="space-y-8">
                            {/* Theme */}
                            <section>
                                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">Tema</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => updateSettings({ theme: 'dark' })}
                                        className={`p-4 rounded-xl border-2 flex flex-col items-center gap-3 transition-all ${settings.theme === 'dark' ? 'border-indigo-500 bg-indigo-500/5' : 'border-[var(--border-default)] dark:border-slate-700 hover:border-slate-500'}`}
                                    >
                                        <div className="w-full h-20 bg-slate-900 rounded-lg border border-slate-700 shadow-inner flex items-center justify-center">
                                            <div className="w-8 h-8 rounded-full bg-indigo-500 shadow-lg shadow-indigo-500/50"></div>
                                        </div>
                                        <span className={`text-xs font-bold uppercase tracking-wider ${settings.theme === 'dark' ? 'text-indigo-400' : 'text-slate-500'}`}>Modo Oscuro</span>
                                    </button>
                                    <button
                                        onClick={() => updateSettings({ theme: 'light' })}
                                        className={`p-4 rounded-xl border-2 flex flex-col items-center gap-3 transition-all ${settings.theme === 'light' ? 'border-indigo-500 bg-indigo-500/5' : 'border-[var(--border-default)] dark:border-slate-700 hover:border-slate-500'}`}
                                    >
                                        <div className="w-full h-20 bg-gray-50 rounded-lg border border-gray-200 shadow-inner flex items-center justify-center">
                                            <div className="w-8 h-8 rounded-full bg-indigo-500 shadow-lg shadow-indigo-500/20"></div>
                                        </div>
                                        <span className={`text-xs font-bold uppercase tracking-wider ${settings.theme === 'light' ? 'text-indigo-400' : 'text-slate-500'}`}>Modo Claro</span>
                                    </button>
                                </div>
                            </section>

                            {/* Sliders */}
                            <section className="space-y-6">
                                <div>
                                    <div className="flex justify-between mb-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ancho de Columna</label>
                                        <span className="text-[10px] text-slate-500 font-mono">{settings.columnWidth}px</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="250"
                                        max="500"
                                        value={settings.columnWidth}
                                        onChange={(e) => updateSettings({ columnWidth: parseInt(e.target.value) })}
                                        className="w-full h-2 bg-[var(--bg-elevated)] dark:bg-[#1e293b] rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                    />
                                </div>

                            </section>
                        </div>
                    )}

                    {activeTab === 'defaults' && (
                        <div className="space-y-8">
                            <section>
                                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">Limpieza Automática</h3>
                                <div className="flex items-center gap-4">
                                    <div className="flex-1">
                                        <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">Archivar tareas completadas</label>
                                        <p className="text-[10px] text-slate-500">Ocultar tareas de la columna "Completado" después de cierto tiempo.</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            min="0"
                                            value={settings.autoArchiveHours}
                                            onChange={(e) => updateSettings({ autoArchiveHours: parseInt(e.target.value) })}
                                            className="w-20 bg-[var(--bg-elevated)] dark:bg-[#1e293b] border border-[var(--border-default)] dark:border-slate-700 rounded-lg px-2 py-1.5 text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                                        />
                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">horas</span>
                                    </div>
                                </div>
                            </section>
                        </div>
                    )}

                </div>

                {/* Footer */}
                <div className="p-6 pt-4 border-t border-[var(--border-subtle)] dark:border-white/5 flex justify-between items-center">
                    <button
                        onClick={handleReset}
                        className="text-[10px] text-red-400 hover:text-red-300 hover:underline font-bold uppercase tracking-wider transition-colors"
                    >
                        Restablecer valores predeterminados
                    </button>
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 text-sm font-bold bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all transform hover:-translate-y-0.5"
                    >
                        Listo
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
