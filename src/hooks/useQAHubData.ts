import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Fetch all hatcheries (units)
export function useHatcheries() {
  return useQuery({
    queryKey: ['hatcheries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('units')
        .select('id, name, code, status')
        .eq('status', 'active')
        .order('name');
      
      if (error) throw error;
      return data || [];
    }
  });
}

// Fetch houses in single-setter machines (setter_mode = 'single_setter' or null)
export function useSingleSetterHouses(hatcheryId?: string) {
  return useQuery({
    queryKey: ['single-setter-houses', hatcheryId],
    queryFn: async () => {
      let query = supabase
        .from('batches')
        .select(`
          id,
          batch_number,
          set_date,
          status,
          total_eggs_set,
          flock:flocks!batches_flock_id_fkey(
            id,
            flock_name,
            flock_number,
            age_weeks
          ),
          machine:machines!batches_machine_id_fkey(
            id,
            machine_number,
            setter_mode,
            machine_type,
            location
          ),
          unit:units!batches_unit_fk(
            id,
            name,
            code
          )
        `)
        .in('status', ['incubating', 'hatching']);
      
      if (hatcheryId) {
        query = query.eq('unit_id', hatcheryId);
      }
      
      const { data, error } = await query.order('set_date', { ascending: false });
      
      if (error) throw error;
      
      // Filter to only single-setter machines (setter_mode is null or 'single_setter')
      return (data || []).filter(batch => {
        const mode = batch.machine?.setter_mode;
        return mode === null || mode === 'single_setter';
      });
    }
  });
}

// Fetch single-setter machines with their current house occupant
export function useSingleSetterMachines(hatcheryId?: string) {
  return useQuery({
    queryKey: ['single-setter-machines', hatcheryId],
    queryFn: async () => {
      // Get single-setter machines (setter_mode is null or 'single_setter')
      let query = supabase
        .from('machines')
        .select(`
          id,
          machine_number,
          machine_type,
          setter_mode,
          location,
          capacity,
          status,
          unit:units!machines_unit_id_fkey(
            id,
            name,
            code
          )
        `)
        .in('machine_type', ['setter', 'combo']);
      
      if (hatcheryId) {
        query = query.eq('unit_id', hatcheryId);
      }
      
      const { data: machines, error: machineError } = await query.order('machine_number');
      
      if (machineError) throw machineError;
      
      // Filter to single-setter machines only
      const singleSetterMachines = (machines || []).filter(m => 
        m.setter_mode === null || m.setter_mode === 'single_setter'
      );
      
      // For each machine, find the current house (batch) loaded
      const today = new Date().toISOString().split('T')[0];
      const machinesWithOccupant = await Promise.all(
        singleSetterMachines.map(async (machine) => {
          // Find active batch in this machine
          const { data: batches } = await supabase
            .from('batches')
            .select(`
              id,
              batch_number,
              set_date,
              status,
              total_eggs_set,
              flock:flocks!batches_flock_id_fkey(
                id,
                flock_name,
                flock_number
              )
            `)
            .eq('machine_id', machine.id)
            .in('status', ['incubating', 'hatching'])
            .lte('set_date', today)
            .order('set_date', { ascending: false })
            .limit(1);
          
          const currentHouse = batches?.[0] || null;
          
          // Calculate days in incubation
          let daysInIncubation = 0;
          if (currentHouse?.set_date) {
            const setDate = new Date(currentHouse.set_date);
            const now = new Date();
            daysInIncubation = Math.floor((now.getTime() - setDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          }
          
          return {
            ...machine,
            currentHouse,
            daysInIncubation,
            hasOccupant: !!currentHouse
          };
        })
      );
      
      return machinesWithOccupant;
    }
  });
}

// Fetch multi-setter machines with occupancy count
export function useMultiSetterMachines(hatcheryId?: string) {
  return useQuery({
    queryKey: ['multi-setter-machines', hatcheryId],
    queryFn: async () => {
      let query = supabase
        .from('machines')
        .select(`
          id,
          machine_number,
          machine_type,
          setter_mode,
          location,
          capacity,
          status,
          unit:units!machines_unit_id_fkey(
            id,
            name,
            code
          )
        `)
        .eq('setter_mode', 'multi_setter')
        .in('machine_type', ['setter', 'combo']);
      
      if (hatcheryId) {
        query = query.eq('unit_id', hatcheryId);
      }
      
      const { data: machines, error: machineError } = await query.order('machine_number');
      
      if (machineError) throw machineError;
      
      // Get occupancy counts for each machine
      const today = new Date().toISOString().split('T')[0];
      const machinesWithOccupancy = await Promise.all(
        (machines || []).map(async (machine) => {
          // Get active sets (not transferred)
          const { data: sets } = await supabase
            .from('multi_setter_sets')
            .select('id, flock_id')
            .eq('machine_id', machine.id)
            .lte('set_date', today);
          
          // Get transfers out
          const { data: transfers } = await supabase
            .from('machine_transfers')
            .select('batch_id')
            .eq('from_machine_id', machine.id)
            .lte('transfer_date', today);
          
          const transferredBatchIds = new Set((transfers || []).map(t => t.batch_id));
          const activeSets = (sets || []).filter(s => !transferredBatchIds.has(s.id));
          const uniqueFlocks = new Set(activeSets.map(s => s.flock_id));
          
          return {
            ...machine,
            occupiedPositions: activeSets.length,
            totalPositions: 18,
            activeFlocks: uniqueFlocks.size
          };
        })
      );
      
      return machinesWithOccupancy;
    }
  });
}

// Fetch recent QA entries with pagination
export function useRecentQAEntries(limit: number = 20, offset: number = 0) {
  return useQuery({
    queryKey: ['recent-qa-entries', limit, offset],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from('qa_monitoring')
        .select(`
          id,
          check_date,
          check_time,
          entry_mode,
          inspector_name,
          temperature,
          humidity,
          temp_avg_overall,
          day_of_incubation,
          notes,
          created_at,
          batch:batches!qa_monitoring_batch_id_fkey(
            id,
            batch_number,
            flock:flocks!batches_flock_id_fkey(
              flock_name,
              flock_number
            )
          ),
          machine:machines!qa_monitoring_machine_id_fkey(
            id,
            machine_number
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (error) throw error;
      
      return {
        entries: data || [],
        totalCount: count || 0,
        hasMore: (count || 0) > offset + limit
      };
    }
  });
}

// Get QA stats for dashboard cards
export function useQAStats() {
  return useQuery({
    queryKey: ['qa-stats'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      // Today's entries
      const { count: todayCount } = await supabase
        .from('qa_monitoring')
        .select('id', { count: 'exact', head: true })
        .gte('check_date', today);
      
      // This week's entries
      const { count: weekCount } = await supabase
        .from('qa_monitoring')
        .select('id', { count: 'exact', head: true })
        .gte('check_date', weekAgo);
      
      return {
        today: todayCount || 0,
        thisWeek: weekCount || 0
      };
    }
  });
}
