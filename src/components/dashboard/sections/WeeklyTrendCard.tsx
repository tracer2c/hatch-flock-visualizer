import { useMemo } from "react";
import { subWeeks, startOfWeek, endOfWeek, format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { FlaskConical } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ReferenceLine } from "recharts";
import { Button } from "@/components/ui/button";
import { useWeeklyFlockRollup } from "@/hooks/useWeeklyFlockRollup";

interface Props {
  weeksBack?: number;
  currentWeekStart: Date;
}

export function WeeklyTrendCard({ weeksBack = 6, currentWeekStart }: Props) {
  // Compute rolling window (weeksBack weeks including current)
  const rangeStart = startOfWeek(subWeeks(currentWeekStart, weeksBack - 1), { weekStartsOn: 1 });
  const rangeEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });

  const { data: rows = [], isLoading } = useWeeklyFlockRollup({
    weekStart: rangeStart,
    weekEnd: rangeEnd,
  });

  const chartData = useMemo(() => {
    // Bucket rows by ISO week using earliest_set_date
    const buckets = new Map<
      string,
      { label: string; eggs: number; fert: number[]; hatch: number[] }
    >();
    for (let i = 0; i < weeksBack; i++) {
      const wStart = startOfWeek(subWeeks(currentWeekStart, weeksBack - 1 - i), { weekStartsOn: 1 });
      const key = format(wStart, "yyyy-MM-dd");
      buckets.set(key, { label: format(wStart, "MMM d"), eggs: 0, fert: [], hatch: [] });
    }
    for (const r of rows) {
      if (!r.earliest_set_date) continue;
      const d = new Date(r.earliest_set_date);
      const wStart = startOfWeek(d, { weekStartsOn: 1 });
      const key = format(wStart, "yyyy-MM-dd");
      const b = buckets.get(key);
      if (!b) continue;
      b.eggs += r.total_eggs_set;
      if (r.fertility_pct != null) b.fert.push(r.fertility_pct);
      if (r.hof_pct != null) b.hatch.push(r.hof_pct);
    }
    return Array.from(buckets.values()).map((b) => ({
      label: b.label,
      "Eggs Set": Math.round(b.eggs / 1000), // thousands
      "Fertility %": b.fert.length ? +(b.fert.reduce((a, v) => a + v, 0) / b.fert.length).toFixed(1) : null,
      "Hatch %": b.hatch.length ? +(b.hatch.reduce((a, v) => a + v, 0) / b.hatch.length).toFixed(1) : null,
      "HOI %": b.hatch.length ? +(Math.max(0, b.hatch.reduce((a, v) => a + v, 0) / b.hatch.length - 12)).toFixed(1) : null,
    }));
  }, [rows, currentWeekStart, weeksBack]);

  const hasAny = chartData.some((d) => d["Eggs Set"] > 0 || d["Fertility %"] != null || d["Hatch %"] != null || d["HOI %"] != null);

  return (
    <Card className="h-full flex flex-col">
      <CardContent className="p-4 flex-1 min-h-0 flex flex-col">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <FlaskConical className="h-4 w-4 text-primary" />
            <h3 className="text-base font-medium">Performance Trend</h3>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-8 rounded-full bg-muted p-1">
              <Button size="sm" className="h-6 rounded-full px-4 text-xs shadow-sm">Weekly</Button>
              <Button size="sm" variant="ghost" className="h-6 rounded-full px-4 text-xs text-muted-foreground">Monthly</Button>
            </div>
            <Button variant="ghost" size="sm" className="text-primary">
              View full
            </Button>
          </div>
        </div>
        <div className="flex-1 min-h-0">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
              Loading…
            </div>
          ) : !hasAny ? (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
              No trend data in the last {weeksBack} weeks.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 12, bottom: 0, left: -8 }}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis yAxisId="right" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <ReferenceLine yAxisId="right" y={85} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />
                <Line yAxisId="right" type="monotone" dataKey="Fertility %" stroke="rgb(16 185 129)" strokeWidth={2} dot={false} connectNulls />
                <Line yAxisId="right" type="monotone" dataKey="Hatch %" stroke="rgb(139 92 246)" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                <Line yAxisId="right" type="monotone" dataKey="HOI %" stroke="rgb(249 115 22)" strokeWidth={2} dot={{ r: 3 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
