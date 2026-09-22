import { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useSmartBack } from "@/hooks/useSmartBack";
import { ArrowLeft, Package, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useFlockWeekBatches } from "@/hooks/useFlockWeekBatches";
import { FlockEntryHeader } from "@/components/dashboard/FlockEntryHeader";
import { FlockWeeklyEntryCard } from "@/components/dashboard/FlockWeeklyEntryCard";
import HouseMatrixEntry, {
  type HouseMatrixField,
  type HouseMatrixRowSnapshot,
} from "@/components/data-entry/HouseMatrixEntry";
import HouseMatrixPrintView from "@/components/data-entry/HouseMatrixPrintView";
import { usePrintMeta } from "@/hooks/usePrintMeta";
import { useAuth } from "@/hooks/useAuth";

const FIELDS: HouseMatrixField[] = [
  { key: "sample_size", label: "Sample Size", defaultValue: 648 },
  { key: "cracked", label: "Cracked" },
  { key: "dirty", label: "Dirty" },
  { key: "small", label: "Small" },
  { key: "large", label: "Large" },
  { key: "grade_a", label: "Grade A" },
  { key: "grade_b", label: "Grade B" },
  { key: "grade_c", label: "Grade C" },
];

export default function FlockEggPackEntryPage() {
  const { flockKey = "" } = useParams<{ flockKey: string }>();
  const [params] = useSearchParams();
  const weekParam = params.get("week");
  const goBack = useSmartBack("/data-entry");
  const { profile, isStaff } = useAuth();
  const printMeta = usePrintMeta();
  const readOnly = isStaff();

  const ctx = useFlockWeekBatches(flockKey, weekParam);
  const [scope, setScope] = useState<"houses" | "flock">("houses");
  const [snapshot, setSnapshot] = useState<HouseMatrixRowSnapshot[]>([]);
  const [technician, setTechnician] = useState("");

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto p-4 space-y-4">
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
          title="Egg Pack Worksheet – Pre-Incubation Quality"
          subtitle="Standard sampling: 648 eggs per flock"
          icon={<Package className="h-5 w-5 text-primary" />}
        />

        {ctx.isLoading ? (
          <Card><CardContent className="p-8 text-center">Loading…</CardContent></Card>
        ) : ctx.batches.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">
            No houses found for this flock in the selected week.
          </CardContent></Card>
        ) : (
          <>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={scope === "houses" ? "default" : "outline"}
                onClick={() => setScope("houses")}
              >
                By house
              </Button>
              <Button
                size="sm"
                variant={scope === "flock" ? "default" : "outline"}
                onClick={() => setScope("flock")}
              >
                Whole flock
              </Button>
            </div>

            {scope === "flock" ? (
              <FlockWeeklyEntryCard
                title="Egg Pack — Whole Flock Entry"
                icon={<Package className="h-5 w-5 text-primary" />}
                table="flock_weekly_egg_pack"
                companyId={profile?.company_id ?? null}
                flockId={ctx.flockId}
                flockName={ctx.flockName}
                flockNumber={ctx.flockNumber}
                periodStart={ctx.periodStart}
                periodEnd={ctx.periodEnd}
                fields={FIELDS.map(({ key, label }) => ({ key, label }))}
              />
            ) : (
              <HouseMatrixEntry
                title="Egg Pack — All Houses"
                icon={<Package className="h-5 w-5 text-primary" />}
                table="egg_pack_quality"
                batches={ctx.batches}
                fields={FIELDS}
                technicianKey="inspector_name"
                dateKey="inspection_date"
                readOnly={readOnly}
                onSnapshot={(rows, tech) => {
                  setSnapshot(rows);
                  setTechnician(tech);
                }}
              />
            )}
          </>
        )}
      </div>

      <HouseMatrixPrintView
        title="Egg Pack Worksheet – Pre-Incubation Quality"
        companyName={printMeta.companyName}
        printedBy={printMeta.userName}
        role={printMeta.role}
        flockLabel={`Flock ${ctx.flockName} #${ctx.flockNumber}`}
        weekLabel={`${ctx.periodStart} – ${ctx.periodEnd}`}
        technician={technician}
        fields={FIELDS}
        rows={snapshot}
      />
    </div>
  );
}
