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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                            <Icons.Settings />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-[var(--text-primary)]">Configuración</h2>
                            <p className="text-sm text-[var(--text-secondary)]">Personaliza tu experiencia</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                        <Icons.X />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-[var(--border-color)] px-6 gap-6">
                    <button
                        onClick={() => setActiveTab('visual')}
                        className={`py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'visual' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                    >
                        Visual y Diseño
                    </button>
                    <button
                        onClick={() => setActiveTab('defaults')}
                        className={`py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'defaults' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
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
                                <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">Tema</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => updateSettings({ theme: 'dark' })}
                                        className={`p-4 rounded-xl border-2 flex flex-col items-center gap-3 transition-all ${settings.theme === 'dark' ? 'border-indigo-500 bg-indigo-500/5' : 'border-[var(--border-color)] hover:border-[var(--text-secondary)]'}`}
                                    >
                                        <div className="w-full h-20 bg-slate-900 rounded-lg border border-slate-700 shadow-inner flex items-center justify-center">
                                            <div className="w-8 h-8 rounded-full bg-indigo-500 shadow-lg shadow-indigo-500/50"></div>
                                        </div>
                                        <span className={`font-medium ${settings.theme === 'dark' ? 'text-indigo-400' : 'text-[var(--text-secondary)]'}`}>Modo Oscuro</span>
                                    </button>
                                    <button
                                        onClick={() => updateSettings({ theme: 'light' })}
                                        className={`p-4 rounded-xl border-2 flex flex-col items-center gap-3 transition-all ${settings.theme === 'light' ? 'border-indigo-500 bg-indigo-500/5' : 'border-[var(--border-color)] hover:border-[var(--text-secondary)]'}`}
                                    >
                                        <div className="w-full h-20 bg-gray-50 rounded-lg border border-gray-200 shadow-inner flex items-center justify-center">
                                            <div className="w-8 h-8 rounded-full bg-indigo-500 shadow-lg shadow-indigo-500/20"></div>
                                        </div>
                                        <span className={`font-medium ${settings.theme === 'light' ? 'text-indigo-400' : 'text-[var(--text-secondary)]'}`}>Modo Claro</span>
                                    </button>
                                </div>
                            </section>

                            {/* Density */}


                            {/* Sliders */}
                            <section className="space-y-6">
                                <div>
                                    <div className="flex justify-between mb-2">
                                        <label className="text-sm font-medium text-[var(--text-primary)]">Ancho de Columna</label>
                                        <span className="text-xs text-[var(--text-secondary)]">{settings.columnWidth}px</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="250"
                                        max="500"
                                        value={settings.columnWidth}
                                        onChange={(e) => updateSettings({ columnWidth: parseInt(e.target.value) })}
                                        className="w-full h-2 bg-[var(--bg-primary)] rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                    />
                                </div>

                            </section>
                        </div>
                    )}

                    {activeTab === 'defaults' && (
                        <div className="space-y-8">
                            <section>
                                <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">Limpieza Automática</h3>
                                <div className="flex items-center gap-4">
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Archivar tareas completadas</label>
                                        <p className="text-xs text-[var(--text-secondary)]">Ocultar tareas de la columna "Completado" después de cierto tiempo.</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            min="0"
                                            value={settings.autoArchiveHours}
                                            onChange={(e) => updateSettings({ autoArchiveHours: parseInt(e.target.value) })}
                                            className="w-20 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-2 py-1 text-sm text-[var(--text-primary)] outline-none focus:border-indigo-500"
                                        />
                                        <span className="text-sm text-[var(--text-secondary)]">horas</span>
                                    </div>
                                </div>
                            </section>
                        </div>
                    )}

                </div>

                {/* Footer */}
                <div className="p-6 border-t border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-primary)]/30">
                    <button
                        onClick={handleReset}
                        className="text-xs text-red-400 hover:text-red-300 hover:underline"
                    >
                        Restablecer valores predeterminados
                    </button>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        Listo
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
