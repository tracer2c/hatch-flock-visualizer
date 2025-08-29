import { useEffect } from "react";
import ComparisonAnalysis from "@/components/dashboard/ComparisonAnalysis";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

const ComparisonModelPage = () => {
  useEffect(() => {
    document.title = "Comparison Model | Hatchery Dashboard";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        "Advanced comparison analytics for flock performance and breed analysis."
      );
    } else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = "Advanced comparison analytics for flock performance and breed analysis.";
      document.head.appendChild(m);
    }
  }, []);

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            <CardTitle>Comparison Model Analytics</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Advanced comparison tools for analyzing flock performance, breed comparisons, and detailed item analysis.
          </p>
        </CardContent>
      </Card>
      
      <ComparisonAnalysis data={[]} />
    </div>
  );
};

export default ComparisonModelPage;