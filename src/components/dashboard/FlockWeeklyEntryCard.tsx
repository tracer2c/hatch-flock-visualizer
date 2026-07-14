import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Home, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export type FlockWeeklyTable =
  | "flock_weekly_egg_pack"
  | "flock_weekly_fertility"
  | "flock_weekly_residue";

export interface FlockWeeklyField {
  key: string;
  label: string;
  type?: "number" | "text";
  placeholder?: string;
}

interface Props {
  title: string;
  icon?: React.ReactNode;
  table: FlockWeeklyTable;
  companyId: string | null;
  flockId: string | null;
  flockName: string;
  flockNumber: number | string;
  periodStart: string;
  periodEnd: string;
  fields: FlockWeeklyField[];
  /** House aggregation sum (for reconciliation note) */
  houseSum?: { label: string; value: number } | null;
  disabled?: boolean;
}

/**
 * Generic flock-week entry form. Reads/writes a single row keyed by
 * (company_id, flock_id, period_start) in one of the flock_weekly_* tables.
 * Renders a clear "Scope: Whole flock" badge and displays N/A for House #.
 */
export function FlockWeeklyEntryCard({
  title,
  icon,
  table,
  companyId,
  flockId,
  flockName,
  flockNumber,
  periodStart,
  periodEnd,
  fields,
  houseSum,
  disabled,
}: Props) {
  const qc = useQueryClient();
  const queryKey = [table, companyId, flockId, periodStart];

  const { data: existing, isLoading } = useQuery({
    queryKey,
    enabled: Boolean(companyId && flockId && periodStart),
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table as any)
        .select("*")
        .eq("company_id", companyId!)
        .eq("flock_id", flockId!)
        .eq("period_start", periodStart)
        .maybeSingle();
      if (error) throw error;
      return data as Record<string, any> | null;
    },
  });

  const [values, setValues] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [technician, setTechnician] = useState("");
  const [prefilled, setPrefilled] = useState(false);

  useEffect(() => {
    if (prefilled || isLoading) return;
    const next: Record<string, string> = {};
    fields.forEach((f) => {
      const v = existing?.[f.key];
      next[f.key] = v == null ? "" : String(v);
    });
    setValues(next);
    setNotes(existing?.notes ?? "");
    setTechnician(
      existing?.inspector_name ??
        existing?.technician_name ??
        existing?.lab_technician ??
        ""
    );
    setPrefilled(true);
  }, [existing, isLoading, prefilled, fields]);

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!companyId || !flockId || !periodStart || !periodEnd) {
      toast.error("Missing flock/week context.");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        company_id: companyId,
        flock_id: flockId,
        period_start: periodStart,
        period_end: periodEnd,
        notes: notes || null,
      };
      fields.forEach((f) => {
        const raw = values[f.key];
        if (raw === "" || raw == null) {
          payload[f.key] = f.type === "text" ? null : 0;
        } else {
          payload[f.key] = f.type === "text" ? raw : Number(raw) || 0;
        }
      });
      if (table === "flock_weekly_egg_pack") payload.inspector_name = technician || null;
      if (table === "flock_weekly_fertility") payload.technician_name = technician || null;
      if (table === "flock_weekly_residue") payload.lab_technician = technician || null;

      const { error } = await supabase
        .from(table as any)
        .upsert(payload, { onConflict: "company_id,flock_id,period_start" });
      if (error) throw error;
      toast.success("Saved for the whole flock/week.");
      qc.invalidateQueries({ queryKey });
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const flockSum = useMemo(() => {
    return fields.reduce((sum, f) => {
      const n = Number(values[f.key] || 0);
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0);
  }, [values, fields]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            Scope: Whole flock
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {flockName ? `${flockName} · ` : ""}Flock #{flockNumber || "—"}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* House # display — always N/A for whole flock */}
        <div className="flex flex-wrap items-center gap-3 rounded-md border bg-muted/40 p-3 text-sm">
          <Home className="h-4 w-4 text-primary" />
          <span className="font-medium">House #:</span>
          <span className="text-muted-foreground">N/A · Whole flock</span>
        </div>

        {/* Reconciliation note */}
        {houseSum && houseSum.value > 0 && (
          <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
            House aggregation currently sums to{" "}
            <strong>{houseSum.value.toLocaleString()}</strong> ({houseSum.label}).
            The flock-level entry saved below is treated as the authoritative
            value for the flock/week.
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {fields.map((f) => (
            <div key={f.key}>
              <Label htmlFor={f.key}>{f.label}</Label>
              <Input
                id={f.key}
                type={f.type === "text" ? "text" : "number"}
                inputMode={f.type === "text" ? undefined : "numeric"}
                min={f.type === "text" ? undefined : 0}
                value={values[f.key] ?? ""}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [f.key]: e.target.value }))
                }
                placeholder={f.placeholder ?? (f.type === "text" ? "" : "0")}
                disabled={disabled}
              />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="technician">Technician / Inspector</Label>
            <Input
              id="technician"
              value={technician}
              onChange={(e) => setTechnician(e.target.value)}
              placeholder="Name"
              disabled={disabled}
            />
          </div>
          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              disabled={disabled}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Total across fields: <strong>{flockSum.toLocaleString()}</strong>
          </div>
          <Button onClick={handleSave} disabled={disabled || saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving…" : existing ? "Update entry" : "Save entry"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
