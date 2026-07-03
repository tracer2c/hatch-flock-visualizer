import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Info } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import {
  saveFlockWorksheetValues,
  type FlockWorksheetType,
  type FlockWorksheetValueRow,
} from "@/hooks/useFlockWorksheetValues";

interface FieldSpec {
  key: string;
  label: string;
  type?: "number" | "text" | "percent";
}

const FIELD_SPECS: Record<FlockWorksheetType, FieldSpec[]> = {
  hatch_fertility: [
    { key: "sample_size", label: "Sample Size" },
    { key: "fertile_eggs", label: "Fertile Eggs" },
    { key: "infertile_eggs", label: "Infertile Eggs" },
    { key: "chicks_hatched", label: "Chicks Hatched" },
    { key: "early_dead", label: "Early Dead" },
    { key: "late_dead", label: "Late Dead" },
    { key: "fertility_percent", label: "Fertility %", type: "percent" },
    { key: "hof_percent", label: "HOF %", type: "percent" },
    { key: "hoi_percent", label: "HOI %", type: "percent" },
    { key: "technician_name", label: "Technician", type: "text" },
  ],
  residue: [
    { key: "sample_size", label: "Sample Size" },
    { key: "infertile_eggs", label: "Infertile" },
    { key: "early_dead", label: "Early Dead" },
    { key: "mid_dead", label: "Mid Dead" },
    { key: "late_dead", label: "Late Dead" },
    { key: "malformed_chicks", label: "Cull Chicks" },
    { key: "live_pip_number", label: "Live Pips" },
    { key: "dead_pip_number", label: "Dead Pips" },
    { key: "contaminated_eggs", label: "Contamination" },
    { key: "handling_cracks", label: "Handling Cracks" },
    { key: "transfer_crack", label: "Transfer Crack" },
    { key: "mold", label: "Mold" },
    { key: "abnormal", label: "Abnormal" },
    { key: "brain_defects", label: "Brain Defects" },
    { key: "dry_egg", label: "DY Egg" },
    { key: "malpositioned", label: "Malpositioned" },
    { key: "upside_down", label: "Upside Down" },
    { key: "hof_percent", label: "HOF %", type: "percent" },
    { key: "hoi_percent", label: "HOI %", type: "percent" },
    { key: "lab_technician", label: "Technician", type: "text" },
  ],
  egg_pack: [
    { key: "sample_size", label: "Sample Size" },
    { key: "grade_a", label: "Grade A" },
    { key: "cracked", label: "Cracked" },
    { key: "dirty", label: "Dirty" },
    { key: "small", label: "Small" },
    { key: "large", label: "Large" },
    { key: "stained", label: "Stained" },
    { key: "abnormal", label: "Abnormal" },
    { key: "contaminated", label: "Contaminated" },
    { key: "usd", label: "USD" },
    { key: "set_week", label: "Set Week", type: "text" },
    { key: "inspector_name", label: "Inspector", type: "text" },
  ],
  hoi: [
    { key: "total_eggs_set", label: "Eggs Set" },
    { key: "eggs_cleared", label: "Eggs Cleared" },
    { key: "eggs_injected", label: "Eggs Injected" },
    { key: "chicks_hatched", label: "Chicks Hatched" },
    { key: "hof_percent", label: "HOF %", type: "percent" },
    { key: "hoi_percent", label: "HOI %", type: "percent" },
  ],
};

const TITLES: Record<FlockWorksheetType, string> = {
  hatch_fertility: "Hatch / Fertility",
  residue: "Residue Analysis",
  egg_pack: "Egg Pack Quality",
  hoi: "HOI / Embrex",
};

export interface FlockDetailEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worksheetType: FlockWorksheetType;
  flock: {
    flock_id: string | null;
    flock_number: any;
    flock_name?: string | null;
    set_date_week_start: string | null;
    set_date?: string | null;
  } | null;
  /** The aggregation output row — used to prefill fields when no override exists. */
  aggregatedRow: any;
  /** The underlying per-house rows for the breakdown section. */
  houseRows: any[];
  onSaved?: () => void;
}

