import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/** Map of flock_id -> set of hatchery (unit) ids the flock is shared with. */
export function useFlockUnitLinks() {
  return useQuery({
    queryKey: ['flock-unit-links'],
    queryFn: async (): Promise<Map<string, Set<string>>> => {
      const map = new Map<string, Set<string>>();
      const pageSize = 1000;
      for (let from = 0; ; from += pageSize) {
        const { data, error } = await (supabase as any)
          .from('flock_units')
          .select('flock_id, unit_id')
          .range(from, from + pageSize - 1);
        if (error) throw error;
        (data || []).forEach((r: { flock_id: string; unit_id: string }) => {
          if (!map.has(r.flock_id)) map.set(r.flock_id, new Set());
          map.get(r.flock_id)!.add(r.unit_id);
        });
        if (!data || data.length < pageSize) break;
      }
      return map;
    },
    staleTime: 60 * 1000,
  });
}

/** True when a flock belongs to the given hatchery (own unit_id or shared link). */
export function flockInUnit(
  flock: { id: string; unit_id?: string | null },
  unitId: string,
  links?: Map<string, Set<string>>
): boolean {
  if (flock.unit_id === unitId) return true;
  return !!links?.get(flock.id)?.has(unitId);
}
