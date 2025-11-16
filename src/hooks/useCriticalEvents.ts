import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CriticalEventsService } from '@/services/criticalEventsService';

export const useCriticalEvents = (viewMode: 'original' | 'dummy') => {
  return useQuery({
    queryKey: ['critical-events', viewMode],
    queryFn: async () => {
      const { data: batches, error } = await supabase
        .from('batches')
        .select(`
          id,
          batch_number,
          set_date,
          status,
          fertility_analysis!left(id),
          residue_analysis!left(id)
        `)
        .eq('data_type', viewMode)
        .in('status', ['setting', 'incubating', 'hatching']);
      
      if (error) throw error;
      
      const batchesWithFlags = batches.map(b => ({
        ...b,
        fertility_analysis_completed: Array.isArray(b.fertility_analysis) && b.fertility_analysis.length > 0,
        residue_analysis_completed: Array.isArray(b.residue_analysis) && b.residue_analysis.length > 0,
        transferred: b.status === 'hatching'
      }));
      
      return CriticalEventsService.calculateCriticalEvents(batchesWithFlags);
    },
    refetchInterval: 300000
  });
};
