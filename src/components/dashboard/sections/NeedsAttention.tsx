import { useMemo } from "react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, AlertOctagon, Activity, ChevronRight } from "lucide-react";
import type { WeeklyFlockRollupRow } from "@/hooks/useWeeklyFlockRollup";

type IssueKind = "variance" | "missing" | "below" | "qa" | "due";

interface Item {
  flock: string;
  kind: IssueKind;
  detail: string;
  setDate: string | null;
  action: string;
  target: string;
}

const kindMeta: Record<IssueKind, { label: string; className: string; icon: any }> = {
  variance: { label: "Performance Variance", className: "bg-rose-100 text-rose-700 border-rose-200", icon: Activity },
  missing: { label: "Missing Data", className: "bg-amber-100 text-amber-700 border-amber-200", icon: AlertTriangle },
  below: { label: "Below Target", className: "bg-orange-100 text-orange-700 border-orange-200", icon: AlertTriangle },
  qa: { label: "QA Alert", className: "bg-red-100 text-red-700 border-red-200", icon: AlertOctagon },
  due: { label: "Due Soon", className: "bg-blue-100 text-blue-700 border-blue-200", icon: Activity },
};

interface Props {
  rows: WeeklyFlockRollupRow[];
  criticalAlerts: number;
}

export function NeedsAttention({ rows, criticalAlerts }: Props) {
  const navigate = useNavigate();
  const items = useMemo<Item[]>(() => {
    const list: Item[] = [];
    for (const r of rows) {
      const flockLabel = `Flock ${r.flock_number ?? r.flock_name ?? "—"}`;
      if (r.fertility_pct == null && r.total_eggs_set > 0) {
        list.push({
          flock: flockLabel,
          kind: "missing",
          detail: "Fertility / residue data not entered",
          setDate: r.earliest_set_date,
          action: "Enter Data",
          target: "/data-entry",
        });
      } else if (r.fertility_pct != null && r.fertility_pct < 80) {
        list.push({
          flock: flockLabel,
          kind: "below",
          detail: `Fertility ${r.fertility_pct.toFixed(1)}% (target 85%)`,
          setDate: r.earliest_set_date,
          action: "Review",
          target: "/embrex-data-sheet",
        });
      } else if (r.hoi_pct == null && r.worst_status === "completed") {
        list.push({
          flock: flockLabel,
          kind: "missing",
          detail: "HOI not recorded",
          setDate: r.earliest_set_date,
          action: "Enter Data",
          target: "/data-entry",
        });
      } else if (r.hof_pct != null && r.hof_pct < 82) {
        list.push({
          flock: flockLabel,
          kind: "below",
          detail: `Hatch ${r.hof_pct.toFixed(1)}% below target`,
          setDate: r.earliest_set_date,
          action: "Review",
          target: "/embrex-data-sheet",
        });
      }
      if (list.length >= 5) break;
    }
    if (criticalAlerts > 0 && list.length < 5) {
      list.push({
        flock: "Multiple",
        kind: "qa",
        detail: `${criticalAlerts} critical QA alert${criticalAlerts > 1 ? "s" : ""} detected`,
        setDate: null,
        action: "View Alert",
        target: "/qa-hub",
      });
    }
    return list.slice(0, 5);
  }, [rows, criticalAlerts]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            Needs Attention
            {items.length > 0 && <Badge variant="destructive" className="h-5">{items.length}</Badge>}
          </CardTitle>
        </div>
        <p className="text-xs text-muted-foreground">Flocks that need your attention</p>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Nothing needs attention. Nicely done. 🎉</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b">
                  <th className="text-left font-medium py-2 pr-3">Flock</th>
                  <th className="text-left font-medium py-2 pr-3">Issue</th>
                  <th className="text-left font-medium py-2 pr-3">Details</th>
                  <th className="text-left font-medium py-2 pr-3">Set Date</th>
                  <th className="text-right font-medium py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => {
                  const meta = kindMeta[it.kind];
                  const Icon = meta.icon;
                  return (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="py-2.5 pr-3 font-medium">
                        <div className="flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                          {it.flock}
                        </div>
                      </td>
                      <td className="py-2.5 pr-3">
                        <Badge variant="outline" className={meta.className}>{meta.label}</Badge>
                      </td>
                      <td className="py-2.5 pr-3 text-muted-foreground">{it.detail}</td>
                      <td className="py-2.5 pr-3 text-muted-foreground text-xs">
                        {it.setDate ? format(new Date(it.setDate), "MMM d, yyyy") : "—"}
                      </td>
                      <td className="py-2.5 text-right">
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => navigate(it.target)}>
                          {it.action}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="pt-3 flex justify-end">
          <Button variant="ghost" size="sm" className="text-xs text-primary" onClick={() => navigate("/embrex-data-sheet")}>
            View all needs attention <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
