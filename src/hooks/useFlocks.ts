import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Flock {
  id: string;
  flock_number: number;
  flock_name: string;
  house_number: string | null;
  age_weeks: number;
  unit_id?: string | null;
  breed?: string;
  arrival_date?: string;
  total_birds?: number | null;
  technician_name?: string | null;
  notes?: string | null;
}

export function useFlocks() {
  return useQuery({
    queryKey: ['flocks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('flocks')
        .select('*')
        .order('flock_number', { ascending: true });
      if (error) throw error;
      return (data || []) as Flock[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
