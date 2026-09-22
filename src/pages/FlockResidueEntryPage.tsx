import { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useSmartBack } from "@/hooks/useSmartBack";
import { ArrowLeft, AlertTriangle, Printer } from "lucide-react";
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
  { key: "infertile_eggs", label: "Infertile" },
  { key: "fertile_eggs", label: "Fertile" },
  { key: "early_dead", label: "Early Dead" },
  { key: "mid_dead", label: "Mid Dead" },
  { key: "late_dead", label: "Late Dead" },
  { key: "live_pip_number", label: "Live Pip" },
  { key: "dead_pip_number", label: "Dead Pip" },
  { key: "malformed_chicks", label: "Culls" },
  { key: "contaminated_eggs", label: "Contaminated" },
  { key: "handling_cracks", label: "Handling Cracks" },
  { key: "transfer_crack", label: "Transfer Cracks" },
  { key: "mold", label: "Mold" },
  { key: "abnormal", label: "Abnormal" },
  { key: "brain_defects", label: "Brain Defects" },
  { key: "dry_egg", label: "Dry Egg" },
  { key: "malpositioned", label: "Malpositioned" },
  { key: "upside_down", label: "Upside Down" },
];

const FLOCK_FIELDS = [
  { key: "sample_size", label: "Sample Size" },
  { key: "infertile_eggs", label: "Infertile" },
  { key: "early_dead", label: "Early Dead" },
  { key: "mid_dead", label: "Mid Dead" },
  { key: "late_dead", label: "Late Dead" },
  { key: "live_pip_number", label: "Live Pip" },
  { key: "dead_pip_number", label: "Dead Pip" },
  { key: "malformed_chicks", label: "Culls" },
  { key: "contaminated_eggs", label: "Contaminated" },
];

export default function FlockResidueEntryPage() {
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
          title="Residue Analysis"
          icon={<AlertTriangle className="h-5 w-5 text-orange-600" />}
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
                title="Residue — Whole Flock Entry"
                icon={<AlertTriangle className="h-5 w-5 text-orange-600" />}
                table="flock_weekly_residue"
                companyId={profile?.company_id ?? null}
                flockId={ctx.flockId}
                flockName={ctx.flockName}
                flockNumber={ctx.flockNumber}
                periodStart={ctx.periodStart}
                periodEnd={ctx.periodEnd}
                fields={FLOCK_FIELDS}
              />
            ) : (
              <HouseMatrixEntry
                title="Residue — All Houses"
                icon={<AlertTriangle className="h-5 w-5 text-orange-600" />}
                table="residue_analysis"
                batches={ctx.batches}
                fields={FIELDS}
                technicianKey="lab_technician"
                dateKey="analysis_date"
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
        title="Residue Analysis"
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
