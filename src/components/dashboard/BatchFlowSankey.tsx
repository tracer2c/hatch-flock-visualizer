import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartDownloadButton } from "@/components/ui/chart-download-button";
import { Button } from "@/components/ui/button";
import { TrendingUp, ArrowRight, Activity, CheckCircle, Eye, Layers, GitCompare, FileText } from "lucide-react";
import { useCompletedBatchMetrics, useActiveBatchFlowData } from '@/hooks/useHouseData';
import { Building2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ReportService } from "@/services/reportService";
import { useToast } from "@/hooks/use-toast";

interface HouseFlowSankeyProps {
  className?: string;
  viewMode?: 'original' | 'dummy';
}

const BatchFlowSankey = ({ className }: HouseFlowSankeyProps) => {
  const [viewMode, setViewMode] = useState<'active' | 'completed' | 'all'>('active');
  const [breakdown, setBreakdown] = useState<'aggregate' | 'flock'>('aggregate');
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const { toast } = useToast();

  const { data: completedBatches, isLoading: loadingCompleted } = useCompletedBatchMetrics();
  const { data: activeBatches, isLoading: loadingActive } = useActiveBatchFlowData();

  const isLoading = loadingCompleted || loadingActive;

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
    
    // Calculate embryonic mortality counts
    const earlyDead = batch.earlyDead || 0;
    const midDead = batch.midDead || 0;
    const lateDead = batch.lateDead || 0;
    const pipped = batch.pipped || 0;

    return {
      totalEggs: acc.totalEggs + totalEggs,
      infertile: acc.infertile + (totalEggs - fertile),
      fertile: acc.fertile + fertile,
      hatched: acc.hatched + hatched,
      earlyDead: acc.earlyDead + earlyDead,
      midDead: acc.midDead + midDead,
      lateDead: acc.lateDead + lateDead,
      pipped: acc.pipped + pipped,
      batchCount: acc.batchCount + 1
    };
  }, {
    totalEggs: 0,
    infertile: 0,
    fertile: 0,
    hatched: 0,
    earlyDead: 0,
    midDead: 0,
    lateDead: 0,
    pipped: 0,
    batchCount: 0
  });

  // Per-flock aggregation for flock-wise numbers & comparison
  const flockStats = useMemo(() => {
    const map = new Map<string, {
      flockNumber: number | string;
      flockName: string;
      ageSum: number;
      houses: number;
      totalEggs: number;
      fertile: number;
      hatched: number;
    }>();

    batchesToAnalyze.forEach((batch: any) => {
      const key = `${batch.flockNumber}|${batch.flockName}`;
      const totalEggs = batch.totalEggs || 0;
      const fertile = Math.round(totalEggs * ((batch.fertility || 0) / 100));
      const hatched = Math.round(fertile * ((batch.hatch || 0) / 100));
      const cur = map.get(key) || {
        flockNumber: batch.flockNumber,
        flockName: batch.flockName,
        ageSum: 0, houses: 0, totalEggs: 0, fertile: 0, hatched: 0,
      };
      cur.ageSum += batch.age || 0;
      cur.houses += 1;
      cur.totalEggs += totalEggs;
      cur.fertile += fertile;
      cur.hatched += hatched;
      map.set(key, cur);
    });

    return Array.from(map.values())
      .map((f) => ({
        ...f,
        avgAge: f.houses ? Math.round(f.ageSum / f.houses) : 0,
        fertilityPct: f.totalEggs ? (f.fertile / f.totalEggs) * 100 : 0,
        hatchPct: f.fertile ? (f.hatched / f.fertile) * 100 : 0,
        hofPct: f.totalEggs ? (f.hatched / f.totalEggs) * 100 : 0,
        label: `#${f.flockNumber} ${f.flockName}`,
      }))
      .sort((a, b) => b.hatchPct - a.hatchPct);
  }, [batchesToAnalyze]);

  const chartData = flockStats.map((f) => ({
    name: `#${f.flockNumber}`,
    Fertility: Number(f.fertilityPct.toFixed(1)),
    Hatch: Number(f.hatchPct.toFixed(1)),
    HOF: Number(f.hofPct.toFixed(1)),
  }));

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

  // Build a template-based, numbers-driven explanation for the PDF report.
  const buildSummary = (): string[] => {
    const fertilityPct = flowData.totalEggs ? (flowData.fertile / flowData.totalEggs) * 100 : 0;
    const hatchPct = flowData.fertile ? (flowData.hatched / flowData.fertile) * 100 : 0;
    const hofPct = flowData.totalEggs ? (flowData.hatched / flowData.totalEggs) * 100 : 0;
    const mortality = flowData.earlyDead + flowData.midDead + flowData.lateDead + flowData.pipped;
    const lines = [
      `This report covers ${flowData.batchCount} ${viewMode} house(s) with a combined ${flowData.totalEggs.toLocaleString()} eggs set.`,
      `Fertility was ${fertilityPct.toFixed(1)}% — ${flowData.fertile.toLocaleString()} fertile eggs out of ${flowData.totalEggs.toLocaleString()} set.`,
      `Of the fertile eggs, ${hatchPct.toFixed(1)}% hatched (${flowData.hatched.toLocaleString()} chicks). Hatch of total eggs set (HOF) was ${hofPct.toFixed(1)}%.`,
      `Embryonic mortality totalled ${mortality.toLocaleString()} eggs: ${flowData.earlyDead.toLocaleString()} early dead, ${flowData.midDead.toLocaleString()} mid dead, ${flowData.lateDead.toLocaleString()} late dead, ${flowData.pipped.toLocaleString()} pipped-not-hatched.`,
    ];
    if (breakdown === 'flock' && flockStats.length > 0) {
      const best = flockStats[0];
      const worst = flockStats[flockStats.length - 1];
      lines.push(
        `Across ${flockStats.length} flock(s), the strongest hatch was flock #${best.flockNumber} (${best.flockName}) at ${best.hatchPct.toFixed(1)}%, and the weakest was flock #${worst.flockNumber} (${worst.flockName}) at ${worst.hatchPct.toFixed(1)}%.`
      );
    }
    return lines;
  };

  const handlePdfReport = async () => {
    if (flowData.batchCount === 0) {
      toast({ title: 'Nothing to export', description: 'No house data in the current view.', variant: 'destructive' });
      return;
    }
    setGeneratingPdf(true);
    try {
      toast({ title: 'Generating PDF report…', description: 'Capturing charts and numbers.' });
      await ReportService.generateVisualReport({
        title: 'House Flow Analysis Report',
        subtitle: `${viewMode[0].toUpperCase()}${viewMode.slice(1)} houses · ${breakdown === 'flock' ? 'Flock comparison' : 'Aggregate flow'}`,
        summary: buildSummary(),
        captureElementId: 'batch-flow-sankey',
        filename: `house-flow-report_${viewMode}_${new Date().toISOString().slice(0, 10)}`,
      });
      toast({ title: 'Report downloaded', description: 'Your PDF report is ready.' });
    } catch (e: any) {
      toast({ title: 'Report failed', description: e?.message || 'Unknown error', variant: 'destructive' });
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            House Flow Analysis
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

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              House Flow Analysis
            </CardTitle>
            <CardDescription>
              {viewMode === 'active' && `Active houses flow analysis across ${flowData.batchCount} ongoing houses`}
              {viewMode === 'completed' && `Completed houses flow analysis across ${flowData.batchCount} finished houses`}
              {viewMode === 'all' && `Combined flow analysis across ${flowData.batchCount} total houses`}
              {hasProjectedData && (
                <span className="ml-2 text-amber-600 text-xs">
                  • Contains projected data
                </span>
              )}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePdfReport}
              disabled={generatingPdf}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              {generatingPdf ? 'Generating…' : 'PDF Report'}
            </Button>
            <ChartDownloadButton chartId="batch-flow-sankey" filename="batch-flow-analysis" />
          </div>
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
              Active Houses
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
              Completed Houses
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
              All Houses
              <span className="ml-1 bg-primary/20 text-primary px-1.5 py-0.5 rounded-full text-xs">
                {(activeBatches?.length || 0) + (completedBatches?.length || 0)}
              </span>
            </Button>
          </div>

          {/* Breakdown toggle: aggregate flow vs per-flock comparison */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Button
              variant={breakdown === 'aggregate' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setBreakdown('aggregate')}
              className="flex items-center gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              Aggregate Flow
            </Button>
            <Button
              variant={breakdown === 'flock' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setBreakdown('flock')}
              className="flex items-center gap-2"
            >
              <GitCompare className="h-4 w-4" />
              Flock Comparison
              {flockStats.length > 0 && (
                <span className="ml-1 bg-primary/20 text-primary px-1.5 py-0.5 rounded-full text-xs">
                  {flockStats.length}
                </span>
              )}
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
                Some data is projected based on ongoing houses and industry standards. 
                Actual results may vary as houses complete.
              </p>
            </div>
          )}

          {/* Empty State */}
          {flowData.batchCount === 0 && (
            <div className="text-center py-12">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                <Building2 className="w-12 h-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                No {viewMode} houses found
              </h3>
              <p className="text-sm text-muted-foreground">
                {viewMode === 'active' && "Start some houses to see active flow analysis."}
                {viewMode === 'completed' && "Complete some houses to see historical flow data."}
                {viewMode === 'all' && "No house data available yet."}
              </p>
            </div>
          )}

          {/* Flow Visualization (aggregate) */}
          {flowData.batchCount > 0 && breakdown === 'aggregate' && (
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
                  {hasProjectedData && " Orange indicators show projected data for ongoing houses."}
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
                  title="Total Embryonic Mortality"
                  value={flowData.earlyDead + flowData.midDead + flowData.lateDead + flowData.pipped}
                  color="bg-amber-600"
                  percentage={((flowData.earlyDead + flowData.midDead + flowData.lateDead + flowData.pipped) / flowData.fertile) * 100}
                  description="All embryos that failed to hatch"
                />
              </div>

              <FlowArrow width="50%" />

              {/* Stage 4: Embryonic Mortality Analysis */}
              <div className="grid grid-cols-4 gap-2">
                <FlowBox
                  title="Early Dead"
                  value={flowData.earlyDead}
                  color="bg-red-700"
                  percentage={(flowData.earlyDead / flowData.fertile) * 100}
                  description="Embryos died in early development (0-7 days)"
                />
                <FlowBox
                  title="Mid Dead"
                  value={flowData.midDead}
                  color="bg-orange-600"
                  percentage={(flowData.midDead / flowData.fertile) * 100}
                  description="Embryos died in mid development (8-14 days)"
                />
                <FlowBox
                  title="Late Dead"
                  value={flowData.lateDead}
                  color="bg-amber-600"
                  percentage={(flowData.lateDead / flowData.fertile) * 100}
                  description="Embryos died in late development (15-21 days)"
                />
                <FlowBox
                  title="Pipped"
                  value={flowData.pipped}
                  color="bg-yellow-600"
                  percentage={(flowData.pipped / flowData.fertile) * 100}
                  description="Embryos that pipped but didn't hatch"
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
                    {(((flowData.fertile - flowData.earlyDead - flowData.midDead - flowData.lateDead - flowData.pipped) / flowData.fertile) * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Embryo Survival Rate</div>
                </div>
              </div>

              {/* Detailed Breakdown */}
              <div className="mt-6 pt-6 border-t">
                <h4 className="text-lg font-semibold mb-4">Detailed Embryonic Development Breakdown</h4>
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
                    <span>→ Successfully Hatched:</span>
                    <span className="text-green-600 font-medium">{flowData.hatched.toLocaleString()} ({((flowData.hatched / flowData.fertile) * 100).toFixed(1)}%)</span>
                  </div>
                  <div className="flex justify-between pl-8 text-red-600">
                    <span>→ Early Dead (0-7 days):</span>
                    <span>{flowData.earlyDead.toLocaleString()} ({((flowData.earlyDead / flowData.fertile) * 100).toFixed(1)}%)</span>
                  </div>
                  <div className="flex justify-between pl-8 text-orange-600">
                    <span>→ Mid Dead (8-14 days):</span>
                    <span>{flowData.midDead.toLocaleString()} ({((flowData.midDead / flowData.fertile) * 100).toFixed(1)}%)</span>
                  </div>
                  <div className="flex justify-between pl-8 text-amber-600">
                    <span>→ Late Dead (15-21 days):</span>
                    <span>{flowData.lateDead.toLocaleString()} ({((flowData.lateDead / flowData.fertile) * 100).toFixed(1)}%)</span>
                  </div>
                  <div className="flex justify-between pl-8 text-yellow-600">
                    <span>→ Pipped (didn't hatch):</span>
                    <span>{flowData.pipped.toLocaleString()} ({((flowData.pipped / flowData.fertile) * 100).toFixed(1)}%)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Flock-wise Comparison */}
          {flowData.batchCount > 0 && breakdown === 'flock' && (
            <div className="space-y-6">
              <div className="mb-2 p-4 bg-muted/50 rounded-lg border-l-4 border-primary">
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  Flock-wise Performance
                </h4>
                <p className="text-xs text-muted-foreground">
                  Numbers aggregated per flock across {flowData.batchCount} {viewMode} houses.
                  Compare fertility, hatch, and HOF across {flockStats.length} flock(s).
                </p>
              </div>

              {/* Comparison chart */}
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} unit="%" domain={[0, 100]} />
                    <Tooltip formatter={(v: number) => `${v}%`} />
                    <Legend />
                    <Bar dataKey="Fertility" fill="#059669" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Hatch" fill="#0d9488" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="HOF" fill="#2563eb" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Per-flock table */}
              <div className="rounded-lg border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60 text-muted-foreground">
                    <tr>
                      <th className="text-left font-medium px-3 py-2">Flock</th>
                      <th className="text-right font-medium px-3 py-2">Houses</th>
                      <th className="text-right font-medium px-3 py-2">Avg Age</th>
                      <th className="text-right font-medium px-3 py-2">Eggs Set</th>
                      <th className="text-right font-medium px-3 py-2">Fertile</th>
                      <th className="text-right font-medium px-3 py-2">Hatched</th>
                      <th className="text-right font-medium px-3 py-2">Fertility %</th>
                      <th className="text-right font-medium px-3 py-2">Hatch %</th>
                      <th className="text-right font-medium px-3 py-2">HOF %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flockStats.map((f) => (
                      <tr key={f.label} className="border-t hover:bg-muted/30">
                        <td className="px-3 py-2 font-medium">#{f.flockNumber} {f.flockName}</td>
                        <td className="px-3 py-2 text-right">{f.houses}</td>
                        <td className="px-3 py-2 text-right">{f.avgAge}w</td>
                        <td className="px-3 py-2 text-right">{f.totalEggs.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right">{f.fertile.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right text-green-600 font-medium">{f.hatched.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right">{f.fertilityPct.toFixed(1)}%</td>
                        <td className="px-3 py-2 text-right">{f.hatchPct.toFixed(1)}%</td>
                        <td className="px-3 py-2 text-right">{f.hofPct.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                  {flockStats.length > 1 && (
                    <tfoot className="border-t bg-muted/40 font-medium">
                      <tr>
                        <td className="px-3 py-2">Total ({flockStats.length} flocks)</td>
                        <td className="px-3 py-2 text-right">{flowData.batchCount}</td>
                        <td className="px-3 py-2 text-right">—</td>
                        <td className="px-3 py-2 text-right">{flowData.totalEggs.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right">{flowData.fertile.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right">{flowData.hatched.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right">{flowData.totalEggs ? ((flowData.fertile / flowData.totalEggs) * 100).toFixed(1) : '0.0'}%</td>
                        <td className="px-3 py-2 text-right">{flowData.fertile ? ((flowData.hatched / flowData.fertile) * 100).toFixed(1) : '0.0'}%</td>
                        <td className="px-3 py-2 text-right">{flowData.totalEggs ? ((flowData.hatched / flowData.totalEggs) * 100).toFixed(1) : '0.0'}%</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BatchFlowSankey;