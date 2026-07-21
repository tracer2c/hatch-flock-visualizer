import { Card } from "@/components/ui/card";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { Activity, AlertOctagon, CheckCircle2, Egg, Info, Target, TrendingDown, TrendingUp, Waves, LucideIcon } from "lucide-react";
import { Area, AreaChart } from "recharts";
import { cn } from "@/lib/utils";

interface KpiTrendPoint {
  label: string;
  value: number | null;
}

interface Kpi {
  label: string;
  value: string;
  sub: string;
  detail?: string;
  delta?: string;
  trend?: KpiTrendPoint[];
  icon: LucideIcon;
  tone: "blue" | "green" | "orange" | "red" | "status";
  status?: boolean;
}

const toneMap: Record<Kpi["tone"], { text: string; bg: string; border: string; delta: string; chart: string }> = {
  blue: {
    text: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/15 shadow-primary/5",
    delta: "text-primary",
    chart: "hsl(var(--primary))",
  },
  green: {
    text: "text-emerald-600",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/15 shadow-emerald-500/5",
    delta: "text-emerald-600",
    chart: "rgb(16 185 129)",
  },
  orange: {
    text: "text-orange-500",
    bg: "bg-orange-500/10",
    border: "border-orange-500/15 shadow-orange-500/5",
    delta: "text-orange-500",
    chart: "rgb(249 115 22)",
  },
  red: {
    text: "text-red-500",
    bg: "bg-red-500/10",
    border: "border-red-500/15 shadow-red-500/5",
    delta: "text-red-500",
    chart: "rgb(239 68 68)",
  },
  status: {
    text: "text-emerald-600",
    bg: "bg-emerald-500/10",
    border: "border-border/70 shadow-emerald-500/5",
    delta: "text-emerald-600",
    chart: "rgb(16 185 129)",
  },
};

interface Props {
  totalEggs: number;
  avgFertility: number | null;
  avgHatch: number | null;
  avgHoi: number | null;
  criticalAlerts: number;
  rangeLabel?: string;
  trends?: Partial<Record<"eggs" | "fertility" | "hatch" | "hoi", KpiTrendPoint[]>>;
  targets?: { fertility: number; hatch: number; hof: number; hoi: number };
}

const fmt = (n: number) => Math.round(n).toLocaleString();
const pct = (n: number | null) => (n == null || isNaN(n) ? null : `${n.toFixed(1)}%`);

