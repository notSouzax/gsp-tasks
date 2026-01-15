import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useCRM } from '../../context/CRMContext';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createPortal } from 'react-dom';
import OpportunityCard from './OpportunityCard';
import OpportunityModal from './modals/OpportunityModal';
import PipelineModal from './modals/PipelineModal';
import CRMOpportunitiesList from './CRMOpportunitiesList';
import { Icons } from '../ui/Icons';
import ConfirmationModal from '../modals/ConfirmationModal';
import toast from 'react-hot-toast';

const CRMKanban = () => {
    const {
        pipelines,
        activePipelineId,
        activePipeline,
        setActivePipelineId,
        activeStages,
        opportunities,
        moveOpportunity,
        createOpportunity,
        updateOpportunity,
        deleteOpportunity,
        createPipeline,
        updatePipeline,
        deletePipeline
    } = useCRM();

    const [activeDragItem, setActiveDragItem] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [editingOpp, setEditingOpp] = useState(null);
    const [creatingInStage, setCreatingInStage] = useState(null);

    // Confirmation State
    const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, title: '', message: '', action: null });

    // Pipeline state
    const [showPipelineDropdown, setShowPipelineDropdown] = useState(false);
    const [showPipelineModal, setShowPipelineModal] = useState(false);
    const [editingPipeline, setEditingPipeline] = useState(null);
    const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'list'
    const dropdownRef = useRef(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setShowPipelineDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // Group opportunities by stage
    const opportunitiesByStage = useMemo(() => {
        const grouped = {};
        activeStages.forEach(stage => {
            grouped[stage.id] = opportunities
                .filter(o => o.stage_id === stage.id)
                .sort((a, b) => a.position - b.position);
        });
        return grouped;
    }, [activeStages, opportunities]);

    const handleDragStart = (event) => {
        const opp = opportunities.find(o => o.id === event.active.id);
        setActiveDragItem(opp);
    };

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        setActiveDragItem(null);

        if (!over) return;

        const activeOpp = opportunities.find(o => o.id === active.id);
        if (!activeOpp) return;

        // Determine target stage
        let targetStageId = null;
        let targetPosition = 0;

        // Check if dropped on a stage header or empty column
        if (String(over.id).startsWith('stage-')) {
            targetStageId = Number(String(over.id).replace('stage-', ''));
            targetPosition = (opportunitiesByStage[targetStageId] || []).length;
        } else {
            // Dropped on another opportunity
            const overOpp = opportunities.find(o => o.id === over.id);
            if (overOpp) {
                targetStageId = overOpp.stage_id;
                const stageOpps = opportunitiesByStage[targetStageId] || [];
                targetPosition = stageOpps.findIndex(o => o.id === over.id);
            }
        }

        if (targetStageId && (targetStageId !== activeOpp.stage_id || targetPosition !== activeOpp.position)) {
            try {
                await moveOpportunity(activeOpp.id, targetStageId, targetPosition);

                // Check if moved to won/lost stage
                const targetStage = activeStages.find(s => s.id === targetStageId);
                if (targetStage?.is_won) {
                    toast.success(`🎉 ¡Oportunidad "${activeOpp.name}" ganada!`);
                } else if (targetStage?.is_lost) {
                    toast('Oportunidad marcada como perdida', { icon: '😔' });
                }
            } catch {
                toast.error('Error al mover oportunidad');
            }
        }
    };

    const handleCreateOpp = (stageId) => {
        setCreatingInStage(stageId);
        setEditingOpp(null);
        setShowModal(true);
    };

    const handleEditOpp = (opp) => {
        setEditingOpp(opp);
        setCreatingInStage(null);
        setShowModal(true);
    };

    const handleSaveOpp = async (oppData) => {
        try {
            if (editingOpp) {
                await updateOpportunity(editingOpp.id, oppData);
                toast.success('Oportunidad actualizada');
            } else {
                await createOpportunity({ ...oppData, stage_id: creatingInStage });
                toast.success('Oportunidad creada');
            }
            setShowModal(false);
            setEditingOpp(null);
            setCreatingInStage(null);
        } catch {
            toast.error('Error al guardar oportunidad');
        }
    };

    const handleDeleteOpp = (oppId) => {
        setConfirmConfig({
            isOpen: true,
            title: 'Eliminar Oportunidad',
            message: '¿Estás seguro de que quieres eliminar esta oportunidad? Esta acción no se puede deshacer.',
            action: async () => {
                try {
                    await deleteOpportunity(oppId);
                    toast.success('Oportunidad eliminada');
                    setShowModal(false);
                } catch {
                    toast.error('Error al eliminar');
                } finally {
                    setConfirmConfig({ isOpen: false, title: '', message: '', action: null });
                }
            },
            isDanger: true
        });
    };

    // Pipeline handlers
    const handleCreatePipeline = () => {
        setEditingPipeline(null);
        setShowPipelineModal(true);
        setShowPipelineDropdown(false);
    };

    const handleEditPipeline = () => {
        setEditingPipeline(activePipeline);
        setShowPipelineModal(true);
        setShowPipelineDropdown(false);
    };

    const handleSavePipeline = async (pipelineData) => {
        try {
            if (editingPipeline) {
                await updatePipeline(editingPipeline.id, pipelineData);
                toast.success('Pipeline actualizado');
            } else {
                const newPipeline = await createPipeline(pipelineData);
                setActivePipelineId(newPipeline.id);
                toast.success('Pipeline creado');
            }
            setShowPipelineModal(false);
            setEditingPipeline(null);
        } catch (err) {
            toast.error(err.message || 'Error al guardar pipeline');
        }
    };

    const handleDeletePipeline = async () => {
        try {
            await deletePipeline(editingPipeline.id);
            toast.success('Pipeline eliminado');
            setShowPipelineModal(false);
            setEditingPipeline(null);
        } catch (err) {
            toast.error(err.message || 'Error al eliminar pipeline');
        }
    };

    const handleSelectPipeline = (pipelineId) => {
        setActivePipelineId(pipelineId);
        setShowPipelineDropdown(false);
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header con selector de pipeline y botón global */}
                <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]/30 dark:bg-slate-900/30">
                    {/* Pipeline Selector */}
                    <div className="flex items-center gap-4">
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setShowPipelineDropdown(!showPipelineDropdown)}
                                className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] dark:bg-slate-800/50 dark:hover:bg-slate-700/50 border border-[var(--border-default)] rounded-lg transition-colors"
                            >
                                <Icons.GitBranch size={16} className="text-indigo-400" />
                                <span className="font-medium text-[var(--text-primary)]">{activePipeline?.name || 'Pipeline'}</span>
                                <Icons.ChevronDown size={14} className={`text-[var(--text-secondary)] transition-transform ${showPipelineDropdown ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Dropdown */}
                            {showPipelineDropdown && (
                                <div className="absolute top-full left-0 mt-2 w-64 bg-[var(--bg-secondary)] dark:bg-slate-800 border border-[var(--border-default)] rounded-xl shadow-[var(--shadow-xl)] z-50 overflow-hidden">
                                    <div className="p-2 border-b border-[var(--border-subtle)]">
                                        <div className="text-xs font-medium text-[var(--text-secondary)] px-2 py-1">Pipelines</div>
                                    </div>
                                    <div className="max-h-64 overflow-y-auto">
                                        {pipelines.map(pipeline => (
                                            <button
                                                key={pipeline.id}
                                                onClick={() => handleSelectPipeline(pipeline.id)}
                                                className={`w-full flex items-center justify-between px-3 py-2 hover:bg-[var(--bg-tertiary)] dark:hover:bg-white/5 transition-colors ${pipeline.id === activePipelineId ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'text-[var(--text-primary)]'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Icons.GitBranch size={14} />
                                                    <span>{pipeline.name}</span>
                                                    {pipeline.is_default && (
                                                        <span className="text-xs px-1.5 py-0.5 bg-indigo-500/20 text-indigo-400 rounded">Default</span>
                                                    )}
                                                </div>
                                                {pipeline.id === activePipelineId && (
                                                    <Icons.Check size={14} className="text-indigo-400" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="p-2 border-t border-[var(--border-subtle)] flex gap-2">
                                        <button
                                            onClick={handleCreatePipeline}
                                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                                        >
                                            <Icons.Plus size={14} />
                                            Nuevo
                                        </button>
                                        <button
                                            onClick={handleEditPipeline}
                                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] dark:hover:bg-white/5 rounded-lg transition-colors"
                                        >
                                            <Icons.Edit size={14} />
                                            Editar
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="text-sm text-[var(--text-secondary)]">
                            <span className="font-medium text-[var(--text-primary)]">{opportunities.length}</span> oportunidades
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* View Toggle */}
                        <div className="flex items-center bg-[var(--bg-secondary)] dark:bg-slate-800/50 rounded-lg border border-[var(--border-default)] p-0.5">
                            <button
                                onClick={() => setViewMode('kanban')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'kanban'
                                    ? 'bg-indigo-500 text-white'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                    }`}
                            >
                                <Icons.LayoutGrid size={16} />
                                Kanban
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'list'
                                    ? 'bg-indigo-500 text-white'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                    }`}
                            >
                                <Icons.List size={16} />
                                Lista
                            </button>
                        </div>

                        <button
                            onClick={() => handleCreateOpp(activeStages[0]?.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors shadow-lg shadow-indigo-500/20"
                        >
                            <Icons.Plus size={18} />
                            Nueva Oportunidad
                        </button>
                    </div>
                </div>

                {/* Conditional View */}
                {viewMode === 'kanban' ? (
                    <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
                        <div className="flex gap-4 h-full" style={{ minWidth: 'max-content' }}>
                            {activeStages.map(stage => (
                                <StageColumn
                                    key={stage.id}
                                    stage={stage}
                                    opportunities={opportunitiesByStage[stage.id] || []}
                                    onAddClick={() => handleCreateOpp(stage.id)}
                                    onCardClick={handleEditOpp}
                                    onEdit={handleEditOpp}
                                    onDelete={(opp) => handleDeleteOpp(opp.id)}
                                />
                            ))}
                        </div>
                    </div>
                ) : (
                    <CRMOpportunitiesList
                        onEdit={handleEditOpp}
                        onDelete={(opp) => handleDeleteOpp(opp.id)}
                    />
                )}
            </div>

            {createPortal(
                <DragOverlay>
                    {activeDragItem && (
                        <OpportunityCard opportunity={activeDragItem} isOverlay />
                    )}
                </DragOverlay>,
                document.body
            )}

            {showModal && (
                <OpportunityModal
                    opportunity={editingOpp}
                    stageId={creatingInStage}
                    onClose={() => { setShowModal(false); setEditingOpp(null); setCreatingInStage(null); }}
                    onSave={handleSaveOpp}
                    onDelete={editingOpp ? () => handleDeleteOpp(editingOpp.id) : null}
                />
            )}

            {showPipelineModal && (
                <PipelineModal
                    pipeline={editingPipeline}
                    onClose={() => { setShowPipelineModal(false); setEditingPipeline(null); }}
                    onSave={handleSavePipeline}
                    onDelete={editingPipeline && pipelines.length > 1 ? handleDeletePipeline : null}
                />
            )}

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={confirmConfig.isOpen}
                onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
                onConfirm={confirmConfig.action}
                title={confirmConfig.title}
                message={confirmConfig.message}
                confirmText="Eliminar"
                cancelText="Cancelar"
                isDanger={confirmConfig.isDanger}
            />
        </DndContext>
    );
};

// Stage Column Component
const StageColumn = ({ stage, opportunities, onAddClick, onCardClick, onEdit, onDelete }) => {
    const totalValue = opportunities.reduce((sum, o) => sum + (parseFloat(o.expected_revenue) || 0), 0);

    const { setNodeRef } = useSortable({
        id: `stage-${stage.id}`,
        data: { type: 'stage', stage }
    });

    const colorClasses = {
        slate: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
        blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
        amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        red: 'bg-red-500/20 text-red-400 border-red-500/30',
        indigo: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    };

    return (
        <div
            ref={setNodeRef}
            className="w-80 flex-shrink-0 flex flex-col bg-[var(--bg-secondary)] dark:bg-slate-900/50 rounded-xl border border-[var(--border-subtle)] shadow-[var(--shadow-md)]"
        >
            {/* Stage Header */}
            <div className={`p-4 border-b border-[var(--border-subtle)] rounded-t-xl ${stage.is_won ? 'bg-emerald-500/10' : stage.is_lost ? 'bg-red-500/10' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${stage.is_won ? 'bg-emerald-500' : stage.is_lost ? 'bg-red-500' : `bg-${stage.color}-500`}`}
                            style={{ backgroundColor: stage.is_won ? '#10b981' : stage.is_lost ? '#ef4444' : undefined }} />
                        <h3 className="font-semibold text-[var(--text-primary)]">{stage.name}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colorClasses[stage.color] || colorClasses.indigo}`}>
                            {opportunities.length}
                        </span>
                    </div>
                    <button
                        onClick={onAddClick}
                        className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] dark:hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <Icons.Plus size={18} />
                    </button>
                </div>
                <div className="text-sm text-[var(--text-secondary)]">
                    {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(totalValue)}
                </div>
            </div>

            {/* Opportunities List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                <SortableContext items={opportunities.map(o => o.id)} strategy={verticalListSortingStrategy}>
                    {opportunities.map(opp => (
                        <SortableOpportunityCard
                            key={opp.id}
                            opportunity={opp}
                            onClick={() => onCardClick(opp)}
                            onEdit={onEdit}
                            onDelete={onDelete}
                        />
                    ))}
                </SortableContext>

                {opportunities.length === 0 && (
                    <div className="text-center py-8 text-[var(--text-muted)] text-sm">
                        Sin oportunidades
                    </div>
                )}
            </div>
        </div>
    );
};

// Sortable Wrapper for Opportunity Card
const SortableOpportunityCard = ({ opportunity, onClick, onEdit, onDelete }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: opportunity.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <OpportunityCard
                opportunity={opportunity}
                onClick={onClick}
                onEdit={onEdit}
                onDelete={onDelete}
            />
        </div>
    );
};

export default CRMKanban;
