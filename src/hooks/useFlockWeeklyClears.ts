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

/**
 * Distributes flock-level Hatch / Clears totals across the flock's
 * underlying `batches` rows proportionally by `total_eggs_set`, then
 * upserts the raw entered values (including `eggs_culled`, which has no
 * batches column) into `flock_weekly_clears` for display continuity.
 *
 * This is what makes the "By Flock" view stop being a disconnected
 * data-entry silo: after save, By House, exports, and analytics all see
 * the same numbers because they live on `batches`.
 */
export function useSaveFlockTotalsToBatches() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      flock_id: string;
      period_start: string;
      period_end: string;
      eggs_set_total: number;
      chicks_hatched: number | null;
      eggs_culled: number | null;
      eggs_cleared: number | null;
      batch_slices: Array<{ id: string; total_eggs_set: number }>;
    }) => {
      if (!profile?.company_id) throw new Error("Missing company_id on profile");

      // Split totals across batches by egg share.
      const denom = input.batch_slices.reduce(
        (a, s) => a + (s.total_eggs_set || 0),
        0
      );

      const split = (total: number | null): Array<{ id: string; value: number | null }> => {
        if (total == null) return input.batch_slices.map((s) => ({ id: s.id, value: null }));
        if (!denom) {
          const each = Math.floor(total / input.batch_slices.length);
          const rem = total - each * input.batch_slices.length;
          return input.batch_slices.map((s, i) => ({
            id: s.id,
            value: each + (i === input.batch_slices.length - 1 ? rem : 0),
          }));
        }
        const rounded = input.batch_slices.map((s) =>
          Math.round((total * (s.total_eggs_set || 0)) / denom)
        );
        const drift = total - rounded.reduce((a, v) => a + v, 0);
        if (drift !== 0 && rounded.length) rounded[rounded.length - 1] += drift;
        return input.batch_slices.map((s, i) => ({ id: s.id, value: rounded[i] }));
      };

      const chicksSplit = split(input.chicks_hatched);
      const clearsSplit = split(input.eggs_cleared);

      // Batched updates. Volume is small (batches per flock), so parallel
      // updates are fine; if this ever needs scaling switch to a DB fn.
      const updates: Promise<any>[] = [];
      for (let i = 0; i < input.batch_slices.length; i++) {
        const patch: Record<string, number | null> = {};
        if (input.chicks_hatched != null) patch.chicks_hatched = chicksSplit[i].value ?? 0;
        if (input.eggs_cleared != null) patch.eggs_cleared = clearsSplit[i].value;
        if (Object.keys(patch).length === 0) continue;
        updates.push(
          Promise.resolve(
            supabase.from("batches").update(patch).eq("id", input.batch_slices[i].id)
          )
        );
      }
      const results = await Promise.all(updates);
      for (const r of results) if (r.error) throw r.error;

      // Also upsert to flock_weekly_clears so eggs_culled (no batches
      // column) is persisted and legacy readers keep working.
      const { error: fwcErr } = await supabase.from("flock_weekly_clears").upsert(
        {
          company_id: profile.company_id,
          flock_id: input.flock_id,
          period_start: input.period_start,
          period_end: input.period_end,
          eggs_set_total: input.eggs_set_total,
          chicks_hatched: input.chicks_hatched,
          hatch_percent:
            input.chicks_hatched != null && input.eggs_set_total > 0
              ? (input.chicks_hatched / input.eggs_set_total) * 100
              : null,
          eggs_culled: input.eggs_culled,
          eggs_cleared: input.eggs_cleared,
          created_by: user?.id,
        },
        { onConflict: "flock_id,period_start,period_end" }
      );
      if (fwcErr) throw fwcErr;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({
        queryKey: ["flock-weekly-clears", vars.period_start, vars.period_end],
      });
      // Nudge any batches-backed queries to refresh so By House + analytics
      // pick up the new distributed values immediately.
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      queryClient.invalidateQueries({ queryKey: ["complete-data"] });
    },
    onError: (e: any) => {
      toast.error(`Save failed: ${e.message || "unknown error"}`);
    },
  });
}
