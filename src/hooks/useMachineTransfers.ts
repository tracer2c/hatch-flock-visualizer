import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MachineTransfer {
  id: string;
  batch_id: string;
  from_machine_id: string;
  to_machine_id: string;
  transfer_date: string;
  transfer_time: string | null;
  days_in_previous_machine: number | null;
  transferred_by: string | null;
  notes: string | null;
  company_id: string;
  created_at: string;
  updated_at: string;
  batch?: {
    batch_number: string;
    set_date: string;
    flock?: {
      flock_name: string;
      flock_number: number;
    };
  };
  from_machine?: {
    machine_number: string;
    machine_type: string;
  };
  to_machine?: {
    machine_number: string;
    machine_type: string;
  };
}

interface TransferFilters {
  dateFrom?: string;
  dateTo?: string;
}

// Get all transfers for a specific batch
export function useBatchTransfers(batchId: string | undefined) {
  return useQuery({
    queryKey: ['batch-transfers', batchId],
    queryFn: async () => {
      if (!batchId) return [];
      
      const { data, error } = await supabase
        .from('machine_transfers')
        .select(`
          *,
          from_machine:machines!machine_transfers_from_machine_id_fkey(machine_number, machine_type),
          to_machine:machines!machine_transfers_to_machine_id_fkey(machine_number, machine_type)
        `)
        .eq('batch_id', batchId)
        .order('transfer_date', { ascending: true });

      if (error) throw error;
      return data as MachineTransfer[];
    },
    enabled: !!batchId,
  });
}

// Get transfer history for a machine (both in and out)
export function useMachineTransferHistory(
  machineId: string | undefined, 
  filters?: TransferFilters
) {
  return useQuery({
    queryKey: ['machine-transfers', machineId, filters],
    queryFn: async () => {
      if (!machineId) return { transfersOut: [], transfersIn: [] };

      // Get transfers OUT (from this machine)
      let outQuery = supabase
        .from('machine_transfers')
        .select(`
          *,
          batch:batches(batch_number, set_date, flock:flocks(flock_name, flock_number)),
          to_machine:machines!machine_transfers_to_machine_id_fkey(machine_number, machine_type)
        `)
        .eq('from_machine_id', machineId)
        .order('transfer_date', { ascending: false });

      // Get transfers IN (to this machine)
      let inQuery = supabase
        .from('machine_transfers')
        .select(`
          *,
          batch:batches(batch_number, set_date, flock:flocks(flock_name, flock_number)),
          from_machine:machines!machine_transfers_from_machine_id_fkey(machine_number, machine_type)
        `)
        .eq('to_machine_id', machineId)
        .order('transfer_date', { ascending: false });

      // Apply date filters
      if (filters?.dateFrom) {
        outQuery = outQuery.gte('transfer_date', filters.dateFrom);
        inQuery = inQuery.gte('transfer_date', filters.dateFrom);
      }
      if (filters?.dateTo) {
        outQuery = outQuery.lte('transfer_date', filters.dateTo);
        inQuery = inQuery.lte('transfer_date', filters.dateTo);
      }

      const [outResult, inResult] = await Promise.all([outQuery, inQuery]);

      if (outResult.error) throw outResult.error;
      if (inResult.error) throw inResult.error;

      return {
        transfersOut: outResult.data as MachineTransfer[],
        transfersIn: inResult.data as MachineTransfer[],
      };
    },
    enabled: !!machineId,
  });
}

// Create a new transfer
export function useCreateTransfer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (transfer: {
      batch_id: string;
      from_machine_id: string;
      to_machine_id: string;
      transfer_date: string;
      transfer_time?: string;
      days_in_previous_machine?: number;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('machine_transfers')
        .insert(transfer)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['batch-transfers', variables.batch_id] });
      queryClient.invalidateQueries({ queryKey: ['machine-transfers'] });
      toast({ title: 'Transfer recorded successfully' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error recording transfer',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Delete a transfer
export function useDeleteTransfer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (transferId: string) => {
      const { error } = await supabase
        .from('machine_transfers')
        .delete()
        .eq('id', transferId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['machine-transfers'] });
      toast({ title: 'Transfer deleted' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error deleting transfer',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Calculate days in previous machine (returns negative if transfer is before set date)
export function calculateDaysInMachine(setDate: string, transferDate: string): number {
  const set = new Date(setDate);
  const transfer = new Date(transferDate);
  const diffTime = transfer.getTime() - set.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}
