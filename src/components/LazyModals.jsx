import React, { Suspense, lazy } from 'react';

// Modal Loading Fallback
const ModalLoadingFallback = () => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-slate-800 rounded-xl p-8 flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
            <p className="text-slate-300 text-sm">Cargando...</p>
        </div>
    </div>
);

// Lazy Modal Components
export const LazyTaskDetailModal = lazy(() => import('./modals/TaskDetailModal'));
export const LazyProfileModal = lazy(() => import('./modals/ProfileModal'));
export const LazyActivityDrawer = lazy(() => import('./modals/ActivityDrawer'));
export const LazyColumnModal = lazy(() => import('./modals/ColumnModal'));
export const LazySettingsModal = lazy(() => import('./modals/SettingsModal'));
export const LazySearchModal = lazy(() => import('./modals/SearchModal'));
export const LazyInviteMemberModal = lazy(() => import('./modals/InviteMemberModal'));
export const LazyCreateTaskModal = lazy(() => import('./modals/CreateTaskModal'));

// Wrapper HOC for lazy modals with Suspense
export const withLazySuspense = (LazyComponent) => {
    return function LazyModalWrapper(props) {
        // Only render if modal is open (prevents loading unused modals)
        if (!props.isOpen) return null;

        return (
            <Suspense fallback={<ModalLoadingFallback />}>
                <LazyComponent {...props} />
            </Suspense>
        );
    };
};

// Pre-wrapped lazy modals ready to use
export const SuspendedTaskDetailModal = withLazySuspense(LazyTaskDetailModal);
export const SuspendedProfileModal = withLazySuspense(LazyProfileModal);
export const SuspendedActivityDrawer = withLazySuspense(LazyActivityDrawer);
export const SuspendedColumnModal = withLazySuspense(LazyColumnModal);
export const SuspendedSettingsModal = withLazySuspense(LazySettingsModal);
export const SuspendedSearchModal = withLazySuspense(LazySearchModal);
export const SuspendedInviteMemberModal = withLazySuspense(LazyInviteMemberModal);
export const SuspendedCreateTaskModal = withLazySuspense(LazyCreateTaskModal);

export { ModalLoadingFallback };
