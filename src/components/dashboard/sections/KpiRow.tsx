import { Card } from "@/components/ui/card";
import { Egg, TrendingUp, Activity, Target, AlertOctagon, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ResponsiveContainer, AreaChart, Area, LineChart, Line } from "recharts";

interface Kpi {
  label: string;
  value: string;
  sub?: string;
  delta?: string;
  deltaPositive?: boolean;
  pending?: string | null;
  spark?: number[];
  icon: LucideIcon;
  tone: "primary" | "success" | "accent" | "warning" | "destructive";
}

const toneMap: Record<Kpi["tone"], { bg: string; text: string; border: string; stroke: string; fill: string }> = {
  primary: { bg: "bg-primary/10", text: "text-primary", border: "border-primary/20", stroke: "hsl(var(--primary))", fill: "hsl(var(--primary) / 0.15)" },
  success: { bg: "bg-emerald-500/10", text: "text-emerald-600", border: "border-emerald-500/20", stroke: "rgb(16 185 129)", fill: "rgb(16 185 129 / 0.15)" },
  accent: { bg: "bg-violet-500/10", text: "text-violet-600", border: "border-violet-500/20", stroke: "rgb(139 92 246)", fill: "rgb(139 92 246 / 0.15)" },
  warning: { bg: "bg-amber-500/10", text: "text-amber-600", border: "border-amber-500/20", stroke: "rgb(245 158 11)", fill: "rgb(245 158 11 / 0.15)" },
  destructive: { bg: "bg-destructive/10", text: "text-destructive", border: "border-destructive/20", stroke: "hsl(var(--destructive))", fill: "hsl(var(--destructive) / 0.15)" },
};

interface Props {
  totalEggs: number;
  avgFertility: number | null;
  avgHatch: number | null;
  avgHoi: number | null;
  criticalAlerts: number;
  eggsDeltaPct?: number | null;
  fertilityDeltaPp?: number | null;
  hatchDeltaPp?: number | null;
  hoiDeltaPp?: number | null;
  rangeLabel?: string;
  fertilityPending?: string | null;
  hatchPending?: string | null;
  hoiPending?: string | null;
  eggsSpark?: number[];
  fertilitySpark?: number[];
  hatchSpark?: number[];
  hoiSpark?: number[];
}

const fmt = (n: number) => Math.round(n).toLocaleString();
const pct = (n: number | null) => (n == null || isNaN(n) ? "—" : `${n.toFixed(1)}%`);

const deltaLine = (delta: number | null | undefined, prev: number | null | undefined, unit: "pct" | "pp") => {
  if (delta == null || isNaN(delta)) return undefined;
  const arrow = delta >= 0 ? "▲" : "▼";
  const val = Math.abs(delta).toFixed(1);
  const prevTxt = prev != null && !isNaN(prev) ? ` (${prev.toFixed(1)}${unit === "pp" ? "%" : "%"})` : "";
  return `${arrow} ${val}${unit === "pp" ? " pp" : "%"} vs last week${prevTxt}`;
};

function Spark({ data, tone, area = true }: { data: number[]; tone: typeof toneMap[keyof typeof toneMap]; area?: boolean }) {
  const series = data.map((v, i) => ({ i, v }));
  return (
    <div className="w-[90px] h-[34px] flex-shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        {area ? (
          <AreaChart data={series} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
            <Area type="monotone" dataKey="v" stroke={tone.stroke} fill={tone.fill} strokeWidth={1.5} isAnimationActive={false} />
          </AreaChart>
        ) : (
          <LineChart data={series} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
            <Line type="monotone" dataKey="v" stroke={tone.stroke} strokeWidth={1.5} dot={false} isAnimationActive={false} />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

export function KpiRow({
  totalEggs,
  avgFertility,
  avgHatch,
  avgHoi,
  criticalAlerts,
  eggsDeltaPct,
  fertilityDeltaPp,
  hatchDeltaPp,
  hoiDeltaPp,
  rangeLabel,
  fertilityPending,
  hatchPending,
  hoiPending,
  eggsSpark,
  fertilitySpark,
  hatchSpark,
  hoiSpark,
}: Props) {
  const kpis: Kpi[] = [
    {
      label: "TOTAL EGGS SET",
      value: fmt(totalEggs),
      sub: rangeLabel || "This week",
      delta:
        eggsDeltaPct != null
          ? `${eggsDeltaPct >= 0 ? "▲" : "▼"} ${Math.abs(eggsDeltaPct).toFixed(1)}% vs last week`
          : undefined,
      deltaPositive: (eggsDeltaPct ?? 0) >= 0,
      icon: Egg,
      tone: "primary",
      spark: eggsSpark,
    },
    {
      label: "AVG FERTILITY",
      value: pct(avgFertility),
      sub: "Target: 85%",
      pending: avgFertility == null ? fertilityPending ?? "Not entered yet" : null,
      delta: deltaLine(fertilityDeltaPp, avgFertility != null ? avgFertility - (fertilityDeltaPp ?? 0) : null, "pp"),
      deltaPositive: (fertilityDeltaPp ?? 0) >= 0,
      icon: TrendingUp,
      tone: "success",
      spark: fertilitySpark,
    },
    {
      label: "AVG HATCH %",
      value: pct(avgHatch),
      sub: "Target: 88%",
      pending: avgHatch == null ? hatchPending ?? "Pending hatch data" : null,
      delta: deltaLine(hatchDeltaPp, avgHatch != null ? avgHatch - (hatchDeltaPp ?? 0) : null, "pp"),
      deltaPositive: (hatchDeltaPp ?? 0) >= 0,
      icon: Activity,
      tone: "accent",
      spark: hatchSpark,
    },
    {
      label: "AVG HOI %",
      value: pct(avgHoi),
      sub: "Target: 75%",
      pending: avgHoi == null ? hoiPending ?? "Awaiting HOI data" : null,
      delta: deltaLine(hoiDeltaPp, avgHoi != null ? avgHoi - (hoiDeltaPp ?? 0) : null, "pp"),
      deltaPositive: (hoiDeltaPp ?? 0) >= 0,
      icon: Target,
      tone: "warning",
      spark: hoiSpark,
    },
    {
      label: "CRITICAL QA ALERTS",
      value: String(criticalAlerts),
      sub: criticalAlerts > 0 ? "Require attention" : "All clear",
      icon: AlertOctagon,
      tone: "destructive",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      {kpis.map((k) => {
        const t = toneMap[k.tone];
        const Icon = k.icon;
        const showSpark = !k.pending && k.spark && k.spark.length > 1;
        return (
          <Card key={k.label} className={cn("p-3 border", t.border)}>
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className={cn("text-[10px] font-semibold tracking-wide truncate", t.text)}>{k.label}</div>
              <div className={cn("p-1 rounded-md flex-shrink-0", t.bg)}>
                <Icon className={cn("h-3 w-3", t.text)} />
              </div>
            </div>
            <div className="flex items-end justify-between gap-2">
              {k.pending ? (
                <div className="text-sm italic text-muted-foreground leading-tight py-1">{k.pending}</div>
              ) : (
                <div className="text-2xl font-bold text-foreground leading-tight tabular-nums">{k.value}</div>
              )}
              {showSpark && <Spark data={k.spark!} tone={t} />}
            </div>
            {!k.pending && k.delta ? (
              <div className={cn("text-[10px] mt-1 truncate", k.deltaPositive ? "text-emerald-600" : "text-destructive")}>
                {k.delta}
              </div>
            ) : (
              k.sub && <div className="text-[11px] text-muted-foreground mt-1 truncate">{k.sub}</div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
