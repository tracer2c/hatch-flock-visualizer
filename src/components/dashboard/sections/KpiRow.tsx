import { Card } from "@/components/ui/card";
import { Activity, AlertOctagon, Egg, Target, TrendingUp, Waves, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Kpi {
  label: string;
  value: string;
  sub: string;
  detail?: string;
  delta?: string;
  icon: LucideIcon;
  tone: "blue" | "green" | "violet" | "orange" | "red";
}

const toneMap: Record<Kpi["tone"], { text: string; bg: string; border: string; delta: string }> = {
  blue: {
    text: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/15 shadow-primary/5",
    delta: "text-primary",
  },
  green: {
    text: "text-emerald-600",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/15 shadow-emerald-500/5",
    delta: "text-emerald-600",
  },
  violet: {
    text: "text-violet-600",
    bg: "bg-violet-500/10",
    border: "border-violet-500/15 shadow-violet-500/5",
    delta: "text-violet-600",
  },
  orange: {
    text: "text-orange-500",
    bg: "bg-orange-500/10",
    border: "border-orange-500/15 shadow-orange-500/5",
    delta: "text-orange-500",
  },
  red: {
    text: "text-red-500",
    bg: "bg-red-500/10",
    border: "border-red-500/15 shadow-red-500/5",
    delta: "text-red-500",
  },
};

interface Props {
  totalEggs: number;
  avgFertility: number | null;
  avgHatch: number | null;
  avgHoi: number | null;
  criticalAlerts: number;
  rangeLabel?: string;
}

const fmt = (n: number) => Math.round(n).toLocaleString();
const pct = (n: number | null) => (n == null || isNaN(n) ? null : `${n.toFixed(1)}%`);

export function KpiRow({ totalEggs, avgFertility, avgHatch, avgHoi, criticalAlerts, rangeLabel }: Props) {
  const fertilityGap = avgFertility == null ? null : avgFertility - 85;
  const hatchGap = avgHatch == null ? null : avgHatch - 88;
  const hoiGap = avgHoi == null ? null : avgHoi - 75;

  const kpis: Kpi[] = [
    {
      label: "TOTAL EGGS SET",
      value: fmt(totalEggs),
      sub: rangeLabel || "Selected week",
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
      icon: TrendingUp,
      tone: "green",
    },
    {
      label: "AVG HATCH %",
      value: pct(avgHatch) ?? "Pending",
      sub: "Target: 88%",
      detail: avgHatch == null ? "Hatch data not available yet" : undefined,
      delta:
        hatchGap == null
          ? undefined
          : `${hatchGap >= 0 ? "↑" : "↓"} ${Math.abs(hatchGap).toFixed(1)}% vs target`,
      icon: Activity,
      tone: "violet",
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
      icon: Target,
      tone: "orange",
    },
    {
      label: "CRITICAL QA ALERTS",
      value: String(criticalAlerts),
      sub: criticalAlerts > 0 ? "Require attention" : "All clear",
      icon: AlertOctagon,
      tone: "red",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
      {kpis.map((k) => {
        const tone = toneMap[k.tone];
        const Icon = k.icon;
        const negative = k.delta?.startsWith("↓");

        return (
          <Card
            key={k.label}
            className={cn(
              "min-h-[118px] p-4 border bg-card shadow-sm transition-colors",
              tone.border
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className={cn("text-[11px] font-semibold tracking-wide leading-tight", tone.text)}>{k.label}</div>
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
          </Card>
        );
      })}
    </div>
  );
}
