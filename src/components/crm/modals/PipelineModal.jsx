import React, { useState, useEffect } from 'react';
import { Icons } from '../../ui/Icons';
import { useCRM } from '../../../context/CRMContext';

const STAGE_COLORS = [
    { id: 'slate', bg: 'bg-slate-500', text: 'text-slate-500' },
    { id: 'gray', bg: 'bg-gray-500', text: 'text-gray-500' },
    { id: 'zinc', bg: 'bg-zinc-500', text: 'text-zinc-500' },
    { id: 'red', bg: 'bg-red-500', text: 'text-red-500' },
    { id: 'orange', bg: 'bg-orange-500', text: 'text-orange-500' },
    { id: 'amber', bg: 'bg-amber-500', text: 'text-amber-500' },
    { id: 'yellow', bg: 'bg-yellow-500', text: 'text-yellow-500' },
    { id: 'lime', bg: 'bg-lime-500', text: 'text-lime-500' },
    { id: 'green', bg: 'bg-green-500', text: 'text-green-500' },
    { id: 'emerald', bg: 'bg-emerald-500', text: 'text-emerald-500' },
    { id: 'teal', bg: 'bg-teal-500', text: 'text-teal-500' },
    { id: 'cyan', bg: 'bg-cyan-500', text: 'text-cyan-500' },
    { id: 'sky', bg: 'bg-sky-500', text: 'text-sky-500' },
    { id: 'blue', bg: 'bg-blue-500', text: 'text-blue-500' },
    { id: 'indigo', bg: 'bg-indigo-500', text: 'text-indigo-500' },
    { id: 'violet', bg: 'bg-violet-500', text: 'text-violet-500' },
    { id: 'purple', bg: 'bg-purple-500', text: 'text-purple-500' },
    { id: 'fuchsia', bg: 'bg-fuchsia-500', text: 'text-fuchsia-500' },
    { id: 'pink', bg: 'bg-pink-500', text: 'text-pink-500' },
    { id: 'rose', bg: 'bg-rose-500', text: 'text-rose-500' },
];

