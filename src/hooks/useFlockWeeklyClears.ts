import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type FlockWeeklyClear = {
  id: string;
  flock_id: string;
  period_start: string;
  period_end: string;
  eggs_set_total: number;
  chicks_hatched: number | null;
  hatch_percent: number | null;
  eggs_culled: number | null;
  eggs_cleared: number | null;
  technician_name: string | null;
  notes: string | null;
};

/** Loads existing weekly-clears rows for a period, keyed by flock_id for easy lookup. */
export function useFlockWeeklyClearsMap(periodStart: string, periodEnd: string) {
  const query = useQuery({
    queryKey: ["flock-weekly-clears", periodStart, periodEnd],
    enabled: !!periodStart && !!periodEnd,
    queryFn: async (): Promise<Record<string, FlockWeeklyClear>> => {
      const { data, error } = await supabase
        .from("flock_weekly_clears")
        .select("*")
        .eq("period_start", periodStart)
        .eq("period_end", periodEnd);
      if (error) throw error;
      const byFlock: Record<string, FlockWeeklyClear> = {};
      for (const row of data || []) {
        byFlock[row.flock_id] = row as FlockWeeklyClear;
      }
      return byFlock;
    },
  });
  return { byFlock: query.data || {}, isLoading: query.isLoading };
}

/** Upserts one flock's weekly clears/hatch entry, keyed by (flock_id, period_start, period_end). */
export function useSaveFlockWeeklyClear() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      flock_id: string;
      period_start: string;
      period_end: string;
      eggs_set_total: number;
      chicks_hatched: number | null;
      hatch_percent: number | null;
      eggs_culled: number | null;
      eggs_cleared: number | null;
    }) => {
      if (!profile?.company_id) throw new Error("Missing company_id on profile");
      const { error } = await supabase.from("flock_weekly_clears").upsert(
        {
          company_id: profile.company_id,
          flock_id: input.flock_id,
          period_start: input.period_start,
          period_end: input.period_end,
          eggs_set_total: input.eggs_set_total,
          chicks_hatched: input.chicks_hatched,
          hatch_percent: input.hatch_percent,
          eggs_culled: input.eggs_culled,
          eggs_cleared: input.eggs_cleared,
          created_by: user?.id,
        },
        { onConflict: "flock_id,period_start,period_end" }
      );
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({
        queryKey: ["flock-weekly-clears", vars.period_start, vars.period_end],
      });
    },
    onError: (e: any) => {
      toast.error(`Save failed: ${e.message || "unknown error"}`);
    },
  });
}
