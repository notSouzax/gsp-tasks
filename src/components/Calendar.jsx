import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isToday, addDays, subDays, startOfWeek, endOfWeek, parseISO, startOfDay, isSameDay, addWeeks, subWeeks } from 'date-fns';
import { es } from 'date-fns/locale';
import { DndContext, useDraggable, useDroppable, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import ConfirmationModal from './modals/ConfirmationModal';
import EventModal, { EVENT_COLORS } from './modals/EventModal';
import { useAuth } from '../context/AuthContext';
import { useCalendarQueries } from '../hooks/useCalendarQueries';
import toast from 'react-hot-toast';

const MiniCalendar = ({ currentReferenceDate, onDateSelect }) => {
    const start = startOfMonth(currentReferenceDate);
    const end = endOfMonth(currentReferenceDate);
    const days = eachDayOfInterval({ start, end });
    const firstDayOfWeek = (getDay(start) + 6) % 7;
    const emptyDays = Array(firstDayOfWeek).fill(null);
    const allDays = [...emptyDays, ...days];
    const weekDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

    return (
        <div className="mt-6 mb-4">
            <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-sm font-medium text-slate-200 capitalize">
                    {format(currentReferenceDate, 'MMMM yyyy', { locale: es })}
                </span>
                <div className="flex gap-1">
                    <button onClick={() => onDateSelect(subMonths(currentReferenceDate, 1))} className="p-1 hover:bg-slate-800 rounded text-slate-400 transition-colors">
                        <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                    </button>
                    <button onClick={() => onDateSelect(addMonths(currentReferenceDate, 1))} className="p-1 hover:bg-slate-800 rounded text-slate-400 transition-colors">
                        <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                    </button>
                </div>
            </div>
            <div className="grid grid-cols-7 gap-0">
                {weekDays.map(d => (
                    <div key={d} className="text-[10px] text-center text-slate-500 py-1 font-bold">{d}</div>
                ))}
                {allDays.map((day, i) => (
                    <div
                        key={i}
                        onClick={() => day && onDateSelect(day)}
                        className={`
                            text-[11px] text-center py-1.5 cursor-pointer rounded-full transition-colors flex items-center justify-center
                            ${!day ? '' : 'hover:bg-slate-800 text-slate-300'}
                            ${day && isToday(day) ? 'bg-blue-600 text-white font-bold' : ''}
                            ${day && isSameDay(day, currentReferenceDate) && !isToday(day) ? 'bg-slate-700 text-white' : ''}
                        `}
                    >
                        {day ? format(day, 'd') : ''}
                    </div>
                ))}
            </div>
        </div>
    );
};

const DraggableEvent = ({ event, color, top, height, timeRange, onClick, children, className: extraClass, isOverlay = false }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: event.id,
        data: event,
    });

    const style = {
        transform: isOverlay ? CSS.Translate.toString(transform) : undefined,
        ...(top !== undefined && !isOverlay ? { top: `${top}px` } : {}),
        ...(height !== undefined && !isOverlay ? { height: `${height}px` } : {}),
        position: top !== undefined ? (isOverlay ? 'relative' : 'absolute') : 'relative',
        opacity: isDragging && !isOverlay ? 0.3 : 1,
        transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.2, 0, 0, 1), opacity 0.2s',
        zIndex: isOverlay ? 100 : 10,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={(e) => onClick(event, e)}
            className={extraClass || `
                absolute left-1.5 right-1.5 rounded-xl p-2.5 sm:p-3 text-[11px] leading-tight overflow-hidden
                border-l-4 border-white ${color.bg} text-white font-semibold shadow-xl
                border border-white/10 hover:brightness-110 hover:shadow-blue-500/20 group/event
                active:scale-[0.98] cursor-grab active:cursor-grabbing transition-all duration-200
                ${isDragging && !isOverlay ? 'invisible' : ''}
            `}
        >
            {children ? children : (
                <div className="flex flex-col gap-0.5 pointer-events-none">
                    <div className="flex justify-between items-start gap-1">
                        <span className="font-bold truncate">{event.title}</span>
                        {timeRange && <span className="text-[9px] opacity-80 whitespace-nowrap">{timeRange}</span>}
                    </div>
                    {event.description && (
                        <p className="text-[10px] opacity-70 truncate line-clamp-1">{event.description}</p>
                    )}
                </div>
            )}
        </div>
    );
};

