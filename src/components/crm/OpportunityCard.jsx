import React from 'react';
import { Icons } from '../ui/Icons';

const OpportunityCard = ({ opportunity, onClick, onEdit, onDelete, isOverlay = false }) => {
    const {
        name,
        expected_revenue,
        probability,
        expected_close_date,
        contact,
        company,
        priority
    } = opportunity;

    const priorityColors = {
        low: 'bg-slate-500/20 text-slate-400',
        medium: 'bg-blue-500/20 text-blue-400',
        high: 'bg-amber-500/20 text-amber-400',
        urgent: 'bg-red-500/20 text-red-400',
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
        if (!dateStr) return null;
        const date = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.ceil((date - now) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return { text: 'Vencido', class: 'text-red-400' };
        if (diffDays === 0) return { text: 'Hoy', class: 'text-amber-400' };
        if (diffDays === 1) return { text: 'Mañana', class: 'text-amber-400' };
        if (diffDays <= 7) return { text: `${diffDays} días`, class: 'text-blue-400' };
        return {
            text: date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
            class: 'text-slate-400'
        };
    };

    const closeDate = formatDate(expected_close_date);

    return (
        <div
            onClick={onClick}
            className={`
                bg-[var(--bg-elevated)] dark:bg-slate-800/50 rounded-lg p-3 border border-[var(--border-subtle)] shadow-[var(--shadow-sm)]
                hover:border-indigo-500/30 hover:shadow-[var(--shadow-md)]
                cursor-pointer transition-all group
                ${isOverlay ? 'shadow-2xl shadow-black/50 rotate-2 scale-105' : ''}
            `}
        >
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-2">
                <h4 className="font-medium text-[var(--text-primary)] text-sm leading-tight line-clamp-2 flex-1">
                    {name}
                </h4>
                <div className="flex items-center gap-1 shrink-0">
                    {/* Action buttons - visible on hover (left of priority) */}
                    {!isOverlay && (
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            {onEdit && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onEdit(opportunity); }}
                                    className="p-1 text-[var(--text-secondary)] hover:text-blue-500 hover:bg-blue-500/10 rounded transition-colors"
                                    title="Editar"
                                >
                                    <Icons.Edit size={14} />
                                </button>
                            )}
                            {onDelete && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDelete(opportunity); }}
                                    className="p-1 text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                                    title="Eliminar"
                                >
                                    <Icons.Trash2 size={14} />
                                </button>
                            )}
                        </div>
                    )}
                    {/* Priority badge (far right) */}
                    {priority && priority !== 'medium' && (
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium uppercase ${priorityColors[priority]}`}>
                            {priority === 'urgent' ? '🔥' : priority === 'high' ? '⬆️' : '⬇️'}
                        </span>
                    )}
                </div>
            </div>

            {/* Value & Probability */}
            <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center gap-1.5">
                    <Icons.DollarSign size={14} className="text-emerald-400" />
                    <span className="text-emerald-400 font-semibold text-sm">
                        {formatCurrency(expected_revenue)}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-indigo-500 rounded-full transition-all"
                            style={{ width: `${probability || 0}%` }}
                        />
                    </div>
                    <span className="text-xs text-[var(--text-secondary)]">{probability || 0}%</span>
                </div>
            </div>

            {/* Contact/Company */}
            {(contact || company) && (
                <div className="flex items-center gap-2 mb-2 text-xs text-[var(--text-secondary)]">
                    {contact && (
                        <div className="flex items-center gap-1 truncate">
                            <Icons.User size={12} />
                            <span className="truncate">{contact.first_name} {contact.last_name}</span>
                        </div>
                    )}
                    {company && (
                        <div className="flex items-center gap-1 truncate">
                            <Icons.Building size={12} />
                            <span className="truncate">{company.name}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Footer */}
            {closeDate && (
                <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
                    <div className={`flex items-center gap-1 text-xs ${closeDate.class}`}>
                        <Icons.Calendar size={12} />
                        <span>Cierre: {closeDate.text}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OpportunityCard;
