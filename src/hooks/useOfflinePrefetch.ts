import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOnlineStatus } from './useOnlineStatus';
import { cacheOfflineData } from '@/lib/offlineDataCache';

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
          return cacheOfflineData('batches', data || []);
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
          return cacheOfflineData('flocks', data || []);
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
          return cacheOfflineData('machines', data || []);
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
          return cacheOfflineData('units', data || []);
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
          return cacheOfflineData('fertility_analysis', data || []);
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
          return cacheOfflineData('qa_monitoring', data || []);
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
          return cacheOfflineData('residue_analysis', data || []);
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
          return cacheOfflineData('egg_pack_quality', data || []);
        },
        staleTime: 5 * 60 * 1000,
      });

      // Prefetch multi_setter_sets (needed for position occupancy in multi-setter QA)
      queryClient.prefetchQuery({
        queryKey: ['multi_setter_sets'],
        queryFn: async () => {
          const { data } = await supabase
            .from('multi_setter_sets')
            .select(`
              id,
              machine_id,
              flock_id,
              batch_id,
              zone,
              side,
              level,
              set_date,
              capacity,
              flocks(flock_name, flock_number),
              batches(batch_number)
            `)
            .order('set_date', { ascending: false })
            .limit(500);
          return cacheOfflineData('multi_setter_sets', data || []);
        },
        staleTime: 5 * 60 * 1000,
      });
    };

    prefetchEssentialData();
  }, [isOnline, queryClient]);
}
