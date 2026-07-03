import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type FlockWorksheetType =
  | "hatch_fertility"
  | "residue"
  | "egg_pack"
  | "hoi";

export interface FlockWorksheetValueRow {
  id: string;
  company_id: string;
  flock_id: string;
  set_date_week_start: string;
  worksheet_type: FlockWorksheetType;
  values: Record<string, any>;
  notes: string | null;
  updated_by: string | null;
  updated_at: string;
  created_at: string;
}

/**
 * Fetch every flock-level worksheet override matching the given worksheet
 * type for the flocks currently on screen. Returns a map keyed by
 * `${flock_id}|${week_start}` for fast lookup.
 */
export function useFlockWorksheetOverlay(
  worksheetType: FlockWorksheetType,
  keys: Array<{ flock_id: string; set_date_week_start: string }>,
) {
  const [map, setMap] = useState<Map<string, FlockWorksheetValueRow>>(new Map());
  const [loading, setLoading] = useState(false);

  // Stable key list string so effect only reruns on real changes
  const listKey = keys
    .filter((k) => k.flock_id && k.set_date_week_start)
    .map((k) => `${k.flock_id}|${k.set_date_week_start}`)
    .sort()
    .join(",");

  const load = useCallback(async () => {
    if (!listKey) {
      setMap(new Map());
      return;
    }
    setLoading(true);
    const flockIds = Array.from(new Set(listKey.split(",").map((s) => s.split("|")[0])));
    const weekStarts = Array.from(new Set(listKey.split(",").map((s) => s.split("|")[1])));
    const { data, error } = await supabase
      .from("flock_worksheet_values" as any)
      .select("*")
      .eq("worksheet_type", worksheetType)
      .in("flock_id", flockIds)
      .in("set_date_week_start", weekStarts);
    setLoading(false);
    if (error) {
      console.error("useFlockWorksheetOverlay error", error);
      return;
    }
    const next = new Map<string, FlockWorksheetValueRow>();
    for (const row of (data ?? []) as unknown as FlockWorksheetValueRow[]) {
      // Only include exact key matches (in() cross-product may include extras)
      const k = `${row.flock_id}|${row.set_date_week_start}`;
      if (listKey.split(",").includes(k)) next.set(k, row);
    }
    setMap(next);
  }, [worksheetType, listKey]);

  useEffect(() => {
    load();
  }, [load]);

  return { map, loading, reload: load };
}

/** Upsert a single flock-level worksheet record. */
export async function saveFlockWorksheetValues(input: {
  flock_id: string;
  set_date_week_start: string;
  worksheet_type: FlockWorksheetType;
  values: Record<string, any>;
  notes?: string | null;
}): Promise<boolean> {
  // Resolve company_id from the caller's profile
  const { data: authRes } = await supabase.auth.getUser();
  const userId = authRes?.user?.id;
  if (!userId) {
    toast.error("Not signed in");
    return false;
  }
  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("company_id")
    .eq("id", userId)
    .single();
  if (profileError || !profile?.company_id) {
    toast.error("Could not resolve your company");
    return false;
  }

  const { error } = await supabase
    .from("flock_worksheet_values" as any)
    .upsert(
      {
        company_id: profile.company_id,
        flock_id: input.flock_id,
        set_date_week_start: input.set_date_week_start,
        worksheet_type: input.worksheet_type,
        values: input.values,
        notes: input.notes ?? null,
        updated_by: userId,
      },
      { onConflict: "flock_id,set_date_week_start,worksheet_type" },
    );
  if (error) {
    console.error("saveFlockWorksheetValues error", error);
    toast.error("Failed to save flock-level values: " + error.message);
    return false;
  }
  toast.success("Flock-level values saved");
  return true;
}
