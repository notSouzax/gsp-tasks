import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useTeam } from '../../features/team/TeamContext';
import { useTeamDocuments } from '../../features/team/hooks/useTeamDocuments';
import { DOC_CATEGORIES, getCategoryStyle } from '../../features/team/constants';
import DocumentCard from './DocumentCard';
import DocViewerModal from './modals/DocViewerModal';
import UploadDocModal from './modals/UploadDocModal';
import ConfirmationModal from '../modals/ConfirmationModal';
import { Icons } from '../ui/Icons';

const TeamDocs = () => {
    const { currentUser } = useAuth();
    const { currentTeamId, memberMap, canManage } = useTeam();

    const { documents, isLoading, uploadFile, createLink, deleteDocument } = useTeamDocuments(currentTeamId, currentUser);

    const [activeCategory, setActiveCategory] = useState('all');
    const [search, setSearch] = useState('');
    const [viewerDoc, setViewerDoc] = useState(null);
    const [showUpload, setShowUpload] = useState(false);
    const [docToDelete, setDocToDelete] = useState(null);

    // Filtrado por categoría + búsqueda
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return documents.filter((doc) => {
            if (activeCategory !== 'all' && doc.category !== activeCategory) return false;
            if (!q) return true;
            return (
                doc.title?.toLowerCase().includes(q) ||
                doc.description?.toLowerCase().includes(q)
            );
        });
    }, [documents, activeCategory, search]);

    // Contador por categoría
    const counts = useMemo(() => {
        const c = { all: documents.length };
        DOC_CATEGORIES.forEach((cat) => {
            c[cat.id] = documents.filter((d) => d.category === cat.id).length;
        });
        return c;
    }, [documents]);

    const handleConfirmDelete = async () => {
        if (!docToDelete) return;
        try {
            await deleteDocument(docToDelete);
            toast.success('Documento eliminado');
        } catch {
            toast.error('No se pudo eliminar el documento');
        } finally {
            setDocToDelete(null);
        }
    };

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-[var(--bg-primary)]">
            {/* Barra de herramientas */}
            <div className="px-4 md:px-8 pt-5 pb-4 border-b border-[var(--border-subtle)]">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div className="relative flex-1 min-w-[200px] max-w-md">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[var(--text-muted)]">search</span>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar en la documentación..."
                            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 outline-none"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        {canManage && (
                            <button
                                onClick={() => setShowUpload(true)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-indigo-500/20"
                            >
                                <Icons.Plus size={16} />
                                <span className="hidden sm:inline">Añadir documento</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Chips de categoría */}
                <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
                    <CategoryChip
                        active={activeCategory === 'all'}
                        onClick={() => setActiveCategory('all')}
                        icon="apps"
                        label="Todo"
                        count={counts.all}
                        colorClass="bg-[var(--text-primary)]/10 text-[var(--text-primary)] ring-1 ring-[var(--border-default)]"
                    />
                    {DOC_CATEGORIES.map((cat) => {
                        const style = getCategoryStyle(cat.color);
                        return (
                            <CategoryChip
                                key={cat.id}
                                active={activeCategory === cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                icon={cat.icon}
                                label={cat.shortLabel}
                                count={counts[cat.id]}
                                colorClass={style.chipActive}
                                iconColor={style.text}
                            />
                        );
                    })}
                </div>
            </div>

            {/* Grid de documentos */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-4 md:px-8 py-6">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                    </div>
                ) : filtered.length === 0 ? (
                    <EmptyState
                        canManage={canManage}
                        hasDocs={documents.length > 0}
                        onAdd={() => setShowUpload(true)}
                    />
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filtered.map((doc) => (
                            <DocumentCard
                                key={doc.id}
                                doc={doc}
                                memberMap={memberMap}
                                canManage={canManage}
                                onOpen={setViewerDoc}
                                onDelete={setDocToDelete}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Modales */}
            {viewerDoc && (
                <DocViewerModal doc={viewerDoc} memberMap={memberMap} onClose={() => setViewerDoc(null)} />
            )}
            {showUpload && (
                <UploadDocModal
                    onClose={() => setShowUpload(false)}
                    onUploadFile={uploadFile}
                    onCreateLink={createLink}
                    defaultCategory={activeCategory !== 'all' ? activeCategory : undefined}
                />
            )}
            <ConfirmationModal
                isOpen={!!docToDelete}
                onClose={() => setDocToDelete(null)}
                onConfirm={handleConfirmDelete}
                title="¿Eliminar documento?"
                message={`Se eliminará "${docToDelete?.title}" de forma permanente. Esta acción no se puede deshacer.`}
                confirmText="Sí, Eliminar"
                isDanger
            />
        </div>
    );
};

const CategoryChip = ({ active, onClick, icon, label, count, colorClass, iconColor }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
            active ? colorClass : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] ring-1 ring-transparent hover:ring-[var(--border-subtle)]'
        }`}
    >
        <span className={`material-symbols-outlined text-[18px] ${active ? '' : iconColor || ''}`}>{icon}</span>
        {label}
        {count > 0 && (
            <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${active ? 'bg-black/10 dark:bg-white/15' : 'bg-[var(--bg-tertiary)]'}`}>
                {count}
            </span>
        )}
    </button>
);

const EmptyState = ({ canManage, hasDocs, onAdd }) => (
    <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-16">
        <div className="w-20 h-20 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-[40px] text-indigo-500">
                {hasDocs ? 'search_off' : 'folder_open'}
            </span>
        </div>
        <div>
            <p className="text-base font-semibold text-[var(--text-primary)]">
                {hasDocs ? 'Sin resultados' : 'Aún no hay documentación'}
            </p>
            <p className="text-sm text-[var(--text-muted)] mt-1 max-w-sm">
                {hasDocs
                    ? 'Prueba con otra búsqueda o categoría.'
                    : 'Empieza a construir la base de conocimiento del equipo: manuales, videotutoriales y procedimientos.'}
            </p>
        </div>
        {canManage && !hasDocs && (
            <button
                onClick={onAdd}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors shadow-lg shadow-indigo-500/20"
            >
                <Icons.Plus size={16} />
                Añadir el primer documento
            </button>
        )}
    </div>
);

export default TeamDocs;