function trendDelta(points?: KpiTrendPoint[]) {
  const values = (points ?? []).filter((point): point is { label: string; value: number } => point.value != null && !isNaN(point.value));
  if (values.length < 2) return null;
  const previous = values[values.length - 2].value;
  const current = values[values.length - 1].value;
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

function MiniAreaTrend({
  id,
  tone,
  data,
}: {
  id: string;
  tone: Kpi["tone"];
  data?: KpiTrendPoint[];
}) {
  const points = (data ?? [])
    .filter((point): point is { label: string; value: number } => point.value != null && !isNaN(point.value))
    .map((point) => ({ label: point.label, value: Number(point.value.toFixed(1)) }));

  if (points.length < 2) return null;

  const toneStyle = toneMap[tone];
  const chartConfig = {
    value: {
      label: "Trend",
      color: toneStyle.chart,
    },
  } satisfies ChartConfig;
  const gradientId = `kpi-area-${id}`;

  return (
    <div className="mt-3 h-11 w-full">
      <ChartContainer config={chartConfig} className="h-full w-full aspect-auto">
        <AreaChart data={points} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-value)" stopOpacity={0.28} />
              <stop offset="95%" stopColor="var(--color-value)" stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <Area
            dataKey="value"
            type="natural"
            stroke="var(--color-value)"
            strokeWidth={1.8}
            fill={`url(#${gradientId})`}
            fillOpacity={1}
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}

export function KpiRow({ totalEggs, avgFertility, avgHatch, avgHoi, criticalAlerts, rangeLabel, trends, targets }: Props) {
  const fertilityTarget = targets?.fertility ?? 85;
  const hatchTarget = targets?.hatch ?? 88;
  const hoiTarget = targets?.hoi ?? 75;
  const fertilityGap = avgFertility == null ? null : avgFertility - fertilityTarget;
  const hatchGap = avgHatch == null ? null : avgHatch - hatchTarget;
  const hoiGap = avgHoi == null ? null : avgHoi - hoiTarget;
  const eggsDelta = trendDelta(trends?.eggs);

  const kpis: Kpi[] = [
    {
      label: "TOTAL EGGS SET",
      value: fmt(totalEggs),
      sub: rangeLabel ? "Selected range" : "Selected week",
      delta: eggsDelta == null ? undefined : `${eggsDelta >= 0 ? "↑" : "↓"} ${Math.abs(eggsDelta).toFixed(1)}% vs previous period`,
      trend: trends?.eggs,
      icon: Egg,
      tone: "blue",
    },
    {
      label: "AVG FERTILITY",
      value: pct(avgFertility) ?? "Not entered",
      sub: "Target: 85%",
      delta:
        fertilityGap == null
          ? "Fertility data not available yet"
          : `${fertilityGap >= 0 ? "↑" : "↓"} ${Math.abs(fertilityGap).toFixed(1)}% vs target`,
      trend: trends?.fertility,
      icon: TrendingUp,
      tone: "green",
    },
    {
      label: "AVG HATCH RATE",
      value: pct(avgHatch) ?? "Pending",
      sub: "Target: 88%",
      detail: avgHatch == null ? "Hatch data not available yet" : undefined,
      delta:
        hatchGap == null
          ? undefined
          : `${hatchGap >= 0 ? "↑" : "↓"} ${Math.abs(hatchGap).toFixed(1)}% vs target`,
      trend: trends?.hatch,
      icon: hatchGap != null && hatchGap < 0 ? TrendingDown : Activity,
      tone: "red",
    },
    {
      label: "AVG HOI %",
      value: pct(avgHoi) ?? "Not entered",
      sub: "Target: 75%",
      detail: avgHoi == null ? "Awaiting HOI data" : undefined,
      delta:
        hoiGap == null
          ? undefined
          : `${hoiGap >= 0 ? "↑" : "↓"} ${Math.abs(hoiGap).toFixed(1)}% vs target`,
      trend: trends?.hoi,
      icon: Target,
      tone: "orange",
    },
    criticalAlerts > 0
      ? {
      label: "CRITICAL QA ALERTS",
      value: String(criticalAlerts),
      sub: "Require attention",
      icon: AlertOctagon,
      tone: "red",
    }
      : {
          label: "QA STATUS",
          value: "No critical QA alerts",
          sub: "All clear",
          icon: CheckCircle2,
          tone: "status",
          status: true,
        },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {kpis.map((k) => {
        const tone = toneMap[k.tone];
        const Icon = k.icon;
        const negative = k.delta?.startsWith("↓");

        if (k.status) {
          return (
            <Card
              key={k.label}
              className={cn("flex min-h-[146px] flex-col justify-center border bg-card p-5 shadow-sm transition-colors", tone.border)}
            >
              <div className={cn("flex h-8 w-8 items-center justify-center rounded-full", tone.bg)}>
                <Icon className={cn("h-5 w-5", tone.text)} />
              </div>
              <div className="mt-4 max-w-[145px] text-lg font-semibold leading-snug text-foreground">{k.value}</div>
              <div className="mt-3 text-xs font-medium text-muted-foreground">{k.sub}</div>
            </Card>
          );
        }

        return (
          <Card
            key={k.label}
            className={cn(
              "min-h-[146px] p-4 border bg-card shadow-sm transition-colors",
              tone.border
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className={cn("flex items-center gap-1.5 text-[11px] font-semibold tracking-wide leading-tight", tone.text)}>
                {k.label}
                {k.label === "TOTAL EGGS SET" && <Info className="h-3 w-3 text-muted-foreground/70" />}
              </div>
              <div className={cn("flex h-7 w-7 items-center justify-center rounded-full", tone.bg)}>
                {k.tone === "blue" ? (
                  <Waves className={cn("h-3.5 w-3.5", tone.text)} />
                ) : (
                  <Icon className={cn("h-3.5 w-3.5", tone.text)} />
                )}
              </div>
            </div>
            <div className="mt-4 text-xl font-semibold leading-none text-foreground tabular-nums">
              {k.value}
            </div>
            <div className="mt-3 text-xs font-medium text-muted-foreground">{k.sub}</div>
            {k.delta ? (
              <div className={cn("mt-2 text-xs font-semibold", negative ? "text-red-500" : tone.delta)}>
                {k.delta}
              </div>
            ) : k.detail ? (
              <div className="mt-2 text-xs font-medium text-muted-foreground">{k.detail}</div>
            ) : null}
            <MiniAreaTrend id={k.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")} tone={k.tone} data={k.trend} />
          </Card>
        );
      })}
    </div>
  );
}
