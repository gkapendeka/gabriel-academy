import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export function useJobs(role, userId) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!role || (role !== 'admin' && !userId)) return;

    async function fetchJobs() {
      try {
        let query = supabase.from('jobs').select('*, client:client_id(display_name, email), consultant:consultant_id(display_name, email)').order('created_at', { ascending: false });

        if (role === 'client') {
          query = query.eq('client_id', userId);
        } else if (role === 'consultant') {
          // Consultants see jobs they are assigned to, or jobs that are posted
          query = query.or(`consultant_id.eq.${userId},status.eq.posted`);
        }

        const { data, error } = await query;
        if (error) throw error;
        setJobs(data);
      } catch (error) {
        console.error('Error fetching jobs:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchJobs();

    // Set up realtime subscription
    const channel = supabase
      .channel('public:jobs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, (payload) => {
        // Simple strategy: just refetch all jobs on any change to ensure permissions are respected
        fetchJobs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [role, userId]);

  return { jobs, loading };
}
