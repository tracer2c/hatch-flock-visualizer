import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns a Set of `yyyy-MM-dd` strings for every `set_date` on non-archived
 * batches within the given window. Used to render "has data" dot indicators
 * on date pickers.
 */
export function useDatesWithBatches(from: Date, to: Date) {
  const fromStr = format(from, "yyyy-MM-dd");
  const toStr = format(to, "yyyy-MM-dd");
  return useQuery({
    queryKey: ["dates-with-batches", fromStr, toStr],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await supabase
        .from("batches")
        .select("set_date")
        .is("archived_at", null)
        .gte("set_date", fromStr)
        .lte("set_date", toStr)
        .limit(2000);
      if (error) return new Set();
      const s = new Set<string>();
      (data ?? []).forEach((r: any) => {
        if (r.set_date) s.add(r.set_date as string);
      });
      return s;
    },
  });
}
