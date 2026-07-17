import { useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowRight, CheckCircle2, Clock, MessageSquare, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Props {
  totalEggs: number;
  avgFertility: number | null;
  avgHatch: number | null;
  avgHoi: number | null;
  criticalAlerts: number;
  attentionCount: number;
  topAttention: string[];
  enabled: boolean;
  rangeLabel: string;
  variant?: "default" | "compact";
}

type BriefItem = {
  icon: ComponentType<{ className?: string }>;
  tone: "orange" | "violet" | "green" | "blue";
  title: string;
  detail: string;
};

const toneClass: Record<BriefItem["tone"], string> = {
  orange: "bg-orange-500/10 text-orange-500",
  violet: "bg-violet-500/10 text-violet-600",
  green: "bg-emerald-500/10 text-emerald-600",
  blue: "bg-primary/10 text-primary",
};

function getBriefPeriod(date: Date) {
  const hour = date.getHours();
  if (hour < 5) return "Overnight";
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  if (hour < 21) return "Evening";
  return "Night";
}

function getTimeLabel(date: Date) {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function AIBriefingCard({
  totalEggs,
  avgFertility,
  avgHatch,
  avgHoi,
  criticalAlerts,
  attentionCount,
  topAttention,
  rangeLabel,
}: Props) {
  const navigate = useNavigate();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const briefPeriod = getBriefPeriod(now);
  const updatedLabel = getTimeLabel(now);

  const items = useMemo<BriefItem[]>(() => {
    const primaryFlock = topAttention[0] ?? "Selected flock";
    const out: BriefItem[] = [];

    if (avgFertility != null && avgFertility < 85) {
      out.push({
        icon: AlertTriangle,
        tone: "orange",
        title: "Fertility below target",
        detail: `${primaryFlock} is at ${avgFertility.toFixed(1)}% against the 85% target.`,
      });
    } else if (avgFertility == null) {
      out.push({
        icon: AlertTriangle,
        tone: "orange",
        title: "Fertility data missing",
        detail: "Selected week needs fertility entries before full analysis.",
      });
    } else {
      out.push({
        icon: CheckCircle2,
        tone: "green",
        title: "Fertility on target",
        detail: `Average fertility is ${avgFertility.toFixed(1)}% for ${rangeLabel}.`,
      });
    }

    out.push({
      icon: Wand2,
      tone: "violet",
      title: avgHatch == null ? "Hatch data pending" : "Hatch data available",
      detail: avgHatch == null ? "Current week hatch data not yet available." : `Average hatch is ${avgHatch.toFixed(1)}%.`,
    });

    if (avgHoi != null) {
      out.push({
        icon: Clock,
        tone: "blue",
        title: "HOI recorded",
        detail: `Average HOI is ${avgHoi.toFixed(1)}% across selected flocks.`,
      });
    }

    out.push({
      icon: CheckCircle2,
      tone: "green",
      title: criticalAlerts > 0 ? "Critical QA alerts active" : "No critical QA alerts",
      detail: criticalAlerts > 0 ? `${criticalAlerts} active critical alert${criticalAlerts === 1 ? "" : "s"}.` : "Systems operating normally.",
    });

    if (attentionCount > 0) {
      out.push({
        icon: AlertTriangle,
        tone: "orange",
        title: "Missing or weak data",
        detail: `${attentionCount} item${attentionCount === 1 ? "" : "s"} need completion.`,
      });
    } else if (totalEggs > 0) {
      out.push({
        icon: CheckCircle2,
        tone: "green",
        title: "Coverage looks clean",
        detail: `${totalEggs.toLocaleString()} eggs are included in this selected range.`,
      });
    }

    out.push({
      icon: ArrowRight,
      tone: "blue",
      title: "Recommended next step",
      detail:
        attentionCount > 0
          ? `Review ${primaryFlock} and complete missing entries.`
          : briefPeriod === "Evening" || briefPeriod === "Night"
          ? "Check tomorrow's transfers and unresolved QA work before shift handoff."
          : "Review trend changes and keep today's task list current.",
    });

    return out.slice(0, 5);
  }, [avgFertility, avgHatch, avgHoi, briefPeriod, criticalAlerts, attentionCount, rangeLabel, topAttention, totalEggs]);

  return (
    <Card className="border-border/70 shadow-sm">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="text-base font-medium">AI {briefPeriod} Brief</h3>
          </div>
          <span className="text-xs font-medium text-muted-foreground">Updated {updatedLabel}</span>
        </div>

        <div className="space-y-2.5">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="flex items-start gap-2.5">
                <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", toneClass[item.tone])}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium leading-tight">{item.title}</div>
                  <div className="mt-0.5 text-xs font-medium leading-tight text-muted-foreground">{item.detail}</div>
                </div>
              </div>
            );
          })}
        </div>

        <Button
          variant="outline"
          className="mt-4 h-9 w-full gap-2 text-sm font-medium text-primary hover:bg-primary/10 hover:text-primary"
          onClick={() => navigate("/chat")}
        >
          <MessageSquare className="h-4 w-4" />
          Ask HatchAI
        </Button>
      </CardContent>
    </Card>
  );
}
