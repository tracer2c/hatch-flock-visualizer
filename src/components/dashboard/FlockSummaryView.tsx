import { useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { useFlockWeeklyClearsMap, useSaveFlockWeeklyClear } from "@/hooks/useFlockWeeklyClears";

interface FlockSummaryViewProps {
  data: any[]; // already filtered/sorted batches for the active date range
  dateFrom: string;
  dateTo: string;
  readOnly?: boolean;
}

type FlockGroup = {
  flock_id: string;
  flock_number: number | string;
  flock_name: string;
  age_weeks: number | null;
  eggs_set_total: number;
};

const pct = (n: number | null | undefined, total: number): string => {
  if (n == null || !total) return "0.0";
  return ((n / total) * 100).toFixed(1);
};

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
    const byFlock = new Map<string, FlockGroup>();
    for (const item of data) {
      if (!item.flock_id) continue;
      const existing = byFlock.get(item.flock_id);
      if (existing) {
        existing.eggs_set_total += item.total_eggs_set || 0;
      } else {
        byFlock.set(item.flock_id, {
          flock_id: item.flock_id,
          flock_number: item.flock_number ?? "—",
          flock_name: item.flock_name ?? "—",
          age_weeks: item.age_weeks ?? null,
          eggs_set_total: item.total_eggs_set || 0,
        });
      }
    }
    return Array.from(byFlock.values()).sort((a, b) => Number(b.flock_number) - Number(a.flock_number));
  }, [data]);

  const { byFlock: clearsByFlock, isLoading } = useFlockWeeklyClearsMap(periodStart, periodEnd);
  const saveMutation = useSaveFlockWeeklyClear();

  // Local edit buffer so typing doesn't fight the query cache on every keystroke.
  const [edits, setEdits] = useState<Record<string, Partial<Record<"chicks_hatched" | "hatch_percent" | "eggs_culled" | "eggs_cleared", string>>>>({});

  const valueFor = (flockId: string, field: "chicks_hatched" | "hatch_percent" | "eggs_culled" | "eggs_cleared") => {
    if (edits[flockId]?.[field] !== undefined) return edits[flockId][field]!;
    const saved = clearsByFlock[flockId]?.[field];
    return saved != null ? String(saved) : "";
  };

  const setEdit = (flockId: string, field: "chicks_hatched" | "hatch_percent" | "eggs_culled" | "eggs_cleared", value: string) => {
    setEdits((prev) => ({ ...prev, [flockId]: { ...prev[flockId], [field]: value } }));
  };

  const commitRow = (group: FlockGroup) => {
    if (readOnly || !periodStart || !periodEnd) return;
    const parsed = (field: "chicks_hatched" | "hatch_percent" | "eggs_culled" | "eggs_cleared") => {
      const v = valueFor(group.flock_id, field);
      return v === "" ? null : parseFloat(v);
    };
    saveMutation.mutate({
      flock_id: group.flock_id,
      period_start: periodStart,
      period_end: periodEnd,
      eggs_set_total: group.eggs_set_total,
      chicks_hatched: parsed("chicks_hatched"),
      hatch_percent: parsed("hatch_percent"),
      eggs_culled: parsed("eggs_culled"),
      eggs_cleared: parsed("eggs_cleared"),
    });
  };

  const totals = useMemo(() => {
    return groups.reduce(
      (acc, g) => {
        const saved = clearsByFlock[g.flock_id];
        acc.eggsSet += g.eggs_set_total;
        acc.culls += Number(edits[g.flock_id]?.eggs_culled ?? saved?.eggs_culled ?? 0) || 0;
        acc.clears += Number(edits[g.flock_id]?.eggs_cleared ?? saved?.eggs_cleared ?? 0) || 0;
        return acc;
      },
      { eggsSet: 0, culls: 0, clears: 0 }
    );
  }, [groups, clearsByFlock, edits]);

  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground">
        Period: {periodStart ? format(new Date(periodStart), "MMM d, yyyy") : "—"} –{" "}
        {periodEnd ? format(new Date(periodEnd), "MMM d, yyyy") : "—"}
        {" · "}Set the date range filter above to control which week (or day) this groups by.
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
              groups.map((g) => (
                <TableRow key={g.flock_id}>
                  <TableCell className="font-medium">{g.flock_number}</TableCell>
                  <TableCell>{g.flock_name}</TableCell>
                  <TableCell>{g.age_weeks ?? "-"}</TableCell>
                  <TableCell className="tabular-nums">{g.eggs_set_total.toLocaleString()}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      className="w-24 h-8"
                      disabled={readOnly}
                      value={valueFor(g.flock_id, "chicks_hatched")}
                      onChange={(e) => setEdit(g.flock_id, "chicks_hatched", e.target.value)}
                      onBlur={() => commitRow(g)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.1"
                      min={0}
                      max={100}
                      className="w-20 h-8"
                      disabled={readOnly}
                      value={valueFor(g.flock_id, "hatch_percent")}
                      placeholder={pct(parseFloat(valueFor(g.flock_id, "chicks_hatched")) || 0, g.eggs_set_total)}
                      onChange={(e) => setEdit(g.flock_id, "hatch_percent", e.target.value)}
                      onBlur={() => commitRow(g)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      className="w-24 h-8"
                      disabled={readOnly}
                      value={valueFor(g.flock_id, "eggs_culled")}
                      onChange={(e) => setEdit(g.flock_id, "eggs_culled", e.target.value)}
                      onBlur={() => commitRow(g)}
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {pct(parseFloat(valueFor(g.flock_id, "eggs_culled")) || 0, g.eggs_set_total)}%
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      className="w-24 h-8"
                      disabled={readOnly}
                      value={valueFor(g.flock_id, "eggs_cleared")}
                      onChange={(e) => setEdit(g.flock_id, "eggs_cleared", e.target.value)}
                      onBlur={() => commitRow(g)}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {groups.length > 0 && (
            <tfoot>
              <TableRow className="font-semibold bg-muted/50">
                <TableCell colSpan={3}>Totals</TableCell>
                <TableCell className="tabular-nums">{totals.eggsSet.toLocaleString()}</TableCell>
                <TableCell colSpan={2} />
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
