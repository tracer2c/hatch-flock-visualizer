import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowDownToLine, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import type { FlockWeekBatch } from "@/hooks/useFlockWeekBatches";

export type HouseMatrixTable =
  | "egg_pack_quality"
  | "fertility_analysis"
  | "residue_analysis";

export interface HouseMatrixField {
  key: string;
  label: string;
  /** Default value pre-filled on empty rows (e.g. sample size 648). */
  defaultValue?: number;
}

export interface HouseMatrixRowSnapshot {
  houseNumber: string;
  eggsSet: number;
  machineNumber: string | null;
  values: Record<string, string>;
}

interface Props {
  title: string;
  icon?: React.ReactNode;
  table: HouseMatrixTable;
  batches: FlockWeekBatch[];
  fields: HouseMatrixField[];
  /** Column holding the technician / inspector name on this table. */
  technicianKey: "inspector_name" | "technician_name" | "lab_technician";
  /** Date column set on save. */
  dateKey: "inspection_date" | "analysis_date";
  readOnly?: boolean;
  /** Emits the current on-screen rows so the page can print them. */
  onSnapshot?: (rows: HouseMatrixRowSnapshot[], technician: string) => void;
}

const todayISO = () => new Date().toISOString().split("T")[0];

/**
 * One row per house of a flock/week, every field of the section as a column.
 * Techs type straight down the sheet and save all houses at once. Values are
 * stored per house against that house's `batch_id`, so nothing about the
 * existing per-house schema changes.
 */
