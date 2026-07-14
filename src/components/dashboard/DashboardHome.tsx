import { useMemo } from "react";
import { subDays, format } from "date-fns";
import { Egg, CalendarClock } from "lucide-react";
import { useAnalyticsFilters } from "@/contexts/AnalyticsFilterContext";
import { AnalyticsFilters } from "@/components/analytics/AnalyticsFilters";
import { useWeeklyFlockRollup } from "@/hooks/useWeeklyFlockRollup";
import { useCriticalAlerts } from "@/hooks/useAlerts";
import { Button } from "@/components/ui/button";
import { parseLocalDate } from "@/utils/localDate";
import { KpiRow } from "./sections/KpiRow";
import { NeedsAttention } from "./sections/NeedsAttention";
import { WeeklyFlockStatusCard } from "./sections/WeeklyFlockStatusCard";
import { ActiveHousesPipeline } from "./sections/ActiveHousesPipeline";
import { DashboardQaAlerts } from "./sections/DashboardQaAlerts";

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
    return rows.filter((r: any) => {
      if (filters.flockIds.length > 0) {
        return r.house_ids.some(() => true);
      }
      return true;
    });
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

  const emptyState = noDataInRange ? (
    <div className="py-8 text-center space-y-3">
      <div className="text-sm text-muted-foreground">
        No flocks set between{" "}
        <span className="font-medium text-foreground">{rangeLabel}</span>.
      </div>
      {latestOutsideRange && latest && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => filters.jumpToWeekContaining(latest)}
          className="gap-2"
        >
          <CalendarClock className="h-4 w-4" />
          Jump to most recent week with data ({format(latest, "MMM d, yyyy")})
        </Button>
      )}
    </div>
  ) : undefined;

  return (
    <div className="p-3 md:p-6 space-y-4 max-w-full">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <Egg className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Hatchery Dashboard</h1>
            <p className="text-xs md:text-sm text-muted-foreground">
              Overview for {rangeLabel}
            </p>
          </div>
        </div>
        <AnalyticsFilters showMode={false} />
      </div>

      <KpiRow
        totalEggs={totalEggs}
        avgFertility={avgFertility}
        avgHatch={avgHatch}
        avgHoi={avgHoi}
        criticalAlerts={criticalCount}
        eggsDeltaPct={eggsDelta}
        rangeLabel={rangeLabel}
      />

      <NeedsAttention
        rows={filtered}
        criticalAlerts={criticalCount}
        emptyState={emptyState}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <WeeklyFlockStatusCard rows={filtered} criticalIssues={criticalCount} />
          <ActiveHousesPipeline />
        </div>
        <div>
          <DashboardQaAlerts />
        </div>
      </div>
    </div>
  );
}
