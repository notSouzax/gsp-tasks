import React from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { Icons } from './ui/Icons';
import TaskCard from './TaskCard';
import { COLOR_MAP } from '../utils/helpers';

const Column = ({ column, tasks, allColumns, onAdd, onTaskClick, onDelete, onUpdateTask, onMoveTask, onUpdateColumn, onEditColumn, onSort, provided, snapshot }) => {
    const columnTasks = tasks;
    const isCustomColor = column.color.startsWith('#');
    const borderColor = isCustomColor ? column.color : (COLOR_MAP[column.color] || '#6366f1');
    const toggleCollapse = () => { onUpdateColumn(column.id, { isCollapsed: !column.isCollapsed }); };

    const transitionClass = snapshot?.isDragging ? '' : 'column-size-transition';

    return (
        <div
            className={`flex-shrink-0 flex flex-col h-full max-h-full ${transitionClass} ${column.isCollapsed ? 'collapsed-column' : 'fixed-width-column'}`}
            style={{ boxSizing: 'border-box', ...provided.draggableProps.style }}
            ref={provided.innerRef}
            {...provided.draggableProps}
        >
            {/* COLUMN HEADER */}
            <div
                className={`
                    relative flex flex-col mb-2 rounded-xl transition-all duration-300 group
                    ${column.isCollapsed ? 'bg-[#1e293b] p-2 items-center' : 'bg-[#1e293b] p-4 pb-3 shadow-sm'}
                `}
                style={{
                    borderTop: `3px solid ${borderColor}`,
                }}
                {...provided.dragHandleProps}
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
                                    onClick={() => onEditColumn(column)}
                                    className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-700 rounded-md transition-all opacity-0 group-hover:opacity-100"
                                    title="Configurar"
                                >
                                    <Icons.Settings size={14} />
                                </button>

                                {(column.default_reminder_enabled || tasks.some(t => t.reminder_enabled)) && (
                                    <button
                                        onClick={() => onSort(column.id)}
                                        className={`p-1.5 rounded-md transition-all ${column.cardConfig?.auto_sort || column.card_config?.auto_sort ? '' : 'text-slate-500 hover:text-indigo-400 hover:bg-slate-700 opacity-0 group-hover:opacity-100'}`}
                                        style={column.cardConfig?.auto_sort || column.card_config?.auto_sort ? { color: borderColor, backgroundColor: `${borderColor}1A` } : {}}
                                        title={column.cardConfig?.auto_sort || column.card_config?.auto_sort ? "Orden automático activado" : "Activar orden automático"}
                                    >
                                        <Icons.Sort size={14} />
                                    </button>
                                )}

                                <button
                                    onClick={() => onAdd(column.title)}
                                    className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-700 rounded-md transition-all"
                                    title="Añadir tarea rápida"
                                >
                                    <Icons.Plus size={14} />
                                </button>
                            </>
                        )}

                        <button
                            onClick={toggleCollapse}
                            className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-700 rounded-md transition-all"
                            title={column.isCollapsed ? "Desplegar" : "Plegar"}
                        >
                            {column.isCollapsed ? <Icons.ChevronDown size={14} /> : <Icons.ChevronUp size={14} />}
                        </button>
                    </div>
                </div>

                {column.isCollapsed && (
                    <div className="mt-8 flex items-center justify-center flex-1">
                        <span
                            className="writing-vertical font-bold text-xs uppercase tracking-widest text-slate-400 whitespace-nowrap"
                            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                        >
                            {column.title}
                        </span>
                        <div
                            className="mt-4 flex items-center justify-center w-6 h-6 rounded-md text-[10px] font-bold text-white shadow-sm"
                            style={{ backgroundColor: borderColor }}
                        >
                            {columnTasks.length}
                        </div>
                    </div>
                )}
            </div>

            {/* TASKS AREA */}
            {!column.isCollapsed && (
                <Droppable droppableId={'col-' + column.id.toString()}>
                    {(provided, snapshot) => (
                        <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className={`
                                flex-1 overflow-y-auto overflow-x-hidden p-2 flex flex-col gap-3 custom-scrollbar rounded-xl transition-colors duration-200
                                ${snapshot.isDraggingOver ? 'bg-slate-800/30' : ''}
                            `}
                        >
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
                                columnTasks.map((task, index) => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        index={index}
                                        onClick={onTaskClick}
                                        onDelete={onDelete}
                                        onUpdate={onUpdateTask}
                                        onMove={onMoveTask}
                                        color={column.color}
                                        cardConfig={column.cardConfig}
                                        columns={allColumns}
                                    />
                                ))
                            )}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            )}
        </div >
    );
};

export default Column;
