import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DashboardTargets {
  fertility: number;
  hatch: number;
  hof: number;
  hoi: number;
}

const DEFAULTS: DashboardTargets = {
  fertility: 85,
  hatch: 88,
  hof: 88,
  hoi: 75,
};

/**
 * Reads active global custom_targets for the current company and returns
 * the target values used by the main dashboard KPIs. Falls back to sensible
 * defaults when a metric has not been configured yet.
 */
export const useCustomTargets = () => {
  return useQuery({
    queryKey: ["custom-targets", "dashboard-global"],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<DashboardTargets> => {
      const { data, error } = await supabase
        .from("custom_targets")
        .select("metric_name, target_value")
        .eq("is_active", true)
        .eq("target_type", "global");

      if (error) return DEFAULTS;

      const map: Record<string, number> = {};
      (data || []).forEach((t: any) => {
        if (t?.metric_name != null && t?.target_value != null) {
          map[String(t.metric_name).toLowerCase()] = Number(t.target_value);
        }
      });

      return {
        fertility: map["fertility"] ?? DEFAULTS.fertility,
        hatch: map["hatch"] ?? DEFAULTS.hatch,
        hof: map["hof"] ?? map["hatch"] ?? DEFAULTS.hof,
        hoi: map["hoi"] ?? map["injection"] ?? DEFAULTS.hoi,
      };
    },
  });
};
