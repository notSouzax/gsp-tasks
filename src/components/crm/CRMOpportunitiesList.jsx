import React, { useState, useMemo } from 'react';
import { useCRM } from '../../context/CRMContext';
import { Icons } from '../ui/Icons';

// SortHeader component - defined outside to avoid recreating during render
const SortHeader = ({ field, children, sortField, sortDir, onSort }) => (
    <th
        onClick={() => onSort(field)}
        className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
    >
        <div className="flex items-center gap-1">
            {children}
            {sortField === field && (
                <Icons.ChevronDown
                    size={14}
                    className={`transition-transform ${sortDir === 'asc' ? 'rotate-180' : ''}`}
                />
            )}
        </div>
    </th>
);

const CRMOpportunitiesList = ({ onEdit, onDelete }) => {
    const { opportunities, activeStages } = useCRM();

    const [sortField, setSortField] = useState('created_at');
    const [sortDir, setSortDir] = useState('desc');
    const [filterStage, setFilterStage] = useState('all');
    const [filterPriority, setFilterPriority] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    // Filtered and sorted opportunities
    const filteredOpportunities = useMemo(() => {
        let result = [...opportunities];

        // Filter by stage
        if (filterStage !== 'all') {
            result = result.filter(o => o.stage_id === filterStage);
        }

        // Filter by priority
        if (filterPriority !== 'all') {
            result = result.filter(o => o.priority === filterPriority);
        }

        // Filter by search
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(o =>
                o.name?.toLowerCase().includes(term) ||
                o.contact?.first_name?.toLowerCase().includes(term) ||
                o.contact?.last_name?.toLowerCase().includes(term) ||
                o.company?.name?.toLowerCase().includes(term)
            );
        }

        // Sort
        result.sort((a, b) => {
            let aVal = a[sortField];
            let bVal = b[sortField];

            // Handle null values
            if (aVal === null || aVal === undefined) aVal = '';
            if (bVal === null || bVal === undefined) bVal = '';

            // Handle dates
            if (sortField.includes('date') || sortField === 'created_at') {
                aVal = new Date(aVal || 0).getTime();
                bVal = new Date(bVal || 0).getTime();
            }

            // Handle numbers
            if (sortField === 'expected_revenue' || sortField === 'probability') {
                aVal = parseFloat(aVal) || 0;
                bVal = parseFloat(bVal) || 0;
            }

            if (sortDir === 'asc') {
                return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
            } else {
                return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
            }
        });

        return result;
    }, [opportunities, filterStage, filterPriority, searchTerm, sortField, sortDir]);

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('desc');
        }
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value || 0);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const priorityColors = {
        low: 'bg-slate-500/20 text-slate-400',
        medium: 'bg-blue-500/20 text-blue-400',
        high: 'bg-amber-500/20 text-amber-400',
        urgent: 'bg-red-500/20 text-red-400',
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* Filters */}
            <div className="flex items-center gap-4 p-4 border-b border-white/5">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                    <Icons.Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar oportunidades..."
                        className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg pl-10 pr-4 py-2 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                    />
                </div>

                {/* Stage filter */}
                <select
                    value={filterStage}
                    onChange={(e) => setFilterStage(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                    className="bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none"
                >
                    <option value="all">Todas las etapas</option>
                    {activeStages.map(stage => (
                        <option key={stage.id} value={stage.id}>{stage.name}</option>
                    ))}
                </select>

                {/* Priority filter */}
                <select
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                    className="bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none"
                >
                    <option value="all">Todas las prioridades</option>
                    <option value="urgent">Urgente</option>
                    <option value="high">Alta</option>
                    <option value="medium">Media</option>
                    <option value="low">Baja</option>
                </select>

                {/* Count */}
                <div className="text-sm text-slate-400">
                    {filteredOpportunities.length} oportunidades
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
                <table className="w-full">
                    <thead className="bg-slate-800/50 sticky top-0">
                        <tr>
                            <SortHeader field="name" sortField={sortField} sortDir={sortDir} onSort={handleSort}>Nombre</SortHeader>
                            <SortHeader field="expected_revenue" sortField={sortField} sortDir={sortDir} onSort={handleSort}>Valor</SortHeader>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Etapa</th>
                            <SortHeader field="probability" sortField={sortField} sortDir={sortDir} onSort={handleSort}>Prob.</SortHeader>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Contacto</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Empresa</th>
                            <SortHeader field="expected_close_date" sortField={sortField} sortDir={sortDir} onSort={handleSort}>Cierre</SortHeader>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Prioridad</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filteredOpportunities.map(opp => (
                            <tr
                                key={opp.id}
                                className="hover:bg-slate-800/30 transition-colors"
                            >
                                <td className="px-4 py-3">
                                    <div className="font-medium text-white">{opp.name}</div>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="text-emerald-400 font-semibold">
                                        {formatCurrency(opp.expected_revenue)}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <span
                                        className="px-2 py-1 rounded text-xs font-medium"
                                        style={{
                                            backgroundColor: `${opp.stage?.color}20`,
                                            color: opp.stage?.color
                                        }}
                                    >
                                        {opp.stage?.name || '-'}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-12 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-indigo-500 rounded-full"
                                                style={{ width: `${opp.probability || 0}%` }}
                                            />
                                        </div>
                                        <span className="text-xs text-slate-400">{opp.probability || 0}%</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-300">
                                    {opp.contact ? `${opp.contact.first_name} ${opp.contact.last_name || ''}`.trim() : '-'}
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-300">
                                    {opp.company?.name || '-'}
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-400">
                                    {formatDate(opp.expected_close_date)}
                                </td>
                                <td className="px-4 py-3">
                                    {opp.priority && (
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityColors[opp.priority]}`}>
                                            {opp.priority === 'urgent' ? 'Urgente' :
                                                opp.priority === 'high' ? 'Alta' :
                                                    opp.priority === 'medium' ? 'Media' : 'Baja'}
                                        </span>
                                    )}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center justify-end gap-1">
                                        <button
                                            onClick={() => onEdit?.(opp)}
                                            className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors"
                                            title="Editar"
                                        >
                                            <Icons.Edit size={16} />
                                        </button>
                                        <button
                                            onClick={() => onDelete?.(opp)}
                                            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                            title="Eliminar"
                                        >
                                            <Icons.Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {filteredOpportunities.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                        <Icons.Search size={48} className="mb-4 opacity-50" />
                        <p>No se encontraron oportunidades</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CRMOpportunitiesList;
