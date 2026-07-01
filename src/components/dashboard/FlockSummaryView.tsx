import { useEffect, useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Info, Save, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  useFlockWeeklyClearsMap,
  useSaveFlockTotalsToBatches,
} from "@/hooks/useFlockWeeklyClears";
import { formatLocalDate } from "@/utils/localDate";



interface FlockSummaryViewProps {
  data: any[]; // already filtered/sorted batches for the active date range
  dateFrom: string;
  dateTo: string;
  readOnly?: boolean;
}

type FlockGroup = {
  // Composite key = normalized flock_number + flock_name
  key: string;
  flock_number: number | string;
  flock_name: string;
  age_weeks: number | null;
  eggs_set_total: number;
  // A canonical flock_id used to look up legacy flock_weekly_clears rows.
  // Chosen deterministically as the flock_id with the largest eggs_set share.
  primary_flock_id: string;
  batch_slices: Array<{ id: string; total_eggs_set: number; flock_id: string }>;
  // Live totals from batches (source of truth after our save).
  batches_chicks_hatched: number;
  batches_eggs_cleared: number;
  flock_ids: Set<string>;
  house_count: number;
  machine_count: number;
  name_variants: string[];
};

const pct = (n: number | null | undefined, total: number): string => {
  if (n == null || !total) return "0.0";
  return ((n / total) * 100).toFixed(1);
};

const normalizeName = (s: any) => String(s ?? "").trim().toLowerCase();
const normalizeFlockNumber = (n: any) => String(n ?? "").trim();

