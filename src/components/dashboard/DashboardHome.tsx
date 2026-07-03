import { useMemo } from "react";
import { subDays } from "date-fns";
import { Egg } from "lucide-react";
import { useAnalyticsFilters } from "@/contexts/AnalyticsFilterContext";
import { AnalyticsFilters } from "@/components/analytics/AnalyticsFilters";
import { useWeeklyFlockRollup } from "@/hooks/useWeeklyFlockRollup";
import { useCriticalAlerts } from "@/hooks/useAlerts";
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

export default function DashboardHome() {
  const filters = useAnalyticsFilters();
  const { data: rows = [] } = useWeeklyFlockRollup({
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
        return r.house_ids.some(() => true); // flock filter already narrows list via flock_ids in row
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

  return (
    <div className="p-3 md:p-6 space-y-4 max-w-full">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <Egg className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Hatchery Dashboard</h1>
            <p className="text-xs md:text-sm text-muted-foreground">Overview of today's hatchery operations</p>
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
      />

      <NeedsAttention rows={filtered} criticalAlerts={criticalCount} />

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
