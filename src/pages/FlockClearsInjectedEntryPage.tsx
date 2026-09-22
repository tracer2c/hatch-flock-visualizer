import { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useSmartBack } from "@/hooks/useSmartBack";
import { ArrowLeft, Printer, Syringe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePermissions } from "@/hooks/usePermissions";
import { ReadOnlyBanner } from "@/components/ui/read-only-banner";
import { useFlockWeekBatches } from "@/hooks/useFlockWeekBatches";
import { FlockEntryHeader } from "@/components/dashboard/FlockEntryHeader";
import WeeklyClearsSheet, {
  type ClearsSheetRowSnapshot,
} from "@/components/data-entry/WeeklyClearsSheet";
import WeeklyClearsPrintView from "@/components/data-entry/WeeklyClearsPrintView";
import { useFlockWeeklyClearsMap } from "@/hooks/useFlockWeeklyClears";
import { usePrintMeta } from "@/hooks/usePrintMeta";

export default function FlockClearsInjectedEntryPage() {
  const { flockKey = "" } = useParams<{ flockKey: string }>();
  const [params] = useSearchParams();
  const weekParam = params.get("week");
  const goBack = useSmartBack("/data-entry");
  const { hasWriteAccess } = usePermissions();
  const readOnly = !hasWriteAccess("data_entry");
  const printMeta = usePrintMeta();

  const ctx = useFlockWeekBatches(flockKey, weekParam);
  const { byFlock } = useFlockWeeklyClearsMap(ctx.periodStart, ctx.periodEnd);
  const existingRow = ctx.flockId ? byFlock[ctx.flockId] : undefined;

  const [snapshot, setSnapshot] = useState<ClearsSheetRowSnapshot[]>([]);
  const [technician, setTechnician] = useState("");

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto p-4 space-y-4">
        <ReadOnlyBanner show={readOnly} />
        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" size="sm" onClick={goBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Weekly Flock Rollup
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>

        <FlockEntryHeader
          ctx={ctx}
          title="Clears, Injected & Hatch (set week)"
          subtitle="One line per set record — fill in as counts come through the week"
          icon={<Syringe className="h-5 w-5 text-primary" />}
        />

        {ctx.isLoading ? (
          <Card><CardContent className="p-8 text-center">Loading…</CardContent></Card>
        ) : ctx.batches.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">
            No houses found for this flock in the selected week.
          </CardContent></Card>
        ) : (
          <WeeklyClearsSheet
            batches={ctx.batches}
            flockId={ctx.flockId}
            periodStart={ctx.periodStart}
            periodEnd={ctx.periodEnd}
            existingRow={existingRow}
            readOnly={readOnly}
            onSaved={ctx.refetch}
            onSnapshot={(rows, tech) => {
              setSnapshot(rows);
              setTechnician(tech);
            }}
          />
        )}
      </div>

      <WeeklyClearsPrintView
        companyName={printMeta.companyName}
        printedBy={printMeta.userName}
        role={printMeta.role}
        flockLabel={`Flock ${ctx.flockName} #${ctx.flockNumber}`}
        weekLabel={`${ctx.periodStart} – ${ctx.periodEnd}`}
        technician={technician}
        rows={snapshot}
      />
    </div>
  );
}
