/**
 * Hook for fetching and calculating available machine capacity
 * 
 * Provides real-time capacity information for setter machines,
 * supporting both single-setter and multi-setter allocation workflows.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Machine,
  Allocation,
  MultiSetterSet,
  MachineCapacityInfo,
  getMachineAvailableCapacity,
  suggestAllocationSplit
} from '@/utils/machineCapacityUtils';

interface UseAvailableMachineCapacityOptions {
  targetSetDate: string;
  hatcheryId?: string | null;
  machineType?: 'setter' | 'combo' | 'all';
  setterMode?: 'single_setter' | 'multi_setter' | 'all';
}

interface UseAvailableMachineCapacityResult {
  machines: MachineCapacityInfo[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  suggestSplit: (totalEggs: number) => ReturnType<typeof suggestAllocationSplit>;
  totalAvailableCapacity: number;
}

export function useAvailableMachineCapacity(
  options: UseAvailableMachineCapacityOptions
): UseAvailableMachineCapacityResult {
  const { targetSetDate, hatcheryId, machineType = 'all', setterMode = 'all' } = options;

  // Fetch machines
  const machinesQuery = useQuery({
    queryKey: ['machines-for-allocation', hatcheryId, machineType, setterMode],
    queryFn: async () => {
      let query = supabase
        .from('machines')
        .select('*')
        .in('machine_type', machineType === 'all' ? ['setter', 'combo'] : [machineType])
        .neq('status', 'offline');

      if (hatcheryId) {
        query = query.eq('unit_id', hatcheryId);
      }

      if (setterMode !== 'all') {
        query = query.eq('setter_mode', setterMode);
      }

      const { data, error } = await query.order('machine_number');

      if (error) throw error;
      return data as Machine[];
    }
  });

  // Fetch active allocations
  const allocationsQuery = useQuery({
    queryKey: ['active-allocations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('house_machine_allocations')
        .select('*')
        .eq('status', 'active');

      if (error) throw error;
      return data as Allocation[];
    }
  });

  // Fetch active multi-setter sets (not yet transferred)
  const setsQuery = useQuery({
    queryKey: ['active-multi-setter-sets', targetSetDate],
    queryFn: async () => {
      // Get all multi-setter sets
      const { data: sets, error: setsError } = await supabase
        .from('multi_setter_sets')
        .select('*');

      if (setsError) throw setsError;

      // Get all transfers to filter out transferred sets
      const { data: transfers, error: transfersError } = await supabase
        .from('machine_transfers')
        .select('batch_id, from_machine_id, transfer_date');

      if (transfersError) throw transfersError;

      // A set is active if its batch hasn't been transferred from its machine
      const transferredBatchMachines = new Set(
        (transfers || []).map(t => `${t.batch_id}-${t.from_machine_id}`)
      );

      const activeSets = (sets || []).filter(s => {
        const key = `${s.batch_id}-${s.machine_id}`;
        return !transferredBatchMachines.has(key);
      });

      return activeSets as MultiSetterSet[];
    }
  });

  const isLoading = machinesQuery.isLoading || allocationsQuery.isLoading || setsQuery.isLoading;
  const error = machinesQuery.error || allocationsQuery.error || setsQuery.error;

  // Calculate capacity for each machine
  const machines: MachineCapacityInfo[] = (machinesQuery.data || []).map(machine => {
    return getMachineAvailableCapacity(
      machine,
      allocationsQuery.data || [],
      setsQuery.data || [],
      targetSetDate
    );
  });

  // Sort: available machines first, then by available capacity descending
  const sortedMachines = [...machines].sort((a, b) => {
    // Machines that can accept allocations come first
    if (a.canAcceptNewAllocation && !b.canAcceptNewAllocation) return -1;
    if (!a.canAcceptNewAllocation && b.canAcceptNewAllocation) return 1;
    
    // Then sort by available capacity
    return b.availableCapacity - a.availableCapacity;
  });

  const totalAvailableCapacity = sortedMachines
    .filter(m => m.canAcceptNewAllocation)
    .reduce((sum, m) => sum + m.availableCapacity, 0);

  const refetch = () => {
    machinesQuery.refetch();
    allocationsQuery.refetch();
    setsQuery.refetch();
  };

  const suggestSplit = (totalEggs: number) => {
    return suggestAllocationSplit(totalEggs, sortedMachines);
  };

  return {
    machines: sortedMachines,
    isLoading,
    error: error as Error | null,
    refetch,
    suggestSplit,
    totalAvailableCapacity
  };
}

/**
 * Hook to fetch allocations for a specific batch/house
 */
export function useBatchAllocations(batchId: string | undefined) {
  return useQuery({
    queryKey: ['batch-allocations', batchId],
    queryFn: async () => {
      if (!batchId) return [];

      const { data, error } = await supabase
        .from('house_machine_allocations')
        .select(`
          *,
          machine:machines(id, machine_number, machine_type, setter_mode, capacity, unit_id)
        `)
        .eq('batch_id', batchId)
        .order('allocation_date', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!batchId
  });
}

/**
 * Hook to fetch allocations for a specific machine
 */
export function useMachineAllocations(machineId: string | undefined, statusFilter?: string) {
  return useQuery({
    queryKey: ['machine-allocations', machineId, statusFilter],
    queryFn: async () => {
      if (!machineId) return [];

      let query = supabase
        .from('house_machine_allocations')
        .select(`
          *,
          batch:batches(id, batch_number, flock_id, total_eggs_set, set_date, status,
            flock:flocks(id, flock_name, flock_number)
          )
        `)
        .eq('machine_id', machineId)
        .order('allocation_date', { ascending: false });

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
    enabled: !!machineId
  });
}

/**
 * Hook to create a new allocation
 */
export function useCreateAllocation() {
  const createAllocation = async (allocation: {
    batch_id: string;
    machine_id: string;
    eggs_allocated: number;
    allocation_date: string;
    allocation_time?: string;
    notes?: string;
    company_id: string;
    created_by?: string;
  }) => {
    const { data, error } = await supabase
      .from('house_machine_allocations')
      .insert(allocation)
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  return { createAllocation };
}

/**
 * Hook to update an allocation status
 */
export function useUpdateAllocationStatus() {
  const updateStatus = async (
    allocationId: string,
    status: 'active' | 'transferred' | 'completed'
  ) => {
    const { data, error } = await supabase
      .from('house_machine_allocations')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', allocationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  return { updateStatus };
}
