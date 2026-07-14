import { Card } from "@/components/ui/card";
import { Egg, TrendingUp, Activity, Target, AlertOctagon, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Kpi {
  label: string;
  value: string;
  sub?: string;
  delta?: string;
  deltaPositive?: boolean;
  icon: LucideIcon;
  tone: "primary" | "success" | "accent" | "warning" | "destructive";
}

const toneMap: Record<Kpi["tone"], { bg: string; text: string; border: string }> = {
  primary: { bg: "bg-primary/10", text: "text-primary", border: "border-primary/20" },
  success: { bg: "bg-emerald-500/10", text: "text-emerald-600", border: "border-emerald-500/20" },
  accent: { bg: "bg-violet-500/10", text: "text-violet-600", border: "border-violet-500/20" },
  warning: { bg: "bg-amber-500/10", text: "text-amber-600", border: "border-amber-500/20" },
  destructive: { bg: "bg-destructive/10", text: "text-destructive", border: "border-destructive/20" },
};

interface Props {
  totalEggs: number;
  avgFertility: number | null;
  avgHatch: number | null;
  avgHoi: number | null;
  criticalAlerts: number;
  eggsDeltaPct?: number | null;
  rangeLabel?: string;
}

const fmt = (n: number) => Math.round(n).toLocaleString();
const pct = (n: number | null) => (n == null || isNaN(n) ? "—" : `${n.toFixed(1)}%`);

export function KpiRow({ totalEggs, avgFertility, avgHatch, avgHoi, criticalAlerts, eggsDeltaPct, rangeLabel }: Props) {
  const kpis: Kpi[] = [
    {
      label: "TOTAL EGGS SET",
      value: fmt(totalEggs),
      sub: rangeLabel || "This week",
      delta: eggsDeltaPct != null ? `${eggsDeltaPct >= 0 ? "↑" : "↓"} ${Math.abs(eggsDeltaPct).toFixed(1)}% vs prior period` : undefined,
      deltaPositive: (eggsDeltaPct ?? 0) >= 0,
      icon: Egg,
      tone: "primary",
    },
    {
      label: "AVG FERTILITY",
      value: pct(avgFertility),
      sub: "Target: 85%",
      icon: TrendingUp,
      tone: "success",
    },
    {
      label: "AVG HATCH %",
      value: pct(avgHatch),
      sub: "Target: 88%",
      icon: Activity,
      tone: "accent",
    },
    {
      label: "AVG HOI %",
      value: pct(avgHoi),
      sub: "Target: 75%",
      icon: Target,
      tone: "warning",
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
        return (
          <Card key={k.label} className={cn("p-4 border", t.border)}>
            <div className="flex items-start justify-between mb-2">
              <div className={cn("text-[10px] font-semibold tracking-wide", t.text)}>{k.label}</div>
              <div className={cn("p-1.5 rounded-lg", t.bg)}>
                <Icon className={cn("h-3.5 w-3.5", t.text)} />
              </div>
            </div>
            <div className="text-2xl font-bold text-foreground">{k.value}</div>
            {k.sub && <div className="text-xs text-muted-foreground mt-0.5">{k.sub}</div>}
            {k.delta && (
              <div className={cn("text-[11px] mt-1", k.deltaPositive ? "text-emerald-600" : "text-destructive")}>
                {k.delta}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
