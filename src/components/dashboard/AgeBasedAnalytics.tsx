import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useAgeBasedPerformance } from "@/hooks/useAgeBasedPerformance";
import { useViewMode } from "@/contexts/ViewModeContext";
import { Users } from "lucide-react";

const AgeBasedAnalytics = () => {
  const { viewMode } = useViewMode();
  const { data: metrics, isLoading } = useAgeBasedPerformance(viewMode);
  
  if (isLoading) return <div>Loading age-based analytics...</div>;
  
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {metrics?.map(range => (
          <Card key={range.ageRange} className="border-l-4" style={{ borderLeftColor: range.color }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">{range.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{range.batchCount}</span>
                  <Users className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">batches analyzed</p>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t text-xs">
                  <div>
                    <p className="text-muted-foreground">Fertility</p>
                    <p className="font-semibold">{range.avgFertility}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Hatch</p>
                    <p className="font-semibold">{range.avgHatch}%</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Performance Comparison Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Performance by Age Range</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={metrics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="avgFertility" fill="hsl(var(--chart-1))" name="Fertility %" />
              <Bar dataKey="avgHatch" fill="hsl(var(--chart-2))" name="Hatch %" />
              <Bar dataKey="avgHOF" fill="hsl(var(--chart-3))" name="HOF %" />
              <Bar dataKey="avgHOI" fill="hsl(var(--chart-4))" name="HOI %" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      {/* Mortality Breakdown Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Embryonic Mortality by Age Range</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={metrics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis label={{ value: 'Average Count', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="earlyDeadAvg" stroke="hsl(var(--chart-1))" name="Early Dead" strokeWidth={2} />
              <Line type="monotone" dataKey="midDeadAvg" stroke="hsl(var(--chart-3))" name="Mid Dead" strokeWidth={2} />
              <Line type="monotone" dataKey="lateDeadAvg" stroke="hsl(var(--chart-4))" name="Late Dead" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default AgeBasedAnalytics;
