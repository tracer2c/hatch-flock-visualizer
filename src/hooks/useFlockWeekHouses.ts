import { useQuery } from "@tanstack/react-query";
import { addDays, format, startOfWeek } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { normalizeFlockNumber } from "@/utils/dataSheetAggregation";
import { parseLocalDate } from "@/utils/localDate";

export interface FlockWeekHouse {
  batch_id: string;
  house_number: string;
  set_date: string;
  total_eggs_set: number;
}

interface Params {
  flockKey?: string | null;
  weekStart?: string | null; // YYYY-MM-DD
  enabled?: boolean;
}

/**
 * Fetch the list of houses (batches) belonging to a flock during a given
 * Monday-anchored ISO week. Used by the Data Entry flow so a user can switch
 * between houses inside the entry form without leaving the flock-week context.
 */
export function useFlockWeekHouses({ flockKey, weekStart, enabled = true }: Params) {
  return useQuery({
    queryKey: ["flock-week-houses", flockKey, weekStart],
    enabled: Boolean(enabled && flockKey && weekStart),
    queryFn: async (): Promise<FlockWeekHouse[]> => {
      if (!flockKey || !weekStart) return [];
      const start = parseLocalDate(weekStart)!;
      const end = addDays(start, 6);
      const startStr = format(start, "yyyy-MM-dd");
      const endStr = format(end, "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("batches")
        .select(
          `id, set_date, total_eggs_set, flocks!inner(flock_number, house_number)`
        )
        .is("archived_at", null)
        .gte("set_date", startStr)
        .lte("set_date", endStr);
      if (error) throw error;

      const norm = normalizeFlockNumber(flockKey);
      const rows: FlockWeekHouse[] = (data || [])
        .filter((b: any) => normalizeFlockNumber(b.flocks?.flock_number) === norm)
        .map((b: any) => ({
          batch_id: b.id,
          house_number: String(b.flocks?.house_number ?? ""),
          set_date: b.set_date,
          total_eggs_set: Number(b.total_eggs_set) || 0,
        }))
        .sort(
          (a, b) =>
            String(a.house_number).localeCompare(String(b.house_number)) ||
            a.set_date.localeCompare(b.set_date)
        );
      return rows;
    },
  });
}

/** Format a Monday ISO date to "May 25 – May 31, 2026". */
export function formatSetWeekLabel(weekStart: string | Date | null | undefined): string {
  const start =
    weekStart instanceof Date
      ? startOfWeek(weekStart, { weekStartsOn: 1 })
      : parseLocalDate(weekStart);
  if (!start) return "—";
  const monday = startOfWeek(start, { weekStartsOn: 1 });
  const sunday = addDays(monday, 6);
  const sameYear = monday.getFullYear() === sunday.getFullYear();
  return sameYear
    ? `${format(monday, "MMM d")} – ${format(sunday, "MMM d, yyyy")}`
    : `${format(monday, "MMM d, yyyy")} – ${format(sunday, "MMM d, yyyy")}`;
}
