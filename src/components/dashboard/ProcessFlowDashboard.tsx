import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, LineChart, Line, Legend } from 'recharts';
import { useBatchPerformanceMetrics } from "@/hooks/useHouseData";
import { ArrowRight, TrendingUp, Info, Users } from "lucide-react";
import { ChartDownloadButton } from "@/components/ui/chart-download-button";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AgeBasedAnalytics from "./AgeBasedAnalytics";
import utilizationIcon from "@/assets/utilization-icon.png";

interface ProcessFlowDashboardProps {
  viewMode?: 'original' | 'dummy';
}

const ProcessFlowDashboard = ({ viewMode = 'original' }: ProcessFlowDashboardProps) => {
  const { data: performanceMetrics, isLoading } = useBatchPerformanceMetrics(viewMode);

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading performance data...</div>;
  }

  if (!performanceMetrics || performanceMetrics.length === 0) {
    return (
      <div className="text-center py-12">
        <img 
          src={utilizationIcon} 
          alt="System Utilization" 
          className="w-24 h-24 mx-auto mb-4 object-contain animate-fade-in opacity-70"
        />
        <h3 className="text-lg font-medium text-muted-foreground mb-2">
          No process data available
        </h3>
        <p className="text-sm text-muted-foreground">
          Create houses and enter analysis data to see process flow metrics
        </p>
      </div>
    );
  }

  // Filter out batches with any meaningful data for display
  const meaningfulBatches = performanceMetrics.filter(batch => 
    batch.hasEggQuality || batch.hasFertilityData || batch.hasQAData
  );
  const batches = meaningfulBatches.length > 0 ? meaningfulBatches : performanceMetrics;


  // Data flow analysis - show only last 25 batches for readability
  const recentBatches = batches.slice(-25);
  const flowData = recentBatches.map(batch => ({
    batch: batch.batchNumber,
    hof: typeof batch.hof === 'number' ? batch.hof : 0,
    hoi: typeof batch.hoi === 'number' ? batch.hoi : 0,
    fertility: typeof batch.fertility === 'number' ? batch.fertility : 0,
    hatch: typeof batch.hatch === 'number' ? batch.hatch : 0,
    flockAge: batch.age,
    status: batch.status,
    daysSinceSet: batch.daysSinceSet
  }));


  // Age vs Performance - handle null values properly
  const agePerformanceData = batches.reduce((acc: any[], batch) => {
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
  const breedData = batches.reduce((acc: any[], batch) => {
    const existing = acc.find(item => item.breed === batch.breed);

    const applyUpdate = (item: any) => {
      if (typeof batch.fertility === 'number') {
        item.fertility = item.fertilityCount > 0
          ? (item.fertility * item.fertilityCount + batch.fertility) / (item.fertilityCount + 1)
          : batch.fertility;
        item.fertilityCount += 1;
      }
      if (typeof batch.hatch === 'number') {
        item.hatch = item.hatchCount > 0
          ? (item.hatch * item.hatchCount + batch.hatch) / (item.hatchCount + 1)
          : batch.hatch;
        item.hatchCount += 1;
      }
      if (typeof batch.hof === 'number') {
        item.hof = item.hofCount > 0
          ? (item.hof * item.hofCount + batch.hof) / (item.hofCount + 1)
          : batch.hof;
        item.hofCount += 1;
      }
      if (typeof batch.hoi === 'number') {
        item.hoi = item.hoiCount > 0
          ? (item.hoi * item.hoiCount + batch.hoi) / (item.hoiCount + 1)
          : batch.hoi;
        item.hoiCount += 1;
      }
      item.count += 1;
    };

    if (existing) {
      applyUpdate(existing);
    } else {
      const item = {
        breed: batch.breed,
        fertility: typeof batch.fertility === 'number' ? batch.fertility : 0,
        hatch: typeof batch.hatch === 'number' ? batch.hatch : 0,
        hof: typeof batch.hof === 'number' ? batch.hof : 0,
        hoi: typeof batch.hoi === 'number' ? batch.hoi : 0,
        fertilityCount: typeof batch.fertility === 'number' ? 1 : 0,
        hatchCount: typeof batch.hatch === 'number' ? 1 : 0,
        hofCount: typeof batch.hof === 'number' ? 1 : 0,
        hoiCount: typeof batch.hoi === 'number' ? 1 : 0,
        count: 1
      } as any;
      acc.push(item);
    }
    return acc;
  }, []);

  return (
    <Tabs defaultValue="process-flow" className="w-full animate-fade-in">
      <TabsList className="grid w-full grid-cols-2 mb-6">
        <TabsTrigger value="process-flow" className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Process Flow Charts
        </TabsTrigger>
        <TabsTrigger value="age-analysis" className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Age-Based Performance
        </TabsTrigger>
      </TabsList>

      <TabsContent value="process-flow" className="space-y-6">
        <TooltipProvider>
        <div className="space-y-6">
        {/* Main Process Flow Chart */}
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
            Showing most recent 25 batches for clarity • Tracking HOF and HOI alongside fertility and hatch performance
          </p>
        </CardHeader>
        <CardContent id="process-flow-chart">
          <ResponsiveContainer width="100%" height={450}>
            <LineChart data={flowData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis 
                dataKey="batch" 
                angle={-35}
                textAnchor="end"
                height={100}
                fontSize={11}
                stroke="hsl(var(--muted-foreground))"
                interval="preserveStartEnd"
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12}
                domain={[0, 100]}
                label={{ value: 'Performance (%)', angle: -90, position: 'insideLeft', style: { fontSize: 14 } }}
              />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-card border border-border rounded-lg shadow-lg p-3">
                        <p className="font-semibold mb-2 text-sm">{label}</p>
                        <div className="space-y-1">
                          {payload.map((entry, index) => (
                            <div key={index} className="flex justify-between items-center gap-4 text-sm">
                              <span style={{ color: entry.color }} className="font-medium">{entry.name}</span>
                              <span className="font-bold">{Number(entry.value).toFixed(1)}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="line"
                iconSize={20}
              />
              <Line 
                type="monotone" 
                dataKey="hof" 
                stroke="hsl(217 91% 60%)" 
                strokeWidth={3}
                dot={{ r: 4, fill: 'hsl(217 91% 60%)' }}
                activeDot={{ r: 6 }}
                name="HOF %" 
              />
              <Line 
                type="monotone" 
                dataKey="hoi" 
                stroke="hsl(271 81% 56%)" 
                strokeWidth={3}
                dot={{ r: 4, fill: 'hsl(271 81% 56%)' }}
                activeDot={{ r: 6 }}
                name="HOI %" 
              />
              <Line 
                type="monotone" 
                dataKey="fertility" 
                stroke="hsl(142 71% 45%)" 
                strokeWidth={3}
                dot={{ r: 4, fill: 'hsl(142 71% 45%)' }}
                activeDot={{ r: 6 }}
                name="Fertility %" 
              />
              <Line 
                type="monotone" 
                dataKey="hatch" 
                stroke="hsl(25 95% 53%)" 
                strokeWidth={3}
                dot={{ r: 4, fill: 'hsl(25 95% 53%)' }}
                activeDot={{ r: 6 }}
                name="Hatch %" 
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Side by Side Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance by Flock Age */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="text-lg">Performance by Flock Age</div>
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
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={agePerformanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="age" name="Age" unit=" weeks" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="min-w-[200px] p-3 bg-card border border-border rounded-lg shadow-lg">
                          <p className="font-medium mb-2">Age: {label} weeks</p>
                          {payload.map((entry, index) => (
                            <div key={index} className="flex justify-between items-center gap-3">
                              <span style={{ color: entry.color }}>{entry.name}</span>
                              <span className="font-medium">{Number(entry.value).toFixed(1)}%</span>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="fertility" stroke="hsl(142 71% 45%)" strokeWidth={3} name="Fertility %" />
                <Line type="monotone" dataKey="hatch" stroke="hsl(25 95% 53%)" strokeWidth={3} name="Hatch %" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Breed Performance Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5" />
                Performance by Farms
              </div>
              <ChartDownloadButton 
                chartId="breed-performance-chart" 
                filename="performance-by-farms.png" 
              />
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Comparative analysis across different farms
            </p>
          </CardHeader>
          <CardContent id="breed-performance-chart">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={breedData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="breed" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="min-w-[200px] p-3 bg-card border border-border rounded-lg shadow-lg">
                          <p className="font-medium mb-2">{label}</p>
                          {payload.map((entry, index) => (
                            <div key={index} className="flex justify-between items-center gap-3">
                              <span style={{ color: entry.color }}>{entry.name}</span>
                              <span className="font-medium">{Number(entry.value).toFixed(1)}%</span>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Bar dataKey="hof" fill="hsl(217 91% 60%)" name="HOF %" />
                <Bar dataKey="hoi" fill="hsl(271 81% 56%)" name="HOI %" />
                <Bar dataKey="fertility" fill="hsl(142 71% 45%)" name="Fertility %" />
                <Bar dataKey="hatch" fill="hsl(25 95% 53%)" name="Hatch %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Performance Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium">Highest Hatch Rate</CardTitle>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>The house with the best hatch rate performance. Hatch rate is calculated as the percentage of set eggs that successfully hatched into healthy chicks.</p>
                </TooltipContent>
              </UITooltip>
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              const withData = batches.filter(batch => typeof batch.hatch === 'number');
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
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium">Total Eggs Processed</CardTitle>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>The total number of eggs that have been processed through the incubation system across all houses with recorded data.</p>
                </TooltipContent>
              </UITooltip>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {batches.reduce((sum, batch) => sum + batch.totalEggs, 0).toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">
              Across {batches.length} houses with data
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium">Data Coverage</CardTitle>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>The percentage of houses that have at least some analysis data entered (fertility, QA monitoring, or egg quality data). Higher coverage means more complete data tracking.</p>
                </TooltipContent>
              </UITooltip>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {Math.round((batches.length / performanceMetrics.length) * 100)}%
            </div>
            <div className="text-sm text-muted-foreground">
              {batches.length} of {performanceMetrics.length} houses have data
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
      </TooltipProvider>
      </TabsContent>

      <TabsContent value="age-analysis">
        <AgeBasedAnalytics />
      </TabsContent>
    </Tabs>
  );
};

export default ProcessFlowDashboard;