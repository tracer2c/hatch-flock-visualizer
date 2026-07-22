import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns a Set of `yyyy-MM-dd` strings for every `check_date` on
 * qa_monitoring rows within the given window. Powers "has data" dots
 * on the QA Hub date picker.
 */
export function useDatesWithQAEntries(from: Date, to: Date) {
  const fromStr = format(from, "yyyy-MM-dd");
  const toStr = format(to, "yyyy-MM-dd");
  return useQuery({
    queryKey: ["dates-with-qa", fromStr, toStr],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await supabase
        .from("qa_monitoring")
        .select("check_date")
        .gte("check_date", fromStr)
        .lte("check_date", toStr)
        .limit(5000);
      if (error) return new Set();
      const s = new Set<string>();
      (data ?? []).forEach((r: any) => {
        if (r.check_date) s.add(r.check_date as string);
      });
      return s;
    },
  });
}

/** Latest qa_monitoring.check_date across all rows (for the "Most recent with data" preset). */
export function useLatestQADate() {
  return useQuery({
    queryKey: ["latest-qa-date"],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase
        .from("qa_monitoring")
        .select("check_date")
        .order("check_date", { ascending: false })
        .limit(1);
      if (error || !data?.length) return null;
      return (data[0] as any).check_date ?? null;
    },
  });
}
