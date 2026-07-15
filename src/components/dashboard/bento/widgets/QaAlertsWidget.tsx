import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { AlertOctagon, ArrowUpRight } from "lucide-react";
import { BentoCard } from "../BentoCard";
import { useCriticalAlerts } from "@/hooks/useAlerts";

interface Props {
  editing?: boolean;
  onRemove?: () => void;
}

export function QaAlertsWidget({ editing, onRemove }: Props) {
  const navigate = useNavigate();
  const { data: alerts = [] } = useCriticalAlerts();
  const top = alerts.slice(0, 3);

  return (
    <BentoCard
      variant="lavender"
      eyebrow="Critical"
      title="QA Alerts"
      editing={editing}
      onRemove={onRemove}
      bodyClassName="flex flex-col gap-2"
      right={
        !editing && (
          <button
            onClick={() => navigate("/qa-hub")}
            className="rounded-full border-2 border-[hsl(var(--bento-ink))] p-1 hover:bg-[hsl(var(--bento-ink))] hover:text-[hsl(var(--bento-lavender))] transition-colors"
            aria-label="Open QA hub"
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        )
      }
    >
      <div className="flex items-baseline gap-2">
        <div className="font-display font-black tracking-[-0.04em] leading-none text-[clamp(2.5rem,5vw,4rem)]">
          {alerts.length}
        </div>
        <div className="text-xs font-bold uppercase tracking-wider opacity-70">
          {alerts.length === 0 ? "all clear" : "require attention"}
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2">
        {top.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-[hsl(var(--bento-ink))]/40 p-3 text-xs text-center opacity-70">
            No critical alerts.
          </div>
        ) : (
          top.map((a: any) => (
            <div
              key={a.id}
              className="rounded-lg border-2 border-[hsl(var(--bento-ink))] bg-[hsl(var(--bento-cream))] p-2"
            >
              <div className="flex items-start gap-2">
                <AlertOctagon className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold truncate">
                    {a.title || a.alert_type || "Critical alert"}
                  </div>
                  <div className="text-[10px] opacity-70 mt-0.5">
                    {a.triggered_at
                      ? formatDistanceToNow(new Date(a.triggered_at), { addSuffix: true })
                      : "—"}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </BentoCard>
  );
}
