import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useBatchData = () => {
  return useQuery({
    queryKey: ['batches-with-relations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('batches')
        .select(`
          *,
          flocks (
            flock_number,
            flock_name,
            age_weeks,
            breed,
            house_number,
            total_birds
          ),
          machines (
            machine_number,
            machine_type,
            capacity,
            location,
            status
          ),
          fertility_analysis (*),
          egg_pack_quality (*),
          qa_monitoring (*),
          residue_analysis (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
};

export const useActiveBatches = () => {
  return useQuery({
    queryKey: ['active-batches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('batches')
        .select(`
          *,
          flocks (flock_number, flock_name, age_weeks),
          machines (machine_number, machine_type, status)
        `)
        .in('status', ['setting', 'incubating', 'hatching'])
        .order('set_date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });
};

export const useBatchPerformanceMetrics = () => {
  return useQuery({
    queryKey: ['batch-performance-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('batches')
        .select(`
          id,
          batch_number,
          status,
          total_eggs_set,
          flocks (flock_number, flock_name, age_weeks, breed),
          fertility_analysis (
            fertility_percent,
            hatch_percent,
            hof_percent,
            early_dead,
            late_dead,
            sample_size
          ),
          egg_pack_quality (
            grade_a,
            grade_b,
            grade_c,
            cracked,
            dirty,
            sample_size
          )
        `)
        .eq('status', 'completed')
        .not('fertility_analysis', 'is', null);

      if (error) throw error;
      
      // Calculate performance metrics
      return data?.map(batch => {
        const fertility = batch.fertility_analysis?.[0];
        const eggQuality = batch.egg_pack_quality?.[0];
        
        const qualityScore = eggQuality ? 
          ((eggQuality.grade_a + eggQuality.grade_b) / eggQuality.sample_size) * 100 : 0;
        
        return {
          batchNumber: batch.batch_number,
          flockName: batch.flocks?.flock_name || 'Unknown',
          flockNumber: batch.flocks?.flock_number || 0,
          age: batch.flocks?.age_weeks || 0,
          breed: batch.flocks?.breed || 'unknown',
          fertility: fertility?.fertility_percent || 0,
          hatch: fertility?.hatch_percent || 0,
          hof: fertility?.hof_percent || 0,
          earlyDead: ((fertility?.early_dead || 0) / (fertility?.sample_size || 1)) * 100,
          qualityScore,
          totalEggs: batch.total_eggs_set,
          status: batch.status
        };
      }) || [];
    },
  });
};

export const useQAAlerts = () => {
  return useQuery({
    queryKey: ['qa-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('qa_monitoring')
        .select(`
          *,
          batches (
            batch_number,
            flocks (flock_number, flock_name)
          )
        `)
        .or('temperature.lt.99,temperature.gt.101,humidity.lt.55,humidity.gt.65')
        .order('check_date', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
  });
};

export const useMachineUtilization = () => {
  return useQuery({
    queryKey: ['machine-utilization'],
    queryFn: async () => {
      const { data: machines, error: machinesError } = await supabase
        .from('machines')
        .select('*');

      if (machinesError) throw machinesError;

      const { data: activeBatches, error: batchesError } = await supabase
        .from('batches')
        .select('machine_id, status, total_eggs_set')
        .in('status', ['setting', 'incubating', 'hatching']);

      if (batchesError) throw batchesError;

      return machines?.map(machine => {
        const activeBatch = activeBatches?.find(b => b.machine_id === machine.id);
        const utilization = activeBatch 
          ? (activeBatch.total_eggs_set / machine.capacity) * 100
          : 0;

        return {
          ...machine,
          utilization,
          currentStatus: activeBatch?.status || 'available',
          currentLoad: activeBatch?.total_eggs_set || 0
        };
      }) || [];
    },
  });
};