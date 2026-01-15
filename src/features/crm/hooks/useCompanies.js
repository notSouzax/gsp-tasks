import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabaseClient';

/**
 * Hook para gestionar compañías del CRM
 * @param {Object} currentUser - Usuario autenticado
 * @returns {Object} Estado y operaciones de compañías
 */
export const useCompanies = (currentUser) => {
    const [companies, setCompanies] = useState([]);

    const fetchCompanies = useCallback(async () => {
        if (!currentUser) return;

        const { data, error } = await supabase
            .from('crm_companies')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('name', { ascending: true });

        if (error) {
            console.error('Error fetching companies:', error);
            return;
        }

        setCompanies(data || []);
    }, [currentUser]);

    const createCompany = useCallback(async (companyData) => {
        if (!currentUser) return null;

        const { data, error } = await supabase
            .from('crm_companies')
            .insert([{ ...companyData, user_id: currentUser.id }])
            .select()
            .single();

        if (error) {
            console.error('Error creating company:', error);
            throw error;
        }

        setCompanies(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
        return data;
    }, [currentUser]);

    const updateCompany = useCallback(async (id, updates) => {
        const { data, error } = await supabase
            .from('crm_companies')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating company:', error);
            throw error;
        }

        setCompanies(prev => prev.map(c => c.id === id ? data : c));
        return data;
    }, []);

    const deleteCompany = useCallback(async (id) => {
        const { error } = await supabase
            .from('crm_companies')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting company:', error);
            throw error;
        }

        setCompanies(prev => prev.filter(c => c.id !== id));
    }, []);

    return {
        companies,
        setCompanies,
        fetchCompanies,
        createCompany,
        updateCompany,
        deleteCompany
    };
};
