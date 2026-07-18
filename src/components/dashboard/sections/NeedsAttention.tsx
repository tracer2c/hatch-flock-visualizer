import { format, formatDistanceToNow } from "date-fns";
import { useMemo, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Bell, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { WeeklyFlockRollupRow } from "@/hooks/useWeeklyFlockRollup";

interface Item {
  flock: string;
  issue: string;
  metricValue: string;
  target: string;
  variance: string;
  updated: string;
  setDate: string;
  impact: string;
  targetRoute: string;
}

interface Props {
  rows: WeeklyFlockRollupRow[];
  criticalAlerts: number;
  emptyState?: ReactNode;
}

const pct = (n: number | null | undefined) => (n == null || isNaN(n) ? "Pending" : `${n.toFixed(1)}%`);

export function NeedsAttention({ rows, criticalAlerts, emptyState }: Props) {
  const navigate = useNavigate();

  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];

    for (const row of rows) {
      const flock = String(row.flock_number ?? row.flock_name ?? "—");
      const updated = row.earliest_set_date
        ? formatDistanceToNow(new Date(row.earliest_set_date), { addSuffix: true })
        : "Recently";
      const setDate = row.earliest_set_date
        ? `Set date: ${format(new Date(row.earliest_set_date), "MMM d, yyyy")}`
        : "Set date unavailable";
      const impact = `Affects ${row.house_count || 1} house${row.house_count === 1 ? "" : "s"}`;

      if (row.fertility_pct == null && row.total_eggs_set > 0) {
        out.push({
          flock,
          issue: "Fertility data missing",
          metricValue: "—",
          target: "85%",
          variance: "Missing",
          updated,
          setDate,
          impact,
          targetRoute: "/data-entry",
        });
      } else if (row.fertility_pct != null && row.fertility_pct < 85) {
        out.push({
          flock,
          issue: "Fertility below target",
          metricValue: pct(row.fertility_pct),
          target: "85%",
          variance: `-${(85 - row.fertility_pct).toFixed(1)}%`,
          updated,
          setDate,
          impact,
          targetRoute: "/embrex-data-sheet",
        });
      } else if (row.hof_pct == null && row.worst_status === "completed") {
        out.push({
          flock,
          issue: "Hatch data pending",
          metricValue: "—",
          target: "88%",
          variance: "Pending",
          updated,
          setDate,
          impact,
          targetRoute: "/data-entry",
        });
      }

      if (out.length >= 3) break;
    }

    if (criticalAlerts > 0 && out.length < 3) {
      out.push({
        flock: "QA System",
        issue: `${criticalAlerts} critical QA alert${criticalAlerts === 1 ? "" : "s"}`,
        metricValue: String(criticalAlerts),
        target: "0",
        variance: `+${criticalAlerts}`,
        updated: "Now",
        setDate: "QA system",
        impact: "Immediate review recommended",
        targetRoute: "/qa-hub",
      });
    }

    return out;
  }, [rows, criticalAlerts]);

  return (
    <Card className="border-border/70 shadow-sm">
      <CardContent className="p-0">
        <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3.5">
          <div className="flex items-center gap-3">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-base font-medium">Needs Attention</h2>
            {items.length > 0 && (
              <Badge className="h-5 rounded-full bg-red-500 px-2 text-[11px] text-white hover:bg-red-500">
                {items.length}
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" className="text-primary" onClick={() => navigate("/embrex-data-sheet")}>
            View all issues
          </Button>
        </div>

        {items.length === 0 ? (
          <div className="p-4">
            {emptyState ?? (
              <div className="flex min-h-[150px] flex-col items-center justify-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.04] text-center">
                <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                <div className="text-sm font-semibold text-emerald-700">Nothing needs attention.</div>
                <div className="text-xs text-muted-foreground">
                  All selected flocks are operating within current targets.
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] table-fixed text-left">
              <colgroup>
                <col className="w-12" />
                <col className="w-[20%]" />
                <col className="w-[26%]" />
                <col className="w-[11%]" />
                <col className="w-[10%]" />
                <col className="w-[12%]" />
                <col className="w-[13%]" />
                <col className="w-24" />
              </colgroup>
              <thead className="border-b border-border/70 bg-muted/[0.16] text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3" colSpan={2}>
                    Flock
                  </th>
                  <th className="px-3 py-3">Issue</th>
                  <th className="px-3 py-3">Current</th>
                  <th className="px-3 py-3">Target</th>
                  <th className="px-3 py-3">Variance</th>
                  <th className="px-3 py-3">Last Updated</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={`${item.flock}-${item.issue}`} className="border-b border-border/60 last:border-b-0">
                    <td className="px-4 py-4 align-middle">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                    </td>
                    <td className="px-0 py-4 align-middle">
                      <div className="truncate text-sm font-semibold text-foreground">{item.flock}</div>
                      <div className="mt-0.5 truncate text-xs font-medium text-muted-foreground">{item.setDate}</div>
                    </td>
                    <td className="px-3 py-4 align-middle">
                      <div className="truncate text-sm font-semibold text-orange-500">{item.issue}</div>
                      <div className="mt-0.5 truncate text-xs font-medium text-muted-foreground">{item.impact}</div>
                    </td>
                    <td className="px-3 py-4 align-middle text-sm font-medium tabular-nums text-foreground">
                      {item.metricValue}
                    </td>
                    <td className="px-3 py-4 align-middle text-sm font-medium tabular-nums text-foreground">
                      {item.target}
                    </td>
                    <td className="px-3 py-4 align-middle text-sm font-semibold tabular-nums text-red-500">
                      {item.variance}
                    </td>
                    <td className="px-3 py-4 align-middle text-sm font-medium text-muted-foreground">
                      {item.updated}
                    </td>
                    <td className="px-4 py-4 align-middle text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 border-primary/25 px-3 text-xs font-medium text-primary hover:bg-primary/10 hover:text-primary"
                        onClick={() => navigate(item.targetRoute)}
                      >
                        Review
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
