import { useEffect } from "react";
import UnitWeeklyComparison from "@/components/dashboard/UnitWeeklyComparison";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

const UnitComparisonPage = () => {
  useEffect(() => {
    document.title = "Unit Weekly Comparison | Hatchery Dashboard";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        "Weekly performance comparison across different units and time periods."
      );
    } else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = "Weekly performance comparison across different units and time periods.";
      document.head.appendChild(m);
    }
  }, []);

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            <CardTitle>Unit Weekly Comparison</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Compare weekly performance metrics across different units and analyze trends over time.
          </p>
        </CardContent>
      </Card>
      
      <UnitWeeklyComparison />
    </div>
  );
};

export default UnitComparisonPage;