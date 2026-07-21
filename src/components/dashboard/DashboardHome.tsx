import { useMemo } from "react";
import { addDays, format, startOfWeek } from "date-fns";
import { ArrowRight, CalendarClock, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAnalyticsFilters } from "@/contexts/AnalyticsFilterContext";
import { AnalyticsFilters } from "@/components/analytics/AnalyticsFilters";
import { TopBarControls } from "@/components/TopBar";
import { useWeeklyFlockRollup, type WeeklyFlockRollupRow } from "@/hooks/useWeeklyFlockRollup";
import { useCriticalAlerts } from "@/hooks/useAlerts";
import { useCustomTargets } from "@/hooks/useCustomTargets";
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

  const kpiTrends = useMemo(() => {
    const buckets = new Map<
      string,
      {
        label: string;
        eggs: number;
        fertility: number[];
        hatch: number[];
        hoi: number[];
      }
    >();

    for (const row of filtered) {
      if (!row.earliest_set_date) continue;

      const weekStart = startOfWeek(new Date(row.earliest_set_date), { weekStartsOn: 1 });
      const key = format(weekStart, "yyyy-MM-dd");
      const bucket =
        buckets.get(key) ??
        {
          label: format(weekStart, "MMM d"),
          eggs: 0,
          fertility: [],
          hatch: [],
          hoi: [],
        };

      bucket.eggs += row.total_eggs_set;
      if (validPercent(row.fertility_pct) != null) bucket.fertility.push(row.fertility_pct as number);
      if (validPercent(row.hof_pct) != null) bucket.hatch.push(row.hof_pct as number);
      if (validPercent(row.hoi_pct) != null) bucket.hoi.push(row.hoi_pct as number);
      buckets.set(key, bucket);
    }

    const sorted = Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, bucket]) => ({
        label: bucket.label,
        eggs: bucket.eggs,
        fertility: bucket.fertility.length ? avg(bucket.fertility) : null,
        hatch: bucket.hatch.length ? avg(bucket.hatch) : null,
        hoi: bucket.hoi.length ? avg(bucket.hoi) : null,
      }));

    return {
      eggs: sorted.map((point) => ({ label: point.label, value: point.eggs })),
      fertility: sorted.map((point) => ({ label: point.label, value: point.fertility })),
      hatch: sorted.map((point) => ({ label: point.label, value: point.hatch })),
      hoi: sorted.map((point) => ({ label: point.label, value: point.hoi })),
    };
  }, [filtered]);

  return (
    <div className="min-h-full bg-gradient-to-br from-background via-background to-primary/[0.025]">
      <div className="mx-auto max-w-[1560px] space-y-5 p-4 lg:p-6">
        <div className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <WeatherLocationChip variant="plain" />
            <TopBarControls />
          </div>

          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">Overview</h1>
              <p className="mt-1 text-sm font-medium text-muted-foreground">
                Production performance and priorities across Wayne's Hatchery
              </p>
            </div>
            <AnalyticsFilters showMode={false} />
          </div>
        </div>

        <KpiRow
          totalEggs={totalEggs}
          avgFertility={avgFertility}
          avgHatch={avgHatch}
          avgHoi={avgHoi}
          criticalAlerts={criticalCount}
          rangeLabel={rangeLabel}
          trends={kpiTrends}
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
