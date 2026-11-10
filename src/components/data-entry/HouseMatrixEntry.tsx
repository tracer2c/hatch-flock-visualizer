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
import { useCurrentUserName } from "@/hooks/useCurrentUserName";
import type { FlockWeekBatch } from "@/hooks/useFlockWeekBatches";
import { groupBatchesByHouse, houseLabel } from "@/utils/houseGroups";

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
  /** Buggies set for this house. */
  buggies: number;
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
  /**
   * "houses" (default) is the entry sheet, one row per house. "flock" shows the
   * whole-flock average calculated from those house rows (read-only).
   */
  view?: "houses" | "flock";
  /** Emits the current on-screen rows so the page can print them. */
  onSnapshot?: (rows: HouseMatrixRowSnapshot[], technician: string) => void;
  /** Emits combined live field totals for the page summary. */
  onTotalsChange?: (totals: Record<string, number>) => void;
}

const todayISO = () => new Date().toISOString().split("T")[0];

const num = (raw: string | undefined) => {
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
};

/**
 * One row per grower house of a flock/week. Each house shows the eggs set for
 * the week (all its buggies together) and the sample counted for that house, so
 * results can be sent to the breeder per house. The whole-flock view averages
 * those house rows.
 *
 * Storage is unchanged: a house's values live in one row of the target table,
 * on the house's first set record. Rows previously entered per buggy are
 * summed into the house when loaded, and merged into one row when saved.
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
  view = "houses",
  onSnapshot,
  onTotalsChange,
}: Props) {
  const qc = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const technician = useCurrentUserName();
  /** house key -> field -> raw string */
  const [values, setValues] = useState<Record<string, Record<string, string>>>({});
  /** house key -> saved row to update, plus older per-buggy rows to merge away */
  const [rowInfo, setRowInfo] = useState<
    Record<string, { keepId?: string; extraIds: string[] }>
  >({});
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  const groups = useMemo(() => groupBatchesByHouse(batches), [batches]);
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
      const rows = (data || []) as any[];
      const nextValues: Record<string, Record<string, string>> = {};
      const nextInfo: Record<string, { keepId?: string; extraIds: string[] }> = {};
      groups.forEach((g) => {
        const houseRows = rows.filter((r) => g.batchIds.includes(r.batch_id));
        const keep = houseRows.find((r) => r.batch_id === g.repId);
        nextInfo[g.key] = {
          keepId: keep?.id,
          extraIds: houseRows.filter((r) => r !== keep).map((r) => r.id),
        };
        const cells: Record<string, string> = {};
        fields.forEach((f) => {
          const present = houseRows
            .map((r) => r[f.key])
            .filter((v) => v != null && v !== "");
          cells[f.key] =
            present.length > 0
              ? String(present.reduce((s, v) => s + Number(v), 0))
              : houseRows.length === 0 && f.defaultValue != null
              ? String(f.defaultValue)
              : "";
        });
        nextValues[g.key] = cells;
      });
      setValues(nextValues);
      setRowInfo(nextInfo);
      setDirty({});
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchKey, table]);

  const technicianFromRows = technician;

  useEffect(() => {
    if (!onSnapshot) return;
    onSnapshot(
      groups.map((g) => ({
        houseNumber: g.houseNumber,
        eggsSet: g.eggsSet,
        buggies: g.buggyCount,
        values: values[g.key] ?? {},
      })),
      technicianFromRows
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, technicianFromRows, batchKey]);

  const setCell = (key: string, field: string, raw: string) => {
    setValues((v) => ({ ...v, [key]: { ...(v[key] ?? {}), [field]: raw } }));
    setDirty((d) => ({ ...d, [key]: true }));
  };

  /** Copy the first house's value in a column down to every house below. */
  const fillDown = (field: string) => {
    const first = values[groups[0]?.key]?.[field] ?? "";
    if (!first) return;
    setValues((v) => {
      const next = { ...v };
      const flags: Record<string, boolean> = {};
      groups.slice(1).forEach((g) => {
        next[g.key] = { ...(next[g.key] ?? {}), [field]: first };
        flags[g.key] = true;
      });
      setDirty((d) => ({ ...d, ...flags }));
      return next;
    });
  };

  const focusCell = (rowIdx: number, field: string) => {
    const g = groups[rowIdx];
    if (!g) return;
    inputs.current[`${g.key}:${field}`]?.focus();
  };

  const onKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIdx: number,
    field: string
  ) => {
    if (e.key === "Enter" || e.key === "ArrowDown") {
      e.preventDefault();
      focusCell(rowIdx + 1, field);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      focusCell(rowIdx - 1, field);
    }
  };

  const totals = useMemo(() => {
    const out: Record<string, number> = {};
    fields.forEach((f) => {
      out[f.key] = groups.reduce((sum, g) => sum + num(values[g.key]?.[f.key]), 0);
    });
    return out;
  }, [values, fields, groups]);

  useEffect(() => {
    onTotalsChange?.(totals);
  }, [totals, onTotalsChange]);

  const dirtyCount = Object.values(dirty).filter(Boolean).length;
  const totalEggsSet = groups.reduce((s, g) => s + g.eggsSet, 0);
  const totalBuggies = groups.reduce((s, g) => s + g.buggyCount, 0);

  const handleSave = async () => {
    const targets = groups.filter((g) => dirty[g.key]);
    if (targets.length === 0) {
      toast.info("Nothing changed yet.");
      return;
    }
    setSaving(true);
    try {
      const nextInfo = { ...rowInfo };
      for (const g of targets) {
        const cells = values[g.key] ?? {};
        const payload: Record<string, any> = {
          batch_id: g.repId,
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
        const info = rowInfo[g.key] ?? { extraIds: [] };
        let keepId = info.keepId;
        if (keepId) {
          const { error } = await supabase
            .from(table as any)
            .update(payload)
            .eq("id", keepId);
          if (error) throw error;
        } else {
          const { data, error } = await (supabase.from(table as any) as any)
            .insert(payload)
            .select("id")
            .maybeSingle();
          if (error) throw error;
          keepId = (data as { id?: string } | null)?.id;
        }
        // The saved row now holds the whole house, so older per-buggy rows
        // (already included in the values above) are removed to avoid counting
        // them twice.
        if (info.extraIds.length > 0) {
          const { error } = await supabase
            .from(table as any)
            .delete()
            .in("id", info.extraIds);
          if (error) throw error;
        }
        nextInfo[g.key] = { keepId, extraIds: [] };
      }
      setRowInfo(nextInfo);
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

  const sampleTotal = totals.sample_size ?? 0;
  const pct = (value: number) =>
    sampleTotal > 0 ? `${((value / sampleTotal) * 100).toFixed(1)}%` : "—";

  const countBadge = (
    <Badge variant="secondary" className="bg-primary/10 text-primary">
      {groups.length} {groups.length === 1 ? "house" : "houses"} ·{" "}
      {totalBuggies} {totalBuggies === 1 ? "buggy" : "buggies"} this week
    </Badge>
  );

  return (
    <>
      {view === "flock" && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                {icon}
                {title.replace("All Houses", "Whole Flock Average")}
              </CardTitle>
              {countBadge}
            </div>
            <p className="text-sm text-muted-foreground">
              Calculated from the house sheet — no separate entry. Switch to
              "By house" to change a number.
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold whitespace-nowrap" />
                      <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">
                        Eggs Set
                      </th>
                      {fields.map((f) => (
                        <th
                          key={f.key}
                          className="px-3 py-2 text-right font-semibold whitespace-nowrap"
                        >
                          {f.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t">
                      <td className="px-3 py-2 font-medium whitespace-nowrap">
                        Flock total
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {totalEggsSet.toLocaleString()}
                      </td>
                      {fields.map((f) => (
                        <td key={f.key} className="px-3 py-2 text-right tabular-nums">
                          {(totals[f.key] ?? 0).toLocaleString()}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-t bg-primary/5 font-semibold">
                      <td className="px-3 py-2 whitespace-nowrap">Flock average</td>
                      <td className="px-3 py-2" />
                      {fields.map((f) => (
                        <td key={f.key} className="px-3 py-2 text-right tabular-nums">
                          {f.key === "sample_size" ? "" : pct(totals[f.key] ?? 0)}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              Flock average = flock total ÷ total sample size, so a bigger sample
              counts for more.
            </p>
          </CardContent>
        </Card>
      )}

      <Card className={view === "flock" ? "hidden" : undefined}>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              {icon}
              {title}
            </CardTitle>
            {countBadge}
          </div>
          <p className="text-sm text-muted-foreground">
            One row per house — eggs set is the week's total for that house. Type
            the sample for each house; Enter or the arrow keys move to the next
            house.
          </p>
          {groups.some((g) => !g.houseNumber) && groups.length > 0 && (
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Some buggies have no house number, so they are grouped together. Add
              the house on the set sheet (the House box next to the flock number)
              to split them by house.
            </p>
          )}
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
                          {!readOnly && groups.length > 1 && (
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
                  {groups.map((g, rowIdx) => (
                    <tr key={g.key} className="border-t">
                      <td className="sticky left-0 z-10 bg-background px-3 py-1.5 font-medium whitespace-nowrap">
                        {houseLabel(g.houseNumber)}
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          {g.buggyCount} {g.buggyCount === 1 ? "buggy" : "buggies"}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground whitespace-nowrap">
                        {g.eggsSet.toLocaleString()}
                      </td>
                      {fields.map((f) => (
                        <td key={f.key} className="px-1 py-1">
                          <Input
                            ref={(el) => {
                              inputs.current[`${g.key}:${f.key}`] = el;
                            }}
                            type="number"
                            inputMode="numeric"
                            min={0}
                            className="h-8 w-24 text-right tabular-nums"
                            value={values[g.key]?.[f.key] ?? ""}
                            onChange={(e) => setCell(g.key, f.key, e.target.value)}
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
                      {totalEggsSet.toLocaleString()}
                    </td>
                    {fields.map((f) => (
                      <td
                        key={f.key}
                        className="px-2 py-2 text-right font-semibold tabular-nums"
                      >
                        {(totals[f.key] ?? 0).toLocaleString()}
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
    </>
  );
}

export default HouseMatrixEntry;
