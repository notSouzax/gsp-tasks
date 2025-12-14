import React from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { Icons } from './ui/Icons';
import TaskCard from './TaskCard';
import { COLOR_MAP } from '../utils/helpers';

const Column = ({ column, tasks, allColumns, onAdd, onTaskClick, onDelete, onUpdateTask, onMoveTask, onUpdateColumn, onEditColumn, provided, snapshot }) => {
    // const columnTasks = tasks.filter(t => t.status === column.title); // REMOVED: Supabase uses column_id relation, tasks passed here ARE for this column.
    const columnTasks = tasks;
    const isCustomColor = column.color.startsWith('#');
    const borderColor = isCustomColor ? column.color : (COLOR_MAP[column.color] || '#6366f1');
    const borderStyle = { borderTopColor: borderColor };
    const borderClass = '';
    const toggleCollapse = () => { onUpdateColumn(column.id, { isCollapsed: !column.isCollapsed }); };

    const transitionClass = snapshot?.isDragging ? '' : 'column-size-transition';

    return (
        <div
            className={`flex-shrink-0 flex flex-col h-full max-h-full ${transitionClass} ${column.isCollapsed ? 'collapsed-column' : 'fixed-width-column'}`}
            style={{
                boxSizing: 'border-box',
                ...provided.draggableProps.style,
            }}
            ref={provided.innerRef}
            {...provided.draggableProps}
        >
            <div
                className={`glass-panel p-3 rounded-t-xl ${borderClass} flex flex-col mb-1 relative dark:!bg-[#1b2537] overflow-hidden`}
                style={{ borderTopWidth: '2px', borderTopStyle: 'solid', ...borderStyle }}
                {...provided.dragHandleProps}
            >
                <div className="flex justify-between items-center">
                    {!column.isCollapsed && (
                        <div className="flex items-center gap-2 overflow-hidden">
                            <h2 className="font-bold text-[var(--text-primary)] text-base tracking-wide truncate" title={column.title}>{column.title}</h2>
                            <span className="bg-white/10 text-gray-400 text-xs px-2 py-0.5 rounded-full">{columnTasks.length}</span>
                        </div>
                    )}
                    <div className={`flex items-center gap-1 ${column.isCollapsed ? 'flex-col w-full' : ''}`}>
                        {!column.isCollapsed && (
                            <>
                                <button onClick={() => onEditColumn(column)} className="p-1.5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-colors" title="Configurar columna"><Icons.Settings /></button>
                                <button onClick={() => onAdd(column.title)} className="p-1.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg transition-colors" title="Añadir tarea aquí"><Icons.Plus /></button>
                            </>
                        )}
                        <button onClick={toggleCollapse} className="p-1.5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-colors" title={column.isCollapsed ? "Desplegar" : "Plegar"}>{column.isCollapsed ? <Icons.ChevronDown /> : <Icons.ChevronUp />}</button>
                    </div>
                </div>
                {column.isCollapsed && (
                    <div className="mt-4 flex items-center justify-center h-full">
                        <span className="writing-vertical text-gray-400 font-bold tracking-widest text-xs uppercase transform rotate-180" style={{ writingMode: 'vertical-rl' }}>{column.title}</span>
                    </div>
                )}
            </div>
            {
                !column.isCollapsed && (
                    <Droppable droppableId={'col-' + column.id.toString()}>
                        {(provided) => (
                            <div
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className="flex-1 overflow-y-auto overflow-x-hidden p-2 flex flex-col gap-3 custom-scrollbar"
                            >
                                {columnTasks.length === 0 ? (
                                    <div className="text-center py-10 opacity-20 border-2 border-dashed border-gray-700 rounded-xl"><p className="text-sm text-gray-400">Vacío</p></div>
                                ) : (
                                    columnTasks.map((task, index) => <TaskCard key={task.id} task={task} index={index} onClick={onTaskClick} onDelete={onDelete} onUpdate={onUpdateTask} onMove={onMoveTask} color={column.color} cardConfig={column.cardConfig} columns={allColumns} />)
                                )}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                )
            }
        </div >
    );
};

export default Column;
