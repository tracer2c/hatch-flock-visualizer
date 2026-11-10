import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowDownToLine, Save, Syringe } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentUserName } from "@/hooks/useCurrentUserName";
import { parseLocalDate } from "@/utils/localDate";
import { allocateByWeight } from "@/utils/houseGroups";
import type { FlockWeekBatch } from "@/hooks/useFlockWeekBatches";
import type { FlockWeeklyClear } from "@/hooks/useFlockWeeklyClears";

export interface ClearsSheetRowSnapshot {
  setDate: string;
  /** Row label for the print view, e.g. "4 buggies". */
  houseNumber: string;
  sampleSize: number;
  clears: number | null;
  injected: number | null;
  injectionPct: number | null;
  hatch: number | null;
  hatchPct: number | null;
  hoiPct: number | null;
}

interface Props {
  batches: FlockWeekBatch[];
  flockId: string | null;
  periodStart: string;
  periodEnd: string;
  existingRow?: FlockWeeklyClear;
  readOnly?: boolean;
  onSaved?: () => void | Promise<void>;
  onSnapshot?: (rows: ClearsSheetRowSnapshot[], technician: string) => void;
  onTotalsChange?: (totals: {
    sample: number;
    injectionPct: number | null;
    hatchPct: number | null;
    hoiPct: number | null;
  }) => void;
}

type Cells = { sample: string; clears: string; hatch: string };
type Scope = "day" | "flock";

interface Line {
  key: string;
  label: string;
  setDate: string;
  batches: FlockWeekBatch[];
  eggsSet: number;
}

const EMPTY: Cells = { sample: "", clears: "", hatch: "" };

