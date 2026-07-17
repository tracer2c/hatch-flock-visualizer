import { useNavigate } from "react-router-dom";
import { AlertTriangle, CalendarDays, ChevronRight, PackageOpen, ThermometerSun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const tasks = [
  { label: "Transfer due", detail: "2 houses", when: "Tomorrow", icon: PackageOpen, tone: "text-orange-500 bg-orange-500/10" },
  { label: "Hatch expected", detail: "Flock 998", when: "Mar 19", icon: CalendarDays, tone: "text-cyan-600 bg-cyan-500/10" },
  { label: "QA check due", detail: "3 houses", when: "Mar 20", icon: ThermometerSun, tone: "text-primary bg-primary/10" },
  { label: "Missing fertility data", detail: "2 houses", when: "Mar 21", icon: AlertTriangle, tone: "text-orange-500 bg-orange-500/10" },
];

export function UpcomingTasksCard() {
  const navigate = useNavigate();

  return (
    <Card className="border-border/70 shadow-sm">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-4 w-4 text-primary" />
            <h3 className="text-base font-medium">Upcoming Tasks</h3>
          </div>
          <Button variant="ghost" size="sm" className="text-primary" onClick={() => navigate("/checklist")}>
            View all
          </Button>
        </div>

        <div className="divide-y divide-border/70">
          {tasks.map((task) => {
            const Icon = task.icon;
            return (
              <button
                key={task.label}
                type="button"
                onClick={() => navigate("/checklist")}
                className="flex w-full items-center gap-3 py-2.5 text-left transition-colors hover:bg-muted/40"
              >
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${task.tone}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium leading-tight">{task.label}</div>
                  <div className="mt-0.5 text-xs font-medium text-muted-foreground">{task.detail}</div>
                </div>
                <div className={task.when === "Tomorrow" || task.label.includes("Missing") ? "text-xs font-semibold text-orange-500" : "text-xs font-semibold text-primary"}>
                  {task.when}
                </div>
              </button>
            );
          })}
        </div>

        <Button variant="outline" size="sm" className="mt-3 h-8 w-full gap-1 text-xs" onClick={() => navigate("/checklist")}>
          View today's tasks
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </CardContent>
    </Card>
  );
}
