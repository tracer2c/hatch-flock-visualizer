import { useQuery } from "@tanstack/react-query";
import { addDays, format, startOfWeek } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { normalizeFlockNumber } from "@/utils/dataSheetAggregation";
import { parseLocalDate } from "@/utils/localDate";

export interface FlockWeekBatch {
  id: string;
  set_date: string;
  house_number: string;
  total_eggs_set: number;
  eggs_injected: number | null;
  eggs_cleared: number | null;
  chicks_hatched: number | null;
  status: string;
  flock_id: string;
  flock_name: string;
  flock_number: number | string;
  machine_number: string | null;
}

export interface FlockWeekContext {
  batches: FlockWeekBatch[];
  isLoading: boolean;
  refetch: () => Promise<any>;
  periodStart: string;
  periodEnd: string;
  weekMonday: Date | null;
  flockId: string | null;
  flockName: string;
  flockNumber: string | number;
  totalEggsSet: number;
  totalEggsInjected: number;
  totalEggsCleared: number;
  totalChicksHatched: number;
  worstStatus: string;
}

/**
 * Resolves all batches (houses) belonging to a flock during a Monday-anchored
 * set week, with aggregated flock totals ready for headers/entry forms.
 */
export function useFlockWeekBatches(
  flockKey: string | null | undefined,
  weekParam: string | null | undefined
): FlockWeekContext {
  const weekMonday = weekParam
    ? startOfWeek(parseLocalDate(weekParam)!, { weekStartsOn: 1 })
    : null;
  const periodStart = weekMonday ? format(weekMonday, "yyyy-MM-dd") : "";
  const periodEnd = weekMonday ? format(addDays(weekMonday, 6), "yyyy-MM-dd") : "";

  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ["flock-week-batches", flockKey, periodStart, periodEnd],
    enabled: Boolean(flockKey && periodStart && periodEnd),
    queryFn: async (): Promise<FlockWeekBatch[]> => {
      const { data, error } = await supabase
        .from("batches")
        .select(
          `id, set_date, total_eggs_set, eggs_injected, eggs_cleared,
           chicks_hatched, status,
           flocks!inner(id, flock_name, flock_number, house_number),
           machines(machine_number)`
        )
        .is("archived_at", null)
        .gte("set_date", periodStart)
        .lte("set_date", periodEnd);
      if (error) throw error;
      const norm = normalizeFlockNumber(flockKey!);
      return (data || [])
        .filter((b: any) => normalizeFlockNumber(b.flocks?.flock_number) === norm)
        .map((b: any) => ({
          id: b.id,
          set_date: b.set_date,
          house_number: String(b.flocks?.house_number ?? ""),
          total_eggs_set: Number(b.total_eggs_set) || 0,
          eggs_injected: b.eggs_injected,
          eggs_cleared: b.eggs_cleared,
          chicks_hatched: b.chicks_hatched,
          status: b.status,
          flock_id: b.flocks?.id,
          flock_name: b.flocks?.flock_name ?? "",
          flock_number: b.flocks?.flock_number,
          machine_number: b.machines?.machine_number ?? null,
        }))
        .sort(
          (a, b) =>
            String(a.house_number).localeCompare(String(b.house_number)) ||
            a.set_date.localeCompare(b.set_date)
        );
    },
  });

  const totalEggsSet = data.reduce((a, b) => a + (b.total_eggs_set || 0), 0);
  const totalEggsInjected = data.reduce((a, b) => a + (Number(b.eggs_injected) || 0), 0);
  const totalEggsCleared = data.reduce((a, b) => a + (Number(b.eggs_cleared) || 0), 0);
  const totalChicksHatched = data.reduce((a, b) => a + (Number(b.chicks_hatched) || 0), 0);

  const statusRank: Record<string, number> = {
    completed: 0,
    in_hatcher: 1,
    in_setter: 2,
    scheduled: 3,
    planned: 3,
  };
  const worstStatus = data.reduce((worst, b) => {
    const r = statusRank[b.status] ?? 4;
    const wr = statusRank[worst] ?? -1;
    return r > wr ? b.status : worst;
  }, data[0]?.status ?? "scheduled");

  return {
    batches: data,
    isLoading,
    refetch,
    periodStart,
    periodEnd,
    weekMonday,
    flockId: data[0]?.flock_id ?? null,
    flockName: data[0]?.flock_name ?? "",
    flockNumber: data[0]?.flock_number ?? "",
    totalEggsSet,
    totalEggsInjected,
    totalEggsCleared,
    totalChicksHatched,
    worstStatus,
  };
}
