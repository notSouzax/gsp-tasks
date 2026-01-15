import React, { useState, useEffect, useCallback } from 'react';
import { Icons } from '../../ui/Icons';

const CompanyModal = ({ company, onClose, onSave, onDelete }) => {
    const isEditing = !!company;
    const [saving, setSaving] = useState(false);
    const [emailError, setEmailError] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        legal_name: '',
        tax_id: '',
        email: '',
        phone: '',
        website: '',
        address_street: '',
        address_city: '',
        address_state: '',
        address_zip: '',
        address_country: 'España',
        industry: '',
        company_size: '',
        annual_revenue: '',
        linkedin_url: '',
        source: '',
        notes: '',
        is_customer: false,
        is_supplier: false,
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
        if (company) {
            setFormData({
                name: company.name || '',
                legal_name: company.legal_name || '',
                tax_id: company.tax_id || '',
                email: company.email || '',
                phone: company.phone || '',
                website: company.website || '',
                address_street: company.address_street || '',
                address_city: company.address_city || '',
                address_state: company.address_state || '',
                address_zip: company.address_zip || '',
                address_country: company.address_country || 'España',
                industry: company.industry || '',
                company_size: company.company_size || '',
                annual_revenue: company.annual_revenue || '',
                linkedin_url: company.linkedin_url || '',
                source: company.source || '',
                notes: company.notes || '',
                is_customer: company.is_customer || false,
                is_supplier: company.is_supplier || false,
            });
        }
    }, [company]);

    const validateEmail = (email) => {
        if (!email) return true;
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        if (name === 'email') {
            setEmailError('');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim() || saving) return;

        if (formData.email && !validateEmail(formData.email)) {
            setEmailError('Email no válido');
            return;
        }

        setSaving(true);
        const data = {
            ...formData,
            annual_revenue: parseFloat(formData.annual_revenue) || null,
        };

        try {
            await onSave(data);
        } finally {
            setSaving(false);
        }
    };

    const industries = [
        { value: '', label: 'Seleccionar...' },
        { value: 'technology', label: 'Tecnología' },
        { value: 'healthcare', label: 'Salud' },
        { value: 'finance', label: 'Finanzas' },
        { value: 'retail', label: 'Retail' },
        { value: 'manufacturing', label: 'Manufactura' },
        { value: 'construction', label: 'Construcción' },
        { value: 'education', label: 'Educación' },
        { value: 'hospitality', label: 'Hostelería' },
        { value: 'professional_services', label: 'Servicios Profesionales' },
        { value: 'real_estate', label: 'Inmobiliaria' },
        { value: 'logistics', label: 'Logística' },
        { value: 'energy', label: 'Energía' },
        { value: 'media', label: 'Medios' },
        { value: 'other', label: 'Otro' },
    ];

    const companySizes = [
        { value: '', label: 'Seleccionar...' },
        { value: '1-10', label: '1-10 empleados' },
        { value: '11-50', label: '11-50 empleados' },
        { value: '51-200', label: '51-200 empleados' },
        { value: '201-500', label: '201-500 empleados' },
        { value: '500+', label: 'Más de 500 empleados' },
    ];

    const tabs = [
        { id: 'basic', label: 'Básico', icon: 'business' },
        { id: 'details', label: 'Detalles', icon: 'info' },
        { id: 'address', label: 'Dirección', icon: 'location_on' },
    ];

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#1e293b] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-white/10">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-white/10 bg-slate-800/50">
                    <h2 className="text-xl font-bold text-white">
                        {isEditing ? 'Editar Empresa' : 'Nueva Empresa'}
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
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                    Nombre Comercial *
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="Nombre de la empresa"
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                        Razón Social
                                    </label>
                                    <input
                                        type="text"
                                        name="legal_name"
                                        value={formData.legal_name}
                                        onChange={handleChange}
                                        placeholder="Razón social"
                                        className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                        NIF/CIF
                                    </label>
                                    <input
                                        type="text"
                                        name="tax_id"
                                        value={formData.tax_id}
                                        onChange={handleChange}
                                        placeholder="B12345678"
                                        className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="info@empresa.com"
                                        className={`w-full bg-slate-900/50 border rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all ${emailError ? 'border-red-500' : 'border-slate-700'}`}
                                    />
                                    {emailError && (
                                        <p className="text-red-400 text-xs mt-1">{emailError}</p>
                                    )}
                                </div>
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
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                    Sitio Web
                                </label>
                                <input
                                    type="url"
                                    name="website"
                                    value={formData.website}
                                    onChange={handleChange}
                                    placeholder="https://www.empresa.com"
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                                />
                            </div>

                            <div className="flex gap-6 pt-2">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name="is_customer"
                                        checked={formData.is_customer}
                                        onChange={handleChange}
                                        className="w-5 h-5 rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-500/50"
                                    />
                                    <span className="text-slate-300">Es Cliente</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name="is_supplier"
                                        checked={formData.is_supplier}
                                        onChange={handleChange}
                                        className="w-5 h-5 rounded border-slate-600 bg-slate-900 text-blue-500 focus:ring-blue-500/50"
                                    />
                                    <span className="text-slate-300">Es Proveedor</span>
                                </label>
                            </div>
                        </>
                    )}

                    {/* Details Tab */}
                    {activeTab === 'details' && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                        Sector/Industria
                                    </label>
                                    <select
                                        name="industry"
                                        value={formData.industry}
                                        onChange={handleChange}
                                        className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                                    >
                                        {industries.map(i => (
                                            <option key={i.value} value={i.value}>{i.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                        Tamaño de Empresa
                                    </label>
                                    <select
                                        name="company_size"
                                        value={formData.company_size}
                                        onChange={handleChange}
                                        className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                                    >
                                        {companySizes.map(s => (
                                            <option key={s.value} value={s.value}>{s.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                    Ingresos Anuales Estimados (€)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">€</span>
                                    <input
                                        type="number"
                                        name="annual_revenue"
                                        value={formData.annual_revenue}
                                        onChange={handleChange}
                                        placeholder="0"
                                        min="0"
                                        className="w-full bg-slate-900/50 border border-slate-700 rounded-lg pl-8 pr-4 py-2.5 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
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
                                    placeholder="https://linkedin.com/company/..."
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                                />
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
                                    placeholder="Notas sobre la empresa..."
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all resize-none"
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
                                {isEditing ? 'Guardar Cambios' : 'Crear Empresa'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CompanyModal;
