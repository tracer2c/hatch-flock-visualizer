import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Activity, CheckCircle2, ChevronRight, HeartPulse } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCriticalAlerts } from "@/hooks/useAlerts";

export function DashboardQaAlerts() {
  const navigate = useNavigate();
  const { data: alerts = [] } = useCriticalAlerts();
  const top = alerts.slice(0, 2);

  return (
    <Card className="border-border/70 shadow-sm">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <HeartPulse className="h-4 w-4 text-red-500" />
            <h3 className="text-base font-medium">QA Alerts</h3>
          </div>
          <Button variant="ghost" size="sm" className="text-primary" onClick={() => navigate("/qa-hub")}>
            View all
          </Button>
        </div>

        {top.length === 0 ? (
          <div className="flex min-h-[104px] flex-col items-center justify-center rounded-xl text-center">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="text-sm font-medium text-emerald-600">No critical alerts.</div>
            <div className="mt-1.5 text-xs font-medium text-muted-foreground">All systems operating normally.</div>
          </div>
        ) : (
          <div className="space-y-3">
            {top.map((alert: any) => (
              <button
                key={alert.id}
                type="button"
                onClick={() => navigate("/qa-hub")}
                className="w-full rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-left"
              >
                <div className="mb-1 flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <Activity className="h-4 w-4 shrink-0 text-red-500" />
                    <span className="truncate text-sm font-medium">{alert.title || alert.alert_type || "Critical alert"}</span>
                  </div>
                  <Badge variant="destructive" className="h-5 text-[10px]">Critical</Badge>
                </div>
                {alert.message && <div className="line-clamp-2 text-sm text-muted-foreground">{alert.message}</div>}
                <div className="mt-1 text-xs text-muted-foreground">
                  {alert.triggered_at ? formatDistanceToNow(new Date(alert.triggered_at), { addSuffix: true }) : "Recently"}
                </div>
              </button>
            ))}
          </div>
        )}

        <Button variant="outline" size="sm" className="mt-3 h-8 w-full gap-1 text-xs" onClick={() => navigate("/qa-hub")}>
          Go to QA Hub
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </CardContent>
    </Card>
  );
}
