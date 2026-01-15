import React, { useState, useEffect, useCallback } from 'react';
import { useCRM } from '../../../context/CRMContext';
import { Icons } from '../../ui/Icons';

const ContactModal = ({ contact, onClose, onSave, onDelete }) => {
    const { companies } = useCRM();
    const isEditing = !!contact;
    const [saving, setSaving] = useState(false);
    const [emailError, setEmailError] = useState('');

    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        mobile: '',
        job_title: '',
        department: '',
        company_id: '',
        address_street: '',
        address_city: '',
        address_state: '',
        address_zip: '',
        address_country: 'España',
        linkedin_url: '',
        lead_status: 'new',
        lead_source: '',
        notes: '',
        preferred_contact_method: 'email',
        do_not_call: false,
        do_not_email: false,
    });

    const [activeTab, setActiveTab] = useState('basic');

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
        if (contact) {
            setFormData({
                first_name: contact.first_name || '',
                last_name: contact.last_name || '',
                email: contact.email || '',
                phone: contact.phone || '',
                mobile: contact.mobile || '',
                job_title: contact.job_title || '',
                department: contact.department || '',
                company_id: contact.company_id || '',
                address_street: contact.address_street || '',
                address_city: contact.address_city || '',
                address_state: contact.address_state || '',
                address_zip: contact.address_zip || '',
                address_country: contact.address_country || 'España',
                linkedin_url: contact.linkedin_url || '',
                lead_status: contact.lead_status || 'new',
                lead_source: contact.lead_source || '',
                notes: contact.notes || '',
                preferred_contact_method: contact.preferred_contact_method || 'email',
                do_not_call: contact.do_not_call || false,
                do_not_email: contact.do_not_email || false,
            });
        }
    }, [contact]);

    const validateEmail = (email) => {
        if (!email) return true; // Email is optional
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));

        // Clear email error when typing
        if (name === 'email') {
            setEmailError('');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.first_name.trim() || saving) return;

        // Validate email
        if (formData.email && !validateEmail(formData.email)) {
            setEmailError('Email no válido');
            return;
        }

        setSaving(true);
        const data = {
            ...formData,
            company_id: formData.company_id || null,
        };

        try {
            await onSave(data);
        } finally {
            setSaving(false);
        }
    };

    const leadStatuses = [
        { value: 'new', label: 'Nuevo', color: 'bg-blue-500' },
        { value: 'contacted', label: 'Contactado', color: 'bg-purple-500' },
        { value: 'qualified', label: 'Cualificado', color: 'bg-indigo-500' },
        { value: 'proposal', label: 'Propuesta', color: 'bg-amber-500' },
        { value: 'negotiation', label: 'Negociación', color: 'bg-orange-500' },
        { value: 'won', label: 'Ganado', color: 'bg-emerald-500' },
        { value: 'lost', label: 'Perdido', color: 'bg-red-500' },
    ];

    const leadSources = [
        { value: '', label: 'Seleccionar...' },
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

    const tabs = [
        { id: 'basic', label: 'Básico', icon: 'person' },
        { id: 'work', label: 'Trabajo', icon: 'work' },
        { id: 'address', label: 'Dirección', icon: 'location_on' },
        { id: 'preferences', label: 'Preferencias', icon: 'settings' },
    ];

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#1e293b] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-white/10">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-white/10 bg-slate-800/50">
                    <h2 className="text-xl font-bold text-white">
                        {isEditing ? 'Editar Contacto' : 'Nuevo Contacto'}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <Icons.X size={24} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/5 bg-slate-800/30">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${activeTab === tab.id
                                ? 'text-indigo-400 border-b-2 border-indigo-500 bg-indigo-500/10'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-5 space-y-5 overflow-y-auto max-h-[calc(90vh-200px)]">
                    {/* Basic Tab */}
                    {activeTab === 'basic' && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                        Nombre *
                                    </label>
                                    <input
                                        type="text"
                                        name="first_name"
                                        value={formData.first_name}
                                        onChange={handleChange}
                                        placeholder="Nombre"
                                        className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                        Apellidos
                                    </label>
                                    <input
                                        type="text"
                                        name="last_name"
                                        value={formData.last_name}
                                        onChange={handleChange}
                                        placeholder="Apellidos"
                                        className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="email@ejemplo.com"
                                    className={`w-full bg-slate-900/50 border rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all ${emailError ? 'border-red-500' : 'border-slate-700'}`}
                                />
                                {emailError && (
                                    <p className="text-red-400 text-xs mt-1">{emailError}</p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                        Teléfono
                                    </label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        placeholder="+34 900 000 000"
                                        className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                        Móvil
                                    </label>
                                    <input
                                        type="tel"
                                        name="mobile"
                                        value={formData.mobile}
                                        onChange={handleChange}
                                        placeholder="+34 600 000 000"
                                        className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                        Estado del Lead
                                    </label>
                                    <select
                                        name="lead_status"
                                        value={formData.lead_status}
                                        onChange={handleChange}
                                        className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                                    >
                                        {leadStatuses.map(s => (
                                            <option key={s.value} value={s.value}>{s.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                        Fuente
                                    </label>
                                    <select
                                        name="lead_source"
                                        value={formData.lead_source}
                                        onChange={handleChange}
                                        className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                                    >
                                        {leadSources.map(s => (
                                            <option key={s.value} value={s.value}>{s.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Work Tab */}
                    {activeTab === 'work' && (
                        <>
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

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                        Cargo
                                    </label>
                                    <input
                                        type="text"
                                        name="job_title"
                                        value={formData.job_title}
                                        onChange={handleChange}
                                        placeholder="Ej: Director Comercial"
                                        className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                        Departamento
                                    </label>
                                    <input
                                        type="text"
                                        name="department"
                                        value={formData.department}
                                        onChange={handleChange}
                                        placeholder="Ej: Ventas"
                                        className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                    LinkedIn
                                </label>
                                <input
                                    type="url"
                                    name="linkedin_url"
                                    value={formData.linkedin_url}
                                    onChange={handleChange}
                                    placeholder="https://linkedin.com/in/..."
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                                />
                            </div>
                        </>
                    )}

                    {/* Address Tab */}
                    {activeTab === 'address' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                    Dirección
                                </label>
                                <input
                                    type="text"
                                    name="address_street"
                                    value={formData.address_street}
                                    onChange={handleChange}
                                    placeholder="Calle, número, piso..."
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                        Ciudad
                                    </label>
                                    <input
                                        type="text"
                                        name="address_city"
                                        value={formData.address_city}
                                        onChange={handleChange}
                                        placeholder="Ciudad"
                                        className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                        Provincia
                                    </label>
                                    <input
                                        type="text"
                                        name="address_state"
                                        value={formData.address_state}
                                        onChange={handleChange}
                                        placeholder="Provincia"
                                        className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                        Código Postal
                                    </label>
                                    <input
                                        type="text"
                                        name="address_zip"
                                        value={formData.address_zip}
                                        onChange={handleChange}
                                        placeholder="00000"
                                        className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                        País
                                    </label>
                                    <input
                                        type="text"
                                        name="address_country"
                                        value={formData.address_country}
                                        onChange={handleChange}
                                        placeholder="País"
                                        className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {/* Preferences Tab */}
                    {activeTab === 'preferences' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                    Método de contacto preferido
                                </label>
                                <select
                                    name="preferred_contact_method"
                                    value={formData.preferred_contact_method}
                                    onChange={handleChange}
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                                >
                                    <option value="email">Email</option>
                                    <option value="phone">Teléfono</option>
                                    <option value="whatsapp">WhatsApp</option>
                                </select>
                            </div>

                            <div className="space-y-3">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name="do_not_call"
                                        checked={formData.do_not_call}
                                        onChange={handleChange}
                                        className="w-5 h-5 rounded border-slate-600 bg-slate-900 text-indigo-500 focus:ring-indigo-500/50"
                                    />
                                    <span className="text-slate-300">No llamar</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name="do_not_email"
                                        checked={formData.do_not_email}
                                        onChange={handleChange}
                                        className="w-5 h-5 rounded border-slate-600 bg-slate-900 text-indigo-500 focus:ring-indigo-500/50"
                                    />
                                    <span className="text-slate-300">No enviar emails</span>
                                </label>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                    Notas
                                </label>
                                <textarea
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleChange}
                                    rows={4}
                                    placeholder="Notas sobre el contacto..."
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all resize-none"
                                />
                            </div>
                        </>
                    )}

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
                                {isEditing ? 'Guardar Cambios' : 'Crear Contacto'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ContactModal;
