import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns the most recent `set_date` from non-archived batches (YYYY-MM-DD),
 * or null if the table is empty / the query fails.
 */
export function useLatestBatchDate() {
  return useQuery({
    queryKey: ["latest-batch-set-date"],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase
        .from("batches")
        .select("set_date")
        .is("archived_at", null)
        .gt("total_eggs_set", 0)
        .order("set_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) return null;
      return (data?.set_date as string) ?? null;
    },
  });
}