const DroppableDay = ({ day, index, children, onClick }) => {
    const dayStr = day ? format(day, 'yyyy-MM-dd') : null;
    const { isOver, setNodeRef } = useDroppable({
        id: dayStr ? `day-${dayStr}` : `empty-${index}`,
        data: { day },
        disabled: !day
    });

    const isTodayDay = day && isToday(day);

    return (
        <div
            ref={setNodeRef}
            onClick={() => day && onClick(day)}
            className={`
                flex flex-col border-r border-b border-slate-800/60 p-1 min-h-[120px]
                transition-colors cursor-pointer group/day relative
                ${!day ? 'bg-slate-900/10' : ''}
                ${isOver ? 'bg-blue-500/10' : 'hover:bg-slate-800/20'}
            `}
        >
            {day && (
                <>
                    <div className="flex justify-center py-2">
                        <span className={`
                            text-xs font-bold w-7 h-7 flex items-center justify-center rounded-full transition-all
                            ${isTodayDay
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 scale-110'
                                : 'text-slate-300 group-hover/day:bg-slate-800 group-hover/day:text-white'}
                        `}>
                            {format(day, 'd')}
                        </span>
                    </div>
                    <div className="flex-1 space-y-1 overflow-y-auto custom-scrollbar-thin px-0.5">
                        {children}
                    </div>
                </>
            )}
        </div>
    );
};

const DroppableSlot = ({ day, hour, minutes, onClick }) => {
    const { isOver, setNodeRef } = useDroppable({
        id: `slot-${format(day, 'yyyy-MM-dd')}-${hour}-${minutes}`,
        data: { day, hour, minutes },
    });

    return (
        <div
            ref={setNodeRef}
            onClick={() => onClick(day, hour, minutes)}
            className={`
                h-6 border-slate-800/10 transition-colors cursor-pointer relative group/slot 
                ${isOver ? 'bg-blue-500/15' : 'hover:bg-white/[0.01]'}
                ${minutes === 45 ? 'border-b-[1.5px] border-slate-700/40' : 'border-b border-dashed border-slate-800/20'}
            `}
        >
            {/* Solo mostramos el indicador de '+' en el slot de punto (00) para no saturar */}
            {minutes === 0 && (
                <div className="absolute inset-0 opacity-0 group-hover/slot:opacity-100 flex items-center justify-center pointer-events-none">
                    <span className="material-symbols-outlined text-white/20 text-[12px]">add</span>
                </div>
            )}
        </div>
    );
};

