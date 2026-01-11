import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Machine {
  id: string;
  machine_number: string;
  machine_type: string;
  capacity: number;
  status: string | null;
  location: string | null;
  unit_id?: string | null;
  last_maintenance?: string | null;
  notes?: string | null;
}

export function useMachines() {
  return useQuery({
    queryKey: ['machines'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('machines')
        .select('*')
        .order('machine_number', { ascending: true });
      if (error) throw error;
      return (data || []) as Machine[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
