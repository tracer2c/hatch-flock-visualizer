import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Unit {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  status?: string | null;
}

export function useUnits() {
  return useQuery({
    queryKey: ['units'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('units')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return (data || []) as Unit[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