export function HouseMatrixEntry({
  title,
  icon,
  table,
  batches,
  fields,
  technicianKey,
  dateKey,
  readOnly,
  onSnapshot,
}: Props) {
  const qc = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const technician = useCurrentUserName();
  /** batch_id -> field -> raw string */
  const [values, setValues] = useState<Record<string, Record<string, string>>>({});
  /** batch_id -> existing row id (for updates) */
  const [rowIds, setRowIds] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  const batchIds = useMemo(() => batches.map((b) => b.id), [batches]);
  const batchKey = batchIds.join(",");

  useEffect(() => {
    if (batchIds.length === 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from(table as any)
        .select("*")
        .in("batch_id", batchIds);
      if (cancelled) return;
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
      const byBatch = new Map<string, any>();
      (data || []).forEach((r: any) => {
        if (!byBatch.has(r.batch_id)) byBatch.set(r.batch_id, r);
      });
      const nextValues: Record<string, Record<string, string>> = {};
      const nextIds: Record<string, string> = {};
      let tech = "";
      batches.forEach((b) => {
        const row = byBatch.get(b.id);
        if (row) {
          nextIds[b.id] = row.id;
          if (!tech && row[technicianKey]) tech = row[technicianKey];
        }
        const cells: Record<string, string> = {};
        fields.forEach((f) => {
          const v = row?.[f.key];
          cells[f.key] =
            v == null || v === ""
              ? f.defaultValue != null && !row
                ? String(f.defaultValue)
                : ""
              : String(v);
        });
        nextValues[b.id] = cells;
      });
      setValues(nextValues);
      setRowIds(nextIds);
      setTechnician(tech);
      setDirty({});
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchKey, table]);

  useEffect(() => {
    if (!onSnapshot) return;
    onSnapshot(
      batches.map((b) => ({
        houseNumber: b.house_number,
        eggsSet: b.total_eggs_set,
        machineNumber: b.machine_number,
        values: values[b.id] ?? {},
      })),
      technician
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, technician, batchKey]);

  const setCell = (batchId: string, key: string, raw: string) => {
    setValues((v) => ({ ...v, [batchId]: { ...(v[batchId] ?? {}), [key]: raw } }));
    setDirty((d) => ({ ...d, [batchId]: true }));
  };

  /** Copy the first house's value in a column down to every house below. */
  const fillDown = (key: string) => {
    const first = values[batches[0]?.id]?.[key] ?? "";
    if (!first) return;
    setValues((v) => {
      const next = { ...v };
      const flags: Record<string, boolean> = {};
      batches.slice(1).forEach((b) => {
        next[b.id] = { ...(next[b.id] ?? {}), [key]: first };
        flags[b.id] = true;
      });
      setDirty((d) => ({ ...d, ...flags }));
      return next;
    });
  };

  const focusCell = (rowIdx: number, key: string) => {
    const b = batches[rowIdx];
    if (!b) return;
    inputs.current[`${b.id}:${key}`]?.focus();
  };

  const onKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIdx: number,
    key: string
  ) => {
    if (e.key === "Enter" || e.key === "ArrowDown") {
      e.preventDefault();
      focusCell(rowIdx + 1, key);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      focusCell(rowIdx - 1, key);
    }
  };

  const num = (raw: string | undefined) => {
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  };

  const totals = useMemo(() => {
    const out: Record<string, number> = {};
    fields.forEach((f) => {
      out[f.key] = batches.reduce((sum, b) => sum + num(values[b.id]?.[f.key]), 0);
    });
    return out;
  }, [values, fields, batches]);

  const dirtyCount = Object.values(dirty).filter(Boolean).length;

  const handleSave = async () => {
    const targets = batches.filter((b) => dirty[b.id]);
    if (targets.length === 0) {
      toast.info("Nothing changed yet.");
      return;
    }
    setSaving(true);
    try {
      for (const b of targets) {
        const cells = values[b.id] ?? {};
        const payload: Record<string, any> = {
          batch_id: b.id,
          [dateKey]: todayISO(),
          [technicianKey]: technician || null,
        };
        fields.forEach((f) => {
          payload[f.key] = num(cells[f.key]);
        });
        if (table === "residue_analysis") {
          payload.total_residue_count =
            num(cells.early_dead) +
            num(cells.mid_dead) +
            num(cells.late_dead) +
            num(cells.malformed_chicks);
        }
        const existingId = rowIds[b.id];
        if (existingId) {
          const { error } = await supabase
            .from(table as any)
            .update(payload)
            .eq("id", existingId);
          if (error) throw error;
        } else {
          const { data, error } = await (supabase.from(table as any) as any)
            .insert(payload)
            .select("id")
            .maybeSingle();
          if (error) throw error;
          const newId = (data as { id?: string } | null)?.id;
          if (newId) setRowIds((m) => ({ ...m, [b.id]: newId }));
        }
      }
      setDirty({});
      toast.success(
        `Saved ${targets.length} ${targets.length === 1 ? "house" : "houses"}.`
      );
      qc.invalidateQueries({ queryKey: ["weekly-flock-rollup"] });
      qc.invalidateQueries({ queryKey: [table] });
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            {icon}
            {title}
          </CardTitle>
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            {batches.length} {batches.length === 1 ? "house" : "houses"} this week
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          One row per house — type down the column. Enter or the arrow keys move
          to the next house.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="sticky left-0 z-10 bg-muted/50 px-3 py-2 text-left font-semibold whitespace-nowrap">
                    House
                  </th>
                  <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">
                    Eggs Set
                  </th>
                  {fields.map((f) => (
                    <th
                      key={f.key}
                      className="px-2 py-2 text-left font-semibold whitespace-nowrap"
                    >
                      <div className="flex items-center gap-1">
                        <span>{f.label}</span>
                        {!readOnly && batches.length > 1 && (
                          <button
                            type="button"
                            title="Fill this column down"
                            onClick={() => fillDown(f.key)}
                            className="text-muted-foreground hover:text-primary"
                          >
                            <ArrowDownToLine className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {batches.map((b, rowIdx) => (
                  <tr key={b.id} className="border-t">
                    <td className="sticky left-0 z-10 bg-background px-3 py-1.5 font-medium whitespace-nowrap">
                      House {b.house_number || "—"}
                      {b.machine_number ? (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {b.machine_number}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground whitespace-nowrap">
                      {b.total_eggs_set.toLocaleString()}
                    </td>
                    {fields.map((f) => (
                      <td key={f.key} className="px-1 py-1">
                        <Input
                          ref={(el) => {
                            inputs.current[`${b.id}:${f.key}`] = el;
                          }}
                          type="number"
                          inputMode="numeric"
                          min={0}
                          className="h-8 w-24 text-right tabular-nums"
                          value={values[b.id]?.[f.key] ?? ""}
                          onChange={(e) => setCell(b.id, f.key, e.target.value)}
                          onKeyDown={(e) => onKeyDown(e, rowIdx, f.key)}
                          disabled={readOnly}
                          placeholder="0"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted/40">
                <tr className="border-t">
                  <td className="sticky left-0 z-10 bg-muted/40 px-3 py-2 font-semibold whitespace-nowrap">
                    Flock total
                  </td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums">
                    {batches
                      .reduce((s, b) => s + b.total_eggs_set, 0)
                      .toLocaleString()}
                  </td>
                  {fields.map((f) => (
                    <td
                      key={f.key}
                      className="px-2 py-2 text-right font-semibold tabular-nums"
                    >
                      {totals[f.key].toLocaleString()}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="w-full max-w-xs">
            <Label htmlFor="matrix-technician">Technician / Inspector (signed in)</Label>
            <Input
              id="matrix-technician"
              value={technician}
              readOnly
              disabled
              placeholder="Loading…"
            />
          </div>
          {!readOnly && (
            <Button onClick={handleSave} disabled={saving || dirtyCount === 0}>
              <Save className="h-4 w-4 mr-2" />
              {saving
                ? "Saving…"
                : dirtyCount > 0
                ? `Save all houses (${dirtyCount})`
                : "Save all houses"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default HouseMatrixEntry;
