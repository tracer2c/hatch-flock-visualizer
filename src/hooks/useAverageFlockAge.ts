import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useAverageFlockAge = (viewMode: 'original' | 'dummy') => {
  return useQuery({
    queryKey: ['average-flock-age', viewMode],
    queryFn: async () => {
      // Get all active batches with their flocks
      const { data: batches, error } = await supabase
        .from('batches')
        .select(`
          id,
          status,
          flocks (
            age_weeks
          )
        `)
        .eq('data_type', viewMode)
        .in('status', ['setting', 'incubating', 'hatching']);

      if (error) throw error;

      // Calculate average age from active batches
      const ages = batches
        .filter((b: any) => b.flocks?.age_weeks)
        .map((b: any) => b.flocks.age_weeks);

      if (ages.length === 0) return null;

      const avgAge = ages.reduce((sum, age) => sum + age, 0) / ages.length;
      
      return {
        average: Number(avgAge.toFixed(1)),
        min: Math.min(...ages),
        max: Math.max(...ages),
        count: ages.length
      };
    },
    refetchInterval: 60000 // Refresh every minute
  });
};
