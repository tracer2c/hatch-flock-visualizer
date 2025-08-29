import { useEffect, useState } from "react";
import { subDays } from "date-fns";
import ComparisonAnalysis from "@/components/dashboard/ComparisonAnalysis";
import ComparisonFilters from "@/components/dashboard/ComparisonFilters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Loader2 } from "lucide-react";
import { useComparisonData, type ComparisonFilters as FilterType } from "@/hooks/useComparisonData";
import { toast } from "sonner";

const ComparisonModelPage = () => {
  const [filters, setFilters] = useState<FilterType>({
    dateRange: { from: subDays(new Date(), 90), to: new Date() },
    unitIds: [],
    houseNumbers: [],
    batchStatus: ["completed"],
    limit: 100,
  });

  const { data: comparisonData, isLoading, error } = useComparisonData(filters);

  useEffect(() => {
    document.title = "Comparison Model | Hatchery Dashboard";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        "Advanced comparison analytics for flock performance, breed analysis, and multi-dimensional comparisons."
      );
    } else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = "Advanced comparison analytics for flock performance, breed analysis, and multi-dimensional comparisons.";
      document.head.appendChild(m);
    }
  }, []);

  useEffect(() => {
    if (error) {
      toast.error("Failed to load comparison data");
    }
  }, [error]);

  const handleApplyFilters = () => {
    toast.success(`Applied filters - Found ${comparisonData?.length || 0} batches`);
  };

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
            Advanced comparison tools for analyzing flock performance across houses, units, breeds, and time periods.
          </p>
        </CardContent>
      </Card>
      
      <ComparisonFilters 
        filters={filters}
        onFiltersChange={setFilters}
        onApplyFilters={handleApplyFilters}
      />

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="flex items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Loading comparison data...</span>
            </div>
          </CardContent>
        </Card>
      ) : (
        <ComparisonAnalysis data={comparisonData || []} />
      )}
    </div>
  );
};

export default ComparisonModelPage;