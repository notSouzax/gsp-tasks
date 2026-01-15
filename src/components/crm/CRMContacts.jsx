import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import ContactModal from './modals/ContactModal';
import { Icons } from '../ui/Icons';
import toast from 'react-hot-toast';

const CRMContacts = () => {
    const { contacts, createContact, updateContact, deleteContact } = useCRM();
    const [showModal, setShowModal] = useState(false);
    const [editingContact, setEditingContact] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'

    const leadStatuses = [
        { value: 'new', label: 'Nuevo', color: 'bg-blue-500' },
        { value: 'contacted', label: 'Contactado', color: 'bg-purple-500' },
        { value: 'qualified', label: 'Cualificado', color: 'bg-indigo-500' },
        { value: 'proposal', label: 'Propuesta', color: 'bg-amber-500' },
        { value: 'negotiation', label: 'Negociación', color: 'bg-orange-500' },
        { value: 'won', label: 'Ganado', color: 'bg-emerald-500' },
        { value: 'lost', label: 'Perdido', color: 'bg-red-500' },
    ];

    // Filter contacts
    const filteredContacts = contacts.filter(contact => {
        const matchesSearch =
            `${contact.first_name} ${contact.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
            contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            contact.company?.name?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'all' || contact.lead_status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const handleCreate = () => {
        setEditingContact(null);
        setShowModal(true);
    };

    const handleEdit = (contact) => {
        setEditingContact(contact);
        setShowModal(true);
    };

    const handleSave = async (data) => {
        try {
            if (editingContact) {
                await updateContact(editingContact.id, data);
                toast.success('Contacto actualizado');
            } else {
                await createContact(data);
                toast.success('Contacto creado');
            }
            setShowModal(false);
            setEditingContact(null);
        } catch {
            toast.error('Error al guardar contacto');
        }
    };

    const handleDelete = async () => {
        if (!editingContact) return;
        try {
            await deleteContact(editingContact.id);
            toast.success('Contacto eliminado');
            setShowModal(false);
            setEditingContact(null);
        } catch {
            toast.error('Error al eliminar');
        }
    };

    const getStatusBadge = (status) => {
        const statusConfig = leadStatuses.find(s => s.value === status);
        return statusConfig || { label: status, color: 'bg-slate-500' };
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
                            placeholder="Buscar contactos..."
                            className="w-80 bg-slate-800/50 border border-slate-700/50 rounded-lg pl-10 pr-4 py-2 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none"
                    >
                        <option value="all">Todos los estados</option>
                        {leadStatuses.map(s => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex border border-slate-700 rounded-lg overflow-hidden">
                        <button
                            onClick={() => setViewMode('table')}
                            className={`p-2 ${viewMode === 'table' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:bg-slate-700'}`}
                        >
                            <span className="material-symbols-outlined text-[18px]">table_rows</span>
                        </button>
                        <button
                            onClick={() => setViewMode('cards')}
                            className={`p-2 ${viewMode === 'cards' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:bg-slate-700'}`}
                        >
                            <span className="material-symbols-outlined text-[18px]">grid_view</span>
                        </button>
                    </div>
                    <button
                        onClick={handleCreate}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors shadow-lg shadow-indigo-500/20"
                    >
                        <Icons.Plus size={18} />
                        Nuevo Contacto
                    </button>
                </div>
            </div>

            {/* Stats Row */}
            <div className="flex gap-4 mb-6">
                <div className="bg-slate-800/50 rounded-lg px-4 py-3 border border-white/5">
                    <div className="text-2xl font-bold text-white">{contacts.length}</div>
                    <div className="text-xs text-slate-400">Total Contactos</div>
                </div>
                {leadStatuses.slice(0, 4).map(status => {
                    const count = contacts.filter(c => c.lead_status === status.value).length;
                    return (
                        <div key={status.value} className="bg-slate-800/50 rounded-lg px-4 py-3 border border-white/5">
                            <div className="text-2xl font-bold text-white">{count}</div>
                            <div className="text-xs text-slate-400">{status.label}</div>
                        </div>
                    );
                })}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto">
                {viewMode === 'table' ? (
                    <div className="bg-slate-800/30 rounded-xl border border-white/5 overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-slate-800/50">
                                <tr>
                                    <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">Contacto</th>
                                    <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">Empresa</th>
                                    <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">Teléfono</th>
                                    <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">Estado</th>
                                    <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">Fuente</th>
                                    <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredContacts.map(contact => (
                                    <tr
                                        key={contact.id}
                                        className="hover:bg-slate-700/30 cursor-pointer transition-colors"
                                        onClick={() => handleEdit(contact)}
                                    >
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                                                    {contact.first_name?.charAt(0)}{contact.last_name?.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-white">{contact.first_name} {contact.last_name}</div>
                                                    <div className="text-sm text-slate-400">{contact.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-slate-300">{contact.company?.name || '-'}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-slate-300">{contact.phone || contact.mobile || '-'}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(contact.lead_status).color} bg-opacity-20`}>
                                                {getStatusBadge(contact.lead_status).label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-slate-400 text-sm">{contact.lead_source || '-'}</span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleEdit(contact); }}
                                                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-600 rounded-lg transition-colors"
                                            >
                                                <Icons.Edit size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredContacts.length === 0 && (
                            <div className="text-center py-12 text-slate-500">
                                No se encontraron contactos
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredContacts.map(contact => (
                            <div
                                key={contact.id}
                                onClick={() => handleEdit(contact)}
                                className="bg-slate-800/50 rounded-xl border border-white/5 p-4 hover:border-indigo-500/30 cursor-pointer transition-all"
                            >
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                        {contact.first_name?.charAt(0)}{contact.last_name?.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-white truncate">{contact.first_name} {contact.last_name}</div>
                                        <div className="text-sm text-slate-400 truncate">{contact.job_title || 'Sin cargo'}</div>
                                    </div>
                                </div>
                                <div className="space-y-2 text-sm">
                                    {contact.email && (
                                        <div className="flex items-center gap-2 text-slate-400">
                                            <Icons.Mail size={14} />
                                            <span className="truncate">{contact.email}</span>
                                        </div>
                                    )}
                                    {contact.phone && (
                                        <div className="flex items-center gap-2 text-slate-400">
                                            <Icons.Phone size={14} />
                                            <span>{contact.phone}</span>
                                        </div>
                                    )}
                                    {contact.company && (
                                        <div className="flex items-center gap-2 text-slate-400">
                                            <Icons.Building size={14} />
                                            <span className="truncate">{contact.company.name}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="mt-3 pt-3 border-t border-white/5">
                                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(contact.lead_status).color} bg-opacity-20`}>
                                        {getStatusBadge(contact.lead_status).label}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {filteredContacts.length === 0 && viewMode === 'cards' && (
                    <div className="text-center py-12 text-slate-500">
                        No se encontraron contactos
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <ContactModal
                    contact={editingContact}
                    onClose={() => { setShowModal(false); setEditingContact(null); }}
                    onSave={handleSave}
                    onDelete={editingContact ? handleDelete : null}
                />
            )}
        </div>
    );
};

export default CRMContacts;