const PipelineModal = ({ pipeline, onClose }) => {
    const {
        stages: allStages,
        createPipeline,
        updatePipeline,
        deletePipeline,
        createStage,
        updateStage,
        deleteStage,
        reorderStages
    } = useCRM();

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        is_default: false
    });

    // Local stages state for editing
    const [localStages, setLocalStages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('details'); // 'details' or 'stages'

    const isEditing = !!pipeline;

    useEffect(() => {
        if (pipeline) {
            setFormData({
                name: pipeline.name || '',
                description: pipeline.description || '',
                is_default: pipeline.is_default || false
            });
            // Filter and sort stages for this pipeline
            const pipelineStages = allStages
                .filter(s => s.pipeline_id === pipeline.id)
                .sort((a, b) => a.position - b.position);
            setLocalStages(pipelineStages);
        } else {
            // Default stages for new pipeline
            setLocalStages([
                { id: 'temp-1', name: 'Nuevo', color: 'slate', probability: 10, is_won: false, is_lost: false },
                { id: 'temp-2', name: 'Calificado', color: 'blue', probability: 20, is_won: false, is_lost: false },
                { id: 'temp-3', name: 'Ganado', color: 'emerald', probability: 100, is_won: true, is_lost: false },
                { id: 'temp-4', name: 'Perdido', color: 'red', probability: 0, is_won: false, is_lost: true },
            ]);
        }
    }, [pipeline, allStages]);

    // ESC key handler
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape' && !isLoading) onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose, isLoading]);

    const handleSavePipeline = async (e) => {
        e.preventDefault();
        if (!formData.name.trim() || isLoading) return;

        setIsLoading(true);
        try {
            let savedPipeline;
            if (isEditing) {
                savedPipeline = await updatePipeline(pipeline.id, formData);
            } else {
                savedPipeline = await createPipeline(formData);
                // Create stages for the new pipeline
                for (let i = 0; i < localStages.length; i++) {
                    const stage = localStages[i];
                    await createStage({
                        ...stage,
                        id: undefined, // Let DB generate ID
                        pipeline_id: savedPipeline.id,
                        position: i
                    });
                }
            }
            onClose();
        } catch (error) {
            console.error('Error saving pipeline:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeletePipeline = async () => {
        if (!window.confirm('¿Estás seguro? Se eliminará el pipeline y todas sus oportunidades.')) return;

        setIsLoading(true);
        try {
            await deletePipeline(pipeline.id);
            onClose();
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddStage = () => {
        const newStage = {
            id: `temp-${Date.now()}`,
            name: 'Nueva Etapa',
            color: 'slate',
            probability: 50,
            is_won: false,
            is_lost: false
        };
        setLocalStages([...localStages, newStage]);
    };

    const handleUpdateLocalStage = (id, updates) => {
        setLocalStages(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));

        // If editing and not a temp stage, persist immediately or wait for save?
        // To keep it simple, let's persist immediately if editing existing pipeline.
        if (isEditing && !String(id).startsWith('temp-')) {
            updateStage(id, updates);
        }
    };

    const handleDeleteLocalStage = async (id) => {
        if (localStages.length <= 1) {
            alert('Un pipeline debe tener al menos una etapa.');
            return;
        }

        if (isEditing && !String(id).startsWith('temp-')) {
            if (!window.confirm('¿Eliminar esta etapa? Las oportunidades asociadas quedarán huérfanas.')) return;
            await deleteStage(id);
        }
        setLocalStages(prev => prev.filter(s => s.id !== id));
    };

    const handleMoveStage = async (index, direction) => {
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= localStages.length) return;

        const newStages = [...localStages];
        const [moved] = newStages.splice(index, 1);
        newStages.splice(newIndex, 0, moved);
        setLocalStages(newStages);

        if (isEditing) {
            const stageIds = newStages.map(s => s.id);
            await reorderStages(pipeline.id, stageIds);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl border border-white/10 my-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                            <Icons.GitBranch className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">
                                {isEditing ? 'Configurar Pipeline' : 'Nuevo Pipeline'}
                            </h2>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Define tu proceso de ventas y etapas
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <Icons.X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex items-center px-6 border-b border-white/5">
                    <button
                        onClick={() => setActiveTab('details')}
                        className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'details' ? 'text-indigo-400 border-indigo-400' : 'text-slate-400 border-transparent hover:text-slate-200'}`}
                    >
                        Detalles
                    </button>
                    <button
                        onClick={() => setActiveTab('stages')}
                        className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'stages' ? 'text-indigo-400 border-indigo-400' : 'text-slate-400 border-transparent hover:text-slate-200'}`}
                    >
                        Etapas ({localStages.length})
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {activeTab === 'details' ? (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Nombre del Pipeline *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50"
                                    placeholder="Ej: Ventas B2B, Servicios..."
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Descripción
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    rows={3}
                                    className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 resize-none"
                                    placeholder="Describe el propósito de este pipeline..."
                                />
                            </div>

                            <div className="flex items-center gap-3 p-4 bg-slate-900/30 rounded-xl border border-white/5">
                                <input
                                    type="checkbox"
                                    id="is_default"
                                    checked={formData.is_default}
                                    onChange={(e) => setFormData(prev => ({ ...prev, is_default: e.target.checked }))}
                                    className="w-4 h-4 rounded border-white/20 bg-slate-900 text-indigo-500 focus:ring-indigo-500/50"
                                />
                                <label htmlFor="is_default" className="text-sm text-slate-300 cursor-pointer">
                                    Establecer como pipeline por defecto
                                </label>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Etapas del Proceso</h4>
                                <button
                                    onClick={handleAddStage}
                                    className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                                >
                                    <Icons.Plus size={14} />
                                    Añadir Etapa
                                </button>
                            </div>

                            {localStages.map((stage, index) => (
                                <div
                                    key={stage.id}
                                    className="group/stage flex items-center gap-3 p-3 bg-slate-900/30 rounded-xl border border-white/5 hover:border-white/10 transition-all"
                                >
                                    {/* Reorder buttons */}
                                    <div className="flex flex-col gap-1 opacity-0 group-hover/stage:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleMoveStage(index, -1)}
                                            disabled={index === 0}
                                            className="p-0.5 text-slate-500 hover:text-white disabled:opacity-20"
                                        >
                                            <Icons.ChevronUp size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleMoveStage(index, 1)}
                                            disabled={index === localStages.length - 1}
                                            className="p-0.5 text-slate-500 hover:text-white disabled:opacity-20"
                                        >
                                            <Icons.ChevronDown size={14} />
                                        </button>
                                    </div>

                                    {/* Color Dots */}
                                    <div className="relative group/colors shrink-0">
                                        <div className={`w-4 h-4 rounded-full ${STAGE_COLORS.find(c => c.id === stage.color)?.bg || 'bg-slate-500'} cursor-pointer`} />
                                        <div className="absolute top-full left-0 mt-2 p-2 bg-slate-800 border border-white/10 rounded-lg shadow-2xl z-[60] hidden group-hover/colors:grid grid-cols-5 gap-1 w-32">
                                            {STAGE_COLORS.map(c => (
                                                <button
                                                    key={c.id}
                                                    onClick={() => handleUpdateLocalStage(stage.id, { color: c.id })}
                                                    className={`w-4 h-4 rounded-full ${c.bg} hover:scale-125 transition-transform`}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    {/* Name input */}
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            value={stage.name}
                                            onChange={(e) => handleUpdateLocalStage(stage.id, { name: e.target.value })}
                                            className="w-full bg-transparent text-sm text-white focus:outline-none border-b border-transparent focus:border-indigo-500/50 py-0.5"
                                            placeholder="Nombre de etapa"
                                        />
                                    </div>

                                    {/* Settings */}
                                    <div className="flex items-center gap-3 shrink-0">
                                        <div className="flex items-center gap-1.5 opacity-60 group-hover/stage:opacity-100 transition-opacity">
                                            <span className="text-[10px] text-slate-500">Prob:</span>
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={stage.probability}
                                                onChange={(e) => handleUpdateLocalStage(stage.id, { probability: parseInt(e.target.value) || 0 })}
                                                className="w-10 bg-slate-800 text-[10px] text-center text-white p-0.5 rounded outline-none"
                                            />
                                            <span className="text-[10px] text-slate-500">%</span>
                                        </div>

                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => handleUpdateLocalStage(stage.id, { is_won: !stage.is_won, is_lost: false })}
                                                className={`p-1.5 rounded transition-colors ${stage.is_won ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-600 hover:text-slate-400'}`}
                                                title="Marcar como etapa ganada"
                                            >
                                                <Icons.Trophy size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleUpdateLocalStage(stage.id, { is_lost: !stage.is_lost, is_won: false })}
                                                className={`p-1.5 rounded transition-colors ${stage.is_lost ? 'bg-red-500/20 text-red-400' : 'text-slate-600 hover:text-slate-400'}`}
                                                title="Marcar como etapa perdida"
                                            >
                                                <Icons.XCircle size={14} />
                                            </button>
                                        </div>

                                        <button
                                            onClick={() => handleDeleteLocalStage(stage.id)}
                                            className="p-1.5 text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover/stage:opacity-100"
                                            title="Eliminar etapa"
                                        >
                                            <Icons.Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-3 p-6 border-t border-white/5 bg-slate-900/30 rounded-b-2xl">
                    {isEditing ? (
                        <button
                            type="button"
                            onClick={handleDeletePipeline}
                            disabled={isLoading}
                            className="flex items-center gap-2 px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50 text-sm font-medium"
                        >
                            <Icons.Trash2 size={18} />
                            Eliminar
                        </button>
                    ) : (
                        <div />
                    )}

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            className="px-4 py-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 text-sm font-medium"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSavePipeline}
                            disabled={!formData.name.trim() || isLoading}
                            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20 active:scale-95"
                        >
                            {isLoading ? (
                                <>
                                    <Icons.Loader className="w-4 h-4 animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <Icons.Check size={18} />
                                    {isEditing ? 'Guardar Cambios' : 'Crear Pipeline'}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PipelineModal;
