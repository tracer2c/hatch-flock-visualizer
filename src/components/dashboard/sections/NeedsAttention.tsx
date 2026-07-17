import { format, formatDistanceToNow } from "date-fns";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { WeeklyFlockRollupRow } from "@/hooks/useWeeklyFlockRollup";

interface Item {
  flock: string;
  issue: string;
  metricLabel: string;
  metricValue: string;
  target: string;
  variance: string;
  updated: string;
  meta: string;
  targetRoute: string;
}

interface Props {
  rows: WeeklyFlockRollupRow[];
  criticalAlerts: number;
  emptyState?: React.ReactNode;
}

const pct = (n: number | null | undefined) => (n == null || isNaN(n) ? "Pending" : `${n.toFixed(1)}%`);

export function NeedsAttention({ rows, criticalAlerts, emptyState }: Props) {
  const navigate = useNavigate();

  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    for (const row of rows) {
      const flock = `Flock ${row.flock_number ?? row.flock_name ?? "—"}`;
      const updated = row.earliest_set_date
        ? formatDistanceToNow(new Date(row.earliest_set_date), { addSuffix: true })
        : "Recently";
      const setDate = row.earliest_set_date
        ? `Set Date: ${format(new Date(row.earliest_set_date), "MMM d, yyyy")}`
        : "Set date unavailable";

      if (row.fertility_pct == null && row.total_eggs_set > 0) {
        out.push({
          flock,
          issue: "Fertility data missing",
          metricLabel: "Fertility",
          metricValue: "Not entered",
          target: "85%",
          variance: "Missing",
          updated,
          meta: `Affects ${row.house_count || 1} house${row.house_count === 1 ? "" : "s"}  •  ${setDate}`,
          targetRoute: "/data-entry",
        });
      } else if (row.fertility_pct != null && row.fertility_pct < 85) {
        out.push({
          flock,
          issue: "Fertility below target",
          metricLabel: "Fertility",
          metricValue: pct(row.fertility_pct),
          target: "85%",
          variance: `-${(85 - row.fertility_pct).toFixed(1)}%`,
          updated,
          meta: `Affects ${row.house_count || 1} house${row.house_count === 1 ? "" : "s"}  •  ${setDate}`,
          targetRoute: "/embrex-data-sheet",
        });
      } else if (row.hof_pct == null && row.worst_status === "completed") {
        out.push({
          flock,
          issue: "Hatch data pending",
          metricLabel: "Hatch",
          metricValue: "Pending",
          target: "88%",
          variance: "Pending",
          updated,
          meta: `Affects ${row.house_count || 1} house${row.house_count === 1 ? "" : "s"}  •  ${setDate}`,
          targetRoute: "/data-entry",
        });
      }
      if (out.length >= 3) break;
    }

    if (criticalAlerts > 0 && out.length < 3) {
      out.push({
        flock: "QA System",
        issue: `${criticalAlerts} critical QA alert${criticalAlerts === 1 ? "" : "s"}`,
        metricLabel: "Alerts",
        metricValue: String(criticalAlerts),
        target: "0",
        variance: `+${criticalAlerts}`,
        updated: "Now",
        meta: "Immediate review recommended",
        targetRoute: "/qa-hub",
      });
    }

    return out;
  }, [rows, criticalAlerts]);

  return (
    <Card className="border-border/70 shadow-sm">
      <CardContent className="p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <h2 className="text-base font-medium">Needs Attention</h2>
            {items.length > 0 && (
              <Badge className="h-5 rounded-full bg-red-500 px-2 text-[11px] text-white hover:bg-red-500">
                {items.length}
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" className="text-primary" onClick={() => navigate("/embrex-data-sheet")}>
            View all
          </Button>
        </div>

        {items.length === 0 ? (
          emptyState ?? (
            <div className="flex min-h-[150px] flex-col items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-center">
              <CheckCircle2 className="h-7 w-7 text-emerald-600" />
              <div className="text-sm font-semibold text-emerald-700">Nothing needs attention.</div>
              <div className="text-xs text-muted-foreground">All selected flocks are operating within current targets.</div>
            </div>
          )
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={`${item.flock}-${item.issue}`}
                className="rounded-lg border border-orange-500/20 bg-orange-500/[0.03] px-3 py-2.5"
              >
                <div className="grid gap-3 xl:grid-cols-[minmax(180px,1.1fr)_minmax(420px,2fr)_auto] xl:items-center">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-orange-500" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="text-sm font-medium text-foreground">{item.flock}</span>
                        <span className="text-sm font-medium text-orange-500">{item.issue}</span>
                      </div>
                      <div className="mt-1 text-xs font-medium text-muted-foreground">{item.meta}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div className="rounded-md bg-background/70 px-2.5 py-1.5">
                      <div className="text-[11px] font-medium text-muted-foreground">{item.metricLabel}</div>
                      <div className="mt-0.5 text-sm font-semibold tabular-nums">{item.metricValue}</div>
                    </div>
                    <div className="rounded-md bg-background/70 px-2.5 py-1.5">
                      <div className="text-[11px] font-medium text-muted-foreground">Target</div>
                      <div className="mt-0.5 text-sm font-semibold tabular-nums">{item.target}</div>
                    </div>
                    <div className="rounded-md bg-background/70 px-2.5 py-1.5">
                      <div className="text-[11px] font-medium text-muted-foreground">Variance</div>
                      <div className="mt-0.5 text-sm font-semibold text-red-500 tabular-nums">{item.variance}</div>
                    </div>
                    <div className="rounded-md bg-background/70 px-2.5 py-1.5">
                      <div className="text-[11px] font-medium text-muted-foreground">Updated</div>
                      <div className="mt-0.5 text-sm font-semibold tabular-nums">{item.updated}</div>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 justify-self-start border-primary/30 px-3 text-xs font-medium text-primary hover:bg-primary/10 hover:text-primary xl:justify-self-end"
                    onClick={() => navigate(item.targetRoute)}
                  >
                    Review Flock
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
