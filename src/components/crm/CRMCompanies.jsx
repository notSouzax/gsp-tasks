import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import CompanyModal from './modals/CompanyModal';
import { Icons } from '../ui/Icons';
import toast from 'react-hot-toast';

const CRMCompanies = () => {
    const { companies, contacts, createCompany, updateCompany, deleteCompany } = useCRM();
    const [showModal, setShowModal] = useState(false);
    const [editingCompany, setEditingCompany] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');

    // Filter companies
    const filteredCompanies = companies.filter(company => {
        const matchesSearch =
            company.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            company.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            company.industry?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesType =
            typeFilter === 'all' ||
            (typeFilter === 'customer' && company.is_customer) ||
            (typeFilter === 'supplier' && company.is_supplier) ||
            (typeFilter === 'prospect' && !company.is_customer && !company.is_supplier);

        return matchesSearch && matchesType;
    });

    // Get contact count per company
    const getContactCount = (companyId) => {
        return contacts.filter(c => c.company_id === companyId).length;
    };

    const handleCreate = () => {
        setEditingCompany(null);
        setShowModal(true);
    };

    const handleEdit = (company) => {
        setEditingCompany(company);
        setShowModal(true);
    };

    const handleSave = async (data) => {
        try {
            if (editingCompany) {
                await updateCompany(editingCompany.id, data);
                toast.success('Empresa actualizada');
            } else {
                await createCompany(data);
                toast.success('Empresa creada');
            }
            setShowModal(false);
            setEditingCompany(null);
        } catch {
            toast.error('Error al guardar empresa');
        }
    };

    const handleDelete = async () => {
        if (!editingCompany) return;
        try {
            await deleteCompany(editingCompany.id);
            toast.success('Empresa eliminada');
            setShowModal(false);
            setEditingCompany(null);
        } catch {
            toast.error('Error al eliminar');
        }
    };

    const formatCurrency = (value) => {
        if (!value) return '-';
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR',
            notation: 'compact',
            maximumFractionDigits: 1
        }).format(value);
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Icons.Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar empresas..."
                            className="w-80 bg-slate-800/50 border border-slate-700/50 rounded-lg pl-10 pr-4 py-2 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                        />
                    </div>
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none"
                    >
                        <option value="all">Todas</option>
                        <option value="customer">Clientes</option>
                        <option value="supplier">Proveedores</option>
                        <option value="prospect">Prospectos</option>
                    </select>
                </div>

                <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors shadow-lg shadow-indigo-500/20"
                >
                    <Icons.Plus size={18} />
                    Nueva Empresa
                </button>
            </div>

            {/* Stats */}
            <div className="flex gap-4 mb-6">
                <div className="bg-slate-800/50 rounded-lg px-4 py-3 border border-white/5">
                    <div className="text-2xl font-bold text-white">{companies.length}</div>
                    <div className="text-xs text-slate-400">Total Empresas</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg px-4 py-3 border border-white/5">
                    <div className="text-2xl font-bold text-emerald-400">{companies.filter(c => c.is_customer).length}</div>
                    <div className="text-xs text-slate-400">Clientes</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg px-4 py-3 border border-white/5">
                    <div className="text-2xl font-bold text-blue-400">{companies.filter(c => c.is_supplier).length}</div>
                    <div className="text-xs text-slate-400">Proveedores</div>
                </div>
            </div>

            {/* Companies Grid */}
            <div className="flex-1 overflow-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredCompanies.map(company => (
                        <div
                            key={company.id}
                            onClick={() => handleEdit(company)}
                            className="bg-slate-800/50 rounded-xl border border-white/5 p-5 hover:border-indigo-500/30 cursor-pointer transition-all group"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                                        {company.name?.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-white group-hover:text-indigo-400 transition-colors">{company.name}</h3>
                                        <p className="text-sm text-slate-400">{company.industry || 'Sin sector'}</p>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    {company.is_customer && (
                                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-xs font-medium">Cliente</span>
                                    )}
                                    {company.is_supplier && (
                                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs font-medium">Proveedor</span>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2 text-sm">
                                {company.email && (
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <Icons.Mail size={14} />
                                        <span className="truncate">{company.email}</span>
                                    </div>
                                )}
                                {company.phone && (
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <Icons.Phone size={14} />
                                        <span>{company.phone}</span>
                                    </div>
                                )}
                                {company.website && (
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <span className="material-symbols-outlined text-[14px]">language</span>
                                        <span className="truncate">{company.website}</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                                <div className="flex items-center gap-1 text-slate-400 text-sm">
                                    <Icons.Users size={14} />
                                    <span>{getContactCount(company.id)} contactos</span>
                                </div>
                                {company.annual_revenue && (
                                    <div className="text-sm text-emerald-400 font-medium">
                                        {formatCurrency(company.annual_revenue)}/año
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {filteredCompanies.length === 0 && (
                    <div className="text-center py-12 text-slate-500">
                        No se encontraron empresas
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <CompanyModal
                    company={editingCompany}
                    onClose={() => { setShowModal(false); setEditingCompany(null); }}
                    onSave={handleSave}
                    onDelete={editingCompany ? handleDelete : null}
                />
            )}
        </div>
    );
};

export default CRMCompanies;
