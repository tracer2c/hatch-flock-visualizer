import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, CheckCircle2, AlertTriangle, AlertOctagon, Users, ChevronRight } from "lucide-react";
import type { WeeklyFlockRollupRow } from "@/hooks/useWeeklyFlockRollup";

interface Props {
  rows: WeeklyFlockRollupRow[];
  criticalIssues: number;
}

export function WeeklyFlockStatusCard({ rows, criticalIssues }: Props) {
  const navigate = useNavigate();
  const total = rows.length;
  const complete = rows.filter((r) => r.worst_status === "completed").length;
  const missing = rows.filter(
    (r) => r.fertility_pct == null || (r.worst_status === "completed" && r.hoi_pct == null)
  ).length;

  const tiles = [
    { label: "Total Flocks", value: total, icon: Users, tint: "bg-slate-100 text-slate-700" },
    { label: "Complete", value: complete, icon: CheckCircle2, tint: "bg-emerald-100 text-emerald-700" },
    { label: "Missing Data", value: missing, icon: AlertTriangle, tint: "bg-amber-100 text-amber-700" },
    { label: "Critical Issues", value: criticalIssues, icon: AlertOctagon, tint: "bg-rose-100 text-rose-700" },
  ];

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Weekly Flock Status</h3>
            <p className="text-xs text-muted-foreground">Summary of all flocks for this set date week</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          {tiles.map((t) => {
            const Icon = t.icon;
            return (
              <div key={t.label} className="rounded-lg border p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{t.label}</span>
                  <div className={`p-1 rounded ${t.tint}`}>
                    <Icon className="h-3 w-3" />
                  </div>
                </div>
                <div className="text-xl font-bold">{t.value}</div>
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" className="h-8 text-xs" onClick={() => navigate("/data-entry")}>
            Open Weekly Rollup <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => navigate("/data-entry")}>
            Go to Data Entry
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
