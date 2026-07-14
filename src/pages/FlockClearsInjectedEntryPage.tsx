import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Syringe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";
import { ReadOnlyBanner } from "@/components/ui/read-only-banner";
import { useFlockWeekBatches } from "@/hooks/useFlockWeekBatches";
import { FlockEntryHeader } from "@/components/dashboard/FlockEntryHeader";
import ClearsInjectedDataEntry from "@/components/dashboard/ClearsInjectedDataEntry";
import {
  useSaveFlockTotalsToBatches,
  useFlockWeeklyClearsMap,
} from "@/hooks/useFlockWeeklyClears";

export default function FlockClearsInjectedEntryPage() {
  const { flockKey = "" } = useParams<{ flockKey: string }>();
  const [params] = useSearchParams();
  const weekParam = params.get("week");
  const navigate = useNavigate();
  const { hasWriteAccess } = usePermissions();
  const readOnly = !hasWriteAccess("data_entry");

  const ctx = useFlockWeekBatches(flockKey, weekParam);
  const { byFlock } = useFlockWeeklyClearsMap(ctx.periodStart, ctx.periodEnd);
  const existingRow = ctx.flockId ? byFlock[ctx.flockId] : undefined;
  const save = useSaveFlockTotalsToBatches();

  const initialClear = existingRow?.eggs_cleared ?? ctx.totalEggsCleared ?? null;
  const initialInjected = ctx.totalEggsInjected ?? null;

  const handleSave = async (vals: {
    clear_number: number;
    injected_number: number;
    clears_technician_name: string;
    clears_notes: string | null;
  }) => {
    if (!ctx.flockId) {
      toast.error("No houses found for this flock/week.");
      return;
    }
    try {
      await save.mutateAsync({
        flock_id: ctx.flockId,
        period_start: ctx.periodStart,
        period_end: ctx.periodEnd,
        eggs_set_total: ctx.totalEggsSet,
        chicks_hatched: existingRow?.chicks_hatched ?? null,
        eggs_culled: existingRow?.eggs_culled ?? null,
        eggs_cleared: vals.clear_number,
        eggs_injected: vals.injected_number,
        batch_slices: ctx.batches.map((b) => ({
          id: b.id,
          total_eggs_set: b.total_eggs_set,
        })),
      });
      toast.success("Clears & Injected saved for the flock/week.");
      await ctx.refetch();
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto p-4 space-y-4">
        <ReadOnlyBanner show={readOnly} />
        <Button variant="outline" size="sm" onClick={() => navigate("/data-entry")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Weekly Flock Rollup
        </Button>

        <FlockEntryHeader
          ctx={ctx}
          title="Clears & Injected (flock/week)"
          subtitle="Recorded at flock level — distributed across houses on save"
          icon={<Syringe className="h-5 w-5 text-primary" />}
        />

        {ctx.isLoading ? (
          <Card><CardContent className="p-8 text-center">Loading…</CardContent></Card>
        ) : ctx.batches.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">
            No houses found for this flock in the selected week.
          </CardContent></Card>
        ) : (
          <ClearsInjectedDataEntry
            initialClear={initialClear}
            initialInjected={initialInjected}
            totalEggs={ctx.totalEggsSet}
            onSave={handleSave}
            saving={save.isPending}
            readOnly={readOnly}
            context={{
              flockNumber: Number(ctx.flockNumber) || undefined,
              flockName: ctx.flockName,
              houseNumber: `${ctx.batches.length} house${ctx.batches.length === 1 ? "" : "s"}`,
            }}
          />
        )}
      </div>
    </div>
  );
}
