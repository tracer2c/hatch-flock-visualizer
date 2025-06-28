import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, TrendingDown, Target, Activity, Eye, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import DemoTutorial from "./DemoTutorial";

interface OverviewDashboardProps {
  data: any[];
  fertilityData?: any[];
  residueData?: any[];
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'];

const overviewDemoSteps = [
  {
    id: "kpi-cards",
    title: "Key Performance Indicators",
    description: "These cards show the average performance metrics across all your hatchery data. Each card represents a critical KPI for monitoring hatchery operations.",
    target: "kpi-cards",
    position: "bottom" as const
  },
  {
    id: "hatchery-comparison",
    title: "Hatchery Performance Comparison",
    description: "This bar chart compares average fertility and hatch rates across different hatcheries, helping you identify top performers.",
    target: "hatchery-comparison",
    position: "top" as const
  },
  {
    id: "age-distribution",
    title: "Flock Age Distribution",
    description: "This pie chart shows how your flocks are distributed across different age ranges, helping with planning and resource allocation.",
    target: "age-distribution",
    position: "top" as const
  },
  {
    id: "performance-trend",
    title: "Performance Trends",
    description: "This line chart shows performance trends across all flocks, helping you identify patterns and outliers in your data.",
    target: "performance-trend",
    position: "top" as const
  }
];

const OverviewDashboard = ({ data, fertilityData = [], residueData = [] }: OverviewDashboardProps) => {
  const [showDemo, setShowDemo] = useState(false);

  // Calculate KPIs
  const avgFertility = data.reduce((sum, item) => sum + item.fertility, 0) / data.length;
  const avgHatch = data.reduce((sum, item) => sum + item.hatch, 0) / data.length;
  const avgHOI = data.reduce((sum, item) => sum + item.hoi, 0) / data.length;
  const avgEarlyDead = data.reduce((sum, item) => sum + item.earlyDead, 0) / data.length;

  // Hatchery performance summary
  const hatcheryPerformance = data.reduce((acc, item) => {
    if (!acc[item.hatchery]) {
      acc[item.hatchery] = { hatchery: item.hatchery, count: 0, totalFertility: 0, totalHatch: 0 };
    }
    acc[item.hatchery].count++;
    acc[item.hatchery].totalFertility += item.fertility;
    acc[item.hatchery].totalHatch += item.hatch;
    return acc;
  }, {} as any);

  const hatcheryData = Object.values(hatcheryPerformance).map((item: any) => ({
    hatchery: item.hatchery,
    avgFertility: (item.totalFertility / item.count).toFixed(1),
    avgHatch: (item.totalHatch / item.count).toFixed(1),
    count: item.count
  }));

  // Age distribution
  const ageRanges = [
    { range: '20-30', min: 20, max: 30 },
    { range: '31-40', min: 31, max: 40 },
    { range: '41-50', min: 41, max: 50 },
    { range: '51-60', min: 51, max: 60 }
  ];

  const ageDistribution = ageRanges.map(range => ({
    range: range.range,
    count: data.filter(item => item.age >= range.min && item.age <= range.max).length
  }));

  // Enhanced correlation analysis with residue data
  const getCorrelationInsights = () => {
    if (residueData.length === 0) return null;

    const avgContamination = residueData.reduce((sum: number, item: any) => sum + item.contaminationPercent, 0) / residueData.length;
    const avgMold = residueData.reduce((sum: number, item: any) => sum + item.moldPercent, 0) / residueData.length;
    const avgLateDeath = residueData.reduce((sum: number, item: any) => sum + item.lateDeathPercent, 0) / residueData.length;
    const avgAbnormal = residueData.reduce((sum: number, item: any) => sum + item.abnormalPercent, 0) / residueData.length;

    return {
      avgContamination: Number(avgContamination.toFixed(2)),
      avgMold: Number(avgMold.toFixed(2)),
      avgLateDeath: Number(avgLateDeath.toFixed(2)),
      avgAbnormal: Number(avgAbnormal.toFixed(2)),
      totalFlocks: residueData.length
    };
  };

  const correlationData = getCorrelationInsights();

  return (
    <div className="space-y-6">
      {/* Demo Button */}
      <div className="flex justify-end">
        <Button 
          variant="outline" 
          onClick={() => setShowDemo(true)}
          className="flex items-center gap-2"
        >
          <Eye className="h-4 w-4" />
          View Demo
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" data-demo-id="kpi-cards">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Fertility</CardTitle>
            <Target className="h-4 w-4 text-blue-100" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgFertility.toFixed(1)}%</div>
            <p className="text-xs text-blue-100">Across all flocks</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Hatch Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-100" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgHatch.toFixed(1)}%</div>
            <p className="text-xs text-green-100">Overall performance</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg HOI</CardTitle>
            <Activity className="h-4 w-4 text-purple-100" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgHOI.toFixed(1)}%</div>
            <p className="text-xs text-purple-100">Hatch of incubated</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Early Dead</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-100" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgEarlyDead.toFixed(1)}%</div>
            <p className="text-xs text-red-100">Early mortality rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Residue Correlation Cards */}
      {correlationData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Contamination</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-100" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{correlationData.avgContamination}%</div>
              <p className="text-xs text-yellow-100">Sanitation issues</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-600 to-teal-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Mold</CardTitle>
              <TrendingDown className="h-4 w-4 text-green-100" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{correlationData.avgMold}%</div>
              <p className="text-xs text-green-100">Environment quality</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-red-500 to-pink-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Late Death</CardTitle>
              <Activity className="h-4 w-4 text-red-100" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{correlationData.avgLateDeath}%</div>
              <p className="text-xs text-red-100">Hatcher performance</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Abnormal</CardTitle>
              <Target className="h-4 w-4 text-indigo-100" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{correlationData.avgAbnormal}%</div>
              <p className="text-xs text-indigo-100">Breeding quality</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hatchery Performance Bar Chart */}
        <Card data-demo-id="hatchery-comparison">
          <CardHeader>
            <CardTitle>Hatchery Performance Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={hatcheryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hatchery" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    `${value}%`, 
                    name === 'avgFertility' ? 'Avg Fertility' : 'Avg Hatch Rate'
                  ]}
                />
                <Bar dataKey="avgFertility" fill="#8884d8" name="avgFertility" />
                <Bar dataKey="avgHatch" fill="#82ca9d" name="avgHatch" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Age Distribution Pie Chart */}
        <Card data-demo-id="age-distribution">
          <CardHeader>
            <CardTitle>Flock Age Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={ageDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ range, count, percent }) => `${range}: ${count} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {ageDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Performance Trend Line Chart */}
      <Card data-demo-id="performance-trend">
        <CardHeader>
          <CardTitle>Performance Metrics Trend by Flock</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="flock" />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => [
                  `${typeof value === 'number' ? value.toFixed(1) : value}%`, 
                  String(name).charAt(0).toUpperCase() + String(name).slice(1)
                ]}
              />
              <Line type="monotone" dataKey="fertility" stroke="#8884d8" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="hatch" stroke="#82ca9d" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="hoi" stroke="#ffc658" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Demo Tutorial */}
      <DemoTutorial 
        steps={overviewDemoSteps}
        isActive={showDemo}
        onClose={() => setShowDemo(false)}
        pageName="Overview"
      />
    </div>
  );
};

export default OverviewDashboard;
