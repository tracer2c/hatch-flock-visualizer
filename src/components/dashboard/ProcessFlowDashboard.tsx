import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, LineChart, Line } from 'recharts';
import { useBatchPerformanceMetrics } from "@/hooks/useHouseData";
import { ArrowRight, TrendingUp } from "lucide-react";
import { AITooltip } from "@/components/ui/ai-tooltip";
import { ChartDownloadButton } from "@/components/ui/chart-download-button";

const ProcessFlowDashboard = () => {
  const { data: performanceMetrics, isLoading } = useBatchPerformanceMetrics();

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading performance data...</div>;
  }

  if (!performanceMetrics || performanceMetrics.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No batches found for analysis. Create some batches to see process flow data.
      </div>
    );
  }

  // Filter out batches with any meaningful data for display
  const meaningfulBatches = performanceMetrics.filter(batch => 
    batch.hasEggQuality || batch.hasFertilityData || batch.hasQAData
  );

  if (meaningfulBatches.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No batches with data found. Add some data entry to see process flow analysis.
      </div>
    );
  }

  // Data flow analysis - use meaningful data
  const flowData = meaningfulBatches.map(batch => ({
    batch: batch.batchNumber,
    eggQuality: batch.qualityScore || 0,
    fertility: batch.fertility || 0,
    hatch: batch.hatch || 0,
    flockAge: batch.age,
    status: batch.status,
    daysSinceSet: batch.daysSinceSet
  }));


  // Age vs Performance - handle null values properly
  const agePerformanceData = meaningfulBatches.reduce((acc: any[], batch) => {
    const existing = acc.find(item => item.age === batch.age);
    if (existing) {
      if (batch.fertility) {
        existing.fertility = existing.fertilityCount > 0 
          ? (existing.fertility * existing.fertilityCount + batch.fertility) / (existing.fertilityCount + 1)
          : batch.fertility;
        existing.fertilityCount += 1;
      }
      if (batch.hatch) {
        existing.hatch = existing.hatchCount > 0 
          ? (existing.hatch * existing.hatchCount + batch.hatch) / (existing.hatchCount + 1)
          : batch.hatch;
        existing.hatchCount += 1;
      }
      existing.count += 1;
    } else {
      acc.push({
        age: batch.age,
        fertility: batch.fertility || 0,
        hatch: batch.hatch || 0,
        fertilityCount: batch.fertility ? 1 : 0,
        hatchCount: batch.hatch ? 1 : 0,
        count: 1
      });
    }
    return acc;
  }, []).sort((a, b) => a.age - b.age);

  // Process efficiency by breed - handle null values
  const breedData = meaningfulBatches.reduce((acc: any[], batch) => {
    const existing = acc.find(item => item.breed === batch.breed);
    if (existing) {
      if (batch.fertility) {
        existing.fertility = existing.fertilityCount > 0 
          ? (existing.fertility * existing.fertilityCount + batch.fertility) / (existing.fertilityCount + 1)
          : batch.fertility;
        existing.fertilityCount += 1;
      }
      if (batch.hatch) {
        existing.hatch = existing.hatchCount > 0 
          ? (existing.hatch * existing.hatchCount + batch.hatch) / (existing.hatchCount + 1)
          : batch.hatch;
        existing.hatchCount += 1;
      }
      if (batch.qualityScore) {
        existing.quality = existing.qualityCount > 0 
          ? (existing.quality * existing.qualityCount + batch.qualityScore) / (existing.qualityCount + 1)
          : batch.qualityScore;
        existing.qualityCount += 1;
      }
      existing.count += 1;
    } else {
      acc.push({
        breed: batch.breed,
        fertility: batch.fertility || 0,
        hatch: batch.hatch || 0,
        quality: batch.qualityScore || 0,
        fertilityCount: batch.fertility ? 1 : 0,
        hatchCount: batch.hatch ? 1 : 0,
        qualityCount: batch.qualityScore ? 1 : 0,
        count: 1
      });
    }
    return acc;
  }, []);

  return (
    <div className="space-y-6">
      {/* Process Flow Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowRight className="h-5 w-5" />
              Complete Process Flow Analysis
            </div>
            <ChartDownloadButton 
              chartId="process-flow-chart" 
              filename="process-flow-analysis.png" 
            />
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Tracking data flow from egg quality through to final hatch performance
          </p>
        </CardHeader>
        <CardContent id="process-flow-chart">
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={flowData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="batch" 
                angle={-45}
                textAnchor="end"
                height={60}
                fontSize={12}
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <AITooltip 
                        chartType="process-flow" 
                        data={payload} 
                        chartConfig={{ label, type: 'area' }}
                        className="min-w-[200px] p-3 bg-card border border-border rounded-lg shadow-lg"
                      >
                        <div>
                          <p className="font-medium mb-2">{label}</p>
                          {payload.map((entry, index) => (
                            <div key={index} className="flex justify-between items-center">
                              <span style={{ color: entry.color }}>{entry.name}: </span>
                              <span className="font-medium">{entry.value}%</span>
                            </div>
                          ))}
                        </div>
                      </AITooltip>
                    );
                  }
                  return null;
                }}
              />
              <Area type="monotone" dataKey="eggQuality" stackId="1" stroke="hsl(220 70% 50%)" fill="hsl(220 70% 50%)" fillOpacity={0.6} name="Egg Quality %" />
              <Area type="monotone" dataKey="fertility" stackId="2" stroke="hsl(142 76% 36%)" fill="hsl(142 76% 36%)" fillOpacity={0.6} name="Fertility %" />
              <Area type="monotone" dataKey="hatch" stackId="3" stroke="hsl(48 96% 53%)" fill="hsl(48 96% 53%)" fillOpacity={0.6} name="Hatch %" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Performance by Flock Age */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div>Performance by Flock Age</div>
            <ChartDownloadButton 
              chartId="age-performance-chart" 
              filename="performance-by-flock-age.png" 
            />
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            How flock age affects fertility and hatch rates
          </p>
        </CardHeader>
        <CardContent id="age-performance-chart">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={agePerformanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="age" name="Age" unit=" weeks" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <AITooltip 
                        chartType="age-performance" 
                        data={{ age: label, metrics: payload }} 
                        chartConfig={{ type: 'line' }}
                        className="min-w-[200px] p-3 bg-card border border-border rounded-lg shadow-lg"
                      >
                        <div>
                          <p className="font-medium mb-2">Age: {label} weeks</p>
                          {payload.map((entry, index) => (
                            <div key={index} className="flex justify-between items-center">
                              <span style={{ color: entry.color }}>{entry.name}: </span>
                              <span className="font-medium">{entry.value}%</span>
                            </div>
                          ))}
                        </div>
                      </AITooltip>
                    );
                  }
                  return null;
                }}
              />
              <Line type="monotone" dataKey="fertility" stroke="hsl(142 76% 36%)" strokeWidth={2} name="Fertility %" />
              <Line type="monotone" dataKey="hatch" stroke="hsl(48 96% 53%)" strokeWidth={2} name="Hatch %" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Breed Performance Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Performance by Breed Type
            </div>
            <ChartDownloadButton 
              chartId="breed-performance-chart" 
              filename="performance-by-breed-type.png" 
            />
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Comparative analysis across different breed types
          </p>
        </CardHeader>
        <CardContent id="breed-performance-chart">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={breedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="breed" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <AITooltip 
                        chartType="breed-performance" 
                        data={{ breed: label, metrics: payload }} 
                        chartConfig={{ type: 'bar' }}
                        className="min-w-[200px] p-3 bg-card border border-border rounded-lg shadow-lg"
                      >
                        <div>
                          <p className="font-medium mb-2">{label}</p>
                          {payload.map((entry, index) => (
                            <div key={index} className="flex justify-between items-center">
                              <span style={{ color: entry.color }}>{entry.name}: </span>
                              <span className="font-medium">{entry.value}%</span>
                            </div>
                          ))}
                        </div>
                      </AITooltip>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="quality" fill="hsl(220 70% 50%)" name="Egg Quality %" />
              <Bar dataKey="fertility" fill="hsl(142 76% 36%)" name="Fertility %" />
              <Bar dataKey="hatch" fill="hsl(48 96% 53%)" name="Hatch %" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Performance Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Highest Hatch Rate</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const withData = meaningfulBatches.filter(batch => typeof batch.hatch === 'number');
              if (withData.length === 0) {
                return (
                  <div>
                    <div className="text-2xl font-bold text-muted-foreground">-</div>
                    <div className="text-sm text-muted-foreground">No data available</div>
                  </div>
                );
              }
              const best = withData.reduce((prev, current) => ((prev.hatch || 0) > (current.hatch || 0) ? prev : current));
              return (
                <div>
                  <div className="text-2xl font-bold text-primary">{best.batchNumber}</div>
                  <div className="text-sm text-muted-foreground">
                    {`${Number(best.hatch).toFixed(1)}% hatch`} • {best.flockName}
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Eggs Processed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {meaningfulBatches.reduce((sum, batch) => sum + batch.totalEggs, 0).toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">
              Across {meaningfulBatches.length} batches with data
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Data Coverage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {Math.round((meaningfulBatches.length / performanceMetrics.length) * 100)}%
            </div>
            <div className="text-sm text-muted-foreground">
              {meaningfulBatches.length} of {performanceMetrics.length} batches have data
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProcessFlowDashboard;