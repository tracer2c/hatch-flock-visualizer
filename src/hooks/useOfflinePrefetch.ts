import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOnlineStatus } from './useOnlineStatus';

export function useOfflinePrefetch() {
  const queryClient = useQueryClient();
  const { isOnline } = useOnlineStatus();

  useEffect(() => {
    if (!isOnline) return;

    const prefetchEssentialData = async () => {
      // Prefetch batches (houses)
      queryClient.prefetchQuery({
        queryKey: ['batches'],
        queryFn: async () => {
          const { data } = await supabase
            .from('batches')
            .select(`
              *,
              flock:flocks(id, flock_name, flock_number, age_weeks, breed),
              machine:machines(id, machine_number, machine_type)
            `)
            .order('set_date', { ascending: false })
            .limit(100);
          return data || [];
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
      });

      // Prefetch flocks
      queryClient.prefetchQuery({
        queryKey: ['flocks'],
        queryFn: async () => {
          const { data } = await supabase
            .from('flocks')
            .select('*')
            .order('flock_name', { ascending: true });
          return data || [];
        },
        staleTime: 5 * 60 * 1000,
      });

      // Prefetch machines
      queryClient.prefetchQuery({
        queryKey: ['machines'],
        queryFn: async () => {
          const { data } = await supabase
            .from('machines')
            .select('*')
            .order('machine_number', { ascending: true });
          return data || [];
        },
        staleTime: 5 * 60 * 1000,
      });

      // Prefetch units
      queryClient.prefetchQuery({
        queryKey: ['units'],
        queryFn: async () => {
          const { data } = await supabase
            .from('units')
            .select('*')
            .order('name', { ascending: true });
          return data || [];
        },
        staleTime: 5 * 60 * 1000,
      });

      // Prefetch recent fertility analysis
      queryClient.prefetchQuery({
        queryKey: ['fertility_analysis'],
        queryFn: async () => {
          const { data } = await supabase
            .from('fertility_analysis')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(200);
          return data || [];
        },
        staleTime: 5 * 60 * 1000,
      });

      // Prefetch recent QA monitoring
      queryClient.prefetchQuery({
        queryKey: ['qa_monitoring'],
        queryFn: async () => {
          const { data } = await supabase
            .from('qa_monitoring')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(200);
          return data || [];
        },
        staleTime: 5 * 60 * 1000,
      });

      // Prefetch recent residue analysis
      queryClient.prefetchQuery({
        queryKey: ['residue_analysis'],
        queryFn: async () => {
          const { data } = await supabase
            .from('residue_analysis')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(200);
          return data || [];
        },
        staleTime: 5 * 60 * 1000,
      });

      // Prefetch egg pack quality
      queryClient.prefetchQuery({
        queryKey: ['egg_pack_quality'],
        queryFn: async () => {
          const { data } = await supabase
            .from('egg_pack_quality')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(200);
          return data || [];
        },
        staleTime: 5 * 60 * 1000,
      });
    };

    prefetchEssentialData();
  }, [isOnline, queryClient]);
}
