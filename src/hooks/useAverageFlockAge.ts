import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useAverageFlockAge = () => {
  return useQuery({
    queryKey: ['average-flock-age'],
    queryFn: async () => {
      const { data: batches, error } = await supabase
        .from('batches')
        .select(`
          id,
          status,
          flocks (
            age_weeks
          )
        `)
        .in('status', ['scheduled', 'in_setter', 'in_hatcher']);

      if (error) throw error;

      const ages = batches
        .filter((b: any) => b.flocks?.age_weeks)
        .map((b: any) => b.flocks.age_weeks);

      if (ages.length === 0) return null;

      const avgAge = ages.reduce((sum, age) => sum + age, 0) / ages.length;
      
      return {
        average: Math.round(avgAge),
        min: Math.min(...ages),
        max: Math.max(...ages),
        count: ages.length
      };
    },
    refetchInterval: 60000
  });
};
