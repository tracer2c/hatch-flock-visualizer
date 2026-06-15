import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  EGGS_PER_BUGGY,
  rowEggsSet,
  rowProjectedHatch,
  DEFAULT_BUGGY_SIZE,
  type SetColor,
} from "@/config/multiStage";

/**
 * Lightweight option types for dropdowns.
 */
export type SetterOption = {
  id: string;
  machine_number: string;
  machine_type: string;
  setter_mode: string | null;     // 'multi_setter' | 'single_setter' | null
  unit_id: string | null;
  location: string | null;
};

/**
 * Which kind of setter the page is collecting for.
 * Matches the values stored in `machines.setter_mode`.
 *   "multi"  → setter_mode = 'multi_setter'   (Multi-Stage page)
 *   "single" → setter_mode IS NULL OR 'single_setter'  (Single-Stage page)
 */
export type StageMode = "multi" | "single";

export type FlockOption = {
  id: string;
  flock_number: number;
  flock_name: string;
  house_number: string | null;
  arrival_date: string | null;
  age_weeks: number | null;
};

/**
 * One row the technician is filling in on the page.
 * `tempId` is used as a stable React key; the real `id` only exists after save.
 */
export type DraftRow = {
  tempId: string;
  machine_id: string;
  flock_id: string;
  house_number: string;
  age_weeks: number | null;
  expected_hatch_percent: number | null;
  buggies_set: number;
  buggies_transferred: number;
  eggs_per_buggy: number;        // per-row buggy size; one of BUGGY_SIZES
  location: string;              // zone A / B / C
  buggy_numbers: string[];
  notes: string;
};

/**
 * Header data for the daily op.
 */
export type DraftHeader = {
  operation_date: string;       // YYYY-MM-DD
  transfer_date: string;
  hatch_date: string;
  day_number: number | null;
  day_of_week: string;          // Mon..Sat, defaults to operation_date's weekday
  number_of_machines: number | null;
  set_color: SetColor;
  total_buggies: number;
  carry_overs: number;
  eggs_per_buggy: number;       // header fallback size; rows now carry their own
  notes: string;
};

/**
 * Load active setters + flocks for the page's dropdowns.
 * Both lists are scoped to the user's company by RLS and filtered to
 * `archived_at IS NULL` so retired equipment/flocks don't show up.
 */
export function useMultiStageOptions(mode?: StageMode) {
  const settersQ = useQuery({
    queryKey: ["stage-setters", mode ?? "all"],
    queryFn: async (): Promise<SetterOption[]> => {
      const { data, error } = await supabase
        .from("machines")
        .select("id, machine_number, machine_type, setter_mode, unit_id, location")
        .in("machine_type", ["setter", "combo"])
        .is("archived_at", null)
        .order("machine_number");
      if (error) throw error;

      // Honor machines.setter_mode so each page only sees machines built for it.
      // Without this, a tech can create a Multi-Stage op on a single_setter
      // machine (or vice versa) — QA Hub then routes those batches to the
      // wrong workflow.
      const all = (data || []) as SetterOption[];
      if (mode === "multi") return all.filter((m) => m.setter_mode === "multi_setter");
      if (mode === "single")
        return all.filter((m) => m.setter_mode === null || m.setter_mode === "single_setter");
      return all;
    },
  });

  const flocksQ = useQuery({
    queryKey: ["multi-stage-flocks"],
    queryFn: async (): Promise<FlockOption[]> => {
      const { data, error } = await supabase
        .from("flocks")
        .select("id, flock_number, flock_name, house_number, arrival_date, age_weeks")
        .is("archived_at", null)
        .order("flock_number");
      if (error) throw error;
      return (data || []) as FlockOption[];
    },
  });

  return {
    setters: settersQ.data || [],
    flocks: flocksQ.data || [],
    isLoading: settersQ.isLoading || flocksQ.isLoading,
  };
}

/** Canonical traversal order of the 18 positions inside a multi-stage setter. */
const POSITION_ORDER: Array<{
  zone: "A" | "B" | "C";
  side: "Left" | "Right";
  level: "Top" | "Middle" | "Bottom";
}> = (["A", "B", "C"] as const).flatMap((zone) =>
  (["Left", "Right"] as const).flatMap((side) =>
    (["Top", "Middle", "Bottom"] as const).map((level) => ({ zone, side, level }))
  )
);

