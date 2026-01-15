import { useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';

/**
 * Hook para gestionar subscripciones realtime del CRM
 * @param {Object} currentUser - Usuario autenticado
 * @param {Object} setters - Funciones setter de los otros hooks
 */
export const useCRMRealtime = (currentUser, setters) => {
    const {
        setPipelines,
        setStages,
        setContacts,
        setCompanies,
        setOpportunities,
        setActivities
    } = setters;

    useEffect(() => {
        if (!currentUser) return;

        const userId = currentUser.id;

        const channel = supabase
            .channel('crm-realtime')
            // Pipelines
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'crm_pipelines' },
                (payload) => {
                    // DELETE first (RLS protects)
                    if (payload.eventType === 'DELETE') {
                        setPipelines(prev => prev.filter(p => p.id !== payload.old.id));
                        return;
                    }

                    if (payload.new?.user_id !== userId) return;

                    if (payload.eventType === 'INSERT') {
                        setPipelines(prev => {
                            if (prev.some(p => p.id === payload.new.id)) return prev;
                            return [...prev, payload.new];
                        });
                    } else if (payload.eventType === 'UPDATE') {
                        setPipelines(prev => prev.map(p => p.id === payload.new.id ? payload.new : p));
                    }
                }
            )
            // Stages - no user_id filter needed since we validate via pipeline
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'crm_stages' },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        setStages(prev => {
                            if (prev.some(s => s.id === payload.new.id)) return prev;
                            return [...prev, payload.new].sort((a, b) => a.position - b.position);
                        });
                    } else if (payload.eventType === 'UPDATE') {
                        setStages(prev => prev.map(s => s.id === payload.new.id ? payload.new : s).sort((a, b) => a.position - b.position));
                    } else if (payload.eventType === 'DELETE') {
                        setStages(prev => prev.filter(s => s.id !== payload.old.id));
                    }
                }
            )
            // Contacts
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'crm_contacts' },
                async (payload) => {
                    // DELETE first (RLS protects)
                    if (payload.eventType === 'DELETE') {
                        setContacts(prev => prev.filter(c => c.id !== payload.old.id));
                        return;
                    }

                    if (payload.new?.user_id !== userId) return;

                    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                        const { data } = await supabase
                            .from('crm_contacts')
                            .select('*, company:crm_companies(id, name)')
                            .eq('id', payload.new.id)
                            .single();
                        if (data) {
                            if (payload.eventType === 'INSERT') {
                                setContacts(prev => {
                                    if (prev.some(c => c.id === data.id)) return prev;
                                    return [data, ...prev];
                                });
                            } else {
                                setContacts(prev => prev.map(c => c.id === data.id ? data : c));
                            }
                        }
                    }
                }
            )
            // Companies
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'crm_companies' },
                (payload) => {
                    // DELETE first (RLS protects)
                    if (payload.eventType === 'DELETE') {
                        setCompanies(prev => prev.filter(c => c.id !== payload.old.id));
                        return;
                    }

                    if (payload.new?.user_id !== userId) return;

                    if (payload.eventType === 'INSERT') {
                        setCompanies(prev => {
                            if (prev.some(c => c.id === payload.new.id)) return prev;
                            return [...prev, payload.new].sort((a, b) => a.name.localeCompare(b.name));
                        });
                    } else if (payload.eventType === 'UPDATE') {
                        setCompanies(prev => prev.map(c => c.id === payload.new.id ? payload.new : c));
                    }
                }
            )
            // Opportunities
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'crm_opportunities' },
                async (payload) => {
                    // For DELETE, process directly (RLS already protects)
                    if (payload.eventType === 'DELETE') {
                        setOpportunities(prev => prev.filter(o => o.id !== payload.old.id));
                        return;
                    }

                    // For INSERT/UPDATE, verify user_id
                    if (payload.new?.user_id !== userId) return;

                    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                        const { data } = await supabase
                            .from('crm_opportunities')
                            .select(`
                                *,
                                contact:crm_contacts(id, first_name, last_name, email),
                                company:crm_companies(id, name),
                                stage:crm_stages(id, name, color, is_won, is_lost)
                            `)
                            .eq('id', payload.new.id)
                            .single();
                        if (data) {
                            if (payload.eventType === 'INSERT') {
                                setOpportunities(prev => {
                                    if (prev.some(o => o.id === data.id)) return prev;
                                    return [...prev, data];
                                });
                            } else {
                                setOpportunities(prev => prev.map(o => o.id === data.id ? data : o));
                            }
                        }
                    }
                }
            )
            // Activities
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'crm_activities' },
                async (payload) => {
                    // DELETE first (RLS protects)
                    if (payload.eventType === 'DELETE') {
                        setActivities(prev => prev.filter(a => a.id !== payload.old.id));
                        return;
                    }

                    if (payload.new?.user_id !== userId) return;

                    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                        const { data } = await supabase
                            .from('crm_activities')
                            .select(`
                                *,
                                contact:crm_contacts(id, first_name, last_name),
                                opportunity:crm_opportunities(id, name)
                            `)
                            .eq('id', payload.new.id)
                            .single();
                        if (data) {
                            if (data.is_done) {
                                setActivities(prev => prev.filter(a => a.id !== data.id));
                            } else if (payload.eventType === 'INSERT') {
                                setActivities(prev => {
                                    if (prev.some(a => a.id === data.id)) return prev;
                                    return [...prev, data].sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
                                });
                            } else {
                                setActivities(prev => prev.map(a => a.id === data.id ? data : a));
                            }
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUser?.id, setPipelines, setStages, setContacts, setCompanies, setOpportunities, setActivities]);
};
