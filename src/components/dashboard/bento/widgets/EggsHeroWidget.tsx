import { useMemo } from "react";
import { subDays, format, eachDayOfInterval } from "date-fns";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";
import { BentoCard } from "../BentoCard";
import { useAnalyticsFilters } from "@/contexts/AnalyticsFilterContext";
import { useWeeklyFlockRollup } from "@/hooks/useWeeklyFlockRollup";
import { parseLocalDate } from "@/utils/localDate";

interface Props {
  editing?: boolean;
  onRemove?: () => void;
}

export function EggsHeroWidget({ editing, onRemove }: Props) {
  const filters = useAnalyticsFilters();
  const { data: rows = [] } = useWeeklyFlockRollup({
    weekStart: filters.dateFrom,
    weekEnd: filters.dateTo,
  });
  const { data: prevRows = [] } = useWeeklyFlockRollup({
    weekStart: subDays(filters.dateFrom, 7),
    weekEnd: subDays(filters.dateTo, 7),
  });

  const total = rows.reduce((a, r) => a + r.total_eggs_set, 0);
  const prevTotal = prevRows.reduce((a, r) => a + r.total_eggs_set, 0);
  const delta = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : null;
  const up = (delta ?? 0) >= 0;

  const series = useMemo(() => {
    const days = eachDayOfInterval({ start: filters.dateFrom, end: filters.dateTo });
    const perDay = new Map<string, number>();
    rows.forEach((r) => {
      r.set_dates.forEach((d) => {
        perDay.set(d, (perDay.get(d) || 0) + r.total_eggs_set / (r.set_dates.length || 1));
      });
    });
    return days.map((d) => ({
      d: format(d, "MMM d"),
      v: perDay.get(format(d, "yyyy-MM-dd")) || 0,
    }));
  }, [rows, filters.dateFrom, filters.dateTo]);

  return (
    <BentoCard
      variant="ink"
      eyebrow="Eggs set"
      title={`${format(filters.dateFrom, "MMM d")} — ${format(filters.dateTo, "MMM d")}`}
      editing={editing}
      onRemove={onRemove}
      bodyClassName="flex flex-col justify-between gap-2 pb-3"
    >
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="font-display font-black tracking-[-0.04em] leading-[0.85] text-[clamp(3rem,7vw,6rem)]">
            {total.toLocaleString()}
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs">
            {delta != null && (
              <span
                className={`inline-flex items-center gap-1 rounded-full border-2 border-[hsl(var(--bento-cream))] px-2 py-0.5 font-bold ${
                  up ? "bg-[hsl(var(--bento-lime))] text-[hsl(var(--bento-ink))]" : "bg-[hsl(var(--bento-lavender))] text-[hsl(var(--bento-ink))]"
                }`}
              >
                {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {Math.abs(delta).toFixed(1)}%
              </span>
            )}
            <span className="opacity-70">vs prior week</span>
          </div>
        </div>
      </div>
      <div className="h-16 -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="eggsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--bento-lime))" stopOpacity={0.9} />
                <stop offset="100%" stopColor="hsl(var(--bento-lime))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <YAxis hide domain={[0, "auto"]} />
            <Area
              type="monotone"
              dataKey="v"
              stroke="hsl(var(--bento-lime))"
              strokeWidth={2.5}
              fill="url(#eggsGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </BentoCard>
  );
}