const Calendar = () => {
    const { currentUser: user } = useAuth();
    const [view, setView] = useState('month');
    const [currentDate, setCurrentDate] = useState(new Date());

    // React Query hook for all calendar data
    const {
        events, tags, integrations, crmActivities, crmOpportunities,
        loading, addTag, updateTag, deleteTag: deleteTagMut,
        updateIntegration: updateIntegrationMut, moveEvent, invalidateEvents
    } = useCalendarQueries(user, currentDate, view);

    const [showCRMActivities, setShowCRMActivities] = useState(true);
    const [showCRMOpportunities, setShowCRMOpportunities] = useState(true);
    const [showEventModal, setShowEventModal] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);
    const [activeId, setActiveId] = useState(null);
    const [editingEvent, setEditingEvent] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [initialStartTime, setInitialStartTime] = useState('');
    const [initialEndTime, setInitialEndTime] = useState('');
    const [initialAllDay, setInitialAllDay] = useState(true);
    const [selectedTags, setSelectedTags] = useState([]);
    const [isAddingTag, setIsAddingTag] = useState(false);
    const [newTagName, setNewTagName] = useState('');
    const [newTagColor, setNewTagColor] = useState('blue');
    const [tagToDelete, setTagToDelete] = useState(null);
    const [showTagDeleteConfirm, setShowTagDeleteConfirm] = useState(false);
    const [editingTag, setEditingTag] = useState(null);
    const [editingIntegration, setEditingIntegration] = useState(null);
    const gridRef = React.useRef(null);
    const timeGridRef = React.useRef(null);
    const paginationTimer = React.useRef(null);

    // Auto-select all tags on first load
    React.useEffect(() => {
        if (selectedTags.length === 0 && tags.length > 0) {
            setSelectedTags(tags.map(t => t.id));
        }
    }, [tags, selectedTags.length]);

    const handleAddTag = async () => {
        if (!newTagName.trim() || !user) return;
        try {
            const data = await addTag(newTagName, newTagColor);
            setSelectedTags(prev => [...prev, data.id]);
            setNewTagName('');
            setIsAddingTag(false);
            toast.success('Etiqueta creada');
        } catch (error) {
            console.error('Error adding tag:', error);
            toast.error('Error al crear etiqueta');
        }
    };

    const handleDeleteTag = (id) => {
        setTagToDelete(id);
        setShowTagDeleteConfirm(true);
    };

    const confirmDeleteTag = async () => {
        if (!tagToDelete) return;
        try {
            await deleteTagMut(tagToDelete);
            setSelectedTags(prev => prev.filter(tid => tid !== tagToDelete));
            toast.success('Etiqueta eliminada');
        } catch (error) {
            console.error('Error deleting tag:', error);
            toast.error('Error al eliminar etiqueta');
        } finally {
            setShowTagDeleteConfirm(false);
            setTagToDelete(null);
        }
    };

    const handleUpdateTag = async () => {
        if (!editingTag || !editingTag.name.trim()) return;
        try {
            await updateTag(editingTag);
            setEditingTag(null);
            toast.success('Etiqueta actualizada');
        } catch (error) {
            console.error('Error updating tag:', error);
            toast.error('Error al actualizar etiqueta');
        }
    };

    const handleUpdateIntegration = async () => {
        if (!editingIntegration || !editingIntegration.name.trim()) return;
        try {
            await updateIntegrationMut(editingIntegration);
            setEditingIntegration(null);
            toast.success('Integración actualizada');
        } catch (error) {
            console.error('Error updating integration:', error);
            toast.error('Error al actualizar integración');
        }
    };

    const weekDays = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÃB', 'DOM'];

    // Funciones de navegaciÃ³n
    const prev = () => {
        if (view === 'month') setCurrentDate(subMonths(currentDate, 1));
        else if (view === 'week') setCurrentDate(subWeeks(currentDate, 1));
        else setCurrentDate(subDays(currentDate, 1));
    };

    const next = () => {
        if (view === 'month') setCurrentDate(addMonths(currentDate, 1));
        else if (view === 'week') setCurrentDate(addWeeks(currentDate, 1));
        else setCurrentDate(addDays(currentDate, 1));
    };

    const goToToday = () => setCurrentDate(new Date());

    // DnD Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 4,
            },
        })
    );

    const handleDragStart = (event) => {
        setActiveId(event.active.id);
    };

    const handleDragMove = (event) => {
        const { pointerCoordinates } = event;
        if (!gridRef.current || !pointerCoordinates) return;

        const rect = gridRef.current.getBoundingClientRect();
        const edgeThreshold = 60; // zona de 60px en los bordes

        // Limpiar timer anterior
        if (paginationTimer.current) {
            clearTimeout(paginationTimer.current);
            paginationTimer.current = null;
        }

        if (pointerCoordinates.x < rect.left + edgeThreshold) {
            // Zona izquierda
            paginationTimer.current = setTimeout(() => {
                prev();
                toast('â¬…ï¸ Anterior', { id: 'nav-feedback', duration: 1000 });
            }, 800);
        } else if (pointerCoordinates.x > rect.right - edgeThreshold) {
            // Zona derecha
            paginationTimer.current = setTimeout(() => {
                next();
                toast('âž¡ï¸ Siguiente', { id: 'nav-feedback', duration: 1000 });
            }, 800);
        }
    };

    const handleDragEnd = async (event) => {
        setActiveId(null);
        if (paginationTimer.current) {
            clearTimeout(paginationTimer.current);
            paginationTimer.current = null;
        }

        const { active, over } = event;
        if (!over) return;

        const eventId = active.id;
        const targetId = over.id;

        let newDate, newStartTime, newEndTime;
        const draggedEvent = events.find(e => e.id === eventId);
        if (!draggedEvent) return;

        if (targetId.startsWith('slot-')) {
            const parts = targetId.split('-');
            newDate = parts.slice(1, 4).join('-');
            const newHour = parseInt(parts[4]);
            const newMinutes = parseInt(parts[5]);
            newStartTime = `${newHour.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;

            if (draggedEvent.start_time && draggedEvent.end_time) {
                const [oldH, oldM] = draggedEvent.start_time.split(':').map(Number);
                const [endH, endM] = draggedEvent.end_time.split(':').map(Number);
                const durationMinutes = (endH * 60 + endM) - (oldH * 60 + oldM);
                const startTotalMinutes = newHour * 60 + newMinutes;
                const endTotalMinutes = startTotalMinutes + durationMinutes;
                newEndTime = `${Math.floor(endTotalMinutes / 60).toString().padStart(2, '0')}:${(endTotalMinutes % 60).toString().padStart(2, '0')}`;
            }
        } else if (targetId.startsWith('day-')) {
            newDate = targetId.replace('day-', '');
            newStartTime = draggedEvent.start_time;
            newEndTime = draggedEvent.end_time;
        } else {
            return;
        }

        if (newDate === draggedEvent.date && newStartTime === draggedEvent.start_time) return;

        try {
            await moveEvent(eventId, newDate, newStartTime, newEndTime);
        } catch (err) {
            console.error('Error updating event drop:', err);
            toast.error('No se pudo mover el evento');
        }
    };

    const handleDayClick = (date, hour = null, minutes = 0) => {
        if (!date) return;
        setSelectedDate(date);

        if (hour !== null) {
            setInitialStartTime(`${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);

            // DuraciÃ³n por defecto de 1h
            const startTotal = hour * 60 + minutes;
            const endTotal = startTotal + 60;
            const finalEndH = Math.floor(endTotal / 60) % 24;
            const finalEndM = endTotal % 60;

            setInitialEndTime(`${finalEndH.toString().padStart(2, '0')}:${finalEndM.toString().padStart(2, '0')}`);
            setInitialAllDay(false);
        } else {
            setInitialStartTime('');
            setInitialEndTime('');
            setInitialAllDay(true);
        }

        setShowEventModal(true);
    };

    const handleEventClick = (event, e) => {
        e.stopPropagation();
        setEditingEvent(event);
        setSelectedDate(parseISO(event.date));
        setShowEventModal(true);
    };

    const getEventColor = (event) => {
        if (!event) return EVENT_COLORS[0];
        if (event.tag_id) {
            const tag = tags.find(t => t.id === event.tag_id);
            if (tag) return EVENT_COLORS.find(c => c.id === tag.color) || EVENT_COLORS[0];
        }
        return EVENT_COLORS.find(c => c.id === event.color) || EVENT_COLORS[0];
    };

    const crmIntegration = integrations.find(i => i.slug === 'crm') || { name: 'Actividades CRM', color: 'purple' };

    // Transform CRM activities to calendar event format
    const crmEventsForCalendar = showCRMActivities ? crmActivities.map(activity => {
        const dueDate = activity.due_date ? new Date(activity.due_date) : null;
        const activityTypeIcons = { call: 'ðŸ“ž', meeting: 'ðŸ‘¥', email: 'ðŸ“§', task: 'âœ…', note: 'ðŸ“', deadline: 'â°' };

        return {
            id: `crm-${activity.id}`,
            title: `${activityTypeIcons[activity.activity_type] || 'ðŸ“Œ'} ${activity.title}`,
            date: dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
            start_time: dueDate ? format(dueDate, 'HH:mm') : null,
            end_time: dueDate ? format(new Date(dueDate.getTime() + (activity.duration_minutes || 30) * 60000), 'HH:mm') : null,
            all_day: !dueDate,
            color: crmIntegration.color, // Use integration color
            isCrmActivity: true,
            description: activity.contact ? `${activity.contact.first_name} ${activity.contact.last_name}` : (activity.opportunity?.name || ''),
        };
    }).filter(e => e.date) : [];

    // Transform CRM opportunities to calendar event format
    const crmOppEventsForCalendar = showCRMOpportunities ? crmOpportunities.map(opp => {
        const closeDate = opp.expected_close_date ? new Date(opp.expected_close_date) : null;
        const probEmoji = opp.probability >= 70 ? 'ðŸŸ¢' : opp.probability >= 40 ? 'ðŸŸ¡' : 'ðŸ”´';

        return {
            id: `crm-opp-${opp.id}`,
            title: `${probEmoji} ${opp.name}`,
            date: closeDate ? format(closeDate, 'yyyy-MM-dd') : null,
            start_time: null,
            end_time: null,
            all_day: true,
            color: 'emerald', // Green color for opportunities
            isCrmOpportunity: true,
            description: `â‚¬${(opp.expected_revenue || 0).toLocaleString()} â€¢ ${opp.probability || 0}%`,
        };
    }).filter(e => e.date) : [];

    const visibleEvents = [
        ...events.filter(e => !e.tag_id || selectedTags.includes(e.tag_id)),
        ...crmEventsForCalendar,
        ...crmOppEventsForCalendar
    ];

    // Renderizado la vista de Mes
    const renderMonthView = () => {
        const start = startOfMonth(currentDate);
        const firstDayOfWeek = (getDay(start) + 6) % 7;
        const days = eachDayOfInterval({ start, end: endOfMonth(currentDate) });
        const emptyDays = Array(firstDayOfWeek).fill(null);
        const totalCells = 42;
        const trailingDaysCount = totalCells - (emptyDays.length + days.length);
        const trailingDays = Array(trailingDaysCount > 0 ? trailingDaysCount : 0).fill(null);
        const allDays = [...emptyDays, ...days, ...trailingDays];

        return (
            <div ref={gridRef} className="flex-1 grid grid-cols-7 grid-rows-6 min-h-[700px] border-l border-slate-800/60">
                {allDays.map((day, index) => {
                    const dayStr = day ? format(day, 'yyyy-MM-dd') : null;
                    const dayEvents = dayStr ? visibleEvents.filter(e => e.date === dayStr) : [];

                    return (
                        <DroppableDay key={index} index={index} day={day} onClick={handleDayClick}>
                            {day && (
                                <div className="flex-1 space-y-1 overflow-y-auto custom-scrollbar-thin px-0.5">
                                    {dayEvents.map(event => (
                                        <DraggableEvent
                                            key={event.id}
                                            event={event}
                                            color={getEventColor(event)}
                                            onClick={handleEventClick}
                                            className={`
                                                px-2 py-1 rounded-md text-[10px] truncate leading-tight transition-all
                                                ${getEventColor(event).bg} text-white font-semibold border-l-2 border-white
                                                hover:brightness-110 hover:shadow-md active:scale-95 cursor-grab
                                            `}
                                            title={`${event.title} - ${event.start_time || 'Todo el día'}`}
                                        >
                                            <div className="flex items-center gap-1 pointer-events-none">
                                                {event.start_time && (
                                                    <span className="opacity-70 text-[8px] font-normal shrink-0">{event.start_time.slice(0, 5)}</span>
                                                )}
                                                <span className="truncate">{event.title}</span>
                                            </div>
                                        </DraggableEvent>
                                    ))}
                                </div>
                            )}
                        </DroppableDay>
                    );
                })}
            </div>
        );
    };

    // Auto-scroll to 8:00 AM on week/day view
    React.useEffect(() => {
        if (timeGridRef.current && (view === 'week' || view === 'day')) {
            // Cada hora tiene 96px (h-24). 8:00 AM = 8 * 96
            timeGridRef.current.scrollTop = 8 * 96;
        }
    }, [view, currentDate]);

    // Renderizado para vista de Semana y DÃ­a
    const renderTimeGridView = () => {
        const hoursAxis = Array.from({ length: 24 }, (_, i) => i);
        const start = view === 'week' ? startOfWeek(currentDate, { weekStartsOn: 1 }) : startOfDay(currentDate);
        const days = view === 'week' ? eachDayOfInterval({ start, end: endOfWeek(start, { weekStartsOn: 1 }) }) : [start];

        return (
            <div ref={timeGridRef} className="flex-1 overflow-y-auto custom-scrollbar flex bg-[#030712]">
                {/* Eje de Horas (AlineaciÃ³n de precisiÃ³n con la cuadrÃ­cula) */}
                <div className="w-16 flex-shrink-0 bg-[#030712] sticky left-0 z-30 h-full min-h-max border-r border-slate-800/60">
                    <div className="h-12 text-center flex items-center justify-center text-[10px] text-slate-600 font-bold uppercase tracking-widest border-b border-slate-800/60 relative">
                        GMT
                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 text-[9px] font-black text-slate-500 bg-[#030712] px-1 z-10">
                            00:00
                        </span>
                    </div>
                    {hoursAxis.slice(1).map(h => (
                        <div key={h} className="h-24 relative border-b border-slate-700/40">
                            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 text-[9px] font-black text-slate-500 bg-[#030712] px-1 z-10 transition-colors hover:text-white">
                                {format(new Date().setHours(h, 0, 0, 0), 'HH:00')}
                            </span>
                        </div>
                    ))}
                    {/* Borde derecho reforzado para que no se corte */}
                    <div className="absolute top-0 right-[-1px] bottom-0 w-[1px] bg-slate-800/60 z-40"></div>
                </div>

                {/* Grid de DÃ­as */}
                <div
                    className="flex-1 grid min-w-0"
                    style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
                >
                    {days.map((day, dIdx) => {
                        const dayStr = format(day, 'yyyy-MM-dd');
                        const dayEvents = visibleEvents.filter(e => e.date === dayStr);

                        return (
                            <div key={dIdx} className="relative border-r border-slate-800/60 group/col last:border-r-0">
                                {/* Encabezado de día pegajoso para semana/día */}
                                <div className="h-12 sticky top-0 bg-[#030712]/95 backdrop-blur-md z-20 border-b border-r border-slate-800/60 last:border-r-0 flex flex-col items-center justify-center">
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${isToday(day) ? 'text-blue-500' : 'text-slate-500'}`}>
                                        {format(day, 'EEE', { locale: es })}
                                    </span>
                                    <span className={`text-base font-bold ${isToday(day) ? 'text-white bg-blue-600 rounded-full w-7 h-7 flex items-center justify-center shadow-lg shadow-blue-600/20' : 'text-slate-300'}`}>
                                        {format(day, 'd')}
                                    </span>
                                </div>

                                {/* Slots de horas clickeables (Divididos en 4 x 15min) */}
                                <div className="flex flex-col">
                                    {hoursAxis.map(h => (
                                        <div key={h} className="h-24 flex flex-col">
                                            {[0, 15, 30, 45].map(m => (
                                                <DroppableSlot
                                                    key={`${h}-${m}`}
                                                    day={day}
                                                    hour={h}
                                                    minutes={m}
                                                    onClick={handleDayClick}
                                                />
                                            ))}
                                        </div>
                                    ))}
                                </div>

                                {/* Eventos absolutizados */}
                                {dayEvents.map(event => {
                                    if (event.all_day || !event.start_time) return null;
                                    const color = getEventColor(event);
                                    const [h, m] = event.start_time.split(':').map(Number);
                                    const top = (h * 96) + (m / 60 * 96) + 48; // 96px (h-24) + 48px header (h-12)

                                    let height = 96; // Default 1h
                                    let timeRange = event.start_time.slice(0, 5);

                                    if (event.end_time) {
                                        const [eh, em] = event.end_time.split(':').map(Number);
                                        const durationMinutes = (eh * 60 + em) - (h * 60 + m);
                                        height = (durationMinutes / 60) * 96;
                                        timeRange = `${event.start_time.slice(0, 5)} - ${event.end_time.slice(0, 5)}`;
                                    }

                                    return (
                                        <DraggableEvent
                                            key={event.id}
                                            event={event}
                                            color={color}
                                            top={top}
                                            height={height}
                                            timeRange={timeRange}
                                            onClick={handleEventClick}
                                        />
                                    );
                                })}

                                {/* Eventos All Day arriba */}
                                <div className="absolute top-12 left-0 right-0 z-20 pointer-events-none p-1">
                                    {dayEvents.filter(e => e.all_day || !e.start_time).map(event => {
                                        const color = getEventColor(event);
                                        return (
                                            <div
                                                key={event.id}
                                                onClick={(e) => handleEventClick(event, e)}
                                                className={`
                                                    mb-1 px-3 py-1.5 rounded-lg text-[10px] font-bold ${color.bg} text-white 
                                                    border border-white/10 pointer-events-auto cursor-pointer 
                                                    truncate shadow-md hover:brightness-110 transition-all border-l-4 border-white
                                                `}
                                            >
                                                <span className="material-symbols-outlined text-[12px] align-middle mr-1">event_available</span>
                                                {event.title}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    if (loading && events.length === 0) {
        return (
            <div className="w-full h-full flex flex-col bg-[#030712]">
                <div className="h-16 flex items-center px-6 border-b border-slate-800/60">
                    <div className="animate-pulse flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-800"></div>
                        <div className="w-32 h-4 bg-slate-800 rounded"></div>
                    </div>
                </div>
                <div className="flex-1 flex items-center justify-center">
                    <div className="animate-pulse text-slate-400 flex flex-col items-center gap-3">
                        <span className="material-symbols-outlined text-4xl text-blue-500/50">calendar_month</span>
                        <span className="text-sm font-medium">Sincronizando eventos...</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full bg-[#030712] overflow-hidden text-slate-200">
            {/* Sidebar */}
            {sidebarOpen && (
                <div className="w-64 flex-shrink-0 border-r border-slate-800/60 p-4 bg-[#030712] flex flex-col group/sidebar overflow-y-auto custom-scrollbar">
                    <button
                        onClick={() => handleDayClick(new Date())}
                        className="flex items-center gap-3 px-5 py-3 bg-slate-800/40 hover:bg-slate-700/60 border border-slate-700/50 rounded-full transition-all group shadow-lg mb-2"
                    >
                        <span className="material-symbols-outlined text-blue-400 group-hover:scale-110 transition-transform">add</span>
                        <span className="font-medium text-sm">Crear</span>
                    </button>

                    <MiniCalendar currentReferenceDate={currentDate} onDateSelect={setCurrentDate} />

                    <div className="mt-8 space-y-6">
                        {/* CRM Activities Toggle */}
                        <div>
                            {editingIntegration?.slug === 'crm' ? (
                                <div className="mb-2 p-3 bg-slate-800/60 rounded-xl border border-blue-500/30 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <input
                                        type="text"
                                        value={editingIntegration.name}
                                        onChange={(e) => setEditingIntegration({ ...editingIntegration, name: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        autoFocus
                                        onKeyDown={(e) => e.key === 'Enter' && handleUpdateIntegration()}
                                    />
                                    <div className="flex flex-wrap gap-1.5">
                                        {EVENT_COLORS.map(c => (
                                            <button
                                                key={c.id}
                                                onClick={() => setEditingIntegration({ ...editingIntegration, color: c.id })}
                                                className={`w-5 h-5 rounded-full ${c.bg} transition-transform hover:scale-110 ${editingIntegration.color === c.id ? 'ring-2 ring-white ring-offset-2 ring-offset-[#030712]' : ''}`}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleUpdateIntegration}
                                            disabled={!editingIntegration.name.trim()}
                                            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold py-1.5 rounded-md transition-colors"
                                        >
                                            Actualizar
                                        </button>
                                        <button
                                            onClick={() => setEditingIntegration(null)}
                                            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-md transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <label className="flex items-center gap-3 px-2 py-2 hover:bg-slate-800/50 rounded-lg cursor-pointer group/item transition-colors">
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            checked={showCRMActivities}
                                            onChange={() => setShowCRMActivities(!showCRMActivities)}
                                            className="sr-only"
                                        />
                                        <div className={`
                                            w-4 h-4 rounded-md border transition-all duration-200 flex items-center justify-center
                                            ${showCRMActivities
                                                ? `${(EVENT_COLORS.find(c => c.id === crmIntegration.color) || EVENT_COLORS[0]).bg} border-${crmIntegration.color}-500`
                                                : 'border-slate-700 bg-slate-900 group-hover/item:border-slate-500'}
                                        `}>
                                            {showCRMActivities && (
                                                <span className="material-symbols-outlined text-[14px] text-white font-black scale-110">
                                                    check
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex-1 flex items-center min-w-0">
                                        <span className="text-sm text-slate-300 group-hover/item:text-white truncate">{crmIntegration.name}</span>
                                        <span className="text-[10px] text-slate-500 ml-2 shrink-0">({crmActivities.length})</span>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setEditingIntegration({ ...crmIntegration, slug: 'crm', is_visible: showCRMActivities });
                                        }}
                                        className="opacity-0 group-hover/item:opacity-100 p-1 material-symbols-outlined text-[16px] text-slate-500 hover:text-blue-400 transition-all"
                                    >
                                        edit
                                    </button>
                                </label>
                            )}
                        </div>

                        <div>
                            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                                <span>Mis etiquetas</span>
                                <button
                                    onClick={() => setIsAddingTag(!isAddingTag)}
                                    className="material-symbols-outlined text-[16px] cursor-pointer hover:text-slate-300"
                                >
                                    add
                                </button>
                            </div>

                            {isAddingTag && (
                                <div className="mb-4 p-3 bg-slate-800/40 rounded-xl border border-slate-700/50 space-y-3">
                                    <input
                                        type="text"
                                        placeholder="Nueva etiqueta..."
                                        value={newTagName}
                                        onChange={(e) => setNewTagName(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        autoFocus
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                                    />
                                    <div className="flex flex-wrap gap-1.5">
                                        {EVENT_COLORS.map(c => (
                                            <button
                                                key={c.id}
                                                onClick={() => setNewTagColor(c.id)}
                                                className={`w-5 h-5 rounded-full ${c.bg} transition-transform hover:scale-110 ${newTagColor === c.id ? 'ring-2 ring-white ring-offset-2 ring-offset-[#030712]' : ''}`}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleAddTag}
                                            disabled={!newTagName.trim()}
                                            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold py-1.5 rounded-md transition-colors"
                                        >
                                            Guardar
                                        </button>
                                        <button
                                            onClick={() => setIsAddingTag(false)}
                                            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-md transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-1">
                                {tags.length === 0 && !isAddingTag && (
                                    <p className="text-[11px] text-slate-500 italic px-2">No hay etiquetas</p>
                                )}
                                {tags.map(tag => {
                                    const tagColor = EVENT_COLORS.find(c => c.id === tag.color) || EVENT_COLORS[0];
                                    const isEditing = editingTag?.id === tag.id;

                                    if (isEditing) {
                                        return (
                                            <div key={tag.id} className="mb-2 p-3 bg-slate-800/60 rounded-xl border border-blue-500/30 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                                <input
                                                    type="text"
                                                    value={editingTag.name}
                                                    onChange={(e) => setEditingTag({ ...editingTag, name: e.target.value })}
                                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                                    autoFocus
                                                    onKeyDown={(e) => e.key === 'Enter' && handleUpdateTag()}
                                                />
                                                <div className="flex flex-wrap gap-1.5">
                                                    {EVENT_COLORS.map(c => (
                                                        <button
                                                            key={c.id}
                                                            onClick={() => setEditingTag({ ...editingTag, color: c.id })}
                                                            className={`w-5 h-5 rounded-full ${c.bg} transition-transform hover:scale-110 ${editingTag.color === c.id ? 'ring-2 ring-white ring-offset-2 ring-offset-[#030712]' : ''}`}
                                                        />
                                                    ))}
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={handleUpdateTag}
                                                        disabled={!editingTag.name.trim()}
                                                        className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold py-1.5 rounded-md transition-colors"
                                                    >
                                                        Actualizar
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingTag(null)}
                                                        className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-md transition-colors"
                                                    >
                                                        Cancelar
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    }

                                    return (
                                        <label key={tag.id} className="flex items-center gap-3 px-2 py-2 hover:bg-slate-800/50 rounded-lg cursor-pointer group/item transition-colors">
                                            <div className="relative">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedTags.includes(tag.id)}
                                                    onChange={() => {
                                                        if (selectedTags.includes(tag.id)) {
                                                            setSelectedTags(selectedTags.filter(id => id !== tag.id));
                                                        } else {
                                                            setSelectedTags([...selectedTags, tag.id]);
                                                        }
                                                    }}
                                                    className="sr-only"
                                                />
                                                <div className={`
                                                    w-4 h-4 rounded-md border transition-all duration-200 flex items-center justify-center
                                                    ${selectedTags.includes(tag.id)
                                                        ? `${tagColor.bg} ${tagColor.bg.replace('bg-', 'border-')}`
                                                        : 'border-slate-700 bg-slate-900 group-hover/item:border-slate-500'}
                                                `}>
                                                    {selectedTags.includes(tag.id) && (
                                                        <span className="material-symbols-outlined text-[14px] text-white font-black scale-110 animate-in zoom-in-50 duration-200">
                                                            check
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <span className="text-sm text-slate-400 group-hover/item:text-slate-200 truncate flex-1">{tag.name}</span>
                                            <div className="flex items-center opacity-0 group-hover/item:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setEditingTag({ ...tag });
                                                    }}
                                                    className="p-1 material-symbols-outlined text-[16px] text-slate-500 hover:text-blue-400 transition-all mr-1"
                                                >
                                                    edit
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleDeleteTag(tag.id);
                                                    }}
                                                    className="p-1 material-symbols-outlined text-[16px] text-slate-500 hover:text-rose-400 transition-all"
                                                >
                                                    delete
                                                </button>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
                {/* Header */}
                <header className="h-16 flex items-center justify-between px-4 border-b border-slate-800/60 bg-[#030712] relative z-20">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="p-2 hover:bg-slate-800 rounded-full text-slate-400 transition-colors"
                        >
                            <span className="material-symbols-outlined">menu</span>
                        </button>
                        <div className="flex items-center gap-2 mr-6 shrink-0">
                            <span className="material-symbols-outlined text-blue-500 text-2xl">calendar_month</span>
                            <span className="text-lg font-medium">Calendario</span>
                        </div>
                        <button onClick={goToToday} className="px-4 py-1.5 text-xs font-semibold border border-slate-700 hover:bg-slate-800 rounded-md transition-all active:scale-95">Hoy</button>
                        <div className="flex items-center gap-0.5 ml-2">
                            <button onClick={prev} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 transition-colors group">
                                <span className="material-symbols-outlined text-[20px] group-hover:-translate-x-0.5 transition-transform">chevron_left</span>
                            </button>
                            <button onClick={next} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 transition-colors group">
                                <span className="material-symbols-outlined text-[20px] group-hover:translate-x-0.5 transition-transform">chevron_right</span>
                            </button>
                        </div>
                        <h2 className="text-xl font-normal ml-3 capitalize text-slate-100 hidden sm:block">
                            {format(currentDate, 'MMMM yyyy', { locale: es })}
                        </h2>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center p-1 bg-slate-800/30 border border-slate-700 rounded-lg overflow-hidden shrink-0">
                            {['month', 'week', 'day'].map((v) => (
                                <button
                                    key={v}
                                    onClick={() => setView(v)}
                                    className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${view === v ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    {v === 'month' ? 'MES' : v === 'week' ? 'SEMANA' : 'DÍA'}
                                </button>
                            ))}
                        </div>
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-blue-400">
                            {user?.email?.[0].toUpperCase() || 'U'}
                        </div>
                    </div>
                </header>

                {/* Calendar Grid Container */}
                <div className="flex-1 overflow-hidden flex flex-col">
                    <DndContext
                        sensors={sensors}
                        onDragStart={handleDragStart}
                        onDragMove={handleDragMove}
                        onDragEnd={handleDragEnd}
                    >
                        <div ref={gridRef} className="flex-1 flex flex-col overflow-hidden">
                            {view === 'month' && (
                                <>
                                    <div className="grid grid-cols-7 border-b border-slate-800/60 bg-[#030712]">
                                        {weekDays.map(day => (
                                            <div key={day} className="py-2.5 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest border-r border-slate-800/60 last:border-r-0">
                                                {day}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex-1 overflow-auto custom-scrollbar">
                                        {renderMonthView()}
                                    </div>
                                </>
                            )}
                            {view !== 'month' && renderTimeGridView()}
                        </div>
                        <DragOverlay dropAnimation={null}>
                            {activeId && events.find(e => e.id === activeId) ? (() => {
                                const event = events.find(e => e.id === activeId);
                                const color = getEventColor(event);

                                // Calcular timeRange si es necesario para el overlay
                                let timeRange = null;
                                if (event.start_time && event.end_time) {
                                    timeRange = `${event.start_time.slice(0, 5)} - ${event.end_time.slice(0, 5)}`;
                                } else if (event.start_time) {
                                    timeRange = event.start_time.slice(0, 5);
                                }

                                return (
                                    <div className="w-[180px] pointer-events-none origin-center rotate-2 scale-105 transition-transform">
                                        <DraggableEvent
                                            event={event}
                                            color={color}
                                            timeRange={timeRange}
                                            onClick={() => { }}
                                            isOverlay={true}
                                        />
                                    </div>
                                );
                            })() : null}
                        </DragOverlay>
                    </DndContext>
                </div>
            </div>

            {/* Event Modal */}
            {showEventModal && (
                <EventModal
                    date={selectedDate}
                    event={editingEvent}
                    onClose={() => { setShowEventModal(false); setEditingEvent(null); }}
                    onSave={() => { invalidateEvents(); setShowEventModal(false); setEditingEvent(null); }}
                    userId={user?.id}
                    initialStartTime={initialStartTime}
                    initialEndTime={initialEndTime}
                    initialAllDay={initialAllDay}
                    tags={tags}
                />
            )}

            <ConfirmationModal
                isOpen={showTagDeleteConfirm}
                onClose={() => {
                    setShowTagDeleteConfirm(false);
                    setTagToDelete(null);
                }}
                onConfirm={confirmDeleteTag}
                title="Â¿Eliminar etiqueta?"
                message="Â¿EstÃ¡s seguro de que quieres eliminar esta etiqueta? Los eventos asociados perderÃ¡n su color pero no se eliminarÃ¡n."
                confirmText="Eliminar"
                isDanger={true}
            />
        </div>
    );
};

// EventModal moved to ./modals/EventModal.jsx

export default Calendar;
