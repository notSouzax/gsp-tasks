import React, { createContext, useContext, useState, useEffect } from 'react';
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

    // Loading & Error state
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Tags state (simple, no need for separate hook)
    const [tags, setTags] = useState([]);

    // Compose modular hooks
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

    // Setup realtime subscriptions
    useCRMRealtime(currentUser, {
        setPipelines: pipelinesHook.setPipelines,
        setStages: pipelinesHook.setStages,
        setContacts: contactsHook.setContacts,
        setCompanies: companiesHook.setCompanies,
        setOpportunities: opportunitiesHook.setOpportunities,
        setActivities: activitiesHook.setActivities,
    });

    // Refresh all data
    const refreshAll = async () => {
        setLoading(true);
        try {
            await Promise.all([
                pipelinesHook.fetchPipelines(),
                pipelinesHook.fetchStages(),
                contactsHook.fetchContacts(),
                companiesHook.fetchCompanies(),
                opportunitiesHook.fetchOpportunities(),
                activitiesHook.fetchActivities(),
            ]);
        } catch (err) {
            setError(err.message);
        }
        setLoading(false);
    };

    // Initial fetch - only when user changes
    useEffect(() => {
        if (currentUser) {
            refreshAll();
        } else {
            // Reset all state when user logs out
            pipelinesHook.setPipelines([]);
            pipelinesHook.setStages([]);
            pipelinesHook.setActivePipelineId(null);
            contactsHook.setContacts([]);
            companiesHook.setCompanies([]);
            opportunitiesHook.setOpportunities([]);
            activitiesHook.setActivities([]);
            setTags([]);
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser?.id]);

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
        error,

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
