import { BentoCard } from "../BentoCard";
import { useAnalyticsFilters } from "@/contexts/AnalyticsFilterContext";
import { useWeeklyFlockRollup } from "@/hooks/useWeeklyFlockRollup";
import { useCriticalAlerts } from "@/hooks/useAlerts";

interface Props {
  editing?: boolean;
  onRemove?: () => void;
}

export function WeeklyFlockStatusWidget({ editing, onRemove }: Props) {
  const filters = useAnalyticsFilters();
  const { data: rows = [] } = useWeeklyFlockRollup({
    weekStart: filters.dateFrom,
    weekEnd: filters.dateTo,
  });
  const { data: crit = [] } = useCriticalAlerts();

  const total = rows.length;
  const complete = rows.filter((r) => r.worst_status === "completed").length;
  const missing = rows.filter(
    (r) => r.fertility_pct == null || (r.worst_status === "completed" && r.hoi_pct == null)
  ).length;

  const tiles = [
    { label: "Total", value: total, bg: "bg-[hsl(var(--bento-cream))]" },
    { label: "Complete", value: complete, bg: "bg-[hsl(var(--bento-lime))]" },
    { label: "Missing", value: missing, bg: "bg-white" },
    { label: "Critical", value: crit.length, bg: "bg-[hsl(var(--bento-lavender))]" },
  ];

  return (
    <BentoCard
      variant="ink"
      eyebrow="This week"
      title="Weekly Flock Status"
      editing={editing}
      onRemove={onRemove}
      bodyClassName="grid grid-cols-2 gap-2 content-center"
    >
      {tiles.map((t) => (
        <div
          key={t.label}
          className={`rounded-lg border-2 border-[hsl(var(--bento-cream))] ${t.bg} text-[hsl(var(--bento-ink))] p-3 flex flex-col justify-between min-h-[70px]`}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider">{t.label}</div>
          <div className="font-display font-black tracking-[-0.04em] leading-none text-[clamp(1.5rem,3vw,2.5rem)]">
            {t.value}
          </div>
        </div>
      ))}
    </BentoCard>
  );
}
