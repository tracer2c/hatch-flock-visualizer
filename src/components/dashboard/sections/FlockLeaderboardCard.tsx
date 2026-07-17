import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { WeeklyFlockRollupRow } from "@/hooks/useWeeklyFlockRollup";

interface Props {
  rows: WeeklyFlockRollupRow[];
}

export function FlockLeaderboardCard({ rows }: Props) {
  const withHof = rows.filter((r) => r.hof_pct != null) as (WeeklyFlockRollupRow & { hof_pct: number })[];
  const sorted = [...withHof].sort((a, b) => b.hof_pct - a.hof_pct);
  const top = sorted.slice(0, 3);
  const bottom = sorted.slice(-3).reverse();

  const label = (r: WeeklyFlockRollupRow) =>
    `Flock ${r.flock_number ?? r.flock_name ?? "?"}`;

  return (
    <Card className="h-full p-4 flex flex-col min-h-0">
      <h3 className="text-sm font-semibold mb-3">Flock Leaderboard · HOF%</h3>
      {withHof.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">
          No HOF% data yet for this week.
        </div>
      ) : (
        <div className="flex-1 min-h-0 grid grid-cols-1 gap-3 overflow-hidden">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 mb-1.5">
              <TrendingUp className="h-3 w-3" /> Top performers
            </div>
            <ul className="space-y-1">
              {top.map((r) => (
                <li key={`t-${r.flock_key}`} className="flex items-center justify-between text-xs">
                  <span className="truncate">{label(r)}</span>
                  <span className="font-mono font-medium text-emerald-600">
                    {r.hof_pct.toFixed(1)}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-rose-600 mb-1.5">
              <TrendingDown className="h-3 w-3" /> Needs review
            </div>
            <ul className="space-y-1">
              {bottom.map((r) => (
                <li key={`b-${r.flock_key}`} className="flex items-center justify-between text-xs">
                  <span className="truncate">{label(r)}</span>
                  <span className="font-mono font-medium text-rose-600">
                    {r.hof_pct.toFixed(1)}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </Card>
  );
}
