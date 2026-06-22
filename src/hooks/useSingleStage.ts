import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { DEFAULT_BUGGY_SIZE, rowEggsSet, rowProjectedHatch, type SetColor } from "@/config/multiStage";
import type { FlockOption } from "@/hooks/useMultiStage";

/**
 * One row the technician is filling in on the Single-Stage page.
 * `tempId` is used as a stable React key; the real `id` only exists after save.
 */
export type SingleStageRow = {
  tempId: string;
  machine_id: string;
  flock_id: string;
  house_number: string;
  age_weeks: number | null;
  expected_hatch_percent: number | null;
  buggies_set: number;
  buggies_transferred: number;
  eggs_per_buggy: number;        // per-row buggy size; one of BUGGY_SIZES
  location: string;              // slot/position 1–18
  buggy_numbers: string[];
  notes: string;
};

/**
 * Header data for the daily single-stage operation.
 */
export type SingleStageHeader = {
  set_date: string;       // YYYY-MM-DD
  hatch_date: string;
  transfer_date: string;
  day_of_week: string;           // Sun..Sat
  number_of_machines: number | null;
  carry_overs: number;
  total_buggies: number;
  eggs_per_buggy: number;        // header fallback size; rows now carry their own
  set_color: SetColor;
  notes: string;
};

/**
 * Save a single-stage operation.
 *
 * Mirrors useSaveMultiStageOperation: one header row, one batch per draft row,
 * then the operation_rows linking everything together. Rollback via deleting
 * the operation row on failure (cascade removes the rest).
 */
export function useSaveSingleStageOperation() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      header,
      rows,
      flockLookup,
    }: {
      header: SingleStageHeader;
      rows: SingleStageRow[];
      flockLookup: (id: string) => FlockOption | undefined;
    }) => {
      if (!user?.id) throw new Error("Not signed in");
      if (!profile?.company_id) throw new Error("Missing company_id on profile");
      if (rows.length === 0) throw new Error("Add at least one setter row before saving");

      const sizeOf = (r: SingleStageRow) => r.eggs_per_buggy || header.eggs_per_buggy || DEFAULT_BUGGY_SIZE;
      const headerEggsPerBuggy =
        rows[0]?.eggs_per_buggy || header.eggs_per_buggy || DEFAULT_BUGGY_SIZE;

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
        .from("single_stage_operations")
        .insert({
          company_id: profile.company_id,
          set_date: header.set_date,
          hatch_date: header.hatch_date,
          transfer_date: header.transfer_date,
          day_of_week: header.day_of_week || null,
          number_of_machines: header.number_of_machines,
          carry_overs: header.carry_overs,
          set_color: header.set_color,
          total_buggies: header.total_buggies,
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
        // 2) Create batches in parallel, one per row
        const batchInserts = rows.map(async (r, idx) => {
          const flock = flockLookup(r.flock_id);
          const flockTag =
            flock?.flock_name?.slice(0, 16).replace(/\s+/g, "-") ?? "flock";
          const batchNumber = `SS-${header.set_date}-${flockTag}-${idx + 1}`;
          const { data: batch, error: batchErr } = await (supabase
            .from("batches")
            .insert({
              batch_number: batchNumber,
              flock_id: r.flock_id,
              machine_id: r.machine_id,
              set_date: header.set_date,
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
          .from("single_stage_operation_rows")
          .insert(rowInserts);
        if (rowsErr) throw rowsErr;

        return { operationId: opId, totalEggsSet, projectedHatch };
      } catch (e) {
        await supabase.from("single_stage_operations").delete().eq("id", opId);
        throw e;
      }
    },
    onSuccess: (r) => {
      toast.success(
        `Set saved — ${r.totalEggsSet.toLocaleString()} eggs in, ~${r.projectedHatch.toLocaleString()} projected hatch`
      );
      queryClient.invalidateQueries({ queryKey: ["single-stage-operations"] });
      queryClient.invalidateQueries({ queryKey: ["batches"] });
    },
    onError: (e: any) => {
      toast.error(`Save failed: ${e.message || "unknown error"}`);
    },
  });
}
