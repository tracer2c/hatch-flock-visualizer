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
  const criticalCount = criticalAlerts.length;

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
    <div className="flex flex-col h-[calc(100vh-3.5rem)] p-3 md:p-4 gap-3 overflow-hidden">
      {/* Slim header */}
      <div className="flex items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <WeatherLocationChip />
          <span className="text-xs text-muted-foreground hidden md:inline truncate">
            Overview for {rangeLabel}
          </span>
        </div>
        <AnalyticsFilters showMode={false} />
      </div>

      {/* KPIs */}
      <div className="flex-shrink-0">
        <KpiRow
          totalEggs={totalEggs}
          avgFertility={avgFertility}
          avgHatch={avgHatch}
          avgHoi={avgHoi}
          criticalAlerts={criticalCount}
          eggsDeltaPct={eggsDelta}
          rangeLabel={rangeLabel}
        />
      </div>

      {/* Main content — grid, no page scroll */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 min-h-0">
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
        </div>
        <div className="min-h-0 grid grid-rows-2 gap-3">
          <div className="min-h-0">
            <NeedsAttention
              rows={filtered}
              criticalAlerts={criticalCount}
              compact
            />
          </div>
          <div className="min-h-0">
            <DashboardQaAlerts />
          </div>
        </div>
      </div>

      {noDataInRange && latestOutsideRange && latest && (
        <div className="flex-shrink-0 flex justify-center">
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
      )}
    </div>
  );
}
