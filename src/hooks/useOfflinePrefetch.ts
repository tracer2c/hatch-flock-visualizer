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
      // Prefetch batches (houses) - matches useBatches hook exactly
      queryClient.prefetchQuery({
        queryKey: ['batches'],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('batches')
            .select(`
              *,
              flocks(flock_name, flock_number, house_number, technician_name),
              machines(machine_number, machine_type),
              fertility_analysis!left(id),
              residue_analysis!left(id)
            `)
            .order('set_date', { ascending: false });
          if (error) throw error;
          return data || [];
        },
        staleTime: 5 * 60 * 1000,
      });

      // Prefetch flocks - matches useFlocks hook exactly
      queryClient.prefetchQuery({
        queryKey: ['flocks'],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('flocks')
            .select('*')
            .order('flock_number', { ascending: true });
          if (error) throw error;
          return data || [];
        },
        staleTime: 5 * 60 * 1000,
      });

      // Prefetch machines - matches useMachines hook exactly
      queryClient.prefetchQuery({
        queryKey: ['machines'],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('machines')
            .select('*')
            .order('machine_number', { ascending: true });
          if (error) throw error;
          return data || [];
        },
        staleTime: 5 * 60 * 1000,
      });

      // Prefetch units - matches useUnits hook exactly
      queryClient.prefetchQuery({
        queryKey: ['units'],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('units')
            .select('*')
            .order('name', { ascending: true });
          if (error) throw error;
          return data || [];
        },
        staleTime: 5 * 60 * 1000,
      });

      // Prefetch recent fertility analysis
      queryClient.prefetchQuery({
        queryKey: ['fertility_analysis'],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('fertility_analysis')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(200);
          if (error) throw error;
          return data || [];
        },
        staleTime: 5 * 60 * 1000,
      });

      // Prefetch recent QA monitoring
      queryClient.prefetchQuery({
        queryKey: ['qa_monitoring'],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('qa_monitoring')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(200);
          if (error) throw error;
          return data || [];
        },
        staleTime: 5 * 60 * 1000,
      });

      // Prefetch recent residue analysis
      queryClient.prefetchQuery({
        queryKey: ['residue_analysis'],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('residue_analysis')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(200);
          if (error) throw error;
          return data || [];
        },
        staleTime: 5 * 60 * 1000,
      });

      // Prefetch egg pack quality
      queryClient.prefetchQuery({
        queryKey: ['egg_pack_quality'],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('egg_pack_quality')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(200);
          if (error) throw error;
          return data || [];
        },
        staleTime: 5 * 60 * 1000,
      });
    };

    prefetchEssentialData();
  }, [isOnline, queryClient]);
}
