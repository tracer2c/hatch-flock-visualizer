import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface House {
  id: string;
  batch_number: string;
  flock_name: string;
  flock_number: number;
  house_number: string;
  machine_number: string;
  machine_type: string;
  set_date: string;
  expected_hatch_date: string;
  total_eggs_set: number;
  status: string;
  unit_id?: string | null;
  technician_name?: string | null;
  data_type?: 'original' | 'dummy';
  fertility_completed?: boolean;
  residue_completed?: boolean;
}

async function fetchHouses(): Promise<House[]> {
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

  return data?.map(batch => {
    let houseNumber = batch.flocks?.house_number || '';
    if (!houseNumber && batch.batch_number.includes('#')) {
      const parts = batch.batch_number.split('#');
      houseNumber = parts[1]?.trim() || '';
    }

    const fertilityCompleted = Boolean(
      Array.isArray(batch.fertility_analysis)
        ? batch.fertility_analysis.length > 0
        : batch.fertility_analysis?.id
    );
    const residueCompleted = Boolean(
      Array.isArray(batch.residue_analysis)
        ? batch.residue_analysis.length > 0
        : batch.residue_analysis?.id
    );

    return {
      id: batch.id,
      batch_number: batch.batch_number,
      flock_name: batch.flocks?.flock_name || '',
      flock_number: batch.flocks?.flock_number || 0,
      house_number: houseNumber,
      machine_number: batch.machines?.machine_number || '',
      machine_type: batch.machines?.machine_type || '',
      set_date: batch.set_date,
      expected_hatch_date: batch.expected_hatch_date,
      total_eggs_set: batch.total_eggs_set,
      status: batch.status,
      unit_id: batch.unit_id ?? null,
      technician_name: batch.flocks?.technician_name || null,
      data_type: batch.data_type as 'original' | 'dummy' || 'original',
      fertility_completed: fertilityCompleted,
      residue_completed: residueCompleted,
    };
  }) || [];
}

export function useHousesData() {
  return useQuery({
    queryKey: ['houses'],
    queryFn: fetchHouses,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useFlocksData() {
  return useQuery({
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
}

export function useMachinesData() {
  return useQuery({
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
}

export function useUnitsData() {
  return useQuery({
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
}

export function useBatchData(batchId: string | null) {
  return useQuery({
    queryKey: ['batch', batchId],
    queryFn: async () => {
      if (!batchId) return null;
      const { data, error } = await supabase
        .from('batches')
        .select(`
          *,
          flocks(flock_name, flock_number, house_number),
          machines(id, machine_number, machine_type, location)
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

export function useDataCounts(batchId: string | null) {
  return useQuery({
    queryKey: ['dataCounts', batchId],
    queryFn: async () => {
      if (!batchId) return { eggPack: 0, fertility: 0, qa: 0, residue: 0, clearsInjected: 0 };
      
      const [eggPackResult, fertilityResult, qaResult, residueResult, clearsInjectedResult] = await Promise.all([
        supabase.from('egg_pack_quality').select('id', { count: 'exact' }).eq('batch_id', batchId),
        supabase.from('fertility_analysis').select('id', { count: 'exact' }).eq('batch_id', batchId),
        supabase.from('qa_monitoring').select('id', { count: 'exact' }).eq('batch_id', batchId),
        supabase.from('residue_analysis').select('id', { count: 'exact' }).eq('batch_id', batchId),
        supabase.from('batches').select('eggs_cleared, eggs_injected').eq('id', batchId).single()
      ]);

      const clearsInjectedCount = clearsInjectedResult.data &&
        ((clearsInjectedResult.data as any).eggs_cleared !== null || (clearsInjectedResult.data as any).eggs_injected !== null) ? 1 : 0;

      return {
        eggPack: eggPackResult.count || 0,
        fertility: fertilityResult.count || 0,
        qa: qaResult.count || 0,
        residue: residueResult.count || 0,
        clearsInjected: clearsInjectedCount
      };
    },
    enabled: !!batchId,
    staleTime: 2 * 60 * 1000,
  });
}
