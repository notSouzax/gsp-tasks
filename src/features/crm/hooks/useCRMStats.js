import { useCallback } from 'react';

/**
 * Hook para calcular estadísticas del CRM
 * @param {Array} opportunities - Lista de oportunidades
 * @param {Array} contacts - Lista de contactos
 * @param {Array} companies - Lista de compañías
 * @param {Array} activities - Lista de actividades
 * @returns {Object} Función para obtener estadísticas
 */
export const useCRMStats = (opportunities, contacts, companies, activities) => {
    const getStats = useCallback(() => {
        const now = new Date();

        const activeOpps = opportunities.filter(o => !o.is_won && !o.is_lost);
        const wonOpps = opportunities.filter(o => o.is_won);
        const lostOpps = opportunities.filter(o => o.is_lost);

        const totalPipelineValue = activeOpps.reduce((sum, o) => sum + (parseFloat(o.expected_revenue) || 0), 0);
        const weightedPipelineValue = activeOpps.reduce((sum, o) => sum + (parseFloat(o.weighted_revenue) || 0), 0);
        const wonValue = wonOpps.reduce((sum, o) => sum + (parseFloat(o.expected_revenue) || 0), 0);

        const conversionRate = opportunities.length > 0
            ? (wonOpps.length / (wonOpps.length + lostOpps.length) * 100) || 0
            : 0;

        const pendingActivities = activities.filter(a => !a.is_done && new Date(a.due_date) <= now).length;
        const upcomingActivities = activities.filter(a => !a.is_done && new Date(a.due_date) > now).length;

        return {
            totalContacts: contacts.length,
            totalCompanies: companies.length,
            activeOpportunities: activeOpps.length,
            wonOpportunities: wonOpps.length,
            lostOpportunities: lostOpps.length,
            totalPipelineValue,
            weightedPipelineValue,
            wonValue,
            conversionRate: conversionRate.toFixed(1),
            pendingActivities,
            upcomingActivities
        };
    }, [opportunities, contacts, companies, activities]);

    return { getStats };
};
