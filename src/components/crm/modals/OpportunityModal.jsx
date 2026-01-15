import React, { useState, useEffect, useCallback } from 'react';
import { useCRM } from '../../../context/CRMContext';
import { Icons } from '../../ui/Icons';

const OpportunityModal = ({ opportunity, stageId, onClose, onSave, onDelete }) => {
    const { contacts, companies, activeStages } = useCRM();
    const isEditing = !!opportunity;
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        expected_revenue: '',
        probability: 10,
        expected_close_date: '',
        contact_id: '',
        company_id: '',
        priority: 'medium',
        source: '',
        notes: '',
        stage_id: stageId || ''
    });

    // ESC key handler
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Escape') {
            onClose();
        }
    }, [onClose]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    useEffect(() => {
        if (opportunity) {
            setFormData({
                name: opportunity.name || '',
                description: opportunity.description || '',
                expected_revenue: opportunity.expected_revenue || '',
                probability: opportunity.probability || 10,
                expected_close_date: opportunity.expected_close_date ? opportunity.expected_close_date.split('T')[0] : '',
                contact_id: opportunity.contact_id || '',
                company_id: opportunity.company_id || '',
                priority: opportunity.priority || 'medium',
                source: opportunity.source || '',
                notes: opportunity.notes || '',
                stage_id: opportunity.stage_id || stageId || ''
            });
        }
    }, [opportunity, stageId]);

    const handleChange = (e) => {
        const { name, value } = e.target;

        // Si cambia la etapa, actualizar la probabilidad basada en default_probability
        if (name === 'stage_id' && value) {
            const selectedStage = activeStages.find(s => s.id === parseInt(value) || s.id === value);
            if (selectedStage && selectedStage.default_probability !== undefined) {
                setFormData(prev => ({
                    ...prev,
                    [name]: value,
                    probability: selectedStage.default_probability
                }));
                return;
            }
        }

        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim() || saving) return;

        setSaving(true);
        const data = {
            ...formData,
            expected_revenue: parseFloat(formData.expected_revenue) || 0,
            probability: parseInt(formData.probability) || 10,
            contact_id: formData.contact_id || null,
            company_id: formData.company_id || null,
            expected_close_date: formData.expected_close_date || null,
            stage_id: formData.stage_id || null
        };

        try {
            await onSave(data);
        } finally {
            setSaving(false);
        }
    };

    const sources = [
        { value: '', label: 'Seleccionar fuente...' },
        { value: 'web', label: 'Sitio Web' },
        { value: 'referral', label: 'Referido' },
        { value: 'social', label: 'Redes Sociales' },
        { value: 'ads', label: 'Publicidad' },
        { value: 'event', label: 'Evento' },
        { value: 'cold_call', label: 'Llamada en frío' },
        { value: 'email', label: 'Email Marketing' },
        { value: 'partner', label: 'Partner' },
        { value: 'other', label: 'Otro' },
    ];

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#1e293b] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-white/10">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-white/10 bg-slate-800/50">
                    <h2 className="text-xl font-bold text-white">
                        {isEditing ? 'Editar Oportunidad' : 'Nueva Oportunidad'}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <Icons.X size={24} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-5 space-y-5 overflow-y-auto max-h-[calc(90vh-140px)]">
                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">
                            Nombre de la Oportunidad *
                        </label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Ej: Propuesta Software ERP"
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                            required
                        />
                    </div>

                    {/* Value & Probability */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                Valor Esperado (€)
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">€</span>
                                <input
                                    type="number"
                                    name="expected_revenue"
                                    value={formData.expected_revenue}
                                    onChange={handleChange}
                                    placeholder="0"
                                    min="0"
                                    step="0.01"
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg pl-8 pr-4 py-2.5 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                Probabilidad: {formData.probability}%
                            </label>
                            <input
                                type="range"
                                name="probability"
                                value={formData.probability}
                                onChange={handleChange}
                                min="0"
                                max="100"
                                step="5"
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            />
                        </div>
                    </div>

                    {/* Stage & Close Date */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                Etapa
                            </label>
                            <select
                                name="stage_id"
                                value={formData.stage_id}
                                onChange={handleChange}
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                            >
                                {activeStages.map(stage => (
                                    <option key={stage.id} value={stage.id}>{stage.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                Fecha de Cierre Esperada
                            </label>
                            <input
                                type="date"
                                name="expected_close_date"
                                value={formData.expected_close_date}
                                onChange={handleChange}
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                            />
                        </div>
                    </div>

                    {/* Contact & Company */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                Contacto
                            </label>
                            <select
                                name="contact_id"
                                value={formData.contact_id}
                                onChange={handleChange}
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                            >
                                <option value="">Sin contacto</option>
                                {contacts.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.first_name} {c.last_name} {c.company?.name ? `(${c.company.name})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                Empresa
                            </label>
                            <select
                                name="company_id"
                                value={formData.company_id}
                                onChange={handleChange}
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                            >
                                <option value="">Sin empresa</option>
                                {companies.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Priority & Source */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                Prioridad
                            </label>
                            <select
                                name="priority"
                                value={formData.priority}
                                onChange={handleChange}
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                            >
                                <option value="low">🔽 Baja</option>
                                <option value="medium">➡️ Media</option>
                                <option value="high">🔼 Alta</option>
                                <option value="urgent">🔥 Urgente</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                Fuente
                            </label>
                            <select
                                name="source"
                                value={formData.source}
                                onChange={handleChange}
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                            >
                                {sources.map(s => (
                                    <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">
                            Descripción
                        </label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows={3}
                            placeholder="Detalles de la oportunidad..."
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all resize-none"
                        />
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">
                            Notas internas
                        </label>
                        <textarea
                            name="notes"
                            value={formData.notes}
                            onChange={handleChange}
                            rows={2}
                            placeholder="Notas privadas..."
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all resize-none"
                        />
                    </div>

                    {/* Footer - inside form for submit to work */}
                    <div className="flex items-center justify-between pt-4 border-t border-white/10">
                        <div>
                            {onDelete && (
                                <button
                                    type="button"
                                    onClick={onDelete}
                                    className="px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                                >
                                    Eliminar
                                </button>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                            >
                                {saving && (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                )}
                                {isEditing ? 'Guardar Cambios' : 'Crear Oportunidad'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default OpportunityModal;