const toNum = (raw: string): number | null => {
  if (raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};
const fmtInt = (n: number | null | undefined) =>
  n == null ? "—" : Math.round(n).toLocaleString();
const fmtPct = (n: number | null) => (n == null ? "—" : `${n.toFixed(2)}%`);

const dayLabel = (iso: string) => {
  const d = parseLocalDate(iso);
  return d ? format(d, "EEE MMM d") : iso;
};

const buggyText = (n: number) => `${n} ${n === 1 ? "buggy" : "buggies"}`;
const buggiesIn = (batches: FlockWeekBatch[]) =>
  batches.reduce((sum, b) => sum + (b.buggies ?? 1), 0);

/**
 * Weekly Clears / Injected / Hatch sheet. Counts are typed once per day (or
 * once for the whole flock) instead of once per buggy. Saving splits each
 * total across that day's set records in proportion to eggs set, so the
 * per-record numbers always add back up to what was typed and every other
 * screen keeps reading the same `batches` columns.
 */
export default function WeeklyClearsSheet({
  batches,
  flockId,
  periodStart,
  periodEnd,
  existingRow,
  readOnly,
  onSaved,
  onSnapshot,
  onTotalsChange,
}: Props) {
  const qc = useQueryClient();
  const { user, profile } = useAuth();
  const [saving, setSaving] = useState(false);
  const technician = useCurrentUserName();
  const [notes, setNotes] = useState(existingRow?.notes ?? "");
  const [scope, setScope] = useState<Scope>("day");
  const [cells, setCells] = useState<Record<string, Cells>>({});
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  const lines = useMemo<Line[]>(() => {
    const sorted = [...batches].sort(
      (a, b) => a.set_date.localeCompare(b.set_date) || a.id.localeCompare(b.id)
    );
    if (scope === "flock") {
      if (sorted.length === 0) return [];
      return [
        {
          key: "all",
          label: "Whole flock",
          setDate: periodStart,
          batches: sorted,
          eggsSet: sorted.reduce((s, b) => s + (b.total_eggs_set || 0), 0),
        },
      ];
    }
    const byDay = new Map<string, FlockWeekBatch[]>();
    sorted.forEach((b) => byDay.set(b.set_date, [...(byDay.get(b.set_date) ?? []), b]));
    return Array.from(byDay.entries()).map(([date, list]) => ({
      key: date,
      label: dayLabel(date),
      setDate: date,
      batches: list,
      eggsSet: list.reduce((s, b) => s + (b.total_eggs_set || 0), 0),
    }));
  }, [batches, scope, periodStart]);
  const linesKey = `${scope}:${lines.map((l) => l.key).join(",")}:${batches
    .map((b) => b.id)
    .join(",")}`;

  // Prefill from the set sheet + whatever was already saved on each record.
  useEffect(() => {
    const next: Record<string, Cells> = {};
    lines.forEach((line) => {
      const withClears = line.batches.filter((b) => b.eggs_cleared != null);
      const withHatch = line.batches.filter((b) => b.chicks_hatched != null);
      // Buggies already counted contribute what was counted (clears + injected);
      // buggies set later or not counted yet contribute their eggs set. That way
      // a buggy added after the day was saved raises the sample instead of being
      // mistaken for extra injected eggs.
      const sample = line.batches.reduce(
        (s, b) =>
          s +
          (b.eggs_cleared != null && b.eggs_injected != null
            ? b.eggs_cleared + b.eggs_injected
            : b.total_eggs_set || 0),
        0
      );
      next[line.key] = {
        sample: sample ? String(sample) : "",
        clears:
          withClears.length === 0
            ? ""
            : String(withClears.reduce((s, b) => s + (b.eggs_cleared ?? 0), 0)),
        hatch:
          withHatch.length === 0
            ? ""
            : String(withHatch.reduce((s, b) => s + (b.chicks_hatched ?? 0), 0)),
      };
    });
    setCells(next);
    setDirty({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linesKey]);

  useEffect(() => {
    setNotes(existingRow?.notes ?? "");
  }, [existingRow?.notes]);

  const derive = (c: Cells | undefined) => {
    const sample = toNum(c?.sample ?? "") ?? 0;
    const clears = toNum(c?.clears ?? "");
    const hatch = toNum(c?.hatch ?? "");
    const injected = clears == null ? null : Math.max(0, sample - clears);
    return {
      sample,
      clears,
      hatch,
      injected,
      injectionPct: injected != null && sample > 0 ? (injected / sample) * 100 : null,
      hatchPct: hatch != null && sample > 0 ? (hatch / sample) * 100 : null,
      hoiPct: hatch != null && injected && injected > 0 ? (hatch / injected) * 100 : null,
    };
  };

  useEffect(() => {
    if (!onSnapshot) return;
    onSnapshot(
      lines.map((line) => {
        const d = derive(cells[line.key]);
        return {
          setDate: line.setDate,
          houseNumber: buggyText(buggiesIn(line.batches)),
          sampleSize: d.sample,
          clears: d.clears,
          injected: d.injected,
          injectionPct: d.injectionPct,
          hatch: d.hatch,
          hatchPct: d.hatchPct,
          hoiPct: d.hoiPct,
        };
      }),
      technician
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cells, technician, linesKey]);

  const setCell = (key: string, field: keyof Cells, raw: string) => {
    setCells((c) => ({ ...c, [key]: { ...(c[key] ?? EMPTY), [field]: raw } }));
    setDirty((d) => ({ ...d, [key]: true }));
  };

  const fillDown = (field: keyof Cells) => {
    const first = cells[lines[0]?.key]?.[field] ?? "";
    if (!first) return;
    setCells((c) => {
      const next = { ...c };
      const flags: Record<string, boolean> = {};
      lines.slice(1).forEach((line) => {
        next[line.key] = { ...(next[line.key] ?? EMPTY), [field]: first };
        flags[line.key] = true;
      });
      setDirty((d) => ({ ...d, ...flags }));
      return next;
    });
  };

  const focusCell = (idx: number, field: keyof Cells) => {
    const line = lines[idx];
    if (!line) return;
    inputs.current[`${line.key}:${field}`]?.focus();
  };

  const onKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    idx: number,
    field: keyof Cells
  ) => {
    if (e.key === "Enter" || e.key === "ArrowDown") {
      e.preventDefault();
      focusCell(idx + 1, field);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      focusCell(idx - 1, field);
    }
  };

  const totals = useMemo(() => {
    let sample = 0;
    let clears = 0;
    let injected = 0;
    let hatch = 0;
    let eggsSet = 0;
    lines.forEach((line) => {
      const d = derive(cells[line.key]);
      sample += d.sample;
      clears += d.clears ?? 0;
      injected += d.injected ?? 0;
      hatch += d.hatch ?? 0;
      eggsSet += line.eggsSet;
    });
    return {
      sample,
      clears,
      injected,
      hatch,
      eggsSet,
      injectionPct: sample > 0 ? (injected / sample) * 100 : null,
      hatchPct: sample > 0 ? (hatch / sample) * 100 : null,
      hoiPct: injected > 0 ? (hatch / injected) * 100 : null,
    };
  }, [cells, linesKey]);

  useEffect(() => {
    onTotalsChange?.(totals);
  }, [totals, onTotalsChange]);

  const dirtyCount = Object.values(dirty).filter(Boolean).length;

  const handleSave = async () => {
    if (dirtyCount === 0) {
      toast.info("Nothing changed yet.");
      return;
    }
    if (!profile?.company_id) {
      toast.error("Missing company on your profile.");
      return;
    }
    setSaving(true);
    try {
      for (const line of lines) {
        if (!dirty[line.key]) continue;
        const d = derive(cells[line.key]);
        if (d.clears == null && d.hatch == null) continue;

        // Split the typed totals across this line's set records by eggs set.
        const weights = line.batches.map((b) => b.total_eggs_set || 0);
        const samples = allocateByWeight(d.sample, weights);
        const clearParts = d.clears != null ? allocateByWeight(d.clears, weights) : null;
        const hatchParts = d.hatch != null ? allocateByWeight(d.hatch, weights) : null;

        for (let i = 0; i < line.batches.length; i++) {
          const patch: Record<string, number | null> = {};
          if (clearParts) {
            patch.eggs_cleared = clearParts[i];
            patch.eggs_injected = Math.max(0, samples[i] - clearParts[i]);
          }
          if (hatchParts) patch.chicks_hatched = hatchParts[i];
          const { error } = await supabase
            .from("batches")
            .update(patch)
            .eq("id", line.batches[i].id);
          if (error) throw error;
        }
      }

      if (flockId) {
        // Roll-up uses the whole week, including lines that were not edited.
        const { error } = await supabase.from("flock_weekly_clears").upsert(
          {
            company_id: profile.company_id,
            flock_id: flockId,
            period_start: periodStart,
            period_end: periodEnd,
            eggs_set_total: totals.eggsSet,
            eggs_cleared: totals.clears || null,
            chicks_hatched: totals.hatch || null,
            hatch_percent: totals.hatchPct,
            eggs_culled: existingRow?.eggs_culled ?? null,
            technician_name: technician.trim() || null,
            notes: notes.trim() || null,
            created_by: user?.id,
          },
          { onConflict: "flock_id,period_start,period_end" }
        );
        if (error) throw error;
      }

      setDirty({});
      toast.success(
        scope === "flock"
          ? "Saved the whole flock for this week."
          : `Saved ${dirtyCount} ${dirtyCount === 1 ? "day" : "days"} for this week.`
      );
      qc.invalidateQueries({ queryKey: ["flock-weekly-clears", periodStart, periodEnd] });
      qc.invalidateQueries({ queryKey: ["batches"] });
      qc.invalidateQueries({ queryKey: ["complete-data"] });
      qc.invalidateQueries({ queryKey: ["weekly-flock-rollup"] });
      await onSaved?.();
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const numCell = (line: Line, idx: number, field: keyof Cells, placeholder: string) => (
    <Input
      ref={(el) => {
        inputs.current[`${line.key}:${field}`] = el;
      }}
      type="number"
      inputMode="numeric"
      min={0}
      className="h-8 w-28 text-right tabular-nums"
      value={cells[line.key]?.[field] ?? ""}
      onChange={(e) => setCell(line.key, field, e.target.value)}
      onKeyDown={(e) => onKeyDown(e, idx, field)}
      disabled={readOnly}
      placeholder={placeholder}
    />
  );

  const fillHeader = (label: string, field: keyof Cells) => (
    <div className="flex items-center gap-1">
      {label}
      {!readOnly && lines.length > 1 && (
        <button
          type="button"
          title="Fill this column down"
          onClick={() => fillDown(field)}
          className="text-muted-foreground hover:text-primary"
        >
          <ArrowDownToLine className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Syringe className="h-5 w-5 text-primary" />
            Clears, Injected &amp; Hatch — Set Week
          </CardTitle>
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            {buggyText(buggiesIn(batches))} this week
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Enter the day's totals — not each buggy. Sample size pre-fills from the
          eggs set that day; type in clears and hatch as they are counted, save
          any day of the week, and come back for the rest.
        </p>
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            variant={scope === "day" ? "default" : "outline"}
            onClick={() => setScope("day")}
          >
            By day
          </Button>
          <Button
            size="sm"
            variant={scope === "flock" ? "default" : "outline"}
            onClick={() => setScope("flock")}
          >
            Whole flock
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="sticky left-0 z-10 bg-muted/50 px-3 py-2 text-left font-semibold whitespace-nowrap">
                  {scope === "flock" ? "Week" : "Set Date"}
                </th>
                <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                  Buggies
                </th>
                <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">
                  {fillHeader("Sample Size", "sample")}
                </th>
                <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">
                  {fillHeader("Clears", "clears")}
                </th>
                <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">
                  Injected
                </th>
                <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">
                  Injection %
                </th>
                <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">
                  {fillHeader("Hatch", "hatch")}
                </th>
                <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">
                  Hatch %
                </th>
                <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">
                  HOI %
                </th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => {
                const d = derive(cells[line.key]);
                return (
                  <tr key={line.key} className="border-t">
                    <td className="sticky left-0 z-10 bg-background px-3 py-1.5 font-medium whitespace-nowrap">
                      {line.label}
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap text-muted-foreground">
                      {buggiesIn(line.batches)}
                      <span className="ml-2 text-xs">
                        {line.eggsSet.toLocaleString()} eggs
                      </span>
                    </td>
                    <td className="px-1 py-1">{numCell(line, idx, "sample", "0")}</td>
                    <td className="px-1 py-1">{numCell(line, idx, "clears", "0")}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {fmtInt(d.injected)}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {fmtPct(d.injectionPct)}
                    </td>
                    <td className="px-1 py-1">{numCell(line, idx, "hatch", "0")}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {fmtPct(d.hatchPct)}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {fmtPct(d.hoiPct)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-muted/40">
              <tr className="border-t font-semibold">
                <td className="sticky left-0 z-10 bg-muted/40 px-3 py-2 whitespace-nowrap">
                  Flock total
                </td>
                <td className="px-3 py-2">{buggiesIn(batches)}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {fmtInt(totals.sample)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {fmtInt(totals.clears)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {fmtInt(totals.injected)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {fmtPct(totals.injectionPct)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {fmtInt(totals.hatch)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {fmtPct(totals.hatchPct)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {fmtPct(totals.hoiPct)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <Label htmlFor="clears-tech">Technician (signed in)</Label>
            <Input
              id="clears-tech"
              value={technician}
              readOnly
              disabled
              placeholder="Loading…"
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="clears-notes">Notes (optional)</Label>
            <Input
              id="clears-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything worth recording for this week"
              disabled={readOnly}
            />
          </div>
        </div>

        {!readOnly && (
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving || dirtyCount === 0}>
              <Save className="h-4 w-4 mr-2" />
              {saving
                ? "Saving…"
                : dirtyCount > 0
                ? `Save week (${dirtyCount})`
                : "Save week"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
