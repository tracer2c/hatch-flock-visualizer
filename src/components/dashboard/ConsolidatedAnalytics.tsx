import React from "react";
import PerformanceCharts from "./PerformanceCharts";
import ComparisonAnalysis from "./ComparisonAnalysis";
import PredictionsPanel from "./PredictionsPanel";
import UnitWeeklyComparison from "./UnitWeeklyComparison";
import { useBatchPerformanceMetrics } from "@/hooks/useHouseData";

const ConsolidatedAnalytics = () => {
  const { data: performanceData, isLoading } = useBatchPerformanceMetrics();

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading analytics data...</div>;
  }

  if (!performanceData || performanceData.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No data available for analysis. Add some batch data to see comprehensive analytics.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Performance Charts Section */}
      <section>
        <h3 className="text-xl font-semibold text-foreground mb-4">Performance Charts</h3>
        <PerformanceCharts data={performanceData} />
      </section>

      {/* Comparison Analysis Section */}
      <section>
        <h3 className="text-xl font-semibold text-foreground mb-4">Comparison Analysis</h3>
        <ComparisonAnalysis data={performanceData} />
      </section>

      {/* Advanced Analytics Section */}
      <section>
        <h3 className="text-xl font-semibold text-foreground mb-4">Advanced Analytics</h3>
        
        <div className="grid gap-6">
          {/* Predictions Panel */}
          <div>
            <h4 className="text-lg font-medium text-foreground mb-3">Predictions & Forecasting</h4>
            <PredictionsPanel />
          </div>

          {/* Unit Weekly Comparison */}
          <div>
            <h4 className="text-lg font-medium text-foreground mb-3">Unit Performance Comparison</h4>
            <UnitWeeklyComparison />
          </div>
        </div>
      </section>
    </div>
  );
};

export default ConsolidatedAnalytics;