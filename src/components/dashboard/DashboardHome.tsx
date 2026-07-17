import { useMemo } from "react";
import { addDays, format } from "date-fns";
import { ArrowRight, CalendarClock, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAnalyticsFilters } from "@/contexts/AnalyticsFilterContext";
import { AnalyticsFilters } from "@/components/analytics/AnalyticsFilters";
import { useWeeklyFlockRollup, type WeeklyFlockRollupRow } from "@/hooks/useWeeklyFlockRollup";
import { useCriticalAlerts } from "@/hooks/useAlerts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { parseLocalDate } from "@/utils/localDate";
import { KpiRow } from "./sections/KpiRow";
import { NeedsAttention } from "./sections/NeedsAttention";
import { DashboardQaAlerts } from "./sections/DashboardQaAlerts";
import { WeatherLocationChip } from "./sections/WeatherLocationChip";
import { AIBriefingCard } from "./sections/AIBriefingCard";
import { UpcomingTasksCard } from "./sections/UpcomingTasksCard";
import { WeeklyTrendCard } from "./sections/WeeklyTrendCard";

const avg = (nums: (number | null | undefined)[]) => {
  const vals = nums.filter((n): n is number => n != null && !isNaN(n));
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
};

const fmtRange = (from: Date, to: Date) => {
  const sameYear = from.getFullYear() === to.getFullYear();
  return sameYear
    ? `${format(from, "MMM d")} – ${format(to, "MMM d, yyyy")}`
    : `${format(from, "MMM d, yyyy")} – ${format(to, "MMM d, yyyy")}`;
};

const hasStatus = (row: WeeklyFlockRollupRow, status: string) =>
  row.worst_status === status || row.statuses?.includes(status);

const validPercent = (n: number | null) => (n != null && n > 0 && n <= 100 ? n : null);

function dateLabel(date: Date | null) {
  return date ? format(date, "MMM d, yyyy") : "Not scheduled";
}

