import { useMemo } from "react";
import { subDays, format } from "date-fns";
import { CalendarClock } from "lucide-react";
import { useAnalyticsFilters } from "@/contexts/AnalyticsFilterContext";
import { AnalyticsFilters } from "@/components/analytics/AnalyticsFilters";
import { useWeeklyFlockRollup } from "@/hooks/useWeeklyFlockRollup";
import { useCriticalAlerts } from "@/hooks/useAlerts";
import { Button } from "@/components/ui/button";
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

export default function DashboardHome() {
  const filters = useAnalyticsFilters();
  const { data: rows = [], isLoading } = useWeeklyFlockRollup({
    weekStart: filters.dateFrom,
    weekEnd: filters.dateTo,
  });
  const { data: prevRows = [] } = useWeeklyFlockRollup({
    weekStart: subDays(filters.dateFrom, 7),
    weekEnd: subDays(filters.dateTo, 7),
  });
  const { data: criticalAlerts = [] } = useCriticalAlerts();

  const filtered = useMemo(() => {
    if (filters.flockIds.length === 0 && filters.hatcheryIds.length === 0) return rows;
    return rows.filter(() => true);
  }, [rows, filters.flockIds, filters.hatcheryIds]);

  const totalEggs = filtered.reduce((a, r) => a + r.total_eggs_set, 0);
  const prevTotalEggs = prevRows.reduce((a, r) => a + r.total_eggs_set, 0);
  const eggsDelta = prevTotalEggs > 0 ? ((totalEggs - prevTotalEggs) / prevTotalEggs) * 100 : null;

  const avgFertility = avg(filtered.map((r) => r.fertility_pct));
  const avgHatch = avg(filtered.map((r) => r.hof_pct));
  const avgHoi = avg(filtered.map((r) => r.hoi_pct));
  const prevAvgFertility = avg(prevRows.map((r) => r.fertility_pct));
  const prevAvgHatch = avg(prevRows.map((r) => r.hof_pct));
  const prevAvgHoi = avg(prevRows.map((r) => r.hoi_pct));
  const criticalCount = criticalAlerts.length;

  // Sparklines: 2-point mini-trend from previous vs current
  const spark = (prev: number | null, curr: number | null) =>
    prev != null && curr != null ? [prev, curr] : undefined;
  const eggsSpark = prevTotalEggs > 0 || totalEggs > 0 ? [prevTotalEggs, totalEggs] : undefined;

  const rangeLabel = fmtRange(filters.dateFrom, filters.dateTo);
  const noDataInRange = !isLoading && filtered.length === 0;
  const latest = filters.latestDataDate ? parseLocalDate(filters.latestDataDate) : null;
  const latestOutsideRange =
    latest && (latest < filters.dateFrom || latest > filters.dateTo);

  const topAttention = useMemo(
    () =>
      filtered
        .filter((r) => (r.fertility_pct != null && r.fertility_pct < 80) || r.fertility_pct == null)
        .slice(0, 5)
        .map((r) => `Flock ${r.flock_number ?? r.flock_name ?? "?"}`),
    [filtered]
  );

  return (
    <div className="p-3 md:p-4 space-y-3 max-w-full">
      {/* Slim header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="hidden lg:block">
            <WeatherLocationChip />
          </div>
          <span className="text-xs text-muted-foreground truncate">
            Overview for {rangeLabel}
          </span>
        </div>
        <AnalyticsFilters showMode={false} />
      </div>

      {/* Row 1: KPIs with sparklines & pending states */}
      <KpiRow
        totalEggs={totalEggs}
        avgFertility={avgFertility}
        avgHatch={avgHatch}
        avgHoi={avgHoi}
        criticalAlerts={criticalCount}
        eggsDeltaPct={eggsDelta}
        fertilityDeltaPp={
          avgFertility != null && prevAvgFertility != null ? avgFertility - prevAvgFertility : null
        }
        hatchDeltaPp={avgHatch != null && prevAvgHatch != null ? avgHatch - prevAvgHatch : null}
        hoiDeltaPp={avgHoi != null && prevAvgHoi != null ? avgHoi - prevAvgHoi : null}
        rangeLabel={rangeLabel}
        eggsSpark={eggsSpark}
        fertilitySpark={spark(prevAvgFertility, avgFertility)}
        hatchSpark={spark(prevAvgHatch, avgHatch)}
        hoiSpark={spark(prevAvgHoi, avgHoi)}
      />

      {/* Row 2: Needs Attention (hero) + right rail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        <div className="lg:col-span-8 min-h-0">
          <NeedsAttention
            rows={filtered}
            criticalAlerts={criticalCount}
            emptyState={
              noDataInRange && latestOutsideRange && latest ? (
                <div className="py-6 text-center space-y-3">
                  <div className="text-sm text-muted-foreground">
                    No flocks set between{" "}
                    <span className="font-medium text-foreground">{rangeLabel}</span>.
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
        </div>
        <div className="lg:col-span-4 grid grid-rows-2 gap-3 min-h-[320px]">
          <DashboardQaAlerts />
          <UpcomingTasksCard />
        </div>
      </div>

      {/* Row 3: Compact AI Briefing */}
      <AIBriefingCard
        variant="compact"
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

      {/* Row 4: Weekly trend */}
      <div className="h-[300px]">
        <WeeklyTrendCard currentWeekStart={filters.dateFrom} />
      </div>
    </div>
  );
}
