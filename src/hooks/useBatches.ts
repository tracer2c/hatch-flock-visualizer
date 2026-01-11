import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BatchWithRelations {
  id: string;
  batch_number: string;
  flock_id: string;
  machine_id: string | null;
  unit_id: string | null;
  set_date: string;
  set_time: string | null;
  expected_hatch_date: string;
  actual_hatch_date: string | null;
  total_eggs_set: number;
  eggs_injected: number;
  eggs_cleared: number | null;
  chicks_hatched: number;
  status: string;
  notes: string | null;
  data_type: string;
  temperature_avg: number | null;
  humidity_avg: number | null;
  created_at: string;
  updated_at: string;
  flocks: {
    flock_name: string;
    flock_number: number;
    house_number: string | null;
    technician_name: string | null;
  } | null;
  machines: {
    machine_number: string;
    machine_type: string;
  } | null;
  fertility_analysis: { id: string } | { id: string }[] | null;
  residue_analysis: { id: string } | { id: string }[] | null;
}

export function useBatches() {
  return useQuery({
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
      return (data || []) as BatchWithRelations[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useBatch(batchId: string | undefined) {
  return useQuery({
    queryKey: ['batch', batchId],
    queryFn: async () => {
      if (!batchId) return null;
      const { data, error } = await supabase
        .from('batches')
        .select(`
          *,
          flocks(flock_name, flock_number, house_number, technician_name, age_weeks, breed),
          machines(machine_number, machine_type),
          units(id, name)
        `)
        .eq('id', batchId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!batchId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useInvalidateBatches() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['batches'] });
}