function ProductionPipeline({ rows }: { rows: WeeklyFlockRollupRow[] }) {
  const navigate = useNavigate();

  const stats = useMemo(() => {
    const total = rows.reduce((sum, row) => sum + Math.max(row.house_count, 1), 0);
    const inSetter = rows
      .filter((row) => hasStatus(row, "in_setter") || hasStatus(row, "scheduled"))
      .reduce((sum, row) => sum + Math.max(row.house_count, 1), 0);
    const inHatcher = rows
      .filter((row) => hasStatus(row, "in_hatcher"))
      .reduce((sum, row) => sum + Math.max(row.house_count, 1), 0);
    const completed = rows
      .filter((row) => hasStatus(row, "completed"))
      .reduce((sum, row) => sum + Math.max(row.house_count, 1), 0);
    const transferDue = rows
      .filter((row) => hasStatus(row, "in_setter") && row.earliest_set_date)
      .reduce((sum, row) => sum + Math.max(row.house_count, 1), 0);

    const transferDates = rows
      .map((row) => (row.earliest_set_date ? addDays(new Date(row.earliest_set_date), 18) : null))
      .filter((date): date is Date => Boolean(date))
      .sort((a, b) => a.getTime() - b.getTime());
    const hatchDates = rows
      .map((row) => (row.earliest_set_date ? addDays(new Date(row.earliest_set_date), 21) : null))
      .filter((date): date is Date => Boolean(date))
      .sort((a, b) => a.getTime() - b.getTime());

    return {
      total,
      cards: [
        {
          label: "In Setter",
          count: inSetter,
          detail: "Earliest transfer",
          meta: dateLabel(transferDates[0] ?? null),
          tone: "border-primary/20 bg-primary/[0.03] text-primary",
        },
        {
          label: "Transfer Due",
          count: transferDue,
          detail: transferDue > 0 ? "Needs scheduling" : "No overdue",
          meta: transferDue > 0 ? `${Math.max(1, transferDue - 1)} overdue` : "On track",
          tone: "border-orange-500/20 bg-orange-500/[0.03] text-orange-500",
        },
        {
          label: "In Hatcher",
          count: inHatcher,
          detail: "Earliest hatch",
          meta: dateLabel(hatchDates[0] ?? null),
          tone: "border-orange-500/20 bg-orange-500/[0.03] text-orange-500",
        },
        {
          label: "Completed",
          count: completed,
          detail: "This week",
          meta: completed === 1 ? "1 house" : `${completed} houses`,
          tone: "border-emerald-500/20 bg-emerald-500/[0.03] text-emerald-600",
        },
      ],
    };
  }, [rows]);

  return (
    <Card className="border-border/70 shadow-sm">
      <CardContent className="p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h2 className="text-base font-medium">Production Pipeline</h2>
            <span className="text-xs font-medium text-muted-foreground">{stats.total} houses total</span>
          </div>
          <Button variant="ghost" size="sm" className="text-primary" onClick={() => navigate("/live-tracking")}>
            View full pipeline
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] md:items-center">
          {stats.cards.map((card, index) => (
            <div key={card.label} className="contents">
              <div className={`min-h-[118px] rounded-xl border p-4 ${card.tone}`}>
                <div className="text-sm font-medium">{card.label}</div>
                <div className="mt-5 text-xl font-semibold leading-none text-foreground">{card.count}</div>
                <div className="mt-1.5 text-xs font-medium text-foreground/80">
                  {card.count === 1 ? "house" : "houses"}
                </div>
                <div className="mt-3 text-xs font-medium text-muted-foreground">{card.detail}</div>
                <div className="text-xs font-semibold">{card.meta}</div>
              </div>
              {index < stats.cards.length - 1 && (
                <ArrowRight className="hidden h-5 w-5 text-muted-foreground md:block" />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardHome() {
  const filters = useAnalyticsFilters();
  const { data: rows = [], isLoading } = useWeeklyFlockRollup({
    weekStart: filters.dateFrom,
    weekEnd: filters.dateTo,
  });
  const { data: criticalAlerts = [] } = useCriticalAlerts();

  const filtered = useMemo(() => rows, [rows]);
  const totalEggs = filtered.reduce((a, r) => a + r.total_eggs_set, 0);
  const avgFertility = validPercent(avg(filtered.map((r) => r.fertility_pct)));
  const rawAvgHatch = avg(filtered.map((r) => r.hof_pct));
  const rawAvgHoi = avg(filtered.map((r) => r.hoi_pct));
  const avgHatch = validPercent(rawAvgHatch);
  const avgHoi = validPercent(rawAvgHoi);
  const criticalCount = criticalAlerts.length;
  const rangeLabel = fmtRange(filters.dateFrom, filters.dateTo);
  const noDataInRange = !isLoading && filtered.length === 0;
  const latest = filters.latestDataDate ? parseLocalDate(filters.latestDataDate) : null;
  const latestOutsideRange =
    latest && (latest < filters.dateFrom || latest > filters.dateTo);

  const topAttention = useMemo(
    () =>
      filtered
        .filter((r) => r.fertility_pct == null || r.fertility_pct < 85 || (r.hof_pct == null && r.worst_status === "completed"))
        .slice(0, 5)
        .map((r) => `Flock ${r.flock_number ?? r.flock_name ?? "?"}`),
    [filtered]
  );

  return (
    <div className="min-h-full bg-gradient-to-br from-background via-background to-primary/[0.025]">
      <div className="mx-auto max-w-[1560px] space-y-4 p-4 lg:p-6">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <WeatherLocationChip />
            <span className="text-sm font-medium text-primary">
              Overview for {rangeLabel}
            </span>
          </div>
          <AnalyticsFilters showMode={false} />
        </div>

        <KpiRow
          totalEggs={totalEggs}
          avgFertility={avgFertility}
          avgHatch={avgHatch}
          avgHoi={avgHoi}
          criticalAlerts={criticalCount}
          rangeLabel={rangeLabel}
        />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
          <div className="space-y-4">
            <NeedsAttention
              rows={filtered}
              criticalAlerts={criticalCount}
              emptyState={
                noDataInRange && latestOutsideRange && latest ? (
                  <div className="py-8 text-center space-y-3">
                    <div className="text-sm text-muted-foreground">
                      No flocks set between <span className="font-medium text-foreground">{rangeLabel}</span>.
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => filters.jumpToWeekContaining(latest)}
                      className="gap-2"
                    >
                      <CalendarClock className="h-4 w-4" />
                      Jump to most recent week with data ({format(latest, "MMM d, yyyy")})
                    </Button>
                  </div>
                ) : undefined
              }
            />

            <ProductionPipeline rows={filtered} />

            <div className="h-[300px]">
              <WeeklyTrendCard currentWeekStart={filters.dateFrom} />
            </div>
          </div>

          <div className="space-y-4">
            <AIBriefingCard
              rangeLabel={rangeLabel}
              totalEggs={totalEggs}
              avgFertility={avgFertility}
              avgHatch={avgHatch}
              avgHoi={avgHoi}
              criticalAlerts={criticalCount}
              attentionCount={topAttention.length}
              topAttention={topAttention}
              enabled={!isLoading}
            />
            <UpcomingTasksCard />
            <DashboardQaAlerts />
          </div>
        </div>

        <div className="pb-1 text-center text-xs font-medium text-muted-foreground">
          All times shown in Central Time (CT)
        </div>
      </div>
    </div>
  );
}
