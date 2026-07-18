import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, MessageSquare, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAIBriefing } from "@/hooks/useAIBriefing";
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

function cleanSummary(text: string) {
  return text
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function trimSummary(text: string, maxLength = 235) {
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 160 ? lastSpace : maxLength).trim()}...`;
}

function buildFallbackSummary({
  totalEggs,
  avgFertility,
  avgHatch,
  avgHoi,
  criticalAlerts,
  attentionCount,
  topAttention,
  rangeLabel,
}: Omit<Props, "enabled" | "variant">) {
  const primaryFlock = topAttention[0] ?? "the selected flock";

  if (totalEggs === 0 && attentionCount > 0) {
    return `The ${rangeLabel} view is mostly a data completion pass right now. ${primaryFlock} needs entries before the dashboard can give a reliable fertility, hatch, and HOI readout, so the next best action is to close the missing records first.`;
  }

  const fertilitySignal =
    avgFertility == null
      ? "fertility is not entered yet"
      : avgFertility < 85
      ? `fertility is running below target at ${avgFertility.toFixed(1)}%`
      : `fertility is on target at ${avgFertility.toFixed(1)}%`;
  const hatchSignal =
    avgHatch == null
      ? "hatch data is still pending"
      : avgHatch < 88
      ? `hatch is behind target at ${avgHatch.toFixed(1)}%`
      : `hatch is holding at ${avgHatch.toFixed(1)}%`;
  const hoiSignal =
    avgHoi == null ? "HOI has not been entered" : `HOI is ${avgHoi.toFixed(1)}%`;

  if (attentionCount > 0) {
    return `The main read for ${rangeLabel} is that ${fertilitySignal}, ${hatchSignal}, and ${hoiSignal}. ${attentionCount} item${attentionCount === 1 ? "" : "s"} need follow-up, led by ${primaryFlock}, so review that flock and complete the weakest entries before treating the trend as final.`;
  }

  if (criticalAlerts > 0) {
    return `The selected period has ${criticalAlerts} critical QA alert${criticalAlerts === 1 ? "" : "s"} active, even though the production view is otherwise readable. Start with the QA issue, then recheck fertility and hatch movement for ${rangeLabel}.`;
  }

  return `The ${rangeLabel} dashboard is quiet overall: ${fertilitySignal}, ${hatchSignal}, and ${hoiSignal}. No critical QA alerts are active, so the useful next step is to keep today's entries current and watch the production pipeline for transfer or hatch changes.`;
}

export function AIBriefingCard({
  totalEggs,
  avgFertility,
  avgHatch,
  avgHoi,
  criticalAlerts,
  attentionCount,
  topAttention,
  enabled,
  rangeLabel,
}: Props) {
  const navigate = useNavigate();
  const [now, setNow] = useState(() => new Date());
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const briefPeriod = getBriefPeriod(now);
  const { briefing, loading } = useAIBriefing(
    {
      rangeLabel,
      totalEggs,
      avgFertility,
      avgHatch,
      avgHoi,
      criticalAlerts,
      attentionCount,
      topAttention,
      briefPeriod,
    },
    enabled,
  );

  const fallbackSummary = useMemo(
    () =>
      buildFallbackSummary({
        totalEggs,
        avgFertility,
        avgHatch,
        avgHoi,
        criticalAlerts,
        attentionCount,
        topAttention,
        rangeLabel,
      }),
    [attentionCount, avgFertility, avgHatch, avgHoi, criticalAlerts, rangeLabel, topAttention, totalEggs],
  );

  const summary = cleanSummary(briefing?.text || fallbackSummary);
  const hasMore = summary.length > 235;
  const visibleSummary = expanded ? summary : trimSummary(summary);
  const updatedAt = briefing?.generatedAt ? new Date(briefing.generatedAt) : now;

  return (
    <Card className="overflow-hidden border-border/70 shadow-sm">
      <CardContent className="p-0">
        <div className="bg-gradient-to-br from-cyan-50 via-blue-50/80 to-white p-4 dark:from-cyan-950/20 dark:via-blue-950/20 dark:to-card">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <Sparkles className="h-4 w-4 shrink-0 text-primary" />
              <h3 className="truncate text-base font-medium">AI {briefPeriod} Summary</h3>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                {loading && !briefing ? "Refreshing" : `Updated ${getTimeLabel(updatedAt)}`}
              </span>
              <button
                type="button"
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background/70 hover:text-foreground",
                  !hasMore && "pointer-events-none opacity-40",
                )}
                aria-label={expanded ? "Collapse AI summary" : "Expand AI summary"}
                onClick={() => setExpanded((value) => !value)}
              >
                <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
              </button>
            </div>
          </div>

          <p className="mt-3 text-sm font-normal leading-relaxed text-foreground/85">
            {loading && !briefing ? "Generating a fresh operations summary from the current dashboard context." : visibleSummary}
            {hasMore && !expanded && (
              <button
                type="button"
                className="ml-1 font-medium text-primary hover:underline"
                onClick={() => setExpanded(true)}
              >
                View More
              </button>
            )}
          </p>
        </div>

        <div className="p-3">
          <Button
            variant="outline"
            className="h-9 w-full gap-2 text-sm font-medium text-primary hover:bg-primary/10 hover:text-primary"
            onClick={() => navigate("/chat")}
          >
            <MessageSquare className="h-4 w-4" />
            Ask HatchAI
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
