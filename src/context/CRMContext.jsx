import React, { createContext, useContext } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';

// Import modular hooks
import { useContacts } from '../features/crm/hooks/useContacts';
import { useCompanies } from '../features/crm/hooks/useCompanies';
import { useOpportunities } from '../features/crm/hooks/useOpportunities';
import { useActivities } from '../features/crm/hooks/useActivities';
import { usePipelines } from '../features/crm/hooks/usePipelines';
import { useCRMRealtime } from '../features/crm/hooks/useCRMRealtime';
import { useCRMStats } from '../features/crm/hooks/useCRMStats';
import { useCRMNotes } from '../features/crm/hooks/useCRMNotes';

const CRMContext = createContext(null);

export const useCRM = () => {
    const context = useContext(CRMContext);
    if (!context) {
        throw new Error('useCRM must be used within a CRMProvider');
    }
    return context;
};

export const CRMProvider = ({ children }) => {
    const { currentUser } = useAuth();
    const queryClient = useQueryClient();

    // Tags state (simple, no need for separate hook)
    const [tags, setTags] = React.useState([]);

    // Compose modular hooks (now powered by React Query)
    const pipelinesHook = usePipelines(currentUser);
    const contactsHook = useContacts(currentUser);
    const companiesHook = useCompanies(currentUser);
    const opportunitiesHook = useOpportunities(
        currentUser,
        pipelinesHook.activePipelineId,
        pipelinesHook.activeStages
    );
    const activitiesHook = useActivities(currentUser);
    const notesHook = useCRMNotes(currentUser);
    const statsHook = useCRMStats(
        opportunitiesHook.opportunities,
        contactsHook.contacts,
        companiesHook.companies,
        activitiesHook.activities
    );

    // Setup realtime subscriptions (now just invalidates queries)
    useCRMRealtime(currentUser);

    // Refresh all — invalidates all CRM queries
    const refreshAll = () => {
        queryClient.invalidateQueries({ queryKey: ['crm'] });
    };

    // Derive loading from individual hooks
    const loading = pipelinesHook.isLoading || contactsHook.isLoading ||
        companiesHook.isLoading || opportunitiesHook.isLoading ||
        activitiesHook.isLoading;

    // Compose the value object (maintaining backwards compatibility)
    const value = {
        // State
        pipelines: pipelinesHook.pipelines,
        stages: pipelinesHook.stages,
        contacts: contactsHook.contacts,
        companies: companiesHook.companies,
        opportunities: opportunitiesHook.opportunities,
        activities: activitiesHook.activities,
        tags,
        activePipelineId: pipelinesHook.activePipelineId,
        activePipeline: pipelinesHook.activePipeline,
        activeStages: pipelinesHook.activeStages,
        loading,
        error: null,

        // Setters
        setActivePipelineId: pipelinesHook.setActivePipelineId,

        // Fetch
        refreshAll,
        fetchNotes: notesHook.fetchNotes,

        // Contacts
        createContact: contactsHook.createContact,
        updateContact: contactsHook.updateContact,
        deleteContact: contactsHook.deleteContact,

        // Companies
        createCompany: companiesHook.createCompany,
        updateCompany: companiesHook.updateCompany,
        deleteCompany: companiesHook.deleteCompany,

        // Opportunities
        createOpportunity: opportunitiesHook.createOpportunity,
        updateOpportunity: opportunitiesHook.updateOpportunity,
        moveOpportunity: opportunitiesHook.moveOpportunity,
        deleteOpportunity: opportunitiesHook.deleteOpportunity,

        // Activities
        createActivity: activitiesHook.createActivity,
        updateActivity: activitiesHook.updateActivity,
        completeActivity: activitiesHook.completeActivity,
        deleteActivity: activitiesHook.deleteActivity,

        // Pipelines
        createPipeline: pipelinesHook.createPipeline,
        updatePipeline: pipelinesHook.updatePipeline,
        deletePipeline: pipelinesHook.deletePipeline,

        // Stages
        createStage: pipelinesHook.createStage,
        updateStage: pipelinesHook.updateStage,
        deleteStage: pipelinesHook.deleteStage,
        reorderStages: pipelinesHook.reorderStages,

        // Notes
        createNote: notesHook.createNote,

        // Stats
        getStats: statsHook.getStats
    };

    return (
        <CRMContext.Provider value={value}>
            {children}
        </CRMContext.Provider>
    );
};

export default CRMContext;