/**
 * For each row, find the next free position in its chosen setter and
 * insert a multi_setter_sets row. Positions count as "in use" if they're
 * referenced by a multi_setter_sets row whose linked batch is still
 * in_setter or in_hatcher (i.e. eggs are physically still in the slot).
 *
 * Skips rows with no free position (rare — a setter has 18 slots) so the
 * save still succeeds; the slot can be fixed manually via the existing
 * MultiSetterSetsManager.
 */
async function allocateMultiSetterPositions(args: {
  rows: Array<{
    tempId: string;
    machine_id: string;
    flock_id: string;
    batch_id: string | null;
    capacity: number;
  }>;
  setDate: string;
}) {
  // Group rows by machine so we only query each machine once
  const byMachine = new Map<string, typeof args.rows>();
  for (const r of args.rows) {
    if (!r.machine_id || !r.batch_id) continue;
    const existing = byMachine.get(r.machine_id) ?? [];
    existing.push(r);
    byMachine.set(r.machine_id, existing);
  }

  const inserts: Array<Record<string, any>> = [];

  for (const [machineId, rowsForMachine] of byMachine) {
    // Positions currently occupied = multi_setter_sets rows whose batch is still active
    const { data: occupied } = await supabase
      .from("multi_setter_sets")
      .select("zone, side, level, batch:batches!multi_setter_sets_batch_id_fkey(status)")
      .eq("machine_id", machineId);
    const occupiedKeys = new Set<string>(
      (occupied || [])
        .filter((m: any) => {
          const st = m.batch?.status;
          return !st || st === "in_setter" || st === "in_hatcher";
        })
        .map((m: any) => `${m.zone}-${m.side}-${m.level}`)
    );

    for (const r of rowsForMachine) {
      const free = POSITION_ORDER.find(
        (p) => !occupiedKeys.has(`${p.zone}-${p.side}-${p.level}`)
      );
      if (!free) continue;
      occupiedKeys.add(`${free.zone}-${free.side}-${free.level}`);
      inserts.push({
        machine_id: machineId,
        flock_id: r.flock_id,
        batch_id: r.batch_id,
        zone: free.zone,
        side: free.side,
        level: free.level,
        capacity: r.capacity,
        set_date: args.setDate,
      });
    }
  }

  if (inserts.length === 0) return;
  // company_id auto-derived via batches relationship is not in this table —
  // multi_setter_sets has its own column with a default; we don't override it.
  const { error } = await supabase.from("multi_setter_sets").insert(inserts as any);
  if (error) {
    console.warn("[multi-stage] failed to allocate setter positions", error);
    // Don't throw — batches and operation rows are already saved. The slot
    // can be set manually via MultiSetterSetsManager.
  }
}

/**
 * Save a multi-stage operation.
 *
 * Atomicity strategy: we issue inserts in order
 *   1) operation row
 *   2) corresponding batches (one per draft row)
 *   2.5) multi_setter_sets position allocations (best-effort)
 *   3) operation_rows (with batch_id set)
 *
 * Rollback via deleting the operation row on failure (cascade removes the rest).
 */
