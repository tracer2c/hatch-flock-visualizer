import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { DEFAULT_BUGGY_SIZE, type SetColor } from "@/config/multiStage";
import type { FlockOption } from "@/hooks/useMultiStage";

/**
 * Form state for a single-stage operation.
 * One operation = one setter + one flock + one set, so this is flat (no rows).
 */
export type SingleStageDraft = {
  set_date: string;       // YYYY-MM-DD
  hatch_date: string;
  transfer_date: string;
  day_of_week: string;           // Sun..Sat
  number_of_machines: number | null;
  carry_overs: number;
  machine_id: string;
  flock_id: string;
  house_number: string;
  age_weeks: number | null;
  total_buggies: number;
  eggs_per_buggy: number;        // chosen buggy size; one of BUGGY_SIZES
  location: string;              // slot/position 1–18
  expected_hatch_percent: number | null;
  set_color: SetColor;
  buggy_numbers: string[];
  notes: string;
};

/**
 * Save a single-stage operation.
 *
 * 1) Insert one batches row (company_id auto-derived from flock via trigger)
 * 2) Insert the single_stage_operations header with batch_id wired up
 *
 * If step 2 fails, we delete the batch to keep things clean.
 */
export function useSaveSingleStageOperation() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      draft,
      flockLookup,
    }: {
      draft: SingleStageDraft;
      flockLookup: (id: string) => FlockOption | undefined;
    }) => {
      if (!user?.id) throw new Error("Not signed in");
      if (!profile?.company_id) throw new Error("Missing company_id on profile");
      if (!draft.machine_id) throw new Error("Pick a setter before saving");
      if (!draft.flock_id) throw new Error("Pick a flock before saving");

      const eggsPerBuggy = draft.eggs_per_buggy || DEFAULT_BUGGY_SIZE;
      const totalEggsSet = Math.max(0, draft.total_buggies * eggsPerBuggy);
      const projectedHatch = draft.expected_hatch_percent
        ? Math.round(totalEggsSet * (draft.expected_hatch_percent / 100))
        : 0;

      const flock = flockLookup(draft.flock_id);
      const flockTag =
        flock?.flock_name?.slice(0, 16).replace(/\s+/g, "-") ?? "flock";
      const batchNumber = `SS-${draft.set_date}-${flockTag}`;

      // 1) Create the batch (company_id auto-derived from parent flock via trigger)
      const { data: batch, error: batchErr } = await (supabase
        .from("batches")
        .insert({
          batch_number: batchNumber,
          flock_id: draft.flock_id,
          machine_id: draft.machine_id,
          set_date: draft.set_date,
          expected_hatch_date: draft.hatch_date,
          total_eggs_set: totalEggsSet,
          status: "in_setter",
        } as any)
        .select("id")
        .single());
      if (batchErr) throw batchErr;
      const batchId: string = batch.id;

      try {
        // 2) Create the single-stage header
        const { data: op, error: opErr } = await supabase
          .from("single_stage_operations")
          .insert({
            company_id: profile.company_id,
            set_date: draft.set_date,
            hatch_date: draft.hatch_date,
            transfer_date: draft.transfer_date,
            day_of_week: draft.day_of_week || null,
            number_of_machines: draft.number_of_machines,
            carry_overs: draft.carry_overs,
            location: draft.location || null,
            machine_id: draft.machine_id,
            flock_id: draft.flock_id,
            house_number: draft.house_number || null,
            age_weeks: draft.age_weeks,
            total_buggies: draft.total_buggies,
            eggs_per_buggy: eggsPerBuggy,
            total_eggs_set: totalEggsSet,
            expected_hatch_percent: draft.expected_hatch_percent,
            projected_hatch_count: projectedHatch,
            set_color: draft.set_color,
            buggy_numbers: draft.buggy_numbers,
            batch_id: batchId,
            notes: draft.notes || null,
            created_by: user.id,
          })
          .select("id")
          .single();
        if (opErr) throw opErr;

        return {
          operationId: op.id as string,
          batchId,
          totalEggsSet,
          projectedHatch,
        };
      } catch (e) {
        // Roll back the orphan batch
        await supabase.from("batches").delete().eq("id", batchId);
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
