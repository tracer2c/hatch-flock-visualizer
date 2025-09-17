import { useEffect, useState } from "react";
import { subDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePickerWithRange } from "@/components/ui/date-picker-with-range";
import { TrendingUp, Loader2, Calendar } from "lucide-react";
import { useComparisonData, useUnitsData, type ComparisonFilters as FilterType } from "@/hooks/useComparisonData";
import { toast } from "sonner";
import SimpleUnitSelector from "@/components/dashboard/SimpleUnitSelector";
import ComparisonAnalysis from "@/components/dashboard/ComparisonAnalysis";
import UnitComparisonSummary from "@/components/dashboard/UnitComparisonSummary";

const ComparisonModelPage = () => {
  const { data: unitsData } = useUnitsData();
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState({ 
    from: subDays(new Date(), 90), 
    to: new Date() 
  });

  // Create filters based on simple selections
  const filters: FilterType = {
    dateRange,
    unitIds: selectedUnitIds,
    houseNumbers: [],
    batchStatus: ["completed"],
    limit: 100,
  };

  // Initialize with all unit IDs when units data is loaded
  useEffect(() => {
    if (unitsData && unitsData.length > 0 && selectedUnitIds.length === 0) {
      setSelectedUnitIds(unitsData.map(unit => unit.id));
    }
  }, [unitsData, selectedUnitIds.length]);

  const { data: comparisonData, isLoading, error } = useComparisonData(filters);

  useEffect(() => {
    document.title = "Unit Comparison Model | Hatchery Dashboard";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        "Simple unit comparison with AI-powered analysis for hatchery performance optimization."
      );
    } else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = "Simple unit comparison with AI-powered analysis for hatchery performance optimization.";
      document.head.appendChild(m);
    }
  }, []);

  useEffect(() => {
    if (error) {
      toast.error("Failed to load comparison data");
    }
  }, [error]);

  // Create unit names mapping for summary component
  const unitNames = unitsData?.reduce((acc, unit) => {
    acc[unit.id] = unit.name;
    return acc;
  }, {} as Record<string, string>) || {};

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Unit Comparison Model
        </h1>
        <p className="text-muted-foreground">
          Compare unit performance with AI-powered insights and recommendations
        </p>
      </div>

      {/* Simple Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Unit Selection */}
        <div className="lg:col-span-2">
          {unitsData ? (
            <SimpleUnitSelector
              units={unitsData}
              selectedUnitIds={selectedUnitIds}
              onSelectionChange={setSelectedUnitIds}
            />
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Loading units...
              </CardContent>
            </Card>
          )}
        </div>

        {/* Date Range */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4" />
              Date Range
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DatePickerWithRange
              value={dateRange}
              onChange={(range) => range?.from && range?.to && setDateRange(range as { from: Date; to: Date })}
            />
          </CardContent>
        </Card>
      </div>

      {/* Comparison Results */}
      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="flex items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Loading comparison data...</span>
            </div>
          </CardContent>
        </Card>
      ) : selectedUnitIds.length > 0 ? (
        <>
          <ComparisonAnalysis data={comparisonData || []} filters={filters} />
          <UnitComparisonSummary 
            selectedUnitIds={selectedUnitIds}
            dateRange={dateRange}
            unitNames={unitNames}
          />
        </>
      ) : (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Select Units to Compare
              </h3>
              <p className="text-muted-foreground">
                Choose one or more units above to see performance comparisons and AI analysis
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ComparisonModelPage;