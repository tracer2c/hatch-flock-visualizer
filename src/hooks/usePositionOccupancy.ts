import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  buildPositionOccupancyMap, 
  getOccupancyStats,
  getUniqueFlocks,
  ALL_POSITION_KEYS,
  type OccupancyInfo,
  type MultiSetterSet 
} from '@/utils/setterPositionMapping';

interface FlockDetail {
  flock_id: string;
  batch_id: string | null;
  flock_name: string;
  flock_number: number;
}

interface UsePositionOccupancyResult {
  occupancyMap: Map<string, OccupancyInfo>;
  isLoading: boolean;
  error: string | null;
  occupiedCount: number;
  unoccupiedCount: number;
  unoccupiedPositions: string[];
  uniqueFlocks: string[];
  uniqueFlockDetails: FlockDetail[];
  refetch: () => Promise<void>;
}

export function usePositionOccupancy(
  machineId: string | null, 
  checkDate: string
): UsePositionOccupancyResult {
  const [sets, setSets] = useState<MultiSetterSet[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSets = async () => {
    if (!machineId || !checkDate) {
      setSets([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch multi_setter_sets for this machine where set_date <= checkDate
      const { data: setsData, error: setsError } = await supabase
        .from('multi_setter_sets')
        .select(`
          id,
          machine_id,
          flock_id,
          batch_id,
          zone,
          side,
          level,
          set_date,
          capacity,
          flocks(flock_name, flock_number),
          batches(batch_number)
        `)
        .eq('machine_id', machineId)
        .lte('set_date', checkDate)
        .order('set_date', { ascending: false });

      if (setsError) throw setsError;

      // Check for transfers - exclude sets that have been transferred out before checkDate
      const { data: transfers, error: transferError } = await supabase
        .from('machine_transfers')
        .select('batch_id, transfer_date')
        .lte('transfer_date', checkDate);

      if (transferError) throw transferError;

      // Create a set of batch_ids that have been transferred out
      const transferredBatchIds = new Set(
        (transfers || [])
          .filter(t => t.transfer_date <= checkDate)
          .map(t => t.batch_id)
      );

      // Filter out sets whose batches have been transferred
      const activeSets = (setsData || []).filter(set => {
        if (!set.batch_id) return true; // Keep sets without batch_id
        return !transferredBatchIds.has(set.batch_id);
      }) as MultiSetterSet[];

      setSets(activeSets);
    } catch (err: any) {
      console.error('Error fetching position occupancy:', err);
      setError(err.message || 'Failed to load position occupancy');
      setSets([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSets();
  }, [machineId, checkDate]);

  // Build the occupancy map from the fetched sets
  const occupancyMap = useMemo(() => {
    if (sets.length === 0 || !checkDate) {
      return new Map<string, OccupancyInfo>();
    }
    return buildPositionOccupancyMap(sets, checkDate);
  }, [sets, checkDate]);

  // Calculate stats
  const stats = useMemo(() => getOccupancyStats(occupancyMap), [occupancyMap]);
  
  // Get unique flocks for color coding
  const uniqueFlocks = useMemo(() => getUniqueFlocks(occupancyMap), [occupancyMap]);

  // Get list of unoccupied positions
  const unoccupiedPositions = useMemo(() => {
    return ALL_POSITION_KEYS.filter(key => !occupancyMap.has(key));
  }, [occupancyMap]);

  // Get unique flock details for machine-wide QA linkage
  const uniqueFlockDetails = useMemo(() => {
    const seen = new Map<string, FlockDetail>();
    occupancyMap.forEach(info => {
      if (!seen.has(info.flock_id)) {
        seen.set(info.flock_id, {
          flock_id: info.flock_id,
          batch_id: info.batch_id,
          flock_name: info.flock_name,
          flock_number: info.flock_number
        });
      }
    });
    return Array.from(seen.values());
  }, [occupancyMap]);

  return {
    occupancyMap,
    isLoading,
    error,
    occupiedCount: stats.occupied,
    unoccupiedCount: stats.unoccupied,
    unoccupiedPositions,
    uniqueFlocks,
    uniqueFlockDetails,
    refetch: fetchSets
  };
}