export function useSaveMultiStageOperation() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      header,
      rows,
      flockLookup,
    }: {
      header: DraftHeader;
      rows: DraftRow[];
      /** Resolve flock metadata to fill the batch records. */
      flockLookup: (id: string) => FlockOption | undefined;
    }) => {
      if (!user?.id) throw new Error("Not signed in");
      if (!profile?.company_id) throw new Error("Missing company_id on profile");
      if (rows.length === 0) throw new Error("Add at least one setter row before saving");

      // Each row now carries its own buggy size; header keeps a fallback for the
      // NOT-NULL operations.eggs_per_buggy column.
      const sizeOf = (r: DraftRow) => r.eggs_per_buggy || header.eggs_per_buggy || DEFAULT_BUGGY_SIZE;
      const headerEggsPerBuggy =
        rows[0]?.eggs_per_buggy || header.eggs_per_buggy || DEFAULT_BUGGY_SIZE;

      // Compute totals using each row's buggy size
      const totalEggsSet = rows.reduce(
        (sum, r) => sum + rowEggsSet(r.buggies_set, sizeOf(r)),
        0
      );
      const projectedHatch = rows.reduce(
        (sum, r) =>
          sum + rowProjectedHatch(r.buggies_set, r.expected_hatch_percent, sizeOf(r)),
        0
      );

      // 1) Operation header
      const { data: op, error: opErr } = await supabase
        .from("multi_stage_operations")
        .insert({
          company_id: profile.company_id,
          operation_date: header.operation_date,
          transfer_date: header.transfer_date,
          hatch_date: header.hatch_date,
          day_number: header.day_number,
          day_of_week: header.day_of_week || null,
          number_of_machines: header.number_of_machines,
          set_color: header.set_color,
          total_buggies: header.total_buggies,
          carry_overs: header.carry_overs,
          eggs_per_buggy: headerEggsPerBuggy,
          projected_hatch_count: projectedHatch,
          total_eggs_set: totalEggsSet,
          notes: header.notes || null,
          created_by: user.id,
        })
        .select("id")
        .single();
      if (opErr) throw opErr;
      const opId: string = op.id;

      try {
        // 2) Create batches in parallel
        const batchInserts = rows.map(async (r, idx) => {
          const flock = flockLookup(r.flock_id);
          const flockTag =
            flock?.flock_name?.slice(0, 16).replace(/\s+/g, "-") ?? "flock";
          const batchNumber = `MS-${header.operation_date}-${flockTag}-${idx + 1}`;
          // company_id will be auto-derived via trigger from parent flock
          const { data: batch, error: batchErr } = await (supabase
            .from("batches")
            .insert({
              batch_number: batchNumber,
              flock_id: r.flock_id,
              machine_id: r.machine_id,
              set_date: header.operation_date,
              expected_hatch_date: header.hatch_date,
              total_eggs_set: rowEggsSet(r.buggies_set, sizeOf(r)),
              status: "in_setter",
            } as any)
            .select("id")
            .single());
          if (batchErr) throw batchErr;
          return { tempId: r.tempId, batch_id: batch.id as string };
        });
        const batchResults = await Promise.all(batchInserts);
        const batchByTemp = new Map(batchResults.map((b) => [b.tempId, b.batch_id]));

        // 2.5) Seed multi_setter_sets so QA Hub's Multi Setter QA workflow can
        // map positions → flocks. Allocates the next free (zone, side, level)
        // for each row's chosen setter. Best-effort: if no positions are free
        // we skip without failing the whole save.
        await allocateMultiSetterPositions({
          rows: rows.map((r) => ({
            tempId: r.tempId,
            machine_id: r.machine_id,
            flock_id: r.flock_id,
            batch_id: batchByTemp.get(r.tempId) ?? null,
            capacity: rowEggsSet(r.buggies_set, sizeOf(r)),
          })),
          setDate: header.operation_date,
        });

        // 3) Operation rows
        const rowInserts = rows.map((r, idx) => ({
          operation_id: opId,
          machine_id: r.machine_id,
          flock_id: r.flock_id,
          house_number: r.house_number || null,
          age_weeks: r.age_weeks,
          expected_hatch_percent: r.expected_hatch_percent,
          buggies_set: r.buggies_set,
          buggies_transferred: r.buggies_transferred,
          eggs_per_buggy: sizeOf(r),
          location: r.location || null,
          buggy_numbers: r.buggy_numbers,
          batch_id: batchByTemp.get(r.tempId) ?? null,
          row_order: idx,
          notes: r.notes || null,
        }));
        const { error: rowsErr } = await supabase
          .from("multi_stage_operation_rows")
          .insert(rowInserts);
        if (rowsErr) throw rowsErr;

        return { operationId: opId, totalEggsSet, projectedHatch };
      } catch (e) {
        // Best-effort cleanup so the user doesn't end up with a half-saved op
        await supabase.from("multi_stage_operations").delete().eq("id", opId);
        throw e;
      }
    },
    onSuccess: (r) => {
      toast.success(`Operation saved — ${r.totalEggsSet.toLocaleString()} eggs set, ~${r.projectedHatch.toLocaleString()} projected hatch`);
      queryClient.invalidateQueries({ queryKey: ["multi-stage-operations"] });
      queryClient.invalidateQueries({ queryKey: ["batches"] });
    },
    onError: (e: any) => {
      toast.error(`Save failed: ${e.message || "unknown error"}`);
    },
  });
}

/**
 * Compute next day_number in the rotation (1 → 2 → 3 → 1...).
 * Reads the company's most recent operation; new companies start at 1.
 */
export function useNextDayNumber() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["multi-stage-next-day", profile?.company_id],
    enabled: !!profile?.company_id,
    queryFn: async (): Promise<number> => {
      const { data } = await supabase
        .from("multi_stage_operations")
        .select("day_number")
        .order("operation_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      const last = data?.day_number ?? 0;
      return (last % 3) + 1;
    },
  });
}

export { EGGS_PER_BUGGY };
