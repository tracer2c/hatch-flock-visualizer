import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CriticalEventsService } from '@/services/criticalEventsService';

export const useCriticalEvents = () => {
  return useQuery({
    queryKey: ['critical-events'],
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
        .in('status', ['scheduled', 'in_setter', 'in_hatcher']);
      
      if (error) throw error;
      
      const batchesWithFlags = batches.map(b => ({
        ...b,
        // Handle both object (UNIQUE constraint) and array returns from Supabase
        fertility_analysis_completed: Boolean(
          Array.isArray(b.fertility_analysis) 
            ? b.fertility_analysis.length > 0 
            : b.fertility_analysis?.id
        ),
        residue_analysis_completed: Boolean(
          Array.isArray(b.residue_analysis) 
            ? b.residue_analysis.length > 0 
            : b.residue_analysis?.id
        ),
        transferred: b.status === 'in_hatcher'
      }));
      
      return CriticalEventsService.calculateCriticalEvents(batchesWithFlags);
    },
    refetchInterval: 300000
  });
};
