import { useNavigate } from "react-router-dom";
import { differenceInDays } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Clock, ChevronRight } from "lucide-react";
import { useHousesData } from "@/hooks/useHousesData";

const statusBadge = (s: string) => {
  if (s === "in_setter") return { label: "In Setter", cls: "bg-blue-100 text-blue-700 border-blue-200" };
  if (s === "in_hatcher") return { label: "In Hatcher", cls: "bg-orange-100 text-orange-700 border-orange-200" };
  if (s === "completed") return { label: "Completed", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" };
  return { label: "Scheduled", cls: "bg-slate-100 text-slate-700 border-slate-200" };
};

export function ActiveHousesPipeline() {
  const navigate = useNavigate();
  const { data: houses = [] } = useHousesData();

  const active = houses
    .filter((h: any) => h.status === "in_setter" || h.status === "in_hatcher")
    .slice(0, 3);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Active Houses Pipeline</h3>
            <Badge variant="secondary" className="h-5 text-[10px]">{houses.filter((h: any) => h.status === "in_setter" || h.status === "in_hatcher").length} houses</Badge>
          </div>
        </div>
        {active.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">No active houses right now.</div>
        ) : (
          <div className="space-y-2">
            {active.map((h: any) => {
              const badge = statusBadge(h.status);
              const days = h.expected_hatch_date
                ? differenceInDays(new Date(h.expected_hatch_date), new Date())
                : null;
              const colorBar = h.status === "in_setter" ? "bg-blue-500" : "bg-orange-500";
              return (
                <div key={h.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/40">
                  <div className={`w-1 h-10 rounded ${colorBar}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{h.batch_number}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {h.flock_name} | {h.machine_number || "—"}
                    </div>
                  </div>
                  <Badge variant="outline" className={badge.cls}>{badge.label}</Badge>
                  <div className="text-xs text-muted-foreground flex items-center gap-1 min-w-[80px] justify-end">
                    <Clock className="h-3 w-3" />
                    {days != null ? (days >= 0 ? `Due in ${days}d` : `${-days}d late`) : "—"}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="pt-3 flex justify-end">
          <Button variant="ghost" size="sm" className="text-xs text-primary" onClick={() => navigate("/live-tracking")}>
            View full pipeline <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
