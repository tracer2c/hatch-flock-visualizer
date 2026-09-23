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
import type { FlockWeekBatch } from "@/hooks/useFlockWeekBatches";
import type { FlockWeeklyClear } from "@/hooks/useFlockWeeklyClears";

export interface ClearsSheetRowSnapshot {
  setDate: string;
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

/**
 * Weekly Clears / Injected / Hatch sheet — one line per set record of the
 * flock's set week. Sample size pre-fills from eggs set (editable), Injected
 * derives as sample − clears, and percentages compute per line plus a weighted
 * flock total. Only edited lines are written, so the sheet can be filled in
 * across the week (Mon, Tue, Thu, Fri) as counts come in.
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
  const [cells, setCells] = useState<Record<string, Cells>>({});
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  const rows = useMemo(
    () =>
      [...batches].sort(
        (a, b) =>
          a.set_date.localeCompare(b.set_date) ||
          String(a.house_number).localeCompare(String(b.house_number))
      ),
    [batches]
  );
  const rowsKey = rows.map((r) => r.id).join(",");

  // Prefill from the set sheet + whatever was already saved on each batch.
  useEffect(() => {
    const next: Record<string, Cells> = {};
    rows.forEach((b) => {
      const clears = b.eggs_cleared;
      const injected = b.eggs_injected;
      const sample =
        clears != null && injected != null
          ? clears + injected
          : b.total_eggs_set || 0;
      next[b.id] = {
        sample: sample ? String(sample) : "",
        clears: clears == null ? "" : String(clears),
        hatch: b.chicks_hatched == null ? "" : String(b.chicks_hatched),
      };
    });
    setCells(next);
    setDirty({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowsKey]);

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
      rows.map((b) => {
        const d = derive(cells[b.id]);
        return {
          setDate: b.set_date,
          houseNumber: b.house_number,
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
  }, [cells, technician, rowsKey]);

  const setCell = (id: string, key: keyof Cells, raw: string) => {
    setCells((c) => ({
      ...c,
      [id]: { ...(c[id] ?? { sample: "", clears: "", hatch: "" }), [key]: raw },
    }));
    setDirty((d) => ({ ...d, [id]: true }));
  };

  const fillDown = (key: keyof Cells) => {
    const first = cells[rows[0]?.id]?.[key] ?? "";
    if (!first) return;
    setCells((c) => {
      const next = { ...c };
      const flags: Record<string, boolean> = {};
      rows.slice(1).forEach((b) => {
        next[b.id] = {
          ...(next[b.id] ?? { sample: "", clears: "", hatch: "" }),
          [key]: first,
        };
        flags[b.id] = true;
      });
      setDirty((d) => ({ ...d, ...flags }));
      return next;
    });
  };

  const focusCell = (idx: number, key: keyof Cells) => {
    const b = rows[idx];
    if (!b) return;
    inputs.current[`${b.id}:${key}`]?.focus();
  };

  const onKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    idx: number,
    key: keyof Cells
  ) => {
    if (e.key === "Enter" || e.key === "ArrowDown") {
      e.preventDefault();
      focusCell(idx + 1, key);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      focusCell(idx - 1, key);
    }
  };

  const totals = useMemo(() => {
    let sample = 0;
    let clears = 0;
    let injected = 0;
    let hatch = 0;
    let eggsSet = 0;
    rows.forEach((b) => {
      const d = derive(cells[b.id]);
      sample += d.sample;
      clears += d.clears ?? 0;
      injected += d.injected ?? 0;
      hatch += d.hatch ?? 0;
      eggsSet += b.total_eggs_set || 0;
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
  }, [cells, rowsKey]);

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
      for (const b of rows) {
        if (!dirty[b.id]) continue;
        const d = derive(cells[b.id]);
        const patch: Record<string, number | null> = {};
        if (d.clears != null) {
          patch.eggs_cleared = d.clears;
          patch.eggs_injected = d.injected;
        }
        if (d.hatch != null) patch.chicks_hatched = d.hatch;
        if (Object.keys(patch).length === 0) continue;
        const { error } = await supabase.from("batches").update(patch).eq("id", b.id);
        if (error) throw error;
      }

      if (flockId) {
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
        `Saved ${dirtyCount} ${dirtyCount === 1 ? "line" : "lines"} for this week.`
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

  const numCell = (
    b: FlockWeekBatch,
    idx: number,
    key: keyof Cells,
    placeholder: string
  ) => (
    <Input
      ref={(el) => {
        inputs.current[`${b.id}:${key}`] = el;
      }}
      type="number"
      inputMode="numeric"
      min={0}
      className="h-8 w-28 text-right tabular-nums"
      value={cells[b.id]?.[key] ?? ""}
      onChange={(e) => setCell(b.id, key, e.target.value)}
      onKeyDown={(e) => onKeyDown(e, idx, key)}
      disabled={readOnly}
      placeholder={placeholder}
    />
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
            {rows.length} {rows.length === 1 ? "set record" : "set records"}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          One line per set record. Sample size pre-fills from the set sheet — type
          in clears and hatch as they are counted, save any day of the week, and
          come back for the rest.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="sticky left-0 z-10 bg-muted/50 px-3 py-2 text-left font-semibold whitespace-nowrap">
                  Set Date
                </th>
                <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                  House
                </th>
                <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    Sample Size
                    {!readOnly && rows.length > 1 && (
                      <button
                        type="button"
                        title="Fill this column down"
                        onClick={() => fillDown("sample")}
                        className="text-muted-foreground hover:text-primary"
                      >
                        <ArrowDownToLine className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </th>
                <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    Clears
                    {!readOnly && rows.length > 1 && (
                      <button
                        type="button"
                        title="Fill this column down"
                        onClick={() => fillDown("clears")}
                        className="text-muted-foreground hover:text-primary"
                      >
                        <ArrowDownToLine className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </th>
                <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">
                  Injected
                </th>
                <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">
                  Injection %
                </th>
                <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    Hatch
                    {!readOnly && rows.length > 1 && (
                      <button
                        type="button"
                        title="Fill this column down"
                        onClick={() => fillDown("hatch")}
                        className="text-muted-foreground hover:text-primary"
                      >
                        <ArrowDownToLine className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
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
              {rows.map((b, idx) => {
                const d = derive(cells[b.id]);
                return (
                  <tr key={b.id} className="border-t">
                    <td className="sticky left-0 z-10 bg-background px-3 py-1.5 font-medium whitespace-nowrap">
                      {dayLabel(b.set_date)}
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap">
                      House {b.house_number || "—"}
                      {b.machine_number ? (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {b.machine_number}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-1 py-1">{numCell(b, idx, "sample", "0")}</td>
                    <td className="px-1 py-1">{numCell(b, idx, "clears", "0")}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {fmtInt(d.injected)}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {fmtPct(d.injectionPct)}
                    </td>
                    <td className="px-1 py-1">{numCell(b, idx, "hatch", "0")}</td>
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
                <td className="px-3 py-2" />
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
