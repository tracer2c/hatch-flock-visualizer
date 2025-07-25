import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartDownloadButton } from "@/components/ui/chart-download-button";
import { Button } from "@/components/ui/button";
import { TrendingUp, ArrowRight, Activity, CheckCircle, Eye } from "lucide-react";
import { useCompletedBatchMetrics, useActiveBatchFlowData } from '@/hooks/useBatchData';

interface BatchFlowSankeyProps {
  className?: string;
}

const BatchFlowSankey = ({ className }: BatchFlowSankeyProps) => {
  const [viewMode, setViewMode] = useState<'active' | 'completed' | 'all'>('active');
  
  const { data: completedBatches, isLoading: loadingCompleted } = useCompletedBatchMetrics();
  const { data: activeBatches, isLoading: loadingActive } = useActiveBatchFlowData();

  const isLoading = loadingCompleted || loadingActive;

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Batch Flow Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-pulse text-muted-foreground">Loading flow data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Determine which data to use based on view mode
  const getBatchesToAnalyze = () => {
    switch (viewMode) {
      case 'active':
        return activeBatches || [];
      case 'completed':
        return completedBatches || [];
      case 'all':
        return [...(activeBatches || []), ...(completedBatches || [])];
      default:
        return activeBatches || [];
    }
  };

  const batchesToAnalyze = getBatchesToAnalyze();
  const hasProjectedData = viewMode !== 'completed' && activeBatches?.some(batch => batch.isProjected);

  // Calculate aggregate flow data
  const flowData = batchesToAnalyze.reduce((acc, batch) => {
    const totalEggs = batch.totalEggs;
    const fertile = Math.round(totalEggs * (batch.fertility / 100));
    const hatched = Math.round(fertile * (batch.hatch / 100));
    const gradeA = Math.round(hatched * (batch.qualityScore / 100) * 0.7);
    const gradeB = Math.round(hatched * (batch.qualityScore / 100) * 0.3);
    const gradeC = Math.round(hatched * 0.05);
    const culls = Math.max(0, hatched - gradeA - gradeB - gradeC);

    return {
      totalEggs: acc.totalEggs + totalEggs,
      infertile: acc.infertile + (totalEggs - fertile),
      fertile: acc.fertile + fertile,
      deadInShell: acc.deadInShell + (fertile - hatched),
      hatched: acc.hatched + hatched,
      gradeA: acc.gradeA + gradeA,
      gradeB: acc.gradeB + gradeB,
      gradeC: acc.gradeC + gradeC,
      culls: acc.culls + culls,
      batchCount: acc.batchCount + 1
    };
  }, {
    totalEggs: 0,
    infertile: 0,
    fertile: 0,
    deadInShell: 0,
    hatched: 0,
    gradeA: 0,
    gradeB: 0,
    gradeC: 0,
    culls: 0,
    batchCount: 0
  });

  const FlowBox = ({ title, value, color, percentage, description }: { 
    title: string; 
    value: number; 
    color: string; 
    percentage: number;
    description?: string;
  }) => (
    <div className={`p-4 rounded-lg ${color} text-white min-h-[100px] flex flex-col justify-between relative overflow-hidden transition-all duration-200 hover:shadow-lg group`}>
      <div className="relative z-10">
        <div className="text-sm opacity-90 font-medium">{title}</div>
        <div className="text-xl font-bold mb-1">{value.toLocaleString()}</div>
        <div className="text-xs opacity-80">{percentage.toFixed(1)}% of previous stage</div>
        {description && (
          <div className="text-xs opacity-70 mt-1 group-hover:opacity-100 transition-opacity">
            {description}
          </div>
        )}
      </div>
      <div 
        className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-50"
      ></div>
    </div>
  );

  const FlowArrow = ({ width = "100%" }: { width?: string }) => (
    <div className="flex items-center justify-center py-4" style={{ width }}>
      <ArrowRight className="h-6 w-6 text-muted-foreground" />
    </div>
  );

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Batch Flow Analysis
            </CardTitle>
            <CardDescription>
              {viewMode === 'active' && `Active batches flow analysis across ${flowData.batchCount} ongoing batches`}
              {viewMode === 'completed' && `Completed batches flow analysis across ${flowData.batchCount} finished batches`}
              {viewMode === 'all' && `Combined flow analysis across ${flowData.batchCount} total batches`}
              {hasProjectedData && (
                <span className="ml-2 text-amber-600 text-xs">
                  • Contains projected data
                </span>
              )}
            </CardDescription>
          </div>
          <ChartDownloadButton chartId="batch-flow-sankey" filename="batch-flow-analysis" />
        </div>
      </CardHeader>
      <CardContent>
        <div id="batch-flow-sankey" className="space-y-8">
          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-2 mb-6">
            <Button
              variant={viewMode === 'active' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('active')}
              className="flex items-center gap-2"
            >
              <Activity className="h-4 w-4" />
              Active Batches
              {activeBatches && activeBatches.length > 0 && (
                <span className="ml-1 bg-primary/20 text-primary px-1.5 py-0.5 rounded-full text-xs">
                  {activeBatches.length}
                </span>
              )}
            </Button>
            <Button
              variant={viewMode === 'completed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('completed')}
              className="flex items-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Completed Batches
              {completedBatches && completedBatches.length > 0 && (
                <span className="ml-1 bg-primary/20 text-primary px-1.5 py-0.5 rounded-full text-xs">
                  {completedBatches.length}
                </span>
              )}
            </Button>
            <Button
              variant={viewMode === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('all')}
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              All Batches
              <span className="ml-1 bg-primary/20 text-primary px-1.5 py-0.5 rounded-full text-xs">
                {(activeBatches?.length || 0) + (completedBatches?.length || 0)}
              </span>
            </Button>
          </div>

          {/* Data Quality Indicator */}
          {hasProjectedData && (
            <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 text-amber-800 text-sm font-medium mb-1">
                <Activity className="h-4 w-4" />
                Projected Data Notice
              </div>
              <p className="text-xs text-amber-700">
                Some data is projected based on ongoing batches and industry standards. 
                Actual results may vary as batches complete.
              </p>
            </div>
          )}

          {/* Empty State */}
          {flowData.batchCount === 0 && (
            <div className="text-center py-12">
              <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                No {viewMode} batches found
              </h3>
              <p className="text-sm text-muted-foreground">
                {viewMode === 'active' && "Start some batches to see active flow analysis."}
                {viewMode === 'completed' && "Complete some batches to see historical flow data."}
                {viewMode === 'all' && "No batch data available yet."}
              </p>
            </div>
          )}

          {/* Flow Visualization */}
          {flowData.batchCount > 0 && (
            <div className="space-y-6">
              {/* How to Read This Chart */}
              <div className="mb-6 p-4 bg-muted/50 rounded-lg border-l-4 border-primary">
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full bg-primary"></span>
                  How to Read This Flow Analysis
                </h4>
                <p className="text-xs text-muted-foreground">
                  This diagram shows the complete journey from eggs set to final output. 
                  Each stage represents a checkpoint in the incubation process, 
                  with percentages showing success rates at each transition.
                  {hasProjectedData && " Orange indicators show projected data for ongoing batches."}
                </p>
              </div>

              {/* Stage 1: Total Eggs */}
              <div className="text-center">
                <FlowBox
                  title="Total Eggs Set"
                  value={flowData.totalEggs}
                  color="bg-slate-500"
                  percentage={100}
                  description="Initial eggs placed in incubators"
                />
              </div>

              <FlowArrow />

              {/* Stage 2: Fertility Split */}
              <div className="grid grid-cols-2 gap-4">
                <FlowBox
                  title="Fertile Eggs"
                  value={flowData.fertile}
                  color="bg-emerald-700"
                  percentage={(flowData.fertile / flowData.totalEggs) * 100}
                  description="Eggs containing viable embryos"
                />
                <FlowBox
                  title="Infertile Eggs"
                  value={flowData.infertile}
                  color="bg-gray-500"
                  percentage={(flowData.infertile / flowData.totalEggs) * 100}
                  description="Clear eggs with no development"
                />
              </div>

              <FlowArrow width="50%" />

              {/* Stage 3: Hatch Split */}
              <div className="grid grid-cols-2 gap-4">
                <FlowBox
                  title="Successfully Hatched"
                  value={flowData.hatched}
                  color="bg-teal-600"
                  percentage={(flowData.hatched / flowData.fertile) * 100}
                  description="Healthy chicks emerged from shell"
                />
                <FlowBox
                  title="Dead in Shell"
                  value={flowData.deadInShell}
                  color="bg-amber-600"
                  percentage={(flowData.deadInShell / flowData.fertile) * 100}
                  description="Embryos that didn't complete hatching"
                />
              </div>

              <FlowArrow width="50%" />

              {/* Stage 4: Quality Grading */}
              <div className="grid grid-cols-4 gap-2">
                <FlowBox
                  title="Grade A"
                  value={flowData.gradeA}
                  color="bg-green-800"
                  percentage={(flowData.gradeA / flowData.hatched) * 100}
                  description="Premium quality chicks"
                />
                <FlowBox
                  title="Grade B"
                  value={flowData.gradeB}
                  color="bg-slate-600"
                  percentage={(flowData.gradeB / flowData.hatched) * 100}
                  description="Good quality chicks"
                />
                <FlowBox
                  title="Grade C"
                  value={flowData.gradeC}
                  color="bg-stone-600"
                  percentage={(flowData.gradeC / flowData.hatched) * 100}
                  description="Lower grade chicks"
                />
                <FlowBox
                  title="Culls"
                  value={flowData.culls}
                  color="bg-gray-600"
                  percentage={(flowData.culls / flowData.hatched) * 100}
                  description="Chicks removed due to defects"
                />
              </div>

              {/* Efficiency Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 pt-6 border-t">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {((flowData.fertile / flowData.totalEggs) * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Fertility Rate</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {((flowData.hatched / flowData.fertile) * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Hatch Rate</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {(((flowData.gradeA + flowData.gradeB) / flowData.hatched) * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Quality Rate (A+B)</div>
                </div>
              </div>

              {/* Detailed Breakdown */}
              <div className="mt-6 pt-6 border-t">
                <h4 className="text-lg font-semibold mb-4">Detailed Flow Breakdown</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Eggs Set:</span>
                    <span className="font-medium">{flowData.totalEggs.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pl-4">
                    <span>→ Fertile:</span>
                    <span>{flowData.fertile.toLocaleString()} ({((flowData.fertile / flowData.totalEggs) * 100).toFixed(1)}%)</span>
                  </div>
                  <div className="flex justify-between pl-8">
                    <span>→ Hatched:</span>
                    <span>{flowData.hatched.toLocaleString()} ({((flowData.hatched / flowData.fertile) * 100).toFixed(1)}%)</span>
                  </div>
                  <div className="flex justify-between pl-12">
                    <span>→ Grade A:</span>
                    <span>{flowData.gradeA.toLocaleString()} ({((flowData.gradeA / flowData.hatched) * 100).toFixed(1)}%)</span>
                  </div>
                  <div className="flex justify-between pl-12">
                    <span>→ Grade B:</span>
                    <span>{flowData.gradeB.toLocaleString()} ({((flowData.gradeB / flowData.hatched) * 100).toFixed(1)}%)</span>
                  </div>
                  <div className="flex justify-between pl-12">
                    <span>→ Grade C:</span>
                    <span>{flowData.gradeC.toLocaleString()} ({((flowData.gradeC / flowData.hatched) * 100).toFixed(1)}%)</span>
                  </div>
                  <div className="flex justify-between pl-12">
                    <span>→ Culls:</span>
                    <span>{flowData.culls.toLocaleString()} ({((flowData.culls / flowData.hatched) * 100).toFixed(1)}%)</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BatchFlowSankey;