export const FlockDetailEditor = ({
  open,
  onOpenChange,
  worksheetType,
  flock,
  aggregatedRow,
  houseRows,
  onSaved,
}: FlockDetailEditorProps) => {
  const specs = FIELD_SPECS[worksheetType];
  const [existing, setExisting] = useState<FlockWorksheetValueRow | null>(null);
  const [values, setValues] = useState<Record<string, any>>({});
  const [notes, setNotes] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const canSave = !!(flock?.flock_id && flock?.set_date_week_start);

  // Load existing override on open
  useEffect(() => {
    if (!open || !canSave) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("flock_worksheet_values" as any)
        .select("*")
        .eq("flock_id", flock!.flock_id!)
        .eq("set_date_week_start", flock!.set_date_week_start!)
        .eq("worksheet_type", worksheetType)
        .maybeSingle();
      if (cancelled) return;
      const row = (data ?? null) as unknown as FlockWorksheetValueRow | null;
      setExisting(row);
      // Seed form: prefer stored override, else the computed aggregation values
      const seeded: Record<string, any> = {};
      for (const spec of specs) {
        const stored = row?.values?.[spec.key];
        if (stored != null && stored !== "") {
          seeded[spec.key] = stored;
        } else {
          const fromAgg = aggregatedRow?.[spec.key];
          seeded[spec.key] = fromAgg == null ? "" : fromAgg;
        }
      }
      setValues(seeded);
      setNotes(row?.notes ?? aggregatedRow?.notes ?? "");
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, worksheetType, flock?.flock_id, flock?.set_date_week_start]);

  const houseSummary = useMemo(() => {
    return (houseRows ?? []).map((r) => ({
      house_number: r.house_number || "-",
      batch_number: r.batch_number || "-",
      set_date: r.set_date,
      sample: r.sample_size || r.residue_sample_size || r.epq_sample_size || null,
    }));
  }, [houseRows]);

  const handleChange = (key: string, val: string) => {
    setValues((v) => ({ ...v, [key]: val }));
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    // Coerce numeric fields to numbers
    const cleaned: Record<string, any> = {};
    for (const spec of specs) {
      const raw = values[spec.key];
      if (raw === "" || raw == null) {
        cleaned[spec.key] = null;
      } else if (spec.type === "text") {
        cleaned[spec.key] = String(raw);
      } else if (spec.type === "percent") {
        const n = parseFloat(raw);
        cleaned[spec.key] = Number.isFinite(n) ? n : null;
      } else {
        const n = parseFloat(raw);
        cleaned[spec.key] = Number.isFinite(n) ? n : null;
      }
    }
    const ok = await saveFlockWorksheetValues({
      flock_id: flock!.flock_id!,
      set_date_week_start: flock!.set_date_week_start!,
      worksheet_type: worksheetType,
      values: cleaned,
      notes: notes || null,
    });
    setSaving(false);
    if (ok) {
      onOpenChange(false);
      onSaved?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <span>Flock Detail — {TITLES[worksheetType]}</span>
            {existing && <Badge variant="secondary">Flock-level saved</Badge>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-1 text-sm">
          <div className="font-medium">
            Flock {flock?.flock_number ?? "-"}
            {flock?.flock_name ? ` · ${flock.flock_name}` : ""}
          </div>
          <div className="text-muted-foreground">
            Set Date week starting{" "}
            {flock?.set_date_week_start
              ? format(new Date(flock.set_date_week_start), "MMM d, yyyy")
              : "-"}
          </div>
        </div>

        {!canSave && (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs">
            This flock row is missing a flock ID or set date. Editing at the flock
            level is not available for this row.
          </div>
        )}

        <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs flex gap-2">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
          <div>
            Flock-level values are maintained independently. Saving here does{" "}
            <strong>not</strong> rewrite the house rows shown below. House totals
            are kept for investigation and may differ.
          </div>
        </div>

        <Separator />

        <div>
          <div className="mb-2 text-sm font-semibold">Flock-Level Values</div>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {specs.map((spec) => (
                <div key={spec.key} className="space-y-1">
                  <Label className="text-xs">{spec.label}</Label>
                  <Input
                    type={spec.type === "text" ? "text" : "number"}
                    step={spec.type === "percent" ? "0.01" : "1"}
                    value={values[spec.key] ?? ""}
                    onChange={(e) => handleChange(spec.key, e.target.value)}
                    disabled={!canSave}
                  />
                </div>
              ))}
              <div className="col-span-2 md:col-span-3 space-y-1">
                <Label className="text-xs">Notes</Label>
                <Input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={!canSave}
                />
              </div>
            </div>
          )}
        </div>

        <Separator />

        <div>
          <div className="mb-2 text-sm font-semibold">
            House Breakdown{" "}
            <span className="text-xs text-muted-foreground font-normal">
              ({houseSummary.length} house{houseSummary.length === 1 ? "" : "s"} in this week)
            </span>
          </div>
          {houseSummary.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No underlying house records available.
            </div>
          ) : (
            <div className="rounded border divide-y">
              {houseSummary.map((h, i) => (
                <div
                  key={`${h.house_number}-${i}`}
                  className="flex items-center justify-between px-3 py-2 text-sm"
                >
                  <div>
                    <span className="font-medium">House {h.house_number}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      · {h.batch_number}
                      {h.set_date ? ` · Set ${format(new Date(h.set_date), "M/d/yyyy")}` : ""}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {h.sample != null ? `Sample: ${h.sample}` : ""}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-2 text-xs text-muted-foreground">
            To edit a specific house, go to Data Entry → open the flock → open the house worksheet.
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave || saving || loading}>
            {saving ? "Saving…" : existing ? "Update Flock-Level Values" : "Save Flock-Level Values"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
