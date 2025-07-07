
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, BarChart3, LineChart, Activity, Workflow } from "lucide-react";
import Navigation from "@/components/Navigation";
import BatchOverviewDashboard from "@/components/dashboard/BatchOverviewDashboard";
import ProcessFlowDashboard from "@/components/dashboard/ProcessFlowDashboard";
import PerformanceCharts from "@/components/dashboard/PerformanceCharts";
import ComparisonAnalysis from "@/components/dashboard/ComparisonAnalysis";
import SystemFlowchart from "@/components/dashboard/SystemFlowchart";
import { useBatchPerformanceMetrics } from "@/hooks/useBatchData";

const Index = () => {
  const { data: performanceMetrics } = useBatchPerformanceMetrics();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Hatchery Performance Dashboard
          </h1>
          <p className="text-muted-foreground text-lg">
            Real-time analytics and insights for hatchery operations
          </p>
        </div>

        {/* Navigation */}
        <Navigation />

        {/* Main Dashboard Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Live Overview
            </TabsTrigger>
            <TabsTrigger value="process" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Process Flow
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="comparison" className="flex items-center gap-2">
              <LineChart className="h-4 w-4" />
              Analysis
            </TabsTrigger>
            <TabsTrigger value="flowchart" className="flex items-center gap-2">
              <Workflow className="h-4 w-4" />
              System Flow
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <BatchOverviewDashboard />
          </TabsContent>

          <TabsContent value="process">
            <ProcessFlowDashboard />
          </TabsContent>

          <TabsContent value="performance">
            <PerformanceCharts data={performanceMetrics || []} />
          </TabsContent>

          <TabsContent value="comparison">
            <ComparisonAnalysis data={performanceMetrics || []} />
          </TabsContent>

          <TabsContent value="flowchart">
            <SystemFlowchart />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
