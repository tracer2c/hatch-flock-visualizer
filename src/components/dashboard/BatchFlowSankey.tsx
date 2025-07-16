import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartDownloadButton } from "@/components/ui/chart-download-button";
import { TrendingUp, ArrowRight } from "lucide-react";
import { useCompletedBatchMetrics } from '@/hooks/useBatchData';

interface BatchFlowSankeyProps {
  className?: string;
}

const BatchFlowSankey = ({ className }: BatchFlowSankeyProps) => {
  const { data: completedBatches, isLoading } = useCompletedBatchMetrics();

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

  // Calculate aggregate flow data from completed batches
  const flowData = completedBatches?.reduce((acc, batch) => {
    const totalEggs = batch.totalEggs;
    const fertile = Math.round(totalEggs * (batch.fertility / 100));
    const hatched = Math.round(fertile * (batch.hatch / 100));
    const gradeA = Math.round(hatched * (batch.qualityScore / 100) * 0.7); // Assume 70% of quality eggs are Grade A
    const gradeB = Math.round(hatched * (batch.qualityScore / 100) * 0.3); // Assume 30% are Grade B
    const gradeC = Math.round(hatched * 0.05); // Assume 5% are Grade C
    const culls = hatched - gradeA - gradeB - gradeC;

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
  }) || {
    totalEggs: 0, infertile: 0, fertile: 0, deadInShell: 0, hatched: 0,
    gradeA: 0, gradeB: 0, gradeC: 0, culls: 0, batchCount: 0
  };

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
              Complete flow from eggs to final output across {flowData.batchCount} completed batches
            </CardDescription>
          </div>
          <ChartDownloadButton chartId="batch-flow-sankey" filename="batch-flow-analysis" />
        </div>
      </CardHeader>
      <CardContent>
        <div id="batch-flow-sankey" className="space-y-8">
          {/* Flow Visualization */}
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
      </CardContent>
    </Card>
  );
};

export default BatchFlowSankey;