import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, ChevronRight } from "lucide-react";
import { useCriticalAlerts } from "@/hooks/useAlerts";

export function DashboardQaAlerts() {
  const navigate = useNavigate();
  const { data: alerts = [] } = useCriticalAlerts();
  const top = alerts.slice(0, 3);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-destructive" />
            <h3 className="text-sm font-semibold">QA Alerts</h3>
          </div>
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/qa-hub")}>
            View all
          </Button>
        </div>
        {top.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">No critical alerts.</div>
        ) : (
          <div className="space-y-2">
            {top.map((a: any) => (
              <div key={a.id} className="p-3 rounded-lg border border-destructive/20 bg-destructive/5">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <Activity className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
                    <span className="text-sm font-semibold truncate">{a.title || a.alert_type || "Critical alert"}</span>
                  </div>
                  <Badge variant="destructive" className="h-5 text-[10px] flex-shrink-0">Critical</Badge>
                </div>
                {a.message && <div className="text-xs text-muted-foreground line-clamp-1 mb-1">{a.message}</div>}
                <div className="text-[10px] text-muted-foreground">
                  Detected: {a.triggered_at ? formatDistanceToNow(new Date(a.triggered_at), { addSuffix: true }) : "—"}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="pt-3">
          <Button variant="outline" size="sm" className="w-full h-8 text-xs" onClick={() => navigate("/qa-hub")}>
            Go to QA Hub <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