export const FlockSummaryView = ({ data, dateFrom, dateTo, readOnly }: FlockSummaryViewProps) => {
  // Anchor the period to the active filter range; fall back to the data's own
  // min/max set_date so a flock summary still makes sense with no filter set.
  const { periodStart, periodEnd } = useMemo(() => {
    if (dateFrom && dateTo) return { periodStart: dateFrom, periodEnd: dateTo };
    const dates = data.map((d) => d.set_date).filter(Boolean).sort();
    return {
      periodStart: dateFrom || dates[0] || "",
      periodEnd: dateTo || dates[dates.length - 1] || "",
    };
  }, [data, dateFrom, dateTo]);

  const groups = useMemo<FlockGroup[]>(() => {
    const byKey = new Map<string, FlockGroup>();
    const nameVariants = new Map<string, Set<string>>();
    for (const item of data) {
      if (!item.flock_id) continue;
      // Group by flock_number ONLY. Per the multi-hatchery pattern, the same
      // flock number placed in different hatcheries creates separate flocks
      // rows but represents the same logical flock to the user.
      const key = normalizeFlockNumber(item.flock_number);
      if (!key) continue; // rows without a flock # can't be summarized
      let g = byKey.get(key);
      const nameKey = String(item.flock_name ?? "").trim();
      if (nameKey) {
        const set = nameVariants.get(key) ?? new Set<string>();
        set.add(nameKey);
        nameVariants.set(key, set);
      }
      if (!g) {
        g = {
          key,
          flock_number: item.flock_number ?? "—",
          flock_name: item.flock_name ?? "—",
          age_weeks: item.age_weeks ?? null,
          eggs_set_total: 0,
          primary_flock_id: item.flock_id,
          batch_slices: [],
          batches_chicks_hatched: 0,
          batches_eggs_cleared: 0,
          flock_ids: new Set<string>(),
          house_count: 0,
          machine_count: 0,
          name_variants: [],
        };
        byKey.set(key, g);
      }
      g.eggs_set_total += item.total_eggs_set || 0;
      g.batches_chicks_hatched += Number(item.chicks_hatched) || 0;
      g.batches_eggs_cleared += Number(item.eggs_cleared) || 0;
      if (item.id) {
        g.batch_slices.push({
          id: item.id,
          total_eggs_set: item.total_eggs_set || 0,
          flock_id: item.flock_id,
        });
      }
      g.flock_ids.add(item.flock_id);
      if (item.machine_id) g.machine_count += 1;
    }
    // Compute house_count and primary_flock_id after collection
    for (const g of byKey.values()) {
      const houses = new Set(
        data
          .filter((d) => g.flock_ids.has(d.flock_id))
          .map((d) => d.house_number)
          .filter((h) => h != null && h !== "")
      );
      g.house_count = houses.size || g.flock_ids.size;

      // Pick the flock_id contributing most eggs as the "primary" so
      // legacy flock_weekly_clears lookups resolve to the busiest one.
      const byFlockShare: Record<string, number> = {};
      for (const s of g.batch_slices) {
        byFlockShare[s.flock_id] = (byFlockShare[s.flock_id] || 0) + s.total_eggs_set;
      }
      const winner = Object.entries(byFlockShare).sort((a, b) => b[1] - a[1])[0];
      if (winner) g.primary_flock_id = winner[0];
      g.name_variants = Array.from(nameVariants.get(g.key) ?? []);
    }
    return Array.from(byKey.values()).sort(
      (a, b) => Number(b.flock_number) - Number(a.flock_number)
    );
  }, [data]);

  const { byFlock: clearsByFlock, isLoading } = useFlockWeeklyClearsMap(periodStart, periodEnd);
  const saveMutation = useSaveFlockTotalsToBatches();

  // Local edit buffer so typing doesn't fight the query cache on every keystroke.
  const [edits, setEdits] = useState<
    Record<string, Partial<Record<"chicks_hatched" | "eggs_culled" | "eggs_cleared", string>>>
  >({});

  const storedFor = (
    g: FlockGroup,
    field: "chicks_hatched" | "eggs_culled" | "eggs_cleared"
  ): number | null => {
    // Prefer live batches totals for hatched/cleared; fall back to fwc.
    if (field === "chicks_hatched") {
      if (g.batches_chicks_hatched > 0) return g.batches_chicks_hatched;
      return clearsByFlock[g.primary_flock_id]?.chicks_hatched ?? null;
    }
    if (field === "eggs_cleared") {
      if (g.batches_eggs_cleared > 0) return g.batches_eggs_cleared;
      return clearsByFlock[g.primary_flock_id]?.eggs_cleared ?? null;
    }
    // culls: only in fwc for now
    return clearsByFlock[g.primary_flock_id]?.eggs_culled ?? null;
  };

  const valueFor = (
    g: FlockGroup,
    field: "chicks_hatched" | "eggs_culled" | "eggs_cleared"
  ) => {
    if (edits[g.key]?.[field] !== undefined) return edits[g.key][field]!;
    const stored = storedFor(g, field);
    return stored != null ? String(stored) : "";
  };

  const setEdit = (
    g: FlockGroup,
    field: "chicks_hatched" | "eggs_culled" | "eggs_cleared",
    value: string
  ) => {
    setEdits((prev) => ({ ...prev, [g.key]: { ...prev[g.key], [field]: value } }));
  };

  // Count rows that actually differ from what's stored — this drives the
  // "N unsaved changes" bar and the navigation guard prompt.
  const dirtyKeys = useMemo(() => {
    const keys: string[] = [];
    for (const g of groups) {
      const rowEdits = edits[g.key];
      if (!rowEdits) continue;
      const changed = (["chicks_hatched", "eggs_culled", "eggs_cleared"] as const).some(
        (field) => {
          if (rowEdits[field] === undefined) return false;
          const stored = storedFor(g, field);
          const storedStr = stored != null ? String(stored) : "";
          return (rowEdits[field] ?? "") !== storedStr;
        }
      );
      if (changed) keys.push(g.key);
    }
    return keys;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, edits, clearsByFlock]);

  const dirtyCount = dirtyKeys.length;
  const isSaving = saveMutation.isPending;

  const commitRow = (g: FlockGroup) => {
    if (readOnly || !periodStart || !periodEnd) return Promise.resolve();
    const parsed = (field: "chicks_hatched" | "eggs_culled" | "eggs_cleared") => {
      const v = valueFor(g, field);
      return v === "" ? null : parseFloat(v);
    };
    return new Promise<void>((resolve, reject) => {
      saveMutation.mutate(
        {
          flock_id: g.primary_flock_id,
          period_start: periodStart,
          period_end: periodEnd,
          eggs_set_total: g.eggs_set_total,
          chicks_hatched: parsed("chicks_hatched"),
          eggs_culled: parsed("eggs_culled"),
          eggs_cleared: parsed("eggs_cleared"),
          batch_slices: g.batch_slices.map((s) => ({
            id: s.id,
            total_eggs_set: s.total_eggs_set,
          })),
        },
        {
          onSuccess: () => {
            setEdits((prev) => {
              const next = { ...prev };
              delete next[g.key];
              return next;
            });
            resolve();
          },
          onError: (e) => reject(e),
        }
      );
    });
  };

  const saveAll = async () => {
    if (readOnly || dirtyCount === 0) return;
    const groupsByKey = new Map(groups.map((g) => [g.key, g] as const));
    for (const key of dirtyKeys) {
      const g = groupsByKey.get(key);
      if (!g) continue;
      try {
        await commitRow(g);
      } catch {
        // toast handled inside the mutation; stop the batch on error
        return;
      }
    }
  };

  const discardAll = () => setEdits({});

  // Warn on full-page close/reload while edits are pending.
  useEffect(() => {
    if (dirtyCount === 0) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirtyCount]);



  const totals = useMemo(() => {
    return groups.reduce(
      (acc, g) => {
        acc.eggsSet += g.eggs_set_total;
        acc.hatched += Number(valueFor(g, "chicks_hatched")) || 0;
        acc.culls += Number(valueFor(g, "eggs_culled")) || 0;
        acc.clears += Number(valueFor(g, "eggs_cleared")) || 0;
        return acc;
      },
      { eggsSet: 0, hatched: 0, culls: 0, clears: 0 }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, clearsByFlock, edits]);

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2 border">
        <Info className="h-4 w-4 mt-0.5 shrink-0" />
        <span>
          Values entered here are saved to each house in the flock, split by egg
          count. They appear in <strong>By House</strong>, exports, and analytics —
          no need to re-enter anywhere else. Changes are <strong>not saved automatically</strong>
          {" "}— click <strong>Save changes</strong> when done.
        </span>
      </div>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm text-muted-foreground">
          Period: {formatLocalDate(periodStart, "—")} – {formatLocalDate(periodEnd, "—")}
          {" · "}Set the date range filter above to control which week (or day)
          this groups by.
        </div>
        {!readOnly && (
          <div className="flex items-center gap-2">
            {dirtyCount > 0 && (
              <Badge variant="secondary" className="gap-1">
                {dirtyCount} unsaved {dirtyCount === 1 ? "change" : "changes"}
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={dirtyCount === 0 || isSaving}
              onClick={discardAll}
              className="gap-1.5"
            >
              <X className="h-3.5 w-3.5" />
              Discard
            </Button>
            <Button
              size="sm"
              disabled={dirtyCount === 0 || isSaving}
              onClick={saveAll}
              className="gap-1.5"
            >
              <Save className="h-3.5 w-3.5" />
              {isSaving ? "Saving…" : `Save changes${dirtyCount > 0 ? ` (${dirtyCount})` : ""}`}
            </Button>
          </div>
        )}
      </div>


      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Flock</TableHead>
              <TableHead>Farm</TableHead>
              <TableHead>Age</TableHead>
              <TableHead>Eggs Set</TableHead>
              <TableHead>Hatch</TableHead>
              <TableHead>Hatch %</TableHead>
              <TableHead>Culls</TableHead>
              <TableHead>Cull %</TableHead>
              <TableHead>Clear</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : groups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground">
                  No data for this range
                </TableCell>
              </TableRow>
            ) : (
              groups.map((g) => {
                const hatched = parseFloat(valueFor(g, "chicks_hatched")) || 0;
                return (
                  <TableRow key={g.key}>
                    <TableCell className="font-medium">{g.flock_number}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{g.flock_name}</span>
                        {g.batch_slices.length > 1 && (
                          <Badge variant="secondary" className="text-[10px]">
                            {g.house_count} {g.house_count === 1 ? "house" : "houses"}
                          </Badge>
                        )}
                        {g.name_variants.length > 1 && (
                          <Badge
                            variant="outline"
                            className="text-[10px]"
                            title={g.name_variants.join(" · ")}
                          >
                            +{g.name_variants.length - 1} variant{g.name_variants.length - 1 === 1 ? "" : "s"}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{g.age_weeks ?? "-"}</TableCell>
                    <TableCell className="tabular-nums">
                      {g.eggs_set_total.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        className="w-24 h-8"
                        disabled={readOnly}
                        value={valueFor(g, "chicks_hatched")}
                        onChange={(e) => setEdit(g, "chicks_hatched", e.target.value)}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">
                      {pct(hatched, g.eggs_set_total)}%
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        className="w-24 h-8"
                        disabled={readOnly}
                        value={valueFor(g, "eggs_culled")}
                        onChange={(e) => setEdit(g, "eggs_culled", e.target.value)}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">
                      {pct(parseFloat(valueFor(g, "eggs_culled")) || 0, g.eggs_set_total)}%
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        className="w-24 h-8"
                        disabled={readOnly}
                        value={valueFor(g, "eggs_cleared")}
                        onChange={(e) => setEdit(g, "eggs_cleared", e.target.value)}
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
          {groups.length > 0 && (
            <tfoot>
              <TableRow className="font-semibold bg-muted/50">
                <TableCell colSpan={3}>Totals</TableCell>
                <TableCell className="tabular-nums">{totals.eggsSet.toLocaleString()}</TableCell>
                <TableCell className="tabular-nums">{totals.hatched.toLocaleString()}</TableCell>
                <TableCell className="tabular-nums text-muted-foreground">
                  {pct(totals.hatched, totals.eggsSet)}%
                </TableCell>
                <TableCell className="tabular-nums">{totals.culls.toLocaleString()}</TableCell>
                <TableCell />
                <TableCell className="tabular-nums">{totals.clears.toLocaleString()}</TableCell>
              </TableRow>
            </tfoot>
          )}
        </Table>
      </div>
    </div>
  );
};
