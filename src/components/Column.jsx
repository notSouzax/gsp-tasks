import React, { useMemo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Icons } from './ui/Icons';
import TaskCard from './TaskCard';
import { COLOR_MAP } from '../utils/helpers';

const Column = ({ column, tasks, onAdd, onTaskClick, onDelete, onUpdateTask, onMoveTask, onUpdateColumn, onEditColumn, onSort, isOverlay }) => {
    const columnTasks = tasks;
    const isCustomColor = column.color?.startsWith('#'); // Safety check on color
    const borderColor = isCustomColor ? column.color : (COLOR_MAP[column.color || 'indigo'] || '#6366f1');
    const toggleCollapse = () => { onUpdateColumn(column.id, { isCollapsed: !column.isCollapsed }); };

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: 'col-' + column.id,
        data: {
            type: 'Column',
            column,
        },
        disabled: isOverlay, // Disable drag logic if this is just the visual overlay
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isOverlay ? 0.9 : (isDragging ? 0.3 : 1), // Distinct opacity for original vs overlay
        zIndex: isOverlay ? 999 : 'auto',
    };

    const taskIds = useMemo(() => tasks.map(t => 'task-' + t.id), [tasks]);

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex-shrink-0 flex flex-col h-full max-h-full ${column.isCollapsed ? 'collapsed-column' : 'fixed-width-column'}`}
        // We apply attributes/listeners to the HEADER only for drag handle
        >
            {/* COLUMN HEADER */}
            <div
                // Header acts as drag handle via listeners below, no need for setNodeRef here
                className={`
                    relative flex flex-col mb-2 rounded-xl transition-all duration-300 group
                    ${column.isCollapsed ? 'bg-[#1e293b] p-2 items-center' : 'bg-[#1e293b] p-4 pb-3 shadow-sm'}
                `}
                style={{
                    borderTop: `3px solid ${borderColor}`,
                    cursor: 'grab',
                }}
                {...attributes}
                {...listeners}
            >
                <div className="flex justify-between items-center w-full">
                    {!column.isCollapsed && (
                        <div className="flex items-center gap-3 overflow-hidden">
                            {/* Count Badge */}
                            <div
                                className="flex items-center justify-center h-5 px-2 rounded-md text-[10px] font-bold text-white shadow-sm"
                                style={{ backgroundColor: borderColor }}
                            >
                                {columnTasks.length}
                            </div>
                            <h2 className="font-bold text-slate-200 text-sm tracking-wide uppercase truncate" title={column.title}>{column.title}</h2>
                        </div>
                    )}

                    {/* Header Actions */}
                    <div className={`flex items-center gap-1.5 ${column.isCollapsed ? 'flex-col gap-3 w-full mt-2' : ''}`}>
                        {!column.isCollapsed && (
                            <>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onEditColumn(column); }}
                                    className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-700 rounded-md transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                                    onPointerDown={e => e.stopPropagation()}
                                    title="Configurar"
                                >
                                    <Icons.Settings size={14} />
                                </button>

                                {(column.default_reminder_enabled || tasks.some(t => t.reminder_enabled)) && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onSort(column.id); }}
                                        className={`p-1.5 rounded-md transition-all cursor-pointer ${column.cardConfig?.auto_sort || column.card_config?.auto_sort ? '' : 'text-slate-500 hover:text-indigo-400 hover:bg-slate-700 opacity-0 group-hover:opacity-100'}`}
                                        style={column.cardConfig?.auto_sort || column.card_config?.auto_sort ? { color: borderColor, backgroundColor: `${borderColor}1A` } : {}}
                                        title={column.cardConfig?.auto_sort || column.card_config?.auto_sort ? "Orden automático activado" : "Activar orden automático"}
                                        onPointerDown={e => e.stopPropagation()}
                                    >
                                        <Icons.Sort size={14} />
                                    </button>
                                )}

                                <button
                                    onClick={(e) => { e.stopPropagation(); onAdd(column.title); }}
                                    className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-700 rounded-md transition-all cursor-pointer"
                                    title="Añadir tarea rápida"
                                    onPointerDown={e => e.stopPropagation()}
                                >
                                    <Icons.Plus size={14} />
                                </button>
                            </>
                        )}

                        <button
                            onClick={(e) => { e.stopPropagation(); toggleCollapse(); }}
                            className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-700 rounded-md transition-all cursor-pointer"
                            title={column.isCollapsed ? "Expandir columna" : "Minimizar columna"}
                            onPointerDown={e => e.stopPropagation()}
                        >
                            {column.isCollapsed ? <Icons.ChevronRight size={14} /> : <Icons.ChevronUp size={14} />}
                        </button>
                    </div>
                </div>

                {column.isCollapsed && (
                    <div className="flex flex-col items-center justify-center gap-3 py-2">
                        {/* Count Badge on top */}
                        <div
                            className="flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold text-white shadow-md"
                            style={{ backgroundColor: borderColor }}
                        >
                            {columnTasks.length}
                        </div>
                        {/* Vertical Title */}
                        <span
                            className="font-bold text-xs uppercase tracking-widest text-slate-400 whitespace-nowrap"
                            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                        >
                            {column.title}
                        </span>
                    </div>
                )}
            </div>

            {/* TASKS AREA */}
            {!column.isCollapsed && (
                <div
                    className={`
                        flex-1 overflow-y-auto overflow-x-hidden p-2 flex flex-col gap-3 custom-scrollbar rounded-xl transition-colors duration-200
                        ${isDragging ? 'bg-slate-800/30' : ''}
                    `}
                    style={{ minHeight: '100px' }} // Ensure droppable area exists even if empty
                >
                    <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
                        {columnTasks.length === 0 ? (
                            <div
                                className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-800 rounded-xl cursor-pointer hover:border-slate-700 hover:bg-slate-800/30 transition-all group/empty"
                                onClick={() => onAdd(column.title)}
                            >
                                <div className="text-slate-600 group-hover/empty:text-slate-500 transition-colors mb-2">
                                    <Icons.Plus size={24} />
                                </div>
                                <p className="text-xs font-medium text-slate-600 group-hover/empty:text-slate-500">Sin tareas</p>
                            </div>
                        ) : (
                            columnTasks.map((task) => (
                                <TaskCard
                                    key={task.id}
                                    task={task}
                                    onClick={onTaskClick}
                                    onDelete={onDelete}
                                    onUpdate={onUpdateTask}
                                    onMove={onMoveTask}
                                    color={column.color}
                                    cardConfig={column.cardConfig}
                                />
                            ))
                        )}
                    </SortableContext>
                </div>
            )}
        </div >
    );
};

export default Column;
