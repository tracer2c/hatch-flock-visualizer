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
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <TrendingUp className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Comparison Model</h1>
          <p className="text-sm text-muted-foreground">
            Advanced comparison analytics for flock performance
          </p>
        </div>
      </div>

      {/* Filters */}
      <ComparisonFilters
        filters={filters}
        onFiltersChange={setFilters}
        onApplyFilters={handleApplyFilters}
      />

      {/* Results */}
      {isLoading ? (
        <Card>
          <CardContent className="py-12 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : comparisonData && comparisonData.length > 0 ? (
        <ComparisonAnalysis data={comparisonData} />
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No data found for the selected filters. Try adjusting your filter criteria.
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ComparisonModelPage;
