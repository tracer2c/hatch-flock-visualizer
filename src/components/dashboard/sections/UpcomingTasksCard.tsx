import { useNavigate } from "react-router-dom";
import { CheckSquare, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function UpcomingTasksCard() {
  const navigate = useNavigate();
  return (
    <Card className="h-full flex flex-col">
      <CardContent className="p-4 flex-1 min-h-0 flex flex-col">
        <div className="flex items-center gap-2 mb-2">
          <CheckSquare className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Upcoming Tasks</h3>
        </div>
        <div className="flex-1 min-h-0 flex flex-col justify-center items-start gap-2 text-xs text-muted-foreground">
          <div>Daily checklists, transfers, and hatch pulls for active batches.</div>
          <div>Track completion by shift, house, and machine.</div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full h-8 text-xs mt-2"
          onClick={() => navigate("/checklist")}
        >
          View today's tasks <ChevronRight className="h-3 w-3 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}
