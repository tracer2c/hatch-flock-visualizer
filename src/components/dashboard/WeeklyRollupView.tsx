import { useMemo, useState } from "react";
import { addDays, endOfWeek, format, startOfWeek, subDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { WeekPickerCard } from "@/components/uui/WeekPickerCard";
import {
  ChevronLeft,
  ChevronRight,
  Egg,
  ChevronRight as OpenIcon,
} from "lucide-react";
import { useWeeklyFlockRollup, WeeklyFlockRollupRow } from "@/hooks/useWeeklyFlockRollup";
import { cn } from "@/lib/utils";

interface Props {
  onOpenFlock: (row: WeeklyFlockRollupRow, weekStart: Date, weekEnd: Date) => void;
}

const fmtInt = (n: number | null | undefined) =>
  n == null || Number.isNaN(n) ? "—" : Math.round(n).toLocaleString();
const fmtPct = (n: number | null | undefined) =>
  n == null || Number.isNaN(n) ? "—" : `${n.toFixed(1)}%`;

const statusColor = (s: string) => {
  switch (s) {
    case "in_setter":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "in_hatcher":
      return "bg-orange-100 text-orange-700 border-orange-200";
    case "completed":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "cancelled":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
};

const statusLabel = (s: string) =>
  ({
    scheduled: "Scheduled",
    in_setter: "In Setter",
    in_hatcher: "In Hatcher",
    completed: "Completed",
    cancelled: "Cancelled",
  }[s] || s);

export default function WeeklyRollupView({ onOpenFlock }: Props) {
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const weekStart = useMemo(() => startOfWeek(anchor, { weekStartsOn: 1 }), [anchor]);
  const weekEnd = useMemo(() => endOfWeek(anchor, { weekStartsOn: 1 }), [anchor]);

  const { data, isLoading, isError, error } = useWeeklyFlockRollup({ weekStart, weekEnd });

  const totalEggs = (data ?? []).reduce((a, r) => a + r.total_eggs_set, 0);
  const totalHouses = (data ?? []).reduce((a, r) => a + r.house_count, 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Egg className="h-5 w-5 text-primary" />
                Weekly Flock Rollup
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Flocks grouped by Set Date week. House records remain the source of truth —
                click a flock to drill down.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setAnchor((d) => subDays(d, 7))}
                aria-label="Previous week"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <WeekPickerCard value={anchor} onChange={setAnchor} />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setAnchor((d) => addDays(d, 7))}
                aria-label="Next week"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setAnchor(new Date())}>
                This week
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-6 text-sm mb-4">
            <div>
              <div className="text-muted-foreground">Flocks</div>
              <div className="text-2xl font-semibold">{(data ?? []).length}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Houses</div>
              <div className="text-2xl font-semibold">{totalHouses}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Total Eggs Set (week)</div>
              <div className="text-2xl font-semibold">{fmtInt(totalEggs)}</div>
            </div>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">Loading…</div>
          ) : isError ? (
            <div className="py-12 text-center text-destructive">
              {(error as Error)?.message || "Failed to load"}
            </div>
          ) : !data || data.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No flocks set in this week.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Flock</TableHead>
                    <TableHead className="text-center">Houses</TableHead>
                    <TableHead className="text-right">Eggs Set</TableHead>
                    <TableHead className="text-right">Injected</TableHead>
                    <TableHead className="text-right">Clears</TableHead>
                    <TableHead className="text-right">Chicks</TableHead>
                    <TableHead className="text-right">Grade A %</TableHead>
                    <TableHead className="text-right">Fertility %</TableHead>
                    <TableHead className="text-right">HOF %</TableHead>
                    <TableHead className="text-right">HOI %</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Set Date</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row) => (
                    <TableRow
                      key={row.key}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => onOpenFlock(row, weekStart, weekEnd)}
                    >
                      <TableCell>
                        <div className="font-medium">{row.flock_name || "—"}</div>
                        <div className="text-xs text-muted-foreground">
                          #{row.flock_number ?? "—"}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{row.house_count}</TableCell>
                      <TableCell className="text-right font-medium">
                        {fmtInt(row.total_eggs_set)}
                      </TableCell>
                      <TableCell className="text-right">
                        {fmtInt(row.total_eggs_injected)}
                      </TableCell>
                      <TableCell className="text-right">
                        {fmtInt(row.total_eggs_cleared)}
                      </TableCell>
                      <TableCell className="text-right">
                        {fmtInt(row.total_chicks_hatched)}
                      </TableCell>
                      <TableCell className="text-right">
                        {fmtPct(row.grade_a_pct)}
                        {row.flock_level_source?.egg_pack && (
                          <span title={`House sum: ${fmtPct(row.house_sum_alt?.grade_a_pct)}`} className="ml-1 text-[10px] text-primary">●</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {fmtPct(row.fertility_pct)}
                        {row.flock_level_source?.fertility && (
                          <span title={`House sum: ${fmtPct(row.house_sum_alt?.fertility_pct)}`} className="ml-1 text-[10px] text-primary">●</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {fmtPct(row.hof_pct)}
                        {(row.flock_level_source?.residue || row.flock_level_source?.fertility) && (
                          <span title={`House sum: ${fmtPct(row.house_sum_alt?.hof_pct)}`} className="ml-1 text-[10px] text-primary">●</span>
                        )}
                        {row.hof_hoi_source === "batch" && row.hof_pct != null && (
                          <span title="Derived from batch totals (chicks ÷ fertile via fertility %)" className="ml-1 text-[10px] text-muted-foreground">·b</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {fmtPct(row.hoi_pct)}
                        {(row.flock_level_source?.residue || row.flock_level_source?.fertility) && (
                          <span title={`House sum: ${fmtPct(row.house_sum_alt?.hoi_pct)}`} className="ml-1 text-[10px] text-primary">●</span>
                        )}
                        {row.hof_hoi_source === "batch" && row.hoi_pct != null && (
                          <span title="Derived from batch totals (chicks ÷ eggs injected)" className="ml-1 text-[10px] text-muted-foreground">·b</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColor(row.worst_status)}>
                          {statusLabel(row.worst_status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {row.earliest_set_date
                          ? format(new Date(row.earliest_set_date), "MMM d")
                          : "—"}
                        {row.set_dates.length > 1 ? ` +${row.set_dates.length - 1}` : ""}
                      </TableCell>
                      <TableCell>
                        <OpenIcon className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
