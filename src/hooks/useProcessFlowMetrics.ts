import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProcessFlowFilters {
  dateFrom?: string;
  dateTo?: string;
  unitId?: string;
}

export interface ProcessFlowMetrics {
  housesEnteredSetters: number;
  housesTransferredToHatchers: number;
  housesHatched: number;
}

export const useProcessFlowMetrics = (filters: ProcessFlowFilters) => {
  return useQuery({
    queryKey: ['process-flow-metrics', filters],
    queryFn: async (): Promise<ProcessFlowMetrics> => {
      // Houses that entered setters (set_date in date range)
      let setterQuery = supabase
        .from('batches')
        .select('id', { count: 'exact' });

      if (filters.dateFrom) {
        setterQuery = setterQuery.gte('set_date', filters.dateFrom);
      }
      if (filters.dateTo) {
        setterQuery = setterQuery.lte('set_date', filters.dateTo);
      }
      if (filters.unitId) {
        setterQuery = setterQuery.eq('unit_id', filters.unitId);
      }

      const { count: housesEnteredSetters, error: setterError } = await setterQuery;
      if (setterError) throw setterError;

      // Houses transferred to hatchers (transfers in date range)
      let transferQuery = supabase
        .from('machine_transfers')
        .select('id', { count: 'exact' });

      if (filters.dateFrom) {
        transferQuery = transferQuery.gte('transfer_date', filters.dateFrom);
      }
      if (filters.dateTo) {
        transferQuery = transferQuery.lte('transfer_date', filters.dateTo);
      }

      const { count: housesTransferredToHatchers, error: transferError } = await transferQuery;
      if (transferError) throw transferError;

      // Houses that completed hatching (status='completed' and actual_hatch_date in range)
      let hatchQuery = supabase
        .from('batches')
        .select('id', { count: 'exact' })
        .eq('status', 'completed');

      if (filters.dateFrom) {
        hatchQuery = hatchQuery.gte('actual_hatch_date', filters.dateFrom);
      }
      if (filters.dateTo) {
        hatchQuery = hatchQuery.lte('actual_hatch_date', filters.dateTo);
      }
      if (filters.unitId) {
        hatchQuery = hatchQuery.eq('unit_id', filters.unitId);
      }

      const { count: housesHatched, error: hatchError } = await hatchQuery;
      if (hatchError) throw hatchError;

      return {
        housesEnteredSetters: housesEnteredSetters || 0,
        housesTransferredToHatchers: housesTransferredToHatchers || 0,
        housesHatched: housesHatched || 0,
      };
    },
    staleTime: 30000,
  });
};
