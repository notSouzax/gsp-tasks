import React from 'react';
import KanbanView from '../components/KanbanView';

const KanbanPage = ({
    boards,
    activeBoardId,
    onSwitchBoard,
    onCreateBoard,
    onEditBoard,
    onDeleteBoard,
    onReorderBoards,
    updateActiveBoard,
    pendingTaskId
}) => {
    return (
        <KanbanView
            boards={boards}
            activeBoardId={activeBoardId}
            onSwitchBoard={onSwitchBoard}
            onCreateBoard={onCreateBoard}
            onEditBoard={onEditBoard}
            onDeleteBoard={onDeleteBoard}
            onReorderBoards={onReorderBoards}
            onColumnsChange={updateActiveBoard}
            pendingTaskId={pendingTaskId}
        />
    );
};

export default KanbanPage;
