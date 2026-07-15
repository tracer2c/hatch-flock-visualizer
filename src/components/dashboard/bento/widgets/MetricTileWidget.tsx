import { BentoCard } from "../BentoCard";
import { useAnalyticsFilters } from "@/contexts/AnalyticsFilterContext";
import { useWeeklyFlockRollup } from "@/hooks/useWeeklyFlockRollup";
import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";

type MetricKey = "fertility_pct" | "hof_pct" | "hoi_pct";

const CONFIG: Record<
  MetricKey,
  { title: string; eyebrow: string; variant: "cream" | "lime" | "lavender"; target: number }
> = {
  fertility_pct: { title: "Fertility", eyebrow: "Avg %", variant: "lime", target: 85 },
  hof_pct: { title: "Hatch of Fertile", eyebrow: "Avg %", variant: "lavender", target: 88 },
  hoi_pct: { title: "Hatch of Injected", eyebrow: "Avg %", variant: "cream", target: 75 },
};

const avg = (nums: (number | null | undefined)[]) => {
  const vals = nums.filter((n): n is number => n != null && !isNaN(n));
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
};

interface Props {
  metric: MetricKey;
  editing?: boolean;
  onRemove?: () => void;
}

export function MetricTileWidget({ metric, editing, onRemove }: Props) {
  const cfg = CONFIG[metric];
  const filters = useAnalyticsFilters();
  const { data: rows = [] } = useWeeklyFlockRollup({
    weekStart: filters.dateFrom,
    weekEnd: filters.dateTo,
  });

  const value = avg(rows.map((r) => r[metric] as number | null));
  const spark = rows
    .map((r) => ({ v: r[metric] as number | null }))
    .filter((p) => p.v != null);

  const onTarget = value != null && value >= cfg.target;

  return (
    <BentoCard
      variant={cfg.variant}
      eyebrow={cfg.eyebrow}
      title={cfg.title}
      editing={editing}
      onRemove={onRemove}
      bodyClassName="flex flex-col justify-between gap-2"
    >
      <div className="flex items-baseline gap-2">
        <div className="font-display font-black tracking-[-0.04em] leading-none text-[clamp(2.5rem,5vw,4.5rem)]">
          {value == null ? "—" : value.toFixed(1)}
        </div>
        <div className="text-lg font-bold opacity-70">%</div>
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="text-[11px] font-bold uppercase tracking-wider">
          <span
            className={`inline-block rounded-full border-2 border-[hsl(var(--bento-ink))] px-2 py-0.5 ${
              onTarget ? "bg-[hsl(var(--bento-ink))] text-[hsl(var(--bento-cream))]" : ""
            }`}
          >
            Target {cfg.target}%
          </span>
        </div>
        {spark.length > 1 && (
          <div className="h-8 w-24">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={spark}>
                <YAxis hide domain={["auto", "auto"]} />
                <Line
                  type="monotone"
                  dataKey="v"
                  stroke="hsl(var(--bento-ink))"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </BentoCard>
  );
}
